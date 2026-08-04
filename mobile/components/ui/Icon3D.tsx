import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@/constants/theme';

interface Props {
  // Either an emoji glyph (legacy path, still used for reaction/category
  // icons whose set is data-driven) or a real icon from the bundled,
  // free @expo/vector-icons set (Ionicons) for fixed, professional-looking
  // navigation/action icons — pass exactly one.
  emoji?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: number;
  active?: boolean;
  glowColor?: string;
  badge?: number;
  animation?: 'float' | 'pulse' | 'none';
}

// A glossy, depth-shaded badge around an emoji glyph — gradient fill, a lit
// top edge, a deep drop shadow, and a slow idle float/pulse — meant to read
// as a small "3D" icon without needing real 3D/image assets. Used anywhere
// a flat emoji previously stood alone (tab bar, page headers, notification
// icons).
export function Icon3D({ emoji, iconName, size = 40, active, glowColor = COLORS.gold, badge, animation = 'float' }: Props) {
  const idle = useSharedValue(0);

  useEffect(() => {
    if (animation === 'none') return;
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [animation, idle]);

  const idleStyle = useAnimatedStyle(() => {
    if (animation === 'float') {
      return { transform: [{ translateY: -idle.value * 3 }] };
    }
    if (animation === 'pulse') {
      return { transform: [{ scale: 1 + idle.value * 0.08 }] };
    }
    return {};
  });

  const grad: [string, string] = active
    ? ['rgba(230,171,44,0.32)', 'rgba(230,171,44,0.10)']
    : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)'];

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: size, height: size, borderRadius: size * 0.32,
          shadowColor: active ? glowColor : '#000',
          shadowOpacity: active ? 0.55 : 0.35,
        },
        idleStyle,
      ]}
    >
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[
          styles.fill,
          { borderRadius: size * 0.32, borderColor: active ? 'rgba(230,171,44,0.5)' : 'rgba(255,255,255,0.10)' },
        ]}
      >
        <View style={[styles.topHighlight, { top: size * 0.06, left: size * 0.16, right: size * 0.16 }]} />
        {iconName ? (
          <Ionicons name={iconName} size={size * 0.52} color={active ? COLORS.gold : COLORS.white70} />
        ) : (
          <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
        )}
      </LinearGradient>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fill: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topHighlight: { position: 'absolute', height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
