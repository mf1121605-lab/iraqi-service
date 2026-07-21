import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { MotionConfig } from 'framer-motion';
import { Cairo, Noto_Sans_Arabic } from 'next/font/google';
import SplashScreen from '../components/UI/SplashScreen';
import ErrorBoundary from '../components/UI/ErrorBoundary';
import PermissionPrompt from '../components/UI/PermissionPrompt';
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
  const [siteSettings, setSiteSettings] = useState(null);
  const handleSettings = useCallback((settings) => setSiteSettings(settings), []);

  return (
    <div className={`${notoSansArabic.variable} ${cairo.variable} contents`}>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <div className="fixed inset-0 -z-10 pointer-events-none">
            <InteractiveBackground3D />
          </div>
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
