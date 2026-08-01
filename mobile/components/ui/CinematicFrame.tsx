/**
 * CinematicFrame — the gold border overlay present on every page of the web.
 *
 * Web CSS (globals.css):
 *   .cinematic-frame: position fixed; inset: 10px; border: 1px solid gold65%;
 *     box-shadow: 0 0 0 1px black, inset 0 0 0 5px #0d1117,
 *                 inset 0 0 0 6px gold25%, inset glow...
 *
 *   Corner accents: 34×34px with a gold 2px thick-line on each edge.
 *
 * We render this as an absolute overlay (pointer-events none) over all content,
 * matching the web's inset-10px / 4 corner accents design.
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';

const BASE_INSET = 10; // fixed margin from the true screen edge
const CORNER = 28;  // px — corner accent size
const LINE   = 2;   // border line thickness
const GOLD   = COLORS.gold;
const GOLD65 = 'rgba(230,171,44,0.65)';

// A single fixed inset on every side (never animated, never recalculated
// per-frame) — the frame is exactly BASE_INSET from the true screen edge on
// left/right/bottom. The top edge additionally clears the *entire* status
// bar/notch via the full safe-area inset (not a fraction of it) plus the
// same base margin, so it never sits close enough to overlap a screen's own
// header content. Computed once per device and never animated.
export function CinematicFrame() {
  const insets = useSafeAreaInsets();
  const topInset = insets.top + BASE_INSET;

  return (
    <View style={styles.frame} pointerEvents="none">
      {/* Main border rectangle */}
      <View style={[styles.border, { top: topInset, left: BASE_INSET, right: BASE_INSET, bottom: BASE_INSET }]} />

      {/* ── Corner accents ─────────────────────────────────────────────── */}
      <CornerAccent pos="tl" inset={BASE_INSET} topInset={topInset} />
      <CornerAccent pos="tr" inset={BASE_INSET} topInset={topInset} />
      <CornerAccent pos="bl" inset={BASE_INSET} topInset={topInset} />
      <CornerAccent pos="br" inset={BASE_INSET} topInset={topInset} />
    </View>
  );
}

function CornerAccent({
  pos,
  inset,
  topInset,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  inset: number;
  topInset: number;
}) {
  const isTop    = pos === 'tl' || pos === 'tr';
  const isLeft   = pos === 'tl' || pos === 'bl';
  const posStyle = {
    top:    isTop    ? topInset - 1 : undefined,
    bottom: !isTop   ? inset - 1 : undefined,
    left:   isLeft   ? inset - 1 : undefined,
    right:  !isLeft  ? inset - 1 : undefined,
  };
  return (
    <View style={[styles.corner, posStyle]}>
      {/* Horizontal bar */}
      <View
        style={[
          styles.cornerLine,
          {
            width: CORNER,
            height: LINE,
            top: isTop ? 0 : undefined,
            bottom: !isTop ? 0 : undefined,
            left: isLeft ? 0 : undefined,
            right: !isLeft ? 0 : undefined,
          },
        ]}
      />
      {/* Vertical bar */}
      <View
        style={[
          styles.cornerLine,
          {
            width: LINE,
            height: CORNER,
            top: isTop ? 0 : undefined,
            bottom: !isTop ? 0 : undefined,
            left: isLeft ? 0 : undefined,
            right: !isLeft ? 0 : undefined,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  border: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GOLD65,
    // Simulate box-shadow inner glow via the shadow props (iOS) / elevation (Android)
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerLine: {
    position: 'absolute',
    backgroundColor: GOLD65,
    borderRadius: 1,
  },
});
