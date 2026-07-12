import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LOCALE_META,
  defaultLocale,
  getDictionary,
  getDirection,
  getStoredLocale,
  setStoredLocale,
  translate,
} from '../utils/i18n';

export default function Home() {
  const [locale, setLocale] = useState(null);
  const [step, setStep] = useState('language');

  // Returning visitors skip straight to the gateway in their saved language.
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
      setStep('gateway');
    }
  }, []);

  // Both supported languages read right-to-left, so default to rtl even
  // before a language is chosen; this also covers the language-select step.
  useEffect(() => {
    document.documentElement.dir = getDirection(locale ?? defaultLocale);
    document.documentElement.lang = locale ?? defaultLocale;
  }, [locale]);

  function selectLanguage(code) {
    setLocale(code);
    setStoredLocale(code);
    setStep('gateway');
  }

  const t = (path) => translate(locale ?? defaultLocale, path);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 animate-float rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-72 w-72 animate-float rounded-full bg-gold-400/20 blur-3xl [animation-delay:1.5s]" />

      {step === 'language' && (
        <div className="glass-panel relative w-full max-w-md animate-fade-in rounded-3xl p-10 text-center text-white shadow-glass">
          {LOCALE_META.map((meta) => (
            <p key={meta.code} className="mb-1 text-lg font-semibold text-white/90">
              {getDictionary(meta.code).languageSelect.subtitle}
            </p>
          ))}

          <div className="mt-8 grid gap-4">
            {LOCALE_META.map((meta) => (
              <button
                key={meta.code}
                type="button"
                onClick={() => selectLanguage(meta.code)}
                className="glass-panel rounded-xl2 border-white/20 px-6 py-4 font-display text-xl font-bold text-white transition hover:scale-[1.02] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {meta.nativeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'gateway' && locale && (
        <div className="glass-panel relative w-full max-w-lg animate-fade-in rounded-3xl p-10 text-center text-white shadow-glass">
          <h1 className="font-display text-3xl font-bold">{t('gateway.welcomeTitle')}</h1>
          <p className="mt-2 text-white/80">{t('gateway.welcomeSubtitle')}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/employee"
              className="glass-panel flex flex-col items-center gap-2 rounded-xl2 p-6 transition hover:scale-[1.02] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <span className="font-display text-lg font-bold">{t('gateway.employeeCta')}</span>
              <span className="text-sm text-white/70">{t('gateway.employeeDesc')}</span>
            </Link>

            <Link
              href="/customer"
              className="glass-panel flex flex-col items-center gap-2 rounded-xl2 bg-gradient-gold/10 p-6 transition hover:scale-[1.02] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <span className="font-display text-lg font-bold">{t('gateway.customerCta')}</span>
              <span className="text-sm text-white/70">{t('gateway.customerDesc')}</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setStep('language')}
            className="mt-8 text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            {t('gateway.switchLanguage')}
          </button>
        </div>
      )}

      <p className="absolute inset-x-6 bottom-4 text-center text-xs leading-relaxed text-white/60">
        {t('common.footerDisclaimer')}
      </p>
    </main>
  );
}
