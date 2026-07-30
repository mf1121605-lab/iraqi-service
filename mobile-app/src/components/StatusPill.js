import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function StatusPill({ label, tone = 'primary' }) {
  const colors = {
    primary: { bg: 'rgba(230,171,44,0.18)', text: theme.colors.primary },
    success: { bg: 'rgba(34,197,94,0.18)', text: '#4ade80' },
    warning: { bg: 'rgba(249,115,22,0.18)', text: '#fb923c' },
  };

  const style = colors[tone] || colors.primary;

  return (
    <View style={[styles.pill, { backgroundColor: style.bg }]}> 
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  text: { fontSize: 12, fontWeight: '800' },
});
