import jwt from 'jsonwebtoken';

// ZainCash's classic "Instant Online Payment" (IOP) flow: sign a JWT with
// the shared merchant secret, POST it to /transaction/init, redirect the
// customer to /transaction/pay?id={id}, and ZainCash later redirects back
// with its own JWT (signed with the same secret) carrying the result.
// Grounded against ZainCash's publicly documented integration pattern
// (test.zaincash.iq / api.zaincash.iq, /transaction/init, JWT claims
// amount/serviceType/msisdn/orderId/redirectUrl) — confirm the exact
// field names against ZainCash's current merchant docs before going live,
// and check whether your merchant account is on this classic IOP product
// or their newer OAuth2-based v2 gateway, which uses a different flow
// entirely.
export function zainCashBaseUrl(mode) {
  return mode === 'production' ? 'https://api.zaincash.iq' : 'https://test.zaincash.iq';
}

export function buildZainCashInitToken({ amount, orderId, redirectUrl, msisdn, secret, serviceType = 'Other' }) {
  return jwt.sign({ amount, serviceType, msisdn, orderId, redirectUrl }, secret, {
    algorithm: 'HS256',
    expiresIn: '4h',
  });
}

// Throws on an invalid signature or an expired token — callers must not
// touch the database unless this returns successfully.
export function verifyZainCashCallbackToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}
