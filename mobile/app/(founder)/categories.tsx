import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

// Real `categories` schema (supabase/migrations/20260712121600_categories.sql +
// 20260716120000_admin_dashboard_content.sql + 20260718190000_categories_section_type.sql):
// key, label_ar, label_ckb, is_active, sort_order, section_type, icon_path, icon_video_url.
interface Category {
  key: string;
  label_ar: string;
  label_ckb: string;
  sort_order: number;
  section_type: string;
  icon_path: string | null;
  icon_video_url: string | null;
  is_active: boolean;
}

const SECTION_TYPES = ['services', 'tools', 'community'];
const SECTION_BADGE: Record<string, string> = { services: '#3b82f6', tools: '#8b5cf6', community: '#22c55e' };
const SECTION_LABELS: Record<string, string> = { services: 'خدمات', tools: 'أدوات', community: 'مجتمع' };

async function uploadCategoryMedia(uri: string, kind: 'image' | 'video'): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg');
    const path = `categories/${kind}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = kind === 'video' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, blob, { contentType, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

type FormState = { key: string; label_ar: string; label_ckb: string; section_type: string; sort_order: string; icon_path: string; icon_video_url: string };
const EMPTY_FORM: FormState = { key: '', label_ar: '', label_ckb: '', section_type: 'services', sort_order: '0', icon_path: '', icon_video_url: '' };

export default function CategoriesScreen() {
  const { profile, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState<'image' | 'video' | null>(null);

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('key, label_ar, label_ckb, sort_order, section_type, icon_path, icon_video_url, is_active')
      .order('sort_order');
    setCategories((data ?? []) as Category[]);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  async function toggleActive(key: string, current: boolean) {
    setToggling(key);
    await supabase.from('categories').update({ is_active: !current }).eq('key', key);
    await load();
    setToggling(null);
  }

  function handleDelete(key: string, name: string) {
    Alert.alert('حذف التصنيف', `هل تريد حذف تصنيف "${name}"؟ لا يمكن التراجع.`, [
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
    ]);
  }

  async function updateSectionType(key: string, sectionType: string) {
    await supabase.from('categories').update({ section_type: sectionType }).eq('key', key);
    setEditingSectionKey(null);
    await load();
  }

  async function pickMedia(kind: 'image' | 'video', target: 'add' | 'edit') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: kind === 'image',
      aspect: kind === 'image' ? [1, 1] : undefined,
    });
    if (result.canceled || !result.assets[0]) return;

    const setUploadingFn = target === 'add' ? setUploading : setEditUploading;
    setUploadingFn(kind);
    const url = await uploadCategoryMedia(result.assets[0].uri, kind);
    setUploadingFn(null);
    if (!url) { Alert.alert('خطأ', 'فشل رفع الملف، حاول مرة أخرى'); return; }

    const key = kind === 'image' ? 'icon_path' : 'icon_video_url';
    if (target === 'add') setForm((p) => ({ ...p, [key]: url }));
    else setEditForm((p) => ({ ...p, [key]: url }));
  }

  async function handleAdd() {
    if (!form.key || !form.label_ar || !form.label_ckb) return;
    setSaving(true);
    await supabase.from('categories').insert({
      key: form.key.trim(),
      label_ar: form.label_ar,
      label_ckb: form.label_ckb,
      section_type: form.section_type,
      sort_order: parseInt(form.sort_order) || 0,
      icon_path: form.icon_path || null,
      icon_video_url: form.icon_video_url || null,
      created_by: profile?.id,
      is_active: true,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await load();
  }

  function startEdit(cat: Category) {
    setEditForm({
      key: cat.key,
      label_ar: cat.label_ar,
      label_ckb: cat.label_ckb,
      section_type: cat.section_type,
      sort_order: String(cat.sort_order),
      icon_path: cat.icon_path ?? '',
      icon_video_url: cat.icon_video_url ?? '',
    });
    setEditingKey(cat.key);
    setEditingSectionKey(null);
  }

  async function saveEdit() {
    if (!editingKey || !editForm.label_ar || !editForm.label_ckb) return;
    setEditSaving(true);
    await supabase.from('categories').update({
      label_ar: editForm.label_ar,
      label_ckb: editForm.label_ckb,
      icon_path: editForm.icon_path || null,
      icon_video_url: editForm.icon_video_url || null,
    }).eq('key', editingKey);
    setEditingKey(null);
    setEditSaving(false);
    await load();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

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
            <TextInput value={form.key} onChangeText={(v) => setForm((p) => ({ ...p, key: v }))}
              placeholder="المفتاح (slug)" placeholderTextColor={COLORS.white40}
              style={s.input} textAlign="right" autoCapitalize="none" />
            <TextInput value={form.label_ar} onChangeText={(v) => setForm((p) => ({ ...p, label_ar: v }))}
              placeholder="الاسم بالعربية" placeholderTextColor={COLORS.white40} style={s.input} textAlign="right" />
            <TextInput value={form.label_ckb} onChangeText={(v) => setForm((p) => ({ ...p, label_ckb: v }))}
              placeholder="الاسم بالكردية" placeholderTextColor={COLORS.white40} style={s.input} textAlign="right" />
            <TextInput value={form.sort_order} onChangeText={(v) => setForm((p) => ({ ...p, sort_order: v }))}
              placeholder="ترتيب العرض" placeholderTextColor={COLORS.white40} style={s.input} textAlign="right" keyboardType="numeric" />

            <MediaPicker
              imageUrl={form.icon_path}
              videoUrl={form.icon_video_url}
              uploading={uploading}
              onPickImage={() => pickMedia('image', 'add')}
              onPickVideo={() => pickMedia('video', 'add')}
              onClearImage={() => setForm((p) => ({ ...p, icon_path: '' }))}
              onClearVideo={() => setForm((p) => ({ ...p, icon_video_url: '' }))}
            />

            <Text style={s.sectionLabel}>نوع القسم</Text>
            <View style={s.segmentRow}>
              {SECTION_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setForm((p) => ({ ...p, section_type: t }))} style={[s.segment, form.section_type === t && s.segmentActive]}>
                  <Text style={[s.segmentText, form.section_type === t && { color: COLORS.gold }]}>{SECTION_LABELS[t] ?? t}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleAdd} disabled={saving || !form.key || !form.label_ar || !form.label_ckb} style={[s.goldBtn, (saving || !form.key || !form.label_ar || !form.label_ckb) && { opacity: 0.5 }]}>
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
            {editingKey === cat.key ? (
              <>
                <Text style={s.cardTitle}>تعديل «{cat.label_ar}»</Text>
                <TextInput value={editForm.label_ar} onChangeText={(v) => setEditForm((p) => ({ ...p, label_ar: v }))}
                  placeholder="الاسم بالعربية" placeholderTextColor={COLORS.white40} style={s.input} textAlign="right" />
                <TextInput value={editForm.label_ckb} onChangeText={(v) => setEditForm((p) => ({ ...p, label_ckb: v }))}
                  placeholder="الاسم بالكردية" placeholderTextColor={COLORS.white40} style={s.input} textAlign="right" />
                <MediaPicker
                  imageUrl={editForm.icon_path}
                  videoUrl={editForm.icon_video_url}
                  uploading={editUploading}
                  onPickImage={() => pickMedia('image', 'edit')}
                  onPickVideo={() => pickMedia('video', 'edit')}
                  onClearImage={() => setEditForm((p) => ({ ...p, icon_path: '' }))}
                  onClearVideo={() => setEditForm((p) => ({ ...p, icon_video_url: '' }))}
                />
                <View style={s.editActions}>
                  <Pressable onPress={saveEdit} disabled={editSaving || !editForm.label_ar || !editForm.label_ckb} style={[s.goldBtn, { flex: 1 }, (editSaving || !editForm.label_ar || !editForm.label_ckb) && { opacity: 0.5 }]}>
                    <Text style={s.goldBtnText}>{editSaving ? '...' : 'حفظ التعديلات'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setEditingKey(null)} style={s.cancelBtn}>
                    <Text style={s.cancelBtnText}>إلغاء</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {/* Top row: media thumb + name + edit/delete */}
                <View style={s.row}>
                  <View style={s.rowActions}>
                    <Pressable onPress={() => startEdit(cat)} style={s.editBtn} hitSlop={6}>
                      <Text style={s.editBtnText}>تعديل</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(cat.key, cat.label_ar)} disabled={deleting === cat.key} style={s.deleteBtn} hitSlop={6}>
                      <Text style={s.deleteBtnText}>{deleting === cat.key ? '...' : '🗑'}</Text>
                    </Pressable>
                  </View>
                  <View style={s.catInfo}>
                    {cat.icon_path ? (
                      <Image source={{ uri: cat.icon_path }} style={s.catThumb} />
                    ) : (
                      <View style={[s.catThumb, s.catThumbEmpty]}><Text style={s.catThumbEmoji}>📁</Text></View>
                    )}
                    <View>
                      <Text style={s.catName}>{cat.label_ar}</Text>
                      <Text style={s.catNameCkb}>{cat.label_ckb}</Text>
                    </View>
                  </View>
                </View>

                {cat.icon_video_url ? (
                  <View style={s.videoChipRow}><Text style={s.videoChip}>🎥 يحتوي على فيديو أيقونة</Text></View>
                ) : null}

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

                  <Pressable
                    onPress={() => setEditingSectionKey(editingSectionKey === cat.key ? null : cat.key)}
                    style={[s.sectionBadge, { backgroundColor: (SECTION_BADGE[cat.section_type] ?? COLORS.muted) + '20' }]}
                  >
                    <Text style={[s.sectionBadgeText, { color: SECTION_BADGE[cat.section_type] ?? COLORS.muted }]}>
                      {SECTION_LABELS[cat.section_type] ?? cat.section_type} ✏️
                    </Text>
                  </Pressable>
                </View>

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
              </>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

function MediaPicker({
  imageUrl, videoUrl, uploading, onPickImage, onPickVideo, onClearImage, onClearVideo,
}: {
  imageUrl: string; videoUrl: string; uploading: 'image' | 'video' | null;
  onPickImage: () => void; onPickVideo: () => void; onClearImage: () => void; onClearVideo: () => void;
}) {
  return (
    <View style={s.mediaWrap}>
      <Text style={s.sectionLabel}>أيقونة التصنيف (صورة أو فيديو)</Text>
      <View style={s.mediaRow}>
        <View style={s.mediaSlot}>
          {imageUrl ? (
            <>
              <Image source={{ uri: imageUrl }} style={s.mediaPreview} />
              <Pressable onPress={onClearImage} style={s.mediaClearBtn} hitSlop={6}><Text style={s.mediaClearText}>✕</Text></Pressable>
            </>
          ) : (
            <Pressable onPress={onPickImage} style={s.mediaPickBtn} disabled={uploading === 'image'}>
              {uploading === 'image' ? <ActivityIndicator color={COLORS.gold} size="small" /> : (
                <><Text style={s.mediaPickIcon}>🖼️</Text><Text style={s.mediaPickText}>إضافة صورة</Text></>
              )}
            </Pressable>
          )}
        </View>
        <View style={s.mediaSlot}>
          {videoUrl ? (
            <>
              <View style={[s.mediaPreview, s.mediaVideoBadge]}><Text style={s.mediaPickIcon}>🎥</Text><Text style={s.mediaPickText}>فيديو مرفوع</Text></View>
              <Pressable onPress={onClearVideo} style={s.mediaClearBtn} hitSlop={6}><Text style={s.mediaClearText}>✕</Text></Pressable>
            </>
          ) : (
            <Pressable onPress={onPickVideo} style={s.mediaPickBtn} disabled={uploading === 'video'}>
              {uploading === 'video' ? <ActivityIndicator color={COLORS.gold} size="small" /> : (
                <><Text style={s.mediaPickIcon}>🎥</Text><Text style={s.mediaPickText}>إضافة فيديو</Text></>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
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
  rowActions: { flexDirection: 'row', gap: 6 },
  catInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  catThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#0d1117' },
  catThumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.white20 },
  catThumbEmoji: { fontSize: 16 },
  catName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  catNameCkb: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  videoChipRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  videoChip: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  sectionBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sectionBadgeText: { fontFamily: FONTS.bold, fontSize: 10 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  editBtn: { backgroundColor: 'rgba(230,171,44,0.1)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
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
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center' },
  cancelBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.muted },
  // Media picker
  mediaWrap: { gap: 8 },
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaSlot: { flex: 1, height: 84 },
  mediaPickBtn: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.white20, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mediaPickIcon: { fontSize: 18 },
  mediaPickText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  mediaPreview: { flex: 1, borderRadius: RADIUS.md, backgroundColor: '#0d1117' },
  mediaVideoBadge: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.goldBorder },
  mediaClearBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  mediaClearText: { color: '#fff', fontSize: 12, lineHeight: 14 },
});
