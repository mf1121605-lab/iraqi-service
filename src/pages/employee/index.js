import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Lock } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { dashboardPathForRole, useSession } from '../../utils/useSession';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../../utils/i18n';
import { isValidIraqiPhone, toE164 } from '../../utils/phoneHelper';

export default function EmployeeAuth() {
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
    if (!loading && session && profile) {
      router.replace(dashboardPathForRole(profile.role));
    }
  }, [loading, session, profile, router]);

  const t = (path) => translate(locale, path);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const credentials = isValidIraqiPhone(identifier)
      ? { phone: toE164(identifier), password }
      : { email: identifier, password };

    const { error: signInError } = await supabaseClient.auth.signInWithPassword(credentials);
    setSubmitting(false);
    if (signInError) {
      setError(t('authEmployee.errorInvalid'));
      return;
    }
    router.replace('/employee/dashboard');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6 text-white">
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 animate-float rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-72 w-72 animate-float rounded-full bg-gold-400/20 blur-3xl [animation-delay:1.5s]" />

      <div className="glass-panel relative w-full max-w-md animate-scale-in rounded-4xl p-10 shadow-elevate-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner-glass">
          <Briefcase className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-center font-display text-2xl font-bold">{t('authEmployee.title')}</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm text-white/80">
              {t('authEmployee.identifierLabel')}
            </label>
            <input
              id="identifier"
              type="text"
              dir="ltr"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t('authEmployee.identifierPlaceholder')}
              className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 flex items-center gap-1.5 text-sm text-white/80">
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
              className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          {error && <p className="animate-slide-down text-sm text-red-200">{error}</p>}
          }
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.01] hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100"
          >
            {t('authEmployee.submitCta')}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('authEmployee.backCta')}
        </Link>
      </div>
    </main>
  );
}
