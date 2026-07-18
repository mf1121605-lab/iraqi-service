import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { isValidIraqiPhone, toLocalFormat } from '../../../utils/phoneHelper';

const MIN_PASSWORD_LENGTH = 8;
const GENERIC_ERROR = 'تعذر التحقق من بياناتك، تأكد من رقم الهاتف والإجابة';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { phone, questionAnswer, newPassword } = req.body ?? {};

  if (!phone || !isValidIraqiPhone(phone)) {
    return res.status(400).json({ error: 'invalid Iraqi phone number' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password too short' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, recovery_answer_hash')
    .eq('phone', toLocalFormat(phone))
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
