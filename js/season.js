/* TOUCHLINE — calendario, clasificación, jornadas y fin de temporada */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U, W = TL.World, E = TL.Engine;

  // ------------------------------------------------------------ Calendario
  function roundRobin(ids, double) {
    const t = U.shuffle(ids.slice());
    if (t.length % 2) t.push(-1);
    const n = t.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        if (a === -1 || b === -1) continue;
        const swap = i === 0 ? r % 2 === 1 : i % 2 === 1;
        pairs.push(swap ? [b, a] : [a, b]);
      }
      rounds.push(pairs);
      t.splice(1, 0, t.pop());
    }
    if (double) {
      const second = rounds.map(r => r.map(([h, a]) => [a, h]));
      return rounds.concat(second);
    }
    return rounds;
  }

  function makeFixtures(S) {
    const L = W.userLeague(S);
    const rounds = roundRobin(L.clubs, L.clubs.length <= 24);
    // Cada partido: [local, visitante, goles local, goles visitante] (-1 = sin jugar)
    S.fixtures = rounds.map(r => r.map(([h, a]) => [h, a, -1, -1]));
  }

  function nextFixture(S) {
    const r = S.fixtures[S.week];
    if (!r) return null;
    return r.find(m => m[0] === S.user || m[1] === S.user) || null;
  }

  // ------------------------------------------------------------ Clasificación
  function table(S) {
    const L = W.userLeague(S);
    const rows = {};
    for (const id of L.clubs) rows[id] = { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] };
    for (const r of S.fixtures) {
      for (const [h, a, hg, ag] of r) {
        if (hg < 0 || !rows[h] || !rows[a]) continue;
        const H = rows[h], A = rows[a];
        H.pj++; A.pj++; H.gf += hg; H.gc += ag; A.gf += ag; A.gc += hg;
        if (hg > ag) { H.g++; A.p++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
        else if (hg < ag) { A.g++; H.p++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
        else { H.e++; A.e++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
      }
    }
    return Object.values(rows).sort((x, y) =>
      y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf || S.clubs[x.id].name.localeCompare(S.clubs[y.id].name));
  }

  function promoInfo(S) {
    const L = W.userLeague(S);
    const up = S.promotion.find(p => p[1] === L.id); // esta liga es la inferior
    const down = S.promotion.find(p => p[0] === L.id); // esta liga es la superior
    return { promote: up ? up[2] : 0, relegate: down ? down[2] : 0 };
  }

  // ------------------------------------------------------------ Objetivos
  function setObjective(S) {
    const L = W.userLeague(S);
    const ranked = L.clubs.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
    const r = ranked.indexOf(S.user) + 1, n = L.clubs.length;
    const { relegate, promote } = promoInfo(S);
    let target, text;
    if (r <= 2) { target = r === 1 ? 1 : 2; text = r === 1 ? 'Ganar la liga' : 'Pelear el título (top 2)'; }
    else if (promote && r <= promote + 2) { target = promote; text = `Lograr el ascenso (top ${promote})`; }
    else if (r <= Math.ceil(n / 3)) { target = Math.min(n, r + 1); text = `Terminar entre los ${target} primeros`; }
    else if (r <= Math.ceil(n * 0.66)) { target = Math.ceil(n * 0.6); text = `Mitad de tabla (top ${target})`; }
    else { target = n - Math.max(relegate, 2); text = relegate ? 'Evitar el descenso' : `No quedar en los ${n - target} últimos`; }
    S.board.target = target;
    S.board.text = text;
    S.board.rank = r;
  }

  // ------------------------------------------------------------ Jornada
  /**
   * Juega la jornada actual. userResult: resultado ya calculado del partido del
   * usuario (Match.finish()) o null para simularlo aquí.
   */
  function playRound(S, userResult) {
    const round = S.fixtures[S.week];
    const results = [];
    for (const m of round) {
      let res;
      if ((m[0] === S.user || m[1] === S.user) && userResult) res = userResult;
      else res = new E.Match(S, m[0], m[1]).simulate().finish();
      m[2] = res.hg; m[3] = res.ag;
      results.push(res);
    }
    const L = W.userLeague(S);
    const um = round.find(m => m[0] === S.user || m[1] === S.user);
    const letter = um ? (um[0] === S.user ? Math.sign(um[2] - um[3]) : Math.sign(um[3] - um[2])) : null;
    const resLetter = letter == null ? null : letter > 0 ? 'V' : letter < 0 ? 'D' : 'E';
    // Finanzas semanales: el usuario con su área comercial; la IA, modelo simple
    for (const cid of L.clubs) {
      if (cid === S.user) TL.Commerce.weekly(S, round, resLetter);
      else weeklyFinances(S, cid, round);
    }
    // Forma física y lesiones
    const fb = TL.Manager.B(S);
    for (const p of S.players) {
      if (p.club < -1) continue;
      if (p.inj > 0) p.inj--;
      if (p.fit < 100) {
        const rec = 13 + Math.round(p.st[5] / 25);
        p.fit = Math.min(100, p.fit + (p.club === S.user ? Math.round(rec * (2 - fb.fatigue)) : rec));
      }
    }
    // Directiva, experiencia y avisos propios
    if (um) {
      const mine = um[0] === S.user ? um[2] : um[3], opp = um[0] === S.user ? um[3] : um[2];
      const oppId = um[0] === S.user ? um[1] : um[0];
      const repGap = (S.clubs[oppId].rep - S.clubs[S.user].rep) / 4;
      let delta = mine > opp ? 2 + Math.max(0, repGap) : mine < opp ? -2.5 + Math.max(0, repGap * 0.5) : Math.max(-1, repGap * 0.5);
      if (delta < 0) delta *= fb.boardLoss;
      S.board.conf = U.clamp(Math.round((S.board.conf + delta) * 10) / 10, 0, 100);
      TL.Manager.addXp(S, (mine > opp ? 25 : mine === opp ? 10 : 4) + mine + (opp === 0 ? 5 : 0) + Math.max(0, Math.round(repGap * 2)));
      for (const r of results) {
        for (const [pid, weeks] of r.injuries || []) {
          const p = S.players[pid];
          if (p.club === S.user) TL.Game.mail(S, 'Parte médico', `${p.name} estará de baja ${weeks} semana${weeks > 1 ? 's' : ''}.`, 'med');
        }
        for (const [pid, games, kind] of r.reds || []) {
          const p = S.players[pid];
          if (p.club === S.user && !['fight', 'confront', 'refAssault'].includes(kind)) {
            TL.Game.mail(S, 'Sanción', `${p.name} se perderá ${games} partido${games > 1 ? 's' : ''} por expulsión.`, 'med');
          }
        }
      }
    }
    S.week++;
    TL.News.afterRound(S, results);
    TL.News.morale(S, results);
    TL.News.weekly(S);
    TL.Market.weekly(S);
    // Avisos
    const total = S.fixtures.length;
    if (S.week === Math.floor(total / 2) - 1) {
      const exp = W.squad(S, S.user).filter(p => p.contract <= S.season + 1);
      if (exp.length) TL.Game.mail(S, 'Contratos que expiran',
        `${exp.length} jugador${exp.length > 1 ? 'es terminan' : ' termina'} contrato este verano: ` +
        exp.map(p => p.short).join(', ') + '. Renueva desde su ficha o se irán libres.', 'club');
    }
    if (S.week === Math.floor(total / 2)) TL.Game.mail(S, 'Mercado de invierno abierto', 'El mercado de fichajes abre durante 3 jornadas.', 'market');
    if (S.week === 4) TL.Game.mail(S, 'Mercado cerrado', 'El mercado de verano se ha cerrado. Reabrirá a mitad de temporada. Los agentes libres se pueden fichar en cualquier momento.', 'market');
    if (S.week >= total) S.over = true;
    if (S.board.conf <= 0 && !S.fired) {
      S.fired = true;
      // Destituido con la liga en marcha: solo llaman clubes de tu liga que van mal
      if (!S.over) TL.Career.makeOffers(S, 'midseason');
    }
    S.results = results.map(r => [r.h, r.a, r.hg, r.ag]);
    return results;
  }

  function weeklyFinances(S, cid, round) {
    const c = S.clubs[cid];
    const wages = W.wageBill(S, cid);
    const commercial = c.revScale * W.revenueCurve(c.stature != null ? c.stature : c.rep);
    let tickets = 0;
    const m = round.find(m => m[0] === cid);
    if (m) {
      const L = S.leagues[c.league];
      const avgRep = U.sum(L.clubs, id => S.clubs[id].rep) / L.clubs.length;
      const opp = S.clubs[m[1]];
      const fill = U.clamp(0.72 + (c.rep - avgRep) * 0.02 + (opp.rep - avgRep) * 0.015 + U.rand(-0.05, 0.05), 0.35, 1);
      tickets = Math.round(c.capacity * fill * c.price);
    }
    c.cash += commercial + tickets - wages;
  }

  // ------------------------------------------------------------ Fin de temporada
  function quickSeasonOrder(S, league) {
    const ids = league.clubs.slice();
    const str = {};
    for (const id of ids) {
      const b = E.bestFormation(W.squad(S, id).map(p => ({ ...p, fit: 100, inj: 0, sus: 0 })));
      str[id] = b.score / 11;
    }
    const pts = Object.fromEntries(ids.map(id => [id, 0]));
    const gd = Object.fromEntries(ids.map(id => [id, 0]));
    for (const r of roundRobin(ids, ids.length <= 24)) {
      for (const [h, a] of r) {
        const [hg, ag] = E.quickScore(str[h], str[a]);
        gd[h] += hg - ag; gd[a] += ag - hg;
        if (hg > ag) pts[h] += 3; else if (ag > hg) pts[a] += 3; else { pts[h]++; pts[a]++; }
      }
    }
    return ids.sort((a, b) => pts[b] - pts[a] || gd[b] - gd[a]);
  }

  function endSeason(S) {
    const sum = { season: S.season, news: [] };
    const L = W.userLeague(S);
    const tab = table(S);
    const n = tab.length;
    const pos = tab.findIndex(r => r.id === S.user) + 1;
    sum.pos = pos; sum.n = n; sum.league = L.name; sum.champion = tab[0].id;
    sum.objective = S.board.text; sum.target = S.board.target;

    // Premios por posición
    tab.forEach((r, i) => {
      const c = S.clubs[r.id];
      const bill = W.wageBill(S, r.id);
      const prize = Math.round(bill * 52 * 0.15 * (1 - (i / Math.max(1, n - 1)) * 0.7));
      c.cash += prize;
      if (r.id === S.user) { S.fin.prizes += prize; sum.prize = prize; }
    });

    // Ascensos / descensos
    const moves = [], orders = {};
    const orderOf = id => orders[id] || (orders[id] = id === L.id ? tab.map(r => r.id) : quickSeasonOrder(S, S.leagues[id]));
    for (const [up, down, k] of S.promotion) {
      const orderUp = orderOf(up), orderDown = orderOf(down);
      const relegated = orderUp.slice(-k), promoted = orderDown.slice(0, k);
      moves.push([relegated, up, down], [promoted, down, up]);
    }
    for (const [ids, from, to] of moves) {
      for (const id of ids) {
        S.leagues[from].clubs = S.leagues[from].clubs.filter(x => x !== id);
        S.leagues[to].clubs.push(id);
        S.clubs[id].league = to;
        if (id === S.user) sum.moved = from === to ? null : (S.promotion.some(p => p[0] === to && p[1] === from) ? 'up' : 'down');
      }
    }

    // Valoración de la directiva
    let delta = U.clamp((S.board.target - pos) * 3 + (pos <= S.board.target ? 10 : -8), -30, 30);
    if (sum.moved === 'up') delta += 20;
    if (sum.moved === 'down') delta -= 30;
    if (pos === 1) delta += 15;
    if (delta < 0) delta = Math.round(delta * TL.Manager.B(S).boardLoss);
    S.board.conf = U.clamp(Math.round(S.board.conf + delta), 0, 100);
    sum.conf = S.board.conf; sum.confDelta = delta;
    sum.xp = (pos <= S.board.target ? 150 : 40) + (pos === 1 ? 250 : 0) + (sum.moved === 'up' ? 200 : 0);
    TL.Manager.addXp(S, sum.xp);
    // Primera temporada: la directiva da una segunda oportunidad
    if (S.board.conf < 15 && !S.history.length) {
      S.board.conf = 20; sum.conf = 20; sum.lastChance = true;
    }

    // Pichichi de la liga (de los jugadores que jugaron en la liga del usuario)
    let top = null;
    for (const id in S.stats) if (!top || S.stats[id][1] > S.stats[top][1]) top = id;
    sum.topScorer = top != null ? [S.players[top].name, S.stats[top][1]] : null;
    let mine = null;
    for (const id in S.stats) {
      if (S.players[id].club !== S.user) continue;
      if (!mine || S.stats[id][1] > S.stats[mine][1]) mine = id;
    }
    sum.myTop = mine != null ? [S.players[mine].name, S.stats[mine][1]] : null;
    sum.finance = { ...S.fin };
    S.history.unshift({
      season: S.season, club: S.clubs[S.user].name, league: L.name, pos, n,
      top: sum.myTop ? sum.myTop[0] + ' (' + sum.myTop[1] + ')' : '—', moved: sum.moved || ''
    });

    if (S.board.conf < 15) { S.fired = true; sum.fired = true; }
    // Reputación del mánager y ofertas de trabajo de otros clubes
    sum.repDelta = TL.Career.seasonRep(S, sum);
    sum.jobs = TL.Career.makeOffers(S, sum.fired ? 'fired' : 'season', sum);
    S.endDone = true;

    // Evolución, retiradas y contratos
    const userPlayers = new Set(W.squad(S, S.user).map(p => p.id));
    const retired = [], left = [];
    for (const p of S.players) {
      if (p.club < -1) continue;
      develop(S, p);
      const retireP = p.age >= 39 ? 1 : p.age >= 36 ? 0.5 : p.age >= 34 ? 0.22 : p.age >= 33 && p.ovr < 65 ? 0.15 : 0;
      if (Math.random() < retireP || (p.club === -1 && p.age >= 33 && Math.random() < 0.5)) {
        if (userPlayers.has(p.id)) retired.push(p.name);
        p.club = -2; p.listed = false;
        continue;
      }
      if (p.club >= 0 && p.contract <= S.season + 1) {
        if (p.club === S.user) {
          left.push(p.name);
          p.club = -1; p.contract = 0; p.listed = false;
        } else if (Math.random() < 0.78) {
          p.contract = S.season + 1 + U.int(1, p.age >= 31 ? 1 : 3);
          p.wage = F.wageFor(p.ovr, p.age, S.leagues[S.clubs[p.club].league].wealth, S.econ.wage);
        } else {
          p.club = -1; p.contract = 0; p.listed = false;
        }
      }
    }
    sum.retired = retired; sum.left = left;
    W.dirty(S);

    // Cantera
    sum.youth = [];
    for (const c of S.clubs) {
      const sq = W.squad(S, c.id);
      const yb = TL.Manager.bonus(S, c.id);
      const k = (sq.length < 22 ? 4 : sq.length < 26 ? 3 : sq.length < 32 ? 2 : 0) + (sq.length < 34 ? yb.youthExtra : 0);
      const nats = sq.length ? sq.map(p => p.nat) : [0];
      for (let i = 0; i < k; i++) {
        const line = U.weighted([0, 1, 2, 3], l => [1, 3, 3, 2][l]);
        const pos = line === 0 ? 'GK' : U.pick(W.LINE_POS[line]);
        const ovr = U.clamp(c.rep - 20 + U.int(-6, 6), 40, 68);
        const p = W.makePlayer(S, {
          club: c.id, nat: U.pick(nats.slice(0, 12)), pos, age: U.int(16, 18), ovr,
          pot: Math.min(c.rep + 12 + yb.youthPot, ovr + U.int(8, 30) + yb.youthPot), contract: S.season + 1 + U.int(2, 3)
        });
        p.wage = F.wageFor(p.ovr, p.age, S.leagues[c.league].wealth, S.econ.wage);
        if (c.id === S.user) sum.youth.push(p.id);
      }
    }
    W.dirty(S);

    // Clubes de la IA: cubren huecos con agentes libres o, si no, jugadores generados
    W.maintainSquads(S, S.clubs.filter(c => c.id !== S.user).map(c => c.id));

    // Los agentes libres que nadie ficha acaban dejando el fútbol profesional
    const free = S.players.filter(p => p.club === -1).sort((a, b) => b.ovr - a.ovr);
    free.forEach((p, i) => {
      if (i >= 500 || Math.random() < (p.age >= 31 ? 0.6 : 0.3)) { p.club = -2; p.listed = false; }
    });
    W.dirty(S);

    // Economía de la nueva temporada. La "talla" del club (de la que dependen TV y
    // patrocinios) cambia despacio: no se hunde porque se vayan jugadores un verano.
    for (const c of S.clubs) {
      if (c.stature == null) c.stature = c.rep;
      const finish = c.league === L.id ? tab.findIndex(r => r.id === c.id) : -1;
      const bonus = finish >= 0 ? (1 - finish / Math.max(1, n - 1) - 0.5) * 1.5 : 0;
      c.stature = Math.round((c.stature + (c.rep - c.stature) * 0.2 + bonus) * 10) / 10;
      if (c.id !== S.user) c.wageBudget = F.roundMoney(W.wageBill(S, c.id) * 1.12);
      if (c.id !== S.user && c.cash < 0) c.cash = Math.round(c.cash * 0.5);
    }
    sum.wageBudget = TL.Commerce.refreshBudget(S);
    return sum;
  }

  function develop(S, p) {
    p.age++;
    const before = p.ovr;
    let d = 0;
    const apps = (S.stats[p.id] || [0])[0];
    const playBonus = apps >= 20 ? 1.15 : apps >= 8 ? 1 : 0.85;
    const grow = p.club === S.user ? TL.Manager.B(S).youthGrowth : 1;
    if (p.age <= 23) d = Math.round((p.pot - p.ovr) * U.rand(0.18, 0.45) * playBonus * grow);
    else if (p.age <= 27) d = p.pot > p.ovr ? Math.round((p.pot - p.ovr) * U.rand(0.2, 0.6)) : U.int(-1, 1);
    else if (p.age <= 30) d = U.int(-2, 1);
    else if (p.age <= 32) d = U.int(-3, 0);
    else d = U.int(-5, -1);
    p.ovr = U.clamp(p.ovr + d, 30, 95);
    // El potencial se ajusta: nunca por debajo de la media; con la edad converge
    if (p.age >= 27) p.pot = p.ovr;
    else p.pot = Math.max(p.ovr, p.pot + U.int(-2, 1));
    const delta = p.ovr - before;
    if (delta) p.st = p.st.map(v => U.clamp(v + delta, 15, 99));
    p.fit = 100; p.inj = 0; p.sus = 0;
  }

  /** Arranca la temporada siguiente tras endSeason. */
  function newSeason(S) {
    S.season++;
    S.week = 0;
    S.endDone = false;
    S.jobOffers = null;
    S.stats = {};
    S.neg = {};
    S.over = false;
    S.results = [];
    S.fin = W.newFin();
    S.log = { crowd: {} };
    compactPlayers(S);
    W.dirty(S);
    makeFixtures(S);
    setObjective(S);
    S.tactics.slots = E.autoLineup(W.squad(S, S.user), S.tactics.formation, false);
    TL.Commerce.newSeason(S);
    for (const p of W.squad(S, S.user)) if (p.mor == null) p.mor = 70;
    TL.Game.mail(S, `Temporada ${U.seasonLabel(S.season)}`,
      `Objetivo de la directiva: ${S.board.text}. Presupuesto salarial: ${U.money(S.clubs[S.user].wageBudget)}/sem. ` +
      'El mercado de verano está abierto hasta la jornada 3.', 'board');
  }

  /** Elimina del array a los jugadores generados ya retirados (y reasigna ids). */
  function compactPlayers(S) {
    const keep = S.players.filter(p => !(p.gen && p.club === -2));
    if (keep.length === S.players.length) return;
    const remap = new Map();
    keep.forEach((p, i) => { remap.set(p.id, i); p.id = i; });
    S.players = keep;
    S.tactics.slots = (S.tactics.slots || []).map(id => remap.has(id) ? remap.get(id) : -1);
    for (const n of S.news || []) n.pid = n.pid >= 0 && remap.has(n.pid) ? remap.get(n.pid) : -1;
    for (const m of S.inbox) if (m.data && m.data.pid != null) m.done = true;
  }

  TL.Season = { roundRobin, makeFixtures, nextFixture, table, promoInfo, setObjective, playRound, endSeason, newSeason };
})();
