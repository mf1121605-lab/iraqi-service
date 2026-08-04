import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface IraqiFlagBadgeProps {
  size?: number;
  style?: object;
}

export function IraqiFlagBadge({ size = 96, style }: IraqiFlagBadgeProps) {
  const floatValue = useSharedValue(0);
  const swayValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    swayValue.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // floatValue/swayValue are Reanimated shared values — referentially
    // stable, so omitting them from deps is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (floatValue.value - 0.5) * 8 },
      { rotate: `${(swayValue.value - 0.5) * 0.08}rad` },
    ],
  }));

  const width = size;
  const height = size * 0.72;
  const radius = size * 0.18;
  const bandHeight = height / 3;

  return (
    <Animated.View style={[styles.wrap, { width, height: size * 0.92 }, animatedStyle, style]}>
      <LinearGradient
        colors={['rgba(230,171,44,0.16)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.frame, { width, height: size * 0.92, borderRadius: size * 0.24 }]} />
      <View style={[styles.flag, { width, height, borderRadius: radius }]}>
        <View style={[styles.band, styles.redBand, { height: bandHeight }]} />
        <View style={[styles.band, styles.whiteBand, { height: bandHeight }]} />
        <View style={[styles.band, styles.blackBand, { height: bandHeight }]} />
        <View style={styles.centerGlow} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(230,171,44,0.55)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  flag: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: '#0d1117',
  },
  band: {
    width: '100%',
  },
  redBand: {
    backgroundColor: '#ce1126',
  },
  whiteBand: {
    backgroundColor: '#ffffff',
  },
  blackBand: {
    backgroundColor: '#000000',
  },
  centerGlow: {
    position: 'absolute',
    width: '36%',
    height: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(230,171,44,0.18)',
    top: '32%',
    left: '32%',
  },
});
