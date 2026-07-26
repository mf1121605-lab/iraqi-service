import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'gold' | 'ghost';
  fullWidth?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function GoldButton({ label, onPress, loading, disabled, variant = 'gold', fullWidth = true, small, style }: Props) {
  const isDisabled = disabled || loading;
  const sizeStyle = small ? styles.small : null;

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.ghost, sizeStyle, fullWidth && !small && styles.full, isDisabled && styles.disabled, style]}
      >
        <Text style={[styles.ghostText, small && styles.smallText]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={[fullWidth && !small && styles.full, isDisabled && styles.disabled, style]}>
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.btn, sizeStyle, fullWidth && !small && styles.full]}
      >
        {loading ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <Text style={[styles.label, small && styles.smallText]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { width: '100%' },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  ghost: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.gold,
    textAlign: 'center',
  },
  disabled: { opacity: 0.5 },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  smallText: { fontSize: 13 },
});
