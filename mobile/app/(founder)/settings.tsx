import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { FONT_FAMILIES } from '@/hooks/useAppTheme';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

interface FounderSettings {
  id: string;
  accent_color: string | null;
  bg_color: string | null;
  hero_title_ar: string | null;
  hero_title_ckb: string | null;
  hero_subtitle_ar: string | null;
  hero_subtitle_ckb: string | null;
  footer_phone: string | null;
  footer_email: string | null;
  footer_legal_ar: string | null;
  footer_legal_ckb: string | null;
  footer_instagram_url: string | null;
  footer_twitter_url: string | null;
  site_ambient_audio_url: string | null;
  announcement_enabled: boolean | null;
  announcement_text_ar: string | null;
  announcement_text_ckb: string | null;
  frame_color: string | null;
  frame_enabled: boolean | null;
  frame_width: number | null;
  frame_radius: number | null;
  background_image_path: string | null;
  background_color: string | null;
  particles_enabled: boolean | null;
  // Added by the app-theme migration; read live by hooks/useAppTheme.tsx.
  app_font_family: string | null;
  app_text_color: string | null;
  app_font_scale: number | null;
}

const TEXT_COLOR_PRESETS = [
  { hex: '#ffffff', label: 'أبيض' },
  { hex: '#e6ab2c', label: 'ذهبي' },
  { hex: '#e2e8f0', label: 'فضي' },
  { hex: '#fcd34d', label: 'ذهبي فاتح' },
  { hex: '#a7f3d0', label: 'أخضر فاتح' },
  { hex: '#bfdbfe', label: 'أزرق فاتح' },
];

const FONT_SCALES = [
  { value: 0.9, label: 'صغير' },
  { value: 1.0, label: 'عادي' },
  { value: 1.1, label: 'كبير' },
  { value: 1.25, label: 'أكبر' },
];

const ACCENT_PRESETS = [
  { hex: '#f59e0b', label: 'ذهبي' },
  { hex: '#3b82f6', label: 'أزرق' },
  { hex: '#8b5cf6', label: 'بنفسجي' },
  { hex: '#ec4899', label: 'وردي' },
  { hex: '#10b981', label: 'أخضر' },
  { hex: '#ef4444', label: 'أحمر' },
  { hex: '#06b6d4', label: 'سماوي' },
  { hex: '#f97316', label: 'برتقالي' },
];

const BG_PRESETS = [
  { hex: '#0d1117', label: 'رمادي غامق' },
  { hex: '#000000', label: 'أسود' },
  { hex: '#111827', label: 'رمادي داكن' },
  { hex: '#0a192f', label: 'أزرق داكن' },
  { hex: '#1a0a2e', label: 'بنفسجي داكن' },
  { hex: '#1a0f00', label: 'بني داكن' },
];

const FRAME_WIDTHS = [1, 2, 3, 4, 6];
const FRAME_RADII  = [0, 1, 4, 8, 14];

const FRAME_COLOR_PRESETS = [
  { hex: '#e6ab2c', label: 'ذهبي' },
  { hex: '#3b82f6', label: 'أزرق' },
  { hex: '#8b5cf6', label: 'بنفسجي' },
  { hex: '#22c55e', label: 'أخضر' },
  { hex: '#ef4444', label: 'أحمر' },
  { hex: '#e2e8f0', label: 'فضي' },
];

const TEXT_FIELDS: { key: keyof Omit<FounderSettings, 'id' | 'accent_color' | 'bg_color' | 'announcement_enabled' | 'frame_color' | 'frame_enabled' | 'particles_enabled' | 'frame_width' | 'frame_radius' | 'background_image_path' | 'background_color'>; label: string; multiline?: boolean }[] = [
  { key: 'hero_title_ar', label: 'العنوان الرئيسي (عربي)' },
  { key: 'hero_title_ckb', label: 'العنوان الرئيسي (كردي)' },
  { key: 'hero_subtitle_ar', label: 'العنوان الفرعي (عربي)', multiline: true },
  { key: 'hero_subtitle_ckb', label: 'العنوان الفرعي (كردي)', multiline: true },
  { key: 'footer_phone', label: 'هاتف التذييل' },
  { key: 'footer_email', label: 'بريد التذييل' },
  { key: 'footer_legal_ar', label: 'النص القانوني (عربي)', multiline: true },
  { key: 'footer_legal_ckb', label: 'النص القانوني (كردي)', multiline: true },
  { key: 'footer_instagram_url', label: 'رابط انستغرام' },
  { key: 'footer_twitter_url', label: 'رابط تويتر/X' },
  // site_ambient_audio_url is intentionally NOT here — it has its own section
  // with a device file picker, so it is no longer a URL-only text field.
  { key: 'announcement_text_ar', label: 'نص الإعلان (عربي)', multiline: true },
  { key: 'announcement_text_ckb', label: 'نص الإعلان (كردي)', multiline: true },
];

