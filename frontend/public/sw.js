const CACHE_NAME = 'roadwatch-cache-v2';
const MAP_CACHE_NAME = 'roadwatch-map-tiles';
const CHAT_CACHE_NAME = 'roadwatch-chat-v1';
const DYNAMIC_CACHE_NAME = 'roadwatch-dynamic-v1';
// NOTE: do NOT precache '/' — the HTML document must stay network-first so
// code changes take effect. Precaching it pins stale markup (e.g. old landing).
const STATIC_ASSETS = [
  '/next.svg',
  '/vercel.svg',
  '/globe.svg',
  '/file.svg',
  '/window.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MAP_CACHE_NAME && key !== CHAT_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1a. Cache Chat API responses for offline fallback
  // Network-first: show cached fallback when offline
  if (url.pathname.includes('/api/v1/chat') || url.pathname.includes('/api/v1/complaints')) {
    event.respondWith(
      caches.open(CHAT_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            const cloned = networkResponse.clone();
            cache.put(event.request, cloned);
            return networkResponse;
          })
          .catch(() => {
            return cache.match(event.request).then((cached) => {
              if (cached) return cached;
              return new Response(
                JSON.stringify({ type: 'content', content: 'You are offline. Cached responses replayed.' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            });
          });
      })
    );
    return;
  }

  // 1b. Cache other same-origin API routes with network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => cache.match(event.request).then((cached) => cached || new Response('', { status: 503 })));
      })
    );
    return;
  }

  // 1c. Navigation requests (HTML documents) — network-first.
  // Always fetch fresh markup so code changes take effect; fall back to the
  // cached document only when offline. Prevents pinning stale HTML.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() =>
            cache.match(event.request).then((cached) => cached || cache.match('/'))
          );
      })
    );
    return;
  }

  // 2. Cache Map Tiles (OpenStreetMap tiles) in 'roadwatch-map-tiles' namespace
  if (url.hostname.includes('tile.openstreetmap.org') || url.pathname.includes('/tile/')) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Ignore network errors in background
            });

          // Serve cached tile immediately if present, otherwise wait for network
          return cachedResponse || fetchPromise || new Response('', { status: 404, statusText: 'Offline Map Tile Not Cached' });
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate strategy for same-origin client assets
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    // Avoid caching Next.js dev server files (HMR, build streams, hot reloader webpack)
    if (
      url.pathname.includes('/_next/webpack-hmr') || 
      url.pathname.includes('webpack') || 
      url.pathname.includes('hot-update')
    ) {
      return;
    }
    
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((err) => {
              console.error('Service worker same-origin fetch failed:', err);
            });

          // Return cached response immediately if available, else await network response
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
