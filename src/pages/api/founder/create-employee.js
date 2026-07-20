import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';
import { isValidIraqiPhone, toE164, toLocalFormat } from '../../../utils/phoneHelper';

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
// Same alias domain the customer username→login flow already uses
// (src/pages/api/customer/register.js, src/pages/login.js) — reusing it
// means login.js's existing username branch works for employees with zero
// changes there.
const USERNAME_EMAIL_DOMAIN = 'iraqi-service.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const {
    phone,
    email,
    username,
    password,
    givenName,
    fatherName,
    grandfatherName,
    familyName,
    specialization,
    avatarKey,
  } = req.body ?? {};

  const normalizedUsername = username ? String(username).trim().toLowerCase() : '';
  if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يبدأ بحرف ويتكون من أحرف/أرقام إنجليزية فقط' });
  }
  if (!password || (!phone && !email && !normalizedUsername)) {
    return res.status(400).json({ error: 'password and at least one of phone/email/username are required' });
  }
  if (phone && !isValidIraqiPhone(phone)) {
    return res.status(400).json({ error: 'invalid Iraqi phone number' });
  }

  const loginEmail = normalizedUsername ? `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}` : email || undefined;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: phone ? toE164(phone) : undefined,
    email: loginEmail,
    password,
    phone_confirm: Boolean(phone),
    email_confirm: Boolean(loginEmail),
    // profiles.phone requires the local 07XXXXXXXXX format
    // (profiles_phone_format check constraint) — the signup trigger reads
    // phone straight from this metadata with no reformatting, unlike the
    // admin.createUser phone field above which does need E.164.
    user_metadata: { role: 'employee', phone: phone ? toLocalFormat(phone) : undefined },
  });

  if (createError) {
    const taken = /already.*registered|duplicate|unique/i.test(createError.message ?? '');
    return res.status(400).json({
      error: taken && normalizedUsername ? 'اسم المستخدم هذا مُستخدم من قبل، يرجى اختيار اسم آخر' : createError.message,
    });
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      given_name: givenName ?? null,
      father_name: fatherName ?? null,
      grandfather_name: grandfatherName ?? null,
      family_name: familyName ?? null,
      specialization: specialization ?? null,
      username: normalizedUsername || null,
      avatar_key: avatarKey || null,
    })
    .eq('id', created.user.id);

  if (profileError) {
    const taken = /unique|duplicate/i.test(profileError.message ?? '');
    return res.status(400).json({
      error: taken && normalizedUsername ? 'اسم المستخدم هذا مُستخدم من قبل، يرجى اختيار اسم آخر' : profileError.message,
    });
  }

  return res.status(200).json({ id: created.user.id });
}
