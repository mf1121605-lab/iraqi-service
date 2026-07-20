// Thin wrapper around Telegram's Bot API. Every call no-ops safely when
// TELEGRAM_BOT_TOKEN isn't set — this is deliberate placeholder wiring
// until the founder plugs in a real bot token via the Vercel dashboard,
// so nothing here can throw or block whatever called it.
const TELEGRAM_API_BASE = 'https://api.telegram.org';

function apiUrl(method) {
  return `${TELEGRAM_API_BASE}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function sendTelegramMessage(chatId, text, replyMarkup) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return null;
  const response = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
  });
  return response.json();
}

export async function answerTelegramCallback(callbackQueryId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  const response = await fetch(apiUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
  return response.json();
}

export async function editTelegramMessageText(chatId, messageId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  const response = await fetch(apiUrl('editMessageText'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  });
  return response.json();
}
