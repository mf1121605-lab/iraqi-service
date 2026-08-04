import { Image, StyleSheet } from 'react-native';

// Twemoji PNGs (MIT-licensed, from the jdecked/twemoji fork via the
// emoji-datasource-twitter npm package) — bundled locally as static app
// assets so stickers render identically across every Android device
// instead of depending on the OEM's own emoji font, and with no network
// fetch at send/render time.
const STICKER_IMAGES: Record<string, ReturnType<typeof require>> = {
  '📚': require('@/assets/stickers/1f4da.png'),
  '✏️': require('@/assets/stickers/270f-fe0f.png'),
  '🎓': require('@/assets/stickers/1f393.png'),
  '📝': require('@/assets/stickers/1f4dd.png'),
  '🏫': require('@/assets/stickers/1f3eb.png'),
  '📖': require('@/assets/stickers/1f4d6.png'),
  '🔬': require('@/assets/stickers/1f52c.png'),
  '📐': require('@/assets/stickers/1f4d0.png'),
  '📋': require('@/assets/stickers/1f4cb.png'),
  '🗂️': require('@/assets/stickers/1f5c2-fe0f.png'),
  '🏛️': require('@/assets/stickers/1f3db-fe0f.png'),
  '⚖️': require('@/assets/stickers/2696-fe0f.png'),
  '🔖': require('@/assets/stickers/1f516.png'),
  '📌': require('@/assets/stickers/1f4cc.png'),
  '🗃️': require('@/assets/stickers/1f5c3-fe0f.png'),
  '🖊️': require('@/assets/stickers/1f58a-fe0f.png'),
  '😊': require('@/assets/stickers/1f60a.png'),
  '👍': require('@/assets/stickers/1f44d.png'),
  '❤️': require('@/assets/stickers/2764-fe0f.png'),
  '🙏': require('@/assets/stickers/1f64f.png'),
  '✅': require('@/assets/stickers/2705.png'),
  '🌟': require('@/assets/stickers/1f31f.png'),
  '💪': require('@/assets/stickers/1f4aa.png'),
  '🎉': require('@/assets/stickers/1f389.png'),
};

interface Props {
  emoji: string;
  size?: number;
}

// Renders a sticker as a real Twemoji image when we have one bundled;
// falls back to the plain text glyph for anything outside the 24-sticker
// set (e.g. if a message body ever contains an unmapped emoji).
export function TwemojiSticker({ emoji, size = 52 }: Props) {
  const source = STICKER_IMAGES[emoji];
  if (!source) return null;
  return <Image source={source} style={[styles.img, { width: size, height: size }]} resizeMode="contain" />;
}

export function hasTwemojiSticker(emoji: string): boolean {
  return emoji in STICKER_IMAGES;
}

const styles = StyleSheet.create({
  img: {},
});
