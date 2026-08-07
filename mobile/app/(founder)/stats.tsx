import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Tally { [key: string]: number }

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', in_review: '#8b5cf6',
  needs_changes: '#f97316', approved: '#22c55e', rejected: '#ef4444',
  completed: '#22c55e', cancelled: '#6b7280',
};
const ROLE_COLORS: Record<string, string> = { customer: '#3b82f6', employee: '#22c55e', founder: COLORS.gold };
const METHOD_COLORS: Record<string, string> = { zaincash: '#f59e0b', qi_card: '#3b82f6' };

function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={sb.row}>
      <Text style={sb.label}>{label}</Text>
      <View style={sb.barBg}>
        <View style={[sb.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[sb.count, { color }]}>{count}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  row: { gap: 4 },
  label: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70, textAlign: 'right' },
  barBg: { height: 8, backgroundColor: COLORS.white10, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  count: { fontFamily: FONTS.bold, fontSize: 12, textAlign: 'right' },
});

export default function StatsScreen() {
  const { profile, loading } = useAuth();
  const [statusTally, setStatusTally] = useState<Tally | null>(null);
  const [roleTally, setRoleTally] = useState<Tally | null>(null);
  const [methodTally, setMethodTally] = useState<{ method: string; total: number }[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [reqRes, profRes, payRes] = await Promise.all([
        supabase.from('requests').select('status'),
        supabase.from('profiles').select('role'),
        supabase.from('request_payments').select('method, amount'),
      ]);

      const sCount: Tally = {};
      (reqRes.data ?? []).forEach((r: { status: string }) => { sCount[r.status] = (sCount[r.status] ?? 0) + 1; });
      setStatusTally(sCount);

      const rCount: Tally = {};
      (profRes.data ?? []).forEach((r: { role: string }) => { rCount[r.role] = (rCount[r.role] ?? 0) + 1; });
      setRoleTally(rCount);

      const mSum: Tally = {};
      (payRes.data ?? []).forEach((r: { method: string; amount: number | null }) => {
        mSum[r.method] = (mSum[r.method] ?? 0) + (r.amount ?? 0);
      });
      setMethodTally(Object.entries(mSum).map(([method, total]) => ({ method, total })));
    })();
  }, [profile]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  const statusTotal = statusTally ? Object.values(statusTally).reduce((a, b) => a + b, 0) : 0;
  const roleTotal = roleTally ? Object.values(roleTally).reduce((a, b) => a + b, 0) : 0;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}><Text style={s.backArrow}>›</Text></Pressable>
        <Text style={s.headerTitle}>الإحصائيات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.cardTitle}>حالات الطلبات</Text>
          {statusTally === null ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : Object.entries(statusTally).map(([status, count]) => (
            <StatBar key={status} label={status} count={count} total={statusTotal} color={STATUS_COLORS[status] ?? COLORS.muted} />
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>توزيع المستخدمين</Text>
          {roleTally === null ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : Object.entries(roleTally).map(([role, count]) => (
            <StatBar key={role} label={role} count={count} total={roleTotal} color={ROLE_COLORS[role] ?? COLORS.muted} />
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>إيرادات حسب طريقة الدفع</Text>
          {methodTally === null ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : methodTally.length === 0 ? (
            <Text style={s.emptyText}>لا توجد مدفوعات بعد</Text>
          ) : methodTally.map(({ method, total }) => {
            const mc = METHOD_COLORS[method] ?? COLORS.muted;
            return (
              <View key={method} style={s.methodRow}>
                <View style={[s.methodBadge, { backgroundColor: mc + '20' }]}>
                  <Text style={[s.methodText, { color: mc }]}>{method === 'zaincash' ? 'ZainCash' : 'Qi Card'}</Text>
                </View>
                <Text style={[s.methodTotal, { color: mc }]}>{total.toLocaleString()} د.ع</Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  scroll: { padding: 16, paddingTop: 0, gap: 14 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  methodText: { fontFamily: FONTS.bold, fontSize: 12 },
  methodTotal: { fontFamily: FONTS.bold, fontSize: 14 },
});
