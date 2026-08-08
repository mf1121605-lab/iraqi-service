import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';

// Supabase's own session payload (access_token + refresh_token + user
// metadata) routinely exceeds SecureStore's ~2KB per-item ceiling on
// Android (EncryptedSharedPreferences), so the session itself can't live
// directly in SecureStore. Instead: a random AES-256 key is generated per
// storage key and kept in SecureStore (hardware-backed Keystore/Keychain,
// tiny payload, well under the limit); the actual session JSON is
// encrypted with that key and the ciphertext — unreadable without the
// key — is what lands in plain AsyncStorage. This is the pattern
// Supabase's own React Native/Expo guide recommends for exactly this
// constraint.
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Key lost/corrupted (e.g. Keystore wiped independently of app
      // storage) — treat as no session rather than crash the app.
      await this.removeItem(key);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

export const secureSessionStore = new LargeSecureStore();
