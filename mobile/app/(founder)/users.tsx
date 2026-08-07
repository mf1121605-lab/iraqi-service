import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

interface UserProfile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  account_status: string;
  role: string;
  admin_level: string | null;
  created_at: string;
}

type TabKey = 'customers' | 'employees';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', suspended: '#ef4444', pending: '#f59e0b',
};

export default function UsersScreen() {
  const { profile, loading, session } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [tab, setTab] = useState<TabKey>('customers');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, given_name, family_name, phone, account_status, role, admin_level, created_at')
      .in('role', ['customer', 'employee'])
      .order('created_at', { ascending: false });
    setUsers((data ?? []) as UserProfile[]);
  }

  useEffect(() => { if (profile) loadUsers(); }, [profile]);

  async function callAction(userId: string, action: string) {
    if (!session) return;
    setActionLoading(userId + action);
    try {
      const res = await fetch(`${APP_URL}/api/founder/manage-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ targetUserId: userId, action }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty */ }
      if (!res.ok) {
        Alert.alert('تعذّر تنفيذ العملية', (data.error as string) || `خطأ ${res.status}`);
        return;
      }
      await loadUsers();
    } catch (err) {
      Alert.alert('تعذّر تنفيذ العملية', err instanceof Error ? err.message : 'تعذر الاتصال بالخادم');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  const filtered = (users ?? []).filter((u) => tab === 'customers' ? u.role === 'customer' : u.role === 'employee');

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>›</Text>
        </Pressable>
        <Text style={s.headerTitle}>إدارة الأعضاء</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabs}>
        {([['customers', 'الأعضاء'], ['employees', 'الموظفون']] as [TabKey, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {users === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا يوجد مستخدمون</Text></View>
        ) : filtered.map((u) => {
          const name = [u.given_name, u.family_name].filter(Boolean).join(' ') || '—';
          const isLoading = (k: string) => actionLoading === u.id + k;
          return (
            <View key={u.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[u.account_status] ?? COLORS.muted) + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLORS[u.account_status] ?? COLORS.muted }]}>{u.account_status}</Text>
                </View>
                <Text style={s.userName}>{name}</Text>
              </View>
              <Text style={s.phone}>{u.phone ?? 'لا يوجد رقم'}</Text>
              {u.admin_level === 'co_admin' && <Text style={s.coAdminTag}>مشرف مشارك</Text>}
              <View style={s.actions}>
                {u.role === 'customer' ? (
                  <Pressable onPress={() => callAction(u.id, 'promote_employee')} style={s.actionBtn} disabled={!!actionLoading}>
                    <Text style={s.actionText}>{isLoading('promote_employee') ? '...' : 'ترقية لموظف'}</Text>
                  </Pressable>
                ) : u.admin_level !== 'co_admin' && (
                  <Pressable onPress={() => callAction(u.id, 'demote_customer')} style={[s.actionBtn, s.actionBtnRed]} disabled={!!actionLoading}>
                    <Text style={[s.actionText, { color: '#ef4444' }]}>{isLoading('demote_customer') ? '...' : 'خفض لعضو'}</Text>
                  </Pressable>
                )}
                {u.account_status === 'active' ? (
                  <Pressable onPress={() => callAction(u.id, 'suspend')} style={[s.actionBtn, s.actionBtnRed]} disabled={!!actionLoading}>
                    <Text style={[s.actionText, { color: '#ef4444' }]}>{isLoading('suspend') ? '...' : 'تعليق'}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => callAction(u.id, 'activate')} style={[s.actionBtn, s.actionBtnGreen]} disabled={!!actionLoading}>
                    <Text style={[s.actionText, { color: '#22c55e' }]}>{isLoading('activate') ? '...' : 'تفعيل'}</Text>
                  </Pressable>
                )}
              </View>
              {/* Promote employee → co_admin: opens the founder panel for them on next app launch */}
              {u.role === 'employee' && (
                <Pressable
                  onPress={() => callAction(u.id, u.admin_level === 'co_admin' ? 'remove_co_admin' : 'assign_co_admin')}
                  disabled={!!actionLoading}
                  style={[s.coAdminBtn, u.admin_level === 'co_admin' && s.coAdminBtnActive]}
                >
                  <Text style={[s.coAdminBtnText, { color: u.admin_level === 'co_admin' ? COLORS.gold : COLORS.muted }]}>
                    {isLoading('assign_co_admin') || isLoading('remove_co_admin') ? '...' : u.admin_level === 'co_admin' ? 'إلغاء الإشراف' : 'ترقية إلى مشرف'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
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
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white06, borderRadius: RADIUS.lg, margin: 16, marginTop: 0, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.goldDim },
  tabText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white40 },
  tabTextActive: { color: COLORS.gold },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  phone: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingVertical: 7, alignItems: 'center' },
  actionBtnRed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  actionBtnGreen: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  actionText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  coAdminTag: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  coAdminBtn: { borderRadius: RADIUS.sm, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  coAdminBtnActive: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldDim },
  coAdminBtnText: { fontFamily: FONTS.bold, fontSize: 12 },
});
