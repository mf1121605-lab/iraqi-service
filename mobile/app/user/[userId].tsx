import { useLocalSearchParams } from 'expo-router';
import { PublicProfileView } from '@/components/profile/PublicProfileView';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PublicProfileView userId={userId} />;
}
