import { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'iraqi-services:hasSeenIntro';
const AUTO_DISMISS_MS = 3000;
const FADE_MS = 500;

// A one-per-session opening splash: plays a short logo video (with a
// sound-effect track alongside it, since a single video file can't carry
// two independently-timed audio sources) on the very first page the user
// lands on, then fades out and never shows again until the tab/session
// ends. Placeholder assets — /assets/logo-intro.mp4 and
// /assets/robot-eagle.mp3 — are swapped in by the founder later; missing
// files just fail silently (onError/catch), never blocking the real app
// underneath.
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);
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

    // Autoplay (even muted/inline video, and especially audio with sound)
    // can be blocked by the browser depending on the user's engagement
    // history — the .catch(() => {}) is required so a rejected play()
    // promise never surfaces as an unhandled-rejection console error; the
    // 3s timer below still fires and dismisses the splash regardless.
    videoRef.current?.play().catch(() => {});
    audioRef.current?.play().catch(() => {});

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
        ref={videoRef}
        src="/assets/logo-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        className="max-h-[70vh] w-auto max-w-[90vw] object-contain"
      />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src="/assets/robot-eagle.mp3" preload="auto" />
    </div>
  );
}
