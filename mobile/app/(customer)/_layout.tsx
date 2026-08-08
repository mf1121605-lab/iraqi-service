import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Ionicons } from '@expo/vector-icons';
import { useReserveFrameBottomInset } from '@/hooks/useFrameInset';
import { TabSwipeZone } from '@/components/ui/TabSwipeZone';
import { Icon3D } from '@/components/ui/Icon3D';
import { AnimatedTopBorderLine } from '@/components/ui/AnimatedTopBorderLine';
import { COLORS, FONTS } from '@/constants/theme';

// Raised ~20% (62 → 74) alongside larger icons/labels, for a clearer and
// more forgiving touch target on the bottom bar.
const TAB_BAR_HEIGHT = 74;

// Filled glyph when the tab is active, outline glyph otherwise — the same
// convention iOS/Material navigation uses, for a more professional look
// than the previous plain-emoji icons.
function TabIcon({
  filled,
  outline,
  focused,
  badge,
}: {
  filled: keyof typeof Ionicons.glyphMap;
  outline: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  badge?: number;
}) {
  return (
    <Icon3D
      iconName={focused ? filled : outline}
      size={focused ? 41 : 36}
      active={focused}
      badge={badge}
      animation={focused ? 'float' : 'none'}
    />
  );
}

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  // Frame's bottom edge stops just above this tab bar instead of drawing
  // through it — see hooks/useFrameInset.ts.
  useReserveFrameBottomInset(TAB_BAR_HEIGHT + insets.bottom);

  return (
    <View style={styles.root}>
    <Tabs
      // A tiny haptic tick on every tab switch — the single most-tapped
      // interaction in the app, so this alone covers a large share of all
      // taps a session ever makes. tabPress fires regardless of which
      // custom icon/label is rendered for the tab, so it doesn't need to
      // touch tabBarIcon or wrap anything visual.
      screenListeners={{
        tabPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.white40,
        tabBarLabelStyle: styles.tabLabel,
        // Bigger touch target per tab — the icons themselves are small,
        // but the whole item area should be comfortably tappable.
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => <TabIcon filled="home" outline="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'آخر الأخبار',
          tabBarIcon: ({ focused }) => <TabIcon filled="newspaper" outline="newspaper-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'الرسائل',
          tabBarIcon: ({ focused }) => <TabIcon filled="chatbubbles" outline="chatbubbles-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ focused }) => <TabIcon filled="document-text" outline="document-text-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused }) => <TabIcon filled="person-circle" outline="person-circle-outline" focused={focused} />,
        }}
      />
      {/* Hidden screens — accessible via navigation but not in tab bar.
          المجتمعات and الإشعارات moved off the bar to keep it focused on
          news + messages per spec; both stay reachable from the home
          screen (quick-access button and header bell respectively). */}
      <Tabs.Screen name="account-settings" options={{ href: null }} />
      <Tabs.Screen name="communities/index" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="requests/new" options={{ href: null }} />
      <Tabs.Screen name="requests/[id]" options={{ href: null }} />
      <Tabs.Screen name="requests/matching" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="employee/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]/checkout" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]/result" options={{ href: null }} />
      <Tabs.Screen name="communities/[roomId]" options={{ href: null }} />
      <Tabs.Screen name="tutor/index" options={{ href: null }} />
      <Tabs.Screen name="tutor/[subject]" options={{ href: null }} />
      <Tabs.Screen name="tutor/session/[sessionId]" options={{ href: null }} />
    </Tabs>
    <TabSwipeZone />
    <View style={[styles.topBorderAnchor, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
      <AnimatedTopBorderLine />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBorderAnchor: { position: 'absolute', left: 0, right: 0, height: 2 },
  tabBar: {
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,171,44,0.2)',
    paddingBottom: 8,
    paddingTop: 7,
    height: TAB_BAR_HEIGHT,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabItem: {
    // Expands each tab's tappable area to the full item cell instead of
    // hugging the icon/label — makes taps register more forgivingly.
    paddingVertical: 4,
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
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
