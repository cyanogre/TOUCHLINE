/* TOUCHLINE — inteligencia del Panel: el informe del próximo rival, el plan de partido y las operaciones especiales.
 *
 * - Informe: su once probable (o el exacto, si lo has espiado) con el cansancio REAL de cada línea (p.fit), sus bajas,
 *   el estilo de su entrenador, su forma y su jugador clave.
 * - Plan: 2-3 recomendaciones sacadas del informe que se comprueban con tu táctica. Las que cumplas al empezar el
 *   partido dan un pequeño empujón (TL.Intel.boost, desde prensaBoost en js/engine.js).
 * - Operaciones (data/game/operaciones.js): las propuestas locas. Solo en el modo fantasía.
 * Sin probabilidades de resultado: todo se cuenta con palabras. */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, F } = TL;
  const W = () => TL.World;
  const st = S => S.intel || (S.intel = {});
  const fantasy = S => !!(TL.Events && TL.Events.fantasy && TL.Events.fantasy(S));
  const LINES = ['Portería', 'Defensa', 'Medio', 'Ataque'];

  /** El próximo partido del usuario: copa pendiente o la jornada de liga. */
  function next(S) {
    if (!S || S.user == null || S.over || S.mode === 'tour') return null;
    const cp = TL.Cups && TL.Cups.pendingUser(S);
    if (cp) { const opp = cp.home === S.user ? cp.away : cp.home; return { opp, home: cp.home === S.user, cup: true, label: cp.label }; }
    const fx = TL.Season.nextFixture(S);
    if (!fx) return null;
    return { opp: fx[0] === S.user ? fx[1] : fx[0], home: fx[0] === S.user, cup: false, label: `Jornada ${S.week + 1}` };
  }
  const keyOf = (S, opp) => `${S.season}:${S.week}:${opp}`;

  /** Forma reciente (V/E/D) de un club en liga. */
  function formOf(S, id) {
    const out = [];
    for (let w = 0; w < S.week && w < S.fixtures.length; w++) for (const f of S.fixtures[w] || []) {
      if (f[2] < 0 || (f[0] !== id && f[1] !== id)) continue;
      const d = f[0] === id ? f[2] - f[3] : f[3] - f[2];
      out.push(d > 0 ? 'V' : d < 0 ? 'D' : 'E');
    }
    return out.slice(-5);
  }
  const fitWord = v => (v >= 92 ? 'frescos' : v >= 84 ? 'bien' : v >= 76 ? 'algo tocados' : v >= 68 ? 'cansados' : 'fundidos');
  /** La misma idea para una línea («su defensa llega fundida», «su ataque llega fresco»). */
  const lineWord = (v, fem) => (v >= 84 && v < 92 ? 'bien' : (v >= 92 ? 'fresc' : v >= 76 ? 'algo tocad' : v >= 68 ? 'cansad' : 'fundid') + (fem ? 'a' : 'o'));

  /** El informe del rival (se calcula una vez por partido para que no cambie cada vez que abres el panel). */
  function report(S) {
    const nm = next(S);
    if (!nm) return null;
    const I = st(S), key = keyOf(S, nm.opp);
    const lock = I.lock && I.lock.key === key ? I.lock : null;
    if (!I.rep || I.rep.key !== key || (lock && !I.rep.exact)) {
      const b = lock || TL.Coach.lineup(S, nm.opp, S.user);
      I.rep = { key, formation: b.formation, ids: b.ids.slice(), exact: !!lock, ment: lock ? lock.mentality : null };
    }
    const R = I.rep, P = id => S.players[id];
    const xi = R.ids.map(P).filter(p => p && p.club === nm.opp);
    const lines = [0, 1, 2, 3].map(l => {
      const ps = xi.filter(p => F.LINE[p.pos] === l);
      const fit = ps.length ? Math.round(U.sum(ps, p => p.fit) / ps.length) : 100;
      return { l, name: LINES[l], fit, word: lineWord(fit, l <= 1), ps: ps.map(p => ({ id: p.id, short: p.short, pos: p.pos, fit: p.fit, ovr: p.ovr })) };
    });
    const sq = W().squad(S, nm.opp).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 16);
    const out = sq.filter(p => p.inj > 0 || p.sus > 0).map(p => ({ id: p.id, short: p.short, pos: p.pos, line: F.LINE[p.pos], why: p.inj > 0 ? 'lesionado' : 'sancionado' }));
    const key0 = xi.slice().sort((a, b) => b.ovr - a.ovr)[0];
    const co = TL.Coach.of(S, nm.opp), style = TL.Coach.styleOf(co);
    const T = TL.Season.table(S), pos = T.findIndex(r => r.id === nm.opp) + 1;
    // Lo que dice el escáner, en frases
    const say = [];
    for (const L of lines.slice(1)) if (L.fit < 80) say.push(`Su ${L.name.toLowerCase()} llega ${L.word}.`);
    const outD = out.filter(o => o.line === 1).length, outA = out.filter(o => o.line === 3).length;
    if (outD >= 2) say.push(`Le faltan ${outD} defensas habituales.`);
    if (outA >= 1) say.push(outA > 1 ? `Sin ${outA} de sus delanteros.` : 'Le falta un delantero habitual.');
    say.push(`Su entrenador juega ${style.name === 'equilibrado' ? 'equilibrado' : 'al estilo ' + style.name}.`);
    if (key0) say.push(`Peligro: ${key0.short}${key0.fit < 78 ? ', aunque llega justo de fuerzas' : ''}.`);
    return { ...nm, club: S.clubs[nm.opp], formation: R.formation, exact: R.exact, ment: R.ment, lines, out, key: key0 ? { id: key0.id, short: key0.short, fit: key0.fit } : null,
      style: style.id, styleName: style.name, form: formOf(S, nm.opp), pos, say };
  }

  // ------------------------------------------------------------ Plan de partido
  const ATT = ['4-3-3', '3-4-3', '4-2-3-1', '4-1-2-1-2'], DEF = ['5-3-2', '4-5-1', '5-4-1', '4-4-2'];
  const MENT = ['defensiva', 'equilibrada', 'ofensiva'];
  /** 2-3 recomendaciones sacadas del informe. Cada una lleva su comprobación (mentalidad, formación o rotación). */
  function plan(S) {
    const r = report(S);
    if (!r) return null;
    const I = st(S);
    if (I.plan && I.plan.key === keyOf(S, r.opp)) return I.plan;
    const L = r.lines, recs = [];
    const add = (id, t, why, chk) => { if (recs.length < 3 && !recs.some(x => x.id === id)) recs.push({ id, t, why, chk }); };
    const wantsAtt = L[1].fit < 80 || r.out.filter(o => o.line === 1).length >= 2 || r.style === 'defensivo';
    const wantsCalm = r.style === 'contra' || r.style === 'ofensivo';
    if (wantsAtt && !(wantsCalm && L[1].fit >= 76)) add('ataca', 'Sal a por ellos con mentalidad ofensiva', L[1].fit < 80 ? `Su defensa llega ${L[1].word}.` : r.style === 'defensivo' ? 'Se van a encerrar atrás.' : 'Su defensa está en cuadro.', { ment: [2] });
    else if (wantsCalm) add('calma', 'No te vuelques: mentalidad defensiva', r.style === 'contra' ? 'Viven del contragolpe: si te abres, te matan.' : 'Atacan con mucha gente.', { ment: [0] });
    if (L[3].fit < 80 && !recs.some(x => x.id === 'calma')) add('adelanta', 'Adelanta líneas: no te metas atrás', `Su ataque llega ${L[3].word}.`, { ment: [1, 2] });
    if (r.style === 'posesion') add('presiona', 'Presiona arriba con un dibujo ofensivo', 'Les gusta tener el balón: que no respiren.', { form: ATT });
    if (r.style === 'ofensivo') add('cierra', 'Refuerza atrás con un dibujo más defensivo', 'Atacan con todo lo que tienen.', { form: DEF });
    if (L[2].fit < 80) add('medio', 'Gana el centro del campo con un dibujo de cinco medios o 4-2-3-1', `Su medio llega ${L[2].word}.`, { form: ['4-5-1', '3-5-2', '4-2-3-1', '5-3-2'] });
    // Tu once: si hay titulares muy cansados, rota
    const mine = (S.tactics.slots || []).map(id => S.players[id]).filter(p => p && p.club === S.user);
    if (mine.some(p => p.fit < 74)) add('rota', 'Rota: que nadie salga muy cansado', 'Tienes titulares con las piernas justas.', { fit: 74 });
    // El cruce de dibujos: contra su formación, la que mejor te encaja (TL.Coach.clash)
    if (recs.length < 3 && r.formation) {
      const opts = Object.keys(TL.Engine.FORMATIONS || {});
      let best = null;
      for (const f of opts) { const a = TL.Coach.clash(f, r.formation), b = TL.Coach.clash(r.formation, f); const v = a.attack - b.attack + (a.mid - b.mid) * 0.4; if (!best || v > best.v) best = { f, v }; }
      if (best) add('cruce', `Contra su ${r.formation}, juega con ${best.f}`, 'La IA ha cruzado su dibujo con todos los tuyos: este es el que más daño les hace.', { form: [best.f] });
    }
    I.plan = { key: keyOf(S, r.opp), recs };
    return I.plan;
  }
  function check(S, rec) {
    const c = rec.chk || {};
    if (c.ment && !c.ment.includes(S.tactics.mentality)) return false;
    if (c.form && !c.form.includes(S.tactics.formation)) return false;
    if (c.fit) { const mine = (S.tactics.slots || []).map(id => S.players[id]).filter(p => p && p.club === S.user); if (mine.some(p => p.fit < c.fit)) return false; }
    return true;
  }
  /** Estado del plan ahora mismo (para el panel). */
  function planState(S) {
    const p = plan(S);
    if (!p) return null;
    const recs = p.recs.map(r => ({ ...r, ok: check(S, r) }));
    const n = recs.filter(r => r.ok).length;
    const all = n === recs.length && n >= 2;
    return { recs, n, all, word: all ? 'Plan perfecto' : n >= 2 ? 'Ventaja clara' : n === 1 ? 'Ventaja leve' : 'Sin ventaja' };
  }
  function setMent(S, m) { S.tactics.mentality = m; }

  // ------------------------------------------------------------ Operaciones especiales (modo fantasía)
  const OPS = () => window.TL_OPS || [];
  const riskWord = r => (r <= 0.02 ? 'Ninguno' : r < 0.08 ? 'Mínimo' : r < 0.16 ? 'Bajo' : r < 0.26 ? 'Medio' : r < 0.4 ? 'Alto' : 'Suicida');
  function offers(S) {
    if (!fantasy(S)) return [];
    const nm = next(S);
    if (!nm) return [];
    const I = st(S), key = keyOf(S, nm.opp);
    if (!I.offer || I.offer.key !== key) {
      const ok = OPS().filter(o => !o.cond || (o.cond === 'home') === nm.home);
      I.offer = { key, ids: U.shuffle(ok.slice()).slice(0, 3).map(o => o.id) };
    }
    return I.offer.ids.map(id => OPS().find(o => o.id === id)).filter(Boolean);
  }
  const costOf = (S, o) => Math.round(W().wageBill(S, S.user) * (o.coste || 0));
  const doneOp = S => { const nm = next(S); const o = st(S).op; return nm && o && o.key === keyOf(S, nm.opp) ? o : null; };
  function fill(S, t, r) {
    return String(t || '').replace(/\{(\w+)\}/g, (m, k) => ({ rival: r.club.name, club: S.clubs[S.user].name, yo: S.manager, key: r.key ? r.key.short : 'su estrella' })[k] ?? m);
  }
  /** Ejecuta una operación. Devuelve { ok, msg, caught }. */
  function runOp(S, id) {
    if (!fantasy(S)) return { ok: false, msg: 'Eso no existe en este modo.' };
    const r = report(S), o = OPS().find(x => x.id === id);
    if (!r || !o) return { ok: false, msg: 'No hay operación posible.' };
    if (doneOp(S)) return { ok: false, msg: 'Ya has montado una operación para este partido.' };
    const c = S.clubs[S.user], cost = costOf(S, o);
    if (c.cash < cost) return { ok: false, msg: 'No hay dinero para esto. Ni en la caja B.' };
    c.cash -= cost;
    if (o.board) S.board.conf = U.clamp(S.board.conf + o.board, 0, 100);
    const I = st(S), key = keyOf(S, r.opp), N = TL.News && TL.News.fx;
    const rec = I.op = { key, id, own: 1, rival: 1 };
    if (Math.random() < (o.risk || 0)) {
      rec.caught = true;
      const pen = o.pen || {};
      if (pen.board) S.board.conf = U.clamp(S.board.conf + pen.board, 0, 100);
      let fine = 0;
      if (pen.fine && N && N.fineClub) fine = N.fineClub(S, S.user, pen.fine);
      if (pen.sig && TL.Persona) TL.Persona.signal(S, pen.sig);
      if (TL.News && o.caught && o.caught[0]) TL.News.add(S, 'polemica', fill(S, o.caught[0], r), fill(S, o.caught[1], r), S.user, null, 'neg');
      return { ok: true, caught: true, msg: `¡Te han pillado! ${fill(S, o.caught[1], r)}${fine ? ` Multa: ${U.money(fine)}.` : ''}` };
    }
    const fx = o.fx || {};
    let msg = fill(S, o.ok, r);
    if (fx.rivalFit) for (const L of r.lines) for (const p of L.ps) { const q = S.players[p.id]; if (q) q.fit = U.clamp(q.fit + fx.rivalFit, 30, 100); }
    if (fx.rivalK) rec.rival = fx.rivalK;
    if (fx.ownK) rec.own = fx.ownK;
    if (fx.keyMor && r.key && S.players[r.key.id]) { const q = S.players[r.key.id]; q.mor = U.clamp((q.mor == null ? 70 : q.mor) + fx.keyMor, 0, 100); }
    if (fx.teamMor && N && N.teamMor) N.teamMor(S, fx.teamMor);
    if (fx.lock) {
      const b = TL.Coach.lineup(S, r.opp, S.user);
      const d = S.clubs[S.user].rep - S.clubs[r.opp].rep;
      I.lock = { key, formation: b.formation, ids: b.ids.slice(), mentality: TL.Coach.mentality(S, r.opp, -d / 2, !r.home) };
      I.rep = null; I.plan = null;
      msg += ` Saldrán con ${b.formation} y mentalidad ${MENT[I.lock.mentality]}.`;
    }
    if (fx.random) {
      const roll = Math.random();
      if (roll < 0.35) { rec.own = 1.03; msg = 'La vidente saca el Sol y la Rueda de la Fortuna. El vestuario se lo cree a pies juntillas: saldrán como motos.'; }
      else if (roll < 0.7) { rec.rival = 0.985; msg = 'Las cartas dicen que al {rival} le espera «un día gris». Casualmente, a su portero le duele una muela.'.replace('{rival}', r.club.name); }
      else if (roll < 0.9) { msg = 'La vidente dice que «el balón es redondo». 40 € por eso. Pero oye, razón no le falta.'; }
      else { rec.own = 0.985; msg = 'Sale La Torre. La vidente se pone blanca. En el vestuario ya no se habla de otra cosa (y no para bien).'; }
    }
    return { ok: true, msg };
  }

  /** Lo que todo esto pesa en el partido (desde prensaBoost en js/engine.js). */
  function boost(S, clubId, isUser, oppId) {
    if (!S || S.mode === 'tour' || S.user == null) return 1;
    const nm = next(S);
    if (!nm) return 1;
    const I = st(S), key = keyOf(S, nm.opp);
    let k = 1;
    if (isUser && oppId === nm.opp) {
      const ps = I.plan && I.plan.key === key ? planState(S) : null;
      if (ps && ps.n) k *= 1 + 0.01 * ps.n + (ps.all ? 0.01 : 0);
      if (fantasy(S) && I.op && I.op.key === key && !I.op.caught) k *= I.op.own || 1;
    } else if (clubId === nm.opp && oppId === S.user && fantasy(S) && I.op && I.op.key === key && !I.op.caught) k *= I.op.rival || 1;
    return k;
  }
  /** El plan espiado con el dron: el rival sale exactamente así (si sus jugadores siguen disponibles). */
  function locked(S, clubId, oppId) {
    if (!fantasy(S) || oppId !== S.user) return null;
    const nm = next(S), I = st(S);
    if (!nm || clubId !== nm.opp || !I.lock || I.lock.key !== keyOf(S, nm.opp)) return null;
    const ok = I.lock.ids.every(id => id < 0 || (S.players[id] && S.players[id].club === clubId && !(S.players[id].inj > 0) && !(S.players[id].sus > 0)));
    return ok ? I.lock : null;
  }

  TL.Intel = { next, report, plan, planState, check, setMent, offers, runOp, boost, locked, riskWord, costOf, doneOp, fantasy, MENT, fitWord };
})();
