import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import HeaderBar from '../components/HeaderBar';
import GlassCard from '../components/GlassCard';
import { theme } from '../theme';

export default function ComingSoonScreen({ route, navigation }) {
  const title = route?.params?.title || 'قسم الإدارة';
  const description = route?.params?.description || 'هذا القسم متاح في لوحة تحكم المؤسس على الموقع، وسيتم تفعيله داخل التطبيق قريبًا.';

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.card}>
          <Text style={styles.text}>{description}</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  card: { gap: 8 },
  text: { color: theme.colors.muted, lineHeight: 22 },
});
