import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { MotionLink, cardLift } from '../../../components/UI/Motion';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { TUTOR_SUBJECTS, tutorSubjectLabel } from '../../../lib/tutorSubjects';

export default function TutorSubjectSessions() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const router = useRouter();
  const { subject } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [sessions, setSessions] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const isValidSubject = TUTOR_SUBJECTS.some((item) => item.key === subject);

  useEffect(() => {
    if (!profile || !subject || !isValidSubject) return;
    supabaseClient
      .from('tutor_chat_sessions')
      .select('id, title, updated_at')
      .eq('student_id', profile.id)
      .eq('subject', subject)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, subject]);

  async function handleNewSession() {
    setError('');
    setCreating(true);
    const { data, error: insertError } = await supabaseClient
      .from('tutor_chat_sessions')
      .insert({ student_id: profile.id, subject })
      .select('id')
      .single();
    setCreating(false);
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    router.push(`/customer/tutor/session/${data.id}`);
  }

  if (loading || !profile || !subject) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  if (!isValidSubject) {
    router.replace('/customer/tutor');
    return null;
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id} appFrame>
      <Link
        href="/customer/tutor"
        className="flex items-center gap-1.5 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink-light dark:text-ink-dark-muted dark:hover:text-ink-dark"
      >
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        {t('aiTutor.backToSubjects')}
      </Link>

      <h2 className="mt-3 flex items-center gap-2 font-display text-xl font-bold">
        <MessagesSquare className="h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        {tutorSubjectLabel(subject, locale)}
      </h2>

      <button
        type="button"
        onClick={handleNewSession}
        disabled={creating}
        className="mt-5 flex items-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate disabled:opacity-60"
      >
        {creating ? <LoadingSpinner inline showLabel={false} size={18} /> : <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
        {t('aiTutor.newSessionCta')}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-500" dir="ltr">
          {error}
        </p>
      )}

      {sessions === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : sessions.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">{t('aiTutor.sessionsEmpty')}</p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {sessions.map((session, index) => (
            <MotionLink
              key={session.id}
              href={`/customer/tutor/session/${session.id}`}
              style={{ animationDelay: `${index * 60}ms` }}
              {...cardLift}
              className="animate-slide-up rounded-xl2 border border-black/5 bg-white/60 p-4 text-sm shadow-soft transition-all duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60"
            >
              <p className="truncate font-semibold">{session.title || t('aiTutor.sessionUntitled')}</p>
              <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">
                {new Date(session.updated_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
              </p>
            </MotionLink>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
