import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface OutboxItem {
  localId: string;
  body: string;
  createdAt: string;
}

const keyFor = (scope: string) => `offline_outbox:${scope}`;

// A message typed while offline (or one whose send failed) is kept here
// instead of just disappearing — flushed automatically the moment
// connectivity returns, so the customer never has to notice or retype it.
export async function enqueueOutbox(scope: string, body: string): Promise<OutboxItem> {
  const item: OutboxItem = { localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, body, createdAt: new Date().toISOString() };
  const existing = await getOutbox(scope);
  await AsyncStorage.setItem(keyFor(scope), JSON.stringify([...existing, item]));
  return item;
}

export async function getOutbox(scope: string): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(keyFor(scope));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function removeFromOutbox(scope: string, localId: string): Promise<void> {
  const existing = await getOutbox(scope);
  await AsyncStorage.setItem(keyFor(scope), JSON.stringify(existing.filter((i) => i.localId !== localId)));
}

// Registers a one-shot flush on the next reconnect event. Call again after
// each successful flush attempt if the queue might still have items
// (e.g. from a screen that stays mounted across multiple offline spells).
export function onReconnect(callback: () => void): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) callback();
  });
}
