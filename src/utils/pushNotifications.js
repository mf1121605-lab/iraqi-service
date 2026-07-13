export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(userId) {
  if (!isPushSupported()) throw new Error('push not supported');
  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  const { supabaseClient } = await import('../lib/supabaseClient');
  await supabaseClient.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });

  return sub;
}
