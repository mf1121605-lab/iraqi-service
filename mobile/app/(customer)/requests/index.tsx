import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'قيد الانتظار', color: '#f59e0b' },
  in_progress: { label: 'جارٍ المعالجة', color: '#3b82f6' },
  completed:   { label: 'مكتملة',        color: '#22c55e' },
  cancelled:   { label: 'ملغية',         color: '#ef4444' },
};

const CAT_LABELS: Record<string, string> = {
  military:  'الخدمات العسكرية',
  education: 'الخدمات الدراسية',
  welfare:   'الرعاية الاجتماعية',
  general:   'خدمات أخرى',
};

type Request = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
};

export default function RequestsList() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('requests')
      .select('id, title, category, status, created_at')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setRequests(data);
    setLoading(false);
    setRefreshing(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Baghdad',
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>طلباتي</Text>
          <GoldButton
            label="+ طلب جديد"
            onPress={() => router.push('/(customer)/requests/new')}
            style={styles.newBtn}
            small
          />
        </View>

        {requests.length === 0 ? (
          <GoldCard style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>لا توجد طلبات مسجلة بعد</Text>
            <GoldButton
              label="أرسل أول طلب"
              onPress={() => router.push('/(customer)/requests/new')}
            />
          </GoldCard>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const st = STATUS_LABELS[req.status] ?? { label: req.status, color: COLORS.muted };
              return (
                <Pressable
                  key={req.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => router.push({ pathname: '/(customer)/requests/[id]', params: { id: req.id } })}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{req.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '22', borderColor: st.color + '55' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardCat}>{CAT_LABELS[req.category] ?? req.category}</Text>
                    <Text style={styles.cardDate}>{formatDate(req.created_at)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  newBtn: { paddingHorizontal: 14, height: 36 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.muted },
  list: { gap: 10 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.2)',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 8,
  },
  cardPressed: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCat: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  cardDate: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
});
