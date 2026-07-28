import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export default function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: theme.spacing.md,
  },
});
