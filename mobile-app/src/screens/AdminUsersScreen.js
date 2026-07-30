import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import HeaderBar from '../components/HeaderBar';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import { theme } from '../theme';
import { supabase } from '../services/supabase';
import { roleLabel } from '../services/auth';

export default function AdminUsersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadUsers() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, admin_level, given_name, father_name, family_name, phone, account_status')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error) {
        setUsers(data || []);
      }
      setLoading(false);
    }

    loadUsers();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="المستخدمون" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : users.length === 0 ? (
          <GlassCard><Text style={styles.emptyText}>لا يوجد مستخدمون بعد</Text></GlassCard>
        ) : users.map((user) => (
          <GlassCard key={user.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {[user.given_name, user.father_name, user.family_name].filter(Boolean).join(' ') || user.phone || 'مستخدم'}
            </Text>
            <Text style={styles.rowMeta}>{user.phone || 'بدون رقم هاتف'}</Text>
            <StatusPill label={roleLabel(user)} tone={user.role === 'founder' ? 'primary' : user.role === 'employee' ? 'warning' : 'success'} />
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
  rowMeta: { color: theme.colors.muted, fontSize: 13 },
});
