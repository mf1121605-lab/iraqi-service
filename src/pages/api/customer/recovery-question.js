import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const phone = String(req.query.phone ?? '').trim();
  if (!phone) {
    return res.status(200).json({ questionId: null });
  }

  const { data } = await supabaseAdmin.from('profiles').select('recovery_question_id').eq('phone', phone).maybeSingle();

  return res.status(200).json({ questionId: data?.recovery_question_id ?? null });
}
