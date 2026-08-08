import { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { supabase } from '@/lib/supabase';

const MUTE_KEY = 'ambient_music_muted';
const BASE_VOLUME = 0.35;
const DUCK_VOLUME = 0.06;
const MUTE_FADE_MS = 3000;
const DUCK_FADE_MS = 250;
const UNMUTE_FADE_MS = 400;

// Founder-controlled site ambient music (founder_settings.site_ambient_
// audio_url) — starts automatically the first time the app opens, keeps
// playing across every screen (the Audio.Sound instance lives here, in a
// provider mounted once at the root, so navigating never recreates or
// interrupts it), and the customer can only turn it off by tapping the
// floating note icon — no other control surfaced to them.
const AmbientMusicContext = createContext<{
  isMuted: boolean;
  toggle: () => void;
  hasTrack: boolean;
  /** Seconds left in the fade-to-mute countdown, or null when not fading. */
  muteCountdown: number | null;
  /** Lower the ambient track's volume for as long as some other audio (a
   *  voice note, a video) is playing. Ref-counted — safe to call from
   *  multiple concurrent players; the track only returns to full volume
   *  once every duck() has a matching unduck(). */
  duck: () => void;
  unduck: () => void;
}>({
  isMuted: true,
  toggle: () => {},
  hasTrack: false,
  muteCountdown: null,
  duck: () => {},
  unduck: () => {},
});

// Linear volume ramp over `durationMs`, reporting milliseconds remaining on
// each tick — used both for the 3s fade-to-mute countdown and the shorter
// ducking/unducking ramps, so there is exactly one place that touches
// setVolumeAsync on a schedule.
function rampVolume(
  sound: Audio.Sound,
  from: number,
  to: number,
  durationMs: number,
  onTick?: (msLeft: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const steps = Math.max(1, Math.round(durationMs / 100));
    let i = 0;
    const id = setInterval(async () => {
      i += 1;
      const t = i / steps;
      const v = from + (to - from) * t;
      await sound.setVolumeAsync(Math.max(0, Math.min(1, v))).catch(() => {});
      onTick?.(Math.max(0, Math.round(durationMs * (1 - t))));
      if (i >= steps) {
        clearInterval(id);
        resolve();
      }
    }, durationMs / steps);
  });
}

export function AmbientMusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const [hasTrack, setHasTrack] = useState(false);
  const [muteCountdown, setMuteCountdown] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const urlRef = useRef<string | null>(null);
  const fadingToMuteRef = useRef(false);
  const duckCountRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function start(url: string) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          // Duck (rather than fully stop) this app's audio when something
          // outside the app — a phone call, another app — needs the
          // speaker; the in-app ducking below (duck/unduck) is a separate,
          // manual mechanism for videos/voice notes competing with this
          // same track.
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });
        const stored = await AsyncStorage.getItem(MUTE_KEY);
        const muted = stored === '1';
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { isLooping: true, volume: BASE_VOLUME, shouldPlay: !muted },
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
    if (!sound || fadingToMuteRef.current) return;

    if (isMuted) {
      // Unmute: resume immediately (silently), then ease the volume back up
      // rather than jumping straight to full — matches the smooth feel of
      // the mute fade instead of a jarring pop back in.
      setIsMuted(false);
      AsyncStorage.setItem(MUTE_KEY, '0').catch(() => {});
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      await rampVolume(sound, 0, duckCountRef.current > 0 ? DUCK_VOLUME : BASE_VOLUME, UNMUTE_FADE_MS);
      return;
    }

    // Mute: a 3s countdown (surfaced by the floating icon as "سيتم التلاشي
    // خلال...") with the volume fading out in lockstep, only pausing
    // playback once it's fully silent.
    fadingToMuteRef.current = true;
    setMuteCountdown(3);
    await rampVolume(sound, BASE_VOLUME, 0, MUTE_FADE_MS, (msLeft) => {
      setMuteCountdown(Math.max(1, Math.ceil(msLeft / 1000)));
    });
    fadingToMuteRef.current = false;
    setMuteCountdown(null);
    await sound.pauseAsync().catch(() => {});
    setIsMuted(true);
    AsyncStorage.setItem(MUTE_KEY, '1').catch(() => {});
  }

  async function duck() {
    duckCountRef.current += 1;
    const sound = soundRef.current;
    if (!sound || isMuted || fadingToMuteRef.current) return;
    if (duckCountRef.current === 1) {
      await rampVolume(sound, BASE_VOLUME, DUCK_VOLUME, DUCK_FADE_MS);
    }
  }

  async function unduck() {
    duckCountRef.current = Math.max(0, duckCountRef.current - 1);
    const sound = soundRef.current;
    if (!sound || isMuted || fadingToMuteRef.current) return;
    if (duckCountRef.current === 0) {
      await rampVolume(sound, DUCK_VOLUME, BASE_VOLUME, DUCK_FADE_MS);
    }
  }

  return (
    <AmbientMusicContext.Provider value={{ isMuted, toggle, hasTrack, muteCountdown, duck, unduck }}>
      {children}
    </AmbientMusicContext.Provider>
  );
}

export const useAmbientMusic = () => useContext(AmbientMusicContext);
