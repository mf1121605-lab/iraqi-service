import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

// Wildcard rather than an explicit column list: this hook runs on every
// page load via _app.js, and must keep working even before the
// admin-dashboard migration that adds these columns has run against a
// given database — an unknown-column select would break the whole site
// instead of just leaving the new fields undefined.
const SELECT_COLUMNS = '*';

// Multiple components call this hook at once on every authenticated page
// (SiteChrome, plus AppShell for the ambient-audio speaker icon) — a
// single shared realtime subscription (not one per caller) is required,
// because Supabase's client caches channels by name: a second
// `.channel('founder-settings-changes')` call returns the SAME
// already-subscribed channel object, and calling `.on(...)` on that again
// throws ("cannot add postgres_changes callbacks ... after subscribe()"),
// which crashed the whole app the moment a second caller was added. Every
// component now shares one channel and one cached value instead.
let cachedSettings = null;
let channel = null;
let subscriberCount = 0;
const listeners = new Set();

function notify(settings) {
  cachedSettings = settings;
  listeners.forEach((listener) => listener(settings));
}

function load() {
  supabaseClient
    .from('founder_settings')
    .select(SELECT_COLUMNS)
    .single()
    .then(({ data }) => notify(data ?? null));
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(cachedSettings);

  useEffect(() => {
    listeners.add(setSettings);
    subscriberCount += 1;

    if (subscriberCount === 1) {
      load();
      channel = supabaseClient
        .channel('founder-settings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'founder_settings' }, load)
        .subscribe();
    }

    return () => {
      listeners.delete(setSettings);
      subscriberCount -= 1;
      if (subscriberCount === 0 && channel) {
        supabaseClient.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  return settings;
}

export function siteText(settings, locale, key) {
  if (!settings) return '';
  return (locale === 'ckb' ? settings[`${key}_ckb`] : settings[`${key}_ar`]) || settings[`${key}_ar`] || '';
}
