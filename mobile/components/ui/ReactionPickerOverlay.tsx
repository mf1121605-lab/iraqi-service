import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '@/constants/theme';

export interface ReactionOption {
  /** Value handed back to onSelectReaction. For typed reactions this is the
   *  DB enum ('like'); for chat, where reactions are stored as raw emoji, pass
   *  the emoji itself. */
  key: string;
  emoji: string;
  label: string;
  /** 'danger' renders the slot on a red pill — used for destructive actions
   *  such as delete, so they never read as just another reaction. */
  tone?: 'default' | 'danger';
}

interface Props {
  children: ReactNode;
  reactions: ReactionOption[];
  onSelectReaction: (key: string) => void;
  /** Which edge of the wrapped item the bar hangs from. */
  align?: 'start' | 'end' | 'center';
  /** Set false to leave the child untouched (e.g. someone else's message). */
  enabled?: boolean;
  style?: ViewStyle;
}

const ITEM_W_MAX = 52;    // preferred touch slot per emoji
const EMOJI_SIZE = 30;
const ROW_PAD_H = 8;
const ROW_H = 56;
const EDGE_MARGIN = 10;   // keep the bar off the screen edges
const LONG_PRESS_MS = 280;
// Dragging this far below the bar reads as "I changed my mind" — same escape
// hatch Facebook gives you.
const CANCEL_DY = 95;

/**
 * ReactionPickerOverlay — long-press a thing, then scrub across the emoji bar
 * without lifting your finger, release to pick.
 *
 * The whole interaction is ONE gesture: Pan().activateAfterLongPress(). That is
 * what makes press → drag → release continuous. Composing a separate LongPress
 * and Pan would make the user lift and re-touch between the two.
 *
 * Everything that runs per-frame — which emoji is under the finger, every
 * emoji's scale — lives on the UI thread. The JS thread is touched only when
 * the active index actually changes (at most a handful of times per gesture),
 * for the haptic tick and the label text.
 *
 * Requires GestureHandlerRootView at the app root; without it these gestures
 * silently never activate on Android.
 */
