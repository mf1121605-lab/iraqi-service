/**
 * GoldCard — matches the web's .metal-panel / .cinematic-card:
 *  - Dark background #161b22
 *  - Gold border (rgba(230,171,44,0.20))
 *  - Gold shimmer line at the top (web's ::before pseudo-element)
 *  - Card-dark shadow (black ambient + gold glow)
 *  - Inner subtle gold gradient overlay
 */
import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';

interface Props extends ViewProps {
  children: ReactNode;
  /** Removes default padding — caller handles its own. */
  noPad?: boolean;
  /** Removes top shimmer line (for cards with a coloured top bar). */
  noShimmer?: boolean;
}

export function GoldCard({ children, style, noPad, noShimmer, ...props }: Props) {
  return (
    <View style={[styles.card, style]} {...props}>
      {/* Inner gradient overlay — matches cinematic-card dark gradient */}
      <LinearGradient
        colors={[
          'rgba(245,158,11,0.04)',   // top gold tint
          'rgba(22,27,34,0.95)',     // mid dark
          'rgba(13,17,23,0.98)',     // bottom deepest
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Top shimmer line — matches .cinematic-card::before */}
      {!noShimmer && <View style={styles.shimmerLine} />}

      {/* Content — rendered above the gradient */}
      <View style={[styles.content, !noPad && styles.pad]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    position: 'relative',
    // card-dark shadow
    ...SHADOWS.card,
    // additional gold glow
    shadowColor: '#000',
  },
  shimmerLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(244,217,141,0.70)',  // .dark .cinematic-card::before colour
    zIndex: 2,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  pad: {
    padding: 20,
  },
});
