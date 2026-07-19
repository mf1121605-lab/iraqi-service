import { useEffect, useState } from 'react';
import { ListTree, Plus, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { categoryLabel, useCategories } from '../../utils/useCategories';
import { translate } from '../../utils/i18n';

const emptyForm = { categoryKey: '', labelAr: '', labelCkb: '' };

export default function FounderCategoryServices() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'category-services');
  const categories = useCategories({ activeOnly: false });
  const [services, setServices] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return undefined;

    function load() {
      supabaseClient
        .from('category_services')
        .select('*')
        .order('category_key')
        .order('sort_order')
        .then(({ data }) => setServices(data ?? []));
    }

    load();
    const channel = supabaseClient
      .channel('category-services-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_services' }, load)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.categoryKey || !form.labelAr || !form.labelCkb) return;
    const { error: insertError } = await supabaseClient.from('category_services').insert({
      category_key: form.categoryKey,
      label_ar: form.labelAr,
      label_ckb: form.labelCkb,
      sort_order: (services?.filter((s) => s.category_key === form.categoryKey).length ?? 0),
      created_by: profile.id,
    });
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    setForm({ ...emptyForm, categoryKey: form.categoryKey });
  }

  async function toggleActive(service) {
    await supabaseClient.from('category_services').update({ is_active: !service.is_active }).eq('id', service.id);
  }

  async function handleDelete(service) {
    await supabaseClient.from('category_services').delete().eq('id', service.id);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="section-title-cinematic font-display text-lg font-bold">
        <ListTree className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderCategoryServices.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderCategoryServices.hint')}</p>

      {error && <p className="mt-3 animate-slide-down text-sm text-red-400">{error}</p>}

      <form onSubmit={handleAdd} className="metal-panel mt-6 grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={form.categoryKey}
          onChange={(event) => setForm({ ...form, categoryKey: event.target.value })}
          className="input-cinematic text-sm"
        >
          <option value="" className="text-black">
            {t('founderCategoryServices.categoryPlaceholder')}
          </option>
          {(categories ?? []).map((category) => (
            <option key={category.key} value={category.key} className="text-black">
              {categoryLabel(category, locale)}
            </option>
          ))}
        </select>
        <input
          value={form.labelAr}
          onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
          placeholder={t('founderCategoryServices.labelArLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.labelCkb}
          onChange={(event) => setForm({ ...form, labelCkb: event.target.value })}
          placeholder={t('founderCategoryServices.labelCkbLabel')}
          className="input-cinematic text-sm"
        />
        <button type="submit" className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderCategoryServices.addCta')}
        </button>
      </form>

      {services === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : (
        (categories ?? []).map((category) => {
          const categoryServices = services.filter((service) => service.category_key === category.key);
          if (categoryServices.length === 0) return null;
          return (
            <section key={category.key} className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-gold-300">{categoryLabel(category, locale)}</h3>
              <ul className="space-y-2">
                {categoryServices.map((service) => (
                  <li
                    key={service.id}
                    className="metal-panel flex flex-wrap items-center justify-between gap-2 p-3 text-white"
                  >
                    <span className="text-sm font-semibold">{locale === 'ckb' ? service.label_ckb : service.label_ar}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs text-white/80">
                        <input
                          type="checkbox"
                          checked={service.is_active}
                          onChange={() => toggleActive(service)}
                          className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
                        />
                        {t('founderCategories.activeLabel')}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDelete(service)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                        aria-label={t('founderCategories.deleteCta')}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </AppShell>
  );
}