export function ReactionPickerOverlay({
  children,
  reactions,
  onSelectReaction,
  align = 'start',
  enabled = true,
  style,
}: Props) {
  // Slots shrink rather than overflow, so a bar with an extra action (chat
  // adds a reply slot, making seven) still fits a narrow phone.
  const { itemW, rowW } = useMemo(() => {
    const avail = Dimensions.get('window').width - EDGE_MARGIN * 2 - ROW_PAD_H * 2;
    const w = Math.min(ITEM_W_MAX, avail / reactions.length);
    return { itemW: w, rowW: w * reactions.length + ROW_PAD_H * 2 };
  }, [reactions.length]);

  const wrapRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  // Absolute screen position for the bar — it renders inside a Modal now (see
  // below), not nested inside the wrapped item, so these are real screen
  // coordinates rather than an offset relative to the wrapper.
  const [rowLeft, setRowLeft] = useState(0);
  const [rowTop, setRowTop] = useState(0);

  const progress = useSharedValue(0);      // 0 hidden, 1 shown
  const activeIndex = useSharedValue(-1);
  const rowPageX = useSharedValue(0);      // absolute X of the bar's left edge

  // Measured on layout rather than guessed: the gesture converts an absolute
  // touch X into an emoji index, so it needs the bar's real page position.
  const handleLayout = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, w) => {
      const screenW = Dimensions.get('window').width;
      const raw =
        align === 'start' ? 0 :
        align === 'end'   ? w - rowW :
                            (w - rowW) / 2;
      const clampedAbs = Math.max(
        EDGE_MARGIN,
        Math.min(screenW - rowW - EDGE_MARGIN, x + raw),
      );
      setRowLeft(clampedAbs);
      setRowTop(y - ROW_H - 8);
      rowPageX.value = clampedAbs;
    });
  }, [align, rowW, rowPageX]);

  const tick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const showLabel = useCallback((i: number) => {
    setActiveLabel(reactions[i]?.label ?? null);
  }, [reactions]);

  const commit = useCallback((i: number) => {
    setOpen(false);
    setActiveLabel(null);
    if (i >= 0 && reactions[i]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      onSelectReaction(reactions[i].key);
    }
  }, [reactions, onSelectReaction]);

  const indexAt = useCallback((absX: number) => {
    'worklet';
    const rel = absX - rowPageX.value - ROW_PAD_H;
    const i = Math.floor(rel / itemW);
    return Math.max(0, Math.min(reactions.length - 1, i));
  }, [reactions.length, rowPageX, itemW]);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(LONG_PRESS_MS)
    // Let the surrounding list keep scrolling until this actually activates.
    .shouldCancelWhenOutside(false)
    .onStart((e) => {
      const i = indexAt(e.absoluteX);
      activeIndex.value = i;
      progress.value = withSpring(1, { damping: 15, stiffness: 190 });
      runOnJS(setOpen)(true);
      runOnJS(showLabel)(i);
      runOnJS(tick)();
    })
    .onUpdate((e) => {
      // Pulled away downward — drop the highlight so releasing cancels.
      if (e.translationY > CANCEL_DY) {
        if (activeIndex.value !== -1) {
          activeIndex.value = -1;
          runOnJS(setActiveLabel)(null);
        }
        return;
      }
      const i = indexAt(e.absoluteX);
      if (i !== activeIndex.value) {
        activeIndex.value = i;
        runOnJS(showLabel)(i);
        runOnJS(tick)();
      }
    })
    .onEnd(() => {
      const chosen = activeIndex.value;
      progress.value = withTiming(0, { duration: 140 });
      activeIndex.value = -1;
      runOnJS(commit)(chosen);
    })
    .onFinalize(() => {
      // Covers interruption (a call, a parent scroll stealing the gesture)
      // so the bar can never be left stuck on screen.
      if (progress.value !== 0) progress.value = withTiming(0, { duration: 140 });
    });

  const barStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.82, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [10, 0], Extrapolation.CLAMP) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: activeIndex.value < 0 ? 0 : progress.value,
    transform: [
      { translateX: ROW_PAD_H + activeIndex.value * itemW + itemW / 2 },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View ref={wrapRef} onLayout={handleLayout} style={style} collapsable={false}>
        {children}

        {/* Rendered through a Modal rather than as a nested absolute child —
            any ancestor along the way (a post card, a chat bubble, a comment
            box) is very likely to have overflow:'hidden' for its rounded
            corners, which would silently clip this bar since it pops up past
            the wrapped item's own edge. A Modal paints in its own native
            layer above everything, so no ancestor's overflow can touch it. */}
        {open && (
          <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Animated.View
                style={[styles.bar, { left: rowLeft, top: rowTop, width: rowW }, barStyle]}
                pointerEvents="none"
              >
                {/* Label sits above the bar and tracks the active emoji. Its own
                    wrapper is zero-width and centred on the slot, so the bubble
                    can grow in both directions without shifting the anchor. */}
                <Animated.View style={[styles.labelAnchor, labelStyle]} pointerEvents="none">
                  <View style={styles.labelBubble}>
                    <Text style={styles.labelText} numberOfLines={1}>{activeLabel ?? ''}</Text>
                  </View>
                </Animated.View>

                <View style={styles.row}>
                  {reactions.map((r, i) => (
                    <ReactionItem
                      key={r.key}
                      index={i}
                      activeIndex={activeIndex}
                      emoji={r.emoji}
                      width={itemW}
                      danger={r.tone === 'danger'}
                    />
                  ))}
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}
      </View>
    </GestureDetector>
  );
}

function ReactionItem({
  index,
  activeIndex,
  emoji,
  width,
  danger,
}: {
  index: number;
  activeIndex: Animated.SharedValue<number>;
  emoji: string;
  width: number;
  danger?: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Distance from the finger drives both scale and lift, so neighbours ease
    // down instead of snapping.
    const d = activeIndex.value < 0 ? 99 : Math.abs(index - activeIndex.value);
    const scale = interpolate(d, [0, 1, 2], [1.75, 1.12, 0.92], Extrapolation.CLAMP);
    const lift = interpolate(d, [0, 1, 2], [-18, -5, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { translateY: withSpring(lift, { damping: 14, stiffness: 220 }) },
        { scale: withSpring(scale, { damping: 14, stiffness: 220 }) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.slot, { width }, style]}>
      <View style={danger ? styles.dangerPill : undefined}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    height: ROW_H,
  },
  // row-reverse because the app runs under the device's real, active RTL
  // mirroring (confirmed on a real device) — a plain 'row' here auto-mirrors
  // so array index 0 lands on the right, while indexAt()/labelStyle below
  // both compute physical left-to-right positions. row-reverse cancels the
  // mirror back to physical ordering, keeping the finger position, the
  // rendered emoji, and the label bubble all in agreement — this was the
  // "dragging right moves the highlight left" bug.
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: ROW_H,
    paddingHorizontal: ROW_PAD_H,
    borderRadius: ROW_H / 2,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  slot: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: EMOJI_SIZE },

  labelAnchor: { position: 'absolute', bottom: ROW_H + 6, left: 0, width: 0, alignItems: 'center' },
  dangerPill: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.55)',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  labelBubble: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 11,
  },
  labelText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ffffff' },
});
