import { sendTelegramMessage } from '../../../lib/telegram';

// Hit by a Postgres trigger (fn_dispatch_telegram_new_request, via the
// pg_net extension) whenever a customer submits a new request — see the
// matching migration. Placeholder wiring: no-ops safely until both
// TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_CHAT_ID are set in Vercel, so a
// misconfigured bot can never block request submission itself (the
// trigger fires this asynchronously, outside the insert transaction).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { request_id: requestId, title, category } = req.body ?? {};
  if (!process.env.TELEGRAM_GROUP_CHAT_ID) {
    return res.status(200).json({ ok: true, skipped: 'TELEGRAM_GROUP_CHAT_ID not configured' });
  }

  await sendTelegramMessage(process.env.TELEGRAM_GROUP_CHAT_ID, `طلب جديد: ${title}\nالفئة: ${category}`, {
    inline_keyboard: [[{ text: 'اقتناص المهمة ⚡', callback_data: `claim:${requestId}` }]],
  });

  return res.status(200).json({ ok: true });
}
