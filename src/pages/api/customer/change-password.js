import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkRateLimit } from '../../../lib/rateLimit';

const MIN_PASSWORD_LENGTH = 8;

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

  // 5 attempts per user per 15 minutes — prevents brute-forcing the current password
  const rl = await checkRateLimit(`change-pw:${userData.user.id}`, 5, 900);
  if (rl.limited) {
    return res.status(429).json({ error: 'عدد كبير من المحاولات، يرجى الانتظار قليلاً' });
  }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword) {
    return res.status(400).json({ error: 'كلمة السر الحالية مطلوبة' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `كلمة السر الجديدة يجب أن تتكون من ${MIN_PASSWORD_LENGTH} أحرف على الأقل` });
  }

  // There is no direct "verify this password" call in Supabase Auth — the
  // real way to check it server-side is attempting an actual sign-in with
  // it. Using the caller's own resolved email (never a client-supplied
  // one) keeps this from being usable to test passwords against other
  // accounts.
  const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return res.status(400).json({ error: 'كلمة السر الحالية غير صحيحة' });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userData.user.id, { password: newPassword });
  if (updateError) {
    console.error('change-password: updateUserById failed', updateError);
    return res.status(500).json({ error: updateError.message || 'تعذر تحديث كلمة السر' });
  }

  return res.status(200).json({ ok: true });
}
