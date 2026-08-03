/**
 * CinematicFrame — the gold border overlay present on every screen.
 *
 * Sits flush against the true screen edges (no inset margin) so it reads
 * as part of the device bezel rather than a floating rectangle. The
 * bottom edge stops above the customer tab bar instead of drawing behind
 * it (see hooks/useFrameInset.ts — screens with their own bottom bar
 * reserve that height). The border itself is an animated Skia sweep
 * (same GPU-driven technique as AnimatedGoldBorder) in a color the
 * founder can change from the founder settings screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFrameBottomInset } from '@/hooks/useFrameInset';
import { useFrameColor } from '@/hooks/useFrameColor';
import { useFrameEnabled } from '@/hooks/useFrameEnabled';

const CORNER = 28;  // px — corner accent size
const LINE   = 2;   // border line thickness
const RADIUS = 6;
const SWEEP_MS = 3800;

export function CinematicFrame() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reservedBottom = useFrameBottomInset();
  const color = useFrameColor();
  const enabled = useFrameEnabled();

  const topInset = insets.top;
  const bottomInset = reservedBottom > 0 ? reservedBottom : insets.bottom;
  const frameW = width;
  const frameH = height - topInset - bottomInset;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  const borderPath = useMemo(() => {
    if (frameW < 1 || frameH < 1) return null;
    const inset = LINE / 2;
    const path = Skia.Path.Make();
    path.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(inset, inset, frameW - LINE, frameH - LINE),
        RADIUS,
        RADIUS,
      ),
    );
    return path;
  }, [frameW, frameH]);

  const band = frameH * 0.5;
  const gradStart = useDerivedValue(() => vec(frameW / 2, progress.value * (frameH + band) - band));
  const gradEnd = useDerivedValue(() => vec(frameW / 2, progress.value * (frameH + band) - band + band));

  const [dim, setDim] = useState(false);
  useEffect(() => { setDim(true); }, []);

  if (!enabled) return null;

  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={{ position: 'absolute', top: topInset, left: 0, width: frameW, height: frameH }}>
        {dim && borderPath && (
          <Canvas style={StyleSheet.absoluteFill}>
            {/* Dim base border, always visible */}
            <Path path={borderPath} style="stroke" strokeWidth={LINE} strokeCap="round" color={color + '38'} />
            {/* Bright band sweeping down then back up */}
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

      {/* ── Corner accents ─────────────────────────────────────────────── */}
      <CornerAccent pos="tl" topInset={topInset} bottomInset={bottomInset} color={color} />
      <CornerAccent pos="tr" topInset={topInset} bottomInset={bottomInset} color={color} />
      <CornerAccent pos="bl" topInset={topInset} bottomInset={bottomInset} color={color} />
      <CornerAccent pos="br" topInset={topInset} bottomInset={bottomInset} color={color} />
    </View>
  );
}

function CornerAccent({
  pos,
  topInset,
  bottomInset,
  color,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  topInset: number;
  bottomInset: number;
  color: string;
}) {
  const isTop    = pos === 'tl' || pos === 'tr';
  const isLeft   = pos === 'tl' || pos === 'bl';
  const posStyle = {
    top:    isTop    ? topInset - 1 : undefined,
    bottom: !isTop   ? bottomInset - 1 : undefined,
    left:   isLeft   ? -1 : undefined,
    right:  !isLeft  ? -1 : undefined,
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
            top: isTop ? 0 : undefined,
            bottom: !isTop ? 0 : undefined,
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
            top: isTop ? 0 : undefined,
            bottom: !isTop ? 0 : undefined,
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
