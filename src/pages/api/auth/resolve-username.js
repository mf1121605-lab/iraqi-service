import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { toE164 } from '../../../utils/phoneHelper';

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const username = String(req.body?.username ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(200).json({ phone: null });
  }

  const { data } = await supabaseAdmin.from('profiles').select('phone').eq('username', username).maybeSingle();

  return res.status(200).json({ phone: data?.phone ? toE164(data.phone) : null });
}
