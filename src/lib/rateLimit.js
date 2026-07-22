import { supabaseAdmin } from './supabaseAdmin';

/**
 * Serverless-safe rate limiter backed by Supabase.
 * Returns { limited: true, retryAfterSeconds } if the limit is exceeded,
 * or { limited: false } if the request should be allowed.
 *
 * @param {string} key       Unique key to bucket (e.g. "register:1.2.3.4")
 * @param {number} maxAttempts Maximum attempts allowed in the window
 * @param {number} windowSeconds Window length in seconds
 */
export async function checkRateLimit(key, maxAttempts, windowSeconds) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from('rate_limit_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('attempted_at', windowStart);

  if (error) {
    // If the DB check fails, allow the request rather than blocking legitimate users.
    console.error('rateLimit: count query failed', error);
    return { limited: false };
  }

  if ((count ?? 0) >= maxAttempts) {
    return { limited: true, retryAfterSeconds: windowSeconds };
  }

  await supabaseAdmin.from('rate_limit_attempts').insert({ key });
  return { limited: false };
}
