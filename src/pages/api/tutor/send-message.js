import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { TUTOR_SUBJECTS } from '../../../lib/tutorSubjects';

const MAX_MESSAGE_LENGTH = 800;
const HOURLY_MESSAGE_LIMIT = 20;
const DAILY_MESSAGE_LIMIT = 60;
const CONTEXT_MESSAGE_COUNT = 20;
const ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_TIMEOUT_MS = 30_000;
const TITLE_MAX_LENGTH = 60;

const SUBJECT_KEYS = TUTOR_SUBJECTS.map((subject) => subject.key);

function systemPromptFor(subjectKey) {
  const subject = TUTOR_SUBJECTS.find((item) => item.key === subjectKey);
  const subjectName = subject?.nameAr ?? subjectKey;
  return `أنت مدرس خصوصي ذكي متخصص حصراً في مادة "${subjectName}" لطالب في الصف الثالث متوسط ضمن المنهج العراقي. مهمتك:
- اشرح المفاهيم بأسلوب مبسّط وواضح يناسب طالباً بعمر 14-15 سنة، باللغة العربية الفصحى السهلة (إلا في مادة اللغة الإنكليزية، اجب فيها حسب السؤال بالإنكليزية أو العربية حسب الحاجة).
- عند طلب الطالب أسئلة تدريبية على نمط الامتحان الوزاري، قدّم أسئلة استرشادية للتدريب فقط، وليست أسئلة وزارية رسمية حقيقية.
- التزم حصراً بمادة "${subjectName}" ولا تجب عن أسئلة في مواد أخرى؛ اطلب من الطالب فتح جلسة جديدة لتلك المادة بدلاً من ذلك.
- اجعل إجاباتك مختصرة ومركّزة ما أمكن، مع أمثلة عند الحاجة.`;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization ?? '';
  return authHeader.replace(/^Bearer\s+/i, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'invalid session' });
  }
  const userId = userData.user.id;

  const { sessionId, message } = req.body ?? {};
  const trimmedMessage = String(message ?? '').trim();
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'missing session id' });
  }
  if (!trimmedMessage) {
    return res.status(400).json({ error: 'الرسالة فارغة' });
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `الرسالة طويلة جداً، الحد الأقصى ${MAX_MESSAGE_LENGTH} حرف` });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('tutor_chat_sessions')
    .select('id, student_id, subject, title')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session || session.student_id !== userId) {
    return res.status(404).json({ error: 'session not found' });
  }
  if (!SUBJECT_KEYS.includes(session.subject)) {
    return res.status(400).json({ error: 'invalid subject' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'خدمة المدرس الذكي غير مفعّلة حالياً، يرجى المحاولة لاحقاً' });
  }

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: hourlyCount }, { count: dailyCount }] = await Promise.all([
    supabaseAdmin
      .from('tutor_messages')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('role', 'user')
      .gte('created_at', oneHourAgo),
    supabaseAdmin
      .from('tutor_messages')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('role', 'user')
      .gte('created_at', oneDayAgo),
  ]);

  if ((hourlyCount ?? 0) >= HOURLY_MESSAGE_LIMIT) {
    return res.status(429).json({ error: 'لقد تجاوزت الحد المسموح من الأسئلة لهذه الساعة، حاول لاحقاً' });
  }
  if ((dailyCount ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return res.status(429).json({ error: 'لقد تجاوزت الحد المسموح من الأسئلة لهذا اليوم، حاول غداً' });
  }

  const { data: userMessageRow, error: insertUserError } = await supabaseAdmin
    .from('tutor_messages')
    .insert({ session_id: session.id, student_id: userId, role: 'user', content: trimmedMessage })
    .select('id, role, content, created_at')
    .single();

  if (insertUserError) {
    console.error('tutor/send-message: failed to insert user message', insertUserError);
    return res.status(500).json({ error: 'تعذر إرسال رسالتك، حاول مرة أخرى' });
  }

  const { data: recentMessages } = await supabaseAdmin
    .from('tutor_messages')
    .select('role, content, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MESSAGE_COUNT);

  const contextMessages = (recentMessages ?? [])
    .slice()
    .reverse()
    .map((row) => ({ role: row.role, content: row.content }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

  let assistantText;
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
        system: systemPromptFor(session.subject),
        messages: contextMessages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('tutor/send-message: Anthropic API error', response.status, errorBody);
      return res.status(502).json({ error: 'تعذر الحصول على رد من المدرس الذكي، حاول مرة أخرى' });
    }

    const data = await response.json();
    assistantText = (data.content ?? []).find((block) => block.type === 'text')?.text?.trim();
    if (!assistantText) {
      return res.status(502).json({ error: 'تعذر الحصول على رد من المدرس الذكي، حاول مرة أخرى' });
    }
  } catch (err) {
    console.error('tutor/send-message: unexpected exception calling Anthropic', err);
    return res.status(502).json({ error: 'تعذر الحصول على رد من المدرس الذكي، حاول مرة أخرى' });
  } finally {
    clearTimeout(timeout);
  }

  const { data: assistantMessageRow, error: insertAssistantError } = await supabaseAdmin
    .from('tutor_messages')
    .insert({ session_id: session.id, student_id: userId, role: 'assistant', content: assistantText })
    .select('id, role, content, created_at')
    .single();

  if (insertAssistantError) {
    console.error('tutor/send-message: failed to insert assistant message', insertAssistantError);
    return res.status(500).json({ error: 'تعذر حفظ رد المدرس الذكي' });
  }

  const sessionUpdate = { updated_at: new Date().toISOString() };
  if (!session.title) {
    sessionUpdate.title = trimmedMessage.slice(0, TITLE_MAX_LENGTH);
  }
  await supabaseAdmin.from('tutor_chat_sessions').update(sessionUpdate).eq('id', session.id);

  return res.status(200).json({ userMessage: userMessageRow, assistantMessage: assistantMessageRow });
}
