import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function SectionTitle({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, marginTop: 4, fontSize: 13 },
});
