import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Briefcase, Facebook, Instagram, Languages, Mail, Phone, ShieldCheck, Twitter, UserRound } from 'lucide-react';
import {
  LOCALE_META,
  defaultLocale,
  getDictionary,
  getDirection,
  getStoredLocale,
  setStoredLocale,
  translate,
} from '../utils/i18n';
import { siteText } from '../utils/useSiteSettings';

export default function Home({ siteSettings }) {
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
  const activeLocale = locale ?? defaultLocale;
  const heroTitle = siteText(siteSettings, activeLocale, 'hero_title') || t('gateway.welcomeTitle');
  const heroSubtitle = siteText(siteSettings, activeLocale, 'hero_subtitle') || t('gateway.welcomeSubtitle');
  const footerLegal = siteText(siteSettings, activeLocale, 'footer_legal') || t('common.footerDisclaimer');
  const hasContactRow =
    siteSettings?.footer_phone || siteSettings?.footer_email || siteSettings?.footer_facebook_url || siteSettings?.footer_instagram_url || siteSettings?.footer_twitter_url;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 animate-float rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 animate-float rounded-full bg-gold-400/15 blur-3xl [animation-delay:1.5s]" />

      {step === 'language' && (
        <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10 text-center text-white">
          <span className="cinematic-emblem mx-auto h-16 w-16">
            <Languages className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
          </span>
          {LOCALE_META.map((meta) => (
            <p key={meta.code} className="mb-1 mt-5 text-lg font-semibold text-white/90">
              {getDictionary(meta.code).languageSelect.subtitle}
            </p>
          ))}

          <div className="mt-8 grid gap-3">
            {LOCALE_META.map((meta) => (
              <button
                key={meta.code}
                type="button"
                onClick={() => selectLanguage(meta.code)}
                className="btn-cinematic-outline px-6 py-4 font-display text-xl font-bold focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {meta.nativeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'gateway' && locale && (
        <div className="cinematic-card relative z-10 w-full max-w-lg animate-scale-in p-10 text-center text-white">
          <span className="cinematic-emblem mx-auto h-[4.5rem] w-[4.5rem]">
            <ShieldCheck className="h-8 w-8 text-gold-300" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{heroTitle}</h1>
          <p className="mt-2 text-white/80">{heroSubtitle}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/employee"
              className="btn-cinematic-outline group flex-col gap-2 p-6 focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:scale-110">
                <Briefcase className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold">{t('gateway.employeeCta')}</span>
              <span className="text-sm text-white/60">{t('gateway.employeeDesc')}</span>
            </Link>

            <Link
              href="/customer"
              className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-gold-400/30 bg-gradient-to-b from-gold-400/15 to-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400/15 transition-transform duration-300 group-hover:scale-110">
                <UserRound className="h-5 w-5 text-gold-300" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold">{t('gateway.customerCta')}</span>
              <span className="text-sm text-white/60">{t('gateway.customerDesc')}</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setStep('language')}
            className="mt-8 inline-flex items-center gap-1.5 rounded text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
            {t('gateway.switchLanguage')}
          </button>
        </div>
      )}

      <div className="absolute inset-x-6 bottom-4 z-10 text-center">
        {hasContactRow && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
            {siteSettings.footer_phone && (
              <a href={`tel:${siteSettings.footer_phone}`} className="flex items-center gap-1 hover:text-gold-300">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span dir="ltr">{siteSettings.footer_phone}</span>
              </a>
            )}
            {siteSettings.footer_email && (
              <a href={`mailto:${siteSettings.footer_email}`} className="flex items-center gap-1 hover:text-gold-300">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span dir="ltr">{siteSettings.footer_email}</span>
              </a>
            )}
            {siteSettings.footer_facebook_url && (
              <a href={siteSettings.footer_facebook_url} target="_blank" rel="noreferrer" className="hover:text-gold-300">
                <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {siteSettings.footer_instagram_url && (
              <a href={siteSettings.footer_instagram_url} target="_blank" rel="noreferrer" className="hover:text-gold-300">
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {siteSettings.footer_twitter_url && (
              <a href={siteSettings.footer_twitter_url} target="_blank" rel="noreferrer" className="hover:text-gold-300">
                <Twitter className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
        <p className="text-center text-xs leading-relaxed text-white/50">{footerLegal}</p>
      </div>
    </main>
  );
}
