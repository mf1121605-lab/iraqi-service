import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/constants/theme';

interface Props extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: ViewStyle;
  glowColor?: string;
}

// Shared "press = soft plush glow" feedback — scale down slightly + a
// gold glow fades in under the element, with a light haptic tick. Meant
// to be dropped in wherever a plain Pressable currently is.
export function GlowPressable({ children, style, glowColor = COLORS.gold, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.wrap, { shadowColor: glowColor }, animStyle, style]}>
      <Pressable
        style={styles.fill}
        onPressIn={(e) => {
          scale.value = withTiming(0.94, { duration: 90 });
          glow.value = withTiming(0.85, { duration: 120 });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 160 });
          glow.value = withTiming(0, { duration: 220 });
          onPressOut?.(e);
        }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 0,
  },
  fill: { flex: 1 },
});
