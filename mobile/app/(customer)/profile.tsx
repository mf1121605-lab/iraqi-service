import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/theme';
import { PublicProfileView } from '@/components/profile/PublicProfileView';

// "حسابي" tab — the customer's own public page (follower count, avatar with
// an edit overlay, bio, posts), with a button into the real account-settings
// screen. Rendered in-place (not a redirect) so the bottom tab bar keeps this
// tab highlighted while it's showing.
export default function ProfileTab() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return <PublicProfileView userId={profile.id} />;
}
