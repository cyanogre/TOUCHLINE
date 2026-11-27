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

  /** Cuánto corre cada puesto en un partido (1 = la media). */
  const POS_LOAD = { CB: 0.86, RB: 1.12, LB: 1.12, CDM: 1.04, CM: 1.12, CAM: 0.98, RM: 1.1, LM: 1.1, RW: 1.04, LW: 1.04, ST: 0.92 };

  /** Rendimiento de un jugador en un puesto: media × adaptación × forma física × moral.
   *  `en`: energía en el partido (0-100); si no se da, la forma física con la que llega. */
  function eff(p, slot, en) {
    const mor = p.mor == null ? 70 : p.mor;
    const f = en == null ? p.fit : en;
    // Moral: lineal y con extremos (en llamas por encima de 85, desconectado por debajo de 40)
    const mf = 0.9 + 0.15 * mor / 100 + (mor >= 85 ? 0.015 : 0) - (mor <= 40 ? 0.03 : 0);
    // Confianza (vestuario vivo): subidón o bajón de unas jornadas tras un momento en el despacho
    return p.ovr * fit(p, slot) * (0.75 + 0.25 * f / 100) * mf * (p.cf || 1);
  }

  const MAX_WINDOWS = 3;      // paradas para cambios fuera del descanso
  const REORG_MIN = 5, REORG_MULT = 0.94; // cambiar de sistema en pleno juego: unos minutos de desorden
  /** El desorden se acaba: hay que recalcular la fuerza del equipo. */
  function t0reorg(m, min) { return m.teams.some(t => t.reorg === min); }

  function available(p) { return p.inj <= 0 && p.sus <= 0 && !p.away; }

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
    assist: ['Gran pase de {a}.', 'Asistencia de {a}.', '{a} la puso en bandeja.', 'Jugada iniciada por {a}.'],
    assistX: ['Centro medido de {a}.', '{a} la puso en bandeja.', 'Asistencia de {a}.'],
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
    crowd_fight: ['Tangana en la grada: varios aficionados se enzarzan y los de seguridad tienen que separarlos.'],
    crowd_pyroParty: ['¡La grada lo celebra con bengalas! El humo cubre un momento la portería.'],
    crowd_invaderParty: ['¡Un aficionado salta al césped para abrazar a {p}! Los de seguridad se lo llevan entre aplausos.'],
    inj: ['{p} se duele y pide el cambio.', '{p} cae lesionado. Entran las asistencias.'],
    sub: ['Cambio: entra {p}, sale {a}.'],
    // Tipos de falta (reglamento, regla 12)
    f_trip: ['Zancadilla de {p} a {v}.', '{p} le pone la pierna a {v}, que se va al suelo.'],
    f_hold: ['Agarrón de {p}: le tira de la camiseta a {v}.', '{p} agarra a {v} para frenarlo.'],
    f_push: ['Empujón de {p} a {v} por la espalda.', '{p} empuja a {v} con las dos manos.'],
    f_late: ['Entrada a destiempo de {p}: llega tarde y se lleva a {v}.', '{p} va al suelo tarde y se lleva por delante a {v}.'],
    f_high: ['¡Plancha de {p}! Los tacos por delante a la altura de la rodilla de {v}.', 'Pie altísimo de {p} sobre {v}: juego peligroso.'],
    f_elbow: ['¡Codazo de {p} a {v} en el salto!', '{p} saca el codo y golpea a {v} en la cara.'],
    f_hand: ['Mano de {p}: corta el pase con el brazo.', '¡Mano de {p}! El brazo, separado del cuerpo.'],
    adv: ['Falta de {p} sobre {v}, pero el árbitro da ventaja.', 'El árbitro deja seguir: ley de la ventaja tras la falta de {p}.'],
    penHand: ['¡Mano de {p} dentro del área! Penalti.', '¡Penalti por mano! {p} toca el balón con el brazo en el área.'],
    varHand: ['El VAR revisa... ¡mano previa de {p}! Gol anulado.'],
    dogso: ['¡Roja directa para {p}! Era el último hombre y {v} se iba solo hacia la portería.', '¡Expulsado {p}! Derriba a {v} cuando encaraba al portero: ocasión manifiesta de gol.'],
    y_dissent: ['Amarilla a {p} por protestar.', '{p} se queja demasiado al árbitro y ve la amarilla.'],
    y_waste: ['Amarilla a {p} por perder tiempo.', '{p} se toma su tiempo para sacar... y el árbitro le saca la amarilla.'],
    y_dive: ['¡Piscinazo de {p}! Se tira sin contacto y ve la amarilla por simular.', '{p} se deja caer en el área. El árbitro no lo compra: amarilla por simulación.'],
    y_distance: ['Amarilla a {p} por no respetar la distancia en la falta.', '{p} se adelanta en la barrera y ve la amarilla.'],
    y_shirt: ['¡{p} se quita la camiseta para celebrarlo! Amarilla, como manda el reglamento.', 'La celebración le cuesta cara: {p} se quita la camiseta y ve la amarilla.'],
    y_high: ['Amarilla a {p} por la plancha.'],
    y_late: ['Amarilla a {p} por la entrada a destiempo.'],
    y_hold: ['Amarilla a {p} por el agarrón: cortaba un contraataque.'],
    y_hand: ['Amarilla a {p} por la mano: cortaba una ocasión.'],
    y_elbow: ['Amarilla a {p} por el codazo.'],
    r_high: ['¡Roja directa para {p}! La plancha pone en peligro la integridad del rival.'],
    r_elbow: ['¡Roja directa para {p} por el codazo! Conducta violenta.'],
    r_late: ['¡Roja directa para {p}! Entrada con fuerza excesiva.'],
    backpass: ['¡Cesión! {k} coge con la mano un pase de un compañero: libre indirecto dentro del área.'],
    hold6: ['{k} retiene el balón demasiado tiempo: libre indirecto.'],
    retake: ['¡El portero se había adelantado! Se repite el penalti.'],
    og: ['¡Gol en propia puerta de {p}! Mete el balón en su portería.', '¡Autogol de {p}! Desvía el balón al fondo de su red.'],
    ded_cradle: ['¡{p} celebra haciendo la cuna! El gol es para su bebé recién nacido.'],
    ded_ill: ['{p} se levanta la camiseta: debajo, un mensaje para su {w}, que sigue en el hospital. Todo el estadio aplaude.', '{p} besa el escudo y señala a la grada: este gol es para su {w}, que está en el hospital.'],
    ded_sky: ['{p} mira al cielo y señala hacia arriba: el gol es para su {w}. Emoción en el estadio.'],
    added1: ['El cuarto árbitro levanta el cartel: {n} minuto(s) de descuento en la primera parte.'],
    added2: ['Se añaden {n} minutos. ¡Última oportunidad!', 'El cartel marca +{n}. Queda el descuento.'],
    fair: ['El equipo echa el balón fuera para que atiendan a {p}. Deportividad.', 'Balón a tierra tras la atención a {p}: se le devuelve al rival.'],
    talk: ['Charla en el vestuario: {t}.'],
    formation: ['Cambio táctico: el equipo pasa a {t}.']
  };
  function say(kind, vars) {
    let t = U.pick(TXT[kind]);
    for (const k in vars) t = t.split('{' + k + '}').join(U.esc(vars[k]));
    return t;
  }

  // Faltas (regla 12): frecuencia y cuánto pesan para la amarilla y para la roja
  const FOUL_KINDS = ['trip', 'hold', 'push', 'late', 'high', 'elbow', 'hand'];
  const FOUL_P = { trip: 0.3, hold: 0.2, push: 0.14, late: 0.2, high: 0.06, elbow: 0.03, hand: 0.07 };
  const FOUL_CARD = { trip: 0.85, hold: 1.05, push: 0.6, late: 1.45, high: 2.4, elbow: 2.6, hand: 0.9 };
  const FOUL_RED = { trip: 0.2, hold: 0.15, push: 0.15, late: 0.9, high: 3, elbow: 4.5, hand: 0.1 };
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
    for (const o of onPitch) lines[F.LINE[o.slot]].push(eff(o.p, o.slot, o.en) * (o.hurt ? 0.6 : 1));
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
  /** Lo que dijiste en rueda de prensa calienta al rival: en el próximo partido contra ti sale algo más
   *  motivado (una vez; luego se olvida). */
  function prensaBoost(S, clubId, isUser) {
    let k = 1;
    // La rueda de prensa previa (partidos grandes): los tuyos salen enchufados o con dudas, y el rival, picado o no.
    // Vale para el partido que tocaba esa jornada y se gasta al usarlo.
    const pr = S.prensaPre;
    if (pr) {
      if (pr.season !== S.season || pr.week !== S.week) delete S.prensaPre;
      else {
        if (isUser && !pr.ownUsed) { k *= pr.own; pr.ownUsed = true; }
        if (!isUser && clubId === pr.club && !pr.rivUsed) { k *= pr.rival; pr.rivUsed = true; }
        if (pr.ownUsed && pr.rivUsed) delete S.prensaPre;
      }
    }
    const r = S.prensaRival;
    if (isUser || !r || r.club !== clubId) return k;
    if (S.season !== r.season) { delete S.prensaRival; return k; }
    delete S.prensaRival;
    return k * 1.025;
  }

  class Match {
    constructor(S, homeId, awayId, opts) {
      opts = opts || {};
      this.S = S;
      this.min = 0; this.extra = 0; this.addedNow = 0;
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
      // El tiempo del partido (según la zona y el mes) y sus efectos, suaves
      this.weather = TL.Weather ? TL.Weather.forMatch(S, S.clubs[homeId], homeId * 7919 + awayId * 104729) : 'despejado';
      try { this.forceBolt = /[?&]rayo=1/.test(location.search); } catch (e) { /* nada */ }
      this.wfx = TL.Weather ? TL.Weather.fx(this.weather) : { equal: 1, xg: 1, injury: 1, fatigue: 1 };
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
        this.pl[pid].en = this.P(pid).fit;
      });
      const bench = pickBench(players, ids, 9);
      return {
        club: clubId, idx, isUser, formation, onPitch, bench, mentality, baseMent: mentality,
        subs: 0, maxSubs: 5, autoSubs: isUser ? S.tactics.autoSubs : true, boost: prensaBoost(S, clubId, isUser), talk: null,
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
      const mult = t.boost * b.teamBoost * (t.bigGame ? 1 + b.bigGame : 1) * (t.day || 1) * (t.reorg && this.min < t.reorg ? REORG_MULT : 1)
        * (t.surge && this.min <= t.surge.until ? t.surge.k : 1);   // la grada empuja un rato (Tu sello: Trinchera)
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
      const st = teamStrength(t.onPitch.map(o => ({ p: this.P(o.pid), slot: o.slot, hurt: o.hurt, en: this.pl[o.pid] && this.pl[o.pid].en })), mult * tm);
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
      const diff = (a.attack - b.defense + (i === 0 ? HOME_ADV : 0)) * this.wfx.equal;
      let x = BASE_XG * Math.exp(XG_K * diff) * this.wfx.xg;
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
      const e = { min: Math.max(this.min, this.live ? 1 : 0), type, team, pid, pid2, text };
      if (this.extra) e.add = this.extra;
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
      // Descuento: al llegar al 45 y al 90 se juegan los minutos añadidos (45+1, 45+2…) antes del descanso o el final
      const stop = (this.min === 45 && !this.htDone) || this.min === 90;
      if (stop && this.extra < (this.addedNow || 0)) this.extra++;
      else {
        this.extra = 0; this.min++;
        if (this.min === 45 || this.min === 90) {
          this.addedNow = this._added(this.min === 45 ? 1 : 2);
          if (this.detail) this._ev('added', -1, null, null, say(this.min === 45 ? 'added1' : 'added2', { n: this.addedNow }), { n: this.addedNow });
        }
      }
      const m = this.min;
      const M = TL.EventsData.MATCH;
      // En vivo (partido completo en el campo) la posesión es la que se ha visto
      const poss = this.live && this.livePoss != null ? this.livePoss : this.possession();
      this.stats.possSum[0] += poss; this.stats.possSum[1] += 1 - poss;

      if (!this.extra) for (const ev of this.plan) if (ev.min === m && !(this.live && ev.type === 'phantom')) this._planned(ev);

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
        const possI = i === 0 ? poss : 1 - poss;
        // En vivo, tiros, faltas y fueras de juego nacen en el campo (liveShot, liveFoul, liveOffside…)
        if (!this.live) {
        const xg = this.xg(i);
        this.stats.xg[i] += xg / 90;
        if (Math.random() < Math.min(0.6, xg / 90 / 0.105)) this._shot(i);
        // Faltas: las comete sobre todo el equipo sin balón
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
        }
        if (this.detail && t.desperate && !t.lateCall) {
          t.lateCall = true;
          this._ev('late', i, null, null, say('late', { t: this.S.clubs[t.club].name }));
        }
        this._conduct(i, m, diff);
        this._tire(i, possI);
        if (Math.random() < 0.22 / 90 * this.bonus[i].injury * this.wfx.injury * this._tiredRisk(i)) this._injury(i);
        // Rayo: rarísimo, solo con temporal (?rayo=1 lo fuerza en las pruebas)
        if (this.weather === 'temporal' && !this.bolt && (Math.random() < 1 / 4000 / 180 || (this.forceBolt && m === 20 && i === 1))) this._lightning(i);
        if (this._autoFor(i) && m >= 58 && m <= 85 && t.subs < 4 && Math.random() < 0.09) this._fatigueSub(i);
      }
      if (m % 5 === 0) this._str = null; // el cansancio va pesando
      if (t0reorg(this, m)) this._str = null;
      if (m === 45 && !this.htDone && this.extra >= (this.addedNow || 0)) {
        this.htDone = true;
        this._halfTime();
        if (this.detail) this._ev('ht', -1, null, null, `Descanso. ${this.score[0]}-${this.score[1]}.`);
      }
      if (m >= 90 && this.extra >= (this.addedNow || 0)) this._end();
      if (this.detail) this._crowdReact();
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
          if (assister) txt += ' ' + say(sx && (sx.origin === 'cross' || sx.origin === 'corner' || sx.shotType === 'header') ? 'assistX' : 'assist', { a: assister.short });
        }
      }
      this._ev('goal', i, shooter.id, assister && assister.id, txt, Object.assign({ kind, late: this.min >= 88 }, sx || {}));
      // Celebración dedicada: solo si el jugador lleva algo dentro (un hijo recién nacido, un familiar enfermo,
      // un luto) y le toca: se lo dedica. Quitarse la camiseta para enseñar el mensaje cuesta la amarilla (regla 12).
      const ded = this.S.dedic && this.S.dedic[shooter.id];
      if (ded && kind !== 'og' && Math.random() < 0.45) {
        delete this.S.dedic[shooter.id];
        const who = ded.who || '';
        if (this.detail) this._ev('dedic', i, shooter.id, null, say('ded_' + ded.k, { p: shooter.short, w: who }), { kind: ded.k });
        if (ded.k === 'ill' && Math.random() < 0.7) this._yellow(i, shooter, null, 'shirt');
      }
    }

    /** Gol en propia puerta: cuenta para el equipo i; lo mete un rival (no suma como gol suyo). */
    _ownGoal(i, def, sx) {
      this.score[i]++;
      this.stats.onT[i]++;
      if (this.pl[def.id]) this.pl[def.id].og = (this.pl[def.id].og || 0) + 1;
      this._ev('goal', i, def.id, null, this.detail ? say('og', { p: def.short }) : '', Object.assign({ kind: 'og', og: true, late: this.min >= 88 }, sx || {}));
    }

    _soulShot(i, shooter, gk, minute = this.min) {
      const events = TL.Events;
      if (!events?.fantasy(this.S)) return 1;
      const margin = this.score[i] - this.score[1 - i];
      const attack = events.soulShotFactor(this.S, shooter.id, 'conv', minute, margin);
      return attack * (gk ? events.soulShotFactor(this.S, gk.id, 'save', minute, -margin) : 1);
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
      let pGoal = U.clamp(0.105 * Math.pow(sho / 70, 0.9) * Math.pow(72 / Math.max(30, gkv), 0.8) * (tfx(shooter.id).conv || 1) * (gk ? tfx(gk.id).save || 1 : 1) * this._soulShot(i, shooter, gk), 0.03, 0.42);
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
      // Modo fantasía: a veces el rematador saca su supertiro (más acierto y una escena a lo grande)
      const sp0 = TL.Special && TL.Special.of(this.S, shooter), sp = sp0 && Math.random() < U.clamp(0.05 + (shooter.st[1] - 74) * 0.006, 0.04, 0.12) ? sp0 : null;
      if (sp) pGoal = Math.min(0.62, pGoal * 1.6);
      const u = Math.random(), goal = u < pGoal;
      const shotType = this._shotType(origin, goal, line);
      const sx = { origin, shotType };
      const re = { u, u2: Math.random(), u3: Math.random(), sp: !!sp, talk: Math.random() < 0.4 };
      if (sp) sx.special = sp.id;
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
          const hand = Math.random() < 0.3;
          if (hand) this.stats.offsides[i]--;
          if (this.detail) { this._ev('var', i, shooter.id, null, say('var', {})); }
          this._ev('disallowed', i, shooter.id, null, this.detail ? say(hand ? 'varHand' : 'varOff', { p: shooter.short }) : '', Object.assign({ hand }, sx));
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
        // Gol en propia puerta: el balón lo mete en su portería un defensa rival
        if (Math.random() < 0.045) {
          const defs = this.teams[1 - i].onPitch.filter(x => x.slot !== 'GK');
          if (defs.length) { this._ownGoal(i, this.P(U.weighted(defs, x => (F.LINE[x.slot] === 1 ? 4 : F.LINE[x.slot] === 2 ? 1.5 : 0.5)).pid), sx); return; }
        }
        this._scoreGoal(i, shooter, assister, 'open', sx);
        this.events[this.events.length - 1].re = re;
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
            this._ev('save', i, shooter.id, gk.id, talk || origin === 'counter' ? say(k, { p: shooter.short, k: gk.short }) : '', Object.assign({ big: origin === 'counter' || shotType === 'tapin', re }, sx));
          } else {
            const r2 = Math.random();
            const miss = r2 < 0.1 ? 'post' : r2 < 0.28 && shotType !== 'header' ? 'blocked' : shotType === 'header' ? 'header' : shotType === 'long' ? 'long' : 'wide';
            const k = miss === 'post' ? 'm_post' : miss === 'blocked' ? 'm_blocked' : miss === 'header' ? 'm_header' : miss === 'long' ? 'm_long' : 'miss';
            this._ev('miss', i, shooter.id, null, talk || miss === 'post' ? say(k, { p: shooter.short }) : '', Object.assign({ miss, re }, sx));
          }
        }
      }
    }

    /**
     * Motor bidireccional: el campo 2D ha jugado la ocasión con naturalidad y dice quién remata de verdad, quién
     * dio el pase y en qué situación (distancia, rivales encima). El motor vuelve a resolver la ocasión con esos
     * datos y la misma tirada de dados (así la estadística global no cambia) y corrige el suceso antes de contarlo.
     * ctx: { d: metros a la portería, press: rivales a menos de 3 m, angle: 0-1 (1 = de frente) }
     */
    recast(e, sPid, aPid, ctx) {
      if (!e || !e.re || e._recast || !['goal', 'save', 'miss'].includes(e.type)) return false;
      const i = e.team, t = this.teams[i];
      const shooter = this.P(sPid);
      if (!shooter || !t.onPitch.some(o => o.pid === sPid) || !this.pl[sPid]) return false;
      const ass = aPid != null && aPid !== sPid && t.onPitch.some(o => o.pid === aPid) ? this.P(aPid) : null;
      e._recast = true;
      // Deshacer lo que el motor había apuntado
      if (e.type === 'goal') { this.score[i]--; this.stats.onT[i]--; this.pl[e.pid].g--; if (e.pid2 != null && this.pl[e.pid2]) this.pl[e.pid2].a--; }
      if (e.type === 'save') { this.stats.onT[i]--; if (e.pid2 != null && this.pl[e.pid2]) this.pl[e.pid2].sv--; }
      // Probabilidad con quien remata de verdad y la situación real
      const gk = this._gk(1 - i), gkv = gk ? eff(gk, 'GK') : 30;
      const tfx = pid => (TL.Locker && this.S.lk ? TL.Locker.fx(this.S, pid) : null) || {};
      const sho = shooter.pos === 'GK' ? 30 : shooter.st[1];
      let p = U.clamp(0.105 * Math.pow(sho / 70, 0.9) * Math.pow(72 / Math.max(30, gkv), 0.8) * (tfx(shooter.id).conv || 1) * (gk ? tfx(gk.id).save || 1 : 1) * this._soulShot(i, shooter, gk, e.min ?? this.min), 0.03, 0.42);
      if (e.re.sp) p = Math.min(0.62, p * 1.6);
      const c = ctx || {};
      const q = U.clamp((c.d != null ? 1.45 - c.d / 30 : 1) * (1 - Math.min(2, c.press || 0) * 0.12) * (c.angle != null ? 0.8 + c.angle * 0.3 : 1), 0.6, 1.4);
      p = U.clamp(p * q, 0.02, 0.7);
      const goal = e.re.u < p;
      e.pid = shooter.id; e.pid2 = null;
      if (e.special) { const s2 = TL.Special && TL.Special.of(this.S, shooter); if (s2) e.special = s2.id; else delete e.special; }
      const sx = e;
      if (goal) {
        e.type = 'goal'; e.kind = 'open';
        this.score[i]++; this.stats.onT[i]++; this.pl[shooter.id].g++;
        if (ass) { this.pl[ass.id].a++; e.pid2 = ass.id; }
        if (this.detail) {
          const k = TXT['g_' + sx.shotType] ? 'g_' + sx.shotType : 'goal';
          e.text = say(k, { p: shooter.short });
          if (ass) e.text += ' ' + say(sx.origin === 'cross' || sx.origin === 'corner' || sx.shotType === 'header' ? 'assistX' : 'assist', { a: ass.short });
        }
        e.late = this.min >= 88;
      } else if (e.re.u2 < 0.42 && gk) {
        e.type = 'save'; e.pid2 = gk.id; this.stats.onT[i]++; this.pl[gk.id].sv++;
        const k = sx.shotType === 'header' ? 's_header' : sx.shotType === 'long' ? 's_long' : sx.origin === 'counter' ? 's_1v1' : 'save';
        e.text = this.detail && (e.re.talk || sx.origin === 'counter') ? say(k, { p: shooter.short, k: gk.short }) : '';
      } else {
        e.type = 'miss';
        const r2 = e.re.u3, miss = r2 < 0.1 ? 'post' : r2 < 0.28 && sx.shotType !== 'header' ? 'blocked' : sx.shotType === 'header' ? 'header' : sx.shotType === 'long' ? 'long' : 'wide';
        e.miss = miss;
        const k = miss === 'post' ? 'm_post' : miss === 'blocked' ? 'm_blocked' : miss === 'header' ? 'm_header' : miss === 'long' ? 'm_long' : 'miss';
        e.text = this.detail && (e.re.talk || miss === 'post') ? say(k, { p: shooter.short }) : '';
      }
      return true;
    }

    /** Minutos de descuento de una parte: cambios, goles, lesiones, VAR y tarjetas paran el reloj. */
    _added(half) {
      const from = half === 1 ? 0 : 46, to = half === 1 ? 45 : 90;
      const ev = this.events.filter(e => e.min >= from && e.min <= to);
      const n = k => ev.filter(e => e.type === k).length;
      const raw = (half === 1 ? 0.6 : 1.6) + n('sub') * 0.35 + n('goal') * 0.45 + n('inj') * 1 + n('var') * 0.9 + (n('yellow') + n('red')) * 0.2 + (n('pen') + n('penmiss')) * 0.4 + Math.random();
      return U.clamp(Math.round(raw), half === 1 ? 0 : 1, half === 1 ? 5 : 9);
    }

    /**
     * Conducta (regla 12): protestas, perder tiempo, simulación; y los porteros (cesión cogida con la mano,
     * retener el balón demasiado). Probabilidades por partido y equipo, repartidas por minuto.
     */
    _conduct(i, m, diff) {
      const t = this.teams[i], strict = this.ref.strict * this.bonus[i].cards;
      const field = t.onPitch.filter(o => o.slot !== 'GK');
      if (!field.length) return;
      const pick = w => this.P(U.weighted(field, w).pid);
      if (Math.random() < 0.2 / 90 * strict * (diff < 0 ? 1.4 : 1)) this._yellow(i, pick(o => (this.P(o.pid).mor != null && this.P(o.pid).mor < 45 ? 2 : 1)), null, 'dissent');
      if (diff > 0 && m >= 70 && Math.random() < 0.9 / 20 * 0.35 * strict) {
        const gk = this._gk(i);
        this._yellow(i, gk && Math.random() < 0.5 ? gk : pick(() => 1), null, 'waste');
      }
      if (!this.live && Math.random() < 0.06 / 90 * strict) {
        const ot = this.teams[1 - i].onPitch.filter(o => F.LINE[o.slot] === 1);
        const diver = pick(o => (F.LINE[o.slot] === 3 ? 4 : F.LINE[o.slot] === 2 ? 1.5 : 0.2));
        this._yellow(i, diver, ot.length ? this.P(U.pick(ot).pid) : null, 'dive');
      }
      // Porteros (el libre indirecto es para el rival)
      const gk = this._gk(i);
      if (gk && this.detail && !this.live) {
        const r = Math.random();
        if (r < 0.035 / 90) this._ev('ifk', 1 - i, gk.id, null, say('backpass', { k: gk.short }), { kind: 'backpass' });
        else if (r < 0.05 / 90) this._ev('ifk', 1 - i, gk.id, null, say('hold6', { k: gk.short }), { kind: 'hold6' });
      }
    }

    /** Falta sin tarjeta escenificada: la comete el rival que de verdad estaba encima de la víctima (bidireccional). */
    recastFoul(e, pid) {
      if (!e || e.type !== 'foul' || e.pid === pid || !this.pl[pid] || !this.teams[e.team].onPitch.some(o => o.pid === pid)) return false;
      if (this.pl[e.pid]) this.pl[e.pid].f--;
      this.pl[pid].f++;
      const old = this.P(e.pid), now = this.P(pid);
      if (e.text && old && now) e.text = e.text.split(old.short).join(now.short);
      e.pid = pid;
      return true;
    }

    /** Autogol escenificado: lo mete el defensa que de verdad estaba en la trayectoria (bidireccional). */
    recastOG(e, defPid) {
      if (!e || !e.og || e.pid === defPid) return false;
      const t = this.teams[1 - e.team];
      if (!t.onPitch.some(o => o.pid === defPid) || !this.pl[defPid]) return false;
      if (this.pl[e.pid] && this.pl[e.pid].og) this.pl[e.pid].og--;
      this.pl[defPid].og = (this.pl[defPid].og || 0) + 1;
      e.pid = defPid;
      if (this.detail) e.text = say('og', { p: this.P(defPid).short });
      return true;
    }

    // ================================================================ Motor en vivo
    // El partido completo se juega en el campo: el cerebro táctico decide quién pasa, regatea, entra o dispara,
    // y en ese instante el motor resuelve lo que pasa con los atributos y la situación real. Aquí se apunta
    // (marcador, estadísticas, narración, tarjetas). La simulación por minutos solo se usa cuando el partido
    // no se ve (resto de la jornada, resultado rápido, saltos).

    /**
     * Un remate en el campo. ctx: { xg (situación: distancia, ángulo, presión, bloqueos, portero),
     * d, type, origin, blockP, ogPid (defensa en la trayectoria), offMiss (fuera de juego no señalado), kind: 'fk' }.
     */
    liveShot(i, sPid, aPid, ctx) {
      if (this.min === 45 && this.htDone && !this.h2) return null;
      if (this.done || !this.pl[sPid]) return null;
      const t = this.teams[i];
      if (!t.onPitch.some(o => o.pid === sPid)) return null;
      const shooter = this.P(sPid), L = TL.LIVE || {};
      const tfx = pid => (TL.Locker && this.S.lk ? TL.Locker.fx(this.S, pid) : null) || {};
      const gk = this._gk(1 - i), gkv = gk ? eff(gk, 'GK') : 30;
      const sho = shooter.pos === 'GK' ? 30 : shooter.st[1];
      const head = ctx.type === 'header';
      const skill = head ? (shooter.st[1] * 0.5 + shooter.st[5] * 0.5) : sho;
      const sp0 = TL.Special && !head && ctx.kind !== 'fk' && TL.Special.of(this.S, shooter);
      const sp = sp0 && Math.random() < U.clamp(0.05 + (shooter.st[1] - 74) * 0.006, 0.04, 0.12) ? sp0 : null;
      let p = ctx.xg * (L.CONV || 1.9) * Math.pow(skill / 70, 0.9) * Math.pow(72 / Math.max(30, gkv), 0.8) * (tfx(sPid).conv || 1) * (gk ? tfx(gk.id).save || 1 : 1) * this._soulShot(i, shooter, gk);
      if (sp) p *= 1.6;
      p = U.clamp(p, 0.01, sp ? 0.8 : 0.9);
      this.stats.shots[i]++;
      // xG del partido condensado: lo que vale la ocasión en este partido (cuadra con los goles que salen)
      const xgm = Math.min(0.95, ctx.xg * (L.CONV || 1.9));
      this.stats.xg[i] += xgm;
      const sx = { origin: ctx.origin || 'open', shotType: ctx.type || 'placed', live: true, xgv: +xgm.toFixed(2) };
      if (sp) sx.special = sp.id;
      const ass = aPid != null && aPid !== sPid && t.onPitch.some(o => o.pid === aPid) ? this.P(aPid) : null;
      if (Math.random() < p) {
        // Fuera de juego que el linier no vio: el VAR lo anula (si hay VAR)
        if (ctx.offMiss && this.ref.var) {
          const ve = this.detail ? this._ev('var', i, sPid, null, say('var', {})) : null;
          const d = this._ev('disallowed', i, sPid, null, this.detail ? say('varOff', { p: shooter.short }) : '', Object.assign({ viaVar: true, varEv: ve }, sx));
          return d;
        }
        // Desvío en un defensa que estaba en la trayectoria: a veces acaba siendo gol en propia puerta
        if (ctx.ogPid != null && this.pl[ctx.ogPid] && Math.random() < 0.18) {
          this._ownGoal(i, this.P(ctx.ogPid), sx);
          const e = this.events[this.events.length - 1];
          e.ogDef = true;
          return e;
        }
        const n0 = this.events.length;
        this._scoreGoal(i, shooter, ass, ctx.kind === 'fk' ? 'fk' : 'open', sx);
        return this.events[n0];
      }
      if (Math.random() < (ctx.blockP || 0)) {
        return this._ev('miss', i, sPid, null, this.detail && Math.random() < 0.5 ? say('m_blocked', { p: shooter.short }) : '', Object.assign({ miss: 'blocked' }, sx));
      }
      const onT = U.clamp(0.3 + (skill - 65) / 160 + (ctx.d != null ? (14 - ctx.d) / 60 : 0) - (head ? 0.06 : 0), 0.15, 0.7);
      if (gk && Math.random() < onT) {
        this.stats.onT[i]++;
        this.pl[gk.id].sv++;
        const big = ctx.xg > 0.28 || ctx.origin === 'counter';
        const k = head ? 's_header' : ctx.type === 'long' ? 's_long' : ctx.origin === 'counter' ? 's_1v1' : 'save';
        return this._ev('save', i, sPid, gk.id, this.detail && (big || Math.random() < 0.45) ? say(k, { p: shooter.short, k: gk.short }) : '', Object.assign({ big }, sx));
      }
      const r2 = Math.random();
      const miss = r2 < 0.09 ? 'post' : head ? 'header' : ctx.type === 'long' ? 'long' : 'wide';
      const k = miss === 'post' ? 'm_post' : miss === 'header' ? 'm_header' : miss === 'long' ? 'm_long' : 'miss';
      return this._ev('miss', i, sPid, null, this.detail && (miss === 'post' || Math.random() < 0.4) ? say(k, { p: shooter.short }) : '', Object.assign({ miss }, sx));
    }

    /**
     * Una falta en el campo (la ha cometido de verdad fid sobre vid). ctx: { kind, inBox, dogso, adv }.
     * Devuelve { evs, pen, card, missed }: los sucesos (falta o tarjeta, penalti y su lanzamiento, VAR).
     */
    liveFoul(i, fid, vid, ctx) {
      if (this.min === 45 && this.htDone && !this.h2) return null;
      if (this.done || !this.pl[fid] || !this.pl[vid]) return null;
      const M = TL.EventsData.MATCH, L = TL.LIVE || {}, opp = 1 - i;
      const fouler = this.P(fid), victim = this.P(vid);
      const start = this.events.length;
      this.stats.fouls[i]++;
      this.pl[fid].f++;
      const lfx = pid => (TL.Locker && this.S.lk ? TL.Locker.fx(this.S, pid) : null) || {};
      // Reclamaste con razón hace poco: en la siguiente, el árbitro es algo más blando con los tuyos
      let owed = 1;
      if (this.owed && this.owed.team === i) { if (this.min <= this.owed.until) owed = 0.72; this.owed = null; }
      const strict = this.ref.strict * this.bonus[i].cards * (lfx(fid).card || 1) * owed;
      const late = this.min > 75 ? 1.2 : 1;
      const kind = ctx.kind || 'trip', kfx = FOUL_CARD[kind] || 1;
      let pen = false, missed = false, card = null;
      if (ctx.inBox) {
        const hand = kind === 'hand';
        const ptxt = hand ? say('penHand', { p: fouler.short }) : say('pen', { p: fouler.short, v: victim.short });
        if (Math.random() < this.ref.err * 0.6) {
          // El árbitro no lo ve; el VAR corrige la mayoría
          if (this.ref.var && Math.random() < 0.65) {
            if (this.detail) this._ev('var', opp, null, null, say('var', {}));
            this._ev('pen', opp, vid, fid, this.detail ? say('varPen', {}) : '', { kind, live: true });
            pen = true;
          } else {
            this._ev('refmiss', opp, vid, null, this.detail ? say('refMiss', { v: victim.short }) : '', { controversy: true });
            this.incidents.push({ type: 'penaltyDenied', team: opp, pid: vid, min: this.min });
            missed = true;
          }
        } else { this._ev('pen', opp, vid, fid, this.detail ? ptxt : '', { kind, live: true }); pen = true; }
        if (pen) this._penalty(opp, victim, fouler);
      }
      if (!missed) {
        const cr = Math.random(), booked = this.pl[fid].y ? 0.5 : 1, CK = L.CARD || 1;
        const n0 = this.events.length;
        if (ctx.dogso && !pen) { this._red(i, fouler, true, 'dogso', victim); card = 'red'; }
        else if (cr < M.redPerFoul * strict * (FOUL_RED[kind] || 1) * 0.8) { this._red(i, fouler, true, null, victim, kind); card = 'red'; }
        else if (cr < (M.redPerFoul * (FOUL_RED[kind] || 1) + M.yellowPerFoul * late * booked * kfx) * strict * CK || (ctx.dogso && pen)) { this._yellow(i, fouler, victim, kind); card = this.pl[fid].r ? 'red' : 'yellow'; }
        for (let k = n0; k < this.events.length; k++) { const e = this.events[k]; if (e.type === 'yellow' || e.type === 'red') { e.live = true; if (pen) e.afterPen = true; } }
        if (!pen && !card && this.detail) {
          const txt = ctx.adv ? say('adv', { p: fouler.short, v: victim.short }) : Math.random() < 0.3 ? say('f_' + kind, { p: fouler.short, v: victim.short }) : '';
          this._ev('foul', i, fid, vid, txt, { hard: kind === 'late' || kind === 'high' || kind === 'elbow', kind, adv: !!ctx.adv, live: true });
        }
        if (Math.random() < M.heatedPerFoul * (card ? 3 : 1)) this._heated();
      }
      return { evs: this.events.slice(start), pen, card, missed };
    }

    /**
     * Piscinazo en el área (lo ha hecho de verdad pid, del equipo i, junto a did). El árbitro casi siempre lo ve
     * y la amonesta; a veces se lo traga y pita penalti (y el VAR puede corregirlo).
     */
    liveDive(i, pid, did) {
      if (this.min === 45 && this.htDone && !this.h2) return null;
      if (this.done || !this.pl[pid]) return null;
      const diver = this.P(pid), def = did != null ? this.P(did) : null, start = this.events.length;
      let pen = false, overturned = false;
      if (Math.random() < 0.22 + this.ref.err * 0.6) {
        this._ev('pen', i, pid, did, this.detail ? say('phantom', { v: diver.short }) : '', { controversy: true, kind: 'dive', live: true });
        if (this.ref.var && Math.random() < 0.6) {
          if (this.detail) { this._ev('var', i, null, null, say('var', {})); this._ev('var', i, null, null, say('phantomOff', {})); }
          overturned = true;
        } else { this.incidents.push({ type: 'phantomPenalty', team: 1 - i, pid, min: this.min }); this._penalty(i, diver, def); pen = true; }
      } else this._yellow(i, diver, def, 'dive');
      const evs = this.events.slice(start);
      for (const e of evs) e.live = true;
      return { evs, pen, overturned };
    }

    /** Fuera de juego señalado en el campo. */
    liveOffside(i, pid) {
      if (this.done) return null;
      this.stats.offsides[i]++;
      const p = this.P(pid);
      return this._ev('offside', i, pid, null, this.detail && p && Math.random() < 0.4 ? say('offside', { p: p.short }) : '', { live: true });
    }

    /** Córner que se ha visto en el campo. */
    liveCorner(i) {
      if (this.done) return null;
      this.stats.corners[i]++;
      return this._ev('corner', i, null, null, this.detail && Math.random() < 0.35 ? say('corner', { t: this.S.clubs[this.teams[i].club].name }) : '', { live: true });
    }

    /** Falta cometida por el equipo i. */
    _foul(i) {
      const M = TL.EventsData.MATCH;
      const t = this.teams[i], opp = 1 - i;
      const ot = this.teams[opp];
      if (!t.onPitch.length || !ot.onPitch.length) return;
      // Un jugador amonestado se contiene: comete menos faltas
      const lfx = pid => (TL.Locker && this.S.lk ? TL.Locker.fx(this.S, pid) : null) || {};
      const fo = U.weighted(t.onPitch, o => FOUL_W[o.slot] * (0.7 + this.P(o.pid).st[4] / 160) * (this.pl[o.pid] && this.pl[o.pid].y ? 0.45 : 1) * (lfx(o.pid).foul || 1));
      const vo = U.weighted(ot.onPitch, o => FOULED_W[o.slot] * Math.pow(Math.max(30, this.P(o.pid).st[3]) / 70, 2) * (((TL.Locker && this.S.lk && TL.Locker.fx(this.S, o.pid)) || {}).fouled || 1));
      const fouler = this.P(fo.pid), victim = this.P(vo.pid);
      this.stats.fouls[i]++;
      this.pl[fouler.id].f++;
      const strict = this.ref.strict * this.bonus[i].cards * (lfx(fouler.id).card || 1);
      const late = this.min > 75 ? 1.2 : 1;
      // Tipo de falta (regla 12) y lo que pesa para la tarjeta
      const kind = U.weighted(FOUL_KINDS, k => FOUL_P[k]), kfx = FOUL_CARD[kind];
      const r = Math.random();
      let shown = false;
      if (r < M.penaltyPerFoul) {
        const hand = Math.random() < 0.25;
        const ptxt = hand ? say('penHand', { p: fouler.short }) : say('pen', { p: fouler.short, v: victim.short });
        // Penalti: puede que el árbitro no lo vea; el VAR corrige la mayoría
        if (Math.random() < this.ref.err) {
          if (this.ref.var && Math.random() < 0.65) {
            if (this.detail) { this._ev('var', opp, null, null, say('var', {})); this._ev('pen', opp, victim.id, fouler.id, say('varPen', {}), { kind: hand ? 'hand' : kind }); }
            this._penalty(opp, victim, fouler);
          } else {
            this._ev('refmiss', opp, victim.id, null, this.detail ? say('refMiss', { v: victim.short }) : '', { controversy: true });
            this.incidents.push({ type: 'penaltyDenied', team: opp, pid: victim.id, min: this.min });
          }
        } else {
          this._ev('pen', opp, victim.id, fouler.id, this.detail ? ptxt : '', { kind: hand ? 'hand' : kind });
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
      // Ocasión manifiesta de gol: el último defensor derriba al delantero que se iba solo (fuera del área: roja)
      const dogso = !shown && F.LINE[fo.slot] === 1 && F.LINE[vo.slot] === 3 && Math.random() < 0.012;
      if (dogso) this._red(i, fouler, true, 'dogso', victim);
      else if (cr < M.redPerFoul * strict * FOUL_RED[kind]) this._red(i, fouler, true, null, victim, kind);
      else if (cr < (M.redPerFoul * FOUL_RED[kind] + M.yellowPerFoul * late * booked * kfx) * strict) this._yellow(i, fouler, victim, kind);
      else if (this.detail && !shown) {
        // A veces el árbitro deja seguir (ventaja) si el equipo que la recibe conserva el balón
        const adv = kind !== 'hand' && Math.random() < 0.12;
        const txt = adv ? say('adv', { p: fouler.short, v: victim.short }) : Math.random() < 0.22 ? say('f_' + kind, { p: fouler.short, v: victim.short }) : '';
        this._ev('foul', i, fouler.id, victim.id, txt, { hard: kind === 'late' || kind === 'high' || Math.random() < 0.2, kind, adv });
      }
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
      // El portero se adelanta antes del disparo: se repite (lo que cuenta es el segundo)
      const retake = Math.random() < 0.05;
      if (retake && this.detail) this._ev('retake', i, taker.id, gk && gk.id, say('retake', {}));
      const rx = retake ? { retake: true } : null;
      if (Math.random() < p) this._scoreGoal(i, taker, null, 'pen', rx);
      else {
        this.pl[taker.id].pm++;
        if (gk && Math.random() < 0.7) { this.pl[gk.id].ps++; this.stats.onT[i]++; }
        this._ev('penmiss', i, taker.id, gk && gk.id, this.detail ? say('penMiss', { p: taker.short, k: gk ? gk.short : 'el portero' }) : '', rx);
      }
    }

    _freeKick(i) {
      const M = TL.EventsData.MATCH;
      const taker = this._best(i, p => (p.pos === 'GK' ? 0 : p.st[1] + p.st[2]));
      if (!taker) return;
      this.stats.shots[i]++;
      const p = M.fkGoal * Math.pow((taker.st[1] + taker.st[2]) / 160, 2);
      // Alguien de la barrera no respeta los 9,15 m
      if (Math.random() < 0.05) { const ot = this.teams[1 - i].onPitch.filter(o => o.slot !== 'GK'); if (ot.length) this._yellow(1 - i, this.P(U.pick(ot).pid), null, 'distance'); }
      if (Math.random() < p) {
        if (this.detail) this._ev('fk', i, null, null, say('fk', { t: this.S.clubs[this.teams[i].club].name }));
        this._scoreGoal(i, taker, null, 'fk');
      } else if (this.detail && Math.random() < 0.35) {
        this._ev('fk', i, taker.id, null, say('fkMiss', { p: taker.short }));
      }
    }

    _yellow(i, p, v, why) {
      const rec = this.pl[p.id];
      if (!rec || rec.off != null) return;
      if (rec.y >= 1) { rec.y++; this._red(i, p, false, null, v, why); return; }
      rec.y++;
      this.stats.yel[i]++;
      const k = why && TXT['y_' + why] ? 'y_' + why : 'yellow';
      this._ev('yellow', i, p.id, v ? v.id : null, this.detail ? say(k, { p: p.short }) : '', why ? { kind: why } : null);
    }

    _red(i, p, straight, kind, v, why) {
      const rec = this.pl[p.id];
      if (!rec || rec.off != null) return;
      rec.r = kind === 'refAssault' ? 12 : kind === 'confront' ? 4 : kind === 'fight' ? 3 : kind === 'dogso' ? 1 : straight ? U.pick([1, 1, 2]) : 1;
      rec.rKind = kind || (straight ? 'straight' : 'second');
      this.stats.red[i]++;
      const txt = kind ? say(kind, { p: p.short, v: v ? v.short : '' }) : straight && why && TXT['r_' + why] ? say('r_' + why, { p: p.short }) : say(straight ? 'red' : 'red2', { p: p.short });
      this._ev('red', i, p.id, v ? v.id : null, txt, { kind: kind || why || null, second: !straight });
      const t = this.teams[i];
      const was = t.onPitch.find(o => o.pid === p.id);
      this._remove(i, p.id);
      // El entrenador tapa el hueco: portero suplente o un defensa por un delantero
      if (was && this._autoFor(i)) this._cover(i, was);
    }

    /** ¿Hace los cambios el asistente? Los rivales, siempre; los tuyos, solo con «cambios automáticos» y si no estás
     *  mirando el partido (resultado rápido, saltar al final…): mientras lo ves, cambias tú y nadie gasta tus paradas. */
    _autoFor(i) {
      const t = this.teams[i];
      // Si te han mandado a la grada por protestar, los cambios los hace tu ayudante
      return !t.isUser || !!this.coachOff || (!!t.autoSubs && (!this.detail || !!this.userAway));
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

    /**
     * La grada reacciona a lo que pasa (solo en el partido que se ve): una decisión polémica en contra, una
     * expulsión, un gol anulado, un penalti en contra o un gol en contra al final la encienden (insultos,
     * objetos, bengalas, peleas); un gol propio, a veces, se celebra con bengalas o con un espontáneo.
     * Como mucho dos incidentes por partido y separados.
     */
    _crowdReact() {
      const from = this._crowdIdx || 0;
      this._crowdIdx = this.events.length;
      // Son guiños, no el centro del partido: como mucho uno por partido y con probabilidades bajas
      if (this.done || this.crowdN >= 1) return;
      const fem = this.S.gender === 'F' ? 0.35 : 1;
      const heat = [0, 0];
      let party = null;
      for (let k = from; k < this.events.length; k++) {
        const e = this.events[k], i = e.team;
        if (i == null || i < 0) continue;
        const late = this.min >= 75;
        switch (e.type) {
          case 'refmiss': heat[i] += 1; break;                           // les han negado un penalti
          case 'red': heat[i] += 0.7; break;                             // expulsado uno de los suyos
          case 'disallowed': heat[i] += 0.8; break;                      // les anulan un gol
          case 'pen': heat[1 - i] += 0.5; break;                         // penalti en contra
          case 'goal': {
            const [g0, g1] = this.score, mine = i === 0 ? g0 : g1, opp = i === 0 ? g1 : g0;
            if (late && mine >= opp) heat[1 - i] += 0.6;                 // empate o remontada en contra al final
            if (mine - opp >= 3) heat[1 - i] += 0.4;                     // goleada en contra
            if (!e.og) party = { team: i, pid: e.pid };
            break;
          }
        }
      }
      // La afición local es casi todo el estadio; la visitante, un rincón
      for (const i of [0, 1]) {
        const p = heat[i] * 0.011 * (i === 0 ? 1 : 0.6) * fem;
        if (!(p > 0) || Math.random() >= p) continue;
        const r = Math.random(), hot = heat[i] >= 1;
        const type = hot ? (r < 0.3 ? 'objects' : r < 0.55 ? 'fight' : r < 0.75 ? 'insults' : 'pyro') : (r < 0.55 ? 'insults' : r < 0.75 ? 'pyro' : r < 0.9 ? 'objects' : 'fight');
        this._crowdIncident(i, type, false);
        return;
      }
      if (party) {
        const pr = Math.random(), base = (party.team === 0 ? 1 : 0.6) * fem;
        if (pr < 0.005 * base) this._crowdIncident(party.team, 'pyro', true);
        else if (pr < 0.0065 * base) this._crowdIncident(party.team, 'invader', true, party.pid);
      }
    }
    _crowdIncident(i, type, party, pid) {
      this.crowdN = (this.crowdN || 0) + 1; this.crowdLast = this.min;
      const key = 'crowd_' + type, club = this.S.clubs[this.teams[i].club], rival = this.S.clubs[this.teams[1 - i].club];
      this.incidents.push({ type: key, team: i, min: this.min });
      const tk = party && type === 'pyro' ? 'crowd_pyroParty' : party && type === 'invader' ? 'crowd_invaderParty' : key;
      const txt = say(tk, { t: rival.name, p: pid != null ? this.P(pid).short : '' });
      this._ev('crowd', i, pid != null ? pid : null, null, `${txt} (afición de ${U.esc(club.name)})`, { kind: key, party: !!party });
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
        if (TXT[ev.type] && this.crowdN >= 1) return;   // ya hubo uno en este partido: con uno basta
        this.incidents.push({ type: ev.type, team: i, min: this.min });
        if (!TXT[ev.type]) return; // p. ej. pelea de ultras fuera del estadio: solo noticia
        this.crowdN = (this.crowdN || 0) + 1; this.crowdLast = this.min;
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

    /** Un equipo fundido se lesiona más: ×1 descansado, ×2 hacia el 50 % de energía. */
    _tiredRisk(i) {
      const on = this.teams[i].onPitch;
      if (!on.length) return 1;
      let s = 0;
      for (const o of on) s += this.energy(o.pid);
      return 1 + Math.max(0, 72 - s / on.length) / 22;
    }

    /** Un rayo alcanza a un jugador. Muere: sale del partido y del fútbol. */
    _lightning(i) {
      const t = this.teams[i];
      if (!t.onPitch.length) return;
      const o = U.pick(t.onPitch), p = this.P(o.pid), rec = this.pl[p.id];
      if (!rec) return;
      this.bolt = { team: i, pid: p.id, min: this.min };
      rec.inj = 999; rec.dead = true;
      this._ev('inj', i, p.id, null, `¡Un rayo cae sobre el campo y alcanza a ${p.short}! Las asistencias entran corriendo… El partido se detiene. Silencio absoluto en el estadio.`, { bolt: true });
      if (t.subs < t.maxSubs && this._autoFor(i)) { if (!this._bestSub(i, o)) o.hurt = true; } else o.hurt = true;
      this._str = null;
    }

    _injury(i) {
      const t = this.teams[i];
      if (!t.onPitch.length) return;
      const o = U.weighted(t.onPitch, o => 125 - this.energy(o.pid));
      const p = this.P(o.pid);
      const rec = this.pl[p.id];
      if (!rec || rec.inj) return;
      const weeks = U.weighted([1, 2, 3, 4, 6, 8, 12], w => ({ 1: 30, 2: 25, 3: 15, 4: 12, 6: 9, 8: 6, 12: 3 })[w]);
      rec.inj = Math.max(1, Math.round(weeks * this.bonus[i].injDur));
      this._ev('inj', i, p.id, null, this.detail ? say('inj', { p: p.short }) : '');
      if (this.detail && Math.random() < 0.55) this._ev('fair', 1 - i, p.id, null, say('fair', { p: p.short }));
      if (t.subs < t.maxSubs && this._autoFor(i)) {
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

    /** Energía actual de un jugador en el partido (0-100). */
    energy(pid) {
      const r = this.pl[pid];
      return r && r.en != null ? r.en : this.P(pid).fit;
    }

    /** Desgaste de un minuto. No todos se cansan igual: cuenta el puesto (un lateral corre más que un
     *  central), el físico, la edad, el «motor» de cada uno, la mentalidad, si tu equipo va detrás del
     *  balón y el cuerpo técnico. */
    _tire(i, possI) {
      const t = this.teams[i];
      const press = 0.92 + 0.16 * (1 - (possI == null ? 0.5 : possI));
      const ment = [0.95, 1, 1.08][t.mentality] * (t.desperate ? 1.08 : 1) * (this.bonus[i].fatigue || 1) * this.wfx.fatigue * press;
      for (const o of t.onPitch) {
        const r = this.pl[o.pid], p = this.P(o.pid);
        if (!r) continue;
        if (r.en == null) r.en = p.fit;
        const base = o.slot === 'GK' ? 0.07 : 0.3 * (POS_LOAD[o.slot] || 1);
        const phys = 1.25 - (p.st[5] || 60) / 200;
        const age = p.age >= 32 ? 1.12 : p.age <= 21 ? 0.95 : 1;
        const motor = 0.86 + (F.hash(p.name) % 1000) / 1000 * 0.28; // pulmones de cada uno (0,86-1,14)
        const swing = 0.8 + Math.random() * 0.4;                    // hay minutos y minutos
        r.en = Math.max(15, r.en - base * phys * age * motor * ment * swing * (o.hurt ? 1.6 : 1));
        // Aviso en directo cuando uno de los tuyos está fundido (una vez por jugador)
        if (this.detail && t.isUser && !r.tiredMsg && r.en < 52 && this.min >= 55 && o.slot !== 'GK') {
          r.tiredMsg = true;
          this._ev('tired', i, o.pid, null, U.pick([`${p.short} está fundido: ya no llega a las ayudas.`,
            `${p.short} pide aire. Las piernas ya no le responden.`, `${p.short} se lleva las manos a las rodillas. Va justo de fuerzas.`]));
        }
      }
    }

    _fatigueSub(i) {
      const t = this.teams[i];
      const cands = t.onPitch.filter(o => o.slot !== 'GK');
      if (!cands.length || !t.bench.length) return;
      const tired = o => this.energy(o.pid) - (this.pl[o.pid].y ? 8 : 0);
      const out = cands.reduce((a, b) => (tired(a) < tired(b) ? a : b));
      if (this.energy(out.pid) > 85 && !this.pl[out.pid].y) return; // nadie lo necesita todavía
      const cur = eff(this.P(out.pid), out.slot, this.energy(out.pid));
      const best = t.bench.map(pid => this.P(pid)).filter(p => p.pos !== 'GK')
        .sort((a, b) => eff(b, out.slot) - eff(a, out.slot))[0];
      if (best && eff(best, out.slot) >= cur * 0.88) this.substitute(i, out.pid, best.id);
    }

    /** Cambio: sale outPid, entra inPid (del banquillo). */
    substitute(i, outPid, inPid) {
      const t = this.teams[i];
      if (t.subs >= t.maxSubs) return false;
      if (!this.canSubNow(i)) return false;
      const o = t.onPitch.find(o => o.pid === outPid);
      const bi = t.bench.indexOf(inPid);
      if (!o || bi < 0) return false;
      t.bench.splice(bi, 1);
      this.pl[outPid].off = this.min;
      this.pl[inPid] = this._rec(i, o.slot, this.min);
      this.pl[inPid].en = this.P(inPid).fit;
      o.pid = inPid; o.hurt = false;
      t.subs++;
      if (!this.atHalfTime()) { t.wins = t.wins || []; if (!t.wins.includes(this.min)) t.wins.push(this.min); }
      this._str = null;
      if (this.detail) {
        // La grada despide al que sale: ovación si ha hecho un partidazo, pitos si ha estado fatal
        const v = this.liveRating(outPid), rec = this.pl[outPid], home = i === 0, nm = this.P(outPid).short;
        let crowd = null, extra = '';
        if (v >= 7.6 || rec.g >= 2) { crowd = home ? 'ovation' : 'away'; extra = home ? ` El estadio entero se pone en pie para despedir a ${nm}. ¡Qué ovación!` : ` Hasta parte de la grada local aplaude a ${nm}.`; }
        else if (v >= 6.9 || rec.g >= 1 || rec.a >= 1) { crowd = 'applause'; extra = home ? ` Aplausos para ${nm} al salir.` : ` Su afición, en el fondo visitante, le aplaude.`; }
        else if (v < 5.6 && home && !rec.r) { crowd = 'whistles'; extra = ` Algunos pitos para ${nm} camino del banquillo.`; }
        this._ev('sub', i, inPid, outPid, say('sub', { p: this.P(inPid).short, a: nm }) + extra, crowd ? { crowd } : null);
      }
      return true;
    }

    /** Nota «en directo» de un jugador (sin el azar de la nota final). */
    liveRating(id) {
      const r = this.pl[id];
      if (!r) return 6;
      const p = this.P(+id), [g0, g1] = this.score;
      const mine = r.team === 0 ? g0 : g1, opp = r.team === 0 ? g1 : g0;
      let v = 6.2 + (p.ovr - 72) / 30 + r.g * 1.0 + r.a * 0.6 + r.sv * 0.15 - r.y * 0.3 - (r.r ? 1.6 : 0) + r.pw * 0.3 - r.pm * 0.6 + r.ps * 0.8 - r.f * 0.04;
      v += Math.min(1, (this.min - r.on) / 90) * ((mine > opp ? 0.4 : mine < opp ? -0.3 : 0) + mine * 0.08);
      return U.clamp(v, 3.5, 10);
    }

    /** En el descanso (los cambios de ahí no gastan parada). */
    atHalfTime() { return this.min === 45 && !!this.htDone; }
    /** Paradas para cambios usadas fuera del descanso (máximo 3). */
    subWindows(i) { return (this.teams[i].wins || []).length; }
    /** ¿Se puede cambiar ahora? Quedan cambios y o es el descanso, o esta parada ya está abierta, o quedan paradas. */
    canSubNow(i) {
      const t = this.teams[i];
      if (t.subs >= t.maxSubs) return false;
      if (this.atHalfTime()) return true;
      const w = t.wins || [];
      return w.includes(this.min) || w.length < MAX_WINDOWS;
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
      if (this.min > 0 && !this.atHalfTime()) t.reorg = this.min + REORG_MIN;
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
      // En el vestuario se recupera un poco el aliento (nunca por encima de cómo llegaron)
      for (const i of [0, 1]) for (const o of this.teams[i].onPitch) {
        const r = this.pl[o.pid];
        if (r && r.en != null) r.en = Math.min(this.P(o.pid).fit, r.en + 6);
      }
      this._str = null;
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

    simulate() { this.live = false; this.livePoss = null; this.userAway = true; while (!this.done) this.step(); return this; }

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
      // Las dedicatorias pendientes caducan partido a partido
      if (this.S.dedic) for (const id in this.pl) { const d = this.S.dedic[id]; if (d && --d.left <= 0) delete this.S.dedic[id]; }
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
        if (r.dead) {
          p.club = -2; p.listed = false; p.dead = true; p.inj = 0;
          if (TL.News) TL.News.add(S, 'club', `Tragedia: muere ${p.name} alcanzado por un rayo`, `Un rayo cayó sobre el terreno de juego en el minuto ${this.bolt ? this.bolt.min : '?'} durante el temporal. El fútbol está de luto.`, -1, p.id, 'bad');
          continue;
        }
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
    FORMATIONS, TALKS, MAX_WINDOWS, REORG_MIN, fit, eff, available, autoLineup, lineupScore, remapLineup, bestFormation, pickBench, userLineup, Match, quickScore,
    teamStrength, outcome, MENT_OWN, MENT_OPP
  };
})();
