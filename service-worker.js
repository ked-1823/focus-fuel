const CACHE_NAME = "focus-fuel-v2"; // Increment version on updates

const urlsToCache = [
  "/offline.html", // Make sure this is first or early
  "/breath.css",
  "/breath.html",
  "/challenge.css",
  "/challenge.html",
  "/challenge.js",
  "/dashboard.css",
  "/firebase-config.js",
  "/focus.css",
  "/focus.html",
  "/focus.js",
  "/googlebe2d3a06531aa0b7.html",
  "/habit.css",
  "/habit.html",
  "/habit.js",
  "/icon192.png",
  "/icon512.png",
  "/index.html",
  "/manifest.json",
  "/pomo.css",
  "/pomo.html",
  "/pomo.js",
  "/qr.jpg",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// Install event — pre-cache essential assets
self.addEventListener('install', event => {
  console.log('✅ Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — serve from cache, else fallback to offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and store in cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Return from cache or offline fallback
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || caches.match('/offline.html');
        });
      })
  );
});
