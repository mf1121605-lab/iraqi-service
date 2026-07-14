import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Pause, Play, Send } from 'lucide-react';
import { useLocale } from '../../components/Layout/AppShell';
import AttachmentUploader from '../../components/Chat/AttachmentUploader';
import MessageAttachment from '../../components/Chat/MessageAttachment';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';

function displayNameFor(profile) {
  if (profile.role === 'customer') {
    return profile.given_name || 'مستخدم';
  }
  return [profile.given_name, profile.father_name, profile.grandfather_name, profile.family_name]
    .filter(Boolean)
    .join(' ') || profile.role;
}

export default function ChatRoom() {
  const { profile, loading, signOut } = useRequireRole(['founder', 'employee', 'customer']);
  const router = useRouter();
  const { slug } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [room, setRoom] = useState(null);
  const [settings, setSettings] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const listEndRef = useRef(null);

  useEffect(() => {
    if (!profile || !slug) return undefined;

    let channel;
    let active = true;

    async function init() {
      const { data: roomRow } = await supabaseClient
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb, moderator_id')
        .eq('slug', slug)
        .single();
      if (!active || !roomRow) return;
      setRoom(roomRow);

      const { data: settingsRow } = await supabaseClient.from('founder_settings').select('*').single();
      if (active) setSettings(settingsRow);

      const { data: messageRows } = await supabaseClient
        .from('chat_messages')
        .select('id, sender_id, sender_display_name, body, attachment_url, is_hidden, created_at')
        .eq('room_id', roomRow.id)
        .order('created_at');
      if (active) setMessages(messageRows ?? []);

      channel = supabaseClient
        .channel(`chat-room-${roomRow.id}`)
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
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) =>
          setSettings(payload.new)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomRow.id}` },
          (payload) => setRoom(payload.new)
        )
        .subscribe();
    }

    init();
    return () => {
      active = false;
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [profile, slug]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(event) {
    event.preventDefault();
    if (!body.trim() && !pendingAttachment) return;
    await supabaseClient.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      body: body.trim() || null,
      attachment_url: pendingAttachment,
    });
    setBody('');
    setPendingAttachment(null);
  }

  async function toggleHidden(message) {
    await supabaseClient.from('chat_messages').update({ is_hidden: !message.is_hidden }).eq('id', message.id);
  }

  function toggleAudio() {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setAudioPlaying(!audioPlaying);
  }

  if (loading || !profile || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  const canModerate = (message) =>
    profile.role === 'founder' || profile.id === room.moderator_id || profile.id === message.sender_id;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-gold-900/40 text-white">
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 animate-float rounded-full bg-gold-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-32 h-72 w-72 animate-float rounded-full bg-brand-300/10 blur-3xl [animation-delay:2s]" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-40 w-40 animate-pulse-soft rounded-full bg-white/5 blur-2xl" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/10 px-6 py-4 backdrop-blur">
        <Link
          href="/chat"
          className="flex items-center gap-1.5 text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('chat.backToRooms')}
        </Link>
        <h1 className="font-display text-lg font-bold">{locale === 'ar' ? room.name_ar : room.name_ckb}</h1>
        {settings?.chat_audio_track_key ? (
          <div>
            <audio ref={audioRef} loop src={`/assets/audio/${settings.chat_audio_track_key}.mp3`} />
            <button
              type="button"
              onClick={toggleAudio}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
            >
              {audioPlaying ? (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{audioPlaying ? t('chat.audioPause') : t('chat.audioPlay')}</span>
            </button>
          </div>
        ) : (
          <span />
        )}
      </header>

      <main className="relative z-10 mx-auto flex h-[calc(100vh-136px)] max-w-3xl flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] animate-slide-up rounded-xl2 px-4 py-2 shadow-glass-sm transition-all duration-300 ${
                message.sender_id === profile.id ? 'ms-auto bg-brand-600' : 'bg-white/10'
              }`}
            >
              <p className="text-xs font-semibold text-white/70">{message.sender_display_name}</p>
              {message.is_hidden ? (
                <p className="text-sm italic text-white/50">{t('chat.hiddenMessage')}</p>
              ) : (
                <>
                  {message.body && <p className="text-sm">{message.body}</p>}
                  {message.attachment_url && <MessageAttachment path={message.attachment_url} />}
                </>
              )}
              {canModerate(message) && (
                <button
                  type="button"
                  onClick={() => toggleHidden(message)}
                  className="mt-1 flex items-center gap-1 text-xs text-white/50 underline transition-colors hover:text-white/80"
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
          ))}
          <div ref={listEndRef} />
        </div>

        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 rounded-xl2 bg-white/10 p-2 shadow-inner-glass">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('chat.messagePlaceholder')}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-white/50 focus:outline-none"
          />
          <AttachmentUploader
            pathPrefix={`chat/${room.id}`}
            locale={locale}
            onUploaded={setPendingAttachment}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl2 bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.03] hover:bg-gold-400"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            <span className="hidden sm:inline">{t('chat.sendCta')}</span>
          </button>
        </form>
        {pendingAttachment && (
          <p className="mt-1 text-xs text-white/60">{pendingAttachment.split('-').slice(1).join('-')}</p>
        )}
      </main>
    </div>
  );
}
