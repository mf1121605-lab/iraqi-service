import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/theme';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  // Founder AND any employee promoted to co_admin land in the founder panel —
  // same as the web (src/pages/404.js's role/admin_level check).
  if (hasFounderAccess(profile)) {
    return <Redirect href="/(founder)/" />;
  }

  if (profile?.role === 'employee') {
    return <Redirect href="/(employee)/" />;
  }

  return <Redirect href="/(customer)/" />;
}
