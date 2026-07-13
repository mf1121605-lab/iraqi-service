import { useEffect, useState } from 'react';
import { Megaphone, Plus, Settings2, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import SafeImage from '../../components/UI/SafeImage';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

export default function FounderDashboard() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'dashboard');

  const [settings, setSettings] = useState(null);
  const [banners, setBanners] = useState([]);
  const [newBanner, setNewBanner] = useState({ titleAr: '', titleCkb: '', subtitleAr: '', subtitleCkb: '', url: '' });
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    const { data } = await supabaseClient.from('founder_settings').select('*').single();
    setSettings(data);
  }

  async function loadBanners() {
    const { data } = await supabaseClient.from('service_links').select('*').order('sort_order');
    setBanners(data ?? []);
  }

  useEffect(() => {
    if (!profile) return undefined;
    loadSettings();
    loadBanners();

    // Keeps this screen in sync if edited from another tab/session (e.g. a
    // co_admin), not just this one's own optimistic local updates.
    const channel = supabaseClient
      .channel('founder-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founder_settings' }, loadSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_links' }, loadBanners)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    await supabaseClient
      .from('founder_settings')
      .update({
        chat_audio_track_key: settings.chat_audio_track_key,
        chat_background_key: settings.chat_background_key,
      })
      .eq('id', 1);
    setSaving(false);
  }

  async function addBanner(event) {
    event.preventDefault();
    if (!newBanner.titleAr || !newBanner.titleCkb || !newBanner.url) return;
    await supabaseClient.from('service_links').insert({
      title_ar: newBanner.titleAr,
      title_ckb: newBanner.titleCkb,
      subtitle_ar: newBanner.subtitleAr,
      subtitle_ckb: newBanner.subtitleCkb,
      url: newBanner.url,
      created_by: profile.id,
      sort_order: banners.length,
    });
    setNewBanner({ titleAr: '', titleCkb: '', subtitleAr: '', subtitleCkb: '', url: '' });
    loadBanners();
  }

  async function toggleBannerActive(banner) {
    await supabaseClient.from('service_links').update({ is_active: !banner.is_active }).eq('id', banner.id);
    loadBanners();
  }

  async function deleteBanner(banner) {
    await supabaseClient.from('service_links').delete().eq('id', banner.id);
    loadBanners();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <section className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Settings2 className="h-5 w-5" aria-hidden="true" />
          {t('founderPanel.settingsTitle')}
        </h2>
        {settings && (
          <form onSubmit={saveSettings} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">{t('founderPanel.chatAudioLabel')}</label>
              <input
                value={settings.chat_audio_track_key ?? ''}
                onChange={(event) => setSettings({ ...settings, chat_audio_track_key: event.target.value })}
                className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t('founderPanel.chatBackgroundLabel')}</label>
              <input
                value={settings.chat_background_key ?? ''}
                onChange={(event) => setSettings({ ...settings, chat_background_key: event.target.value })}
                className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 rounded-xl2 bg-brand-600 px-4 py-2 font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate disabled:opacity-50"
            >
              {t('founderPanel.saveSettingsCta')}
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          {t('founderPanel.bannerTitle')}
        </h2>

        <ul className="mt-4 space-y-2">
          {banners.map((banner) => (
            <li
              key={banner.id}
              className="flex items-center justify-between gap-3 rounded-xl2 border border-black/5 p-3 text-sm transition-all duration-200 hover:shadow-soft dark:border-white/10"
            >
              <div className="flex items-center gap-3">
                <SafeImage
                  src={banner.image_path}
                  alt={banner.title_ar ?? ''}
                  className="h-10 w-14 shrink-0 rounded-lg object-cover"
                />
                <div>
                  <p className="font-semibold">{banner.title_ar}</p>
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{banner.title_ckb}</p>
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted" dir="ltr">
                    {banner.url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={banner.is_active}
                    onChange={() => toggleBannerActive(banner)}
                    className="h-4 w-4 rounded border-black/20 text-brand-600 focus:ring-brand-400"
                  />
                  {t('founderPanel.bannerActiveLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => deleteBanner(banner)}
                  className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
                  aria-label={t('common.cancel')}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={addBanner} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={newBanner.titleAr}
            onChange={(event) => setNewBanner({ ...newBanner, titleAr: event.target.value })}
            placeholder={t('founderPanel.bannerTitleArLabel')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={newBanner.titleCkb}
            onChange={(event) => setNewBanner({ ...newBanner, titleCkb: event.target.value })}
            placeholder={t('founderPanel.bannerTitleCkbLabel')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={newBanner.url}
            onChange={(event) => setNewBanner({ ...newBanner, url: event.target.value })}
            placeholder={t('founderPanel.bannerUrlLabel')}
            dir="ltr"
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={newBanner.subtitleAr}
            onChange={(event) => setNewBanner({ ...newBanner, subtitleAr: event.target.value })}
            placeholder={t('founderPanel.bannerSubtitleArLabel')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={newBanner.subtitleCkb}
            onChange={(event) => setNewBanner({ ...newBanner, subtitleCkb: event.target.value })}
            placeholder={t('founderPanel.bannerSubtitleCkbLabel')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('founderPanel.addBannerCta')}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
