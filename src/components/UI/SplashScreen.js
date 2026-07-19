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

// A one-per-session opening splash: plays a short logo video (the sound
// effect is baked into the video file itself, not a separate track) on
// the very first page the user lands on, then fades out and never shows
// again until the tab/session ends.
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    const video = videoRef.current;
    // Browsers routinely block autoplay-with-sound on a page the user
    // hasn't interacted with yet. Try unmuted first (so the sound effect
    // plays whenever it's allowed); if that promise rejects, fall back to
    // muted playback so the video itself never just sits there frozen.
    video?.play().catch(() => {
      if (!video) return;
      video.muted = true;
      video.play().catch(() => {});
    });

    const timer = setTimeout(dismiss, SAFETY_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
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
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
