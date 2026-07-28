import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function BottomTabs({ navigation, active }) {
  const tabs = [
    { name: 'Home', label: 'الرئيسية' },
    { name: 'Requests', label: 'الطلبات' },
    { name: 'Services', label: 'الخدمات' },
    { name: 'Chat', label: 'الدردشة' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.name;
        return (
          <Pressable key={tab.name} style={styles.tab} onPress={() => navigation.navigate(tab.name)}>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tab: { paddingVertical: 6, paddingHorizontal: 10 },
  label: { color: theme.colors.muted, fontWeight: '700' },
  activeLabel: { color: theme.colors.primary },
});
