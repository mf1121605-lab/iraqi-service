import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// A thin gold line with a bright band sweeping left-to-right on loop —
// used to top-edge things like the bottom tab bar so the gold shimmer
// motif (already used on cards via AnimatedGoldBorder) reaches chrome
// elements that aren't a rounded card and can't use that component.
export function AnimatedTopBorderLine() {
  const shift = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    shift.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [shift]);

  const sweepWidth = trackWidth * 0.5;

  // React Native's native transform processor only accepts numeric pixel
  // values for translateX — a percentage string ("25%") throws a fatal
  // UnexpectedNativeTypeException on the UI thread (confirmed via a real
  // device crash log), unrecoverable and invisible to JS-level error
  // handling. The sweep travels the track's own measured width instead.
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * (trackWidth + sweepWidth) - sweepWidth }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w !== trackWidth) setTrackWidth(w);
  }

  return (
    <View style={styles.track} pointerEvents="none" onLayout={onLayout}>
      <Animated.View style={[styles.sweep, { width: sweepWidth }, sweepStyle]}>
        <LinearGradient
          colors={[
            'rgba(230,171,44,0)',
            'rgba(255,215,0,0.9)',
            'rgba(255,248,200,1)',
            'rgba(255,215,0,0.9)',
            'rgba(230,171,44,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(230,171,44,0.18)',
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
