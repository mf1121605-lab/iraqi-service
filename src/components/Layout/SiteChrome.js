import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { defaultLocale, getStoredLocale } from '../../utils/i18n';
import { siteText, useSiteSettings } from '../../utils/useSiteSettings';

function useAppLocale() {
  const [locale, setLocale] = useState(defaultLocale);
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);
  return locale;
}

// A founder-uploaded image sits as a dim layer above the site's default
// cinematic black gradient (still visible underneath) rather than
// replacing it outright, so text/cards stay legible without per-page
// contrast tuning. A solid color, if set instead, fully overrides it.
function SiteBackground({ imagePath, color }) {
  if (!imagePath && !color) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={
        color
          ? { backgroundColor: color }
          : { backgroundImage: `url(${imagePath})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }
      }
    />
  );
}

function AnnouncementBar({ settings, locale }) {
  const [dismissed, setDismissed] = useState(false);
  if (!settings?.announcement_enabled || dismissed) return null;
  const text = siteText(settings, locale, 'announcement_text');
  if (!text) return null;

  return (
    <div className="relative z-50 flex items-center justify-center gap-3 bg-gold-500 px-4 py-2 text-center text-sm font-semibold text-black">
      <span>{text}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="close"
        className="absolute end-3 rounded-full p-1 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/40"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Isolated behind next/dynamic(ssr:false) in _app.js so the Supabase
// client it (transitively, via useSiteSettings) requires doesn't get
// pulled into every page's synchronously-loaded shared bundle — this
// component only affects decorative chrome, so a brief post-hydration
// pop-in is an acceptable trade for not taxing every route's first load.
export default function SiteChrome({ onSettings }) {
  const locale = useAppLocale();
  const settings = useSiteSettings();

  useEffect(() => {
    onSettings?.(settings);
  }, [settings, onSettings]);

  return (
    <>
      <SiteBackground imagePath={settings?.background_image_path} color={settings?.background_color} />
      <AnnouncementBar settings={settings} locale={locale} />
    </>
  );
}
