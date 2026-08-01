import { useEffect } from 'react';
import * as Updates from 'expo-updates';

// Actively checks for an EAS Update on launch instead of relying on the
// default silent background-download (which only applies on the *next*
// cold start). Fetching + reloading here means a fresh update is live
// after a single relaunch. No-ops in Expo Go / dev client, where
// Updates.isEnabled is false.
export function useAppUpdates() {
  useEffect(() => {
    if (!Updates.isEnabled) return;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (e) {
        console.log('useAppUpdates: check failed', e);
      }
    })();
  }, []);
}
