import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { COLORS } from '@/constants/theme';

const BAR_COUNT = 3;
const HIDE_DELAY_MS = 5000;
const FADE_MS = 600;
const BTN_SIZE = 42;
const EDGE_MARGIN = 14;
// Finger travel (px) before a touch is reclassified from "tap" to "drag".
const DRAG_SLOP = 6;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// Floating glowing note button — only visible once the founder has set a
// track. Tapping it is the customer's only control over ambient music (no
// volume/skip — matches the founder's spec exactly).
//
// It floats above every screen (mounted once in the root layout) and can be
// dragged anywhere with a finger. Drag uses PanResponder rather than
// react-native-gesture-handler's Gesture API on purpose: this app has no
// GestureHandlerRootView mounted at the root, and adding one just for this
// widget would put every existing touch surface at risk. PanResponder needs
// no provider at all.
//
// Tap vs drag is resolved by claiming the responder only once the finger has
// actually moved DRAG_SLOP px — a clean tap is never intercepted and still
// reaches the inner Pressable.
//
// Muting is treated as "I'm done with this button": it stays visible 5s
// longer (so the mute is visually confirmed), then fades out and is gone
// for the rest of this app session — it only comes back on a fresh app
// launch, not just by navigating around or un-muting again.
export function AmbientMusicIcon() {
  const { isMuted, toggle, hasTrack } = useAmbientMusic();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const glow = useSharedValue(0.4);
  const pulse = useSharedValue(0);
  const opacity = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dragging = useSharedValue(0);

  const [hidden, setHidden] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drag origin, captured on grant so movement is relative to where the
  // button already sat rather than accumulating rounding drift.
  const originX = useRef(0);
  const originY = useRef(0);

  // Resting position is top-right; translation is measured from there, so the
  // button may travel left and down across the whole safe area.
  const bounds = useMemo(() => {
    const restTop = insets.top + 12;
    return {
      minX: -(screenW - EDGE_MARGIN - BTN_SIZE),
      maxX: 0,
      minY: 0,
      maxY: Math.max(0, screenH - restTop - BTN_SIZE - insets.bottom - 12),
    };
  }, [screenW, screenH, insets.top, insets.bottom]);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
    // Bubble breathing — a slow scale swell, distinct from the glow pulse.
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow, pulse]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  // Re-clamp if the button was parked somewhere that a rotation or keyboard
  // resize has since put off-screen.
  useEffect(() => {
    tx.value = withSpring(clamp(tx.value, bounds.minX, bounds.maxX), { damping: 18 });
    ty.value = withSpring(clamp(ty.value, bounds.minY, bounds.maxY), { damping: 18 });
  }, [bounds, tx, ty]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Never claim on touch-down — that would swallow taps before the
        // inner Pressable ever sees them.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP,
        onPanResponderGrant: () => {
          originX.current = tx.value;
          originY.current = ty.value;
          dragging.value = withTiming(1, { duration: 120 });
        },
        onPanResponderMove: (_e, g) => {
          tx.value = clamp(originX.current + g.dx, bounds.minX, bounds.maxX);
          ty.value = clamp(originY.current + g.dy, bounds.minY, bounds.maxY);
        },
        onPanResponderRelease: () => { dragging.value = withTiming(0, { duration: 180 }); },
        onPanResponderTerminate: () => { dragging.value = withTiming(0, { duration: 180 }); },
      }),
    [bounds, tx, ty, dragging],
  );

  function handlePress() {
    const willMute = !isMuted;
    toggle();
    if (willMute) {
      hideTimer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: FADE_MS }, (finished) => {
          if (finished) runOnJS(setHidden)(true);
        });
      }, HIDE_DELAY_MS);
    } else if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  const wrapStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value * 0.8,
    elevation: 6 + glow.value * 8,
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      // Breathing bubble, plus a lift while the finger is holding it.
      { scale: (1 + pulse.value * 0.09) * (1 + dragging.value * 0.12) },
    ],
  }));

  if (!hasTrack || hidden) return null;

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + 12 }, wrapStyle]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={handlePress} style={styles.btn} hitSlop={10}>
        {isMuted ? (
          <Text style={styles.note}>🔇</Text>
        ) : (
          <View style={styles.bars}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <EqBar key={i} index={i} />
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function EqBar({ index }: { index: number }) {
  const h = useSharedValue(3);

  useEffect(() => {
    h.value = withRepeat(
      withTiming(3 + ((index * 37) % 7), { duration: 260 + index * 90, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [h, index]);

  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: EDGE_MARGIN,
    zIndex: 120,
    borderRadius: BTN_SIZE / 2,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: 'rgba(230,171,44,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: 18 },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gold,
  },
});
