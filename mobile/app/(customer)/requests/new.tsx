import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CATEGORIES = [
  { key: 'military',  label: 'الخدمات العسكرية',  emoji: '🪖' },
  { key: 'education', label: 'الخدمات الدراسية',   emoji: '🎓' },
  { key: 'welfare',   label: 'الرعاية الاجتماعية', emoji: '❤️' },
  { key: 'general',   label: 'خدمات أخرى',          emoji: '⭐' },
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
    // Navigate to the created request detail
    router.replace({ pathname: '/(customer)/requests/[id]', params: { id: data.id } });
  }

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.pageTitle}>طلب جديد</Text>
            <Text style={styles.subtitle}>اختر الخدمة واملأ التفاصيل</Text>
          </View>

          {/* Category picker */}
          <GoldCard style={styles.card}>
            <Text style={styles.sectionLabel}>نوع الخدمة</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <GoldButton
                  key={cat.key}
                  label={`${cat.emoji}  ${cat.label}`}
                  onPress={() => setCategory(cat.key)}
                  variant={category === cat.key ? 'gold' : 'ghost'}
                  style={styles.catBtn}
                />
              ))}
            </View>
          </GoldCard>

          {/* Request form */}
          <GoldCard style={styles.card}>
            <Text style={styles.sectionLabel}>تفاصيل الطلب</Text>
            <View style={styles.fields}>
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
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <GoldButton label="إرسال الطلب" onPress={handleSubmit} loading={loading} />
            </View>
          </GoldCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  header: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  card: { gap: 12 },
  sectionLabel: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  catGrid: { gap: 8 },
  catBtn: { width: '100%' },
  fields: { gap: 14 },
  fieldLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right', marginBottom: 6 },
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
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },
});
