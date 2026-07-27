/**
 * AnimatedGoldBorder — GPU-driven gold shimmer border using Skia SweepGradient.
 *
 * A Skia Canvas draws a stroked rounded-rect path with a SweepGradient shader.
 * The bright highlight (white spike) sweeps around the border by animating the
 * `start` and `end` angles of the gradient via Reanimated shared values.
 * Everything runs on the GPU — no JS-thread animation frames.
 *
 * Requires @shopify/react-native-skia (included in the APK build).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import {
  Canvas,
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
  style,
  innerStyle,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  // Animate from 0 → 360 degrees (as radians for Skia transforms)
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!paused) {
      rotation.value = withRepeat(
        withTiming(Math.PI * 2, { duration: speed, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
    }
  }, [paused, speed]);

  // Rotate the entire path group around the card center
  const center = useMemo(() => vec(width / 2, height / 2), [width, height]);
  const transform = useDerivedValue(() => [{ rotate: rotation.value }]);

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
          <Path
            path={borderPath}
            style="stroke"
            strokeWidth={borderWidth}
            strokeCap="round"
            origin={center}
            transform={transform}
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
