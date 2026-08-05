import AsyncStorage from '@react-native-async-storage/async-storage';

export const CHAT_BG_THEMES = {
  none:    { label: 'بدون', colors: null },
  gold:    { label: 'ذهبي',   colors: ['rgba(230,171,44,0.22)', 'rgba(120,80,10,0.10)'] as [string, string] },
  ocean:   { label: 'محيطي',  colors: ['rgba(37,99,235,0.20)', 'rgba(8,47,73,0.12)'] as [string, string] },
  sunset:  { label: 'غروب',   colors: ['rgba(244,63,94,0.18)', 'rgba(124,45,18,0.12)'] as [string, string] },
  forest:  { label: 'غابة',   colors: ['rgba(16,185,129,0.18)', 'rgba(6,78,59,0.12)'] as [string, string] },
} as const;

export type ChatBgTheme = keyof typeof CHAT_BG_THEMES;

const STORAGE_KEY = 'chat_bg_theme';

export async function getChatBgTheme(): Promise<ChatBgTheme> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && stored in CHAT_BG_THEMES) return stored as ChatBgTheme;
  } catch {
    // fall through to default
  }
  return 'none';
}

export async function setChatBgTheme(theme: ChatBgTheme): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
}

const ROOM_DEFAULT_THEMES: ChatBgTheme[] = ['gold', 'ocean', 'sunset', 'forest'];

// Deterministic per-room default so community rooms look visually distinct
// from one another out of the box, without needing a per-room storage key.
export function themeForRoomSlug(slug: string): ChatBgTheme {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return ROOM_DEFAULT_THEMES[hash % ROOM_DEFAULT_THEMES.length];
}
