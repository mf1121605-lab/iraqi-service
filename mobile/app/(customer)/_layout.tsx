import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useReserveFrameBottomInset } from '@/hooks/useFrameInset';
import { TabSwipeZone } from '@/components/ui/TabSwipeZone';
import { COLORS, FONTS } from '@/constants/theme';

const TAB_BAR_HEIGHT = 62;

function TabIcon({ emoji, focused, badge }: { emoji: string; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
      {badge != null && badge > 0 && (
        <View style={badgeStyle.wrap}>
          <Text style={badgeStyle.text}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyle = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { color: '#fff', fontSize: 9, fontFamily: FONTS.bold },
});

export default function CustomerLayout() {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();
  // Frame's bottom edge stops just above this tab bar instead of drawing
  // through it — see hooks/useFrameInset.ts.
  useReserveFrameBottomInset(TAB_BAR_HEIGHT + insets.bottom);

  useEffect(() => {
    if (!session?.user.id) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session!.user.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    }

    fetchUnread();

    const channel = supabase
      .channel(`notif-badge-${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  return (
    <View style={styles.root}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.white40,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="communities/index"
        options={{
          title: 'المجتمعات',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏘️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'الإشعارات',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} badge={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="news" options={{ href: null }} />
      <Tabs.Screen name="requests/new" options={{ href: null }} />
      <Tabs.Screen name="requests/[id]" options={{ href: null }} />
      <Tabs.Screen name="requests/matching" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="user/[userId]" options={{ href: null }} />
      <Tabs.Screen name="employee/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]/checkout" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]/result" options={{ href: null }} />
      <Tabs.Screen name="communities/[roomId]" options={{ href: null }} />
      <Tabs.Screen name="tutor/index" options={{ href: null }} />
      <Tabs.Screen name="tutor/[subject]" options={{ href: null }} />
      <Tabs.Screen name="tutor/session/[sessionId]" options={{ href: null }} />
    </Tabs>
    <TabSwipeZone />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,171,44,0.2)',
    paddingBottom: 6,
    paddingTop: 6,
    height: 62,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
  },
  badge: {
    backgroundColor: '#ef4444',
    fontSize: 10,
    fontFamily: FONTS.bold,
    minWidth: 16,
    height: 16,
    lineHeight: 16,
  },
});
