import { Cairo, Noto_Sans_Arabic } from 'next/font/google';
import '../styles/globals.css';

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
  return (
    <div className={`${notoSansArabic.variable} ${cairo.variable} contents`}>
      <Component {...pageProps} />
      <div className="grain-overlay" aria-hidden="true" />
      <div className="cinematic-frame" aria-hidden="true" />
      <div className="cinematic-frame-corner top-left" aria-hidden="true" />
      <div className="cinematic-frame-corner top-right" aria-hidden="true" />
      <div className="cinematic-frame-corner bottom-left" aria-hidden="true" />
      <div className="cinematic-frame-corner bottom-right" aria-hidden="true" />
    </div>
  );
}
