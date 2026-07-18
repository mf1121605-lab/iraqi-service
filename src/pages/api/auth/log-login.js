import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getClientIp } from '../../../lib/getClientIp';

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

  // Never trust a client-supplied user id — resolve it from the verified
  // session token instead.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'invalid session' });
  }

  await supabaseAdmin.from('login_audit_logs').insert({
    user_id: data.user.id,
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] ?? null,
  });

  return res.status(200).json({ ok: true });
}
