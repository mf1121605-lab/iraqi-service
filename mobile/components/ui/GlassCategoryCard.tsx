import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import { FONTS } from '@/constants/theme';
import { AnimatedGoldBorder } from './AnimatedGoldBorder';
import { HapticPressable } from './HapticPressable';

/** Muted luxury gold, per the brief. */
const GOLD = '#D4AF37';

export interface CategoryCardData {
  key: string;
  label: string;
  /** categories.icon_path — the founder's uploaded cover image. */
  icon_path: string | null;
  /** categories.icon_video_url — takes precedence over the image when set. */
  icon_video_url: string | null;
  /** Fallback glyph when the founder hasn't uploaded media yet. */
  emoji?: string;
}

interface Props {
  category: CategoryCardData;
  onPress: () => void;
}

/**
 * Full-width glass card with a gold border and an optional media banner.
 *
 * Media is 16:9 and always sits under a bottom-up gradient so the title stays
 * legible over a bright photo. Video is muted and looping — a card in a scroll
 * list playing audio would fight the app's ambient track.
 */
export function GlassCategoryCard({ category, onPress }: Props) {
  const { label, icon_path, icon_video_url, emoji } = category;
  // Video wins when both are set — it is the more deliberate upload.
  const mediaUrl = icon_video_url || icon_path;
  const isVideo = !!icon_video_url;

  return (
    // Static gold border replaced with the same Skia-driven shimmering border
    // used on GlassCard elsewhere — these are the app's "main service tiles",
    // which the founder asked to carry a glowing animated border, not a flat one.
    <AnimatedGoldBorder borderRadius={16} borderWidth={1.5} innerBg="transparent" fillHeight={false} style={styles.cardWrap}>
      <HapticPressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {/* Glass fill. BlurView carries it on devices that support it; the
            translucent backdrop underneath is what shows through elsewhere,
            so the card never renders as a flat black box. */}
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} pointerEvents="none" />

        {mediaUrl ? (
          <View style={styles.mediaWrap}>
            {isVideo ? (
              <Video
                source={{ uri: mediaUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
            ) : (
              <Image source={{ uri: mediaUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.35)', 'rgba(10,10,10,0.92)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <Text style={styles.titleOverMedia} numberOfLines={2}>{label}</Text>
          </View>
        ) : (
          <View style={styles.plainRow}>
            <Text style={styles.chevron}>‹</Text>
            <Text style={styles.titlePlain} numberOfLines={2}>{label}</Text>
            <Text style={styles.emoji}>{emoji ?? '📁'}</Text>
          </View>
        )}
      </HapticPressable>
    </AnimatedGoldBorder>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginBottom: 14,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    borderRadius: 16,   // per the brief, not the app's RADIUS.lg (20)
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,20,0.70)',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,20,0.55)' },

  mediaWrap: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'flex-end' },
  titleOverMedia: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Media-less cards stay compact instead of reserving an empty 16:9 slab.
  plainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emoji: { fontSize: 26 },
  titlePlain: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: '#ffffff', textAlign: 'right' },
  chevron: { fontSize: 22, color: GOLD, opacity: 0.8 },
});
