import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { answerTelegramCallback, editTelegramMessageText } from '../../lib/telegram';

// Telegram webhook receiver for the "اقتناص المهمة ⚡" inline button sent
// by /api/telegram/notify-new-request. The claim logic itself is fully
// real (atomic claim-if-still-unclaimed, same guarantee as the web path's
// requests_update_staff RLS policy — enforced manually here since this
// request has no Supabase session/RLS to rely on). What's still
// placeholder: (1) TELEGRAM_BOT_TOKEN isn't set yet, so responses no-op,
// (2) this URL isn't registered with Telegram's setWebhook yet, (3) no
// employee has profiles.telegram_chat_id populated (no /start linking
// flow built — set it manually per employee for now).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const update = req.body ?? {};
  const callback = update.callback_query;
  if (!callback?.data?.startsWith('claim:')) {
    return res.status(200).json({ ok: true });
  }

  const requestId = callback.data.slice('claim:'.length);
  const telegramChatId = String(callback.from?.id ?? '');

  const { data: employee } = await supabaseAdmin
    .from('profiles')
    .select('id, given_name, family_name')
    .eq('telegram_chat_id', telegramChatId)
    .eq('role', 'employee')
    .maybeSingle();

  if (!employee) {
    await answerTelegramCallback(callback.id, 'حسابك غير مرتبط بأي موظف بعد');
    return res.status(200).json({ ok: true });
  }

  const { data: claimed } = await supabaseAdmin
    .from('requests')
    .update({ assigned_employee_id: employee.id })
    .eq('id', requestId)
    .is('assigned_employee_id', null)
    .select('id')
    .maybeSingle();

  if (!claimed) {
    await answerTelegramCallback(callback.id, 'عذراً، اقتنصها زميلك قبلك ❌');
    return res.status(200).json({ ok: true });
  }

  await answerTelegramCallback(callback.id, 'تم استلام المهمة ✅');
  if (callback.message?.chat?.id && callback.message?.message_id) {
    const employeeName = [employee.given_name, employee.family_name].filter(Boolean).join(' ');
    await editTelegramMessageText(callback.message.chat.id, callback.message.message_id, `تم الاستلام بواسطة ${employeeName} ✅`);
  }

  return res.status(200).json({ ok: true });
}
