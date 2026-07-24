import { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'iraqi-services:hasSeenIntro';
const DISPLAY_MS = 2500;
const FADE_MS = 500;

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
    audioRef.current?.play().catch(() => {});
    const timer = setTimeout(dismiss, DISPLAY_MS);
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
      <style>{`
        @keyframes splash-logo-in {
          0%   { opacity: 0; transform: scale(0.72); }
          60%  { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-name-in {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-shimmer {
          0%   { left: -80%; }
          100% { left: 130%; }
        }
        @keyframes splash-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(245,158,11,0.35); }
          50%       { box-shadow: 0 0 70px rgba(245,158,11,0.65), 0 0 120px rgba(245,158,11,0.2); }
        }
        .splash-logo {
          animation: splash-logo-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     splash-glow-pulse 1.5s ease-in-out 0.6s 1;
        }
        .splash-name {
          opacity: 0;
          animation: splash-name-in 0.5s ease forwards 0.55s;
        }
        .splash-tagline {
          opacity: 0;
          animation: splash-name-in 0.5s ease forwards 0.85s;
        }
        .splash-shimmer-wrap {
          position: relative;
          overflow: hidden;
          border-radius: 1.5rem;
          display: inline-block;
        }
        .splash-shimmer-wrap::after {
          content: '';
          position: absolute;
          top: 0;
          left: -80%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent);
          animation: splash-shimmer 0.9s ease 0.7s 2;
          pointer-events: none;
        }
      `}</style>

      <div className="flex flex-col items-center gap-4 text-white">
        <div className="splash-shimmer-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-icon-512.png"
            alt=""
            aria-hidden="true"
            className="splash-logo h-28 w-28 rounded-3xl object-contain"
          />
        </div>
        <p
          className="splash-name font-display text-2xl font-bold tracking-wide text-amber-300"
          dir="rtl"
        >
          منصة الخدمات العراقية
        </p>
        <p className="splash-tagline text-xs text-white/40" dir="rtl">
          خدمات موثوقة بين يديك
        </p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src="/assets/robot-eagle.m4a" preload="auto" />
    </div>
  );
}
