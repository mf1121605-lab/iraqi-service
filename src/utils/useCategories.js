import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

const SELECT_COLUMNS = 'key, label_ar, label_ckb, is_active, sort_order';

// Categories are founder-editable now (not a fixed list), so every screen
// that shows them subscribes to live changes instead of reading a static
// constant — an add/rename/deactivate from the founder dashboard must
// reach an already-open customer/employee session without a reload.
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
