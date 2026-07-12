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
  useEffect(() => {
    if (!loading && session && profile) {
      router.replace(dashboardPathForRole(profile.role));
    }
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
    router.replace('/customer/dashboard');
  }

  async function handleFacebookLogin() {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/customer/dashboard` },
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
