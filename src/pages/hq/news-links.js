import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, MessageCircle, Newspaper, Radio, Send, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = { titleAr: '', titleCkb: '', url: '', source: '' };

export default function HqNewsLinks() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const founderNavItems = useFounderNav(locale, 'news-links');
  const employeeNavItems = [
    { href: '/employee/dashboard', label: t('employeeDesk.queueTitle'), icon: ClipboardCheck },
    { href: '/chat/hq', label: t('hq.chatNavCta'), icon: Radio },
    { href: '/hq/news-links', label: t('hq.newsLinksNavCta'), active: true, icon: Newspaper },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];
  const navItems = profile?.role === 'founder' ? founderNavItems : employeeNavItems;

  const [items, setItems] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return undefined;

    function load() {
      supabaseClient
        .from('news_links')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => setItems(data ?? []));
    }

    load();
    const channel = supabaseClient
      .channel('hq-news-links-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_links' }, load)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.titleAr.trim() || !form.url.trim()) return;
    const { error: insertError } = await supabaseClient.from('news_links').insert({
      title_ar: form.titleAr.trim(),
      title_ckb: form.titleCkb.trim() || null,
      url: form.url.trim(),
      source: form.source.trim() || null,
      created_by: profile.id,
    });
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    setForm(emptyForm);
  }

  async function togglePublish(item) {
    await supabaseClient.from('news_links').update({ is_published: !item.is_published }).eq('id', item.id);
  }

  async function handleDelete(item) {
    await supabaseClient.from('news_links').delete().eq('id', item.id);
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
        <Newspaper className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('hq.newsLinksTitle')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('hq.newsLinksHint')}</p>

      {error && <p className="mt-3 animate-slide-down text-sm text-red-400">{error}</p>}

      <form onSubmit={handleAdd} className="metal-panel mt-6 grid gap-3 p-6 text-white sm:grid-cols-2">
        <input
          value={form.titleAr}
          onChange={(event) => setForm({ ...form, titleAr: event.target.value })}
          placeholder={t('hq.titleArLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.titleCkb}
          onChange={(event) => setForm({ ...form, titleCkb: event.target.value })}
          placeholder={t('hq.titleCkbLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.url}
          onChange={(event) => setForm({ ...form, url: event.target.value })}
          placeholder={t('hq.urlLabel')}
          dir="ltr"
          className="input-cinematic text-sm"
        />
        <input
          value={form.source}
          onChange={(event) => setForm({ ...form, source: event.target.value })}
          placeholder={t('hq.sourceLabel')}
          className="input-cinematic text-sm"
        />
        <button type="submit" className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2 text-sm sm:col-span-2">
          <Send className="h-4 w-4" aria-hidden="true" />
          {t('hq.addCta')}
        </button>
      </form>

      {items === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="metal-panel flex flex-wrap items-center justify-between gap-3 p-4 text-white">
              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 truncate font-semibold text-gold-300 hover:underline"
                >
                  {item.title_ar}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
                {item.source && <p className="text-xs text-white/50">{item.source}</p>}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={item.is_published}
                    onChange={() => togglePublish(item)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
                  />
                  {item.is_published ? t('hq.publishedLabel') : t('hq.publishCta')}
                </label>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label={t('founderCategories.deleteCta')}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
