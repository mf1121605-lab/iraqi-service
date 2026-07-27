/**
 * GlassCard — Glassmorphism card: dark semi-transparent blur + AnimatedGoldBorder.
 * Uses expo-blur BlurView for the frosted-glass effect.
 */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { AnimatedGoldBorder } from './AnimatedGoldBorder';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  borderRadius?: number;
  /** Blur intensity 0-100; default 18 */
  blurIntensity?: number;
  /** Slow down or speed up the border animation (ms per rotation) */
  borderSpeed?: number;
  /** Remove default content padding */
  noPad?: boolean;
}

export function GlassCard({
  children,
  style,
  contentStyle,
  borderRadius = 20,
  blurIntensity = 18,
  borderSpeed = 3200,
  noPad,
}: Props) {
  return (
    <AnimatedGoldBorder
      borderRadius={borderRadius}
      borderWidth={1.5}
      innerBg="transparent"
      speed={borderSpeed}
      style={style}
    >
      {/* Frosted glass layer */}
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Dark tint overlay — deepens the glass effect */}
      <View style={styles.tint} pointerEvents="none" />

      {/* Content */}
      <View style={[styles.content, !noPad && styles.pad, contentStyle]}>
        {children}
      </View>
    </AnimatedGoldBorder>
  );
}

const styles = StyleSheet.create({
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,10,15,0.55)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  pad: {
    padding: 18,
  },
});
