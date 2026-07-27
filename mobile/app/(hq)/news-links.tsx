import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface NewsLink {
  id: string;
  title_ar: string;
  title_ckb: string | null;
  url: string;
  description_ar: string | null;
  is_published: boolean;
  created_at: string;
}

const EMPTY = { titleAr: '', titleCkb: '', url: '', descAr: '' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad' });
}

export default function HqNewsLinks() {
  const { profile, loading } = useAuth();
  const [links, setLinks] = useState<NewsLink[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadLinks() {
    const { data } = await supabase.from('news_links').select('*').order('created_at', { ascending: false });
    setLinks((data ?? []) as NewsLink[]);
  }

  useEffect(() => { if (profile) loadLinks(); }, [profile?.id]);

  async function handleAdd() {
    if (!form.titleAr.trim() || !form.url.trim()) return;
    setSaving(true); setError('');
    const { error: err } = await supabase.from('news_links').insert({
      title_ar: form.titleAr.trim(),
      title_ckb: form.titleCkb.trim() || null,
      url: form.url.trim(),
      description_ar: form.descAr.trim() || null,
      is_published: true,
    });
    if (err) { setError(err.message); } else { setForm(EMPTY); loadLinks(); }
    setSaving(false);
  }

  async function togglePublished(id: string, current: boolean) {
    await supabase.from('news_links').update({ is_published: !current }).eq('id', id);
    loadLinks();
  }

  async function handleDelete(id: string) {
    await supabase.from('news_links').delete().eq('id', id);
    loadLinks();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!profile || (profile.role !== 'founder' && profile.role !== 'employee')) {
    return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;
  }

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>📰 الروابط الإخبارية</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Add form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>إضافة رابط جديد</Text>
          <TextInput style={s.input} value={form.titleAr} onChangeText={(v) => setForm(f => ({ ...f, titleAr: v }))} placeholder="العنوان (عربي) *" placeholderTextColor={COLORS.muted} textAlign="right" />
          <TextInput style={s.input} value={form.titleCkb} onChangeText={(v) => setForm(f => ({ ...f, titleCkb: v }))} placeholder="العنوان (كردي)" placeholderTextColor={COLORS.muted} textAlign="right" />
          <TextInput style={s.input} value={form.url} onChangeText={(v) => setForm(f => ({ ...f, url: v }))} placeholder="الرابط (URL) *" placeholderTextColor={COLORS.muted} autoCapitalize="none" keyboardType="url" />
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.descAr} onChangeText={(v) => setForm(f => ({ ...f, descAr: v }))} placeholder="وصف مختصر" placeholderTextColor={COLORS.muted} textAlign="right" multiline />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable onPress={handleAdd} disabled={saving || !form.titleAr.trim() || !form.url.trim()} style={({ pressed }) => [s.addBtn, (saving || !form.titleAr.trim() || !form.url.trim()) && s.btnDisabled, pressed && { opacity: 0.75 }]}>
            <Text style={s.addBtnText}>{saving ? '...' : '+ إضافة'}</Text>
          </Pressable>
        </View>

        {/* Links list */}
        {links === null ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 20 }} />
        ) : links.length === 0 ? (
          <Text style={s.emptyText}>لا توجد روابط بعد</Text>
        ) : links.map((link) => (
          <View key={link.id} style={s.linkCard}>
            <View style={s.linkInfo}>
              <Text style={s.linkTitle}>{link.title_ar}</Text>
              <Text style={s.linkUrl} numberOfLines={1}>{link.url}</Text>
              <Text style={s.linkDate}>{formatDate(link.created_at)}</Text>
            </View>
            <View style={s.actions}>
              <Pressable onPress={() => togglePublished(link.id, link.is_published)} style={[s.toggleBtn, { backgroundColor: link.is_published ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                <Text style={[s.toggleText, { color: link.is_published ? '#22c55e' : COLORS.muted }]}>
                  {link.is_published ? 'منشور' : 'مخفي'}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(link.id)} hitSlop={8} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>✕</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  scroll: { padding: 16, gap: 12 },
  formCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 16, gap: 10 },
  formTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  addBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  btnDisabled: { opacity: 0.4 },
  linkCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkInfo: { flex: 1 },
  linkTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  linkUrl: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  linkDate: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.white40, textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toggleBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5 },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 14, color: '#ef4444' },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 20 },
});
