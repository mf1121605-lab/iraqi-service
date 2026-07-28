import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';

export default function ProfileScreen({ navigation }) {
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
          <SectionTitle title="المستخدم" subtitle="هذا القسم مخصص لعرض بيانات الحساب والملف الشخصي داخل التطبيق." />
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>الاسم</Text>
          <Text style={styles.infoValue}>مستخدم منصة الخدمات</Text>
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>البريد</Text>
          <Text style={styles.infoValue}>user@iraqi-service.com</Text>
        </GlassCard>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <GlassCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>الإعدادات</Text>
            <Text style={styles.infoValue}>الانتقال إلى الإعدادات</Text>
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
});
