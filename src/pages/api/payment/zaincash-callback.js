import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyZainCashCallbackToken } from '../../../lib/paymentGateways/zaincash';
import { resolvePaymentOutcome } from '../../../lib/paymentGateways/resolvePayment';

// This is the redirectUrl ZainCash sends the customer's browser back to —
// not a server-to-server webhook. The trust boundary is the JWT signature:
// if it doesn't verify against our shared secret (or has expired), the
// database is never touched, regardless of what the query string claims.
export default async function handler(req, res) {
  const { token } = req.query;
  if (!token || Array.isArray(token)) {
    return res.status(400).send('Missing payment token');
  }

  let decoded;
  try {
    decoded = verifyZainCashCallbackToken(token, process.env.ZAINCASH_SECRET);
  } catch {
    return res.status(400).send('Invalid or expired payment token');
  }

  const { orderId, id: providerTransactionId, status } = decoded;
  const resolvedStatus = status === 'success' ? 'success' : 'failed';

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, total_price')
    .eq('id', orderId)
    .single();

  if (!order) {
    return res.status(404).send('Order not found');
  }

  const finalStatus = await resolvePaymentOutcome({
    order,
    provider: 'zaincash',
    providerTransactionId,
    resolvedStatus,
    rawPayload: decoded,
  });

  return res.redirect(302, `/customer/orders/${order.id}/result?status=${finalStatus}`);
}
