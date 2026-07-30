import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function ConfigErrorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>إعداد التطبيق غير مكتمل</Text>
          <Text style={styles.message}>
            لم يتم ضبط مفاتيح الاتصال بقاعدة البيانات (Supabase). يرجى التأكد من إضافة
            EXPO_PUBLIC_SUPABASE_URL و EXPO_PUBLIC_SUPABASE_ANON_KEY قبل تشغيل التطبيق.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  message: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center' },
});
