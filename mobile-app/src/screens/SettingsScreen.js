import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import HeaderBar from '../components/HeaderBar';
import GlassCard from '../components/GlassCard';
import { theme } from '../theme';

export default function SettingsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="الإعدادات" onBack={() => navigation.goBack()} onProfile={() => navigation.navigate('Profile')} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.card}>
          <Text style={styles.title}>إعدادات التطبيق</Text>
          <Text style={styles.text}>يمكنك هنا تخصيص اللغة والظهور لاحقًا.</Text>
        </GlassCard>
        <GlassCard style={styles.card}>
          <Text style={styles.title}>ملاحظات</Text>
          <Text style={styles.text}>تم ربط التطبيق بنفس نموذج البيانات الأساسية للموقع.</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: { gap: 6 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  text: { color: theme.colors.muted, lineHeight: 20 },
});
