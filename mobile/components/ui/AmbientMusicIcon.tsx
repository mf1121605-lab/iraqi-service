import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { COLORS } from '@/constants/theme';

const BAR_COUNT = 3;

// Floating glowing note button — only visible once the founder has set a
// track. Tapping it is the customer's only control over ambient music (no
// volume/skip — matches the founder's spec exactly).
export function AmbientMusicIcon() {
  const { isMuted, toggle, hasTrack } = useAmbientMusic();
  const insets = useSafeAreaInsets();
  const glow = useSharedValue(0.4);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value * 0.8,
    elevation: 6 + glow.value * 8,
  }));

  if (!hasTrack) return null;

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 12 }, glowStyle]}>
      <Pressable onPress={toggle} style={styles.btn} hitSlop={10}>
        {isMuted ? (
          <Text style={styles.note}>🔇</Text>
        ) : (
          <View style={styles.bars}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <EqBar key={i} index={i} />
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function EqBar({ index }: { index: number }) {
  const h = useSharedValue(3);

  useEffect(() => {
    h.value = withRepeat(
      withTiming(3 + ((index * 37) % 7), { duration: 260 + index * 90, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [h, index]);

  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    zIndex: 120,
    borderRadius: 22,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(230,171,44,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: 18 },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gold,
  },
});
