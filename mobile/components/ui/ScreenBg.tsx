/**
 * ScreenBg — wraps every screen with the exact same dark background used on
 * the web: #0d1117 base + three subtle gold radial tints matching globals.css:
 *
 *   radial-gradient(ellipse 80% 60% at 50% -5%,  gold 7% → transparent)  ← top-center
 *   radial-gradient(ellipse 60% 80% at 85% 60%,  gold 4% → transparent)  ← right-middle
 *   radial-gradient(ellipse 70% 50% at 15% 80%,  gold 3% → transparent)  ← bottom-left
 *
 * React Native can't do radial gradients natively, so we layer rounded View
 * elements with low opacity — same visual effect at a glance.
 */
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';

interface Props {
  children: ReactNode;
  /** Pass true when the screen manages its own top padding (e.g. has a custom header). */
  noTopPad?: boolean;
}

export function ScreenBg({ children, noTopPad }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.bg}>
      {/* ── Radial gold tints ─────────────────────────────────────────────── */}
      {/* Top-centre aurora: largest, most visible */}
      <View style={styles.auraTop} pointerEvents="none" />
      {/* Right-middle accent */}
      <View style={styles.auraRight} pointerEvents="none" />
      {/* Bottom-left accent */}
      <View style={styles.auraBottomLeft} pointerEvents="none" />

      {/* Content */}
      <View style={[styles.content, !noTopPad && { paddingTop: insets.top }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  // Top-centre glow — mirrors radial at 50% -5% (peeks from above the fold)
  auraTop: {
    position: 'absolute',
    top: -180,
    left: -60,
    right: -60,
    height: 420,
    borderRadius: 300,
    backgroundColor: 'rgba(245,158,11,0.065)',
    transform: [{ scaleX: 1.4 }],
  },
  // Right-middle — mirrors radial at 85% 60%
  auraRight: {
    position: 'absolute',
    top: '30%',
    right: -120,
    width: 280,
    height: 380,
    borderRadius: 240,
    backgroundColor: 'rgba(245,158,11,0.038)',
  },
  // Bottom-left — mirrors radial at 15% 80%
  auraBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 260,
    height: 300,
    borderRadius: 200,
    backgroundColor: 'rgba(245,158,11,0.028)',
  },
});
