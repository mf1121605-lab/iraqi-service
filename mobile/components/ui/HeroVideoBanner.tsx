import { StyleSheet, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { COLORS, RADIUS } from '@/constants/theme';

// Bundled with the app itself (not loaded from Supabase) so it plays
// instantly on any connection, including no connection at all — the
// founder's explicit call after weighing that this trades away being able
// to swap the video without a new build, for zero buffering.
const SOURCE = require('@/assets/videos/main-hero.mp4');
const ASPECT_RATIO = 1632 / 1080;

/**
 * Fixed hero video pinned at the top of the customer dashboard, above the
 * founder-managed announcement carousel. Always silent, no mute toggle —
 * autoplay + loop only.
 */
export function HeroVideoBanner() {
  return (
    <View style={styles.wrap}>
      <Video
        source={SOURCE}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: ASPECT_RATIO,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
});
