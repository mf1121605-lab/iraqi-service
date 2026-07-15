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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-brand-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 animate-float rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 animate-float rounded-full bg-gold-400/10 blur-3xl [animation-delay:1.5s]" />

      <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          <Briefcase className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight">{t('authEmployee.title')}</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
          <button type="submit" disabled={submitting} className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50">
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
