import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Canvas, Circle, Blur } from '@shopify/react-native-skia';

// Real aspect ratio of assets/full-logo-transparent.png (900×823) — the
// complete brand mark: eagle + wings + shield + baked-in bilingual text
// plaque ("منصة الخدمات العراقية" / "IRAQI SERVICES PLATFORM"), background
// chroma-keyed out so only the mark itself renders, no boxed backdrop.
const ASPECT = 900 / 823;

// Full logo, floating on a soft ambient gold glow — no ring/circle backdrop.
export function CinematicEmblem({ size = 140 }: { size?: number }) {
  const height = size / ASPECT;
  const pad = size * 0.22;
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
        source={require('@/assets/full-logo-transparent.png')}
        style={{ width: size, height }}
        contentFit="contain"
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
