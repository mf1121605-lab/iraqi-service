import { NextResponse } from 'next/server';

let cachedActive = false;
let cacheExpiry = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/lockdown') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|css|js)$/)
  ) {
    return NextResponse.next();
  }

  if (Date.now() > cacheExpiry) {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_lockdown?select=active&id=eq.1&limit=1`;
      const resp = await fetch(url, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const rows = await resp.json();
        cachedActive = rows?.[0]?.active === true;
        cacheExpiry = Date.now() + CACHE_TTL;
      }
    } catch {
      // Fail open — don't lock out users if Supabase is unavailable
    }
  }

  if (cachedActive) {
    return NextResponse.redirect(new URL('/lockdown', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
