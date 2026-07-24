import { useEffect, useState } from 'react';
import { Eye, EyeOff, Megaphone, Music, Palette, Send, Settings, ShieldOff } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageUploader from '../../components/UI/ImageUploader';
import AudioUploader from '../../components/UI/AudioUploader';
import CanvaDesignLink from '../../components/UI/CanvaDesignLink';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const FIELD_KEYS = [
  'background_image_path',
  'background_color',
  'accent_color',
  'bg_color',
  'hero_title_ar',
  'hero_title_ckb',
  'hero_subtitle_ar',
  'hero_subtitle_ckb',
  'footer_phone',
  'footer_email',
  'footer_legal_ar',
  'footer_legal_ckb',
  'footer_instagram_url',
  'footer_twitter_url',
  'announcement_enabled',
  'announcement_text_ar',
  'announcement_text_ckb',
  'site_ambient_audio_url',
];

const ACCENT_PRESETS = [
  { hex: '#f59e0b', label: 'ذهبي' },
  { hex: '#3b82f6', label: 'أزرق' },
  { hex: '#8b5cf6', label: 'بنفسجي' },
  { hex: '#ec4899', label: 'وردي' },
  { hex: '#10b981', label: 'أخضر' },
  { hex: '#ef4444', label: 'أحمر' },
  { hex: '#06b6d4', label: 'سماوي' },
  { hex: '#f97316', label: 'برتقالي' },
];

const BG_PRESETS = [
  { hex: '#0d1117', label: 'رمادي غامق' },
  { hex: '#000000', label: 'أسود' },
  { hex: '#111827', label: 'رمادي داكن' },
  { hex: '#0a192f', label: 'أزرق داكن' },
  { hex: '#1a0a2e', label: 'بنفسجي داكن' },
  { hex: '#1a0f00', label: 'بني داكن' },
];

function emptyFields() {
  return FIELD_KEYS.reduce((acc, key) => ({ ...acc, [key]: key === 'announcement_enabled' ? false : '' }), {});
}

function BroadcastSection({ t }) {
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [bSuccess, setBSuccess] = useState('');
  const [bError, setBError] = useState('');

  async function handleBroadcast(e) {
    e.preventDefault();
    setBLoading(true);
    setBSuccess('');
    setBError('');
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch('/api/founder/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title: bTitle, body: bBody }),
      });
      const data = await res.json();
      if (!res.ok) { setBError(data.error || 'خطأ'); } else {
        setBSuccess(`${t('broadcast.successMessage')} (${data.count})`);
        setBTitle('');
        setBBody('');
      }
    } catch { setBError('خطأ في الاتصال'); }
    setBLoading(false);
  }

  return (
    <section className="metal-panel space-y-4 border border-amber-500/20 p-6 text-white">
      <h3 className="flex items-center gap-2 font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">
        <Send className="h-4 w-4" aria-hidden="true" />
        {t('broadcast.sectionTitle')}
      </h3>
      <p className="text-sm text-white/60">{t('broadcast.sectionDesc')}</p>
      <form onSubmit={handleBroadcast} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">{t('broadcast.titleLabel')}</label>
          <input
            type="text"
            value={bTitle}
            onChange={e => setBTitle(e.target.value)}
            required
            className="input-cinematic w-full text-sm"
            placeholder={t('broadcast.titlePlaceholder')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">{t('broadcast.bodyLabel')}</label>
          <textarea
            value={bBody}
            onChange={e => setBBody(e.target.value)}
            rows={3}
            className="input-cinematic w-full resize-none text-sm"
            placeholder={t('broadcast.bodyPlaceholder')}
          />
        </div>
        {bError && <p className="text-xs text-red-400">{bError}</p>}
        {bSuccess && <p className="text-xs text-emerald-400">{bSuccess}</p>}
        <button
          type="submit"
          disabled={bLoading || !bTitle.trim()}
          className="btn-cinematic-gold px-5 py-2 text-sm disabled:opacity-50"
        >
          {bLoading ? '...' : t('broadcast.sendCta')}
        </button>
      </form>
    </section>
  );
}

