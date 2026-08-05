import { ReactNode, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  borderRadius?: number;
  style?: ViewStyle;
}

// Pulsing orange/red glow + a thin flame-colored border ring, meant to wrap
// a primary CTA button so it reads as "on fire" — pairs with a translucent
// glass fill on the button itself for the founder's "glassmorphism + fire
// effect" request, without needing to rebuild each button's own markup.
export function FireGlowWrap({ children, borderRadius = 14, style }: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.4 + pulse.value * 0.4,
    shadowRadius: 8 + pulse.value * 12,
  }));

  return (
    <Animated.View style={[styles.wrap, { borderRadius }, glowStyle, style]}>
      <View style={[styles.border, { borderRadius }]} pointerEvents="none" />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.65)',
    zIndex: 2,
  },
});
