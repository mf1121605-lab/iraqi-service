import { useEffect, useState } from 'react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
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
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', url: '' });
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
    if (profile) {
      loadSettings();
      loadBanners();
    }
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
    if (!newBanner.title || !newBanner.url) return;
    await supabaseClient.from('service_links').insert({
      title: newBanner.title,
      subtitle: newBanner.subtitle,
      url: newBanner.url,
      created_by: profile.id,
      sort_order: banners.length,
    });
    setNewBanner({ title: '', subtitle: '', url: '' });
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
      <section className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
        <h2 className="font-display text-lg font-bold">{t('founderPanel.settingsTitle')}</h2>
        {settings && (
          <form onSubmit={saveSettings} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">{t('founderPanel.chatAudioLabel')}</label>
              <input
                value={settings.chat_audio_track_key ?? ''}
                onChange={(event) => setSettings({ ...settings, chat_audio_track_key: event.target.value })}
                className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t('founderPanel.chatBackgroundLabel')}</label>
              <input
                value={settings.chat_background_key ?? ''}
                onChange={(event) => setSettings({ ...settings, chat_background_key: event.target.value })}
                className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 rounded-xl2 bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {t('founderPanel.saveSettingsCta')}
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
        <h2 className="font-display text-lg font-bold">{t('founderPanel.bannerTitle')}</h2>

        <ul className="mt-4 space-y-2">
          {banners.map((banner) => (
            <li
              key={banner.id}
              className="flex items-center justify-between rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10"
            >
              <div>
                <p className="font-semibold">{banner.title}</p>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{banner.url}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={banner.is_active}
                    onChange={() => toggleBannerActive(banner)}
                    className="h-4 w-4"
                  />
                  {t('founderPanel.bannerActiveLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => deleteBanner(banner)}
                  className="text-xs font-semibold text-red-600 dark:text-red-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={addBanner} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={newBanner.title}
            onChange={(event) => setNewBanner({ ...newBanner, title: event.target.value })}
            placeholder={t('founderPanel.bannerTitleLabel')}
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <input
            value={newBanner.url}
            onChange={(event) => setNewBanner({ ...newBanner, url: event.target.value })}
            placeholder={t('founderPanel.bannerUrlLabel')}
            dir="ltr"
            className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark"
          />
          <button
            type="submit"
            className="rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t('founderPanel.addBannerCta')}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
