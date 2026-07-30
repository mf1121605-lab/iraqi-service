import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';
import { formatFullName, getMyProfile, roleLabel, signOut } from '../services/auth';

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      const myProfile = await getMyProfile();
      setProfile(myProfile);
      setLoading(false);
    }

    load();
  }, []);

  async function handleLogout() {
    await signOut();
    navigation.replace('Home');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>الملف الشخصي</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>رجوع</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <SectionTitle title="المستخدم" subtitle="بيانات الحساب من نفس قاعدة بيانات الموقع." />
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>الاسم</Text>
          <Text style={styles.infoValue}>{formatFullName(profile)}</Text>
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>الصلاحية</Text>
          <Text style={styles.infoValue}>{roleLabel(profile)}</Text>
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>رقم الهاتف</Text>
          <Text style={styles.infoValue}>{profile?.phone || 'غير مسجل'}</Text>
        </GlassCard>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <GlassCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>الإعدادات</Text>
            <Text style={styles.infoValue}>الانتقال إلى الإعدادات</Text>
          </GlassCard>
        </Pressable>

        <Pressable onPress={handleLogout}>
          <GlassCard style={styles.infoCard}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </GlassCard>
        </Pressable>
      </ScrollView>
      <BottomTabs navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  heroCard: { gap: 6 },
  heroTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  heroText: { color: theme.colors.muted, lineHeight: 22 },
  infoCard: { gap: 4 },
  infoLabel: { color: theme.colors.muted, fontSize: 13 },
  infoValue: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  logoutText: { color: '#f87171', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
