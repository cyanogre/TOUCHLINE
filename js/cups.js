/* TOUCHLINE — competiciones internacionales de clubes
 *
 * Formatos (ver COMPETICIONES.md; los nombres son inventados):
 *  - Campions y Euroleague: fase de liga de 36 (4 bombos de 9, 2 rivales por bombo, 4 en casa y 4 fuera),
 *    Rising League: 36 con 6 partidos (6 bombos de 6, 1 rival por bombo).
 *    1º-8º a octavos; 9º-24º, play-off a ida y vuelta; cuadro fijo desde octavos; final a partido único.
 *  - Liberadores y Latinoamericana: 8 grupos de 4 a doble vuelta y eliminatorias (los 3º de Liberadores
 *    juegan el play-off de la Latinoamericana contra los 2º de grupo).
 *  - Asia Élite: dos regiones de 16 con su fase de liga (8 partidos); octavos dentro de cada región,
 *    cuartos, semis y final a partido único.
 *  - Copa de Campeones del Norte: 16 clubes en eliminatorias. Eurosupercopa: campeones de Campions y Euroleague.
 * Las rondas previas no se juegan partido a partido: se resuelven por fuerza (con algo de azar); si tu club
 * está en una previa, se simula su eliminatoria y te llega el resultado.
 * En fútbol femenino, una copa europea y otra americana más sencillas (eliminatorias).
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World, E = () => TL.Engine;

  // ------------------------------------------------------------ Asociaciones
  const ASSOC = {
    Inglaterra: 'ENG', Italia: 'ITA', España: 'ESP', Alemania: 'GER', Francia: 'FRA', 'Países Bajos': 'NED', Portugal: 'POR', Bélgica: 'BEL',
    Chequia: 'CZE', Turquía: 'TUR', Noruega: 'NOR', Grecia: 'GRE', Austria: 'AUT', Escocia: 'SCO', Polonia: 'POL', Dinamarca: 'DEN', Suiza: 'SUI',
    Chipre: 'CYP', Suecia: 'SWE', Croacia: 'CRO', Serbia: 'SRB', Ucrania: 'UKR', Hungría: 'HUN', Rumanía: 'ROU', Bulgaria: 'BUL', Azerbaiyán: 'AZE',
    Irlanda: 'IRL', Finlandia: 'FIN', Rusia: 'RUS', Brasil: 'BRA', Argentina: 'ARG', Chile: 'CHI', Colombia: 'COL', Bolivia: 'BOL', Ecuador: 'ECU',
    Paraguay: 'PAR', Perú: 'PER', Uruguay: 'URU', Venezuela: 'VEN', 'Arabia Saudí': 'KSA', 'Emiratos Árabes Unidos': 'UAE', Catar: 'QAT',
    Japón: 'JPN', 'Corea del Sur': 'KOR', Tailandia: 'THA', China: 'CHN', Australia: 'AUS', India: 'IND', 'Estados Unidos': 'USA', México: 'MEX',
    Egipto: 'EGY', Marruecos: 'MAR'
  };
  // Plazas UEFA por puesto de liga (lista de acceso de la temporada 1, que se mantiene):
  // C/E/R = Campions, Euroleague, Rising League; mayúscula = directo a la fase de liga, minúscula = por las previas
  const UEFA_SLOTS = {
    ENG: 'CCCCCEEr', ITA: 'CCCCCEEr', ESP: 'CCCCEEr', GER: 'CCCCEEr', FRA: 'CCCcEEr', NED: 'CCcEer', POR: 'CcEer', BEL: 'Cceer', CZE: 'Cceer',
    TUR: 'Cceer', NOR: 'cceer', GRE: 'cceer', AUT: 'ccerr', SCO: 'ccerr', POL: 'ccerr', DEN: 'cerr', SUI: 'cerr', CYP: 'cerr', SWE: 'cerr',
    CRO: 'cerr', SRB: 'cerr', UKR: 'cerr', HUN: 'cerr', ROU: 'cerr', BUL: 'c', AZE: 'c', IRL: 'cerr', FIN: 'c'
  };
  // CONMEBOL: [grupos de Liberadores, previas de Liberadores, Latinoamericana] (nº de plazas, en orden de liga)
  const CONMEBOL = { BRA: [5, 2, 6], ARG: [5, 1, 6], CHI: [2, 2, 4], COL: [2, 2, 4], BOL: [2, 2, 4], ECU: [2, 2, 4], PAR: [2, 2, 4], PER: [2, 2, 4], URU: [2, 2, 4], VEN: [2, 2, 4] };
  // AFC: [región, directos, play-off]
  const AFC = { KSA: ['W', 6, 1], UAE: ['W', 4, 2], QAT: ['W', 4, 1], JPN: ['E', 5, 1], KOR: ['E', 4, 1], THA: ['E', 1, 0], CHN: ['E', 3, 0], AUS: ['E', 1, 2] };

  const COMPS = {
    eu1: { name: 'Campions', short: 'Campions', tier: 1, color: '#5db8ff', icon: '⭐', prize: 1 },
    eu2: { name: 'Euroleague', short: 'Euroleague', tier: 2, color: '#ff9a3d', icon: '🔶', prize: 0.35 },
    eu3: { name: 'Rising League', short: 'Rising', tier: 3, color: '#3ddc97', icon: '🔷', prize: 0.15 },
    esc: { name: 'Eurosupercopa', short: 'Supercopa', tier: 1, color: '#d4af37', icon: '🏅', prize: 0.1 },
    lib: { name: 'Liberadores', short: 'Liberadores', tier: 1, color: '#f2c94c', icon: '🏆', prize: 0.25 },
    lat: { name: 'Latinoamericana', short: 'Latinoamericana', tier: 2, color: '#e07b39', icon: '🌎', prize: 0.12 },
    asia: { name: 'Asia Élite', short: 'Asia Élite', tier: 1, color: '#e05a5a', icon: '🏆', prize: 0.3 },
    norte: { name: 'Copa de Campeones del Norte', short: 'Norte', tier: 1, color: '#7fb3ff', icon: '🏆', prize: 0.2 },
    // Fútbol femenino
    feu: { name: 'Campions Femenina', short: 'Campions', tier: 1, color: '#5db8ff', icon: '⭐', prize: 1 },
    fam: { name: 'Copa de Campeonas de América', short: 'América', tier: 1, color: '#f2c94c', icon: '🏆', prize: 0.3 }
  };
  const DEFS = Object.entries(COMPS).map(([id, d]) => Object.assign({ id }, d));
  const KO_NAMES = { 32: 'Dieciseisavos', 16: 'Octavos', 8: 'Cuartos', 4: 'Semifinales', 2: 'Final' };

  // ------------------------------------------------------------ Utilidades
  const assocOf = l => l.assoc || ASSOC[l.country] || '';
  /** Liga principal de cada asociación (la que no es inferior de ninguna). */
  function topByAssoc(S) {
    const lower = new Set(S.promotion.map(p => p[1]));
    const out = {};
    for (const l of S.leagues) {
      if (!l.clubs.length || lower.has(l.id)) continue;
      const a = assocOf(l);
      if (!a) continue;
      if (!out[a] || l.wealth > out[a].wealth) out[a] = l;
    }
    return out;
  }
  /** Liga principal de cada país (para el modo torneo). */
  function topLeagues(S) {
    const out = {};
    for (const [a, l] of Object.entries(topByAssoc(S))) out[l.country] = l;
    void ASSOC;
    return out;
  }
  /** Clasificación de la temporada pasada (o, en la primera, el nivel de los clubes). */
  function orderOf(S, l) {
    const prev = S.lastOrder && S.lastOrder[l.id];
    const ids = l.clubs.slice();
    if (prev) return prev.filter(id => ids.includes(id)).concat(ids.filter(id => !prev.includes(id)));
    return ids.sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
  }
  const strCache = {};
  function strength(S, id) {
    const k = S.season + ':' + S.week + ':' + id;
    if (strCache[k] == null) {
      const sq = W().squad(S, id);
      strCache[k] = sq.length >= 11 ? E().bestFormation(sq).score / 11 : 50;
    }
    return strCache[k];
  }
  /** Coeficiente de club: el de la base de datos y lo que haya hecho en Europa estas temporadas. */
  function coef(S, id) { const c = S.clubs[id]; return (c.coef || 0) + ((S.coef && S.coef[id]) || 0) + c.rep * 0.3; }
  function money(S, v) { return F.roundMoney(v * (S.econ.value || 1) * (S.gender === 'F' ? 0.08 : 1)); }

  // ------------------------------------------------------------ Rondas previas (resueltas por fuerza)
  /**
   * Del bote de una previa salen n clasificados: los más fuertes (con algo de azar).
   * Si está tu club, su eliminatoria se simula de verdad y te llega el resultado.
   */
  function prelims(S, pool, n, label) {
    pool = [...new Set(pool)];
    const scored = pool.map(id => [id, strength(S, id) + U.rand(-2.5, 2.5)]).sort((a, b) => b[1] - a[1]);
    let win = scored.slice(0, n).map(x => x[0]);
    let lose = scored.slice(n).map(x => x[0]);
    if (pool.includes(S.user) && n > 0 && lose.length) {
      const mine = strength(S, S.user);
      const rivals = pool.filter(id => id !== S.user).sort((a, b) => Math.abs(strength(S, a) - mine) - Math.abs(strength(S, b) - mine));
      const opp = rivals[0];
      const l1 = E().quickScore(mine, strength(S, opp)), l2 = E().quickScore(strength(S, opp), mine);
      const gf = l1[0] + l2[1], ga = l1[1] + l2[0];
      const won = gf > ga || (gf === ga && Math.random() < 0.5 + (mine - strength(S, opp)) * 0.03);
      win = win.filter(id => id !== S.user); lose = lose.filter(id => id !== S.user);
      if (won) { if (win.length >= n) lose.unshift(win.pop()); win.push(S.user); } else lose.unshift(S.user);
      TL.Game.mail(S, won ? `Superada la previa de la ${label}` : `Eliminados en la previa de la ${label}`,
        `Eliminatoria ante el ${S.clubs[opp].name}: ${gf}-${ga} en el global${gf === ga ? ' (penaltis)' : ''}. ${won ? `¡Estamos en la fase principal de la ${label}!` : 'Seguiremos en Europa en la competición de abajo, si hay plaza.'}`, won ? 'good' : 'med');
    }
    return { win, lose };
  }

  // ------------------------------------------------------------ Sorteo de la fase de liga
  /**
   * Rivales de cada club: en su bombo, un ciclo (recibe al siguiente y visita al anterior);
   * con cada otro bombo, dos emparejamientos distintos (uno en casa y otro fuera).
   * Sin rivales de su asociación y como mucho maxSame de una misma. Devuelve [local, visitante] por partido.
   */
  function leaguePairs(S, ids, pots, perPot, maxSame) {
    const sorted = ids.slice().sort((a, b) => coef(S, b) - coef(S, a));
    const size = Math.ceil(sorted.length / pots);
    const P = Array.from({ length: pots }, (_, k) => sorted.slice(k * size, k * size + size));
    const asc = id => assocOf(S.leagues[S.clubs[id].league]) || ('#' + id);
    let best = null;
    for (let tryN = 0; tryN < 400; tryN++) {
      const games = [];
      const bad = (a, b) => asc(a) === asc(b);
      let fails = 0;
      for (let p = 0; p < pots; p++) {
        for (let q = p; q < pots; q++) {
          if (perPot === 2) {
            if (p === q) {
              const c = U.shuffle(P[p].slice());
              for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; if (bad(a, b)) fails++; games.push([a, b]); }
            } else {
              const A = P[p], B = U.shuffle(P[q].slice()), B2 = B.slice(1).concat(B[0]);
              for (let i = 0; i < A.length; i++) {
                if (bad(A[i], B[i])) fails++; if (bad(A[i], B2[i])) fails++;
                games.push([A[i], B[i]], [B2[i], A[i]]);
              }
            }
          } else {
            if (p === q) {
              const c = U.shuffle(P[p].slice());
              for (let i = 0; i + 1 < c.length; i += 2) { if (bad(c[i], c[i + 1])) fails++; games.push([c[i], c[i + 1]]); }
            } else {
              const A = P[p], B = U.shuffle(P[q].slice());
              for (let i = 0; i < A.length; i++) { if (bad(A[i], B[i])) fails++; games.push([A[i], B[i]]); }
            }
          }
        }
      }
      // Como mucho maxSame rivales de una misma asociación
      const cnt = {};
      for (const [a, b] of games) for (const [x, y] of [[a, b], [b, a]]) { const k = x + ':' + asc(y); cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > maxSame) fails++; }
      if (!best || fails < best.fails) best = { games, fails };
      if (!fails) break;
    }
    let games = best.games;
    // Con un rival por bombo, el campo se reparte para que cada uno juegue la mitad en casa (orientación euleriana)
    if (perPot === 1) games = balanceHome(games);
    return games;
  }
  function balanceHome(games) {
    const adj = new Map();
    games.forEach((g, i) => { for (const v of g) (adj.get(v) || adj.set(v, []).get(v)).push(i); });
    const used = new Array(games.length).fill(false), out = [];
    for (const start of adj.keys()) {
      const stack = [start];
      while (stack.length) {
        const v = stack[stack.length - 1];
        const list = adj.get(v);
        while (list.length && used[list[list.length - 1]]) list.pop();
        if (!list.length) { stack.pop(); continue; }
        const e = list.pop(); used[e] = true;
        const [a, b] = games[e], w = a === v ? b : a;
        out.push([v, w]);
        stack.push(w);
      }
    }
    return out;
  }
  /** Reparte los partidos en jornadas: cada club juega una vez por jornada (emparejamientos perfectos). */
  function matchdays(games, n) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const left = U.shuffle(games.map((g, i) => i));
      const day = new Array(games.length).fill(-1);
      let ok = true;
      for (let d = 0; d < n && ok; d++) {
        const pool = left.filter(i => day[i] < 0);
        const teams = [...new Set(pool.flatMap(i => games[i]))];
        const m = perfectMatching(teams, pool, games);
        if (!m) { ok = false; break; }
        for (const i of m) day[i] = d;
      }
      if (ok && day.every(x => x >= 0)) return day;
    }
    // Último recurso: reparto voraz (alguno puede jugar dos veces en una jornada)
    const day = [], busy = Array.from({ length: n }, () => new Set());
    games.forEach(([a, b]) => { let d = 0; while (d < n - 1 && (busy[d].has(a) || busy[d].has(b))) d++; busy[d].add(a); busy[d].add(b); day.push(d); });
    return day;
  }
  function perfectMatching(teams, pool, games) {
    const inc = new Map(teams.map(t => [t, []]));
    for (const i of pool) for (const t of games[i]) inc.get(t).push(i);
    const taken = new Set(), chosen = [];
    let steps = 0;
    const go = () => {
      if (++steps > 20000) return false;
      let pick = null, min = 1e9;
      for (const t of teams) {
        if (taken.has(t)) continue;
        const opts = inc.get(t).filter(i => !taken.has(games[i][0]) && !taken.has(games[i][1]));
        if (opts.length < min) { min = opts.length; pick = [t, opts]; }
        if (!min) return false;
      }
      if (!pick) return true;
      for (const i of U.shuffle(pick[1])) {
        const [a, b] = games[i];
        taken.add(a); taken.add(b); chosen.push(i);
        if (go()) return true;
        taken.delete(a); taken.delete(b); chosen.pop();
      }
      return false;
    };
    return go() ? chosen : null;
  }

  // ------------------------------------------------------------ Estructura de las copas
  function leagueRound(S, ids, pots, perPot, maxSame, regions) {
    const sets = regions || [ids];
    const ties = [];
    let mdn = 0;
    sets.forEach((set, ri) => {
      const games = leaguePairs(S, set, pots, perPot, maxSame);
      const n = perPot * pots;
      mdn = Math.max(mdn, n);
      const day = matchdays(games, n);
      games.forEach(([h, a], i) => ties.push({ h, a, s: [], md: day[i], rg: ri }));
    });
    return { name: 'Fase de liga', legs: 1, league: true, mdn, clubs: ids, regions: regions || null, ties };
  }
  function groupRound(S, ids, n) {
    const sorted = ids.slice().sort((a, b) => coef(S, b) - coef(S, a));
    const G = n;
    const pots = [0, 1, 2, 3].map(k => U.shuffle(sorted.slice(k * G, k * G + G)));
    const asc = id => assocOf(S.leagues[S.clubs[id].league]);
    let groups = null;
    for (let t = 0; t < 200; t++) {
      const gs = Array.from({ length: G }, () => []);
      let fails = 0;
      for (const pot of pots.map(p => U.shuffle(p.slice()))) {
        pot.forEach((id, k) => gs[k].push(id));
      }
      for (const g of gs) { const seen = new Set(); for (const id of g) { if (seen.has(asc(id))) fails++; seen.add(asc(id)); } }
      if (!groups || fails < groups.fails) groups = { gs, fails };
      if (!fails) break;
    }
    const ties = [];
    groups.gs.forEach((gr, gi) => {
      const [A, B, C, D] = gr;
      const first = [[A, B, 0], [C, D, 0], [A, C, 1], [D, B, 1], [D, A, 2], [B, C, 2]];
      first.concat(first.map(([h, a, md]) => [a, h, md + 3])).forEach(([h, a, md]) => { if (h != null && a != null) ties.push({ h, a, s: [], md, g: gi }); });
    });
    return { name: 'Fase de grupos', legs: 1, group: true, mdn: 6, groups: groups.gs, ties };
  }
  const ko = (name, legs) => ({ name, legs, ties: [] });

  /** Calendario: momentos de la temporada (fracción de la liga) de cada jornada de la copa. */
  function schedule(S, cup, fracs) {
    const n = S.fixtures ? S.fixtures.length : 38;
    cup.mds.forEach((md, k) => { md.week = U.clamp(Math.round(n * fracs[Math.min(k, fracs.length - 1)]), 1, n - 2); md.done = false; });
    for (let k = 1; k < cup.mds.length; k++) if (cup.mds[k].week <= cup.mds[k - 1].week) cup.mds[k].week = cup.mds[k - 1].week + 1;
  }
  function mdsOf(cup) {
    const mds = [];
    cup.rounds.forEach((r, ri) => { const n = r.league || r.group ? r.mdn : r.legs; for (let leg = 0; leg < n; leg++) mds.push({ r: ri, leg }); });
    return mds;
  }
  function makeCup(S, id, clubs, rounds, fracs) {
    const d = COMPS[id];
    const cup = { id, name: d.name, short: d.short, tier: d.tier, color: d.color, icon: d.icon, clubs: clubs.slice(), rounds, cur: 0, champ: null, s: S.season, rank: {} };
    cup.mds = mdsOf(cup);
    schedule(S, cup, fracs);
    return cup;
  }
  const UEFA_FRACS = [0.1, 0.15, 0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.56, 0.59, 0.64, 0.67, 0.73, 0.76, 0.82, 0.85, 0.95];
  const RISING_FRACS = [0.1, 0.16, 0.23, 0.3, 0.38, 0.46, 0.56, 0.59, 0.64, 0.67, 0.73, 0.76, 0.82, 0.85, 0.95];
  const GROUP_FRACS = [0.12, 0.18, 0.24, 0.3, 0.37, 0.44, 0.56, 0.59, 0.66, 0.69, 0.77, 0.8, 0.94];
  const LAT_FRACS = [0.12, 0.18, 0.24, 0.3, 0.37, 0.44, 0.5, 0.53, 0.58, 0.61, 0.68, 0.71, 0.78, 0.81, 0.93];
  const ASIA_FRACS = [0.1, 0.15, 0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.62, 0.65, 0.88, 0.91, 0.95];
  const NORTE_FRACS = [0.55, 0.58, 0.66, 0.69, 0.77, 0.8, 0.93];

  /** Las tres competiciones europeas: plazas por liga, previas y fase de liga. */
  function buildUEFA(S, taken, out) {
    const tops = topByAssoc(S);
    const pool = { C: [[], []], E: [[], []], R: [[], []] };
    for (const [a, slots] of Object.entries(UEFA_SLOTS)) {
      const l = tops[a];
      if (!l) continue;
      const ord = orderOf(S, l).filter(id => !taken.has(id));
      [...slots].forEach((ch, k) => { const id = ord[k]; if (id != null) pool[ch.toUpperCase()][ch === ch.toUpperCase() ? 0 : 1].push(id); });
    }
    // Campeones vigentes: plaza directa en la Campions (el de Euroleague también; el de Rising, en Euroleague)
    const H = S.holders || {};
    for (const [hid, comp] of [[H.eu1, 'C'], [H.eu2, 'C'], [H.eu3, 'E']]) {
      if (hid == null || !S.clubs[hid] || !tops[assocOf(S.leagues[S.clubs[hid].league])]) continue;
      for (const k of 'CER') for (const i of [0, 1]) pool[k][i] = pool[k][i].filter(x => x !== hid);
      pool[comp][0].unshift(hid);
    }
    const fill = (direct, q, label) => {
      direct = [...new Set(direct)].slice(0, 36);
      const r = prelims(S, q.filter(id => !direct.includes(id)), 36 - direct.length, label);
      return { clubs: direct.concat(r.win), lose: r.lose };
    };
    const C = fill(pool.C[0], pool.C[1], 'Campions');
    const Eu = fill(pool.E[0].filter(id => !C.clubs.includes(id)), C.lose.concat(pool.E[1]).filter(id => !C.clubs.includes(id)), 'Euroleague');
    const Ri = fill(pool.R[0].filter(id => !C.clubs.includes(id) && !Eu.clubs.includes(id)), Eu.lose.concat(pool.R[1]).filter(id => !C.clubs.includes(id) && !Eu.clubs.includes(id)), 'Rising League');
    // Si faltan (pocas ligas en el juego), los mejores clubes europeos que quedan
    const spare = Object.values(tops).filter(l => UEFA_SLOTS[assocOf(l)]).flatMap(l => orderOf(S, l)).filter(id => !taken.has(id));
    for (const set of [C.clubs, Eu.clubs, Ri.clubs]) {
      for (const id of spare) { if (set.length >= 36) break; if (![C.clubs, Eu.clubs, Ri.clubs].some(s => s.includes(id))) set.push(id); }
    }
    [['eu1', C.clubs, 4, 2, UEFA_FRACS], ['eu2', Eu.clubs, 4, 2, UEFA_FRACS], ['eu3', Ri.clubs, 6, 1, RISING_FRACS]].forEach(([id, clubs, pots, per, fr]) => {
      if (clubs.length < 36) return;
      clubs.forEach(x => taken.add(x));
      const rounds = [leagueRound(S, clubs, pots, per, 2), ko('Play-off', 2), ko('Octavos', 2), ko('Cuartos', 2), ko('Semifinales', 2), ko('Final', 1)];
      const cup = makeCup(S, id, clubs, rounds, fr);
      cup.fixed = true;
      out.push(cup);
    });
    // Eurosupercopa: campeón de Campions contra el de Euroleague, a principio de temporada
    if (H.eu1 != null && H.eu2 != null && H.eu1 !== H.eu2 && S.clubs[H.eu1] && S.clubs[H.eu2]) {
      const cup = makeCup(S, 'esc', [H.eu1, H.eu2], [Object.assign(ko('Final', 1), { ties: [{ h: H.eu1, a: H.eu2, s: [] }] })], [0.04]);
      out.push(cup);
    }
  }

  function buildCONMEBOL(S, taken, out) {
    const tops = topByAssoc(S);
    const direct = [], pre = [], lat = [];
    for (const [a, [g, p, l]] of Object.entries(CONMEBOL)) {
      const L = tops[a];
      if (!L) continue;
      const ord = orderOf(S, L).filter(id => !taken.has(id));
      direct.push(...ord.slice(0, g)); pre.push(...ord.slice(g, g + p)); lat.push(...ord.slice(g + p, g + p + l));
    }
    const H = S.holders || {};
    for (const hid of [H.lib, H.lat]) if (hid != null && S.clubs[hid] && !direct.includes(hid) && tops[assocOf(S.leagues[S.clubs[hid].league])]) { direct.unshift(hid); }
    const d = [...new Set(direct)].slice(0, 32);
    const r = prelims(S, pre.filter(id => !d.includes(id)), 32 - d.length, 'Liberadores');
    const libClubs = d.concat(r.win).slice(0, 32);
    if (libClubs.length >= 32) {
      libClubs.forEach(x => taken.add(x));
      const cup = makeCup(S, 'lib', libClubs, [groupRound(S, libClubs, 8), ko('Octavos', 2), ko('Cuartos', 2), ko('Semifinales', 2), ko('Final', 1)], GROUP_FRACS);
      cup.fixed = true;
      out.push(cup);
    }
    // Latinoamericana: primera fase (cruces del mismo país, resuelta por fuerza) + BRA/ARG + eliminados de las previas
    const latClubs = [...new Set(r.lose.slice(0, 4).concat(lat.filter(id => !taken.has(id))))].slice(0, 32);
    const spare = Object.entries(CONMEBOL).map(([a]) => tops[a]).filter(Boolean).flatMap(l => orderOf(S, l)).filter(id => !taken.has(id) && !latClubs.includes(id));
    while (latClubs.length < 32 && spare.length) latClubs.push(spare.shift());
    if (latClubs.length >= 32) {
      latClubs.forEach(x => taken.add(x));
      const cup = makeCup(S, 'lat', latClubs, [groupRound(S, latClubs, 8), ko('Play-off', 2), ko('Octavos', 2), ko('Cuartos', 2), ko('Semifinales', 2), ko('Final', 1)], LAT_FRACS);
      cup.fixed = true;
      out.push(cup);
    }
  }

  function buildAFC(S, taken, out) {
    const tops = topByAssoc(S);
    const reg = { W: [[], []], E: [[], []] };
    for (const [a, [rg, dir, po]] of Object.entries(AFC)) {
      const L = tops[a];
      if (!L) continue;
      const ord = orderOf(S, L).filter(id => !taken.has(id));
      reg[rg][0].push(...ord.slice(0, dir)); reg[rg][1].push(...ord.slice(dir, dir + po));
    }
    const regions = [];
    for (const rg of ['W', 'E']) {
      const d = reg[rg][0].slice(0, 16);
      const r = prelims(S, reg[rg][1], Math.max(0, 16 - d.length), 'Asia Élite');
      regions.push(d.concat(r.win).slice(0, 16));
    }
    if (regions.some(r => r.length < 16)) return;
    const clubs = regions.flat();
    clubs.forEach(x => taken.add(x));
    const rounds = [leagueRound(S, clubs, 4, 2, 8, regions), ko('Octavos', 2), ko('Cuartos', 1), ko('Semifinales', 1), ko('Final', 1)];
    const cup = makeCup(S, 'asia', clubs, rounds, ASIA_FRACS);
    cup.fixed = true; cup.regionNames = ['Oeste', 'Este'];
    out.push(cup);
  }

  function buildNorte(S, taken, out) {
    const tops = topByAssoc(S);
    const clubs = ['USA', 'MEX'].map(a => tops[a]).filter(Boolean).flatMap(l => orderOf(S, l).filter(id => !taken.has(id)).slice(0, 8));
    if (clubs.length < 16) return;
    clubs.forEach(x => taken.add(x));
    const seeds = clubs.slice().sort((a, b) => coef(S, b) - coef(S, a));
    const r0 = ko('Octavos', 2);
    // 1-16, 2-15… con cuadro fijo (1 y 2 en mitades opuestas); la vuelta, en casa del mejor
    const order = [0, 7, 3, 4, 1, 6, 2, 5];
    r0.ties = order.map(k => ({ h: seeds[15 - k], a: seeds[k], s: [] }));
    const cup = makeCup(S, 'norte', clubs, [r0, ko('Cuartos', 2), ko('Semifinales', 2), ko('Final', 1)], NORTE_FRACS);
    cup.fixed = true;
    seeds.forEach((id, k) => { cup.rank[id] = k + 1; });
    out.push(cup);
  }

  /** Fútbol femenino: una copa europea y una americana a eliminatorias. */
  function buildWomen(S, taken, out) {
    const tops = topByAssoc(S);
    for (const [id, assocs] of [['feu', Object.keys(UEFA_SLOTS)], ['fam', ['USA', 'MEX', 'BRA', 'ARG']]]) {
      const ls = assocs.map(a => tops[a]).filter(Boolean);
      const pool = ls.flatMap(l => orderOf(S, l).filter(x => !taken.has(x)).slice(0, 4)).sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
      let size = 16;
      while (size > pool.length && size > 4) size /= 2;
      if (pool.length < 4) continue;
      const clubs = pool.slice(0, size);
      clubs.forEach(x => taken.add(x));
      const rounds = [];
      for (let k = size; k >= 2; k /= 2) rounds.push(ko(KO_NAMES[k] || `Ronda de ${k}`, k === 2 ? 1 : 2));
      const sorted = clubs.slice();
      const half = sorted.length / 2;
      rounds[0].ties = U.shuffle(sorted.slice(half)).map((h, k) => ({ h, a: sorted[k], s: [] }));
      out.push(makeCup(S, id, clubs, rounds, [0.17, 0.25, 0.42, 0.5, 0.68, 0.8, 0.95].slice(-mdsOf({ rounds }).length)));
    }
  }

  function build(S) {
    const taken = new Set();
    const out = [];
    if (S.gender === 'F') buildWomen(S, taken, out);
    else { buildUEFA(S, taken, out); buildCONMEBOL(S, taken, out); buildAFC(S, taken, out); buildNorte(S, taken, out); }
    S.cups = out;
    const mine = out.find(c => c.clubs.includes(S.user) && c.id !== 'esc');
    if (mine) {
      const first = mine.mds[0];
      const r = mine.rounds[0];
      const what = r.league ? `Fase de liga de ${r.mdn} partidos (${r.mdn / 2} en casa y ${r.mdn / 2} fuera): primera jornada en la jornada ${first.week + 1}. Los 8 primeros van a octavos; del 9º al 24º, al play-off.`
        : r.group ? `Fase de grupos: grupo ${'ABCDEFGH'[r.groups.findIndex(g => g.includes(S.user))]}. Primera jornada en la jornada ${first.week + 1}.`
          : `Primera eliminatoria en la jornada ${first.week + 1}: ${tieText(S, mine, S.user)}.`;
      TL.Game.mail(S, `¡Jugamos la ${mine.name}!`, `${S.clubs[S.user].name} disputa esta temporada la ${mine.name}. ${what} Cada victoria da dinero y prestigio; ojo con el cansancio entre semana.`, 'good');
    }
    const sc = out.find(c => c.id === 'esc' && c.clubs.includes(S.user));
    if (sc) TL.Game.mail(S, `Final de la ${sc.name}`, `Como campeón, juegas la ${sc.name} en la jornada ${sc.mds[0].week + 1} contra el ${S.clubs[sc.clubs.find(x => x !== S.user)].name}.`, 'good');
  }

  // ------------------------------------------------------------ Partidos
  function tieOf(cup, id) { const r = cup.rounds[cup.cur]; return r && !r.league && !r.group ? r.ties.find(t => t.h === id || t.a === id) : null; }
  function tieText(S, cup, id) {
    const t = tieOf(cup, id);
    if (!t) return '';
    const other = t.h === id ? t.a : t.h;
    return `${cup.rounds[cup.cur].name} contra el ${S.clubs[other].name}`;
  }

  /** Partido de copa del usuario pendiente esta semana (o null). */
  function pendingUser(S) {
    for (const cup of S.cups || []) {
      const md = cup.mds.find(m => !m.done && m.week === S.week);
      if (!md || md.r !== cup.cur) continue;
      const r = cup.rounds[md.r];
      if (r.group || r.league) {
        const t = r.ties.find(x => (x.h === S.user || x.a === S.user) && x.md === md.leg);
        if (!t || t.s.length) continue;
        const where = r.group ? `${r.name} · grupo ${'ABCDEFGH'[t.g]} · jornada ${md.leg + 1}` : `${r.name} · jornada ${md.leg + 1} de ${r.mdn}`;
        return { cup, md, tie: t, home: t.h, away: t.a, round: where, leg: 0, legs: 1, group: true, label: `${cup.name} · ${where}` };
      }
      const t = tieOf(cup, S.user);
      if (!t || t.s.length > md.leg) continue;
      const home = md.leg === 0 ? t.h : t.a, away = md.leg === 0 ? t.a : t.h;
      return { cup, md, tie: t, home, away, round: r.name, leg: md.leg, legs: r.legs, label: `${cup.name} · ${r.name}${r.legs > 1 ? (md.leg ? ' (vuelta)' : ' (ida)') : ''}` };
    }
    return null;
  }

  function simTie(S, t, leg) {
    const home = leg === 0 ? t.h : t.a, away = leg === 0 ? t.a : t.h;
    const [hg, ag] = E().quickScore(strength(S, home), strength(S, away));
    t.s[leg] = leg === 0 ? [hg, ag] : [ag, hg]; // siempre desde el punto de vista de t.h
  }

  /** Resultado del usuario + simulación del resto de la jornada de copa. */
  function completeUser(S, res, p) {
    const t = p.tie;
    const hg = res.h === t.h ? res.hg : res.ag, ag = res.h === t.h ? res.ag : res.hg;
    t.s[p.group ? 0 : p.leg] = [hg, ag];
    if (p.group && p.cup.rounds[p.md.r].league && !S.mode) leagueWinBonus(S, p.cup, t);
    if (res.review) TL.Coach.store(S, Object.assign(res.review, { comp: p.cup.short }));
    return playMatchday(S, p.cup, p.md);
  }
  function leagueWinBonus(S, cup, t) {
    const [a, b] = t.s[0];
    const won = (t.h === S.user && a > b) || (t.a === S.user && b > a);
    if (won) pay(S, money(S, 2.1e6 * (COMPS[cup.id] ? COMPS[cup.id].prize : 0.3)), 'Prima por victoria');
  }

  function playMatchday(S, cup, md) {
    const r = cup.rounds[md.r];
    if (r.group || r.league) {
      for (const t of r.ties) if (t.md === md.leg && !t.s.length) simTie(S, t, 0);
      md.done = true;
      if (md.leg === (r.mdn || 3) - 1) { if (r.league) resolveLeague(S, cup, md.r); else resolveGroups(S, cup, md.r); }
      return { cup, md, round: r.name };
    }
    for (const t of r.ties) if (t.s.length <= md.leg) simTie(S, t, md.leg);
    md.done = true;
    const out = { cup, md, round: r.name };
    if (md.leg === r.legs - 1) resolveRound(S, cup, md.r);
    return out;
  }

  // ------------------------------------------------------------ Tablas
  function tableOf(S, ids, ties) {
    const rows = new Map(ids.map(id => [id, { id, pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gfa: 0, wa: 0, pts: 0 }]));
    for (const t of ties) {
      if (!t.s.length || !rows.has(t.h) || !rows.has(t.a)) continue;
      const [a, b] = t.s[0], h = rows.get(t.h), aw = rows.get(t.a);
      h.pj++; aw.pj++; h.gf += a; h.ga += b; aw.gf += b; aw.ga += a; aw.gfa += b;
      if (a > b) { h.w++; h.pts += 3; aw.l++; } else if (a < b) { aw.w++; aw.wa++; aw.pts += 3; h.l++; } else { h.d++; aw.d++; h.pts++; aw.pts++; }
    }
    // Desempates: puntos, diferencia, goles, goles fuera, victorias, victorias fuera, coeficiente
    return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || y.gfa - x.gfa || y.w - x.w || y.wa - x.wa || coef(S, y.id) - coef(S, x.id));
  }
  /** Clasificación de un grupo. */
  function groupTable(S, r, g) { return tableOf(S, r.groups[g], r.ties.filter(t => t.g === g)); }
  /** Clasificación de la fase de liga (o de una región). */
  function leagueTable(S, r, rg) {
    const ids = r.regions ? r.regions[rg || 0] : r.clubs;
    return tableOf(S, ids, r.regions ? r.ties.filter(t => t.rg === (rg || 0)) : r.ties);
  }

  /** Fin de la fase de liga: 1º-8º a octavos, 9º-24º al play-off (o, por regiones, 8 por región a octavos). */
  function resolveLeague(S, cup, ri) {
    cup.rank = cup.rank || {};
    const r = cup.rounds[ri];
    const next = cup.rounds[ri + 1];
    cup.cur = ri + 1;
    if (r.regions) {
      // Octavos dentro de cada región: 1-8, 4-5, 2-7, 3-6 (cuadro fijo); la vuelta, en casa del mejor
      const ties = [];
      r.regions.forEach((_, rg) => {
        const tab = leagueTable(S, r, rg);
        tab.forEach((x, k) => { cup.rank[x.id] = k + 1 + rg * 0.5; });
        for (const [a, b] of [[0, 7], [3, 4], [1, 6], [2, 5]]) ties.push({ h: tab[b].id, a: tab[a].id, s: [] });
      });
      next.ties = ties;
      userLeagueEnd(S, cup, r, ties);
      return;
    }
    const tab = leagueTable(S, r);
    tab.forEach((x, k) => { cup.rank[x.id] = k + 1; });
    const id = k => tab[k] && tab[k].id;
    // Play-off: 9/10 vs 23/24 · 11/12 vs 21/22 · 13/14 vs 19/20 · 15/16 vs 17/18 (sorteo dentro de cada pareja)
    const po = [];
    for (const [a, b] of [[8, 22], [10, 20], [12, 18], [14, 16]]) {
      const top = U.shuffle([id(a), id(a + 1)]), low = U.shuffle([id(b), id(b + 1)]);
      po.push({ h: low[0], a: top[0], s: [], pair: a }, { h: low[1], a: top[1], s: [], pair: a });
    }
    next.ties = po;
    // Octavos (se completan con los ganadores del play-off): 1/2 vs (15/16-17/18), 3/4 vs (13/14-19/20)…
    const seedsFor = { 14: [0, 1], 12: [2, 3], 10: [4, 5], 8: [6, 7] };
    const r16 = cup.rounds[ri + 2];
    const slot = {};
    for (const [pair, [s1, s2]] of Object.entries(seedsFor)) {
      const [x, y] = U.shuffle([s1, s2]);
      slot[x] = { pair: +pair, n: 0 }; slot[y] = { pair: +pair, n: 1 };
    }
    // Cuadro tipo tenis: 1 y 2 en mitades opuestas (1-8, 4-5 | 2-7, 3-6)
    r16.pending = [0, 7, 3, 4, 1, 6, 2, 5].map(k => ({ seed: id(k), pair: slot[k].pair, n: slot[k].n }));
    userLeagueEnd(S, cup, r, po);
  }
  function userLeagueEnd(S, cup, r, ties) {
    if (!r.clubs.includes(S.user)) return;
    const pos = cup.rank[S.user];
    const t = ties.find(x => x.h === S.user || x.a === S.user);
    const nextName = cup.rounds[cup.cur].name;
    if (t) TL.Game.mail(S, `${cup.name}: terminamos ${Math.floor(pos)}º`, `Fase de liga cerrada en el puesto ${Math.floor(pos)}. ${nextName}: contra el ${S.clubs[t.h === S.user ? t.a : t.h].name}.`, 'good');
    else if (cup.rounds[cup.cur + 1] && cup.rounds[cup.cur + 1].pending && cup.rounds[cup.cur + 1].pending.some(p => p.seed === S.user))
      TL.Game.mail(S, `${cup.name}: ¡directos a octavos!`, `Terminamos ${Math.floor(pos)}º en la fase de liga: nos saltamos el play-off. Rival: el ganador del play-off que nos toque.`, 'good');
    else TL.Game.mail(S, `${cup.name}: eliminados`, `Terminamos ${Math.floor(pos)}º en la fase de liga. Solo pasaban los 24 primeros. Toca centrarse en la liga.`, 'med');
  }

  /** Fin de la fase de grupos: pasan los dos primeros (en la Latinoamericana, el 2º va al play-off). */
  function resolveGroups(S, cup, ri) {
    cup.rank = cup.rank || {};
    const r = cup.rounds[ri];
    const tabs = r.groups.map((_, g) => groupTable(S, r, g));
    tabs.forEach(tab => tab.forEach((x, k) => { cup.rank[x.id] = k + 1 - x.pts / 100; }));
    cup.cur = ri + 1;
    const next = cup.rounds[ri + 1];
    let userMsg = null;
    if (cup.id === 'lat') {
      // Play-off: 2º de grupo contra un 3º de grupo de Liberadores (que juega la vuelta en casa)
      const lib = (S.cups || []).find(c => c.id === 'lib');
      // Sus grupos acaban la misma semana: si aún no se han cerrado, se juegan antes
      if (lib && !lib.thirds) for (const m of lib.mds) if (!m.done && m.r === lib.cur && m.week <= S.week && lib.rounds[m.r].group) playMatchday(S, lib, m);
      const thirds = lib ? lib.thirds || [] : [];
      const seconds = U.shuffle(tabs.map(t => t[1].id));
      next.ties = seconds.map((id, k) => ({ h: id, a: thirds[k] != null ? thirds[k] : tabs[(k + 1) % tabs.length][2].id, s: [] }));
      next.ties.forEach(t => { if (!cup.clubs.includes(t.a)) cup.clubs.push(t.a); });
      cup.firsts = tabs.map(t => t[0].id);
    } else {
      // Octavos: 1º contra 2º de otro grupo (el 1º, vuelta en casa); el sorteo fija el cuadro
      const firsts = U.shuffle(tabs.map((t, g) => [t[0].id, g]));
      let seconds = null;
      for (let k = 0; k < 50; k++) { const s = U.shuffle(tabs.map((t, g) => [t[1].id, g])); if (s.every((x, i) => x[1] !== firsts[i][1])) { seconds = s; break; } }
      seconds = seconds || tabs.map((t, g) => [t[1].id, g]).reverse();
      next.ties = firsts.map(([id], i) => ({ h: seconds[i][0], a: id, s: [] }));
      if (cup.id === 'lib') cup.thirds = U.shuffle(tabs.map(t => t[2].id));
    }
    const g = tabs.findIndex(t => t.some(x => x.id === S.user));
    if (g >= 0) {
      const pos = tabs[g].findIndex(x => x.id === S.user) + 1;
      const t = next.ties.find(x => x.h === S.user || x.a === S.user);
      if (t) TL.Game.mail(S, `${cup.name}: ¡seguimos vivos!`, `Terminamos ${pos}º del grupo ${'ABCDEFGH'[g]}. ${next.name}: contra el ${S.clubs[t.h === S.user ? t.a : t.h].name}.`, 'good');
      else if (cup.id === 'lat' && pos === 1) TL.Game.mail(S, `${cup.name}: ¡directos a octavos!`, `Primeros del grupo ${'ABCDEFGH'[g]}: esperamos al ganador del play-off.`, 'good');
      else if (cup.id === 'lib' && pos === 3) userMsg = [`${cup.name}: terceros de grupo`, `Terminamos 3º del grupo ${'ABCDEFGH'[g]}: seguimos en la Latinoamericana, en su play-off.`];
      else TL.Game.mail(S, `${cup.name}: eliminados en la fase de grupos`, `Terminamos ${pos}º del grupo ${'ABCDEFGH'[g]}. No ha podido ser.`, 'med');
    }
    if (userMsg) TL.Game.mail(S, userMsg[0], userMsg[1], 'board');
  }

  function aggregate(t) {
    const a = t.s.reduce((s, x) => s + (x ? x[0] : 0), 0), b = t.s.reduce((s, x) => s + (x ? x[1] : 0), 0);
    return [a, b];
  }

  function resolveRound(S, cup, ri) {
    cup.rank = cup.rank || {};
    const r = cup.rounds[ri];
    const winners = [];
    for (const t of r.ties) {
      const [a, b] = aggregate(t);
      if (a !== b) t.w = a > b ? t.h : t.a;
      else {
        // Prórroga y penaltis: el más fuerte tiene algo más de opciones
        const pa = strength(S, t.h) / (strength(S, t.h) + strength(S, t.a));
        t.w = Math.random() < 0.5 + (pa - 0.5) * 0.6 ? t.h : t.a;
        t.pens = true;
      }
      winners.push(t.w);
      if (t.h === S.user || t.a === S.user) userRoundOver(S, cup, r, t);
    }
    if (ri + 1 >= cup.rounds.length) {
      cup.champ = winners[0];
      cup.cur = cup.rounds.length;
      const c = S.clubs[cup.champ];
      (S.holdersNext || (S.holdersNext = {}))[cup.id] = cup.champ;
      (S.coef || (S.coef = {}))[cup.champ] = ((S.coef || {})[cup.champ] || 0) + 6 * (COMPS[cup.id] ? COMPS[cup.id].prize : 0.3);
      TL.News.add(S, 'positivo', `${c.name}, campeón de la ${cup.name}`, `El ${c.name} levanta el trofeo tras ganar la final.`, cup.champ, null, cup.champ === S.user ? 'pos' : 'neu');
      return;
    }
    cup.cur = ri + 1;
    const next = cup.rounds[ri + 1];
    const rk = id => (cup.rank[id] != null ? cup.rank[id] : 99);
    if (next.pending) {
      // Octavos de las europeas: cada cabeza de serie contra el ganador del play-off que le toca
      next.ties = next.pending.map(p => {
        const ws = r.ties.filter(t => t.pair === p.pair).map(t => t.w);
        return { h: ws[p.n], a: p.seed, s: [] };
      });
      delete next.pending;
    } else if (cup.id === 'lat' && cup.firsts) {
      // Octavos de la Latinoamericana: 1º de grupo (vuelta en casa) contra un ganador del play-off
      next.ties = U.shuffle(winners.slice()).map((w, k) => ({ h: w, a: cup.firsts[k], s: [] }));
      delete cup.firsts;
    } else if (cup.fixed) {
      // Cuadro fijo: el ganador de una eliminatoria contra el de la siguiente; la vuelta, en casa del mejor clasificado
      const ties = [];
      if (cup.id === 'asia' && next.name === 'Cuartos') {
        // Cuartos: sorteo Oeste contra Este
        const west = U.shuffle(winners.slice(0, 4)), east = U.shuffle(winners.slice(4));
        west.forEach((w, k) => ties.push({ h: w, a: east[k], s: [] }));
      } else {
        for (let k = 0; k + 1 < winners.length; k += 2) {
          const [x, y] = [winners[k], winners[k + 1]];
          ties.push(rk(x) <= rk(y) ? { h: y, a: x, s: [] } : { h: x, a: y, s: [] });
        }
      }
      next.ties = ties;
    } else {
      const p = U.shuffle(winners.slice());
      next.ties = [];
      for (let k = 0; k + 1 < p.length; k += 2) next.ties.push({ h: p[k], a: p[k + 1], s: [] });
    }
    const t = next.ties.find(x => x.h === S.user || x.a === S.user);
    if (t) {
      const nx = cup.mds.find(m => m.r === cup.cur);
      TL.Game.mail(S, `${cup.name}: ${next.name.toLowerCase()}`, `${next.name}: contra el ${S.clubs[t.h === S.user ? t.a : t.h].name}. Se juega en la jornada ${nx.week + 1}.`, 'board');
    }
  }

  // ------------------------------------------------------------ Premios
  function prize(S, cup, kind) {
    const base = COMPS[cup.id] ? COMPS[cup.id].prize : 0.3;
    return money(S, { entry: 15e6, win: 6e6, title: 20e6 }[kind] * base);
  }
  function pay(S, amount, why) {
    S.clubs[S.user].cash += amount;
    if (S.fin) S.fin.prizes = (S.fin.prizes || 0) + amount;
    return `${why}: +${U.money(amount)}`;
  }

  function userRoundOver(S, cup, r, t) {
    const won = t.w === S.user;
    const other = t.h === S.user ? t.a : t.h;
    const [a, b] = aggregate(t);
    const mineFirst = t.h === S.user ? `${a}-${b}` : `${b}-${a}`;
    const final = r.name === 'Final';
    const tour = S.mode === 'tour';
    if (won) {
      const amount = tour ? 0 : prize(S, cup, final ? 'title' : 'win');
      const paid = tour ? '¡A por la siguiente!' : pay(S, amount, final ? 'Premio de campeón' : 'Premio por pasar de ronda');
      if (!tour) {
        S.board.conf = U.clamp(S.board.conf + (final ? 15 : 3), 0, 100);
        TL.Manager.addXp(S, final ? 400 : 60);
        if (S.com) S.com.fans = Math.round(S.com.fans * (final ? 1.06 : 1.01));
        (S.coef || (S.coef = {}))[S.user] = ((S.coef || {})[S.user] || 0) + 1;
      }
      if (final) {
        (S.titles || (S.titles = [])).push({ s: S.season, name: cup.name });
        TL.Game.mail(S, `🏆 ¡CAMPEONES DE LA ${cup.name.toUpperCase()}!`, `¡Lo has conseguido! ${S.clubs[S.user].name} gana la final ante el ${S.clubs[other].name}${t.pens ? ' en los penaltis' : ''}. ${paid}. La afición está en las nubes.`, 'good');
        S._cupTitle = cup.name;
      } else {
        TL.Game.mail(S, `Pasamos de ronda en la ${cup.name}`, `Eliminatoria ante el ${S.clubs[other].name}: ${mineFirst} en el global${t.pens ? ' (penaltis)' : ''}. ${paid}.`, 'good');
      }
    } else {
      TL.Game.mail(S, final ? `Subcampeones de la ${cup.name}` : `Eliminados de la ${cup.name}`, `${final ? 'Perdemos la final' : 'Caemos'} ante el ${S.clubs[other].name} (${mineFirst}${t.pens ? ', penaltis' : ''}). ${final ? 'Un subcampeonato que sabe a poco, pero que da prestigio.' : 'Toca centrarse en la liga.'}`, final ? 'board' : 'med');
      if (final && !tour) { pay(S, prize(S, cup, 'win') * 2, 'Premio de finalista'); TL.Manager.addXp(S, 150); }
    }
  }

  /** Antes de jugar la jornada de liga: se disputan las jornadas de copa pendientes. */
  function catchUp(S) {
    const res = [];
    for (const cup of S.cups || []) {
      for (const md of cup.mds) {
        if (md.done || md.week > S.week || md.r !== cup.cur) continue;
        res.push(playMatchday(S, cup, md));
      }
    }
    return res;
  }

  /** Fin de temporada: se cierran las copas, se apuntan los campeones y el resultado del usuario. */
  function seasonEnd(S, sum) {
    for (const cup of S.cups || []) {
      let guard = 40;
      while (cup.champ == null && guard-- > 0) {
        const md = cup.mds.find(m => !m.done && m.r === cup.cur);
        if (!md) break;
        playMatchday(S, cup, md);
      }
      if (cup.champ != null) (S.holdersNext || (S.holdersNext = {}))[cup.id] = cup.champ;
    }
    S.holders = S.holdersNext || {};
    S.holdersNext = {};
    // El coeficiente se va olvidando (cinco temporadas)
    for (const k in S.coef || {}) { S.coef[k] *= 0.8; if (S.coef[k] < 0.2) delete S.coef[k]; }
    const mine = myCup(S);
    if (mine && sum) {
      const reached = mine.champ === S.user ? 'Campeón' : (() => {
        let last = mine.rounds[0].name;
        mine.rounds.forEach(r => { if (r.ties.some(t => t.h === S.user || t.a === S.user) || (r.clubs && r.clubs.includes(S.user))) last = r.name; });
        return last === 'Final' ? 'Subcampeón' : last;
      })();
      sum.cup = { name: mine.name, reached };
      if (S.history && S.history[0] && S.history[0].season === S.season) S.history[0].cup = `${mine.short}: ${reached}`;
    }
  }

  /** Nueva temporada: se clasifican los equipos y se sortea. */
  function newSeason(S) {
    build(S);
    const mine = myCup(S);
    if (mine) {
      const amount = prize(S, mine, 'entry');
      pay(S, amount, 'Derechos de participación');
      TL.Game.mail(S, `Ingreso por jugar la ${mine.name}`, `La competición abona ${U.money(amount)} por participar.`, 'club');
    }
  }

  function myCup(S) { return (S.cups || []).find(c => c.id !== 'esc' && c.clubs.includes(S.user)) || null; }
  function qualify() { return []; }

  TL.Cups = { groupTable, leagueTable, DEFS, COMPS, build, newSeason, pendingUser, completeUser, playMatchday, catchUp, seasonEnd, aggregate, tieOf, myCup, qualify, topLeagues };
})();
