import { useEffect, useState } from 'react';
import { ImageIcon, Plus } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = { titleAr: '', titleCkb: '', subtitleAr: '', subtitleCkb: '', url: '', imagePath: '' };

export default function FounderBanners() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'banners');
  const [banners, setBanners] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('service_links').select('*').order('sort_order').then(({ data }) => setBanners(data ?? []));
  }, [profile]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!form.titleAr) return;
    await supabaseClient.from('service_links').insert({
      title_ar: form.titleAr,
      title_ckb: form.titleCkb || null,
      subtitle_ar: form.subtitleAr || null,
      subtitle_ckb: form.subtitleCkb || null,
      url: form.url || null,
      image_path: form.imagePath || null,
      sort_order: (banners?.length ?? 0),
      is_active: true,
      created_by: profile.id,
    });
    setForm(emptyForm);
    supabaseClient.from('service_links').select('*').order('sort_order').then(({ data }) => setBanners(data ?? []));
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
        {t('founderBanners.title')}
      </h2>

      <form onSubmit={handleAdd} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input placeholder={t('founderBanners.titleArLabel')} value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderBanners.titleCkbLabel')} value={form.titleCkb} onChange={(e) => setForm({ ...form, titleCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderBanners.subtitleArLabel')} value={form.subtitleAr} onChange={(e) => setForm({ ...form, subtitleAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderBanners.subtitleCkbLabel')} value={form.subtitleCkb} onChange={(e) => setForm({ ...form, subtitleCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderBanners.urlLabel')} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <input placeholder={t('founderBanners.imageLabel')} value={form.imagePath} onChange={(e) => setForm({ ...form, imagePath: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-dark" />
        <button type="submit" className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderBanners.addCta')}
        </button>
      </form>

      {(banners ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderBanners.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(banners ?? []).map((banner) => (
            <li key={banner.id} className="rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10">
              <p className="font-semibold">{banner.title_ar}</p>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{banner.url}</p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
