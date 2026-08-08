import { Linking } from 'react-native';

// One-way escape hatch only — this never talks to Supabase or any bot
// backend. It just builds a https://t.me/<handle> deep link (opens the
// Telegram app if installed, otherwise the browser) with optional prefilled
// text. The in-app chat/request data model is completely untouched by this.
export async function openTelegramSupport(
  username: string | null | undefined,
  text?: string,
): Promise<boolean> {
  const handle = (username ?? '').trim().replace(/^@/, '');
  if (!handle) return false;

  const url = `https://t.me/${handle}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
