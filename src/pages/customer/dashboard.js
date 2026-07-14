import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  MessageCircle,
  ShieldHalf,
  ShoppingBag,
  Sparkles,
  Tag,
} from 'lucide-react';
import AppShell from '../../components/Layout/AppShell';
import SafeImage from '../../components/UI/SafeImage';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useLocale } from '../../components/Layout/AppShell';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

const CATEGORY_ICONS = {
  military: ShieldHalf,
  education: GraduationCap,
  welfare: HeartHandshake,
  general: LayoutGrid,
};

function categoryIcon(key) {
  return CATEGORY_ICONS[key] ?? Sparkles;
}

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
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  const currentBanner = banners[slide];

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <section className="relative overflow-hidden rounded-4xl bg-gradient-hero p-10 text-white shadow-elevate-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-gold-300/10 blur-3xl" />
        {currentBanner ? (
          <a href={currentBanner.url} className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            {currentBanner.image_path && (
              <SafeImage
                src={currentBanner.image_path}
                alt={bilingualText(currentBanner, 'title', locale)}
                className="h-32 w-full shrink-0 rounded-2xl object-cover shadow-glass-sm sm:h-24 sm:w-40"
              />
            )}
            <div>
              <p className="text-sm text-white/70">{bilingualText(currentBanner, 'subtitle', locale)}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{bilingualText(currentBanner, 'title', locale)}</h2>
            </div>
          </a>
        ) : (
          <div className="relative">
            <h2 className="font-display text-2xl font-bold">{t('customerHub.heroFallbackTitle')}</h2>
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
                aria-label={`slide-${index}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === slide ? 'w-8 bg-gold-300' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">{t('customerHub.categoriesTitle')}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map((category) => {
            const Icon = categoryIcon(category.key);
            return (
              <Link
                key={category.key}
                href={`/customer/requests/new?category=${category.key}`}
                className="glass-panel-dark group flex flex-col items-center gap-3 rounded-2xl p-6 text-center font-semibold shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                {categoryLabel(category, locale)}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          {t('customerHub.dealsTitle')}
        </h3>
        {orderMessage && <p className="mt-2 animate-slide-down text-sm text-red-600 dark:text-red-300">{orderMessage}</p>}
        {products.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted dark:text-ink-dark-muted">{t('customerHub.dealsEmpty')}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-black/5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate dark:border-white/10"
              >
                <SafeImage
                  src={product.image_path}
                  alt={bilingualText(product, 'title', locale)}
                  className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="p-5">
                  <h4 className="font-semibold">{bilingualText(product, 'title', locale)}</h4>
                  <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
                    {bilingualText(product, 'description', locale)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-sm text-ink-muted line-through dark:text-ink-dark-muted">
                          {product.price} IQD
                        </span>
                        <span className="flex items-center gap-1 font-bold text-brand-700 dark:text-brand-300">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
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
                    className="mt-4 w-full rounded-xl2 bg-brand-600 px-4 py-2 font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate"
                  >
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
