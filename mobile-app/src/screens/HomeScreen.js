import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    async function loadSiteSettings() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
      if (!error) {
        setSiteSettings(data);
      }
      setLoading(false);
    }

    loadSiteSettings();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>جارٍ تحميل المنصة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>منصة الخدمات العراقية</Text>
          <Text style={styles.title}>{siteSettings?.hero_title || 'منصة الخدمات العراقية'}</Text>
          <Text style={styles.subtitle}>{siteSettings?.hero_subtitle || 'نفس البيانات والخدمات التي تظهر على الموقع'}</Text>
        </View>

        <View style={styles.sectionWrap}>
          <SectionTitle title="الأقسام الرئيسية" subtitle="كل ما تحتاجه داخل التطبيق" />
        </View>

        <View style={styles.grid}>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.cardTitle}>تسجيل الدخول</Text>
            <Text style={styles.cardText}>الولوج إلى الحساب وواجهة المستخدم</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.cardTitle}>لوحة المستخدم</Text>
            <Text style={styles.cardText}>عرض البيانات من قاعدة البيانات</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Requests')}>
            <Text style={styles.cardTitle}>الطلبات</Text>
            <Text style={styles.cardText}>متابعة الطلبات الحالية</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Services')}>
            <Text style={styles.cardTitle}>الخدمات</Text>
            <Text style={styles.cardText}>استعراض الخدمات المتاحة</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.cardTitle}>الدردشة</Text>
            <Text style={styles.cardText}>التواصل مع الدعم والطلبات</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.cardTitle}>الملف الشخصي</Text>
            <Text style={styles.cardText}>عرض بيانات الحساب</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomTabs navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: theme.spacing.lg,
  },
  sectionWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
