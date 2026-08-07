import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface UrgentItem {
  id: string;
  title_ar: string;
  title_ckb: string | null;
  content_ar: string | null;
  content_ckb: string | null;
  is_active: boolean;
  created_at: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const emptyForm = { title_ar: '', title_ckb: '', content_ar: '', content_ckb: '' };

export default function HqUrgentNews() {
  const { profile, loading } = useAuth();
  const [items, setItems] = useState<UrgentItem[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function setField(key: keyof typeof emptyForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function loadItems() {
    const { data } = await supabase
      .from('urgent_news')
      .select('id, title_ar, title_ckb, content_ar, content_ckb, is_active, created_at')
      .order('created_at', { ascending: false });
    setItems((data ?? []) as UrgentItem[]);
  }

  useEffect(() => {
    if (!profile) return;
    loadItems();
    const channel = supabase
      .channel('hq-urgent-news-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urgent_news' }, loadItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // Deliberately depends on the stable id, not the whole profile object
    // (same convention throughout this codebase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function handleAdd() {
    if (!form.title_ar.trim()) { setError('العنوان العربي مطلوب'); return; }
    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('urgent_news').insert({
      title_ar: form.title_ar.trim(),
      title_ckb: form.title_ckb.trim() || null,
      content_ar: form.content_ar.trim() || null,
      content_ckb: form.content_ckb.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (err) { setError('حدث خطأ أثناء الحفظ'); return; }
    setForm(emptyForm);
    setShowForm(false);
  }

  async function toggleActive(item: UrgentItem) {
    await supabase.from('urgent_news').update({ is_active: !item.is_active }).eq('id', item.id);
  }

  async function handleDelete(id: string) {
    await supabase.from('urgent_news').delete().eq('id', id);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!profile || (profile.role !== 'founder' && profile.role !== 'employee')) {
    return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;
  }

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>›</Text>
        </Pressable>
        <Text style={s.title}>⚡ الأخبار العاجلة</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>خبر عاجل جديد</Text>
            <Text style={s.label}>العنوان (عربي) *</Text>
            <TextInput value={form.title_ar} onChangeText={(v) => setField('title_ar', v)} style={s.input} textAlign="right" placeholder="عنوان الخبر العاجل" placeholderTextColor={COLORS.white40} />
            <Text style={s.label}>العنوان (كردي)</Text>
            <TextInput value={form.title_ckb} onChangeText={(v) => setField('title_ckb', v)} style={s.input} textAlign="right" placeholder="سەردێڕی هەواڵ" placeholderTextColor={COLORS.white40} />
            <Text style={s.label}>التفاصيل (عربي)</Text>
            <TextInput value={form.content_ar} onChangeText={(v) => setField('content_ar', v)} style={[s.input, s.textArea]} textAlign="right" multiline placeholder="تفاصيل الخبر..." placeholderTextColor={COLORS.white40} />
            <Text style={s.label}>التفاصيل (كردي)</Text>
            <TextInput value={form.content_ckb} onChangeText={(v) => setField('content_ckb', v)} style={[s.input, s.textArea]} textAlign="right" multiline placeholder="وردەکارییەکان..." placeholderTextColor={COLORS.white40} />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable onPress={handleAdd} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>نشر الخبر</Text>}
            </Pressable>
          </View>
        )}

        {items === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : items.length === 0 ? (
          <View style={s.center}><Text style={s.empty}>لا توجد أخبار عاجلة حالياً</Text></View>
        ) : items.map((item) => (
          <View key={item.id} style={[s.itemCard, !item.is_active && s.itemInactive]}>
            <View style={s.itemTop}>
              <View style={[s.activeDot, { backgroundColor: item.is_active ? '#22c55e' : COLORS.muted }]} />
              <Text style={s.itemTime}>{formatTime(item.created_at)}</Text>
            </View>
            <Text style={s.itemTitle}>{item.title_ar}</Text>
            {item.title_ckb ? <Text style={s.itemSub}>{item.title_ckb}</Text> : null}
            {item.content_ar ? <Text style={s.itemContent} numberOfLines={2}>{item.content_ar}</Text> : null}
            <View style={s.itemActions}>
              <Pressable onPress={() => toggleActive(item)} style={[s.actionBtn, { borderColor: item.is_active ? '#ef4444' : '#22c55e' }]}>
                <Text style={[s.actionText, { color: item.is_active ? '#ef4444' : '#22c55e' }]}>
                  {item.is_active ? 'إيقاف' : 'تفعيل'}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id)} style={[s.actionBtn, { borderColor: '#ef4444' }]}>
                <Text style={[s.actionText, { color: '#ef4444' }]}>حذف</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white, flex: 1, textAlign: 'right' },
  addBtn: { backgroundColor: 'rgba(230,171,44,0.15)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.goldBorder },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  scroll: { padding: 14, gap: 10 },
  formCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 16, gap: 8, marginBottom: 6 },
  formTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right', marginBottom: 4 },
  label: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  error: { fontFamily: FONTS.regular, fontSize: 13, color: '#ef4444', textAlign: 'center' },
  saveBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#000' },
  itemCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#ef444440', borderRadius: RADIUS.md, padding: 14, gap: 6 },
  itemInactive: { opacity: 0.55 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  itemTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, flex: 1, textAlign: 'right' },
  itemTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  itemSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70, textAlign: 'right' },
  itemContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'right', lineHeight: 20 },
  itemActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  actionBtn: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 5 },
  actionText: { fontFamily: FONTS.bold, fontSize: 12 },
  empty: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
});
