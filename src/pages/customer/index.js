import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Phone } from 'lucide-react';
import FacebookGlyph from '../../components/UI/FacebookGlyph';
import GoogleGlyph from '../../components/UI/GoogleGlyph';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mesh-hero p-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid-dark opacity-60" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-float rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-96 w-96 animate-float rounded-full bg-gold-400/15 blur-3xl [animation-delay:1.5s]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 animate-pulse-soft rounded-full bg-brand-400/10 blur-2xl" />

      <div className="glass-panel relative w-full max-w-md animate-scale-in rounded-4xl p-10 shadow-elevate-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner-glass">
          {step === 'otp' ? (
            <KeyRound className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Phone className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 text-center font-display text-2xl font-bold">{t('authCustomer.title')}</h1>

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
                className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.01] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900 disabled:opacity-50 disabled:hover:scale-100"
            >
              {t('authCustomer.sendCodeCta')}
            </button>

            <div className="flex items-center gap-3 text-xs text-white/60">
              <span className="h-px flex-1 bg-white/20" />
              {t('authCustomer.orDivider')}
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleFacebookLogin}
                className="glass-panel flex w-full items-center justify-center gap-2 rounded-xl2 px-4 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.01] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <FacebookGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithFacebook')}
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="glass-panel flex w-full items-center justify-center gap-2 rounded-xl2 bg-white/95 px-4 py-3 font-semibold text-brand-950 transition-all duration-300 hover:scale-[1.01] hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-brand-900"
              >
                <GoogleGlyph className="h-4 w-4" />
                {t('authCustomer.continueWithGoogle')}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="mt-8 animate-fade-in space-y-4">
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
                className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.01] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900 disabled:opacity-50 disabled:hover:scale-100"
            >
              {t('authCustomer.verifyCta')}
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              className="w-full rounded text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              {t('authCustomer.resendCta')}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('authCustomer.backCta')}
        </Link>
      </div>
    </main>
  );
}
