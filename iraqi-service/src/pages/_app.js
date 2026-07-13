import { Cairo, Noto_Sans_Arabic } from 'next/font/google';
import '../styles/globals.css';

// Noto Sans Arabic guarantees full Unicode coverage for the extra Sorani
// Kurdish letters (ڕ ڵ ۆ ێ ە گ چ پ ژ ک) that many "Arabic-looking" fonts
// drop or render inconsistently — it's the body/UI workhorse font.
// Cairo is paired in for bold display/heading use; both are loaded with
// the 'arabic' subset so no glyph falls back to a mismatched system font.
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
    </div>
  );
}