function emptyForm(): Omit<FounderSettings, 'id'> {
  return {
    accent_color: '#f59e0b',
    bg_color: '#0d1117',
    hero_title_ar: '',
    hero_title_ckb: '',
    hero_subtitle_ar: '',
    hero_subtitle_ckb: '',
    footer_phone: '',
    footer_email: '',
    footer_legal_ar: '',
    footer_legal_ckb: '',
    footer_instagram_url: '',
    footer_twitter_url: '',
    site_ambient_audio_url: '',
    announcement_enabled: false,
    announcement_text_ar: '',
    announcement_text_ckb: '',
    frame_color: '#e6ab2c',
    frame_enabled: true,
    frame_width: 2,
    frame_radius: 1,
    background_image_path: '',
    background_color: '',
    particles_enabled: true,
    app_font_family: 'Cairo',
    app_text_color: '',
    app_font_scale: 1,
  };
}

export default function SettingsScreen() {
  const { profile, loading, session } = useAuth();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<FounderSettings, 'id'>>(emptyForm());
  const [dataLoading, setDataLoading] = useState(true);
  const [audioUploading, setAudioUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Broadcast section
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [bMsg, setBMsg] = useState('');

  // Nuclear section
  const [lockdownActive, setLockdownActive] = useState<boolean | null>(null);
  const [showNuclear, setShowNuclear] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [nuclearLoading, setNuclearLoading] = useState(false);
  const [nuclearMsg, setNuclearMsg] = useState('');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('founder_settings').select('*').single();
      if (data) {
        const s = data as FounderSettings;
        setSettingsId(s.id);
        setForm({
          accent_color: s.accent_color ?? '#f59e0b',
          bg_color: s.bg_color ?? '#0d1117',
          hero_title_ar: s.hero_title_ar ?? '',
          hero_title_ckb: s.hero_title_ckb ?? '',
          hero_subtitle_ar: s.hero_subtitle_ar ?? '',
          hero_subtitle_ckb: s.hero_subtitle_ckb ?? '',
          footer_phone: s.footer_phone ?? '',
          footer_email: s.footer_email ?? '',
          footer_legal_ar: s.footer_legal_ar ?? '',
          footer_legal_ckb: s.footer_legal_ckb ?? '',
          footer_instagram_url: s.footer_instagram_url ?? '',
          footer_twitter_url: s.footer_twitter_url ?? '',
          site_ambient_audio_url: s.site_ambient_audio_url ?? '',
          announcement_enabled: s.announcement_enabled ?? false,
          announcement_text_ar: s.announcement_text_ar ?? '',
          announcement_text_ckb: s.announcement_text_ckb ?? '',
          frame_color: s.frame_color ?? '#e6ab2c',
          frame_enabled: s.frame_enabled ?? true,
          frame_width: s.frame_width ?? 2,
          frame_radius: s.frame_radius ?? 1,
          background_image_path: s.background_image_path ?? '',
          background_color: s.background_color ?? '',
          particles_enabled: s.particles_enabled ?? true,
          app_font_family: s.app_font_family ?? 'Cairo',
          app_text_color: s.app_text_color ?? '',
          app_font_scale: s.app_font_scale ?? 1,
        });
      }
      // Load lockdown state
      const { data: ld } = await supabase.from('site_lockdown').select('active').eq('id', 1).single();
      setLockdownActive(ld?.active ?? false);
      setDataLoading(false);
    })();
  }, [profile]);

  // Ambient music used to be a URL-only text field, which meant the founder
  // had to host the file somewhere else first. This picks an audio file
  // straight off the device and uploads it to the same site-assets bucket the
  // banners use, then stores the resulting public URL in the same column — so
  // nothing downstream (useAmbientMusic) needs to change.
  async function pickAmbientAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true, // guarantees a locally readable URI
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext = asset.name?.split('.').pop()?.toLowerCase() ?? 'mp3';
    const contentType = asset.mimeType ?? (ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`);

    setAudioUploading(true);
    const { url, error } = await uploadToStorage(
      asset.uri,
      'site-assets',
      `ambient-audio/${Date.now()}.${ext}`,
      contentType,
    );
    setAudioUploading(false);

    if (!url) {
      Alert.alert('تعذّر رفع الملف الصوتي', error ?? 'سبب غير معروف');
      return;
    }
    setForm((f) => ({ ...f, site_ambient_audio_url: url }));
    Alert.alert('تم الرفع', 'اضغط "حفظ الإعدادات" لتثبيت الموسيقى الجديدة.');
  }

  // Background image goes to the same bucket/flow as every other upload, and
  // stores the resulting public URL in background_image_path — the column
  // ScreenBg already reads.
  async function pickBackgroundImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الصلاحية مرفوضة', 'يحتاج التطبيق إذن الوصول للصور لاختيار خلفية.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';

    setBgUploading(true);
    const { url, error } = await uploadToStorage(
      uri,
      'site-assets',
      `backgrounds/${Date.now()}.${ext}`,
      `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    );
    setBgUploading(false);

    if (!url) {
      Alert.alert('تعذّر رفع صورة الخلفية', error ?? 'سبب غير معروف');
      return;
    }
    setForm((f) => ({ ...f, background_image_path: url }));
    Alert.alert('تم الرفع', 'اضغط "حفظ الإعدادات" لتثبيت الخلفية الجديدة.');
  }

  async function handleSave() {
    if (!settingsId) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      payload[k] = (typeof v === 'string' && v === '') ? null : v;
    }
    await supabase.from('founder_settings').update(payload).eq('id', settingsId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleBroadcast() {
    if (!session || !bTitle.trim()) return;
    setBLoading(true);
    setBMsg('');
    try {
      const res = await fetch(`${APP_URL}/api/founder/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title: bTitle, body: bBody }),
      });
      const data = await res.json();
      if (!res.ok) { setBMsg(`خطأ: ${data.error ?? 'فشل'}`); }
      else { setBMsg(`تم الإرسال (${data.count} مستخدم)`); setBTitle(''); setBBody(''); }
    } catch { setBMsg('خطأ في الاتصال'); }
    setBLoading(false);
  }

  async function callNuclear(action: 'activate' | 'deactivate') {
    if (!session) return;
    setNuclearLoading(true);
    setNuclearMsg('');
    try {
      const res = await fetch(`${APP_URL}/api/founder/nuclear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, passcode }),
      });
      const json = await res.json();
      if (!res.ok) { setNuclearMsg(json.error ?? 'خطأ'); }
      else {
        setNuclearMsg(action === 'activate' ? 'تم تفعيل الإغلاق' : 'تم رفع الإغلاق');
        setLockdownActive(action === 'activate');
        setShowNuclear(false);
        setPasscode('');
      }
    } catch { setNuclearMsg('خطأ في الاتصال'); }
    setNuclearLoading(false);
  }

  function confirmNuclear(action: 'activate' | 'deactivate') {
    if (!passcode.trim()) { setNuclearMsg('أدخل كلمة المرور'); return; }
    Alert.alert(
      action === 'activate' ? 'تفعيل الإغلاق الكامل' : 'رفع الإغلاق',
      action === 'activate' ? 'سيتم إغلاق الموقع وحذف بيانات الزبائن. هذا الإجراء لا يمكن التراجع عنه.' : 'هل تريد رفع الإغلاق عن الموقع؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: action === 'activate' ? 'تفعيل' : 'رفع', style: 'destructive', onPress: () => callNuclear(action) },
      ]
    );
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>›</Text>
        </Pressable>
        <Text style={s.headerTitle}>إعدادات المنصة</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {dataLoading ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : (
          <>
            {/* ── Appearance ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🎨 المظهر والألوان</Text>

              <Text style={s.fieldLabel}>لون التمييز</Text>
              <View style={s.presetRow}>
                {ACCENT_PRESETS.map((p) => (
                  <Pressable
                    key={p.hex}
                    onPress={() => setForm((f) => ({ ...f, accent_color: p.hex }))}
                    style={[s.colorSwatch, { backgroundColor: p.hex }, form.accent_color === p.hex && s.swatchSelected]}
                  >
                    {form.accent_color === p.hex && <Text style={s.swatchTick}>✓</Text>}
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={form.accent_color ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, accent_color: v }))}
                placeholder="#f59e0b"
                placeholderTextColor={COLORS.white40}
                style={[s.input, { direction: 'ltr' as any }]}
                autoCapitalize="none"
              />

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>لون الخلفية</Text>
              <View style={s.presetRow}>
                {BG_PRESETS.map((p) => (
                  <Pressable
                    key={p.hex}
                    onPress={() => setForm((f) => ({ ...f, bg_color: p.hex }))}
                    style={[s.colorSwatch, { backgroundColor: p.hex, borderColor: 'rgba(255,255,255,0.3)' }, form.bg_color === p.hex && s.swatchSelected]}
                  >
                    {form.bg_color === p.hex && <Text style={s.swatchTick}>✓</Text>}
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={form.bg_color ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, bg_color: v }))}
                placeholder="#0d1117"
                placeholderTextColor={COLORS.white40}
                style={[s.input, { direction: 'ltr' as any }]}
                autoCapitalize="none"
              />

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>لون الإطار المتحرك (كل شاشات التطبيق)</Text>
              <View style={s.presetRow}>
                {FRAME_COLOR_PRESETS.map((p) => (
                  <Pressable
                    key={p.hex}
                    onPress={() => setForm((f) => ({ ...f, frame_color: p.hex }))}
                    style={[s.colorSwatch, { backgroundColor: p.hex, borderColor: 'rgba(255,255,255,0.3)' }, form.frame_color === p.hex && s.swatchSelected]}
                  >
                    {form.frame_color === p.hex && <Text style={s.swatchTick}>✓</Text>}
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={form.frame_color ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, frame_color: v }))}
                placeholder="#e6ab2c"
                placeholderTextColor={COLORS.white40}
                style={[s.input, { direction: 'ltr' as any }]}
                autoCapitalize="none"
              />
              <View style={[s.row, { marginTop: 10 }]}>
                <Switch
                  value={form.frame_enabled ?? true}
                  onValueChange={(v) => setForm((f) => ({ ...f, frame_enabled: v }))}
                  thumbColor={form.frame_enabled ? COLORS.gold : '#888'}
                  trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
                />
                <Text style={s.switchLabel}>{form.frame_enabled ? 'الإطار مفعّل' : 'الإطار متوقف'}</Text>
              </View>

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>سمك الإطار: {form.frame_width ?? 2}px</Text>
              <View style={s.scaleRow}>
                {FRAME_WIDTHS.map((w) => {
                  const on = (form.frame_width ?? 2) === w;
                  return (
                    <Pressable
                      key={w}
                      onPress={() => setForm((f) => ({ ...f, frame_width: w }))}
                      style={[s.scaleChip, on && s.fontChipOn]}
                    >
                      <Text style={[s.fontChipText, on && { color: COLORS.gold }]}>{w}px</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[s.fieldLabel, { marginTop: 10 }]}>انحناء زوايا الإطار: {form.frame_radius ?? 1}px</Text>
              <View style={s.scaleRow}>
                {FRAME_RADII.map((r) => {
                  const on = (form.frame_radius ?? 1) === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setForm((f) => ({ ...f, frame_radius: r }))}
                      style={[s.scaleChip, on && s.fontChipOn]}
                    >
                      <Text style={[s.fontChipText, on && { color: COLORS.gold }]}>{r}px</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── App background: image + tint ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🖼️ خلفية التطبيق</Text>
              <Text style={s.hint}>
                ترتيب الطبقات: اللون الأساسي أعلاه، ثم صبغة الخلفية، ثم الصورة. كلها اختيارية ويمكن دمجها.
              </Text>

              <Pressable
                onPress={pickBackgroundImage}
                disabled={bgUploading}
                style={({ pressed }) => [s.audioPickBtn, pressed && { opacity: 0.8 }]}
              >
                {bgUploading
                  ? <ActivityIndicator color={COLORS.gold} size="small" />
                  : <Text style={s.audioPickBtnText}>
                      {form.background_image_path ? '🔁 استبدال صورة الخلفية' : '⬆️ رفع صورة خلفية'}
                    </Text>}
              </Pressable>

              {form.background_image_path ? (
                <View style={s.audioCurrentRow}>
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, background_image_path: '' }))}
                    style={s.audioClearBtn}
                  >
                    <Text style={s.audioClearText}>حذف</Text>
                  </Pressable>
                  <Image
                    source={{ uri: form.background_image_path }}
                    style={s.bgPreview}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Text style={s.hint}>لا توجد صورة خلفية — التدرّج الافتراضي فقط.</Text>
              )}

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>صبغة الخلفية (فوق التدرّج)</Text>
              <View style={s.presetRow}>
                {BG_PRESETS.map((p) => (
                  <Pressable
                    key={p.hex}
                    onPress={() => setForm((f) => ({
                      ...f,
                      background_color: f.background_color === p.hex ? '' : p.hex,
                    }))}
                    style={[s.colorSwatch, { backgroundColor: p.hex, borderColor: 'rgba(255,255,255,0.3)' }, form.background_color === p.hex && s.swatchSelected]}
                  >
                    {form.background_color === p.hex && <Text style={s.swatchTick}>✓</Text>}
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>
                {form.background_color
                  ? `مفعّلة: ${form.background_color} — اضغط اللون نفسه لإلغائها.`
                  : 'غير مفعّلة — اضغط لوناً لإضافة صبغة فوق التدرّج.'}
              </Text>
            </View>

            {/* ── Text content ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📝 المحتوى النصي</Text>
              {TEXT_FIELDS.map(({ key, label, multiline }) => (
                <View key={key} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>{label}</Text>
                  <TextInput
                    value={(form[key as keyof typeof form] as string) ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={label}
                    placeholderTextColor={COLORS.white40}
                    style={[s.input, multiline && s.inputMulti]}
                    textAlign="right"
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                  />
                </View>
              ))}
            </View>

            {/* ── App typography (dynamic, read by every screen) ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔤 خط التطبيق ولون النص</Text>
              <Text style={s.hint}>
                يُطبَّق فوراً على كل شاشات التطبيق لدى جميع المستخدمين بعد الحفظ.
              </Text>

              <Text style={s.fieldLabel}>نوع الخط</Text>
              <View style={s.fontGrid}>
                {FONT_FAMILIES.map((f) => {
                  const selected = (form.app_font_family ?? 'Cairo') === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setForm((v) => ({ ...v, app_font_family: f.key }))}
                      style={[s.fontChip, selected && s.fontChipOn]}
                    >
                      <Text style={[s.fontChipText, { fontFamily: `${f.key}_700Bold` }, selected && { color: COLORS.gold }]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[s.fieldLabel, { marginTop: 10 }]}>لون النص العام</Text>
              <View style={s.swatchRow}>
                {TEXT_COLOR_PRESETS.map((c) => {
                  const selected = (form.app_text_color ?? '') === c.hex;
                  return (
                    <Pressable
                      key={c.hex}
                      onPress={() => setForm((v) => ({ ...v, app_text_color: selected ? '' : c.hex }))}
                      style={[s.swatch, { backgroundColor: c.hex }, selected && s.swatchOn]}
                    />
                  );
                })}
              </View>
              <Text style={s.hint}>
                {form.app_text_color
                  ? `مفعّل: ${form.app_text_color} — اضغط اللون نفسه لإلغائه والعودة لألوان كل شاشة.`
                  : 'غير مفعّل — كل شاشة تحتفظ بألوانها الأصلية (الوضع الموصى به).'}
              </Text>

              <Text style={[s.fieldLabel, { marginTop: 10 }]}>
                قوام/حجم الخط: {Math.round((form.app_font_scale ?? 1) * 100)}%
              </Text>
              <View style={s.scaleRow}>
                {FONT_SCALES.map((sc) => {
                  const selected = Math.abs((form.app_font_scale ?? 1) - sc.value) < 0.001;
                  return (
                    <Pressable
                      key={sc.value}
                      onPress={() => setForm((v) => ({ ...v, app_font_scale: sc.value }))}
                      style={[s.scaleChip, selected && s.fontChipOn]}
                    >
                      <Text style={[s.fontChipText, selected && { color: COLORS.gold }]}>{sc.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Ambient music ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🎵 الموسيقى المحيطة</Text>
              <Text style={s.hint}>
                ارفع ملفاً صوتياً (MP3 / M4A) من جهازك مباشرة. يُحفظ في التخزين ويعمل بكل شاشات التطبيق.
              </Text>

              <Pressable
                onPress={pickAmbientAudio}
                disabled={audioUploading}
                style={({ pressed }) => [s.audioPickBtn, pressed && { opacity: 0.8 }]}
              >
                {audioUploading
                  ? <ActivityIndicator color={COLORS.gold} size="small" />
                  : <Text style={s.audioPickBtnText}>
                      {form.site_ambient_audio_url ? '🔁 استبدال الملف الصوتي' : '⬆️ اختيار ورفع ملف صوتي'}
                    </Text>}
              </Pressable>

              {form.site_ambient_audio_url ? (
                <View style={s.audioCurrentRow}>
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, site_ambient_audio_url: '' }))}
                    style={s.audioClearBtn}
                  >
                    <Text style={s.audioClearText}>حذف</Text>
                  </Pressable>
                  <Text style={s.audioCurrentText} numberOfLines={1} ellipsizeMode="middle">
                    {form.site_ambient_audio_url}
                  </Text>
                </View>
              ) : (
                <Text style={s.hint}>لا يوجد ملف صوتي حالياً — زر الموسيقى مخفي عن المستخدمين.</Text>
              )}

              {/* Kept so an already-hosted URL can still be pasted directly. */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>أو الصق رابطاً مباشراً (اختياري)</Text>
                <TextInput
                  value={form.site_ambient_audio_url ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, site_ambient_audio_url: v }))}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.white40}
                  style={[s.input, { direction: 'ltr' as never }]}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* ── Announcement toggle ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📢 الإعلان الجاري</Text>
              <View style={s.row}>
                <Switch
                  value={form.announcement_enabled ?? false}
                  onValueChange={(v) => setForm((f) => ({ ...f, announcement_enabled: v }))}
                  thumbColor={form.announcement_enabled ? COLORS.gold : '#888'}
                  trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
                />
                <Text style={s.switchLabel}>{form.announcement_enabled ? 'الإعلان مفعّل' : 'الإعلان متوقف'}</Text>
              </View>
            </View>

            {/* ── Ambient particles toggle ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>✨ مؤثرات الجسيمات المتحركة</Text>
              <View style={s.row}>
                <Switch
                  value={form.particles_enabled ?? true}
                  onValueChange={(v) => setForm((f) => ({ ...f, particles_enabled: v }))}
                  thumbColor={form.particles_enabled ? COLORS.gold : '#888'}
                  trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
                />
                <Text style={s.switchLabel}>{form.particles_enabled ? 'المؤثرات مفعّلة' : 'المؤثرات متوقفة'}</Text>
              </View>
            </View>

            {/* ── Save button ── */}
            {saved && (
              <View style={s.successBanner}>
                <Text style={s.successText}>تم حفظ الإعدادات بنجاح ✓</Text>
              </View>
            )}
            <Pressable onPress={handleSave} disabled={saving} style={[s.goldBtn, saving && { opacity: 0.6 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'حفظ الإعدادات'}</Text>
            </Pressable>

            {/* ── Broadcast ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📨 إشعار جماعي</Text>
              <Text style={s.hint}>إرسال إشعار فوري لجميع الزبائن</Text>
              <TextInput
                value={bTitle}
                onChangeText={setBTitle}
                placeholder="عنوان الإشعار"
                placeholderTextColor={COLORS.white40}
                style={s.input}
                textAlign="right"
              />
              <TextInput
                value={bBody}
                onChangeText={setBBody}
                placeholder="نص الإشعار"
                placeholderTextColor={COLORS.white40}
                style={[s.input, s.inputMulti]}
                textAlign="right"
                multiline
                numberOfLines={3}
              />
              {bMsg ? (
                <Text style={[s.hint, { color: bMsg.startsWith('خطأ') ? '#ef4444' : '#22c55e' }]}>{bMsg}</Text>
              ) : null}
              <Pressable onPress={handleBroadcast} disabled={bLoading || !bTitle.trim()} style={[s.sendBtn, (bLoading || !bTitle.trim()) && { opacity: 0.5 }]}>
                <Text style={s.sendBtnText}>{bLoading ? '...' : 'إرسال للجميع'}</Text>
              </Pressable>
            </View>

            {/* ── Nuclear danger zone — founder only, co_admins cannot trigger it (matches web + /api/founder/nuclear server-side check) ── */}
            {profile?.role === 'founder' && (
            <View style={[s.section, s.dangerSection]}>
              <Text style={[s.sectionTitle, { color: '#ef4444' }]}>☢️ منطقة الخطر</Text>
              <Text style={s.hint}>إغلاق الموقع وحذف بيانات الزبائن. لا يمكن التراجع.</Text>

              {lockdownActive !== null && (
                <View style={s.row}>
                  <View style={[s.dot, { backgroundColor: lockdownActive ? '#ef4444' : '#22c55e' }]} />
                  <Text style={s.hint}>{lockdownActive ? 'الموقع مُقفل حالياً' : 'الموقع يعمل بشكل طبيعي'}</Text>
                </View>
              )}

              <Pressable onPress={() => setShowNuclear((v) => !v)} style={s.dangerToggle}>
                <Text style={s.dangerToggleText}>{showNuclear ? 'إخفاء' : 'عرض خيارات الإغلاق'}</Text>
              </Pressable>

              {showNuclear && (
                <View style={s.nuclearBox}>
                  <Text style={s.fieldLabel}>كلمة المرور السرية</Text>
                  <TextInput
                    value={passcode}
                    onChangeText={setPasscode}
                    placeholder="كلمة المرور"
                    placeholderTextColor={COLORS.white40}
                    style={[s.input, { direction: 'ltr' as any }]}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  {nuclearMsg ? (
                    <Text style={[s.hint, { color: nuclearMsg.startsWith('تم') ? '#22c55e' : '#ef4444' }]}>{nuclearMsg}</Text>
                  ) : null}
                  <View style={s.nuclearBtns}>
                    {lockdownActive ? (
                      <Pressable onPress={() => confirmNuclear('deactivate')} disabled={nuclearLoading} style={[s.nuclearBtn, s.nuclearBtnGreen]}>
                        <Text style={[s.nuclearBtnText, { color: '#22c55e' }]}>{nuclearLoading ? '...' : 'رفع الإغلاق'}</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => confirmNuclear('activate')} disabled={nuclearLoading} style={[s.nuclearBtn, s.nuclearBtnRed]}>
                        <Text style={[s.nuclearBtnText, { color: '#ef4444' }]}>{nuclearLoading ? '...' : 'تفعيل الإغلاق الكامل'}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
            )}
          </>
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
  section: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  dangerSection: { borderColor: 'rgba(239,68,68,0.3)' },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold, textAlign: 'right' },
  fieldGroup: { gap: 5 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'right' },
  inputMulti: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  swatchTick: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white },
  hint: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  // Typography controls
  fontGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fontChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: '#0d1117',
  },
  fontChipOn: { borderColor: COLORS.gold, backgroundColor: 'rgba(230,171,44,0.12)' },
  fontChipText: { fontSize: 12, color: COLORS.white70 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: COLORS.gold },
  scaleRow: { flexDirection: 'row', gap: 8 },
  scaleChip: {
    flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: '#0d1117',
  },

  audioPickBtn: {
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  audioPickBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  audioCurrentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  audioCurrentText: { flex: 1, fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white70, textAlign: 'left' },
  audioClearBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  audioClearText: { fontFamily: FONTS.bold, fontSize: 11, color: '#ef4444' },
  bgPreview: { flex: 1, height: 70, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.cardBorder },
  successBanner: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: RADIUS.sm, padding: 10 },
  successText: { fontFamily: FONTS.bold, fontSize: 13, color: '#22c55e', textAlign: 'center' },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  sendBtn: { backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  sendBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dangerToggle: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: RADIUS.sm, paddingVertical: 7, alignItems: 'center' },
  dangerToggleText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },
  nuclearBox: { gap: 10, marginTop: 4 },
  nuclearBtns: { gap: 8 },
  nuclearBtn: { borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  nuclearBtnRed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)' },
  nuclearBtnGreen: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.4)' },
  nuclearBtnText: { fontFamily: FONTS.bold, fontSize: 13 },
});
