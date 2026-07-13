import { useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { getExistingPushSubscription, isPushSupported, subscribeToPush } from '../../utils/pushNotifications';

export default function NotificationBell({ userId, locale }) {
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

    const channel = supabaseClient
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((current) => [payload.new, ...current])
      )
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [userId]);

  useEffect(() => {
    if (!isPushSupported()) return;
    getExistingPushSubscription().then((subscription) => setPushEnabled(!!subscription));
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);
    if (unreadIds.length === 0) return;
    await supabaseClient.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl p-2 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10"
        aria-label={t('notifications.title')}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 animate-pulse-soft items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-dark-alt">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-panel-dark absolute end-0 z-20 mt-2 w-80 animate-scale-in rounded-2xl p-3 text-ink-light shadow-elevate-lg dark:text-ink-dark [transform-origin:top_right] rtl:[transform-origin:top_left]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
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
              className="mt-2 w-full rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-glass-sm transition-all hover:bg-brand-700"
            >
              {t('notifications.enablePush')}
            </button>
          )}
          {pushError && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{pushError}</p>}

          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {notifications.length === 0 ? (
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
