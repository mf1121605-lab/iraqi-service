import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { EmployeeSelectorCarousel, type EmployeeCandidate } from '@/components/employee/EmployeeSelectorCarousel';

const CAT_LABELS: Record<string, string> = {
  military: 'الخدمات العسكرية',
  education: 'الخدمات الدراسية',
  welfare: 'الرعاية الاجتماعية',
  general: 'خدمات أخرى',
};

// Beat between the checkmark animation landing and navigating away, so the
// selection actually reads as confirmed before the screen changes.
const SELECT_CONFIRM_DELAY_MS = 650;

export default function MatchingScreen() {
  const { requestId, category } = useLocalSearchParams<{ requestId: string; category: string }>();
  const [candidates, setCandidates] = useState<EmployeeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!category) return;
    const { data } = await supabase.rpc('get_active_employee_candidates', {
      p_category: category,
    });
    setCandidates((data as EmployeeCandidate[]) ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function selectEmployee(candidate: EmployeeCandidate) {
    if (!requestId || confirmingId) return;
    setSelectedId(candidate.id);
    setConfirmingId(candidate.id);
    await supabase
      .from('requests')
      .update({ employee_id: candidate.id, status: 'in_progress' })
      .eq('id', requestId);
    // Let the checkmark animation land before navigating away — realtime
    // will update the request detail once we're back.
    setTimeout(() => router.back(), SELECT_CONFIRM_DELAY_MS);
  }

  return (
    <ScreenBg>
      {/* Header */}
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>اختيار موظف</Text>
          {category ? (
            <Text style={styles.navSub}>{CAT_LABELS[category] ?? category}</Text>
          ) : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <Text style={styles.loadingText}>جاري البحث عن موظفين متاحين...</Text>
        </View>
      ) : candidates.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>لا يوجد موظفون متاحون حالياً</Text>
          <Text style={styles.emptySub}>يرجى المحاولة لاحقاً أو التواصل معنا</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => { setLoading(true); load(); }}
          >
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.carouselScreen}>
          <Text style={styles.listHeader}>
            {candidates.length} موظف متاح — مرّر واختر من تريد العمل معه
          </Text>
          <EmployeeSelectorCarousel
            candidates={candidates}
            selectedId={selectedId}
            confirmingId={confirmingId}
            onSelect={selectEmployee}
          />
        </View>
      )}
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.15)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230,171,44,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  navCenter: { flex: 1, alignItems: 'center', gap: 2 },
  navTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  navSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },

  loadingText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, marginTop: 8 },

  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(230,171,44,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.35)',
    borderRadius: RADIUS.md,
  },
  retryBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },

  carouselScreen: { flex: 1, justifyContent: 'center', gap: 22, paddingBottom: 40 },
  listHeader: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
