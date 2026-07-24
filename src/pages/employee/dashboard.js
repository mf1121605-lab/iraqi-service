import { useEffect, useRef, useState } from 'react';
import { audioFX } from '../../utils/audioFX';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Check,
  CheckCheck,
  ClipboardCheck,
  History,
  Inbox,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Radio,
  Send,
  UserRoundCog,
  Zap,
} from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/UI/StatusBadge';
import AttachmentUploader from '../../components/Chat/AttachmentUploader';
import VoiceCallWidget from '../../components/Chat/VoiceCallWidget';
import StickerPicker from '../../components/Chat/StickerPicker';
import VoiceRecorder from '../../components/Chat/VoiceRecorder';
import MessageAttachment from '../../components/Chat/MessageAttachment';
import MessageBubble from '../../components/Chat/MessageBubble';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';
import { isBundled } from '../../utils/chatBundling';

const STATUS_OPTIONS = ['in_review', 'needs_changes', 'approved', 'rejected'];

export default function EmployeeDashboard() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['employee']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [specialization, setSpecialization] = useState('');
  const [activeServices, setActiveServices] = useState([]);
  const categories = useCategories();
  const [savingProfile, setSavingProfile] = useState(false);

  const [queueTab, setQueueTab] = useState('requests');
  const [queue, setQueue] = useState(null);
  const [quickRequests, setQuickRequests] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState('in_review');
  const [claimedNotice, setClaimedNotice] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('zaincash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const queueRef = useRef(null);
  const initialLoadRef = useRef(true);
  const msgListRef = useRef(null);
  const msgEndRef = useRef(null);
  const isMsgAtBottomRef = useRef(true);
  const [showMsgScrollDown, setShowMsgScrollDown] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    setSpecialization(profile.specialization ?? '');
    setActiveServices(profile.active_services ?? []);
  }, [profile]);

  // Diffs against the previous snapshot (not just "reload and render") so
  // a ticket another employee just claimed can flash "المهمة مأخوذة"
  // before it disappears from this employee's queue — RLS already stops
  // returning it once it's no longer unclaimed/theirs, which would
  // otherwise look like it silently vanished with no explanation. The
  // audio ping for genuinely new tickets now lives in the shared
  // RequestAlertBell (mounted in AppShell) instead of here, so it fires
  // consistently on every page, not just this one.
  async function loadQueue() {
    // Lazy SLA check: no background worker exists on this hosting, so a
    // stale claim (3+ minutes, no first message sent) only ever gets
    // freed up at the moment someone actually loads the queue.
    supabaseClient.rpc('expire_stale_claims').then(() => {});
    const { data } = await supabaseClient
      .from('requests')
      .select('id, title, category, status, assigned_employee_id, customer_id, created_at')
      .order('created_at', { ascending: false });
    const nextQueue = data ?? [];
    const previousQueue = queueRef.current;

    if (previousQueue && !initialLoadRef.current) {
      const nextIds = new Set(nextQueue.map((request) => request.id));
      const justClaimed = previousQueue.find(
        (old) => !old.assigned_employee_id && (!nextIds.has(old.id) || nextQueue.find((r) => r.id === old.id)?.assigned_employee_id)
      );
      if (justClaimed) {
        setClaimedNotice(justClaimed.title);
        setTimeout(() => setClaimedNotice(''), 3000);
      }
    }

    queueRef.current = nextQueue;
    initialLoadRef.current = false;
    setQueue(nextQueue);
  }

  async function loadQuickRequests() {
    const { data } = await supabaseClient
      .from('quick_requests')
      .select('id, section_name, content, status, created_at, customer:profiles!customer_id(id, given_name, family_name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setQuickRequests(data ?? []);
  }

  async function handleAcceptQuick(requestId) {
    const { data, error } = await supabaseClient.rpc('accept_quick_request', { p_request_id: requestId });
    if (!error && data) {
      router.push(`/chat/dm/${data}`);
    }
  }

  async function handleRejectQuick(requestId) {
    await supabaseClient.rpc('reject_quick_request', { p_request_id: requestId });
    loadQuickRequests();
  }

  useEffect(() => {
    if (!profile) return undefined;
    const channel = supabaseClient
      .channel('employee-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, loadQueue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_requests' }, loadQuickRequests)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (profile) { loadQueue(); loadQuickRequests(); }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDetail(requestId) {
    setSelectedId(requestId);
    const [{ data: historyRows }, { data: messageRows }, { data: requestRow }] = await Promise.all([
      supabaseClient
        .from('request_status_history')
        .select('old_status, new_status, note, created_at')
        .eq('request_id', requestId)
        .order('created_at'),
      supabaseClient
        .from('request_messages')
        .select('id, sender_id, body, attachment_url, created_at, read_at, message_type')
        .eq('request_id', requestId)
        .order('created_at'),
      supabaseClient.from('requests').select('customer_id').eq('id', requestId).maybeSingle(),
    ]);
    setHistory(historyRows ?? []);
    const rows = messageRows ?? [];
    setMessages(rows);
    const unreadFromOther = rows.filter((message) => message.sender_id !== profile.id && !message.read_at);
    if (unreadFromOther.length > 0) {
      supabaseClient
        .from('request_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadFromOther.map((message) => message.id))
        .then(() => {});
    }
    if (requestRow?.customer_id) {
      supabaseClient
        .from('profiles')
        .select('id, given_name, avatar_key')
        .eq('id', requestRow.customer_id)
        .maybeSingle()
        .then(({ data }) => setCustomer(data ?? null));
    } else {
      setCustomer(null);
    }
  }

  async function handleDeleteMessage(messageId) {
    await supabaseClient.from('request_messages').delete().eq('id', messageId);
    loadDetail(selectedId);
  }

  // Lets RequestAlertBell's "approve" action land the employee directly in
  // that request's chat (?request=<id>) instead of just the bare queue.
  useEffect(() => {
    if (!profile || !router.isReady) return;
    const requestId = router.query.request;
    if (typeof requestId === 'string') loadDetail(requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, router.isReady, router.query.request]);

  // The queue-level channel above only tracks `requests` row changes, not
  // message-level ones — without this, a new/deleted message in the
  // currently open chat never appears until the employee navigates away
  // and back (loadDetail is otherwise only re-invoked after the employee's
  // own actions). Scoped per selectedId so it re-subscribes on chat switch.
  useEffect(() => {
    if (!selectedId) return undefined;
    const channel = supabaseClient
      .channel(`request-detail-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_messages', filter: `request_id=eq.${selectedId}` },
        (payload) => { if (payload.new?.sender_id !== profile?.id) audioFX.playMessageReceived(); loadDetail(selectedId); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'request_messages', filter: `request_id=eq.${selectedId}` },
        () => loadDetail(selectedId)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'request_messages', filter: `request_id=eq.${selectedId}` },
        () => loadDetail(selectedId)
      )
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const container = msgListRef.current;
    if (!container) return;
    if (isMsgAtBottomRef.current) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setMsgUnreadCount(0);
    } else {
      setMsgUnreadCount((prev) => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  function handleMsgScroll() {
    const container = msgListRef.current;
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    isMsgAtBottomRef.current = atBottom;
    setShowMsgScrollDown(!atBottom);
    if (atBottom) setMsgUnreadCount(0);
  }

  function scrollMsgToBottom() {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMsgUnreadCount(0);
  }

  async function toggleService(category) {
    const next = activeServices.includes(category)
      ? activeServices.filter((c) => c !== category)
      : [...activeServices, category];
    setActiveServices(next);
    setSavingProfile(true);
    await supabaseClient.from('profiles').update({ active_services: next }).eq('id', profile.id);
    setSavingProfile(false);
    refreshProfile();
    loadQueue();
  }

  async function saveSpecialization(event) {
    event.preventDefault();
    setSavingProfile(true);
    await supabaseClient.from('profiles').update({ specialization }).eq('id', profile.id);
    setSavingProfile(false);
    refreshProfile();
  }

  async function claimRequest(requestId) {
    await supabaseClient.from('requests').update({ assigned_employee_id: profile.id }).eq('id', requestId);
    loadQueue();
    loadDetail(requestId);
  }

  async function handleStatusUpdate(event) {
    event.preventDefault();
    await supabaseClient.rpc('set_request_status', {
      p_request_id: selectedId,
      p_new_status: nextStatus,
      p_note: statusNote || null,
    });
    setStatusNote('');
    loadQueue();
    loadDetail(selectedId);
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!messageBody.trim() && !pendingAttachment) return;
    await supabaseClient.from('request_messages').insert({
      request_id: selectedId,
      sender_id: profile.id,
      body: messageBody.trim() || null,
      attachment_url: pendingAttachment?.path ?? null,
    });
    setMessageBody('');
    setPendingAttachment(null);
    audioFX.playMessageSent();
    loadDetail(selectedId);
  }

  async function handleSendSticker(sticker) {
    await supabaseClient.from('request_messages').insert({
      request_id: selectedId,
      sender_id: profile.id,
      body: sticker,
      message_type: 'sticker',
    });
    audioFX.playStickerPicked();
    loadDetail(selectedId);
  }

  async function handleLogPayment(event) {
    event.preventDefault();
    if (!paymentAmount || !selectedId) return;
    setPaymentSubmitting(true);
    setPaymentSuccess('');
    const session = await supabaseClient.auth.getSession();
    const token = session.data?.session?.access_token;
    try {
      const res = await fetch('/api/employee/log-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: selectedId, method: paymentMethod, amount: paymentAmount, notes: paymentNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setPaymentAmount('');
      setPaymentNotes('');
      setShowPaymentForm(false);
      setPaymentSuccess(t('payments.successLogged'));
      setTimeout(() => setPaymentSuccess(''), 3000);
      loadDetail(selectedId);
    } catch {
      // silent — error visible to dev in console
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const fullName = [profile.given_name, profile.father_name, profile.grandfather_name, profile.family_name]
    .filter(Boolean)
    .join(' ');
  const selectedRequest = queue?.find((request) => request.id === selectedId);

  return (
    <AppShell
      onSignOut={signOut}
      userId={profile.id}
      profile={profile}
      onProfileUpdated={refreshProfile}
      navItems={[
        { href: '/employee/dashboard', label: t('employeeDesk.queueTitle'), active: true, icon: ClipboardCheck },
        { href: '/chat/hq', label: t('hq.chatNavCta'), icon: Radio },
        { href: '/hq/news-links', label: t('hq.newsLinksNavCta'), icon: Newspaper },
        { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
      ]}
    >
      {claimedNotice && (
        <div className="mb-4 animate-slide-down rounded-xl2 border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200">
          {t('employeeDesk.ticketClaimedByOther').replace('{title}', claimedNotice)}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <section className="metal-panel p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 font-display text-lg font-bold text-gold-300 ring-1 ring-inset ring-gold-400/30">
                {(profile.given_name ?? '?').charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{fullName || '—'}</p>
                <p className="flex items-center gap-1 text-xs text-white/60">
                  <UserRoundCog className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('employeeDesk.profileTitle')}
                </p>
              </div>
            </div>
            <form onSubmit={saveSpecialization} className="relative mt-4 space-y-2">
              <label htmlFor="specialization" className="block text-xs text-white/60">
                {t('employeeDesk.specializationLabel')}
              </label>
              <input
                id="specialization"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                placeholder={t('employeeDesk.specializationPlaceholder')}
                className="input-cinematic text-sm"
              />
              <button type="submit" disabled={savingProfile} className="btn-cinematic-gold w-full px-3 py-2 text-sm disabled:opacity-50">
                {t('common.save')}
              </button>
            </form>
          </section>

          <section className="metal-panel p-6 text-white">
            <h3 className="flex items-center gap-2 font-semibold">
              <ListChecks className="h-4 w-4 text-gold-300" aria-hidden="true" />
              {t('employeeDesk.activeServicesTitle')}
            </h3>
            <div className="mt-3 space-y-2">
              {(categories ?? []).map((category) => (
                <label key={category.key} className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={activeServices.includes(category.key)}
                    onChange={() => toggleService(category.key)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
                  />
                  {categoryLabel(category, locale)}
                </label>
              ))}
            </div>
          </section>
        </aside>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="metal-panel p-4 text-white">
            <div className="mb-3 flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setQueueTab('requests')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  queueTab === 'requests' ? 'bg-gold-400/20 text-gold-300' : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                {t('employeeDesk.queueTitle')}
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('quick')}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  queueTab === 'quick' ? 'bg-amber-500/20 text-amber-300' : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                {t('employeeDesk.quickRequestsTab')}
                {quickRequests && quickRequests.length > 0 && (
                  <span className="absolute -top-1 end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {quickRequests.length}
                  </span>
                )}
              </button>
            </div>

            {queueTab === 'requests' ? (
              queue === null ? (
                <LoadingSpinner inline locale={locale} />
              ) : queue.length === 0 ? (
                <p className="text-sm text-white/60">{t('employeeDesk.queueEmpty')}</p>
              ) : (
                <ul className="space-y-2">
                  {queue.map((request) => (
                    <li key={request.id}>
                      <button
                        type="button"
                        onClick={() => loadDetail(request.id)}
                        className={`w-full rounded-xl2 border p-3 text-start text-sm transition-all duration-200 ${
                          selectedId === request.id
                            ? 'border-gold-400/50 bg-gold-400/10 shadow-glass-sm'
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <p className="font-semibold">{request.title}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <StatusBadge status={request.status} locale={locale} />
                          {!request.assigned_employee_id && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                claimRequest(request.id);
                              }}
                              className="text-xs font-semibold text-gold-300 underline"
                            >
                              {t('employeeDesk.assignToMeCta')}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : quickRequests === null ? (
              <LoadingSpinner inline locale={locale} />
            ) : quickRequests.length === 0 ? (
              <p className="text-sm text-white/60">{t('employeeDesk.quickRequestsEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {quickRequests.map((req) => {
                  const name = [req.customer?.given_name, req.customer?.family_name].filter(Boolean).join(' ') || req.customer?.phone || '—';
                  return (
                    <li key={req.id} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                      <div>
                        <p className="text-xs text-amber-300/80">{req.section_name}</p>
                        <p className="font-semibold text-sm">{name}</p>
                        <p className="mt-1 text-xs text-white/70 leading-relaxed">{req.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptQuick(req.id)}
                          className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30"
                        >
                          {t('employeeDesk.acceptQuickCta')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectQuick(req.id)}
                          className="flex-1 rounded-lg bg-red-500/20 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/30"
                        >
                          {t('employeeDesk.rejectQuickCta')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="metal-panel p-6 text-white">
            {!selectedRequest ? (
              <p className="text-sm text-white/60">{t('common.noResults')}</p>
            ) : (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold">{selectedRequest.title}</h3>
                  <div className="mt-1">
                    <StatusBadge status={selectedRequest.status} locale={locale} />
                  </div>
                </div>

                <form onSubmit={handleStatusUpdate} className="relative space-y-2">
                  <select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    className="input-cinematic text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status} className="bg-surface-dark text-white">
                        {t(`requestStatus.${status}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder={t('employeeDesk.noteLabel')}
                    className="input-cinematic text-sm"
                  />
                  <button type="submit" className="btn-cinematic-gold px-4 py-2 text-sm">
                    {t('employeeDesk.updateStatusCta')}
                  </button>
                </form>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                    <History className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
                    {t('employeeDesk.statusHistoryTitle')}
                  </h4>
                  <ol className="mt-2 space-y-2 border-s-2 border-gold-400/30 ps-4">
                    {history.map((entry, index) => (
                      <li key={index} className="text-xs">
                        <span className="font-semibold">{t(`requestStatus.${entry.new_status}`)}</span>{' '}
                        <span className="text-white/50">
                          {new Date(entry.created_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                        </span>
                        {entry.note && <p className="text-white/60">{entry.note}</p>}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                    <MessageSquare className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
                    {t('employeeDesk.messagesTitle')}
                  </h4>
                  <VoiceCallWidget
                    locale={locale}
                    recipientName={customer?.given_name}
                    recipientAvatarKey={customer?.avatar_key}
                    recipientSeed={customer?.id}
                  />
                  <div className="relative mt-2">
                  <div
                    ref={msgListRef}
                    onScroll={handleMsgScroll}
                    className="max-h-56 overflow-y-auto rounded-xl bg-[#0d1117] p-2"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const isMine = message.sender_id === profile.id;
                        const bundled = isBundled(message, messages[index - 1]);
                        const isFirst = !bundled;
                        const isLast = !isBundled(messages[index + 1], message);
                        const isSticker = message.message_type === 'sticker';
                        const isPayment = message.message_type === 'payment_proposal';
                        return (
                          <MessageBubble
                            key={message.id}
                            isMine={isMine}
                            isFirst={isFirst}
                            isLast={isLast}
                            bundled={bundled}
                            isSticker={isSticker}
                            timestamp={message.created_at}
                            bubbleClassName={
                              isSticker
                                ? 'text-7xl leading-none'
                                : isPayment
                                  ? 'max-w-[75%]'
                                  : `max-w-[70%] px-3 py-2 text-sm ${
                                      isMine ? 'bg-amber-600 text-white shadow-lg' : 'border border-white/[0.08] bg-[#161b22] text-gray-200'
                                    }`
                            }
                            onDelete={() => handleDeleteMessage(message.id)}
                            locale={locale}
                          >
                            {isSticker ? (
                              message.body
                            ) : isPayment ? (() => {
                              let parsed = {};
                              try { parsed = JSON.parse(message.body ?? '{}'); } catch { /* */ }
                              return (
                                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-sm">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                                    <Banknote className="h-4 w-4" aria-hidden="true" />
                                    {t('payments.paymentProposalLabel')}
                                  </div>
                                  <p className="mt-1 text-white/80">{t('payments.methodLabel')}: {parsed.method === 'zaincash' ? 'ZainCash' : 'Qi Card'}</p>
                                  <p className="text-white/80">{t('payments.amountLabel')}: <span className="font-semibold text-amber-300">{Number(parsed.amount).toLocaleString('ar-IQ')} IQD</span></p>
                                  {parsed.notes && <p className="mt-1 text-xs text-white/50">{parsed.notes}</p>}
                                </div>
                              );
                            })() : (
                              <>
                                {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
                                {message.attachment_url && <MessageAttachment path={message.attachment_url} isMine={isMine} locale={locale} />}
                                {isMine && (
                                  <span
                                    className="mt-0.5 flex justify-end"
                                    aria-label={message.read_at ? t('employeeDesk.readReceiptRead') : t('employeeDesk.readReceiptSent')}
                                  >
                                    {message.read_at ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-gold-200" aria-hidden="true" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
                                    )}
                                  </span>
                                )}
                              </>
                            )}
                          </MessageBubble>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={msgEndRef} />
                  </div>
                  {showMsgScrollDown && (
                    <button
                      type="button"
                      onClick={scrollMsgToBottom}
                      className="absolute bottom-1 start-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-black shadow-md"
                    >
                      ↓{msgUnreadCount > 0 ? ` ${msgUnreadCount}` : ''}
                    </button>
                  )}
                  </div>
                  {pendingAttachment && <p className="mt-1 text-xs text-white/60">{pendingAttachment.name}</p>}
                  {paymentSuccess && (
                    <p className="mt-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                      {paymentSuccess}
                    </p>
                  )}
                  {showPaymentForm && (
                    <form onSubmit={handleLogPayment} className="mt-3 space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                      <p className="text-xs font-semibold text-amber-400">{t('payments.logPaymentTitle')}</p>
                      <div className="flex gap-2">
                        {['zaincash', 'qi_card'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                              paymentMethod === m
                                ? 'bg-amber-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {m === 'zaincash' ? 'ZainCash' : 'Qi Card'}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={t('payments.amountPlaceholder')}
                        className="input-cinematic w-full text-sm"
                        required
                        dir="ltr"
                      />
                      <input
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder={t('payments.notesLabel')}
                        className="input-cinematic w-full text-sm"
                      />
                      <div className="flex gap-2">
                        <button type="submit" disabled={paymentSubmitting} className="btn-cinematic-gold flex-1 py-1.5 text-xs disabled:opacity-50">
                          {t('payments.logPaymentCta')}
                        </button>
                        <button type="button" onClick={() => setShowPaymentForm(false)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10">
                          ✕
                        </button>
                      </div>
                    </form>
                  )}
                  <form onSubmit={handleSendMessage} className="relative mt-3 flex items-center gap-2">
                    <input
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder={t('employeeDesk.messagePlaceholder')}
                      className="input-cinematic flex-1 text-sm"
                    />
                    <AttachmentUploader
                      pathPrefix={`requests/${selectedId}`}
                      locale={locale}
                      onUploaded={setPendingAttachment}
                    />
                    <VoiceRecorder pathPrefix={`requests/${selectedId}`} locale={locale} onUploaded={setPendingAttachment} />
                    <StickerPicker onPick={handleSendSticker} locale={locale} />
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm((v) => !v)}
                      title={t('payments.logPaymentTitle')}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        showPaymentForm ? 'bg-amber-500 text-white' : 'bg-white/5 text-amber-400 hover:bg-amber-400/20'
                      }`}
                    >
                      <Banknote className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="submit" className="btn-cinematic-gold flex items-center gap-1.5 px-4 py-2 text-sm">
                      <Send className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
                      {t('employeeDesk.sendCta')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
