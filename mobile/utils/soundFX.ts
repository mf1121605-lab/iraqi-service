import { Audio } from 'expo-av';

// Short synthesized UI feedback sounds (generated tones, no external
// assets) — mirrors the web's Web Audio oscillator SFX, pre-rendered here
// since expo-av can only play files, not synthesize live.
const SOURCES = {
  messageSent: require('@/assets/sounds/msg-sent.wav'),
  reaction: require('@/assets/sounds/reaction-pop.wav'),
  typing: require('@/assets/sounds/typing-tick.wav'),
  navTap: require('@/assets/sounds/nav-tap.wav'),
} as const;

type SoundName = keyof typeof SOURCES;

const cache: Partial<Record<SoundName, Audio.Sound>> = {};

async function getSound(name: SoundName): Promise<Audio.Sound> {
  const existing = cache[name];
  if (existing) return existing;
  const { sound } = await Audio.Sound.createAsync(SOURCES[name], { volume: 1 });
  cache[name] = sound;
  return sound;
}

// Fire-and-forget — never throws, never blocks the caller. Replays from
// the start so rapid repeated triggers (e.g. quick reaction taps) don't
// queue up or get dropped.
export function playSound(name: SoundName) {
  getSound(name)
    .then((sound) => sound.replayAsync())
    .catch(() => {});
}
