/* TOUCHLINE — modo Torneo
 *
 * Una partida aparte de la carrera (no la toca ni la guarda encima):
 *  - Mundial: 32 selecciones formadas con los mejores jugadores de cada país.
 *  - Copa de Campeones: los 32 mejores clubes de Europa.
 * Fase de grupos (8 grupos de 4, pasan dos) y eliminatorias a partido único
 * hasta la final. Tus partidos se juegan en directo o con resultado rápido.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World, E = () => TL.Engine;

  const NATION = {
    'España': ['ESP', '#c60b1e', '#ffc400'], 'Argentina': ['ARG', '#75aadb', '#ffffff'], 'Brasil': ['BRA', '#ffdf00', '#009c3b'],
    'Francia': ['FRA', '#0055a4', '#ffffff'], 'Inglaterra': ['ENG', '#ffffff', '#cf142b'], 'Alemania': ['GER', '#f4f4f4', '#111111'],
    'Italia': ['ITA', '#0066cc', '#ffffff'], 'Portugal': ['POR', '#c8102e', '#006600'], 'Países Bajos': ['NED', '#ff7f00', '#ffffff'],
    'Bélgica': ['BEL', '#e30613', '#111111'], 'Croacia': ['CRO', '#ff0000', '#ffffff'], 'Uruguay': ['URU', '#5cbfeb', '#ffffff'],
    'Estados Unidos': ['USA', '#ffffff', '#0a3161'], 'México': ['MEX', '#006847', '#ffffff'], 'Japón': ['JPN', '#002b7f', '#ffffff'],
    'Marruecos': ['MAR', '#c1272d', '#006233'], 'Senegal': ['SEN', '#ffffff', '#00853f'], 'Colombia': ['COL', '#fcd116', '#003893'],
    'Noruega': ['NOR', '#ba0c2f', '#ffffff'], 'Dinamarca': ['DEN', '#c8102e', '#ffffff'], 'Suiza': ['SUI', '#d52b1e', '#ffffff'],
    'Turquía': ['TUR', '#e30a17', '#ffffff'], 'Polonia': ['POL', '#ffffff', '#dc143c'], 'Escocia': ['SCO', '#0065bd', '#ffffff'],
    'Corea del Sur': ['KOR', '#c60c30', '#ffffff'], 'Nigeria': ['NGA', '#008751', '#ffffff'], 'Ghana': ['GHA', '#ffffff', '#006b3f'],
    'Costa de Marfil': ['CIV', '#ff8200', '#ffffff'], 'Camerún': ['CMR', '#007a5e', '#fcd116'], 'Ecuador': ['ECU', '#ffdd00', '#034ea2'],
    'Austria': ['AUT', '#ed2939', '#ffffff'], 'Suecia': ['SWE', '#fecc00', '#006aa7'], 'Serbia': ['SRB', '#c6363c', '#0c4076'],
    'Gales': ['WAL', '#c8102e', '#00b140'], 'Irlanda': ['IRL', '#169b62', '#ffffff'], 'Ucrania': ['UKR', '#0057b7', '#ffd700'],
    'Chequia': ['CZE', '#d7141a', '#11457e'], 'Egipto': ['EGY', '#ce1126', '#ffffff'], 'Argelia': ['ALG', '#ffffff', '#006233'],
    'Australia': ['AUS', '#ffcd00', '#00843d'], 'Canadá': ['CAN', '#d80621', '#ffffff'], 'Paraguay': ['PAR', '#d52b1e', '#ffffff'],
    'Chile': ['CHI', '#d52b1e', '#0039a6'], 'Hungría': ['HUN', '#ce2939', '#477050'], 'Grecia': ['GRE', '#0d5eaf', '#ffffff']
  };
  // Camisetas con dibujo o segunda equipación conocida (el resto: color principal y, fuera, el secundario)
  const NKIT = {
    'Argentina': [['#75aadb', '#ffffff', 's'], ['#1b2235', '#75aadb', '']],
    'Brasil': [['#ffdf00', '#009c3b', ''], ['#1c3f94', '#ffffff', '']],
    'Croacia': [['#ff0000', '#ffffff', 'k'], ['#1b2a5c', '#ffffff', '']],
    'Paraguay': [['#d52b1e', '#ffffff', 's'], ['#ffffff', '#d52b1e', '']],
    'Países Bajos': [['#ff7f00', '#ffffff', ''], ['#1b2235', '#ff7f00', '']],
    'Portugal': [['#c8102e', '#006600', ''], ['#f4f4f0', '#c8102e', '']],
    'Bélgica': [['#e30613', '#111111', ''], ['#ffffff', '#e30613', '']],
    'Chile': [['#d52b1e', '#0039a6', ''], ['#ffffff', '#d52b1e', '']]
  };
  const KINDS = {
    wc: { name: 'Mundial', icon: '🌍', color: '#f2c94c', desc: 'Selecciones con los mejores jugadores de cada país.' },
    cl: { name: 'Copa de Campeones de Europa', icon: '⭐', color: '#5db8ff', desc: 'Los 32 mejores clubes de Europa.' }
  };

  /** Prepara el mundo del torneo (las selecciones se forman con los mejores de cada país). */
  function prepare(data, kind) {
    const S = W().create(data, 0, 'Míster');
    S.mode = 'tour';
    S.tour = { kind };
    if (kind === 'wc') {
      const byNat = {};
      for (const p of S.players) if (p.club >= 0) (byNat[p.nat] || (byNat[p.nat] = [])).push(p);
      const nations = [];
      for (const nat in byNat) {
        const ps = byNat[nat].sort((a, b) => b.ovr - a.ovr);
        const gks = ps.filter(p => p.pos === 'GK').slice(0, 3), out = ps.filter(p => p.pos !== 'GK').slice(0, 20);
        if (gks.length < 2 || out.length < 14) continue;
        const best = [gks[0], ...out.slice(0, 10)];
        nations.push({ nat: +nat, squad: gks.concat(out), str: U.sum(best, p => p.ovr) / best.length });
      }
      nations.sort((a, b) => b.str - a.str);
      const lid = S.leagues.length;
      S.leagues.push({ id: lid, name: 'Mundial', country: 'Mundial', flag: null, playable: true, wealth: 1.2, clubs: [] });
      S.tourCands = [];
      for (const n of nations.slice(0, 48)) {
        const [name, flag] = S.nations[n.nat];
        const meta = NATION[name] || [name.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase(), ...U.clubColors(name)];
        const id = S.clubs.length;
        S.clubs.push({ id, name, league: lid, code: meta[0], c1: meta[1], c2: meta[2], logo: flag ? `assets/flags/${flag}.svg` : null, nation: true,
          kit: NKIT[name] || [[meta[1], meta[2], ''], [meta[2], meta[1], '']], rep: Math.round(n.str * 10) / 10, stature: n.str, cash: 0, wageBudget: 1e12, revScale: 0, capacity: 70000, price: 60, stadium: `Estadio Mundialista de ${name}` });
        S.leagues[lid].clubs.push(id);
        for (const p of n.squad) { p.club = id; p.fit = 100; p.inj = 0; p.sus = 0; p.listed = false; }
        S.tourCands.push(id);
      }
    } else {
      const tops = TL.Cups.topLeagues(S);
      const eu = ['Inglaterra', 'España', 'Italia', 'Alemania', 'Francia', 'Portugal', 'Países Bajos', 'Bélgica', 'Turquía', 'Escocia', 'Austria', 'Grecia', 'Suiza', 'Dinamarca', 'Noruega', 'Polonia', 'Chequia', 'Ucrania', 'Croacia', 'Suecia'];
      S.tourCands = eu.map(c => tops[c]).filter(Boolean).flatMap(l => l.clubs).sort((a, b) => S.clubs[b].rep - S.clubs[a].rep).slice(0, 64);
    }
    W().dirty(S);
    return S;
  }

  function buildCup(S, ids, kind) {
    const K = KINDS[kind];
    const n = ids.length >= 32 ? 32 : ids.length >= 16 ? 16 : 8;
    ids = ids.slice(0, n);
    const sorted = ids.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
    const G = n / 4;
    const pots = [0, 1, 2, 3].map(k => U.shuffle(sorted.slice(k * G, k * G + G)));
    const groups = Array.from({ length: G }, (_, g) => pots.map(p => p[g]));
    const ties = [];
    groups.forEach((gr, gi) => {
      const [A, B, C, D] = gr;
      [[A, B, 0], [C, D, 0], [A, C, 1], [D, B, 1], [D, A, 2], [B, C, 2]].forEach(([h, a, md]) => ties.push({ h, a, s: [], md, g: gi }));
    });
    const rounds = [{ name: 'Fase de grupos', legs: 1, group: true, groups, ties }];
    const ROUND = { 16: 'Octavos', 8: 'Cuartos', 4: 'Semifinales', 2: 'Final' };
    for (let k = n / 2; k >= 2; k /= 2) rounds.push({ name: ROUND[k], legs: 1, ties: [] });
    const mds = [0, 1, 2].map(leg => ({ r: 0, leg }));
    for (let r = 1; r < rounds.length; r++) mds.push({ r, leg: 0 });
    mds.forEach((m, k) => { m.week = k; m.done = false; });
    return { id: 'tour', name: K.name, short: K.name, tier: 1, color: K.color, icon: K.icon, clubs: ids, rounds, mds, cur: 0, champ: null, s: S.season, tour: true };
  }

  /** Empieza el torneo con el equipo elegido. */
  function begin(S, pick, manager) {
    const kind = S.tour.kind;
    let ids = S.tourCands.slice(0, 32);
    if (!ids.includes(pick)) ids[ids.length - 1] = pick;
    S.user = pick;
    S.manager = manager || 'Míster';
    const cup = buildCup(S, ids, kind);
    S.cups = [cup];
    S.fixtures = cup.mds.map(() => []);
    S.week = 0; S.over = false; S.inbox = []; S.news = []; S.reviews = [];
    const sq = W().squad(S, S.user);
    const best = E().bestFormation(sq);
    S.tactics = { formation: best.formation, slots: E().autoLineup(sq, best.formation, false), mentality: 1, autoSubs: true };
    S.board = { conf: 100, target: 1, text: kind === 'wc' ? 'Ganar el Mundial' : 'Ganar la Copa de Campeones', rank: 1 };
    for (const p of sq) p.mor = Math.max(p.mor || 0, 75);
    TL.Coach.init(S); TL.Locker.init(S);
    const g = cup.rounds[0].groups.findIndex(gr => gr.includes(S.user));
    const rivals = cup.rounds[0].groups[g].filter(id => id !== S.user).map(id => S.clubs[id].name);
    TL.Game.mail(S, `${KINDS[kind].icon} ¡Empieza el ${KINDS[kind].name}!`, `Estás en el grupo ${'ABCDEFGH'[g]} con ${rivals.join(', ')}. Pasan los dos primeros; después, eliminatorias a partido único hasta la final.`, 'board');
    TL.Game.S = S;
    return S;
  }

  /** Avanza una jornada del torneo (simula lo pendiente y recupera a los jugadores). */
  function round(S) {
    TL.Cups.catchUp(S);
    for (const id of S.cups[0].clubs) for (const p of W().squad(S, id)) {
      if (p.inj > 0) p.inj--;
      if (p.sus > 0 && id !== S.user) p.sus--;
      if (p.fit < 100) p.fit = Math.min(100, p.fit + 24);
    }
    S.week++;
    const cup = S.cups[0];
    if (cup.champ != null || S.week >= S.fixtures.length) S.over = true;
    return [];
  }

  function stage(S) {
    const cup = S.cups && S.cups[0];
    if (!cup) return '';
    if (cup.champ != null) return 'Final';
    const md = cup.mds.find(m => !m.done);
    if (!md) return '';
    const r = cup.rounds[md.r];
    return r.group ? `Grupos · jornada ${md.leg + 1}` : r.name;
  }
  function alive(S) {
    const cup = S.cups[0];
    if (cup.champ != null) return cup.champ === S.user;
    const r = cup.rounds[cup.cur];
    if (r.group) return true;
    return r.ties.some(t => t.h === S.user || t.a === S.user);
  }

  TL.Tour = { KINDS, prepare, begin, round, stage, alive };
})();
