import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CARD_W = Dimensions.get('window').width - 32;

type AnimType = 'pulse' | 'sway' | 'floatY' | 'heartbeat';

type Theme = {
  accent: string;
  bgColors: readonly [string, string, string];
  main: string;
  sec: readonly [string, string];
  anim: AnimType;
};

const THEMES: Record<string, Theme> = {
  welcome:   { accent: '#e6ab2c', bgColors: ['#1c1500', '#0d0a00', '#060504'], main: '🌟', sec: ['⭐', '✨'],   anim: 'pulse'     },
  military:  { accent: '#c9d3dc', bgColors: ['#14181f', '#0c1018', '#060a0f'], main: '🪖', sec: ['⚔️', '🎖️'], anim: 'sway'     },
  education: { accent: '#4f8bff', bgColors: ['#061428', '#03080f', '#020508'], main: '🎓', sec: ['📚', '✏️'],   anim: 'floatY'   },
  welfare:   { accent: '#e14b6a', bgColors: ['#1c0408', '#100204', '#0a0202'], main: '❤️', sec: ['🤝', '🌿'],  anim: 'heartbeat' },
  general:   { accent: '#e6ab2c', bgColors: ['#1c1500', '#0d0a00', '#060504'], main: '⭐', sec: ['🔧', '🗂️'],  anim: 'pulse'     },
};

