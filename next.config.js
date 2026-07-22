/** @type {import('next').NextConfig} */

// Derive the Supabase host from the env var so the CSP allow-list is as tight
// as possible (only the project's own subdomain, not the whole *.supabase.co
// wildcard). Falls back to the wildcard if the var is missing (e.g. CI builds).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host || '*.supabase.co';
  } catch {
    return '*.supabase.co';
  }
})();
const supabaseWss = `wss://${supabaseHost}`;
const supabaseHttps = `https://${supabaseHost}`;

// Content-Security-Policy
// - script-src includes 'unsafe-inline' because Next.js injects inline hydration
//   scripts that cannot be nonce-signed without edge middleware. The remaining
//   directives still block data exfiltration, framing, plugins, and unknown
//   external sources — giving meaningful XSS defence-in-depth.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHttps} https://lh3.googleusercontent.com https://lh4.googleusercontent.com`,
  `connect-src 'self' ${supabaseHttps} ${supabaseWss} https://api.anthropic.com`,
  `media-src 'self' blob: ${supabaseHttps}`,
  "font-src 'self' data:",
  "worker-src blob:",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
