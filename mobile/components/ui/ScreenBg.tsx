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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import { useSiteBackground } from '@/hooks/useSiteBackground';
import { ParticlesLayer } from './ParticlesLayer';

interface Props {
  children: ReactNode;
  noTopPad?: boolean;
}

export function ScreenBg({ children, noTopPad }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { imageUrl, color, baseColor, particlesEnabled } = useSiteBackground();

  return (
    <View style={styles.root}>
      {/* ── Skia canvas: real radial gradients ─────────────────────── */}
      <Canvas key={`canvas-${width}-${height}`} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Deep base — founder-controlled (founder_settings.bg_color), was a
            hardcoded #0d1117 so the colour picker had no effect on mobile. */}
        <Rect x={0} y={0} width={width} height={height} color={baseColor ?? '#0d1117'} />

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

      {/* ── Founder-set background image/color — dim layer above the
          default gradient, still visible underneath, matches the web ── */}
      {/* Tint and image are independent layers. They used to be an either/or
          chain, so setting a colour silently hid an uploaded background image
          and there was no way to have both. */}
      {color && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.55 }]} pointerEvents="none" />
      )}
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" cachePolicy="memory-disk" />
      )}

      {/* ── Ambient particle effect — independent layer on top of whatever
          background is active, founder-toggleable ── */}
      {particlesEnabled && <ParticlesLayer />}

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
    // Matches the Skia base rect so there is no flash of the old default
    // before the canvas paints.
    backgroundColor: '#0d1117',
  },
  content: {
    flex: 1,
  },
});
