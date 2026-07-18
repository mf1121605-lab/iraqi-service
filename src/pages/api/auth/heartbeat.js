import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Called periodically by AppShell while a user has the app open, to
// power the founder's online/offline presence badge. Writes
// last_active_at using the service role only, after independently
// verifying the caller's own session token — never trust a
// client-supplied user id here.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'invalid session' });
  }

  await supabaseAdmin.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', data.user.id);

  return res.status(200).json({ ok: true });
}
