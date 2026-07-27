import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GoldCard } from '@/components/ui/GoldCard';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const TUTOR_SUBJECTS = [
  { key: 'arabic',             nameAr: 'اللغة العربية',      emoji: '📖' },
  { key: 'english',            nameAr: 'اللغة الإنكليزية',   emoji: '🌐' },
  { key: 'math',               nameAr: 'الرياضيات',           emoji: '🔢' },
  { key: 'science',            nameAr: 'العلوم',              emoji: '🔬' },
  { key: 'social_studies',     nameAr: 'الاجتماعيات',         emoji: '🗺️' },
  { key: 'islamic_education',  nameAr: 'التربية الإسلامية',   emoji: '🌙' },
];

export default function TutorSubjectsScreen() {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <ScreenBg>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>✨ المعلم الذكي</Text>
          <Text style={styles.subtitle}>اختر مادة للبدء بجلسة تعليمية</Text>
        </View>

        <View style={styles.grid}>
          {TUTOR_SUBJECTS.map((subject) => (
            <Pressable
              key={subject.key}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/(customer)/tutor/${subject.key}`)}
            >
              <View style={styles.medallion}>
                <Text style={styles.emoji}>{subject.emoji}</Text>
              </View>
              <Text style={styles.cardLabel}>{subject.nameAr}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, gap: 20 },

  header: { alignItems: 'center', gap: 6, marginBottom: 4 },
  title:   { fontFamily: FONTS.bold,    fontSize: 22, color: COLORS.gold },
  subtitle:{ fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },

  card: {
    width: '47%',
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 12,
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },

  medallion: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji:     { fontSize: 28 },
  cardLabel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'center' },
});
