import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GoldButton } from '@/components/ui/GoldButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const TUTOR_SUBJECTS = [
  { key: 'arabic',            nameAr: 'اللغة العربية' },
  { key: 'english',           nameAr: 'اللغة الإنكليزية' },
  { key: 'math',              nameAr: 'الرياضيات' },
  { key: 'science',           nameAr: 'العلوم' },
  { key: 'social_studies',    nameAr: 'الاجتماعيات' },
  { key: 'islamic_education', nameAr: 'التربية الإسلامية' },
];

function subjectLabel(key: string) {
  return TUTOR_SUBJECTS.find((s) => s.key === key)?.nameAr ?? key;
}

type Session = { id: string; title: string | null; updated_at: string };

export default function TutorSubjectSessionsScreen() {
  const { profile } = useAuth();
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const isValid = TUTOR_SUBJECTS.some((s) => s.key === subject);

  useEffect(() => {
    if (!profile || !subject || !isValid) return;
    supabase
      .from('tutor_chat_sessions')
      .select('id, title, updated_at')
      .eq('student_id', profile.id)
      .eq('subject', subject)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setSessions((data as Session[]) ?? []));
  }, [profile, subject, isValid]);

  async function handleNewSession() {
    if (!profile || !subject) return;
    setError('');
    setCreating(true);
    const { data, error: err } = await supabase
      .from('tutor_chat_sessions')
      .insert({ student_id: profile.id, subject })
      .select('id')
      .single();
    setCreating(false);
    if (err) { setError(err.message || 'حدث خطأ'); return; }
    router.push(`/(customer)/tutor/session/${data.id}`);
  }

  const renderSession: ListRenderItem<Session> = useCallback(({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, { marginBottom: 10 }, pressed && { opacity: 0.75 }]}
      onPress={() => router.push(`/(customer)/tutor/session/${item.id}`)}
    >
      <Text style={styles.sessionTitle} numberOfLines={1}>
        {item.title || 'جلسة بدون عنوان'}
      </Text>
      <Text style={styles.sessionDate}>
        {new Date(item.updated_at).toLocaleString('ar-IQ')}
      </Text>
    </Pressable>
  ), []);

  if (!profile || !isValid) return null;

  return (
    <ScreenBg>
      <View style={styles.container}>
        {/* Back */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>→ العودة إلى المواد</Text>
        </Pressable>

        <Text style={styles.title}>💬 {subjectLabel(subject ?? '')}</Text>

        <GoldButton
          label="+ جلسة جديدة"
          onPress={handleNewSession}
          loading={creating}
          style={styles.newBtn}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sessions === null ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 32 }} />
        ) : sessions.length === 0 ? (
          <Text style={styles.empty}>لا توجد جلسات سابقة. ابدأ جلسة جديدة!</Text>
        ) : (
          <FlashList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            estimatedItemSize={64}
            renderItem={renderSession}
          />
        )}
      </View>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  backBtn:  { marginBottom: 12 },
  backText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  title:  { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold, marginBottom: 16 },
  newBtn: { marginBottom: 8 },
  error:  { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, marginBottom: 8 },
  empty:  { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, marginTop: 24, textAlign: 'center' },

  sessionCard: {
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    gap: 4,
  },
  sessionTitle: { fontFamily: FONTS.bold,    fontSize: 14, color: COLORS.white },
  sessionDate:  { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
});
