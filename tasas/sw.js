/* ==========================================================================
   TASAS GLOBAL · Service Worker
   Guarda la interfaz para que abra rápido y funcione sin conexión.
   Las tasas NO se cachean aquí: siempre se piden frescas al Web App.
   ========================================================================== */

const CACHE_NAME = 'tasas-global-official-v1';
const CACHE_PREFIX = 'tasas-global-';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/script.js',
  './manifest.webmanifest',
  './assets/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME
            ? caches.delete(key)
            : null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // APIs, banderas y fuentes: sin caché

  event.respondWith(
    fetch(request)
      .then(function (response) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (hit) {
          if (hit) return hit;
          if (request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Sin conexión' });
        });
      })
  );
});
