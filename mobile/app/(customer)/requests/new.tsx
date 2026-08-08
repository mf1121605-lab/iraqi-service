import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldInput } from '@/components/ui/GoldInput';
import { FireGlowWrap } from '@/components/ui/FireGlowWrap';
import { AnimatedGoldBorder } from '@/components/ui/AnimatedGoldBorder';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CAT_THEMES: Record<string, { emoji: string; accent: string; colors: [string, string] }> = {
  military:  { emoji: '🪖', accent: '#7da9cc', colors: ['#1c2a38', '#0f1c28'] },
  education: { emoji: '🎓', accent: '#4f8bff', colors: ['#1a2640', '#0d1a33'] },
  welfare:   { emoji: '❤️', accent: '#e14b6a', colors: ['#2a1a1a', '#1f0f0f'] },
  general:   { emoji: '⭐', accent: '#e6ab2c', colors: ['#28220d', '#1c180a'] },
};
const DEFAULT_THEME = { emoji: '🔹', accent: '#e6ab2c', colors: ['#1a1a2e', '#0f0f1a'] as [string, string] };

type Category = { key: string; label_ar: string };
type Service  = { id: string; label_ar: string; description: string | null };

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date';
type DynamicField = {
  id: string;
  field_key: string;
  label_ar: string;
  field_type: FieldType;
  options: { value: string; label_ar: string }[] | null;
  is_required: boolean;
};
type DynamicAnswer = string | boolean;

