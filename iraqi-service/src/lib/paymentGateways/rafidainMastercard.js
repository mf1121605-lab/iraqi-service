// Al-Rafidain Bank does not publish a merchant API of its own online.
// Its Mastercard acceptance, like many regional banks, most plausibly runs
// on licensed Mastercard Payment Gateway Services (MPGS) infrastructure —
// a real, widely-documented product (Hosted Checkout: create a session via
// REST, redirect the customer to the gateway's hosted page, then
// independently verify the result with a server-to-server order-status
// call). This module is built against MPGS's documented Hosted Checkout
// contract as the most defensible generic pattern available without
// fabricating a nonexistent bank-specific API.
//
// Before going live: confirm with Al-Rafidain's merchant integration team
// whether they in fact use MPGS (vs. a different white-label gateway),
// get the bank-hosted RAFIDAIN_API_BASE_URL and API version, and adjust
// field names here if their actual contract differs.

export function buildRafidainAuthHeader({ merchantId, apiPassword }) {
  const credentials = `merchant.${merchantId}:${apiPassword}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export function buildCheckoutSessionPayload({ orderId, amount, returnUrl, currency = 'IQD' }) {
  return {
    apiOperation: 'CREATE_CHECKOUT_SESSION',
    order: { id: orderId, amount: Number(amount).toFixed(2), currency },
    interaction: { operation: 'PURCHASE', returnUrl },
  };
}

// MPGS's base Hosted Checkout flow has no async webhook — the merchant
// independently re-queries the order after the customer returns, rather
// than trusting the return URL's query string.
export function isOrderCaptured(gatewayOrder) {
  return gatewayOrder?.status === 'CAPTURED';
}