export default function AnnouncementBanner({
  titleAr,
  descriptionAr,
  motionGraphicKey,
}: {
  titleAr: string;
  descriptionAr?: string | null;
  motionGraphicKey?: string | null;
}) {
  const theme: Theme = (motionGraphicKey && THEMES[motionGraphicKey]) ? THEMES[motionGraphicKey] : THEMES.welcome;
  const animType = theme.anim;
  const accentColor = theme.accent;

  // ── Shared values ──────────────────────────────────────────────────────────
  const entScale   = useSharedValue(0.45);
  const entOpacity = useSharedValue(0);
  const loopVal    = useSharedValue(0);
  const sec1       = useSharedValue(0);
  const sec2       = useSharedValue(0);
  const titleY     = useSharedValue(18);
  const titleOp    = useSharedValue(0);
  const glow       = useSharedValue(0.2);
  const shimmerX   = useSharedValue(-CARD_W);

  useEffect(() => {
    // ── Entrance ──
    entScale.value   = withSpring(1, { damping: 11, stiffness: 110 });
    entOpacity.value = withTiming(1, { duration: 480 });
    titleY.value     = withDelay(340, withTiming(0,  { duration: 680 }));
    titleOp.value    = withDelay(340, withTiming(1,  { duration: 680 }));

    // ── Main emoji loop ──
    loopVal.value = 0;
    if (animType === 'pulse') {
      loopVal.value = withRepeat(withTiming(1, { duration: 950 }), -1, true);
    } else if (animType === 'sway') {
      // 0 → 4, interpolate [0,1,2,3,4] → [0,+14,0,−14,0] degrees
      loopVal.value = withRepeat(withTiming(4, { duration: 5600 }), -1, false);
    } else if (animType === 'floatY') {
      loopVal.value = withRepeat(withTiming(1, { duration: 1550 }), -1, true);
    } else {
      // heartbeat: 0→1, no reverse, keyframe interpolation in style
      loopVal.value = withRepeat(withTiming(1, { duration: 1150 }), -1, false);
    }

    // ── Secondary emojis float ──
    sec1.value = withRepeat(withTiming(1, { duration: 2300 }), -1, true);
    sec2.value = withDelay(1100, withRepeat(withTiming(1, { duration: 1950 }), -1, true));

    // ── Border glow pulse ──
    glow.value = withRepeat(withTiming(0.85, { duration: 1550 }), -1, true);

    // ── Shimmer sweep ──
    const sweep = () => {
      shimmerX.value = -CARD_W;
      shimmerX.value = withTiming(CARD_W + 130, {
        duration: 1380,
        easing: Easing.inOut(Easing.quad),
      });
    };
    sweep();
    const shimmerTimer = setInterval(sweep, 4800);

    return () => {
      clearInterval(shimmerTimer);
      cancelAnimation(loopVal);
      cancelAnimation(sec1);
      cancelAnimation(sec2);
      cancelAnimation(glow);
      cancelAnimation(shimmerX);
    };
  }, [animType, entScale, entOpacity, titleY, titleOp, loopVal, sec1, sec2, glow, shimmerX]);

  // ── Animated styles ────────────────────────────────────────────────────────

  const wrapperAnim = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    elevation: interpolate(glow.value, [0.2, 0.85], [5, 18]),
  }));

  const entAnim = useAnimatedStyle(() => ({
    opacity: entOpacity.value,
    transform: [{ scale: entScale.value }],
  }));

  const loopAnim = useAnimatedStyle(() => {
    const v = loopVal.value;
    if (animType === 'pulse') {
      return { transform: [{ scale: interpolate(v, [0, 1], [1, 1.19]) }] };
    } else if (animType === 'sway') {
      return { transform: [{ rotate: `${interpolate(v, [0, 1, 2, 3, 4], [0, 14, 0, -14, 0])}deg` }] };
    } else if (animType === 'floatY') {
      return { transform: [{ translateY: interpolate(v, [0, 1], [0, -14]) }] };
    } else {
      // heartbeat keyframes
      const scale = interpolate(
        v,
        [0, 0.14, 0.28, 0.42, 0.70, 1.0],
        [1,  1.20,  1.00,  1.12,  1.00,  1.00],
      );
      return { transform: [{ scale }] };
    }
  });

  const sec1Anim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sec1.value, [0, 1], [0, -9]) }],
  }));
  const sec2Anim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sec2.value, [0, 1], [0, -7]) }],
  }));

  const titleAnim = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }));

  const shimmerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { skewX: '-14deg' }],
  }));

  return (
    <Animated.View style={[styles.wrapper, { shadowColor: accentColor }, wrapperAnim]}>
      <View style={[styles.card, { borderColor: accentColor + '85' }]}>

        {/* Background gradient — type-specific dark color */}
        <LinearGradient
          colors={theme.bgColors as unknown as [string, string, string]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Radial accent blob — top-right corner glow */}
        <View style={[styles.accentBlob, { backgroundColor: accentColor + '1e' }]} />

        {/* Diagonal shimmer beam sweeping across */}
        <View style={styles.shimmerClip} pointerEvents="none">
          <Animated.View style={[styles.shimmerBeam, shimmerAnim]}>
            <LinearGradient
              colors={['transparent', accentColor + '28', accentColor + '55', accentColor + '28', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Top accent line */}
        <View style={[styles.topLine, { backgroundColor: accentColor }]} />

        {/* Content */}
        <View style={styles.body}>

          {/* Floating secondary emoji — top-left */}
          <Animated.Text style={[styles.sec, { top: 10, left: 18 }, sec1Anim]}>
            {theme.sec[0]}
          </Animated.Text>

          {/* Floating secondary emoji — top-right */}
          <Animated.Text style={[styles.sec, { top: 10, right: 18 }, sec2Anim]}>
            {theme.sec[1]}
          </Animated.Text>

          {/* Main emoji — spring entrance (outer) + looping animation (inner) */}
          <Animated.View style={entAnim}>
            <Animated.Text style={[styles.mainEmoji, loopAnim]}>
              {theme.main}
            </Animated.Text>
          </Animated.View>

          {/* Title — slides up on mount */}
          <Animated.Text style={[styles.title, titleAnim]}>
            {titleAr}
          </Animated.Text>

          {/* Accent divider */}
          <View style={[styles.divider, { backgroundColor: accentColor }]} />

          {/* Description */}
          {descriptionAr ? (
            <Animated.Text style={[styles.desc, titleAnim]}>
              {descriptionAr}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 22,
  },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: '#060a0f',
    minHeight: 195,
  },
  accentBlob: {
    position: 'absolute',
    top: -55,
    right: -55,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 110,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    opacity: 0.88,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
    alignItems: 'center',
    gap: 12,
  },
  sec: {
    position: 'absolute',
    fontSize: 27,
  },
  mainEmoji: {
    fontSize: 68,
    marginTop: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  divider: {
    height: 2,
    width: '52%',
    borderRadius: 1,
    opacity: 0.55,
  },
  desc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white70,
    textAlign: 'center',
    lineHeight: 22,
  },
});
