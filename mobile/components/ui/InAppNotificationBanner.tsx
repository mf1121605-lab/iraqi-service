import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/chat/Avatar';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { isViewingDm, isViewingRoom } from '@/lib/activeChatTracker';

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  notification_type: string | null;
  related_user_id: string | null;
}

interface BannerData {
  id: string;
  senderName: string;
  senderAvatarKey: string | null;
  message: string;
  target: { type: 'dm'; threadId: string } | { type: 'room'; slug: string };
}

const AUTO_HIDE_MS = 5000;
const SWIPE_UP_THRESHOLD = -40;

// Parses the web-shaped link ('/chat/dm/<id>' or '/chat/<slug>') that the DB
// trigger stamps onto the notification row, into the mobile app's own
// expo-router route-group path — the two are not interchangeable strings.
function parseLink(link: string | null): BannerData['target'] | null {
  if (!link) return null;
  const dmMatch = link.match(/\/chat\/dm\/([^/]+)/);
  if (dmMatch) return { type: 'dm', threadId: dmMatch[1] };
  const roomMatch = link.match(/\/chat\/([^/]+)/);
  if (roomMatch) return { type: 'room', slug: roomMatch[1] };
  return null;
}

export function InAppNotificationBanner() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(-200);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearHideTimer();
    translateY.value = withTiming(-200, { duration: 220 });
    setTimeout(() => setBanner(null), 220);
  }, [clearHideTimer, translateY]);

  const handleNewNotification = useCallback(async (row: NotificationRow) => {
    if (row.notification_type !== 'dm_message' && row.notification_type !== 'chat_reply') return;

    const target = parseLink(row.link);
    if (!target) return;

    if (target.type === 'dm' && isViewingDm(target.threadId)) return;
    if (target.type === 'room' && isViewingRoom(target.slug)) return;

    let senderName = row.title;
    let senderAvatarKey: string | null = null;
    if (row.related_user_id) {
      const { data: sender } = await supabase
        .from('profiles')
        .select('given_name, family_name, avatar_key')
        .eq('id', row.related_user_id)
        .maybeSingle();
      if (sender) {
        senderName = [sender.given_name, sender.family_name].filter(Boolean).join(' ') || row.title;
        senderAvatarKey = sender.avatar_key ?? null;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    setBanner({
      id: row.id,
      senderName,
      senderAvatarKey,
      message: row.body ?? '',
      target,
    });

    clearHideTimer();
    translateY.value = withSpring(0, { damping: 16, stiffness: 160 });
    hideTimerRef.current = setTimeout(dismiss, AUTO_HIDE_MS);
  }, [clearHideTimer, dismiss, translateY]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`in-app-banner-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => { handleNewNotification(payload.new as NotificationRow); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearHideTimer();
    };
  }, [session?.user.id, handleNewNotification, clearHideTimer]);

  const handleTap = useCallback(() => {
    if (!banner) return;
    const target = banner.target;
    dismiss();
    if (target.type === 'dm') router.push(`/(chat)/dm/${target.threadId}`);
    else router.push(`/(chat)/${target.slug}`);
  }, [banner, dismiss]);

  const swipe = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY < SWIPE_UP_THRESHOLD) {
        translateY.value = withTiming(-200, { duration: 180 });
        runOnJS(clearHideTimer)();
        runOnJS(setBanner)(null);
      } else {
        translateY.value = withSpring(0, { damping: 16, stiffness: 160 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!banner) return null;

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        style={[styles.container, { top: insets.top + 8 }, animatedStyle]}
        pointerEvents="box-none"
      >
        <Pressable onPress={handleTap}>
          <BlurView intensity={60} tint="dark" style={styles.card}>
            <Avatar avatarKey={banner.senderAvatarKey} name={banner.senderName} size={42} />
            <View style={styles.textWrap}>
              <Text style={styles.senderName} numberOfLines={1}>{banner.senderName}</Text>
              <Text style={styles.message} numberOfLines={2}>{banner.message}</Text>
            </View>
          </BlurView>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: 'rgba(22,27,34,0.72)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  textWrap: { flex: 1, gap: 2 },
  senderName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  message: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right' },
});
