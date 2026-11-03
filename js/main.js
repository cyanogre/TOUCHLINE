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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
