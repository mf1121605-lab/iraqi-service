import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
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

// Matches the real request_status enum (submitted/in_review/needs_changes/
// approved/rejected) — see (customer)/requests/[id].tsx for the same fix.
const STATUS_COLORS: Record<string, string> = {
  submitted: '#f59e0b', in_review: '#3b82f6', needs_changes: '#f97316',
  approved: '#22c55e', rejected: '#ef4444',
};

// `founderOnly` marks tools a co_admin supervisor must not reach:
//  - settings   holds the nuclear lockdown / data wipe
//  - users-data is the passcode-gated raw customer PII export
//  - audit-log  is the oversight trail on the supervisors themselves
// Everything else is shared. This is a UI gate for clarity; the real
// enforcement stays in Postgres RLS, which already distinguishes
// is_founder() from is_co_admin().
const NAV_ITEMS: { label: string; route: string; icon: string; founderOnly?: boolean }[] = [
  { label: 'الأعضاء', route: '/(founder)/users', icon: '👥' },
  { label: 'الموظفون', route: '/(founder)/employees', icon: '🧑‍💼' },
  { label: 'التصنيفات', route: '/(founder)/categories', icon: '🗂️' },
  { label: 'خدمات التصنيف', route: '/(founder)/category-services', icon: '📋' },
  { label: 'المدفوعات', route: '/(founder)/payments', icon: '💰' },
  { label: 'الإحصائيات', route: '/(founder)/stats', icon: '📊' },
  { label: 'الإعدادات', route: '/(founder)/settings', icon: '⚙️', founderOnly: true },
  { label: 'الإعلانات', route: '/(founder)/banners', icon: '📢' },
  { label: 'غرف الدردشة', route: '/(founder)/chat-rooms', icon: '💬' },
  { label: 'المنتجات', route: '/(founder)/products', icon: '📦' },
  { label: 'سجل المراقبة', route: '/(founder)/audit-log', icon: '🔍', founderOnly: true },
  { label: 'الطلبات السريعة', route: '/(founder)/quick-requests', icon: '⚡' },
  { label: 'بيانات الأعضاء', route: '/(founder)/users-data', icon: '🔐', founderOnly: true },
  { label: 'روابط الأخبار', route: '/(hq)/news-links', icon: '🔗' },
  { label: 'أخبار عاجلة', route: '/(hq)/urgent-news', icon: '🚨' },
  { label: 'المنشورات', route: '/(hq)/social-posts', icon: '📰' },
];

interface PendingPost {
  id: string;
  content: string | null;
  created_at: string;
  author: { given_name: string | null; family_name: string | null } | null;
}

export default function FounderDashboard() {
  const { profile, loading, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [actingPost, setActingPost] = useState<string | null>(null);

  // A co_admin is an employee the founder promoted — same panel, but the
  // founder-only tools above are hidden and the panel names itself honestly.
  const isSupervisor = !!profile && profile.role !== 'founder';
  const navItems = NAV_ITEMS.filter((i) => !i.founderOnly || !isSupervisor);

  async function loadPendingPosts() {
    const { data } = await supabase
      .from('social_posts')
      .select('id, content, created_at, author:profiles!author_id(given_name, family_name)')
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .limit(10);
    setPendingPosts((data ?? []) as unknown as PendingPost[]);
  }

  async function decidePost(id: string, approve: boolean) {
    setActingPost(id);
    if (approve) await supabase.from('social_posts').update({ approved: true }).eq('id', id);
    else await supabase.from('social_posts').delete().eq('id', id);
    setActingPost(null);
    setPendingPosts((cur) => cur.filter((p) => p.id !== id));
  }

  useEffect(() => {
    if (!profile) return;
    loadPendingPosts();
    // Keeps the queue live so a supervisor sitting on this screen sees a new
    // submission without pulling to refresh.
    const channel = supabase
      .channel('founder-pending-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadPendingPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

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
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <Image source={require('@/assets/full-logo-transparent.png')} style={s.headerLogo} contentFit="contain" />
            <Text style={s.headerTitle}>{isSupervisor ? 'لوحة المشرف' : 'لوحة المؤسس'}</Text>
          </View>
          <Pressable onPress={signOut} style={s.logoutBtn}>
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

        {/* ── Pending moderation queue ───────────────────────────────
            Shown identically to the founder and to supervisors. The full
            list with filters lives at /(hq)/social-posts; this is the
            at-a-glance queue so a pending post is never missed. */}
        <View style={s.sectionHeadRow}>
          {pendingPosts.length > 0 && (
            <View style={s.pendingCountBadge}>
              <Text style={s.pendingCountText}>{pendingPosts.length}</Text>
            </View>
          )}
          <Text style={s.sectionTitle}>المنشورات بانتظار الموافقة</Text>
        </View>
        <View style={s.card}>
          {pendingPosts.length === 0 ? (
            <Text style={s.emptyText}>لا توجد منشورات بانتظار الموافقة</Text>
          ) : pendingPosts.map((post) => (
            <View key={post.id} style={s.pendingRow}>
              <Text style={s.pendingAuthor}>
                {[post.author?.given_name, post.author?.family_name].filter(Boolean).join(' ') || 'عضو'}
              </Text>
              <Text style={s.pendingBody} numberOfLines={3}>
                {post.content?.trim() || '(منشور بصورة/فيديو بدون نص)'}
              </Text>
              <View style={s.pendingActions}>
                <Pressable
                  onPress={() => decidePost(post.id, true)}
                  disabled={actingPost === post.id}
                  style={({ pressed }) => [s.approveBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text style={s.approveText}>
                    {actingPost === post.id ? '...' : '✓ موافقة'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => decidePost(post.id, false)}
                  disabled={actingPost === post.id}
                  style={({ pressed }) => [s.rejectBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text style={s.rejectText}>
                    {actingPost === post.id ? '...' : '✕ رفض'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>التنقل السريع</Text>
        <View style={s.navGrid}>
          {navItems.map((item) => (
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32 * (823 / 900) },
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

  // Pending moderation queue
  sectionHeadRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  pendingCountBadge: {
    backgroundColor: '#f59e0b', borderRadius: 10, minWidth: 20,
    paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center', justifyContent: 'center',
  },
  pendingCountText: { fontFamily: FONTS.bold, fontSize: 11, color: '#0d1117' },
  pendingRow: {
    gap: 6, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.cardBorder,
  },
  pendingAuthor: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold, textAlign: 'right' },
  pendingBody: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white, textAlign: 'right', lineHeight: 19 },
  pendingActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  approveBtn: {
    flex: 1, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center',
  },
  approveText: { fontFamily: FONTS.bold, fontSize: 12, color: '#22c55e' },
  rejectBtn: {
    flex: 1, backgroundColor: 'rgba(239,68,68,0.13)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center',
  },
  rejectText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },
});
