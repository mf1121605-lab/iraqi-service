// Client-side video compression for the founder/employee media upload
// flow (MediaStudioModal). Server-side transcoding was ruled out: Vercel's
// serverless functions have tight execution time limits and no ffmpeg
// binary available, both of which make encoding unreliable there — doing
// it in the browser instead sidesteps that entirely. Uses ffmpeg.wasm's
// single-threaded core (not core-mt), which needs no special
// COOP/COEP response headers, so it can't break Google OAuth popups or
// Canva embeds elsewhere on the site.
//
// Re-encoding to a guaranteed H.264 baseline MP4 also fixes the
// "resource not supported" playback error some mobile browsers throw on
// HEVC/H.265 clips (the default output of most iPhone camera recordings)
// — baseline H.264 in an MP4 container is the most universally supported
// combination across browsers/devices.

const MAX_DIMENSION = 360; // px — these render inside small UI icons only
const TARGET_BITRATE_KBPS = 250;
const EXEC_TIMEOUT_MS = 60_000;
// Mobile browsers (constrained memory/CPU, sometimes flaky WASM threading)
// can make ffmpeg.wasm's initial core download+init hang indefinitely
// instead of failing outright — with no timeout here, that hang blocks the
// upload forever with no error and no fallback. This wraps the entire
// attempt so it always resolves one way or another within a bounded time.
const OVERALL_TIMEOUT_MS = 45_000;

let ffmpegPromise = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

// Returns a compressed File on success. On any failure (WASM failed to
// load or hung, encode timed out, unsupported input, etc.) returns the
// original file unchanged — a failed optimization should never block an
// upload that would have worked today.
export async function compressVideo(file, options = {}) {
  let timedOut = false;
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve(file);
    }, OVERALL_TIMEOUT_MS);
  });
  const attempt = compressVideoAttempt(file, options).then((result) => (timedOut ? file : result));
  return Promise.race([attempt, timeout]);
}

async function compressVideoAttempt(file, { onProgress } = {}) {
  try {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = await import('@ffmpeg/util');

    const extension = file.name.match(/\.\w+$/)?.[0] || '.mp4';
    const inputName = `input${extension}`;
    const outputName = 'output.mp4';

    const handleProgress = ({ progress }) => onProgress?.(Math.min(1, Math.max(0, progress)));
    if (onProgress) ffmpeg.on('progress', handleProgress);

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const exitCode = await ffmpeg.exec(
        [
          '-i', inputName,
          '-vf', `scale='min(${MAX_DIMENSION},iw)':'min(${MAX_DIMENSION},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
          '-an',
          '-c:v', 'libx264',
          '-profile:v', 'baseline',
          '-b:v', `${TARGET_BITRATE_KBPS}k`,
          '-preset', 'ultrafast',
          '-movflags', '+faststart',
          outputName,
        ],
        EXEC_TIMEOUT_MS
      );
      if (exitCode !== 0) return file;

      const data = await ffmpeg.readFile(outputName);
      return new File([data], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' });
    } finally {
      if (onProgress) ffmpeg.off('progress', handleProgress);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  } catch {
    return file;
  }
}
