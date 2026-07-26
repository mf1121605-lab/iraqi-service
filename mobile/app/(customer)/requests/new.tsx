import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldInput } from '@/components/ui/GoldInput';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CATEGORIES = [
  { key: 'military',  label: 'الخدمات\nالعسكرية',   emoji: '🪖', colors: ['#1c2a38', '#0f1c28'] as const, accent: '#7da9cc' },
  { key: 'education', label: 'الخدمات\nالدراسية',    emoji: '🎓', colors: ['#1a2640', '#0d1a33'] as const, accent: '#4f8bff' },
  { key: 'welfare',   label: 'الرعاية\nالاجتماعية',  emoji: '❤️', colors: ['#2a1a1a', '#1f0f0f'] as const, accent: '#e14b6a' },
  { key: 'general',   label: 'خدمات\nأخرى',           emoji: '⭐', colors: ['#28220d', '#1c180a'] as const, accent: '#e6ab2c' },
];

export default function NewRequest() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();

  const [category, setCategory] = useState(params.category ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!category) { setError('يرجى اختيار نوع الخدمة'); return; }
    if (!title.trim()) { setError('يرجى كتابة عنوان للطلب'); return; }
    if (!description.trim()) { setError('يرجى كتابة وصف للطلب'); return; }
    if (!session?.user.id) { setError('يرجى تسجيل الدخول أولاً'); return; }

    setLoading(true);
    const { data, error: dbErr } = await supabase
      .from('requests')
      .insert({
        customer_id: session.user.id,
        category,
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
      })
      .select('id')
      .single();

    setLoading(false);
    if (dbErr) {
      setError(dbErr.message || 'حدث خطأ، يرجى المحاولة مجدداً');
      return;
    }
    router.replace({ pathname: '/(customer)/requests/[id]', params: { id: data.id } });
  }

  return (
    <LinearGradient colors={['#080c12', '#0d1117', '#080c12']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backText}>العودة</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.pageTitle}>طلب جديد</Text>
              <Text style={styles.subtitle}>اختر الخدمة واملأ التفاصيل</Text>
            </View>
          </View>

          {/* Category section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>نوع الخدمة</Text>
              <Text style={styles.sectionIcon}>🗂️</Text>
            </View>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    style={[styles.catCard, selected && { borderColor: cat.accent, borderWidth: 2 }]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <LinearGradient
                      colors={cat.colors}
                      style={styles.catGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {selected && (
                        <View style={[styles.selectedGlow, { backgroundColor: cat.accent + '18' }]} />
                      )}
                      <Text style={styles.catEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.catLabel, { color: selected ? cat.accent : COLORS.white70 }]}>
                        {cat.label}
                      </Text>
                      {selected && (
                        <View style={[styles.checkBadge, { backgroundColor: cat.accent }]}>
                          <Text style={styles.checkIcon}>✓</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Form section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              <Text style={styles.sectionIcon}>📝</Text>
            </View>
            <View style={styles.formCard}>
              <GoldInput
                label="عنوان الطلب"
                value={title}
                onChangeText={setTitle}
                placeholder="مثال: معالجة وثيقة التسريح"
              />
              <View>
                <Text style={styles.fieldLabel}>وصف الطلب</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="اكتب تفاصيل طلبك هنا..."
                  placeholderTextColor={COLORS.white40}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={styles.textarea}
                  textAlign="right"
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && styles.submitBtnLoading]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#555', '#444'] : ['#e6ab2c', '#c9882a']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.submitText}>إرسال الطلب ←</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 20 },

  header: { gap: 4, paddingTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backIcon: { fontSize: 22, color: COLORS.gold, lineHeight: 26 },
  backText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gold },
  headerCenter: { alignItems: 'flex-end', gap: 2 },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold },
  sectionIcon: { fontSize: 16 },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47.5%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  catGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
    minHeight: 110,
    justifyContent: 'center',
  },
  selectedGlow: {
    position: 'absolute',
    inset: 0,
    top: 0, left: 0, right: 0, bottom: 0,
  },
  catEmoji: { fontSize: 32 },
  catLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: { fontSize: 11, color: '#000', fontFamily: FONTS.bold },

  formCard: {
    backgroundColor: '#161b22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    padding: 16,
    gap: 14,
  },
  fieldLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white70,
    textAlign: 'right',
    marginBottom: 6,
  },
  textarea: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.3)',
    borderRadius: RADIUS.md,
    padding: 12,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    minHeight: 120,
  },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },

  submitBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  submitBtnPressed: { opacity: 0.8 },
  submitBtnLoading: { opacity: 0.6 },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: FONTS.bold, fontSize: 16, color: '#000' },
});
