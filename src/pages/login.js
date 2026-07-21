import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import GoogleGlyph from '../components/UI/GoogleGlyph';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabaseClient } from '../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../utils/i18n';
import { isValidIraqiPhone, toE164 } from '../utils/phoneHelper';
import { logLoginEvent } from '../utils/logLoginEvent';
import { MotionLink, buttonTap } from '../components/UI/Motion';

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const USERNAME_EMAIL_DOMAIN = 'iraqi-service.vercel.app';

function usableErrorMessage(supabaseError, fallback) {
  const message = supabaseError?.message?.trim();
  const looksUsable = message && !message.startsWith('{') && !message.startsWith('[');
  return looksUsable ? message : fallback;
}

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

    const trimmedIdentifier = identifier.trim().toLowerCase();

    if (USERNAME_PATTERN.test(trimmedIdentifier)) {
      // Customers register with a username, stored server-side only as a
      // deterministic internal email alias (no native phone/Supabase
      // identity involved) — recomputing the same alias here is a pure
      // string transform, no lookup needed.
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: `${trimmedIdentifier}@${USERNAME_EMAIL_DOMAIN}`,
        password,
      });
      setSubmitting(false);
      if (signInError) {
        console.error('username sign-in failed', signInError);
        setError(usableErrorMessage(signInError, t('authEmployee.errorInvalid')));
        return;
      }
      logLoginEvent(data.session?.access_token);
      return;
    }

    if (isValidIraqiPhone(identifier)) {
      // Employees/founder can still be created with a native phone
      // identity (src/pages/api/founder/create-employee.js) — customers no
      // longer use this path, but existing phone-based staff accounts
      // still need to sign in.
      const { data, error: phoneError } = await supabaseClient.auth.signInWithPassword({
        phone: toE164(identifier),
        password,
      });
      setSubmitting(false);
      if (phoneError) {
        console.error('phone sign-in failed', phoneError);
        setError(usableErrorMessage(phoneError, t('authEmployee.errorInvalid')));
        return;
      }
      logLoginEvent(data.session?.access_token);
      return;
    }

    const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({ email: identifier, password });
    setSubmitting(false);
    if (signInError) {
      console.error('email sign-in failed', signInError);
      setError(usableErrorMessage(signInError, t('authEmployee.errorInvalid')));
      return;
    }
    logLoginEvent(data.session?.access_token);
    // Success is handled by the session effect above.
  }

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1117]/80 p-6 font-display text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 animate-float rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 animate-float rounded-full bg-gold-400/10 blur-3xl [animation-delay:1.5s]" />

      <div className="gold-border-spin cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-icon-512.png" alt="" className="h-10 w-10 rounded-full object-contain" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight">{t('authLogin.title')}</h1>

        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1.5 block text-sm font-bold text-white/80">
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
            <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white/80">
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
            <MotionLink
              href="/forgot-password"
              whileTap={{ scale: 0.96 }}
              className="mt-2 inline-block text-xs text-white/60 underline underline-offset-4 transition-colors hover:text-white"
            >
              {t('authLogin.forgotPasswordCta')}
            </MotionLink>
          </div>
          {error && <p className="animate-slide-down text-sm font-bold text-red-300">{error}</p>}
          <motion.button
            type="submit"
            disabled={submitting}
            {...buttonTap}
            className="btn-cinematic-gold flex w-full items-center justify-center px-4 py-3.5 disabled:opacity-50"
          >
            {submitting ? <LoadingSpinner inline showLabel={false} size={18} /> : t('authEmployee.submitCta')}
          </motion.button>

          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            {t('authCustomer.orDivider')}
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <motion.button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            {...buttonTap}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-[#161b22] px-4 py-3 font-semibold text-white transition-all duration-300 hover:border-amber-400/50 hover:bg-[#21262d] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <GoogleGlyph className="h-4 w-4" />
            {t('authCustomer.continueWithGoogle')}
          </motion.button>
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
