import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Camera, CircleCheck as CheckCircle2, Copy, Eye, EyeOff, UserPlus, Users, X } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import Avatar from '../../components/Chat/Avatar';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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
  avatarKey: '',
};

const EMPLOYEE_SELECT = 'id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, is_verified, created_at';

export default function FounderEmployees() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'employees');
  const [employees, setEmployees] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  function loadEmployees() {
    supabaseClient
      .from('profiles')
      .select(EMPLOYEE_SELECT)
      .eq('role', 'employee')
      .order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (loadError) console.error('loadEmployees failed', loadError);
        setEmployees(data ?? []);
      });
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

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError('');
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError(t('common.imageTypeInvalid'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(t('common.imageTooLarge'));
      return;
    }

    setAvatarUploading(true);
    // The employee doesn't have an id yet at this point, so this uploads
    // under a throwaway folder rather than the self-upload avatars/{uid}/
    // path — the founder already has blanket write access to this bucket
    // (site_assets_write_founder), so no extra RLS policy is needed here.
    const path = `avatars/pending/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    setAvatarUploading(false);
    setForm((current) => ({ ...current, avatarKey: data.publicUrl }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    let result;
    try {
      const response = await fetch('/api/founder/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...form, username: form.username.trim().toLowerCase() }),
      });
      result = await response.json().catch(() => ({ error: t('common.errorGeneric') }));
    } catch {
      setSubmitting(false);
      setError(t('common.errorGeneric'));
      return;
    }
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const createdUsername = form.username.trim().toLowerCase();
    const createdPassword = form.password;
    setForm(emptyForm);
    setAvatarError('');
    setToast(true);
    setNewCredentials({ username: createdUsername, password: createdPassword, loginUrl: 'https://iraqi-service.vercel.app/login' });
    loadEmployees();
  }

  async function handleAction(targetUserId, action) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    try {
      await fetch('/api/founder/manage-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ targetUserId, action }),
      });
    } catch {
      // network error — reload anyway so state reflects the actual DB value
    }
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
        <div className="flex items-center gap-3 sm:col-span-2">
          <Avatar avatarKey={form.avatarKey} name={form.givenName} seed="new-employee" className="h-14 w-14" />
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            {avatarUploading ? t('common.loading') : t('founderEmployees.avatarUploadCta')}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
          </label>
          {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
        </div>
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
                <p className="flex items-center gap-1 truncate font-semibold">
                  {[emp.given_name, emp.father_name, emp.grandfather_name, emp.family_name].filter(Boolean).join(' ') || '—'}
                  {emp.is_verified && (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400" aria-label={t('founderEmployees.verifiedBadgeLabel')} />
                  )}
                </p>
                <p className="truncate text-xs text-white/50">
                  {emp.specialization || ''} {emp.admin_level === 'co_admin' ? '· co-admin' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {emp.is_verified ? (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'unverify')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {t('founderEmployees.unverifyCta')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(emp.id, 'verify')}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {t('founderEmployees.verifyCta')}
                  </button>
                )}
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

      <AnimatePresence>
        {newCredentials && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
            onClick={() => { setNewCredentials(null); setShowPassword(false); setCredentialsCopied(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="metal-panel w-full max-w-sm space-y-4 p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">{t('founderEmployees.credentialsModalTitle')}</h3>
                <button
                  type="button"
                  onClick={() => { setNewCredentials(null); setShowPassword(false); setCredentialsCopied(false); }}
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"
                  aria-label={t('founderEmployees.credentialsDone')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-white/50">{t('founderEmployees.credentialsUsername')}</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={newCredentials.username} dir="ltr" className="input-cinematic flex-1 text-sm" />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(newCredentials.username)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-white/50">{t('founderEmployees.credentialsPassword')}</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={newCredentials.password}
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      className="input-cinematic flex-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(newCredentials.password)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-white/50">{t('founderEmployees.credentialsLoginUrl')}</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={newCredentials.loginUrl} dir="ltr" className="input-cinematic flex-1 text-sm" />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(newCredentials.loginUrl)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = `${t('founderEmployees.credentialsUsername')}: ${newCredentials.username}\n${t('founderEmployees.credentialsPassword')}: ${newCredentials.password}\n${t('founderEmployees.credentialsLoginUrl')}: ${newCredentials.loginUrl}`;
                    navigator.clipboard.writeText(text);
                    setCredentialsCopied(true);
                    setTimeout(() => setCredentialsCopied(false), 2000);
                  }}
                  className="btn-cinematic-gold flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-bold"
                >
                  <Copy className="h-4 w-4" />
                  {credentialsCopied ? t('founderEmployees.credentialsCopied') : t('founderEmployees.credentialsCopyAll')}
                </button>
                <button
                  type="button"
                  onClick={() => { setNewCredentials(null); setShowPassword(false); setCredentialsCopied(false); }}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10"
                >
                  {t('founderEmployees.credentialsDone')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
