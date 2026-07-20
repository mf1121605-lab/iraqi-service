// Ensures only one voice message plays at a time across the whole chat
// view — starting a new one pauses whatever was playing before it, the
// same module-level singleton pattern already used by ambientAudio.js.
let currentAudioElement = null;

export function registerPlayback(audioElement) {
  if (currentAudioElement && currentAudioElement !== audioElement) {
    currentAudioElement.pause();
  }
  currentAudioElement = audioElement;
}
