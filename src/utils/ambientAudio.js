import { useEffect, useState } from 'react';

const AMBIENT_AUDIO_EVENT = 'iraqi-services:ambient-audio-change';
const STORAGE_KEY = 'iraqi-services:ambient-playing';

let audioElement = null;
let playing = false;
let autoPlayScheduled = false;

function broadcast(state) {
  window.dispatchEvent(new CustomEvent(AMBIENT_AUDIO_EVENT, { detail: state }));
}

// Try to play — succeeds if user has interacted with the page already
function tryAutoPlay() {
  if (!audioElement || playing) return;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1') return;
  audioElement.play().then(() => {
    playing = true;
    autoPlayScheduled = false;
    broadcast(true);
  }).catch(() => {
    // Browser blocked autoplay — will retry on next user interaction
  });
}

// Schedule auto-play on the next user interaction if immediate play fails
function scheduleAutoPlay() {
  if (autoPlayScheduled) return;
  autoPlayScheduled = true;
  tryAutoPlay();
  // Retry on first tap/click (browser unlocks audio on interaction)
  const retry = () => { tryAutoPlay(); autoPlayScheduled = false; };
  document.addEventListener('click', retry, { once: true });
  document.addEventListener('touchstart', retry, { once: true, passive: true });
}

export function registerAmbientAudioElement(el) {
  const wasPlaying = playing;
  audioElement = el;

  if (!el) {
    if (playing) {
      playing = false;
      if (typeof window !== 'undefined') broadcast(false);
    }
    return;
  }

  if (wasPlaying) {
    // Audio element was remounted (e.g. settings re-fetched) — resume immediately
    el.play().catch(() => {});
  } else {
    // New mount — auto-start if user had it on before
    scheduleAutoPlay();
  }

  // Sync playing state if the browser pauses/resumes externally (phone call, tab switch)
  el.addEventListener('pause', () => {
    if (playing) {
      playing = false;
      broadcast(false);
    }
  });
  el.addEventListener('play', () => {
    if (!playing) {
      playing = true;
      broadcast(true);
    }
  });
}

export function toggleAmbientAudio() {
  if (!audioElement) return;
  if (playing) {
    audioElement.pause();
    playing = false;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, '0');
  } else {
    audioElement.play().catch(() => {});
    playing = true;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
  }
  broadcast(playing);
}

export function useAmbientAudioPlaying() {
  const [state, setState] = useState(false);

  useEffect(() => {
    // Sync initial state (audio may already be playing from auto-start)
    setState(playing);

    function handleChange(event) {
      setState(event.detail);
    }
    window.addEventListener(AMBIENT_AUDIO_EVENT, handleChange);
    return () => window.removeEventListener(AMBIENT_AUDIO_EVENT, handleChange);
  }, []);

  return state;
}
