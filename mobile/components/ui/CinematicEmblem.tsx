import { Image, StyleSheet, View } from 'react-native';
import { Canvas, Circle, Blur } from '@shopify/react-native-skia';

// Real aspect ratio of assets/eagle-icon-transparent.png (829×572) — a
// chroma-keyed crop of the app icon with the background removed, so only
// the eagle/wings/shield render (no boxed backdrop, no baked-in text).
const ASPECT = 829 / 572;

// Pure "motion graphic" logo — just the eagle floating on a soft ambient
// glow, no ring/circle backdrop.
export function CinematicEmblem({ size = 140 }: { size?: number }) {
  const height = size / ASPECT;
  const pad = size * 0.32;
  const canvasW = size + pad * 2;
  const canvasH = height + pad * 2;

  return (
    <View style={[styles.wrap, { width: canvasW, height: canvasH }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={canvasW / 2} cy={canvasH / 2} r={Math.min(canvasW, canvasH) * 0.34} color="rgba(230,171,44,0.30)">
          <Blur blur={size * 0.1} />
        </Circle>
      </Canvas>
      <Image
        source={require('@/assets/eagle-icon-transparent.png')}
        style={{ width: size, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
