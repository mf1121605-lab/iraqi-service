import { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';

const MUTE_KEY = 'ambient_music_muted';

// Founder-controlled site ambient music (founder_settings.site_ambient_
// audio_url) — starts automatically the first time the app opens, keeps
// playing across every screen (the Audio.Sound instance lives here, in a
// provider mounted once at the root, so navigating never recreates or
// interrupts it), and the customer can only turn it off by tapping the
// floating note icon — no other control surfaced to them.
const AmbientMusicContext = createContext<{ isMuted: boolean; toggle: () => void; hasTrack: boolean }>({
  isMuted: true,
  toggle: () => {},
  hasTrack: false,
});

export function AmbientMusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const [hasTrack, setHasTrack] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function start(url: string) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
        const stored = await AsyncStorage.getItem(MUTE_KEY);
        const muted = stored === '1';
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { isLooping: true, volume: 0.35, shouldPlay: !muted },
        );
        if (!active) { sound.unloadAsync(); return; }
        soundRef.current = sound;
        setIsMuted(muted);
        setHasTrack(true);
      } catch {
        // Bad/unreachable URL — fail silently, icon simply won't appear.
      }
    }

    supabase.from('founder_settings').select('site_ambient_audio_url').eq('id', 1).single().then(({ data }) => {
      const url = data?.site_ambient_audio_url;
      if (active && url && url !== urlRef.current) {
        urlRef.current = url;
        start(url);
      }
    });

    return () => {
      active = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function toggle() {
    const sound = soundRef.current;
    if (!sound) return;
    const next = !isMuted;
    setIsMuted(next);
    AsyncStorage.setItem(MUTE_KEY, next ? '1' : '0').catch(() => {});
    if (next) await sound.pauseAsync();
    else await sound.playAsync();
  }

  return (
    <AmbientMusicContext.Provider value={{ isMuted, toggle, hasTrack }}>
      {children}
    </AmbientMusicContext.Provider>
  );
}

export const useAmbientMusic = () => useContext(AmbientMusicContext);
