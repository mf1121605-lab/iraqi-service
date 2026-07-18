import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';

// Drill-down for a single user's login history, opened from an
// already-unlocked "بيانات المستخدمين" view — no passcode re-check here,
// the passcode is a one-time confirmation for entering that view, not
// something re-prompted per row.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('login_audit_logs')
    .select('id, ip_address, user_agent, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ logins: data ?? [] });
}
