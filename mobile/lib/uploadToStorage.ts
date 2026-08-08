import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string | null;
  /** Human-readable Arabic reason, present only on failure. */
  error: string | null;
}

/**
 * Uploads a local file URI to a Supabase Storage bucket and returns its
 * public URL.
 *
 * Why this exists: every upload path in the app used to `console.error` the
 * Supabase failure and return null, and every caller then did `if (!url)
 * return;`. On a real device that produced a spinner that stopped with no
 * message and nothing saved — indistinguishable from the app ignoring the
 * tap. A storage RLS rejection, a missing bucket and a dead network all
 * looked identical. This returns the real reason so the UI can show it.
 *
 * Binary note: response.arrayBuffer() is deliberate. React Native's Blob
 * polyfill can report a correct byte size while uploading empty or corrupted
 * data — arrayBuffer is Supabase's own documented path for React Native. The
 * zero-length guard below catches the case where the picker hands back a URI
 * the platform can't actually read (common with cloud-backed files that
 * aren't downloaded locally yet).
 */
export async function uploadToStorage(
  uri: string,
  bucket: string,
  path: string,
  contentType: string,
): Promise<UploadResult> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      return { url: null, error: `تعذّر قراءة الملف من الجهاز (${response.status})` };
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return {
        url: null,
        error: 'الملف المُختار فارغ أو غير متاح محلياً على الجهاز. جرّب ملفاً محفوظاً على الجهاز نفسه وليس على التخزين السحابي.',
      };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, { contentType, upsert: false });

    if (error) {
      console.error(`upload to ${bucket}/${path} failed:`, error.message);
      return { url: null, error: `فشل الرفع: ${error.message}` };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      return { url: null, error: 'تم الرفع لكن تعذّر توليد الرابط العام للملف.' };
    }
    return { url: data.publicUrl, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('upload threw:', msg);
    return { url: null, error: `خطأ أثناء الرفع: ${msg}` };
  }
}
