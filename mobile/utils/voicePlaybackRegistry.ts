import { Audio } from 'expo-av';

// Ensures only one voice note plays at a time app-wide: registering a new
// sound pauses whatever was playing before it.
let current: Audio.Sound | null = null;

export function registerPlayback(sound: Audio.Sound) {
  if (current && current !== sound) {
    current.pauseAsync().catch(() => {});
  }
  current = sound;
}

export function clearPlayback(sound: Audio.Sound) {
  if (current === sound) current = null;
}
