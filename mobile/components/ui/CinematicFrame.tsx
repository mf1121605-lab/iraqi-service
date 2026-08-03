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
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFrameColor } from '@/hooks/useFrameColor';
import { useFrameEnabled } from '@/hooks/useFrameEnabled';

const CORNER = 28;  // px — corner accent size
const LINE   = 2;   // border line thickness
const SWEEP_MS = 3200;

export function CinematicFrame() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const color = useFrameColor();
  const enabled = useFrameEnabled();

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
  }, [frameW]);

  const band = frameW * 0.5;
  const gradStart = useDerivedValue(() => vec(progress.value * (frameW + band) - band, 0));
  const gradEnd = useDerivedValue(() => vec(progress.value * (frameW + band) - band + band, 0));

  const [dim, setDim] = useState(false);
  useEffect(() => { setDim(true); }, []);

  if (!enabled) return null;

  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={{ position: 'absolute', top: topInset, left: 0, width: frameW, height: LINE + 1 }}>
        {dim && borderPath && (
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
      <CornerAccent pos="tl" topInset={topInset} color={color} />
      <CornerAccent pos="tr" topInset={topInset} color={color} />
    </View>
  );
}

function CornerAccent({
  pos,
  topInset,
  color,
}: {
  pos: 'tl' | 'tr';
  topInset: number;
  color: string;
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
          { backgroundColor: color + 'a6' },
          {
            width: CORNER,
            height: LINE,
            top: 0,
            left: isLeft ? 0 : undefined,
            right: !isLeft ? 0 : undefined,
          },
        ]}
      />
      <View
        style={[
          styles.cornerLine,
          { backgroundColor: color + 'a6' },
          {
            width: LINE,
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
    borderRadius: 1,
  },
});
