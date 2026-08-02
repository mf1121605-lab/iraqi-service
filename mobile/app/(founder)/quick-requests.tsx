import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface QuickRequest {
  id: string;
  section_name: string;
  content: string;
  status: string;
  thread_id: string | null;
  created_at: string;
  customer: { given_name: string | null; family_name: string | null; phone: string | null } | null;
  employee: { given_name: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#22c55e',
  rejected: '#ef4444',
};

const STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  rejected: 'مرفوض',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FounderQuickRequests() {
  const { profile, loading } = useAuth();
  const [requests, setRequests] = useState<QuickRequest[] | null>(null);

  async function loadRequests() {
    const { data } = await supabase
      .from('quick_requests')
      .select('id, section_name, content, status, thread_id, created_at, customer:profiles!customer_id(given_name, family_name, phone), employee:profiles!employee_id(given_name)')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as unknown as QuickRequest[]);
  }

  useEffect(() => {
    if (!profile) return;
    loadRequests();
    const channel = supabase
      .channel('founder-quick-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_requests' }, loadRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>⚡ الطلبات السريعة</Text>
      </View>

      {requests === null ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : requests.length === 0 ? (
        <View style={s.center}><Text style={s.emptyText}>لا توجد طلبات سريعة بعد</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {requests.map((req) => {
            const customerName = [req.customer?.given_name, req.customer?.family_name].filter(Boolean).join(' ') || req.customer?.phone || '—';
            return (
              <View key={req.id} style={s.reqCard}>
                <View style={s.reqTop}>
                  <Text style={[s.statusBadge, { color: STATUS_COLORS[req.status] ?? COLORS.muted }]}>
                    {STATUS_AR[req.status] ?? req.status}
                  </Text>
                  <Text style={s.reqTime}>{formatTime(req.created_at)}</Text>
                </View>
                <Text style={s.sectionName}>{req.section_name}</Text>
                <Text style={s.reqContent} numberOfLines={2}>{req.content}</Text>
                <View style={s.reqFooter}>
                  <Text style={s.reqMeta}>👤 {customerName}</Text>
                  {req.employee?.given_name && (
                    <Text style={s.reqMeta}>🧑‍💼 {req.employee.given_name}</Text>
                  )}
                </View>
              </View>
            );
          })}
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
  scroll: { padding: 16, gap: 10 },
  reqCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 6 },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { fontFamily: FONTS.bold, fontSize: 12 },
  reqTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  sectionName: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right' },
  reqContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right', lineHeight: 20 },
  reqFooter: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  reqMeta: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
});
