import { useRef, useCallback } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';
const PROJECT_REF = 'kxtsoyessegtarusiiov';

export default function WebScreen() {
  const { session, profile } = useAuth();
  const webviewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  // Android hardware back button: navigate within WebView instead of exiting
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (canGoBackRef.current && webviewRef.current) {
          webviewRef.current.goBack();
          return true;
        }
        return false;
      };
      BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
    }, [])
  );

  const startUrl = session
    ? profile?.role === 'employee' || profile?.role === 'founder'
      ? `${APP_URL}/employee/dashboard`
      : `${APP_URL}/customer/dashboard`
    : APP_URL;

  // Inject Supabase session into localStorage before page scripts run
  // so the website recognises the user as logged in immediately
  let injectedJS = 'true;';
  if (session) {
    const sessionData = JSON.stringify({
      access_token: session.access_token,
      token_type: 'bearer',
      expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      refresh_token: session.refresh_token,
      user: session.user,
    });
    injectedJS = `
      (function() {
        try {
          localStorage.setItem('sb-${PROJECT_REF}-auth-token', ${JSON.stringify(sessionData)});
        } catch(e) {}
        true;
      })();
    `;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webviewRef}
        source={{ uri: startUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        cacheEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onNavigationStateChange={(nav) => {
          canGoBackRef.current = nav.canGoBack;
        }}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.gold} size="large" />
          </View>
        )}
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  webview: { flex: 1, backgroundColor: '#0d1117' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
