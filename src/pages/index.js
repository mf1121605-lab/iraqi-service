import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowUpRight, ExternalLink, Mail, Phone, ShieldCheck, Activity, UserPlus, UserRound } from 'lucide-react';
import GoogleGlyph from '../components/UI/GoogleGlyph';
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
import { MotionLink } from '../components/UI/Motion';
import { dashboardPathForRole, useSession } from '../utils/useSession';

export default function Home({ siteSettings }) {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useSession();
  const [locale, setLocale] = useState(defaultLocale);
  const [step, setStep] = useState('gateway');

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
    } else {
      setStoredLocale(defaultLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale ?? defaultLocale);
    document.documentElement.lang = locale ?? defaultLocale;
    document.documentElement.classList.add('dark');
  }, [locale]);

  useEffect(() => {
    if (authLoading || !session || !profile) return;
    router.replace(dashboardPathForRole(profile.role));
  }, [authLoading, session, profile, router]);

  function selectLanguage(code) {
    setLocale(code);
    setStoredLocale(code);
    setStep('gateway');
  }

  async function handleGoogleLogin() {
    const { supabaseClient } = await import('../lib/supabaseClient');
    supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/customer/onboarding` },
    });
  }

  const t = (path) => translate(locale ?? defaultLocale, path);
  const activeLocale = locale ?? defaultLocale;
  const heroTitle = siteText(siteSettings, activeLocale, 'hero_title') || t('gateway.welcomeTitle');
  const heroSubtitle = siteText(siteSettings, activeLocale, 'hero_subtitle') || t('gateway.welcomeSubtitle');
  const footerLegal = siteText(siteSettings, activeLocale, 'footer_legal') || t('common.footerDisclaimer');
  const hasContactRow =
    siteSettings?.footer_phone || siteSettings?.footer_email || siteSettings?.footer_instagram_url || siteSettings?.footer_twitter_url;

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-x-hidden bg-transparent p-6 font-display">
      <div className="pointer-events-none absolute inset-0 bg-radial-vignette opacity-40" />

      {step === 'language' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="glass-premium relative z-10 w-full max-w-md rounded-2xl p-10 text-center text-white"
        >
          <div className="relative mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-to-tr from-gold-500/20 to-gold-300/40 p-1 shadow-glow animate-pulse-slow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-icon-512.png" alt="Platform Logo" className="h-full w-full rounded-full object-contain p-2" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-wide text-gradient-gold">
            بوابة الخدمات العراقية
          </h2>
          <p className="text-sm text-white/60 mb-6">Iraqi Services Gateway</p>
          {LOCALE_META.map((meta) => (
            <p key={meta.code} className="mb-2 text-md font-medium text-white/80">
              {getDictionary(meta.code).languageSelect.subtitle}
            </p>
          ))}
          <div className="mt-8 grid gap-4">
            {LOCALE_META.map((meta) => (
              <motion.button
                key={meta.code}
                type="button"
                onClick={() => selectLanguage(meta.code)}
                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(230,171,44,0.3)' }}
                whileTap={{ scale: 0.97 }}
                className="btn-cinematic-outline py-4 font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {meta.nativeName}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {step === 'gateway' && locale && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 grid w-full max-w-5xl gap-6 md:grid-cols-3"
        >
          {/* Hero Banner — spans 2 cols × 3 rows */}
          <motion.div
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card md:col-span-2 md:row-span-3 p-8 md:p-12 flex flex-col justify-between"
          >
            <div className="bento-card-glow" />
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 shadow-glow">
                  <ShieldCheck className="h-5 w-5 text-gold-300 animate-pulse" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-300/80">
                  {t('common.platformName')}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {heroTitle}
              </h1>
              <p className="mt-4 text-base md:text-xl text-white/70 max-w-xl font-light leading-relaxed line-clamp-4 md:line-clamp-none">
                {heroSubtitle}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 items-center border-t border-white/5 pt-6">
              <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-full">
                <Activity className="h-3 w-3 text-emerald-400" />
                <span>حالة المنصة: متصلة</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-full">
                <span>تحديث أمان نشط</span>
              </div>
            </div>
          </motion.div>

          {/* Google sign-in card — silver-gold style, first in col 3 */}
          <motion.button
            type="button"
            variants={itemVariants}
            onClick={handleGoogleLogin}
            onMouseMove={handleCardMouseMove}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="glass-premium bento-card relative overflow-hidden p-6 md:p-8 flex flex-col justify-center items-center gap-3 group bg-gradient-to-br from-slate-400/10 to-amber-300/15"
          >
            <div className="bento-card-glow" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,215,0,0.1) 50%, transparent 65%)',
              }}
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3.5 }}
            />
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-300/20 to-amber-200/20 border border-white/20 shadow-glow transition-transform duration-500 group-hover:scale-110">
              <GoogleGlyph className="h-7 w-7" />
            </span>
            <div className="text-center">
              <h2 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                {t('authCustomer.continueWithGoogle')}
              </h2>
              <p className="mt-1 text-xs text-white/55">{t('gateway.googleDesc')}</p>
            </div>
          </motion.button>

          {/* Action Card: مستخدم جديد — whole card is clickable */}
          <MotionLink
            href="/customer"
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="glass-premium bento-card relative overflow-hidden p-6 md:p-8 flex flex-col justify-between group"
          >
            <div className="bento-card-glow" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.09) 50%, transparent 65%)',
              }}
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 2.8 }}
            />
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-transform duration-500 group-hover:scale-110">
                <UserPlus className="h-6 w-6 text-white" strokeWidth={2} />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors group-hover:bg-gold-400 group-hover:text-black">
                <ArrowUpRight className="h-5 w-5 transition-colors group-hover:text-black" />
              </span>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold text-white transition-colors group-hover:text-gold-300">
                {t('gateway.newUserCta')}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {t('gateway.newUserDesc')}
              </p>
            </div>
          </MotionLink>

          {/* Action Card: لدي حساب — whole card is clickable */}
          <MotionLink
            href="/login"
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="glass-premium bento-card relative overflow-hidden p-6 md:p-8 flex flex-col justify-between group bg-gradient-to-b from-gold-400/5 to-transparent"
          >
            <div className="bento-card-glow" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(245,158,11,0.13) 50%, transparent 65%)',
              }}
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 3.2 }}
            />
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/15 shadow-glow transition-transform duration-500 group-hover:scale-110">
                <UserRound className="h-6 w-6 text-gold-300" strokeWidth={2} />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/20 border border-gold-400/40 transition-colors group-hover:bg-gold-400">
                <ArrowUpRight className="h-5 w-5 text-gold-300 transition-colors group-hover:text-black" />
              </span>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold text-white transition-colors group-hover:text-gold-300">
                {t('gateway.loginCta')}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {t('gateway.loginDesc')}
              </p>
            </div>
          </MotionLink>
        </motion.div>
      )}

      {/* Footer */}
      <div className="absolute inset-x-6 bottom-4 z-10 text-center">
        {step === 'gateway' && hasContactRow && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full w-max mx-auto border border-white/5">
            {siteSettings.footer_phone && (
              <a href={`tel:${siteSettings.footer_phone}`} className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
                <Phone className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                <span dir="ltr">{siteSettings.footer_phone}</span>
              </a>
            )}
            {siteSettings.footer_email && (
              <a href={`mailto:${siteSettings.footer_email}`} className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
                <Mail className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                <span dir="ltr">{siteSettings.footer_email}</span>
              </a>
            )}
            {siteSettings.footer_instagram_url && (
              <a href={siteSettings.footer_instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
                <ExternalLink className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                Instagram
              </a>
            )}
            {siteSettings.footer_twitter_url && (
              <a href={siteSettings.footer_twitter_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
                <ExternalLink className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                X
              </a>
            )}
          </div>
        )}
        <div className="flex flex-col items-center gap-1.5">
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-white/35">{footerLegal}</p>
          {step === 'gateway' && (
            <button
              type="button"
              onClick={() => setStep('language')}
              className="inline-flex items-center gap-1.5 text-[10px] text-gold-400/60 underline underline-offset-4 transition-colors hover:text-gold-300"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {t('gateway.switchLanguage')}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
