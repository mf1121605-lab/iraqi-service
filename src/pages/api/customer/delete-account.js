import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkRateLimit } from '../../../lib/rateLimit';

function getBearerToken(req) {
  const authHeader = req.headers.authorization ?? '';
  return authHeader.replace(/^Bearer\s+/i, '');
}

// Self-service account deletion. Google Play requires apps that support
// account creation to also offer in-app account deletion — this is that
// path. Deleting the auth.users row cascades to profiles (and everything
// keyed off profiles.id with ON DELETE CASCADE) automatically.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'missing bearer token' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const rl = await checkRateLimit(`delete-account:${userData.user.id}`, 3, 3600);
    if (rl.limited) {
      return res.status(429).json({ error: 'عدد كبير من المحاولات، يرجى الانتظار قليلاً' });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      console.error('delete-account: deleteUser failed', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('delete-account: unhandled error', err);
    return res.status(500).json({ error: err?.message ?? 'unexpected server error' });
  }
}
