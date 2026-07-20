import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Check, CheckCheck, ClipboardList, GraduationCap, Inbox, LayoutGrid, Send, Star } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import StatusBadge from '../../../components/UI/StatusBadge';
import Avatar from '../../../components/Chat/Avatar';
import AttachmentUploader from '../../../components/Chat/AttachmentUploader';
import VoiceCallWidget from '../../../components/Chat/VoiceCallWidget';
import VoiceRecorder from '../../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../../components/Chat/MessageAttachment';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { categoryLabel, useCategories } from '../../../utils/useCategories';
import { isBundled } from '../../../utils/chatBundling';

const FINISHED_STATUSES = ['approved', 'rejected'];

function RatingForm({ requestId, employeeId, locale, t, onRated }) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (stars < 1) {
      setError(t('requestRating.errorStarsRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const { error: insertError } = await supabaseClient.from('request_ratings').insert({
      request_id: requestId,
      employee_id: employeeId,
      stars,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    onRated({ stars, comment: comment.trim() || null });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-gold-400/20 bg-gold-400/5 p-5">
      <h3 className="font-display text-sm font-bold">{t('requestRating.title')}</h3>
      <div className="mt-3 flex items-center justify-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStars(value)}
            onMouseEnter={() => setHoverStars(value)}
            onMouseLeave={() => setHoverStars(0)}
            aria-label={`${value} ${t('requestRating.starsLabel')}`}
            className="p-0.5"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                value <= (hoverStars || stars) ? 'fill-gold-400 text-gold-400' : 'text-ink-muted/30 dark:text-ink-dark-muted/30'
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder={t('requestRating.commentPlaceholder')}
        className="mt-3 w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={saving} className="btn-cinematic-gold mt-3 w-full px-4 py-2.5 text-sm disabled:opacity-50">
        {saving ? <LoadingSpinner inline showLabel={false} size={18} /> : t('requestRating.submitCta')}
      </button>
    </form>
  );
}

export default function CustomerRequestDetail() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const router = useRouter();
  const { id } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const categories = useCategories({ activeOnly: false });

  const [request, setRequest] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [messages, setMessages] = useState([]);
  const [rating, setRating] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [sending, setSending] = useState(false);

  async function loadAll() {
    // Lazy SLA check (see expire_stale_claims() migration comment) — runs
    // on every page load a customer does of their own request, no
    // background worker involved.
    supabaseClient.rpc('expire_stale_claims').then(() => {});
    const { data: requestRow } = await supabaseClient
      .from('requests')
      .select('id, title, description, category, status, assigned_employee_id, created_at')
      .eq('id', id)
      .maybeSingle();
    if (!requestRow) return;
    setRequest(requestRow);

    if (requestRow.assigned_employee_id) {
      supabaseClient
        .from('profiles')
        .select('id, given_name, family_name, avatar_key, specialization')
        .eq('id', requestRow.assigned_employee_id)
        .maybeSingle()
        .then(({ data }) => setEmployee(data ?? null));
    }

    supabaseClient
      .from('request_messages')
      .select('id, sender_id, body, attachment_url, created_at, read_at')
      .eq('request_id', id)
      .order('created_at')
      .then(({ data }) => {
        const rows = data ?? [];
        setMessages(rows);
        const unreadFromOther = rows.filter((message) => message.sender_id !== profile.id && !message.read_at);
        if (unreadFromOther.length > 0) {
          supabaseClient
            .from('request_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadFromOther.map((message) => message.id))
            .then(() => {});
        }
      });

    supabaseClient
      .from('request_ratings')
      .select('stars, comment')
      .eq('request_id', id)
      .maybeSingle()
      .then(({ data }) => setRating(data ?? null));
  }

  useEffect(() => {
    if (!profile || !id) return undefined;
    loadAll();

    const channel = supabaseClient
      .channel(`request-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_messages', filter: `request_id=eq.${id}` }, loadAll)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, id]);

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!messageBody.trim() && !pendingAttachment) return;
    setSending(true);
    await supabaseClient.from('request_messages').insert({
      request_id: id,
      sender_id: profile.id,
      body: messageBody.trim() || null,
      attachment_url: pendingAttachment?.path ?? null,
    });
    setSending(false);
    setMessageBody('');
    setPendingAttachment(null);
    loadAll();
  }

  if (loading || !profile || !request) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), active: true, icon: ClipboardList },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
  ];
  const matchedCategory = categories?.find((category) => category.key === request.category);
  const isFinished = FINISHED_STATUSES.includes(request.status);

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/60 p-5 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
          <div>
            <h2 className="font-display text-lg font-bold">{request.title}</h2>
            <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">
              {matchedCategory ? categoryLabel(matchedCategory, locale) : request.category}
            </p>
          </div>
          <StatusBadge status={request.status} locale={locale} />
        </div>

        {employee ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold-400/20 bg-gold-400/5 p-4">
            <Avatar avatarKey={employee.avatar_key} name={employee.given_name} seed={employee.id} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{[employee.given_name, employee.family_name].filter(Boolean).join(' ')}</p>
              <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                {employee.specialization || t('requestMatching.matchedTitle')}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-black/10 p-4 text-sm text-ink-muted dark:border-white/10 dark:text-ink-dark-muted">
            <Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('requestMatching.searchingTitle')}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-4 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
          <h3 className="mb-3 text-sm font-bold">{t('employeeDesk.messagesTitle')}</h3>
          {employee && <VoiceCallWidget locale={locale} />}
          <div className="max-h-96 overflow-y-auto">
            {messages.length === 0 && <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>}
            {messages.map((message, index) => {
              const isMine = message.sender_id === profile.id;
              const bundled = isBundled(message, messages[index - 1]);
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${bundled ? 'mt-0.5' : 'mt-3'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl2 px-3 py-2 text-sm ${
                      isMine ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10'
                    }`}
                  >
                    {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
                    {message.attachment_url && <MessageAttachment path={message.attachment_url} />}
                    {isMine && (
                      <span className="mt-0.5 flex justify-end" aria-label={message.read_at ? t('employeeDesk.readReceiptRead') : t('employeeDesk.readReceiptSent')}>
                        {message.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-gold-200" aria-hidden="true" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
            <AttachmentUploader pathPrefix={`requests/${id}`} onUploaded={setPendingAttachment} locale={locale} />
            <VoiceRecorder pathPrefix={`requests/${id}`} onUploaded={setPendingAttachment} locale={locale} />
            <input
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder={t('employeeDesk.messagePlaceholder')}
              className="flex-1 rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              aria-label={t('employeeDesk.sendCta')}
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </form>
          {pendingAttachment && (
            <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">{pendingAttachment.name}</p>
          )}
        </div>

        {isFinished && employee && (
          rating ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-center">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('requestRating.thanksMessage')}</p>
              <div className="mt-2 flex items-center justify-center gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`h-5 w-5 ${value <= rating.stars ? 'fill-gold-400 text-gold-400' : 'text-ink-muted/30 dark:text-ink-dark-muted/30'}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <RatingForm requestId={id} employeeId={employee.id} locale={locale} t={t} onRated={setRating} />
          )
        )}
      </div>
    </AppShell>
  );
}
