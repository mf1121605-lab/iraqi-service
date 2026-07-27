import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface SiteSettings {
  id: string;
  hero_title_ar: string | null;
  hero_title_ckb: string | null;
  hero_subtitle_ar: string | null;
  hero_subtitle_ckb: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

type SettingsForm = Omit<SiteSettings, 'id'>;

const FIELD_LABELS: Record<keyof SettingsForm, string> = {
  hero_title_ar: 'العنوان الرئيسي (عربي)',
  hero_title_ckb: 'العنوان الرئيسي (كردي)',
  hero_subtitle_ar: 'العنوان الفرعي (عربي)',
  hero_subtitle_ckb: 'العنوان الفرعي (كردي)',
  contact_phone: 'رقم التواصل',
  contact_email: 'البريد الإلكتروني',
};

export default function SettingsScreen() {
  const { profile, loading } = useAuth();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    hero_title_ar: '', hero_title_ckb: '', hero_subtitle_ar: '', hero_subtitle_ckb: '', contact_phone: '', contact_email: '',
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) {
        setSettingsId((data as SiteSettings).id);
        setForm({
          hero_title_ar: (data as SiteSettings).hero_title_ar ?? '',
          hero_title_ckb: (data as SiteSettings).hero_title_ckb ?? '',
          hero_subtitle_ar: (data as SiteSettings).hero_subtitle_ar ?? '',
          hero_subtitle_ckb: (data as SiteSettings).hero_subtitle_ckb ?? '',
          contact_phone: (data as SiteSettings).contact_phone ?? '',
          contact_email: (data as SiteSettings).contact_email ?? '',
        });
      }
      setDataLoading(false);
    })();
  }, [profile]);

  async function handleSave() {
    if (!settingsId) return;
    setSaving(true);
    await supabase.from('site_settings').update({
      hero_title_ar: form.hero_title_ar || null,
      hero_title_ckb: form.hero_title_ckb || null,
      hero_subtitle_ar: form.hero_subtitle_ar || null,
      hero_subtitle_ckb: form.hero_subtitle_ckb || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
    }).eq('id', settingsId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.headerTitle}>إعدادات الموقع</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {dataLoading ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : (
          <View style={s.card}>
            {(Object.keys(FIELD_LABELS) as (keyof SettingsForm)[]).map((field) => (
              <View key={field} style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{FIELD_LABELS[field]}</Text>
                <TextInput
                  value={form[field] ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                  placeholder={FIELD_LABELS[field]}
                  placeholderTextColor={COLORS.white40}
                  style={s.input}
                  textAlign="right"
                  keyboardType={field === 'contact_phone' ? 'phone-pad' : field === 'contact_email' ? 'email-address' : 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}

            {saved && (
              <View style={s.successBanner}>
                <Text style={s.successText}>تم الحفظ بنجاح</Text>
              </View>
            )}

            <Pressable onPress={handleSave} disabled={saving} style={[s.goldBtn, saving && { opacity: 0.6 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'حفظ الإعدادات'}</Text>
            </Pressable>
          </View>
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
  scroll: { padding: 16, paddingTop: 0, gap: 14 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  successBanner: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: RADIUS.sm, padding: 10 },
  successText: { fontFamily: FONTS.bold, fontSize: 13, color: '#22c55e', textAlign: 'center' },
});
