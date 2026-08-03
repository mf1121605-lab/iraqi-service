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

  // Forces full-name + avatar entry before a customer ever reaches the
  // dashboard — applies to every signup path (Google OAuth included),
  // since profile is loaded the same way regardless of how the session
  // was created. Nothing previously routed a fresh signup here; the
  // onboarding screen existed but was unreachable.
  if (profile && !profile.onboarding_complete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(customer)/" />;
}
