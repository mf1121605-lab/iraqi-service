import { useEffect, useRef, useState } from 'react';
import { Loader as Loader2, Mic, Square } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';

const MAX_RECORD_MS = 2 * 60 * 1000;

function formatElapsed(secs) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function VoiceRecorder({ pathPrefix, onUploaded, locale }) {
  const t = (path) => translate(locale, path);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const stopTimerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (recording) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  async function uploadRecording(blob) {
    setUploading(true);
    const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const path = `${pathPrefix}/${crypto.randomUUID()}-voice.${extension}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('attachments')
      .upload(path, blob, { contentType: blob.type });
    setUploading(false);
    if (uploadError) {
      setError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    onUploaded({ path, name: `voice.${extension}`, size: blob.size, mime: blob.type });
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        uploadRecording(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      stopTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch {
      setError(t('chat.voiceMicDenied'));
    }
  }

  function stopRecording() {
    clearTimeout(stopTimerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <span className="relative inline-flex items-center gap-2">
      {recording && (
        <span className="flex items-center gap-1.5 select-none" dir="ltr">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-mono tabular-nums text-red-400 font-bold">
            {formatElapsed(elapsed)}
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        aria-label={recording ? t('chat.voiceStopCta') : t('chat.voiceRecordCta')}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          recording
            ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/40'
            : 'text-brand-700 hover:bg-brand-500/10 dark:text-brand-300'
        }`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : recording ? (
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {error && (
        <span
          className="absolute top-full mt-1 whitespace-nowrap text-xs font-normal text-red-600 dark:text-red-300"
          dir="ltr"
        >
          {error}
        </span>
      )}
    </span>
  );
}
