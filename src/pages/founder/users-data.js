import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Database, KeyRound, X } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const REFRESH_INTERVAL_MS = 60 * 1000;

function formatDate(value, locale) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb');
}

function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

function PresenceBadge({ lastActiveAt, t, locale }) {
  const online = isOnline(lastActiveAt);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-black/30 dark:bg-white/30'}`} aria-hidden="true" />
      {online ? (
        t('founderUsersData.onlineNow')
      ) : lastActiveAt ? (
        <span className="text-ink-muted dark:text-ink-dark-muted">
          {t('founderUsersData.lastSeenPrefix')} {formatDate(lastActiveAt, locale)}
        </span>
      ) : (
        <span className="text-ink-muted dark:text-ink-dark-muted">{t('founderUsersData.neverSeen')}</span>
      )}
    </span>
  );
}

async function callFounderApi(path, body) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, payload: await response.json().catch(() => ({})) };
  } catch {
    return { ok: false, payload: {} };
  }
}

export default function FounderUsersData() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'users-data');

  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [activityUser, setActivityUser] = useState(null);
  const [activityLogins, setActivityLogins] = useState(null);

  const refreshData = useCallback(async () => {
    const { ok, payload } = await callFounderApi('/api/founder/users-list', { passcode });
    if (ok) setData(payload);
  }, [passcode]);

  useEffect(() => {
    if (!unlocked) return undefined;
    const interval = setInterval(refreshData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [unlocked, refreshData]);

  async function handlePasscodeSubmit(event) {
    event.preventDefault();
    setPasscodeError('');
    setSubmitting(true);
    const { ok, payload } = await callFounderApi('/api/founder/users-list', { passcode });
    setSubmitting(false);

    if (!ok) {
      setPasscodeError(payload.error === 'invalid_passcode' ? t('founderUsersData.errorPasscodeWrong') : t('founderUsersData.errorGeneric'));
      return;
    }
    setData(payload);
    setUnlocked(true);
  }

  async function openActivityLog(user) {
    setActivityUser(user);
    setActivityLogins(null);
    const { ok, payload } = await callFounderApi('/api/founder/user-activity', { userId: user.id });
    setActivityLogins(ok ? payload.logins : []);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
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
            <button type="submit" disabled={submitting} className="btn-cinematic-gold mt-4 w-full px-4 py-3 disabled:opacity-50">
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
                      <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colPresence')}</th>
                      <th className="p-3 text-start font-display font-bold" />
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
                        <td className="p-3">
                          <PresenceBadge lastActiveAt={customer.last_active_at} t={t} locale={locale} />
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => openActivityLog(customer)}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:text-brand-300"
                          >
                            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('founderUsersData.activityLogCta')}
                          </button>
                        </td>
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
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colPresence')}</th>
                    <th className="p-3 text-start font-display font-bold">{t('founderUsersData.colStatus')}</th>
                    <th className="p-3 text-start font-display font-bold" />
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
                        <PresenceBadge lastActiveAt={employee.last_active_at} t={t} locale={locale} />
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
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openActivityLog(employee)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:text-brand-300"
                        >
                          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('founderUsersData.activityLogCta')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activityUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActivityUser(null)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] border border-gold-400/20 bg-surface-dark text-white shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h3 className="font-display text-lg font-bold">{t('founderUsersData.activityLogTitle')}</h3>
                <p className="mt-0.5 text-sm font-semibold text-white/60">
                  {[activityUser.given_name, activityUser.family_name].filter(Boolean).join(' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivityUser(null)}
                aria-label={t('common.close')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {activityLogins === null ? (
                <LoadingSpinner inline locale={locale} />
              ) : activityLogins.length === 0 ? (
                <p className="text-sm font-semibold text-white/70">{t('founderUsersData.activityLogEmpty')}</p>
              ) : (
                <ul className="space-y-3">
                  {activityLogins.map((login) => (
                    <li key={login.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-bold">
                        {t('founderUsersData.activityLoginAt')}: {formatDate(login.logged_at, locale)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white/60" dir="ltr">
                        {t('founderUsersData.activityIp')}: {login.ip_address || '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
