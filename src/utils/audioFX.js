// Synthesized UI sound effects — no audio files needed, pure Web Audio API.
// Re-uses the same shared AudioContext already created by notificationSound.js
// to avoid spawning a second context (browsers cap the number of active contexts).
let sharedContext = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === 'suspended') sharedContext.resume().catch(() => {});
  return sharedContext;
}

function tone(ctx, freq, startAt, dur, peakGain = 0.28, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + dur);
}

function sweep(ctx, fromFreq, toFreq, startAt, dur, peakGain = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(fromFreq, startAt);
  osc.frequency.linearRampToValueAtTime(toFreq, startAt + dur);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + dur);
}

export const audioFX = {
  playMessageSent() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    sweep(ctx, 880, 1320, t, 0.12);
  },

  playMessageReceived() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 660, t, 0.20, 0.24);
  },

  playStickerPicked() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 440, t, 0.06, 0.18);
    tone(ctx, 880, t + 0.06, 0.06, 0.22);
    tone(ctx, 440, t + 0.12, 0.05, 0.14);
  },

  playReaction() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 528, t, 0.18, 0.20);
  },

  playNavTap() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 1000, t, 0.05, 0.12, 'triangle');
  },
};
