import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar } from '@/components/chat/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface EmployeeProfile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  avatar_key: string | null;
  specialization: string | null;
  is_verified: boolean;
  avg_stars: string | number;
  rating_count: number;
  completed_count: number;
}

interface Rating {
  stars: number;
  comment: string | null;
  created_at: string;
}

function StarRow({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(v => (
        <Text key={v} style={{ fontSize: size, color: v <= Math.round(value) ? COLORS.gold : COLORS.white20 }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function EmployeePublicProfile() {
  const { profile, loading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!profile || !id) return;

    async function load() {
      const { data } = await supabase.rpc('get_employee_public_profile', { p_employee_id: id });
      if (!data || data.length === 0) {
        router.back();
        return;
      }
      setEmployee(data[0] as EmployeeProfile);

      const { data: ratingRows } = await supabase
        .from('request_ratings')
        .select('stars, comment, created_at')
        .eq('employee_id', id)
        .eq('customer_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRatings(ratingRows ?? []);
      setFetching(false);
    }

    load();
    // Deliberately depends on the stable id, not the whole profile object
    // (same convention throughout this codebase) — re-running this on every
    // unrelated profile field change would be wasteful and cause UI flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, id]);

  if (loading || !profile || fetching) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ScreenBg>
    );
  }

  if (!employee) return null;

  const fullName = [employee.given_name, employee.family_name].filter(Boolean).join(' ') || 'موظف';
  const avgStars = Number(employee.avg_stars) || 0;

  return (
    <ScreenBg>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backArrow}>›</Text>
        </Pressable>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Avatar avatarKey={employee.avatar_key} name={employee.given_name} seed={employee.id} size={72} />
            <View style={styles.nameCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{fullName}</Text>
                {employee.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ موثّق</Text>
                  </View>
                )}
              </View>
              {employee.specialization ? (
                <Text style={styles.spec}>{employee.specialization}</Text>
              ) : null}
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statNum, { color: COLORS.gold }]}>
                {avgStars > 0 ? avgStars.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>التقييم</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statNum}>{employee.rating_count}</Text>
              <Text style={styles.statLabel}>عدد التقييمات</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={[styles.statNum, { color: '#34d399' }]}>{employee.completed_count}</Text>
              <Text style={styles.statLabel}>طلبات مكتملة</Text>
            </View>
          </View>

          {avgStars > 0 && (
            <View style={styles.starsRow}>
              <StarRow value={avgStars} size={22} />
            </View>
          )}
        </View>

        {/* My ratings section */}
        {ratings.length > 0 && (
          <View style={styles.ratingsSection}>
            <Text style={styles.ratingsSectionTitle}>تقييماتي لهذا الموظف</Text>
            {ratings.map((r, i) => (
              <View key={i} style={styles.ratingCard}>
                <View style={styles.ratingTop}>
                  <StarRow value={r.stars} size={16} />
                  <Text style={styles.ratingDate}>
                    {new Date(r.created_at).toLocaleDateString('ar-IQ')}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.ratingComment}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white, flex: 1, textAlign: 'right' },
  scroll: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 20,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  nameCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  verifiedBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11, color: '#60a5fa' },
  spec: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: 12,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.white10 },
  statNum: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted, marginTop: 2 },
  starsRow: { alignItems: 'center', marginTop: 4 },
  ratingsSection: {},
  ratingsSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
    marginBottom: 12,
  },
  ratingCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  ratingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ratingDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  ratingComment: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white },
});
