import AsyncStorage from '@react-native-async-storage/async-storage';

// tus-js-client's own UrlStorage/PreviousUpload interfaces exist in its
// .d.ts but aren't exported from the package — UploadOptions.urlStorage is
// typed against them structurally, so a locally-declared type with the same
// shape satisfies it at the call site without needing an import.
export interface PreviousUpload {
  size: number | null;
  metadata: { [key: string]: string };
  creationTime: string;
  urlStorageKey: string;
  uploadUrl: string | null;
  parallelUploadUrls: string[] | null;
}

interface TusUrlStorage {
  findAllUploads(): Promise<PreviousUpload[]>;
  findUploadsByFingerprint(fingerprint: string): Promise<PreviousUpload[]>;
  removeUpload(urlStorageKey: string): Promise<void>;
  addUpload(fingerprint: string, upload: PreviousUpload): Promise<string>;
}

/**
 * tus-js-client's browser build defaults to a `localStorage`-backed
 * urlStorage. React Native has no `localStorage` global, so with no
 * urlStorage supplied the library silently falls back to a no-op store
 * (`canStoreURLs` evaluates false) — uploads still work, but nothing
 * survives an app restart or crash mid-upload, which defeats the actual
 * point of asking for "resumable" uploads rather than merely
 * retry-within-session ones. This backs the same interface with
 * AsyncStorage (already the app's session-storage mechanism, see
 * lib/supabase.ts) so a half-finished large upload can resume where it
 * left off the next time the picker opens.
 */
const PREFIX = 'tus::';

export class AsyncStorageUrlStorage implements TusUrlStorage {
  async findAllUploads(): Promise<PreviousUpload[]> {
    return this._findEntries(PREFIX);
  }

  async findUploadsByFingerprint(fingerprint: string): Promise<PreviousUpload[]> {
    return this._findEntries(`${PREFIX}${fingerprint}::`);
  }

  async removeUpload(urlStorageKey: string): Promise<void> {
    await AsyncStorage.removeItem(urlStorageKey);
  }

  async addUpload(fingerprint: string, upload: PreviousUpload): Promise<string> {
    const id = Math.round(Math.random() * 1e12);
    const key = `${PREFIX}${fingerprint}::${id}`;
    await AsyncStorage.setItem(key, JSON.stringify(upload));
    return key;
  }

  private async _findEntries(prefix: string): Promise<PreviousUpload[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const matching = allKeys.filter((k) => k.startsWith(prefix));
    if (matching.length === 0) return [];
    const pairs = await AsyncStorage.multiGet(matching);
    const results: PreviousUpload[] = [];
    for (const [key, value] of pairs) {
      if (!value) continue;
      try {
        const upload = JSON.parse(value) as PreviousUpload;
        upload.urlStorageKey = key;
        results.push(upload);
      } catch {
        // A malformed entry shouldn't block finding/resuming other uploads.
      }
    }
    return results;
  }
}
