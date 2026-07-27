/**
 * ScreenBg — dark background with real radial gradients matching the web CSS:
 *   radial-gradient(ellipse 80% 60% at 50% -5%,  gold) ← top-center
 *   radial-gradient(ellipse 60% 80% at 85% 60%,  gold) ← right-middle
 *   radial-gradient(ellipse 70% 50% at 15% 80%,  gold) ← bottom-left
 *
 * Uses @shopify/react-native-skia for true RadialGradient rendering.
 * Requires an APK build (native module). OTA updates are fine after that.
 */
import { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';

interface Props {
  children: ReactNode;
  noTopPad?: boolean;
}

export function ScreenBg({ children, noTopPad }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      {/* ── Skia canvas: real radial gradients ─────────────────────── */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Base #0d1117 */}
        <Rect x={0} y={0} width={width} height={height} color="#0d1117" />

        {/* Top-center gold aurora — mirrors web radial at 50% -5% */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.5, height * -0.05)}
            r={width * 0.85}
            colors={['rgba(245,158,11,0.14)', 'rgba(245,158,11,0)']}
          />
        </Rect>

        {/* Right-middle accent — mirrors web radial at 85% 60% */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.88, height * 0.58)}
            r={width * 0.68}
            colors={['rgba(245,158,11,0.07)', 'rgba(245,158,11,0)']}
          />
        </Rect>

        {/* Bottom-left accent — mirrors web radial at 15% 80% */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.12, height * 0.84)}
            r={width * 0.58}
            colors={['rgba(245,158,11,0.05)', 'rgba(245,158,11,0)']}
          />
        </Rect>

        {/* Subtle center-bottom glow for depth */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.5, height * 1.05)}
            r={width * 0.6}
            colors={['rgba(230,171,44,0.06)', 'rgba(230,171,44,0)']}
          />
        </Rect>
      </Canvas>

      {/* ── Screen content ─────────────────────────────────────────── */}
      <View style={[styles.content, !noTopPad && { paddingTop: insets.top }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    flex: 1,
  },
});
