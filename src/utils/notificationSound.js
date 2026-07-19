// A short, sharp two-tone ping for the employee dashboard's "new ticket"
// alert — synthesized with the Web Audio API rather than an <audio> file,
// so there's no asset to upload/replace and nothing that can 404. Safe to
// call from any event handler; by the time an employee is watching their
// dashboard they've already interacted with the page at least once this
// session (login, clicking around), which is what actually unblocks
// autoplay-with-sound in Chrome — unlike the splash screen's unattended
// first-load attempt, no .catch() dance is needed here, just a guard for
// browsers without Web Audio support at all.
let sharedContext = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext) sharedContext = new AudioContextClass();
  return sharedContext;
}

function tone(ctx, frequency, startAt, duration) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function playNewTicketPing() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  tone(ctx, 880, now, 0.16);
  tone(ctx, 1175, now + 0.14, 0.22);
}
