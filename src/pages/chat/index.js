import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, MessageCircleMore, MessagesSquare, Pin } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import Avatar from '../../components/Chat/Avatar';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { MotionLink, cardLift } from '../../components/UI/Motion';

function displayNameFor(profile) {
  if (!profile) return '';
  if (profile.role === 'customer') return profile.given_name || 'مستخدم';
  return [profile.given_name, profile.family_name].filter(Boolean).join(' ') || profile.role;
}

export default function ChatRooms() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [rooms, setRooms] = useState(null);
  const [dmThreads, setDmThreads] = useState([]);

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

  useEffect(() => {
    if (!profile) return undefined;

    async function loadDmThreads() {
      const { data: threads } = await supabaseClient
        .from('direct_message_threads')
        .select('id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`);
      const rows = threads ?? [];
      if (rows.length === 0) {
        setDmThreads([]);
        return;
      }
      const otherIds = rows.map((row) => (row.user_a_id === profile.id ? row.user_b_id : row.user_a_id));
      const { data: otherProfiles } = await supabaseClient
        .from('profiles')
        .select('id, given_name, family_name, role, avatar_key')
        .in('id', otherIds);
      const profileById = new Map((otherProfiles ?? []).map((p) => [p.id, p]));
      setDmThreads(
        rows.map((row) => ({
          id: row.id,
          otherUser: profileById.get(row.user_a_id === profile.id ? row.user_b_id : row.user_a_id) ?? null,
        }))
      );
    }

    loadDmThreads();

    const channel = supabaseClient
      .channel('chat-dm-threads-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_message_threads' }, loadDmThreads)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  function RoomCard({ room, index }) {
    const pinned = pinnedRoomIds.includes(room.id);
    return (
      <MotionLink
        href={`/chat/${room.slug}`}
        style={{ animationDelay: `${index * 60}ms` }}
        {...cardLift}
        className="glass-panel-dark group relative flex animate-slide-up items-center gap-3 rounded-2xl p-6 font-semibold text-white shadow-soft transition-colors duration-300 hover:border-gold-400/30 hover:shadow-elevate"
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
      </MotionLink>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id}>
      <h2 className="section-title-cinematic font-display text-xl font-bold">
        <MessagesSquare className="h-5 w-5 text-gold-400" aria-hidden="true" />
        {t('chat.roomsTitle')}
      </h2>
      {rooms === null ? (
        <LoadingSpinner inline locale={locale} className="mt-4" />
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

          {dmThreads.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white/60">
                <MessageCircleMore className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
                {t('chat.dmThreadsTitle')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dmThreads.map((thread) => (
                  <MotionLink
                    key={thread.id}
                    href={`/chat/dm/${thread.id}`}
                    {...cardLift}
                    className="glass-panel-dark flex items-center gap-3 rounded-2xl p-6 font-semibold text-white shadow-soft transition-colors duration-300 hover:border-gold-400/30 hover:shadow-elevate"
                  >
                    <Avatar avatarKey={thread.otherUser?.avatar_key} name={thread.otherUser?.given_name} seed={thread.otherUser?.id} className="h-10 w-10" />
                    <span className="min-w-0 flex-1 truncate">{displayNameFor(thread.otherUser)}</span>
                  </MotionLink>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
