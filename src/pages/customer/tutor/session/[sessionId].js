import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Info, Send } from 'lucide-react';
import { useLocale } from '../../../../components/Layout/AppShell';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { supabaseClient } from '../../../../lib/supabaseClient';
import { useRequireRole } from '../../../../utils/useSession';
import { translate } from '../../../../utils/i18n';
import { tutorSubjectLabel } from '../../../../lib/tutorSubjects';

const PAGE_SIZE = 20;

export default function TutorChatSession() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const router = useRouter();
  const { sessionId } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listEndRef = useRef(null);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    if (!profile || !sessionId) return undefined;
    let active = true;

    async function init() {
      const { data: sessionRow } = await supabaseClient
        .from('tutor_chat_sessions')
        .select('id, subject, title')
        .eq('id', sessionId)
        .maybeSingle();
      if (!active) return;
      if (!sessionRow) {
        router.replace('/customer/tutor');
        return;
      }
      setSession(sessionRow);

      const { data: messageRows } = await supabaseClient
        .from('tutor_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (!active) return;
      const chronological = (messageRows ?? []).slice().reverse();
      setMessages(chronological);
      setHasMore((messageRows ?? []).length === PAGE_SIZE);
      setInitialLoading(false);
    }

    init();
    return () => {
      active = false;
    };
  }, [profile, sessionId, router]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    shouldScrollRef.current = true;
  }, [messages.length]);

  async function handleLoadMore() {
    if (messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data: olderRows } = await supabaseClient
      .from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    setLoadingMore(false);
    shouldScrollRef.current = false;
    setMessages((current) => [...(olderRows ?? []).slice().reverse(), ...current]);
    setHasMore((olderRows ?? []).length === PAGE_SIZE);
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setError('');
    setSending(true);
    setBody('');

    const {
      data: { session: authSession },
    } = await supabaseClient.auth.getSession();

    try {
      const response = await fetch('/api/tutor/send-message', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${authSession?.access_token ?? ''}`,
        },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : t('common.errorGeneric'));
        setBody(trimmed);
        return;
      }
      setMessages((current) => [...current, payload.userMessage, payload.assistantMessage]);
    } catch (err) {
      console.error('tutor send message failed', err);
      setError(t('common.errorGeneric'));
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }

  if (loading || !profile || initialLoading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-gold-900/40 text-white">
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 animate-float rounded-full bg-gold-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-32 h-72 w-72 animate-float rounded-full bg-brand-300/10 blur-3xl [animation-delay:2s]" />

      <header className="relative z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-black/10 px-4 py-4 backdrop-blur sm:px-6">
        <Link
          href={`/customer/tutor/${session.subject}`}
          className="flex shrink-0 items-center gap-1.5 text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <span className="hidden sm:inline">{t('aiTutor.backToSubjects')}</span>
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center justify-center gap-1.5 truncate text-center font-display text-lg font-bold">
          <GraduationCap className="h-5 w-5 text-gold-300" aria-hidden="true" />
          {tutorSubjectLabel(session.subject, locale)}
        </h1>
        <div className="w-16 shrink-0 sm:w-24" />
      </header>

      <main className="relative z-0 mx-auto flex w-full max-w-3xl flex-1 flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 disabled:opacity-60"
              >
                {loadingMore ? <LoadingSpinner inline showLabel={false} size={16} /> : t('aiTutor.loadMoreCta')}
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <p className="mt-6 text-center text-sm text-white/50">{t('aiTutor.emptyChat')}</p>
          )}

          {messages.map((message) => {
            const isMine = message.role === 'user';
            return (
              <div key={message.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`max-w-[80%] animate-slide-up whitespace-pre-wrap rounded-xl2 px-4 py-2 text-sm shadow-glass-sm transition-all duration-300 ${
                    isMine ? 'bg-brand-600' : 'bg-white/10'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-white/60">
              <LoadingSpinner inline showLabel={false} size={16} />
              {t('aiTutor.thinking')}
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-400" dir="ltr">
            {error}
          </p>
        )}

        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 rounded-xl2 bg-white/10 p-2 shadow-inner-glass">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('aiTutor.messagePlaceholder')}
            disabled={sending}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-white/50 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="flex items-center gap-1.5 rounded-xl2 bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.03] hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900 disabled:opacity-60"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            <span className="hidden sm:inline">{t('aiTutor.sendCta')}</span>
          </button>
        </form>

        <p className="mt-2 flex items-start gap-1.5 text-center text-[11px] leading-relaxed text-white/40">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {t('aiTutor.disclaimer')}
        </p>
      </main>
    </div>
  );
}
