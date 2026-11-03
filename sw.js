/* TOUCHLINE — service worker: juego offline y carga rápida en móvil.
 * La versión la sustituye el workflow de GitHub Pages por el commit. */
const VERSION = 'touchline-__BUILD__';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/formulas.js', 'js/util.js', 'js/events-data.js', 'js/manager.js', 'js/world.js', 'js/engine.js',
  'js/season.js', 'js/market.js', 'js/commerce.js', 'js/news.js', 'js/game.js', 'js/ui.js', 'js/matchview.js', 'js/main.js',
  'js/sfx.js', 'js/fx.js', 'js/pitch.js', 'js/tutorial.js', 'data/game/crests.js',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('touchline-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // La música usa peticiones por rangos: mejor no cachearla aquí
  if (url.pathname.endsWith('.mp3')) return;
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const isCrest = url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('football-logos');
  if (!sameOrigin && !isFont && !isCrest) return;
  // Datos y banderas: primero caché (no cambian entre versiones salvo regenerar)
  // Resto: red primero con respaldo en caché (así las actualizaciones llegan al momento)
  const cacheFirst = isFont || isCrest || url.pathname.includes('/data/game/') || url.pathname.includes('/assets/flags/');
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (cacheFirst) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
