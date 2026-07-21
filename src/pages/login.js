import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, UserRound } from 'lucide-react';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7f6] p-4 font-display text-[#162b2a] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(0,168,132,0.13),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(13,91,74,0.12),transparent_26%)]" />
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_-35px_rgba(14,57,52,0.45)] lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#0d5c4b] p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[28px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#00a884]/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></span>
              <span className="text-lg font-bold">خدمات العراق</span>
            </div>
            <div className="mt-20">
              <p className="text-sm font-semibold tracking-[0.18em] text-emerald-100/80">بوابتك الرقمية</p>
              <h2 className="mt-4 max-w-sm text-4xl font-bold leading-tight">مكان واحد لإنجاز خدماتك بثقة.</h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">سجّل الدخول للوصول إلى خدماتك وطلباتك ومحادثاتك بطريقة سهلة وآمنة.</p>
            </div>
          </div>
          <div className="relative mt-auto space-y-3 text-sm text-white/85">
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-200" /> حساب واحد لجميع خدماتك</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-200" /> حماية وخصوصية بياناتك</p>
          </div>
        </aside>

        <div className="relative p-6 sm:p-10 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-between lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f6f1] text-[#00866b]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
              <span className="text-sm font-bold text-[#0d5c4b]">خدمات العراق</span>
            </div>
            <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f6f1] text-[#00866b] lg:mt-0"><Lock className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" /></span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#162b2a]">{t('authLogin.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-[#63807b]">أدخل بيانات حسابك للمتابعة إلى لوحة التحكم.</p>

        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="identifier" className="mb-2 block text-sm font-bold text-[#29433f]">
              {t('authEmployee.identifierLabel')}
            </label>
            <div className="flex items-center rounded-xl border border-[#d7e2df] bg-[#fbfdfc] px-3 transition focus-within:border-[#00a884] focus-within:ring-4 focus-within:ring-[#00a884]/10">
              <UserRound className="h-4 w-4 shrink-0 text-[#829792]" aria-hidden="true" />
              <input id="identifier" type="text" dir="ltr" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={t('authEmployee.identifierPlaceholder')} className="w-full border-0 bg-transparent px-3 py-3 text-sm text-[#162b2a] placeholder:text-[#93a6a2] focus:outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#29433f]">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {t('authEmployee.passwordLabel')}
            </label>
            <div className="flex items-center rounded-xl border border-[#d7e2df] bg-[#fbfdfc] px-3 transition focus-within:border-[#00a884] focus-within:ring-4 focus-within:ring-[#00a884]/10">
              <Lock className="h-4 w-4 shrink-0 text-[#829792]" aria-hidden="true" />
              <input id="password" type="password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('authEmployee.passwordPlaceholder')} className="w-full border-0 bg-transparent px-3 py-3 text-sm text-[#162b2a] placeholder:text-[#93a6a2] focus:outline-none" />
            </div>
            <MotionLink
              href="/forgot-password"
              whileTap={{ scale: 0.96 }}
              className="mt-2 inline-block text-xs font-semibold text-[#00866b] underline underline-offset-4 transition-colors hover:text-[#0d5c4b]"
            >
              {t('authLogin.forgotPasswordCta')}
            </MotionLink>
          </div>
          {error && <p className="animate-slide-down rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}
          <motion.button
            type="submit"
            disabled={submitting}
            {...buttonTap}
            className="flex w-full items-center justify-center rounded-xl bg-[#00a884] px-4 py-3.5 font-bold text-white shadow-[0_12px_20px_-12px_rgba(0,168,132,0.85)] transition hover:bg-[#008f71] focus:outline-none focus:ring-4 focus:ring-[#00a884]/20 disabled:opacity-50"
          >
            {submitting ? <LoadingSpinner inline showLabel={false} size={18} /> : t('authEmployee.submitCta')}
          </motion.button>

          <div className="flex items-center gap-3 text-xs text-[#8ca09c]">
            <span className="h-px flex-1 bg-[#dce6e3]" />
            {t('authCustomer.orDivider')}
            <span className="h-px flex-1 bg-[#dce6e3]" />
          </div>

          <motion.button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            {...buttonTap}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d7e2df] bg-white px-4 py-3 font-semibold text-[#29433f] transition hover:bg-[#f5f9f7] focus:outline-none focus:ring-4 focus:ring-[#00a884]/10"
          >
            <GoogleGlyph className="h-4 w-4" />
            {t('authCustomer.continueWithGoogle')}
          </motion.button>
        </form>

        <MotionLink
          href="/"
          whileTap={{ scale: 0.96 }}
          className="mt-7 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-[#63807b] underline underline-offset-4 transition-colors hover:text-[#0d5c4b]"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('authCustomer.backCta')}
        </MotionLink>
          </div>
        </div>
      </div>
    </main>
  );
}
