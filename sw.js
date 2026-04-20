const CACHE = 'nltc-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/auth.html',
  '/dashboard.html',
  '/admin.html',
  '/cbt.html',
  '/NLTC.png',
  '/nltc-dark.png',
  '/nltc-light.png',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Pass through external/API requests without caching
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('paystack') ||
    url.hostname.includes('fonts.') ||
    url.hostname.includes('cdnjs') ||
    url.pathname.startsWith('/paystack')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network.catch(() => caches.match('/index.html'));
    })
  );
});
