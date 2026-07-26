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
import { Dimensions, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/theme';

const INSET  = 10;
const CORNER = 28;  // px — corner accent size
const LINE   = 2;   // border line thickness
const GOLD   = COLORS.gold;
const GOLD65 = 'rgba(230,171,44,0.65)';
const GOLD25 = 'rgba(230,171,44,0.25)';

export function CinematicFrame() {
  return (
    <View style={styles.frame} pointerEvents="none">
      {/* Main border rectangle */}
      <View style={styles.border} />

      {/* ── Corner accents ─────────────────────────────────────────────── */}
      <CornerAccent pos="tl" />
      <CornerAccent pos="tr" />
      <CornerAccent pos="bl" />
      <CornerAccent pos="br" />
    </View>
  );
}

function CornerAccent({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop    = pos === 'tl' || pos === 'tr';
  const isLeft   = pos === 'tl' || pos === 'bl';
  const posStyle = {
    top:    isTop    ? INSET - 1 : undefined,
    bottom: !isTop   ? INSET - 1 : undefined,
    left:   isLeft   ? INSET - 1 : undefined,
    right:  !isLeft  ? INSET - 1 : undefined,
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

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    inset: 0,
    zIndex: 100,
  },
  border: {
    position: 'absolute',
    top:    INSET,
    left:   INSET,
    right:  INSET,
    bottom: INSET,
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
