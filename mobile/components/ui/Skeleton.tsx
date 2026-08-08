import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

// Glowing shimmer block used in place of a spinner while content loads —
// a row of these roughly matching the real card's shape (avatar circle +
// a couple of text lines) reads as "content is coming" instead of "the
// app is frozen", which a bare ActivityIndicator doesn't communicate.
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: Props) {
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [shimmer]);

  const animStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animStyle, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={12} />
          <Skeleton width="90%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={80} radius={10} style={{ marginTop: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: 'rgba(230,171,44,0.14)' },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.1)',
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  lines: { flex: 1, gap: 8 },
});
