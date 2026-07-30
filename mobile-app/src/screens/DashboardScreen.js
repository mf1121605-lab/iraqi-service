import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import SkiaBackground from '../components/SkiaBackground';
import { theme } from '../theme';
import { supabase } from '../services/supabase';
import { formatFullName, getMyProfile, signOut } from '../services/auth';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    async function load() {
      const myProfile = await getMyProfile();
      setProfile(myProfile);

      if (supabase && myProfile) {
        const { data } = await supabase
          .from('requests')
          .select('id, title, status')
          .eq('customer_id', myProfile.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRequests(data || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleLogout() {
    await signOut();
    navigation.replace('Home');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SkiaBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>لوحة المستخدم</Text>
          <Pressable onPress={handleLogout}>
            <Text style={styles.logout}>تسجيل الخروج</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>{formatFullName(profile)}</Text>
          <Text style={styles.heroText}>يمكنك متابعة طلباتك وبياناتك من نفس قاعدة بيانات الموقع.</Text>
        </GlassCard>

        {requests.length === 0 ? (
          <GlassCard><Text style={styles.rowText}>لا توجد طلبات مسجلة بعد</Text></GlassCard>
        ) : requests.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <StatusPill label={item.status} tone={item.status === 'completed' ? 'success' : 'warning'} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  logout: { color: theme.colors.primary, fontWeight: '700' },
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
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
