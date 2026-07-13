import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabaseClient } from '../../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../../utils/i18n';
import { isValidIraqiPhone, toE164 } from '../../utils/phoneHelper';

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

  // Already signed in (any role) -> bounce straight to their dashboard.
  // A customer who never finished picking an avatar goes back through
  // onboarding instead of straight to the dashboard.
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
      setError(otpError.message);
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
      setError(verifyError.message);
      return;
    }
    router.replace('/customer/onboarding');
  }

  async function handleFacebookLogin() {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/customer/onboarding` },
    });
  }

  async function handleGoogleLogin() {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/customer/onboarding` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero p-6 text-white">
      <div className="glass-panel w-full max-w-md animate-fade-in rounded-3xl p-10 shadow-glass">
        <h1 className="text-center font-display text-2xl font-bold">{t('authCustomer.title')}</h1>

        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="mt-8 space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm text-white/80">
                {t('authCustomer.phoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('authCustomer.phonePlaceholder')}
                className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            {error && <p className="text-sm text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {t('authCustomer.sendCodeCta')}
            </button>

            <div className="flex items-center gap-3 text-xs text-white/60">
              <span className="h-px flex-1 bg-white/20" />
              {t('authCustomer.orDivider')}
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl2 bg-white px-4 py-3 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('authCustomer.continueWithGoogle')}
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              className="glass-panel w-full rounded-xl2 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              {t('authCustomer.continueWithFacebook')}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            <p className="text-sm text-white/80">{t('authCustomer.otpSentMessage')}</p>
            <div>
              <label htmlFor="otp" className="mb-1 block text-sm text-white/80">
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
                className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            {error && <p className="text-sm text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {t('authCustomer.verifyCta')}
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              className="w-full text-center text-sm text-white/70 underline underline-offset-4 hover:text-white"
            >
              {t('authCustomer.resendCta')}
            </button>
          </form>
        )}

        <Link href="/" className="mt-6 block text-center text-sm text-white/70 underline underline-offset-4">
          {t('authCustomer.backCta')}
        </Link>
      </div>
    </main>
  );
}
