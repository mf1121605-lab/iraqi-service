import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CHAT_BG_THEMES, ChatBgTheme } from '@/utils/chatBackgroundPrefs';

// Two large soft gradient blobs that drift slowly behind the message list —
// sits above ScreenBg's own gradient/particles, below the messages, so
// switching a chat's theme doesn't affect the founder's global background.
export function ChatBackgroundLayer({ theme }: { theme: ChatBgTheme }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift]);

  const blobAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.value * 40 - 20 },
      { translateY: drift.value * -30 },
    ],
  }));
  const blobBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.value * -35 + 15 },
      { translateY: drift.value * 25 },
    ],
  }));

  const themeDef = CHAT_BG_THEMES[theme];
  if (!themeDef.colors) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.blob, styles.blobA, blobAStyle]}>
        <LinearGradient colors={[themeDef.colors[0], 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.blob, styles.blobB, blobBStyle]}>
        <LinearGradient colors={[themeDef.colors[1], 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 340, height: 340, borderRadius: 170 },
  blobA: { top: -80, right: -80 },
  blobB: { bottom: -60, left: -100 },
});
