import { useState } from 'react';
import { Plus, Tags, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { categoryLabel, useCategories } from '../../utils/useCategories';
import { translate } from '../../utils/i18n';

const emptyForm = { key: '', labelAr: '', labelCkb: '' };

export default function FounderCategories() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'categories');
  const categories = useCategories();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.key || !form.labelAr || !form.labelCkb) return;
    const { error: insertError } = await supabaseClient.from('service_categories').insert({
      key: form.key.trim(),
      label_ar: form.labelAr,
      label_ckb: form.labelCkb,
      sort_order: (categories?.length ?? 0),
      created_by: profile.id,
    });
    if (insertError) {
      setError(t('common.errorGeneric'));
      return;
    }
    setForm(emptyForm);
  }

  async function handleDelete(key) {
    await supabaseClient.from('service_categories').delete().eq('key', key);
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Tags className="h-5 w-5" aria-hidden="true" />
        {t('founderCategories.title')}
      </h2>

      <form onSubmit={handleAdd} className="mt-6 grid gap-3 sm:grid-cols-3">
        <input placeholder={t('founderCategories.keyLabel')} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderCategories.labelArLabel')} value={form.labelAr} onChange={(e) => setForm({ ...form, labelAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderCategories.labelCkbLabel')} value={form.labelCkb} onChange={(e) => setForm({ ...form, labelCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <button type="submit" className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderCategories.addCta')}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
      }

      {(categories ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderCategories.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(categories ?? []).map((cat) => (
            <li key={cat.key} className="flex items-center justify-between rounded-xl2 border border-black/5 p-3 dark:border-white/10">
              <span className="font-medium">{categoryLabel(cat, locale)}</span>
              <button type="button" onClick={() => handleDelete(cat.key)} className="text-red-600 hover:text-red-700 dark:text-red-300">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
