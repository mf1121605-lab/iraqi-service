import Link from 'next/link';
import { ArrowLeft, Briefcase, ShieldCheck, User } from 'lucide-react';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../utils/i18n';
import { useEffect, useState } from 'react';

export default function LandingPage() {
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mesh-hero p-6 text-white">
      {/* Dot-grid texture overlay */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid-dark opacity-60" />

      {/* Decorative glow blobs */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-float rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-96 w-96 animate-float rounded-full bg-gold-400/15 blur-3xl [animation-delay:1.5s]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 animate-pulse-soft rounded-full bg-brand-400/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-40 w-40 animate-float rounded-full bg-gold-300/10 blur-2xl [animation-delay:3s]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-inner-glass">
          <ShieldCheck className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">{t('landing.heroTitle')}</h1>
        <p className="mt-4 max-w-md text-white/80">{t('landing.heroSubtitle')}</p>

        <div className="mt-10 grid w-full max-w-md gap-4 sm:grid-cols-2">
          <Link
            href="/customer"
            className="glass-panel group flex flex-col items-center gap-3 rounded-3xl p-8 font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:scale-110">
              <User className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            {t('landing.customerCta')}
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link
            href="/employee"
            className="glass-panel group flex flex-col items-center gap-3 rounded-3xl p-8 font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:scale-110">
              <Briefcase className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            {t('landing.employeeCta')}
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <footer className="relative z-10 mt-16 max-w-lg text-center text-xs text-white/50">
        <p>{t('landing.footerDisclaimer')}</p>
      </footer>
    </main>
  );
}
