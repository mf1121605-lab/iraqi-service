import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight, Send } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Avatar from '../../../components/Chat/Avatar';
import AttachmentUploader from '../../../components/Chat/AttachmentUploader';
import VoiceRecorder from '../../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../../components/Chat/MessageAttachment';
import VoiceCallWidget from '../../../components/Chat/VoiceCallWidget';
import StickerPicker from '../../../components/Chat/StickerPicker';
import MessageBubble from '../../../components/Chat/MessageBubble';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { isBundled } from '../../../utils/chatBundling';

function displayNameFor(profile) {
  if (!profile) return '';
  if (profile.role === 'customer') return profile.given_name || 'مستخدم';
  return [profile.given_name, profile.family_name].filter(Boolean).join(' ') || profile.role;
}

export default function DirectMessageThread() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
  const router = useRouter();
  const { threadId } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const listEndRef = useRef(null);

  useEffect(() => {
    if (!profile || !threadId) return undefined;
    let active = true;
    let channel;

    function loadMessages() {
      supabaseClient
        .from('direct_messages')
        .select('id, sender_id, body, attachment_url, created_at, message_type')
        .eq('thread_id', threadId)
        .order('created_at')
        .then(({ data }) => {
          if (active) setMessages(data ?? []);
        });
    }

    async function init() {
      const { data: thread } = await supabaseClient
        .from('direct_message_threads')
        .select('id, user_a_id, user_b_id')
        .eq('id', threadId)
        .maybeSingle();
      if (!active) return;
      if (!thread) {
        setNotFound(true);
        return;
      }
      const otherId = thread.user_a_id === profile.id ? thread.user_b_id : thread.user_a_id;
      const { data: otherProfile } = await supabaseClient
        .from('profiles')
        .select('id, given_name, family_name, role, avatar_key')
        .eq('id', otherId)
        .maybeSingle();
      if (!active) return;
      setOtherUser(otherProfile ?? null);
      loadMessages();

      channel = supabaseClient
        .channel(`dm-thread-${threadId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `thread_id=eq.${threadId}` }, loadMessages)
        .subscribe();
    }

    init();
    return () => {
      active = false;
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [profile, threadId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(event) {
    event.preventDefault();
    if (!body.trim() && !pendingAttachment) return;
    setSending(true);
    await supabaseClient.from('direct_messages').insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: body.trim() || null,
      attachment_url: pendingAttachment?.path ?? null,
    });
    setSending(false);
    setBody('');
    setPendingAttachment(null);
  }

  async function handleSendSticker(sticker) {
    await supabaseClient.from('direct_messages').insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: sticker,
      message_type: 'sticker',
    });
  }

  async function handleDeleteMessage(messageId) {
    await supabaseClient.from('direct_messages').delete().eq('id', messageId);
  }

  if (loading || !profile || (!otherUser && !notFound)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  if (notFound) {
    return (
      <AppShell onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
        <p className="text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col">
        <div className="flex items-center gap-3 border-b border-black/5 pb-4 dark:border-white/10">
          <Link
            href="/chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 dark:text-ink-dark-muted dark:hover:bg-white/10"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Avatar avatarKey={otherUser.avatar_key} name={otherUser.given_name} seed={otherUser.id} className="h-9 w-9" />
          <p className="truncate font-display text-base font-bold">{displayNameFor(otherUser)}</p>
        </div>

        <div className="pt-3">
          <VoiceCallWidget
            locale={locale}
            recipientName={otherUser.given_name}
            recipientAvatarKey={otherUser.avatar_key}
            recipientSeed={otherUser.id}
          />
        </div>

        <div
          className="mt-3 max-h-[calc(100dvh-22rem)] flex-1 overflow-y-auto rounded-2xl bg-[#0d1117] p-3"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          {messages.length === 0 && <p className="text-center text-sm text-white/50">{t('common.noResults')}</p>}
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isMine = message.sender_id === profile.id;
              const bundled = isBundled(message, messages[index - 1]);
              const isFirst = !bundled;
              const isLast = !isBundled(messages[index + 1], message);
              const isSticker = message.message_type === 'sticker';
              return (
                <MessageBubble
                  key={message.id}
                  isMine={isMine}
                  isFirst={isFirst}
                  isLast={isLast}
                  bundled={bundled}
                  isSticker={isSticker}
                  bubbleClassName={
                    isSticker
                      ? 'text-7xl leading-none'
                      : `max-w-[75%] px-3 py-2 text-sm ${
                          isMine ? 'bg-amber-600 text-white shadow-lg' : 'border border-gray-800 bg-[#161b22] text-gray-200'
                        }`
                  }
                  onDelete={() => handleDeleteMessage(message.id)}
                  locale={locale}
                >
                  {isSticker ? (
                    message.body
                  ) : (
                    <>
                      {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
                      {message.attachment_url && <MessageAttachment path={message.attachment_url} isMine={isMine} />}
                    </>
                  )}
                </MessageBubble>
              );
            })}
          </AnimatePresence>
          <div ref={listEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 pt-3">
          <AttachmentUploader pathPrefix={`dm/${threadId}`} onUploaded={setPendingAttachment} locale={locale} />
          <VoiceRecorder pathPrefix={`dm/${threadId}`} onUploaded={setPendingAttachment} locale={locale} />
          <StickerPicker onPick={handleSendSticker} locale={locale} />
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('chat.messagePlaceholder')}
            className="flex-1 rounded-xl2 border border-white/10 bg-[#161b22] px-3 py-2 text-sm text-white transition-all placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-amber-600 text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            aria-label={t('chat.sendCta')}
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </form>
        {pendingAttachment && <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">{pendingAttachment.name}</p>}
      </div>
    </AppShell>
  );
}
