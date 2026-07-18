import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Lock, Phone, ShieldCheck, User } from 'lucide-react';
import FacebookGlyph from '../../components/UI/FacebookGlyph';
import GoogleGlyph from '../../components/UI/GoogleGlyph';
import { supabaseClient } from '../../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../../utils/i18n';
import { logLoginEvent } from '../../utils/logLoginEvent';
import { MotionLink, buttonTap } from '../../components/UI/Motion';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const USERNAME_EMAIL_DOMAIN = 'iraqi-service.vercel.app';

export default function CustomerAuth() {
  const router = useRouter();
  const { session, profile, loading } = useSession();
  const [locale, setLocale] = useState(defaultLocale);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryQuestionId, setRecoveryQuestionId] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
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

  async function handleRegister(event) {
    event.preventDefault();
    setError('');

    const normalizedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError(t('authCustomer.errorUsernameFormat'));
      return;
    }
    if (!fullName.trim() || !surname.trim()) {
      setError(t('authCustomer.errorNameRequired'));
      return;
    }
    if (!phone.trim()) {
      setError(t('authCustomer.errorPhoneRequired'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('authCustomer.errorPasswordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('authCustomer.errorPasswordMismatch'));
      return;
    }

    setSubmitting(true);

    let response;
    try {
      response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          fullName: fullName.trim(),
          surname: surname.trim(),
          username: normalizedUsername,
          recoveryQuestionId: recoveryQuestionId || undefined,
          recoveryAnswer: recoveryAnswer.trim() || undefined,
        }),
      });
    } catch (fetchError) {
      setSubmitting(false);
      console.error('register request failed', fetchError);
      setError(t('common.errorGeneric'));
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSubmitting(false);
      console.error('register failed', payload);
      const message = typeof payload.error === 'string' ? payload.error.trim() : '';
      const looksUsable = message && !message.startsWith('{') && !message.startsWith('[');
      setError(looksUsable ? message : t('common.errorGeneric'));
      return;
    }

    // The account is created server-side via the privileged Admin API,
    // keyed off a deterministic internal email derived from the username
    // (Supabase's native phone provider is no longer used for customers) —
    // sign in client-side right after to establish the actual session.
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      console.error('post-register sign-in failed', signInError);
      router.replace('/login');
      return;
    }
    logLoginEvent(signInData.session?.access_token);
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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 animate-float rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 animate-float rounded-full bg-gold-400/10 blur-3xl [animation-delay:1.5s]" />

      <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          <User className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300/80">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.platformName')}
        </div>
        <h1 className="mt-2 text-center font-display text-3xl font-bold tracking-tight">{t('authCustomer.title')}</h1>

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm text-white/80">
              {t('authCustomer.fullNameLabel')}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="input-cinematic"
            />
          </div>
          <div>
            <label htmlFor="surname" className="mb-1.5 block text-sm text-white/80">
              {t('authCustomer.surnameLabel')}
            </label>
            <input
              id="surname"
              type="text"
              value={surname}
              onChange={(event) => setSurname(event.target.value)}
              className="input-cinematic"
            />
          </div>
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
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm text-white/80">
              {t('authCustomer.usernameLabel')}
            </label>
            <input
              id="username"
              type="text"
              dir="ltr"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder={t('authCustomer.usernamePlaceholder')}
              className="input-cinematic"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm text-white/80">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {t('authCustomer.passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('authCustomer.passwordPlaceholder')}
              className="input-cinematic"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 flex items-center gap-1.5 text-sm text-white/80">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {t('authCustomer.confirmPasswordLabel')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('authCustomer.passwordPlaceholder')}
              className="input-cinematic"
            />
          </div>
          <details className="group rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              {t('authCustomer.recoverySectionTitle')}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="recoveryQuestionId" className="mb-1.5 block text-xs text-white/70">
                  {t('authCustomer.recoveryQuestionLabel')}
                </label>
                <select
                  id="recoveryQuestionId"
                  value={recoveryQuestionId}
                  onChange={(event) => setRecoveryQuestionId(event.target.value)}
                  className="input-cinematic"
                >
                  <option value="">{t('authCustomer.recoveryQuestionPlaceholder')}</option>
                  <option value="1">{t('authCustomer.recoveryQuestion1')}</option>
                  <option value="2">{t('authCustomer.recoveryQuestion2')}</option>
                </select>
              </div>
              {recoveryQuestionId && (
                <div>
                  <label htmlFor="recoveryAnswer" className="mb-1.5 block text-xs text-white/70">
                    {t('authCustomer.recoveryAnswerLabel')}
                  </label>
                  <input
                    id="recoveryAnswer"
                    type="text"
                    value={recoveryAnswer}
                    onChange={(event) => setRecoveryAnswer(event.target.value)}
                    placeholder={t('authCustomer.recoveryAnswerPlaceholder')}
                    className="input-cinematic"
                  />
                </div>
              )}
            </div>
          </details>
          {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
          <motion.button
            type="submit"
            disabled={submitting}
            {...buttonTap}
            className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
          >
            {t('authCustomer.registerCta')}
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
