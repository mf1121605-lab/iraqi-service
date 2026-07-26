import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  function handleSignOut() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  }

  const fullName = profile
    ? `${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim()
    : '—';

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.phone}>{profile?.phone ?? ''}</Text>
        </View>

        {/* Account info */}
        <GoldCard style={styles.infoCard}>
          <Text style={styles.cardTitle}>معلومات الحساب</Text>
          <InfoRow label="الاسم الكامل" value={fullName} />
          <InfoRow label="رقم الهاتف" value={profile?.phone ?? '—'} />
          <InfoRow
            label="حالة الحساب"
            value={profile?.account_status === 'active' ? '✅ نشط' : '🔒 موقوف'}
          />
          <InfoRow label="نوع الحساب" value="زبون" />
        </GoldCard>

        {/* App info */}
        <GoldCard style={styles.infoCard}>
          <Text style={styles.cardTitle}>عن التطبيق</Text>
          <InfoRow label="الإصدار" value="1.0.0" />
          <InfoRow label="المنصة" value="خدماتي — منصة الخدمات العراقية" />
        </GoldCard>

        {/* Logout */}
        <GoldButton
          label="تسجيل الخروج"
          onPress={handleSignOut}
          loading={signingOut}
          variant="ghost"
          style={styles.logoutBtn}
        />
      </ScrollView>
    </LinearGradient>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.value}>{value}</Text>
      <Text style={infoStyles.label}>{label}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  value: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
});

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  fullName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  phone: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  infoCard: { gap: 0, paddingVertical: 4 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right', marginBottom: 6 },
  logoutBtn: { marginTop: 8, borderColor: COLORS.red },
});
