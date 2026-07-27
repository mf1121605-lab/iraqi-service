import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Category {
  key: string;
  name_ar: string;
  name_ckb: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
  section_type: string;
  is_active: boolean;
}

const SECTION_TYPES = ['services', 'tools', 'community'];
const SECTION_BADGE: Record<string, string> = { services: '#3b82f6', tools: '#8b5cf6', community: '#22c55e' };
const SECTION_LABELS: Record<string, string> = { services: 'خدمات', tools: 'أدوات', community: 'مجتمع' };

export default function CategoriesScreen() {
  const { profile, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: '', name_ar: '', name_ckb: '', icon: '', section_type: 'services', display_order: '0' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('key, name_ar, name_ckb, description_ar, icon, display_order, section_type, is_active')
      .order('display_order');
    setCategories((data ?? []) as Category[]);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  async function toggleActive(key: string, current: boolean) {
    setToggling(key);
    await supabase.from('categories').update({ is_active: !current }).eq('key', key);
    await load();
    setToggling(null);
  }

  async function handleDelete(key: string, name: string) {
    Alert.alert(
      'حذف التصنيف',
      `هل تريد حذف تصنيف "${name}"؟ لا يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setDeleting(key);
            await supabase.from('categories').delete().eq('key', key);
            await load();
            setDeleting(null);
          },
        },
      ]
    );
  }

  async function updateSectionType(key: string, sectionType: string) {
    await supabase.from('categories').update({ section_type: sectionType }).eq('key', key);
    setEditingSectionKey(null);
    await load();
  }

  async function handleAdd() {
    if (!form.key || !form.name_ar) return;
    setSaving(true);
    await supabase.from('categories').insert({
      key: form.key,
      name_ar: form.name_ar,
      name_ckb: form.name_ckb || null,
      icon: form.icon || null,
      section_type: form.section_type,
      display_order: parseInt(form.display_order) || 0,
      is_active: true,
    });
    setForm({ key: '', name_ar: '', name_ckb: '', icon: '', section_type: 'services', display_order: '0' });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.headerTitle}>التصنيفات</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={s.card}>
            <Text style={s.cardTitle}>تصنيف جديد</Text>
            {[
              { key: 'key', placeholder: 'المفتاح (slug)' },
              { key: 'name_ar', placeholder: 'الاسم بالعربية' },
              { key: 'name_ckb', placeholder: 'الاسم بالكردية' },
              { key: 'icon', placeholder: 'أيقونة (إيموجي)' },
              { key: 'display_order', placeholder: 'ترتيب العرض' },
            ].map((f) => (
              <TextInput
                key={f.key}
                value={(form as Record<string, string>)[f.key]}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.white40}
                style={s.input}
                textAlign="right"
                keyboardType={f.key === 'display_order' ? 'numeric' : 'default'}
                autoCapitalize={f.key === 'key' ? 'none' : 'sentences'}
              />
            ))}
            <Text style={s.sectionLabel}>نوع القسم</Text>
            <View style={s.segmentRow}>
              {SECTION_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setForm((p) => ({ ...p, section_type: t }))} style={[s.segment, form.section_type === t && s.segmentActive]}>
                  <Text style={[s.segmentText, form.section_type === t && { color: COLORS.gold }]}>{SECTION_LABELS[t] ?? t}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleAdd} disabled={saving || !form.key || !form.name_ar} style={[s.goldBtn, (saving || !form.key || !form.name_ar) && { opacity: 0.5 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'حفظ'}</Text>
            </Pressable>
          </View>
        )}

        {categories === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : categories.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا توجد تصنيفات</Text></View>
        ) : categories.map((cat) => (
          <View key={cat.key} style={[s.card, !cat.is_active && { opacity: 0.55 }]}>
            {/* Top row: icon + name + delete */}
            <View style={s.row}>
              <Pressable
                onPress={() => handleDelete(cat.key, cat.name_ar)}
                disabled={deleting === cat.key}
                style={s.deleteBtn}
                hitSlop={6}
              >
                <Text style={s.deleteBtnText}>{deleting === cat.key ? '...' : '🗑'}</Text>
              </Pressable>
              <View style={s.catInfo}>
                <Text style={s.catIcon}>{cat.icon ?? '📁'}</Text>
                <Text style={s.catName}>{cat.name_ar}</Text>
                {cat.name_ckb ? <Text style={s.catNameCkb}>{cat.name_ckb}</Text> : null}
              </View>
            </View>

            {/* Bottom row: toggle + section type */}
            <View style={s.row}>
              <Pressable
                onPress={() => toggleActive(cat.key, cat.is_active)}
                disabled={toggling === cat.key}
                style={[s.toggleBtn, cat.is_active && s.toggleBtnActive]}
              >
                <Text style={[s.toggleText, cat.is_active && { color: '#22c55e' }]}>
                  {toggling === cat.key ? '...' : cat.is_active ? 'نشط' : 'معطّل'}
                </Text>
              </Pressable>

              {/* Section type badge — tap to toggle edit */}
              <Pressable
                onPress={() => setEditingSectionKey(editingSectionKey === cat.key ? null : cat.key)}
                style={[s.sectionBadge, { backgroundColor: (SECTION_BADGE[cat.section_type] ?? COLORS.muted) + '20' }]}
              >
                <Text style={[s.sectionBadgeText, { color: SECTION_BADGE[cat.section_type] ?? COLORS.muted }]}>
                  {SECTION_LABELS[cat.section_type] ?? cat.section_type} ✏️
                </Text>
              </Pressable>
            </View>

            {/* Inline section_type picker (shown when editing) */}
            {editingSectionKey === cat.key && (
              <View style={s.inlineSegmentRow}>
                {SECTION_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => updateSectionType(cat.key, t)}
                    style={[s.segment, cat.section_type === t && s.segmentActive]}
                  >
                    <Text style={[s.segmentText, cat.section_type === t && { color: COLORS.gold }]}>
                      {SECTION_LABELS[t] ?? t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
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
  addBtn: { backgroundColor: COLORS.goldDim, borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  sectionLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  catInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  catIcon: { fontSize: 20 },
  catName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  catNameCkb: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  sectionBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sectionBadgeText: { fontFamily: FONTS.bold, fontSize: 10 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5 },
  deleteBtnText: { fontSize: 14 },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  segmentRow: { flexDirection: 'row', gap: 6 },
  inlineSegmentRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  segment: { flex: 1, borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  segmentActive: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldDim },
  segmentText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
});
