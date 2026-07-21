import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, FileImage, MessageCircle, Newspaper, Radio, Trash2, Zap } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const emptyForm = { titleAr: '', titleCkb: '', contentAr: '', contentCkb: '', imageUrl: '' };

export default function HqUrgentNews() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const founderNavItems = useFounderNav(locale, 'urgent-news');
  const employeeNavItems = [
    { href: '/employee/dashboard', label: t('employeeDesk.queueTitle'), icon: ClipboardCheck },
    { href: '/chat/hq', label: t('hq.chatNavCta'), icon: Radio },
    { href: '/hq/news-links', label: t('hq.newsLinksNavCta'), icon: Newspaper },
    { href: '/hq/urgent-news', label: t('urgentNews.navCta'), active: true, icon: AlertTriangle },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];
  const navItems = profile?.role === 'founder' ? founderNavItems : employeeNavItems;

  const [items, setItems] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  function load() {
    supabaseClient
      .from('urgent_news')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }

  useEffect(() => {
    if (!profile) return undefined;
    load();
    const channel = supabaseClient
      .channel('hq-urgent-news-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urgent_news' }, load)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageError('');
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError(t('common.imageTypeInvalid'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('common.imageTooLarge'));
      return;
    }
    setImageUploading(true);
    const path = `urgent-news/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setImageUploading(false);
      setImageError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    setImageUploading(false);
    setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.titleAr.trim()) {
      setError(t('urgentNews.titleRequired'));
      return;
    }
    setError('');
    setSubmitting(true);
    const { error: insertError } = await supabaseClient.from('urgent_news').insert({
      title_ar: form.titleAr.trim(),
      title_ckb: form.titleCkb.trim() || null,
      content_ar: form.contentAr.trim() || null,
      content_ckb: form.contentCkb.trim() || null,
      image_url: form.imageUrl || null,
      created_by: profile.id,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    setForm(emptyForm);
    setImageError('');
    setToast(true);
  }

  async function toggleActive(item) {
    await supabaseClient.from('urgent_news').update({ is_active: !item.is_active }).eq('id', item.id);
    load();
  }

  async function deleteItem(id) {
    await supabaseClient.from('urgent_news').delete().eq('id', id);
    load();
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
        <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
        {t('urgentNews.addTitle')}
      </h2>

      {toast && (
        <p className="mt-3 animate-slide-down rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-400">
          {t('urgentNews.publishCta')} ✓
        </p>
      )}

      <form onSubmit={handleSubmit} className="metal-panel mt-5 grid gap-3 p-5 text-white sm:grid-cols-2">
        <input
          value={form.titleAr}
          onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
          placeholder={t('urgentNews.titleArLabel')}
          className="input-cinematic text-sm"
          required
        />
        <input
          value={form.titleCkb}
          onChange={(e) => setForm({ ...form, titleCkb: e.target.value })}
          placeholder={t('urgentNews.titleCkbLabel')}
          className="input-cinematic text-sm"
        />
        <textarea
          value={form.contentAr}
          onChange={(e) => setForm({ ...form, contentAr: e.target.value })}
          placeholder={t('urgentNews.contentArLabel')}
          rows={3}
          className="input-cinematic resize-none text-sm"
        />
        <textarea
          value={form.contentCkb}
          onChange={(e) => setForm({ ...form, contentCkb: e.target.value })}
          placeholder={t('urgentNews.contentCkbLabel')}
          rows={3}
          className="input-cinematic resize-none text-sm"
        />

        <div className="flex items-center gap-3 sm:col-span-2">
          {form.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : null}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10">
            <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
            {imageUploading ? t('common.uploading') : t('urgentNews.imageLabel')}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} disabled={imageUploading} />
          </label>
          {imageError && <p className="text-xs text-red-400">{imageError}</p>}
        </div>

        {error && <p className="animate-slide-down text-sm text-red-400 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold disabled:opacity-50 sm:col-span-2"
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          {submitting ? t('common.loading') : t('urgentNews.publishCta')}
        </button>
      </form>

      {items === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('urgentNews.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="metal-panel flex flex-wrap items-start gap-3 p-4 text-white">
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{locale === 'ar' ? item.title_ar : (item.title_ckb || item.title_ar)}</p>
                {(locale === 'ar' ? item.content_ar : item.content_ckb) && (
                  <p className="mt-1 text-sm text-white/60">{locale === 'ar' ? item.content_ar : item.content_ckb}</p>
                )}
                <p className="mt-1 text-xs text-white/30">{new Date(item.created_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ckb')}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    item.is_active
                      ? 'text-amber-400 hover:bg-amber-500/10'
                      : 'text-white/40 hover:bg-white/10'
                  }`}
                >
                  {item.is_active ? t('urgentNews.deactivateCta') : t('urgentNews.publishCta')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  aria-label={t('urgentNews.deleteCta')}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
