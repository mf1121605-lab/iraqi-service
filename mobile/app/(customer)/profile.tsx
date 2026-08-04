import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldInput } from '@/components/ui/GoldInput';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const BIO_MAX = 150;

type Tab = 'info' | 'password';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Info tab state ──
  const [givenName, setGivenName]   = useState(profile?.given_name  ?? '');
  const [familyName, setFamilyName] = useState(profile?.family_name ?? '');
  const [phone, setPhone]           = useState(profile?.phone       ?? '');
  const [bio, setBio]               = useState(profile?.bio ?? '');

  // Sync editable fields when profile data arrives or changes
  useEffect(() => {
    if (!profile) return;
    setGivenName(profile.given_name  ?? '');
    setFamilyName(profile.family_name ?? '');
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
  }, [profile?.id]);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError]   = useState('');
  const [infoSaved, setInfoSaved]   = useState(false);

  // ── Password tab state ──
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwError, setPwError]       = useState('');
  const [pwSaved, setPwSaved]       = useState(false);

  const givenNameDisplay  = profile?.given_name  ?? '';
  const familyNameDisplay = profile?.family_name ?? '';
  const fullName  = [givenNameDisplay, familyNameDisplay].filter(Boolean).join(' ') || '—';
  const initials  = [givenNameDisplay[0], familyNameDisplay[0]].filter(Boolean).join('').toUpperCase() || '?';
  const isActive  = profile?.account_status === 'active';

  function handleSignOut() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'حذف الحساب نهائياً',
      'سيتم حذف حسابك وكل بياناتك (الطلبات، الرسائل، المنشورات) بشكل نهائي ولا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            setDeleteError('');
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.access_token) {
              setDeleteError('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
              return;
            }
            const appUrl = process.env.EXPO_PUBLIC_APP_URL;
            if (!appUrl) {
              setDeleteError('خطأ في الإعداد: EXPO_PUBLIC_APP_URL غير محدد');
              return;
            }
            setDeletingAccount(true);
            try {
              const res = await fetch(`${appUrl}/api/customer/delete-account`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${currentSession.access_token}` },
              });
              let data: Record<string, unknown> = {};
              try { data = await res.json(); } catch { /* empty */ }
              if (!res.ok) {
                setDeleteError((data.error as string) || `خطأ ${res.status}`);
                setDeletingAccount(false);
                return;
              }
              await signOut();
            } catch (err: unknown) {
              setDeleteError(err instanceof Error ? err.message : 'تعذّر الاتصال بالخادم');
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  async function handleSaveInfo() {
    setInfoError('');
    setInfoSaved(false);
    if (!givenName.trim() || !familyName.trim()) {
      setInfoError('يرجى تعبئة الاسم الكامل واللقب');
      return;
    }
    if (!profile?.id) return;

    setInfoSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        given_name:  givenName.trim(),
        family_name: familyName.trim(),
        phone:       phone.trim() || null,
        bio:         bio.trim() || null,
      })
      .eq('id', profile.id);
    setInfoSaving(false);

    if (error) {
      setInfoError(error.message || 'حدث خطأ أثناء الحفظ');
      return;
    }
    setInfoSaved(true);
    await refreshProfile();
  }

  async function handleChangePassword() {
    setPwError('');
    setPwSaved(false);
    if (newPw.length < 8) {
      setPwError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!currentPw) {
      setPwError('يرجى إدخال كلمة المرور الحالية');
      return;
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      setPwError('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
      return;
    }

    const appUrl = process.env.EXPO_PUBLIC_APP_URL;
    if (!appUrl) {
      setPwError('خطأ في الإعداد: EXPO_PUBLIC_APP_URL غير محدد');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${appUrl}/api/customer/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty */ }
      if (!res.ok) {
        setPwError((data.error as string) || `خطأ ${res.status}`);
        setPwSaving(false);
        return;
      }
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSaved(true);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'خطأ في الاتصال');
    }
    setPwSaving(false);
  }

  return (
    <ScreenBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Avatar & name ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarGlow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusSuspended]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.green : COLORS.red }]} />
              <Text style={[styles.statusText, { color: isActive ? COLORS.green : COLORS.red }]}>
                {isActive ? 'حساب نشط' : 'موقوف'}
              </Text>
            </View>
            <Text style={styles.fullName}>{fullName}</Text>
            <Text style={styles.phone}>{profile?.phone ?? ''}</Text>
            {profile?.id && (
              <Pressable
                style={styles.publicProfileLink}
                onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: profile.id } })}
              >
                <Text style={styles.publicProfileLinkText}>عرض صفحتي العامة ←</Text>
              </Pressable>
            )}
          </View>

          {/* ── Tab switcher ── */}
          <View style={styles.tabRow}>
            {([
              { key: 'info' as Tab,     label: '👤  المعلومات' },
              { key: 'password' as Tab, label: '🔒  كلمة المرور' },
            ] as { key: Tab; label: string }[]).map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>تعديل بياناتك الشخصية</Text>
              </View>
              <View style={styles.formBody}>
                <GoldInput
                  label="الاسم الثلاثي"
                  value={givenName}
                  onChangeText={(v) => { setGivenName(v); setInfoSaved(false); }}
                  placeholder="أدخل اسمك الثلاثي"
                />
                <GoldInput
                  label="اللقب / الكنية"
                  value={familyName}
                  onChangeText={(v) => { setFamilyName(v); setInfoSaved(false); }}
                  placeholder="أدخل لقبك العائلي"
                />
                <GoldInput
                  label="رقم الهاتف"
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setInfoSaved(false); }}
                  placeholder="07XXXXXXXXX"
                  keyboardType="phone-pad"
                />
                <View>
                  <GoldInput
                    label="نبذة عني"
                    value={bio}
                    onChangeText={(v) => { setBio(v.slice(0, BIO_MAX)); setInfoSaved(false); }}
                    placeholder="اكتب نبذة قصيرة عنك..."
                    multiline
                    maxLength={BIO_MAX}
                  />
                  <Text style={styles.bioCounter}>{bio.length}/{BIO_MAX}</Text>
                </View>

                {infoError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{infoError}</Text>
                  </View>
                ) : null}
                {infoSaved ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ تم حفظ البيانات بنجاح</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, infoSaving && styles.saveBtnLoading]}
                  onPress={handleSaveInfo}
                  disabled={infoSaving}
                >
                  <LinearGradient
                    colors={infoSaving ? ['#555', '#444'] : ['#e6ab2c', '#c9882a']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {infoSaving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
                    }
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Password tab ── */}
          {activeTab === 'password' && (
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>تغيير كلمة المرور</Text>
              </View>
              <View style={styles.formBody}>
                <GoldInput
                  label="كلمة المرور الحالية"
                  value={currentPw}
                  onChangeText={(v) => { setCurrentPw(v); setPwSaved(false); }}
                  placeholder="أدخل كلمة المرور الحالية"
                  secureToggle
                />
                <GoldInput
                  label="كلمة المرور الجديدة"
                  value={newPw}
                  onChangeText={(v) => { setNewPw(v); setPwSaved(false); }}
                  placeholder="8 أحرف على الأقل"
                  secureToggle
                />
                <GoldInput
                  label="تأكيد كلمة المرور الجديدة"
                  value={confirmPw}
                  onChangeText={(v) => { setConfirmPw(v); setPwSaved(false); }}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  secureToggle
                />

                {pwError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{pwError}</Text>
                  </View>
                ) : null}
                {pwSaved ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ تم تغيير كلمة المرور بنجاح</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, pwSaving && styles.saveBtnLoading]}
                  onPress={handleChangePassword}
                  disabled={pwSaving}
                >
                  <LinearGradient
                    colors={pwSaving ? ['#555', '#444'] : ['#e6ab2c', '#c9882a']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {pwSaving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={styles.saveBtnText}>تغيير كلمة المرور</Text>
                    }
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── App Info Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>عن التطبيق</Text>
            </View>
            <InfoRow icon="📦" label="الإصدار"  value="1.0.0" />
            <InfoRow icon="🏛️" label="المنصة"  value="خدماتي" last />
          </View>

          {/* ── Logout ── */}
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>{signingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</Text>
          </Pressable>

          {/* ── Danger Zone ── */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>منطقة الخطر</Text>
            <Text style={styles.dangerDesc}>حذف حسابك نهائي ولا يمكن التراجع عنه — سيتم حذف كل بياناتك.</Text>
            {!!deleteError && <Text style={styles.dangerError}>{deleteError}</Text>}
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.logoutPressed]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount
                ? <ActivityIndicator color={COLORS.red} size="small" />
                : <Text style={styles.deleteBtnText}>حذف الحساب نهائياً</Text>
              }
            </Pressable>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBg>
  );
}

function InfoRow({
  icon, label, value, last,
}: {
  icon: string; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <View style={rowStyles.right}>
        <Text style={rowStyles.value}>{value}</Text>
        <Text style={rowStyles.label}>{label}</Text>
      </View>
      <Text style={rowStyles.icon}>{icon}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  right:  { flex: 1, alignItems: 'flex-end', gap: 2 },
  icon:   { fontSize: 20, width: 28, textAlign: 'center' },
  label:  { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  value:  { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
});

const styles = StyleSheet.create({
  bg:   { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, gap: 16 },

  // Avatar section
  avatarSection: { alignItems: 'center', paddingTop: 12, gap: 10 },
  avatarGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    borderWidth: 2,
    borderColor: 'rgba(230,171,44,0.5)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 42,
    backgroundColor: 'rgba(230,171,44,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: FONTS.bold, fontSize: 30, color: COLORS.gold, letterSpacing: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusActive:    { backgroundColor: 'rgba(34,197,94,0.08)',  borderColor: 'rgba(34,197,94,0.3)' },
  statusSuspended: { backgroundColor: 'rgba(239,68,68,0.08)',  borderColor: 'rgba(239,68,68,0.3)' },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 12 },
  fullName:   { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  phone:      { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  publicProfileLink: { marginTop: 4 },
  publicProfileLinkText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  bioCounter: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted, textAlign: 'left', marginTop: 4 },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.gold },
  tabLabel:     { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white70 },
  tabLabelActive: { color: '#000' },

  // Form card
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    overflow: 'hidden',
  },
  formBody: { padding: 16, gap: 14 },

  // Info card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.15)',
    backgroundColor: 'rgba(230,171,44,0.04)',
  },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold, textAlign: 'right' },

  // Error / success
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  successText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.green, textAlign: 'center' },

  // Save button
  saveBtn:        { borderRadius: RADIUS.md, overflow: 'hidden' },
  saveBtnPressed: { opacity: 0.8 },
  saveBtnLoading: { opacity: 0.6 },
  saveBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:    { fontFamily: FONTS.bold, fontSize: 15, color: '#000' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    marginTop: 4,
  },
  logoutPressed: { opacity: 0.7 },
  logoutIcon:    { fontSize: 18 },
  logoutText:    { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.red },

  dangerCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.04)',
    gap: 10,
  },
  dangerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.red, textAlign: 'right' },
  dangerDesc:  { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white50, textAlign: 'right', lineHeight: 18 },
  dangerError: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.red, textAlign: 'right' },
  deleteBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  deleteBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.red },
});
