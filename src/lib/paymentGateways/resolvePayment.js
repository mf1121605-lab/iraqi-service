import { supabaseAdmin } from '../supabaseAdmin';

// Idempotent: gateways and browsers can hit a return URL more than once
// for the same transaction, so this only mutates orders/notifications the
// first time a given (provider, provider_transaction_id) resolves to a
// final status. The unique index on payment_transactions is the actual
// backstop against a race between two concurrent calls; this check just
// avoids the redundant work in the common case.
export async function resolvePaymentOutcome({ order, provider, providerTransactionId, resolvedStatus, rawPayload }) {
  const { data: existing } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, status')
    .eq('provider', provider)
    .eq('provider_transaction_id', providerTransactionId)
    .maybeSingle();

  if (existing && existing.status !== 'initiated') {
    return resolvedStatus;
  }

  if (existing) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({ status: resolvedStatus, raw_payload: rawPayload })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin.from('payment_transactions').insert({
      order_id: order.id,
      provider,
      provider_transaction_id: providerTransactionId,
      status: resolvedStatus,
      amount: order.total_price,
      raw_payload: rawPayload,
    });
  }

  await supabaseAdmin
    .from('orders')
    .update(
      resolvedStatus === 'success'
        ? { payment_status: 'paid', paid_at: new Date().toISOString() }
        : { payment_status: 'failed' }
    )
    .eq('id', order.id);

  await supabaseAdmin.from('notifications').insert({
    user_id: order.customer_id,
    title: resolvedStatus === 'success' ? 'تم الدفع بنجاح' : 'فشلت عملية الدفع',
    body:
      resolvedStatus === 'success'
        ? 'تم تأكيد دفعتك بنجاح'
        : 'لم تكتمل عملية الدفع، يرجى المحاولة مرة أخرى',
    link: `/customer/orders/${order.id}/result`,
  });

  return resolvedStatus;
}
