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

  // Cache Map Tiles (OpenStreetMap tiles)
  if (url.hostname.includes('tile.openstreetmap.org') || url.pathname.includes('/tile/')) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve cached tile and fetch new in background
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {
              // Ignore network errors during background update
            });
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            // Fallback for missing tiles offline
            return new Response('', { status: 404, statusText: 'Offline Map Tile Not Cached' });
          });
        });
      })
    );
    return;
  }

  // Handle other HTTP GET requests (Stale-While-Revalidate for local assets, ignore POST/external)
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    // Avoid caching Next.js dev server files (HMR, etc.)
    if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('webpack')) {
      return;
    }
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Ignore network errors
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
