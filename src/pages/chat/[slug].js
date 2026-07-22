import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Info, Pencil, Send, Volume2, VolumeX } from 'lucide-react';
import { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import AttachmentUploader from '../../components/Chat/AttachmentUploader';
import VoiceRecorder from '../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../components/Chat/MessageAttachment';
import Avatar from '../../components/Chat/Avatar';
import ReactionBar from '../../components/Chat/ReactionBar';
import TypingIndicator from '../../components/Chat/TypingIndicator';
import ChatSettingsSidebar from '../../components/Chat/ChatSettingsSidebar';
import StickerPicker from '../../components/Chat/StickerPicker';
import MessageBubble from '../../components/Chat/MessageBubble';
import MemberProfileCard from '../../components/Chat/MemberProfileCard';
import EditCardModal from '../../components/UI/EditCardModal';
import { ChatBackgroundLayer, useChatBackgroundPreference } from '../../components/Chat/ChatBackground';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { isBundled } from '../../utils/chatBundling';
import { getRank } from '../../utils/chatRanks';

const TYPING_TIMEOUT_MS = 3000;
const TYPING_BROADCAST_INTERVAL_MS = 2000;

// Rank IDs whose bubble background is light-colored: the ReactionBar's SmilePlus
// button must use dark colors to stay visible against those backgrounds.
const LIGHT_BUBBLE_RANKS = new Set(['new', 'active']);

function formatMsgDate(isoString, locale) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ku', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function displayNameFor(profile) {
  if (!profile) return '';
  const parts = [profile.given_name, profile.father_name, profile.grandfather_name, profile.family_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (profile.username) return profile.username;
  if (profile.phone) return `عضو ...${profile.phone.slice(-4)}`;
  return 'عضو';
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
  const [bans, setBans] = useState([]);
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
  const [selectedMember, setSelectedMember] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const ambientAudioRef = useRef(null);
  const listEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
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

      const { data: messageRows } = await supabaseClient
        .from('chat_messages')
        .select(
          'id, sender_id, sender_display_name, sender_avatar_key, sender_role, body, attachment_url, attachment_name, attachment_size, attachment_mime, is_hidden, is_pinned, message_type, created_at'
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

      const { data: banRows } = await supabaseClient
        .from('chat_room_bans')
        .select('room_id, banned_user_id')
        .eq('room_id', roomRow.id);
      if (active) setBans(banRows ?? []);

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
          { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomRow.id}` },
          (payload) => setMessages((current) => current.filter((m) => m.id !== payload.old.id))
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room_bans', filter: `room_id=eq.${roomRow.id}` }, (payload) => {
          setBans((current) => [...current, payload.new]);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_room_bans', filter: `room_id=eq.${roomRow.id}` }, (payload) => {
          setBans((current) => current.filter((b) => b.banned_user_id !== payload.old.banned_user_id));
        })
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
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setShowScrollDown(!atBottom);
  }

  function scrollToBottom() {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollDown(false);
  }

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
      sender_role: profile.role,
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

  async function handleSendSticker(sticker) {
    const { error } = await supabaseClient.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      sender_avatar_key: profile.avatar_key ?? null,
      sender_role: profile.role,
      body: sticker,
      message_type: 'sticker',
    });
    if (error) setSendError(error.message || t('common.errorGeneric'));
  }

  async function handlePickGif(gifOrFile) {
    // If it's a File (upload from picker), upload first then send
    if (gifOrFile instanceof File) {
      const ALLOWED_GIF_TYPES = ['image/gif', 'image/webp', 'image/png', 'image/jpeg'];
      const MAX_GIF_BYTES = 5 * 1024 * 1024;
      if (!ALLOWED_GIF_TYPES.includes(gifOrFile.type)) { setSendError(t('common.imageTypeInvalid')); return; }
      if (gifOrFile.size > MAX_GIF_BYTES) { setSendError(t('common.imageTooLarge')); return; }
      const { safeSlug } = await import('../../utils/safeStorageName');
      const path = `chat/${room.id}/${crypto.randomUUID()}-${safeSlug(gifOrFile.name)}`;
      const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, gifOrFile);
      if (uploadError) { setSendError(uploadError.message); return; }
      const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
      const { error } = await supabaseClient.from('chat_messages').insert({
        room_id: room.id,
        sender_id: profile.id,
        sender_display_name: displayNameFor(profile),
        sender_avatar_key: profile.avatar_key ?? null,
        sender_role: profile.role,
        attachment_url: data.publicUrl,
        attachment_name: gifOrFile.name,
        attachment_size: gifOrFile.size,
        attachment_mime: 'image/gif',
      });
      if (error) setSendError(error.message || t('common.errorGeneric'));
      return;
    }
    // If it's an existing gif message object — resend it
    const gif = gifOrFile;
    const { error } = await supabaseClient.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      sender_avatar_key: profile.avatar_key ?? null,
      sender_role: profile.role,
      attachment_url: gif.attachment_url,
      attachment_name: gif.attachment_name,
      attachment_size: gif.attachment_size,
      attachment_mime: 'image/gif',
    });
    if (error) setSendError(error.message || t('common.errorGeneric'));
  }

  async function handleDeleteMessage(message) {
    setMessages((current) => current.filter((m) => m.id !== message.id));
    const { error } = await supabaseClient.from('chat_messages').update({ is_hidden: true }).eq('id', message.id);
    if (error) {
      setSendError(error.message || t('common.errorGeneric'));
      setMessages((current) =>
        [...current, message].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      );
    }
  }

  async function handleModeratorDelete(message) {
    setMessages((current) => current.filter((m) => m.id !== message.id));
    const { error } = await supabaseClient.from('chat_messages').update({ is_hidden: true }).eq('id', message.id);
    if (error) {
      setSendError(error.message || t('common.errorGeneric'));
      setMessages((current) =>
        [...current, message].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      );
    }
  }

  async function handlePinMessage(message) {
    const next = !message.is_pinned;
    const { error } = await supabaseClient.from('chat_messages').update({ is_pinned: next }).eq('id', message.id);
    if (error) setSendError(error.message || t('common.errorGeneric'));
    // UPDATE realtime event will update local state
  }

  async function handleAssignModerator(memberId) {
    const newModId = room.moderator_id === memberId ? null : memberId;
    const { error } = await supabaseClient.from('chat_rooms').update({ moderator_id: newModId }).eq('id', room.id);
    if (error) setSendError(error.message || t('common.errorGeneric'));
  }

  async function handleBanMember(userId) {
    const isAlreadyBanned = bans.some((b) => b.banned_user_id === userId);
    if (isAlreadyBanned) {
      const { error } = await supabaseClient
        .from('chat_room_bans')
        .delete()
        .eq('room_id', room.id)
        .eq('banned_user_id', userId);
      if (error) setSendError(error.message || t('common.errorGeneric'));
    } else {
      const { error } = await supabaseClient
        .from('chat_room_bans')
        .insert({ room_id: room.id, banned_user_id: userId, banned_by: profile.id });
      if (error) setSendError(error.message || t('common.errorGeneric'));
    }
  }

  async function toggleReaction(message, emoji) {
    const existing = reactions.find((r) => r.message_id === message.id && r.user_id === profile.id && r.emoji === emoji);
    const { error } = existing
      ? await supabaseClient.from('chat_message_reactions').delete().eq('id', existing.id)
      : await supabaseClient.from('chat_message_reactions').insert({ message_id: message.id, user_id: profile.id, emoji });
    if (error) setSendError(error.message || t('common.errorGeneric'));
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

  async function cancelInvite(receiverId) {
    const { error } = await supabaseClient
      .from('chat_room_invitations')
      .delete()
      .eq('sender_id', profile.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending');
    if (!error) loadPendingInvites();
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
    if (ambientAudioRef.current) ambientAudioRef.current.muted = !ambientMuted;
    setAmbientMuted((current) => !current);
  }

  const messageCounts = useMemo(() => {
    const counts = {};
    messages.forEach((m) => {
      if (!m.is_hidden) counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
    });
    return counts;
  }, [messages]);

  const members = useMemo(() => {
    const map = new Map();
    if (profile) {
      map.set(profile.id, { id: profile.id, name: displayNameFor(profile), avatarKey: profile.avatar_key ?? null, role: profile.role });
    }
    messages.forEach((message) => {
      if (!map.has(message.sender_id)) {
        map.set(message.sender_id, {
          id: message.sender_id,
          name: message.sender_display_name,
          avatarKey: message.sender_avatar_key ?? null,
          role: message.sender_role ?? null,
        });
      }
    });
    return Array.from(map.values()).map((member) => ({ ...member, online: onlineUserIds.has(member.id) }));
  }, [messages, profile, onlineUserIds]);

  const sharedFiles = useMemo(
    () => messages.filter((m) => m.attachment_url && !m.is_hidden && m.attachment_mime !== 'image/gif' && !/\.gif$/i.test(m.attachment_url ?? '')),
    [messages]
  );

  const gifs = useMemo(
    () => messages.filter((m) => m.attachment_url && !m.is_hidden && (m.attachment_mime === 'image/gif' || /\.gif$/i.test(m.attachment_url ?? ''))),
    [messages]
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.is_pinned && !m.is_hidden),
    [messages]
  );

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

  const isStaff = profile.role === 'founder' || profile.role === 'employee';
  const canModerate = (message) =>
    profile.role === 'founder' || profile.id === room.moderator_id || profile.id === message.sender_id;
  const canModerateContent = profile.role === 'founder' || profile.id === room.moderator_id;
  const canPin = profile.role === 'founder' || profile.id === room.moderator_id;
  const canManageAudio = profile.role === 'founder' || profile.admin_level === 'co_admin' || profile.id === room.moderator_id;
  const isBannedFromRoom = bans.some((b) => b.banned_user_id === profile.id);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0b141a] text-white">
      <ChatBackgroundLayer variant={chatBg} />
      {chatBg === 'default' && (
        <>
          <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 animate-float rounded-full bg-gold-300/10 blur-xl [will-change:transform]" />
          <div className="pointer-events-none absolute -right-16 bottom-32 h-72 w-72 animate-float rounded-full bg-brand-300/10 blur-xl [will-change:transform] [animation-delay:2s]" />
          <div className="pointer-events-none absolute left-1/3 top-1/2 h-40 w-40 animate-pulse-soft rounded-full bg-white/5 blur-2xl" />
        </>
      )}

      <header className="relative z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-[#202c33]/95 px-3 py-2.5 shadow-lg backdrop-blur sm:px-6">
        <Link
          href="/chat"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <span className="sr-only">{t('chat.backToRooms')}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-1.5 truncate font-display text-base font-bold sm:text-lg">
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
          <p className="truncate text-[11px] text-emerald-300/90">{onlineUserIds.size > 0 ? `${onlineUserIds.size} متصل الآن` : 'المحادثة الجماعية'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('chat.sidebarTitle')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {ambientMuted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-0 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-3 py-3 sm:px-5">
        <div ref={scrollContainerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto rounded-2xl px-1" style={{ backgroundImage: 'radial-gradient(rgba(170, 205, 197, 0.055) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <AnimatePresence initial={false}>
            {messages.filter((m) => !m.is_hidden).flatMap((message, index, visible) => {
              const messageReactions = reactions.filter((r) => r.message_id === message.id);
              const isMine = message.sender_id === profile.id;
              const bundled = isBundled(message, visible[index - 1]);
              const isFirst = !bundled;
              const isLast = !isBundled(visible[index + 1], message);
              const isSticker = message.message_type === 'sticker';

              // Always use the snapshot name stored in the message row so that
              // a later profile-name or avatar change doesn't rewrite old messages.
              const stored = message.sender_display_name;
              const senderName =
                stored && stored !== 'عضو' && stored !== 'مستخدم'
                  ? stored
                  : isMine
                  ? displayNameFor(profile)
                  : 'عضو';

              const rank = !isMine ? getRank(messageCounts[message.sender_id] || 0) : null;
              const canDelete = isMine || canModerate(message);
              const isDarkBubble = isMine || (rank && !LIGHT_BUBBLE_RANKS.has(rank.id));

              // Mine = warm amber, theirs = frosted dark — always readable on the dark background.
              const bubbleCls = isSticker
                ? 'text-7xl leading-none'
                : `max-w-[75%] px-3 py-2 shadow-md ${
                    isMine
                      ? 'bg-[#005c4b] text-white'
                      : 'bg-[#202c33] text-white'
                  }`;

              // Date separator between messages from different days
              const prevMessage = visible[index - 1];
              const showDateSep =
                !prevMessage ||
                new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

              const avatarNode = bundled ? (
                <div className="h-8 w-8 shrink-0" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMember({
                      id: message.sender_id,
                      name: senderName,
                      avatarKey: message.sender_avatar_key ?? null,
                      role: message.sender_role ?? null,
                      rank,
                      online: onlineUserIds.has(message.sender_id),
                    })
                  }
                  className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-300"
                  aria-label={senderName}
                >
                  <Avatar avatarKey={message.sender_avatar_key} name={senderName} seed={message.sender_id} className="h-8 w-8" />
                </button>
              );
              const bubble = (
                <MessageBubble
                  key={message.id}
                  isMine={isMine}
                  isFirst={isFirst}
                  isLast={isLast}
                  bundled={bundled}
                  isSticker={isSticker}
                  avatar={avatarNode}
                  timestamp={message.created_at}
                  canDelete={canDelete}
                  canPin={canPin}
                  isPinned={message.is_pinned}
                  bubbleClassName={bubbleCls}
                  onDelete={() => (isMine ? handleDeleteMessage(message) : handleModeratorDelete(message))}
                  onPin={() => handlePinMessage(message)}
                  locale={locale}
                >
                  {isSticker ? (
                    message.body
                  ) : (
                    <>
                      {!bundled && (
                        <p className={`flex flex-wrap items-center gap-1.5 text-xs font-semibold ${isMine ? 'text-amber-300/80' : rank.nameClass}`}>
                          {senderName}
                          {!isMine && rank.id !== 'new' && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${rank.badgeClass}`}>
                              {rank.emoji} {rank.label[locale] || rank.label.ar}
                            </span>
                          )}
                        </p>
                      )}
                      {message.body && <p className="text-sm">{message.body}</p>}
                      {message.attachment_url && (
                        <MessageAttachment
                          path={message.attachment_url}
                          name={message.attachment_name}
                          size={message.attachment_size}
                          mime={message.attachment_mime}
                          isMine={isMine}
                          locale={locale}
                        />
                      )}
                      <ReactionBar
                        reactions={messageReactions}
                        currentUserId={profile.id}
                        onToggle={(emoji) => toggleReaction(message, emoji)}
                        locale={locale}
                        dark={!isDarkBubble}
                      />
                    </>
                  )}
                </MessageBubble>
              );

              const items = [];
              if (showDateSep) {
                items.push(
                  <div key={`date-${message.id}`} className="my-3 flex items-center gap-3 px-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="shrink-0 rounded-full bg-white/10 px-3 py-0.5 text-[11px] text-white/40">
                      {formatMsgDate(message.created_at, locale)}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                );
              }
              items.push(bubble);
              return items;
            })}
          </AnimatePresence>
          <div ref={listEndRef} />
          {showScrollDown && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="sticky bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-brand-950 shadow-glow transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gold-400 ltr:ml-auto rtl:mr-auto"
              aria-label={t('chat.scrollToBottom')}
            >
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <TypingIndicator names={typingNames} locale={locale} />
        {sendError && (
          <p className="mt-1 text-xs text-red-400" dir="ltr">
            {sendError}
          </p>
        )}

        {isBannedFromRoom ? (
          <p className="mt-3 rounded-xl2 bg-red-500/10 p-3 text-center text-sm text-red-400 border border-red-500/20">
            {t('chat.blockedFromSending')}
          </p>
        ) : (
          <form onSubmit={handleSend} className="mt-3 rounded-2xl border border-white/[0.06] bg-[#202c33] p-2 shadow-xl">
            {/* Top row: input + send */}
            <div className="flex items-center gap-2">
              <input
                value={body}
                onChange={handleBodyChange}
                placeholder={t('chat.messagePlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-[#06cf9c] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#202c33]"
              >
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                <span className="sr-only">{t('chat.sendCta')}</span>
              </button>
            </div>
            {/* Bottom row: attachment tools (always visible) */}
            <div className="mt-1 flex items-center gap-1 border-t border-white/10 pt-1 text-white/70">
              <AttachmentUploader pathPrefix={`chat/${room.id}`} locale={locale} onUploaded={setPendingAttachment} />
              <VoiceRecorder pathPrefix={`chat/${room.id}`} locale={locale} onUploaded={setPendingAttachment} />
              <StickerPicker onPick={handleSendSticker} locale={locale} roomGifs={gifs} onPickGif={handlePickGif} />
            </div>
          </form>
        )}
        {pendingAttachment && <p className="mt-1 text-xs text-white/60">{pendingAttachment.name}</p>}
      </main>

      <ChatSettingsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        locale={locale}
        members={members}
        sharedFiles={sharedFiles}
        pinnedMessages={pinnedMessages}
        gifs={gifs}
        canManageAudio={canManageAudio}
        canModerateContent={canModerateContent}
        roomId={room.id}
        currentTrack={ambientTrack}
        profileId={profile.id}
        currentUserId={profile.id}
        onInviteMember={inviteMember}
        pendingInviteIds={pendingInviteIds}
        onUnpinMessage={handlePinMessage}
        onDeleteGif={handleModeratorDelete}
        isStaff={isStaff}
        onLeaveGroup={() => {
          setSidebarOpen(false);
          router.replace('/chat');
        }}
        chatBg={chatBg}
        onSelectBg={setChatBg}
      />

      <AnimatePresence>
        {selectedMember && (
          <MemberProfileCard
            member={selectedMember}
            currentUserId={profile.id}
            isPending={pendingInviteIds.includes(selectedMember.id)}
            onInviteMember={inviteMember}
            onCancelInvite={cancelInvite}
            onClose={() => setSelectedMember(null)}
            locale={locale}
            isFounder={profile.role === 'founder'}
            isModerator={profile.id === room.moderator_id}
            moderatorId={room.moderator_id}
            onAssignModerator={handleAssignModerator}
            onBanMember={handleBanMember}
            isBanned={bans.some((b) => b.banned_user_id === selectedMember.id)}
          />
        )}
      </AnimatePresence>

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
