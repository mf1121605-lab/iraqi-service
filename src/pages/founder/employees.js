import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck as CheckCircle2, UserPlus, Users } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = {
  username: '',
  phone: '',
  email: '',
  password: '',
  givenName: '',
  fatherName: '',
  grandfatherName: '',
  familyName: '',
  specialization: '',
};

const EMPLOYEE_SELECT = 'id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, created_at';

export default function FounderEmployees() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'employees');
  const [employees, setEmployees] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);

  function loadEmployees() {
    supabaseClient.from('profiles').select(EMPLOYEE_SELECT).eq('role', 'employee').order('created_at', { ascending: false }).then(({ data }) => setEmployees(data ?? []));
  }

  useEffect(() => {
    if (!profile) return;
    loadEmployees();
  }, [profile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const response = await fetch('/api/founder/create-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ ...form, username: form.username.trim().toLowerCase() }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setForm(emptyForm);
    setToast(true);
    loadEmployees();
  }

  async function handleAction(targetUserId, action) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    await fetch('/api/founder/manage-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ targetUserId, action }),
    });
    loadEmployees();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <h2 className="section-title-cinematic font-display text-lg font-bold">
        <Users className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderEmployees.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderEmployees.hint')}</p>

      <form onSubmit={handleCreate} className="metal-panel mt-6 grid gap-3 p-6 text-white sm:grid-cols-2">
        <div>
          <input
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder={t('founderEmployees.usernameLabel')}
            dir="ltr"
            className="input-cinematic text-sm"
          />
          <p className="mt-1 text-xs text-white/40">{t('founderEmployees.usernameHint')}</p>
        </div>
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder={t('founderEmployees.passwordLabel')}
          dir="ltr"
          className="input-cinematic text-sm"
        />
        <input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder={t('founderEmployees.phoneLabel')}
          dir="ltr"
          className="input-cinematic text-sm"
        />
        <input
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder={t('founderEmployees.emailLabel')}
          dir="ltr"
          className="input-cinematic text-sm"
        />
        <input
          value={form.givenName}
          onChange={(event) => setForm({ ...form, givenName: event.target.value })}
          placeholder={t('founderEmployees.givenNameLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.fatherName}
          onChange={(event) => setForm({ ...form, fatherName: event.target.value })}
          placeholder={t('founderEmployees.fatherNameLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.grandfatherName}
          onChange={(event) => setForm({ ...form, grandfatherName: event.target.value })}
          placeholder={t('founderEmployees.grandfatherNameLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.familyName}
          onChange={(event) => setForm({ ...form, familyName: event.target.value })}
          placeholder={t('founderEmployees.familyNameLabel')}
          className="input-cinematic text-sm"
        />
        <div className="sm:col-span-2">
          <input
            value={form.specialization}
            onChange={(event) => setForm({ ...form, specialization: event.target.value })}
            placeholder={t('founderEmployees.specializationLabel')}
            className="input-cinematic w-full text-sm"
          />
          <p className="mt-1 text-xs text-white/40">{t('founderEmployees.specializationHint')}</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50 sm:col-span-2"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t('founderEmployees.createCta')}
        </button>
        {error && <p className="animate-slide-down text-sm text-red-400 sm:col-span-2">{error}</p>}
      </form>

      {employees === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : employees.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderEmployees.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {employees.map((emp) => (
            <li key={emp.id} className="metal-panel flex flex-wrap items-center justify-between gap-3 p-4 text-white">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {[emp.given_name, emp.father_name, emp.grandfather_name, emp.family_name].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="truncate text-xs text-white/50">
                  {emp.specialization || ''} {emp.admin_level === 'co_admin' ? '· co-admin' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {emp.account_status === 'suspended' ? (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'activate')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {t('founderEmployees.activateCta')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'suspend')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    {t('founderEmployees.suspendCta')}
                  </button>
                )}
                {emp.admin_level === 'co_admin' ? (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'remove_co_admin')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    {t('founderEmployees.removeCoAdminCta')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'assign_co_admin')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-500/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    {t('founderEmployees.assignCoAdminCta')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-x-0 top-4 z-[200] mx-auto flex w-fit items-center gap-2 rounded-2xl border border-gold-400/30 bg-surface-dark px-5 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-10px_rgba(230,171,44,0.5)]"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            {t('founderEmployees.createdToast')}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
