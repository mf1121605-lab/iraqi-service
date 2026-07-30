import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import HeaderBar from '../components/HeaderBar';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

export default function AdminCategoriesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadCategories() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('key, label_ar, is_active, sort_order')
        .order('sort_order', { ascending: true });

      if (!error) {
        setCategories(data || []);
      }
      setLoading(false);
    }

    loadCategories();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="التصنيفات" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : categories.length === 0 ? (
          <GlassCard><Text style={styles.emptyText}>لا توجد تصنيفات بعد</Text></GlassCard>
        ) : categories.map((category) => (
          <GlassCard key={category.key} style={styles.row}>
            <Text style={styles.rowTitle}>{category.label_ar}</Text>
            <StatusPill label={category.is_active ? 'مفعّل' : 'متوقف'} tone={category.is_active ? 'success' : 'warning'} />
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  emptyText: { color: theme.colors.muted, textAlign: 'center' },
  row: { gap: 6 },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
});
