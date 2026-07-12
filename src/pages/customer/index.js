import { useEffect, useState } from 'react';
import Link from 'next/link';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../../utils/i18n';

export default function CustomerGateway() {
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (path) => translate(locale, path);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero p-6 text-center text-white">
      <div className="glass-panel w-full max-w-md animate-fade-in rounded-3xl p-10 shadow-glass">
        <h1 className="font-display text-2xl font-bold">{t('gateway.customerCta')}</h1>
        <p className="mt-3 text-white/80">
          Phone / Facebook sign-in and new registration — wired up once Supabase Auth lands in the next step.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-gold-200 underline underline-offset-4">
          {t('common.back')}
        </Link>
      </div>
    </main>
  );
}
