/** River's Edge Poker - offline service worker (network-first pages, stale-while-revalidate assets). */
const CACHE_NAME = 'rivers-edge-v1.1.2';
const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/apple-touch-icon.png', '/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', '/textures/felt-noise.svg', '/textures/wood-grain.svg', '/sounds/round-end.mp3', '/sounds/round-end.ogg'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE_ASSETS).catch(() => {})));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('version.json')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => { if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put('/index.html', c)); } return res; })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      const net = fetch(event.request).then(res => { if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(event.request, c)); } return res; }).catch(() => null);
      return cached || net.then(r => r || new Response('Offline', { status: 503 }));
    })
  );
});
