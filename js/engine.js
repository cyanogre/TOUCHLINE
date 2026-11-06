/* TOUCHLINE — formaciones, alineaciones y motor de partidos */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U;

  // [posición, x (0 izq – 100 der), y (0 portería propia – 100 rival)]
  const BACK4 = [['RB', 85, 27], ['CB', 62, 20], ['CB', 38, 20], ['LB', 15, 27]];
  const FORMATIONS = {
    '4-3-3': [['GK', 50, 6], ...BACK4, ['CM', 70, 50], ['CDM', 50, 41], ['CM', 30, 50], ['RW', 82, 75], ['ST', 50, 84], ['LW', 18, 75]],
    '4-4-2': [['GK', 50, 6], ...BACK4, ['RM', 85, 54], ['CM', 62, 48], ['CM', 38, 48], ['LM', 15, 54], ['ST', 62, 81], ['ST', 38, 81]],
    '4-2-3-1': [['GK', 50, 6], ...BACK4, ['CDM', 62, 41], ['CDM', 38, 41], ['RW', 82, 66], ['CAM', 50, 63], ['LW', 18, 66], ['ST', 50, 85]],
    '4-1-2-1-2': [['GK', 50, 6], ...BACK4, ['CDM', 50, 39], ['CM', 72, 52], ['CM', 28, 52], ['CAM', 50, 64], ['ST', 62, 84], ['ST', 38, 84]],
    '4-5-1': [['GK', 50, 6], ...BACK4, ['RM', 85, 57], ['CM', 66, 50], ['CDM', 50, 41], ['CM', 34, 50], ['LM', 15, 57], ['ST', 50, 84]],
    '3-5-2': [['GK', 50, 6], ['CB', 72, 21], ['CB', 50, 18], ['CB', 28, 21], ['RM', 88, 54], ['CM', 66, 50], ['CDM', 50, 40], ['CM', 34, 50], ['LM', 12, 54], ['ST', 62, 82], ['ST', 38, 82]],
    '3-4-3': [['GK', 50, 6], ['CB', 72, 21], ['CB', 50, 18], ['CB', 28, 21], ['RM', 87, 52], ['CM', 62, 47], ['CM', 38, 47], ['LM', 13, 52], ['RW', 80, 77], ['ST', 50, 85], ['LW', 20, 77]],
    '5-3-2': [['GK', 50, 6], ['RB', 88, 32], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20], ['LB', 12, 32], ['CM', 70, 52], ['CM', 50, 46], ['CM', 30, 52], ['ST', 62, 80], ['ST', 38, 80]]
  };

  const COMPAT = {
    GK: { GK: 1 },
    CB: { CB: 1, CDM: 0.88, RB: 0.85, LB: 0.85 },
    RB: { RB: 1, LB: 0.88, RM: 0.86, CB: 0.85, RW: 0.78 },
    LB: { LB: 1, RB: 0.88, LM: 0.86, CB: 0.85, LW: 0.78 },
    CDM: { CDM: 1, CM: 0.94, CB: 0.87, CAM: 0.82 },
    CM: { CM: 1, CDM: 0.94, CAM: 0.94, RM: 0.85, LM: 0.85 },
    CAM: { CAM: 1, CM: 0.93, ST: 0.87, RW: 0.87, LW: 0.87 },
    RM: { RM: 1, RW: 0.94, LM: 0.88, CM: 0.86, RB: 0.84, CAM: 0.84 },
    LM: { LM: 1, LW: 0.94, RM: 0.88, CM: 0.86, LB: 0.84, CAM: 0.84 },
    RW: { RW: 1, RM: 0.94, LW: 0.9, ST: 0.87, CAM: 0.87 },
    LW: { LW: 1, LM: 0.94, RW: 0.9, ST: 0.87, CAM: 0.87 },
    ST: { ST: 1, CAM: 0.87, RW: 0.86, LW: 0.86 }
  };

  function fit(p, slot) {
    if (p.pos === slot) return 1;
    if (slot === 'GK' || p.pos === 'GK') return 0.25;
    let f = COMPAT[slot][p.pos] || (F.LINE[p.pos] === F.LINE[slot] ? 0.8 : 0.6);
    if (p.alt.includes(slot)) f = Math.max(f, 0.96);
    if (p.anyPos) f = Math.max(f, 0.97); // ADN «Fútbol total»
    return f;
  }

  /** Rendimiento de un jugador en un puesto: media × adaptación × forma física × moral. */
  function eff(p, slot) {
    const mor = p.mor == null ? 70 : p.mor;
    return p.ovr * fit(p, slot) * (0.75 + 0.25 * p.fit / 100) * (0.97 + 0.06 * mor / 100);
  }

  function available(p) { return p.inj <= 0 && p.sus <= 0; }

  /** Mejor once posible para una formación (asignación voraz global). */
  function autoLineup(players, formation, rotate) {
    const slots = FORMATIONS[formation];
    const avail = players.filter(available);
    const pairs = [];
    slots.forEach((s, si) => {
      for (const p of avail) {
        let e = eff(p, s[0]);
        if (rotate && p.fit < 70) e *= 0.85;
        pairs.push([e, si, p.id]);
      }
    });
    pairs.sort((a, b) => b[0] - a[0]);
    const res = new Array(slots.length).fill(-1), used = new Set();
    let left = slots.length;
    for (const [, si, pid] of pairs) {
      if (res[si] !== -1 || used.has(pid)) continue;
      res[si] = pid; used.add(pid);
      if (--left === 0) break;
    }
    return res;
  }

  function lineupScore(players, formation, ids) {
    const slots = FORMATIONS[formation];
    const byId = new Map(players.map(p => [p.id, p]));
    let s = 0;
    ids.forEach((id, i) => { if (id >= 0) s += eff(byId.get(id), slots[i][0]); });
    return s;
  }

  function bestFormation(players) {
    let best = null;
    for (const f of Object.keys(FORMATIONS)) {
      const ids = autoLineup(players, f, true);
      const sc = lineupScore(players, f, ids);
      if (!best || sc > best.score) best = { formation: f, ids, score: sc };
    }
    return best;
  }

  /**
   * Recoloca un once al cambiar de formación sin "desordenarlo": cada jugador
   * conserva su puesto si existe en el nuevo sistema; si no, su línea y su banda.
   * Los huecos se cubren con el mejor disponible de la plantilla.
   */
  function remapLineup(players, oldF, oldIds, newF) {
    const oldSlots = FORMATIONS[oldF] || FORMATIONS['4-3-3'], newSlots = FORMATIONS[newF];
    const byId = new Map(players.map(p => [p.id, p]));
    const cur = [];
    (oldIds || []).forEach((id, i) => {
      if (id >= 0 && byId.has(id) && available(byId.get(id)) && oldSlots[i]) cur.push({ p: byId.get(id), s: oldSlots[i] });
    });
    const pairs = [];
    const inXI = new Set(cur.map(c => c.p.id));
    newSlots.forEach((s, k) => {
      for (const c of cur) {
        const f = fit(c.p, s[0]);
        let sc = eff(c.p, s[0]) + (f >= 0.9 ? 8 : 0); // continuidad del once (si el puesto le va bien)
        if (c.s[0] === s[0]) sc += 30;
        else if (F.LINE[c.s[0]] === F.LINE[s[0]] && f >= 0.9) sc += 12;
        sc -= Math.abs(c.s[1] - s[1]) * 0.15;
        pairs.push([sc, k, c.p.id]);
      }
      // Un suplente que es especialista del puesto puede entrar si encaja mucho mejor
      for (const p of players) {
        if (inXI.has(p.id) || !available(p)) continue;
        if (p.pos === s[0] || p.alt.includes(s[0])) pairs.push([eff(p, s[0]), k, p.id]);
      }
    });
    pairs.sort((a, b) => b[0] - a[0]);
    const res = new Array(newSlots.length).fill(-1), used = new Set();
    for (const [, k, pid] of pairs) {
      if (res[k] !== -1 || used.has(pid)) continue;
      res[k] = pid; used.add(pid);
    }
    res.forEach((id, k) => {
      if (id !== -1) return;
      let best = null, be = -1;
      for (const p of players) {
        if (used.has(p.id) || !available(p)) continue;
        const e = eff(p, newSlots[k][0]);
        if (e > be) { be = e; best = p; }
      }
      if (best) { res[k] = best.id; used.add(best.id); }
    });
    return res;
  }

  function pickBench(players, startIds, n) {
    const used = new Set(startIds);
    const rest = players.filter(p => available(p) && !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
    const bench = [];
    const gk = rest.find(p => p.pos === 'GK');
    if (gk) bench.push(gk.id);
    for (const p of rest) {
      if (bench.length >= n) break;
      if (!bench.includes(p.id)) bench.push(p.id);
    }
    return bench;
  }

  /** Valida el once del usuario: rellena huecos/indisponibles con el mejor disponible. */
  function userLineup(S) {
    const T = S.tactics;
    const players = TL.World.squad(S, S.user);
    const slots = FORMATIONS[T.formation];
    const mine = new Set(players.map(p => p.id));
    let ids = (T.slots || []).slice(0, slots.length);
    while (ids.length < slots.length) ids.push(-1);
    const changed = [];
    const seen = new Set();
    ids = ids.map((id, i) => {
      if (id >= 0 && mine.has(id) && available(S.players[id]) && !seen.has(id)) { seen.add(id); return id; }
      if (id >= 0) changed.push(i);
      return -1;
    });
    if (ids.includes(-1)) {
      const pool = players.filter(p => available(p) && !seen.has(p.id));
      ids.forEach((id, i) => {
        if (id !== -1) return;
        let best = null, be = -1;
        for (const p of pool) {
          if (seen.has(p.id)) continue;
          const e = eff(p, slots[i][0]);
          if (e > be) { be = e; best = p; }
        }
        if (best) { ids[i] = best.id; seen.add(best.id); }
      });
    }
    T.slots = ids;
    return { formation: T.formation, ids, changed };
  }

  // ------------------------------------------------------------ Narración
  const TXT = {
    goal: [
      '¡GOOOL de {p}! Definición impecable.', '¡Gol! {p} la manda al fondo de la red.',
      '¡{p} no perdona! Gol.', '¡Golazo de {p}! Imparable para el portero.',
      '¡Gol de {p}! Remate cruzado que entra junto al palo.', '¡{p} marca! El estadio estalla.',
      '¡Gol de {p}! Aparece en el segundo palo y empuja a la red.', '¡{p}! Disparo seco desde la frontal. ¡Gol!'
    ],
    assist: ['Gran pase de {a}.', 'Asistencia de {a}.', 'Centro medido de {a}.', '{a} la puso en bandeja.', 'Jugada iniciada por {a}.'],
    // Goles según el tipo de remate (la vista 2D dibuja exactamente esto)
    g_header: ['¡Gol de cabeza de {p}! Se eleva por encima de todos.', '¡{p} cabecea a la red! Testarazo imparable.'],
    g_volley: ['¡Volea de {p}! ¡Golazo!', '¡{p} la engancha de volea y la clava!'],
    g_long: ['¡GOLAZO de {p} desde fuera del área! Misil a la escuadra.', '¡{p} se saca un zapatazo desde 30 metros! ¡Golazo!'],
    g_chip: ['¡Vaselina de {p}! Le pica el balón al portero.', '¡Qué clase! {p} la levanta por encima del portero.'],
    g_tapin: ['¡{p} empuja el rechace a la red!', '¡Gol de {p}, que llega antes que nadie al segundo palo!'],
    g_solo: ['¡Jugadón de {p}! Se va de dos y define.', '¡{p} se inventa el gol él solo!'],
    g_placed: ['¡Gol de {p}! Disparo cruzado, raso, junto al palo.', '¡{p} la coloca lejos del portero! Gol.'],
    g_power: ['¡Gol de {p}! Disparo seco que revienta la red.', '¡{p} la manda al fondo a bocajarro!'],
    s_header: ['{k} atrapa el cabezazo de {p}.', '¡Paradón de {k} a un cabezazo de {p}!'],
    s_long: ['{k} desvía el disparo lejano de {p}.', '{p} lo intenta desde lejos; {k} bien colocado.'],
    s_1v1: ['¡{k} gana el mano a mano a {p}!', '¡Qué parada de {k}! {p} se quedó solo.'],
    m_post: ['¡AL PALO! {p} estuvo a centímetros.', '¡Larguero! El disparo de {p} se estrella en la madera.'],
    m_header: ['{p} remata de cabeza, desviado.', 'Cabezazo de {p} que se marcha alto.'],
    m_long: ['Disparo lejano de {p} que se va por encima del larguero.', '{p} lo prueba desde lejos, fuera.'],
    m_blocked: ['¡Bloqueado! Un defensa se tira al suelo y frena el disparo de {p}.'],
    corner: ['Córner para {t}.', 'Saque de esquina a favor de {t}.'],
    offside: ['Fuera de juego de {p}. Bandera arriba.', '{p} cae en fuera de juego.'],
    late: ['¡Asedio final! {t} se vuelca en busca del gol.'],
    save: ['¡Paradón de {k}! Desvía el disparo de {p}.', '{p} prueba suerte, pero {k} atrapa el balón.',
      '{k} saca una mano salvadora ante {p}.', '¡Qué reflejos de {k}! Evita el gol de {p}.'],
    miss: ['{p} dispara... ¡fuera por poco!', 'Ocasión clarísima para {p}, que la manda arriba.',
      '¡Al palo! {p} estuvo a centímetros.', '{p} remata de cabeza, desviado.', '{p} se queda solo pero define mal.'],
    foul: ['Falta de {p} sobre {v}.', '{p} derriba a {v}. Falta.', 'Entrada de {p} a {v}; el árbitro pita falta.',
      '{p} agarra a {v} para frenar la contra.'],
    yellow: ['Amarilla para {p} por una entrada tardía.', '{p} ve la amarilla.', 'Tarjeta amarilla a {p} por cortar el contraataque.',
      'Amarilla para {p} por protestar.'],
    red: ['¡Roja directa para {p}! Entrada criminal. Su equipo se queda con diez.', '¡Expulsado {p}! Plancha durísima.'],
    red2: ['¡Segunda amarilla para {p}! A la calle.', '{p} ve la segunda amarilla y deja a su equipo con uno menos.'],
    pen: ['¡PENALTI! {p} derriba a {v} dentro del área.', '¡Penalti! Mano clarísima de {p} en el área.'],
    penGoal: ['{p} transforma el penalti. Engaña al portero.', '¡Gol de penalti! {p} la pone a la escuadra.'],
    penMiss: ['¡Lo para {k}! Adivina el lanzamiento de {p}.', '¡{p} falla el penalti! El balón se va fuera.'],
    fk: ['Falta peligrosa al borde del área para {t}.', 'Libre directo en posición de tiro.'],
    fkGoal: ['¡GOLAZO DE FALTA de {p}! Por encima de la barrera, a la escuadra.'],
    fkMiss: ['{p} lanza la falta... ¡se estrella en la barrera!', 'La falta de {p} se marcha rozando el larguero.'],
    var: ['El VAR revisa la jugada...', 'El árbitro consulta con el VAR.'],
    varOff: ['Gol anulado por fuera de juego de {p} tras revisión del VAR.'],
    varWrong: ['¡Polémica! El gol de {p} se anula por un fuera de juego que las imágenes no aclaran.'],
    offStand: ['Gol en posible fuera de juego que sube al marcador. Protestas airadas del rival.'],
    refMiss: ['¡Clamoroso! Penalti sobre {v} que el árbitro no pita. El banquillo estalla.', 'El público pide penalti sobre {v}... el árbitro manda seguir.'],
    varPen: ['El VAR avisa al árbitro: tras revisarlo en el monitor, ¡penalti!'],
    phantom: ['¡El árbitro pita penalti en una caída de {v}! Las repeticiones no muestran contacto.'],
    phantomOff: ['El VAR corrige al árbitro: no hay penalti.'],
    heated: ['¡Tangana! Empujones entre jugadores de ambos equipos tras la entrada.'],
    fight: ['¡{p} agrede a un rival! Roja directa y tangana monumental.'],
    confront: ['¡{p} se encara con el árbitro y le insulta! Roja directa.'],
    refAssault: ['¡Escándalo! {p} empuja y golpea al árbitro. Expulsión inmediata y el partido se detiene varios minutos.'],
    crowd_insults: ['Gritos e insultos desde la grada contra {t}. El árbitro lo recoge en el acta.'],
    crowd_racism: ['El árbitro detiene el partido: activa el protocolo por insultos racistas desde la grada. Aviso por megafonía.'],
    crowd_objects: ['Lanzamiento de objetos al césped desde la grada. El partido se detiene un momento.'],
    crowd_pyro: ['Bengalas en la grada. El humo obliga a parar el juego.'],
    crowd_invader: ['Un aficionado salta al césped y corre hacia los jugadores. Los de seguridad lo sacan.'],
    inj: ['{p} se duele y pide el cambio.', '{p} cae lesionado. Entran las asistencias.'],
    sub: ['Cambio: entra {p}, sale {a}.'],
    talk: ['Charla en el vestuario: {t}.'],
    formation: ['Cambio táctico: el equipo pasa a {t}.']
  };
  function say(kind, vars) {
    let t = U.pick(TXT[kind]);
    for (const k in vars) t = t.split('{' + k + '}').join(U.esc(vars[k]));
    return t;
  }

  const SHOOT_W = { ST: 6, RW: 3.5, LW: 3.5, CAM: 3, RM: 2, LM: 2, CM: 1.4, CDM: 0.7, CB: 0.5, RB: 0.6, LB: 0.6, GK: 0 };
  const ASSIST_W = { CAM: 4, CM: 3, RW: 3, LW: 3, RM: 3, LM: 3, ST: 2, RB: 1.5, LB: 1.5, CDM: 1.5, CB: 0.4, GK: 0.05 };
  const FOUL_W = { CB: 3, CDM: 3.2, RB: 2.2, LB: 2.2, CM: 2, LM: 1.3, RM: 1.3, CAM: 1, ST: 1.1, RW: 0.8, LW: 0.8, GK: 0.15 };
  const FOULED_W = { ST: 3, RW: 3.5, LW: 3.5, CAM: 3, RM: 2.5, LM: 2.5, CM: 1.8, CDM: 1.2, RB: 1.3, LB: 1.3, CB: 0.7, GK: 0.1 };
  const BASE_XG = 1.1, XG_K = 0.042, HOME_ADV = 3.5;
  const MENT_OWN = [0.82, 1, 1.15];
  const MENT_OPP = [0.8, 1, 1.12];
  const MENT_FOULS = [1.1, 1, 0.95];
  const TALKS = {
    calm: { name: 'Tranquilidad', v: [1.5, 0.5, 0.5] },   // [ganando, empatando, perdiendo]
    demand: { name: 'Exigir más', v: [-1, 2, 3] },
    praise: { name: 'Elogiar', v: [2, 0, -1.5] }
  };

  function refereeFor(S, homeId) {
    const L = S.leagues[S.clubs[homeId].league];
    const [name] = TL.World.genName(L.country, 'M');
    const strict = Math.round(U.rand(0.8, 1.25) * 100) / 100;
    return {
      name, strict, err: U.rand(0.04, 0.14), var: L.wealth >= 0.45,
      label: strict > 1.12 ? 'muy estricto' : strict > 1.0 ? 'estricto' : strict < 0.9 ? 'permisivo' : 'normal'
    };
  }

  /**
   * Fuerza de un once (función pura, la usa el partido y el análisis táctico).
   * Cada línea aporta su media; más jugadores en una línea suman extra:
   * +1,2 de defensa por defensa por encima de 4, +1 de ataque por delantero
   * por encima de 2, +1,5 de posesión y +0,3 de ataque/defensa por medio por encima de 4.
   */
  function teamStrength(onPitch, mult) {
    mult = mult || 1;
    const lines = [[], [], [], []];
    for (const o of onPitch) lines[F.LINE[o.slot]].push(eff(o.p, o.slot) * (o.hurt ? 0.6 : 1));
    const avg = a => (a.length ? U.sum(a) / a.length : null);
    let gk = avg(lines[0]), def = avg(lines[1]), mid = avg(lines[2]), att = avg(lines[3]);
    const any = avg(lines.flat()) || 40;
    if (gk == null) gk = 25;
    if (def == null) def = any * 0.85;
    if (mid == null) mid = any * 0.85;
    if (att == null) att = mid * 0.85;
    const nD = lines[1].length, nM = lines[2].length, nA = lines[3].length;
    const miss = 11 - onPitch.length;
    const k = v => v * mult;
    return {
      attack: k(0.55 * att + 0.45 * mid) + (nA - 2) * 1.0 + (nM - 4) * 0.3 - miss * 3,
      defense: k(0.5 * def + 0.3 * mid + 0.2 * gk) + (nD - 4) * 1.2 + (nM - 4) * 0.3 - miss * 3,
      mid: k(mid) + (nM - 4) * 1.5 - miss * 2,
      gk, lines: { def, mid, att }
    };
  }

  function poissonPmf(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }

  /** Probabilidades de victoria/empate/derrota a partir de los goles esperados. */
  function outcome(xa, xb) {
    let w = 0, d = 0, l = 0;
    const pa = [], pb = [];
    for (let k = 0; k <= 9; k++) { pa.push(poissonPmf(xa, k)); pb.push(poissonPmf(xb, k)); }
    for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) {
      const p = pa[i] * pb[j];
      if (i > j) w += p; else if (i === j) d += p; else l += p;
    }
    const t = w + d + l;
    return { w: w / t, d: d / t, l: l / t };
  }

  // ------------------------------------------------------------ Partido
  class Match {
    constructor(S, homeId, awayId, opts) {
      opts = opts || {};
      this.S = S;
      this.min = 0;
      this.done = false;
      this.detail = !!opts.detail;
      this.events = [];
      this.score = [0, 0];
      this.stats = {
        shots: [0, 0], onT: [0, 0], yel: [0, 0], red: [0, 0], possSum: [0, 0],
        fouls: [0, 0], corners: [0, 0], offsides: [0, 0], pens: [0, 0], xg: [0, 0]
      };
      this.pl = {}; // pid -> registro individual
      this.incidents = []; // incidentes para noticias: {type, team, pid, min}
      this.ref = refereeFor(S, homeId);
      this.bonus = [TL.Manager.bonus(S, homeId), TL.Manager.bonus(S, awayId)];
      this.teams = [this._team(homeId, 0, awayId), this._team(awayId, 1, homeId)];
      this._str = null;
      this._plan();
      const s0 = this._strength(0), s1 = this._strength(1);
      for (const i of [0, 1]) {
        const t = this.teams[i];
        const mine = i === 0 ? s0 : s1, opp = i === 0 ? s1 : s0;
        t.bigGame = (opp.attack + opp.defense) > (mine.attack + mine.defense) + 4;
        if (!t.isUser) {
          // Su entrenador decide según su estilo, el nivel de ambos, el campo y un punto de azar
          const d = (mine.attack + mine.defense) - (opp.attack + opp.defense);
          t.mentality = TL.Coach.mentality(S, t.club, d, i === 0);
          t.baseMent = t.mentality;
        }
        t.start.mentality = t.mentality;
      }
      this._str = null;
      if (this.detail) {
        this._ev('ko', -1, null, null, `Arranca el partido en el ${U.esc(S.clubs[homeId].stadium)}. Árbitro: ${U.esc(this.ref.name)} (${this.ref.label}).`);
      }
    }

    _team(clubId, idx, oppId) {
      const S = this.S;
      const isUser = clubId === S.user;
      const players = TL.World.squad(S, clubId);
      let formation, ids, mentality = 1, scouted = null;
      if (isUser) {
        const l = userLineup(S);
        formation = l.formation; ids = l.ids; mentality = S.tactics.mentality;
      } else {
        // El entrenador rival elige su plan: no se conoce hasta que empieza el partido
        const b = TL.Coach.lineup(S, clubId, oppId);
        formation = b.formation; ids = b.ids; scouted = b.scouted;
      }
      const slots = FORMATIONS[formation];
      const onPitch = [];
      ids.forEach((pid, i) => {
        if (pid < 0) return;
        onPitch.push({ pid, slot: slots[i][0], idx: i });
        this.pl[pid] = this._rec(idx, slots[i][0], 0);
      });
      const bench = pickBench(players, ids, 9);
      return {
        club: clubId, idx, isUser, formation, onPitch, bench, mentality, baseMent: mentality,
        subs: 0, maxSubs: 5, autoSubs: isUser ? S.tactics.autoSubs : true, boost: 1, talk: null,
        coach: TL.Coach.of(S, clubId), day: TL.Coach.dayFactor(S, clubId), scouted,
        start: { formation, ids: ids.slice(), mentality }, log: [], tchanges: 0, desperate: false
      };
    }

    _rec(team, slot, on) {
      return { on, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0, f: 0, pw: 0, pm: 0, ps: 0, team, slot };
    }

    /** Programa de antemano los incidentes de grada y de conducta del partido. */
    _plan() {
      const M = TL.EventsData.MATCH;
      // En el fútbol femenino los incidentes de grada y la violencia son mucho menos frecuentes
      const gf = this.S.gender === 'F' ? [0.3, 0.5] : [1, 1];
      this.plan = [];
      for (const [type, p] of Object.entries(M.crowd)) {
        if (Math.random() < p * gf[0]) this.plan.push({ min: U.int(4, 88), type: 'crowd_' + type, team: Math.random() < 0.8 ? 0 : 1 });
      }
      for (const [type, p] of Object.entries(M.player)) {
        if (Math.random() < p * gf[1]) {
          const team = Math.random() < 0.5 ? 0 : 1;
          const sc = this.bonus[team].cards;
          if (Math.random() < sc) this.plan.push({ min: U.int(20, 89), type, team });
        }
      }
      if (Math.random() < M.phantomPenalty) this.plan.push({ min: U.int(5, 89), type: 'phantom', team: Math.random() < 0.55 ? 0 : 1 });
    }

    P(id) { return this.S.players[id]; }

    _strength(i) {
      const t = this.teams[i];
      const b = this.bonus[i];
      const mult = t.boost * b.teamBoost * (t.bigGame ? 1 + b.bigGame : 1) * (t.day || 1);
      const LK = TL.Locker;
      let tm = 1, extra = { mid: 0, att: 0, def: 0 };
      if (LK && this.S.lk) {
        for (const o of t.onPitch) {
          const e = LK.fx(this.S, o.pid);
          if (!e) continue;
          if (e.team) tm *= e.team;
          extra.mid += e.mid || 0; extra.att += e.att || 0; extra.def += e.def || 0;
        }
        if (t.isUser) tm *= LK.matchBoost(this.S);
      }
      const st = teamStrength(t.onPitch.map(o => ({ p: this.P(o.pid), slot: o.slot, hurt: o.hurt })), mult * tm);
      // Choque de sistemas: puntas contra centrales, bandas, centro del campo
      const c = TL.Coach.clash(t.formation, this.teams[1 - i].formation);
      st.attack += c.attack + extra.att + extra.mid * 0.3; st.mid += c.mid + extra.mid; st.defense += extra.def + extra.mid * 0.3;
      // Química del vestuario: amigos que juegan juntos rinden más
      if (t.isUser && LK && this.S.lk) { const ch = LK.chem(this.S, t.onPitch.map(o => o.pid)); st.attack += ch; st.defense += ch; this.chem = ch; }
      return st;
    }

    strengths() {
      if (!this._str) this._str = [this._strength(0), this._strength(1)];
      return this._str;
    }

    xg(i) {
      const [a, b] = [this.strengths()[i], this.strengths()[1 - i]];
      const diff = a.attack - b.defense + (i === 0 ? HOME_ADV : 0);
      let x = BASE_XG * Math.exp(XG_K * diff);
      const t = this.teams[i], bo = this.bonus[i];
      const own = MENT_OWN[t.mentality];
      x *= (own > 1 ? own + bo.mentBonus : own < 1 ? own - bo.mentBonus * 0.3 : 1) * MENT_OPP[this.teams[1 - i].mentality];
      if (bo.chase && this.min >= 60 && this.score[i] < this.score[1 - i]) x *= 1 + bo.chase * 2;
      // A la desesperada: más ocasiones propias… y más contras del rival
      if (t.desperate) x *= 1.35;
      if (this.teams[1 - i].desperate) x *= 1.2;
      return U.clamp(x, 0.08, 5);
    }

    possession() {
      const [a, b] = this.strengths();
      const ma = Math.pow(Math.max(20, a.mid), 3) * [0.9, 1, 1.06][this.teams[0].mentality];
      const mb = Math.pow(Math.max(20, b.mid), 3) * [0.9, 1, 1.06][this.teams[1].mentality];
      return ma / (ma + mb);
    }

    setMentality(i, m, auto) {
      const t = this.teams[i];
      if (t.mentality === m) { if (!auto) t.baseMent = m; return; }
      t.mentality = m;
      if (!auto) t.baseMent = m;
      this._str = null;
      if (this.min > 0) {
        const last = t.log[t.log.length - 1];
        if (!last || last[2] !== m || last[0] !== this.min) t.log.push([this.min, null, m]);
        if (this.detail && !t.isUser) {
          const name = this.S.clubs[t.club].name;
          this._ev('tactic', i, null, null, m === 2 ? `${U.esc(name)} adelanta líneas: va a por todas.` : m === 0 ? `${U.esc(name)} da un paso atrás y se encierra.` : `${U.esc(name)} vuelve a equilibrar el equipo.`, { ment: m });
        }
      }
    }

    _ev(type, team, pid, pid2, text, extra) {
      const e = { min: this.min, type, team, pid, pid2, text };
      if (extra) Object.assign(e, extra);
      this.events.push(e);
      return e;
    }

    _gk(i) {
      const o = this.teams[i].onPitch.find(o => o.slot === 'GK');
      return o ? this.P(o.pid) : null;
    }

    _best(i, fn) {
      let best = null, bv = -1;
      for (const o of this.teams[i].onPitch) {
        const v = fn(this.P(o.pid), o);
        if (v > bv) { bv = v; best = this.P(o.pid); }
      }
      return best;
    }

    /** Avanza un minuto. Devuelve los eventos nuevos. */
    step() {
      if (this.done) return [];
      const start = this.events.length;
      this.min++;
      const m = this.min;
      const M = TL.EventsData.MATCH;
      const poss = this.possession();
      this.stats.possSum[0] += poss; this.stats.possSum[1] += 1 - poss;

      for (const ev of this.plan) if (ev.min === m) this._planned(ev);

      for (const i of [0, 1]) {
        const t = this.teams[i];
        if (!t.onPitch.length) continue;
        // El entrenador rival reacciona al partido; el tuyo solo en "resultado
        // rápido" (tu segundo entrenador). En directo decides tú.
        const diff = this.score[i] - this.score[1 - i];
        if (!t.isUser) TL.Coach.react(this, i);
        else {
          if (!this.detail && m >= 65) {
            const nm = diff < 0 ? 2 : diff > 0 && m >= 75 ? 0 : t.baseMent;
            if (nm !== t.mentality) { t.mentality = nm; this._str = null; }
          }
          t.desperate = diff < 0 && diff >= -2 && m >= 84 && t.mentality === 2;
        }
        const xg = this.xg(i);
        this.stats.xg[i] += xg / 90;
        if (Math.random() < Math.min(0.6, xg / 90 / 0.105)) this._shot(i);
        // Faltas: las comete sobre todo el equipo sin balón
        const possI = i === 0 ? poss : 1 - poss;
        const fr = M.foulsPerTeam / 90 * (0.55 + 0.9 * (1 - possI)) * MENT_FOULS[t.mentality] * (m > 75 ? 1.12 : 1);
        if (Math.random() < fr) this._foul(i);
        if (Math.random() < M.offsidePerTeam / 90) {
          this.stats.offsides[i]++;
          if (this.detail) {
            const fw = t.onPitch.filter(o => F.LINE[o.slot] === 3);
            const o = fw.length ? U.pick(fw) : null;
            if (o) this._ev('offside', i, o.pid, null, Math.random() < 0.3 ? say('offside', { p: this.P(o.pid).short }) : '');
          }
        }
        if (this.detail && t.desperate && !t.lateCall) {
          t.lateCall = true;
          this._ev('late', i, null, null, say('late', { t: this.S.clubs[t.club].name }));
        }
        if (Math.random() < 0.22 / 90 * this.bonus[i].injury) this._injury(i);
        if (t.autoSubs && m >= 58 && m <= 85 && t.subs < 3 && Math.random() < 0.09) this._fatigueSub(i);
      }
      if (m === 45) {
        this._halfTime();
        if (this.detail) this._ev('ht', -1, null, null, `Descanso. ${this.score[0]}-${this.score[1]}.`);
      }
      if (m >= 90) this._end();
      return this.events.slice(start);
    }

    _shotType(origin, goal, line) {
      const w = {
        corner: { header: 0.62, volley: 0.2, tapin: 0.18 },
        cross: { header: 0.5, volley: 0.2, placed: 0.18, tapin: 0.12 },
        counter: { placed: 0.5, chip: 0.16, solo: 0.2, power: 0.14 },
        long: { long: 1 },
        open: { placed: 0.38, power: 0.3, solo: 0.1, tapin: 0.12, volley: 0.1 }
      }[origin];
      const keys = Object.keys(w);
      // Los goles son más a menudo remates cercanos; los fallos, disparos de lejos o de cabeza
      return U.weighted(keys, k => w[k] * (goal ? ({ tapin: 1.8, placed: 1.2, chip: 1.4, long: 0.6, header: 0.9 }[k] || 1) : ({ tapin: 0.6, header: 1.15 }[k] || 1)) * (k === 'header' && line < 1 ? 0.2 : 1));
    }

    _scoreGoal(i, shooter, assister, kind, sx) {
      this.score[i]++;
      this.stats.onT[i]++;
      this.pl[shooter.id].g++;
      if (assister) this.pl[assister.id].a++;
      let txt = '';
      if (this.detail) {
        if (kind === 'pen') txt = say('penGoal', { p: shooter.short });
        else if (kind === 'fk') txt = say('fkGoal', { p: shooter.short });
        else {
          const k = sx && TXT['g_' + sx.shotType] ? 'g_' + sx.shotType : 'goal';
          txt = say(k, { p: shooter.short });
          if (assister) txt += ' ' + say('assist', { a: assister.short });
        }
      }
      this._ev('goal', i, shooter.id, assister && assister.id, txt, Object.assign({ kind, late: this.min >= 88 }, sx || {}));
    }

    _shot(i) {
      const M = TL.EventsData.MATCH;
      const t = this.teams[i];
      const outfield = t.onPitch.filter(o => o.slot !== 'GK');
      if (!outfield.length) return;
      const tfx = pid => (TL.Locker && this.S.lk ? TL.Locker.fx(this.S, pid) : null) || {};
      const o = U.weighted(outfield, o => SHOOT_W[o.slot] * Math.pow(Math.max(30, this.P(o.pid).st[1]) / 70, 2) * (tfx(o.pid).shot || 1));
      const shooter = this.P(o.pid);
      const gk = this._gk(1 - i);
      const gkv = gk ? eff(gk, 'GK') : 30;
      const sho = shooter.pos === 'GK' ? 30 : shooter.st[1];
      // Rasgos: el que remata y el portero rival
      const pGoal = U.clamp(0.105 * Math.pow(sho / 70, 0.9) * Math.pow(72 / Math.max(30, gkv), 0.8) * (tfx(shooter.id).conv || 1) * (gk ? tfx(gk.id).save || 1 : 1), 0.03, 0.42);
      this.stats.shots[i]++;
      // De dónde nace la ocasión (la vista 2D la dibuja así)
      const desp = t.desperate, line = F.LINE[o.slot];
      const origin = U.weighted(['corner', 'cross', 'counter', 'long', 'open'], k => ({
        corner: desp ? 0.3 : 0.2, cross: desp ? 0.32 : 0.24, counter: this.teams[1 - i].desperate || this.teams[1 - i].mentality === 2 ? 0.2 : 0.1,
        long: line <= 2 ? 0.34 : desp ? 0.16 : 0.08, open: 0.4
      })[k]);
      if (origin === 'corner') {
        this.stats.corners[i]++;
        if (this.detail) this._ev('corner', i, null, null, Math.random() < 0.35 ? say('corner', { t: this.S.clubs[t.club].name }) : '');
      } else if (Math.random() < 0.08) this.stats.corners[i]++;
      const goal = Math.random() < pGoal;
      const shotType = this._shotType(origin, goal, line);
      const sx = { origin, shotType };
      if (goal) {
        let assister = null;
        if (Math.random() < 0.75) {
          const mates = t.onPitch.filter(x => x.pid !== shooter.id);
          if (mates.length) {
            const a = U.weighted(mates, x => ASSIST_W[x.slot] * Math.pow(Math.max(30, this.P(x.pid).st[2]) / 70, 2) * (tfx(x.pid).assist || 1));
            assister = this.P(a.pid);
          }
        }
        // Revisión: fuera de juego (correcto o polémico) o gol ilegal que sube
        const r = Math.random();
        const err = this.ref.err;
        if (r < M.varOffsideGoal) {
          this.stats.offsides[i]++;
          if (this.detail) { this._ev('var', i, shooter.id, null, say('var', {})); }
          this._ev('disallowed', i, shooter.id, null, this.detail ? say('varOff', { p: shooter.short }) : '', sx);
          return;
        }
        if (r < M.varOffsideGoal + err * 0.12) {
          this._ev('disallowed', i, shooter.id, null, this.detail ? say('varWrong', { p: shooter.short }) : '', Object.assign({ controversy: true }, sx));
          this.incidents.push({ type: 'wrongDisallowed', team: i, pid: shooter.id, min: this.min });
          return;
        }
        if (r > 1 - err * 0.08) {
          this.incidents.push({ type: 'illegalGoal', team: 1 - i, pid: shooter.id, min: this.min });
          this._scoreGoal(i, shooter, assister, 'open', sx);
          if (this.detail) this._ev('controversy', 1 - i, null, null, say('offStand', {}), { controversy: true });
          return;
        }
        this._scoreGoal(i, shooter, assister, 'open', sx);
      } else {
        const onTarget = Math.random() < 0.42;
        if (onTarget) {
          this.stats.onT[i]++;
          if (gk) this.pl[gk.id].sv++;
        }
        if (this.detail) {
          // Todas las ocasiones se ven en el campo; solo algunas se narran
          const talk = Math.random() < 0.4;
          if (onTarget && gk) {
            const k = shotType === 'header' ? 's_header' : shotType === 'long' ? 's_long' : origin === 'counter' ? 's_1v1' : 'save';
            this._ev('save', i, shooter.id, gk.id, talk || origin === 'counter' ? say(k, { p: shooter.short, k: gk.short }) : '', Object.assign({ big: origin === 'counter' || shotType === 'tapin' }, sx));
          } else {
            const r2 = Math.random();
            const miss = r2 < 0.1 ? 'post' : r2 < 0.28 && shotType !== 'header' ? 'blocked' : shotType === 'header' ? 'header' : shotType === 'long' ? 'long' : 'wide';
            const k = miss === 'post' ? 'm_post' : miss === 'blocked' ? 'm_blocked' : miss === 'header' ? 'm_header' : miss === 'long' ? 'm_long' : 'miss';
            this._ev('miss', i, shooter.id, null, talk || miss === 'post' ? say(k, { p: shooter.short }) : '', Object.assign({ miss }, sx));
          }
        }
      }
    }

    /** Falta cometida por el equipo i. */
    _foul(i) {
      const M = TL.EventsData.MATCH;
      const t = this.teams[i], opp = 1 - i;
      const ot = this.teams[opp];
      if (!t.onPitch.length || !ot.onPitch.length) return;
      // Un jugador amonestado se contiene: comete menos faltas
      const fo = U.weighted(t.onPitch, o => FOUL_W[o.slot] * (0.7 + this.P(o.pid).st[4] / 160) * (this.pl[o.pid] && this.pl[o.pid].y ? 0.45 : 1));
      const vo = U.weighted(ot.onPitch, o => FOULED_W[o.slot] * Math.pow(Math.max(30, this.P(o.pid).st[3]) / 70, 2) * (((TL.Locker && this.S.lk && TL.Locker.fx(this.S, o.pid)) || {}).fouled || 1));
      const fouler = this.P(fo.pid), victim = this.P(vo.pid);
      this.stats.fouls[i]++;
      this.pl[fouler.id].f++;
      const strict = this.ref.strict * this.bonus[i].cards;
      const late = this.min > 75 ? 1.2 : 1;
      const r = Math.random();
      let shown = false;
      if (r < M.penaltyPerFoul) {
        // Penalti: puede que el árbitro no lo vea; el VAR corrige la mayoría
        if (Math.random() < this.ref.err) {
          if (this.ref.var && Math.random() < 0.65) {
            if (this.detail) { this._ev('var', opp, null, null, say('var', {})); this._ev('pen', opp, victim.id, fouler.id, say('varPen', {})); }
            this._penalty(opp, victim, fouler);
          } else {
            this._ev('refmiss', opp, victim.id, null, this.detail ? say('refMiss', { v: victim.short }) : '', { controversy: true });
            this.incidents.push({ type: 'penaltyDenied', team: opp, pid: victim.id, min: this.min });
          }
        } else {
          if (this.detail) this._ev('pen', opp, victim.id, fouler.id, say('pen', { p: fouler.short, v: victim.short }));
          else this._ev('pen', opp, victim.id, fouler.id, '');
          this._penalty(opp, victim, fouler);
        }
        shown = true;
      } else if (r < M.penaltyPerFoul + M.dangerousFkPerFoul) {
        this._freeKick(opp);
        shown = Math.random() < 0.5;
      }
      // Tarjetas
      const cr = Math.random();
      const booked = this.pl[fouler.id] && this.pl[fouler.id].y ? 0.5 : 1; // el árbitro perdona más la segunda
      if (cr < M.redPerFoul * strict) this._red(i, fouler, true);
      else if (cr < (M.redPerFoul + M.yellowPerFoul * late * booked) * strict) this._yellow(i, fouler);
      else if (this.detail && !shown) this._ev('foul', i, fouler.id, victim.id, Math.random() < 0.12 ? say('foul', { p: fouler.short, v: victim.short }) : '', { hard: Math.random() < 0.3 });
      if (Math.random() < M.heatedPerFoul) this._heated();
    }

    _penalty(i, victim, fouler) {
      const M = TL.EventsData.MATCH;
      this.stats.pens[i]++;
      if (victim && this.pl[victim.id]) this.pl[victim.id].pw++;
      const taker = this._best(i, p => (p.pos === 'GK' ? 0 : p.st[1] * 1.5 + p.st[2] * 0.3));
      if (!taker) return;
      const gk = this._gk(1 - i);
      const gkv = gk ? eff(gk, 'GK') : 30;
      const p = U.clamp(M.penaltyConv * Math.pow(taker.st[1] / 80, 0.35) * Math.pow(76 / Math.max(30, gkv), 0.35), 0.55, 0.92);
      this.stats.shots[i]++;
      this.stats.xg[i] += 0.76;
      if (Math.random() < p) this._scoreGoal(i, taker, null, 'pen');
      else {
        this.pl[taker.id].pm++;
        if (gk && Math.random() < 0.7) { this.pl[gk.id].ps++; this.stats.onT[i]++; }
        this._ev('penmiss', i, taker.id, gk && gk.id, this.detail ? say('penMiss', { p: taker.short, k: gk ? gk.short : 'el portero' }) : '');
      }
    }

    _freeKick(i) {
      const M = TL.EventsData.MATCH;
      const taker = this._best(i, p => (p.pos === 'GK' ? 0 : p.st[1] + p.st[2]));
      if (!taker) return;
      this.stats.shots[i]++;
      const p = M.fkGoal * Math.pow((taker.st[1] + taker.st[2]) / 160, 2);
      if (Math.random() < p) {
        if (this.detail) this._ev('fk', i, null, null, say('fk', { t: this.S.clubs[this.teams[i].club].name }));
        this._scoreGoal(i, taker, null, 'fk');
      } else if (this.detail && Math.random() < 0.35) {
        this._ev('fk', i, taker.id, null, say('fkMiss', { p: taker.short }));
      }
    }

    _yellow(i, p) {
      const rec = this.pl[p.id];
      if (!rec || rec.off != null) return;
      if (rec.y >= 1) { rec.y++; this._red(i, p, false); return; }
      rec.y++;
      this.stats.yel[i]++;
      this._ev('yellow', i, p.id, null, this.detail ? say('yellow', { p: p.short }) : '');
    }

    _red(i, p, straight, kind) {
      const rec = this.pl[p.id];
      if (!rec || rec.off != null) return;
      rec.r = kind === 'refAssault' ? 12 : kind === 'confront' ? 4 : kind === 'fight' ? 3 : straight ? U.pick([1, 1, 2]) : 1;
      rec.rKind = kind || (straight ? 'straight' : 'second');
      this.stats.red[i]++;
      const txt = kind ? say(kind, { p: p.short }) : say(straight ? 'red' : 'red2', { p: p.short });
      this._ev('red', i, p.id, null, txt);
      const t = this.teams[i];
      const was = t.onPitch.find(o => o.pid === p.id);
      this._remove(i, p.id);
      // El entrenador tapa el hueco: portero suplente o un defensa por un delantero
      if (was && (!t.isUser || (t.autoSubs && !this.detail))) this._cover(i, was);
    }

    _cover(i, was) {
      const t = this.teams[i];
      if (t.subs >= t.maxSubs || !t.bench.length || this.min >= 88) return;
      const line = F.LINE[was.slot];
      if (line !== 0 && (line !== 1 || this.min >= 80)) return;
      const att = t.onPitch.filter(o => F.LINE[o.slot] >= 2).sort((a, b) => F.LINE[b.slot] - F.LINE[a.slot] || this.P(a.pid).ovr - this.P(b.pid).ovr)[0];
      const inn = t.bench.map(pid => this.P(pid)).filter(q => (line === 0 ? q.pos === 'GK' : F.LINE[q.pos] === 1)).sort((a, b) => eff(b, was.slot) - eff(a, was.slot))[0];
      if (!att || !inn) return;
      if (!this.substitute(i, att.pid, inn.id)) return;
      const o = t.onPitch.find(x => x.pid === inn.id);
      o.slot = was.slot; o.idx = was.idx;
      this.pl[inn.id].slot = was.slot;
      this._str = null;
    }

    _heated() {
      if (this.detail) this._ev('heated', -1, null, null, say('heated', {}));
      for (const i of [0, 1]) {
        const t = this.teams[i];
        if (t.onPitch.length && Math.random() < 0.55 * this.ref.strict) {
          const o = U.pick(t.onPitch);
          this._yellow(i, this.P(o.pid));
        }
      }
      this.incidents.push({ type: 'heated', team: -1, min: this.min });
    }

    _planned(ev) {
      const i = ev.team;
      const t = this.teams[i];
      const club = this.S.clubs[t.club];
      if (ev.type.startsWith('crowd_')) {
        // Los incidentes de grada se atribuyen a la afición del equipo i
        const rival = this.S.clubs[this.teams[1 - i].club];
        this.incidents.push({ type: ev.type, team: i, min: this.min });
        if (!TXT[ev.type]) return; // p. ej. pelea de ultras fuera del estadio: solo noticia
        const txt = say(ev.type, { t: rival.name });
        this._ev('crowd', i, null, null, this.detail ? `${txt} (afición de ${U.esc(club.name)})` : '', { kind: ev.type });
        return;
      }
      if (ev.type === 'phantom') {
        const ot = t.onPitch;
        if (!ot.length) return;
        const v = this.P(U.weighted(ot, o => FOULED_W[o.slot]).pid);
        this._ev('pen', i, v.id, null, this.detail ? say('phantom', { v: v.short }) : '', { controversy: true });
        if (this.ref.var && Math.random() < 0.6) {
          if (this.detail) { this._ev('var', i, null, null, say('var', {})); this._ev('var', i, null, null, say('phantomOff', {})); }
          return;
        }
        this.incidents.push({ type: 'phantomPenalty', team: 1 - i, pid: v.id, min: this.min });
        this._penalty(i, v, null);
        return;
      }
      // Conducta violenta de un jugador del equipo i
      if (!t.onPitch.length) return;
      const o = U.weighted(t.onPitch, o => FOUL_W[o.slot] + (this.P(o.pid).mor != null && this.P(o.pid).mor < 40 ? 2 : 0));
      const p = this.P(o.pid);
      this.incidents.push({ type: ev.type, team: i, pid: p.id, min: this.min });
      this._red(i, p, true, ev.type);
      if (ev.type === 'fight') {
        const ot = this.teams[1 - i].onPitch;
        if (ot.length && Math.random() < 0.5) this._yellow(1 - i, this.P(U.pick(ot).pid));
      }
    }

    _injury(i) {
      const t = this.teams[i];
      if (!t.onPitch.length) return;
      const o = U.weighted(t.onPitch, o => 115 - this.P(o.pid).fit);
      const p = this.P(o.pid);
      const rec = this.pl[p.id];
      if (!rec || rec.inj) return;
      const weeks = U.weighted([1, 2, 3, 4, 6, 8, 12], w => ({ 1: 30, 2: 25, 3: 15, 4: 12, 6: 9, 8: 6, 12: 3 })[w]);
      rec.inj = Math.max(1, Math.round(weeks * this.bonus[i].injDur));
      this._ev('inj', i, p.id, null, this.detail ? say('inj', { p: p.short }) : '');
      if (t.subs < t.maxSubs && (t.autoSubs || !t.isUser)) {
        if (!this._bestSub(i, o)) o.hurt = true;
      } else o.hurt = true;
      this._str = null;
    }

    _remove(i, pid) {
      const t = this.teams[i];
      const k = t.onPitch.findIndex(o => o.pid === pid);
      if (k >= 0) { t.onPitch.splice(k, 1); this.pl[pid].off = this.min; }
      this._str = null;
    }

    _bestSub(i, out) {
      const t = this.teams[i];
      let best = null, be = -1;
      for (const pid of t.bench) {
        const e = eff(this.P(pid), out.slot);
        if (e > be) { be = e; best = pid; }
      }
      if (best == null) return false;
      return this.substitute(i, out.pid, best);
    }

    _fatigueSub(i) {
      const t = this.teams[i];
      const cands = t.onPitch.filter(o => o.slot !== 'GK');
      if (!cands.length || !t.bench.length) return;
      const tired = o => this.P(o.pid).fit - this.min * 0.1 * (1 - this.P(o.pid).st[5] / 200) - (this.pl[o.pid].y ? 8 : 0);
      const out = cands.reduce((a, b) => (tired(a) < tired(b) ? a : b));
      const cur = eff(this.P(out.pid), out.slot) * (1 - this.min / 600);
      const best = t.bench.map(pid => this.P(pid)).filter(p => p.pos !== 'GK')
        .sort((a, b) => eff(b, out.slot) - eff(a, out.slot))[0];
      if (best && eff(best, out.slot) >= cur * 0.88) this.substitute(i, out.pid, best.id);
    }

    /** Cambio: sale outPid, entra inPid (del banquillo). */
    substitute(i, outPid, inPid) {
      const t = this.teams[i];
      if (t.subs >= t.maxSubs) return false;
      const o = t.onPitch.find(o => o.pid === outPid);
      const bi = t.bench.indexOf(inPid);
      if (!o || bi < 0) return false;
      t.bench.splice(bi, 1);
      this.pl[outPid].off = this.min;
      this.pl[inPid] = this._rec(i, o.slot, this.min);
      o.pid = inPid; o.hurt = false;
      t.subs++;
      this._str = null;
      if (this.detail) this._ev('sub', i, inPid, outPid, say('sub', { p: this.P(inPid).short, a: this.P(outPid).short }));
      return true;
    }

    /** Cambio de sistema en pleno partido: recoloca a los que están en el campo. */
    changeFormation(i, formation, why) {
      const t = this.teams[i];
      if (!FORMATIONS[formation] || t.formation === formation) return false;
      const slots = FORMATIONS[formation];
      const players = t.onPitch.map(o => this.P(o.pid));
      const hurt = new Set(t.onPitch.filter(o => o.hurt).map(o => o.pid));
      // Con expulsados, se sacrifican primero los puestos más adelantados
      let use = slots.map((s, k) => k);
      if (players.length < slots.length) {
        use = use.sort((a, b) => (slots[a][0] === 'GK' ? -1 : slots[b][0] === 'GK' ? 1 : slots[a][2] - slots[b][2])).slice(0, players.length);
      }
      const prev = new Map(t.onPitch.map(o => [o.pid, o.slot]));
      const oldSlots = FORMATIONS[t.formation];
      const prevX = new Map(t.onPitch.map(o => [o.pid, o.idx != null && oldSlots[o.idx] ? oldSlots[o.idx][1] : 50]));
      const pairs = [];
      for (const k of use) {
        for (const p of players) {
          let sc = eff(p, slots[k][0]);
          const was = prev.get(p.id);
          if (was === slots[k][0]) sc += 30; else if (F.LINE[was] === F.LINE[slots[k][0]]) sc += 12;
          sc -= Math.abs(prevX.get(p.id) - slots[k][1]) * 0.15;
          pairs.push([sc, k, p.id]);
        }
      }
      pairs.sort((a, b) => b[0] - a[0]);
      const done = new Set(), usedSlots = new Set(), onPitch = [];
      for (const [, k, pid] of pairs) {
        if (done.has(pid) || usedSlots.has(k)) continue;
        done.add(pid); usedSlots.add(k);
        onPitch.push({ pid, slot: slots[k][0], idx: k, hurt: hurt.has(pid) });
        this.pl[pid].slot = slots[k][0];
      }
      onPitch.sort((a, b) => a.idx - b.idx);
      t.onPitch = onPitch;
      t.formation = formation;
      this._str = null;
      t.log.push([this.min, formation, t.mentality, why || '']);
      if (this.detail) {
        this._ev('tactic', i, null, null, t.isUser ? say('formation', { t: formation })
          : `Cambio táctico: ${U.esc(this.S.clubs[t.club].name)} pasa a ${formation}${why ? ' ' + why : ''}.`, { formation });
      }
      return true;
    }

    /** Charla del descanso. kind: calm | demand | praise */
    teamTalk(i, kind) {
      const t = this.teams[i];
      if (t.talk) return null;
      const d = this.score[i] - this.score[1 - i];
      const k = d > 0 ? 0 : d === 0 ? 1 : 2;
      let pct = TALKS[kind].v[k] * this.bonus[i].talk;
      if (d <= -2 && kind === 'demand') pct = 1 * this.bonus[i].talk; // muy por detrás: exigir genera ansiedad
      pct += U.rand(-0.5, 0.5);
      t.boost = 1 + pct / 100;
      t.talk = { kind, pct };
      this._str = null;
      const mood = pct >= 1.5 ? 'el equipo sale enchufado' : pct >= 0 ? 'el mensaje cala a medias' : 'a los jugadores no les ha gustado';
      this._ev('talk', i, null, null, this.detail ? say('talk', { t: `${TALKS[kind].name} — ${mood}` }) : '');
      return { pct, mood };
    }

    _halfTime() {
      for (const i of [0, 1]) {
        const t = this.teams[i];
        if (t.isUser && this.detail) continue; // el usuario elige su charla
        const d = this.score[i] - this.score[1 - i];
        const good = d > 0 ? 'praise' : d === 0 ? 'demand' : 'demand';
        this.teamTalk(i, Math.random() < 0.5 ? good : U.pick(['calm', 'demand', 'praise']));
      }
    }

    _end() {
      this.done = true;
      for (const id in this.pl) if (this.pl[id].off == null) this.pl[id].off = 90;
      if (this.detail) this._ev('ft', -1, null, null, `¡Final del partido! ${this.score[0]}-${this.score[1]}.`);
    }

    simulate() { while (!this.done) this.step(); return this; }

    /** Valoración (rating) de cada jugador que participó. */
    ratings() {
      const out = {};
      const [g0, g1] = this.score;
      for (const id in this.pl) {
        const r = this.pl[id], p = this.P(+id);
        const mine = r.team === 0 ? g0 : g1, opp = r.team === 0 ? g1 : g0;
        const mins = Math.max(1, r.off - r.on);
        const share = Math.min(1, mins / 90);
        const line = F.LINE[r.slot];
        let v = 6.2 + (p.ovr - 72) / 30;
        v += r.g * 1.0 + r.a * 0.6 + r.sv * 0.15 - r.y * 0.3 - (r.r ? 1.6 : 0);
        v += r.pw * 0.3 - r.pm * 0.6 + r.ps * 0.8 - r.f * 0.04;
        v += share * ((mine > opp ? 0.4 : mine < opp ? -0.3 : 0) + mine * 0.08 - opp * (line <= 1 ? 0.18 : 0.06));
        if (opp === 0 && line <= 1 && mins >= 60) v += line === 0 ? 0.7 : 0.4;
        v += (Math.random() - 0.5) * 0.9;
        out[id] = Math.round(U.clamp(v, 3.5, 10) * 10) / 10;
      }
      return out;
    }

    /** Aplica el resultado al estado del juego (estadísticas, forma física, sanciones). */
    finish() {
      if (!this.done) this.simulate();
      const S = this.S;
      // Repaso a posteriori (antes de aplicar cansancio y bajas) y lo que verán los ojeadores rivales
      const review = this.teams.some(t => t.isUser) ? TL.Coach.review(this) : null;
      S.lastForm = S.lastForm || {};
      for (const t of this.teams) S.lastForm[t.club] = t.start.formation;
      const ratings = this.ratings();
      let mom = null;
      for (const id in ratings) if (mom == null || ratings[id] > ratings[mom]) mom = id;
      // Sanciones cumplidas
      for (const t of this.teams) {
        for (const p of TL.World.squad(S, t.club)) if (p.sus > 0 && !this.pl[p.id]) p.sus--;
      }
      const injuries = [], reds = [], yellowBans = [], scorers = [];
      for (const id in this.pl) {
        const r = this.pl[id], p = S.players[id];
        const st = S.stats[id] || (S.stats[id] = [0, 0, 0, 0, 0, 0, 0, 0]);
        if (st.length < 8) st.push(0);
        const prevY = st[4];
        st[0]++; st[1] += r.g; st[2] += r.a; st[3] += ratings[id]; st[4] += r.r && r.rKind === 'second' ? 0 : r.y; st[5] += r.r ? 1 : 0;
        st[7] += r.f;
        if (String(mom) === id) st[6]++;
        for (let k = 0; k < r.g; k++) scorers.push(+id);
        const mins = Math.max(0, r.off - r.on);
        const fat = this.bonus[r.team].fatigue;
        const drop = (p.pos === 'GK' ? 4 : 10 + Math.random() * 6) * (mins / 90) * (1.15 - p.st[5] / 250) * fat;
        p.fit = U.clamp(Math.round(p.fit - drop), 30, 100);
        if (r.inj) { p.inj = Math.max(p.inj, r.inj); injuries.push([+id, r.inj]); }
        if (r.r) { p.sus = Math.max(p.sus, r.r); reds.push([+id, r.r, r.rKind]); }
        // Ciclo de 5 amarillas = 1 partido de sanción
        if (Math.floor(st[4] / 5) > Math.floor(prevY / 5)) { p.sus += 1; yellowBans.push(+id); }
      }
      this.lastRatings = ratings;
      this.mom = mom != null ? +mom : null;
      return {
        h: this.teams[0].club, a: this.teams[1].club, hg: this.score[0], ag: this.score[1],
        mom: this.mom, ratings, injuries, reds, yellowBans, scorers, incidents: this.incidents,
        stats: this.stats, ref: this.ref, review,
        slots: Object.fromEntries(Object.entries(this.pl).map(([id, r]) => [id, r.slot]))
      };
    }
  }

  /** Simulación rápida (solo marcador) para ligas no controladas. */
  function quickScore(sh, sa) {
    const xh = (BASE_XG + 0.12) * Math.exp(XG_K * (sh - sa + HOME_ADV));
    const xa = (BASE_XG + 0.12) * Math.exp(XG_K * (sa - sh));
    return [U.poisson(U.clamp(xh, 0.1, 5)), U.poisson(U.clamp(xa, 0.1, 5))];
  }

  TL.Engine = {
    FORMATIONS, TALKS, fit, eff, available, autoLineup, lineupScore, remapLineup, bestFormation, pickBench, userLineup, Match, quickScore,
    teamStrength, outcome, MENT_OWN, MENT_OPP
  };
})();
