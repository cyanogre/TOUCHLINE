/* TOUCHLINE — competiciones continentales
 *
 * Europa tiene dos copas (la de campeones y la continental, 32 clubes cada una);
 * América y Asia, una copa de campeones cada una. Se clasifican los mejores de cada
 * liga de la temporada anterior (en la primera, por nivel del club). Eliminatorias a
 * ida y vuelta y final a partido único, entre semana, repartidas por la temporada.
 * Tus partidos se juegan como los de liga (en directo o resultado rápido); los demás
 * se simulan. Dan dinero, prestigio, confianza de la directiva y títulos.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World, E = () => TL.Engine;

  // Orden de fuerza de las ligas europeas (como un coeficiente)
  const EU = ['Inglaterra', 'España', 'Italia', 'Alemania', 'Francia', 'Portugal', 'Países Bajos', 'Bélgica', 'Turquía', 'Escocia', 'Austria',
    'Chequia', 'Grecia', 'Noruega', 'Dinamarca', 'Suiza', 'Ucrania', 'Polonia', 'Croacia', 'Suecia', 'Rumanía', 'Hungría', 'Chipre', 'Bulgaria',
    'Azerbaiyán', 'Irlanda', 'Finlandia', 'Serbia', 'Eslovenia', 'Eslovaquia', 'Islandia', 'Gales', 'Rusia'];
  const AM = ['Argentina', 'Brasil', 'México', 'Estados Unidos', 'Colombia', 'Sudamérica', 'Uruguay', 'Chile', 'Perú', 'Ecuador', 'Paraguay'];
  const AS = ['Arabia Saudí', 'Japón', 'Corea del Sur', 'China', 'Emiratos Árabes Unidos', 'Australia', 'Catar', 'Tailandia', 'India'];
  const T1 = [4, 4, 4, 4, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const T2 = [2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  const DEFS = [
    { id: 'eu1', name: 'Copa de Campeones de Europa', short: 'Campeones', tier: 1, conf: EU, size: 32, color: '#5db8ff', icon: '⭐' },
    { id: 'eu2', name: 'Copa Continental', short: 'Continental', tier: 2, conf: EU, size: 32, color: '#ff9a3d', icon: '🔶' },
    { id: 'am1', name: 'Copa de Campeones de América', short: 'América', tier: 1, conf: AM, size: 16, color: '#f2c94c', icon: '🏆' },
    { id: 'as1', name: 'Copa de Campeones de Asia', short: 'Asia', tier: 1, conf: AS, size: 16, color: '#e05a5a', icon: '🏆' }
  ];
  const ROUND_NAMES = { 32: 'Dieciseisavos', 16: 'Octavos', 8: 'Cuartos', 4: 'Semifinales', 2: 'Final' };
  // Momentos de la temporada (fracción del calendario de liga) para cada partido
  const SLOTS = [0.11, 0.17, 0.25, 0.32, 0.42, 0.5, 0.6, 0.68, 0.8];

  // ------------------------------------------------------------ Clasificación
  /** Liga principal de cada país (la que no es inferior de ninguna). */
  function topLeagues(S) {
    const lower = new Set(S.promotion.map(p => p[1]));
    const byCountry = {};
    for (const l of S.leagues) {
      if (!l.clubs.length || lower.has(l.id)) continue;
      const cur = byCountry[l.country];
      if (!cur || l.wealth > cur.wealth) byCountry[l.country] = l;
    }
    return byCountry;
  }
  function orderOf(S, l) {
    const prev = S.lastOrder && S.lastOrder[l.id];
    const ids = l.clubs.slice();
    if (prev) return prev.filter(id => ids.includes(id)).concat(ids.filter(id => !prev.includes(id)));
    return ids.sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
  }

  function qualify(S, def, taken) {
    const tops = topLeagues(S);
    const out = [];
    if (def.conf === EU) {
      const leagues = EU.map(c => tops[c]).filter(Boolean);
      const slots = def.tier === 1 ? T1 : T2;
      const skip = def.tier === 1 ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : T1;
      leagues.forEach((l, k) => {
        const ord = orderOf(S, l).filter(id => !taken.has(id));
        const n = slots[k] || 0;
        const from = def.tier === 1 ? 0 : 0;
        ord.slice(from, from + n).forEach(id => out.push(id));
        void skip;
      });
      // Si faltan, los mejores clubes europeos que quedan
      const rest = leagues.flatMap(l => orderOf(S, l)).filter(id => !taken.has(id) && !out.includes(id)).sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
      while (out.length < def.size && rest.length) out.push(rest.shift());
    } else {
      const leagues = def.conf.map(c => tops[c]).filter(Boolean);
      // Hasta 4 por país, los mejores de cada liga primero
      const pool = [];
      leagues.forEach(l => orderOf(S, l).filter(id => !taken.has(id)).slice(0, l.country === 'Sudamérica' ? 8 : 4).forEach((id, k) => pool.push([id, k])));
      pool.sort((a, b) => a[1] - b[1] || S.clubs[b[0]].rep - S.clubs[a[0]].rep);
      for (const [id] of pool) if (out.length < def.size) out.push(id);
    }
    let size = def.size;
    while (size > out.length && size > 4) size /= 2;
    return out.slice(0, size);
  }

  // ------------------------------------------------------------ Calendario y sorteos
  function build(S) {
    const n = S.fixtures ? S.fixtures.length : 38;
    const taken = new Set();
    S.cups = [];
    for (const def of DEFS) {
      const clubs = qualify(S, def, taken);
      if (clubs.length < 4) continue;
      clubs.forEach(id => taken.add(id));
      const rounds = [];
      for (let k = clubs.length; k >= 2; k /= 2) rounds.push({ name: ROUND_NAMES[k] || `Ronda de ${k}`, legs: k === 2 ? 1 : 2, ties: [] });
      // Matchdays: (ronda, partido), repartidos por la temporada
      const mds = [];
      rounds.forEach((r, ri) => { for (let leg = 0; leg < r.legs; leg++) mds.push({ r: ri, leg }); });
      const off = SLOTS.length - mds.length;
      mds.forEach((md, k) => { md.week = U.clamp(Math.round(n * SLOTS[Math.max(0, off) + k]), 1, n - 2); md.done = false; });
      for (let k = 1; k < mds.length; k++) if (mds[k].week <= mds[k - 1].week) mds[k].week = mds[k - 1].week + 1;
      const cup = { id: def.id, name: def.name, short: def.short, tier: def.tier, color: def.color, icon: def.icon, clubs, rounds, mds, cur: 0, champ: null, s: S.season };
      draw(S, cup, 0, clubs);
      S.cups.push(cup);
    }
    const mine = S.cups.find(c => c.clubs.includes(S.user));
    if (mine) {
      TL.Game.mail(S, `¡Jugamos la ${mine.name}!`, `${S.clubs[S.user].name} disputa esta temporada la ${mine.name}. Primera eliminatoria en la jornada ${mine.mds[0].week + 1}: ${tieText(S, mine, S.user)}. Cada ronda superada da dinero y prestigio; ojo con el cansancio entre semana.`, 'good');
    }
  }

  function draw(S, cup, ri, clubs) {
    // Cabezas de serie: los mejores no se cruzan entre sí en la primera ronda
    const sorted = clubs.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
    const half = sorted.length / 2;
    const pots = ri === 0 ? [U.shuffle(sorted.slice(0, half)), U.shuffle(sorted.slice(half))] : [U.shuffle(sorted.slice()), []];
    const ties = [];
    if (ri === 0) for (let k = 0; k < half; k++) ties.push({ h: pots[1][k], a: pots[0][k], s: [] });
    else { const p = pots[0]; for (let k = 0; k < p.length; k += 2) ties.push({ h: p[k], a: p[k + 1], s: [] }); }
    cup.rounds[ri].ties = ties;
  }

  function tieOf(cup, id) { const r = cup.rounds[cup.cur]; return r ? r.ties.find(t => t.h === id || t.a === id) : null; }
  function tieText(S, cup, id) {
    const t = tieOf(cup, id);
    if (!t) return '';
    const other = t.h === id ? t.a : t.h;
    return `${cup.rounds[cup.cur].name} contra el ${S.clubs[other].name}`;
  }

  // ------------------------------------------------------------ Partidos
  /** Partido de copa del usuario pendiente esta semana (o null). */
  function pendingUser(S) {
    for (const cup of S.cups || []) {
      const md = cup.mds.find(m => !m.done && m.week === S.week);
      if (!md || md.r !== cup.cur) continue;
      const t = tieOf(cup, S.user);
      if (!t || t.s.length > md.leg) continue;
      const r = cup.rounds[md.r];
      const home = md.leg === 0 ? t.h : t.a, away = md.leg === 0 ? t.a : t.h;
      return { cup, md, tie: t, home, away, round: r.name, leg: md.leg, legs: r.legs, label: `${cup.name} · ${r.name}${r.legs > 1 ? (md.leg ? ' (vuelta)' : ' (ida)') : ''}` };
    }
    return null;
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

  function simTie(S, t, leg) {
    const home = leg === 0 ? t.h : t.a, away = leg === 0 ? t.a : t.h;
    const [hg, ag] = E().quickScore(strength(S, home), strength(S, away));
    t.s[leg] = leg === 0 ? [hg, ag] : [ag, hg]; // siempre desde el punto de vista de t.h
  }

  /** Resultado del usuario + simulación del resto de la jornada de copa. */
  function completeUser(S, res, p) {
    const t = p.tie;
    const hg = res.h === t.h ? res.hg : res.ag, ag = res.h === t.h ? res.ag : res.hg;
    t.s[p.leg] = [hg, ag];
    if (res.review) TL.Coach.store(S, Object.assign(res.review, { comp: p.cup.short }));
    return playMatchday(S, p.cup, p.md);
  }

  function playMatchday(S, cup, md) {
    const r = cup.rounds[md.r];
    for (const t of r.ties) if (t.s.length <= md.leg) simTie(S, t, md.leg);
    md.done = true;
    const out = { cup, md, round: r.name };
    if (md.leg === r.legs - 1) resolveRound(S, cup, md.r);
    return out;
  }

  function aggregate(t) {
    const a = t.s.reduce((s, x) => s + (x ? x[0] : 0), 0), b = t.s.reduce((s, x) => s + (x ? x[1] : 0), 0);
    return [a, b];
  }

  function resolveRound(S, cup, ri) {
    const r = cup.rounds[ri];
    const winners = [];
    for (const t of r.ties) {
      const [a, b] = aggregate(t);
      if (a !== b) t.w = a > b ? t.h : t.a;
      else {
        // Penaltis: el más fuerte tiene algo más de opciones
        const pa = strength(S, t.h) / (strength(S, t.h) + strength(S, t.a));
        t.w = Math.random() < 0.5 + (pa - 0.5) * 0.6 ? t.h : t.a;
        t.pens = true;
      }
      winners.push(t.w);
      if (t.h === S.user || t.a === S.user) userRoundOver(S, cup, r, t);
    }
    if (ri + 1 < cup.rounds.length) {
      cup.cur = ri + 1;
      draw(S, cup, ri + 1, winners);
      if (winners.includes(S.user)) {
        const nx = cup.mds.find(m => m.r === cup.cur);
        TL.Game.mail(S, `Sorteo de la ${cup.name}`, `${cup.rounds[cup.cur].name}: ${tieText(S, cup, S.user)}. Se juega en la jornada ${nx.week + 1}.`, 'board');
      }
    } else {
      cup.champ = winners[0];
      cup.cur = cup.rounds.length;
      const c = S.clubs[cup.champ];
      TL.News.add(S, 'positivo', `${c.name}, campeón de la ${cup.name}`, `El ${c.name} levanta el trofeo tras ganar la final.`, cup.champ, null, cup.champ === S.user ? 'pos' : 'neu');
    }
  }

  function money(S, v) { return F.roundMoney(v * (S.econ.value || 1) * (S.gender === 'F' ? 0.08 : 1)); }
  function prize(S, cup, kind) {
    const t1 = cup.tier === 1 && cup.id === 'eu1';
    const base = cup.id === 'eu1' ? 1 : cup.id === 'eu2' ? 0.35 : 0.3;
    return money(S, { entry: 15e6, win: 6e6, title: 20e6 }[kind] * base * (t1 ? 1 : 1));
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
    const final = r.legs === 1 && r.name === 'Final';
    if (won) {
      const amount = prize(S, cup, final ? 'title' : 'win');
      const paid = pay(S, amount, final ? 'Premio de campeón' : 'Premio por pasar de ronda');
      S.board.conf = U.clamp(S.board.conf + (final ? 15 : 3), 0, 100);
      TL.Manager.addXp(S, final ? 400 : 60);
      if (S.com) S.com.fans = Math.round(S.com.fans * (final ? 1.06 : 1.01));
      if (final) {
        (S.titles || (S.titles = [])).push({ s: S.season, name: cup.name });
        TL.Game.mail(S, `🏆 ¡CAMPEONES DE LA ${cup.name.toUpperCase()}!`, `¡Lo has conseguido! ${S.clubs[S.user].name} gana la final ante el ${S.clubs[other].name}${t.pens ? ' en los penaltis' : ''}. ${paid}. La afición está en las nubes.`, 'good');
        S._cupTitle = cup.name;
      } else {
        TL.Game.mail(S, `Pasamos de ronda en la ${cup.name}`, `Eliminatoria ante el ${S.clubs[other].name}: ${mineFirst} en el global${t.pens ? ' (penaltis)' : ''}. ${paid}.`, 'good');
      }
    } else {
      TL.Game.mail(S, final ? `Subcampeones de la ${cup.name}` : `Eliminados de la ${cup.name}`, `${final ? 'Perdemos la final' : 'Caemos'} ante el ${S.clubs[other].name} (${mineFirst}${t.pens ? ', penaltis' : ''}). ${final ? 'Un subcampeonato que sabe a poco, pero que da prestigio.' : 'Toca centrarse en la liga.'}`, final ? 'board' : 'med');
      if (final) { pay(S, prize(S, cup, 'win') * 2, 'Premio de finalista'); TL.Manager.addXp(S, 150); }
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

  /** Fin de temporada: se cierran las copas y se guarda el resultado del usuario. */
  function seasonEnd(S, sum) {
    for (const cup of S.cups || []) {
      let guard = 20;
      while (cup.champ == null && guard-- > 0) {
        const md = cup.mds.find(m => !m.done && m.r === cup.cur);
        if (!md) break;
        playMatchday(S, cup, md);
      }
    }
    const mine = (S.cups || []).find(c => c.clubs.includes(S.user));
    if (mine && sum) {
      const reached = mine.champ === S.user ? 'Campeón' : (() => {
        let last = mine.rounds[0].name;
        mine.rounds.forEach(r => { if (r.ties.some(t => t.h === S.user || t.a === S.user)) last = r.name; });
        return last === 'Final' ? 'Subcampeón' : last;
      })();
      sum.cup = { name: mine.name, reached };
      if (S.history && S.history[0] && S.history[0].season === S.season) S.history[0].cup = `${mine.short}: ${reached}`;
    }
  }

  /** Nueva temporada: se clasifican los equipos y se sortea. */
  function newSeason(S) {
    build(S);
    const mine = S.cups.find(c => c.clubs.includes(S.user));
    if (mine) {
      const amount = prize(S, mine, 'entry');
      pay(S, amount, 'Derechos de participación');
      TL.Game.mail(S, `Ingreso por jugar la ${mine.name}`, `La competición abona ${U.money(amount)} por participar.`, 'club');
    }
  }

  function myCup(S) { return (S.cups || []).find(c => c.clubs.includes(S.user)) || null; }

  TL.Cups = { DEFS, build, newSeason, pendingUser, completeUser, playMatchday, catchUp, seasonEnd, aggregate, tieOf, myCup, qualify, topLeagues };
})();
