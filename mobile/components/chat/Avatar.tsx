import { Image, Text, View, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FONTS } from '@/constants/theme';

interface Props {
  avatarKey?: string | null;
  name?: string | null;
  seed?: string | null;
  size?: number;
}

const PALETTE = ['#7c3aed', '#d97706', '#059669', '#e11d48', '#0284c7'];

function colorFor(seed: string | null | undefined): string {
  if (!seed) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function getPublicUrl(avatarKey: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarKey);
  return data.publicUrl;
}

export function Avatar({ avatarKey, name, seed, size = 40 }: Props) {
  const containerStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarKey) {
    return (
      <Image
        source={{ uri: getPublicUrl(avatarKey) }}
        style={[styles.image, containerStyle]}
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
  image: {
    resizeMode: 'cover',
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FONTS.bold,
    color: '#fff',
  },
});
