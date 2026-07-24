import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { title, body } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  // Fetch all customer user IDs
  const { data: customers, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'customer');

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!customers?.length) return res.status(200).json({ ok: true, count: 0 });

  const rows = customers.map((c) => ({
    user_id: c.id,
    title: title.trim(),
    body: body?.trim() ?? null,
    notification_type: 'broadcast',
  }));

  const { error: insertError } = await supabaseAdmin.from('notifications').insert(rows);
  if (insertError) return res.status(500).json({ error: insertError.message });

  return res.status(200).json({ ok: true, count: rows.length });
}