function NuclearButton({ locale, t }) {
  const [lockdownActive, setLockdownActive] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    supabaseClient.from('site_lockdown').select('active').eq('id', 1).single().then(({ data }) => {
      setLockdownActive(data?.active ?? false);
    });
  }, []);

  async function callNuclear(action) {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch('/api/founder/nuclear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action, passcode }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'خطأ'); setLoading(false); return; }
      setSuccessMsg(action === 'activate' ? t('nuclear.successActivated') : t('nuclear.successDeactivated'));
      setLockdownActive(action === 'activate');
      setShowConfirm(false);
      setPasscode('');
    } catch { setError('خطأ في الاتصال'); }
    setLoading(false);
  }

  if (lockdownActive === null) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${lockdownActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-white/60">{lockdownActive ? t('nuclear.lockdownActive') : t('nuclear.lockdownInactive')}</span>
      </div>

      {lockdownActive ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          {t('nuclear.deactivateCta')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          {t('nuclear.activateCta')}
        </button>
      )}

      {showConfirm && (
        <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4">
          <p className="text-sm font-bold text-red-400">{lockdownActive ? t('nuclear.deactivateCta') : t('nuclear.confirmTitle')}</p>
          {!lockdownActive && <p className="text-xs text-white/60">{t('nuclear.confirmWarning')}</p>}
          <div className="relative">
            <input
              type={revealed ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={t('nuclear.passcodePlaceholder')}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-red-400"
              dir="ltr"
            />
            <button type="button" onClick={() => setRevealed((v) => !v)} className="absolute end-2 top-2 text-white/40 hover:text-white/70">
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {successMsg && <p className="text-xs text-emerald-400">{successMsg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || !passcode}
              onClick={() => callNuclear(lockdownActive ? 'deactivate' : 'activate')}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              {loading ? '...' : lockdownActive ? t('nuclear.deactivateCta') : t('nuclear.activateAndWipeCta')}
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setPasscode(''); setError(''); }}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs text-white/60 hover:text-white transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FounderSettings() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'settings');
  const [settingsId, setSettingsId] = useState(null);
  const [fields, setFields] = useState(emptyFields);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('founder_settings').select('*').maybeSingle().then(({ data }) => {
      if (!data) return;
      setSettingsId(data.id);
      setFields((current) => {
        const next = { ...current };
        FIELD_KEYS.forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) next[key] = data[key];
        });
        return next;
      });
    });
  }, [profile]);

  function setField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError('');
  }

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!settingsId) {
      setError(t('common.errorGeneric'));
      return;
    }
    if (fields.background_color && !/^#[0-9a-fA-F]{6}$/.test(fields.background_color)) {
      setError(t('founderSettings.backgroundColorInvalid'));
      return;
    }
    if (fields.accent_color && !/^#[0-9a-fA-F]{6}$/.test(fields.accent_color)) {
      setError(t('founderSettings.backgroundColorInvalid'));
      return;
    }
    if (fields.bg_color && !/^#[0-9a-fA-F]{6}$/.test(fields.bg_color)) {
      setError(t('founderSettings.backgroundColorInvalid'));
      return;
    }
    setSaving(true);
    const payload = FIELD_KEYS.reduce((acc, key) => {
      const value = fields[key];
      acc[key] = key === 'announcement_enabled' ? value : value || null;
      return acc;
    }, {});
    // .select().single() forces a row back — an RLS policy silently
    // matching zero rows (wrong role, stale id) or a schema-cache-stale
    // "column does not exist" both surface here as a real error, instead
    // of a plain .update() that reports success even when nothing wrote.
    const { error: updateError } = await supabaseClient.from('founder_settings').update(payload).eq('id', settingsId).select().single();
    setSaving(false);
    if (updateError) {
      setError(updateError.message || t('common.errorGeneric'));
      return;
    }
    setSaved(true);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <h2 className="section-title-cinematic font-display text-xl font-bold">
        <Settings className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderSettings.title')}
      </h2>

      <form onSubmit={handleSave} className="mt-6 max-w-2xl space-y-6">
        {/* ─── Theme Colors ─── */}
        <section className="metal-panel space-y-6 p-6 text-white">
          <h3 className="flex items-center gap-2 font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">
            <Palette className="h-4 w-4" aria-hidden="true" />
            {t('founderSettings.themeColorSectionTitle')}
          </h3>

          {/* Accent (border/frame) color */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/70">{t('founderSettings.accentColorLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  onClick={() => setField('accent_color', hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-9 w-9 rounded-xl border-2 transition-all duration-150 ${
                    fields.accent_color === hex
                      ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                      : 'border-white/20 hover:border-white/60 hover:scale-105'
                  }`}
                  aria-label={label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(fields.accent_color) ? fields.accent_color : '#f59e0b'}
                onChange={(e) => setField('accent_color', e.target.value)}
                aria-label={t('founderSettings.accentColorLabel')}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
              />
              <input
                value={fields.accent_color}
                onChange={(e) => setField('accent_color', e.target.value)}
                placeholder="#f59e0b"
                dir="ltr"
                className="input-cinematic flex-1 text-sm"
              />
              {fields.accent_color && (
                <button type="button" onClick={() => setField('accent_color', '')} className="shrink-0 text-xs text-white/50 underline">
                  {t('common.remove')}
                </button>
              )}
            </div>
            {/* Live preview strip */}
            <div
              className="mt-1 h-1.5 w-full rounded-full transition-colors duration-300"
              style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(fields.accent_color) ? fields.accent_color : '#f59e0b' }}
            />
          </div>

          {/* Background color */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/70">{t('founderSettings.bgColorLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  onClick={() => setField('bg_color', hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-9 w-9 rounded-xl border-2 transition-all duration-150 ${
                    fields.bg_color === hex
                      ? 'border-[color:var(--color-accent,#f59e0b)] scale-110 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'border-white/20 hover:border-white/60 hover:scale-105'
                  }`}
                  aria-label={label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(fields.bg_color) ? fields.bg_color : '#0d1117'}
                onChange={(e) => setField('bg_color', e.target.value)}
                aria-label={t('founderSettings.bgColorLabel')}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
              />
              <input
                value={fields.bg_color}
                onChange={(e) => setField('bg_color', e.target.value)}
                placeholder="#0d1117"
                dir="ltr"
                className="input-cinematic flex-1 text-sm"
              />
              {fields.bg_color && (
                <button type="button" onClick={() => setField('bg_color', '')} className="shrink-0 text-xs text-white/50 underline">
                  {t('common.remove')}
                </button>
              )}
            </div>
            <div
              className="mt-1 h-1.5 w-full rounded-full border border-white/10 transition-colors duration-300"
              style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(fields.bg_color) ? fields.bg_color : '#0d1117' }}
            />
          </div>
          <p className="text-xs text-white/40">{t('founderSettings.themeColorHint')}</p>
        </section>

        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">{t('founderSettings.brandingSectionTitle')}</h3>
          <div>
            <label className="mb-1 block text-sm text-white/70">{t('founderSettings.backgroundImageLabel')}</label>
            <div className="flex flex-wrap items-center gap-2">
              <ImageUploader
                pathPrefix="backgrounds"
                value={fields.background_image_path}
                onUploaded={(url) => setField('background_image_path', url)}
                onClear={() => setField('background_image_path', '')}
                locale={locale}
              />
              <CanvaDesignLink locale={locale} />
            </div>
            <p className="mt-1 text-xs text-white/40">{t('common.designWithCanvaHint')}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">{t('founderSettings.backgroundColorLabel')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(fields.background_color) ? fields.background_color : '#030303'}
                onChange={(e) => setField('background_color', e.target.value)}
                aria-label={t('founderSettings.backgroundColorLabel')}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
              />
              <input
                value={fields.background_color}
                onChange={(e) => setField('background_color', e.target.value)}
                placeholder={t('founderSettings.backgroundColorPlaceholder')}
                dir="ltr"
                className="input-cinematic flex-1 text-sm"
              />
              {fields.background_color && (
                <button type="button" onClick={() => setField('background_color', '')} className="shrink-0 text-xs text-white/50 underline">
                  {t('common.remove')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="flex items-center gap-2 font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">
            <Music className="h-4 w-4" aria-hidden="true" />
            {t('founderSettings.audioSectionTitle')}
          </h3>
          <div>
            <label className="mb-1 block text-sm text-white/70">{t('founderSettings.audioLabel')}</label>
            <AudioUploader
              pathPrefix="site-audio"
              value={fields.site_ambient_audio_url}
              onUploaded={(url) => setField('site_ambient_audio_url', url)}
              onClear={() => setField('site_ambient_audio_url', '')}
              locale={locale}
            />
            <p className="mt-1 text-xs text-white/40">{t('founderSettings.audioHint')}</p>
          </div>
        </section>

        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">{t('founderSettings.contentSectionTitle')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.heroTitleArLabel')}</label>
              <input value={fields.hero_title_ar} onChange={(e) => setField('hero_title_ar', e.target.value)} className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.heroTitleCkbLabel')}</label>
              <input value={fields.hero_title_ckb} onChange={(e) => setField('hero_title_ckb', e.target.value)} className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.heroSubtitleArLabel')}</label>
              <input value={fields.hero_subtitle_ar} onChange={(e) => setField('hero_subtitle_ar', e.target.value)} className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.heroSubtitleCkbLabel')}</label>
              <input value={fields.hero_subtitle_ckb} onChange={(e) => setField('hero_subtitle_ckb', e.target.value)} className="input-cinematic text-sm" />
            </div>
          </div>
        </section>

        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">{t('founderSettings.footerSectionTitle')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerPhoneLabel')}</label>
              <input value={fields.footer_phone} onChange={(e) => setField('footer_phone', e.target.value)} dir="ltr" className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerEmailLabel')}</label>
              <input value={fields.footer_email} onChange={(e) => setField('footer_email', e.target.value)} dir="ltr" className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerInstagramLabel')}</label>
              <input value={fields.footer_instagram_url} onChange={(e) => setField('footer_instagram_url', e.target.value)} dir="ltr" className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerTwitterLabel')}</label>
              <input value={fields.footer_twitter_url} onChange={(e) => setField('footer_twitter_url', e.target.value)} dir="ltr" className="input-cinematic text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerLegalArLabel')}</label>
            <textarea
              value={fields.footer_legal_ar}
              onChange={(e) => setField('footer_legal_ar', e.target.value)}
              rows={3}
              className="input-cinematic text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">{t('founderSettings.footerLegalCkbLabel')}</label>
            <textarea
              value={fields.footer_legal_ckb}
              onChange={(e) => setField('footer_legal_ckb', e.target.value)}
              rows={3}
              className="input-cinematic text-sm"
            />
          </div>
        </section>

        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="flex items-center gap-2 font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            {t('founderSettings.announcementSectionTitle')}
          </h3>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={fields.announcement_enabled}
              onChange={(e) => setField('announcement_enabled', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
            />
            {t('founderSettings.announcementEnabledLabel')}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.announcementTextArLabel')}</label>
              <input
                value={fields.announcement_text_ar}
                onChange={(e) => setField('announcement_text_ar', e.target.value)}
                className="input-cinematic text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">{t('founderSettings.announcementTextCkbLabel')}</label>
              <input
                value={fields.announcement_text_ckb}
                onChange={(e) => setField('announcement_text_ckb', e.target.value)}
                className="input-cinematic text-sm"
              />
            </div>
          </div>
        </section>

        <BroadcastSection t={t} />

        {profile.role === 'founder' && (
          <section className="metal-panel space-y-4 border border-red-500/30 p-6 text-white">
            <h3 className="flex items-center gap-2 font-display font-semibold text-red-400">
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              {t('nuclear.dangerZoneTitle')}
            </h3>
            <p className="text-sm text-white/60">{t('nuclear.dangerZoneDesc')}</p>
            <NuclearButton locale={locale} t={t} />
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="btn-cinematic-gold px-6 py-3 text-sm disabled:opacity-50">
            {t('founderSettings.saveCta')}
          </button>
          {saved && <p className="text-sm text-emerald-400">{t('founderSettings.savedMessage')}</p>}
          {error && <p className="text-sm text-red-400" dir="ltr">{error}</p>}
        </div>
      </form>
    </AppShell>
  );
}
