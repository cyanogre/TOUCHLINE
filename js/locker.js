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
  /** Texto en masculino o femenino según la competición («un chaval» / «una chavala»). */
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);

  // ------------------------------------------------------------ Rasgos
  // eff: shot (peso para tirar), conv (acierto), assist (peso para asistir), fouled (faltas recibidas),
  //      save (multiplica el acierto rival), mid/att/def (fuerza del equipo), team (multiplicador), any (juega en cualquier puesto)
  const TRAITS = {
    ego: { name: 'Ego de goleador', icon: '🔥', desc: 'Delantero letal y egoísta: tira siempre. Marca más, asiste menos y se enfada si no juega. Toca reconducirlo.', nameF: 'Ego de goleadora', descF: 'Delantera letal y egoísta: tira siempre. Marca más, asiste menos y se enfada si no juega. Toca reconducirla.', eff: { shot: 1.7, conv: 1.1, assist: 0.4 } },
    egoTeam: { name: 'Ego al servicio del equipo', icon: '👑', desc: 'Sigue teniendo hambre de gol, pero ahora juega para los demás.', eff: { shot: 1.4, conv: 1.08, assist: 1.25 } },
    vision: { name: 'Visión periférica', icon: '👁️', desc: 'Ve el campo desde arriba. Más asistencias; reconvertido a lateral o pivote, se dispara.', descF: 'Ve el campo desde arriba. Más asistencias; reconvertida a lateral o pivote, se dispara.', eff: { assist: 1.6, mid: 0.4 } },
    dribble: { name: 'Regate de ensueño', icon: '🌀', desc: 'Se va de tres como si nada. Recibe muchas faltas y marca goles imposibles.', eff: { fouled: 1.6, conv: 1.04 } },
    tiger: { name: 'Disparo del tigre', icon: '🐯', desc: 'Un cañonazo que deja temblando la red, incluso desde fuera del área.', eff: { conv: 1.07, shot: 1.2 } },
    cat: { name: 'Reflejos de gato', icon: '🧤', desc: 'Portero de reflejos imposibles. Dicen que no se quita la gorra ni para dormir.', descF: 'Portera de reflejos imposibles. Dicen que no se quita la gorra ni para dormir.', eff: { save: 0.9 } },
    leader: { name: 'Líder del vestuario', icon: '🎖️', desc: 'Sostiene la moral del grupo y es el mejor padrino para los jóvenes.', descF: 'Sostiene la moral del grupo y es la mejor madrina para las jóvenes.', eff: { team: 1.008 } },
    dnaTotal: { name: 'ADN: Fútbol total', icon: '🌟', desc: 'Juega en cualquier puesto como si fuera el suyo.', eff: { any: true, mid: 0.5, assist: 1.2 } },
    dnaLibero: { name: 'ADN: Líbero de época', icon: '🌟', desc: 'Defiende con elegancia y sale jugando como un centrocampista más.', descF: 'Defiende con elegancia y sale jugando como una centrocampista más.', eff: { def: 0.6, mid: 0.5, assist: 1.3 } },
    dnaMagic: { name: 'ADN: Genio del regate', icon: '🌟', desc: 'Regate, pausa y gol. Imparable en el uno contra uno.', eff: { fouled: 1.5, conv: 1.08, shot: 1.2 } },
    dnaWall: { name: 'ADN: Muro bajo palos', icon: '🌟', desc: 'Un portero de los que ganan ligas.', descF: 'Una portera de las que ganan ligas.', eff: { save: 0.85 } },
    dnaNine: { name: 'ADN: Nueve de leyenda', icon: '🌟', desc: 'Huele el gol: siempre está donde cae el balón.', eff: { shot: 1.45, conv: 1.12 } },
    dnaBrain: { name: 'ADN: Cerebro del equipo', icon: '🌟', desc: 'Dirige el juego: todo pasa por sus botas.', eff: { assist: 1.6, mid: 0.8 } },
    // Doble filo: ayudan en el campo… y de vez en cuando la lían (ver js/events.js)
    hothead: { name: 'Sangre caliente', icon: '🌋', edge: true, desc: 'Va a todas: gana duelos y contagia intensidad, pero comete más faltas, ve más tarjetas y se encara con cualquiera.', eff: { def: 0.35, att: 0.15, foul: 1.6, card: 1.5 } },
    party: { name: 'Alma de la fiesta', icon: '🎉', edge: true, desc: 'Une al vestuario y lo pasa en grande… a veces demasiado: le persiguen las noches largas y los fotógrafos.', eff: { team: 1.006 } },
    diva: { name: 'Estrella mediática', icon: '📸', edge: true, desc: 'Vende camisetas y se crece ante las cámaras, pero exige protagonismo y no lleva nada bien el banquillo.', eff: { conv: 1.04, fouled: 1.25 } },
    reborn: { name: 'Reencarnación', icon: '🌀', edge: true, desc: 'Juega como una leyenda de otra época… y carga con su sombra: presión, comparaciones y días en que la leyenda no aparece.', eff: { conv: 1.03, assist: 1.05 } },
    limitBreak: { name: 'Límite roto', icon: '💥', desc: 'Rompió su techo: juega con un aura distinta y crece a toda velocidad hacia su nuevo potencial.', eff: { conv: 1.04, assist: 1.1, team: 1.003 } }
  };
  TRAITS.ego.edge = true;

  // Joyas con ADN de leyenda: dónde deben jugar y qué entrenamiento las despierta
  const DNA = {
    total: { name: 'Fútbol total', pos: ['CAM', 'CM', 'ST', 'RW', 'LW'], focus: 'tactica', trait: 'dnaTotal', hint: 'Necesita jugar arriba o en la medular y entrenar la táctica.' },
    libero: { name: 'Líbero de época', pos: ['CB', 'CDM'], focus: 'tactica', trait: 'dnaLibero', hint: 'Necesita jugar de central o pivote y entrenar la táctica.' },
    magic: { name: 'Genio del regate', pos: ['RW', 'LW', 'CAM', 'ST'], focus: 'tecnica', trait: 'dnaMagic', hint: 'Necesita jugar en banda o de mediapunta y entrenar la técnica.' },
    wall: { name: 'Muro bajo palos', pos: ['GK'], focus: 'porteria', trait: 'dnaWall', hint: 'Necesita jugar en la portería y entrenar específico de porteros.' },
    nine: { name: 'Nueve de leyenda', pos: ['ST'], focus: 'remate', trait: 'dnaNine', hint: 'Necesita jugar de delantero centro y entrenar el remate.', hintF: 'Necesita jugar de delantera centro y entrenar el remate.' },
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
    youth: { name: 'Entrenador de juveniles', nameF: 'Entrenadora de juveniles', desc: '+12% de crecimiento de los jóvenes' },
    assistant: { name: 'Segundo entrenador', nameF: 'Segunda entrenadora', desc: 'Mejor moral semanal y charlas más eficaces' },
    gk: { name: 'Entrenador de porteros', nameF: 'Entrenadora de porteras', desc: '+20% de crecimiento de los porteros', descF: '+20% de crecimiento de las porteras' }
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
  /** Rasgo con su nombre y descripción en el género de la competición. */
  function traitInfo(S, k) {
    const t = TRAITS[k];
    return t && S && S.gender === 'F' ? Object.assign({}, t, { name: t.nameF || t.name, desc: t.descF || t.desc }) : t;
  }
  const dnaHint = (S, d) => gx(S, d.hint, d.hintF || d.hint);
  function traits(S, pid) { return (S.lk && S.lk.tr[pid]) || []; }
  function hasTrait(S, pid, t) { return traits(S, pid).includes(t); }
  function addTrait(S, pid, t) {
    const L = state(S); const a = L.tr[pid] || (L.tr[pid] = []); if (!a.includes(t)) a.push(t); L._fx = null;
    if (t === 'dnaTotal' && S.players[pid]) S.players[pid].anyPos = true;
  }
  function removeTrait(S, pid, t) { const L = state(S); L.tr[pid] = (L.tr[pid] || []).filter(x => x !== t); L._fx = null; }

  /** Efectos combinados de los rasgos de un jugador, su alma y su objeto (o null). */
  function fx(S, pid) {
    const L = S.lk;
    if (!L) return null;
    if (!L._fx) L._fx = {};
    if (!(pid in L._fx)) {
      const effs = [];
      for (const t of L.tr[pid] || []) { const e = TRAITS[t] && TRAITS[t].eff; if (e) effs.push(e); }
      if (TL.Events) effs.push(...TL.Events.effs(S, pid));
      let out = null;
      for (const e of effs) {
        out = out || {};
        for (const k in e) {
          if (typeof e[k] === 'boolean') out[k] = true;
          else if (['mid', 'att', 'def'].includes(k)) out[k] = (out[k] || 0) + e[k];
          else out[k] = (out[k] || 1) * e[k];
        }
      }
      L._fx[pid] = out;
    }
    return L._fx[pid];
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
    if (mentor == null) { delete L.mentor[pupil]; return { ok: true, msg: gx(S, 'Sin padrino.', 'Sin madrina.') }; }
    const m = S.players[mentor], p = S.players[pupil];
    if (!m || !p || !canMentor(S, m) || !canBePupil(S, p)) return { ok: false, msg: 'No puede ser.' };
    if (pupilsOf(S, mentor).length >= 2) return { ok: false, msg: `${m.short} ya apadrina a dos jóvenes.` };
    L.mentor[pupil] = mentor;
    bond(S, pupil, mentor, 15);
    return { ok: true, msg: `${m.short} será ${gx(S, 'el padrino', 'la madrina')} de ${p.short}.` };
  }
  function staffBonus(S) {
    const q = r => (TL.Staff ? TL.Staff.lv(S, r) : 0);
    return { youth: 1 + 0.05 * q('youth'), gk: 1 + 0.08 * q('gk'), assistant: q('assistant') > 0 };
  }

  /** Multiplicador de crecimiento para develop(): padrino, entrenamiento, cuerpo técnico, ADN. */
  function growth(S, p) {
    if (!S.lk || p.club !== S.user) return 1;
    let g = 1;
    const m = S.lk.mentor[p.id];
    if (m != null && S.players[m] && S.players[m].club === S.user) g *= F.LINE[S.players[m].pos] === F.LINE[p.pos] ? 1.3 : 1.18;
    if (S.lk.focus[p.id]) g *= 1.1;
    if (TL.Staff) g *= TL.Staff.growth(S, p);
    if (hasTrait(S, p.id, 'vision') && ['RB', 'LB', 'CDM'].includes(p.pos)) g *= 1.25; // reconvertido, como debe ser
    if (TL.Events && TL.Events.isLB(S, p.id) && p.ovr < p.pot) g *= 2.2; // límite roto: se dispara
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
        TL.Game.mail(S, `${p.short} aprende de ${S.players[m].short}`, `Tras una temporada a su lado, ${p.name} ha heredado «${traitInfo(S, t).name}» de su ${gx(S, 'padrino', 'madrina')}.`, 'good');
      }
      // El ego se reconduce con un buen padrino
      if (hasTrait(S, p.id, 'ego') && hasTrait(S, m, 'leader') && Math.random() < 0.4) convertEgo(S, p);
    }
    if (p.age > 21) delete L.mentor[p.id];
    gemSeason(S, p);
  }

  function convertEgo(S, p) {
    removeTrait(S, p.id, 'ego'); addTrait(S, p.id, 'egoTeam');
    TL.News.add(S, 'positivo', `${p.short} ya juega para el equipo`, `${gx(S, 'El delantero', 'La delantera')} que solo pensaba en el gol ahora también asiste. "He entendido que el ego se pone al servicio de todos", dice ${p.name}.`, S.user, p.id, 'pos');
    TL.Game.mail(S, `${p.short} ha cambiado`, `${p.name} ha reconducido su ego: sigue teniendo hambre de gol, pero ya no se olvida de sus compañeros.`, 'good');
  }

  /** Un veterano cuelga las botas: puede entrar en el cuerpo técnico. */
  function onRetire(S, p) {
    const L = state(S);
    const had = pupilsOf(S, p.id).length > 0 || hasTrait(S, p.id, 'leader') || p.ovr >= S.clubs[S.user].rep;
    for (const k of pupilsOf(S, p.id)) delete L.mentor[k];
    if (!had) return;
    const opts = [['youth', gx(S, 'Entrenador de juveniles', 'Entrenadora de juveniles')], ['assistant', gx(S, 'Segundo entrenador', 'Segunda entrenadora')]];
    if (p.pos === 'GK') opts.unshift(['gk', gx(S, 'Entrenador de porteros', 'Entrenadora de porteras')]);
    opts.push(['farewell', 'Homenaje y despedida']);
    TL.Game.mail(S, `${p.short} cuelga las botas`, `${p.name} se retira a los ${p.age} años. Conoce la casa y a ${gx(S, 'los chavales', 'las chavalas')}. ¿Le ofreces un puesto en tu cuerpo técnico?`, 'decision',
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
    TL.Game.mail(S, gx(S, 'En la cantera hay un chaval distinto', 'En la cantera hay una chavala distinta'), `Los técnicos de la cantera no paran de hablar de ${p.name} (${p.age} años, ${F.POS_ES[pos]}). "Tiene algo que no se enseña", dicen. Dale minutos en su sitio y un plan de entrenamiento: puede ser algo muy grande.`, 'good');
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
      TL.News.add(S, 'positivo', `${p.short}, la joya de la cantera`, `La prensa ya ${gx(S, 'le', 'la')} compara con las leyendas: "Tiene el ${d.name.toLowerCase()} de los genios de antes". Su techo parece altísimo.`, S.user, pid, 'pos');
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
      TL.Game.mail(S, `🌟 ${p.short} desbloquea su ADN`, `Ha jugado en su sitio y ha entrenado lo que necesitaba: ${p.name} gana «${traitInfo(S, d.trait).name}». Su potencial ya no tiene techo.`, 'good');
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
    { trait: 'dribble', pos: ['CAM', 'RW', 'LW'], from: 'Japón', title: 'Un regate de dibujos animados', body: n => `Tu ojeador en Japón ha visto a ${n}, un chaval que juega con el balón pegado al pie y que dice que "el balón es su amigo". Se va de tres como si nada.`,
      bodyF: n => `Tu ojeador en Japón ha visto a ${n}, una chavala que juega con el balón pegado al pie y que dice que "el balón es su amigo". Se va de tres como si nada.` },
    { trait: 'cat', pos: ['GK'], from: 'Japón', title: 'Un portero que no se deja meter goles', body: n => `Desde Japón llega el informe de ${n}, un portero de reflejos imposibles que nunca se quita la gorra. Asegura que no encajará ni un gol desde fuera del área.`,
      titleF: 'Una portera que no se deja meter goles', bodyF: n => `Desde Japón llega el informe de ${n}, una portera de reflejos imposibles que nunca se quita la gorra. Asegura que no encajará ni un gol desde fuera del área.` },
    { trait: 'ego', pos: ['ST'], from: 'Japón', title: 'El delantero más egoísta', body: n => `${n} sale de un programa experimental japonés que encerró a cientos de delanteros para fabricar al más egoísta. Marca muchísimo, pero no se la pasa a nadie. Habrá que reconducirle.`,
      titleF: 'La delantera más egoísta', bodyF: n => `${n} sale de un programa experimental japonés que encerró a cientos de delanteras para fabricar a la más egoísta. Marca muchísimo, pero no se la pasa a nadie. Habrá que reconducirla.` },
    { trait: 'vision', pos: ['ST', 'CAM'], from: 'Japón', title: 'Un chaval que lo ve todo', body: n => `${n} juega de delantero en un equipo modesto, pero tu ojeador cree que su visión de juego es de otro planeta. "Quizá rinda aún más de lateral", apunta en el informe.`,
      titleF: 'Una chavala que lo ve todo', bodyF: n => `${n} juega de delantera en un equipo modesto, pero tu ojeador cree que su visión de juego es de otro planeta. "Quizá rinda aún más de lateral", apunta en el informe.` },
    { trait: 'tiger', pos: ['ST'], from: null, title: 'Un disparo que asusta', body: n => `Tu ojeador ha encontrado a ${n}, un delantero con un disparo tan potente que los porteros del juvenil se apartan.`,
      bodyF: n => `Tu ojeador ha encontrado a ${n}, una delantera con un disparo tan potente que las porteras del juvenil se apartan.` }
  ];

  function scoutOffer(S) {
    const L = state(S);
    if (S.season < L.nextScout || S.week !== 2) return;
    L.nextScout = S.season + 1;
    if (Math.random() > 0.45 + 0.08 * (TL.Staff ? TL.Staff.lv(S, 'scout') : 0)) return;
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
    const fem = S.gender === 'F';
    TL.Game.mail(S, `Informe del ojeador: ${((fem && sc.titleF) || sc.title).toLowerCase()}`, ((fem && sc.bodyF) || sc.body)(p.name) + ` Puedes ${gx(S, 'traerle', 'traerla')} por ${U.money(fee)}.`, 'decision', { ev: 'lk_scout', pid: p.id, fee, opts: [['sign', `${gx(S, 'Ficharle', 'Ficharla')} (${U.money(fee)})`], ['pass', 'Dejarlo pasar']] });
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

  /** Foto de sus números al empezar la cesión: así se ve lo que hace en su nuevo club. */
  function statSnap(S, p) { const st = S.stats[p.id] || []; return [st[0] || 0, st[1] || 0, st[2] || 0, st[3] || 0]; }

  function loanOut(S, p) {
    const M = TL.Market;
    if (!M.windowOpen(S)) return { ok: false, msg: 'Las cesiones se cierran con el mercado abierto.' };
    if (p.club !== S.user || onLoan(S, p.id)) return { ok: false, msg: 'No puedes cederle.' };
    if (W().squad(S, S.user).length <= 17) return { ok: false, msg: 'Te quedarías con muy pocos jugadores.' };
    const dest = loanDest(S, p);
    if (!dest) return { ok: false, msg: 'Ningún club encaja para darle minutos.' };
    const fee = F.roundMoney(W().value(S, p) * U.rand(0.03, 0.08));
    TL.Market.logMove(S, p, S.user, dest.id, fee, 'loan');
    state(S).loans.push({ pid: p.id, from: S.user, to: dest.id, s: S.season, w: S.week, o0: p.ovr, a0: statSnap(S, p) });
    p.club = dest.id; p.listed = false;
    S.clubs[S.user].cash += fee; dest.cash -= fee;
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    delete S.lk.mentor[p.id];
    W().dirty(S);
    TL.Commerce.refreshBudget(S);
    TL.News.add(S, 'fichajes', `${p.short}, cedido al ${dest.name}`, `${S.clubs[S.user].name} cede a ${p.name} hasta final de temporada para que sume minutos. El ${dest.name} paga su ficha${fee ? ' y ' + U.money(fee) : ''}.`, S.user, p.id, 'neu');
    bossAdd(S, p.id, 5); p.mor = Math.min(100, (p.mor || 70) + 6);
    return { ok: true, msg: `${p.short} ${gx(S, 'cedido', 'cedida')} al ${dest.name}${fee ? ' · +' + U.money(fee) : ''}. ${gx(S, 'Síguele', 'Síguela')} en Mercado → Cesiones.` };
  }

  /** Cuota de partidos jugados esta temporada (null si aún es pronto para saberlo). */
  function minutesShare(S, p) {
    // Solo los partidos de tu liga se juegan uno a uno: fuera de ella no hay minutos que contar
    if (S.week < 4 || p.club < 0 || S.clubs[p.club].league !== S.clubs[S.user].league) return null;
    return ((S.stats[p.id] || [0])[0]) / Math.max(1, S.week);
  }

  /**
   * ¿Por qué dejaría su club que se vaya cedido? (o null si cuenta con él)
   *  listed: está en venta · unhappy: no juega o no está a gusto · young: joven que necesita minutos · surplus: le sobra
   */
  function loanWhy(S, p) {
    const sq = W().squad(S, p.club).sort((a, b) => b.ovr - a.ovr);
    const rank = sq.findIndex(x => x.id === p.id);
    if (p.sale && p.sale.r === 'unhappy') return 'unhappy';
    if (p.listed || p.sale) return 'listed';
    const share = minutesShare(S, p);
    const unhappy = (p.mor != null && p.mor < 50) || (share != null && share < 0.3 && rank < 16);
    if (unhappy && rank >= 5) return 'unhappy';
    if (p.age <= 21 && p.pot >= p.ovr + 5 && rank >= 9) return 'young';
    if (rank >= 13) return 'surplus';
    return null;
  }
  const LOAN_WHY = {
    listed: 'Está en venta: su club prefiere que juegue fuera antes que tenerle parado.',
    unhappy: 'No está a gusto: apenas juega y su club quiere quitarse parte de la ficha.',
    young: 'Es un talento joven: su club quiere que sume minutos y crezca.',
    surplus: 'No entra en los planes del míster: le sobra en la plantilla.'
  };

  const LOAN_MAX = 3; // cedidos a la vez en tu plantilla

  /** Condiciones de su club para dejártelo cedido hasta final de temporada. */
  function loanTerms(S, p) {
    if (p.club < 0 || p.club === S.user || onLoan(S, p.id)) return { ok: false, reason: 'No se puede ceder.' };
    const club = S.clubs[p.club];
    if (W().squad(S, p.club).length <= 20) return { ok: false, reason: `${club.name} tiene la plantilla corta.` };
    const why = loanWhy(S, p);
    if (!why) return { ok: false, reason: `${club.name} cuenta con ${gx(S, 'él', 'ella')}: no ${gx(S, 'lo', 'la')} cede.` };
    if (why === 'young') {
      // Nadie presta a su joya para que chupe banquillo: tiene que entrar en tu rotación
      const line = F.LINE[p.pos];
      const mine = W().squad(S, S.user).filter(x => F.LINE[x.pos] === line).sort((a, b) => b.ovr - a.ovr);
      const bar = mine[[1, 4, 4, 2][line]];
      if (bar && p.ovr < bar.ovr - 1) return { ok: false, reason: `${club.name} quiere que juegue, y contigo no tendría minutos.` };
    }
    const ws = why === 'unhappy' || why === 'listed' ? 0.6 : why === 'young' ? 0.8 : 1; // parte de la ficha que pagas tú
    const fee = why === 'young' ? 0 : F.roundMoney(W().value(S, p) * (why === 'surplus' ? 0.05 : 0.03));
    return { ok: true, why, ws, fee, wage: F.roundMoney(p.wage * ws), text: LOAN_WHY[why], needsMinutes: why === 'young' };
  }

  /** Cedido se baja de categoría con gusto si va a jugar; solo dice que no si tu club le queda muy lejos. */
  function loanWilling(S, p) {
    const to = S.clubs[S.user];
    if (p.ovr > to.rep + 11) return { ok: false, reason: `${p.short} no ve a tu club a su nivel.` };
    return { ok: true };
  }

  /** ¿Lo prestaría su club? */
  function loanable(S, p) {
    const t = loanTerms(S, p);
    return t.ok ? { ok: true } : { ok: false, reason: t.reason };
  }

  function loanIn(S, p) {
    const M = TL.Market;
    if (!M.windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    const t = loanTerms(S, p);
    if (!t.ok) return { ok: false, msg: t.reason };
    if (state(S).loans.filter(l => l.to === S.user).length >= LOAN_MAX) return { ok: false, msg: `Ya tienes ${LOAN_MAX} ${gx(S, 'cedidos', 'cedidas')} en la plantilla: es el máximo.` };
    const w = loanWilling(S, p);
    if (!w.ok) return { ok: false, msg: w.reason };
    const err = M.canAfford(S, t.fee, t.wage);
    if (err) return { ok: false, msg: err };
    const from = p.club;
    TL.Market.logMove(S, p, from, S.user, t.fee, 'loan');
    state(S).loans.push({ pid: p.id, from, to: S.user, s: S.season, w: S.week, ws: t.ws, why: t.why, o0: p.ovr, a0: statSnap(S, p) });
    S.clubs[from].cash += t.fee; S.clubs[S.user].cash -= t.fee; S.fin.buys += t.fee;
    p.club = S.user; p.listed = false; p.sale = null;
    p.mor = Math.max(p.mor == null ? 70 : p.mor, t.why === 'unhappy' ? 80 : 74);
    W().dirty(S);
    TL.Commerce.refreshBudget(S);
    const share = t.ws < 1 ? `Pagas el ${Math.round(t.ws * 100)}\u00a0% de su ficha (${U.money(t.wage)}/sem)` : `Pagas su ficha (${U.money(p.wage)}/sem)`;
    TL.News.add(S, 'fichajes', `${S.clubs[S.user].name} se hace con ${p.name}, ${gx(S, 'cedido', 'cedida')}`, `Llega ${gx(S, 'cedido', 'cedida')} desde el ${S.clubs[from].name} hasta final de temporada${t.fee ? ' por ' + U.money(t.fee) : ''}. ${share}.${t.needsMinutes ? ` Su club exige que juegue: si no, ${gx(S, 'lo repescará', 'la repescará')} en invierno.` : ''}`, S.user, p.id, 'pos');
    return { ok: true, msg: `${p.short} llega ${gx(S, 'cedido', 'cedida')} hasta final de temporada.` };
  }

  /**
   * Una jornada de tus cedidos. En tu liga los partidos se juegan de verdad y se usan sus notas;
   * el resto de ligas no se juega partido a partido, así que se estima según su rol en el equipo.
   */
  function loanWeek(S, results) {
    const L = state(S);
    const notes = {};
    for (const r of results || []) if (r && r.ratings) for (const id in r.ratings) notes[id] = r.ratings[id];
    const userLeague = S.clubs[S.user].league;
    for (const l of L.loans) {
      const p = S.players[l.pid];
      if (l.from !== S.user || !p) continue;
      const c = S.clubs[l.to];
      if (c.league === userLeague) { l.last = { r: notes[p.id] != null ? notes[p.id] : null }; continue; }
      const line = F.LINE[p.pos], xi = [1, 4, 4, 2][line];
      const rank = W().squad(S, l.to).filter(x => F.LINE[x.pos] === line && x.inj <= 0).sort((a, b) => b.ovr - a.ovr).findIndex(x => x.id === p.id);
      const pPlay = p.inj > 0 || rank < 0 ? 0 : rank < xi ? 0.88 : rank < xi + 2 ? 0.45 : 0.12;
      if (Math.random() >= pPlay) { l.last = { r: null }; continue; }
      const sim = l.sim || (l.sim = [0, 0, 0, 0]);
      const rating = Math.round(U.clamp(6.4 + (p.ovr - c.rep) * 0.07 + ((p.mor == null ? 70 : p.mor) - 70) * 0.01 + U.rand(-0.9, 0.9), 4.5, 9.6) * 10) / 10;
      const gp = [0, 0.03, 0.09, 0.3][line] * U.clamp(1 + (p.ovr - c.rep) * 0.04, 0.5, 1.8), ap = [0, 0.04, 0.1, 0.12][line];
      const g = Math.random() < gp ? (Math.random() < 0.15 ? 2 : 1) : 0, a = Math.random() < ap ? 1 : 0;
      sim[0]++; sim[1] += g; sim[2] += a; sim[3] += rating;
      l.last = { r: rating };
    }
  }

  /** Cómo le va a un cedido desde que empezó la cesión. */
  function loanReport(S, l) {
    const p = S.players[l.pid];
    const st = statSnap(S, p), a0 = l.a0 || [0, 0, 0, 0], sim = l.sim || [0, 0, 0, 0];
    const apps = Math.max(0, st[0] - a0[0]) + sim[0], goals = Math.max(0, st[1] - a0[1]) + sim[1], assists = Math.max(0, st[2] - a0[2]) + sim[2];
    const avg = apps ? (Math.max(0, st[3] - a0[3]) + sim[3]) / apps : null;
    const weeks = Math.max(0, S.week - (l.w != null ? l.w : 0));
    const share = weeks ? apps / weeks : null;
    const role = weeks < 3 ? ['new', gx(S, 'Recién llegado', 'Recién llegada')] : share >= 0.7 ? ['xi', 'Titular'] : share >= 0.35 ? ['rot', 'Rotación'] : ['bench', 'Apenas juega'];
    const o0 = l.o0 != null ? l.o0 : p.ovr;
    return { p, apps, goals, assists, avg, weeks, share, role, dOvr: p.ovr - o0 };
  }

  /** Los clubes que te dejaron a su joven vigilan sus minutos: aviso y, si no juega, repesca en invierno. */
  function loanWatch(S) {
    const L = state(S);
    const n = S.fixtures ? S.fixtures.length : 38, mid = Math.floor(n / 2);
    for (const l of L.loans.slice()) {
      if (l.to !== S.user || l.why !== 'young') continue;
      const r = loanReport(S, l);
      if (r.weeks < 5 || r.share >= 0.4) continue;
      const club = S.clubs[l.from];
      if (S.week === mid - 3 && !l.warned) {
        l.warned = true;
        TL.Game.mail(S, `${club.name}, preocupado por ${r.p.short}`, `"Os ${gx(S, 'lo', 'la')} cedimos para que jugara: ${r.apps} partidos en ${r.weeks} jornadas es muy poco." Si no le das minutos, ${gx(S, 'lo', 'la')} repescarán en el mercado de invierno.`, 'club');
      } else if (S.week === mid && l.warned) {
        endLoan(S, l, true);
        TL.News.add(S, 'fichajes', `${club.name} repesca a ${r.p.name}`, `${gx(S, 'El cedido', 'La cedida')} apenas jugaba en el ${S.clubs[S.user].name} (${r.apps} partidos) y su club rompe la cesión en invierno.`, l.from, r.p.id, 'neg');
      }
    }
    // Informe de tus cedidos cada seis jornadas
    const out = L.loans.filter(l => l.from === S.user && S.players[l.pid]);
    if (out.length && S.week >= 4 && S.week % 6 === 4) {
      const lines = out.map(l => { const r = loanReport(S, l); return `• ${r.p.short} (${S.clubs[l.to].name}): ${r.apps} partidos, ${r.goals} goles, nota ${r.avg != null ? r.avg.toFixed(1) : '—'} · ${r.role[1].toLowerCase()} · media ${r.p.ovr}${r.dOvr ? ` (${r.dOvr > 0 ? '+' : ''}${r.dOvr})` : ''}`; });
      TL.Game.mail(S, 'Informe de cesiones', lines.join('\n') + '\nTienes el seguimiento completo en Mercado → Cesiones.', 'club');
    }
  }

  /** Jugadores de otros clubes que podrías pedir cedidos (los que de verdad te reforzarían). */
  function loanCandidates(S, f) {
    f = f || {};
    const mine = W().squad(S, S.user).sort((a, b) => b.ovr - a.ovr);
    const floor = mine.length ? mine[Math.min(mine.length - 1, 15)].ovr - 2 : 0;
    const rep = S.clubs[S.user].rep;
    const out = [];
    for (const p of S.players) {
      if (p.club < 0 || p.club === S.user || p.ovr < floor || p.ovr > rep + 11) continue;
      if (f.line != null && f.line !== '' && F.LINE[p.pos] !== +f.line) continue;
      if (onLoan(S, p.id)) continue;
      const t = loanTerms(S, p);
      if (!t.ok || (f.why && f.why !== t.why)) continue;
      out.push([p, t]);
    }
    return out.sort((a, b) => b[0].ovr - a[0].ovr || b[0].pot - a[0].pot);
  }

  /** Repescar a un cedido (solo con el mercado abierto). */
  function recall(S, p) {
    const l = loanOf(S, p.id);
    if (!l || l.from !== S.user) return { ok: false, msg: gx(S, 'No está cedido por ti.', 'No está cedida por ti.') };
    if (!TL.Market.windowOpen(S)) return { ok: false, msg: gx(S, 'Solo puedes repescarle con el mercado abierto.', 'Solo puedes repescarla con el mercado abierto.') };
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
    dayoff: { name: 'Día libre', icon: '🛌', cool: 4, desc: 'Recuperan forma física y moral, pero llegan algo menos preparados al próximo partido. Algún riesgo de salir de fiesta.' },
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
    L.lastAct = L.lastAct || {};
    const again = L.lastAct[k] != null && S.season * 100 + S.week - L.lastAct[k] < 9;
    L.lastAct[k] = S.season * 100 + S.week;
    const morAdd = (d, k, txt, w) => sq.forEach(p => {
      if (TL.Social) TL.Social.remember(S, p, k, again && d > 0 ? Math.round(d / 2) : d, w, again && d > 0 ? txt + ' (otra vez…)' : txt);
      else p.mor = U.clamp((p.mor == null ? 70 : p.mor) + d, 0, 100);
    });
    let extra = '';
    if (k === 'bbq') {
      morAdd(5, 'grupo', 'La barbacoa del equipo', 2);
      for (let i = 0; i < 8; i++) { const [x, y] = U.shuffle(sq.slice()).slice(0, 2); if (x && y) bond(S, x.id, y.id, 12); }
      sq.forEach(p => bossAdd(S, p.id, 3));
      const r = Math.random();
      if (r < 0.12) { const p = U.pick(sq); extra = ` ${p.short} se proclama maestro parrillero.`; TL.News.add(S, 'positivo', `Barbacoa en el ${S.clubs[S.user].name}`, `Buen ambiente en el vestuario: ${p.name} se encargó de la parrilla.`, S.user, p.id, 'pos'); }
      else if (r < 0.17) { const [x, y] = U.shuffle(sq.slice()).slice(0, 2); bond(S, x.id, y.id, -30); extra = ` ${x.short} y ${y.short} acabaron discutiendo por una tontería.`; }
    } else if (k === 'dayoff') {
      sq.forEach(p => { p.fit = Math.min(100, p.fit + 15); });
      if (!(L.boost && L.boost.w === S.week)) L.boost = { w: S.week, v: 0.985 }; // un día sin entrenar: llegan algo menos preparados
      morAdd(3, 'descanso', 'El día libre', 2);
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
      morAdd(-1, 'concentra', 'La concentración (algo de agobio)', 1);
    }
    W().dirty(S);
    return { ok: true, msg: `${a.icon} ${a.name}${cost ? ' · ' + U.money(cost) : ''}.${extra}` };
  }
  /** Multiplicador de la concentración para el partido de esta semana. */
  function matchBoost(S) { const b = S.lk && S.lk.boost; return b && b.w === S.week ? b.v : 1; }

  // ------------------------------------------------------------ Despacho y semana a semana
  function appsOf(S, pid) { return (S.stats[pid] || [0])[0]; }

  // ------------------------------------------------------------ Desarrollo semana a semana
  // Estadísticas que más trabaja cada puesto [rit, tir, pas, reg, def, fis]
  const POS_ST = { GK: [4, 5], CB: [4, 5], RB: [0, 4], LB: [0, 4], CDM: [4, 2], CM: [2, 5], CAM: [2, 3], RM: [0, 2], LM: [0, 2], RW: [0, 3], LW: [0, 3], ST: [1, 3] };
  /** ¿Este jugador progresa semana a semana? (los tuyos y tus cedidos) */
  function grows(S, p) {
    if (p.club === S.user) return true;
    const l = loanOf(S, p.id);
    return !!(l && l.from === S.user);
  }
  function pushHist(S, p) {
    const L = state(S);
    L.ph = L.ph || {};
    const h = L.ph[p.id] || (L.ph[p.id] = []);
    const last = h[h.length - 1];
    if (last && last[0] === S.season && last[1] === S.week) last[2] = p.ovr; else h.push([S.season, S.week, p.ovr]);
    if (h.length > 60) h.splice(0, h.length - 60);
  }
  function raise(S, p, d) {
    const L = state(S);
    if (!L.ph || !L.ph[p.id]) pushHist(S, p);
    p.ovr = U.clamp(p.ovr + d, 30, 95);
    const f = L.focus[p.id] && FOCUS[L.focus[p.id]];
    const idx = f && f.st.length ? f.st : POS_ST[p.pos] || [2, 5];
    idx.forEach(i => { p.st[i] = U.clamp(p.st[i] + d, 15, 99); });
    const other = U.int(0, 5);
    if (!idx.includes(other) && Math.random() < 0.5) p.st[other] = U.clamp(p.st[other] + d, 15, 99);
    pushHist(S, p);
  }

  /** Cada jornada: minutos, nota, moral, entrenamiento, padrino y cuerpo técnico hacen crecer (o estancarse) a los jóvenes. */
  function growWeek(S, mine) {
    const L = state(S);
    L.dp = L.dp || {}; L.rh = L.rh || {}; L.month = L.month || [];
    const slots = (mine && mine.slots) || {}, ratings = (mine && mine.ratings) || {};
    const youthSkill = TL.Manager.B(S).youthGrowth;
    const out = W().squad(S, S.user).concat(L.loans.filter(l => l.from === S.user).map(l => S.players[l.pid]).filter(Boolean));
    for (const p of out) {
      const away = p.club !== S.user;
      const lw = away ? (loanOf(S, p.id) || {}).last : null; // su jornada en el club donde está cedido
      const r = away ? (lw ? lw.r : null) : ratings[p.id];
      if (r != null) { const a = L.rh[p.id] || (L.rh[p.id] = []); a.push(r); if (a.length > 12) a.shift(); }
      const lb = TL.Events && TL.Events.isLB(S, p.id) && p.ovr < p.pot;
      if (p.age > 27 && !lb) continue;
      const on = away ? r != null : slots[p.id] != null;
      const room = Math.max(0, p.pot - p.ovr);
      const ageF = Math.max(lb ? 0.8 : 0, p.age <= 19 ? 1 : p.age <= 21 ? 0.85 : p.age <= 23 ? 0.65 : p.age <= 25 ? 0.4 : 0.22);
      const minF = on ? 1 : p.inj > 0 ? 0.08 : away ? 0.4 : 0.35;
      const rateF = r == null ? 1 : r >= 7.5 ? 1.45 : r >= 7 ? 1.2 : r >= 6.4 ? 1 : r >= 6 ? 0.75 : 0.5;
      const m = p.mor == null ? 70 : p.mor;
      const morF = m >= 75 ? 1.15 : m >= 55 ? 1 : m >= 40 ? 0.8 : 0.6;
      const gain = room * 0.016 * ageF * minF * rateF * morF * growth(S, p) * (p.age <= 23 ? youthSkill : 1);
      L.dp[p.id] = (L.dp[p.id] || 0) + gain;
      while (L.dp[p.id] >= 1 && p.ovr < p.pot) { L.dp[p.id] -= 1; const b = p.ovr; raise(S, p, 1); L.month.push([p.id, b, p.ovr]); }
      // Para mal: sin minutos y triste, el techo baja; para bien, partidazos que lo suben
      if (!away && !on && p.age <= 23 && m < 50 && S.week > 6 && Math.random() < 0.05) { p.pot = Math.max(p.ovr, p.pot - 1); L.month.push([p.id, -1, -1]); }
      if (r != null && r >= 8 && p.age <= 23 && Math.random() < 0.3) p.pot = Math.min(95, p.pot + 1);
    }
    // Resumen cada 4 jornadas
    if (S.week % 4 === 3 && L.month.length) {
      const up = {}, down = new Set();
      for (const [id, b, a] of L.month) { if (b === -1) down.add(id); else up[id] = up[id] ? [up[id][0], a] : [b, a]; }
      const lines = Object.entries(up).map(([id, [b, a]]) => `${S.players[id] ? S.players[id].short : '?'} ${b}→${a}`);
      const st = [...down].map(id => S.players[id] && S.players[id].short).filter(Boolean);
      if (lines.length || st.length) TL.Game.mail(S, '📈 Progresión del mes', (lines.length ? `Mejoran: ${lines.join(', ')}.` : '') + (st.length ? ` Se están estancando por falta de minutos y moral: ${st.join(', ')}.` : ''), lines.length ? 'good' : 'med');
      L.month = [];
    }
  }

  /** Tras cada jornada: minutos, promesas, química, padrinos, egos y joyas. */
  function afterRound(S, results) {
    const L = state(S);
    const mine = results.find(r => r.h === S.user || r.a === S.user);
    loanWeek(S, results);
    growWeek(S, mine);
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
      // El vínculo con el míster ya cuenta en la moral (vestuario vivo); el padrino arropa
      const m = L.mentor[p.id];
      if (m != null && S.players[m] && S.players[m].club === S.user) { bond(S, p.id, m, 2); if (TL.Social) TL.Social.remember(S, p, 'mentor', 2, 2, gx(S, 'Su padrino le arropa', 'Su madrina la arropa')); }
    }
    // Ganar juntos une
    const won = mine && ((mine.h === S.user && mine.hg > mine.ag) || (mine.a === S.user && mine.ag > mine.hg));
    if (won) { const pl = [...played]; for (let i = 0; i < 3; i++) { const [x, y] = U.shuffle(pl.slice()).slice(0, 2); bond(S, x, y, 3); } }
    // Promesas de minutos
    for (const pr of L.promises.slice()) {
      const p = S.players[pr.pid];
      if (!p || p.club !== S.user) { L.promises = L.promises.filter(x => x !== pr); continue; }
      if (appsOf(S, p.id) - pr.apps0 >= pr.need) {
        L.promises = L.promises.filter(x => x !== pr);
        bossAdd(S, p.id, 15);
        if (TL.Social) TL.Social.remember(S, p, 'promesa', 6, 8, 'Cumpliste tu promesa de minutos'); else p.mor = Math.min(100, (p.mor || 70) + 6);
        TL.Game.mail(S, `Promesa cumplida con ${p.short}`, `Le prometiste minutos y los ha tenido. ${p.name} confía más en ti.`, 'good');
      } else if (S.week >= pr.until) {
        L.promises = L.promises.filter(x => x !== pr);
        bossAdd(S, p.id, -25);
        if (TL.Social) TL.Social.remember(S, p, 'promesa', -12, 12, 'Rompiste tu promesa de minutos'); else p.mor = Math.max(0, (p.mor || 70) - 15);
        TL.Game.mail(S, `Promesa incumplida con ${p.short}`, `Le prometiste minutos y no los ha tenido. ${p.name} se siente ${gx(S, 'engañado', 'engañada')}: su relación contigo se resiente.`, 'med');
      }
    }
    ignored(S);
    if (TL.Social) { TL.Social.tick(S, mine, played); TL.Social.spawn(S, mine, played); }
    office(S, sq, played);
  }

  /** Las reuniones del despacho que dejas sin contestar 3 semanas: el jugador se siente ignorado. */
  function ignored(S) {
    for (const m of S.inbox) {
      if (m.kind !== 'decision' || m.done || !m.data || m.data.pid == null) continue;
      if (!['lk_minutes', 'lk_loan', 'lk_raise', 'lk_ego'].includes(m.data.ev)) continue;
      if (m.s === S.season && S.week - m.w < 3) continue;
      const p = S.players[m.data.pid];
      m.done = true; m.data.ignored = true;
      if (!p || p.club !== S.user) continue;
      bossAdd(S, p.id, -10);
      if (TL.Social) {
        TL.Social.remember(S, p, 'ignorado', -8, 8, 'Pidió hablar contigo y no le atendiste');
        for (const q of W().squad(S, S.user)) if (q.id !== p.id && rel(S, p.id, q.id) >= 40) TL.Social.remember(S, q, 'amigo', -2, 4, `Ignoraste a su amigo ${p.short}`);
      } else p.mor = Math.max(0, (p.mor == null ? 70 : p.mor) - 10);
      TL.Game.mail(S, `${p.short} se siente ${gx(S, 'ignorado', 'ignorada')}`, `Pidió hablar contigo y no lo has hecho. ${p.name} está ${gx(S, 'dolido y sus amigos', 'dolida y sus amigas')} del vestuario lo han notado: baja su moral y vuestra relación.`, 'med');
    }
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
        [['promise', 'Prometerle minutos'], ['patience', 'Pedirle paciencia'], open ? ['list', gx(S, 'Ponerle en venta', 'Ponerla en venta')] : ['talk', 'Explicarle su papel']]],
      loan: [`${p.short} quiere salir ${gx(S, 'cedido', 'cedida')}`, `${p.name}, de ${p.age} años, te pide salir ${gx(S, 'cedido', 'cedida')} para jugar: "Aquí no tengo sitio y necesito minutos".`,
        [[open ? 'loan' : 'loanLater', open ? 'Buscarle una cesión' : gx(S, 'Cederle en el próximo mercado', 'Cederla en el próximo mercado')], ['promise', 'Prometerle minutos'], ['refuse', 'Negarte']]],
      raise: [`${p.short} quiere renovar`, `${p.name} está rindiendo a gran nivel y su agente pide sentarse a hablar de una renovación.`,
        [['renew', gx(S, 'Renovarle ya', 'Renovarla ya')], ['later', 'Hablarlo en verano'], ['no', 'No hay renovación']]],
      ego: [`${p.short} no la pasa nunca`, gx(S, `Varios jugadores se quejan en tu despacho: ${p.name} solo piensa en marcar y no da un pase. Él dice que "un delantero tiene que ser egoísta".`,
        `Varias jugadoras se quejan en tu despacho: ${p.name} solo piensa en marcar y no da un pase. Ella dice que "una delantera tiene que ser egoísta".`),
        [['talk', gx(S, 'Hablar con él', 'Hablar con ella')], ['let', gx(S, 'Dejarle ser', 'Dejarla ser')], ['bench', gx(S, 'Mandarle al banquillo', 'Mandarla al banquillo')]]]
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
    TL.Game.mail(S, `Los capitanes proponen algo antes del ${S.clubs[opp].name}`, `${cap ? cap.short : gx(S, 'El capitán', 'La capitana')} viene de parte del grupo: "Míster, se viene un partido gordo. ¿Hacemos algo para unirnos?"`, 'decision',
      { ev: 'lk_act', pid: cap ? cap.id : null, opts: [['bbq', `Barbacoa (${U.money(actCost(S, 'bbq'))})`], ['dayoff', 'Día libre'], ['retreat', `Concentración (${U.money(actCost(S, 'retreat'))})`], ['no', 'A entrenar']] });
  }

  /** Semana: ofertas del ojeador y propuestas de los capitanes. */
  function weekly(S) {
    state(S);
    loanWatch(S);
    scoutOffer(S);
    preMatch(S);
  }

  /** Perks de doble filo repartidas por las ligas: pocas, y según el perfil de cada uno. */
  function seedPerks(S, rate) {
    const L = state(S);
    for (const p of S.players) {
      if (p.club < 0 || !S.clubs[p.club] || !S.leagues[S.clubs[p.club].league].playable) continue;
      if ((L.tr[p.id] || []).some(t => TRAITS[t] && TRAITS[t].edge)) continue;
      if (Math.random() >= rate) continue;
      const line = F.LINE[p.pos];
      const opts = [['party', p.age <= 30 ? 2 : 0.5], ['hothead', line === 1 || line === 2 ? 2.2 : 0.6], ['diva', p.ovr >= S.clubs[p.club].rep ? 1.6 : 0.3], ['ego', p.pos === 'ST' ? 1.4 : 0]];
      addTrait(S, p.id, U.weighted(opts, o => o[1])[0]);
    }
  }

  /** Fin de temporada: la joya de la cantera, si toca, y los rasgos de los veteranos. */
  function seasonEnd(S) {
    const L = state(S);
    const sq = W().squad(S, S.user);
    // Líderes: los veteranos con galones
    for (const p of sq) if (p.age >= 30 && p.ovr >= S.clubs[S.user].rep - 2 && !hasTrait(S, p.id, 'leader') && Math.random() < 0.25) addTrait(S, p.id, 'leader');
    seedPerks(S, 0.012);
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
    // Los elogios y las broncas «porque sí» ya no valen: van en los momentos, con su contexto
    const o = [['future', 'Hablar de su futuro', 'Te cuenta qué quiere y cómo se siente… y te deja ver cómo es.']];
    if (p.age >= 26 && TL.Social && !TL.Social.hasGalones(S, p) && TL.Social.galonesLeft(S) > 0) o.push(['galones', gx(S, 'Darle galones', 'Darle galones'), 'Más peso en el vestuario. Solo tres por temporada.']);
    const en = enemyOf(S, p);
    if (en) o.push(['reconcile', `Mediar con ${en.short}`, 'Intentar que hagan las paces.']);
    if (hasTrait(S, p.id, 'ego')) o.push(['ego', 'Hablar de su ego', 'Que entienda que el equipo va primero.']);
    return o;
  }
  function meet(S, p, k) {
    const L = state(S);
    // Cada charla gasta un hueco de la agenda de la semana (vestuario vivo)
    if (TL.Social) {
      if (TL.Social.agendaLeft(S) <= 0) return { msg: 'Tu agenda de esta semana está llena. Prueba la semana que viene.' };
      TL.Social.useAgenda(S);
    }
    L.met = L.met || {};
    L.met[p.id] = S.week;
    const b = boss(S, p.id), m = p.mor == null ? 70 : p.mor;
    if (k === 'galones') {
      const q = { comp: 1, sens: 0, pro: 1, amb: 2, cha: 2, vol: 1 }[TL.Social.charOf(S, p.id)];
      TL.Social.st(S).galones[p.id] = S.season;
      const txt = TL.Social.react(S, p, q, 'galones', gx(S, 'Le diste galones en el vestuario', 'Le diste galones en el vestuario'), 8);
      return { msg: txt + TL.Social.learn(S, p), good: q > 0, bad: q < 0 };
    }
    if (k === 'future') {
      const st = S.stats[p.id] || [0], share = st[0] / Math.max(1, S.week);
      const sq = W().squad(S, S.user).sort((a, c) => c.ovr - a.ovr), r = sq.findIndex(q => q.id === p.id);
      let want;
      if (onLoan(S, p.id)) want = 'Está a gusto, pero sabe que en verano vuelve a su club.';
      else if (m < 40) want = 'No es feliz aquí. Si no cambia algo, pedirá salir.';
      else if (share < 0.35 && r < 16 && S.week >= 4) want = p.age <= 22 ? 'Quiere jugar. Si no hay sitio, prefiere salir ' + gx(S, 'cedido.', 'cedida.') : 'Quiere más minutos: cree que merece jugar.';
      else if (p.contract <= S.season + 1) want = 'Le gustaría renovar antes de que acabe su contrato.';
      else if (p.age >= 32) want = 'Piensa en sus últimos años de carrera; le haría ilusión quedarse en el club después, ' + gx(S, 'como técnico.', 'como entrenadora.');
      else want = gx(S, 'Está contento con su papel y con el grupo.', 'Está contenta con su papel y con el grupo.');
      const fr = W().squad(S, S.user).filter(q => q.id !== p.id).map(q => [q, rel(S, p.id, q.id)]).sort((a, c) => c[1] - a[1])[0];
      bossAdd(S, p.id, m < 58 ? 3 : 1);
      if (TL.Social && m < 58) TL.Social.remember(S, p, 'escuchado', 4, 4, 'Le escuchaste cuando lo necesitaba');
      const reveal = TL.Social ? TL.Social.learn(S, p) : '';
      return { msg: `${want}${fr && fr[1] >= 40 ? ` Su mejor amigo en el vestuario es ${fr[0].short}.` : ''} Relación contigo: ${bossLabel(boss(S, p.id)).toLowerCase()}.${reveal}` };
    }
    if (k === 'reconcile') {
      const en = enemyOf(S, p);
      if (!en) return { msg: 'Ya no hay nada que arreglar.' };
      if (Math.random() < 0.55 + b / 300) {
        bond(S, p.id, en.id, 40);
        if (TL.Social) { TL.Social.remember(S, p, 'feud', 4, 5, `Hizo las paces con ${en.short}`); TL.Social.remember(S, en, 'feud', 4, 5, `Hizo las paces con ${p.short}`); }
        return { msg: `${p.short} y ${en.short} se dan la mano delante de ti. El vestuario lo agradece.`, good: true }; }
      bond(S, p.id, en.id, -8);
      return { msg: `La reunión sube de tono: ${p.short} y ${en.short} siguen sin soportarse.`, bad: true };
    }
    if (k === 'ego') {
      if (Math.random() < (b >= 10 ? 0.45 : 0.22)) { convertEgo(S, p); return { msg: `${p.short} se queda pensativo: "Si el equipo gana, yo gano". Algo ha cambiado.`, good: true }; }
      mor(p, -3);
      return { msg: gx(S, `"Un delantero tiene que ser egoísta, míster". No le convences… todavía. Un padrino con galones podría ayudar.`, `"Una delantera tiene que ser egoísta, míster". No la convences… todavía. Una madrina con galones podría ayudar.`) };
    }
    return { msg: '' };
  }

  // ------------------------------------------------------------ Decisiones (despacho)
  const mor = (p, d) => { p.mor = U.clamp((p.mor == null ? 70 : p.mor) + d, 0, 100); };
  const DEC = {
    lk_minutes: { opts: [
      ['promise', 'Prometerle minutos', (S, p) => { state(S).promises.push({ pid: p.id, apps0: appsOf(S, p.id), need: 2, until: S.week + 4 }); mor(p, 10); bossAdd(S, p.id, 4); return 'Le prometes jugar al menos 2 de los próximos 4 partidos. No le falles.'; }],
      ['patience', 'Pedirle paciencia', (S, p) => { if (boss(S, p.id) >= 20) { mor(p, 3); return 'Confía en ti y lo acepta.'; } mor(p, -6); bossAdd(S, p.id, -5); return 'Sale del despacho de morros.'; }],
      ['list', 'Ponerle en venta', (S, p) => { p.listed = true; mor(p, 5); return gx(S, 'Lo pones en la lista de transferibles.', 'La pones en la lista de transferibles.'); }],
      ['talk', 'Explicarle su papel', (S, p) => { if (Math.random() < 0.55) { mor(p, 4); bossAdd(S, p.id, 4); return 'Entiende su papel en el equipo.'; } mor(p, -4); return gx(S, 'No le convences.', 'No la convences.'); }]
    ] },
    lk_loan: { opts: [
      ['loan', 'Buscarle una cesión', (S, p) => { const r = loanOut(S, p); return r.msg; }],
      ['loanLater', 'Cederle en el próximo mercado', (S, p) => { mor(p, 3); (state(S).loanLater || (S.lk.loanLater = [])).push(p.id); return 'Le buscarás equipo en cuanto abra el mercado.'; }],
      ['promise', 'Prometerle minutos', (S, p) => { state(S).promises.push({ pid: p.id, apps0: appsOf(S, p.id), need: 2, until: S.week + 4 }); mor(p, 8); return 'Le prometes minutos en las próximas 4 jornadas.'; }],
      ['refuse', 'Negarte', (S, p) => { mor(p, -10); bossAdd(S, p.id, -10); return gx(S, 'Se queda, pero muy molesto.', 'Se queda, pero muy molesta.'); }]
    ] },
    lk_raise: { opts: [
      ['renew', 'Renovarle ya', (S, p) => { const y = TL.Market.renewOptions(S, p); if (!y.length) return 'Ya tiene contrato largo.'; const r = TL.Market.renew(S, p, y[Math.min(1, y.length - 1)]); bossAdd(S, p.id, 10); return r.msg; }],
      ['later', 'Hablarlo en verano', (S, p) => { mor(p, -4); return 'Lo aplazas. Su agente no está contento.'; }],
      ['no', 'No hay renovación', (S, p) => { mor(p, -10); bossAdd(S, p.id, -12); return gx(S, 'Se siente infravalorado.', 'Se siente infravalorada.'); }]
    ] },
    lk_ego: { opts: [
      ['talk', 'Hablar con él', (S, p) => { const ch = boss(S, p.id) >= 10 ? 0.5 : 0.25; if (Math.random() < ch) { convertEgo(S, p); return '¡Lo entiende! A partir de ahora juega para el equipo.'; } mor(p, -3); return gx(S, 'Te escucha, pero sigue a lo suyo. Quizá un buen padrino le ayude.', 'Te escucha, pero sigue a lo suyo. Quizá una buena madrina la ayude.'); }],
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
        if (TL.Commerce.transferBudget(S) < fee) return gx(S, 'No tienes presupuesto para traerle.', 'No tienes presupuesto para traerla.');
        const c = S.clubs[S.user];
        TL.Market.logMove(S, p, -1, S.user, fee);
        p.club = S.user; p.contract = S.season + 4; p.wage = F.wageFor(p.ovr, p.age, S.leagues[c.league].wealth, S.econ.wage);
        c.cash -= fee; S.fin.buys += fee; p.mor = 82;
        W().dirty(S); TL.Commerce.refreshBudget(S);
        TL.News.add(S, 'fichajes', `${c.name} ficha a la promesa ${p.name}`, `Llega con ${p.age} años y fama de ${gx(S, 'jugador', 'jugadora')} especial.`, S.user, p.id, 'pos');
        return `${p.name} ya es ${gx(S, 'tuyo', 'tuya')}. Mira su ficha: tiene un rasgo especial.`;
      }],
      ['pass', 'Dejarlo pasar', (S, p) => {
        const L = TL.World.userLeague(S);
        const rival = S.clubs[U.pick(L.clubs.filter(id => id !== S.user))];
        TL.Market.logMove(S, p, -1, rival.id, 0);
        p.club = rival.id; p.contract = S.season + 3; p.wage = F.wageFor(p.ovr, p.age, S.leagues[rival.league].wealth, S.econ.wage);
        W().dirty(S);
        TL.News.add(S, 'fichajes', `${rival.name} ficha a la promesa ${p.name}`, gx(S, 'Un rival de tu liga se adelanta y se lleva al chaval del que hablaba tu ojeador.', 'Un rival de tu liga se adelanta y se lleva a la chavala de la que hablaba tu ojeador.'), rival.id, p.id, 'neu');
        return gx(S, `Se lo lleva el ${rival.name}. Ya lo verás enfrente.`, `Se la lleva el ${rival.name}. Ya la verás enfrente.`);
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
    const q = TL.Staff.fromPlayer(S, p, role);
    return `${p.name} se incorpora como ${TL.Staff.ROLES[role].name.toLowerCase()} (${'★'.repeat(q)}): ${TL.Staff.ROLES[role].desc(q)}`;
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
    L.ph = byKey(L.ph || {}); L.rh = byKey(L.rh || {}); L.dp = byKey(L.dp || {}); L.month = [];
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
    if (TL.Social) TL.Social.restoreConf(S);
    for (const id in L.tr) if (L.tr[id].includes('dnaTotal') && S.players[id]) S.players[id].anyPos = true;
    if (!L.perks) { L.perks = 1; seedPerks(S, 0.045); }
    if (TL.News && TL.News.EV) Object.assign(TL.News.EV, DEC);
  }

  TL.Locker = {
    TRAITS, traitInfo, dnaHint, DNA, FOCUS, STAFF, ACT, init, state, remap, traits, hasTrait, addTrait, fx, rel, bond, boss, bossAdd, relLabel, bossLabel, chem, pairs,
    canMentor, canBePupil, pupilsOf, setMentor, staffBonus, growth, afterDevelop, onRetire, makeGem, scoutOffer,
    onLoan, loanOf, loanOut, loanIn, loanable, loanTerms, LOAN_MAX, loanReport, loanCandidates, LOAN_WHY, recall, endLoans, activity, actCost, actReady, matchBoost,
    afterRound, weekly, seasonEnd, windowStart, DEC, meetOptions, meet, grows, pushHist, raise, seedPerks, removeTrait, minutesShare
  };
  if (TL.News && TL.News.EV) Object.assign(TL.News.EV, DEC);
})();
