/* TOUCHLINE — tutorial guiado, contado por el Profe (diálogos estilo novela visual) */
(function () {
  'use strict';
  const TL = window.TL;

  const KEY = 'touchline.tutorial.';
  function done(id) { try { return localStorage.getItem(KEY + id) === '1'; } catch (e) { return false; } }
  function mark(id) { try { localStorage.setItem(KEY + id, '1'); } catch (e) { /* nada */ } }

  const club = S => (S ? S.clubs[S.user].name : 'el club');
  const TOURS = {
    main: [
      { text: '¡Hombre, por fin! Soy Tomás Arrieta, aunque en los banquillos todos me llaman **el Profe**.', emo: 'happy' },
      { text: S => `La directiva de ${club(S)} me ha pedido que te forme como mánager. Treinta años entrenando dan para muchos consejos.` },
      { sel: '.next-match', tab: 'home', text: 'Lo más importante: el **próximo partido**. Juégalo en **directo** para ver a los chavales y decidir en los momentos clave, o dale a **Resultado rápido** si vas con prisa.' },
      { sel: '.mgr-line', tab: 'home', text: S => `La **directiva** te pide: ${S.board.text.toLowerCase()}. Si su confianza llega a cero, te echan. Créeme, me ha pasado.`, emo: 'worried' },
      { sel: '.nav [data-tab="squad"]', text: 'En **Plantilla** ves la moral, la forma física, los contratos y las tarjetas. Ojo con los contratos que acaban: si no renuevas, se van gratis.' },
      { sel: '.nav [data-tab="tactics"]', text: '**Tácticas**: sistema, mentalidad y el once. Después de cada partido te dejo ahí mi **repaso**: qué hizo el rival y qué podríamos haber hecho mejor.', emo: 'thinking' },
      { sel: '.nav [data-tab="market"]', text: 'El **Mercado** abre en verano hasta la jornada 3, y en invierno. Los agentes libres se fichan siempre.' },
      { sel: '.nav [data-tab="club"]', text: 'En **Club** llevas el dinero: patrocinios, préstamos, marketing… y tu crecimiento como mánager.' },
      { sel: '[data-act="news"]', tab: 'home', text: 'Y lee la prensa: fichajes, polémicas, escándalos… Los problemas de tu vestuario te llegarán al buzón como **decisiones**.' },
      { sel: '[data-act="help"]', text: 'Si te pierdes, pulsa el **?** de arriba y vengo corriendo. Ahí también está mi **escuela**: lecciones para aprender a ganar, aunque no sepas nada de fútbol.', emo: 'happy' },
      { text: 'Primer consejo gratis: firma ya los **patrocinios libres** en Club → Comercial. Es dinero que entra sin jugar. ¡A trabajar, míster!', emo: 'proud' }
    ],
    match: [
      { sel: '#pitch', text: 'Bienvenido al **césped**. Cada círculo es un jugador con su dorsal; los tuyos llevan borde blanco. El balón va donde va la jugada.' },
      { sel: '.speeds', text: 'La **velocidad**, de x1 a x16. Yo veo los partidos tranquilo, pero tú haz lo que quieras.' },
      { sel: '[data-act="mv-skipmenu"]', text: '**Saltar** avanza hasta el próximo momento clave, el descanso, un minuto o el final.' },
      { sel: '[data-act="mv-settings"]', text: 'El partido se **para solo** en goles, rojas, lesiones, penaltis o VAR, para que decidas. Aquí lo configuras.', emo: 'thinking' },
      { sel: '#mv-foot .seg', text: 'La **mentalidad**: ataca si vas perdiendo, cierra si vas ganando. Y en el descanso me toca a mí… digo, a ti: la **charla**.', emo: 'laugh' }
    ]
  };

  let active = null;
  function start(id, force) {
    if (!force && done(id)) return false;
    active = { id, onEnd: null };
    TL.Mentor.say(TOURS[id], {
      dim: true,
      onEnd: () => {
        mark(id);
        const cb = active && active.onEnd;
        active = null;
        if (id === 'main' && TL.FX) TL.FX.confetti();
        if (cb) cb();
      }
    });
    return true;
  }

  TL.UI.actions.tutorial = () => {
    try { localStorage.removeItem(KEY + 'main'); localStorage.removeItem(KEY + 'match'); } catch (e) { /* nada */ }
    TL.UI.tab = 'home'; TL.UI.render(false);
    setTimeout(() => start('main', true), 200);
  };

  TL.Tutorial = { start, done, TOURS, active: () => !!active, onEnd(fn) { if (active) active.onEnd = fn; } };
})();
