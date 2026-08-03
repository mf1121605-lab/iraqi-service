import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 62;

// Ordered to match the visible tab row in (customer)/_layout.tsx.
const TAB_ROUTES = [
  '/(customer)/',
  '/(customer)/requests',
  '/(customer)/communities',
  '/(customer)/notifications',
  '/(customer)/profile',
] as const;

const MATCH_SEGMENTS = ['requests', 'communities', 'notifications', 'profile'];

function currentTabIndex(pathname: string): number {
  for (let i = 1; i < MATCH_SEGMENTS.length + 1; i++) {
    if (pathname.includes(`/${MATCH_SEGMENTS[i - 1]}`)) return i;
  }
  return 0;
}

// Invisible overlay sitting on top of the customer tab bar. A plain tap
// passes straight through to the real tab buttons underneath (the
// responder is never claimed at touch-down) — only once the finger has
// been held ~280ms AND then dragged horizontally does this claims the
// gesture and treats it as "swipe to the next/previous tab," per the
// founder's spec (long-press + drag on the bottom bar).
export function TabSwipeZone() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const touchStart = useRef(0);
  const fired = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        touchStart.current = Date.now();
        fired.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: (_evt, g) => {
        const held = Date.now() - touchStart.current > 280;
        return held && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
      },
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      },
      onPanResponderRelease: (_evt, g) => {
        if (fired.current) return;
        const idx = currentTabIndex(pathname);
        if (g.dx < -50 && idx < TAB_ROUTES.length - 1) {
          fired.current = true;
          router.push(TAB_ROUTES[idx + 1] as never);
        } else if (g.dx > 50 && idx > 0) {
          fired.current = true;
          router.push(TAB_ROUTES[idx - 1] as never);
        }
      },
    }),
  ).current;

  return (
    <View
      style={[styles.zone, { height: TAB_BAR_HEIGHT + insets.bottom }]}
      {...pan.panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
