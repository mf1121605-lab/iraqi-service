import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, MessageCircleMore, MessagesSquare, Search } from 'lucide-react';
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
  const { profile, loading, signOut } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [rooms, setRooms] = useState(null);
  const [dmThreads, setDmThreads] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!profile) return undefined;

    function loadRooms() {
      supabaseClient
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb, icon_url')
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

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchesQuery = (name) => !normalizedQuery || name?.toLocaleLowerCase().includes(normalizedQuery);

  const filteredRooms = useMemo(
    () => (rooms ?? []).filter((room) => matchesQuery(locale === 'ar' ? room.name_ar : room.name_ckb)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, normalizedQuery, locale]
  );

  const visibleDmThreads = useMemo(
    () => dmThreads.filter((thread) => matchesQuery(displayNameFor(thread.otherUser))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dmThreads, normalizedQuery]
  );

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  function RoomCard({ room, index }) {
    return (
      <MotionLink
        href={`/chat/${room.slug}`}
        style={{ animationDelay: `${index * 60}ms` }}
        {...cardLift}
        className="group relative flex animate-slide-up items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#202c33] p-3.5 text-white shadow-soft transition-all duration-300 hover:bg-[#2a3942] hover:shadow-elevate"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#005c4b] text-emerald-100 ring-1 ring-inset ring-emerald-300/20 transition-transform duration-300 group-hover:scale-105">
          {room.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={room.icon_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{locale === 'ar' ? room.name_ar : room.name_ckb}</span>
          <span className="mt-0.5 block truncate text-xs font-normal text-white/50">مجموعة خدمات العراق</span>
        </span>
      </MotionLink>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id}>
      <section className="mx-auto max-w-4xl rounded-3xl border border-white/[0.08] bg-[#111b21] p-4 text-white shadow-2xl sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white">
            <MessagesSquare className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">{t('chat.roomsTitle')}</h2>
            <p className="text-xs text-white/55">ابدأ محادثة أو تابع آخر الرسائل</p>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2 rounded-xl bg-[#202c33] px-3 py-2.5 text-white/55 focus-within:ring-2 focus-within:ring-emerald-400">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في المحادثات"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
          />
        </label>

        {rooms === null ? (
          <LoadingSpinner inline locale={locale} className="mt-4" />
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {filteredRooms.map((room, index) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
            </div>

            {dmThreads.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white/60">
                  <MessageCircleMore className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
                  {t('chat.dmThreadsTitle')}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleDmThreads.map((thread) => (
                    <MotionLink
                      key={thread.id}
                      href={`/chat/dm/${thread.id}`}
                      {...cardLift}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#202c33] p-3.5 text-white shadow-soft transition-colors duration-300 hover:bg-[#2a3942] hover:shadow-elevate"
                    >
                      <Avatar
                        avatarKey={thread.otherUser?.avatar_key}
                        name={thread.otherUser?.given_name}
                        seed={thread.otherUser?.id}
                        className="h-10 w-10"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{displayNameFor(thread.otherUser)}</span>
                        <span className="block truncate text-xs font-normal text-white/50">محادثة خاصة</span>
                      </span>
                    </MotionLink>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
