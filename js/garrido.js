/* TOUCHLINE — la entrevista de fin de temporada con Aurelio Garrido (El Balcón).
 *
 * Datos en data/game/prensa/temporada.js. Al cerrar la temporada, desde la hoja del resumen: cuatro preguntas
 * (balance, el momento, quién eres y lo que viene). Las respuestas mueven tu personalidad oculta (js/persona.js) y
 * Garrido apostilla cada una. Al final escribe el título del capítulo de esa temporada en tu biografía no autorizada
 * y publica su columna de cierre en Noticias (Opinión). */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, UI } = TL;
  const esc = U.esc, A = UI.actions;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const DB = () => (window.TL_PRENSA_DB || {}).temporada;
  const PE = () => TL.Persona;
  const STYLE = { hum: ['🙏', 'Humilde'], pro: ['🔥', 'Motivadora'], dur: ['🧱', 'Exigente'], pol: ['🌶️', 'Polémica'], eva: ['🤐', 'Evasiva'], tec: ['🧠', 'Técnica'], amb: ['🚀', 'Ambiciosa'], hu: ['😂', 'Humor'] };
  const I = { S: null, sum: null, qs: [], k: 0, res: null };

  /** Cómo ha ido la temporada, en una palabra. */
  function outcome(sum) {
    if (sum.fired) return 'fired';
    if (sum.moved === 'down') return 'down';
    if (sum.moved === 'up') return 'up';
    if (sum.pos === 1 || (sum.cup && sum.cup.reached === 'Campeón')) return 'great';
    return sum.pos <= sum.target ? 'good' : 'bad';
  }
  const can = (S, sum) => !!(DB() && PE() && S && S.mode !== 'tour' && sum && PE().st(S).gar !== sum.season);
  function fillT(S, t) {
    const P = PE(), d = P.known(S), sum = I.sum || {};
    return P.fill(S, t, d).replace(/\{(\w+)\}/g, (m, k) => ({ pos: sum.pos ? `${sum.pos}.º` : '', temporada: U.seasonLabel(sum.season || S.season), mote: S.manager })[k] ?? m);
  }

  function open(S, sum) {
    if (!can(S, sum)) return;
    const D = DB(), res = outcome(sum), P = PE();
    I.S = S; I.sum = sum; I.k = 0; I.res = res;
    const tu = P.known(S) ? D.tu.known : D.tu.unknown;
    I.qs = [D.balance[res], pick(D.momento), tu, res === 'fired' ? D.futuro.fired : D.futuro.stay];
    const root = document.createElement('div');
    root.id = 'garrido'; root.className = 'gar';
    root.innerHTML = `<div class="gar-card">
        <div class="gar-mast">El Balcón <small>Entrevista de fin de temporada · ${esc(U.seasonLabel(sum.season))}</small></div>
        <div class="gar-who"><i class="gar-av">AG</i><div><b>Aurelio Garrido</b><small>«La columna de Garrido»</small></div><span class="gar-n"></span></div>
        <p class="gar-intro">${esc(fillT(S, pick(D.intro[res])))}</p>
        <div class="gar-body"></div>
      </div>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('on'));
    ask();
  }
  function ask() {
    const root = document.getElementById('garrido');
    if (!root) return;
    const q = I.qs[I.k];
    if (!q) return finish();
    root.querySelector('.gar-n').textContent = `${I.k + 1}/${I.qs.length}`;
    root.querySelector('.gar-body').innerHTML = `<div class="gar-q">${esc(fillT(I.S, q.q))}</div>
      <div class="gar-as">${q.o.map((o, k) => `<button class="btn block gar-a" data-act="gar-a" data-k="${k}"><span>${esc(fillT(I.S, o.t))}</span>
        <small>${!STYLE[o.cat] ? '' : TL.Prensa && !TL.Prensa.styleKnown(I.S, o.cat) ? '❔ Sin probar' : STYLE[o.cat][0] + ' ' + esc(STYLE[o.cat][1])}</small></button>`).join('')}</div>`;
  }
  A['gar-a'] = b => {
    const q = I.qs[I.k], o = q && q.o[+b.dataset.k], S = I.S, P = PE();
    if (!o) return;
    // Lo que contestas también dice quién eres
    if (o.cat) P.signal(S, 'estilo:' + o.cat, 1.5);
    const learned = o.cat && TL.Prensa && TL.Prensa.learnStyle ? TL.Prensa.learnStyle(S, o.cat) : null;
    if (o.sig) P.signal(S, o.sig);
    if (o.sigDom) { const d = P.dominant(S); if (d) P.signal(S, { [d]: o.sigDom }); }
    I.k++;
    const root = document.getElementById('garrido');
    root.querySelector('.gar-body').innerHTML = `<div class="gar-q done">${esc(fillT(S, q.q))}</div>
      <blockquote class="gar-me">«${esc(fillT(S, o.t))}»</blockquote>
      <p class="gar-r">${esc(fillT(S, o.r || ''))}</p>${learned ? `<p class="gar-learn">💡 ${esc(learned)}</p>` : ''}
      <button class="btn primary block" data-act="gar-next">${I.k < I.qs.length ? 'Siguiente pregunta' : 'Que escriba'}</button>`;
  };
  A['gar-next'] = () => ask();

  /** Garrido cierra la libreta: título del capítulo en tu biografía y la columna de cierre. */
  function finish() {
    const S = I.S, sum = I.sum, D = DB(), P = PE(), res = I.res;
    const d = P.known(S);
    const good = res === 'great' || res === 'good' || res === 'up';
    const own = d && D.persona[d] && Math.random() < 0.7 ? D.persona[d][good ? 'pos' : 'neg'] : null;
    const title = fillT(S, pick(own || D.titulos[res]));
    const n = P.bioList(S).filter(b => b.cap).length + 1;
    P.chapter(S, sum.season, title);
    P.st(S).gar = sum.season;
    const col = fillT(S, pick(D.cierre[res]));
    P.column(S, col, `Garrido: «${title}»`);
    const root = document.getElementById('garrido');
    root.querySelector('.gar-n').textContent = '';
    root.querySelector('.gar-intro').remove();
    root.querySelector('.gar-body').innerHTML = `<div class="gar-chap"><small>Biografía no autorizada · capítulo ${n}</small><h3>«${esc(title)}»</h3></div>
      <p class="gar-col">${esc(col)}</p><p class="gar-sign">— Aurelio Garrido, El Balcón</p>
      <button class="btn primary block" data-act="gar-close">Cerrar la libreta</button>`;
    if (TL.FX && TL.FX.sparkle) { try { TL.FX.sparkle(root.querySelector('.gar-chap')); } catch (e) { /* adorno */ } }
    const btn = document.querySelector('.sheet .gar-btn');
    if (btn) btn.outerHTML = `<p class="note mt gar-done">🖋️ Capítulo ${n} de tu biografía: «${esc(title)}»</p>`;
    if (TL.Game) TL.Game.save();
  }
  A['gar-close'] = () => { const r = document.getElementById('garrido'); if (r) r.remove(); };
  A['gar-int'] = () => open(TL.Game.S, UI.seasonSum);

  /** Botón para la hoja de fin de temporada. */
  function button(S, sum) {
    return can(S, sum) ? '<button class="btn block mt gar-btn" data-act="gar-int">🖋️ Entrevista con Garrido<small>El Balcón quiere tu versión de la temporada</small></button>' : '';
  }

  TL.Garrido = { open, button, outcome, can };
})();
