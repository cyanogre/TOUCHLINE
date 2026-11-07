/* TOUCHLINE — service worker: juego offline y carga rápida en móvil.
 * La versión la sustituye el workflow de GitHub Pages por el commit. */
const VERSION = 'touchline-v6-__BUILD__'; // sube el número en cada versión si publicas desde una rama
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/icons.js', 'js/i18n.js', 'data/i18n/ui.js', 'data/i18n/ui2.js', 'data/i18n/club.js', 'data/i18n/match.js', 'data/i18n/social.js', 'data/i18n/news.js', 'data/i18n/profe.js', 'data/i18n/school.js', 'js/formulas.js', 'js/util.js', 'js/events-data.js', 'js/manager.js', 'js/staff.js', 'js/world.js', 'js/engine.js', 'js/coach.js',
  'js/season.js', 'js/market.js', 'js/commerce.js', 'js/news.js', 'js/game.js', 'js/charts.js', 'js/ui.js', 'js/matchview.js', 'js/main.js',
  'js/sfx.js', 'js/fx.js', 'js/pitch.js', 'js/tutorial.js', 'js/career.js', 'js/locker.js', 'js/cups.js', 'js/tournament.js', 'js/mentor.js', 'js/school.js',
  'assets/mentor/neutral-talk.png', 'assets/mentor/neutral-idle.png', 'data/game/crests.js', 'data/game/kits.js',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' evita guardar copias viejas del caché HTTP del navegador
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
      // Siempre se comprueba con el servidor (ETag/304): las nuevas versiones llegan al instante
      const res = req.mode === 'navigate'
        ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        : await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
