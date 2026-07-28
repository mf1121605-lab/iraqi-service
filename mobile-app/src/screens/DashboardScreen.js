import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    async function loadStats() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('profiles').select('role, full_name').limit(6);
      if (!error) {
        setStats(data || []);
      }
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>لوحة المستخدم</Text>
        <Text style={styles.subtitle}>نفس البيانات من قاعدة البيانات</Text>

        <GlassCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>منصة الخدمات العراقية</Text>
          <Text style={styles.heroText}>يمكنك عرض المستخدمين والطلبات والخيارات وفق نفس البنية الحالية.</Text>
        </GlassCard>

        {stats.map((item, index) => (
          <GlassCard key={`${item.full_name || 'user'}-${index}`} style={styles.row}>
            <Text style={styles.rowTitle}>{item.full_name || 'مستخدم'}</Text>
            <Text style={styles.rowText}>{item.role || 'member'}</Text>
          </GlassCard>
        ))}
      </ScrollView>
      <BottomTabs navigation={navigation} active="Dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  heroCard: {
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  rowText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
