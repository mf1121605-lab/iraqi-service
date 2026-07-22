import { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = { titleAr: '', titleCkb: '', descAr: '', descCkb: '', price: '', discount: '', imagePath: '' };

export default function FounderProducts() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'products');
  const [products, setProducts] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => setProducts(data ?? []));
  }, [profile]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!form.titleAr || !form.price) return;
    await supabaseClient.from('products').insert({
      title_ar: form.titleAr,
      title_ckb: form.titleCkb || null,
      description_ar: form.descAr || null,
      description_ckb: form.descCkb || null,
      price: Number(form.price),
      discount_price: form.discount ? Number(form.discount) : null,
      image_path: form.imagePath || null,
      is_active: true,
      created_by: profile.id,
    });
    setForm(emptyForm);
    supabaseClient.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => setProducts(data ?? []));
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Package className="h-5 w-5" aria-hidden="true" />
        {t('founderProducts.title')}
      </h2>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
          <input aria-label={t('founderProducts.titleArLabel')} placeholder={t('founderProducts.titleArLabel')} value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.titleCkbLabel')} placeholder={t('founderProducts.titleCkbLabel')} value={form.titleCkb} onChange={(e) => setForm({ ...form, titleCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.descriptionArLabel')} placeholder={t('founderProducts.descriptionArLabel')} value={form.descAr} onChange={(e) => setForm({ ...form, descAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.descriptionCkbLabel')} placeholder={t('founderProducts.descriptionCkbLabel')} value={form.descCkb} onChange={(e) => setForm({ ...form, descCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.priceLabel')} type="number" placeholder={t('founderProducts.priceLabel')} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} dir="ltr" className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.discountLabel')} type="number" placeholder={t('founderProducts.discountLabel')} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} dir="ltr" className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderProducts.imageLabel')} placeholder={t('founderProducts.imageLabel')} value={form.imagePath} onChange={(e) => setForm({ ...form, imagePath: e.target.value })} dir="ltr" className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <button type="submit" className="flex items-center justify-center gap-1.5 sm:col-span-2 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('founderProducts.addCta')}
          </button>
        </form>
      </section>

      {(products ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderProducts.empty')}</p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {(products ?? []).map((product) => (
            <li
              key={product.id}
              className="rounded-xl2 border border-black/5 p-3 text-sm transition-all duration-200 hover:shadow-soft dark:border-white/10"
            >
              <p className="font-semibold">{product.title_ar}</p>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted" dir="ltr">
                {product.price} IQD
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
