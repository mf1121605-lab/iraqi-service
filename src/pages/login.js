import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import FacebookGlyph from '../components/UI/FacebookGlyph';
import GoogleGlyph from '../components/UI/GoogleGlyph';
import { supabaseClient } from '../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../utils/i18n';
import { isValidIraqiPhone, phoneToSyntheticEmail, toE164 } from '../utils/phoneHelper';
import { MotionLink, buttonTap } from '../components/UI/Motion';

// A single "لديه حساب" entry point for every role — phone-or-email +
// password now covers customers, employees, and the founder alike (all
// three authenticate the same way since customer registration switched
// off SMS OTP), so there's no method to toggle between anymore. Routing
// after a successful sign-in is driven entirely by the account's actual
// role (dashboardPathForRole). Employee/founder accounts are still only
// ever created by a founder (src/pages/founder/employees.js) — this page
// does not add a way to self-register as staff.
export default function UnifiedLogin() {
  const router = useRouter();
  const { session, profile, loading } = useSession();
  const [locale, setLocale] = useState(defaultLocale);
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

    if (isValidIraqiPhone(identifier)) {
      const e164 = toE164(identifier);
      // Customers now authenticate via a synthetic email keyed off their
      // phone number (see phoneToSyntheticEmail) — Supabase's hosted
      // Phone provider requires a configured SMS provider just to allow
      // signups at all, which this sidesteps entirely. Employees created
      // with a real phone (founder/employees.js, via the privileged Admin
      // API) still have a native auth.users.phone, so fall back to that
      // if the synthetic-email attempt fails, rather than assuming which
      // kind of account this phone number belongs to.
      const { error: syntheticError } = await supabaseClient.auth.signInWithPassword({
        email: phoneToSyntheticEmail(e164),
        password,
      });
      if (!syntheticError) {
        setSubmitting(false);
        return;
      }
      const { error: nativePhoneError } = await supabaseClient.auth.signInWithPassword({ phone: e164, password });
      setSubmitting(false);
      if (nativePhoneError) {
        setError(t('authEmployee.errorInvalid'));
      }
      return;
    }

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email: identifier, password });
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
          <Lock className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight">{t('authLogin.title')}</h1>

        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
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
