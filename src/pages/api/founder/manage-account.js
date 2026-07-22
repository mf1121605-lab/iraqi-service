import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';

const ACTIONS = ['suspend', 'activate', 'assign_co_admin', 'remove_co_admin', 'verify', 'unverify', 'promote_employee', 'demote_customer'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { targetUserId, action } = req.body ?? {};
  if (!targetUserId || !ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'targetUserId and a valid action are required' });
  }

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', targetUserId)
    .single();

  if (!target) {
    return res.status(404).json({ error: 'account not found' });
  }

  if (target.role === 'founder') {
    return res.status(403).json({ error: "the founder's own account cannot be modified this way" });
  }

  const updates = {
    suspend: { account_status: 'suspended' },
    activate: { account_status: 'active' },
    assign_co_admin: { admin_level: 'co_admin' },
    remove_co_admin: { admin_level: null },
    verify: { is_verified: true },
    unverify: { is_verified: false },
    promote_employee: { role: 'employee' },
    demote_customer: { role: 'customer' },
  }[action];

  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', targetUserId);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
