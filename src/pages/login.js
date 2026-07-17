import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Lock, Mail, Phone } from 'lucide-react';
import FacebookGlyph from '../components/UI/FacebookGlyph';
import GoogleGlyph from '../components/UI/GoogleGlyph';
import { supabaseClient } from '../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../utils/i18n';
import { isValidIraqiPhone, toE164 } from '../utils/phoneHelper';
import { MotionLink, buttonTap } from '../components/UI/Motion';

// A single "لديه حساب" entry point for every role instead of asking the
// visitor to self-identify as employee/citizen up front — the method
// toggle (phone code vs. email+password) picks the auth mechanism, and
// routing after a successful sign-in is driven entirely by the account's
// actual role (dashboardPathForRole), exactly as it already was on the
// two separate pages this replaces. Employee/founder accounts are still
// only ever created by a founder (src/pages/founder/employees.js) — this
// page does not add a way to self-register as staff.
export default function UnifiedLogin() {
  const router = useRouter();
  const { session, profile, loading } = useSession();
  const [locale, setLocale] = useState(defaultLocale);
  const [method, setMethod] = useState('phone');

  const [phoneStep, setPhoneStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

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

  function switchMethod(next) {
    setMethod(next);
    setError('');
  }

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
    setPhoneStep('otp');
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
    }
    // Success is handled by the session effect above (it knows whether
    // this is a first-time customer needing onboarding or a returning
    // user of any role).
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

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const credentials = isValidIraqiPhone(identifier) ? { phone: toE164(identifier), password } : { email: identifier, password };
    const { error: signInError } = await supabaseClient.auth.signInWithPassword(credentials);
    setSubmitting(false);
    if (signInError) {
      setError(t('authEmployee.errorInvalid'));
    }
    // Success is handled by the session effect above.
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 animate-float rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 animate-float rounded-full bg-gold-400/10 blur-3xl [animation-delay:1.5s]" />

      <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          {method === 'phone' ? (
            phoneStep === 'otp' ? (
              <KeyRound className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Phone className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
            )
          ) : (
            <Lock className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight">{t('authLogin.title')}</h1>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl2 border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => switchMethod('phone')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              method === 'phone' ? 'bg-gold-400/20 text-gold-300' : 'text-white/60 hover:text-white'
            }`}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {t('authLogin.methodPhoneTab')}
          </button>
          <button
            type="button"
            onClick={() => switchMethod('password')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              method === 'password' ? 'bg-gold-400/20 text-gold-300' : 'text-white/60 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {t('authLogin.methodPasswordTab')}
          </button>
        </div>

        {method === 'phone' && phoneStep === 'phone' && (
          <form onSubmit={handleSendCode} className="mt-6 animate-fade-in space-y-4">
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
                onClick={() => handleOAuthLogin('facebook')}
                {...buttonTap}
                className="btn-cinematic-outline px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <FacebookGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithFacebook')}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                {...buttonTap}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-brand-950 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.4)] transition-shadow duration-300 hover:shadow-[0_12px_30px_-8px_rgba(255,255,255,0.55)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-brand-900"
              >
                <GoogleGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithGoogle')}
              </motion.button>
            </div>
          </form>
        )}

        {method === 'phone' && phoneStep === 'otp' && (
          <form onSubmit={handleVerify} className="mt-6 animate-fade-in space-y-4">
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

        {method === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="mt-6 animate-fade-in space-y-4">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm text-white/80">
                {t('authEmployee.identifierLabel')}
              </label>
              <input
                id="identifier"
                type="text"
                dir="ltr"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={t('authEmployee.identifierPlaceholder')}
                className="input-cinematic"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm text-white/80">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('authEmployee.passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('authEmployee.passwordPlaceholder')}
                className="input-cinematic"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
            <motion.button
              type="submit"
              disabled={submitting}
              {...buttonTap}
              className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
            >
              {t('authEmployee.submitCta')}
            </motion.button>
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
