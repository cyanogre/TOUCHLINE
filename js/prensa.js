/* TOUCHLINE — rueda de prensa tras el partido.
 *
 * La sala (assets/prensa/sala.webp) con tres puntitos sentados: el jefe de prensa, tú y, a veces, un jugador.
 * La mesa (assets/prensa/mesa.webp) va delante y les tapa la mitad. En la pantalla de la izquierda pasan
 * anuncios y la pared de cuadros de colores se anima con los del club.
 * Los periodistas preguntan según lo que ha pasado (resultado, el mejor del partido, una roja, el árbitro, la
 * grada, el próximo rival…) y lo que contestas tiene consecuencias pequeñas y realistas: moral de la plantilla o
 * de un jugador, confianza de la directiva, afición y, si cargas contra el árbitro, alguna multa de Competición. */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, World: W, Game: G, UI } = TL;
  const esc = U.esc;
  const A = UI.actions;
  const MEDIA = ['Diario Deportivo', 'Radio Estadio', 'La Grada TV', 'El Balcón', 'Onda Fútbol', 'Mundo Gol', 'Pizarra FM', 'Al Larguero Digital'];
  const REPORTERS = ['Marta Ibarra', 'Luis Cardoso', 'Nerea Sanz', 'Pablo Ferrán', 'Lucía Mendo', 'Óscar Rial', 'Irene Valdés', 'Hugo Ledesma', 'Carla Brun', 'Dani Oteo'];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ------------------------------------------------------------ Contexto del partido
  function context(S, m, me) {
    const opp = 1 - me, oc = S.clubs[m.teams[opp].club];
    const gf = m.score[me], ga = m.score[opp], diff = gf - ga;
    const mine = e => e.team === me;
    const evs = m.events || [];
    const reds = evs.filter(e => e.type === 'red' && mine(e)).map(e => e.pid).filter(p => p != null);
    const ref = evs.some(e => (e.type === 'refmiss' && mine(e)) || (e.type === 'pen' && !mine(e) && e.team >= 0) || (e.type === 'disallowed' && mine(e)));
    const crowd = evs.some(e => e.type === 'crowd');
    const inj = evs.filter(e => e.type === 'inj' && mine(e)).map(e => e.pid).filter(p => p != null && S.players[p]);
    const notes = m.lastRatings || {};
    let star = null, best = 7.4;
    for (const id in notes) if (m.pl[id] && m.pl[id].team === me && notes[id] > best) { best = notes[id]; star = +id; }
    let next = null;
    try { const fx = TL.Season.nextFixture(S); if (fx) next = S.clubs[fx[0] === S.user ? fx[1] : fx[0]]; } catch (e) { next = null; }
    // Goles en orden: ¿remontada? ¿doblete o hat-trick de alguno de los tuyos?
    let run = 0, worst = 0;
    const byP = {};
    for (const e of evs) if (e.type === 'goal') {
      run += e.team === me ? 1 : -1; worst = Math.min(worst, run);
      if (e.team === me && e.pid != null && !e.og) byP[e.pid] = (byP[e.pid] || 0) + 1;
    }
    let hat = null; for (const id in byP) if (byP[id] >= 2 && (!hat || byP[id] > byP[hat])) hat = +id;
    const comeback = diff > 0 && worst <= -1;
    // Un canterano o un chaval que ha brillado
    let kid = null;
    for (const id in notes) { const p = S.players[id]; if (m.pl[id] && m.pl[id].team === me && p && p.age <= 21 && notes[id] >= 7 && +id !== star) { kid = +id; break; } }
    // Con quién se sienta: el mejor del partido, o el capitán (el de más caché de los que han jugado)
    let guest = star;
    if (guest == null) { const pl = Object.keys(m.pl).map(Number).filter(id => m.pl[id].team === me && S.players[id]); guest = pl.sort((a, b) => (S.players[b].ovr || 0) - (S.players[a].ovr || 0))[0]; }
    return { S, m, me, opp: oc, gf, ga, diff, reds, ref, crowd, inj, star, next, coachRed: !!m.coachOff, cup: !!m.cup, hat, hatN: hat != null ? byP[hat] : 0, comeback, kid, guest, clean: ga === 0 };
  }

  // ------------------------------------------------------------ Preguntas
  // Cada respuesta: { t: lo que dices, fx: { team, pl: [pid, d], board, fans, fine: [prob, euros], rival } }
  const QS = [
    { id: 'win', w: c => (c.diff > 0 ? 3 : 0), q: c => `Victoria ante el ${c.opp.name}. ¿Qué valoración hace?`, a: c => [
      { t: 'Todo el mérito es de los jugadores. Se han vaciado.', fx: { team: 2 } },
      { t: 'Contento, pero aún tenemos mucho que mejorar.', fx: { team: 0.5, board: 1 } },
      { t: 'Hoy hemos sido claramente superiores.', fx: { team: 1, fans: 0.005, rival: 1, rivalClub: c.opp } }] },
    { id: 'loss', w: c => (c.diff < 0 ? 3 : 0), q: c => `Derrota ${c.ga}-${c.gf}. ¿Qué ha fallado hoy?`, a: c => [
      { t: 'La responsabilidad es mía. Los jugadores lo han dado todo.', fx: { team: 2, board: -0.5 } },
      { t: 'Algunos no han estado a la altura y lo hablaremos dentro.', fx: { team: -3, board: 1 } },
      { t: c.ref ? 'El árbitro ha condicionado el partido.' : 'Hoy no ha salido nada. Toca levantarse.', fx: c.ref ? { fans: 0.006, board: -0.5, fine: [0.45, 6000] } : { team: 1 } }] },
    { id: 'draw', w: c => (c.diff === 0 ? 3 : 0), q: c => `Empate ante el ${c.opp.name}. ¿Sabe a poco?`, a: c => [
      { t: 'Es un punto que hay que valorar. El equipo ha competido.', fx: { team: 1.5 } },
      { t: 'Sí, hemos dejado escapar dos puntos.', fx: { team: -0.5, board: 0.5, fans: 0.003 } },
      { t: 'El rival también juega. Nos llevamos lo positivo.', fx: { team: 1 } }] },
    { id: 'star', w: c => (c.star != null ? 2.2 : 0), q: c => `${c.S.players[c.star].short} ha estado espectacular. ¿Es su mejor momento?`, a: c => [
      { t: `${c.S.players[c.star].short} es un futbolista diferente.`, fx: { pl: [c.star, 6], team: -0.3 } },
      { t: 'Es mérito de todo el equipo, no de uno solo.', fx: { team: 1, pl: [c.star, 1] } },
      { t: 'Le voy a exigir todavía más. Puede dar mucho más.', fx: { pl: [c.star, -2], board: 0.5 } }] },
    { id: 'red', w: c => (c.reds.length ? 2.6 : 0), q: c => `¿Cómo valora la expulsión de ${c.S.players[c.reds[0]].short}?`, a: c => [
      { t: 'Ha sido un error. Lo acepta y aprenderemos.', fx: { pl: [c.reds[0], -1], board: 0.5 } },
      { t: 'Me parece muy rigurosa.', fx: { fans: 0.004, fine: [0.25, 4000] } },
      { t: 'Hablaremos internamente. No puede volver a pasar.', fx: { pl: [c.reds[0], -4], board: 1 } }] },
    { id: 'ref', w: c => (c.ref ? 2.4 : 0), q: () => '¿Qué opina del arbitraje?', a: () => [
      { t: 'Prefiero no hablar del árbitro.', fx: { board: 0.5 } },
      { t: 'Nos ha perjudicado claramente. Así no se puede.', fx: { fans: 0.008, board: -0.5, fine: [0.45, 6000] } },
      { t: 'Sin excusas: hemos tenido que hacerlo mejor.', fx: { board: 1, team: 0.5 } }] },
    { id: 'coachRed', w: c => (c.coachRed ? 4 : 0), q: () => '¿Por qué ha terminado el partido en la grada?', a: () => [
      { t: 'Me he equivocado y pido disculpas.', fx: { board: 1 } },
      { t: 'Defenderé a mi equipo siempre, cueste lo que cueste.', fx: { fans: 0.006, team: 1, fine: [0.5, 5000] } },
      { t: 'No tengo nada que decir sobre eso.', fx: {} }] },
    { id: 'crowd', w: c => (c.crowd ? 2 : 0), q: () => '¿Qué le parece lo que ha pasado en la grada?', a: () => [
      { t: 'Lo condeno. Eso no es fútbol.', fx: { board: 1 } },
      { t: 'Ha sido un hecho aislado. Nuestra afición es ejemplar.', fx: { fans: 0.004 } },
      { t: 'De eso se encargará el club.', fx: {} }] },
    { id: 'inj', w: c => (c.inj.length ? 1.6 : 0), q: c => `¿Cómo está ${c.S.players[c.inj[0]].short}?`, a: c => [
      { t: 'Esperemos que no sea nada. Mañana le harán pruebas.', fx: { pl: [c.inj[0], 1] } },
      { t: 'Le vamos a echar mucho de menos.', fx: { pl: [c.inj[0], 2], team: -0.3 } },
      { t: 'Tenemos plantilla para suplir cualquier baja.', fx: { team: 0.5, pl: [c.inj[0], -1] } }] },
    { id: 'next', w: c => (c.next ? 1.2 : 0), q: c => `El próximo rival es el ${c.next.name}. ¿Cómo lo afronta?`, a: c => [
      { t: 'Con mucho respeto. Es un gran equipo.', fx: { team: 0.3 } },
      { t: 'Vamos a por los tres puntos, sin miedo.', fx: { team: 1, fans: 0.003, rival: 1, rivalClub: c.next } },
      { t: 'Partido a partido. Ahora toca descansar.', fx: {} }] },
    { id: 'comeback', w: c => (c.comeback ? 3.4 : 0), q: () => 'Remontada. ¿Qué les dijo para darle la vuelta?', a: () => [
      { t: 'Que creyeran. Este equipo no se rinde nunca.', fx: { team: 2.5, fans: 0.004 } },
      { t: 'Ajustamos un par de cosas y lo entendieron a la primera.', fx: { team: 1, board: 0.8 } },
      { t: 'No debimos ponernos por detrás. Eso hay que corregirlo.', fx: { team: -0.5, board: 1 } }] },
    { id: 'hat', w: c => (c.hat != null ? 2.6 : 0), q: c => `${c.hatN >= 3 ? 'Hat-trick' : 'Doblete'} de ${c.S.players[c.hat].short}. ¿Hasta dónde puede llegar?`, a: c => [
      { t: 'Hasta donde él quiera. Tiene hambre y talento.', fx: { pl: [c.hat, 5], team: -0.2 } },
      { t: 'Marca porque el equipo le pone el balón donde le gusta.', fx: { team: 1.2, pl: [c.hat, 1] } },
      { t: 'Que no se relaje. Mañana se vuelve a empezar.', fx: { pl: [c.hat, -1], board: 0.5 } }] },
    { id: 'kid', w: c => (c.kid != null ? 1.8 : 0), q: c => `${c.S.players[c.kid].short} ha dado un paso adelante. ¿Le veremos más?`, a: c => [
      { t: 'Se lo ha ganado. Contará más a partir de ahora.', fx: { pl: [c.kid, 6] } },
      { t: 'Poco a poco. No hay que quemar etapas.', fx: { pl: [c.kid, 1], board: 0.5 } },
      { t: 'Aquí nadie tiene el puesto asegurado.', fx: { team: 0.5, pl: [c.kid, -1] } }] },
    { id: 'clean', w: c => (c.clean && c.diff > 0 ? 1.4 : 0), q: () => 'Portería a cero. ¿La defensa es la clave?', a: () => [
      { t: 'Defendemos todos, desde el delantero.', fx: { team: 1.5 } },
      { t: 'Hoy sí. Otros días hemos sufrido demasiado.', fx: { board: 0.6 } },
      { t: 'Ojalá sigamos así mucho tiempo.', fx: { team: 0.5 } }] },
    { id: 'thrash', w: c => (c.diff <= -3 ? 3.5 : 0), q: c => `${c.ga}-${c.gf}. ¿Ha sido el peor día desde que está aquí?`, a: () => [
      { t: 'Sí. Pido perdón a la afición. Daremos la cara.', fx: { fans: 0.004, team: 1, board: 0.5 } },
      { t: 'Hay jugadores que tendrán que demostrar que merecen esta camiseta.', fx: { team: -3.5, board: 1.2, fans: 0.003 } },
      { t: 'Es un mal día. No voy a dramatizar.', fx: { board: -1 } }] },
    { id: 'board', w: c => (c.S.board && c.S.board.conf < 40 ? 1.8 : 0), q: () => 'Se habla de su continuidad. ¿Se siente respaldado?', a: () => [
      { t: 'Tengo la confianza del club y de los jugadores.', fx: { team: 0.5 } },
      { t: 'Mi trabajo habla por mí. No voy a entrar en eso.', fx: {} },
      { t: 'Si los resultados no llegan, el primero en irse seré yo.', fx: { board: 1.5, team: -0.5 } }] }
  ];

  /** Las preguntas de hoy: las que tocan, sin repetir, como mucho tres. */
  function questions(c) {
    const pool = QS.map(q => ({ q, w: q.w(c) })).filter(x => x.w > 0);
    const out = [];
    while (pool.length && out.length < 3) {
      const tot = pool.reduce((a, x) => a + x.w * (0.6 + Math.random() * 0.8), 0);
      let r = Math.random() * tot, k = 0;
      for (; k < pool.length - 1; k++) { r -= pool[k].w * (0.6 + Math.random() * 0.8); if (r <= 0) break; }
      out.push(pool.splice(k, 1)[0].q);
    }
    return out;
  }

  // ------------------------------------------------------------ Efectos
  function apply(S, fx, log) {
    const N = TL.News && TL.News.fx;
    if (!fx || !N) return;
    if (fx.team) { N.teamMor(S, fx.team); log.team = (log.team || 0) + fx.team; }
    if (fx.pl && S.players[fx.pl[0]]) { N.mor(S.players[fx.pl[0]], fx.pl[1]); log.pl = log.pl || {}; log.pl[fx.pl[0]] = (log.pl[fx.pl[0]] || 0) + fx.pl[1]; }
    if (fx.board) { N.board(S, fx.board); log.board = (log.board || 0) + fx.board; }
    if (fx.fans) { N.fans(S, fx.fans); log.fans = (log.fans || 0) + fx.fans; }
    if (fx.rival) { log.rival = true; const rv = fx.rivalClub || (R.c && (R.c.next || R.c.opp)); if (rv) S.prensaRival = { club: rv.id, season: S.season }; }
    if (fx.fine && Math.random() < fx.fine[0]) { const f = N.fineClub(S, S.user, fx.fine[1] * (0.8 + Math.random() * 0.4)); log.fine = (log.fine || 0) + f; }
  }
  /** Lo que ha supuesto, en palabras. */
  function summary(S, log) {
    const out = [];
    if (log.team > 1) out.push('La plantilla agradece tus palabras.');
    else if (log.team < -1) out.push('En el vestuario no ha sentado bien lo que has dicho.');
    for (const id in log.pl || {}) {
      const p = S.players[id], d = log.pl[id];
      if (d >= 3) out.push(`${p.short} se siente valorado.`);
      else if (d <= -2) out.push(`${p.short} se ha quedado tocado.`);
    }
    if (log.board >= 1) out.push('La directiva valora tu actitud.');
    else if (log.board <= -0.5) out.push('A la directiva no le ha gustado del todo.');
    if (log.fans > 0.004) out.push('La afición se queda con tu mensaje.');
    if (log.rival) out.push('Tus palabras llegarán al vestuario rival.');
    if (log.fine) out.push(`Competición abre expediente por tus declaraciones: multa de ${U.money(log.fine)}.`);
    if (!out.length) out.push('Una rueda de prensa tranquila. Sin titulares.');
    return out;
  }

  // ------------------------------------------------------------ Escena
  const R = { c: null, qs: [], k: 0, log: {}, timers: [], raf: 0, onDone: null };
  function el(id) { return document.getElementById(id); }

  function open(S, m, me, onDone) {
    const c = context(S, m, me);
    R.c = c; R.qs = questions(c); R.k = 0; R.log = {}; R.onDone = onDone || null;
    if (!R.qs.length) { if (onDone) onDone(); return; }
    const club = S.clubs[S.user], [c1, c2] = U.clubColors(club.name);
    const right = c.guest != null ? S.players[c.guest] : null;
    const root = document.createElement('div');
    root.id = 'prensa'; root.className = 'prensa';
    root.innerHTML = `<div class="pr-stage" style="--c1:${c1};--c2:${c2}">
        <img class="pr-bg" src="assets/prensa/sala.webp" alt="">
        <canvas class="pr-wall"></canvas>
        <div class="pr-tv"><div class="pr-ad"></div></div>
        <div class="pr-dot pr-l" title="Jefe de prensa"><i></i><b>Prensa</b></div>
        <div class="pr-dot pr-c me" title="${esc(S.manager)}"><i></i><b>Tú</b></div>
        ${right ? `<div class="pr-dot pr-r" title="${esc(right.name)}"><i></i><b>${esc(right.short)}</b></div>` : ''}
        <img class="pr-table" src="assets/prensa/mesa.webp" alt="">
        <div class="pr-say"></div>
        <div class="pr-flash"></div>
        <div class="pr-live"><i></i>EN DIRECTO</div>
      </div>
      <div class="pr-panel"><div class="pr-q"></div><div class="pr-as"></div></div>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('on'));
    startFx(root, c1, c2, club);
    ask();
  }

  function ask() {
    const q = R.qs[R.k], c = R.c;
    const panel = document.querySelector('#prensa .pr-panel');
    if (!q) return end();
    panel.querySelector('.pr-q').innerHTML = `<small>${esc(pick(REPORTERS))} · ${esc(pick(MEDIA))} <span class="pr-n">${R.k + 1}/${R.qs.length}</span></small>${esc(q.q(c))}`;
    const as = q.a(c);
    R.cur = as;
    panel.querySelector('.pr-as').innerHTML = as.map((a, k) => `<button class="btn block pr-a" data-act="pr-answer" data-k="${k}">${esc(a.t)}</button>`).join('');
    flash();
  }
  A['pr-answer'] = b => {
    const a = R.cur && R.cur[+b.dataset.k];
    if (!a) return;
    R.cur = null;
    apply(R.c.S, a.fx, R.log);
    // Tu puntito habla: bocadillo con lo que dices
    const say = document.querySelector('#prensa .pr-say'), me = document.querySelector('#prensa .pr-c');
    if (say) { say.textContent = a.t; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); }
    if (me) { me.classList.remove('talk'); void me.offsetWidth; me.classList.add('talk'); }
    // El jugador de la derecha reacciona si va por él: contento si le elogias, cabizbajo si le exiges
    const g = document.querySelector('#prensa .pr-r');
    if (g && a.fx && a.fx.pl && a.fx.pl[0] === R.c.guest) { const k = a.fx.pl[1] > 0 ? 'happy' : 'sad'; g.classList.remove('happy', 'sad'); void g.offsetWidth; g.classList.add(k); }
    // El de prensa asiente o se lleva la mano a la frente si hay multa a la vista
    const l = document.querySelector('#prensa .pr-l');
    if (l && a.fx) { const k = a.fx.fine ? 'sad' : 'nod'; l.classList.remove('nod', 'sad'); void l.offsetWidth; l.classList.add(k); }
    document.querySelectorAll('#prensa .pr-a').forEach(x => { x.disabled = true; });
    if (TL.SFX && TL.SFX.click) TL.SFX.click();
    R.timers.push(setTimeout(() => { R.k++; ask(); }, 1700));
  };
  function end() {
    const S = R.c.S;
    const panel = document.querySelector('#prensa .pr-panel');
    panel.querySelector('.pr-q').innerHTML = '<small>Fin de la rueda de prensa</small>Gracias, señores.';
    panel.querySelector('.pr-as').innerHTML = `<ul class="pr-sum">${summary(S, R.log).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <button class="btn primary block" data-act="pr-close">Salir de la sala</button>`;
    G.save();
  }
  A['pr-close'] = () => {
    R.timers.forEach(clearTimeout); R.timers = [];
    cancelAnimationFrame(R.raf);
    const root = el('prensa'); if (root) root.remove();
    const cb = R.onDone; R.onDone = null;
    if (cb) cb();
  };

  /** Flashes de las cámaras al preguntar. */
  function flash() {
    const f = document.querySelector('#prensa .pr-flash');
    if (!f) return;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      R.timers.push(setTimeout(() => {
        f.style.left = (Math.random() < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14) + '%';
        f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
      }, k * 260 + Math.random() * 200));
    }
  }

  /** Pared de cuadros que se anima con los colores del club, y anuncios en la pantalla. */
  function startFx(root, c1, c2, club) {
    const cv = root.querySelector('.pr-wall'), g = cv.getContext('2d');
    const COLS = 12, ROWS = 9;
    const pal = [c1, c2, '#ffffff', c1];
    const modes = ['ola', 'escudo', 'chispas', 'barrido'];
    let mode = 0, t0 = performance.now();
    const fit = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * (window.devicePixelRatio || 1))); cv.height = Math.max(1, Math.round(r.height * (window.devicePixelRatio || 1))); };
    fit();
    const loop = now => {
      if (!document.getElementById('prensa')) return;
      const t = (now - t0) / 1000;
      if (t > 7) { t0 = now; mode = (mode + 1) % modes.length; }
      if (cv.width < 4) fit();
      const W0 = cv.width, H0 = cv.height, cw = W0 / COLS, ch = H0 / ROWS;
      g.clearRect(0, 0, W0, H0);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        let a = 0, col = pal[(x + y) % pal.length];
        const m = modes[mode];
        if (m === 'ola') a = 0.5 + 0.5 * Math.sin(t * 3 - x * 0.6 - y * 0.35);
        else if (m === 'barrido') a = Math.max(0, 1 - Math.abs(((t * 4) % (COLS + 4)) - 2 - x) / 2);
        else if (m === 'chispas') a = (Math.sin(x * 12.9 + y * 78.2 + Math.floor(t * 3) * 37.7) * 43758.5 % 1 + 1) % 1 > 0.82 ? 1 : 0;
        else { const dx = x - 5.5, dy = y - 4, d = Math.sqrt(dx * dx + dy * dy); a = d < 2.2 + Math.sin(t * 2) * 0.6 ? 1 : 0; col = d < 1.4 ? '#ffffff' : c1; }
        if (a <= 0.02) continue;
        g.globalAlpha = a * 0.55;
        g.fillStyle = col;
        g.fillRect(x * cw + cw * 0.06, y * ch + ch * 0.08, cw * 0.88, ch * 0.84);
      }
      g.globalAlpha = 1;
      R.raf = requestAnimationFrame(loop);
    };
    R.raf = requestAnimationFrame(loop);
    // Anuncios: patrocinadores inventados que van pasando (y el escudo del club de vez en cuando)
    const ad = root.querySelector('.pr-ad');
    const SYL = ['ZU', 'KO', 'RA', 'MI', 'TEX', 'VOL', 'NEX', 'LO', 'PA', 'GRO', 'FI', 'TA', 'XO', 'BRU', 'NOR'];
    const BG = [['#e63946', '#fff'], ['#1d3557', '#a8dadc'], ['#ffb703', '#023047'], ['#2a9d8f', '#e9f5db'], ['#7b2cbf', '#ffd6ff'], ['#111', '#b8f53d'], ['#0077b6', '#caf0f8']];
    const TAG = ['Energía para ganar', 'Tu seguro de confianza', 'Siempre en juego', 'El sabor del fútbol', 'Conecta con tu equipo', 'Más rápido que un contraataque'];
    let n = 0;
    const next = () => {
      if (!document.getElementById('prensa')) return;
      n++;
      if (n % 4 === 0) { ad.style.background = c1; ad.style.color = c2; ad.innerHTML = `<b>${esc(club.name)}</b><span>Juntos, siempre</span>`; }
      else {
        const [bg, fg] = pick(BG), word = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => pick(SYL)).join('');
        ad.style.background = bg; ad.style.color = fg; ad.innerHTML = `<b>${word}</b><span>${pick(TAG)}</span>`;
      }
      ad.classList.remove('in'); void ad.offsetWidth; ad.classList.add('in');
      R.timers.push(setTimeout(next, 3200));
    };
    next();
  }

  /** ¿Hay rueda de prensa hoy? Tras los partidos que dan que hablar, siempre; si no, a veces. */
  function offered(S, m, me) {
    const c = context(S, m, me);
    if (c.coachRed || c.reds.length || c.ref || c.crowd || Math.abs(c.diff) >= 3 || c.cup) return true;
    return Math.random() < 0.45;
  }

  TL.Prensa = { open, offered, _questions: questions, _context: context };
})();
