import { supabaseClient } from '../lib/supabaseClient';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function subscribeToPush(userId) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('VAPID_NOT_CONFIGURED');

  let registration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  } catch (err) {
    throw new Error(`SW_FAILED: ${err?.message ?? err}`);
  }

  const permission = await Notification.requestPermission();
  if (permission === 'denied') throw new Error('PERMISSION_DENIED');
  if (permission !== 'granted') throw new Error('PERMISSION_DISMISSED');

  let subscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    throw new Error(`SUBSCRIBE_FAILED: ${err?.message ?? err}`);
  }

  const raw = subscription.toJSON();
  const { error } = await supabaseClient.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: raw.endpoint,
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(`DB_FAILED: ${error.message}`);

  return subscription;
}

export async function unsubscribeFromPush() {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabaseClient.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
