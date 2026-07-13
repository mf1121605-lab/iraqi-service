import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOrderOwner } from '../../../lib/orderAuth';
import { buildRafidainAuthHeader, buildCheckoutSessionPayload } from '../../../lib/paymentGateways/rafidainMastercard';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { orderId } = req.body ?? {};
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  const auth = await requireOrderOwner(req, orderId);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }
  const { order } = auth;

  const baseUrl = process.env.RAFIDAIN_API_BASE_URL;
  const merchantId = process.env.RAFIDAIN_MERCHANT_ID;
  const payload = buildCheckoutSessionPayload({
    orderId: order.id,
    amount: order.total_price,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/rafidain-callback?orderId=${order.id}`,
  });

  let session;
  try {
    const response = await fetch(`${baseUrl}/merchant/${merchantId}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildRafidainAuthHeader({ merchantId, apiPassword: process.env.RAFIDAIN_API_PASSWORD }),
      },
      body: JSON.stringify(payload),
    });
    session = await response.json();
    if (!response.ok || !session?.session?.id) {
      throw new Error(session?.error?.explanation || 'Al-Rafidain session creation failed');
    }
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  await supabaseAdmin.from('payment_transactions').insert({
    order_id: order.id,
    provider: 'rafidain_mastercard',
    provider_transaction_id: session.session.id,
    status: 'initiated',
    amount: order.total_price,
    raw_payload: session,
  });

  await supabaseAdmin
    .from('orders')
    .update({ payment_method: 'rafidain_mastercard', payment_status: 'pending' })
    .eq('id', order.id);

  return res.status(200).json({ sessionId: session.session.id, merchantId });
}
