import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import StatusPill from '../components/StatusPill';
import { theme } from '../theme';
import { supabase } from '../services/supabase';
import { formatFullName, getMyProfile, signOut } from '../services/auth';

export default function EmployeeDashboardScreen({ navigation }) {
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
          .select('id, title, description, status')
          .eq('assigned_employee_id', myProfile.id)
          .order('created_at', { ascending: false })
          .limit(10);
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>لوحة الموظف</Text>
          <Pressable onPress={handleLogout}>
            <Text style={styles.logout}>تسجيل الخروج</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <SectionTitle title={formatFullName(profile)} subtitle="الطلبات المسندة إليك من نفس نظام الموقع" />
        </GlassCard>

        {requests.length === 0 ? (
          <GlassCard><Text style={styles.emptyText}>لا توجد طلبات مسندة إليك حاليًا</Text></GlassCard>
        ) : requests.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowText}>{item.description || 'بدون وصف إضافي'}</Text>
            <StatusPill label={item.status} tone={item.status === 'completed' ? 'success' : 'warning'} />
          </GlassCard>
        ))}
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
  emptyText: { color: theme.colors.muted, textAlign: 'center' },
  row: { gap: 4 },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  rowText: { color: theme.colors.muted, lineHeight: 20 },
});
