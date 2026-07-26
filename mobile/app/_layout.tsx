import '../global.css';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { AuthProvider } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Force RTL for Arabic/Kurdish
I18nManager.forceRTL(true);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0d1117" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d1117' } }} />
    </AuthProvider>
  );
}
