import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

// Wildcard rather than an explicit icon_path column: this must keep
// working even before the admin-dashboard migration that adds it has run
// against a given database, and an unknown-column select would error out
// category loading everywhere (dashboards, active-services checklist)
// instead of just leaving icon_path undefined.
const SELECT_COLUMNS = '*';

// Ref-counted singleton, mirroring useSiteSettings.js's fix for the same
// class of bug: Supabase caches realtime channels by name on a given
// client instance, so two independent callers of useCategories on the
// same page (e.g. a page's own useCategories() call plus AppShell's
// RequestAlertBell, which is mounted on every authenticated page and
// calls useCategories({ activeOnly: false }) itself) would otherwise both
// try to `.channel('categories-changes').on(...)`, and the second `.on()`
// throws because the channel is already subscribed. One shared channel
// serves both the "all categories" and "active only" variants; each keeps
// its own cache/listener set so subscribers only re-render for the
// variant they actually asked for.
let channel = null;
let subscriberCount = 0;
const caches = { all: null, active: null };
const listeners = { all: new Set(), active: new Set() };

function notify(key, data) {
  caches[key] = data;
  listeners[key].forEach((listener) => listener(data));
}

function loadKey(key) {
  let query = supabaseClient.from('categories').select(SELECT_COLUMNS).order('sort_order');
  if (key === 'active') query = query.eq('is_active', true);
  query.then(({ data }) => notify(key, data ?? []));
}

function loadAll() {
  loadKey('all');
  loadKey('active');
}

export function useCategories({ activeOnly = true } = {}) {
  const key = activeOnly ? 'active' : 'all';
  const [categories, setCategories] = useState(caches[key]);

  useEffect(() => {
    listeners[key].add(setCategories);
    subscriberCount += 1;
    if (!caches[key]) loadKey(key);
    if (subscriberCount === 1) {
      channel = supabaseClient
        .channel('categories-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadAll)
        .subscribe();
    }
    return () => {
      listeners[key].delete(setCategories);
      subscriberCount -= 1;
      if (subscriberCount === 0 && channel) {
        supabaseClient.removeChannel(channel);
        channel = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return categories;
}

export function categoryLabel(category, locale) {
  if (!category) return '';
  return locale === 'ar' ? category.label_ar : category.label_ckb;
}
