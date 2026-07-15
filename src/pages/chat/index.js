import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, MessagesSquare } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';

export default function ChatRooms() {
  const { profile, loading, signOut } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [rooms, setRooms] = useState(null);

  useEffect(() => {
    if (!profile) return undefined;

    function loadRooms() {
      supabaseClient
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb')
        .eq('is_active', true)
        .then(({ data }) => setRooms(data ?? []));
    }

    loadRooms();

    const channel = supabaseClient
      .channel('chat-rooms-list-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, loadRooms)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id}>
      <h2 className="section-title-cinematic font-display text-xl font-bold">
        <MessagesSquare className="h-5 w-5 text-gold-400" aria-hidden="true" />
        {t('chat.roomsTitle')}
      </h2>
      {rooms === null ? (
        <p className="mt-4 text-sm">{t('common.loading')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <Link
              key={room.id}
              href={`/chat/${room.slug}`}
              style={{ animationDelay: `${index * 60}ms` }}
              className="glass-panel-dark group flex animate-slide-up items-center gap-3 rounded-2xl p-6 font-semibold text-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-elevate"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300 ring-1 ring-inset ring-gold-400/25 transition-transform duration-300 group-hover:scale-110">
                <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              {locale === 'ar' ? room.name_ar : room.name_ckb}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
