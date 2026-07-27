import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

interface UserData {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  email: string | null;
  account_status: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad' });
}

export default function FounderUsersData() {
  const { profile, loading } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [users, setUsers] = useState<UserData[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function handleUnlock() {
    if (!passcode.trim()) return;
    setFetching(true); setPasscodeError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${APP_URL}/api/founder/users-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ passcode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasscodeError(json.error === 'invalid_passcode' ? 'كلمة المرور غير صحيحة' : (json.error ?? 'خطأ'));
      } else {
        setUsers((json.users ?? []) as UserData[]);
      }
    } catch {
      setPasscodeError('خطأ في الاتصال');
    }
    setFetching(false);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>🔐 بيانات الأعضاء</Text>
      </View>

      {users === null ? (
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
          <Pressable onPress={handleUnlock} disabled={fetching || !passcode.trim()} style={({ pressed }) => [s.unlockBtn, (fetching || !passcode.trim()) && s.btnDisabled, pressed && { opacity: 0.75 }]}>
            {fetching ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.unlockText}>فتح</Text>}
          </Pressable>
        </View>
      ) : (
        /* Data table */
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.countText}>{users.length} عضو مسجل</Text>
          {users.map((u) => (
            <View key={u.id} style={s.userCard}>
              <View style={s.userTop}>
                <Text style={s.userName}>{[u.given_name, u.family_name].filter(Boolean).join(' ') || '—'}</Text>
                <Text style={[s.statusBadge, { color: u.account_status === 'active' ? '#22c55e' : '#ef4444' }]}>
                  {u.account_status === 'active' ? 'نشط' : (u.account_status ?? '—')}
                </Text>
              </View>
              {u.phone && <Text style={s.userDetail}>📞 {u.phone}</Text>}
              {u.email && <Text style={s.userDetail} numberOfLines={1}>✉ {u.email}</Text>}
              <Text style={s.userDate}>تسجيل: {formatDate(u.created_at)}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
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
  scroll: { padding: 16, gap: 10 },
  countText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'right', marginBottom: 4 },
  userCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 4 },
  userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  statusBadge: { fontFamily: FONTS.bold, fontSize: 11 },
  userDetail: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  userDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40 },
});
