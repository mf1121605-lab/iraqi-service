import { requireStaff } from '../../../lib/founderAuth';

const MAX_TEXT_LENGTH = 8000;
// Groq's free tier (no credit card, generous rate limits) hosting an
// open-weight model. llama-3.3-70b-versatile — the model originally used
// here — was deprecated by Groq in June 2026 with requests cut off by
// August 2026; this is the model Groq's own deprecation notice recommends
// migrating to.
const GROQ_MODEL = 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYSTEM_PROMPT = `أنت خبير في استخلاص البيانات من إعلانات الخدمات الحكومية العراقية (مثل بوابة أور أو مظلتي).
استخرج من النص المُعطى كائن JSON نظيف بدون أي نص إضافي أو تنسيق markdown، بالحقول التالية بالضبط:
- title: عنوان الخدمة أو الوظيفة المعلن عنها.
- provider: الجهة المسؤولة (وزارة، مجلس، دائرة...).
- link: رابط التقديم المباشر الموجود في النص كما هو، أو نص فارغ "" إذا لم يوجد.
- deadline: تاريخ انتهاء التقديم إن وُجد، أو "غير محدد" إذا لم يُذكر.
- requirements: ملخص نقطي مختصر لأهم شروط التقديم بلغة عربية احترافية.
أعد فقط كائن JSON بهذا الشكل، بدون أي شرح أو نص قبله أو بعده.`;

function extractJson(rawText) {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : rawText).trim();
  return JSON.parse(candidate);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireStaff(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { text } = req.body ?? {};
  const trimmedText = String(text ?? '').trim();
  if (!trimmedText) {
    return res.status(400).json({ error: 'النص فارغ' });
  }
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `النص طويل جداً، الحد الأقصى ${MAX_TEXT_LENGTH} حرف` });
  }

  // Server-only env var (no NEXT_PUBLIC_ prefix) — Next.js API routes never
  // ship to the client bundle regardless, but the naming itself also makes
  // that intent explicit for anyone reading the Vercel env var list.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'خدمة التحليل الذكي غير مفعّلة حالياً' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response;
    let errorBody = '';
    // Retry transient 5xx (model overloaded / rate-limited momentarily)
    // instead of immediately failing the founder's paste.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: trimmedText },
          ],
          // OpenAI-compatible JSON mode — guarantees a valid JSON string
          // back instead of relying purely on the prompt instruction.
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      if (response.ok) break;
      errorBody = await response.text().catch(() => '');
      if (response.status < 500 || attempt === MAX_RETRIES) break;
      await sleep(RETRY_DELAY_MS);
    }

    if (!response.ok) {
      console.error('hq/parse-announcement: Groq API error', response.status, errorBody);
      // Surfaced directly rather than a generic message — this is a
      // low-traffic staff-only tool, so the real upstream error is more
      // useful here than it would be on a customer-facing route.
      return res.status(502).json({ error: `تعذر تحليل النص (${response.status}): ${errorBody.slice(0, 300)}` });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) {
      return res.status(502).json({ error: `تعذر تحليل النص: استجابة فارغة من النموذج — ${JSON.stringify(data).slice(0, 300)}` });
    }

    let parsed;
    try {
      parsed = extractJson(rawText);
    } catch (parseErr) {
      console.error('hq/parse-announcement: failed to parse model JSON', parseErr, rawText);
      return res.status(502).json({ error: `تعذر فهم استجابة الذكاء الاصطناعي: ${rawText.slice(0, 300)}` });
    }

    return res.status(200).json({
      title: parsed.title ?? '',
      provider: parsed.provider ?? '',
      link: parsed.link ?? '',
      deadline: parsed.deadline ?? 'غير محدد',
      requirements: parsed.requirements ?? '',
    });
  } catch (err) {
    console.error('hq/parse-announcement: unexpected exception', err);
    return res.status(502).json({ error: `تعذر تحليل النص: ${err?.message ?? String(err)}` });
  } finally {
    clearTimeout(timeout);
  }
}
