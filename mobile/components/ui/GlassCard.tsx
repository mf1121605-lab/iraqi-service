/**
 * GlassCard — premium glassmorphism card using @shopify/react-native-skia.
 *
 * Uses BackdropFilter + Blur to blur whatever is BEHIND the card (the ScreenBg
 * radial gradients), then overlays a semi-transparent dark tint. The result is
 * a genuine glass effect matching the web's backdrop-filter: blur(14px).
 *
 * Fallback: if BackdropFilter is unsupported on the device, the RoundedRect
 * color (rgba(8,12,18,0.82)) acts as a solid dark background. Card is always
 * readable.
 *
 * AnimatedGoldBorder wraps the whole thing for the spinning gold border.
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BackdropFilter,
  Blur,
  Canvas,
  RoundedRect,
} from '@shopify/react-native-skia';
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
  const [size, setSize] = useState({ width: 0, height: 0 });
  const innerRadius = Math.max(0, borderRadius - 2);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  }

  return (
    <AnimatedGoldBorder
      borderRadius={borderRadius}
      borderWidth={1.5}
      innerBg="transparent"
      speed={borderSpeed}
      style={style}
    >
      <View style={styles.inner} onLayout={onLayout}>
        {/* Skia glass layer — blurs content behind the card */}
        {size.width > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            <BackdropFilter filter={<Blur blur={14} />}>
              <RoundedRect
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                r={innerRadius}
                color="rgba(8,12,18,0.72)"
              />
            </BackdropFilter>
          </Canvas>
        )}

        {/* Card content — sits above the glass layer */}
        <View style={[styles.content, !noPad && styles.pad, contentStyle]}>
          {children}
        </View>
      </View>
    </AnimatedGoldBorder>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  pad: {
    padding: 18,
  },
});
