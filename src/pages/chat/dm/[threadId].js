import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, Send } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Avatar from '../../../components/Chat/Avatar';
import AttachmentUploader from '../../../components/Chat/AttachmentUploader';
import VoiceRecorder from '../../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../../components/Chat/MessageAttachment';
import VoiceCallWidget from '../../../components/Chat/VoiceCallWidget';
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
        .select('id, sender_id, body, attachment_url, created_at')
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `thread_id=eq.${threadId}` }, loadMessages)
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
          <VoiceCallWidget locale={locale} />
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {messages.length === 0 && <p className="text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>}
          {messages.map((message, index) => {
            const isMine = message.sender_id === profile.id;
            const bundled = isBundled(message, messages[index - 1]);
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${bundled ? 'mt-0.5' : 'mt-3'}`}>
                <div
                  className={`max-w-[75%] rounded-xl2 px-3 py-2 text-sm shadow-glass-sm ${
                    isMine ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10'
                  }`}
                >
                  {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
                  {message.attachment_url && <MessageAttachment path={message.attachment_url} />}
                </div>
              </div>
            );
          })}
          <div ref={listEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
          <AttachmentUploader pathPrefix={`dm/${threadId}`} onUploaded={setPendingAttachment} locale={locale} />
          <VoiceRecorder pathPrefix={`dm/${threadId}`} onUploaded={setPendingAttachment} locale={locale} />
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('chat.messagePlaceholder')}
            className="flex-1 rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
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
