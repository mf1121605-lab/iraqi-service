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
  // Realtime already, via useCategories — a co_admin editing this same
  // page elsewhere shows up here live too.
  const categories = useCategories({ activeOnly: false });

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.key || !form.labelAr || !form.labelCkb) return;
    const { error: insertError } = await supabaseClient.from('categories').insert({
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

  async function toggleActive(category) {
    await supabaseClient.from('categories').update({ is_active: !category.is_active }).eq('key', category.key);
  }

  async function handleDelete(category) {
    setError('');
    const { error: deleteError } = await supabaseClient.from('categories').delete().eq('key', category.key);
    if (deleteError) {
      setError(t('founderCategories.deleteBlockedMessage'));
    }
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Tags className="h-5 w-5" aria-hidden="true" />
        {t('founderCategories.title')}
      </h2>

      {error && <p className="mt-3 animate-slide-down text-sm text-red-600 dark:text-red-300">{error}</p>}

      <ul className="mt-4 space-y-2">
        {(categories ?? []).map((category) => (
          <li
            key={category.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-black/5 p-3 text-sm transition-all duration-200 hover:shadow-soft dark:border-white/10"
          >
            <div>
              <p className="font-semibold">{categoryLabel(category, locale)}</p>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted" dir="ltr">
                {category.key}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={category.is_active}
                  onChange={() => toggleActive(category)}
                  className="h-4 w-4 rounded border-black/20 text-brand-600 focus:ring-brand-400"
                />
                {t('founderCategories.activeLabel')}
              </label>
              <button
                type="button"
                onClick={() => handleDelete(category)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-red-300"
                aria-label={t('founderCategories.deleteCta')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleAdd}
        className="mt-8 grid gap-3 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60 sm:grid-cols-3"
      >
        <input
          value={form.key}
          onChange={(event) => setForm({ ...form, key: event.target.value.trim() })}
          aria-label={t('founderCategories.keyPlaceholder')}
          placeholder={t('founderCategories.keyPlaceholder')}
          dir="ltr"
          className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
        />
        <input
          value={form.labelAr}
          onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
          aria-label={t('founderCategories.labelArLabel')}
          placeholder={t('founderCategories.labelArLabel')}
          className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
        />
        <input
          value={form.labelCkb}
          onChange={(event) => setForm({ ...form, labelCkb: event.target.value })}
          aria-label={t('founderCategories.labelCkbLabel')}
          placeholder={t('founderCategories.labelCkbLabel')}
          className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 sm:col-span-3 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderCategories.addCta')}
        </button>
      </form>
    </AppShell>
  );
}
