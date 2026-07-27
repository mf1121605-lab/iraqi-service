/**
 * HapticButton — Pressable with:
 *   • Haptic feedback on press (light impact)
 *   • Spring scale-down animation (0.95) via Reanimated
 *   • Gold gradient fill (default) or glass ghost variant
 */
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'gold' | 'ghost' | 'glass' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  small?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const SPRING = { damping: 14, stiffness: 300, mass: 0.6 };

export function HapticButton({
  label,
  onPress,
  variant = 'gold',
  loading,
  disabled,
  fullWidth = true,
  small,
  style,
  icon,
}: Props) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.95, SPRING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handlePressOut() {
    scale.value = withSpring(1, SPRING);
  }

  const textStyle = [
    styles.label,
    small && styles.smallText,
    variant !== 'gold' && { color: variant === 'danger' ? '#fff' : COLORS.gold },
  ];

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={isDisabled}
      style={[fullWidth && !small && styles.fullW, isDisabled && styles.disabled, style]}
    >
      <Animated.View style={animStyle}>
        {variant === 'gold' ? (
          <LinearGradient
            colors={['#fcd34d', '#f59e0b', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.btn,
              small && styles.small,
              fullWidth && !small && styles.fullW,
              styles.goldShadow,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#1a1000" size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.label, small && styles.smallText, { color: '#1c0a00' }]}>
                  {label}
                </Text>
              </>
            )}
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              styles.btn,
              small && styles.small,
              fullWidth && !small && styles.fullW,
              variant === 'ghost' && styles.ghost,
              variant === 'glass' && styles.glass,
              variant === 'danger' && styles.danger,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={variant === 'danger' ? '#fff' : COLORS.gold} size="small" />
            ) : (
              <>
                {icon}
                <Text style={textStyle}>{label}</Text>
              </>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullW: { width: '100%' },
  disabled: { opacity: 0.42 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },

  goldShadow: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },

  ghost: {
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.30)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 0,
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.20)',
    backgroundColor: 'rgba(230,171,44,0.08)',
    borderTopWidth: 0,
  },
  danger: {
    backgroundColor: '#ef4444',
    borderTopWidth: 0,
  },

  label: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.gold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  smallText: { fontSize: 13 },
});
