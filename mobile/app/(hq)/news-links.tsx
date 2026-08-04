import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

interface Category {
  key: string;
  name_ar: string;
}

interface NewsLink {
  id: string;
  title_ar: string;
  title_ckb: string | null;
  url: string;
  source: string | null;
  category: string | null;
  deadline: string | null;
  requirements_ar: string | null;
  requirements_ckb: string | null;
  required_documents: string | null;
  image_url: string | null;
  video_url: string | null;
  is_published: boolean;
  created_at: string;
}

const EMPTY = {
  titleAr: '',
  titleCkb: '',
  url: '',
  source: '',
  category: '',
  deadline: '',
  requirements: '',
  requirementsCkb: '',
  requiredDocuments: '',
  imageUrl: '',
  videoUrl: '',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad' });
}

export default function HqNewsLinks() {
  const { profile, loading } = useAuth();
  const [links, setLinks] = useState<NewsLink[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [showParseBox, setShowParseBox] = useState(false);

  async function loadLinks() {
    const { data } = await supabase
      .from('news_links')
      .select('*')
      .order('created_at', { ascending: false });
    setLinks((data ?? []) as NewsLink[]);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('key, name_ar')
      .eq('is_active', true)
      .order('display_order');
    setCategories((data ?? []) as Category[]);
  }

  useEffect(() => {
    if (!profile) return;
    loadLinks();
    loadCategories();
    const channel = supabase
      .channel('hq-news-links-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_links' }, loadLinks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // Deliberately depends on the stable id, not the whole profile object —
    // reconnecting this realtime channel on every unrelated profile field
    // change would be wasteful (same convention throughout this codebase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function handleParse() {
    if (!rawText.trim() || parsing) return;
    setParseError('');
    setParsing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${APP_URL}/api/hq/parse-announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: rawText }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setParseError(result.error || 'حدث خطأ ما');
        return;
      }
      setForm(prev => ({
        ...prev,
        titleAr: result.title || prev.titleAr,
        titleCkb: result.titleCkb || prev.titleCkb,
        url: result.link || prev.url,
        source: result.provider || prev.source,
        deadline: result.deadline || prev.deadline,
        requirements: result.requirements || prev.requirements,
        requirementsCkb: result.requirementsCkb || prev.requirementsCkb,
        requiredDocuments: result.requiredDocuments || prev.requiredDocuments,
      }));
    } catch {
      setParseError('حدث خطأ في الاتصال');
    } finally {
      setParsing(false);
    }
  }

  async function handleAdd() {
    if (!form.titleAr.trim() || !form.url.trim()) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('news_links').insert({
      title_ar: form.titleAr.trim(),
      title_ckb: form.titleCkb.trim() || null,
      url: form.url.trim(),
      source: form.source.trim() || null,
      category: form.category || null,
      deadline: form.deadline.trim() || null,
      requirements_ar: form.requirements.trim() || null,
      requirements_ckb: form.requirementsCkb.trim() || null,
      required_documents: form.requiredDocuments.trim() || null,
      image_url: form.imageUrl.trim() || null,
      video_url: form.videoUrl.trim() || null,
      created_by: profile?.id,
      is_published: true,
    });
    if (err) {
      setError(err.message);
    } else {
      setForm(EMPTY);
      setRawText('');
      await loadLinks();
    }
    setSaving(false);
  }

  async function togglePublished(id: string, current: boolean) {
    await supabase.from('news_links').update({ is_published: !current }).eq('id', id);
    loadLinks();
  }

  function handleDelete(id: string) {
    Alert.alert('حذف الرابط', 'هل تريد حذف هذا الرابط؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('news_links').delete().eq('id', id);
          loadLinks();
        },
      },
    ]);
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

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI Parse Section */}
        <View style={s.formCard}>
          <Pressable onPress={() => setShowParseBox(v => !v)} style={s.parseToggle}>
            <Text style={s.parseToggleText}>✨ {showParseBox ? 'إخفاء التحليل الذكي' : 'تحليل ذكي للنص'}</Text>
          </Pressable>
          {showParseBox && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={s.hintText}>الصق نص الإعلان هنا ليتم استخراج البيانات تلقائياً</Text>
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                value={rawText}
                onChangeText={setRawText}
                placeholder="الصق نص الإعلان أو الخبر هنا..."
                placeholderTextColor={COLORS.muted}
                textAlign="right"
                multiline
              />
              {parseError ? <Text style={s.error}>{parseError}</Text> : null}
              <Pressable
                onPress={handleParse}
                disabled={parsing || !rawText.trim()}
                style={[s.parseBtn, (parsing || !rawText.trim()) && s.btnDisabled]}
              >
                <Text style={s.parseBtnText}>{parsing ? 'جارٍ التحليل...' : '✨ تحليل وملء الحقول'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Add Form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>إضافة رابط جديد</Text>

          <TextInput
            style={s.input}
            value={form.titleAr}
            onChangeText={(v) => setForm(f => ({ ...f, titleAr: v }))}
            placeholder="العنوان (عربي) *"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
          />
          <TextInput
            style={s.input}
            value={form.titleCkb}
            onChangeText={(v) => setForm(f => ({ ...f, titleCkb: v }))}
            placeholder="العنوان (كردي)"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
          />
          <TextInput
            style={s.input}
            value={form.url}
            onChangeText={(v) => setForm(f => ({ ...f, url: v }))}
            placeholder="الرابط (URL) *"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            style={s.input}
            value={form.source}
            onChangeText={(v) => setForm(f => ({ ...f, source: v }))}
            placeholder="المصدر / الجهة"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
          />
          <TextInput
            style={s.input}
            value={form.deadline}
            onChangeText={(v) => setForm(f => ({ ...f, deadline: v }))}
            placeholder="الموعد النهائي (مثال: 2026-09-01)"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
          />

          {/* Category chip selector */}
          {categories.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>التصنيف</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                <Pressable
                  onPress={() => setForm(f => ({ ...f, category: '' }))}
                  style={[s.chip, !form.category && s.chipActive]}
                >
                  <Text style={[s.chipText, !form.category && s.chipTextActive]}>بدون</Text>
                </Pressable>
                {categories.map(cat => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setForm(f => ({ ...f, category: cat.key }))}
                    style={[s.chip, form.category === cat.key && s.chipActive]}
                  >
                    <Text style={[s.chipText, form.category === cat.key && s.chipTextActive]}>
                      {cat.name_ar}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.requirements}
            onChangeText={(v) => setForm(f => ({ ...f, requirements: v }))}
            placeholder="المتطلبات (عربي)"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
            multiline
          />
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.requirementsCkb}
            onChangeText={(v) => setForm(f => ({ ...f, requirementsCkb: v }))}
            placeholder="المتطلبات (كردي)"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
            multiline
          />
          <TextInput
            style={[s.input, { height: 60, textAlignVertical: 'top' }]}
            value={form.requiredDocuments}
            onChangeText={(v) => setForm(f => ({ ...f, requiredDocuments: v }))}
            placeholder="المستندات المطلوبة"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
            multiline
          />
          <TextInput
            style={s.input}
            value={form.imageUrl}
            onChangeText={(v) => setForm(f => ({ ...f, imageUrl: v }))}
            placeholder="رابط الصورة (image URL)"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            style={s.input}
            value={form.videoUrl}
            onChangeText={(v) => setForm(f => ({ ...f, videoUrl: v }))}
            placeholder="رابط الفيديو (video URL)"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            keyboardType="url"
          />

          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable
            onPress={handleAdd}
            disabled={saving || !form.titleAr.trim() || !form.url.trim()}
            style={[s.addBtn, (saving || !form.titleAr.trim() || !form.url.trim()) && s.btnDisabled]}
          >
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
              {link.source ? <Text style={s.linkMeta}>{link.source}</Text> : null}
              {link.category ? (
                <Text style={s.linkCat}>
                  📁 {categories.find(c => c.key === link.category)?.name_ar ?? link.category}
                </Text>
              ) : null}
              {link.deadline ? <Text style={s.linkMeta}>📅 {link.deadline}</Text> : null}
              {link.required_documents ? (
                <Text style={s.linkMeta} numberOfLines={1}>📄 {link.required_documents}</Text>
              ) : null}
              <Text style={s.linkDate}>{formatDate(link.created_at)}</Text>
            </View>
            <View style={s.actions}>
              <Pressable
                onPress={() => togglePublished(link.id, link.is_published)}
                style={[s.toggleBtn, { backgroundColor: link.is_published ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)' }]}
              >
                <Text style={[s.toggleText, { color: link.is_published ? '#22c55e' : COLORS.muted }]}>
                  {link.is_published ? 'منشور' : 'مخفي'}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(link.id)} hitSlop={8} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>🗑</Text>
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
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  hintText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  addBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  btnDisabled: { opacity: 0.4 },
  parseToggle: { backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', borderRadius: RADIUS.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  parseToggleText: { fontFamily: FONTS.bold, fontSize: 13, color: '#a78bfa' },
  parseBtn: { backgroundColor: '#7c3aed', borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  parseBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },
  chipsRow: { flexDirection: 'row', gap: 6, paddingRight: 4 },
  chip: { borderWidth: 1, borderColor: COLORS.white20, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.goldBorder },
  chipText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  chipTextActive: { color: COLORS.gold },
  linkCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  linkInfo: { flex: 1, gap: 3 },
  linkTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  linkUrl: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  linkMeta: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  linkCat: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  linkDate: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.white40, textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'column', gap: 6, alignItems: 'center' },
  toggleBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5 },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 14 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 20 },
});
