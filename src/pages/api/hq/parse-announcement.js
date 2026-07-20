import { requireStaff } from '../../../lib/founderAuth';

const MAX_TEXT_LENGTH = 8000;
// Gemini 1.5 was fully retired by Google (confirmed via a live 404). Using
// the "-latest" alias instead of a pinned version like "gemini-3.5-flash"
// so Google's own model rotation doesn't silently break this again —
// the alias always points at their current recommended flash model.
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'خدمة التحليل الذكي غير مفعّلة حالياً' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    let response;
    let errorBody = '';
    // Gemini occasionally returns 503 UNAVAILABLE under load ("Spikes in
    // demand are usually temporary") — worth a couple of short retries
    // instead of immediately failing the founder's paste.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: trimmedText }] }],
            // Gemini's native JSON mode — guarantees a valid JSON string
            // back instead of relying purely on the prompt instruction.
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
          signal: controller.signal,
        }
      );
      if (response.ok) break;
      errorBody = await response.text().catch(() => '');
      if (response.status !== 503 || attempt === MAX_RETRIES) break;
      await sleep(RETRY_DELAY_MS);
    }

    if (!response.ok) {
      console.error('hq/parse-announcement: Gemini API error', response.status, errorBody);
      // Surfaced directly rather than a generic message — this is a
      // low-traffic staff-only tool, so the real upstream error is more
      // useful here than it would be on a customer-facing route.
      return res.status(502).json({ error: `تعذر تحليل النص (${response.status}): ${errorBody.slice(0, 300)}` });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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
