import { forwardRef } from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * A drop-in replacement for react-native's Pressable that adds a light
 * haptic tick on every press — nothing else. For a Pressable that also
 * wants a visual press reaction (scale + glow), see GlowPressable;
 * this one is deliberately bare so it can sit in places a shadow/scale
 * effect would look wrong (plain list rows, nav items, icon buttons
 * inside an already-styled parent).
 */
export const HapticPressable = forwardRef<View, PressableProps>(function HapticPressable(
  { onPress, ...props },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      {...props}
    />
  );
});
