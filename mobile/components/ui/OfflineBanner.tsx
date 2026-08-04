import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

// App-wide "no connection" strip — rendered once in the root layout so it
// shows over whatever screen the user is on, and disappears the instant
// connectivity returns (paired with the offline outbox, which flushes on
// that same reconnect event).
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const height = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    height.value = withTiming(isOffline ? 34 : 0, { duration: 250 });
  }, [isOffline, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View style={[styles.wrap, { top: insets.top }, style]} pointerEvents="none">
      <Text style={styles.text}>📡 لا يوجد اتصال بالإنترنت</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { fontFamily: 'System', fontWeight: '700', fontSize: 12, color: '#fff' },
});
