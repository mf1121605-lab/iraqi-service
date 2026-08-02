import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  created_at: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FounderAuditLog() {
  const { profile, loading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('audit_log')
      .select('id, actor_id, action, table_name, record_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setEntries((data ?? []) as AuditEntry[]));
  }, [profile?.id]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>🔍 سجل المراقبة</Text>
      </View>

      {entries === null ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : entries.length === 0 ? (
        <View style={s.center}><Text style={s.emptyText}>لا توجد إدخالات بعد</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {entries.map((entry) => (
            <View key={entry.id} style={s.entryCard}>
              <View style={s.entryRow}>
                <Text style={s.entryAction}>{entry.action}</Text>
                <Text style={s.entryTime}>{formatTime(entry.created_at)}</Text>
              </View>
              {entry.table_name && (
                <Text style={s.entryMeta}>الجدول: {entry.table_name}</Text>
              )}
              {entry.actor_id && (
                <Text style={s.entryMeta} numberOfLines={1}>المنفذ: {entry.actor_id.slice(0, 8)}…</Text>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  scroll: { padding: 16, gap: 8 },
  entryCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 12, gap: 4 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryAction: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  entryTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  entryMeta: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
});
