import { requireStaff } from '../../../lib/founderAuth';

const MAX_TEXT_LENGTH = 8000;
const ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_TIMEOUT_MS = 30_000;

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'خدمة التحليل الذكي غير مفعّلة حالياً' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: trimmedText }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('hq/parse-announcement: Anthropic API error', response.status, errorBody);
      return res.status(502).json({ error: 'تعذر تحليل النص، حاول مرة أخرى' });
    }

    const data = await response.json();
    const rawText = (data.content ?? []).find((block) => block.type === 'text')?.text?.trim();
    if (!rawText) {
      return res.status(502).json({ error: 'تعذر تحليل النص، حاول مرة أخرى' });
    }

    let parsed;
    try {
      parsed = extractJson(rawText);
    } catch (parseErr) {
      console.error('hq/parse-announcement: failed to parse model JSON', parseErr, rawText);
      return res.status(502).json({ error: 'تعذر فهم استجابة الذكاء الاصطناعي، جرّب تعديل النص المُلصق' });
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
    return res.status(502).json({ error: 'تعذر تحليل النص، حاول مرة أخرى' });
  } finally {
    clearTimeout(timeout);
  }
}
