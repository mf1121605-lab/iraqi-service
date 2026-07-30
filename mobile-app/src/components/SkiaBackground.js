import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Blur, Canvas, Circle, Group, useClockValue, useComputedValue } from '@shopify/react-native-skia';

export default function SkiaBackground({ style }) {
  const clock = useClockValue();
  const orb1X = useComputedValue(() => 112 + Math.sin(clock.current / 1600) * 70, [clock]);
  const orb1Y = useComputedValue(() => 92 + Math.cos(clock.current / 2000) * 60, [clock]);
  const orb2X = useComputedValue(() => 292 + Math.cos(clock.current / 1800) * 75, [clock]);
  const orb2Y = useComputedValue(() => 142 + Math.sin(clock.current / 1400) * 58, [clock]);
  const orb3X = useComputedValue(() => 202 + Math.sin(clock.current / 1200) * 90, [clock]);
  const orb3Y = useComputedValue(() => 332 + Math.cos(clock.current / 1700) * 50, [clock]);
  const pulseR = useComputedValue(() => 126 + Math.sin(clock.current / 1000) * 18, [clock]);

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          <Blur blur={30} />
          <Circle cx={orb1X} cy={orb1Y} r={128} color="rgba(230, 171, 44, 0.34)" />
          <Circle cx={orb2X} cy={orb2Y} r={154} color="rgba(56, 189, 248, 0.25)" />
          <Circle cx={orb3X} cy={orb3Y} r={108} color="rgba(139, 92, 246, 0.22)" />
          <Circle cx={220} cy={260} r={pulseR} color="rgba(16, 185, 129, 0.16)" />
        </Group>
      </Canvas>
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 17, 31, 0.24)',
  },
});
