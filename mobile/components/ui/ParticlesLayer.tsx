import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/constants/theme';

const PARTICLE_COUNT = 14;

// Rising gold sparks, independent of whatever the founder set as the
// background (image/color/default gradient) — a separate layer drawn on
// top of it, toggled by founder_settings.particles_enabled.
export function ParticlesLayer() {
  const { width, height } = useWindowDimensions();

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        key: i,
        x: Math.random() * width,
        size: 2 + Math.random() * 3,
        duration: 5000 + Math.random() * 5000,
        delay: Math.random() * 6000,
        drift: (Math.random() - 0.5) * 40,
      })),
    [width],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Spark key={p.key} x={p.x} size={p.size} duration={p.duration} delay={p.delay} drift={p.drift} height={height} />
      ))}
    </View>
  );
}

function Spark({ x, size, duration, delay, drift, height }: { x: number; size: number; duration: number; delay: number; drift: number; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [progress, delay, duration]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Rises from just below the bottom edge to just above the top edge,
    // fading in then out so it never pops in/out abruptly.
    const translateY = height * 0.08 - p * (height * 1.16);
    const translateX = p * drift;
    const opacity = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
    return {
      transform: [{ translateY }, { translateX }],
      opacity: opacity * 0.55,
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        { left: x, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
});
