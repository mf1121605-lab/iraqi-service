import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { isValidIraqiPhone, toE164, toLocalFormat } from '../../../utils/phoneHelper';

const MIN_PASSWORD_LENGTH = 8;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { phone, password, fullName, surname } = req.body ?? {};

  if (!phone || !isValidIraqiPhone(phone)) {
    return res.status(400).json({ error: 'invalid Iraqi phone number' });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'password too short' });
  }
  if (!fullName?.trim() || !surname?.trim()) {
    return res.status(400).json({ error: 'name is required' });
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

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ given_name: fullName.trim(), family_name: surname.trim() })
    .eq('id', created.user.id);

  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }

  return res.status(200).json({ id: created.user.id });
}
