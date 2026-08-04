import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Foreground notifications still show a banner/sound instead of being
// silently swallowed — the default handler suppresses them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device for real push delivery (Expo's push service) and
// upserts the token against the signed-in user, mirroring how the web app
// registers its own Web Push subscription in src/utils/pushNotifications.js.
// Without this, "notifications" only ever worked while the app was open
// and a Realtime subscription was live — nothing reached a closed app.
export function usePushToken(userId: string | undefined | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function register() {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== 'granted') {
          const result = await Notifications.requestPermissionsAsync();
          status = result.status;
        }
        if (status !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const expoPushToken = tokenResponse.data;
        if (cancelled || !expoPushToken) return;

        await supabase.from('push_tokens').upsert(
          { user_id: userId, expo_push_token: expoPushToken, platform: Platform.OS, updated_at: new Date().toISOString() },
          { onConflict: 'expo_push_token' }
        );
      } catch (err) {
        // Simulators/emulators without push capability, or a denied
        // permission, should never break the app — just skip silently.
        console.warn('usePushToken: registration skipped', err);
      }
    }

    register();
    return () => { cancelled = true; };
  }, [userId]);
}
