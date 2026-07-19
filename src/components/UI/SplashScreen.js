import { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'iraqi-services:hasSeenIntro';
// The video itself (~3s) is what actually decides when to dismiss, via
// onEnded — this is only a safety net in case it fails to load/play at
// all, so it's set well past the real duration on purpose. A tight timer
// here previously cut the video off before it could finish, since the
// clock started at mount rather than at actual playback start (network/
// buffering delay ate into the budget).
const SAFETY_DISMISS_MS = 8000;
const FADE_MS = 500;

// A one-per-session opening splash: a silent logo video plus a separate
// sound-effect track, kept as two independent media elements (not muxed
// into one file) so the audio's own autoplay attempt/fallback never
// affects whether the video itself plays. The video is always muted —
// muted autoplay is reliably allowed by every browser — while the audio
// element is the one that actually carries sound and is started the
// instant the video begins rendering real frames (onPlaying), not at
// component mount, so the effect stays tied to "the video has started"
// rather than racing ahead of a still-buffering video.
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const audioRef = useRef(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(dismiss, SAFETY_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleVideoPlaying() {
    // Browsers can still block autoplay-with-sound outright (no user
    // interaction yet) — the .catch() only prevents a console error in
    // that case, it can't force the sound to play; that part is a
    // browser security policy, not something any code can override.
    audioRef.current?.play().catch(() => {});
  }

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    audioRef.current?.pause();
    setFading(true);
    setTimeout(() => setVisible(false), FADE_MS);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#0d1117] transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src="/assets/logo-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={handleVideoPlaying}
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src="/assets/robot-eagle.m4a" preload="auto" />
    </div>
  );
}
