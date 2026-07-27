import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Stats {
  totalUsers: number;
  totalRequests: number;
  totalEmployees: number;
  revenue: number;
}

interface RecentEmployee {
  id: string;
  given_name: string | null;
  family_name: string | null;
  specialization: string | null;
  created_at: string;
}

interface RecentRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', completed: '#22c55e',
  cancelled: '#6b7280', rejected: '#ef4444', approved: '#22c55e',
};

const NAV_ITEMS = [
  { label: 'الأعضاء', route: '/(founder)/users', icon: '👥' },
  { label: 'الموظفون', route: '/(founder)/employees', icon: '🧑‍💼' },
  { label: 'التصنيفات', route: '/(founder)/categories', icon: '🗂️' },
  { label: 'خدمات التصنيف', route: '/(founder)/category-services', icon: '📋' },
  { label: 'المدفوعات', route: '/(founder)/payments', icon: '💰' },
  { label: 'الإحصائيات', route: '/(founder)/stats', icon: '📊' },
  { label: 'الإعدادات', route: '/(founder)/settings', icon: '⚙️' },
  { label: 'الإعلانات', route: '/(founder)/banners', icon: '📢' },
  { label: 'غرف الدردشة', route: '/(founder)/chat-rooms', icon: '💬' },
  { label: 'المنتجات', route: '/(founder)/products', icon: '📦' },
  { label: 'سجل المراقبة', route: '/(founder)/audit-log', icon: '🔍' },
  { label: 'الطلبات السريعة', route: '/(founder)/quick-requests', icon: '⚡' },
  { label: 'بيانات الأعضاء', route: '/(founder)/users-data', icon: '🔐' },
];

export default function FounderDashboard() {
  const { profile, loading, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [usersRes, requestsRes, employeesRes, revenueRes, empListRes, reqListRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('requests').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employee'),
        supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
        supabase.from('profiles').select('id, given_name, family_name, specialization, created_at').eq('role', 'employee').order('created_at', { ascending: false }).limit(5),
        supabase.from('requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      const revenue = (revenueRes.data ?? []).reduce((sum: number, o: { total_price: number | null }) => sum + (o.total_price ?? 0), 0);
      setStats({
        totalUsers: usersRes.count ?? 0,
        totalRequests: requestsRes.count ?? 0,
        totalEmployees: employeesRes.count ?? 0,
        revenue,
      });
      setRecentEmployees((empListRes.data ?? []) as RecentEmployee[]);
      setRecentRequests((reqListRes.data ?? []) as RecentRequest[]);
    })();
  }, [profile]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.headerTitle}>لوحة المؤسس</Text>
          <Pressable onPress={async () => { await signOut(); router.replace('/'); }} style={s.logoutBtn}>
            <Text style={s.logoutText}>خروج</Text>
          </Pressable>
        </View>

        {stats ? (
          <View style={s.statsGrid}>
            {[
              { label: 'الأعضاء', value: stats.totalUsers, icon: '👥' },
              { label: 'الطلبات', value: stats.totalRequests, icon: '📋' },
              { label: 'الموظفون', value: stats.totalEmployees, icon: '🧑‍💼' },
              { label: 'الإيرادات', value: `${stats.revenue.toLocaleString()} د.ع`, icon: '💰' },
            ].map((item) => (
              <View key={item.label} style={s.statCard}>
                <Text style={s.statIcon}>{item.icon}</Text>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.loadingRow}><ActivityIndicator color={COLORS.gold} /></View>
        )}

        <Text style={s.sectionTitle}>التنقل السريع</Text>
        <View style={s.navGrid}>
          {NAV_ITEMS.map((item) => (
            <Pressable key={item.route} onPress={() => router.push(item.route as never)} style={({ pressed }) => [s.navBtn, pressed && { opacity: 0.75 }]}>
              <Text style={s.navIcon}>{item.icon}</Text>
              <Text style={s.navLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionTitle}>آخر الموظفين</Text>
        <View style={s.card}>
          {recentEmployees.length === 0 ? (
            <Text style={s.emptyText}>لا يوجد موظفون بعد</Text>
          ) : recentEmployees.map((emp) => (
            <View key={emp.id} style={s.listRow}>
              <Text style={s.listName}>{[emp.given_name, emp.family_name].filter(Boolean).join(' ') || '—'}</Text>
              <Text style={s.listSub}>{emp.specialization ?? 'بدون تخصص'}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>آخر الطلبات</Text>
        <View style={s.card}>
          {recentRequests.length === 0 ? (
            <Text style={s.emptyText}>لا توجد طلبات بعد</Text>
          ) : recentRequests.map((req) => (
            <View key={req.id} style={s.listRow}>
              <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[req.status] ?? COLORS.muted }]} />
              <Text style={s.listName} numberOfLines={1}>{req.title}</Text>
              <Text style={[s.statusText, { color: STATUS_COLORS[req.status] ?? COLORS.muted }]}>{req.status}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 7 },
  logoutText: { fontFamily: FONTS.bold, fontSize: 13, color: '#ef4444' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 22 },
  statValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  loadingRow: { height: 80, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white70, textAlign: 'right' },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  navBtn: { width: '30%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', gap: 5 },
  navIcon: { fontSize: 20 },
  navLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white70, textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listName: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, flex: 1, textAlign: 'right' },
  listSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },
});
