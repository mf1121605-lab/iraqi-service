import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Payment {
  id: string;
  method: string;
  amount: number;
  notes: string | null;
  created_at: string;
  request: { id: string; title: string } | null;
  employee: { given_name: string | null; family_name: string | null } | null;
  customer: { given_name: string | null; family_name: string | null } | null;
}

type Filter = 'all' | 'week' | 'month';

const METHOD_COLORS: Record<string, string> = {
  zaincash: '#f59e0b', qi_card: '#3b82f6',
};

function filterPayments(payments: Payment[], filter: Filter): Payment[] {
  if (filter === 'all') return payments;
  const now = new Date();
  const cutoff = new Date(now);
  if (filter === 'week') cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(1);
  return payments.filter((p) => new Date(p.created_at) >= cutoff);
}

export default function PaymentsScreen() {
  const { profile, loading } = useAuth();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('request_payments')
      .select('id, method, amount, notes, created_at, request:requests(id, title), employee:profiles!employee_id(given_name, family_name), customer:profiles!customer_id(given_name, family_name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setPayments((data ?? []) as unknown as Payment[]));
  }, [profile]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  const filtered = filterPayments(payments ?? [], filter);
  const total = filtered.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.headerTitle}>سجل المدفوعات</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.filterRow}>
        {([['all', 'الكل'], ['week', 'هذا الأسبوع'], ['month', 'هذا الشهر']] as [Filter, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[s.filterBtn, filter === k && s.filterBtnActive]}>
            <Text style={[s.filterText, filter === k && s.filterTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {payments === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا توجد مدفوعات</Text></View>
        ) : filtered.map((p) => {
          const empName = [p.employee?.given_name, p.employee?.family_name].filter(Boolean).join(' ') || '—';
          const custName = [p.customer?.given_name, p.customer?.family_name].filter(Boolean).join(' ') || '—';
          const mc = METHOD_COLORS[p.method] ?? COLORS.muted;
          return (
            <View key={p.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.amount}>{p.amount?.toLocaleString()} د.ع</Text>
                <View style={[s.methodBadge, { backgroundColor: mc + '20' }]}>
                  <Text style={[s.methodText, { color: mc }]}>{p.method === 'zaincash' ? 'ZainCash' : 'Qi Card'}</Text>
                </View>
              </View>
              <View style={s.row}>
                <Text style={s.label}>الموظف:</Text>
                <Text style={s.value}>{empName}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>الزبون:</Text>
                <Text style={s.value}>{custName}</Text>
              </View>
              {p.request?.title ? (
                <View style={s.row}>
                  <Text style={s.label}>الطلب:</Text>
                  <Text style={s.value} numberOfLines={1}>{p.request.title}</Text>
                </View>
              ) : null}
              <Text style={s.date}>{new Date(p.created_at).toLocaleDateString('ar-IQ')}</Text>
            </View>
          );
        })}

        <View style={s.totalCard}>
          <Text style={s.totalLabel}>المجموع</Text>
          <Text style={s.totalValue}>{total.toLocaleString()} د.ع</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { flex: 1, backgroundColor: COLORS.white06, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  filterBtnActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.goldBorder },
  filterText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  filterTextActive: { color: COLORS.gold },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold },
  methodBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  methodText: { fontFamily: FONTS.bold, fontSize: 11 },
  row: { flexDirection: 'row', gap: 6 },
  label: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  value: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white70, flex: 1, textAlign: 'right' },
  date: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40, textAlign: 'right' },
  totalCard: { backgroundColor: COLORS.goldDim, borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold },
  totalValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
});
