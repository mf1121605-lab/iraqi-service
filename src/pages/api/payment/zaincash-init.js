import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOrderOwner } from '../../../lib/orderAuth';
import { buildZainCashInitToken, zainCashBaseUrl } from '../../../lib/paymentGateways/zaincash';

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

  const baseUrl = zainCashBaseUrl(process.env.ZAINCASH_MODE);
  const token = buildZainCashInitToken({
    amount: Number(order.total_price), // server-recomputed — never trust a client-supplied amount
    orderId: order.id,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/zaincash-callback`,
    msisdn: process.env.ZAINCASH_MSISDN,
    secret: process.env.ZAINCASH_SECRET,
  });

  let gatewayResponse;
  try {
    const response = await fetch(`${baseUrl}/transaction/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, merchantId: process.env.ZAINCASH_MERCHANT_ID, lang: 'ar' }),
    });
    gatewayResponse = await response.json();
    if (!response.ok || !gatewayResponse?.id) {
      throw new Error(gatewayResponse?.msg || 'ZainCash init failed');
    }
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  await supabaseAdmin.from('payment_transactions').insert({
    order_id: order.id,
    provider: 'zaincash',
    provider_transaction_id: gatewayResponse.id,
    status: 'initiated',
    amount: order.total_price,
    raw_payload: gatewayResponse,
  });

  await supabaseAdmin
    .from('orders')
    .update({ payment_method: 'zaincash', payment_status: 'pending' })
    .eq('id', order.id);

  return res.status(200).json({ payUrl: `${baseUrl}/transaction/pay?id=${gatewayResponse.id}` });
}
