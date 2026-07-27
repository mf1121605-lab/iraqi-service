import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  innerBg?: string;
  speed?: number;
  paused?: boolean;
  style?: ViewStyle;
  innerStyle?: ViewStyle;
}

export function AnimatedGoldBorder({
  children,
  borderRadius = 20,
  borderWidth = 1.5,
  innerBg = '#0d1117',
  style,
  innerStyle,
}: Props) {
  return (
    <View
      style={[
        styles.root,
        {
          borderRadius,
          borderWidth,
          borderColor: 'rgba(230,171,44,0.40)',
        },
        style,
      ]}
    >
      <View
        style={[
          {
            flex: 1,
            margin: borderWidth,
            borderRadius: Math.max(0, borderRadius - borderWidth),
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
  root: {
    overflow: 'hidden',
  },
});
