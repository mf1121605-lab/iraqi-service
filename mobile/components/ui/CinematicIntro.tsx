import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, LayoutChangeEvent, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Blur, Canvas, Circle } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';

// Geometry of assets/splash.png, and the fraction of its width the logo
// occupies inside it. These MUST stay in sync with the image — they are what
// let this screen reproduce the native splash's logo size exactly.
const SPLASH_W = 1242;
const SPLASH_H = 2436;
const LOGO_FRACTION = 0.34;
const LOGO_ASPECT = 900 / 823;

// Identical to expo.splash.backgroundColor and ScreenBg's base. Any other
// shade here is a visible colour flash on handoff — the previous intro used
// #060a0f and that was exactly the reported flicker.
const BG = '#0d1117';

// Totals 2.10s (260 + 950 + 500 + 390) — inside the 2.0-2.2s brief, short
// enough not to tax a daily user, long enough for the growth to read.
const HOLD_MS = 260;    // static hold so the native splash can hide unseen
const GROW_MS = 950;
const SETTLE_MS = 500;
const FADE_MS = 390;
const ANIM_DONE_MS = HOLD_MS + GROW_MS + SETTLE_MS;   // 1710
// Hard ceiling: if auth never settles (dead network), don't trap the user on
// the intro forever.
const AUTH_WAIT_CEILING_MS = 4000;

interface Props { onDone: () => void; }

/**
 * CinematicIntro — the brand entrance, shown once per app launch to every user.
 *
 * The whole design goal is that the handoff from the native splash is
 * *invisible*. That means starting from a frame that is pixel-identical to it:
 *
 *  - same background colour (#0d1117),
 *  - same logo asset (full-logo-transparent.png),
 *  - same logo size, computed by reproducing what resizeMode:"contain" does to
 *    splash.png — scale the whole 1242x2436 image to fit the screen, then take
 *    LOGO_FRACTION of its width. Guessing a dp value here is what produced the
 *    old size-jump.
 *
 * Only after that first frame is on screen (onLayout) is the native splash
 * hidden, and only then does anything animate.
 *
 * It also owns the eagle cry outright. The login screen used to play the same
 * sound on mount, so a launch that ended on login fired it twice.
 */
export function CinematicIntro({ onDone }: Props) {
  const { loading } = useAuth();

  const scale = useSharedValue(1);
  const halo = useSharedValue(0);
  const shimmerX = useSharedValue(0);
  const fade = useSharedValue(1);

  const [animDone, setAnimDone] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const splashHidden = useRef(false);
  const exiting = useRef(false);

  // The native splash covers the entire device screen, so its contain-scale is
  // computed against 'screen', not the (possibly smaller) app window.
  const logo = useMemo(() => {
    const { width, height } = Dimensions.get('screen');
    const contain = Math.min(width / SPLASH_W, height / SPLASH_H);
    const w = LOGO_FRACTION * SPLASH_W * contain;
    return { width: w, height: w / LOGO_ASPECT };
  }, []);

  // ── Sound: exactly once, for the life of this component ──────────────
  useEffect(() => {
    let sound: Audio.Sound | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          require('@/assets/sounds/eagle-cry.m4a'),
          { shouldPlay: true, volume: 0.8 },
        );
        if (cancelled) { s.unloadAsync(); return; }
        sound = s;
      } catch {
        // Device audio session busy — visuals still play.
      }
    })();
    return () => { cancelled = true; sound?.unloadAsync(); };
  }, []);

  // ── Animation timeline ───────────────────────────────────────────────
  useEffect(() => {
    scale.value = withDelay(
      HOLD_MS,
      withSequence(
        withTiming(1.28, { duration: GROW_MS, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: SETTLE_MS, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    halo.value = withDelay(
      HOLD_MS,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) }),
        withRepeat(withTiming(0.45, { duration: 620, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );

    // Gold sweep across the mark, timed to land at the peak of the growth.
    shimmerX.value = withDelay(
      HOLD_MS + 380,
      withTiming(1, { duration: 880, easing: Easing.inOut(Easing.quad) }),
    );

    const t = setTimeout(() => setAnimDone(true), ANIM_DONE_MS);
    const ceiling = setTimeout(() => setAuthTimedOut(true), AUTH_WAIT_CEILING_MS);
    return () => { clearTimeout(t); clearTimeout(ceiling); };
    // Shared values are stable refs; this timeline runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exit: only once the animation finished AND auth resolved, so the
  //    screen revealed underneath is already the final destination and never
  //    a spinner or a wrong-role screen that swaps a beat later. ──────────
  useEffect(() => {
    if (exiting.current) return;
    if (!animDone) return;
    if (loading && !authTimedOut) return;

    exiting.current = true;
    fade.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [animDone, loading, authTimedOut, fade, onDone]);

  // Hiding the native splash from onLayout — not from a timer or an effect —
  // guarantees this screen's first frame is already painted underneath it.
  function handleLayout(_e: LayoutChangeEvent) {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value * 0.9, transform: [{ scale: scale.value }] }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -logo.width + shimmerX.value * (logo.width * 2.2) }],
  }));

  const haloSize = logo.width * 1.9;

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={handleLayout} pointerEvents="none">
      {/* Gold halo, drawn with Skia so the blur is real on Android too —
          shadowRadius is silently ignored there. */}
      <Animated.View style={[styles.haloWrap, { width: haloSize, height: haloSize }, haloStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={haloSize / 2} cy={haloSize / 2} r={haloSize * 0.30} color="rgba(230,171,44,0.30)">
            <Blur blur={haloSize * 0.09} />
          </Circle>
        </Canvas>
      </Animated.View>

      <Animated.View style={[{ width: logo.width, height: logo.height }, styles.logoWrap, logoStyle]}>
        <Image
          source={require('@/assets/full-logo-transparent.png')}
          style={{ width: logo.width, height: logo.height }}
          resizeMode="contain"
        />
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(255,235,180,0.45)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: logo.width * 0.55, height: '100%' }}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  haloWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
});
