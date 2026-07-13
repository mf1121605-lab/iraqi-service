import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';
import { isValidIraqiPhone, toE164 } from '../../../utils/phoneHelper';

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
    password,
    givenName,
    fatherName,
    grandfatherName,
    familyName,
    specialization,
  } = req.body ?? {};

  if (!password || (!phone && !email)) {
    return res.status(400).json({ error: 'password and at least one of phone/email are required' });
  }
  if (phone && !isValidIraqiPhone(phone)) {
    return res.status(400).json({ error: 'invalid Iraqi phone number' });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: phone ? toE164(phone) : undefined,
    email: email || undefined,
    password,
    phone_confirm: Boolean(phone),
    email_confirm: Boolean(email),
    user_metadata: { role: 'employee', phone: phone ? toE164(phone) : undefined },
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      given_name: givenName ?? null,
      father_name: fatherName ?? null,
      grandfather_name: grandfatherName ?? null,
      family_name: familyName ?? null,
      specialization: specialization ?? null,
    })
    .eq('id', created.user.id);

  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }

  return res.status(200).json({ id: created.user.id });
}
