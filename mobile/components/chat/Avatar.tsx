import { Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { FONTS } from '@/constants/theme';

interface Props {
  avatarKey?: string | null;
  name?: string | null;
  seed?: string | null;
  size?: number;
}

const PALETTE = ['#7c3aed', '#d97706', '#059669', '#e11d48', '#0284c7'];

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';
// The 8 preset cartoon characters — same assets the website serves from
// its own public/assets/avatars/ folder, reused here by URL rather than
// duplicating the image files into the app bundle.
export const CARTOON_AVATAR_KEYS = ['char-1', 'char-2', 'char-3', 'char-4', 'char-5', 'char-6', 'char-7', 'char-8'];
export const CARTOON_AVATAR_URIS = CARTOON_AVATAR_KEYS.map((key) => `${APP_URL}/assets/avatars/${key}.png`);

function colorFor(seed: string | null | undefined): string {
  if (!seed) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

// avatarKey is one of: a full URL (Google profile photo etc.), a preset
// cartoon key, or a path the user's own photo was uploaded to inside the
// site-assets bucket (avatars/{userId}/...). There is no bucket literally
// named "avatars" — that was the bug here: every avatar with a key set
// resolved to a 404 image URL, everywhere in the app.
function resolveAvatarUri(avatarKey: string): string {
  if (/^https?:\/\//i.test(avatarKey)) return avatarKey;
  if (CARTOON_AVATAR_KEYS.includes(avatarKey)) return `${APP_URL}/assets/avatars/${avatarKey}.png`;
  const { data } = supabase.storage.from('site-assets').getPublicUrl(avatarKey);
  return data.publicUrl;
}

export function Avatar({ avatarKey, name, seed, size = 40 }: Props) {
  const containerStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarKey) {
    return (
      <Image
        source={{ uri: resolveAvatarUri(avatarKey) }}
        style={containerStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  }

  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const bg = colorFor(seed ?? name);

  return (
    <View style={[styles.initials, containerStyle, { backgroundColor: bg }]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FONTS.bold,
    color: '#fff',
  },
});
