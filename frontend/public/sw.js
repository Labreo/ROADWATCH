const CACHE_NAME = 'roadwatch-cache-v1';
const MAP_CACHE_NAME = 'roadwatch-map-tiles';
const STATIC_ASSETS = [
  '/',
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
          if (key !== CACHE_NAME && key !== MAP_CACHE_NAME) {
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

  // 1. Cache Map Tiles (OpenStreetMap tiles) in 'roadwatch-map-tiles' namespace
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
