import { useEffect, useState } from 'react';

const AMBIENT_AUDIO_EVENT = 'iraqi-services:ambient-audio-change';

// The <audio> element itself lives in SiteChrome (mounted once in
// _app.js, so it survives client-side page navigation instead of being
// torn down and recreated per page like AppShell is). This module is the
// glue that lets AppShell's speaker button — rendered fresh on every
// page — control that one persistent element without either side needing
// a shared parent or context provider, the same event-based pattern
// useSyncedLocale already uses in utils/i18n.js.
let audioElement = null;
let playing = false;

export function registerAmbientAudioElement(el) {
  audioElement = el;
  // The element unmounts if the founder clears the track while someone
  // has it playing — reset state and notify AppShell's button so it
  // doesn't keep showing "playing" for an element that no longer exists.
  if (!el && playing) {
    playing = false;
    window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_EVENT, { detail: false }));
  }
}

export function toggleAmbientAudio() {
  if (!audioElement) return;
  if (playing) {
    audioElement.pause();
    playing = false;
  } else {
    // This only ever runs from a real click handler, so the browser's
    // autoplay-with-sound restriction never applies here — no .catch()
    // fallback needed, unlike the splash screen's unattended attempt.
    audioElement.play().catch(() => {});
    playing = true;
  }
  window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_EVENT, { detail: playing }));
}

export function useAmbientAudioPlaying() {
  const [state, setState] = useState(false);

  useEffect(() => {
    function handleChange(event) {
      setState(event.detail);
    }
    window.addEventListener(AMBIENT_AUDIO_EVENT, handleChange);
    return () => window.removeEventListener(AMBIENT_AUDIO_EVENT, handleChange);
  }, []);

  return state;
}
