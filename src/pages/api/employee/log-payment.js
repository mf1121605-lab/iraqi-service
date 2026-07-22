import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'missing bearer token' });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: 'invalid session' });

  const { data: caller } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', userData.user.id)
    .single();

  if (!caller || caller.role !== 'employee') {
    return res.status(403).json({ error: 'employees only' });
  }

  const { request_id, method, amount, notes } = req.body ?? {};

  if (!request_id || !method || !amount) {
    return res.status(400).json({ error: 'request_id, method, and amount are required' });
  }
  if (!['zaincash', 'qi_card'].includes(method)) {
    return res.status(400).json({ error: 'method must be zaincash or qi_card' });
  }
  const parsedAmount = parseFloat(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from('requests')
    .select('id, assigned_employee_id, customer_id')
    .eq('id', request_id)
    .single();

  if (requestError || !requestRow) {
    return res.status(404).json({ error: 'request not found' });
  }
  if (requestRow.assigned_employee_id !== caller.id) {
    return res.status(403).json({ error: 'you are not the assigned employee for this request' });
  }

  const { data: payment, error: insertError } = await supabaseAdmin
    .from('request_payments')
    .insert({
      request_id,
      employee_id: caller.id,
      customer_id: requestRow.customer_id,
      method,
      amount: parsedAmount,
      notes: notes?.trim() || null,
      logged_by: caller.id,
    })
    .select()
    .single();

  if (insertError) {
    return res.status(400).json({ error: insertError.message });
  }

  await supabaseAdmin.from('request_messages').insert({
    request_id,
    sender_id: caller.id,
    body: JSON.stringify({ method, amount: parsedAmount, notes: notes?.trim() || null }),
    message_type: 'payment_proposal',
  });

  return res.status(200).json({ payment });
}
