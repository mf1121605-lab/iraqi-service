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
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'قيد الانتظار', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_progress: { label: 'جارٍ المعالجة', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed:   { label: 'مكتملة',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  cancelled:   { label: 'ملغية',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
};

const CAT_META: Record<string, { label: string; emoji: string; accent: string }> = {
  military:  { label: 'الخدمات العسكرية',   emoji: '🪖', accent: '#7da9cc' },
  education: { label: 'الخدمات الدراسية',    emoji: '🎓', accent: '#4f8bff' },
  welfare:   { label: 'الرعاية الاجتماعية',  emoji: '❤️', accent: '#e14b6a' },
  general:   { label: 'خدمات أخرى',           emoji: '⭐', accent: '#e6ab2c' },
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

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Baghdad',
    });
  }

  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>طلباتي</Text>
            {pendingCount > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{pendingCount} نشط</Text>
              </View>
            )}
          </View>

          {/* New request CTA */}
          <Pressable
            style={({ pressed }) => [styles.newRequestBtn, pressed && styles.newRequestBtnPressed]}
            onPress={() => router.push('/(customer)/requests/new')}
          >
            <LinearGradient
              colors={['#e6ab2c', '#c9882a']}
              style={styles.newRequestGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.newRequestText}>+ طلب جديد</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات مسجلة بعد</Text>
            <Text style={styles.emptySubtitle}>أرسل طلبك الأول وسيتولى أحد موظفينا معالجته</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(customer)/requests/new')}
            >
              <Text style={styles.emptyBtnText}>أرسل أول طلب</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const st = STATUS_META[req.status] ?? { label: req.status, color: COLORS.muted, bg: COLORS.white10 };
              const cat = CAT_META[req.category] ?? { label: req.category, emoji: '📁', accent: COLORS.gold };
              return (
                <Pressable
                  key={req.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => router.push({ pathname: '/(customer)/requests/[id]', params: { id: req.id } })}
                >
                  {/* Category accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: cat.accent }]} />

                  <View style={styles.cardInner}>
                    {/* Top row: title + status badge */}
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{req.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.color + '55' }]}>
                        <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* Bottom row: category + date */}
                    <View style={styles.cardBottom}>
                      <Text style={styles.cardDate}>{formatDate(req.created_at)}</Text>
                      <View style={styles.catChip}>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, { color: cat.accent }]}>{cat.label}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },

  pageHeader: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.white },
  activeBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: '#3b82f6' },

  newRequestBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  newRequestBtnPressed: { opacity: 0.8 },
  newRequestGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRequestText: { fontFamily: FONTS.bold, fontSize: 15, color: '#000' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.12)',
    padding: 24,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },

  list: { gap: 10 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.75 },
  accentBar: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 8 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catEmoji: { fontSize: 13 },
  catLabel: { fontFamily: FONTS.regular, fontSize: 12 },
});
