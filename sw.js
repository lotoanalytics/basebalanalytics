// ===== Baseball Analytics: caché para que la página abra rápido =====
// Regla del dueño: TODO sale de la caché al instante (y se actualiza por detrás),
// MENOS los datos de la base (el juego en vivo), que SIEMPRE vienen de internet y nunca se guardan.
// Si cambias una imagen SIN cambiarle el nombre, sube el número de VERSION.
const VERSION = 'ba-v8';
const BASE = [
  '/', '/index.html',
  '/fondo/estadio.webp',
  '/escudos/tigres.webp', '/escudos/leones.webp', '/escudos/aguilas.webp',
  '/escudos/gigantes.webp', '/escudos/toros.webp', '/escudos/estrellas.webp',
  '/manifest.webmanifest', '/iconos/icono.svg', '/iconos/icono-192.png', '/iconos/icono-512.png',
  '/iconos/icono-mascara-512.png', '/iconos/apple-touch-icon.png', '/iconos/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// ¿Es un dato del juego en vivo / juegos de hoy? (base de datos de Supabase o /api/)
function esEnVivo(url) {
  return url.hostname.endsWith('.supabase.co') || url.pathname.startsWith('/api/');
}

// En vivo / datos de la base: SIEMPRE de internet. Nunca se guardan ni se sirven de la caché
// (regla del dueño: el juego en vivo tiene que ser siempre dato real).
async function soloInternet(req) {
  return fetch(req, { cache: 'no-store' });
}

// Todo lo demás: se muestra lo guardado al instante y se actualiza por detrás.
async function cachePrimero(req, esPagina) {
  const cache = await caches.open(VERSION);
  const guardado = (await cache.match(req, { ignoreSearch: esPagina })) || (esPagina ? await cache.match('/') : null);
  const deRed = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(esPagina ? '/' : req, res.clone());
      return res;
    })
    .catch(() => guardado);
  return guardado || deRed;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (esEnVivo(url)) { e.respondWith(soloInternet(req)); return; }
  e.respondWith(cachePrimero(req, req.mode === 'navigate'));
});
