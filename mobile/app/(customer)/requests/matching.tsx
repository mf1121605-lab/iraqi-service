import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CAT_LABELS: Record<string, string> = {
  military: 'الخدمات العسكرية',
  education: 'الخدمات الدراسية',
  welfare: 'الرعاية الاجتماعية',
  general: 'خدمات أخرى',
};

type Candidate = {
  id: string;
  given_name: string;
  family_name: string;
  avatar_key: string | null;
  specialization: string | null;
  is_verified: boolean;
};

function AvatarCircle({ name, size = 56 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '؟';
  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

export default function MatchingScreen() {
  const { requestId, category } = useLocalSearchParams<{ requestId: string; category: string }>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!category) return;
    const { data } = await supabase.rpc('get_active_employee_candidates', {
      p_category: category,
    });
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function selectEmployee(candidateId: string) {
    if (!requestId || selecting) return;
    setSelecting(candidateId);
    await supabase
      .from('requests')
      .update({ employee_id: candidateId, status: 'in_progress' })
      .eq('id', requestId);
    // Navigate back — realtime will update the request detail
    router.back();
  }

  return (
    <LinearGradient colors={['#080c12', '#0d1117', '#080c12']} style={styles.bg}>
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
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {candidates.length} موظف متاح — اختر من تريد العمل معه
            </Text>
          }
          renderItem={({ item }) => {
            const fullName = `${item.given_name} ${item.family_name}`;
            const isSelecting = selecting === item.id;
            return (
              <View style={styles.card}>
                {/* Left accent bar */}
                <View style={styles.cardAccent} />

                <AvatarCircle name={item.given_name} />

                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text style={styles.candidateName}>{fullName}</Text>
                    {item.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ موثّق</Text>
                      </View>
                    )}
                  </View>
                  {item.specialization ? (
                    <Text style={styles.specialization}>{item.specialization}</Text>
                  ) : null}
                  <View style={styles.activeRow}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>متاح الآن</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.selectBtn,
                    isSelecting && styles.selectBtnLoading,
                    pressed && !isSelecting && styles.selectBtnPressed,
                  ]}
                  onPress={() => selectEmployee(item.id)}
                  disabled={!!selecting}
                >
                  {isSelecting ? (
                    <ActivityIndicator color={COLORS.gold} size="small" />
                  ) : (
                    <Text style={styles.selectBtnText}>اختيار</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
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

  list: { padding: 16, gap: 10, paddingBottom: 32 },
  listHeader: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'right',
    marginBottom: 6,
  },

  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.18)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: 12,
    paddingRight: 14,
    paddingVertical: 14,
  },
  cardAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: COLORS.gold,
    opacity: 0.7,
  },

  avatarCircle: {
    backgroundColor: 'rgba(230,171,44,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: { fontFamily: FONTS.bold, color: COLORS.gold },

  cardContent: { flex: 1, gap: 3, alignItems: 'flex-end' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  candidateName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  verifiedBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 10, color: '#60a5fa' },
  specialization: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  activeText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.green },

  selectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.45)',
    borderRadius: RADIUS.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  selectBtnLoading: { borderColor: 'rgba(230,171,44,0.2)' },
  selectBtnPressed: { opacity: 0.7 },
  selectBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
});
