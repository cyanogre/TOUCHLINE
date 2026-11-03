/* TOUCHLINE — arranque */
(function () {
  'use strict';
  const TL = window.TL;

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

  // Modo offline / app instalable (GitHub Pages sirve por https; en file:// no aplica)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
