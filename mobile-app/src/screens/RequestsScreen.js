import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import StatusPill from '../components/StatusPill';
import { theme } from '../theme';
import { supabase } from '../services/supabase';
import { getMyProfile } from '../services/auth';

export default function RequestsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    async function loadRequests() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const profile = await getMyProfile();
      let query = supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(8);
      if (profile) {
        query = query.eq('customer_id', profile.id);
      }

      const { data, error } = await query;
      if (!error) {
        setRequests(data || []);
      }
      setLoading(false);
    }

    loadRequests();
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>الطلبات</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>رجوع</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <SectionTitle title="خدمة الطلبات" subtitle="يمكنك متابعة الطلبات الحالية وتسجيل ما يتوافق مع نظام الموقع." />
        </GlassCard>

        {requests.length === 0 ? (
          <GlassCard><Text style={styles.emptyText}>لا توجد طلبات بعد</Text></GlassCard>
        ) : requests.map((item, index) => (
          <Pressable key={`${item.id || 'request'}-${index}`} onPress={() => navigation.navigate('RequestDetail', { request: item })}>
            <GlassCard style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.title || 'طلب جديد'}</Text>
              <Text style={styles.itemText}>{item.description || 'تم استلام الطلب من خلال نفس قاعدة البيانات'}</Text>
              <StatusPill label={item.status || 'قيد المراجعة'} tone={item.status === 'approved' ? 'success' : 'warning'} />
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
      <BottomTabs navigation={navigation} active="Requests" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  heroCard: { marginBottom: theme.spacing.sm },
  heroTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  heroText: { color: theme.colors.muted, lineHeight: 22 },
  emptyText: { color: theme.colors.muted, textAlign: 'center' },
  itemCard: { gap: 4 },
  itemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  itemText: { color: theme.colors.muted, lineHeight: 20 },
  itemMeta: { color: theme.colors.primary, fontWeight: '700', marginTop: 4 },
});
