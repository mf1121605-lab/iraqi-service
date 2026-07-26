import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { COLORS, FONTS } from '@/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  );
}

export default function CustomerLayout() {
  return (
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="الرئيسية" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="طلباتي" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'الأخبار',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📰" label="الأخبار" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="حسابي" focused={focused} />,
        }}
      />
      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="requests/new" options={{ href: null }} />
      <Tabs.Screen name="requests/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 11,
  },
});
