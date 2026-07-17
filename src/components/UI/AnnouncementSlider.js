import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import SafeImage from './SafeImage';
import LazyVideo from './LazyVideo';
import SparkOverlay from './SparkOverlay';
import { translate } from '../../utils/i18n';
import { useSlowConnection } from '../../utils/useSlowConnection';

const AUTOPLAY_MS = 6000;
const SWIPE_CONFIDENCE_THRESHOLD = 10000;

function bilingualText(row, base, locale) {
  return (locale === 'ckb' ? row[`${base}_ckb`] : row[`${base}_ar`]) || row[`${base}_ar`] || '';
}

function swipePower(offset, velocity) {
  return Math.abs(offset) * velocity;
}

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 60 : -60, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction) => ({ x: direction < 0 ? 60 : -60, opacity: 0, scale: 0.98 }),
};

// A dedicated slider so the hero's autoplay/swipe/motion logic isn't
// tangled into the dashboard page itself. Framer Motion drives the slide
// transition (spring physics) and the drag-to-swipe gesture; plain CSS
// handles everything that doesn't need to be interrupted mid-animation
// (the glass panel, the glow, the dots' resting state).
export default function AnnouncementSlider({ banners, locale, canEdit, onEdit }) {
  const [[index, direction], setSlide] = useState([0, 0]);
  const [paused, setPaused] = useState(false);
  const isSlowConnection = useSlowConnection();
  const t = (path) => translate(locale, path);
  const count = banners.length;
  const timerRef = useRef(null);

  function paginate(newDirection) {
    setSlide(([current]) => {
      const next = (current + newDirection + count) % count;
      return [next, newDirection];
    });
  }

  function goTo(targetIndex) {
    setSlide(([current]) => [targetIndex, targetIndex > current ? 1 : -1]);
  }

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    timerRef.current = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, paused, index]);

  if (count === 0) return null;
  const banner = banners[index];

  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] border border-gold-400/20 bg-white/[0.03] shadow-[0_0_50px_-15px_rgba(230,171,44,0.35)] backdrop-blur-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={banner.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: 'spring', stiffness: 300, damping: 32 }, opacity: { duration: 0.25 } }}
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
          className="relative h-64 text-white sm:h-72"
          style={{ backgroundColor: banner.background_color, color: banner.text_color, touchAction: count > 1 ? 'pan-y' : undefined }}
        >
          {/* Video wins over image when both are set — the founder picks one
              or the other in the Media Studio, this is just a safe order.
              On a detected slow/data-saver connection the video is skipped
              entirely rather than left to stall; the banner still shows its
              background color and text, just without the clip. */}
          {banner.video_url && !isSlowConnection ? (
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
          {(banner.video_url || banner.image_url || banner.mobile_image_url) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          )}

          <div className="iraq-flag-watermark pointer-events-none absolute inset-y-0 start-0 w-1/2 opacity-[0.05]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-gold-300/10 blur-3xl" />

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

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            {/* Glassmorphism panel: frosted backdrop-blur over the media so
                text stays legible regardless of what's playing behind it. */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md sm:p-5">
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
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{bilingualText(banner, 'title', locale)}</h2>
              {bilingualText(banner, 'description', locale) && (
                <p className="mt-1 text-sm opacity-80 sm:text-base">{bilingualText(banner, 'description', locale)}</p>
              )}
              {banner.button_link && bilingualText(banner, 'button_text', locale) && (
                <a
                  href={banner.button_link}
                  className="mt-3 inline-flex items-center rounded-xl2 bg-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/25"
                >
                  {bilingualText(banner, 'button_text', locale)}
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div className="relative z-10 flex justify-center gap-2 pb-5">
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
