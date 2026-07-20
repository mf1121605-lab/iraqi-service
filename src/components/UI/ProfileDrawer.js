import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Globe,
  Headset,
  Loader as Loader2,
  Lock,
  LogOut,
  Moon,
  Settings as SettingsIcon,
  Sun,
  User,
  X,
  XCircle,
} from 'lucide-react';
import Avatar from '../Chat/Avatar';
import { supabaseClient } from '../../lib/supabaseClient';
import { LOCALE_META, translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';
import { isValidIraqiPhone, toLocalFormat } from '../../utils/phoneHelper';

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

async function authHeader() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token ?? ''}` };
}

export default function ProfileDrawer({
  open,
  onClose,
  profile,
  locale,
  onProfileUpdated,
  theme,
  onToggleTheme,
  onToggleLocale,
  onSignOut,
}) {
  const t = (path) => translate(locale, path);
  const [activeTab, setActiveTab] = useState('info');

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState('');

  const [givenName, setGivenName] = useState(profile?.given_name ?? '');
  const [familyName, setFamilyName] = useState(profile?.family_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (!open || !profile) return;
    setGivenName(profile.given_name ?? '');
    setFamilyName(profile.family_name ?? '');
    setPhone(profile.phone ?? '');
    setEmail(profile.email ?? '');
    setUsername(profile.username ?? '');
    setInfoError('');
    setInfoSaved(false);
    setUsernameError('');
    setUsernameSaved(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSaved(false);
  }, [open, profile]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  if (!open) return null;

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

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    previewUrlRef.current = localUrl;
    setAvatarPreview(localUrl);

    setAvatarUploading(true);
    const path = `avatars/${profile.id}/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    const { error: updateError } = await supabaseClient.from('profiles').update({ avatar_key: data.publicUrl }).eq('id', profile.id);
    setAvatarUploading(false);
    if (updateError) {
      setAvatarError(updateError.message || t('common.errorGeneric'));
      return;
    }
    onProfileUpdated?.();
  }

  async function handleSaveInfo(event) {
    event.preventDefault();
    setInfoError('');
    setInfoSaved(false);
    if (!givenName.trim() || !familyName.trim()) {
      setInfoError(t('profileDrawer.errorNameRequired'));
      return;
    }
    if (phone.trim() && !isValidIraqiPhone(phone)) {
      setInfoError(t('profileDrawer.errorPhoneInvalid'));
      return;
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setInfoError(t('profileDrawer.errorEmailInvalid'));
      return;
    }

    setInfoSaving(true);
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        phone: phone.trim() ? toLocalFormat(phone) ?? phone.trim() : null,
        email: email.trim() || null,
      })
      .eq('id', profile.id);
    setInfoSaving(false);
    if (error) {
      const duplicate = /duplicate|unique/i.test(error.message ?? '');
      setInfoError(duplicate ? t('profileDrawer.errorEmailTaken') : error.message || t('common.errorGeneric'));
      return;
    }
    setInfoSaved(true);
    onProfileUpdated?.();
  }

  async function handleSaveUsername(event) {
    event.preventDefault();
    setUsernameError('');
    setUsernameSaved(false);
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      setUsernameError(t('profileDrawer.errorUsernameInvalid'));
      return;
    }

    setUsernameSaving(true);
    const response = await fetch('/api/customer/update-username', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ username: normalized }),
    });
    const payload = await response.json().catch(() => ({}));
    setUsernameSaving(false);
    if (!response.ok) {
      setUsernameError(typeof payload.error === 'string' ? payload.error : t('common.errorGeneric'));
      return;
    }
    setUsernameSaved(true);
    onProfileUpdated?.();
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('profileDrawer.errorPasswordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profileDrawer.errorPasswordMismatch'));
      return;
    }

    setPasswordSaving(true);
    const response = await fetch('/api/customer/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const payload = await response.json().catch(() => ({}));
    setPasswordSaving(false);
    if (!response.ok) {
      setPasswordError(typeof payload.error === 'string' ? payload.error : t('common.errorGeneric'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
  }

  const isActive = profile?.account_status === 'active';
  const inputClass =
    'w-full rounded-xl2 border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-400/30';
  const labelClass = 'mb-1 block text-xs font-semibold text-white/60';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden="true" />
      <aside
        dir={locale === 'ar' || locale === 'ckb' ? 'rtl' : 'ltr'}
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-sm animate-slide-down flex-col overflow-y-auto border-s border-gold-400/10 bg-[#0d1117] font-display text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <User className="h-4 w-4 text-gold-300" aria-hidden="true" />
            {t('profileDrawer.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <label className="group relative h-24 w-24 cursor-pointer rounded-full">
              <Avatar avatarKey={avatarPreview ?? profile?.avatar_key} name={givenName} seed={profile?.id} className="h-24 w-24" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-all duration-200 group-hover:bg-black/50 group-hover:text-white">
                {avatarUploading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Camera className="h-6 w-6" aria-hidden="true" />}
              </span>
              <input type="file" accept={ALLOWED_AVATAR_TYPES.join(',')} onChange={handleAvatarChange} disabled={avatarUploading} className="hidden" />
            </label>
            <p className="text-xs text-white/50">{t('profileDrawer.avatarEditCta')}</p>
            {avatarError && <p className="text-xs text-red-400" dir="ltr">{avatarError}</p>}
          </div>

          {/* Status */}
          <div
            className={`flex items-center gap-2 rounded-xl2 border px-3 py-2.5 text-sm font-semibold ${
              isActive ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/30 bg-red-400/10 text-red-300'
            }`}
          >
            {isActive ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {isActive ? t('profileDrawer.statusActive') : t('profileDrawer.statusSuspended')}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl2 bg-white/5 p-1">
            {[
              { key: 'info', label: t('profileDrawer.tabInfo'), icon: User },
              { key: 'password', label: t('profileDrawer.tabPassword'), icon: Lock },
              { key: 'settings', label: t('profileDrawer.tabSettings'), icon: SettingsIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 ${
                  activeTab === tab.key ? 'bg-gold-500/90 text-brand-950' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <>
              {/* Personal & contact info */}
              <form onSubmit={handleSaveInfo} className="space-y-3 border-t border-white/10 pt-5">
                <h3 className="text-sm font-bold text-gold-300">{t('profileDrawer.infoSectionTitle')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t('profileDrawer.givenNameLabel')}</label>
                    <input value={givenName} onChange={(e) => setGivenName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('profileDrawer.familyNameLabel')}</label>
                    <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t('profileDrawer.phoneLabel')}</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('profileDrawer.emailLabel')}</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="you@example.com" className={inputClass} />
                </div>
                {infoError && <p className="text-xs text-red-400">{infoError}</p>}
                {infoSaved && <p className="text-xs text-emerald-400">{t('profileDrawer.savedMessage')}</p>}
                <button type="submit" disabled={infoSaving} className="btn-cinematic-gold w-full px-4 py-2.5 text-sm disabled:opacity-50">
                  {infoSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : t('profileDrawer.saveInfoCta')}
                </button>
              </form>

              {/* Username */}
              {profile?.role === 'customer' && (
                <form onSubmit={handleSaveUsername} className="space-y-3 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-bold text-gold-300">{t('profileDrawer.usernameSectionTitle')}</h3>
                  <div>
                    <label className={labelClass}>{t('profileDrawer.usernameLabel')}</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      dir="ltr"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-white/40">{t('profileDrawer.usernameHint')}</p>
                  </div>
                  {usernameError && (
                    <p className="text-xs text-red-400" dir="ltr">
                      {usernameError}
                    </p>
                  )}
                  {usernameSaved && <p className="text-xs text-emerald-400">{t('profileDrawer.savedMessage')}</p>}
                  <button type="submit" disabled={usernameSaving} className="btn-cinematic-outline w-full px-4 py-2.5 text-sm disabled:opacity-50">
                    {usernameSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : t('profileDrawer.saveUsernameCta')}
                  </button>
                </form>
              )}
            </>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3 border-t border-white/10 pt-5">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('profileDrawer.passwordSectionTitle')}
              </h3>
              <div>
                <label className={labelClass}>{t('profileDrawer.currentPasswordLabel')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  dir="ltr"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('profileDrawer.newPasswordLabel')}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profileDrawer.confirmPasswordLabel')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                  className={inputClass}
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-400" dir="ltr">
                  {passwordError}
                </p>
              )}
              {passwordSaved && <p className="text-xs text-emerald-400">{t('profileDrawer.passwordSavedMessage')}</p>}
              <button type="submit" disabled={passwordSaving} className="btn-cinematic-outline w-full px-4 py-2.5 text-sm disabled:opacity-50">
                {passwordSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : t('profileDrawer.changePasswordCta')}
              </button>
            </form>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-2 border-t border-white/10 pt-5">
              <h3 className="text-sm font-bold text-gold-300">{t('profileDrawer.tabSettings')}</h3>
              {onToggleLocale && (
                <button
                  type="button"
                  onClick={onToggleLocale}
                  className="flex w-full items-center gap-3 rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
                >
                  <Globe className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                  <span className="flex-1 text-start">{t('profileDrawer.settingsLanguageCta')}</span>
                  <span className="text-xs text-white/50">{LOCALE_META.find((meta) => meta.code !== locale)?.nativeName}</span>
                </button>
              )}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex w-full items-center gap-3 rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                  ) : (
                    <Sun className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                  )}
                  <span className="flex-1 text-start">{t('profileDrawer.settingsThemeCta')}</span>
                </button>
              )}
              <Link
                href="/chat"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <Headset className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span className="flex-1 text-start">{t('profileDrawer.settingsSupportCta')}</span>
              </Link>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-3 rounded-xl2 border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-start">{t('profileDrawer.settingsSignOutCta')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
