import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import SectionTitle from '../components/SectionTitle';
import { theme } from '../theme';

export default function ServiceDetailScreen({ route, navigation }) {
  const service = route?.params?.service || {
    title: 'خدمة جديدة',
    description: 'تفاصيل الخدمة ستظهر هنا عند ربطها بالبيانات الحقيقية.',
    note: 'متاحة الآن عبر التطبيق',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>تفاصيل الخدمة</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>رجوع</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.card}>
          <SectionTitle title={service.title} subtitle={service.note} />
          <Text style={styles.text}>{service.description}</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  card: { gap: 8 },
  text: { color: theme.colors.muted, lineHeight: 22 },
});
