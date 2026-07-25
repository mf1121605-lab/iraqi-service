import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import SafeImage from './SafeImage';
import LazyVideo from './LazyVideo';
import SparkOverlay from './SparkOverlay';
import MotionGraphicsBanner from './MotionGraphicsBanner';
import { translate } from '../../utils/i18n';
import { supabaseClient } from '../../lib/supabaseClient';

const AUTOPLAY_MS = 6000;
const SWIPE_CONFIDENCE_THRESHOLD = 10000;

// Columns fetched when the slider self-manages its data (customer page).
const BANNER_SELECT =
  'id, title_ar, title_ckb, description_ar, description_ckb, image_url, mobile_image_url, video_url, badge_ar, badge_ckb, button_text_ar, button_text_ckb, button_link, background_color, text_color, display_order, motion_graphic_key';

// Single source of truth for container height — used on both the skeleton
// and the live slider so the browser never changes layout height between
// states (zero CLS during fetch, transition, and polling refresh).
const HEIGHT_CLS = 'h-52 md:h-[17rem] lg:h-80';

function bilingualText(row, base, locale) {
  return (locale === 'ckb' ? row[`${base}_ckb`] : row[`${base}_ar`]) || row[`${base}_ar`] || '';
}

function swipePower(offset, velocity) {
  return Math.abs(offset) * velocity;
}

