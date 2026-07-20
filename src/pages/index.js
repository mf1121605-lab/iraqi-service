import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ExternalLink, Mail, Phone, UserPlus, UserRound, ArrowUpRight, ShieldCheck, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
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
import { MotionLink, buttonTap, cardLift } from '../components/UI/Motion';

// Dynamic imports to prevent SSR issues with Canvas/WebGL
const InteractiveBackground3D = dynamic(
  () => import('../components/UI/InteractiveBackground3D'),
  { ssr: false }
);

const Icon3D = dynamic(
  () => import('../components/UI/Icon3D'),
  { ssr: false }
);

export default function Home({ siteSettings }) {
  const [locale, setLocale] = useState(null);
  const [step, setStep] = useState('language');

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
      setStep('gateway');
    }
  }, []);

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
    siteSettings?.footer_phone || siteSettings?.footer_email || siteSettings?.footer_instagram_url || siteSettings?.footer_twitter_url;

  // Track mouse coordinates for dynamic radial reflection on bento cards
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // Stagger variants for entry animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden p-6 font-display">
      {/* Dynamic 3D interactive backdrop */}
      <InteractiveBackground3D />

      {/* Decorative gradient overlay */}
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
          className="relative z-10 grid w-full max-w-5xl gap-6 md:grid-cols-3 md:grid-rows-3"
        >
          {/* Main Hero & Welcome Banner (Spans 2 cols, 2 rows) */}
          <motion.div 
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card md:col-span-2 md:row-span-2 p-8 md:p-12 flex flex-col justify-between"
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
              <p className="mt-4 text-lg md:text-xl text-white/70 max-w-xl font-light leading-relaxed">
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

          {/* Action Card: New Customer (Spans 1 col, 1 row) */}
          <motion.div 
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card p-6 md:p-8 flex flex-col justify-between group"
          >
            <div className="bento-card-glow" />
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-transform duration-500 group-hover:scale-110">
                <UserPlus className="h-6 w-6 text-white" strokeWidth={2} />
              </span>
              <MotionLink href="/customer" whileTap={{ scale: 0.95 }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors group-hover:bg-gold-400 group-hover:text-black">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </MotionLink>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold text-white transition-colors group-hover:text-gold-300">
                {t('gateway.newUserCta')}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {t('gateway.newUserDesc')}
              </p>
            </div>
          </motion.div>

          {/* Action Card: Sign In / Member Portal (Spans 1 col, 1 row) */}
          <motion.div 
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card p-6 md:p-8 flex flex-col justify-between group border border-gold-400/30 bg-gradient-to-b from-gold-400/5 to-transparent"
          >
            <div className="bento-card-glow" />
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/15 shadow-glow transition-transform duration-500 group-hover:scale-110">
                <UserRound className="h-6 w-6 text-gold-300" strokeWidth={2} />
              </span>
              <MotionLink href="/login" whileTap={{ scale: 0.95 }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/20 border border-gold-400/40 transition-colors group-hover:bg-gold-400 group-hover:text-black">
                  <ArrowUpRight className="h-5 w-5 text-gold-300 group-hover:text-black" />
                </span>
              </MotionLink>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold text-white transition-colors group-hover:text-gold-300">
                {t('gateway.loginCta')}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {t('gateway.loginDesc')}
              </p>
            </div>
          </motion.div>

          {/* 3D Showcase (Spans 1 col, 1 row) */}
          <motion.div 
            variants={itemVariants}
            className="glass-premium bento-card p-4 flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 z-0">
              <Icon3D variant="general" className="w-full h-full scale-125" />
            </div>
            <div className="relative z-10 w-full h-full flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
              <span className="text-xs font-bold text-gold-400 uppercase tracking-widest">تفاعلي ثلاثي الأبعاد</span>
              <span className="text-sm font-semibold text-white/80">استكشف الخدمات رقمياً</span>
            </div>
          </motion.div>

          {/* Platform Performance Stats (Spans 2 cols, 1 row) */}
          <motion.div 
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card md:col-span-2 p-6 md:p-8 flex flex-col justify-between"
          >
            <div className="bento-card-glow" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border-r border-white/5 last:border-0 p-2">
                <span className="block text-2xl md:text-3xl font-extrabold text-gradient-gold">99.9%</span>
                <span className="text-xs text-white/60 mt-1 block">دقة العمليات</span>
              </div>
              <div className="border-r border-white/5 last:border-0 p-2">
                <span className="block text-2xl md:text-3xl font-extrabold text-gradient-gold">24/7</span>
                <span className="text-xs text-white/60 mt-1 block">دعم متواصل</span>
              </div>
              <div className="p-2">
                <span className="block text-2xl md:text-3xl font-extrabold text-gradient-gold">فوري</span>
                <span className="text-xs text-white/60 mt-1 block">معالجة الطلبات</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-white/50">
              <span>بوابتك الآمنة لإدارة الخدمات بكفاءة عالية</span>
              <button
                type="button"
                onClick={() => setStep('language')}
                className="inline-flex items-center gap-1.5 text-xs text-gold-300 underline underline-offset-4 transition-colors hover:text-white"
              >
                <ArrowLeftRight className="h-3 w-3" />
                {t('gateway.switchLanguage')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Footer Branding & Social Row */}
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
        <p className="text-center text-[10px] leading-relaxed text-white/40">{footerLegal}</p>
      </div>
    </main>
  );
}
