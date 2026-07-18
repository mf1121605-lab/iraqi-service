import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const GENERIC_ERROR = 'تعذر التحقق من بياناتك، تأكد من اسم المستخدم والإجابة';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { username, questionAnswer, newPassword } = req.body ?? {};
  const normalizedUsername = String(username ?? '').trim().toLowerCase();

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ error: 'invalid username format' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password too short' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, recovery_answer_hash')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (!profile?.recovery_answer_hash) {
    return res.status(400).json({ error: GENERIC_ERROR });
  }

  const normalizedAnswer = String(questionAnswer ?? '').trim().toLowerCase();
  const matches = await bcrypt.compare(normalizedAnswer, profile.recovery_answer_hash);
  if (!matches) {
    return res.status(400).json({ error: GENERIC_ERROR });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  return res.status(200).json({ ok: true });
}
