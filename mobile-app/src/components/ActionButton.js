import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export default function ActionButton({ title, onPress }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  text: { color: '#111827', fontWeight: '800' },
});
