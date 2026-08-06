import '../global.css';
import { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { Tajawal_400Regular, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { Almarai_400Regular, Almarai_700Bold } from '@expo-google-fonts/almarai';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { NotoKufiArabic_400Regular, NotoKufiArabic_700Bold } from '@expo-google-fonts/noto-kufi-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { CinematicFrame } from '@/components/ui/CinematicFrame';
import { CinematicSplash } from '@/components/ui/CinematicSplash';
import { FrameInsetProvider } from '@/hooks/useFrameInset';
import { AmbientMusicProvider } from '@/hooks/useAmbientMusic';
import { AmbientMusicIcon } from '@/components/ui/AmbientMusicIcon';
import { SiteBackgroundProvider } from '@/hooks/useSiteBackground';
import * as Sentry from '@sentry/react-native';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { UiOverridesProvider } from '@/hooks/useUiOverrides';
import { DesignModeToggle } from '@/components/ui/DesignModeToggle';
import { ElementEditorSheet } from '@/components/ui/ElementEditorSheet';

// Required to dismiss the OAuth browser session when the app is foregrounded
WebBrowser.maybeCompleteAuthSession();

// No-op until EXPO_PUBLIC_SENTRY_DSN is set (same pattern as VAPID_KEY
// elsewhere in this codebase — a missing secret disables the feature
// instead of crashing). Once the founder creates a free Sentry project
// and gives us the DSN, this starts reporting silent crashes immediately
// with zero other code changes.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  tracesSampleRate: 0.2,
});

// Reverted: forcing native RTL here fought with the manual per-component
// `textAlign: 'right'` styling used throughout the app (built without
// native RTL in mind), producing broken multi-line text — the first
// line right-aligned, every wrapped line after it left-aligned. The
// manual styling alone was correct; forcing system-level RTL on top of
// it was the regression, not a fix.

SplashScreen.preventAutoHideAsync();

// Error boundary to catch any JS crash and show a recoverable screen
// instead of a blank/frozen app. Previously this only printed the raw
// error.message with no way out — a crash anywhere left the user stuck
// with nothing to do but force-quit. Now it offers a retry (re-mounts the
// subtree, which resolves any crash caused by transient/stale state) and
// a "go to home" escape hatch (re-runs app/index.tsx's routing from
// scratch, which resolves crashes tied to a specific broken screen).
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught a crash:', error, info.componentStack);
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }
  handleRetry = () => this.setState({ error: null });
  handleGoHome = () => {
    this.setState({ error: null });
    router.replace('/');
  };
  render() {
    if (this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>حدث خطأ غير متوقع</Text>
          <Text style={errorStyles.message}>{this.state.error}</Text>
          <View style={errorStyles.actions}>
            <Pressable style={errorStyles.retryBtn} onPress={this.handleRetry}>
              <Text style={errorStyles.retryText}>إعادة المحاولة</Text>
            </Pressable>
            <Pressable style={errorStyles.homeBtn} onPress={this.handleGoHome}>
              <Text style={errorStyles.homeText}>العودة للرئيسية</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  message: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  retryBtn: { backgroundColor: '#e6ab2c', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#0d1117', fontWeight: '700', fontSize: 14 },
  homeBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  homeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
    Tajawal_400Regular,
    Tajawal_700Bold,
    Almarai_400Regular,
    Almarai_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_700Bold,
    NotoKufiArabic_400Regular,
    NotoKufiArabic_700Bold,
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
          <UiOverridesProvider>
            <FrameInsetProvider>
              <SiteBackgroundProvider>
                <AmbientMusicProvider>
                  <StatusBar style="light" backgroundColor="#0d1117" />
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
                  <CinematicFrame />
                  <AmbientMusicIcon />
                  <OfflineBanner />
                  <DesignModeToggle />
                  <ElementEditorSheet />
                  {showSplash && <CinematicSplash onDone={() => setShowSplash(false)} />}
                </AmbientMusicProvider>
              </SiteBackgroundProvider>
            </FrameInsetProvider>
          </UiOverridesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
