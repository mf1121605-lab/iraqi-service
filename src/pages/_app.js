import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { MotionConfig } from 'framer-motion';
import { Cairo, Noto_Sans_Arabic } from 'next/font/google';
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

  useEffect(() => {
    const start = () => setTransitioning(true);
    const end = () => setTransitioning(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router.events]);

  return (
    <div className={`${notoSansArabic.variable} ${cairo.variable} contents`}>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <div className="fixed inset-0 -z-10 pointer-events-none bg-[#0d1117]">
            <InteractiveBackground3D />
          </div>
          {transitioning && (
            <div className="fixed inset-0 z-[150] bg-[#0d1117] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
          <PermissionPrompt />
          <SplashScreen />
          <SiteChrome onSettings={handleSettings} />
          <Component {...pageProps} siteSettings={siteSettings} />
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
