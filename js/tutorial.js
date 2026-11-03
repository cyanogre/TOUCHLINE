/* TOUCHLINE — tutorial guiado (resalta elementos de la interfaz paso a paso) */
(function () {
  'use strict';
  const TL = window.TL;

  const KEY = 'touchline.tutorial.';
  function done(id) { try { return localStorage.getItem(KEY + id) === '1'; } catch (e) { return false; } }
  function mark(id) { try { localStorage.setItem(KEY + id, '1'); } catch (e) { /* nada */ } }

  const TOURS = {
    main: [
      { title: '¡Bienvenido, míster! 👋', text: 'Vas a dirigir un club con jugadores reales de EA FC 27. Te enseño lo básico en 1 minuto.' },
      { sel: '.next-match', tab: 'home', title: 'Tu próximo partido', text: 'Juega en <b>directo</b> (ves a los jugadores, decides en los momentos clave) o pulsa <b>Resultado rápido</b> para avanzar la jornada.' },
      { sel: '.mgr-line', tab: 'home', title: 'La directiva', text: 'Cumple el objetivo para que la confianza no caiga a cero o te destituirán. Aquí también ves tu nivel de mánager.' },
      { sel: '.nav [data-tab="squad"]', title: 'Plantilla', text: 'Moral 🙂, forma física, contratos y tarjetas. Toca un jugador para renovarle, venderle o ver sus estadísticas.' },
      { sel: '.nav [data-tab="tactics"]', title: 'Tácticas', text: 'Elige formación, mentalidad y el once. Toca un puesto en el campo para cambiar al jugador.' },
      { sel: '.nav [data-tab="market"]', title: 'Mercado', text: 'Busca fichajes reales y negocia. El mercado abre en verano (hasta la jornada 3) e invierno. Los libres, siempre.' },
      { sel: '.nav [data-tab="club"]', title: 'Club', text: 'Finanzas, <b>patrocinios, marketing, préstamos y estadio</b> (pestaña Comercial) y tu <b>árbol de habilidades</b> (pestaña Mánager).' },
      { sel: '[data-act="news"]', tab: 'home', title: 'Noticias y polémicas', text: 'El mundo se mueve: fichajes, rumores, polémicas arbitrales y escándalos. Los de tu club llegan al buzón como <b>decisiones</b>.' },
      { title: '¡A por todas! 🏆', text: 'Consejo: firma ya los patrocinios libres en Club → Comercial y gasta tus puntos de habilidad. ¡Suerte!', end: true }
    ],
    match: [
      { sel: '#pitch', title: 'El partido, en vivo', text: 'Cada círculo es un jugador con su dorsal; el balón se mueve con la jugada. Tu equipo lleva borde blanco.' },
      { sel: '.speeds', title: 'Velocidad', text: 'De <b>x1</b> a <b>x16</b>. Cambia cuando quieras.' },
      { sel: '[data-act="mv-skipmenu"]', title: 'Saltar', text: 'Avanza hasta el próximo momento clave, el descanso, un minuto concreto o el final.' },
      { sel: '[data-act="mv-settings"]', title: 'Pausas automáticas', text: 'El partido se detiene en goles, rojas, lesiones, penaltis o VAR para que decidas. Configúralo aquí.' },
      { sel: '#mv-foot .seg', title: 'Mentalidad, cambios y táctica', text: 'Ataca si vas perdiendo, cierra si ganas. En el descanso darás la <b>charla</b> al vestuario.', end: true }
    ]
  };

  let cur = null;

  function start(id, force) {
    if (!force && done(id)) return false;
    cur = { id, i: 0 };
    show();
    return true;
  }

  function stop(finish) {
    const o = document.getElementById('tut');
    if (o) o.remove();
    if (cur) mark(cur.id);
    if (finish && TL.FX) TL.FX.confetti();
    if (cur && cur.onEnd) cur.onEnd();
    cur = null;
  }

  function show() {
    const step = TOURS[cur.id][cur.i];
    if (!step) { stop(true); return; }
    if (step.tab && TL.UI.tab !== step.tab && TL.Game.S && !document.getElementById('match')) { TL.UI.tab = step.tab; TL.UI.render(false); }
    let o = document.getElementById('tut');
    if (!o) {
      o = document.createElement('div');
      o.id = 'tut';
      o.innerHTML = '<div class="tut-hole"></div><div class="tut-card" role="dialog" aria-live="polite"></div>';
      document.body.appendChild(o);
    }
    const hole = o.querySelector('.tut-hole'), card = o.querySelector('.tut-card');
    const target = step.sel ? document.querySelector(step.sel) : null;
    const n = TOURS[cur.id].length;
    card.innerHTML = `<div class="tut-step">${cur.i + 1} / ${n}</div><h3>${step.title}</h3><p>${step.text}</p>
      <div class="btn-row"><button class="btn sm ghost" data-act="tut-skip">Saltar tutorial</button>
      <button class="btn sm primary" data-act="tut-next">${step.end ? '¡Entendido!' : 'Siguiente'}</button></div>`;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      const r = target.getBoundingClientRect();
      const pad = 6;
      Object.assign(hole.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      o.classList.remove('center');
      const below = r.bottom + 12 + 190 < innerHeight;
      card.style.left = Math.max(12, Math.min(innerWidth - 332, r.left + r.width / 2 - 160)) + 'px';
      card.style.top = below ? r.bottom + 12 + 'px' : Math.max(12, r.top - 12 - card.offsetHeight) + 'px';
    } else {
      hole.style.display = 'none';
      o.classList.add('center');
      card.style.left = ''; card.style.top = '';
    }
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  }

  const A = TL.UI.actions;
  A['tut-next'] = () => { TL.SFX && TL.SFX.click(); const last = TOURS[cur.id][cur.i].end; cur.i++; if (last) stop(true); else show(); };
  A['tut-skip'] = () => stop(false);
  A['tutorial'] = () => { try { localStorage.removeItem(KEY + 'main'); localStorage.removeItem(KEY + 'match'); } catch (e) { /* nada */ } TL.UI.tab = 'home'; TL.UI.render(false); setTimeout(() => start('main', true), 200); };
  window.addEventListener('resize', () => { if (cur) show(); });

  TL.Tutorial = { start, stop, done, active: () => !!cur, onEnd(fn) { if (cur) cur.onEnd = fn; } };
})();
