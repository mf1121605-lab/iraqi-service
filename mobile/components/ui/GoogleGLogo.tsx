import { View } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';

// Official Google "G" mark (18x18 viewBox, Google's own 4-brand-color paths).
const G_PATHS: { d: string; color: string }[] = [
  { d: 'M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z', color: '#4285F4' },
  { d: 'M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z', color: '#34A853' },
  { d: 'M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z', color: '#FBBC05' },
  { d: 'M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z', color: '#EA4335' },
];

// Draws the real Google "G" mark on a Skia canvas (no react-native-svg dependency).
export function GoogleGLogo({ size = 20 }: { size?: number }) {
  const scale = size / 18;
  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale }]}>
          {G_PATHS.map((p) => (
            <Path key={p.color} path={p.d} color={p.color} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
