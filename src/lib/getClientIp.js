// Vercel's edge network sets x-forwarded-for to the real client IP —
// req.socket.remoteAddress on Vercel is the proxy's own address, not the
// visitor's.
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? null;
}
