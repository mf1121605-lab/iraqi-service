import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { theme } from '../theme';

export default function RequestDetailScreen({ route, navigation }) {
  const request = route?.params?.request || {
    title: 'طلب جديد',
    description: 'تفاصيل الطلب ستظهر هنا بعد ربطها بالبيانات الحقيقية.',
    status: 'قيد المراجعة',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>تفاصيل الطلب</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>رجوع</Text>
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>{request.title}</Text>
          <Text style={styles.heroText}>{request.description}</Text>
        </GlassCard>

        <GlassCard style={styles.metaCard}>
          <Text style={styles.metaLabel}>الحالة</Text>
          <Text style={styles.metaValue}>{request.status}</Text>
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
  heroCard: { gap: 6 },
  heroTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  heroText: { color: theme.colors.muted, lineHeight: 22 },
  metaCard: { gap: 4 },
  metaLabel: { color: theme.colors.muted, fontSize: 13 },
  metaValue: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
});
