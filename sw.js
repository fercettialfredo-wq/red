const CACHE_NAME = 'ravens-access-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './icons/logo.png',
  './icons/residente.svg',
  './icons/visita.svg',
  './icons/evento.svg',
  './icons/proveedor.svg',
  './icons/servicio.svg',
  './icons/qr.svg',
  './icons/incidencias.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
