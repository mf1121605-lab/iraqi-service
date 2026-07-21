import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ArrowLeft, ClipboardList, GraduationCap, LayoutGrid, MessageCircle, MessagesSquare, Newspaper, Search, ShoppingBag, Tag, Wrench } from 'lucide-react';
import AppShell from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import SafeImage from '../../components/UI/SafeImage';
import AnnouncementSlider from '../../components/UI/AnnouncementSlider';
import LazyVideo from '../../components/UI/LazyVideo';
import SparkOverlay from '../../components/UI/SparkOverlay';
import { MotionLink, buttonTap, cardLift } from '../../components/UI/Motion';
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

// Shared by the "الخدمات" and "الأدوات المهمة" sections — both render the
// exact same category-tile markup (media handling, LazyVideo, 3D fallback
// icon), just filtered to a different section_type, so the recent video
// performance fix (lazy IntersectionObserver playback in LazyVideo) is
// never duplicated or re-implemented, only reused.
function CategoryGrid({ categories, locale }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4">
      {categories.map((category) => {
        const visual = CATEGORY_3D[category.key] ?? CATEGORY_3D.general;
        // Every video uploaded through the Media Studio is now
        // auto-compressed to well under 1MB (see compressVideo.js), so
        // there's no longer a meaningful bandwidth cost to skip on a
        // slow connection — showing it is strictly better than a
        // generic icon fallback the founder didn't intend.
        const showVideo = Boolean(category.icon_video_url);
        const showImage = !showVideo && Boolean(category.icon_path);
        const hasMedia = showVideo || showImage;
        return (
          <MotionLink
            key={category.key}
            href={`/customer/requests/new?category=${category.key}`}
            {...cardLift}
            className={
              hasMedia
                ? 'group relative flex h-32 flex-col items-center justify-end overflow-hidden rounded-2xl border border-gold-400/20 text-center font-semibold text-white shadow-[0_0_30px_-12px_rgba(230,171,44,0.35)] sm:h-40 sm:rounded-[1.5rem] md:h-48'
                : 'metal-panel group flex flex-col items-center gap-2 p-4 text-center font-semibold text-ink-light dark:text-white sm:gap-3 sm:p-6'
            }
          >
            {hasMedia ? (
              <>
                {/* The card itself is the frame — media fills it edge to
                    edge instead of sitting inside a small icon circle. */}
                {showVideo ? (
                  <LazyVideo
                    src={category.icon_video_url}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={category.icon_path}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <SparkOverlay />
                  </>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <span className="relative z-10 p-2.5 text-sm drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:p-4 sm:text-base">
                  {categoryLabel(category, locale)}
                </span>
              </>
            ) : (
              <>
                <div className="icon-medallion h-16 w-16 sm:h-24 sm:w-24" style={{ '--medallion-glow': visual.glow }}>
                  <Icon3D variant={category.key} color={visual.color} className="h-14 w-14 sm:h-20 sm:w-20" />
                </div>
                <span className="text-sm sm:text-base">{categoryLabel(category, locale)}</span>
              </>
            )}
          </MotionLink>
        );
      })}
    </div>
  );
}

export default function CustomerDashboard() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [newsLinks, setNewsLinks] = useState([]);
  const [orderMessage, setOrderMessage] = useState('');
  const categories = useCategories();

  const serviceCategories = useMemo(() => (categories ?? []).filter((category) => category.section_type !== 'tools'), [categories]);
  const toolCategories = useMemo(() => (categories ?? []).filter((category) => category.section_type === 'tools'), [categories]);

  // Groups published news items under the category the founder assigned
  // them to (from /hq/news-links), in the same order categories are
  // defined — items with no category collect into a trailing "general" group.
  const newsLinkGroups = useMemo(() => {
    const byCategory = new Map();
    const general = [];
    newsLinks.forEach((item) => {
      if (!item.category) {
        general.push(item);
        return;
      }
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category).push(item);
    });
    const groups = (categories ?? [])
      .filter((category) => byCategory.has(category.key))
      .map((category) => ({ key: category.key, label: categoryLabel(category, locale), items: byCategory.get(category.key) }));
    if (general.length > 0) {
      groups.push({ key: '__general', label: t('customerHub.newsGeneralLabel'), items: general });
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsLinks, categories, locale]);

  useEffect(() => {
    if (!profile) return undefined;

    function loadBanners() {
      supabaseClient
        .from('announcements')
        .select(
          'id, title_ar, title_ckb, description_ar, description_ckb, image_url, mobile_image_url, video_url, badge_ar, badge_ckb, button_text_ar, button_text_ckb, button_link, background_color, text_color, display_order'
        )
        .eq('is_active', true)
        .order('display_order')
        .then(({ data }) => setBanners(data ?? []));
    }

    function loadProducts() {
      supabaseClient
        .from('products')
        .select('id, title_ar, title_ckb, description_ar, description_ckb, price, discount_price, image_path')
        .eq('is_active', true)
        .then(({ data }) => setProducts(data ?? []));
    }

    function loadNewsLinks() {
      supabaseClient
        .from('news_links')
        .select('id, title_ar, title_ckb, source, category, deadline, requirements_ar, requirements_ckb, required_documents, image_url, video_url')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .then(({ data }) => setNewsLinks(data ?? []));
    }

    loadBanners();
    loadProducts();
    loadNewsLinks();

    const channel = supabaseClient
      .channel('customer-hub-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, loadBanners)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_links' }, loadNewsLinks)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  const navItems = useMemo(
    () => [
      { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), active: true, icon: LayoutGrid },
      { href: '/customer/search', label: t('search.navLabel'), icon: Search },
      { href: '/customer/requests', label: t('customerHub.myRequestsCta'), icon: ClipboardList },
      { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
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
      <main className="flex min-h-dvh items-center justify-center text-ink-light dark:text-ink-dark">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      {banners.length > 0 ? (
        <AnnouncementSlider banners={banners} locale={locale} />
      ) : (
        <section className="cinematic-card relative overflow-hidden p-5 text-ink-light dark:text-white sm:p-8 md:p-10">
          <div className="iraq-flag-watermark pointer-events-none absolute inset-y-0 start-0 w-1/2 opacity-[0.05]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-gold-300/10 blur-xl [will-change:transform]" />
          <div className="relative">
            <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl md:text-2xl">{t('customerHub.heroFallbackTitle')}</h2>
            <p className="mt-2 text-sm text-ink-muted dark:text-white/70 sm:text-base">{t('customerHub.heroFallbackSubtitle')}</p>
          </div>
        </section>
      )}

      {newsLinkGroups.length > 0 && (
        <section className="metal-panel mt-6 p-4 text-ink-light dark:text-white sm:mt-10 sm:p-6">
          <h3 className="section-title-cinematic font-display text-base font-bold sm:text-xl">
            <Newspaper className="h-4 w-4 text-gold-600 dark:text-gold-300 sm:h-5 sm:w-5" aria-hidden="true" />
            {t('customerHub.newsLinksTitle')}
          </h3>
          {newsLinkGroups.map((group) => (
            <div key={group.key} className="mt-4 first:mt-3">
              {newsLinkGroups.length > 1 && (
                <p className="text-xs font-bold uppercase tracking-wide text-gold-700 dark:text-gold-300/80">{group.label}</p>
              )}
              <ul className="mt-2 space-y-3">
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-b border-black/5 pb-3 last:border-0 last:pb-0 dark:border-white/5">
                    {(item.image_url || item.video_url) && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
                        {item.image_url ? (
                          <SafeImage src={item.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video src={item.video_url} className="h-full w-full object-cover" controls />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gold-700 dark:text-gold-300">{bilingualText(item, 'title', locale)}</p>
                      {item.source && <p className="mt-0.5 text-xs text-ink-muted dark:text-white/50">{item.source}</p>}
                      {item.deadline && (
                        <p className="mt-0.5 text-xs text-ink-muted dark:text-white/50">
                          {t('customerHub.newsDeadlineLabel')}: {item.deadline}
                        </p>
                      )}
                      {bilingualText(item, 'requirements', locale) && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted dark:text-white/70">
                          {t('customerHub.newsRequirementsLabel')}: {bilingualText(item, 'requirements', locale)}
                        </p>
                      )}
                      {item.required_documents && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted dark:text-white/70">
                          {t('customerHub.newsRequiredDocumentsLabel')}: {item.required_documents}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 1. الخدمات */}
      <section className="mt-6 sm:mt-10">
        <h3 className="section-title-cinematic font-display text-base font-bold sm:text-xl">{t('customerHub.categoriesTitle')}</h3>
        <CategoryGrid categories={serviceCategories} locale={locale} />
      </section>

      {/* 2. الأدوات المهمة — header and container always render, even
          with zero tool-tagged categories yet, so the section exists as
          soon as the founder adds one instead of appearing/disappearing. */}
      <section className="mt-6 sm:mt-10">
        <h3 className="section-title-cinematic font-display text-base font-bold sm:text-xl">
          <Wrench className="h-4 w-4 text-gold-600 dark:text-gold-300 sm:h-5 sm:w-5" aria-hidden="true" />
          {t('customerHub.toolsTitle')}
        </h3>
        {toolCategories.length === 0 ? (
          <p className="mt-3 text-xs text-ink-muted dark:text-white/60 sm:mt-4 sm:text-sm">{t('customerHub.toolsEmpty')}</p>
        ) : (
          <CategoryGrid categories={toolCategories} locale={locale} />
        )}
      </section>

      {/* 3. مجتمع المحادثات الهادفة — a single standalone promo card, not
          individual chat_rooms rows scattered across the grid; it links
          out to the dedicated /chat rooms list. */}
      <section className="mt-6 sm:mt-10">
        <h3 className="section-title-cinematic font-display text-base font-bold sm:text-xl">
          <MessagesSquare className="h-4 w-4 text-gold-600 dark:text-gold-300 sm:h-5 sm:w-5" aria-hidden="true" />
          {t('customerHub.communityTitle')}
        </h3>
        <MotionLink
          href="/chat"
          {...cardLift}
          className="cinematic-card group relative mt-4 flex items-center gap-3 overflow-hidden p-4 text-ink-light dark:text-white sm:mt-5 sm:gap-4 sm:p-6 md:p-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-float rounded-full bg-gold-300/10 blur-xl [will-change:transform]" />
          <span className="icon-medallion relative h-12 w-12 shrink-0 sm:h-16 sm:w-16 md:h-20 md:w-20" style={{ '--medallion-glow': 'rgba(230,171,44,0.5)' }}>
            <MessagesSquare className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="relative min-w-0 flex-1">
            <h4 className="font-display text-sm font-bold sm:text-lg md:text-xl">{t('customerHub.communityTitle')}</h4>
            <p className="mt-0.5 text-xs text-ink-muted dark:text-white/70 sm:mt-1 sm:text-sm">{t('customerHub.communityCardSubtitle')}</p>
          </div>
          <ArrowLeft
            className="relative h-4 w-4 shrink-0 text-gold-600 dark:text-gold-300 transition-transform duration-300 rtl:rotate-180 sm:h-5 sm:w-5 group-hover:-translate-x-1 rtl:group-hover:translate-x-1"
            aria-hidden="true"
          />
        </MotionLink>
      </section>

      {/* 4. العروض والمتاجر */}
      <section className="mt-6 sm:mt-10">
        <h3 className="section-title-cinematic font-display text-base font-bold sm:text-xl">
          <ShoppingBag className="h-4 w-4 text-gold-600 dark:text-gold-300 sm:h-5 sm:w-5" aria-hidden="true" />
          {t('customerHub.offersTitle')}
        </h3>
        {orderMessage && <p className="mt-2 animate-slide-down text-sm text-red-600 dark:text-red-400">{orderMessage}</p>}
        {products.length === 0 ? (
          <p className="mt-3 text-xs text-ink-muted dark:text-white/60 sm:mt-4 sm:text-sm">{t('customerHub.dealsEmpty')}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {products.map((product) => (
              <motion.div
                key={product.id}
                {...cardLift}
                className="cinematic-card group overflow-hidden !rounded-2xl transition-colors duration-300 hover:border-gold-400/30 hover:shadow-elevate"
              >
                <SafeImage
                  src={product.image_path}
                  alt={bilingualText(product, 'title', locale)}
                  className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-36"
                />
                <div className="p-3 sm:p-5">
                  <h4 className="text-sm font-semibold text-ink-light dark:text-white sm:text-base">{bilingualText(product, 'title', locale)}</h4>
                  <p className="mt-1 text-xs text-ink-muted dark:text-white/60 sm:text-sm">{bilingualText(product, 'description', locale)}</p>
                  <div className="mt-2 flex items-center gap-2 sm:mt-3">
                    {product.discount_price ? (
                      <>
                        <span className="text-xs text-ink-muted dark:text-white/40 line-through sm:text-sm">{product.price} IQD</span>
                        <span className="flex items-center gap-1 text-sm font-bold text-gold-700 dark:text-gold-300">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                          {product.discount_price} IQD
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-ink-light dark:text-white">{product.price} IQD</span>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => handleOrder(product)}
                    {...buttonTap}
                    className="btn-cinematic-gold mt-3 w-full px-4 py-2 text-xs sm:mt-4 sm:py-2.5 sm:text-sm"
                  >
                    {t('customerHub.orderCta')}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
