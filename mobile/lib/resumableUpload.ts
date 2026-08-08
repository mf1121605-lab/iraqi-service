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

export interface ResumableUploadHandlers {
  onProgress?: (pct: number) => void;
  onError?: (err: Error) => void;
  onSuccess?: (publicUrl: string) => void;
}

export interface UploadHandle {
  /** Aborts the in-flight upload. No-op (nothing to cancel mid-flight) on
   *  the small-file fast path, which is a single already-sent request. */
  abort: () => void;
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
 */
export async function uploadMediaResumable(
  fileUri: string,
  bucket: string,
  path: string,
  contentType: string,
  handlers: ResumableUploadHandlers = {},
): Promise<UploadHandle> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) throw new Error('الملف غير موجود');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً');

  const fileInput: TusFileInput = { uri: fileUri, name: path.split('/').pop() ?? path, size: info.size };

  let tusUpload: InstanceType<typeof tus.Upload> | null = null;

  await new Promise<void>((resolve, reject) => {
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
        reject(error);
      },
      onSuccess() {
        resolve();
      },
    });

    // Resume a previous attempt for this exact file if one was interrupted
    // (app killed, network dropped mid-chunk) instead of starting over.
    tusUpload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) tusUpload!.resumeFromPreviousUpload(previous[0]);
      tusUpload!.start();
    });
  });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  handlers.onSuccess?.(data.publicUrl);

  return {
    abort: () => { tusUpload?.abort(); },
  };
}

async function uploadMediaFast(
  fileUri: string,
  bucket: string,
  path: string,
  contentType: string,
  handlers: ResumableUploadHandlers = {},
): Promise<UploadHandle> {
  try {
    const response = await fetch(fileUri);
    const arrayBuffer = await response.arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType, upsert: true });
    if (error) throw error;
    handlers.onProgress?.(100);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    handlers.onSuccess?.(data.publicUrl);
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
  return { abort: () => {} };
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
): Promise<UploadHandle> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  const size = info.exists ? info.size : 0;
  return size >= SMALL_FILE_THRESHOLD
    ? uploadMediaResumable(fileUri, bucket, path, contentType, handlers)
    : uploadMediaFast(fileUri, bucket, path, contentType, handlers);
}
