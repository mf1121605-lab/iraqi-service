import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Info, Pencil, Pin, Send, Volume2, VolumeX } from 'lucide-react';
import { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import AttachmentUploader from '../../components/Chat/AttachmentUploader';
import VoiceRecorder from '../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../components/Chat/MessageAttachment';
import Avatar from '../../components/Chat/Avatar';
import ReactionBar from '../../components/Chat/ReactionBar';
import TypingIndicator from '../../components/Chat/TypingIndicator';
import ChatSettingsSidebar from '../../components/Chat/ChatSettingsSidebar';
import EditCardModal from '../../components/UI/EditCardModal';
import { ChatBackgroundLayer, ChatBackgroundPicker, useChatBackgroundPreference } from '../../components/Chat/ChatBackground';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { isBundled } from '../../utils/chatBundling';

const TYPING_TIMEOUT_MS = 3000;
const TYPING_BROADCAST_INTERVAL_MS = 2000;

function displayNameFor(profile) {
  if (profile.role === 'customer') {
    return profile.given_name || 'مستخدم';
  }
  return [profile.given_name, profile.father_name, profile.grandfather_name, profile.family_name]
    .filter(Boolean)
    .join(' ') || profile.role;
}

export default function ChatRoom() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
  const router = useRouter();
  const { slug } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [chatBg, setChatBg] = useChatBackgroundPreference();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [body, setBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [ambientTrack, setAmbientTrack] = useState(null);
  const [ambientMuted, setAmbientMuted] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const [roomEditOpen, setRoomEditOpen] = useState(false);
  const [roomEditForm, setRoomEditForm] = useState(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomEditError, setRoomEditError] = useState('');
  const [pendingInviteIds, setPendingInviteIds] = useState([]);
  const ambientAudioRef = useRef(null);
  const listEndRef = useRef(null);
  const channelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!profile || !slug) return undefined;

    let channel;
    let active = true;
    let typingPruneInterval;

    async function init() {
      const { data: roomRow } = await supabaseClient
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb, moderator_id')
        .eq('slug', slug)
        .single();
      if (!active || !roomRow) return;
      setRoom(roomRow);

      const { data: roomsRow } = await supabaseClient
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb')
        .eq('is_active', true);
      if (active) setAllRooms(roomsRow ?? []);

      const { data: messageRows } = await supabaseClient
        .from('chat_messages')
        .select(
          'id, sender_id, sender_display_name, sender_avatar_key, body, attachment_url, attachment_name, attachment_size, attachment_mime, is_hidden, created_at'
        )
        .eq('room_id', roomRow.id)
        .order('created_at');
      if (!active) return;
      setMessages(messageRows ?? []);

      const messageIds = (messageRows ?? []).map((m) => m.id);
      if (messageIds.length > 0) {
        const { data: reactionRows } = await supabaseClient
          .from('chat_message_reactions')
          .select('id, message_id, user_id, emoji')
          .in('message_id', messageIds);
        if (active) setReactions(reactionRows ?? []);
      }

      const { data: audioRow } = await supabaseClient
        .from('chat_ambient_audio')
        .select('*')
        .eq('room_id', roomRow.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setAmbientTrack(audioRow ?? null);

      channel = supabaseClient
        .channel(`chat-room-${roomRow.id}`, { config: { broadcast: { self: false }, presence: { key: profile.id } } })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomRow.id}` },
          (payload) => setMessages((current) => [...current, payload.new])
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomRow.id}` },
          (payload) => setMessages((current) => current.map((m) => (m.id === payload.new.id ? payload.new : m)))
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomRow.id}` },
          (payload) => setRoom(payload.new)
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_reactions' }, (payload) => {
          if (messagesRef.current.some((m) => m.id === payload.new.message_id)) {
            setReactions((current) => [...current, payload.new]);
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_message_reactions' }, (payload) => {
          setReactions((r) => r.filter((reaction) => reaction.id !== payload.old.id));
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_ambient_audio', filter: `room_id=eq.${roomRow.id}` },
          (payload) => setAmbientTrack(payload.new)
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          setTypingUsers((current) => ({ ...current, [payload.userId]: { name: payload.name, ts: Date.now() } }));
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const ids = new Set(Object.values(state).flat().map((entry) => entry.user_id));
          setOnlineUserIds(ids);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.track({ user_id: profile.id, name: displayNameFor(profile) });
          }
        });

      channelRef.current = channel;

      typingPruneInterval = setInterval(() => {
        setTypingUsers((current) => {
          const now = Date.now();
          const next = {};
          Object.entries(current).forEach(([userId, entry]) => {
            if (now - entry.ts < TYPING_TIMEOUT_MS) next[userId] = entry;
          });
          return next;
        });
      }, 1000);
    }

    init();
    return () => {
      active = false;
      if (channel) supabaseClient.removeChannel(channel);
      if (typingPruneInterval) clearInterval(typingPruneInterval);
      channelRef.current = null;
    };
  }, [profile, slug]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (profile) loadPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function handleBodyChange(event) {
    setBody(event.target.value);
    const now = Date.now();
    if (channelRef.current && now - lastTypingSentRef.current > TYPING_BROADCAST_INTERVAL_MS) {
      lastTypingSentRef.current = now;
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: profile.id, name: displayNameFor(profile) } });
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    if (!body.trim() && !pendingAttachment) return;
    setSendError('');
    const { error } = await supabaseClient.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      sender_avatar_key: profile.avatar_key ?? null,
      body: body.trim() || null,
      attachment_url: pendingAttachment?.path ?? null,
      attachment_name: pendingAttachment?.name ?? null,
      attachment_size: pendingAttachment?.size ?? null,
      attachment_mime: pendingAttachment?.mime ?? null,
    });
    if (error) {
      setSendError(error.message || t('common.errorGeneric'));
      return;
    }
    setBody('');
    setPendingAttachment(null);
  }

  async function toggleHidden(message) {
    const { error } = await supabaseClient.from('chat_messages').update({ is_hidden: !message.is_hidden }).eq('id', message.id);
    if (error) setSendError(error.message || t('common.errorGeneric'));
  }

  async function toggleReaction(message, emoji) {
    // No optimistic local update here: the INSERT/DELETE postgres_changes
    // listeners above are the single source of truth for `reactions`, same
    // as messages already work in this file — avoids double-adding our own
    // reaction once the realtime echo of our own write arrives.
    const existing = reactions.find((r) => r.message_id === message.id && r.user_id === profile.id && r.emoji === emoji);
    const { error } = existing
      ? await supabaseClient.from('chat_message_reactions').delete().eq('id', existing.id)
      : await supabaseClient.from('chat_message_reactions').insert({ message_id: message.id, user_id: profile.id, emoji });
    if (error) setSendError(error.message || t('common.errorGeneric'));
  }

  async function togglePinnedRoom(roomId) {
    const current = profile.pinned_room_ids ?? [];
    const next = current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId];
    const { error } = await supabaseClient.from('profiles').update({ pinned_room_ids: next }).eq('id', profile.id);
    if (error) {
      setSendError(error.message || t('common.errorGeneric'));
      return;
    }
    refreshProfile();
  }

  function loadPendingInvites() {
    supabaseClient
      .from('chat_room_invitations')
      .select('receiver_id')
      .eq('sender_id', profile.id)
      .eq('status', 'pending')
      .then(({ data }) => setPendingInviteIds((data ?? []).map((row) => row.receiver_id)));
  }

  async function inviteMember(receiverId) {
    const { error } = await supabaseClient.from('chat_room_invitations').insert({ sender_id: profile.id, receiver_id: receiverId });
    if (error) {
      setSendError(error.message || t('common.errorGeneric'));
      return;
    }
    loadPendingInvites();
  }

  function startRoomEdit() {
    setRoomEditForm({ nameAr: room.name_ar, nameCkb: room.name_ckb });
    setRoomEditError('');
    setRoomEditOpen(true);
  }

  async function saveRoomEdit() {
    setRoomEditError('');
    setRoomSaving(true);
    const { error } = await supabaseClient
      .from('chat_rooms')
      .update({ name_ar: roomEditForm.nameAr, name_ckb: roomEditForm.nameCkb })
      .eq('id', room.id);
    setRoomSaving(false);
    if (error) {
      setRoomEditError(error.message || t('common.errorGeneric'));
      return;
    }
    setRoomEditOpen(false);
  }

  function toggleAmbientMute() {
    // Browsers block unmuted audio autoplay without a user gesture, so the
    // track always starts muted (silent autoplay is allowed) and this
    // click — itself a user gesture — is what unlocks sound. There's no
    // way to guarantee identical playback position across clients without
    // a server-driven clock, but for a looping ambient track that's not
    // perceptible; what matters is everyone hearing the same track.
    if (ambientAudioRef.current) ambientAudioRef.current.muted = !ambientMuted;
    setAmbientMuted((current) => !current);
  }

  const members = useMemo(() => {
    const map = new Map();
    if (profile) {
      map.set(profile.id, { id: profile.id, name: displayNameFor(profile), avatarKey: profile.avatar_key ?? null });
    }
    messages.forEach((message) => {
      if (!map.has(message.sender_id)) {
        map.set(message.sender_id, {
          id: message.sender_id,
          name: message.sender_display_name,
          avatarKey: message.sender_avatar_key ?? null,
        });
      }
    });
    return Array.from(map.values()).map((member) => ({ ...member, online: onlineUserIds.has(member.id) }));
  }, [messages, profile, onlineUserIds]);

  const sharedFiles = useMemo(() => messages.filter((m) => m.attachment_url), [messages]);

  const typingNames = useMemo(
    () => Object.entries(typingUsers).filter(([userId]) => userId !== profile?.id).map(([, entry]) => entry.name),
    [typingUsers, profile]
  );

  if (loading || !profile || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const canModerate = (message) =>
    profile.role === 'founder' || profile.id === room.moderator_id || profile.id === message.sender_id;
  const isPinned = (profile.pinned_room_ids ?? []).includes(room.id);
  const canManageAudio = profile.role === 'founder' || profile.admin_level === 'co_admin' || profile.id === room.moderator_id;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-gold-900/40 text-white">
      <ChatBackgroundLayer variant={chatBg} />
      {chatBg === 'default' && (
        <>
          <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 animate-float rounded-full bg-gold-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-32 h-72 w-72 animate-float rounded-full bg-brand-300/10 blur-3xl [animation-delay:2s]" />
          <div className="pointer-events-none absolute left-1/3 top-1/2 h-40 w-40 animate-pulse-soft rounded-full bg-white/5 blur-2xl" />
        </>
      )}

      <header className="relative z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-black/10 px-4 py-4 backdrop-blur sm:px-6">
        <Link
          href="/chat"
          className="flex shrink-0 items-center gap-1.5 text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <span className="hidden sm:inline">{t('chat.backToRooms')}</span>
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center justify-center gap-1.5 truncate text-center font-display text-lg font-bold">
          {locale === 'ar' ? room.name_ar : room.name_ckb}
          {profile.role === 'founder' && (
            <button
              type="button"
              onClick={startRoomEdit}
              aria-label={t('common.edit')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gold-300/70 transition-colors hover:bg-white/10 hover:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => togglePinnedRoom(room.id)}
            aria-label={t('chat.pinRoomCta')}
            aria-pressed={isPinned}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <Pin className={`h-4 w-4 ${isPinned ? 'fill-gold-300 text-gold-300' : ''}`} aria-hidden="true" />
          </button>
          <ChatBackgroundPicker variant={chatBg} onSelect={setChatBg} locale={locale} />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('chat.sidebarTitle')}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
          {ambientTrack && (
            <div>
              <audio ref={ambientAudioRef} src={ambientTrack.audio_url} loop autoPlay muted={ambientMuted} />
              <button
                type="button"
                onClick={toggleAmbientMute}
                aria-label={ambientMuted ? t('chat.ambientAudioUnmute') : t('chat.ambientAudioMute')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                {ambientMuted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-0 mx-auto flex h-[calc(100vh-136px)] max-w-3xl flex-col p-4">
        <div className="flex-1 overflow-y-auto">
          {messages.map((message, index) => {
            const messageReactions = reactions.filter((r) => r.message_id === message.id);
            const isMine = message.sender_id === profile.id;
            const bundled = isBundled(message, messages[index - 1]);
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} ${bundled ? 'mt-0.5' : 'mt-3'}`}
              >
                {bundled ? (
                  <div className="h-8 w-8 shrink-0" aria-hidden="true" />
                ) : (
                  <Avatar avatarKey={message.sender_avatar_key} name={message.sender_display_name} seed={message.sender_id} className="h-8 w-8" />
                )}
                <div
                  className={`max-w-[75%] animate-slide-up rounded-xl2 px-4 py-2 shadow-glass-sm transition-all duration-300 ${
                    isMine ? 'bg-brand-600' : 'bg-white/10'
                  }`}
                >
                  {!bundled && <p className="text-xs font-semibold text-white/70">{message.sender_display_name}</p>}
                  {message.is_hidden ? (
                    <p className="text-sm italic text-white/50">{t('chat.hiddenMessage')}</p>
                  ) : (
                    <>
                      {message.body && <p className="text-sm">{message.body}</p>}
                      {message.attachment_url && (
                        <MessageAttachment
                          path={message.attachment_url}
                          name={message.attachment_name}
                          size={message.attachment_size}
                          mime={message.attachment_mime}
                        />
                      )}
                    </>
                  )}
                  {!message.is_hidden && (
                    <ReactionBar reactions={messageReactions} currentUserId={profile.id} onToggle={(emoji) => toggleReaction(message, emoji)} locale={locale} />
                  )}
                  {canModerate(message) && (
                    <button
                      type="button"
                      onClick={() => toggleHidden(message)}
                      className="mt-1 flex items-center gap-1 rounded text-xs text-white/50 underline transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-gold-300"
                    >
                      {message.is_hidden ? (
                        <Eye className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-3 w-3" aria-hidden="true" />
                      )}
                      {message.is_hidden ? t('common.retry') : t('chat.hideCta')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={listEndRef} />
        </div>

        <TypingIndicator names={typingNames} locale={locale} />
        {sendError && (
          <p className="mt-1 text-xs text-red-400" dir="ltr">
            {sendError}
          </p>
        )}

        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 rounded-xl2 bg-white/10 p-2 shadow-inner-glass">
          <input
            value={body}
            onChange={handleBodyChange}
            placeholder={t('chat.messagePlaceholder')}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-white/50 focus:outline-none"
          />
          <AttachmentUploader pathPrefix={`chat/${room.id}`} locale={locale} onUploaded={setPendingAttachment} />
          <VoiceRecorder pathPrefix={`chat/${room.id}`} locale={locale} onUploaded={setPendingAttachment} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl2 bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.03] hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            <span className="hidden sm:inline">{t('chat.sendCta')}</span>
          </button>
        </form>
        {pendingAttachment && <p className="mt-1 text-xs text-white/60">{pendingAttachment.name}</p>}
      </main>

      <ChatSettingsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        locale={locale}
        members={members}
        sharedFiles={sharedFiles}
        rooms={allRooms}
        pinnedRoomIds={profile.pinned_room_ids ?? []}
        onTogglePin={togglePinnedRoom}
        canManageAudio={canManageAudio}
        roomId={room.id}
        currentTrack={ambientTrack}
        profileId={profile.id}
        currentUserId={profile.id}
        onInviteMember={inviteMember}
        pendingInviteIds={pendingInviteIds}
      />

      <EditCardModal
        open={roomEditOpen}
        onClose={() => {
          setRoomEditOpen(false);
          setRoomEditForm(null);
        }}
        locale={locale}
        titleAr={roomEditForm?.nameAr ?? ''}
        titleCkb={roomEditForm?.nameCkb ?? ''}
        onTitleArChange={(value) => setRoomEditForm({ ...roomEditForm, nameAr: value })}
        onTitleCkbChange={(value) => setRoomEditForm({ ...roomEditForm, nameCkb: value })}
        onSave={saveRoomEdit}
        saving={roomSaving}
        error={roomEditError}
      />
    </div>
  );
}
