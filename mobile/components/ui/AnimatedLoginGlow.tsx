import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Blur, RadialGradient, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface Orb {
  baseX: number; baseY: number;
  radius: number;
  driftX: number; driftY: number;
  duration: number;
  color: string;
}

// Three soft gold glow orbs that drift slowly behind the login card — GPU-driven
// via Skia + Reanimated, matching the web's `animate-float` blurred aura orbs.
export function AnimatedLoginGlow() {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
    // t is a Reanimated shared value — referentially stable, so omitting
    // it from deps is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbs: Orb[] = useMemo(() => [
    { baseX: width * 0.18, baseY: height * 0.16, radius: width * 0.42, driftX: 24, driftY: 34, duration: 1, color: 'rgba(230,171,44,0.16)' },
    { baseX: width * 0.86, baseY: height * 0.30, radius: width * 0.34, driftX: -30, driftY: 20, duration: 1, color: 'rgba(230,171,44,0.10)' },
    { baseX: width * 0.5,  baseY: height * 0.92, radius: width * 0.48, driftX: 18, driftY: -26, duration: 1, color: 'rgba(245,158,11,0.08)' },
  ], [width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group>
        <Blur blur={40} />
        {orbs.map((orb, i) => (
          <OrbCircle key={i} orb={orb} t={t} />
        ))}
      </Group>
    </Canvas>
  );
}

function OrbCircle({ orb, t }: { orb: Orb; t: ReturnType<typeof useSharedValue<number>> }) {
  const cx = useDerivedValue(() => orb.baseX + (t.value - 0.5) * 2 * orb.driftX);
  const cy = useDerivedValue(() => orb.baseY + (t.value - 0.5) * 2 * orb.driftY);
  const center = useDerivedValue(() => vec(cx.value, cy.value));

  return (
    <Circle cx={cx} cy={cy} r={orb.radius}>
      <RadialGradient c={center} r={orb.radius} colors={[orb.color, 'rgba(230,171,44,0)']} />
    </Circle>
  );
}
