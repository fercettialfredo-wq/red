// CAMBIO 1: Subimos la versión a 'v2' para obligar al navegador a borrar lo viejo
const CACHE_NAME = 'ravens-access-v3';

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
  // Obliga al SW nuevo a activarse inmediatamente
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // CAMBIO 2: Borrar cachés viejos (v1) para que no se mezclen estilos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // CAMBIO 3: Estrategia "Network First" (Internet primero, caché después)
  // Esto asegura que siempre veas los cambios recientes.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