const slideVariants = {
  enter: { opacity: 0, scale: 0.97 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

// ─── Component ────────────────────────────────────────────────────────────────
// Two usage modes:
//   1. Self-managed (customer page):  <AnnouncementSlider locale={locale} />
//      — fetches its own data, polls every 3 min, completely isolated from
//        the parent's state so parent re-renders never touch the slider.
//   2. Controlled (founder preview):  <AnnouncementSlider banners={...} canEdit onEdit={...} />
//      — receives banners from the parent (live edit preview stays consistent).
//
// `fallback` is an optional ReactNode rendered when self-managed fetch returns
// zero rows — lets the caller show a branded empty-state card.
function AnnouncementSlider({ banners: bannersProp, locale, canEdit, onEdit, fallback }) {
  const selfManaged = bannersProp === undefined;

  // ── Self-managed fetch state (hooks must be unconditional) ──────────────
  const [selfBanners, setSelfBanners] = useState([]);
  // Controlled mode is always "ready"; self-managed starts false until first load.
  const [ready, setReady] = useState(!selfManaged);

  // ── Slide navigation state ──────────────────────────────────────────────
  const [[index, direction], setSlide] = useState([0, 0]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // ── Derived values (not hooks) ──────────────────────────────────────────
  const banners = selfManaged ? selfBanners : (bannersProp ?? []);
  const count = banners.length;
  const t = (path) => translate(locale, path);

  function paginate(newDirection) {
    setSlide(([current]) => {
      const next = (current + newDirection + count) % count;
      return [next, newDirection];
    });
  }

  function goTo(targetIndex) {
    setSlide(([current]) => [targetIndex, targetIndex > current ? 1 : -1]);
  }

  // ── Effect 1: self-managed data fetch + 3-min poll ─────────────────────
  useEffect(() => {
    if (!selfManaged) return undefined;

    function load() {
      supabaseClient
        .from('announcements')
        .select(BANNER_SELECT)
        .eq('is_active', true)
        .order('display_order')
        .then(({ data }) => {
          setSelfBanners(data ?? []);
          setReady(true);
        });
    }

    load();
    const poll = setInterval(load, 3 * 60 * 1000);

    function onVisibility() {
      if (!document.hidden) load();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selfManaged]);

  // ── Effect 2: autoplay timer ────────────────────────────────────────────
  useEffect(() => {
    if (count < 2 || paused) return undefined;
    timerRef.current = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, paused, index]);

  // ── Diagnostic re-render log (stripped in production) ──────────────────
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[AnnouncementSlider] render', { count, ready, selfManaged });
  }

  // ── Conditional renders — ALL hooks above this line ─────────────────────
  // Skeleton: same dimensions as the live container → zero height change on swap.
  if (!ready) {
    return <div className={`${HEIGHT_CLS} animate-pulse overflow-hidden rounded-[1.75rem] bg-white/[0.05]`} />;
  }
  if (count === 0) return fallback ?? null;

  const banner = banners[index];

  return (
    /* Outer container: explicit height (HEIGHT_CLS) so the browser reserves
       space before slide content paints — prevents CLS on initial render
       and during AnimatePresence exit→enter transitions. The dots are
       absolutely positioned so they don't add to the layout-flow height. */
    <div
      className={`relative ${HEIGHT_CLS} overflow-hidden rounded-[1.75rem] border border-gold-400/20 bg-white/[0.03] shadow-[0_0_50px_-15px_rgba(230,171,44,0.35)] backdrop-blur-xl`}
      style={{ contain: 'paint' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={banner.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: 'spring', stiffness: 300, damping: 32 }, opacity: { duration: 0.2 } }}
          drag={count > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragStart={() => setPaused(true)}
          onDragEnd={(event, { offset, velocity }) => {
            const power = swipePower(offset.x, velocity.x);
            if (power < -SWIPE_CONFIDENCE_THRESHOLD) paginate(1);
            else if (power > SWIPE_CONFIDENCE_THRESHOLD) paginate(-1);
            setPaused(false);
          }}
          className="absolute inset-0 text-white"
          style={{ backgroundColor: banner.background_color, color: banner.text_color, touchAction: count > 1 ? 'pan-y' : undefined }}
        >
          {/* Motion graphic takes priority — no file download needed, works
              on any connection. Falls back to video, then image, then plain bg. */}
          {banner.motion_graphic_key ? (
            <MotionGraphicsBanner
              type={banner.motion_graphic_key}
              titleAr={banner.title_ar}
              titleCkb={banner.title_ckb}
              locale={locale}
            />
          ) : banner.video_url ? (
            <LazyVideo src={banner.video_url} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            (banner.mobile_image_url || banner.image_url) && (
              <>
                {banner.mobile_image_url && (
                  <SafeImage
                    src={banner.mobile_image_url}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${banner.image_url ? 'sm:hidden' : ''}`}
                  />
                )}
                {banner.image_url && (
                  <SafeImage
                    src={banner.image_url}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${banner.mobile_image_url ? 'hidden sm:block' : ''}`}
                  />
                )}
                <SparkOverlay />
              </>
            )
          )}
          {(banner.motion_graphic_key || banner.video_url || banner.image_url || banner.mobile_image_url) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          )}

          <div className="iraq-flag-watermark pointer-events-none absolute inset-y-0 start-0 w-1/2 opacity-[0.05]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-gold-300/10 blur-xl [will-change:transform]" />

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(banner);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={t('common.edit')}
              className="absolute end-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-gold-300 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/60 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 md:p-7">
            {/* Glassmorphism panel: frosted backdrop-blur over the media so
                text stays legible regardless of what's playing behind it. */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md sm:p-4 md:p-5">
              {bilingualText(banner, 'badge', locale) && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold"
                >
                  {bilingualText(banner, 'badge', locale)}
                </motion.span>
              )}
              <h2 className="font-display text-base font-bold tracking-tight sm:text-xl md:text-2xl">{bilingualText(banner, 'title', locale)}</h2>
              {bilingualText(banner, 'description', locale) && (
                <p className="mt-1 text-xs opacity-80 sm:text-sm md:text-base">{bilingualText(banner, 'description', locale)}</p>
              )}
              {banner.button_link && bilingualText(banner, 'button_text', locale) && (
                <a
                  href={banner.button_link}
                  className="mt-2 inline-flex items-center rounded-xl2 bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/25 sm:mt-3 sm:px-4 sm:py-2 sm:text-sm"
                >
                  {bilingualText(banner, 'button_text', locale)}
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-2">
          {banners.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${t('customerHub.goToSlide')} ${i + 1}`}
              className="relative h-2 w-8 overflow-hidden rounded-full bg-white/20 transition-colors hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              {i === index && (
                <motion.span
                  layoutId="announcement-slider-active-dot"
                  className="absolute inset-0 rounded-full bg-gold-300"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(AnnouncementSlider);
