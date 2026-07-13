import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

export default function FounderSettings() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'settings');
  const [settings, setSettings] = useState(null);
  const [audioTrack, setAudioTrack] = useState('');
  const [background, setBackground] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('founder_settings').select('*').single().then(({ data }) => {
      setSettings(data);
      setAudioTrack(data?.chat_audio_track_key ?? '');
      setBackground(data?.chat_background_key ?? '');
    });
  }, [profile]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    await supabaseClient.from('founder_settings').update({
      chat_audio_track_key: audioTrack || null,
      chat_background_key: background || null,
    }).eq('id', settings.id);
    setSaving(false);
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Settings className="h-5 w-5" aria-hidden="true" />
        {t('founderSettings.title')}
      </h2>

      <form onSubmit={handleSave} className="mt-6 max-w-md space-y-4">
        <div>
          <label className="mb-1 block text-sm">{t('founderSettings.chatAudioTrackLabel')}</label>
          <input value={audioTrack} onChange={(e) => setAudioTrack(e.target.value)} className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-surface-dark" />
        </div>
        <div>
          <label className="mb-1 block text-sm">{t('founderSettings.chatBackgroundLabel')}</label>
          <input value={background} onChange={(e) => setBackground(e.target.value)} className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-surface-dark" />
        </div>
        <button type="submit" disabled={saving} className="rounded-xl2 bg-brand-600 px-4 py-3 font-bold text-white shadow-glass-sm hover:bg-brand-700 disabled:opacity-50">
          {t('founderSettings.saveCta')}
        </button>
      </form>
    </AppShell>
  );
}
