import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { getCurrentSession, getMyProfile, resolveDashboardRoute } from '../services/auth';
import LoadingScreen from '../components/LoadingScreen';

export default function SplashScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function routeFromSession() {
      try {
        const session = await getCurrentSession();

        if (!session) {
          if (isMounted) navigation.replace('Home');
          return;
        }

        const profile = await getMyProfile();
        if (isMounted) navigation.replace(resolveDashboardRoute(profile));
      } catch (error) {
        console.warn('Failed to resolve session route', error);
        if (isMounted) navigation.replace('Home');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(routeFromSession, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);

  if (loading) {
    return <LoadingScreen message="جارٍ التحقق من الحساب..." />;
  }

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
