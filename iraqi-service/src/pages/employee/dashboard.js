import { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  History,
  Inbox,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Send,
  UserRoundCog,
} from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import StatusBadge from '../../components/UI/StatusBadge';
import AttachmentUploader from '../../components/Chat/AttachmentUploader';
import MessageAttachment from '../../components/Chat/MessageAttachment';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

const STATUS_OPTIONS = ['in_review', 'needs_changes', 'approved', 'rejected'];

export default function EmployeeDashboard() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['employee']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [specialization, setSpecialization] = useState('');
  const [activeServices, setActiveServices] = useState([]);
  const categories = useCategories();
  const [savingProfile, setSavingProfile] = useState(false);

  const [queue, setQueue] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState('in_review');

  useEffect(() => {
    if (!profile) return;
    setSpecialization(profile.specialization ?? '');
    setActiveServices(profile.active_services ?? []);
  }, [profile]);

  async function loadQueue() {
    const { data } = await supabaseClient
      .from('requests')
      .select('id, title, category, status, assigned_employee_id, customer_id, created_at')
      .order('created_at', { ascending: false });
    setQueue(data ?? []);
  }

  useEffect(() => {
    if (profile) loadQueue();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDetail(requestId) {
    setSelectedId(requestId);
    const [{ data: historyRows }, { data: messageRows }] = await Promise.all([
      supabaseClient
        .from('request_status_history')
        .select('old_status, new_status, note, created_at')
        .eq('request_id', requestId)
        .order('created_at'),
      supabaseClient
        .from('request_messages')
        .select('id, sender_id, body, attachment_url, created_at')
        .eq('request_id', requestId)
        .order('created_at'),
    ]);
    setHistory(historyRows ?? []);
    setMessages(messageRows ?? []);
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
      attachment_url: pendingAttachment,
    });
    setMessageBody('');
    setPendingAttachment(null);
    loadDetail(selectedId);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
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
      navItems={[
        { href: '/employee/dashboard', label: t('employeeDesk.queueTitle'), active: true, icon: ClipboardCheck },
        { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero font-display text-lg font-bold text-white shadow-glow">
                {(profile.given_name ?? '?').charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{fullName || '—'}</p>
                <p className="flex items-center gap-1 text-xs text-ink-muted dark:text-ink-dark-muted">
                  <UserRoundCog className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('employeeDesk.profileTitle')}
                </p>
              </div>
            </div>
            <form onSubmit={saveSpecialization} className="mt-4 space-y-2">
              <label htmlFor="specialization" className="block text-xs text-ink-muted dark:text-ink-dark-muted">
                {t('employeeDesk.specializationLabel')}
              </label>
              <input
                id="specialization"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                placeholder={t('employeeDesk.specializationPlaceholder')}
                className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl2 bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate disabled:opacity-50"
              >
                {t('common.save')}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
            <h3 className="flex items-center gap-2 font-semibold">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              {t('employeeDesk.activeServicesTitle')}
            </h3>
            <div className="mt-3 space-y-2">
              {(categories ?? []).map((category) => (
                <label key={category.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={activeServices.includes(category.key)}
                    onChange={() => toggleService(category.key)}
                    className="h-4 w-4 rounded border-black/20 text-brand-600 focus:ring-brand-400"
                  />
                  {categoryLabel(category, locale)}
                </label>
              ))}
            </div>
          </section>
        </aside>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-black/5 bg-white/60 p-4 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Inbox className="h-4 w-4" aria-hidden="true" />
              {t('employeeDesk.queueTitle')}
            </h3>
            {queue === null ? (
              <p className="text-sm">{t('common.loading')}</p>
            ) : queue.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('employeeDesk.queueEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((request) => (
                  <li key={request.id}>
                    <button
                      type="button"
                      onClick={() => loadDetail(request.id)}
                      className={`w-full rounded-xl2 border p-3 text-start text-sm transition-all duration-200 ${
                        selectedId === request.id
                          ? 'border-brand-500 bg-brand-500/10 shadow-glass-sm'
                          : 'border-black/5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5'
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
                            className="text-xs font-semibold text-brand-700 underline dark:text-brand-300"
                          >
                            {t('employeeDesk.assignToMeCta')}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
            {!selectedRequest ? (
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
            ) : (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold">{selectedRequest.title}</h3>
                  <div className="mt-1">
                    <StatusBadge status={selectedRequest.status} locale={locale} />
                  </div>
                </div>

                <form onSubmit={handleStatusUpdate} className="space-y-2">
                  <select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`requestStatus.${status}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder={t('employeeDesk.noteLabel')}
                    className="w-full rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
                  />
                  <button
                    type="submit"
                    className="rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate"
                  >
                    {t('employeeDesk.updateStatusCta')}
                  </button>
                </form>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                    <History className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('employeeDesk.statusHistoryTitle')}
                  </h4>
                  <ol className="mt-2 space-y-2 border-s-2 border-brand-500/30 ps-4">
                    {history.map((entry, index) => (
                      <li key={index} className="text-xs">
                        <span className="font-semibold">{t(`requestStatus.${entry.new_status}`)}</span>{' '}
                        <span className="text-ink-muted dark:text-ink-dark-muted">
                          {new Date(entry.created_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                        </span>
                        {entry.note && <p className="text-ink-muted dark:text-ink-dark-muted">{entry.note}</p>}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('employeeDesk.messagesTitle')}
                  </h4>
                  <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                    {messages.map((message) => (
                      <li
                        key={message.id}
                        className={`max-w-[80%] rounded-xl2 px-3 py-2 text-sm shadow-sm ${
                          message.sender_id === profile.id
                            ? 'ms-auto bg-brand-600 text-white'
                            : 'bg-black/5 dark:bg-white/10'
                        }`}
                      >
                        {message.body}
                        {message.attachment_url && <MessageAttachment path={message.attachment_url} />}
                      </li>
                    ))}
                  </ul>
                  {pendingAttachment && (
                    <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">
                      {pendingAttachment.split('-').slice(1).join('-')}
                    </p>
                  )}
                  <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
                    <input
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder={t('employeeDesk.messagePlaceholder')}
                      className="flex-1 rounded-xl2 border border-black/10 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
                    />
                    <AttachmentUploader
                      pathPrefix={`requests/${selectedId}`}
                      locale={locale}
                      onUploaded={setPendingAttachment}
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate"
                    >
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
