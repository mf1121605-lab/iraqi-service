import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e6ab2c" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="خدماتي" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="خدماتي" />
        <meta property="og:title" content="خدماتي — منصة الخدمات العراقية" />
        <meta property="og:description" content="منصة متكاملة لتقديم وطلب الخدمات المتنوعة بكل سهولة ويسر" />
        <meta property="og:image" content="/brand/logo-icon-512.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="خدماتي — منصة الخدمات العراقية" />
        <meta name="twitter:description" content="منصة متكاملة لتقديم وطلب الخدمات المتنوعة بكل سهولة ويسر" />
        <meta name="twitter:image" content="/brand/logo-icon-512.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
