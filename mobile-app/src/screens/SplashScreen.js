import React, { useEffect } from 'react';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { getCurrentSession, getMyProfile, resolveDashboardRoute } from '../services/auth';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let isMounted = true;

    async function routeFromSession() {
      const session = await getCurrentSession();

      if (!session) {
        if (isMounted) navigation.replace('Home');
        return;
      }

      const profile = await getMyProfile();
      if (isMounted) navigation.replace(resolveDashboardRoute(profile));
    }

    const timer = setTimeout(routeFromSession, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <View style={styles.logoBox}>
          <Image
            source={{ uri: 'https://iraqi-service.vercel.app/brand/logo-icon-512.png' }}
            style={styles.logo}
          />
        </View>
        <Text style={styles.title}>منصة الخدمات العراقية</Text>
        <Text style={styles.subtitle}>تطبيق موبايل متصل بنفس المنصة</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  logoBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  logo: { width: 88, height: 88, resizeMode: 'contain' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: theme.colors.muted, marginTop: 8, textAlign: 'center' },
});
