import { timingSafeEqual } from 'crypto';
import webpush from 'web-push';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const expectedSecret = process.env.PUSH_DISPATCH_SECRET;
  const providedSecret = String(req.headers['x-push-secret'] ?? '');
  const expected = String(expectedSecret ?? '');
  const secretMatch =
    !!expectedSecret &&
    providedSecret.length === expected.length &&
    timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expected));
  if (!secretMatch) {
    return res.status(401).json({ error: 'invalid dispatch secret' });
  }

  const { userId, title, body, link } = req.body ?? {};
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title are required' });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  const payload = JSON.stringify({ title, body, link });

  const webPushDispatch = Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', subscription.id);
        }
      }
    })
  );

  // Native mobile app tokens (Expo push service) — separate table/format
  // from the web's VAPID subscriptions above, dispatched the same way.
  const expoPushDispatch = (async () => {
    const { data: tokens } = await supabaseAdmin
      .from('push_tokens')
      .select('id, expo_push_token')
      .eq('user_id', userId);
    if (!tokens?.length) return;

    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      title,
      body,
      data: { link },
    }));

    let result;
    try {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      result = await resp.json();
    } catch {
      return;
    }

    // Expo reports per-message errors (e.g. DeviceNotRegistered) instead of
    // an HTTP failure — prune any token Expo says is no longer valid.
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const staleIds = tickets
      .map((ticket, i) => (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? tokens[i]?.id : null))
      .filter(Boolean);
    if (staleIds.length) {
      await supabaseAdmin.from('push_tokens').delete().in('id', staleIds);
    }
  })();

  await Promise.all([webPushDispatch, expoPushDispatch]);

  return res.status(200).json({ dispatched: subscriptions?.length ?? 0 });
}
