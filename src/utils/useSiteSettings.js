import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

// Wildcard rather than an explicit column list: this hook runs on every
// page load via _app.js, and must keep working even before the
// admin-dashboard migration that adds these columns has run against a
// given database — an unknown-column select would break the whole site
// instead of just leaving the new fields undefined.
const SELECT_COLUMNS = '*';

// Founder-editable branding/content, public-readable so it can drive the
// unauthenticated landing page too. Realtime so a founder's save shows up
// on already-open tabs without a reload.
export function useSiteSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let active = true;

    function load() {
      supabaseClient
        .from('founder_settings')
        .select(SELECT_COLUMNS)
        .single()
        .then(({ data }) => {
          if (active) setSettings(data ?? null);
        });
    }

    load();

    const channel = supabaseClient
      .channel('founder-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founder_settings' }, load)
      .subscribe();

    return () => {
      active = false;
      supabaseClient.removeChannel(channel);
    };
  }, []);

  return settings;
}

export function siteText(settings, locale, key) {
  if (!settings) return '';
  return (locale === 'ckb' ? settings[`${key}_ckb`] : settings[`${key}_ar`]) || settings[`${key}_ar`] || '';
}
