import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const username = String(req.query.username ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(200).json({ questionId: null });
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('recovery_question_id')
    .eq('username', username)
    .maybeSingle();

  return res.status(200).json({ questionId: data?.recovery_question_id ?? null });
}
