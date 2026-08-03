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
import * as ImagePicker from 'expo-image-picker';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar, CARTOON_AVATAR_KEYS } from '@/components/chat/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

async function uploadOwnPhoto(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, blob, { contentType, upsert: false });
    if (error) { console.error('avatar upload failed:', error.message); return null; }
    return path;
  } catch {
    return null;
  }
}

export default function Onboarding() {
  const { profile, loading, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_complete) {
      router.replace('/(customer)/');
      return;
    }
    if (profile.given_name) setGivenName(profile.given_name);
    if (profile.family_name) setFamilyName(profile.family_name);
    if (profile.avatar_key) setSelected(profile.avatar_key);
  }, [profile]);

  const needsName = !profile?.given_name;
  const canContinue = selected && (!needsName || givenName.trim());

  async function handlePickOwnPhoto() {
    if (!profile) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    const path = await uploadOwnPhoto(result.assets[0].uri, profile.id);
    setUploadingPhoto(false);
    if (path) setSelected(path);
    else setError('تعذّر رفع الصورة، حاول مرة أخرى');
  }

  async function handleContinue() {
    if (!profile) return;
    setError('');
    if (!selected) { setError('يرجى اختيار صورة رمزية'); return; }
    if (needsName && !givenName.trim()) { setError('يرجى إدخال الاسم'); return; }

    setSaving(true);
    const updates: Record<string, string | boolean> = {
      avatar_key: selected,
      onboarding_complete: true,
    };
    if (needsName) {
      if (givenName.trim()) updates.given_name = givenName.trim();
      if (familyName.trim()) updates.family_name = familyName.trim();
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    setSaving(false);
    if (saveError) { setError('حدث خطأ أثناء الحفظ'); return; }
    await refreshProfile();
    router.replace('/(customer)/');
  }

  if (loading || !profile) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.emblem}>
          <Text style={styles.emblemEmoji}>✨</Text>
        </View>
        <Text style={styles.title}>مرحباً بك!</Text>
        <Text style={styles.subtitle}>اختر صورة رمزية لحسابك لتبدأ</Text>

        {needsName && (
          <View style={styles.nameSection}>
            <Text style={styles.sectionLabel}>الاسم</Text>
            <TextInput
              value={givenName}
              onChangeText={setGivenName}
              placeholder="الاسم الأول"
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              textAlign="right"
            />
            <TextInput
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="اسم العائلة"
              placeholderTextColor={COLORS.white40}
              style={[styles.input, { marginTop: 10 }]}
              textAlign="right"
            />
          </View>
        )}

        <Text style={styles.sectionLabel}>اختر شخصية كارتونية</Text>
        <View style={styles.grid}>
          {CARTOON_AVATAR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              style={[styles.avatarWrap, selected === key && styles.avatarSelected]}
            >
              <Avatar avatarKey={key} name="" seed={key} size={60} />
              {selected === key && <View style={styles.checkRing} />}
            </Pressable>
          ))}
        </View>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>أو</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable onPress={handlePickOwnPhoto} disabled={uploadingPhoto} style={styles.photoBtn}>
          {uploadingPhoto ? (
            <ActivityIndicator color={COLORS.gold} size="small" />
          ) : (
            <>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>اختر صورة من الاستوديو</Text>
              {selected && !CARTOON_AVATAR_KEYS.includes(selected) && <Text style={styles.photoBtnCheck}>✓</Text>}
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleContinue}
          disabled={saving || !canContinue}
          style={[styles.btn, (!canContinue || saving) && styles.btnDisabled]}
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.btnText}>متابعة</Text>
          }
        </Pressable>
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, alignItems: 'center', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emblem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(230,171,44,0.15)',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emblemEmoji: { fontSize: 32 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  nameSection: { width: '100%', marginBottom: 20 },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
    marginBottom: 12,
    textAlign: 'right',
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginVertical: 16,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  checkRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#000' },

  orDivider: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10, marginBottom: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  orText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },

  photoBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  photoBtnIcon: { fontSize: 18 },
  photoBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  photoBtnCheck: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },
});
