import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { COLORS, FONTS } from '@/constants/theme';
import { clearPlayback, registerPlayback } from '@/utils/voicePlaybackRegistry';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';

const SPEEDS = [1, 1.5, 2];
const BAR_COUNT = 26;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Deterministic pseudo-waveform (same message always renders the same bars)
// — a real amplitude analysis would need decoding the whole file client-side,
// which is unnecessary weight for a chat bubble; this reads as a waveform
// and the progress fill over it communicates playback position exactly.
function waveformHeights(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const heights: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    heights.push(6 + (h % 100) / 100 * 16);
  }
  return heights;
}

interface Props {
  uri: string;
  isMine: boolean;
}

export function VoiceMessagePlayer({ uri, isMine }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const heights = useRef(waveformHeights(uri)).current;
  const { duck, unduck } = useAmbientMusic();
  // Guards duck()/unduck() so each is called exactly once per playback
  // span, regardless of which path (finish, pause, unmount) ends it.
  const duckedRef = useRef(false);

  useEffect(() => {
    return () => {
      const s = soundRef.current;
      if (duckedRef.current) { duckedRef.current = false; unduck(); }
      if (s) { clearPlayback(s); s.unloadAsync().catch(() => {}); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setPositionSec((status.positionMillis ?? 0) / 1000);
    if (status.durationMillis) setDurationSec(status.durationMillis / 1000);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionSec(0);
      soundRef.current?.setPositionAsync(0).catch(() => {});
      if (duckedRef.current) { duckedRef.current = false; unduck(); }
    }
  }

  async function togglePlay() {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, rate: SPEEDS[speedIdx] }, onStatusUpdate);
      soundRef.current = sound;
      registerPlayback(sound);
      setIsPlaying(true);
      duckedRef.current = true;
      duck();
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      if (duckedRef.current) { duckedRef.current = false; unduck(); }
    } else {
      registerPlayback(soundRef.current);
      await soundRef.current.playAsync();
      setIsPlaying(true);
      duckedRef.current = true;
      duck();
    }
  }

  async function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(SPEEDS[next], true).catch(() => {});
    }
  }

  const progress = durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;
  const filledBars = Math.round(progress * BAR_COUNT);

  return (
    <View style={styles.row}>
      <Pressable onPress={togglePlay} style={[styles.playBtn, isMine ? styles.playBtnMine : styles.playBtnTheirs]}>
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </Pressable>

      <View style={styles.waveform}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { height: h, backgroundColor: i < filledBars ? (isMine ? '#fff' : COLORS.gold) : 'rgba(255,255,255,0.25)' },
            ]}
          />
        ))}
      </View>

      <Pressable onPress={cycleSpeed} style={styles.speedBtn}>
        <Text style={styles.speedText}>{SPEEDS[speedIdx]}x</Text>
      </Pressable>

      <Text style={[styles.duration, isMine && { color: 'rgba(255,255,255,0.85)' }]}>
        {formatTime(durationSec > 0 ? (isPlaying || positionSec > 0 ? durationSec - positionSec : durationSec) : 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 210 },
  playBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  playBtnMine: { backgroundColor: 'rgba(255,255,255,0.25)' },
  playBtnTheirs: { backgroundColor: 'rgba(230,171,44,0.2)' },
  playIcon: { fontSize: 12, color: '#fff' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { width: 2.5, borderRadius: 2 },
  speedBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  speedText: { fontFamily: FONTS.bold, fontSize: 10, color: '#fff' },
  duration: { fontFamily: FONTS.regular, fontSize: 10, color: 'rgba(255,255,255,0.6)', minWidth: 30, textAlign: 'left' },
});
