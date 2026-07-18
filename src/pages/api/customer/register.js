import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { isValidIraqiPhone, toE164, toLocalFormat } from '../../../utils/phoneHelper';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const RECOVERY_QUESTION_IDS = [1, 2];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { phone, password, fullName, surname, username, recoveryQuestionId, recoveryAnswer } = req.body ?? {};

  if (!phone || !isValidIraqiPhone(phone)) {
    return res.status(400).json({ error: 'invalid Iraqi phone number' });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password too short' });
  }
  if (!fullName?.trim() || !surname?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const normalizedUsername = username ? String(username).trim().toLowerCase() : null;
  if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ error: 'invalid username format' });
  }
  const hasRecovery = recoveryQuestionId != null && recoveryAnswer;
  if (hasRecovery && !RECOVERY_QUESTION_IDS.includes(Number(recoveryQuestionId))) {
    return res.status(400).json({ error: 'invalid recovery question' });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: toE164(phone),
    password,
    phone_confirm: true,
    // profiles.phone requires the local 07XXXXXXXXX format
    // (profiles_phone_format check constraint) — the signup trigger reads
    // phone straight from this metadata with no reformatting, unlike the
    // admin.createUser phone field above which does need E.164.
    user_metadata: { role: 'customer', phone: toLocalFormat(phone) },
  });

  if (createError) {
    const alreadyRegistered = /already.*registered|duplicate|unique/i.test(createError.message ?? '');
    return res.status(400).json({
      error: alreadyRegistered ? 'هذا الرقم مسجل مسبقاً، جرّب تسجيل الدخول' : createError.message,
    });
  }

  const profileUpdate = { given_name: fullName.trim(), family_name: surname.trim() };
  if (normalizedUsername) {
    profileUpdate.username = normalizedUsername;
  }
  if (hasRecovery) {
    const normalizedAnswer = String(recoveryAnswer).trim().toLowerCase();
    profileUpdate.recovery_question_id = Number(recoveryQuestionId);
    profileUpdate.recovery_answer_hash = await bcrypt.hash(normalizedAnswer, 10);
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', created.user.id);

  if (profileError) {
    const usernameTaken = normalizedUsername && /unique|duplicate/i.test(profileError.message ?? '');
    return res.status(400).json({
      error: usernameTaken ? 'اسم المستخدم هذا مُستخدم من قبل' : profileError.message,
    });
  }

  return res.status(200).json({ id: created.user.id });
}
