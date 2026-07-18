import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, KeyRound } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

function formatDate(value, locale) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb');
}

export default function FounderUsersData() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'users-data');

  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');

  async function handlePasscodeSubmit(event) {
    event.preventDefault();
    setPasscodeError('');
    setSubmitting(true);

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const response = await fetch('/api/founder/users-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ passcode }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setPasscodeError(payload.error === 'invalid_passcode' ? t('founderUsersData.errorPasscodeWrong') : t('founderUsersData.errorGeneric'));
      return;
    }
    setData(payload);
    setUnlocked(true);
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Database className="h-5 w-5" aria-hidden="true" />
        {t('founderUsersData.title')}
      </h2>

      {!unlocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <motion.form
            onSubmit={handlePasscodeSubmit}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative z-10 w-full max-w-sm rounded-[1.5rem] border border-gold-400/20 bg-surface-dark p-6 text-white shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-center font-display text-xl font-bold">{t('founderUsersData.passcodeTitle')}</h3>
            <p className="mt-1.5 text-center text-sm font-semibold text-white/70">{t('founderUsersData.passcodeDescription')}</p>
            <label htmlFor="passcode" className="sr-only">
              {t('founderUsersData.passcodeLabel')}
            </label>
            <input
              id="passcode"
              type="password"
              dir="ltr"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="input-cinematic mt-4"
              autoFocus
            />
            {passcodeError && <p className="mt-2 text-sm font-bold text-red-300">{passcodeError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="btn-cinematic-gold mt-4 w-full px-4 py-3 disabled:opacity-50"
            >
              {t('founderUsersData.passcodeCta')}
            </button>
          </motion.form>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`rounded-xl2 px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'customers'
                  ? 'bg-brand-600 text-white'
                  : 'bg-black/5 text-ink-muted hover:bg-black/10 dark:bg-white/5 dark:text-ink-dark-muted dark:hover:bg-white/10'
              }`}
            >
              {t('founderUsersData.customersTab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              className={`rounded-xl2 px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'employees'
                  ? 'bg-brand-600 text-white'
                  : 'bg-black/5 text-ink-muted hover:bg-black/10 dark:bg-white/5 dark:text-ink-dark-muted dark:hover:bg-white/10'
              }`}
            >
              {t('founderUsersData.employeesTab')}
            </button>
          </div>

          {activeTab === 'customers' ? (
            data.customers.length === 0 ? (
              <p className="mt-4 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">{t('founderUsersData.emptyCustomers')}</p>
            ) : (
              <div className="mt-4 animate-fade-in overflow-x-auto rounded-2xl border border-black/5 shadow-soft dark:border-white/10">
                <table className="w-full text-start text-sm">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr>
                      <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colFullName')}</th>
                      <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colUsername')}</th>
                      <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colPhone')}</th>
                      <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colCreatedAt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((customer) => (
                      <tr key={customer.id} className="border-t border-black/5 transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]">
                        <td className="p-3 font-semibold">{[customer.given_name, customer.family_name].filter(Boolean).join(' ') || '—'}</td>
                        <td className="p-3 text-xs" dir="ltr">
                          {customer.username || '—'}
                        </td>
                        <td className="p-3 text-xs" dir="ltr">
                          {customer.phone || '—'}
                        </td>
                        <td className="p-3 text-xs text-ink-muted dark:text-ink-dark-muted">{formatDate(customer.created_at, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : data.employees.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">{t('founderUsersData.emptyEmployees')}</p>
          ) : (
            <div className="mt-4 animate-fade-in overflow-x-auto rounded-2xl border border-black/5 shadow-soft dark:border-white/10">
              <table className="w-full text-start text-sm">
                <thead className="bg-black/5 dark:bg-white/5">
                  <tr>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colFullName')}</th>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colPhone')}</th>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colCreatedAt')}</th>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colLastLogin')}</th>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-black/5 transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]">
                      <td className="p-3 font-semibold">{[employee.given_name, employee.family_name].filter(Boolean).join(' ') || '—'}</td>
                      <td className="p-3 text-xs" dir="ltr">
                        {employee.phone || '—'}
                      </td>
                      <td className="p-3 text-xs text-ink-muted dark:text-ink-dark-muted">{formatDate(employee.created_at, locale)}</td>
                      <td className="p-3 text-xs text-ink-muted dark:text-ink-dark-muted">
                        {employee.last_login_at ? formatDate(employee.last_login_at, locale) : t('founderUsersData.neverLoggedIn')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            employee.account_status === 'active'
                              ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                              : 'bg-red-500/10 text-red-600 dark:text-red-300'
                          }`}
                        >
                          {employee.account_status === 'active' ? t('founderUsersData.statusActive') : t('founderUsersData.statusInactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
