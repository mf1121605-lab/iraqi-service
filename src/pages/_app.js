import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { MotionConfig } from 'framer-motion';
import { Cairo, Noto_Sans_Arabic, Tajawal } from 'next/font/google';
import SplashScreen from '../components/UI/SplashScreen';
import ErrorBoundary from '../components/UI/ErrorBoundary';
import PermissionPrompt from '../components/UI/PermissionPrompt';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/globals.css';

// Dynamically loaded (ssr:false) so the Supabase client it needs doesn't
// end up in every page's synchronous shared bundle — see SiteChrome.js.
const SiteChrome = dynamic(() => import('../components/Layout/SiteChrome'), { ssr: false });
const InteractiveBackground3D = dynamic(
  () => import('../components/UI/InteractiveBackground3D'),
  { ssr: false }
);
// Persistent shell for all customer + chat routes — renders header/nav once,
// never remounts between tab navigations (same tree position in _app.js).
const CustomerShell = dynamic(() => import('../components/Layout/CustomerShell'), { ssr: false });

function isCustomerShellRoute(pathname) {
  if (pathname.startsWith('/customer/')) {
    if (pathname === '/customer/onboarding') return false;
    if (pathname.startsWith('/customer/orders/')) return false;
    if (pathname.endsWith('/matching')) return false;
    if (pathname.startsWith('/customer/tutor/session/')) return false;
    return true;
  }
  // Chat rooms list + DM threads use AppShell; individual group-chat rooms
  // (/chat/[slug]) are standalone full-screen pages and stay outside the shell.
  if (pathname === '/chat') return true;
  if (pathname.startsWith('/chat/dm/')) return true;
  return false;
}

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-arabic',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [siteSettings, setSiteSettings] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const handleSettings = useCallback((settings) => setSiteSettings(settings), []);

  // Apply founder-controlled CSS custom properties so every element
  // that references var(--color-accent) / var(--color-bg) updates instantly
  // for all visitors without a page reload.
  useEffect(() => {
    const root = document.documentElement;
    if (siteSettings?.accent_color) {
      root.style.setProperty('--color-accent', siteSettings.accent_color);
    } else {
      root.style.removeProperty('--color-accent');
    }
    if (siteSettings?.bg_color) {
      root.style.setProperty('--color-bg', siteSettings.bg_color);
    } else {
      root.style.removeProperty('--color-bg');
    }
  }, [siteSettings]);

  useEffect(() => {
    let timer;
    // Only show the overlay if navigation takes longer than 150 ms.
    // Pre-rendered/prefetched pages complete in <50 ms so the spinner
    // never flashes for them; genuinely slow routes still get it.
    const start = () => { timer = setTimeout(() => setTransitioning(true), 150); };
    const end = () => { clearTimeout(timer); setTransitioning(false); };
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    return () => {
      clearTimeout(timer);
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router.events]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className={`${tajawal.variable} ${notoSansArabic.variable} ${cairo.variable} contents`}>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <div className="fixed inset-0 -z-10 pointer-events-none" style={{ backgroundColor: 'var(--color-bg, #0d1117)' }}>
            <InteractiveBackground3D />
          </div>
          {transitioning && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg, #0d1117)' }}>
              <LoadingSpinner />
            </div>
          )}
          <PermissionPrompt />
          <SplashScreen />
          <SiteChrome onSettings={handleSettings} />
          {isCustomerShellRoute(router.pathname) ? (
            <CustomerShell pathname={router.pathname}>
              <Component {...pageProps} siteSettings={siteSettings} />
            </CustomerShell>
          ) : (
            <Component {...pageProps} siteSettings={siteSettings} />
          )}
          <div className="grain-overlay" aria-hidden="true" />
          <div className="cinematic-frame" aria-hidden="true" />
          <div className="cinematic-frame-corner top-left" aria-hidden="true" />
          <div className="cinematic-frame-corner top-right" aria-hidden="true" />
          <div className="cinematic-frame-corner bottom-left" aria-hidden="true" />
          <div className="cinematic-frame-corner bottom-right" aria-hidden="true" />
        </ErrorBoundary>
      </MotionConfig>
    </div>
  );
}
