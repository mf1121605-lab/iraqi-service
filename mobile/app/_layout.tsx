import '../global.css';
import { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { CinematicFrame } from '@/components/ui/CinematicFrame';
import { CinematicSplash } from '@/components/ui/CinematicSplash';
import { FrameInsetProvider } from '@/hooks/useFrameInset';

// Required to dismiss the OAuth browser session when the app is foregrounded
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

// Error boundary to catch any JS crash and show a message instead of blank screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>
            {this.state.error}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useAppUpdates();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Don't block on font errors — fall back to system font
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#e6ab2c" size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <FrameInsetProvider>
            <StatusBar style="light" backgroundColor="#0d1117" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
            <CinematicFrame />
            {showSplash && <CinematicSplash onDone={() => setShowSplash(false)} />}
          </FrameInsetProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
