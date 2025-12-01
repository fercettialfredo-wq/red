const CACHE_NAME = 'ravens-access-v2'; // Cambiamos a v2 para forzar actualización
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
  // El skipWaiting hace que el SW nuevo se active de inmediato sin esperar a cerrar la app
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Esta parte BORRA los cachés viejos (v1) para que no se "sobrepongan" los estilos
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
  // Reclamar el control de los clientes inmediatamente
  return self.clients.claim(); 
});

self.addEventListener('fetch', event => {
  // ESTRATEGIA: Network First (Red primero), luego Caché
  // Esto asegura que siempre veas los cambios de colores y lógica si tienes internet.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la red responde bien, actualizamos el caché con la copia nueva
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
        // Si no hay internet, usamos lo guardado
        return caches.match(event.request);
      })
  );
});
