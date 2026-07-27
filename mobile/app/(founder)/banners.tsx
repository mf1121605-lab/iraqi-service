import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Banner {
  id: string;
  title_ar: string | null;
  title_ckb: string | null;
  description_ar: string | null;
  is_active: boolean;
  display_order: number;
  motion_graphic_key: string | null;
}

const MOTION_KEYS = ['welcome', 'military', 'education', 'welfare', 'general'];

export default function BannersScreen() {
  const { profile, loading } = useAuth();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title_ar: '', title_ckb: '', description_ar: '', description_ckb: '', motion_graphic_key: 'general', display_order: '0' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('announcements')
      .select('id, title_ar, title_ckb, description_ar, is_active, display_order, motion_graphic_key')
      .order('display_order');
    setBanners((data ?? []) as Banner[]);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id);
    await load();
    setToggling(null);
  }

  async function handleAdd() {
    if (!form.title_ar) return;
    setSaving(true);
    await supabase.from('announcements').insert({
      title_ar: form.title_ar,
      title_ckb: form.title_ckb || null,
      description_ar: form.description_ar || null,
      description_ckb: (form as Record<string, string>).description_ckb || null,
      motion_graphic_key: form.motion_graphic_key,
      display_order: parseInt(form.display_order) || 0,
      is_active: true,
    });
    setForm({ title_ar: '', title_ckb: '', description_ar: '', description_ckb: '', motion_graphic_key: 'general', display_order: '0' });
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
        <Text style={s.headerTitle}>الإعلانات</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={s.card}>
            <Text style={s.cardTitle}>إعلان جديد</Text>
            {[
              { key: 'title_ar', ph: 'العنوان بالعربية' },
              { key: 'title_ckb', ph: 'العنوان بالكردية' },
              { key: 'description_ar', ph: 'الوصف بالعربية' },
              { key: 'description_ckb', ph: 'الوصف بالكردية' },
              { key: 'display_order', ph: 'ترتيب العرض' },
            ].map((f) => (
              <TextInput
                key={f.key}
                value={(form as Record<string, string>)[f.key]}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                placeholder={f.ph}
                placeholderTextColor={COLORS.white40}
                style={s.input}
                textAlign="right"
                keyboardType={f.key === 'display_order' ? 'numeric' : 'default'}
                multiline={f.key.includes('description')}
              />
            ))}
            <Text style={s.fieldLabel}>نوع الموشن جرافيك</Text>
            <View style={s.segmentWrap}>
              {MOTION_KEYS.map((k) => (
                <Pressable key={k} onPress={() => setForm((p) => ({ ...p, motion_graphic_key: k }))} style={[s.segment, form.motion_graphic_key === k && s.segmentActive]}>
                  <Text style={[s.segmentText, form.motion_graphic_key === k && { color: COLORS.gold }]}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleAdd} disabled={saving || !form.title_ar} style={[s.goldBtn, (saving || !form.title_ar) && { opacity: 0.5 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'حفظ'}</Text>
            </Pressable>
          </View>
        )}

        {banners === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : banners.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا توجد إعلانات</Text></View>
        ) : banners.map((b) => (
          <View key={b.id} style={[s.card, !b.is_active && { opacity: 0.55 }]}>
            <View style={s.row}>
              <Pressable onPress={() => toggleActive(b.id, b.is_active)} disabled={toggling === b.id}
                style={[s.toggleBtn, b.is_active && s.toggleBtnActive]}>
                <Text style={[s.toggleText, b.is_active && { color: '#22c55e' }]}>{toggling === b.id ? '...' : b.is_active ? 'نشط' : 'معطّل'}</Text>
              </Pressable>
              <Text style={s.bannerTitle} numberOfLines={1}>{b.title_ar ?? '—'}</Text>
            </View>
            {b.description_ar ? <Text style={s.bannerDesc} numberOfLines={2}>{b.description_ar}</Text> : null}
            <View style={s.row}>
              {b.motion_graphic_key ? (
                <View style={s.motionBadge}><Text style={s.motionText}>{b.motion_graphic_key}</Text></View>
              ) : null}
              <Text style={s.orderText}>ترتيب: {b.display_order}</Text>
            </View>
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
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 8 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  bannerDesc: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  motionBadge: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  motionText: { fontFamily: FONTS.bold, fontSize: 10, color: '#8b5cf6' },
  orderText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  segmentActive: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldDim },
  segmentText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
});
