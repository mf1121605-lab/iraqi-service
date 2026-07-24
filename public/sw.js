// Service Worker v3 — Stale-While-Revalidate + Network timeout for weak connections
const CACHE_VERSION = 'iraqi-service-v3';
const STATIC_ASSETS = [
  '/brand/logo-icon-512.png',
  '/offline.html',
];

// ─── Install: pre-cache static shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: delete old cache versions ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Fetch with a timeout; rejects after `ms` milliseconds */
function fetchWithTimeout(request, ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** Cache a response clone, silently ignoring errors */
function cachePut(request, response) {
  if (!response || !response.ok) return;
  caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone())).catch(() => {});
}

// ─── Fetch strategies ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from the same origin (or CDN) — skip Supabase API
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('anthropic.com')) return;
  if (url.pathname.startsWith('/api/')) return;

  // ── Strategy 1: Cache-first for immutable static assets ──────────────────
  // Next.js hashes these filenames — once cached, forever fresh.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetchWithTimeout(request, 8000).then((res) => {
            cachePut(request, res);
            return res;
          })
      )
    );
    return;
  }

  // ── Strategy 2: Stale-While-Revalidate for Next.js JS/CSS chunks ─────────
  // Serve cached version immediately; refresh cache in background.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.match(/\.(js|css|json)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetchWithTimeout(request, 5000).then((res) => {
            if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
            return res;
          }).catch(() => cached); // on network failure return stale
          // Return cached immediately if available, otherwise wait for network
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // ── Strategy 3: Network-first with 3s timeout for page navigations ────────
  // On slow connections: 3 seconds max, then serve cached page or offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 3000)
        .then((res) => {
          cachePut(request, res);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // ── Strategy 4: Network-first for all other requests ─────────────────────
  event.respondWith(
    fetchWithTimeout(request, 5000).catch(() => caches.match(request))
  );
});

// ─── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'إشعار جديد', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'إشعار جديد', {
      body: data.body || '',
      icon: '/brand/logo-icon-512.png',
      badge: '/brand/logo-icon-512.png',
      data: { link: data.link || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(link) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
      return undefined;
    })
  );
});
