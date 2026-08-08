import * as FileSystem from 'expo-file-system';
import * as tus from 'tus-js-client';
import { toByteArray } from 'base64-js';
import { supabase } from '@/lib/supabase';
import { AsyncStorageUrlStorage } from '@/lib/tusUrlStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const TUS_ENDPOINT = `${SUPABASE_URL}/storage/v1/upload/resumable`;

// 6MB is Supabase Storage's documented minimum chunk size for its TUS
// endpoint — a smaller chunk is rejected by the server.
const CHUNK_SIZE = 6 * 1024 * 1024;
// Below this, the resumable protocol's extra round-trips (create + one PATCH
// per chunk) cost more than they save — a plain single-shot upload finishes
// faster and Postgres/Storage handles it in one request.
const SMALL_FILE_THRESHOLD = 5 * 1024 * 1024;

export interface UploadHandle {
  /** Aborts the in-flight upload. Genuinely cancels the TUS transfer
   *  mid-chunk; on the small-file fast path it can only stop the request
   *  before it's sent (or suppress the completion callbacks if it's already
   *  in flight) — see uploadMediaFast's comment for why. */
  abort: () => void;
}

export interface ResumableUploadHandlers {
  onProgress?: (pct: number) => void;
  onError?: (err: Error) => void;
  onSuccess?: (publicUrl: string) => void;
  /**
   * Fires as soon as an abortable handle exists — immediately for the TUS
   * path (before the first byte is sent), best-effort for the fast path.
   * Callers store this (e.g. in a ref) and call .abort() from a screen's
   * unmount cleanup, so navigating away mid-upload actually stops it
   * instead of leaving it running against a component that's gone.
   */
  onHandle?: (handle: UploadHandle) => void;
}

interface TusFileInput {
  uri: string;
  name: string;
  size: number;
}

// tus-js-client's browser build (the one Metro resolves for RN — see its
// package.json "browser" field) expects real File/Blob objects with a
// working slice(). React Native only ever hands you a file:// URI, with no
// object that supports random-access byte ranges — this is the one piece
// Supabase's own resumable-upload docs single out for a custom
// implementation, and it's why a plain `new tus.Upload(uri, ...)` won't
// work here. expo-file-system's readAsStringAsync(position, length) reads
// an arbitrary byte range as base64 without loading the whole file into
// memory, which base64-js then turns into raw bytes for the request body.
function expoFileReader() {
  return {
    async openFile(input: unknown) {
      const { uri, size } = input as TusFileInput;
      return {
        size,
        async slice(start: number, end: number) {
          const clampedEnd = Math.min(end, size);
          const length = clampedEnd - start;
          if (length <= 0) return { value: null, done: true };
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
            position: start,
            length,
          });
          const bytes = toByteArray(base64);
          return { value: bytes.buffer, done: clampedEnd >= size };
        },
        close() {
          // Nothing to release — each slice() opens and closes its own
          // read against the file:// URI rather than holding a handle open.
        },
      };
    },
  };
}

/**
 * Uploads a large file to Supabase Storage via the TUS resumable protocol:
 * chunked, retried on network blips (retryDelays), and — via
 * AsyncStorageUrlStorage — resumable even after the app is killed and
 * reopened mid-upload, not just across a transient disconnect.
 *
 * Resolves once the upload finishes, fails, or is aborted — never throws;
 * every outcome is reported through `handlers` so callers don't need a
 * try/catch around this specific call.
 */
export async function uploadMediaResumable(
  fileUri: string,
  bucket: string,
  path: string,
  contentType: string,
  handlers: ResumableUploadHandlers = {},
): Promise<void> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) { handlers.onError?.(new Error('الملف غير موجود')); return; }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { handlers.onError?.(new Error('يرجى تسجيل الدخول أولاً')); return; }

  const fileInput: TusFileInput = { uri: fileUri, name: path.split('/').pop() ?? path, size: info.size };

  // The setup above (file stat + session lookup) is itself async, so a
  // screen could already have unmounted and called abort() before there's
  // even a tus.Upload instance to abort — `aborted` covers that gap, since
  // the handle handed to the caller is otherwise a no-op until tusUpload
  // exists.
  let aborted = false;
  let tusUpload: InstanceType<typeof tus.Upload> | null = null;
  handlers.onHandle?.({
    abort: () => {
      aborted = true;
      tusUpload?.abort();
    },
  });
  if (aborted) return;

  await new Promise<void>((resolve) => {
    tusUpload = new tus.Upload(fileInput as unknown as File, {
      endpoint: TUS_ENDPOINT,
      chunkSize: CHUNK_SIZE,
      retryDelays: [0, 3000, 5000, 10000],
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      urlStorage: new AsyncStorageUrlStorage(),
      fileReader: expoFileReader() as unknown as tus.FileReader,
      headers: {
        authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'x-upsert': 'true',
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType,
        cacheControl: '3600',
      },
      onProgress(bytesSent, bytesTotal) {
        handlers.onProgress?.(Math.round((bytesSent / bytesTotal) * 100));
      },
      onError(error) {
        handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
        resolve();
      },
      onSuccess() {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        handlers.onSuccess?.(data.publicUrl);
        resolve();
      },
    });

    if (aborted) { resolve(); return; }

    // Resume a previous attempt for this exact file if one was interrupted
    // (app killed, network dropped mid-chunk) instead of starting over.
    tusUpload.findPreviousUploads().then((previous) => {
      if (aborted) { resolve(); return; }
      if (previous.length > 0) tusUpload!.resumeFromPreviousUpload(previous[0]);
      tusUpload!.start();
    });
  });
}

async function uploadMediaFast(
  fileUri: string,
  bucket: string,
  path: string,
  contentType: string,
  handlers: ResumableUploadHandlers = {},
): Promise<void> {
  // fetch() on a local file:// URI is effectively instant regardless of
  // file size (it's a disk read, not a network request) — the abort
  // controller only meaningfully covers the network upload step below.
  const controller = new AbortController();
  let aborted = false;
  handlers.onHandle?.({
    abort: () => {
      aborted = true;
      controller.abort();
    },
  });

  try {
    const response = await fetch(fileUri, { signal: controller.signal });
    const arrayBuffer = await response.arrayBuffer();
    // supabase-js's storage.upload() in the version this app pins takes no
    // abort signal — once called, the request itself can't be cancelled.
    // Checking `aborted` right before and after is a best-effort guard so
    // an unmounted screen at least doesn't act on a stale result (a
    // progress update or success callback into state that no longer
    // exists), even though the bytes may still finish uploading server-side.
    if (aborted) return;
    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType, upsert: true });
    if (aborted) return;
    if (error) { handlers.onError?.(new Error(error.message)); return; }
    handlers.onProgress?.(100);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    handlers.onSuccess?.(data.publicUrl);
  } catch (err) {
    if (aborted) return;
    handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Picks the upload path by file size: small files (thumbnails, short voice
 * notes) go through the plain, fast single-request upload; anything at or
 * above the threshold (video, long voice recordings) goes through the
 * chunked/resumable TUS path so a weak or dropped connection doesn't force
 * re-uploading the whole file from byte zero.
 */
export async function uploadMediaSmart(
  fileUri: string,
  bucket: string,
  path: string,
  contentType: string,
  handlers: ResumableUploadHandlers = {},
): Promise<void> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  const size = info.exists ? info.size : 0;
  return size >= SMALL_FILE_THRESHOLD
    ? uploadMediaResumable(fileUri, bucket, path, contentType, handlers)
    : uploadMediaFast(fileUri, bucket, path, contentType, handlers);
}
