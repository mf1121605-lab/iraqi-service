/**
 * CinematicFrame — the gold accent bar at the very top of the app.
 *
 * Only the top edge is drawn — no side rails, no bottom edge — so there
 * is zero chance of it ever visually overlapping the bottom tab bar
 * (previously the frame's bottom edge/corners sat just above the tab
 * bar and still occasionally read as touching it). The line itself is
 * an animated Skia sweep (same GPU-driven technique as
 * AnimatedGoldBorder) in a color the founder can change from settings.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFrameStyle } from '@/hooks/useFrameStyle';

const CORNER = 28;  // px — corner accent size
const SWEEP_MS = 3200;

export function CinematicFrame() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Thickness and corner rounding are founder-controlled; they were fixed
  // constants before, so the settings screen had colour and on/off but no
  // control over the frame's weight.
  const { color, enabled, width: LINE, radius: cornerRadius } = useFrameStyle();

  const topInset = insets.top;
  const frameW = width;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  // Just the top stroke — from just inside the left corner accent to
  // just inside the right one — not a closed rectangle.
  const borderPath = useMemo(() => {
    if (frameW < 1) return null;
    const y = LINE / 2;
    const path = Skia.Path.Make();
    path.moveTo(CORNER, y);
    path.lineTo(frameW - CORNER, y);
    return path;
  }, [frameW, LINE]);

  const band = frameW * 0.5;
  const gradStart = useDerivedValue(() => vec(progress.value * (frameW + band) - band, 0));
  const gradEnd = useDerivedValue(() => vec(progress.value * (frameW + band) - band + band, 0));

  if (!enabled) return null;

  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={{ position: 'absolute', top: topInset, left: 0, width: frameW, height: LINE + 1 }}>
        {borderPath && (
          <Canvas style={StyleSheet.absoluteFill}>
            {/* Dim base line, always visible */}
            <Path path={borderPath} style="stroke" strokeWidth={LINE} strokeCap="round" color={color + '38'} />
            {/* Bright band sweeping left then back right */}
            <Path path={borderPath} style="stroke" strokeWidth={LINE} strokeCap="round">
              <LinearGradient
                start={gradStart}
                end={gradEnd}
                colors={[color + '00', color + 'D9', '#fff8c8', color + 'D9', color + '00']}
              />
            </Path>
          </Canvas>
        )}
      </View>

      {/* Top corner accents only — no bottom rail at all */}
      <CornerAccent pos="tl" topInset={topInset} color={color} line={LINE} radius={cornerRadius} />
      <CornerAccent pos="tr" topInset={topInset} color={color} line={LINE} radius={cornerRadius} />
    </View>
  );
}

function CornerAccent({
  pos,
  topInset,
  color,
  line,
  radius,
}: {
  pos: 'tl' | 'tr';
  topInset: number;
  color: string;
  line: number;
  radius: number;
}) {
  const isLeft = pos === 'tl';
  const posStyle = {
    top:   topInset - 1,
    left:  isLeft ? -1 : undefined,
    right: !isLeft ? -1 : undefined,
  };
  return (
    <View style={[styles.corner, posStyle]}>
      <View
        style={[
          styles.cornerLine,
          { backgroundColor: color + 'a6', borderRadius: radius },
          {
            width: CORNER,
            height: line,
            top: 0,
            left: isLeft ? 0 : undefined,
            right: !isLeft ? 0 : undefined,
          },
        ]}
      />
      <View
        style={[
          styles.cornerLine,
          { backgroundColor: color + 'a6', borderRadius: radius },
          {
            width: line,
            height: CORNER,
            top: 0,
            left: isLeft ? 0 : undefined,
            right: !isLeft ? 0 : undefined,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerLine: {
    position: 'absolute',
  },
});
