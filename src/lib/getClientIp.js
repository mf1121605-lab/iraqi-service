// Vercel sets x-real-ip to the real client IP and cannot be overridden by the
// client. x-forwarded-for is also set by Vercel (prepended) but a client can
// inject extra values before the real IP by sending X-Forwarded-For themselves.
// Prefer x-real-ip; fall back to x-forwarded-for only if unavailable.
export function getClientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (realIp && !Array.isArray(realIp)) return realIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? null;
}
