// Service worker: guarda la app para que abra sin internet (red primero, caché si no hay señal).
var CACHE = 'narra-v2';
var FILES = ['./', 'index.html', 'styles.css', 'core.js', 'app.js', 'manifest.webmanifest', 'narra.svg', 'narra-180.png', 'narra-192.png', 'narra-512.png', 'narra-64.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache: siempre pregunta al servidor si hay versión nueva (si no hay señal, usa la guardada).
    fetch(e.request, { cache: 'no-cache' }).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
