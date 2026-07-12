import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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

    // The founder gives employees either a phone or an email; either works
    // here (matches "Employee Login (requires Founder-provided phone/email
    // + password)"). '077' inclusivity applies the same as everywhere
    // else — no branch here treats a customer-shaped phone differently.
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero p-6 text-white">
      <div className="glass-panel w-full max-w-md animate-fade-in rounded-3xl p-10 shadow-glass">
        <h1 className="text-center font-display text-2xl font-bold">{t('authEmployee.title')}</h1>

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
              className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-white/80">
              {t('authEmployee.passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('authEmployee.passwordPlaceholder')}
              className="w-full rounded-xl2 border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          {error && <p className="text-sm text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {t('authEmployee.submitCta')}
          </button>
        </form>

        <Link href="/" className="mt-6 block text-center text-sm text-white/70 underline underline-offset-4">
          {t('authEmployee.backCta')}
        </Link>
      </div>
    </main>
  );
}
