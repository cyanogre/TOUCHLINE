/* TOUCHLINE — arranque */
(function () {
  'use strict';
  const TL = window.TL;
  TL.VERSION = '3.1';

  function boot() {
    TL.UI.renderTitle();
    // Guarda al salir o al pasar la app a segundo plano (móvil)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && TL.Game.S && !document.getElementById('match')) TL.Game.save();
    });
    window.addEventListener('error', e => {
      console.error(e.error || e.message);
      TL.UI.toast('Error inesperado: ' + (e.message || 'consulta la consola'), true);
    });
  }

  // Modo offline / app instalable (GitHub Pages sirve por https; en file:// no aplica).
  // Al publicar una versión nueva, el service worker se actualiza y la página se recarga
  // sola (salvo en mitad de un partido, para no perderlo).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      if (document.getElementById('match')) { TL.UI.toast('Hay una versión nueva: se aplicará al recargar la página.'); return; }
      reloading = true;
      if (TL.Game.S) TL.Game.save();
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then(reg => reg.update())
        .catch(() => {});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
