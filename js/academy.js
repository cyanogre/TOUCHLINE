/* TOUCHLINE — la cantera: el filial de tu club
 *
 * - Los canteranos nuevos (generados al azar cada verano, no vienen de la base de datos) llegan
 *   al filial, no al primer equipo. El filial no juega tus partidos: para alinearlos, súbelos.
 * - Puedes subir y bajar jugadores entre el primer equipo y el filial. A los 23 años suben sí o sí.
 *   Si el primer equipo baja de 16 (o se queda sin portero), suben los mejores del filial.
 * - En el filial cobran muy poco (1K/sem) hasta que les renuevas: la renovación es un contrato normal.
 * - En el filial crecen como si estuvieran cedidos (juegan cada semana), pero solo hasta el 80 % de
 *   su potencial. Para pasar de ahí: primer equipo o cesión.
 * - Un jugador es del filial si p.res (se guarda en los bits de la partida). World.squad(S, S.user) no
 *   lo incluye; World.reserve(S) lo devuelve.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World;
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);

  const RES_WAGE = 1000;      // sueldo semanal del filial
  const CAP = 0.8;            // techo en el filial: 80 % del potencial
  const PROMOTE_AGE = 23;     // a esta edad suben obligatoriamente
  const DEMOTE_MAX_AGE = 22;  // se puede bajar al filial hasta los 22
  const MAX_RES = 26;         // plazas del filial
  const MIN_FIRST = 16;       // por debajo, suben del filial

  const on = S => !!(S && S.user != null && S.mode !== 'tour');
  const reserve = S => (on(S) ? W().reserve(S) : []);
  /** Hasta dónde puede crecer en el filial. */
  const capOf = p => Math.max(1, Math.floor(p.pot * CAP));
  const atCap = p => p.ovr >= capOf(p);

  /** Un canterano nuevo para el filial. */
  function makeYouth(S, opt) {
    const c = S.clubs[S.user];
    const yb = TL.Manager.bonus(S, S.user);
    const nats = W().squad(S, S.user).map(p => p.nat);
    const line = opt && opt.line != null ? opt.line : U.weighted([0, 1, 2, 3], l => [1, 3, 3, 2][l]);
    const pos = line === 0 ? 'GK' : U.pick(W().LINE_POS[line]);
    // Primero el techo y luego la media actual: así casi todos tienen margen para crecer en el filial
    const pot = U.clamp(Math.min(c.rep + 12, c.rep + U.int(-8, 10)) + yb.youthPot, 50, 93);
    const ovr = U.clamp(Math.round(pot * U.rand(0.58, 0.74)), 38, 70);
    const p = W().makePlayer(S, {
      club: S.user, nat: U.pick((nats.length ? nats : [0]).slice(0, 12)), pos, age: opt && opt.age ? opt.age : U.int(16, 18), ovr,
      pot, contract: S.season + 1 + U.int(2, 3)
    });
    p.res = true;
    p.wage = RES_WAGE;
    p.mor = U.int(66, 82);
    return p;
  }

  /** Canteranos del verano: cuantos menos haya en el filial, más llegan. */
  function intake(S) {
    if (!on(S)) return [];
    const n = reserve(S).length;
    const yb = TL.Manager.bonus(S, S.user);
    let k = (n < 8 ? 6 : n < 14 ? 4 : n < 20 ? 3 : n < MAX_RES ? 1 : 0) + (n < MAX_RES - 2 ? yb.youthExtra : 0);
    k = Math.min(k, MAX_RES - n);
    const out = [];
    for (let i = 0; i < k; i++) out.push(makeYouth(S).id);
    W().dirty(S);
    if (out.length) TL.Game.mail(S, gx(S, `Llegan ${out.length} canteranos al filial`, `Llegan ${out.length} canteranas al filial`), `${out.map(id => S.players[id].short).join(', ')} se incorporan al filial. Cobran ${U.money(RES_WAGE)}/sem. ` +
      gx(S, 'Allí crecen hasta el 80 % de su potencial; para llegar más arriba, súbelos al primer equipo o cédelos.', 'Allí crecen hasta el 80 % de su potencial; para llegar más arriba, súbelas al primer equipo o cédelas.'), 'club');
    return out;
  }

  /** Partida nueva (o de antes de la cantera): un filial para empezar. */
  function start(S) {
    if (!on(S)) return;
    S.ac = S.ac || {};
    if (S.ac.started) return;
    S.ac.started = 1;
    for (const line of [0, 1, 1, 1, 2, 2, 2, 3, 3, 1, 2, 3]) makeYouth(S, { line, age: U.int(16, 20) });
    W().dirty(S);
  }

  /** Fin de temporada (ya con un año más): los de 23 suben al primer equipo. */
  function promoteAged(S) {
    if (!on(S)) return [];
    const up = reserve(S).filter(p => p.age >= PROMOTE_AGE);
    for (const p of up) p.res = false;
    if (up.length) {
      W().dirty(S);
      const many = up.length > 1;
      TL.Game.mail(S, 'Del filial al primer equipo', `${up.map(p => p.short).join(', ')} ${many ? 'cumplen' : 'cumple'} ${PROMOTE_AGE} años y ${many ? 'suben' : 'sube'} al primer equipo. ` +
        (many ? gx(S, 'Si no entran en tus planes, véndelos o cédelos.', 'Si no entran en tus planes, véndelas o cédelas.') : gx(S, 'Si no entra en tus planes, véndelo o cédelo.', 'Si no entra en tus planes, véndela o cédela.')), 'club');
    }
    return up;
  }

  /** Del filial al primer equipo. */
  function promote(S, p) {
    if (!p || !p.res || p.club !== S.user) return { ok: false, msg: 'No está en el filial.' };
    if (W().squad(S, S.user).length >= TL.Market.MAX_SQUAD) return { ok: false, msg: `El primer equipo está lleno (${TL.Market.MAX_SQUAD}). Baja, vende o cede a alguien antes.` };
    p.res = false;
    W().dirty(S);
    p.mor = U.clamp((p.mor == null ? 70 : p.mor) + 8, 0, 100);
    return { ok: true, msg: `${p.short} sube al primer equipo.` };
  }
  /**
   * Si el primer equipo se queda corto (menos de 16, o sin portero), suben los mejores del filial.
   * Pasa sobre todo en verano, cuando se van los que acaban contrato.
   */
  function fillFirst(S) {
    if (!on(S)) return [];
    const sq = W().squad(S, S.user);
    const pool = reserve(S).slice().sort((a, b) => b.ovr - a.ovr);
    const up = [];
    const noGk = !sq.some(p => p.pos === 'GK');
    if (noGk) { const gk = pool.find(p => p.pos === 'GK'); if (gk) up.push(gk); }
    for (const p of pool) { if (sq.length + up.length >= MIN_FIRST) break; if (!up.includes(p)) up.push(p); }
    if (!up.length) return up;
    for (const p of up) p.res = false;
    W().dirty(S);
    const many = up.length > 1;
    const why = sq.length < MIN_FIRST ? `Te quedaban menos de ${MIN_FIRST} jugadores.` : gx(S, 'No te quedaba ningún portero.', 'No te quedaba ninguna portera.');
    TL.Game.mail(S, 'Suben del filial por falta de efectivos', `${up.map(p => p.short).join(', ')} ${many ? 'suben' : 'sube'} del filial al primer equipo. ${why} ` +
      gx(S, 'Si fichas, puedes volver a bajar a los menores de 23.', 'Si fichas, puedes volver a bajar a las menores de 23.'), 'club');
    return up;
  }

  /** Del primer equipo al filial (hasta los 22). */
  function demote(S, p) {
    if (!p || p.res || p.club !== S.user) return { ok: false, msg: 'No está en el primer equipo.' };
    if (p.age > DEMOTE_MAX_AGE) return { ok: false, msg: `Solo pueden bajar al filial los menores de ${DEMOTE_MAX_AGE + 1} años.` };
    if (reserve(S).length >= MAX_RES) return { ok: false, msg: `El filial está lleno (${MAX_RES}).` };
    if (W().squad(S, S.user).length <= MIN_FIRST) return { ok: false, msg: 'Te quedarías sin jugadores en el primer equipo.' };
    p.res = true;
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    W().dirty(S);
    p.mor = U.clamp((p.mor == null ? 70 : p.mor) - 6, 0, 100);
    return { ok: true, msg: `${p.short} baja al filial.` };
  }
  const canDemote = (S, p) => !p.res && p.club === S.user && p.age <= DEMOTE_MAX_AGE;

  /**
   * Crecimiento semanal en el filial: como un cedido que juega cada semana, con techo en el 80 %.
   * (Lo llama Locker.growWeek; devuelve lo ganado.)
   */
  function grow(S, p, ageF, morF, growth, youthSkill) {
    const room = Math.max(0, capOf(p) - p.ovr);
    // Como en la vida real: crece el que juega (y más si juega bien y en una categoría exigente); el que no juega se estanca
    const L = S.ac && S.ac.last, g = L && L[p.id];
    const play = !L ? 1 : !g ? 0.45 : g.min >= 60 ? 1.2 + U.clamp((g.r - 6.5) * 0.15, -0.2, 0.3) : 0.85;
    const lg = S.ac && S.ac.lg, divF = lg ? [1.12, 1, 0.9][lg.div] : 1;
    return room * 0.016 * ageF * 0.95 * morF * growth * youthSkill * play * divF;
  }

  // ------------------------------------------------------------ La liga del filial
  // El filial compite de verdad: su propia liga (Primera, Segunda o Tercera Federación) contra otros filiales y
  // clubes modestos, con calendario, resultados, clasificación, ascensos y descensos. Los rivales no tienen
  // jugadores propios (solo un nivel); el filial juega con sus canteranos de verdad: minutos, goles, notas,
  // cansancio y alguna lesión. Nunca puede estar en la misma categoría que el primer equipo.
  const DIVS = ['Primera Federación', 'Segunda Federación', 'Tercera Federación'];
  const TOWNS = ['CD Ribera', 'UD Sierra Alta', 'Atlético Vegalonga', 'CF Puerto Viejo', 'SD Robledal', 'Real Arenales', 'CD Monteluz', 'UD Campomar',
    'CF Villanegra', 'Racing Costabrava', 'CD Pinarejo', 'UD Almenara', 'Deportivo Valdecruz', 'CF Torreblanca', 'SD Castrillo', 'Arenas de Río',
    'CD Navalsol', 'UD Fuenteluna', 'Club Peñaroja', 'CF Lagunilla', 'Sporting Marisma', 'Atlético Mirasierra', 'CD Olmedilla', 'UD Barrancos'];
  const lgOf = S => (S.ac && S.ac.lg && S.ac.lg.s === S.season ? S.ac.lg : null);
  function firstLevel(S) {
    const sq = W().squad(S, S.user).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 14);
    return sq.length ? U.sum(sq, p => p.ovr) / sq.length : 65;
  }
  /** Calendario de ida y vuelta (método del círculo). */
  function roundRobin(n) {
    const ids = Array.from({ length: n }, (_, i) => i), half = [];
    for (let r = 0; r < n - 1; r++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) { const a = ids[i], b = ids[n - 1 - i]; rd.push(r % 2 ? [b, a, -1, -1] : [a, b, -1, -1]); }
      half.push(rd);
      ids.splice(1, 0, ids.pop());
    }
    return half.concat(half.map(rd => rd.map(([a, b]) => [b, a, -1, -1])));
  }
  function buildLeague(S) {
    S.ac = S.ac || {};
    const prev = S.ac.lg, rep = S.clubs[S.user].rep;
    const div = prev ? (prev.next != null ? prev.next : prev.div) : rep >= 84 ? 0 : rep >= 70 ? 1 : 2;
    let n = Math.round((S.fixtures ? S.fixtures.length : 38) / 2) + 1;
    n = U.clamp(n % 2 ? n + 1 : n, 10, 22);
    const base = firstLevel(S) - [17, 22, 27][div];
    const own = S.clubs[S.user];
    const bs = U.shuffle(W().userLeague(S).clubs.filter(id => id !== S.user).map(id => S.clubs[id])).slice(0, Math.floor(n / 2) - 1).map(c => `${c.short || c.name} B`);
    const names = bs.concat(U.shuffle(TOWNS.slice())).slice(0, n - 1);
    const teams = [{ n: `${own.short || own.name} B`, me: true, str: 0 }].concat(names.map(nm => ({ n: nm, str: Math.round((base + U.rand(-5, 5)) * 10) / 10 })));
    U.shuffle(teams);
    S.ac.lg = { s: S.season, div, teams, fx: roundRobin(n), st: {}, news: [] };
    return S.ac.lg;
  }
  const meIdx = lg => lg.teams.findIndex(t => t.me);
  /** El once del filial: los mejores disponibles; si faltan, juveniles de relleno (más flojos). */
  function lineup(S) {
    const avail = reserve(S).filter(p => !(p.inj > 0) && !(p.sus > 0)).sort((a, b) => (b.ovr * (0.6 + p01(b.fit))) - (a.ovr * (0.6 + p01(a.fit))));
    const gk = avail.find(p => p.pos === 'GK');
    const xi = (gk ? [gk] : []).concat(avail.filter(p => p !== gk && p.pos !== 'GK').slice(0, gk ? 10 : 11));
    const bench = avail.filter(p => !xi.includes(p)).slice(0, 5);
    const pad = Math.max(0, 11 - xi.length);
    const str = xi.length ? (U.sum(xi, p => p.ovr * (0.85 + 0.15 * p01(p.fit))) + pad * 40) / 11 : 40;
    return { xi, bench, str };
  }
  const p01 = f => U.clamp(((f == null ? 100 : f) - 40) / 60, 0, 1);
  function score(a, b, home) {
    const xa = 1.25 * Math.exp(0.05 * (a - b + (home ? 2.5 : -2.5))), xb = 1.25 * Math.exp(0.05 * (b - a + (home ? -2.5 : 2.5)));
    return [U.poisson(U.clamp(xa, 0.15, 4.5)), U.poisson(U.clamp(xb, 0.15, 4.5))];
  }
  /** Una jornada del filial (la llama la temporada cada semana). */
  function playRound(S) {
    if (!on(S)) return null;
    const lg = lgOf(S) || buildLeague(S), rd = lg.fx[S.week];
    if (!rd) return null;
    const me = meIdx(lg), L = lineup(S);
    lg.teams[me].str = Math.round(L.str * 10) / 10;
    S.ac.last = {};
    let mine = null;
    for (const m of rd) {
      const [h, a] = m, sh = lg.teams[h].str, sa = lg.teams[a].str;
      [m[2], m[3]] = score(sh, sa, true);
      if (h === me || a === me) mine = m;
    }
    if (mine && L.xi.length) {
      const home = mine[0] === me, gf = home ? mine[2] : mine[3], ga = home ? mine[3] : mine[2];
      const subs = L.bench.slice(0, 3), mins = {};
      L.xi.forEach(p => { mins[p.id] = 90; });
      subs.forEach((p, k) => { const out = L.xi.filter(x => x.pos !== 'GK')[10 - 1 - k] || L.xi[L.xi.length - 1 - k]; if (out) { const m0 = U.int(55, 80); mins[out.id] = m0; mins[p.id] = 90 - m0; } });
      const played = L.xi.concat(subs).filter(p => mins[p.id] > 0);
      const gl = { 3: 5, 2: 2.4, 1: 0.7, 0: 0 };
      const pickW = () => U.weighted(played, p => (gl[F.LINE[p.pos]] || 0.5) * (mins[p.id] / 90) * (0.6 + p.ovr / 100));
      const G = {}, As = {};
      for (let k = 0; k < gf; k++) { const s0 = pickW(); G[s0.id] = (G[s0.id] || 0) + 1; if (Math.random() < 0.7) { const a0 = pickW(); if (a0 !== s0) As[a0.id] = (As[a0.id] || 0) + 1; } }
      const res = gf > ga ? 0.5 : gf < ga ? -0.4 : 0;
      for (const p of played) {
        const r = U.clamp(6.3 + res + (G[p.id] || 0) * 0.8 + (As[p.id] || 0) * 0.4 + (p.pos === 'GK' && ga === 0 ? 0.6 : 0) - (p.pos === 'GK' ? ga * 0.15 : 0) + U.rand(-0.6, 0.6) + (p.ovr - L.str) * 0.03, 4, 10);
        const st = lg.st[p.id] || (lg.st[p.id] = [0, 0, 0, 0, 0]);
        st[0]++; st[1] += G[p.id] || 0; st[2] += As[p.id] || 0; st[3] += r; st[4] += mins[p.id];
        S.ac.last[p.id] = { min: mins[p.id], r: Math.round(r * 10) / 10 };
        p.fit = U.clamp(Math.round(p.fit - 9 * mins[p.id] / 90), 35, 100);
        if (mins[p.id] >= 45 && Math.random() < 0.012) p.inj = U.int(1, 4);
        if ((G[p.id] || 0) >= 3) { TL.Game.mail(S, `Hat-trick de ${p.short} con el filial`, `${p.short} firma un hat-trick en el ${home ? `${lg.teams[me].n} ${gf}-${ga} ${lg.teams[mine[1]].n}` : `${lg.teams[mine[0]].n} ${ga}-${gf} ${lg.teams[me].n}`}. El entrenador del filial dice que «está para cosas mayores».`, 'good'); }
      }
      // El entrenador del filial recomienda subir a quien lo está bordando
      const top = played.filter(p => lg.st[p.id] && lg.st[p.id][0] >= 5 && lg.st[p.id][3] / lg.st[p.id][0] >= 7.4 && !(lg.rec || []).includes(p.id));
      if (top.length && Math.random() < 0.35) { const p = top[0]; (lg.rec = lg.rec || []).push(p.id); TL.Game.mail(S, `El filial pide paso para ${p.short}`, `El entrenador del filial te escribe: «${p.short} lleva semanas siendo el mejor. Aquí ya se le queda pequeño: súbelo o cédelo antes de que se estanque».`, 'club'); }
      lg.lastRes = { s: S.season, w: S.week, home, opp: lg.teams[home ? mine[1] : mine[0]].n, gf, ga };
    }
    return mine;
  }
  function table(S) {
    const lg = lgOf(S);
    if (!lg) return [];
    const rows = lg.teams.map((t, i) => ({ i, n: t.n, me: !!t.me, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] }));
    for (const rd of lg.fx) for (const [h, a, hg, ag] of rd) {
      if (hg < 0) continue;
      const H = rows[h], A = rows[a];
      H.pj++; A.pj++; H.gf += hg; H.gc += ag; A.gf += ag; A.gc += hg;
      if (hg > ag) { H.g++; A.p++; H.pts += 3; H.form.push('V'); A.form.push('D'); } else if (hg < ag) { A.g++; H.p++; A.pts += 3; H.form.push('D'); A.form.push('V'); } else { H.e++; A.e++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
    }
    return rows.sort((x, y) => y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf);
  }
  /** Fin de temporada: ascenso, permanencia o descenso del filial. */
  function leagueEnd(S) {
    const lg = lgOf(S);
    if (!lg) return null;
    const T = table(S), n = T.length, pos = T.findIndex(r => r.me) + 1;
    let next = lg.div, what = 'se mantiene';
    if (pos <= 2 && lg.div > 0) { next = lg.div - 1; what = `asciende a ${DIVS[next]}`; }
    else if (pos > n - 3 && lg.div < 2) { next = lg.div + 1; what = `desciende a ${DIVS[next]}`; }
    lg.next = next;
    (S.ac.hist = S.ac.hist || []).push({ s: S.season, div: lg.div, pos, n });
    const best = Object.entries(lg.st).filter(([id]) => S.players[id]).sort((a, b) => b[1][1] - a[1][1])[0];
    TL.Game.mail(S, `El filial acaba ${pos}º en ${DIVS[lg.div]}`, `El filial termina ${pos}º de ${n} y ${what}.${best && best[1][1] ? ` Máximo goleador: ${S.players[best[0]].short} (${best[1][1]}).` : ''}`, pos <= 2 ? 'good' : 'club');
    if (TL.News && next !== lg.div) TL.News.add(S, 'club', `El filial del ${S.clubs[S.user].name} ${what}`, `Temporada ${pos <= 2 ? 'para enmarcar' : 'para olvidar'} en el filial, que terminó ${pos}º.`, S.user, null, pos <= 2 ? 'pos' : 'neg');
    return { pos, n, what, div: lg.div, next };
  }

  TL.Academy = { DIVS, playRound, table, leagueEnd, lineup, lg: lgOf, buildLeague, RES_WAGE, CAP, PROMOTE_AGE, DEMOTE_MAX_AGE, MAX_RES, on, reserve, capOf, atCap, makeYouth, intake, start, promoteAged, fillFirst, MIN_FIRST, promote, demote, canDemote, grow };
})();
