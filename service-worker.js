const CACHE_NAME = "focus-fuel-cache-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json", "/icon192.png", "/icon512.png"];

// Install Service Worker and cache essential files
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Forces the waiting SW to become active
});

// Activate and clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Makes the SW take control immediately
});

// Fetch event - try cache, fall back to network
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Serve from cache or fetch with redirect: 'follow'
      return (
        response ||
        fetch(event.request, { redirect: "follow" }).catch(() =>
          caches.match("/index.html")
        )
      );
    })
  );
});
