const CACHE_NAME = 'pocket-arcade-cache-1782447069737';

// Initial core assets to cache on service worker install
const ASSETS_TO_CACHE = [
  '/',
  '/games',
  '/tictactoe',
  '/connect4',
  '/chess',
  '/snake',
  '/ludo',
  '/snakeladder',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

// Install event - precache the core shell and routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        // Use map/all so if one request fails (e.g. during development), it doesn't break the installation of others
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn(`[Service Worker] Failed to precache ${url}:`, err))
          )
        );
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with a hybrid strategy:
// Network-First for HTML, JS, JSON to prevent serving stale code/pages and avoid chunk loading errors.
// Cache-First / Stale-While-Revalidate for other static assets (images, icons, favicon) to support offline.
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) schemes
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isHtml = event.request.headers.get('accept')?.includes('text/html');
  const isJsOrJson = url.pathname.endsWith('.js') || url.pathname.endsWith('.json') || url.pathname.includes('_next/');

  if (isHtml || isJsOrJson) {
    // Network-First Strategy
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (isHtml) return caches.match('/');
          });
        })
    );
  } else {
    // Cache-First / Stale-While-Revalidate Strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[Service Worker] Static fetch failed:', err);
          });

        return cachedResponse || fetchPromise || fetch(event.request);
      })
    );
  }
});

// Message event - trigger skipWaiting when instructed by the client UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
