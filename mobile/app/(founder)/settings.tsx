import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
}

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

const TEXT_FIELDS: { key: keyof Omit<FounderSettings, 'id' | 'accent_color' | 'bg_color' | 'announcement_enabled'>; label: string; multiline?: boolean }[] = [
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
  { key: 'site_ambient_audio_url', label: 'رابط الصوت المحيطي (URL)' },
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
  };
}

export default function SettingsScreen() {
  const { profile, loading, session } = useAuth();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<FounderSettings, 'id'>>(emptyForm());
  const [dataLoading, setDataLoading] = useState(true);
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
        });
      }
      // Load lockdown state
      const { data: ld } = await supabase.from('site_lockdown').select('active').eq('id', 1).single();
      setLockdownActive(ld?.active ?? false);
      setDataLoading(false);
    })();
  }, [profile]);

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
          <Text style={s.backArrow}>‹</Text>
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
