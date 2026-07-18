import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const RECOVERY_QUESTION_IDS = [1, 2];
const USERNAME_EMAIL_DOMAIN = 'iraqi-service.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { phone, password, fullName, surname, username, recoveryQuestionId, recoveryAnswer } = req.body ?? {};

  const normalizedUsername = String(username ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ error: 'invalid username format' });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password too short' });
  }
  if (!fullName?.trim() || !surname?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!String(phone ?? '').trim()) {
    return res.status(400).json({ error: 'phone is required' });
  }
  const hasRecovery = recoveryQuestionId != null && recoveryAnswer;
  if (hasRecovery && !RECOVERY_QUESTION_IDS.includes(Number(recoveryQuestionId))) {
    return res.status(400).json({ error: 'invalid recovery question' });
  }

  try {
    const internalEmail = `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'customer' },
    });

    if (createError) {
      console.error('register: createUser failed', createError);
      const usernameTaken = /already.*registered|duplicate|unique/i.test(createError.message ?? '');
      return res.status(400).json({
        error: usernameTaken ? 'اسم المستخدم هذا مُستخدم من قبل، يرجى اختيار اسم آخر' : createError.message,
      });
    }

    const profileUpdate = {
      given_name: fullName.trim(),
      family_name: surname.trim(),
      username: normalizedUsername,
      phone: String(phone).trim(),
    };
    if (hasRecovery) {
      const normalizedAnswer = String(recoveryAnswer).trim().toLowerCase();
      profileUpdate.recovery_question_id = Number(recoveryQuestionId);
      profileUpdate.recovery_answer_hash = await bcrypt.hash(normalizedAnswer, 10);
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', created.user.id);

    if (profileError) {
      console.error('register: profile update failed', profileError);
      const usernameTaken = /unique|duplicate/i.test(profileError.message ?? '');
      return res.status(400).json({
        error: usernameTaken ? 'اسم المستخدم هذا مُستخدم من قبل، يرجى اختيار اسم آخر' : profileError.message,
      });
    }

    return res.status(200).json({ id: created.user.id });
  } catch (err) {
    console.error('register: unhandled exception', err);
    return res.status(500).json({ error: err?.message ?? 'unexpected server error' });
  }
}
