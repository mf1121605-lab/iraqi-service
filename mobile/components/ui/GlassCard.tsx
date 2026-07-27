import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { AnimatedGoldBorder } from './AnimatedGoldBorder';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  borderRadius?: number;
  borderSpeed?: number;
  noPad?: boolean;
}

export function GlassCard({
  children,
  style,
  contentStyle,
  borderRadius = 20,
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
      {/* Dark solid background — professional dark-gold look, no native blur needed */}
      <View style={styles.bg} pointerEvents="none" />

      {/* Content */}
      <View style={[styles.content, !noPad && styles.pad, contentStyle]}>
        {children}
      </View>
    </AnimatedGoldBorder>
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,12,18,0.92)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  pad: {
    padding: 18,
  },
});
