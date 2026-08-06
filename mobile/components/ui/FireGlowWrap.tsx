import { ReactNode, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, ViewStyle } from 'react-native';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * FireGlowWrap — a live flame running around a primary CTA's border.
 *
 * Previously this drew only a static orange ring plus a pulsing shadow, which
 * read as "a glowing button", not "a button on fire". The ring is now stroked
 * on the GPU with Skia: a permanent ember base, plus a white-hot band that
 * travels bottom-to-top (flames rise) at a slightly irregular cadence so it
 * flickers instead of looping visibly. The outer shadow still breathes
 * underneath for the surrounding heat-haze.
 *
 * Sizing note: unlike AnimatedGoldBorder this deliberately does NOT force
 * flex on its children — the CTAs it wraps size themselves from their own
 * content, and forcing flex:1 here is exactly what made the login card
 * collapse to zero height.
 */
export function FireGlowWrap({ children, borderRadius = 14, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  const pulse = useSharedValue(0);
  const rise = useSharedValue(0);
  const flicker = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    // Flames travel up. Linear so the band moves at a constant speed.
    rise.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
    // Deliberately co-prime-ish with `rise` so the two never resynchronise —
    // that mismatch is what makes it read as flicker rather than a loop.
    flicker.value = withRepeat(withTiming(1, { duration: 370, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, rise, flicker]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.4 + pulse.value * 0.4,
    shadowRadius: 8 + pulse.value * 12,
  }));

  const borderPath = useMemo(() => {
    if (width < 1 || height < 1) return null;
    const inset = 1;
    const path = Skia.Path.Make();
    path.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(inset, inset, width - inset * 2, height - inset * 2),
        borderRadius,
        borderRadius,
      ),
    );
    return path;
  }, [width, height, borderRadius]);

  // Height of the bright travelling flame band.
  const band = Math.max(24, height * 0.75);
  const flameStart = useDerivedValue(() => vec(width / 2, height + band - rise.value * (height + band * 2)));
  const flameEnd = useDerivedValue(() => vec(width / 2, height + band - rise.value * (height + band * 2) + band));
  const flameWidth = useDerivedValue(() => 1.6 + flicker.value * 1.3);

  function onLayout(e: LayoutChangeEvent) {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
  }

  return (
    <Animated.View style={[styles.wrap, { borderRadius }, glowStyle, style]} onLayout={onLayout}>
      {borderPath && width > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Ember base — always lit, so the button never looks unstyled
              between flame passes. */}
          <Path
            path={borderPath}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            color="rgba(249,115,22,0.55)"
          />
          {/* White-hot band travelling upward. */}
          <Path path={borderPath} style="stroke" strokeWidth={flameWidth} strokeCap="round">
            <LinearGradient
              start={flameStart}
              end={flameEnd}
              colors={[
                'rgba(120,20,0,0.00)',
                'rgba(220,60,10,0.55)',
                'rgba(249,115,22,0.95)',
                'rgba(253,186,60,1.00)',
                'rgba(255,246,214,1.00)',
                'rgba(253,186,60,1.00)',
                'rgba(249,115,22,0.95)',
                'rgba(220,60,10,0.55)',
                'rgba(120,20,0,0.00)',
              ]}
            />
          </Path>
        </Canvas>
      )}
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
});
