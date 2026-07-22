import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { buildRafidainAuthHeader, isOrderCaptured } from '../../../lib/paymentGateways/rafidainMastercard';
import { resolvePaymentOutcome } from '../../../lib/paymentGateways/resolvePayment';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  const { orderId, sig } = req.query;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).send('Missing orderId');
  }

  // Verify the HMAC signature embedded in the returnUrl by rafidain-init.
  // Without this, any caller who knows a valid orderId UUID can forge a callback.
  const callbackSecret = process.env.RAFIDAIN_CALLBACK_SECRET;
  if (!callbackSecret) {
    return res.status(500).send('Payment callback not configured');
  }
  const expectedSig = createHmac('sha256', callbackSecret).update(orderId).digest('hex');
  const providedSig = String(sig ?? '');
  const sigValid =
    providedSig.length === expectedSig.length &&
    timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
  if (!sigValid) {
    return res.status(403).send('Invalid callback signature');
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, total_price')
    .eq('id', orderId)
    .single();

  if (!order) {
    return res.status(404).send('Order not found');
  }

  const baseUrl = process.env.RAFIDAIN_API_BASE_URL;
  const merchantId = process.env.RAFIDAIN_MERCHANT_ID;

  let gatewayOrder;
  try {
    const response = await fetch(`${baseUrl}/merchant/${merchantId}/order/${order.id}`, {
      headers: {
        Authorization: buildRafidainAuthHeader({ merchantId, apiPassword: process.env.RAFIDAIN_API_PASSWORD }),
      },
    });
    gatewayOrder = await response.json();
  } catch {
    return res.status(502).send('Could not verify payment status');
  }

  const resolvedStatus = isOrderCaptured(gatewayOrder) ? 'success' : 'failed';
  const providerTransactionId = gatewayOrder?.id ?? order.id;

  const finalStatus = await resolvePaymentOutcome({
    order,
    provider: 'rafidain_mastercard',
    providerTransactionId,
    resolvedStatus,
    rawPayload: gatewayOrder,
  });

  return res.redirect(302, `/customer/orders/${order.id}/result?status=${finalStatus}`);
}
