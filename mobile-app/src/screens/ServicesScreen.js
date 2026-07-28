import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';

const services = [
  { title: 'خدمات المواطنين', desc: 'استكمال المعاملات والخدمات الحكومية' },
  { title: 'خدمات الشركات', desc: 'إدارة الطلبات والتواصل مع المنصة' },
  { title: 'دعم فني', desc: 'مساعدة مباشرة على مستوى الحساب والطلبات' },
];

export default function ServicesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>الخدمات</Text>
          <Text style={styles.link} onPress={() => navigation.goBack()}>رجوع</Text>
        </View>

        <GlassCard style={styles.heroCard}>
          <SectionTitle title="الخدمات المتاحة" subtitle="هذه هي الخدمات التي يمكن عرضها داخل التطبيق باستخدام نفس البيانات الأساسية." />
        </GlassCard>

        {services.map((service, index) => (
          <Pressable key={`${service.title}-${index}`} onPress={() => navigation.navigate('ServiceDetail', { service })}>
            <GlassCard style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceText}>{service.desc}</Text>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
      <BottomTabs navigation={navigation} active="Services" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  heroCard: { marginBottom: theme.spacing.sm },
  heroTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  heroText: { color: theme.colors.muted, lineHeight: 22 },
  serviceCard: { gap: 4 },
  serviceTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  serviceText: { color: theme.colors.muted, lineHeight: 20 },
});
