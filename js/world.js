/* TOUCHLINE — construcción del mundo (ligas, clubes, jugadores), guardado y carga */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U;

  // ------------------------------------------------------------ Nombres ficticios
  // Para canteranos, plantillas incompletas y agentes libres generados.
  const NAMES = {
    es: {
      m: ['Pablo', 'Hugo', 'Álvaro', 'Diego', 'Mario', 'Iker', 'Adrián', 'Sergio', 'Javier', 'Lucas', 'Mateo', 'Nicolás', 'Tomás', 'Gonzalo'],
      f: ['Lucía', 'Paula', 'Carla', 'Marta', 'Irene', 'Laura', 'Nerea', 'Alba', 'Claudia', 'Sara', 'Julia', 'Ainhoa'],
      s: ['García', 'Romero', 'Navarro', 'Ortega', 'Castillo', 'Herrera', 'Molina', 'Vidal', 'Ramos', 'Gil', 'Serrano', 'Ibáñez', 'Méndez', 'Rojas', 'Acosta', 'Ferreyra']
    },
    pt: {
      m: ['João', 'Rafael', 'Tiago', 'Gabriel', 'Bruno', 'Vinícius', 'Matheus', 'Rodrigo', 'Gustavo', 'Diogo', 'Leandro', 'Caio'],
      f: ['Beatriz', 'Mariana', 'Inês', 'Ana', 'Larissa', 'Camila', 'Rita', 'Letícia', 'Débora', 'Joana'],
      s: ['Silva', 'Santos', 'Oliveira', 'Pereira', 'Costa', 'Almeida', 'Ribeiro', 'Carvalho', 'Moura', 'Teixeira', 'Barbosa', 'Nunes']
    },
    en: {
      m: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Leo', 'Mason', 'Tyler', 'Callum', 'Ryan', 'Ethan', 'Jamie', 'Noah', 'Lewis'],
      f: ['Ella', 'Grace', 'Chloe', 'Lily', 'Amelia', 'Freya', 'Lauren', 'Megan', 'Sophie', 'Hannah', 'Abbie'],
      s: ['Walker', 'Hughes', 'Turner', 'Barnes', 'Cooper', 'Ward', 'Bennett', 'Mills', 'Fletcher', 'Shaw', 'Harper', 'Doyle', 'Reid', 'Morgan']
    },
    fr: {
      m: ['Lucas', 'Théo', 'Enzo', 'Hugo', 'Maxime', 'Yanis', 'Mathis', 'Rayan', 'Baptiste', 'Kylian', 'Adrien', 'Noé'],
      f: ['Léa', 'Manon', 'Camille', 'Inès', 'Chloé', 'Clara', 'Jade', 'Louise', 'Margaux', 'Océane'],
      s: ['Martin', 'Bernard', 'Dubois', 'Laurent', 'Lefèvre', 'Moreau', 'Girard', 'Fournier', 'Mercier', 'Blanc', 'Garnier', 'Rousseau']
    },
    de: {
      m: ['Lukas', 'Jonas', 'Leon', 'Finn', 'Paul', 'Niklas', 'Felix', 'Tim', 'Jannik', 'Moritz', 'Elias', 'Ben'],
      f: ['Lena', 'Laura', 'Anna', 'Lea', 'Sophie', 'Marie', 'Johanna', 'Hannah', 'Lina', 'Klara'],
      s: ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Neumann', 'Krüger']
    },
    it: {
      m: ['Lorenzo', 'Matteo', 'Alessandro', 'Davide', 'Riccardo', 'Federico', 'Gabriele', 'Simone', 'Andrea', 'Tommaso', 'Nicolò'],
      f: ['Giulia', 'Sofia', 'Martina', 'Chiara', 'Alice', 'Aurora', 'Elisa', 'Sara', 'Valentina', 'Arianna'],
      s: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Conti', 'Gallo']
    },
    nl: {
      m: ['Daan', 'Sem', 'Thijs', 'Bram', 'Jesse', 'Lars', 'Ruben', 'Milan', 'Stijn', 'Joris', 'Wout'],
      f: ['Emma', 'Sanne', 'Fleur', 'Lotte', 'Noor', 'Isa', 'Femke', 'Jill', 'Roos'],
      s: ['de Jong', 'Jansen', 'de Vries', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Dekker']
    },
    nord: {
      m: ['Oskar', 'Emil', 'William', 'Magnus', 'Mathias', 'Sander', 'Elias', 'Isak', 'Viktor', 'Anton', 'Jonas'],
      f: ['Ingrid', 'Maja', 'Freja', 'Ida', 'Nora', 'Emma', 'Astrid', 'Sigrid', 'Elin', 'Tuva'],
      s: ['Hansen', 'Johansson', 'Nielsen', 'Larsen', 'Andersen', 'Berg', 'Lindqvist', 'Dahl', 'Holm', 'Eriksen', 'Strand', 'Nyström']
    },
    slav: {
      m: ['Jakub', 'Luka', 'Marko', 'Filip', 'Kacper', 'Nikola', 'Stefan', 'Matej', 'Dominik', 'Andrei', 'Bogdan'],
      f: ['Zuzana', 'Ana', 'Katarzyna', 'Petra', 'Ivana', 'Maja', 'Elena', 'Tereza', 'Natalia'],
      s: ['Nowak', 'Kovač', 'Horvat', 'Novák', 'Popescu', 'Petrović', 'Kowalski', 'Marić', 'Jovanović', 'Dvořák', 'Ionescu', 'Babić']
    },
    tr: {
      m: ['Emre', 'Burak', 'Mert', 'Kerem', 'Arda', 'Yusuf', 'Ozan', 'Can', 'Efe', 'Barış'],
      f: ['Elif', 'Zeynep', 'Ece', 'Defne', 'Selin', 'Ayşe'],
      s: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç']
    },
    ar: {
      m: ['Mohammed', 'Abdullah', 'Faisal', 'Youssef', 'Omar', 'Khalid', 'Hamza', 'Saud', 'Nasser', 'Karim', 'Amine'],
      f: ['Fatima', 'Yasmin', 'Leila', 'Nour', 'Salma', 'Amira'],
      s: ['Al-Harbi', 'Al-Shehri', 'Al-Qahtani', 'Benali', 'Haddad', 'Mansour', 'El Amrani', 'Saleh', 'Hamdan', 'Bensaid']
    },
    af: {
      m: ['Moussa', 'Ibrahima', 'Kwame', 'Seydou', 'Chidi', 'Ousmane', 'Mamadou', 'Kofi', 'Samuel', 'Emmanuel'],
      f: ['Aminata', 'Fatou', 'Ngozi', 'Ama', 'Awa', 'Grace'],
      s: ['Diallo', 'Traoré', 'Koné', 'Mensah', 'Okafor', 'Ndiaye', 'Camara', 'Sarr', 'Boateng', 'Adeyemi', 'Touré']
    },
    asia: {
      m: ['Min-jun', 'Ji-ho', 'Hiroto', 'Haruto', 'Wei', 'Hao', 'Sota', 'Seo-jun', 'Yuto', 'Jun'],
      f: ['Ji-woo', 'Yui', 'Mei', 'Hina', 'Seo-yeon', 'Xin'],
      s: ['Kim', 'Lee', 'Park', 'Tanaka', 'Suzuki', 'Wang', 'Zhang', 'Choi', 'Sato', 'Liu']
    }
  };

  const REGION = {
    es: ['España', 'México', 'Argentina', 'Colombia', 'Uruguay', 'Chile', 'Perú', 'Venezuela', 'Ecuador', 'Paraguay', 'Bolivia', 'Costa Rica', 'Honduras', 'Panamá', 'Guatemala', 'El Salvador'],
    pt: ['Portugal', 'Brasil', 'Angola', 'Cabo Verde', 'Mozambique', 'Guinea-Bisáu'],
    en: ['Inglaterra', 'Escocia', 'Gales', 'Irlanda', 'Irlanda del Norte', 'Estados Unidos', 'Australia', 'Canadá', 'Nueva Zelanda', 'Jamaica'],
    fr: ['Francia', 'Bélgica', 'Luxemburgo', 'Haití'],
    de: ['Alemania', 'Austria', 'Suiza'],
    it: ['Italia'],
    nl: ['Países Bajos', 'Surinam', 'Curazao'],
    nord: ['Noruega', 'Suecia', 'Dinamarca', 'Islandia', 'Finlandia'],
    slav: ['Polonia', 'Chequia', 'Croacia', 'Serbia', 'Rumanía', 'Ucrania', 'Rusia', 'Eslovaquia', 'Eslovenia', 'Bosnia y Herzegovina', 'Bulgaria', 'Hungría', 'Montenegro', 'Macedonia del Norte'],
    tr: ['Turquía', 'Azerbaiyán'],
    ar: ['Arabia Saudí', 'Marruecos', 'Argelia', 'Egipto', 'Túnez', 'Catar', 'Emiratos Árabes Unidos', 'Irak', 'Jordania'],
    af: ['Senegal', 'Nigeria', 'Ghana', 'Costa de Marfil', 'Camerún', 'Mali', 'Guinea', 'Gambia', 'RD del Congo', 'Burkina Faso', 'Sudáfrica'],
    asia: ['Corea del Sur', 'Japón', 'China', 'India', 'Tailandia', 'Vietnam']
  };
  const REGION_OF = {};
  for (const [r, list] of Object.entries(REGION)) for (const n of list) REGION_OF[n] = r;

  function genName(natEs, gender) {
    const N = NAMES[REGION_OF[natEs] || 'en'];
    const first = U.pick(gender === 'F' ? N.f : N.m);
    const last = U.pick(N.s);
    return [first + ' ' + last, last];
  }

  const LINE_POS = {
    1: ['CB', 'CB', 'CB', 'RB', 'LB'],
    2: ['CM', 'CM', 'CDM', 'CAM', 'RM', 'LM'],
    3: ['ST', 'ST', 'RW', 'LW']
  };

  const ALT_SUGGEST = {
    GK: [], CB: ['CDM', 'RB', 'LB'], RB: ['RM', 'CB'], LB: ['LM', 'CB'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'],
    CAM: ['CM', 'ST'], RM: ['RW', 'RB'], LM: ['LW', 'LB'], RW: ['RM', 'ST'], LW: ['LM', 'ST'], ST: ['CAM']
  };

  /** Las seis estadísticas de un jugador generado, coherentes con su puesto. */
  function genStats(pos, ovr) {
    const isGK = pos === 'GK', st = [];
    for (let i = 0; i < 6; i++) {
      let base = ovr + U.int(-9, 9);
      if (isGK && i === 4) base = U.int(30, 60); // velocidad del portero
      if (!isGK) {
        const line = F.LINE[pos];
        if (i === 4 && line >= 2) base -= line === 3 ? 25 : 8; // defensa en atacantes
        if (i === 1 && line === 1) base -= 18; // tiro en defensas
        if (i === 0 && pos === 'CB') base -= 8;
      }
      st.push(U.clamp(base, 20, 97));
    }
    return st;
  }

  // ------------------------------------------------------------ Divisiones inferiores
  /**
   * Añade a los datos base las divisiones inferiores de data/game/pyramid.js (clubes reales con
   * plantillas generadas). Es determinista: con la misma versión salen siempre los mismos jugadores,
   * así que la partida guarda solo sus cambios, como con los jugadores reales.
   */
  const pyrCache = {};
  function pyramid(data, ver) {
    const P = window.TL_PYRAMID && window.TL_PYRAMID[ver] && window.TL_PYRAMID[ver][data.gender];
    if (!ver || !P) return data;
    const key = data.gender + ver;
    if (pyrCache[key] && pyrCache[key].src === data) return pyrCache[key].out;
    // Azar con semilla fija mientras se genera (nombres, edades, medias…)
    let seed = 0x9e3779b9 ^ (ver * 7919) ^ (data.gender === 'F' ? 0x5bd1e995 : 0);
    const rng = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = Object.assign({}, data, {
      leagues: data.leagues.slice(), clubs: data.clubs.slice(), players: data.players.slice(), promotion: data.promotion.slice(), pyr: ver
    });
    const norm = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const taken = new Set(out.clubs.map(c => norm(c[0])));
    const nationIdx = name => out.nations.findIndex(n => n[0] === name);
    const real = Math.random;
    Math.random = rng;
    try {
      const gauss = () => { let a = 0; for (let i = 0; i < 4; i++) a += rng(); return (a - 2) * 1.73; };
      const ageOf = () => U.weighted([[17, 20, 20], [21, 25, 35], [26, 30, 30], [31, 35, 15]], a => a[2]);
      for (const L of P) {
        const parent = out.leagues.findIndex(l => l[0] === L.under);
        const clubs = L.clubs.filter(c => !taken.has(norm(c[0])));
        if (parent < 0 || clubs.length < L.k * 2 + 2) continue;
        if (clubs.length % 2) clubs.pop(); // calendario par
        const lid = out.leagues.length;
        const pl = out.leagues[parent];
        // Base nueva: hereda asociación y confederación de la liga de arriba, una división más abajo
        out.leagues.push(pl.length > 5 ? [L.name, L.country, L.flag, 1, L.wealth, (pl[5] || 1) + 1, pl[6], pl[7], pl[8], pl[9]] : [L.name, L.country, L.flag, 1, L.wealth]);
        out.promotion.push([parent, lid, L.k]);
        const local = nationIdx(L.country);
        const foreign = out.players.filter(r => out.clubs[r[2]] && out.clubs[r[2]][1] === parent).map(r => r[3]);
        clubs.forEach(([name, c1, c2, crestId, ini, kitP], j) => {
          taken.add(norm(name));
          const cid = out.clubs.length;
          out.clubs.push(crestId ? [name, lid, c1, c2, crestId, ini, 0, kitP || ''] : [name, lid]);
          if (c1 && window.TL_KITS && !window.TL_KITS[name]) window.TL_KITS[name] = [[c1, c2 || '#ffffff', ''], [c2 === '#ffffff' ? '#ffffff' : c2 || '#ffffff', c1, '']];
          // Los primeros de la lista, algo más fuertes
          const strength = L.rep + 3 - 6 * (j / Math.max(1, clubs.length - 1)) + (rng() - 0.5) * 2 + 0.5;
          const plan = ['GK', 'GK', 'GK'].concat(Array.from({ length: 7 }, () => U.pick(LINE_POS[1])), Array.from({ length: 7 }, () => U.pick(LINE_POS[2])),
            Array.from({ length: 5 }, () => U.pick(LINE_POS[3])));
          for (const pos of plan) {
            const nat = local >= 0 && (rng() < 0.85 || !foreign.length) ? local : U.pick(foreign);
            const [pname, short] = genName(out.nations[nat][0], data.gender);
            const [lo, hi] = ageOf(), age = U.int(lo, hi);
            const ovr = U.clamp(Math.round(strength - 2 + gauss() * 3.5 + (age <= 20 ? -3 : 0)), 40, 88);
            const pot = F.potentialFor(ovr, age, rng());
            const st = genStats(pos, ovr);
            const alt = rng() < 0.5 && ALT_SUGGEST[pos].length ? U.pick(ALT_SUGGEST[pos]) : '';
            const wage = F.wageFor(ovr, age, L.wealth, data.econ.wage);
            out.players.push([pname, short, cid, nat, pos, alt, age, ovr, pot, rng() < 0.25 ? 0 : 1, pos === 'GK' ? 1 : U.int(2, 4), U.int(2, 4),
              st[0], st[1], st[2], st[3], st[4], st[5], data.season + U.int(1, 3), wage, -1]);
          }
        });
      }
    } finally { Math.random = real; }
    pyrCache[key] = { src: data, out };
    return out;
  }

  /** Crea un jugador ficticio. */
  function makePlayer(S, opt) {
    const nat = opt.nat;
    const [name, short] = genName(S.nations[nat][0], S.gender);
    const pos = opt.pos;
    const ovr = U.clamp(Math.round(opt.ovr), 35, 92);
    const age = opt.age;
    const pot = opt.pot != null ? Math.max(ovr, Math.min(95, Math.round(opt.pot))) : F.potentialFor(ovr, age, Math.random());
    const isGK = pos === 'GK';
    const st = genStats(pos, ovr);
    const p = {
      id: S.players.length, name, short, club: opt.club, nat, pos,
      alt: U.chance(0.5) && ALT_SUGGEST[pos].length ? [U.pick(ALT_SUGGEST[pos])] : [],
      age, ovr, pot, foot: U.chance(0.25) ? 0 : 1, sm: isGK ? 1 : U.int(2, 4), wf: U.int(2, 4), st,
      contract: opt.contract || 0, wage: opt.wage || 0, fit: 100, inj: 0, sus: 0, listed: false, gen: true, base: -1
    };
    S.players.push(p);
    return p;
  }

  // ------------------------------------------------------------ Construcción
  function buildBase(data) {
    const S = {
      v: 1,
      gender: data.gender,
      season: data.season,
      week: 0,
      econ: data.econ,
      source: data.source,
      nations: data.nations,
      db: data.db || 'legacy',
      leagues: data.leagues.map((l, i) => ({
        id: i, name: l[0], country: l[1], flag: l[2], playable: !!l[3], wealth: l[4], clubs: [],
        // Base nueva: división, asociación, confederación, ranking UEFA y región AFC (para las competiciones)
        div: l[5] || 0, assoc: l[6] || '', conf: l[7] || '', rank: l[8] || 0, region: l[9] || ''
      })),
      promotion: data.promotion, pyr: data.pyr || 0,
      clubs: data.clubs.map((c, i) => {
        if (c[4]) {
          // Base nueva: colores, escudo (spritesheet), iniciales, coeficiente y equipación de la base de datos
          const c1 = c[2], c2 = c[3] && c[3] !== c[2] ? c[3] : '#ffffff';
          return { id: i, name: c[0], league: c[1], code: c[5] || U.clubCode(c[0]), c1, c2, crest: c[4], coef: c[6] || 0,
            kit: [[c1, c2, c[7] || ''], [c2, c1, '']] };
        }
        const [c1, c2] = U.clubColors(c[0]);
        return { id: i, name: c[0], league: c[1], code: U.clubCode(c[0]), c1, c2, logo: U.crestUrl(data.gender, c[0]) };
      }),
      players: data.players.map((r, i) => ({
        id: i, name: r[0], short: r[1], club: r[2], nat: r[3], pos: r[4],
        alt: r[5] ? r[5].split(' ') : [], age: r[6], ovr: r[7], pot: r[8], foot: r[9], sm: r[10], wf: r[11],
        st: [r[12], r[13], r[14], r[15], r[16], r[17]], contract: r[18], wage: r[19],
        fit: 100, inj: 0, sus: 0, listed: false, gen: false, base: i
      })),
      baseCount: data.players.length
    };
    for (const c of S.clubs) S.leagues[c.league].clubs.push(c.id);
    return S;
  }

  /** Nueva partida a partir de los datos base. */
  function create(data, userClub, manager) {
    const S = buildBase(data);
    fillSquads(S);
    makeFreeAgents(S, S.gender === 'M' ? 45 : 20);
    initEconomy(S);
    S.user = userClub;
    S.manager = manager || 'Míster';
    S.stats = {};
    S.inbox = [];
    S.msgId = 1;
    S.neg = {};
    S.history = [];
    S.board = { conf: 60 };
    S.fin = newFin();
    S.tactics = { formation: '4-3-3', slots: [], mentality: 1, autoSubs: true };
    spreadContracts(S);
    dirty(S);
    migrate(S);
    return S;
  }

  /**
   * Los datos son una foto de un momento: un tercio de cada plantilla acababa contrato en el
   * primer verano y se iban todos de golpe. Como en la realidad, solo acaba un ~15 % cada año:
   * los más veteranos; al resto se le alargan 1-3 temporadas.
   */
  function spreadContracts(S) {
    const by = squadsIndex(S);
    for (const c of S.clubs) {
      const sq = (by[c.id] || []).map(id => S.players[id]);
      const exp = sq.filter(p => p.contract <= S.season + 1).sort((a, b) => b.age - a.age);
      const keep = Math.round(sq.length * 0.15);
      for (const p of exp.slice(keep)) p.contract = S.season + 1 + U.int(1, p.age >= 31 ? 1 : 3);
    }
  }

  function newFin() {
    return {
      tickets: 0, tv: 0, sponsors: 0, merch: 0, tour: 0, prizes: 0, sales: 0,
      wages: 0, buys: 0, loans: 0, marketing: 0, fines: 0, other: 0
    };
  }

  /** Completa plantillas cortas o con huecos por línea con jugadores ficticios. */
  function fillSquads(S) {
    const bySquad = squadsIndex(S);
    for (const c of S.clubs) {
      const sq = (bySquad[c.id] || []).map(id => S.players[id]);
      const avg = sq.length ? U.sum(sq, p => p.ovr) / sq.length : 55;
      const nats = sq.length ? sq.map(p => p.nat) : [0];
      const count = [0, 0, 0, 0];
      for (const p of sq) count[F.LINE[p.pos]]++;
      const need = [];
      for (let i = count[0]; i < 2; i++) need.push('GK');
      for (let i = count[1]; i < 7; i++) need.push(U.pick(LINE_POS[1]));
      for (let i = count[2]; i < 6; i++) need.push(U.pick(LINE_POS[2]));
      for (let i = count[3]; i < 3; i++) need.push(U.pick(LINE_POS[3]));
      while (sq.length + need.length < 22) need.push(U.pick(LINE_POS[U.int(1, 3)]));
      for (const pos of need) {
        const age = U.int(18, 31);
        makePlayer(S, {
          club: c.id, nat: U.pick(nats), pos, age, ovr: avg - 3 + U.int(-4, 3),
          contract: S.season + U.int(1, 3)
        });
      }
    }
    // Salario de los generados
    const L = S.leagues;
    for (const p of S.players) {
      if (p.gen && !p.wage) p.wage = F.wageFor(p.ovr, p.age, L[S.clubs[p.club].league].wealth, S.econ.wage);
    }
  }

  const LINE_MIN = [2, 7, 6, 3];

  /**
   * Mantiene plantillas jugables (IA): mínimo por línea y 22 jugadores.
   * Primero ficha agentes libres asequibles; si no hay, genera jugadores.
   */
  function maintainSquads(S, clubIds) {
    const idx = squadsIndex(S);
    const free = S.players.filter(p => p.club === -1).sort((a, b) => b.ovr - a.ovr);
    const taken = new Set();
    for (const cid of clubIds) {
      const c = S.clubs[cid];
      const sq = (idx[cid] || []).map(id => S.players[id]);
      const count = [0, 0, 0, 0];
      for (const p of sq) count[F.LINE[p.pos]]++;
      const needLines = [];
      for (let l = 0; l < 4; l++) for (let i = count[l]; i < LINE_MIN[l]; i++) needLines.push(l);
      while (sq.length + needLines.length < 22) needLines.push(U.weighted([1, 2, 3], l => [3, 3, 2][l - 1]));
      if (!needLines.length) continue;
      const avg = sq.length ? U.sum(sq, p => p.ovr) / sq.length : c.rep - 5;
      const wealth = S.leagues[c.league].wealth;
      for (const line of needLines) {
        let p = free.find(f => !taken.has(f.id) && F.LINE[f.pos] === line && f.ovr <= c.rep + 2 && f.ovr >= avg - 8);
        if (p) taken.add(p.id);
        else {
          const pos = line === 0 ? 'GK' : U.pick(LINE_POS[line]);
          const nats = sq.length ? sq.map(x => x.nat) : [0];
          p = makePlayer(S, { club: cid, nat: U.pick(nats), pos, age: U.int(18, 30), ovr: avg - 3 + U.int(-4, 3) });
        }
        p.club = cid; p.contract = S.season + 1 + U.int(1, 2); p.fit = 100; p.listed = false;
        p.wage = F.wageFor(p.ovr, p.age, wealth, S.econ.wage);
        sq.push(p);
      }
    }
    dirty(S);
  }

  function makeFreeAgents(S, n) {
    const natPool = S.players.slice(0, 3000).map(p => p.nat);
    for (let i = 0; i < n; i++) {
      const line = U.weighted([0, 1, 2, 3], l => [1, 3, 3, 2][l]);
      const pos = line === 0 ? 'GK' : U.pick(LINE_POS[line]);
      makePlayer(S, {
        club: -1, nat: U.pick(natPool), pos, age: U.int(19, 34),
        ovr: 54 + Math.floor(Math.pow(Math.random(), 1.8) * 22), contract: 0
      });
    }
  }

  // ------------------------------------------------------------ Economía
  function revenueCurve(rep) { return Math.pow(1.17, rep - 50); }

  function initEconomy(S) {
    const idx = squadsIndex(S);
    const isF = S.gender === 'F';
    for (const c of S.clubs) {
      const sq = (idx[c.id] || []).map(id => S.players[id]);
      const L = S.leagues[c.league];
      const rep = repOf(sq);
      const wageBill = U.sum(sq, p => p.wage);
      const squadValue = U.sum(sq, p => value(S, p));
      const jitter = 0.8 + F.seeded('cap' + c.name) * 0.4;
      c.rep = rep;
      c.stature = rep; // talla del club: base de los ingresos comerciales
      c.revScale = (wageBill * 0.72) / revenueCurve(rep);
      let cap = isF
        ? 800 + Math.pow(Math.max(0, rep - 55), 2) * 9
        : 3000 + Math.pow(Math.max(0, rep - 55), 2) * 75 * U.clamp(L.wealth, 0.5, 1.3);
      c.capacity = Math.min(90000, Math.round(cap * jitter / 100) * 100);
      c.price = Math.round(U.clamp(0.5 * wageBill / (c.capacity * 0.85), isF ? 4 : 8, isF ? 40 : 150));
      c.cash = F.roundMoney(squadValue * 0.1 * Math.sqrt(L.wealth) * (0.7 + F.seeded('cash' + c.name) * 0.6));
      c.wageBudget = F.roundMoney(wageBill * 1.12);
      c.stadium = 'Estadio ' + c.name;
    }
  }

  function value(S, p) {
    return F.marketValue(p.ovr, p.age, p.pot, p.pos, S.econ.value);
  }

  function repOf(players) {
    const top = players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 16);
    if (!top.length) return 50;
    return Math.round((U.sum(top) / top.length) * 10) / 10;
  }

  // ------------------------------------------------------------ Índices
  function squadsIndex(S) {
    const idx = { res: [] };
    for (const p of S.players) {
      if (p.res) {
        // Filial: solo existe en tu club. Si se va (traspaso, libre), deja de ser del filial; si está cedido, vuelve a él
        if (p.club === S.user) { idx.res.push(p.id); continue; }
        const l = TL.Locker && S.lk && TL.Locker.loanOf(S, p.id);
        if (!(l && l.from === S.user)) p.res = false;
      }
      if (p.club >= 0) (idx[p.club] || (idx[p.club] = [])).push(p.id);
    }
    return idx;
  }

  /** Plantilla de un club. En tu club, solo el primer equipo (el filial va aparte: reserve). */
  function squad(S, clubId) {
    if (!S._sq) S._sq = squadsIndex(S);
    return (S._sq[clubId] || []).map(id => S.players[id]);
  }
  /** Tu filial (la cantera). */
  function reserve(S) {
    if (!S._sq) S._sq = squadsIndex(S);
    return (S._sq.res || []).map(id => S.players[id]);
  }

  /** Invalida índices tras traspasos, retiradas, etc. y recalcula reputaciones. */
  function dirty(S) {
    S._sq = null;
    const idx = squadsIndex(S);
    S._sq = idx;
    for (const c of S.clubs) c.rep = repOf((idx[c.id] || []).map(id => S.players[id]));
  }

  function wageBill(S, clubId) {
    // Cedidos con parte de la ficha pagada por su club de origen
    const ls = clubId === S.user && S.lk && S.lk.loans && S.lk.loans.length ? new Map(S.lk.loans.filter(l => l.to === clubId && l.ws != null).map(l => [l.pid, l.ws])) : null;
    const res = clubId === S.user ? U.sum(reserve(S), p => p.wage) : 0;
    return U.sum(squad(S, clubId), p => p.wage * (ls && ls.has(p.id) ? ls.get(p.id) : 1)) + res;
  }

  function userLeague(S) { return S.leagues[S.clubs[S.user].league]; }

  // ------------------------------------------------------------ Guardado
  function serialize(S) {
    const pb = [], pg = [];
    for (const p of S.players) {
      const flags = (p.listed ? 1 : 0) | (p.res ? 2 : 0);
      const mor = p.mor == null ? -1 : Math.round(p.mor);
      if (!p.gen) pb.push([p.club, p.age, p.ovr, p.pot, p.contract, p.wage, p.fit, p.inj, p.sus, flags, mor]);
      else pg.push([p.name, p.short, p.club, p.nat, p.pos, p.alt.join(' '), p.age, p.ovr, p.pot, p.foot, p.sm, p.wf,
        p.st.join(','), p.contract, p.wage, p.fit, p.inj, p.sus, flags, mor]);
    }
    return {
      v: S.v, db: S.db || 'legacy', gender: S.gender, season: S.season, week: S.week, user: S.user, manager: S.manager, pyr: S.pyr || 0,
      mgrG: S.mgrG || 'M', face: S.face || null,
      leagues: S.leagues.map(l => l.clubs),
      clubs: S.clubs.map(c => [c.league, c.cash, c.wageBudget, c.revScale, c.capacity, c.price, c.stadium, c.stature]),
      wageShift: S.wageShift || 0, jobOffers: S.jobOffers || null, endDone: !!S.endDone, mentor: S.mentor || null,
      coaches: TL.Coach.serialize(S), lastForm: S.lastForm || {}, reviews: S.reviews || [],
      lk: S.lk ? Object.assign({}, S.lk, { _fx: undefined }) : null, tlog: S.tlog || [], ev: S.ev || null, ac: S.ac || null,
      cups: S.cups || [], lastOrder: S.lastOrder || null, titles: S.titles || [], staff: S.staff || [], staffMarket: S.staffMarket || null, hist: S.hist || null,
      pb, pg, sales: S.players.filter(p => p.sale).map(p => [p.id, p.sale.r, p.sale.d, p.sale.w]),
      fixtures: S.fixtures, stats: S.stats, tactics: S.tactics, inbox: S.inbox, msgId: S.msgId,
      neg: S.neg, history: S.history, board: S.board, fin: S.fin, results: S.results || [],
      mgr: S.mgr, com: S.com, news: S.news, newsId: S.newsId, settings: S.settings, log: S.log, leader: S.leader,
      over: !!S.over, fired: !!S.fired, savedAt: Date.now()
    };
  }

  function restore(data, save) {
    const S = buildBase(data);
    S.season = save.season; S.week = save.week; S.user = save.user; S.manager = save.manager; S.pyr = save.pyr || 0;
    S.mgrG = save.mgrG || 'M'; S.face = save.face || null;
    S.leagues.forEach((l, i) => { l.clubs = save.leagues[i]; });
    S.clubs.forEach((c, i) => {
      const r = save.clubs[i];
      [c.league, c.cash, c.wageBudget, c.revScale, c.capacity, c.price, c.stadium, c.stature] = r;
    });
    save.pb.forEach((r, i) => {
      const p = S.players[i];
      const d = r[2] - p.ovr;
      [p.club, p.age, p.ovr, p.pot, p.contract, p.wage, p.fit, p.inj, p.sus] = r;
      p.listed = !!(r[9] & 1); p.res = !!(r[9] & 2);
      if (r[10] != null && r[10] >= 0) p.mor = r[10];
      if (d) p.st = p.st.map(v => U.clamp(v + d, 15, 99));
    });
    for (const r of save.pg) {
      S.players.push({
        id: S.players.length, name: r[0], short: r[1], club: r[2], nat: r[3], pos: r[4],
        alt: r[5] ? r[5].split(' ') : [], age: r[6], ovr: r[7], pot: r[8], foot: r[9], sm: r[10], wf: r[11],
        st: r[12].split(',').map(Number), contract: r[13], wage: r[14], fit: r[15], inj: r[16], sus: r[17],
        listed: !!(r[18] & 1), res: !!(r[18] & 2), gen: true, base: -1, mor: r[19] != null && r[19] >= 0 ? r[19] : undefined
      });
    }
    for (const [id, r, d, w] of save.sales || []) if (S.players[id]) S.players[id].sale = { r, d, w };
    Object.assign(S, {
      fixtures: save.fixtures, stats: save.stats, tactics: save.tactics, inbox: save.inbox, msgId: save.msgId,
      neg: save.neg || {}, history: save.history || [], board: save.board, fin: Object.assign(newFin(), save.fin || {}),
      results: save.results || [], mgr: save.mgr, com: save.com, news: save.news || [], newsId: save.newsId || 1,
      settings: save.settings, log: save.log || { crowd: {} }, leader: save.leader,
      wageShift: save.wageShift || 0, jobOffers: save.jobOffers || null, endDone: !!save.endDone, mentor: save.mentor || null,
      lastForm: save.lastForm || {}, reviews: save.reviews || [], lk: save.lk || null, tlog: save.tlog || [],
      cups: save.cups || null, lastOrder: save.lastOrder || null, titles: save.titles || [], staff: save.staff || [], staffMarket: save.staffMarket || null, hist: save.hist || null,
      over: save.over, fired: save.fired, ev: save.ev || null, ac: save.ac || null
    });
    TL.Coach.restore(S, save.coaches);
    dirty(S);
    migrate(S);
    return S;
  }

  /** Valores por defecto para partidas antiguas o recién creadas. */
  function migrate(S) {
    for (const c of S.clubs) if (c.stature == null) c.stature = c.rep;
    S.wageShift = S.wageShift || 0;
    if (!S.mentor) S.mentor = { seen: {}, trust: 50, cool: {}, chapter: 1, lessons: {} };
    if (S.user != null) { TL.Coach.init(S); TL.Locker.init(S); TL.Staff.migrate(S); if (TL.Events) TL.Events.init(S); }
    if (S.user != null && !S.cups && S.fixtures && TL.Cups) TL.Cups.build(S);
    TL.Manager.init(S);
    S.settings = Object.assign({ speed: 2, pause: { goal: true, red: true, inj: true, pen: true, var: true, crowd: false, ht: true } }, S.settings || {});
    S.news = S.news || [];
    S.log = S.log || { crowd: {} };
    S.fin = Object.assign(newFin(), S.fin || {});
    if (S.user != null) {
      TL.Commerce.init(S);
      for (const p of squad(S, S.user)) if (p.mor == null) p.mor = Math.round(U.rand(62, 80));
      if (TL.Academy) TL.Academy.start(S);   // el filial (también en partidas de antes de la cantera)
    }
    return S;
  }

  TL.World = {
    PYR: window.TL_PYRAMID_V || 0, pyramid,
    migrate,
    create, restore, serialize, makePlayer, maintainSquads, genName, squad, reserve, dirty, value, repOf, wageBill, userLeague,
    revenueCurve, newFin, LINE_POS
  };
})();
