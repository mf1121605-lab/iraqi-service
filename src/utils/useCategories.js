import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

// Wildcard rather than an explicit icon_path column: this must keep
// working even before the admin-dashboard migration that adds it has run
// against a given database, and an unknown-column select would error out
// category loading everywhere (dashboards, active-services checklist)
// instead of just leaving icon_path undefined.
const SELECT_COLUMNS = '*';

export function useCategories({ activeOnly = true } = {}) {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    let active = true;

    function load() {
      let query = supabaseClient.from('categories').select(SELECT_COLUMNS).order('sort_order');
      if (activeOnly) query = query.eq('is_active', true);
      query.then(({ data }) => {
        if (active) setCategories(data ?? []);
      });
    }

    load();

    const channel = supabaseClient
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, load)
      .subscribe();

    return () => {
      active = false;
      supabaseClient.removeChannel(channel);
    };
  }, [activeOnly]);

  return categories;
}

export function categoryLabel(category, locale) {
  if (!category) return '';
  return locale === 'ar' ? category.label_ar : category.label_ckb;
}
