import { useEffect, useState } from 'react';
import { Megaphone, Music, Settings } from 'lucide-react';
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

function emptyFields() {
  return FIELD_KEYS.reduce((acc, key) => ({ ...acc, [key]: key === 'announcement_enabled' ? false : '' }), {});
}

export default function FounderSettings() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder']);
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
    supabaseClient.from('founder_settings').select('*').single().then(({ data }) => {
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
        <section className="metal-panel space-y-4 p-6 text-white">
          <h3 className="font-display font-semibold text-gold-300">{t('founderSettings.brandingSectionTitle')}</h3>
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
          <h3 className="flex items-center gap-2 font-display font-semibold text-gold-300">
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
          <h3 className="font-display font-semibold text-gold-300">{t('founderSettings.contentSectionTitle')}</h3>
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
          <h3 className="font-display font-semibold text-gold-300">{t('founderSettings.footerSectionTitle')}</h3>
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
          <h3 className="flex items-center gap-2 font-display font-semibold text-gold-300">
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
