import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar } from '@/components/chat/Avatar';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { EmployeeServicesModal } from '@/components/founder/EmployeeServicesModal';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface SupervisorRow {
  id: string;
  given_name: string | null;
  family_name: string | null;
  avatar_key: string | null;
  qualification: string | null;
  is_active: boolean;
  admin_level: string | null;
}

// Founder's "إدارة المشرفين وتوزيع الخانات" screen — the employee-centric
// counterpart to category-services.tsx's per-service "👥 الموظفون" button.
// Both read/write the same service_employees bridge table; this one just
// starts from a supervisor and lets the founder pick their categories.
export default function SupervisorsScreen() {
  const { profile, loading } = useAuth();
  const [supervisors, setSupervisors] = useState<SupervisorRow[] | null>(null);
  const [assigning, setAssigning] = useState<{ id: string; name: string } | null>(null);

  async function loadSupervisors() {
    const { data } = await supabase
      .from('profiles')
      .select('id, given_name, family_name, avatar_key, qualification, is_active, admin_level')
      .eq('role', 'employee')
      .order('given_name');
    setSupervisors((data ?? []) as SupervisorRow[]);
  }

  useEffect(() => { if (profile) loadSupervisors(); }, [profile]);

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>›</Text>
        </Pressable>
        <Text style={s.headerTitle}>إدارة المشرفين</Text>
        <View style={{ width: 40 }} />
      </View>

      {supervisors === null ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {supervisors.length === 0 ? (
            <Text style={s.empty}>لا يوجد موظفون بعد</Text>
          ) : (
            supervisors.map((sup) => {
              const name = [sup.given_name, sup.family_name].filter(Boolean).join(' ') || 'مشرف';
              return (
                <View key={sup.id} style={s.row}>
                  <Avatar avatarKey={sup.avatar_key} name={name} seed={sup.id} size={44} />
                  <View style={s.info}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{name}</Text>
                      <View style={[s.dot, { backgroundColor: sup.is_active ? '#22c55e' : '#6b7280' }]} />
                    </View>
                    {sup.qualification ? <Text style={s.qual} numberOfLines={1}>🎓 {sup.qualification}</Text> : null}
                    {sup.admin_level === 'co_admin' && <Text style={s.coAdminTag}>مشرف مساعد (لوحة كاملة)</Text>}
                  </View>
                  <Pressable
                    onPress={() => setAssigning({ id: sup.id, name })}
                    style={s.assignBtn}
                    hitSlop={6}
                  >
                    <Text style={s.assignBtnText}>🗂️ الخانات</Text>
                  </Pressable>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <EmployeeServicesModal
        visible={assigning !== null}
        employeeId={assigning?.id ?? null}
        employeeName={assigning?.name ?? ''}
        onClose={() => setAssigning(null)}
      />
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 30 },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 10,
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  name: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  qual: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  coAdminTag: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.gold, textAlign: 'right' },
  assignBtn: {
    backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: COLORS.goldBorder,
    borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8,
  },
  assignBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
});
