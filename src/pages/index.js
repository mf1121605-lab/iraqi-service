import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, ArrowUpRight, UserPlus, UserRound, X } from 'lucide-react';
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
  const [modalOpen, setModalOpen] = useState(null); // 'about' | 'privacy' | null

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
    } else {
      // First visit — show language picker before gateway
      setStep('language');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale ?? defaultLocale);
    document.documentElement.lang = locale ?? defaultLocale;
    document.documentElement.classList.add('dark');
  }, [locale]);

  useEffect(() => {
    if (authLoading || !session || !profile) return;
    router.replace(dashboardPathForRole(profile));
  }, [authLoading, session, profile, router]);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setModalOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

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
    <main className="dark relative flex min-h-screen items-center justify-center overflow-x-hidden bg-transparent px-4 sm:px-6 py-6 font-display">
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
          className="relative z-10 grid w-full max-w-5xl gap-4 sm:gap-6 md:grid-cols-3"
        >
          {/* Hero Banner — spans 2 cols × 3 rows */}
          <motion.div
            variants={itemVariants}
            onMouseMove={handleCardMouseMove}
            className="glass-premium bento-card md:col-span-2 md:row-span-3 p-5 sm:p-8 md:p-12 flex flex-col justify-between"
          >
            <div className="bento-card-glow" />
            <div>
              <div className="flex items-center gap-3 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-icon-512.png" alt="" aria-hidden="true" className="h-10 w-10 rounded-full object-contain" />
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-300/80">
                  {t('common.platformName')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {heroTitle}
              </h1>
              <p className="mt-4 text-base md:text-xl text-white/70 max-w-xl font-light leading-relaxed line-clamp-4 md:line-clamp-none">
                {heroSubtitle}
              </p>
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

          {/* Action Card: مستخدم جديد */}
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

          {/* Action Card: لدي حساب */}
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

          {/* About Us + Privacy Policy + Language Switch — spans all 3 cols */}
          <motion.div variants={itemVariants} className="md:col-span-3 flex justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setModalOpen('about')}
              className="rounded-xl border border-amber-400/50 bg-amber-400/5 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-shadow"
            >
              {t('gateway.aboutUsCta')}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen('privacy')}
              className="rounded-xl border border-amber-400/50 bg-amber-400/5 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-shadow"
            >
              {t('gateway.privacyCta')}
            </button>
            <button
              type="button"
              onClick={() => setStep('language')}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/5 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-shadow"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              {LOCALE_META.find((m) => m.code !== locale)?.nativeName ?? t('gateway.switchLanguage')}
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* About Us / Privacy Policy Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            onClick={() => setModalOpen(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-400/20 bg-[#0d1117] p-6 md:p-8 text-white shadow-[0_0_40px_rgba(245,158,11,0.15)]"
            >
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>

              {modalOpen === 'about' && (
                <div className="space-y-4 leading-relaxed text-white/85">
                  <h2 className="text-xl font-bold text-amber-400">{t('gateway.aboutUsCta')}</h2>
                  <p>مرحباً بكم في <strong className="text-white">المنصة العراقية للخدمات</strong>، بوابتكم الرقمية الموثوقة لتسهيل وأتمتة المعاملات والخدمات الإلكترونية والأكاديمية في العراق.</p>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">رؤيتنا</p>
                    <p>نسعى إلى إعادة تعريف مفهوم تقديم الخدمات في العراق من خلال التحول الرقمي الشامل، واختصار الوقت والجهد على المواطنين عبر تقديم حلول ذكية وآمنة تضمن إنجاز المعاملات بمرونة عالية ودون الحاجة للتنقل والمراجعات التقليدية.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">رسالتنا</p>
                    <p>تقديم بيئة رقمية سهلة الاستخدام تعتمد على أحدث التقنيات البرمجية وأعلى معايير الأمان، لربط المواطن بالخدمات الإدارية، الأكاديمية، والخدمية بسرعة وشفافية متكاملة.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-2">ماذا نقدم؟</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">إنجاز المعاملات والخدمات:</strong> متابعة وتسهيل إجراءات التقديم والخدمات الإلكترونية المختلفة.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">إدارة الوثائق والمستمسكات:</strong> رفع وتدقيق المستندات الرسمية وإدارتها ببيئة مشفرة.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">الدفع الإلكتروني الآمن:</strong> دعم وسائل الدفع المحلية المعتمدة (زين كاش، كي كارد).</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">التتبع المباشر:</strong> نظام تتبع ذكي يتيح للمستخدم معرفة حالة معاملته خطوة بخطوة.</span></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-2">قيمنا الجوهرية</p>
                    <ol className="space-y-1 text-sm list-decimal list-inside">
                      <li><strong className="text-white/90">الأمان والسرية:</strong> حماية بيانات ومستمسكات المستخدمين بأعلى تقنيات التشفير.</li>
                      <li><strong className="text-white/90">السرعة والإتقان:</strong> المتابعة الدقيقة لضمان إنجاز الطلبات في أسرع وقت ممكن.</li>
                      <li><strong className="text-white/90">الشفافية:</strong> وضوح كامل في الرسوم والخطوات وحالة الخدمة.</li>
                    </ol>
                  </div>
                </div>
              )}

              {modalOpen === 'privacy' && (
                <div className="space-y-4 leading-relaxed text-white/85 text-sm">
                  <h2 className="text-xl font-bold text-amber-400">{t('gateway.privacyCta')}</h2>
                  <p>تولي <strong className="text-white">المنصة العراقية للخدمات</strong> أهمية بالغة لخصوصية مستخدميها وحماية بياناتهم الشخصية.</p>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">1. البيانات التي نجمعها</p>
                    <ul className="space-y-1">
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">البيانات الشخصية:</strong> الاسم الكامل، رقم الهاتف، عنوان البريد الإلكتروني، ومحل السكن.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">الوثائق الرسمية:</strong> صور البطاقة الموحدة، جواز السفر، أو المستندات الأكاديمية.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span><strong className="text-white/90">معلومات الدفع:</strong> بيانات إشعارات التسديد (دون تخزين أرقام البطاقات الحساسة).</span></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">2. كيفية استخدام البيانات</p>
                    <ul className="space-y-1">
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>تنفيذ وتجهيز المعاملات والخدمات التي يطلبها المستخدم.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>التحقق من صحة المستندات المرفوعة لضمان مطابقتها للشروط.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>إرسال إشعارات وتحديثات حول حالة الطلب.</span></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">3. حماية وتشفير البيانات</p>
                    <p>نلتزم بتطبيق أحدث معايير الأمان السيبراني ونظم التشفير (SSL/TLS) لحماية بياناتك. تتم معالجة الملفات داخل قواعد بيانات سحابية مشفرة ومؤمنة.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">4. مشاركة البيانات</p>
                    <p>لا نقوم ببيع أو إيجار أو مشاركة بياناتك الشخصية مع أي جهات تجارية أو إعلانية.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">5. حقوق المستخدم</p>
                    <ul className="space-y-1">
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>طلب الاطلاع على بياناتك الشخصية.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>طلب تصحيح أي بيانات غير دقيقة.</span></li>
                      <li className="flex gap-2"><span className="text-amber-400 shrink-0">•</span><span>طلب حذف المستمسكات بعد اكتمال الخدمة.</span></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">6. التحديثات</p>
                    <p>قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ التعديل.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
