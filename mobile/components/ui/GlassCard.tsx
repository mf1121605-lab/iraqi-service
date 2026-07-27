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
      innerBg="rgba(8,12,18,0.82)"
      speed={borderSpeed}
      style={style}
    >
      <View style={[styles.content, !noPad && styles.pad, contentStyle]}>
        {children}
      </View>
    </AnimatedGoldBorder>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  pad: {
    padding: 18,
  },
});
