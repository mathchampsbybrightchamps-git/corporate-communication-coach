const CACHE_NAME = 'ccos-cache-v1';
const ASSETS = [
  './index.html',
  './index.css',
  './app.js',
  './manifest.json',
  './brand_system/brand_tokens.css',
  './brand_system/animation_system.css',
  './start_screens/splash.html',
  './start_screens/auth.html',
  './start_screens/start_screens.css',
  './start_screens/start_screens.js',
  './permissions/permissions.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
