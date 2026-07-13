import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { buildRafidainAuthHeader, isOrderCaptured } from '../../../lib/paymentGateways/rafidainMastercard';
import { resolvePaymentOutcome } from '../../../lib/paymentGateways/resolvePayment';

// This is the interaction.returnUrl the customer's browser lands on after
// the hosted checkout page. Unlike ZainCash, the base Hosted Checkout flow
// carries no signed token here — so the query string is never trusted for
// the actual result. Instead this independently re-queries the gateway's
// own order-status endpoint and treats that response as the source of
// truth.
export default async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId || Array.isArray(orderId)) {
    return res.status(400).send('Missing orderId');
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
