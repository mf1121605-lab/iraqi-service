import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const CORNER = 34;
const INSET   = 14;
const GOLD65  = 'rgba(230,171,44,0.65)';
const GOLD35  = 'rgba(230,171,44,0.35)';

interface Props { onDone: () => void; }

export function CinematicSplash({ onDone }: Props) {
  const logoScale  = useRef(new Animated.Value(0.65)).current;
  const logoOp     = useRef(new Animated.Value(0)).current;
  const textOp     = useRef(new Animated.Value(0)).current;
  const pulseOp    = useRef(new Animated.Value(0.25)).current;
  const shimmerX   = useRef(new Animated.Value(-W)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo scales in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 11, stiffness: 85, useNativeDriver: true }),
      Animated.timing(logoOp,    { toValue: 1, duration: 550, delay: 100, useNativeDriver: true }),
    ]).start(() => {
      // Text fades in
      Animated.timing(textOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      // Shimmer sweep across name
      shimmerX.setValue(-W * 0.6);
      Animated.timing(shimmerX, { toValue: W * 1.5, duration: 1100, delay: 200, useNativeDriver: true }).start();
    });

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOp, { toValue: 0.65, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseOp, { toValue: 0.25, duration: 1100, useNativeDriver: true }),
      ])
    ).start();

    // Fade out after 2.8 s
    const timer = setTimeout(() => {
      Animated.timing(screenFade, { toValue: 0, duration: 550, useNativeDriver: true })
        .start(() => onDone());
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[s.wrap, { opacity: screenFade }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#060a0f', '#0d1117', '#060a0f']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Cinematic gold frame */}
      <View style={s.frame}>
        <View style={s.border} />
        <CornerAccent t={INSET}    l={INSET}    />
        <CornerAccent t={INSET}    r={INSET}    />
        <CornerAccent b={INSET}    l={INSET}    />
        <CornerAccent b={INSET}    r={INSET}    />
      </View>

      {/* Center content */}
      <View style={s.center}>
        {/* Pulsing halo behind logo */}
        <Animated.View style={[s.halo, { opacity: pulseOp }]} />

        {/* Logo emblem */}
        <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoScale }] }}>
          <View style={s.emblemOuter}>
            <View style={s.emblemMid} />
            <View style={s.emblemCore}>
              <Text style={s.emoji}>🏛️</Text>
            </View>
          </View>
        </Animated.View>

        {/* Platform name + tagline */}
        <Animated.View style={[s.textBlock, { opacity: textOp }]}>
          {/* Name with shimmer sweep */}
          <View style={s.nameWrap}>
            <Text style={s.name}>خدماتي</Text>
            <Animated.View
              style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['transparent', 'rgba(230,171,44,0.55)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: W * 0.55, height: 60 }}
              />
            </Animated.View>
          </View>
          <View style={s.divider} />
          <Text style={s.tagline}>منصة الخدمات العراقية</Text>
        </Animated.View>
      </View>

      {/* Bottom subtle dots */}
      <Animated.View style={[s.dots, { opacity: textOp }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, i === 1 && s.dotActive]} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/** Small gold corner accent (two perpendicular lines) */
function CornerAccent({ t, b, l, r }: { t?: number; b?: number; l?: number; r?: number }) {
  return (
    <View style={{ position: 'absolute', top: t, bottom: b, left: l, right: r, width: CORNER, height: CORNER }}>
      {/* Horizontal */}
      <View style={{
        position: 'absolute',
        width: CORNER, height: 2,
        backgroundColor: GOLD65,
        borderRadius: 1,
        top:    t !== undefined ? 0 : undefined,
        bottom: b !== undefined ? 0 : undefined,
        left:   l !== undefined ? 0 : undefined,
        right:  r !== undefined ? 0 : undefined,
      }} />
      {/* Vertical */}
      <View style={{
        position: 'absolute',
        width: 2, height: CORNER,
        backgroundColor: GOLD65,
        borderRadius: 1,
        top:    t !== undefined ? 0 : undefined,
        bottom: b !== undefined ? 0 : undefined,
        left:   l !== undefined ? 0 : undefined,
        right:  r !== undefined ? 0 : undefined,
      }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    backgroundColor: '#060a0f',
  },
  frame: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  border: {
    position: 'absolute',
    top: INSET, left: INSET, right: INSET, bottom: INSET,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD35,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  halo: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(230,171,44,0.04)',
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.18)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  emblemOuter: {
    width: 116, height: 116, borderRadius: 58,
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.22)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  emblemMid: {
    position: 'absolute',
    width: 94, height: 94, borderRadius: 47,
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.32)',
  },
  emblemCore: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(230,171,44,0.13)',
    borderWidth: 1.5, borderColor: 'rgba(230,171,44,0.58)',
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 38 },

  textBlock: { alignItems: 'center', marginTop: 30 },
  nameWrap:  { overflow: 'hidden', position: 'relative' },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 40,
    color: COLORS.gold,
    letterSpacing: 2,
  },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    justifyContent: 'center',
  },
  divider: {
    width: 64, height: 1,
    backgroundColor: 'rgba(230,171,44,0.35)',
    marginVertical: 10,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },

  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingBottom: 48,
  },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(230,171,44,0.2)',
  },
  dotActive: {
    backgroundColor: 'rgba(230,171,44,0.7)',
    width: 18, borderRadius: 3,
  },
});
