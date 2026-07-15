import { useEffect, useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = { slug: '', nameAr: '', nameCkb: '' };

export default function FounderChatRooms() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'chat-rooms');
  const [rooms, setRooms] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!profile) return;
    supabaseClient.from('chat_rooms').select('*').order('created_at', { ascending: false }).then(({ data }) => setRooms(data ?? []));
  }, [profile]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!form.slug || !form.nameAr) return;
    await supabaseClient.from('chat_rooms').insert({
      slug: form.slug.trim(),
      name_ar: form.nameAr,
      name_ckb: form.nameCkb || null,
      is_active: true,
    });
    setForm(emptyForm);
    supabaseClient.from('chat_rooms').select('*').order('created_at', { ascending: false }).then(({ data }) => setRooms(data ?? []));
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {t('founderChatRooms.title')}
      </h2>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-3">
          <input aria-label={t('founderChatRooms.nameLabel')} placeholder={t('founderChatRooms.nameLabel')} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderChatRooms.nameArLabel')} placeholder={t('founderChatRooms.nameArLabel')} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <input aria-label={t('founderChatRooms.nameCkbLabel')} placeholder={t('founderChatRooms.nameCkbLabel')} value={form.nameCkb} onChange={(e) => setForm({ ...form, nameCkb: e.target.value })} className="rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark" />
          <button type="submit" className="flex items-center justify-center gap-1.5 sm:col-span-3 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('founderChatRooms.addCta')}
          </button>
        </form>
      </section>

      {(rooms ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderChatRooms.empty')}</p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {(rooms ?? []).map((room) => (
            <li
              key={room.id}
              className="rounded-xl2 border border-black/5 p-3 text-sm transition-all duration-200 hover:shadow-soft dark:border-white/10"
            >
              <p className="font-semibold">{room.name_ar}</p>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted" dir="ltr">
                /{room.slug}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
