import { useEffect, useState } from 'react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = {
  phone: '',
  email: '',
  password: '',
  givenName: '',
  fatherName: '',
  grandfatherName: '',
  familyName: '',
  specialization: '',
};

export default function FounderUsers() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'users');

  const [employees, setEmployees] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function loadEmployees() {
    const { data } = await supabaseClient
      .from('profiles')
      .select('id, given_name, father_name, grandfather_name, family_name, phone, specialization, account_status, admin_level')
      .eq('role', 'employee')
      .order('created_at');
    setEmployees(data ?? []);
  }

  useEffect(() => {
    if (profile) loadEmployees();
  }, [profile]);

  async function callFounderApi(path, body) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async function handleCreateEmployee(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = await callFounderApi('/api/founder/create-employee', form);
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setForm(emptyForm);
    loadEmployees();
  }

  async function handleAccountAction(targetUserId, action) {
    await callFounderApi('/api/founder/manage-account', { targetUserId, action });
    loadEmployees();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut}>
      <h2 className="font-display text-lg font-bold">{t('founderUsers.title')}</h2>

      {employees === null ? (
        <p className="mt-4 text-sm">{t('common.loading')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {employees.map((employee) => (
            <li
              key={employee.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10"
            >
              <div>
                <p className="font-semibold">
                  {[employee.given_name, employee.father_name, employee.grandfather_name, employee.family_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                  {employee.admin_level === 'co_admin' && (
                    <span className="ms-2 rounded-full bg-gold-500/10 px-2 py-0.5 text-xs text-gold-700 dark:text-gold-300">
                      co_admin
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                  {employee.phone} · {employee.specialization || '—'} ·{' '}
                  <span className={employee.account_status === 'suspended' ? 'text-red-600 dark:text-red-300' : ''}>
                    {employee.account_status}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {employee.account_status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => handleAccountAction(employee.id, 'suspend')}
                    className="text-red-600 underline dark:text-red-300"
                  >
                    {t('founderUsers.suspendCta')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAccountAction(employee.id, 'activate')}
                    className="text-brand-700 underline dark:text-brand-300"
                  >
                    {t('founderUsers.activateCta')}
                  </button>
                )}
                {employee.admin_level === 'co_admin' ? (
                  <button
                    type="button"
                    onClick={() => handleAccountAction(employee.id, 'remove_co_admin')}
                    className="underline"
                  >
                    {t('founderUsers.removeCoAdminCta')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAccountAction(employee.id, 'assign_co_admin')}
                    className="underline"
                  >
                    {t('founderUsers.assignCoAdminCta')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
        <h3 className="font-semibold">{t('founderUsers.createEmployeeCta')}</h3>
        {message && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{message}</p>}
        <form onSubmit={handleCreateEmployee} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={form.givenName}
            onChange={(event) => setForm({ ...form, givenName: event.target.value })}
            placeholder={t('founderUsers.formGivenName')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.fatherName}
            onChange={(event) => setForm({ ...form, fatherName: event.target.value })}
            placeholder={t('founderUsers.formFatherName')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.grandfatherName}
            onChange={(event) => setForm({ ...form, grandfatherName: event.target.value })}
            placeholder={t('founderUsers.formGrandfatherName')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.familyName}
            onChange={(event) => setForm({ ...form, familyName: event.target.value })}
            placeholder={t('founderUsers.formFamilyName')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder={t('founderUsers.formPhone')}
            dir="ltr"
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder={t('founderUsers.formEmail')}
            dir="ltr"
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder={t('founderUsers.formPassword')}
            dir="ltr"
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={form.specialization}
            onChange={(event) => setForm({ ...form, specialization: event.target.value })}
            placeholder={t('founderUsers.formSpecialization')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-xl2 bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('founderUsers.createEmployeeCta')}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
