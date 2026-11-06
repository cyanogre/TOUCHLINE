/* TOUCHLINE — el vestuario
 *
 * - Rasgos de jugador con efecto en el partido (algunos son guiños al fútbol del
 *   manga y el anime, con nombres propios del juego).
 * - Joyas de la cantera con ADN de leyenda: aparecen cada 5-10 temporadas y se
 *   desbloquean según dónde las pongas a jugar y cómo las entrenes.
 * - Entrenamiento individual de los jóvenes.
 * - Padrinos: veteranos que aceleran el crecimiento de una promesa y, al retirarse,
 *   pueden entrar en tu cuerpo técnico.
 * - Reuniones de despacho: peticiones de minutos, cesiones, renovaciones, egos.
 * - Actividades de equipo: barbacoa, día libre, concentración.
 * - Relaciones entre compañeros y con el míster (química en el campo).
 * - Cesiones: ceder jugadores y pedirlos cedidos.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World;

  // ------------------------------------------------------------ Rasgos
  // eff: shot (peso para tirar), conv (acierto), assist (peso para asistir), fouled (faltas recibidas),
  //      save (multiplica el acierto rival), mid/att/def (fuerza del equipo), team (multiplicador), any (juega en cualquier puesto)
  const TRAITS = {
    ego: { name: 'Ego de goleador', icon: '🔥', desc: 'Delantero letal y egoísta: tira siempre. Marca más, asiste menos y se enfada si no juega. Toca reconducirlo.', eff: { shot: 1.7, conv: 1.1, assist: 0.4 } },
    egoTeam: { name: 'Ego al servicio del equipo', icon: '👑', desc: 'Sigue teniendo hambre de gol, pero ahora juega para los demás.', eff: { shot: 1.4, conv: 1.08, assist: 1.25 } },
    vision: { name: 'Visión periférica', icon: '👁️', desc: 'Ve el campo desde arriba. Más asistencias; reconvertido a lateral o pivote, se dispara.', eff: { assist: 1.6, mid: 0.4 } },
    dribble: { name: 'Regate de ensueño', icon: '🌀', desc: 'Se va de tres como si nada. Recibe muchas faltas y marca goles imposibles.', eff: { fouled: 1.6, conv: 1.04 } },
    tiger: { name: 'Disparo del tigre', icon: '🐯', desc: 'Un cañonazo que deja temblando la red, incluso desde fuera del área.', eff: { conv: 1.07, shot: 1.2 } },
    cat: { name: 'Reflejos de gato', icon: '🧤', desc: 'Portero de reflejos imposibles. Dicen que no se quita la gorra ni para dormir.', eff: { save: 0.9 } },
    leader: { name: 'Líder del vestuario', icon: '🎖️', desc: 'Sostiene la moral del grupo y es el mejor padrino para los jóvenes.', eff: { team: 1.008 } },
    dnaTotal: { name: 'ADN: Fútbol total', icon: '🌟', desc: 'Juega en cualquier puesto como si fuera el suyo.', eff: { any: true, mid: 0.5, assist: 1.2 } },
    dnaLibero: { name: 'ADN: Líbero de época', icon: '🌟', desc: 'Defiende con elegancia y sale jugando como un centrocampista más.', eff: { def: 0.6, mid: 0.5, assist: 1.3 } },
    dnaMagic: { name: 'ADN: Genio del regate', icon: '🌟', desc: 'Regate, pausa y gol. Imparable en el uno contra uno.', eff: { fouled: 1.5, conv: 1.08, shot: 1.2 } },
    dnaWall: { name: 'ADN: Muro bajo palos', icon: '🌟', desc: 'Un portero de los que ganan ligas.', eff: { save: 0.85 } },
    dnaNine: { name: 'ADN: Nueve de leyenda', icon: '🌟', desc: 'Huele el gol: siempre está donde cae el balón.', eff: { shot: 1.45, conv: 1.12 } },
    dnaBrain: { name: 'ADN: Cerebro del equipo', icon: '🌟', desc: 'Dirige el juego: todo pasa por sus botas.', eff: { assist: 1.6, mid: 0.8 } }
  };

  // Joyas con ADN de leyenda: dónde deben jugar y qué entrenamiento las despierta
  const DNA = {
    total: { name: 'Fútbol total', pos: ['CAM', 'CM', 'ST', 'RW', 'LW'], focus: 'tactica', trait: 'dnaTotal', hint: 'Necesita jugar arriba o en la medular y entrenar la táctica.' },
    libero: { name: 'Líbero de época', pos: ['CB', 'CDM'], focus: 'tactica', trait: 'dnaLibero', hint: 'Necesita jugar de central o pivote y entrenar la táctica.' },
    magic: { name: 'Genio del regate', pos: ['RW', 'LW', 'CAM', 'ST'], focus: 'tecnica', trait: 'dnaMagic', hint: 'Necesita jugar en banda o de mediapunta y entrenar la técnica.' },
    wall: { name: 'Muro bajo palos', pos: ['GK'], focus: 'porteria', trait: 'dnaWall', hint: 'Necesita jugar en la portería y entrenar específico de porteros.' },
    nine: { name: 'Nueve de leyenda', pos: ['ST'], focus: 'remate', trait: 'dnaNine', hint: 'Necesita jugar de delantero centro y entrenar el remate.' },
    brain: { name: 'Cerebro del equipo', pos: ['CM', 'CDM', 'CAM'], focus: 'tactica', trait: 'dnaBrain', hint: 'Necesita jugar en el centro del campo y entrenar la táctica.' }
  };

  // Entrenamiento individual: qué estadísticas trabaja [rit, tir, pas, reg, def, fis]
  const FOCUS = {
    tecnica: { name: 'Técnica', st: [2, 3] },
    fisico: { name: 'Físico', st: [0, 5] },
    tactica: { name: 'Táctica', st: [2, 4] },
    remate: { name: 'Remate', st: [1] },
    porteria: { name: 'Porteros', st: [] }
  };

  // Cuerpo técnico (veteranos retirados)
  const STAFF = {
    youth: { name: 'Entrenador de juveniles', desc: '+12% de crecimiento de los jóvenes' },
    assistant: { name: 'Segundo entrenador', desc: 'Mejor moral semanal y charlas más eficaces' },
    gk: { name: 'Entrenador de porteros', desc: '+20% de crecimiento de los porteros' }
  };

  function state(S) {
    if (!S.lk) S.lk = {};
    const L = S.lk;
    L.tr = L.tr || {}; L.gems = L.gems || {}; L.focus = L.focus || {}; L.mentor = L.mentor || {};
    L.rel = L.rel || {}; L.boss = L.boss || {}; L.promises = L.promises || []; L.staff = L.staff || [];
    L.loans = L.loans || []; L.cool = L.cool || {}; L.posApps = L.posApps || {};
    if (L.nextGem == null) L.nextGem = S.season + U.int(1, 3);
    if (L.nextScout == null) L.nextScout = S.season;
    return L;
  }

  // ------------------------------------------------------------ Rasgos: consulta y efectos
  function traits(S, pid) { return (S.lk && S.lk.tr[pid]) || []; }
  function hasTrait(S, pid, t) { return traits(S, pid).includes(t); }
  function addTrait(S, pid, t) {
    const L = state(S); const a = L.tr[pid] || (L.tr[pid] = []); if (!a.includes(t)) a.push(t); L._fx = null;
    if (t === 'dnaTotal' && S.players[pid]) S.players[pid].anyPos = true;
  }
  function removeTrait(S, pid, t) { const L = state(S); L.tr[pid] = (L.tr[pid] || []).filter(x => x !== t); L._fx = null; }

  /** Efectos combinados de los rasgos de un jugador (o null). */
  function fx(S, pid) {
    const L = S.lk;
    if (!L) return null;
    if (!L._fx) {
      L._fx = {};
      for (const id in L.tr) {
        const out = {};
        for (const t of L.tr[id]) {
          const e = TRAITS[t] && TRAITS[t].eff; if (!e) continue;
          for (const k in e) {
            if (typeof e[k] === 'boolean') out[k] = true;
            else if (['mid', 'att', 'def'].includes(k)) out[k] = (out[k] || 0) + e[k];
            else out[k] = (out[k] || 1) * e[k];
          }
        }
        L._fx[id] = out;
      }
    }
    return L._fx[pid] || null;
  }

  // ------------------------------------------------------------ Relaciones
  const key = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  function rel(S, a, b) {
    const L = state(S);
    const v = L.rel[key(a, b)];
    if (v != null) return v;
    const pa = S.players[a], pb = S.players[b];
    return pa && pb && pa.nat === pb.nat ? 15 : 0;
  }
  function bond(S, a, b, d) {
    if (a == null || b == null || a === b) return;
    const L = state(S);
    L.rel[key(a, b)] = U.clamp(Math.round(rel(S, a, b) + d), -100, 100);
  }
  function boss(S, pid) { return (S.lk && S.lk.boss[pid]) || 0; }
  function bossAdd(S, pid, d) { const L = state(S); L.boss[pid] = U.clamp(Math.round(boss(S, pid) + d), -100, 100); }
  function relLabel(v) { return v >= 60 ? 'Íntimos' : v >= 30 ? 'Buena relación' : v > -20 ? 'Normal' : v > -50 ? 'Tensa' : 'No se hablan'; }
  function bossLabel(v) { return v >= 50 ? 'Te adora' : v >= 20 ? 'Confía en ti' : v > -20 ? 'Correcta' : v > -50 ? 'Distante' : 'Rota'; }

  /** Química del once: amigos suman, enemigos restan; padrino y ahijado juntos, un poco más. */
  function chem(S, pids) {
    if (!S.lk) return 0;
    let v = 0;
    for (let i = 0; i < pids.length; i++) for (let j = i + 1; j < pids.length; j++) {
      const r = rel(S, pids[i], pids[j]);
      if (r >= 50) v += 0.22; else if (r <= -40) v -= 0.35;
      if (S.lk.mentor[pids[i]] === pids[j] || S.lk.mentor[pids[j]] === pids[i]) v += 0.2;
    }
    return U.clamp(v, -1.6, 1.6);
  }

  /** Pares destacados del vestuario (para mostrarlos). */
  function pairs(S) {
    const sq = W().squad(S, S.user), out = [];
    for (let i = 0; i < sq.length; i++) for (let j = i + 1; j < sq.length; j++) {
      const r = rel(S, sq[i].id, sq[j].id);
      if (r >= 45 || r <= -35) out.push([sq[i], sq[j], r]);
    }
    return out.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
  }

  // ------------------------------------------------------------ Padrinos y cuerpo técnico
  function canMentor(S, p) { return p.club === S.user && p.age >= 29 && !onLoan(S, p.id); }
  function canBePupil(S, p) { return p.club === S.user && p.age <= 21; }
  function pupilsOf(S, mid) { return Object.keys(state(S).mentor).filter(k => S.lk.mentor[k] === mid).map(Number); }
  function setMentor(S, pupil, mentor) {
    const L = state(S);
    if (mentor == null) { delete L.mentor[pupil]; return { ok: true, msg: 'Sin padrino.' }; }
    const m = S.players[mentor], p = S.players[pupil];
    if (!m || !p || !canMentor(S, m) || !canBePupil(S, p)) return { ok: false, msg: 'No puede ser.' };
    if (pupilsOf(S, mentor).length >= 2) return { ok: false, msg: `${m.short} ya apadrina a dos jóvenes.` };
    L.mentor[pupil] = mentor;
    bond(S, pupil, mentor, 15);
    return { ok: true, msg: `${m.short} será el padrino de ${p.short}.` };
  }
  function staffBonus(S) {
    const st = (S.lk && S.lk.staff) || [];
    return { youth: st.some(s => s.role === 'youth') ? 1.12 : 1, gk: st.some(s => s.role === 'gk') ? 1.2 : 1, assistant: st.some(s => s.role === 'assistant') };
  }

  /** Multiplicador de crecimiento para develop(): padrino, entrenamiento, cuerpo técnico, ADN. */
  function growth(S, p) {
    if (!S.lk || p.club !== S.user) return 1;
    let g = 1;
    const m = S.lk.mentor[p.id];
    if (m != null && S.players[m] && S.players[m].club === S.user) g *= F.LINE[S.players[m].pos] === F.LINE[p.pos] ? 1.3 : 1.18;
    if (S.lk.focus[p.id]) g *= 1.1;
    const sb = staffBonus(S);
    if (p.age <= 23) g *= sb.youth;
    if (p.pos === 'GK') g *= sb.gk;
    if (hasTrait(S, p.id, 'vision') && ['RB', 'LB', 'CDM'].includes(p.pos)) g *= 1.25; // reconvertido, como debe ser
    return g;
  }

  /** Después de develop(): inclinación de estadísticas por entrenamiento, herencias y joyas. */
  function afterDevelop(S, p) {
    const L = S.lk;
    if (!L || p.club !== S.user) return;
    const f = L.focus[p.id] && FOCUS[L.focus[p.id]];
    if (f) f.st.forEach(i => { p.st[i] = U.clamp(p.st[i] + 2, 15, 99); });
    if (p.age > 23) delete L.focus[p.id];
    // El ahijado puede heredar un rasgo del padrino
    const m = L.mentor[p.id];
    if (m != null && S.players[m]) {
      const inh = traits(S, m).filter(t => ['leader', 'cat', 'tiger'].includes(t) && (t !== 'cat' || p.pos === 'GK'));
      if (inh.length && Math.random() < 0.25) {
        const t = U.pick(inh);
        addTrait(S, p.id, t);
        TL.Game.mail(S, `${p.short} aprende de ${S.players[m].short}`, `Tras una temporada a su lado, ${p.name} ha heredado «${TRAITS[t].name}» de su padrino.`, 'good');
      }
      // El ego se reconduce con un buen padrino
      if (hasTrait(S, p.id, 'ego') && hasTrait(S, m, 'leader') && Math.random() < 0.4) convertEgo(S, p);
    }
    if (p.age > 21) delete L.mentor[p.id];
    gemSeason(S, p);
  }

  function convertEgo(S, p) {
    removeTrait(S, p.id, 'ego'); addTrait(S, p.id, 'egoTeam');
    TL.News.add(S, 'positivo', `${p.short} ya juega para el equipo`, `El delantero que solo pensaba en el gol ahora también asiste. "He entendido que el ego se pone al servicio de todos", dice ${p.name}.`, S.user, p.id, 'pos');
    TL.Game.mail(S, `${p.short} ha cambiado`, `${p.name} ha reconducido su ego: sigue teniendo hambre de gol, pero ya no se olvida de sus compañeros.`, 'good');
  }

  /** Un veterano cuelga las botas: puede entrar en el cuerpo técnico. */
  function onRetire(S, p) {
    const L = state(S);
    const had = pupilsOf(S, p.id).length > 0 || hasTrait(S, p.id, 'leader') || p.ovr >= S.clubs[S.user].rep;
    for (const k of pupilsOf(S, p.id)) delete L.mentor[k];
    if (!had || L.staff.length >= 3) return;
    const opts = [['youth', 'Entrenador de juveniles'], ['assistant', 'Segundo entrenador']];
    if (p.pos === 'GK') opts.unshift(['gk', 'Entrenador de porteros']);
    opts.push(['farewell', 'Homenaje y despedida']);
    TL.Game.mail(S, `${p.short} cuelga las botas`, `${p.name} se retira a los ${p.age} años. Conoce la casa y a los chavales. ¿Le ofreces un puesto en tu cuerpo técnico?`, 'decision',
      { ev: 'lk_staff', pid: p.id, opts });
  }

  // ------------------------------------------------------------ Joyas con ADN de leyenda
  function makeGem(S) {
    const c = S.clubs[S.user];
    const dk = U.pick(Object.keys(DNA)), d = DNA[dk];
    const pos = U.pick(d.pos);
    const nats = W().squad(S, S.user).map(p => p.nat);
    const ovr = U.int(52, 60);
    const p = W().makePlayer(S, { club: S.user, nat: U.pick(nats.length ? nats : [0]), pos, age: U.int(16, 17), ovr, pot: U.int(72, 78), contract: S.season + 4 });
    p.wage = F.wageFor(p.ovr, p.age, S.leagues[c.league].wealth, S.econ.wage);
    p.mor = 80;
    state(S).gems[p.id] = { dna: dk, stage: 0, hidden: U.int(90, 95), apps: 0 };
    TL.Game.mail(S, 'En la cantera hay un chaval distinto', `Los técnicos de la cantera no paran de hablar de ${p.name} (${p.age} años, ${F.POS_ES[pos]}). "Tiene algo que no se enseña", dicen. Dale minutos en su sitio y un plan de entrenamiento: puede ser algo muy grande.`, 'good');
    return p;
  }

  /** Progreso de una joya durante la temporada (partidos en su puesto). */
  function gemApp(S, pid, slot) {
    const g = S.lk && S.lk.gems[pid];
    if (!g) return;
    const d = DNA[g.dna];
    if (!d.pos.includes(slot)) return;
    g.apps++;
    if (g.stage === 0 && g.apps >= 8) {
      g.stage = 1;
      const p = S.players[pid];
      p.pot = Math.max(p.pot, g.hidden - 6);
      TL.News.add(S, 'positivo', `${p.short}, la joya de la cantera`, `La prensa ya le compara con las leyendas: "Tiene el ${d.name.toLowerCase()} de los genios de antes". Su techo parece altísimo.`, S.user, pid, 'pos');
      TL.Game.mail(S, `✨ Destello de ${p.short}`, `${p.name} empieza a enseñar su ADN: ${d.name}. ${d.hint} Si lo haces, al final de la temporada desbloqueará algo único.`, 'good');
    }
  }

  function gemSeason(S, p) {
    const g = S.lk.gems[p.id];
    if (!g) return;
    const d = DNA[g.dna];
    if (g.stage === 1 && S.lk.focus[p.id] === d.focus && g.apps >= 15) {
      g.stage = 2;
      addTrait(S, p.id, d.trait);
      p.pot = Math.max(p.pot, g.hidden);
      TL.Game.mail(S, `🌟 ${p.short} desbloquea su ADN`, `Ha jugado en su sitio y ha entrenado lo que necesitaba: ${p.name} gana «${TRAITS[d.trait].name}». Su potencial ya no tiene techo.`, 'good');
      TL.News.add(S, 'positivo', `Nace una estrella en ${S.clubs[S.user].name}`, `${p.name} se consolida como uno de los talentos del continente.`, S.user, p.id, 'pos');
    } else if (g.stage >= 1 && g.stage < 2 && g.apps < 5) {
      g.hidden = Math.max(p.pot, g.hidden - 2);
    } else if (g.stage === 0 && g.apps < 3 && p.age >= 18) {
      g.hidden = Math.max(p.pot, g.hidden - 1);
    }
    if (g.stage === 2 && p.ovr >= 80 && p.age <= 22) {
      g.stage = 3;
      p.mor = Math.max(p.mor || 70, 90);
      if (S.com) S.com.fans = Math.round(S.com.fans * 1.04);
      TL.News.add(S, 'positivo', `${p.short}, superestrella`, `Con ${p.age} años, ${p.name} ya es una superestrella. La afición llena las gradas para verle.`, S.user, p.id, 'pos');
    }
    g.apps = 0;
  }

  // ------------------------------------------------------------ Promesas del ojeador (guiños)
  const JP = { m: ['Haruto', 'Sota', 'Ren', 'Yuto', 'Kaito', 'Riku', 'Hinata', 'Itsuki', 'Daichi', 'Kenta', 'Shun', 'Takumi'],
    f: ['Hina', 'Yui', 'Sakura', 'Aoi', 'Rin', 'Mei', 'Nanami', 'Kaede', 'Mio', 'Saki'],
    s: ['Tanaka', 'Sato', 'Kobayashi', 'Yamamoto', 'Nakamura', 'Fujita', 'Morimoto', 'Kurosawa', 'Hayashi', 'Ishikawa', 'Kondo', 'Mizuno'] };
  const SCOUT = [
    { trait: 'dribble', pos: ['CAM', 'RW', 'LW'], from: 'Japón', title: 'Un regate de dibujos animados', body: n => `Tu ojeador en Japón ha visto a ${n}, un chaval que juega con el balón pegado al pie y que dice que "el balón es su amigo". Se va de tres como si nada.` },
    { trait: 'cat', pos: ['GK'], from: 'Japón', title: 'Un portero que no se deja meter goles', body: n => `Desde Japón llega el informe de ${n}, un portero de reflejos imposibles que nunca se quita la gorra. Asegura que no encajará ni un gol desde fuera del área.` },
    { trait: 'ego', pos: ['ST'], from: 'Japón', title: 'El delantero más egoísta', body: n => `${n} sale de un programa experimental japonés que encerró a cientos de delanteros para fabricar al más egoísta. Marca muchísimo, pero no se la pasa a nadie. Habrá que reconducirle.` },
    { trait: 'vision', pos: ['ST', 'CAM'], from: 'Japón', title: 'Un chaval que lo ve todo', body: n => `${n} juega de delantero en un equipo modesto, pero tu ojeador cree que su visión de juego es de otro planeta. "Quizá rinda aún más de lateral", apunta en el informe.` },
    { trait: 'tiger', pos: ['ST'], from: null, title: 'Un disparo que asusta', body: n => `Tu ojeador ha encontrado a ${n}, un delantero con un disparo tan potente que los porteros del juvenil se apartan.` }
  ];

  function scoutOffer(S) {
    const L = state(S);
    if (S.season < L.nextScout || S.week !== 2) return;
    L.nextScout = S.season + 1;
    if (Math.random() > 0.45) return;
    const k = U.int(0, SCOUT.length - 1), sc = SCOUT[k];
    const jp = S.nations.findIndex(n => n[0] === 'Japón');
    const nat = sc.from === 'Japón' && jp >= 0 ? jp : U.pick(W().squad(S, S.user).map(p => p.nat));
    const pos = U.pick(sc.pos);
    const c = S.clubs[S.user];
    const ovr = U.clamp(c.rep - U.int(8, 14), 52, 72);
    const p = W().makePlayer(S, { club: -1, nat, pos, age: U.int(17, 19), ovr, pot: Math.min(92, c.rep + U.int(6, 12)), contract: 0 });
    if (sc.from === 'Japón') { const nm = `${U.pick(S.gender === 'F' ? JP.f : JP.m)} ${U.pick(JP.s)}`; p.name = nm; p.short = nm.split(' ')[1]; }
    addTrait(S, p.id, sc.trait);
    const fee = F.roundMoney(W().value(S, p) * 0.6);
    TL.Game.mail(S, `Informe del ojeador: ${sc.title.toLowerCase()}`, sc.body(p.name) + ` Puedes traerle por ${U.money(fee)}.`, 'decision', { ev: 'lk_scout', pid: p.id, fee, opts: [['sign', `Ficharle (${U.money(fee)})`], ['pass', 'Dejarlo pasar']] });
  }

  // ------------------------------------------------------------ Cesiones
  function onLoan(S, pid) { return !!(S.lk && S.lk.loans.find(l => l.pid === pid)); }
  function loanOf(S, pid) { return (S.lk && S.lk.loans.find(l => l.pid === pid)) || null; }

  function loanDest(S, p) {
    const line = F.LINE[p.pos];
    const cands = S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable && p.ovr >= c.rep - 7 && p.ovr <= c.rep + 2 && W().squad(S, c.id).length < TL.Market.MAX_SQUAD - 2);
    if (!cands.length) return null;
    // Donde vaya a jugar: pocos jugadores de su línea por encima de él
    return U.weighted(cands, c => {
      const better = W().squad(S, c.id).filter(x => F.LINE[x.pos] === line && x.ovr > p.ovr).length;
      const home = S.leagues[c.league].country === S.leagues[S.clubs[S.user].league].country ? 4 : 1; // mejor en tu país, para seguirle
      return (better <= 1 ? 3 : better <= 3 ? 1.5 : 0.4) * (S.leagues[c.league].wealth + 0.3) * home;
    });
  }

  function loanOut(S, p) {
    const M = TL.Market;
    if (!M.windowOpen(S)) return { ok: false, msg: 'Las cesiones se cierran con el mercado abierto.' };
    if (p.club !== S.user || onLoan(S, p.id)) return { ok: false, msg: 'No puedes cederle.' };
    if (W().squad(S, S.user).length <= 17) return { ok: false, msg: 'Te quedarías con muy pocos jugadores.' };
    const dest = loanDest(S, p);
    if (!dest) return { ok: false, msg: 'Ningún club encaja para darle minutos.' };
    const fee = F.roundMoney(W().value(S, p) * U.rand(0.03, 0.08));
    state(S).loans.push({ pid: p.id, from: S.user, to: dest.id, s: S.season });
    p.club = dest.id; p.listed = false;
    S.clubs[S.user].cash += fee; dest.cash -= fee;
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    delete S.lk.mentor[p.id];
    W().dirty(S);
    TL.Commerce.refreshBudget(S);
    TL.News.add(S, 'fichajes', `${p.short}, cedido al ${dest.name}`, `${S.clubs[S.user].name} cede a ${p.name} hasta final de temporada para que sume minutos. El ${dest.name} paga su ficha${fee ? ' y ' + U.money(fee) : ''}.`, S.user, p.id, 'neu');
    bossAdd(S, p.id, 5); p.mor = Math.min(100, (p.mor || 70) + 6);
    return { ok: true, msg: `${p.short} cedido al ${dest.name}${fee ? ' · +' + U.money(fee) : ''}` };
  }

  /** ¿Lo prestaría su club? Solo si no es de los importantes de su plantilla. */
  function loanable(S, p) {
    if (p.club < 0 || p.club === S.user || onLoan(S, p.id)) return { ok: false, reason: 'No se puede ceder.' };
    const sq = W().squad(S, p.club).sort((a, b) => b.ovr - a.ovr);
    const rank = sq.findIndex(x => x.id === p.id);
    if (sq.length <= 20) return { ok: false, reason: `${S.clubs[p.club].name} tiene la plantilla corta.` };
    if (rank < 13 && !p.listed) return { ok: false, reason: `${S.clubs[p.club].name} cuenta con él: no lo cede.` };
    return { ok: true };
  }

  function loanIn(S, p) {
    const M = TL.Market;
    if (!M.windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    const ok = loanable(S, p);
    if (!ok.ok) return { ok: false, msg: ok.reason };
    const w = M.willing(S, p, S.user);
    if (!w.ok) return { ok: false, msg: w.reason };
    const fee = F.roundMoney(W().value(S, p) * 0.05);
    const err = M.canAfford(S, fee, p.wage);
    if (err) return { ok: false, msg: err };
    const from = p.club;
    state(S).loans.push({ pid: p.id, from, to: S.user, s: S.season });
    S.clubs[from].cash += fee; S.clubs[S.user].cash -= fee; S.fin.buys += fee;
    p.club = S.user; p.listed = false;
    p.mor = Math.max(p.mor == null ? 70 : p.mor, 74);
    W().dirty(S);
    TL.Commerce.refreshBudget(S);
    TL.News.add(S, 'fichajes', `${S.clubs[S.user].name} se hace con ${p.name}, cedido`, `Llega cedido desde el ${S.clubs[from].name} hasta final de temporada${fee ? ' por ' + U.money(fee) : ''}. Pagas su ficha (${U.money(p.wage)}/sem).`, S.user, p.id, 'pos');
    return { ok: true, msg: `${p.short} llega cedido hasta final de temporada.` };
  }

  /** Repescar a un cedido (solo con el mercado abierto). */
  function recall(S, p) {
    const l = loanOf(S, p.id);
    if (!l || l.from !== S.user) return { ok: false, msg: 'No está cedido por ti.' };
    if (!TL.Market.windowOpen(S)) return { ok: false, msg: 'Solo puedes repescarle con el mercado abierto.' };
    endLoan(S, l, true);
    return { ok: true, msg: `${p.short} vuelve a tu plantilla.` };
  }

  function endLoan(S, l, early) {
    const p = S.players[l.pid];
    S.lk.loans = S.lk.loans.filter(x => x !== l);
    if (!p || p.club < -1) return;
    const st = S.stats[p.id] || [0, 0, 0, 0];
    if (l.from === S.user) {
      p.club = S.user;
      const apps = st[0], avg = apps ? st[3] / apps : 0;
      TL.Game.mail(S, `${p.short} vuelve de su cesión`, `${p.name} regresa del ${S.clubs[l.to].name}${early ? ' antes de tiempo' : ''}: ${apps} partidos${apps ? `, nota media ${avg.toFixed(1)}` : ''}${st[1] ? `, ${st[1]} goles` : ''}.`, 'club');
    } else {
      p.club = l.from;
      S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    }
    W().dirty(S);
  }

  /** Fin de temporada: todos vuelven a su club. Va antes de contratos y retiradas. */
  function endLoans(S) {
    const L = state(S);
    for (const l of L.loans.slice()) endLoan(S, l, false);
    if (TL.Commerce) TL.Commerce.refreshBudget(S);
  }

  // ------------------------------------------------------------ Actividades de equipo
  const ACT = {
    bbq: { name: 'Barbacoa de equipo', icon: '🍖', cool: 4, desc: 'Sube la moral de todos y crea amistades.' },
    dayoff: { name: 'Día libre', icon: '🛌', cool: 4, desc: 'Recuperan forma física y moral. Algún riesgo de salir de fiesta.' },
    retreat: { name: 'Concentración', icon: '🏨', cool: 5, desc: '+3% de rendimiento en el próximo partido y más unión. Algo de cansancio mental.' }
  };
  function actCost(S, k) { return k === 'bbq' ? F.roundMoney(Math.max(5000, W().wageBill(S, S.user) * 0.06)) : k === 'retreat' ? F.roundMoney(Math.max(8000, W().wageBill(S, S.user) * 0.1)) : 0; }
  function actReady(S, k) { const L = state(S); return !(L.cool[k] != null && S.week < L.cool[k]); }

  function activity(S, k, auto) {
    const L = state(S);
    const a = ACT[k];
    if (!a) return { ok: false, msg: '' };
    if (!auto && !actReady(S, k)) return { ok: false, msg: `Disponible en la jornada ${L.cool[k] + 1}.` };
    const cost = actCost(S, k);
    if (cost && S.clubs[S.user].cash < cost) return { ok: false, msg: 'No hay dinero para eso ahora mismo.' };
    S.clubs[S.user].cash -= cost;
    L.cool[k] = S.week + a.cool;
    const sq = W().squad(S, S.user);
    const morAdd = d => sq.forEach(p => { p.mor = U.clamp((p.mor == null ? 70 : p.mor) + d, 0, 100); });
    let extra = '';
    if (k === 'bbq') {
      morAdd(6);
      for (let i = 0; i < 8; i++) { const [x, y] = U.shuffle(sq.slice()).slice(0, 2); if (x && y) bond(S, x.id, y.id, 12); }
      sq.forEach(p => bossAdd(S, p.id, 3));
      const r = Math.random();
      if (r < 0.12) { const p = U.pick(sq); extra = ` ${p.short} se proclama maestro parrillero.`; TL.News.add(S, 'positivo', `Barbacoa en el ${S.clubs[S.user].name}`, `Buen ambiente en el vestuario: ${p.name} se encargó de la parrilla.`, S.user, p.id, 'pos'); }
      else if (r < 0.17) { const [x, y] = U.shuffle(sq.slice()).slice(0, 2); bond(S, x.id, y.id, -30); extra = ` ${x.short} y ${y.short} acabaron discutiendo por una tontería.`; }
    } else if (k === 'dayoff') {
      sq.forEach(p => { p.fit = Math.min(100, p.fit + 15); });
      morAdd(4);
      sq.forEach(p => bossAdd(S, p.id, 2));
      if (Math.random() < 0.1) {
        const p = U.pick(sq.filter(x => x.age <= 28)) || U.pick(sq);
        p.mor = Math.max(0, (p.mor || 70) - 6);
        bossAdd(S, p.id, -6);
        extra = ` Pero pillan a ${p.short} de fiesta hasta las tantas.`;
        TL.News.add(S, 'ocio', `${p.short}, de fiesta en su día libre`, `Fotos de ${p.name} saliendo de una discoteca de madrugada. El club no comenta.`, S.user, p.id, 'neg');
      }
    } else if (k === 'retreat') {
      L.boost = { w: S.week, v: 1.03 };
      for (let i = 0; i < 10; i++) { const [x, y] = U.shuffle(sq.slice()).slice(0, 2); if (x && y) bond(S, x.id, y.id, 6); }
      morAdd(-1);
    }
    W().dirty(S);
    return { ok: true, msg: `${a.icon} ${a.name}${cost ? ' · ' + U.money(cost) : ''}.${extra}` };
  }
  /** Multiplicador de la concentración para el partido de esta semana. */
  function matchBoost(S) { const b = S.lk && S.lk.boost; return b && b.w === S.week ? b.v : 1; }

  // ------------------------------------------------------------ Despacho y semana a semana
  function appsOf(S, pid) { return (S.stats[pid] || [0])[0]; }

  /** Tras cada jornada: minutos, promesas, química, padrinos, egos y joyas. */
  function afterRound(S, results) {
    const L = state(S);
    const mine = results.find(r => r.h === S.user || r.a === S.user);
    const played = new Set();
    if (mine && mine.slots) {
      for (const id in mine.slots) {
        const p = S.players[id];
        if (!p || p.club !== S.user) continue;
        played.add(+id);
        gemApp(S, +id, mine.slots[id]);
      }
    }
    const sq = W().squad(S, S.user);
    if (!mine) return;
    const xi = sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11).map(p => p.id);
    for (const p of sq) {
      // Relación con el míster: los buenos que no juegan se enfadan contigo
      if (!played.has(p.id) && xi.includes(p.id) && p.inj <= 0 && p.sus <= 0) { bossAdd(S, p.id, -2); if (hasTrait(S, p.id, 'ego')) p.mor = Math.max(0, (p.mor || 70) - 4); }
      if (played.has(p.id)) bossAdd(S, p.id, 0.5);
      // El vínculo con el míster empuja la moral poco a poco
      const b = boss(S, p.id);
      if (b) p.mor = U.clamp((p.mor == null ? 70 : p.mor) + b / 200, 0, 100);
      const m = L.mentor[p.id];
      if (m != null && S.players[m] && S.players[m].club === S.user) { bond(S, p.id, m, 2); p.mor = Math.min(100, (p.mor || 70) + 0.5); }
    }
    // Ganar juntos une
    const won = mine && ((mine.h === S.user && mine.hg > mine.ag) || (mine.a === S.user && mine.ag > mine.hg));
    if (won) { const pl = [...played]; for (let i = 0; i < 3; i++) { const [x, y] = U.shuffle(pl.slice()).slice(0, 2); bond(S, x, y, 3); } }
    if (staffBonus(S).assistant) sq.forEach(p => { p.mor = Math.min(100, (p.mor || 70) + 0.4); });
    // Promesas de minutos
    for (const pr of L.promises.slice()) {
      const p = S.players[pr.pid];
      if (!p || p.club !== S.user) { L.promises = L.promises.filter(x => x !== pr); continue; }
      if (appsOf(S, p.id) - pr.apps0 >= pr.need) {
        L.promises = L.promises.filter(x => x !== pr);
        bossAdd(S, p.id, 15); p.mor = Math.min(100, (p.mor || 70) + 6);
        TL.Game.mail(S, `Promesa cumplida con ${p.short}`, `Le prometiste minutos y los ha tenido. ${p.name} confía más en ti.`, 'good');
      } else if (S.week >= pr.until) {
        L.promises = L.promises.filter(x => x !== pr);
        bossAdd(S, p.id, -25); p.mor = Math.max(0, (p.mor || 70) - 15);
        TL.Game.mail(S, `Promesa incumplida con ${p.short}`, `Le prometiste minutos y no los ha tenido. ${p.name} se siente engañado: su relación contigo se resiente.`, 'med');
      }
    }
    office(S, sq, played);
  }

  /** Una reunión de despacho a la semana, como mucho. */
  function office(S, sq, played) {
    const L = state(S);
    if (L.lastOffice != null && S.week - L.lastOffice < 2) return;
    const pending = new Set(S.inbox.filter(m => m.kind === 'decision' && !m.done && m.data && m.data.pid != null).map(m => m.data.pid));
    const rank = sq.slice().sort((a, b) => b.ovr - a.ovr).map(p => p.id);
    const open = TL.Market.windowOpen(S);
    const cands = [];
    for (const p of sq) {
      if (pending.has(p.id) || onLoan(S, p.id) || p.inj > 0) continue;
      const r = rank.indexOf(p.id);
      const apps = appsOf(S, p.id), weeks = Math.max(1, S.week);
      const share = apps / weeks;
      if (hasTrait(S, p.id, 'ego') && played.has(p.id) && Math.random() < 0.18) cands.push(['ego', p, 3]);
      if (p.age <= 22 && share < 0.3 && S.week >= 4 && r >= 14) cands.push(['loan', p, 2]);
      else if (r < 16 && share < 0.4 && S.week >= 5 && (p.mor || 70) < 66) cands.push(['minutes', p, 2 + (r < 11 ? 1 : 0)]);
      const st = S.stats[p.id];
      if (st && st[0] >= 8 && st[3] / st[0] >= 6.9 && p.contract <= S.season + 2 && (L.asked || {})[p.id] !== S.season) cands.push(['raise', p, 1.5]);
    }
    if (!cands.length || Math.random() > 0.55) return;
    const [kind, p] = U.weighted(cands, c => c[2]);
    L.lastOffice = S.week;
    const D = {
      minutes: [`${p.short} pide una reunión`, `${p.name} entra en tu despacho: "Míster, quiero jugar más. Así no puedo demostrar nada".`,
        [['promise', 'Prometerle minutos'], ['patience', 'Pedirle paciencia'], open ? ['list', 'Ponerle en venta'] : ['talk', 'Explicarle su papel']]],
      loan: [`${p.short} quiere salir cedido`, `${p.name}, de ${p.age} años, te pide salir cedido para jugar: "Aquí no tengo sitio y necesito minutos".`,
        [[open ? 'loan' : 'loanLater', open ? 'Buscarle una cesión' : 'Cederle en el próximo mercado'], ['promise', 'Prometerle minutos'], ['refuse', 'Negarte']]],
      raise: [`${p.short} quiere renovar`, `${p.name} está rindiendo a gran nivel y su agente pide sentarse a hablar de una renovación.`,
        [['renew', 'Renovarle ya'], ['later', 'Hablarlo en verano'], ['no', 'No hay renovación']]],
      ego: [`${p.short} no la pasa nunca`, `Varios jugadores se quejan en tu despacho: ${p.name} solo piensa en marcar y no da un pase. Él dice que "un delantero tiene que ser egoísta".`,
        [['talk', 'Hablar con él'], ['let', 'Dejarle ser'], ['bench', 'Mandarle al banquillo']]]
    };
    const [title, body, opts] = D[kind];
    if (kind === 'raise') (L.asked || (L.asked = {}))[p.id] = S.season;
    TL.Game.mail(S, `🚪 ${title}`, body, 'decision', { ev: 'lk_' + kind, pid: p.id, opts });
  }

  /** Antes de un partido grande, los capitanes proponen algo. */
  function preMatch(S) {
    const fx = TL.Season.nextFixture(S);
    if (!fx) return;
    const opp = fx[0] === S.user ? fx[1] : fx[0];
    const tab = TL.Season.table(S);
    const big = S.clubs[opp].rep >= S.clubs[S.user].rep + 1 || tab.findIndex(r => r.id === opp) < 3;
    const L = state(S);
    if (!big || (L.lastAsk != null && S.week - L.lastAsk < 6 && S.week >= L.lastAsk) || Math.random() > 0.16) return;
    if (!actReady(S, 'bbq') && !actReady(S, 'dayoff')) return;
    L.lastAsk = S.week;
    const cap = W().squad(S, S.user).filter(p => hasTrait(S, p.id, 'leader')).sort((a, b) => b.ovr - a.ovr)[0] || W().squad(S, S.user).sort((a, b) => b.age - a.age)[0];
    TL.Game.mail(S, `Los capitanes proponen algo antes del ${S.clubs[opp].name}`, `${cap ? cap.short : 'El capitán'} viene de parte del grupo: "Míster, se viene un partido gordo. ¿Hacemos algo para unirnos?"`, 'decision',
      { ev: 'lk_act', pid: cap ? cap.id : null, opts: [['bbq', `Barbacoa (${U.money(actCost(S, 'bbq'))})`], ['dayoff', 'Día libre'], ['retreat', `Concentración (${U.money(actCost(S, 'retreat'))})`], ['no', 'A entrenar']] });
  }

  /** Semana: ofertas del ojeador y propuestas de los capitanes. */
  function weekly(S) {
    state(S);
    scoutOffer(S);
    preMatch(S);
  }

  /** Fin de temporada: la joya de la cantera, si toca, y los rasgos de los veteranos. */
  function seasonEnd(S) {
    const L = state(S);
    const sq = W().squad(S, S.user);
    // Líderes: los veteranos con galones
    for (const p of sq) if (p.age >= 30 && p.ovr >= S.clubs[S.user].rep - 2 && !hasTrait(S, p.id, 'leader') && Math.random() < 0.25) addTrait(S, p.id, 'leader');
    if (S.season + 1 >= L.nextGem) {
      makeGem(S);
      L.nextGem = S.season + 1 + U.int(5, 10);
    }
    L.posApps = {};
    // Limpieza: relaciones de jugadores que ya no están
    const ids = new Set(sq.map(p => p.id));
    for (const k in L.rel) { const [a, b] = k.split('_').map(Number); if (!ids.has(a) && !ids.has(b)) delete L.rel[k]; }
    for (const k in L.boss) if (!ids.has(+k)) delete L.boss[k];
  }

  // ------------------------------------------------------------ Reuniones que pides tú
  function enemyOf(S, p) {
    return W().squad(S, S.user).filter(q => q.id !== p.id).map(q => [q, rel(S, p.id, q.id)]).filter(r => r[1] <= -30).sort((a, b) => a[1] - b[1]).map(r => r[0])[0] || null;
  }
  function meetOptions(S, p) {
    const o = [['praise', 'Elogiarle', 'Sube su moral y vuestra relación.'], ['demand', 'Exigirle más', 'Puede picarse para bien… o tomárselo mal.'], ['future', 'Hablar de su futuro', 'Te cuenta qué quiere y cómo se siente.']];
    const en = enemyOf(S, p);
    if (en) o.push(['reconcile', `Mediar con ${en.short}`, 'Intentar que hagan las paces.']);
    if (hasTrait(S, p.id, 'ego')) o.push(['ego', 'Hablar de su ego', 'Que entienda que el equipo va primero.']);
    return o;
  }
  function meet(S, p, k) {
    const L = state(S);
    L.met = L.met || {};
    L.met[p.id] = S.week;
    const b = boss(S, p.id), m = p.mor == null ? 70 : p.mor;
    const again = (L.praised || (L.praised = {}))[p.id] != null && S.week - L.praised[p.id] < 8 && S.week >= L.praised[p.id];
    if (k === 'praise') {
      L.praised[p.id] = S.week;
      if (b < -40) { mor(p, 1); return { msg: `${p.short} escucha sin mirarte. "Ya, míster". Vuestra relación necesita algo más que palabras.` }; }
      if (again) { mor(p, 1); return { msg: `"Gracias, míster… otra vez". Los elogios repetidos pierden fuerza.` }; }
      mor(p, 7); bossAdd(S, p.id, 6);
      return { msg: `${p.short} sale del despacho con una sonrisa. "Gracias, míster, no le voy a fallar".`, good: true };
    }
    if (k === 'demand') {
      if (m >= 60 && b >= -10 && Math.random() < 0.6) { mor(p, 4); bossAdd(S, p.id, 2); return { msg: `${p.short} aprieta los dientes: "Tiene razón. Va a ver lo que soy capaz de hacer".`, good: true }; }
      mor(p, -8); bossAdd(S, p.id, -7);
      return { msg: `${p.short} se lo toma como algo personal y se marcha dando un portazo.`, bad: true };
    }
    if (k === 'future') {
      const st = S.stats[p.id] || [0], share = st[0] / Math.max(1, S.week);
      const sq = W().squad(S, S.user).sort((a, c) => c.ovr - a.ovr), r = sq.findIndex(q => q.id === p.id);
      let want;
      if (onLoan(S, p.id)) want = 'Está a gusto, pero sabe que en verano vuelve a su club.';
      else if (m < 40) want = 'No es feliz aquí. Si no cambia algo, pedirá salir.';
      else if (share < 0.35 && r < 16 && S.week >= 4) want = p.age <= 22 ? 'Quiere jugar. Si no hay sitio, prefiere salir cedido.' : 'Quiere más minutos: cree que merece jugar.';
      else if (p.contract <= S.season + 1) want = 'Le gustaría renovar antes de que acabe su contrato.';
      else if (p.age >= 32) want = 'Piensa en sus últimos años de carrera; le haría ilusión quedarse en el club después, como técnico.';
      else want = 'Está contento con su papel y con el grupo.';
      const fr = W().squad(S, S.user).filter(q => q.id !== p.id).map(q => [q, rel(S, p.id, q.id)]).sort((a, c) => c[1] - a[1])[0];
      bossAdd(S, p.id, 2);
      return { msg: `${want}${fr && fr[1] >= 40 ? ` Su mejor amigo en el vestuario es ${fr[0].short}.` : ''} Relación contigo: ${bossLabel(boss(S, p.id)).toLowerCase()}.` };
    }
    if (k === 'reconcile') {
      const en = enemyOf(S, p);
      if (!en) return { msg: 'Ya no hay nada que arreglar.' };
      if (Math.random() < 0.55 + b / 300) { bond(S, p.id, en.id, 40); mor(p, 3); mor(en, 3); return { msg: `${p.short} y ${en.short} se dan la mano delante de ti. El vestuario lo agradece.`, good: true }; }
      bond(S, p.id, en.id, -8);
      return { msg: `La reunión sube de tono: ${p.short} y ${en.short} siguen sin soportarse.`, bad: true };
    }
    if (k === 'ego') {
      if (Math.random() < (b >= 10 ? 0.45 : 0.22)) { convertEgo(S, p); return { msg: `${p.short} se queda pensativo: "Si el equipo gana, yo gano". Algo ha cambiado.`, good: true }; }
      mor(p, -3);
      return { msg: `"Un delantero tiene que ser egoísta, míster". No le convences… todavía. Un padrino con galones podría ayudar.` };
    }
    return { msg: '' };
  }

  // ------------------------------------------------------------ Decisiones (despacho)
  const mor = (p, d) => { p.mor = U.clamp((p.mor == null ? 70 : p.mor) + d, 0, 100); };
  const DEC = {
    lk_minutes: { opts: [
      ['promise', 'Prometerle minutos', (S, p) => { state(S).promises.push({ pid: p.id, apps0: appsOf(S, p.id), need: 2, until: S.week + 4 }); mor(p, 10); bossAdd(S, p.id, 4); return 'Le prometes jugar al menos 2 de los próximos 4 partidos. No le falles.'; }],
      ['patience', 'Pedirle paciencia', (S, p) => { if (boss(S, p.id) >= 20) { mor(p, 3); return 'Confía en ti y lo acepta.'; } mor(p, -6); bossAdd(S, p.id, -5); return 'Sale del despacho de morros.'; }],
      ['list', 'Ponerle en venta', (S, p) => { p.listed = true; mor(p, 5); return 'Lo pones en la lista de transferibles.'; }],
      ['talk', 'Explicarle su papel', (S, p) => { if (Math.random() < 0.55) { mor(p, 4); bossAdd(S, p.id, 4); return 'Entiende su papel en el equipo.'; } mor(p, -4); return 'No le convences.'; }]
    ] },
    lk_loan: { opts: [
      ['loan', 'Buscarle una cesión', (S, p) => { const r = loanOut(S, p); return r.msg; }],
      ['loanLater', 'Cederle en el próximo mercado', (S, p) => { mor(p, 3); (state(S).loanLater || (S.lk.loanLater = [])).push(p.id); return 'Le buscarás equipo en cuanto abra el mercado.'; }],
      ['promise', 'Prometerle minutos', (S, p) => { state(S).promises.push({ pid: p.id, apps0: appsOf(S, p.id), need: 2, until: S.week + 4 }); mor(p, 8); return 'Le prometes minutos en las próximas 4 jornadas.'; }],
      ['refuse', 'Negarte', (S, p) => { mor(p, -10); bossAdd(S, p.id, -10); return 'Se queda, pero muy molesto.'; }]
    ] },
    lk_raise: { opts: [
      ['renew', 'Renovarle ya', (S, p) => { const y = TL.Market.renewOptions(S, p); if (!y.length) return 'Ya tiene contrato largo.'; const r = TL.Market.renew(S, p, y[Math.min(1, y.length - 1)]); bossAdd(S, p.id, 10); return r.msg; }],
      ['later', 'Hablarlo en verano', (S, p) => { mor(p, -4); return 'Lo aplazas. Su agente no está contento.'; }],
      ['no', 'No hay renovación', (S, p) => { mor(p, -10); bossAdd(S, p.id, -12); return 'Se siente infravalorado.'; }]
    ] },
    lk_ego: { opts: [
      ['talk', 'Hablar con él', (S, p) => { const ch = boss(S, p.id) >= 10 ? 0.5 : 0.25; if (Math.random() < ch) { convertEgo(S, p); return '¡Lo entiende! A partir de ahora juega para el equipo.'; } mor(p, -3); return 'Te escucha, pero sigue a lo suyo. Quizá un buen padrino le ayude.'; }],
      ['let', 'Dejarle ser', (S, p) => { W().squad(S, S.user).forEach(q => { if (q !== p) bond(S, p.id, q.id, -4); }); mor(p, 4); return 'Sigue tirando a puerta… y el vestuario murmura.'; }],
      ['bench', 'Mandarle al banquillo', (S, p) => { mor(p, -12); bossAdd(S, p.id, -10); if (Math.random() < 0.3) { convertEgo(S, p); return 'Le duele, pero aprende la lección.'; } return 'Se lo toma fatal.'; }]
    ] },
    lk_act: { opts: [
      ['bbq', 'Barbacoa', (S) => activity(S, 'bbq', true).msg],
      ['dayoff', 'Día libre', (S) => activity(S, 'dayoff', true).msg],
      ['retreat', 'Concentración', (S) => activity(S, 'retreat', true).msg],
      ['no', 'A entrenar', (S) => { W().squad(S, S.user).forEach(p => mor(p, -1)); return 'Toca trabajar. Algunos lo entienden, otros no tanto.'; }]
    ] },
    lk_scout: { opts: [
      ['sign', 'Ficharle', (S, p, q, data) => {
        const fee = data.fee || 0;
        if (TL.Commerce.transferBudget(S) < fee) return 'No tienes presupuesto para traerle.';
        const c = S.clubs[S.user];
        p.club = S.user; p.contract = S.season + 4; p.wage = F.wageFor(p.ovr, p.age, S.leagues[c.league].wealth, S.econ.wage);
        c.cash -= fee; S.fin.buys += fee; p.mor = 82;
        W().dirty(S); TL.Commerce.refreshBudget(S);
        TL.News.add(S, 'fichajes', `${c.name} ficha a la promesa ${p.name}`, `Llega con ${p.age} años y fama de jugador especial.`, S.user, p.id, 'pos');
        return `${p.name} ya es tuyo. Mira su ficha: tiene un rasgo especial.`;
      }],
      ['pass', 'Dejarlo pasar', (S, p) => {
        const L = TL.World.userLeague(S);
        const rival = S.clubs[U.pick(L.clubs.filter(id => id !== S.user))];
        p.club = rival.id; p.contract = S.season + 3; p.wage = F.wageFor(p.ovr, p.age, S.leagues[rival.league].wealth, S.econ.wage);
        W().dirty(S);
        TL.News.add(S, 'fichajes', `${rival.name} ficha a la promesa ${p.name}`, `Un rival de tu liga se adelanta y se lleva al chaval del que hablaba tu ojeador.`, rival.id, p.id, 'neu');
        return `Se lo lleva el ${rival.name}. Ya lo verás enfrente.`;
      }]
    ] },
    lk_staff: { opts: [
      ['youth', 'Entrenador de juveniles', (S, p) => hire(S, p, 'youth')],
      ['assistant', 'Segundo entrenador', (S, p) => hire(S, p, 'assistant')],
      ['gk', 'Entrenador de porteros', (S, p) => hire(S, p, 'gk')],
      ['farewell', 'Homenaje y despedida', (S, p) => { if (S.com) S.com.fans = Math.round(S.com.fans * 1.01); W().squad(S, S.user).forEach(q => mor(q, 2)); return `Homenaje a ${p.short} antes del primer partido. La afición se lo agradece.`; }]
    ] }
  };
  function hire(S, p, role) {
    const L = state(S);
    L.staff = L.staff.filter(s => s.role !== role);
    L.staff.push({ name: p.name, role, from: p.id, s: S.season });
    return `${p.name} se incorpora como ${STAFF[role].name.toLowerCase()}: ${STAFF[role].desc}.`;
  }

  // Con el mercado abierto, los que pidieron cesión se ceden
  function windowStart(S) {
    const L = state(S);
    if (!L.loanLater || !L.loanLater.length || !TL.Market.windowOpen(S)) return;
    for (const pid of L.loanLater.splice(0)) {
      const p = S.players[pid];
      if (p && p.club === S.user) { const r = loanOut(S, p); TL.Game.mail(S, 'Cesión prometida', r.msg, r.ok ? 'market' : 'club'); }
    }
  }

  /** Los ids de jugador cambian al compactar la lista cada verano: se traducen todas las referencias. */
  function remap(S, map) {
    const L = state(S);
    const id = v => (map.has(+v) ? map.get(+v) : null);
    const byKey = obj => { const out = {}; for (const k in obj) { const n = id(k); if (n != null) out[n] = obj[k]; } return out; };
    L.tr = byKey(L.tr); L.gems = byKey(L.gems); L.focus = byKey(L.focus); L.boss = byKey(L.boss); L.asked = byKey(L.asked || {});
    const men = {};
    for (const k in L.mentor) { const a = id(k), b = id(L.mentor[k]); if (a != null && b != null) men[a] = b; }
    L.mentor = men;
    const rel = {};
    for (const k in L.rel) { const [a, b] = k.split('_'); const x = id(a), y = id(b); if (x != null && y != null) rel[key(x, y)] = L.rel[k]; }
    L.rel = rel;
    L.promises = L.promises.map(p => Object.assign(p, { pid: id(p.pid) })).filter(p => p.pid != null);
    L.loans = L.loans.map(l => Object.assign(l, { pid: id(l.pid) })).filter(l => l.pid != null);
    L.loanLater = (L.loanLater || []).map(id).filter(v => v != null);
    L.staff.forEach(s => { s.from = id(s.from); });
    L._fx = null;
  }

  function init(S) {
    const L = state(S);
    L._fx = null;
    for (const id in L.tr) if (L.tr[id].includes('dnaTotal') && S.players[id]) S.players[id].anyPos = true;
    if (TL.News && TL.News.EV) Object.assign(TL.News.EV, DEC);
  }

  TL.Locker = {
    TRAITS, DNA, FOCUS, STAFF, ACT, init, state, remap, traits, hasTrait, addTrait, fx, rel, bond, boss, bossAdd, relLabel, bossLabel, chem, pairs,
    canMentor, canBePupil, pupilsOf, setMentor, staffBonus, growth, afterDevelop, onRetire, makeGem,
    onLoan, loanOf, loanOut, loanIn, loanable, recall, endLoans, activity, actCost, actReady, matchBoost,
    afterRound, weekly, seasonEnd, windowStart, DEC, meetOptions, meet
  };
  if (TL.News && TL.News.EV) Object.assign(TL.News.EV, DEC);
})();
