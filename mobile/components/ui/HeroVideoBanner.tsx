import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
 * founder-managed announcement carousel. Autoplays muted+looping like the
 * category card videos; tap the speaker to hear it, matching the same
 * mute-toggle pattern already used for post videos in the news feed.
 */
export function HeroVideoBanner() {
  const [muted, setMuted] = useState(true);

  return (
    <View style={styles.wrap}>
      <Video
        source={SOURCE}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted={muted}
      />
      <Pressable
        style={styles.muteBtn}
        onPress={() => setMuted((m) => !m)}
        hitSlop={8}
      >
        <Text style={styles.muteIcon}>{muted ? '🔇' : '🔊'}</Text>
      </Pressable>
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
  muteBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: { fontSize: 15 },
});
