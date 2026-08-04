/**
 * AnimatedGoldBorder — GPU-driven gold shimmer border, Skia-drawn.
 *
 * Two modes:
 *  - 'vertical' (default): a bright band travels down the border then back
 *    up (ping-pong), like a slow scanning shine. Smooth and continuous —
 *    no per-corner "blinking" artifact.
 *  - 'rotate': the original spinning SweepGradient highlight.
 *
 * Requires @shopify/react-native-skia (included in the APK build).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import {
  Canvas,
  LinearGradient,
  Path,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  innerBg?: string;
  speed?: number;
  paused?: boolean;
  mode?: 'vertical' | 'rotate';
  style?: ViewStyle;
  innerStyle?: ViewStyle;
}

export function AnimatedGoldBorder({
  children,
  borderRadius = 20,
  borderWidth = 1.5,
  innerBg = '#0d1117',
  speed = 3200,
  paused = false,
  mode = 'vertical',
  style,
  innerStyle,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  // 'rotate' mode: 0 → 360deg. 'vertical' mode: 0 → 1 ping-pong (up/down).
  const progress = useSharedValue(0);

  useEffect(() => {
    if (paused) {
      progress.value = 0;
      return;
    }
    if (mode === 'rotate') {
      progress.value = withRepeat(
        withTiming(Math.PI * 2, { duration: speed, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      progress.value = withRepeat(
        withTiming(1, { duration: speed, easing: Easing.inOut(Easing.sin) }),
        -1,
        true, // reverse — creates the up/down "yoyo" sweep
      );
    }
    // progress is a Reanimated shared value — referentially stable, so
    // omitting it from deps is intentional (same convention as elsewhere).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, speed, mode]);

  const center = useMemo(() => vec(width / 2, height / 2), [width, height]);
  const rotateTransform = useDerivedValue(() => [{ rotate: progress.value }]);

  // Vertical mode: a bright band's start/end points travel down the card
  // then back up together — the band itself stays a fixed height.
  const band = height * 0.5;
  const gradStart = useDerivedValue(() => vec(width / 2, progress.value * (height + band) - band));
  const gradEnd = useDerivedValue(() => vec(width / 2, progress.value * (height + band) - band + band));

  // Build the rounded rect path (inset by borderWidth/2 so stroke sits inside the component)
  const borderPath = useMemo(() => {
    if (width < 1 || height < 1) return null;
    const inset = borderWidth / 2;
    const path = Skia.Path.Make();
    path.addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(inset, inset, width - borderWidth, height - borderWidth),
        borderRadius,
        borderRadius,
      ),
    );
    return path;
  }, [width, height, borderRadius, borderWidth]);

  function onLayout(e: LayoutChangeEvent) {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== size.width || h !== size.height) {
      setSize({ width: w, height: h });
    }
  }

  return (
    <View style={[styles.root, { borderRadius }, style]} onLayout={onLayout}>
      {/* ── Skia: animated gold border on GPU ─────────────────── */}
      {borderPath && width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {mode === 'rotate' ? (
            <Path
              path={borderPath}
              style="stroke"
              strokeWidth={borderWidth}
              strokeCap="round"
              origin={center}
              transform={rotateTransform}
            >
              {/* SweepGradient: one bright gold/white spike, rest near-transparent */}
              <SweepGradient
                c={center}
                colors={[
                  'rgba(230,171,44,0.00)',
                  'rgba(230,171,44,0.05)',
                  'rgba(230,171,44,0.40)',
                  'rgba(255,215,0,0.90)',
                  'rgba(255,248,200,1.00)',
                  'rgba(255,215,0,0.90)',
                  'rgba(230,171,44,0.40)',
                  'rgba(230,171,44,0.05)',
                  'rgba(230,171,44,0.00)',
                ]}
              />
            </Path>
          ) : (
            <>
              {/* Always-visible dim gold base border */}
              <Path
                path={borderPath}
                style="stroke"
                strokeWidth={borderWidth}
                strokeCap="round"
                color="rgba(230,171,44,0.22)"
              />
              {/* Bright band travelling top → bottom → top */}
              <Path
                path={borderPath}
                style="stroke"
                strokeWidth={borderWidth}
                strokeCap="round"
              >
                <LinearGradient
                  start={gradStart}
                  end={gradEnd}
                  colors={[
                    'rgba(230,171,44,0.00)',
                    'rgba(255,215,0,0.85)',
                    'rgba(255,248,200,1.00)',
                    'rgba(255,215,0,0.85)',
                    'rgba(230,171,44,0.00)',
                  ]}
                />
              </Path>
            </>
          )}
        </Canvas>
      )}

      {/* ── Inner content area ─────────────────────────────────── */}
      <View
        style={[
          {
            flex: 1,
            margin: borderWidth,
            borderRadius: Math.max(0, borderRadius - borderWidth),
            overflow: 'hidden',
            backgroundColor: innerBg,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});
