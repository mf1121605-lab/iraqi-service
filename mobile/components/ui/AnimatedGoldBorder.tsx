/**
 * AnimatedGoldBorder — Spinning gold shine border using Reanimated + LinearGradient.
 *
 * Technique: outer container clips to borderRadius; an Animated.View inside spins
 * a LinearGradient that's 280% wide/tall (covers all corners at any rotation angle).
 * A solid inner View sits on top covering the center — revealing only the border strip.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// The 6-stop gradient: mostly transparent, bright gold spike at the 60-80% mark
const SHINE_COLORS: [string, string, string, string, string, string] = [
  'rgba(230,171,44,0.00)',
  'rgba(230,171,44,0.08)',
  'rgba(255,215,0,0.85)',
  'rgba(255,248,200,1.00)',
  'rgba(255,215,0,0.85)',
  'rgba(230,171,44,0.00)',
];

interface Props {
  children: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  /** Background color of the inner content area */
  innerBg?: string;
  /** Rotation speed in ms (lower = faster) */
  speed?: number;
  /** Pause the animation */
  paused?: boolean;
  style?: ViewStyle;
  innerStyle?: ViewStyle;
}

export function AnimatedGoldBorder({
  children,
  borderRadius = 20,
  borderWidth = 1.5,
  innerBg = '#0d1117',
  speed = 3200,
  paused = false,
  style,
  innerStyle,
}: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!paused) {
      rotation.value = withRepeat(
        withTiming(360, { duration: speed, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
    }
  }, [paused, speed]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[
        { borderRadius, overflow: 'hidden', padding: borderWidth },
        style,
      ]}
    >
      {/* Spinning gradient — 280% ensures corners are always covered */}
      <Animated.View
        style={[styles.spinWrap, spinStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={SHINE_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Inner content — covers center, leaving only the border strip visible */}
      <View
        style={[
          {
            flex: 1,
            borderRadius: Math.max(0, borderRadius - borderWidth - 0.5),
            overflow: 'hidden',
            backgroundColor: innerBg,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    width: '280%',
    height: '280%',
  },
});
