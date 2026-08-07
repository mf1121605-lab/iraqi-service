import { useCallback, useEffect, useRef, useState } from 'react';
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

// The customer never picks an employee directly — they submit the
// request, it sits unassigned in every available employee's queue
// (employee/index.tsx's claimRequest), and whichever employee approves
// it first takes it. This screen is a passive "search animation" while
// that happens: candidate cards auto-cycle for visual interest, and a
// realtime listener on the request row navigates to the chat the
// moment any employee claims it — no tap-to-select here at all.
export default function MatchingScreen() {
  const { requestId, category, serviceId } = useLocalSearchParams<{ requestId: string; category: string; serviceId?: string }>();
  const [candidates, setCandidates] = useState<EmployeeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState(false);
  const navigatedRef = useRef(false);

  const load = useCallback(async () => {
    if (!category) return;

    // Narrow to the staff the founder assigned to this exact service, when one
    // was chosen. An empty assignment list is read as "no restriction" rather
    // than "nobody" — otherwise every service predating service_employees
    // would show zero available staff.
    let allowed: Set<string> | null = null;
    if (serviceId) {
      const { data: rows } = await supabase
        .from('service_employees')
        .select('employee_id')
        .eq('service_id', serviceId);
      const ids = (rows ?? []).map((r) => (r as { employee_id: string }).employee_id);
      if (ids.length > 0) allowed = new Set(ids);
    }

    const { data } = await supabase.rpc('get_active_employee_candidates', {
      p_category: category,
    });
    const all = (data as EmployeeCandidate[]) ?? [];
    const permitted = allowed;
    setCandidates(permitted ? all.filter((c) => permitted.has(c.id)) : all);
    setLoading(false);
  }, [category, serviceId]);

  useEffect(() => { load(); }, [load]);

  // Watch the request itself — the moment any employee claims it
  // (assigned_employee_id goes from null to something, status flips to
  // in_review), jump straight into the chat.
  useEffect(() => {
    if (!requestId) return;

    async function checkAssigned() {
      const { data } = await supabase
        .from('requests')
        .select('assigned_employee_id')
        .eq('id', requestId)
        .maybeSingle();
      if (data?.assigned_employee_id && !navigatedRef.current) {
        navigatedRef.current = true;
        setMatched(true);
        setTimeout(() => {
          router.replace({ pathname: '/(customer)/requests/[id]', params: { id: requestId } });
        }, 1100);
      }
    }

    checkAssigned();

    const channel = supabase
      .channel(`request-match-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'requests',
        filter: `id=eq.${requestId}`,
      }, (payload) => {
        const updated = payload.new as { assigned_employee_id: string | null };
        if (updated.assigned_employee_id && !navigatedRef.current) {
          navigatedRef.current = true;
          setMatched(true);
          setTimeout(() => {
            router.replace({ pathname: '/(customer)/requests/[id]', params: { id: requestId } });
          }, 1100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  return (
    <ScreenBg>
      {/* Header */}
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>بانتظار موافقة موظف</Text>
          {category ? (
            <Text style={styles.navSub}>{CAT_LABELS[category] ?? category}</Text>
          ) : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      {matched ? (
        <View style={styles.center}>
          <Text style={styles.matchedEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>تم قبول طلبك!</Text>
          <Text style={styles.emptySub}>جارِ فتح المحادثة...</Text>
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 12 }} />
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <Text style={styles.loadingText}>جاري البحث عن موظفين متاحين...</Text>
        </View>
      ) : candidates.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>لا يوجد موظفون متاحون حالياً</Text>
          <Text style={styles.emptySub}>سيصلك إشعار فور موافقة أحد الموظفين على طلبك</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => { setLoading(true); load(); }}
          >
            <Text style={styles.retryBtnText}>تحديث</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.carouselScreen}>
          <Text style={styles.listHeader}>
            طلبك وصل لـ{candidates.length} موظف متاح — بانتظار موافقة أحدهم
          </Text>
          <EmployeeSelectorCarousel candidates={candidates} autoScroll />
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

  matchedEmoji: { fontSize: 52 },
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
