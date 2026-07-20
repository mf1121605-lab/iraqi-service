import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { registerPlayback } from '../../utils/voicePlaybackRegistry';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

export default function VoiceMessagePlayer({ src, isMine }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      registerPlayback(audio);
      audio.play().catch(() => {});
    }
  }

  function handleSeek(event) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(event.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  }

  return (
    <div
      className={`mt-2 flex w-full max-w-[280px] items-center gap-2 rounded-full px-3 py-2 ${
        isMine ? 'bg-amber-700/60' : 'bg-black/20'
      }`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
      >
        {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        style={{ accentColor: '#f59e0b' }}
        className="h-1.5 flex-1 cursor-pointer"
        aria-label="Seek"
      />
      <span className="shrink-0 text-xs tabular-nums text-white/70" dir="ltr">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
