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

function Bell3DSvg({ hasUnread }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" aria-hidden="true">
      <defs>
        <linearGradient id="bell3d-body" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="55%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="bell3d-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Bell body */}
      <path d="M14 4C14 4 12 4 10.5 5.5C9 7 8.5 9 8.5 11.5L7 19H21L19.5 11.5C19.5 9 19 7 17.5 5.5C16 4 14 4 14 4Z" fill="url(#bell3d-body)"/>
      {/* Shine */}
      <ellipse cx="11" cy="9.5" rx="2" ry="3.5" fill="url(#bell3d-shine)" transform="rotate(-20 11 9.5)" opacity="0.8"/>
      {/* Rim */}
      <rect x="5.5" y="19" width="17" height="2.5" rx="1.25" fill="#d97706"/>
      {/* Top stem */}
      <rect x="12.8" y="2" width="2.4" height="3" rx="1.2" fill="#92400e"/>
      {/* Clapper */}
      <circle cx="14" cy="23.5" r="2.2" fill="#92400e"/>
      <circle cx="14" cy="23.5" r="1.2" fill="#b45309"/>
      {/* Unread dot */}
      {hasUnread && <circle cx="20.5" cy="5.5" r="3.5" fill="#ef4444" stroke="#0d1117" strokeWidth="1.5"/>}
    </svg>
  );
}

export default function NotificationBell({ userId, locale, dropUp = false, navVariant = false, channelSuffix = '' }) {
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

    // Load pending invitations on mount/tab-focus
    function loadInvitations() {
      supabaseClient
        .from('chat_room_invitations')
        .select('*, sender:profiles!sender_id(given_name, family_name, role, avatar_key)')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .then(({ data }) => setInvitations(data ?? []));
    }
    loadInvitations();

    let channel = null;

    function subscribe() {
      // Single channel for both notifications + DM invitations (saves 1 connection per user)
      channel = supabaseClient
        .channel(`bell-${userId}${channelSuffix ? `-${channelSuffix}` : ''}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => setNotifications((current) => [payload.new, ...current])
        )
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
    }

    function unsubscribe() {
      if (channel) { supabaseClient.removeChannel(channel); channel = null; }
    }

    // Disconnect when tab is hidden, reconnect when visible — saves realtime
    // connections for idle/background tabs.
    function handleVisibility() {
      if (document.hidden) {
        unsubscribe();
      } else {
        loadNotifications();
        loadInvitations();
        subscribe();
      }
    }

    if (!document.hidden) subscribe();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
    };
  }, [userId, channelSuffix]);

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
    } catch (err) {
      const code = err?.message ?? '';
      console.error('[Push] subscribe failed:', code);
      if (code === 'PERMISSION_DENIED') {
        setPushError(t('notifications.pushErrorDenied'));
      } else if (code === 'PERMISSION_DISMISSED') {
        setPushError('');
      } else if (code === 'VAPID_NOT_CONFIGURED') {
        setPushError('مفتاح VAPID غير مضبوط — يرجى التواصل مع المسؤول');
      } else if (code.startsWith('SW_FAILED')) {
        setPushError('فشل تسجيل خدمة الإشعارات — ' + code.replace('SW_FAILED: ', ''));
      } else if (code.startsWith('SUBSCRIBE_FAILED')) {
        setPushError('فشل الاشتراك بالإشعارات — تأكد من دعم المتصفح');
      } else if (code.startsWith('DB_FAILED')) {
        setPushError('خطأ في حفظ الاشتراك — ' + code.replace('DB_FAILED: ', ''));
      } else {
        setPushError(t('notifications.pushError') + ': ' + code.slice(0, 80));
      }
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

  const dropdownPositionClass = dropUp
    ? 'absolute end-0 z-[60] bottom-full mb-2 [transform-origin:bottom_right] rtl:[transform-origin:bottom_left]'
    : 'absolute end-0 z-20 mt-2 [transform-origin:top_right] rtl:[transform-origin:top_left]';

  return (
    <div className="relative">
      {navVariant ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 focus:outline-none
            bg-gradient-to-b from-amber-500/20 to-amber-800/15 border border-amber-400/35
            shadow-[0_0_16px_-4px_rgba(245,158,11,0.55),0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]
            ${totalBadge > 0 ? 'animate-icon-bounce' : ''}`}
          aria-label={t('notifications.title')}
          aria-expanded={open}
        >
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/25" aria-hidden="true" />
          <Bell3DSvg hasUnread={totalBadge > 0} />
          {totalBadge > 0 && (
            <span className="animate-scale-in absolute -top-1.5 -end-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0d1117]">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          )}
        </button>
      ) : (
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
      )}

      {open && (
        <div className={`${dropdownPositionClass} w-80 animate-scale-in rounded-2xl border border-white/10 bg-[#0d1117]/95 p-3 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl`}>
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
