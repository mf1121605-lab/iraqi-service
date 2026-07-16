import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, MessagesSquare, Pin } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';

export default function ChatRooms() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
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

  const pinnedRoomIds = profile?.pinned_room_ids ?? [];
  const { pinnedRooms, otherRooms } = useMemo(() => {
    const all = rooms ?? [];
    return {
      pinnedRooms: all.filter((room) => pinnedRoomIds.includes(room.id)),
      otherRooms: all.filter((room) => !pinnedRoomIds.includes(room.id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, pinnedRoomIds.join(',')]);

  async function togglePin(event, roomId) {
    event.preventDefault();
    event.stopPropagation();
    const next = pinnedRoomIds.includes(roomId) ? pinnedRoomIds.filter((id) => id !== roomId) : [...pinnedRoomIds, roomId];
    await supabaseClient.from('profiles').update({ pinned_room_ids: next }).eq('id', profile.id);
    refreshProfile();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  function RoomCard({ room, index }) {
    const pinned = pinnedRoomIds.includes(room.id);
    return (
      <Link
        href={`/chat/${room.slug}`}
        style={{ animationDelay: `${index * 60}ms` }}
        className="glass-panel-dark group relative flex animate-slide-up items-center gap-3 rounded-2xl p-6 font-semibold text-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-elevate"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300 ring-1 ring-inset ring-gold-400/25 transition-transform duration-300 group-hover:scale-110">
          <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate">{locale === 'ar' ? room.name_ar : room.name_ckb}</span>
        <button
          type="button"
          onClick={(event) => togglePin(event, room.id)}
          aria-label={t('chat.pinRoomCta')}
          aria-pressed={pinned}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          <Pin className={`h-4 w-4 ${pinned ? 'fill-gold-300 text-gold-300' : ''}`} aria-hidden="true" />
        </button>
      </Link>
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
        <>
          {pinnedRooms.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white/60">
                <Pin className="h-3.5 w-3.5 fill-gold-300 text-gold-300" aria-hidden="true" />
                {t('chat.pinnedRoomsTitle')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index} />
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherRooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
