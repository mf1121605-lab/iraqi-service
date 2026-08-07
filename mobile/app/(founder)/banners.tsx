import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

function uploadBannerMedia(uri: string, kind: 'image' | 'video') {
  const ext = uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg');
  const contentType = kind === 'video' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return uploadToStorage(uri, 'site-assets', `banners/${kind}/${Date.now()}.${ext}`, contentType);
}

interface Banner {
  id: string;
  title_ar: string | null;
  title_ckb: string | null;
  description_ar: string | null;
  description_ckb: string | null;
  badge_ar: string | null;
  badge_ckb: string | null;
  button_text_ar: string | null;
  button_text_ckb: string | null;
  button_link: string | null;
  image_url: string | null;
  video_url: string | null;
  mobile_image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  motion_graphic_key: string | null;
  display_order: number;
  is_active: boolean;
}

const MOTION_KEYS = ['', 'welcome', 'military', 'education', 'welfare', 'general'];
const MOTION_LABELS: Record<string, string> = {
  '': 'بدون', welcome: 'ترحيبي', military: 'عسكري', education: 'دراسي', welfare: 'رعاية', general: 'عام',
};

type FormState = {
  title_ar: string; title_ckb: string;
  description_ar: string; description_ckb: string;
  badge_ar: string; badge_ckb: string;
  button_text_ar: string; button_text_ckb: string; button_link: string;
  image_url: string; video_url: string; mobile_image_url: string;
  background_color: string; text_color: string;
  motion_graphic_key: string; display_order: string;
};

const EMPTY_FORM: FormState = {
  title_ar: '', title_ckb: '', description_ar: '', description_ckb: '',
  badge_ar: '', badge_ckb: '', button_text_ar: '', button_text_ckb: '', button_link: '',
  image_url: '', video_url: '', mobile_image_url: '',
  background_color: '#0f172a', text_color: '#ffffff',
  motion_graphic_key: 'general', display_order: '0',
};

