import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;
const USERNAME_EMAIL_DOMAIN = 'iraqi-service.vercel.app';

function getBearerToken(req) {
  const authHeader = req.headers.authorization ?? '';
  return authHeader.replace(/^Bearer\s+/i, '');
}

// Customers log in via a synthetic email derived from their username
// (see api/customer/register.js), so username is never a plain profiles
// column edit — the authenticated grant on profiles deliberately excludes
// it (rls_policies.sql) precisely to force every change through here,
// where the actual Supabase Auth email is rotated to match FIRST. If that
// step fails (most likely: the new username's derived email collides with
// an existing account), profiles.username is never touched, so the two
// never end up out of sync and the customer never gets locked out of
// their own account.
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

  const normalizedUsername = String(req.body?.username ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يبدأ بحرف ويتكوّن من أحرف/أرقام/شرطة سفلية فقط (3 أحرف على الأقل)' });
  }

  const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role, username').eq('id', userId).single();
  if (!callerProfile || callerProfile.role !== 'customer') {
    return res.status(403).json({ error: 'customer accounts only' });
  }
  if (callerProfile.username === normalizedUsername) {
    return res.status(200).json({ ok: true, unchanged: true });
  }

  const newEmail = `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`;
  const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail });
  if (emailUpdateError) {
    const taken = /already.*registered|duplicate|unique/i.test(emailUpdateError.message ?? '');
    return res.status(400).json({
      error: taken ? 'اسم المستخدم هذا مُستخدم من قبل، يرجى اختيار اسم آخر' : emailUpdateError.message,
    });
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').update({ username: normalizedUsername }).eq('id', userId);
  if (profileError) {
    console.error('update-username: profile update failed after email rotation', profileError);
    return res.status(500).json({ error: 'تعذر إكمال تحديث اسم المستخدم، يرجى المحاولة مرة أخرى' });
  }

  return res.status(200).json({ ok: true, username: normalizedUsername });
}