export default function NewRequest() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();

  const [category, setCategory] = useState(params.category ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState('');

  // Services belonging to the chosen category, and which one was picked.
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');

  // The interactive third level: sub-questions that belong to whichever
  // service is currently selected, and the customer's answers to them.
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [answers, setAnswers] = useState<Record<string, DynamicAnswer>>({});

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('key, label_ar')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setCategories(data as Category[]);
    setLoadingCats(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // Only the services the founder attached to THIS category.
  useEffect(() => {
    setServiceId('');
    if (!category) { setServices([]); return; }
    supabase
      .from('category_services')
      .select('id, label_ar, description')
      .eq('category_key', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setServices((data ?? []) as Service[]));
  }, [category]);

  // The interactive third level: whichever service is picked may carry its
  // own founder-defined sub-questions (e.g. "تقديم ذوي الاحتياجات الخاصة"
  // asking for disability type). Re-fetched fresh every time the service
  // changes, and answers reset so a stale answer from a previous service
  // never rides along into the submission.
  useEffect(() => {
    setAnswers({});
    if (!serviceId) { setDynamicFields([]); return; }
    supabase
      .from('service_dynamic_fields')
      .select('id, field_key, label_ar, field_type, options, is_required')
      .eq('service_id', serviceId)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setDynamicFields((data ?? []) as DynamicField[]));
  }, [serviceId]);

  function setAnswer(key: string, value: DynamicAnswer) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError('');
    if (!category) { setError('يرجى اختيار نوع الخدمة'); return; }
    if (!title.trim()) { setError('يرجى كتابة عنوان للطلب'); return; }
    if (!session?.user.id) { setError('يرجى تسجيل الدخول أولاً'); return; }

    const missing = dynamicFields.find((f) => {
      if (!f.is_required) return false;
      const v = answers[f.field_key];
      return f.field_type === 'checkbox' ? v !== true : !String(v ?? '').trim();
    });
    if (missing) { setError(`يرجى تعبئة: ${missing.label_ar}`); return; }

    setLoading(true);
    const { data, error: dbErr } = await supabase
      .from('requests')
      .insert({
        customer_id: session.user.id,
        category,
        // Recorded so the employee sees the exact service picked, not just
        // the broad category. Nullable: a customer may still describe a
        // request that matches none of the listed services.
        service_id: serviceId || null,
        title: title.trim(),
        description: description.trim() || null,
        dynamic_answers: dynamicFields.length > 0 ? answers : null,
        status: 'submitted',
      })
      .select('id')
      .single();

    setLoading(false);
    if (dbErr) {
      setError(dbErr.message || 'حدث خطأ، يرجى المحاولة مجدداً');
      return;
    }
    // Search for an available employee next, instead of jumping straight
    // to a chat with nobody assigned yet.
    // matching only shows employees assigned to this service when one was
    // chosen; otherwise it falls back to the whole category as before.
    router.replace({
      pathname: '/(customer)/requests/matching',
      params: { requestId: data.id, category, ...(serviceId ? { serviceId } : {}) },
    });
  }

  return (
    <ScreenBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>›</Text>
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

            {loadingCats ? (
              <View style={styles.catsLoader}>
                <ActivityIndicator color={COLORS.gold} size="small" />
              </View>
            ) : (
              <View style={styles.catGrid}>
                {categories.map((cat) => {
                  const theme = CAT_THEMES[cat.key] ?? DEFAULT_THEME;
                  const selected = category === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      style={[styles.catCard, selected && { borderColor: theme.accent, borderWidth: 2 }]}
                      onPress={() => setCategory(cat.key)}
                    >
                      <LinearGradient
                        colors={theme.colors}
                        style={styles.catGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {selected && (
                          <View style={[styles.selectedGlow, { backgroundColor: theme.accent + '18' }]} />
                        )}
                        <Text style={styles.catEmoji}>{theme.emoji}</Text>
                        <Text style={[styles.catLabel, { color: selected ? theme.accent : COLORS.white70 }]}>
                          {cat.label_ar}
                        </Text>
                        {selected && (
                          <View style={[styles.checkBadge, { backgroundColor: theme.accent }]}>
                            <Text style={styles.checkIcon}>✓</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Service picker — only appears once a category is chosen, and
              only if the founder has defined services for it. A category with
              no services still submits fine; service_id just stays null. */}
          {category !== '' && services.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>الخدمة المطلوبة</Text>
                <Text style={styles.sectionIcon}>📋</Text>
              </View>
              <View style={styles.svcList}>
                {services.map((svc) => {
                  const selected = serviceId === svc.id;
                  return (
                    <Pressable
                      key={svc.id}
                      onPress={() => setServiceId(selected ? '' : svc.id)}
                      style={({ pressed }) => [
                        styles.svcRow,
                        selected && styles.svcRowOn,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={[styles.svcRadio, selected && styles.svcRadioOn]}>
                        {selected && <View style={styles.svcRadioDot} />}
                      </View>
                      <View style={styles.svcTextWrap}>
                        <Text style={[styles.svcLabel, selected && { color: COLORS.gold }]} numberOfLines={2}>
                          {svc.label_ar}
                        </Text>
                        {svc.description ? (
                          <Text style={styles.svcDesc} numberOfLines={2}>{svc.description}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Interactive sub-questions — only appear once a service that
              actually carries any (founder-configured per service) is
              chosen. This is the compound/interactive third level on top
              of category -> service. */}
          {dynamicFields.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>معلومات إضافية</Text>
                <Text style={styles.sectionIcon}>❓</Text>
              </View>
              <View style={[styles.formCard, styles.formCardBorder]}>
                {dynamicFields.map((f) => (
                  <View key={f.id}>
                    <Text style={styles.fieldLabel}>
                      {f.label_ar}{f.is_required ? ' *' : ''}
                    </Text>
                    {f.field_type === 'checkbox' ? (
                      <View style={styles.checkboxRow}>
                        <Switch
                          value={answers[f.field_key] === true}
                          onValueChange={(v) => setAnswer(f.field_key, v)}
                          thumbColor={answers[f.field_key] === true ? COLORS.gold : '#888'}
                          trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
                        />
                        <Text style={styles.checkboxLabel}>
                          {answers[f.field_key] === true ? 'نعم' : 'لا'}
                        </Text>
                      </View>
                    ) : f.field_type === 'select' ? (
                      <View style={styles.selectRow}>
                        {(f.options ?? []).map((opt) => {
                          const on = answers[f.field_key] === opt.value;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => setAnswer(f.field_key, opt.value)}
                              style={[styles.selectChip, on && styles.selectChipActive]}
                            >
                              <Text style={[styles.selectChipText, on && styles.selectChipTextActive]}>
                                {opt.label_ar}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : f.field_type === 'textarea' ? (
                      <TextInput
                        value={(answers[f.field_key] as string) ?? ''}
                        onChangeText={(t) => setAnswer(f.field_key, t)}
                        placeholderTextColor={COLORS.white40}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={styles.textarea}
                        textAlign="right"
                      />
                    ) : (
                      <TextInput
                        value={(answers[f.field_key] as string) ?? ''}
                        onChangeText={(t) => setAnswer(f.field_key, t)}
                        placeholder={f.field_type === 'date' ? 'YYYY-MM-DD' : undefined}
                        placeholderTextColor={COLORS.white40}
                        keyboardType={f.field_type === 'number' ? 'numeric' : 'default'}
                        style={styles.input}
                        textAlign="right"
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Form section — wrapped in a live animated gold border, the
              whole request-submission box, not just the submit button. */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              <Text style={styles.sectionIcon}>📝</Text>
            </View>
            <AnimatedGoldBorder
              borderRadius={RADIUS.lg}
              borderWidth={1.5}
              innerBg="#161b22"
              fillHeight={false}
              innerStyle={styles.formCard}
            >
              <GoldInput
                label="عنوان الطلب"
                value={title}
                onChangeText={setTitle}
                placeholder="مثال: معالجة وثيقة التسريح"
              />
              <View>
                <Text style={styles.fieldLabel}>وصف الطلب (اختياري)</Text>
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

              <FireGlowWrap borderRadius={RADIUS.md}>
                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && styles.submitBtnLoading]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {!loading && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
                  <LinearGradient
                    colors={loading ? ['#555', '#444'] : ['rgba(249,115,22,0.55)', 'rgba(220,38,38,0.42)', 'rgba(230,171,44,0.35)']}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.submitText}>إرسال الطلب والبحث عن موظف حالي ←</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </FireGlowWrap>
            </AnimatedGoldBorder>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 20 },

  header: { gap: 4 },
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

  svcList: { gap: 8 },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 12,
  },
  svcRowOn: { borderColor: COLORS.gold, backgroundColor: 'rgba(230,171,44,0.10)' },
  svcRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.white40, alignItems: 'center', justifyContent: 'center',
  },
  svcRadioOn: { borderColor: COLORS.gold },
  svcRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  svcTextWrap: { flex: 1 },
  svcLabel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  svcDesc: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 2 },

  catsLoader: { height: 80, alignItems: 'center', justifyContent: 'center' },

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
    minHeight: 100,
    justifyContent: 'center',
  },
  selectedGlow: {
    position: 'absolute',
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
    padding: 16,
    gap: 14,
  },
  // Applied on top of formCard only where it's used as a plain View (not
  // inside AnimatedGoldBorder, which already draws its own Skia border) —
  // e.g. the "معلومات إضافية" dynamic-fields section.
  formCardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.3)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  checkboxRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectChipActive: { backgroundColor: 'rgba(230,171,44,0.15)', borderColor: COLORS.gold },
  selectChipText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70 },
  selectChipTextActive: { color: COLORS.gold, fontFamily: FONTS.bold },
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
  submitText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
});
