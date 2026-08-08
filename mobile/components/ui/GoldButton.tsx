/**
 * GoldButton — matches the web's .btn-cinematic-gold:
 *   gradient: #fcd34d → #f59e0b → #d97706
 *   shadow: 0 10px 30px -8px rgba(245,158,11,0.55)
 *   border-radius: 0.875rem (14px)
 *
 * Ghost variant matches .btn-cinematic-outline:
 *   border: rgba(230,171,44,0.3), bg: rgba(255,255,255,0.04)
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'gold' | 'ghost' | 'danger';
  fullWidth?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

// Every primary submit button in the app funnels through this component —
// upgrading the press feedback here (plush scale-down + soft glow, matching
// GlowPressable) gives every login/register/save/submit button the tactile
// feel app-wide with one edit instead of retrofitting each call site.
function usePlushPress(glowColor: string) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: glowColor,
    shadowOpacity: glow.value,
  }));

  function onPressIn() {
    scale.value = withTiming(0.95, { duration: 90 });
    glow.value = withTiming(0.85, { duration: 120 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
  function onPressOut() {
    scale.value = withTiming(1, { duration: 160 });
    glow.value = withTiming(0, { duration: 220 });
  }

  return { animStyle, onPressIn, onPressOut };
}

export function GoldButton({
  label, onPress, loading, disabled,
  variant = 'gold', fullWidth = true, small, style,
}: Props) {
  const isDisabled = disabled || loading;
  const glowColor = variant === 'danger' ? '#ef4444' : COLORS.gold;
  const { animStyle, onPressIn, onPressOut } = usePlushPress(glowColor);

  if (variant === 'ghost') {
    return (
      <Animated.View style={[styles.glowShadow, animStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          style={[
            styles.ghost,
            small ? styles.small : styles.full,
            fullWidth && !small && styles.fullW,
            isDisabled && styles.disabled,
            style,
          ]}
        >
          <Text style={[styles.ghostText, small && styles.smallText]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'danger') {
    return (
      <Animated.View style={[styles.glowShadow, animStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          style={[
            styles.dangerBtn,
            fullWidth && !small && styles.fullW,
            isDisabled && styles.disabled,
            style,
          ]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[styles.label, { color: '#fff' }, small && styles.smallText]}>{label}</Text>
          }
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      fullWidth && !small && styles.fullW,
      isDisabled && styles.disabled,
      styles.shadow,
      styles.glowShadow,
      animStyle,
      style,
    ]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
      >
        <LinearGradient
          colors={['#fcd34d', '#f59e0b', '#d97706']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btn, small && styles.small, fullWidth && !small && styles.fullW]}
        >
          {loading
            ? <ActivityIndicator color="#1a1000" size="small" />
            : <Text style={[styles.label, small && styles.smallText]}>{label}</Text>
          }
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowShadow: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  fullW: { width: '100%' },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    // inset highlight top edge (raised surface)
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.32)',
    // dark inset edge at the base (depth)
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(120,60,0,0.45)',
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1c0a00',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // btn-cinematic-gold shadow — deepened for a raised, 3D feel
  shadow: {
    borderRadius: RADIUS.md,
    ...SHADOWS.btn,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  ghost: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.30)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.gold,
    textAlign: 'center',
  },
  dangerBtn: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  disabled: { opacity: 0.45 },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  smallText: { fontSize: 13 },
});
