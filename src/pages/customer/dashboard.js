import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ClipboardList, LayoutGrid, MessageCircle, ShoppingBag, Tag } from 'lucide-react';
import AppShell from '../../components/Layout/AppShell';
import SafeImage from '../../components/UI/SafeImage';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useLocale } from '../../components/Layout/AppShell';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

// WebGL needs a browser, so the 3D badge is client-only.
const Icon3D = dynamic(() => import('../../components/UI/Icon3D'), { ssr: false });

const CATEGORY_3D = {
  military: { color: '#c9d3dc', glow: 'rgba(201,211,220,0.5)' },
  education: { color: '#4f8bff', glow: 'rgba(79,139,255,0.55)' },
  welfare: { color: '#e14b6a', glow: 'rgba(225,75,106,0.55)' },
  general: { color: '#e6ab2c', glow: 'rgba(230,171,44,0.55)' },
};

function bilingualText(row, base, locale) {
  return (locale === 'ckb' ? row[`${base}_ckb`] : row[`${base}_ar`]) || row[`${base}_ar`] || '';
}

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
        .select('id, title_ar, title_ckb, subtitle_ar, subtitle_ckb, url, image_path')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => setBanners(data ?? []));
    }

    function loadProducts() {
      supabaseClient
        .from('products')
        .select('id, title_ar, title_ckb, description_ar, description_ckb, price, discount_price, image_path')
        .eq('is_active', true)
        .then(({ data }) => setProducts(data ?? []));
    }

    loadBanners();
    loadProducts();

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
      { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), active: true, icon: LayoutGrid },
      { href: '/customer/requests', label: t('customerHub.myRequestsCta'), icon: ClipboardList },
      { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
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
      setOrderMessage(t('common.errorGeneric'));
      return;
    }
    router.push(`/customer/orders/${data.id}/checkout`);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mesh-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  const currentBanner = banners[slide];

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <section className="cinematic-card relative overflow-hidden p-10 text-white">
        <div className="iraq-flag-watermark pointer-events-none absolute inset-y-0 start-0 w-1/2 opacity-[0.05]" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-gold-300/10 blur-3xl" />
        {currentBanner ? (
          <a href={currentBanner.url} className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            {currentBanner.image_path && (
              <SafeImage
                src={currentBanner.image_path}
                alt={bilingualText(currentBanner, 'title', locale)}
                className="h-32 w-full shrink-0 rounded-2xl border border-gold-400/20 object-cover shadow-glass-sm sm:h-24 sm:w-40"
              />
            )}
            <div>
              <p className="text-sm text-gold-300/80">{bilingualText(currentBanner, 'subtitle', locale)}</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{bilingualText(currentBanner, 'title', locale)}</h2>
            </div>
          </a>
        ) : (
          <div className="relative">
            <h2 className="font-display text-2xl font-bold tracking-tight">{t('customerHub.heroFallbackTitle')}</h2>
            <p className="mt-2 text-white/70">{t('customerHub.heroFallbackSubtitle')}</p>
          </div>
        )}
        {banners.length > 1 && (
          <div className="relative mt-6 flex gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setSlide(index)}
                aria-label={`${t('customerHub.goToSlide')} ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-300 ${
                  index === slide ? 'w-8 bg-gold-300' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="section-title-cinematic font-display text-xl font-bold">{t('customerHub.categoriesTitle')}</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map((category) => {
            const visual = CATEGORY_3D[category.key] ?? CATEGORY_3D.general;
            return (
              <Link
                key={category.key}
                href={`/customer/requests/new?category=${category.key}`}
                className="metal-panel group flex flex-col items-center gap-3 p-6 text-center font-semibold text-white"
              >
                <div className="icon-medallion h-24 w-24" style={{ '--medallion-glow': visual.glow }}>
                  <Icon3D variant={category.key} color={visual.color} className="h-20 w-20" />
                </div>
                <span>{categoryLabel(category, locale)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="section-title-cinematic font-display text-xl font-bold">
          <ShoppingBag className="h-5 w-5 text-gold-300" aria-hidden="true" />
          {t('customerHub.dealsTitle')}
        </h3>
        {orderMessage && <p className="mt-2 animate-slide-down text-sm text-red-400">{orderMessage}</p>}
        {products.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">{t('customerHub.dealsEmpty')}</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="glass-panel-dark group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-elevate"
              >
                <SafeImage
                  src={product.image_path}
                  alt={bilingualText(product, 'title', locale)}
                  className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="p-5">
                  <h4 className="font-semibold text-white">{bilingualText(product, 'title', locale)}</h4>
                  <p className="mt-1 text-sm text-white/60">{bilingualText(product, 'description', locale)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-sm text-white/40 line-through">{product.price} IQD</span>
                        <span className="flex items-center gap-1 font-bold text-gold-300">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                          {product.discount_price} IQD
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-white">{product.price} IQD</span>
                    )}
                  </div>
                  <button type="button" onClick={() => handleOrder(product)} className="btn-cinematic-gold mt-4 w-full px-4 py-2.5 text-sm">
                    {t('customerHub.orderCta')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
