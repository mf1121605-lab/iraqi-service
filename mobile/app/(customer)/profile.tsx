import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { GoldButton } from '@/components/ui/GoldButton';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  function handleSignOut() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  }

  const givenName  = profile?.given_name  ?? '';
  const familyName = profile?.family_name ?? '';
  const fullName   = [givenName, familyName].filter(Boolean).join(' ') || '—';
  const initials   = [givenName[0], familyName[0]].filter(Boolean).join('').toUpperCase() || '?';
  const isActive   = profile?.account_status === 'active';

  return (
    <LinearGradient colors={['#080c12', '#0d1117', '#080c12']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          {/* Outer glow ring */}
          <View style={styles.avatarGlow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
          {/* Status badge */}
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusSuspended]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.green : COLORS.red }]} />
            <Text style={[styles.statusText, { color: isActive ? COLORS.green : COLORS.red }]}>
              {isActive ? 'حساب نشط' : 'موقوف'}
            </Text>
          </View>
          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.phone}>{profile?.phone ?? ''}</Text>
        </View>

        {/* ── Account Info Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>👤</Text>
            <Text style={styles.cardTitle}>معلومات الحساب</Text>
          </View>
          <InfoRow icon="🪪" label="الاسم الكامل"  value={fullName} />
          <InfoRow icon="📱" label="رقم الهاتف"    value={profile?.phone ?? '—'} />
          <InfoRow icon="🏷️" label="نوع الحساب"   value="زبون" last />
        </View>

        {/* ── App Info Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>ℹ️</Text>
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </LinearGradient>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  border: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  right:  { flex: 1, alignItems: 'flex-end', gap: 2 },
  icon:   { fontSize: 20, width: 28, textAlign: 'center' },
  label:  { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  value:  { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
});

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  scroll: { padding: 20, gap: 16 },

  avatarSection: { alignItems: 'center', paddingTop: 12, gap: 10 },
  avatarGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    backgroundColor: 'transparent',
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
  avatarInitials: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: COLORS.gold,
    letterSpacing: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusActive:    { backgroundColor: 'rgba(34,197,94,0.08)',  borderColor: 'rgba(34,197,94,0.3)' },
  statusSuspended: { backgroundColor: 'rgba(239,68,68,0.08)',  borderColor: 'rgba(239,68,68,0.3)' },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusText:      { fontFamily: FONTS.bold, fontSize: 12 },

  fullName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  phone:    { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  card: {
    backgroundColor: '#161b22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.15)',
    backgroundColor: 'rgba(230,171,44,0.04)',
  },
  cardHeaderIcon: { fontSize: 16 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    marginTop: 4,
  },
  logoutPressed: { opacity: 0.7 },
  logoutIcon:    { fontSize: 18 },
  logoutText:    { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.red },
});
