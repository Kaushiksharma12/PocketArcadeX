const CACHE_NAME = 'pocket-arcade-cache-v1';

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
      .then(() => self.skipWaiting())
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

// Fetch event - handle requests with a Stale-While-Revalidate strategy for static/page assets
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) schemes (like chrome-extension, data URIs, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Create a promise to fetch the latest resource from network in background
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
          console.warn('[Service Worker] Network fetch failed, using cache fallback if available:', err);
        });

      // If resource is in cache, return it immediately and let the network fetch update it in background
      if (cachedResponse) {
        return cachedResponse;
      }

      // If resource is not in cache, wait for the network request to resolve
      return fetchPromise || fetch(event.request);
    }).catch(() => {
      // Cache query failed or hit error, fallback to root or cache index if page request
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/');
      }
    })
  );
});
