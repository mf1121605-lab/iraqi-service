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

export function GoldButton({
  label, onPress, loading, disabled,
  variant = 'gold', fullWidth = true, small, style,
}: Props) {
  const isDisabled = disabled || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.ghost,
          small ? styles.small : styles.full,
          fullWidth && !small && styles.fullW,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.ghostText, small && styles.smallText]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === 'danger') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.dangerBtn,
          fullWidth && !small && styles.fullW,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={[styles.label, { color: '#fff' }, small && styles.smallText]}>{label}</Text>
        }
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        fullWidth && !small && styles.fullW,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        styles.shadow,
        style,
      ]}
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
  );
}

const styles = StyleSheet.create({
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
  pressed:  { opacity: 0.80, transform: [{ scale: 0.987 }] },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  smallText: { fontSize: 13 },
});
