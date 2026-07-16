import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import FacebookGlyph from '../../components/UI/FacebookGlyph';
import GoogleGlyph from '../../components/UI/GoogleGlyph';
import { supabaseClient } from '../../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../../utils/i18n';
import { isValidIraqiPhone, toE164 } from '../../utils/phoneHelper';
import { MotionLink, buttonTap } from '../../components/UI/Motion';

export default function CustomerAuth() {
  const router = useRouter();
  const { session, profile, loading } = useSession();
  const [locale, setLocale] = useState(defaultLocale);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (loading || !session || !profile) return;
    if (profile.role === 'customer' && !profile.avatar_key) {
      router.replace('/customer/onboarding');
      return;
    }
    router.replace(dashboardPathForRole(profile.role));
  }, [loading, session, profile, router]);

  const t = (path) => translate(locale, path);

  async function handleSendCode(event) {
    event.preventDefault();
    setError('');
    if (!isValidIraqiPhone(phone)) {
      setError(t('authCustomer.errorInvalidPhone'));
      return;
    }
    setSubmitting(true);
    const { error: otpError } = await supabaseClient.auth.signInWithOtp({ phone: toE164(phone) });
    setSubmitting(false);
    if (otpError) {
      setError(t('common.errorGeneric'));
      return;
    }
    setStep('otp');
  }

  async function handleVerify(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: verifyError } = await supabaseClient.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: 'sms',
    });
    setSubmitting(false);
    if (verifyError) {
      setError(t('common.errorGeneric'));
      return;
    }
    router.replace('/customer/onboarding');
  }

  async function handleOAuthLogin(provider) {
    setError('');
    const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/customer/onboarding` },
    });
    if (oauthError) {
      setError(t('authCustomer.errorOAuth'));
    }
  }

  const handleFacebookLogin = () => handleOAuthLogin('facebook');
  const handleGoogleLogin = () => handleOAuthLogin('google');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 animate-float rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 animate-float rounded-full bg-gold-400/10 blur-3xl [animation-delay:1.5s]" />

      <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          {step === 'otp' ? (
            <KeyRound className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Phone className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300/80">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.platformName')}
        </div>
        <h1 className="mt-2 text-center font-display text-3xl font-bold tracking-tight">{t('authCustomer.title')}</h1>

        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="mt-8 space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm text-white/80">
                {t('authCustomer.phoneLabel')}
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-white/40" aria-hidden="true" />
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t('authCustomer.phonePlaceholder')}
                  className="input-cinematic ps-11"
                />
              </div>
            </div>
            {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
            <motion.button
              type="submit"
              disabled={submitting}
              {...buttonTap}
              className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
            >
              {t('authCustomer.sendCodeCta')}
            </motion.button>

            <div className="flex items-center gap-3 text-xs text-white/50">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              {t('authCustomer.orDivider')}
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                onClick={handleFacebookLogin}
                {...buttonTap}
                className="btn-cinematic-outline px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <FacebookGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithFacebook')}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                {...buttonTap}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-brand-950 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.4)] transition-shadow duration-300 hover:shadow-[0_12px_30px_-8px_rgba(255,255,255,0.55)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-brand-900"
              >
                <GoogleGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithGoogle')}
              </motion.button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="mt-8 animate-fade-in space-y-4">
            <p className="text-sm text-white/80">{t('authCustomer.otpSentMessage')}</p>
            <div>
              <label htmlFor="otp" className="mb-1.5 block text-sm text-white/80">
                {t('authCustomer.otpLabel')}
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder={t('authCustomer.otpPlaceholder')}
                className="input-cinematic text-center tracking-[0.5em]"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
            <motion.button
              type="submit"
              disabled={submitting}
              {...buttonTap}
              className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
            >
              {t('authCustomer.verifyCta')}
            </motion.button>
            <button
              type="button"
              onClick={handleSendCode}
              className="w-full rounded text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              {t('authCustomer.resendCta')}
            </button>
          </form>
        )}

        <MotionLink
          href="/"
          whileTap={{ scale: 0.96 }}
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('authCustomer.backCta')}
        </MotionLink>
      </div>
    </main>
  );
}
