import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface CategoryService {
  id: string;
  category_key: string;
  label_ar: string;
  label_ckb: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Category {
  key: string;
  name_ar: string;
  name_ckb: string | null;
  is_active: boolean;
}

export default function CategoryServicesScreen() {
  const { profile, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<CategoryService[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [labelAr, setLabelAr] = useState('');
  const [labelCkb, setLabelCkb] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadAll() {
    const [catRes, svcRes] = await Promise.all([
      supabase.from('categories').select('key, name_ar, name_ckb, is_active').order('display_order'),
      supabase.from('category_services').select('*').order('category_key').order('sort_order'),
    ]);
    setCategories((catRes.data ?? []) as Category[]);
    setServices((svcRes.data ?? []) as CategoryService[]);
  }

  useEffect(() => {
    if (!profile) return;
    loadAll();

    const channel = supabase
      .channel('category-services-mobile-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_services' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function handleAdd() {
    setFormError('');
    if (!selectedCategory) { setFormError('اختر تصنيفاً'); return; }
    if (!labelAr.trim()) { setFormError('النص العربي مطلوب'); return; }
    if (!labelCkb.trim()) { setFormError('النص الكردي مطلوب'); return; }
    setSaving(true);
    const sortOrder = (services ?? []).filter((s) => s.category_key === selectedCategory).length;
    const { error } = await supabase.from('category_services').insert({
      category_key: selectedCategory,
      label_ar: labelAr.trim(),
      label_ckb: labelCkb.trim(),
      sort_order: sortOrder,
      created_by: profile!.id,
    });
    setSaving(false);
    if (error) { setFormError(error.message); }
    else { setLabelAr(''); setLabelCkb(''); }
  }

  async function toggleActive(svc: CategoryService) {
    await supabase.from('category_services').update({ is_active: !svc.is_active }).eq('id', svc.id);
    await loadAll();
  }

  function confirmDelete(svc: CategoryService) {
    Alert.alert('حذف الخدمة', `هل تريد حذف "${svc.label_ar}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await supabase.from('category_services').delete().eq('id', svc.id); await loadAll(); } },
    ]);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>خدمات التصنيفات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Add form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>إضافة خدمة جديدة</Text>

          {/* Category picker */}
          <Text style={s.fieldLabel}>التصنيف</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={s.catRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[s.catChip, selectedCategory === cat.key && s.catChipActive]}
                >
                  <Text style={[s.catChipText, selectedCategory === cat.key && s.catChipTextActive]}>{cat.name_ar}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <TextInput
            value={labelAr}
            onChangeText={setLabelAr}
            placeholder="اسم الخدمة (عربي)"
            placeholderTextColor={COLORS.white40}
            style={s.input}
            textAlign="right"
          />
          <TextInput
            value={labelCkb}
            onChangeText={setLabelCkb}
            placeholder="اسم الخدمة (كردي)"
            placeholderTextColor={COLORS.white40}
            style={s.input}
            textAlign="right"
          />
          {formError ? <Text style={s.errorText}>{formError}</Text> : null}
          <Pressable onPress={handleAdd} disabled={saving} style={[s.goldBtn, saving && { opacity: 0.6 }]}>
            <Text style={s.goldBtnText}>{saving ? '...' : '+ إضافة خدمة'}</Text>
          </Pressable>
        </View>

        {/* Services grouped by category */}
        {services === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : (
          categories.map((cat) => {
            const catServices = services.filter((svc) => svc.category_key === cat.key);
            if (catServices.length === 0) return null;
            return (
              <View key={cat.key}>
                <Text style={s.catHeader}>{cat.name_ar}</Text>
                {catServices.map((svc) => (
                  <View key={svc.id} style={s.svcRow}>
                    <Pressable onPress={() => confirmDelete(svc)} style={s.deleteBtn} hitSlop={8}>
                      <Text style={s.deleteBtnText}>✕</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleActive(svc)}
                      style={[s.activeBadge, { backgroundColor: svc.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)' }]}
                    >
                      <Text style={[s.activeBadgeText, { color: svc.is_active ? '#22c55e' : '#ef4444' }]}>
                        {svc.is_active ? 'نشط' : 'متوقف'}
                      </Text>
                    </Pressable>
                    <Text style={s.svcLabel} numberOfLines={1}>{svc.label_ar}</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: { padding: 16, paddingTop: 0, gap: 12 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold, textAlign: 'right' },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  catChipActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.goldBorder },
  catChipText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  catChipTextActive: { color: COLORS.gold, fontFamily: FONTS.bold },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  errorText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444', textAlign: 'right' },
  catHeader: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right', marginBottom: 6, marginTop: 4 },
  svcRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, padding: 10, marginBottom: 6, gap: 8 },
  svcLabel: { flex: 1, fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'right' },
  activeBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontFamily: FONTS.bold, fontSize: 11 },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14, color: '#ef4444' },
});
