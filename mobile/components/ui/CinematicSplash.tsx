import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');
const CORNER = 34;
const INSET   = 14;
const GOLD65  = 'rgba(230,171,44,0.65)';
const GOLD35  = 'rgba(230,171,44,0.35)';

// Same single brand asset used everywhere else (login/register/dashboards)
// — full mark with the bilingual name plaque baked in, so no separate
// text block is needed here.
const LOGO = require('../../assets/full-logo-transparent.png');
const LOGO_ASPECT = 900 / 823;

interface Props { onDone: () => void; }

export function CinematicSplash({ onDone }: Props) {
  const logoScale  = useRef(new Animated.Value(0.55)).current;
  const logoOp     = useRef(new Animated.Value(0)).current;
  const textOp     = useRef(new Animated.Value(0)).current;
  const pulseOp    = useRef(new Animated.Value(0.2)).current;
  const shimmerX   = useRef(new Animated.Value(-W)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Eagle scales in with spring
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 10, stiffness: 70, useNativeDriver: true }),
      Animated.timing(logoOp,    { toValue: 1, duration: 600, delay: 80, useNativeDriver: true }),
    ]).start(() => {
      // Text fades in after eagle
      Animated.timing(textOp, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      // Shimmer sweep
      shimmerX.setValue(-W * 0.7);
      Animated.timing(shimmerX, { toValue: W * 1.5, duration: 1200, delay: 150, useNativeDriver: true }).start();
    });

    // Gold glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOp, { toValue: 0.60, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseOp, { toValue: 0.20, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Fade out after 3.2 s
    const timer = setTimeout(() => {
      Animated.timing(screenFade, { toValue: 0, duration: 600, useNativeDriver: true })
        .start(() => onDone());
    }, 3200);
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
        <CornerAccent t={INSET} l={INSET} />
        <CornerAccent t={INSET} r={INSET} />
        <CornerAccent b={INSET} l={INSET} />
        <CornerAccent b={INSET} r={INSET} />
      </View>

      {/* Center content */}
      <View style={s.center}>
        {/* Gold glow halo behind eagle */}
        <Animated.View style={[s.halo, { opacity: pulseOp }]} />

        {/* Logo — full brand mark, name plaque already baked into the asset */}
        <Animated.View style={[s.eagleWrap, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
          <Image source={LOGO} style={s.eagle} resizeMode="contain" />
          <Animated.View
            style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(230,171,44,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: W * 0.65, height: '100%' }}
            />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Bottom dots */}
      <Animated.View style={[s.dots, { opacity: textOp }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, i === 1 && s.dotActive]} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function CornerAccent({ t, b, l, r }: { t?: number; b?: number; l?: number; r?: number }) {
  return (
    <View style={{ position: 'absolute', top: t, bottom: b, left: l, right: r, width: CORNER, height: CORNER }}>
      <View style={{
        position: 'absolute', width: CORNER, height: 2,
        backgroundColor: GOLD65, borderRadius: 1,
        top: t !== undefined ? 0 : undefined, bottom: b !== undefined ? 0 : undefined,
        left: l !== undefined ? 0 : undefined, right: r !== undefined ? 0 : undefined,
      }} />
      <View style={{
        position: 'absolute', width: 2, height: CORNER,
        backgroundColor: GOLD65, borderRadius: 1,
        top: t !== undefined ? 0 : undefined, bottom: b !== undefined ? 0 : undefined,
        left: l !== undefined ? 0 : undefined, right: r !== undefined ? 0 : undefined,
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
  frame: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  border: {
    position: 'absolute',
    top: INSET, left: INSET, right: INSET, bottom: INSET,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD35,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  halo: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(230,171,44,0.04)',
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.18)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 20,
  },

  eagleWrap: {
    width: 260, height: 260 / LOGO_ASPECT,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  eagle: {
    width: 260, height: 260 / LOGO_ASPECT,
  },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    justifyContent: 'center',
  },

  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingBottom: 52,
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