export default function BannersScreen() {
  const { profile, loading } = useAuth();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('announcements')
      .select('id, title_ar, title_ckb, description_ar, description_ckb, badge_ar, badge_ckb, button_text_ar, button_text_ckb, button_link, image_url, video_url, mobile_image_url, background_color, text_color, motion_graphic_key, display_order, is_active')
      .order('display_order');
    setBanners((data ?? []) as Banner[]);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  function setField(key: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setEditField(key: keyof FormState, value: string) {
    setEditForm((p) => ({ ...p, [key]: value }));
  }

  async function pickAndUpload(fieldKey: 'image_url' | 'video_url' | 'mobile_image_url', setter: (k: keyof FormState, v: string) => void) {
    const kind: 'image' | 'video' = fieldKey === 'video_url' ? 'video' : 'image';
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: kind === 'image',
      aspect: kind === 'image' ? [16, 9] : undefined,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingField(fieldKey);
    const { url, error } = await uploadBannerMedia(result.assets[0].uri, kind);
    setUploadingField(null);
    // Previously this returned silently on failure: the spinner stopped, the
    // field stayed empty and nothing explained why, which is exactly the
    // "الرفع لا يُحفظ ولا يظهر" report. Storage rejections (bucket policy,
    // missing bucket, size limit) now surface verbatim.
    if (!url) {
      Alert.alert('تعذّر رفع الملف', error ?? 'سبب غير معروف');
      return;
    }
    setter(fieldKey, url);
  }

  function startEdit(b: Banner) {
    setEditForm({
      title_ar: b.title_ar ?? '', title_ckb: b.title_ckb ?? '',
      description_ar: b.description_ar ?? '', description_ckb: b.description_ckb ?? '',
      badge_ar: b.badge_ar ?? '', badge_ckb: b.badge_ckb ?? '',
      button_text_ar: b.button_text_ar ?? '', button_text_ckb: b.button_text_ckb ?? '', button_link: b.button_link ?? '',
      image_url: b.image_url ?? '', video_url: b.video_url ?? '', mobile_image_url: b.mobile_image_url ?? '',
      background_color: b.background_color ?? '#0f172a', text_color: b.text_color ?? '#ffffff',
      motion_graphic_key: b.motion_graphic_key ?? 'general',
      display_order: String(b.display_order),
    });
    setEditingId(b.id);
  }

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id);
    await load();
    setToggling(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('announcements').delete().eq('id', id);
    await load();
    setDeleting(null);
  }

  async function handleAdd() {
    if (!form.title_ar) return;
    setSaving(true);
    await supabase.from('announcements').insert({
      title_ar: form.title_ar,
      title_ckb: form.title_ckb || null,
      description_ar: form.description_ar || null,
      description_ckb: form.description_ckb || null,
      badge_ar: form.badge_ar || null,
      badge_ckb: form.badge_ckb || null,
      button_text_ar: form.button_text_ar || null,
      button_text_ckb: form.button_text_ckb || null,
      button_link: form.button_link || null,
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      mobile_image_url: form.mobile_image_url || null,
      background_color: form.background_color || '#0f172a',
      text_color: form.text_color || '#ffffff',
      motion_graphic_key: form.motion_graphic_key || null,
      display_order: parseInt(form.display_order) || 0,
      is_active: true,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function saveEdit() {
    if (!editingId || !editForm.title_ar) return;
    setEditSaving(true);
    await supabase.from('announcements').update({
      title_ar: editForm.title_ar,
      title_ckb: editForm.title_ckb || null,
      description_ar: editForm.description_ar || null,
      description_ckb: editForm.description_ckb || null,
      badge_ar: editForm.badge_ar || null,
      badge_ckb: editForm.badge_ckb || null,
      button_text_ar: editForm.button_text_ar || null,
      button_text_ckb: editForm.button_text_ckb || null,
      button_link: editForm.button_link || null,
      image_url: editForm.image_url || null,
      video_url: editForm.video_url || null,
      mobile_image_url: editForm.mobile_image_url || null,
      background_color: editForm.background_color || '#0f172a',
      text_color: editForm.text_color || '#ffffff',
      motion_graphic_key: editForm.motion_graphic_key || null,
      display_order: parseInt(editForm.display_order) || 0,
    }).eq('id', editingId);
    setEditingId(null);
    setEditSaving(false);
    await load();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}><Text style={s.backArrow}>›</Text></Pressable>
        <Text style={s.headerTitle}>الإعلانات</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={s.card}>
            <Text style={s.cardTitle}>إعلان جديد</Text>
            <FormFields form={form} setField={setField} uploadingField={uploadingField} onPickMedia={(k) => pickAndUpload(k, setField)} />
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
          <View key={b.id} style={[s.card, !b.is_active && { opacity: 0.6 }]}>
            <View style={s.row}>
              <View style={s.rowActions}>
                <Pressable onPress={() => startEdit(b)} style={s.editBtn}>
                  <Text style={s.editBtnText}>تعديل</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(b.id)} disabled={deleting === b.id} style={s.deleteBtn}>
                  <Text style={s.deleteBtnText}>{deleting === b.id ? '...' : '🗑'}</Text>
                </Pressable>
              </View>
              <Text style={s.bannerTitle} numberOfLines={1}>{b.title_ar ?? '—'}</Text>
            </View>
            {b.description_ar ? <Text style={s.bannerDesc} numberOfLines={2}>{b.description_ar}</Text> : null}
            <View style={s.row}>
              <Pressable onPress={() => toggleActive(b.id, b.is_active)} disabled={toggling === b.id}
                style={[s.toggleBtn, b.is_active && s.toggleBtnActive]}>
                <Text style={[s.toggleText, b.is_active && { color: '#22c55e' }]}>{toggling === b.id ? '...' : b.is_active ? 'نشط' : 'معطّل'}</Text>
              </Pressable>
              <View style={s.metaRow}>
                {b.motion_graphic_key ? (
                  <View style={s.motionBadge}><Text style={s.motionText}>{MOTION_LABELS[b.motion_graphic_key] ?? b.motion_graphic_key}</Text></View>
                ) : null}
                {b.image_url ? <Text style={s.metaChip}>📷</Text> : null}
                {b.video_url ? <Text style={s.metaChip}>🎥</Text> : null}
                <Text style={s.orderText}>#{b.display_order}</Text>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingId} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
              <Text style={s.modalTitle}>تعديل الإعلان</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FormFields form={editForm} setField={setEditField} uploadingField={uploadingField} onPickMedia={(k) => pickAndUpload(k, setEditField)} />
              <Pressable onPress={saveEdit} disabled={editSaving || !editForm.title_ar}
                style={[s.goldBtn, (editSaving || !editForm.title_ar) && { opacity: 0.5 }, { marginTop: 8 }]}>
                <Text style={s.goldBtnText}>{editSaving ? '...' : 'حفظ التعديلات'}</Text>
              </Pressable>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBg>
  );
}

function FormFields({
  form, setField, uploadingField, onPickMedia,
}: {
  form: FormState;
  setField: (k: keyof FormState, v: string) => void;
  uploadingField: string | null;
  onPickMedia: (k: 'image_url' | 'video_url' | 'mobile_image_url') => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>— المحتوى —</Text>
      {([
        ['title_ar', 'العنوان بالعربية', false],
        ['title_ckb', 'العنوان بالكردية', false],
        ['description_ar', 'الوصف بالعربية', true],
        ['description_ckb', 'الوصف بالكردية', true],
        ['badge_ar', 'شارة (عربي، اختياري)', false],
        ['badge_ckb', 'شارة (كردي، اختياري)', false],
      ] as [keyof FormState, string, boolean][]).map(([key, ph, multi]) => (
        <TextInput key={key} value={form[key]} onChangeText={(v) => setField(key, v)}
          placeholder={ph} placeholderTextColor={COLORS.white40}
          style={[s.input, multi && { height: 70, textAlignVertical: 'top' }]}
          textAlign="right" multiline={multi} />
      ))}

      <Text style={s.sectionLabel}>— زر الدعوة —</Text>
      {([
        ['button_text_ar', 'نص الزر (عربي)', false],
        ['button_text_ckb', 'نص الزر (كردي)', false],
        ['button_link', 'رابط الزر', false],
      ] as [keyof FormState, string, boolean][]).map(([key, ph]) => (
        <TextInput key={key} value={form[key]} onChangeText={(v) => setField(key, v)}
          placeholder={ph} placeholderTextColor={COLORS.white40}
          style={s.input} textAlign="right" autoCapitalize="none" />
      ))}

      <Text style={s.sectionLabel}>— الصور والفيديو —</Text>
      {([
        ['image_url', 'الصورة الرئيسية', 'image'],
        ['video_url', 'الفيديو', 'video'],
        ['mobile_image_url', 'صورة الجوال', 'image'],
      ] as [ 'image_url' | 'video_url' | 'mobile_image_url', string, 'image' | 'video'][]).map(([key, label, kind]) => (
        <View key={key} style={s.mediaFieldWrap}>
          <Text style={s.mediaFieldLabel}>{label}</Text>
          <View style={s.mediaFieldRow}>
            {form[key] ? (
              kind === 'image' ? (
                <Image source={{ uri: form[key] }} style={s.mediaFieldThumb} />
              ) : (
                <View style={[s.mediaFieldThumb, s.mediaFieldVideoThumb]}><Text style={{ fontSize: 16 }}>🎥</Text></View>
              )
            ) : null}
            <Pressable onPress={() => onPickMedia(key)} disabled={uploadingField === key} style={s.mediaUploadBtn}>
              {uploadingField === key ? <ActivityIndicator color={COLORS.gold} size="small" /> : (
                <Text style={s.mediaUploadBtnText}>{form[key] ? 'استبدال' : `رفع ${kind === 'video' ? 'فيديو' : 'صورة'}`}</Text>
              )}
            </Pressable>
          </View>
          <TextInput value={form[key]} onChangeText={(v) => setField(key, v)}
            placeholder="أو الصق رابطاً مباشراً" placeholderTextColor={COLORS.white40}
            style={s.input} textAlign="right" autoCapitalize="none" keyboardType="url" />
        </View>
      ))}

      <Text style={s.sectionLabel}>— الألوان —</Text>
      <View style={s.colorRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.colorLabel}>لون الخلفية</Text>
          <TextInput value={form.background_color} onChangeText={(v) => setField('background_color', v)}
            placeholder="#0f172a" placeholderTextColor={COLORS.white40}
            style={[s.input, { fontFamily: 'monospace' }]} autoCapitalize="none" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.colorLabel}>لون النص</Text>
          <TextInput value={form.text_color} onChangeText={(v) => setField('text_color', v)}
            placeholder="#ffffff" placeholderTextColor={COLORS.white40}
            style={[s.input, { fontFamily: 'monospace' }]} autoCapitalize="none" />
        </View>
      </View>

      <Text style={s.sectionLabel}>— موشن جرافيك —</Text>
      <View style={s.segmentWrap}>
        {MOTION_KEYS.map((k) => (
          <Pressable key={k || '__none'} onPress={() => setField('motion_graphic_key', k)}
            style={[s.segment, form.motion_graphic_key === k && s.segmentActive]}>
            <Text style={[s.segmentText, form.motion_graphic_key === k && { color: COLORS.gold }]}>
              {MOTION_LABELS[k] ?? k}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionLabel}>— الترتيب —</Text>
      <TextInput value={form.display_order} onChangeText={(v) => setField('display_order', v)}
        placeholder="ترتيب العرض (رقم)" placeholderTextColor={COLORS.white40}
        style={s.input} keyboardType="numeric" textAlign="right" />
    </>
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
  sectionLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActions: { flexDirection: 'row', gap: 6 },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  bannerDesc: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaChip: { fontSize: 14 },
  motionBadge: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  motionText: { fontFamily: FONTS.bold, fontSize: 10, color: '#8b5cf6' },
  orderText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  toggleBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  editBtn: { backgroundColor: 'rgba(230,171,44,0.1)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5 },
  deleteBtnText: { fontSize: 13 },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },
  colorRow: { flexDirection: 'row', gap: 8 },
  colorLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginBottom: 4 },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { borderWidth: 1, borderColor: COLORS.white20, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  segmentActive: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldDim },
  segmentText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0d1117', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%', borderTopWidth: 1, borderColor: COLORS.goldBorder },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  modalClose: { fontSize: 18, color: COLORS.muted, padding: 4 },
  // Media upload
  mediaFieldWrap: { gap: 6 },
  mediaFieldLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  mediaFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaFieldThumb: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: '#0d1117' },
  mediaFieldVideoThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.goldBorder },
  mediaUploadBtn: { flex: 1, backgroundColor: 'rgba(230,171,44,0.1)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  mediaUploadBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
});
