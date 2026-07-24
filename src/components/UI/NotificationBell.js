import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Bell, BellRing, CheckCheck, MessageCircleMore, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { getExistingPushSubscription, isPushSupported, subscribeToPush } from '../../utils/pushNotifications';

function displayNameFor(sender) {
  if (!sender) return '';
  if (sender.role === 'customer') return sender.given_name || 'مستخدم';
  return [sender.given_name, sender.family_name].filter(Boolean).join(' ') || sender.role;
}

export default function NotificationBell({ userId, locale }) {
  const router = useRouter();
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [responding, setResponding] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState('');

  async function loadNotifications() {
    const { data } = await supabaseClient
      .from('notifications')
      .select('id, title, body, link, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    if (!userId) return undefined;
    loadNotifications();

    const notifChannel = supabaseClient
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((current) => [payload.new, ...current])
      )
      .subscribe();

    const inviteChannel = supabaseClient
      .channel(`dm-invitations-bell-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_invitations', filter: `receiver_id=eq.${userId}` },
        async ({ new: row }) => {
          const { data: sender } = await supabaseClient
            .from('profiles')
            .select('given_name, family_name, role, avatar_key')
            .eq('id', row.sender_id)
            .maybeSingle();
          setInvitations((current) => [...current, { ...row, sender }]);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(notifChannel);
      supabaseClient.removeChannel(inviteChannel);
    };
  }, [userId]);

  useEffect(() => {
    if (!isPushSupported()) return;
    getExistingPushSubscription().then((subscription) => setPushEnabled(!!subscription));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const totalBadge = unreadCount + invitations.length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabaseClient.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
  }

  async function handleEnablePush() {
    setPushError('');
    try {
      await subscribeToPush(userId);
      setPushEnabled(true);
    } catch {
      setPushError(t('notifications.pushError'));
    }
  }

  async function handleRejectInvitation(inv) {
    setResponding(inv.id);
    await supabaseClient.from('chat_room_invitations').update({ status: 'rejected' }).eq('id', inv.id);
    setInvitations((current) => current.filter((i) => i.id !== inv.id));
    setResponding(null);
  }

  async function handleAcceptInvitation(inv) {
    setResponding(inv.id);
    const { data: threadId } = await supabaseClient.rpc('accept_chat_invitation', { p_invitation_id: inv.id });
    setInvitations((current) => current.filter((i) => i.id !== inv.id));
    setResponding(null);
    setOpen(false);
    if (threadId) router.push(`/chat/dm/${threadId}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10"
        aria-label={t('notifications.title')}
        aria-expanded={open}
      >
        {totalBadge > 0 ? (
          <BellRing className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        )}
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 animate-pulse-soft items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-dark-alt">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-20 mt-2 w-80 animate-scale-in rounded-2xl border border-white/10 bg-[#0d1117]/95 p-3 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl [transform-origin:top_right] rtl:[transform-origin:top_left]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-brand-700 transition hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:text-brand-300 dark:hover:text-brand-200"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {!pushEnabled && isPushSupported() && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="mt-2 w-full rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-glass-sm transition-all hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
            >
              {t('notifications.enablePush')}
            </button>
          )}
          {pushError && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{pushError}</p>}

          <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
            {/* DM Invitations */}
            {invitations.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-gold-400/20 bg-gold-400/8 p-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-gold-400">
                    <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">
                      {t('dmInvitations.newRequestTitle').replace('{name}', displayNameFor(inv.sender))}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRejectInvitation(inv)}
                        disabled={responding === inv.id}
                        className="flex-1 rounded-lg border border-white/15 py-1 text-xs font-medium text-white/70 transition hover:bg-white/5 disabled:opacity-50"
                      >
                        {t('dmInvitations.rejectCta')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptInvitation(inv)}
                        disabled={responding === inv.id}
                        className="btn-cinematic-gold flex-1 py-1 text-xs disabled:opacity-50"
                      >
                        {t('dmInvitations.acceptCta')}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvitations((current) => current.filter((i) => i.id !== inv.id))}
                    className="shrink-0 rounded-lg p-1 text-white/40 hover:bg-white/10"
                    aria-label={t('common.close')}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}

            {/* Service / message notifications */}
            {notifications.length === 0 && invitations.length === 0 ? (
              <li className="p-4 text-center text-xs text-ink-muted dark:text-ink-dark-muted">{t('notifications.empty')}</li>
            ) : (
              notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`rounded-xl p-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                    notification.is_read ? '' : 'bg-brand-500/10'
                  }`}
                >
                  <a href={notification.link ?? '#'} className="block">
                    <p className="font-semibold">{notification.title}</p>
                    {notification.body && (
                      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{notification.body}</p>
                    )}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
