import { useEffect, useState } from 'react';
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
        className="relative rounded-lg px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
      >
        {t('notifications.title')}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-20 mt-2 w-80 rounded-xl2 border border-black/10 bg-white p-3 text-ink-light shadow-lg dark:border-white/10 dark:bg-surface-dark-alt dark:text-ink-dark">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-brand-700 underline dark:text-brand-300">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {!pushEnabled && isPushSupported() && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="mt-2 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              {t('notifications.enablePush')}
            </button>
          )}
          {pushError && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{pushError}</p>}

          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-2 text-xs text-ink-muted dark:text-ink-dark-muted">{t('notifications.empty')}</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className={`rounded-lg p-2 text-sm ${notification.is_read ? '' : 'bg-brand-500/10'}`}>
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
