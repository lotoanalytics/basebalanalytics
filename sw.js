// ===== Baseball Analytics: caché para que la página abra rápido =====
// Regla del dueño: TODO sale de la caché al instante (y se actualiza por detrás),
// MENOS el juego en vivo / juegos de hoy, que siempre se busca primero en internet.
// Si cambias una imagen SIN cambiarle el nombre, sube el número de VERSION.
const VERSION = 'ba-v2';
const BASE = [
  '/', '/index.html',
  '/fondo/estadio.webp',
  '/escudos/tigres.webp', '/escudos/leones.webp', '/escudos/aguilas.webp',
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

// En vivo: primero internet (máx. 5 s); si no hay, lo último guardado.
async function redPrimero(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, no) => setTimeout(() => no(new Error('lento')), 5000)),
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const guardado = await cache.match(req);
    if (guardado) return guardado;
    throw err;
  }
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
  if (esEnVivo(url)) { e.respondWith(redPrimero(req)); return; }
  e.respondWith(cachePrimero(req, req.mode === 'navigate'));
});
