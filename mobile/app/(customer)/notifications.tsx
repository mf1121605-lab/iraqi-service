import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  general:         { emoji: '📣', color: '#e6ab2c' },
  request_update:  { emoji: '📋', color: '#3b82f6' },
  message:         { emoji: '💬', color: '#22c55e' },
  broadcast:       { emoji: '📡', color: '#a855f7' },
};

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  notification_type: string;
  created_at: string;
};

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString('ar', {
    day: 'numeric',
    month: 'short',
    year: diffDay > 365 ? 'numeric' : undefined,
    timeZone: 'Asia/Baghdad',
  });
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, link, is_read, notification_type, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
    setRefreshing(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`notifications-${session?.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session?.user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  async function handleNotifPress(notif: Notification) {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    if (notif.link) {
      // Parse links like /customer/requests/{id} → navigate to request detail
      const match = notif.link.match(/requests\/([0-9a-f-]{36})/i);
      if (match) {
        router.push({ pathname: '/(customer)/requests/[id]', params: { id: match[1] } });
      }
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (!unread.length) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session!.user.id)
      .eq('is_read', false);
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScreenBg noTopPad>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.gold} />
        }
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>الإشعارات</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} جديد</Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <Pressable
              style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.7 }]}
              onPress={markAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <ActivityIndicator color={COLORS.gold} size="small" />
              ) : (
                <Text style={styles.markAllText}>تحديد الكل كمقروء ✓</Text>
              )}
            </Pressable>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>لا توجد إشعارات بعد</Text>
            <Text style={styles.emptySub}>ستصلك الإشعارات هنا فور وجود تحديثات على طلباتك</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notif) => {
              const meta = TYPE_META[notif.notification_type] ?? TYPE_META.general;
              return (
                <Pressable
                  key={notif.id}
                  style={({ pressed }) => [
                    styles.card,
                    !notif.is_read && styles.cardUnread,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleNotifPress(notif)}
                >
                  {/* Left accent */}
                  <View style={[styles.accentBar, { backgroundColor: notif.is_read ? 'transparent' : meta.color }]} />

                  {/* Icon circle */}
                  <View style={[styles.iconCircle, { backgroundColor: meta.color + '18', borderColor: meta.color + '35' }]}>
                    <Text style={styles.iconEmoji}>{meta.emoji}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.content}>
                    <View style={styles.contentTop}>
                      <Text style={styles.date}>{formatDate(notif.created_at)}</Text>
                      {!notif.is_read && <View style={[styles.dot, { backgroundColor: meta.color }]} />}
                    </View>
                    <Text style={[styles.title, !notif.is_read && styles.titleUnread]}>
                      {notif.title}
                    </Text>
                    {notif.body ? (
                      <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },

  pageHeader: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.white },
  unreadBadge: {
    backgroundColor: 'rgba(230,171,44,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },

  markAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(230,171,44,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    borderRadius: RADIUS.md,
  },
  markAllText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 52,
    gap: 10,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.12)',
    padding: 24,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  list: { gap: 8 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: 12,
  },
  cardUnread: {
    borderColor: 'rgba(230,171,44,0.2)',
    backgroundColor: '#1a2030',
  },
  cardPressed: { opacity: 0.75 },
  accentBar: { width: 3, alignSelf: 'stretch', minHeight: 60 },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 18 },

  content: { flex: 1, paddingVertical: 14, paddingRight: 14, gap: 4 },
  contentTop: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  date: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  title: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white70,
    textAlign: 'right',
    lineHeight: 20,
  },
  titleUnread: { fontFamily: FONTS.bold, color: COLORS.white },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
    lineHeight: 18,
  },
});
