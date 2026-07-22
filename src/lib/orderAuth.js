import { supabaseAdmin } from './supabaseAdmin';

// Payment init routes use the service-role key (they need to write
// payment_transactions/orders regardless of the caller's own RLS grants),
// so this re-verifies the caller and ownership itself — resolving the
// bearer token to a user, then confirming they actually own the order
// they're trying to pay for. The returned `order.total_price` is what the
// gateway is told to charge; the client never gets to supply an amount.
export async function requireOrderOwner(req, orderId) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: 'missing bearer token', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: 'invalid session', status: 401 };
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, product_id, quantity, unit_price, total_price, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.customer_id !== userData.user.id) {
    return { error: 'order not found', status: 404 };
  }
  if (order.payment_status === 'paid') {
    return { error: 'order already paid', status: 409 };
  }

  return { order, userId: userData.user.id };
}
