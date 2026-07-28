import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function HeaderBar({ title, onProfile, onBack }) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={styles.action}>رجوع</Text>
        </Pressable>
      ) : <View style={{ width: 50 }} />}
      <Text style={styles.title}>{title}</Text>
      {onProfile ? (
        <Pressable onPress={onProfile}>
          <Text style={styles.action}>الملف</Text>
        </Pressable>
      ) : <View style={{ width: 50 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  action: { color: theme.colors.primary, fontWeight: '700' },
});
