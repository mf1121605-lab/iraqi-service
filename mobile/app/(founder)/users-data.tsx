import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

interface CustomerData {
  id: string;
  given_name: string | null;
  family_name: string | null;
  username: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_active_at: string | null;
}

interface EmployeeData {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  account_status: string | null;
  created_at: string;
  last_login_at: string | null;
  last_active_at: string | null;
}

interface LoginEntry {
  id: string;
  logged_at: string;
  ip_address: string | null;
}

type TabKey = 'customers' | 'employees';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' });
}

function isOnline(lastActiveAt: string | null) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

async function callFounderApi(path: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession();
  try {
    const response = await fetch(`${APP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, payload: await response.json().catch(() => ({})) };
  } catch {
    return { ok: false, payload: {} };
  }
}

export default function FounderUsersData() {
  const { profile, loading } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [data, setData] = useState<{ customers: CustomerData[]; employees: EmployeeData[] } | null>(null);
  const [tab, setTab] = useState<TabKey>('customers');
  const [activityUser, setActivityUser] = useState<{ id: string; name: string } | null>(null);
  const [activityLogins, setActivityLogins] = useState<LoginEntry[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  async function handleUnlock() {
    if (!passcode.trim()) return;
    setFetching(true);
    setPasscodeError('');
    const { ok, payload } = await callFounderApi('/api/founder/users-list', { passcode });
    if (!ok) {
      setPasscodeError(payload.error === 'invalid_passcode' ? 'كلمة المرور غير صحيحة' : (payload.error ?? 'خطأ في الاتصال'));
    } else {
      setData({ customers: payload.customers ?? [], employees: payload.employees ?? [] });
    }
    setFetching(false);
  }

  async function openActivityLog(user: { id: string; name: string }) {
    setActivityUser(user);
    setActivityLogins(null);
    setActivityLoading(true);
    const { ok, payload } = await callFounderApi('/api/founder/user-activity', { userId: user.id });
    setActivityLogins(ok ? (payload.logins ?? []) : []);
    setActivityLoading(false);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>›</Text>
        </Pressable>
        <Text style={s.title}>🔐 بيانات الأعضاء</Text>
      </View>

      {data === null ? (
        /* Passcode gate */
        <View style={s.gateContainer}>
          <Text style={s.gateIcon}>🔐</Text>
          <Text style={s.gateTitle}>منطقة محمية</Text>
          <Text style={s.gateDesc}>أدخل كلمة المرور السرية للوصول إلى بيانات الأعضاء</Text>
          <View style={s.passRow}>
            <TextInput
              style={s.passInput}
              value={passcode}
              onChangeText={setPasscode}
              placeholder="كلمة المرور"
              placeholderTextColor={COLORS.muted}
              secureTextEntry={!revealed}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setRevealed(v => !v)} style={s.eyeBtn} hitSlop={8}>
              <Text style={s.eyeIcon}>{revealed ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>
          {passcodeError ? <Text style={s.error}>{passcodeError}</Text> : null}
          <Pressable onPress={handleUnlock} disabled={fetching || !passcode.trim()}
            style={[s.unlockBtn, (fetching || !passcode.trim()) && s.btnDisabled]}>
            {fetching ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.unlockText}>فتح</Text>}
          </Pressable>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <View style={s.tabs}>
            {([['customers', `الأعضاء (${data.customers.length})`], ['employees', `الموظفون (${data.employees.length})`]] as [TabKey, string][]).map(([key, label]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}>
                <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {tab === 'customers' ? (
              data.customers.length === 0 ? (
                <View style={s.empty}><Text style={s.emptyText}>لا يوجد أعضاء</Text></View>
              ) : data.customers.map((u) => {
                const name = [u.given_name, u.family_name].filter(Boolean).join(' ') || '—';
                const online = isOnline(u.last_active_at);
                return (
                  <View key={u.id} style={s.userCard}>
                    <View style={s.userTop}>
                      <Pressable onPress={() => openActivityLog({ id: u.id, name })} style={s.logBtn}>
                        <Text style={s.logBtnText}>📋 السجل</Text>
                      </Pressable>
                      <Text style={s.userName}>{name}</Text>
                    </View>
                    {u.username ? <Text style={s.userDetail}>@{u.username}</Text> : null}
                    {u.phone ? <Text style={s.userDetail}>📞 {u.phone}</Text> : null}
                    {u.email ? <Text style={s.userDetail} numberOfLines={1}>✉ {u.email}</Text> : null}
                    <View style={s.userBottom}>
                      <Text style={s.userDate}>تسجيل: {formatDate(u.created_at)}</Text>
                      <View style={s.presenceRow}>
                        <View style={[s.presenceDot, { backgroundColor: online ? '#22c55e' : COLORS.white20 }]} />
                        <Text style={[s.presenceText, online && { color: '#22c55e' }]}>
                          {online ? 'متصل' : u.last_active_at ? `آخر ظهور: ${formatDate(u.last_active_at)}` : 'لم يتصل'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              data.employees.length === 0 ? (
                <View style={s.empty}><Text style={s.emptyText}>لا يوجد موظفون</Text></View>
              ) : data.employees.map((u) => {
                const name = [u.given_name, u.family_name].filter(Boolean).join(' ') || '—';
                const online = isOnline(u.last_active_at);
                return (
                  <View key={u.id} style={s.userCard}>
                    <View style={s.userTop}>
                      <Pressable onPress={() => openActivityLog({ id: u.id, name })} style={s.logBtn}>
                        <Text style={s.logBtnText}>📋 السجل</Text>
                      </Pressable>
                      <View style={s.userTopRight}>
                        <Text style={[s.statusBadge, { color: u.account_status === 'active' ? '#22c55e' : '#ef4444' }]}>
                          {u.account_status === 'active' ? 'نشط' : (u.account_status ?? '—')}
                        </Text>
                        <Text style={s.userName}>{name}</Text>
                      </View>
                    </View>
                    {u.phone ? <Text style={s.userDetail}>📞 {u.phone}</Text> : null}
                    {u.last_login_at ? (
                      <Text style={s.userDetail}>آخر تسجيل دخول: {formatDate(u.last_login_at)}</Text>
                    ) : null}
                    <View style={s.userBottom}>
                      <Text style={s.userDate}>تسجيل: {formatDate(u.created_at)}</Text>
                      <View style={s.presenceRow}>
                        <View style={[s.presenceDot, { backgroundColor: online ? '#22c55e' : COLORS.white20 }]} />
                        <Text style={[s.presenceText, online && { color: '#22c55e' }]}>
                          {online ? 'متصل الآن' : u.last_active_at ? `${formatDate(u.last_active_at)}` : 'لم يتصل'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* Activity Log Modal */}
      <Modal visible={!!activityUser} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Pressable onPress={() => { setActivityUser(null); setActivityLogins(null); }} hitSlop={8}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
              <Text style={s.modalTitle}>سجل تسجيل الدخول — {activityUser?.name}</Text>
            </View>
            {activityLoading ? (
              <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
            ) : activityLogins === null ? null : activityLogins.length === 0 ? (
              <Text style={s.emptyText}>لا يوجد سجل دخول</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {activityLogins.map((entry, i) => (
                  <View key={entry.id} style={s.loginRow}>
                    <Text style={s.loginIndex}>{i + 1}</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.loginDate}>{formatDate(entry.logged_at)}</Text>
                      {entry.ip_address ? (
                        <Text style={s.loginIp}>IP: {entry.ip_address}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white, textAlign: 'right' },
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gateIcon: { fontSize: 48 },
  gateTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  gateDesc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  passRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  passInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 18 },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  unlockBtn: { width: '100%', backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  unlockText: { fontFamily: FONTS.bold, fontSize: 15, color: '#000' },
  btnDisabled: { opacity: 0.4 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white06, borderRadius: RADIUS.lg, margin: 16, marginTop: 4, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.goldDim },
  tabText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white40 },
  tabTextActive: { color: COLORS.gold },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  userCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 5 },
  userTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  statusBadge: { fontFamily: FONTS.bold, fontSize: 11 },
  userDetail: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  userBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  userDate: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.white40 },
  presenceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  presenceDot: { width: 7, height: 7, borderRadius: 4 },
  presenceText: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.white40 },
  logBtn: { backgroundColor: 'rgba(230,171,44,0.08)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  logBtnText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.gold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0d1117', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: COLORS.goldBorder },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right', marginLeft: 8 },
  modalClose: { fontSize: 18, color: COLORS.muted, padding: 4 },
  loginRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  loginIndex: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.muted, width: 24, textAlign: 'center', paddingTop: 2 },
  loginDate: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white },
  loginIp: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
});
