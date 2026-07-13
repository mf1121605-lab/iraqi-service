import { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = { phone: '', email: '', password: '', givenName: '', fatherName: '', grandfatherName: '', familyName: '', specialization: '' };

export default function FounderEmployees() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'employees');
  const [employees, setEmployees] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('profiles').select('id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, created_at').eq('role', 'employee').order('created_at', { ascending: false }).then(({ data }) => setEmployees(data ?? []));
  }, [profile]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch('/api/founder/create-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (result.error) {
      setError(result.error);
      return;
    }
    setForm(emptyForm);
    supabaseClient.from('profiles').select('id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, created_at').eq('role', 'employee').order('created_at', { ascending: false }).then(({ data }) => setEmployees(data ?? []));
  }

  async function handleAction(targetUserId, action) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await fetch('/api/founder/manage-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ targetUserId, action }),
    });
    supabaseClient.from('profiles').select('id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, created_at').eq('role', 'employee').order('created_at', { ascending: false }).then(({ data }) => setEmployees(data ?? []));
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Users className="h-5 w-5" aria-hidden="true" />
        {t('founderEmployees.title')}
      </h2>

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input placeholder={t('founderEmployees.phoneLabel')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.emailLabel')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input type="password" placeholder={t('founderEmployees.passwordLabel')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.givenNameLabel')} value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.fatherNameLabel')} value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.grandfatherNameLabel')} value={form.grandfatherName} onChange={(e) => setForm({ ...form, grandfatherName: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.familyNameLabel')} value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderEmployees.specializationLabel')} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <button type="submit" className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm hover:bg-brand-700">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t('founderEmployees.createCta')}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
      }

      {(employees ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderEmployees.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(employees ?? []).map((emp) => (
            <li key={emp.id} className="flex items-center justify-between rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10">
              <div>
                <p className="font-semibold">{[emp.given_name, emp.father_name, emp.grandfather_name, emp.family_name].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{emp.specialization || ''} {emp.admin_level === 'co_admin' ? '· co-admin' : ''}</p>
              </div>
              <div className="flex gap-2">
                {emp.account_status === 'suspended' ? (
                  <button type="button" onClick={() => handleAction(emp.id, 'activate')} className="text-xs font-semibold text-brand-700 dark:text-brand-300">{t('founderEmployees.activateCta')}</button>
                ) : (
                  <button type="button" onClick={() => handleAction(emp.id, 'suspend')} className="text-xs font-semibold text-red-600 dark:text-red-300">{t('founderEmployees.suspendCta')}</button>
                )}
                {emp.admin_level === 'co_admin' ? (
                  <button type="button" onClick={() => handleAction(emp.id, 'remove_co_admin')} className="text-xs font-semibold text-ink-muted dark:text-ink-dark-muted">{t('founderEmployees.removeCoAdminCta')}</button>
                ) : (
                  <button type="button" onClick={() => handleAction(emp.id, 'assign_co_admin')} className="text-xs font-semibold text-gold-700 dark:text-gold-300">{t('founderEmployees.assignCoAdminCta')}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
