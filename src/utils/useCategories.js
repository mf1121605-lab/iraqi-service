import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { translate } from './i18n';

export function useCategories() {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    supabaseClient
      .from('service_categories')
      .select('id, key, label_ar, label_ckb, sort_order')
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  return categories;
}

export function categoryLabel(category, locale) {
  if (!category) return '';
  return (locale === 'ckb' ? category.label_ckb : category.label_ar) || category.label_ar || category.key;
}
