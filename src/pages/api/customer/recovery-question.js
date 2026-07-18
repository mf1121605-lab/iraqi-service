import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { toLocalFormat } from '../../../utils/phoneHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Normalize the same way register.js stores it, so lookup succeeds
  // regardless of how the user formats the phone this time.
  const phone = toLocalFormat(String(req.query.phone ?? ''));
  if (!phone) {
    return res.status(200).json({ questionId: null });
  }

  const { data } = await supabaseAdmin.from('profiles').select('recovery_question_id').eq('phone', phone).maybeSingle();

  return res.status(200).json({ questionId: data?.recovery_question_id ?? null });
}
