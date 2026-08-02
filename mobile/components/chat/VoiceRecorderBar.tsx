import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS } from '@/constants/theme';

interface Props {
  onSend: (uri: string, durationMs: number) => void;
  onCancel: () => void;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Live recording bar — replaces the text input row while recording.
// Tap the red dot / X to cancel, tap the send arrow to stop + upload.
export function VoiceRecorderBar({ onSend, onCancel }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startedAtRef = useRef(Date.now());
  const pulse = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        if (cancelled) { recording.stopAndUnloadAsync().catch(() => {}); return; }
        recordingRef.current = recording;
        startedAtRef.current = Date.now();
        interval = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
      } catch {
        onCancel();
      }
    })();

    pulse.value = withRepeat(withTiming(1.35, { duration: 700 }), -1, true);

    return () => {
      cancelled = true;
      clearInterval(interval);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  async function handleSend() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) { onCancel(); return; }
    const duration = Date.now() - startedAtRef.current;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) onSend(uri, duration);
      else onCancel();
    } catch {
      onCancel();
    }
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const recording = recordingRef.current;
    recordingRef.current = null;
    recording?.stopAndUnloadAsync().catch(() => {});
    onCancel();
  }

  return (
    <View style={styles.bar}>
      <Pressable onPress={handleSend} style={styles.sendBtn}>
        <Text style={styles.sendIcon}>↑</Text>
      </Pressable>
      <View style={styles.timerRow}>
        <Animated.View style={[styles.recDot, dotStyle]} />
        <Text style={styles.timerText}>{formatDuration(elapsedMs)}</Text>
        <Text style={styles.hintText}>جارِ التسجيل...</Text>
      </View>
      <Pressable onPress={handleCancel} style={styles.cancelBtn} hitSlop={8}>
        <Text style={styles.cancelIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,171,44,0.15)',
  },
  timerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  timerText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  hintText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, marginRight: 'auto' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 22, color: '#000', fontFamily: FONTS.bold },
  cancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center' },
  cancelIcon: { fontSize: 15, color: '#ef4444' },
});
