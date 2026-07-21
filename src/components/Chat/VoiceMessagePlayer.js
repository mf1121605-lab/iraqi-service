import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { registerPlayback } from '../../utils/voicePlaybackRegistry';
import { translate } from '../../utils/i18n';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

export default function VoiceMessagePlayer({ src, isMine, locale }) {
  const t = (path) => translate(locale, path);
  const audioRef = useRef(null);
  // WebM files from MediaRecorder have no duration metadata — browsers report
  // Infinity or a wrong large value. Seeking to a huge position forces the
  // browser to scan the full file, at which point it corrects the duration.
  const seekingDurationRef = useRef(false);
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

  function handleLoadedMetadata(event) {
    const audio = event.currentTarget;
    if (!Number.isFinite(audio.duration) || audio.duration > 7200) {
      seekingDurationRef.current = true;
      audio.currentTime = 1e9;
    } else {
      setDuration(audio.duration);
    }
  }

  function handleDurationChange(event) {
    const audio = event.currentTarget;
    if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration < 86400) {
      seekingDurationRef.current = false;
      setDuration(audio.duration);
    }
  }

  function handleSeeked(event) {
    if (!seekingDurationRef.current) return;
    seekingDurationRef.current = false;
    const audio = event.currentTarget;
    if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    audio.currentTime = 0;
  }

  function handleTimeUpdate(event) {
    if (seekingDurationRef.current) return;
    setCurrentTime(event.currentTarget.currentTime);
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
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? t('chat.voicePauseLabel') : t('chat.voicePlayLabel')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
        className="h-1.5 flex-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label={t('chat.voiceSeekLabel')}
      />
      <span className="shrink-0 text-xs tabular-nums text-white/70" dir="ltr">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
