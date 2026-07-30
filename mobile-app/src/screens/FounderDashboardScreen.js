import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';
import { supabase } from '../services/supabase';
import { formatFullName, getMyProfile, signOut } from '../services/auth';

const MENU_ITEMS = [
  { key: 'users', title: 'المستخدمون', screen: 'AdminUsers' },
  { key: 'categories', title: 'التصنيفات', screen: 'AdminCategories' },
  { key: 'category-services', title: 'خدمات التصنيفات', screen: 'ComingSoon', params: { title: 'خدمات التصنيفات' } },
  { key: 'banners', title: 'البانرات', screen: 'ComingSoon', params: { title: 'البانرات' } },
  { key: 'stats', title: 'الإحصائيات', screen: 'ComingSoon', params: { title: 'الإحصائيات' } },
  { key: 'payments', title: 'المدفوعات', screen: 'ComingSoon', params: { title: 'المدفوعات' } },
  { key: 'products', title: 'المنتجات', screen: 'ComingSoon', params: { title: 'المنتجات' } },
  { key: 'quick-requests', title: 'الطلبات السريعة', screen: 'ComingSoon', params: { title: 'الطلبات السريعة' } },
  { key: 'chat-rooms', title: 'غرف الدردشة', screen: 'ComingSoon', params: { title: 'غرف الدردشة' } },
  { key: 'audit-log', title: 'سجل التدقيق', screen: 'ComingSoon', params: { title: 'سجل التدقيق' } },
  { key: 'settings', title: 'إعدادات المنصة', screen: 'ComingSoon', params: { title: 'إعدادات المنصة' } },
];

export default function FounderDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ users: 0, requests: 0, products: 0 });

  useEffect(() => {
    async function load() {
      const myProfile = await getMyProfile();
      setProfile(myProfile);

      if (supabase) {
        const [usersRes, requestsRes, productsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('requests').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          users: usersRes.count ?? 0,
          requests: requestsRes.count ?? 0,
          products: productsRes.count ?? 0,
        });
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>لوحة المؤسس</Text>
          <Pressable onPress={handleLogout}>
            <Text style={styles.logout}>تسجيل الخروج</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <SectionTitle title={formatFullName(profile)} subtitle="نفس صلاحيات لوحة تحكم المؤسس على الموقع" />
        </GlassCard>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{stats.users}</Text>
            <Text style={styles.statLabel}>المستخدمون</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{stats.requests}</Text>
            <Text style={styles.statLabel}>الطلبات</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{stats.products}</Text>
            <Text style={styles.statLabel}>المنتجات</Text>
          </GlassCard>
        </View>

        <SectionTitle title="أقسام الإدارة" subtitle="نفس أقسام لوحة تحكم المؤسس في الموقع" />

        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.key} onPress={() => navigation.navigate(item.screen, item.params)}>
              <GlassCard style={styles.menuCard}>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  logout: { color: theme.colors.primary, fontWeight: '700' },
  heroCard: { marginBottom: theme.spacing.sm },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.colors.primary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  menuCard: { minWidth: '46%' },
  menuTitle: { color: theme.colors.text, fontWeight: '700', textAlign: 'center' },
});
