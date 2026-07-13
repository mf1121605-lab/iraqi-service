import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppShell from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useLocale } from '../../components/Layout/AppShell';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

export default function CustomerDashboard() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [banners, setBanners] = useState([]);
  const [slide, setSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [orderMessage, setOrderMessage] = useState('');
  const categories = useCategories();

  useEffect(() => {
    if (!profile) return undefined;

    function loadBanners() {
      supabaseClient
        .from('service_links')
        .select('id, title, subtitle, url, image_path')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => setBanners(data ?? []));
    }

    function loadProducts() {
      supabaseClient
        .from('products')
        .select('id, title, description, price, discount_price, image_path')
        .eq('is_active', true)
        .then(({ data }) => setProducts(data ?? []));
    }

    loadBanners();
    loadProducts();

    // A founder editing banners/products/settings must reach this screen
    // instantly if it's already open, not just on the next reload.
    const channel = supabaseClient
      .channel('customer-hub-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_links' }, loadBanners)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const interval = setInterval(() => setSlide((current) => (current + 1) % banners.length), 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const navItems = useMemo(
    () => [
      { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), active: true },
      { href: '/customer/requests', label: t('customerHub.myRequestsCta') },
      { href: '/chat', label: t('chat.roomsTitle') },
    ],
    [locale] // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function handleOrder(product) {
    setOrderMessage('');
    const price = product.discount_price ?? product.price;
    const { data, error } = await supabaseClient
      .from('orders')
      .insert({
        customer_id: profile.id,
        product_id: product.id,
        quantity: 1,
        unit_price: price,
        total_price: price,
      })
      .select('id')
      .single();

    if (error) {
      setOrderMessage(error.message);
      return;
    }
    router.push(`/customer/orders/${data.id}/checkout`);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  const currentBanner = banners[slide];

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-white shadow-glass">
        {currentBanner ? (
          <a href={currentBanner.url} className="block">
            <p className="text-sm text-white/70">{currentBanner.subtitle}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{currentBanner.title}</h2>
          </a>
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold">{t('customerHub.heroFallbackTitle')}</h2>
            <p className="mt-2 text-white/70">{t('customerHub.heroFallbackSubtitle')}</p>
          </div>
        )}
        {banners.length > 1 && (
          <div className="mt-6 flex gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setSlide(index)}
                aria-label={`slide-${index}`}
                className={`h-2 w-6 rounded-full transition ${index === slide ? 'bg-gold-300' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">{t('customerHub.categoriesTitle')}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map((category) => (
            <Link
              key={category.key}
              href={`/customer/requests/new?category=${category.key}`}
              className="glass-panel-dark rounded-xl2 p-6 text-center font-semibold shadow-soft transition hover:scale-[1.02]"
            >
              {categoryLabel(category, locale)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">{t('customerHub.dealsTitle')}</h3>
        {orderMessage && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{orderMessage}</p>}
        {products.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted dark:text-ink-dark-muted">{t('customerHub.dealsEmpty')}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl2 border border-black/5 p-5 shadow-soft dark:border-white/10">
                <h4 className="font-semibold">{product.title}</h4>
                <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{product.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  {product.discount_price ? (
                    <>
                      <span className="text-sm text-ink-muted line-through dark:text-ink-dark-muted">
                        {product.price} IQD
                      </span>
                      <span className="font-bold text-brand-700 dark:text-brand-300">
                        {product.discount_price} IQD
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">{product.price} IQD</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleOrder(product)}
                  className="mt-4 w-full rounded-xl2 bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700"
                >
                  {t('customerHub.orderCta')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
