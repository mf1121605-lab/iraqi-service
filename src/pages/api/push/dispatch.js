import webpush from 'web-push';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const providedSecret = req.headers['x-push-secret'];
  const expectedSecret = process.env.PUSH_DISPATCH_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
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

  await Promise.all(
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

  return res.status(200).json({ dispatched: subscriptions?.length ?? 0 });
}
