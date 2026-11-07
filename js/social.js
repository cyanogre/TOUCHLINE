/* TOUCHLINE — el vestuario vivo: carácter, recuerdos, momentos y agenda del míster.
 *
 * Ideas de partida (y por qué):
 *  - Football Manager: la jerarquía (los influyentes arrastran al resto) y que cada personalidad
 *    reaccione distinto al elogio o a la exigencia. Elogiar a todos por sistema no vale nada.
 *  - RimWorld: la moral como suma de «recuerdos» con peso y duración, que no se apilan si se
 *    repiten; la moral real se acerca poco a poco a ese objetivo. Así no se puede «farmear».
 *  - Persona: el tiempo es escaso y las ocasiones caducan; elegir a quién atiendes importa.
 *
 * Lo propio de TOUCHLINE:
 *  - Carácter oculto (seis tipos) que descubres hablando con cada jugador (o con el informe del
 *    segundo entrenador). Cuando lo conoces, sabes qué le va y qué no.
 *  - Momentos que nacen del campo: un partidazo, un error, el banquillo, un pique, un grande que
 *    llama, el vestuario hundido. Caducan, y no atenderlos también deja huella.
 *  - Agenda: dos charlas por semana (tres con un buen segundo entrenador).
 *  - Pesos pesados: el ánimo de los influyentes contagia a sus amigos.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, F } = TL;
  const W = () => TL.World, LK = () => TL.Locker;
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);

  // ------------------------------------------------------------ Carácter
  const CHAR = {
    comp: { name: 'Competitivo', nameF: 'Competitiva', icon: '🔥', base: 0, mem: 1, desc: 'Se pica. Le motiva que le exijas; los mimos le aburren.',
      hint: 'le pierde la competición' },
    sens: { name: 'Sensible', nameF: 'Sensible', icon: '💧', base: -2, mem: 1.25, desc: 'Necesita sentirse arropado. Las broncas le hunden.',
      descF: 'Necesita sentirse arropada. Las broncas la hunden.', hint: 'es de piel fina' },
    pro: { name: 'Profesional', nameF: 'Profesional', icon: '⌚', base: 3, mem: 0.55, desc: 'Un reloj: ni euforias ni dramas. Todo le afecta la mitad.',
      hint: 'va a lo suyo, sin dramas' },
    amb: { name: 'Ambicioso', nameF: 'Ambiciosa', icon: '🚀', base: 0, mem: 1, desc: 'Mira arriba: quiere galones, títulos y un futuro a su altura.',
      hint: 'mira muy arriba' },
    cha: { name: 'Carismático', nameF: 'Carismática', icon: '🎤', base: 2, mem: 1, spread: 2, desc: 'El alma del grupo: su humor contagia al vestuario, para bien y para mal.',
      hint: 'es quien anima al grupo' },
    vol: { name: 'Volcánico', nameF: 'Volcánica', icon: '🌋', base: -1, mem: 1.6, desc: 'Todo a lo grande: reacciones fuertes, para bien y para mal.',
      hint: 'tiene la mecha corta' }
  };
  const ORDER = ['comp', 'sens', 'pro', 'amb', 'cha', 'vol'];
  const WEIGHT = [20, 18, 22, 18, 10, 12];
  const charName = (S, k) => gx(S, CHAR[k].name, CHAR[k].nameF);
  const charDesc = (S, k) => gx(S, CHAR[k].desc, CHAR[k].descF || CHAR[k].desc);

  function st(S) {
    const L = LK().state(S);
    L.chr = L.chr || {}; L.know = L.know || {}; L.mem = L.mem || {}; L.mom = L.mom || [];
    L.unused = L.unused || {}; L.galones = L.galones || {}; L.feudCool = L.feudCool || {};
    if (L.momId == null) L.momId = 1;
    return L;
  }

  /** Carácter de un jugador: fijo, sale de su nombre (los líderes tiran a profesionales o carismáticos). */
  function charOf(S, pid) {
    const L = st(S);
    if (L.chr[pid]) return L.chr[pid];
    const p = S.players[pid];
    const r = F.seeded('char:' + (p ? p.name : '') + ':' + pid);
    const w = WEIGHT.slice();
    if (p && LK().hasTrait(S, pid, 'leader')) { w[2] += 20; w[4] += 15; }
    if (p && LK().hasTrait(S, pid, 'ego')) { w[0] += 15; w[3] += 15; w[5] += 10; }
    const tot = w.reduce((a, b) => a + b, 0);
    let acc = 0, k = ORDER[0];
    for (let i = 0; i < ORDER.length; i++) { acc += w[i] / tot; if (r <= acc) { k = ORDER[i]; break; } }
    L.chr[pid] = k;
    return k;
  }
  /** 0: no lo conoces · 1: lo intuyes · 2: lo conoces. */
  function known(S, pid) { return st(S).know[pid] || 0; }
  function learn(S, p) {
    const L = st(S), k = charOf(S, p.id), before = known(S, p.id);
    L.know[p.id] = Math.min(2, before + 1);
    if (before === 0) return ` Empiezas a calar${gx(S, 'le', 'la')}: ${CHAR[k].hint}.`;
    if (before === 1) return ` Ya ${gx(S, 'le', 'la')} conoces: es **${charName(S, k).toLowerCase()}**.`;
    return '';
  }

  // ------------------------------------------------------------ Recuerdos
  /** Un recuerdo: suma (o resta) a la moral mientras dura. El mismo motivo no se apila: se renueva. */
  function remember(S, p, k, v, weeks, txt) {
    if (!p || p.club !== S.user) return;
    const L = st(S);
    v = Math.round(v * CHAR[charOf(S, p.id)].mem * 10) / 10;
    const list = L.mem[p.id] || (L.mem[p.id] = []);
    const old = list.find(m => m[0] === k);
    if (old) {
      if (Math.abs(v) >= Math.abs(old[1]) || Math.sign(v) !== Math.sign(old[1])) { old[1] = v; old[3] = txt; }
      old[2] = Math.max(old[2], weeks);
    } else list.push([k, v, weeks, txt]);
    if (list.length > 8) { list.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); list.length = 8; }
  }
  function memories(S, pid) { return (st(S).mem[pid] || []).slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); }

  // ------------------------------------------------------------ Confianza (subidón o bajón de unas jornadas)
  /** Fija la confianza de un jugador: +5 % … −5 % durante unas jornadas. Se guarda en el vestuario. */
  function setConf(S, p, mult, n) {
    if (!p || p.club !== S.user) return;
    const L = st(S);
    L.cf = L.cf || {};
    if (Math.abs(mult - 1) < 0.001) { delete L.cf[p.id]; p.cf = 1; return; }
    L.cf[p.id] = [mult, n];
    p.cf = mult;
  }
  const CONF = { 2: [1.06, 3], 1: [1.03, 2], '-1': [0.97, 2], '-2': [0.94, 3] };
  function confFromQ(S, p, q) { if (CONF[q]) setConf(S, p, CONF[q][0], CONF[q][1]); }
  function conf(S, pid) { const c = (st(S).cf || {})[pid]; return c ? { mult: c[0], n: c[1] } : null; }
  /** Al cargar la partida, la confianza vuelve a los jugadores (no se guarda en su ficha). */
  function restoreConf(S) { const L = st(S); for (const id in (L.cf || {})) if (S.players[id]) S.players[id].cf = L.cf[id][0]; }

  // ------------------------------------------------------------ Influencia
  function influence(S, p, rank) {
    let v = U.clamp((p.age - 20) * 2.5, 0, 35);
    if (LK().hasTrait(S, p.id, 'leader')) v += 25;
    const r = rank.indexOf(p.id);
    v += r < 3 ? 20 : r < 8 ? 10 : 0;
    if (charOf(S, p.id) === 'cha') v += 15;
    v += Math.min(10, ((S.stats[p.id] || [0])[0]) / 4);
    return U.clamp(Math.round(v), 0, 100);
  }
  function rankOf(S) { return W().squad(S, S.user).slice().sort((a, b) => b.ovr - a.ovr).map(p => p.id); }
  /** Los cuatro jugadores con más peso en el vestuario. */
  function heavyweights(S) {
    const rank = rankOf(S);
    return W().squad(S, S.user).map(p => [p, influence(S, p, rank)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }

  function userForm(S, n) {
    const out = [];
    for (let r = 0; r <= S.week && r < S.fixtures.length; r++) {
      const m = S.fixtures[r].find(x => x[0] === S.user || x[1] === S.user);
      if (m && m[2] >= 0) { const a = m[0] === S.user ? m[2] : m[3], b = m[0] === S.user ? m[3] : m[2]; out.push(a > b ? 1 : a < b ? -1 : 0); }
    }
    return out.slice(-(n || 5));
  }

  // ------------------------------------------------------------ Agenda
  function agendaMax(S) { return 2 + ((TL.Staff ? TL.Staff.lv(S, 'assistant') : 0) >= 2 ? 1 : 0); }
  function agendaUsed(S) { const a = st(S).agenda; return a && a.s === S.season && a.w === S.week ? a.n : 0; }
  function agendaLeft(S) { return Math.max(0, agendaMax(S) - agendaUsed(S)); }
  function useAgenda(S) { const L = st(S); L.agenda = { s: S.season, w: S.week, n: agendaUsed(S) + 1 }; }

  // ------------------------------------------------------------ Reacciones
  const REACT = {
    comp: { pos: '«Eso quería oír, míster. El domingo se va a enterar todo el mundo.»', neu: 'Asiente sin más. Parece que esperaba otra cosa.', neg: '«¿Para esto me llamas?» Sale del despacho con cara de pocos amigos.' },
    sens: { pos: 'Se le humedecen los ojos. «Gracias, míster. Lo necesitaba.»', neu: 'Te escucha en silencio; todavía le pesa.', neg: 'Se viene abajo. Sale del despacho sin levantar la mirada.' },
    pro: { pos: '«Entendido, míster.» Con este carácter, las cosas claras funcionan.', neu: 'Un «vale» y a seguir trabajando. Es así.', neg: 'No dice nada, pero toma nota: le ha parecido innecesario.' },
    amb: { pos: 'Le brillan los ojos: «Quiero ser importante aquí, míster.»', neu: 'Escucha, pero se nota que piensa en otra cosa: su futuro.', neg: '«Yo no he venido aquí para esto.» Empieza a mirar fuera.' },
    cha: { pos: 'Sale bromeando y en diez minutos todo el vestuario sabe que está feliz.', neu: 'Se lo toma con humor, como siempre.', neg: 'Por primera vez no hace ninguna broma. El grupo lo nota.' },
    vol: { pos: 'Da un golpe en la mesa: «¡Vamos a por todas!» Está a tope.', neu: 'Resopla, pero lo acepta.', neg: 'Explota. Portazo y gritos en el pasillo.' }
  };

  /** Aplica una reacción de calidad q (-2…2) a un jugador. Devuelve el texto de su reacción. */
  function react(S, p, q, key, txt, weeks) {
    const c = charOf(S, p.id);
    if (q !== 0) remember(S, p, key, q * 4, weeks || (Math.abs(q) >= 2 ? 5 : 4), txt);
    LK().bossAdd(S, p.id, q * 3);
    confFromQ(S, p, q);
    return REACT[c][q > 0 ? 'pos' : q < 0 ? 'neg' : 'neu'];
  }

  // ------------------------------------------------------------ Momentos
  // Cada opción: [clave, texto, calidad por carácter | función especial]
  const KINDS = {
    star: {
      icon: '⭐', ttl: 1,
      title: (S, p) => `${p.short} se sale`,
      text: (S, p, d) => `${p.name} firmó un partidazo (nota ${d.r.toFixed(1)}${d.g ? `, ${d.g} ${d.g > 1 ? 'goles' : 'gol'}` : ''}). ¿${gx(S, 'Le', 'La')} llamas al despacho?`,
      opts: (S, p) => [
        ['praise', gx(S, 'Felicitarle en privado', 'Felicitarla en privado'), { comp: 0, sens: 2, pro: 1, amb: 0, cha: 1, vol: 1 }, gx(S, 'Le felicitaste por su partidazo', 'La felicitaste por su partidazo')],
        ['public', gx(S, 'Ponerle de ejemplo ante el grupo', 'Ponerla de ejemplo ante el grupo'), { comp: 1, sens: -2, pro: -1, amb: 2, cha: 2, vol: 1 }, gx(S, 'Le pusiste de ejemplo ante todos', 'La pusiste de ejemplo ante todos')],
        ['calm', 'Que no se relaje', { comp: 2, sens: -1, pro: 1, amb: -1, cha: -1, vol: -2 }, 'Le pediste que no se relajara']
      ],
      miss: { amb: -2, sens: -1, vol: -1 }, missTxt: 'Ni una palabra tras su partidazo'
    },
    slump: {
      icon: '🌧️', ttl: 1,
      title: (S, p) => `${p.short}, ${gx(S, 'tocado', 'tocada')}`,
      text: (S, p, d) => d.red ? `${p.name} vio la roja y dejó al equipo con ${gx(S, 'uno', 'una')} menos. Sabe que ha fallado.`
        : `${p.name} hizo un partido para olvidar (nota ${d.r.toFixed(1)}). Se ${gx(S, 'le', 'la')} ve con la cabeza baja.`,
      opts: (S, p) => [
        ['support', gx(S, 'Arroparle', 'Arroparla'), { comp: -1, sens: 2, pro: 0, amb: 1, cha: 1, vol: 1 }, gx(S, 'Le arropaste tras un mal día', 'La arropaste tras un mal día')],
        ['challenge', 'Exigirle más', { comp: 2, sens: -2, pro: 1, amb: 1, cha: -1, vol: 'dice' }, 'Le exigiste más'],
        ['leave', 'Dejarlo estar', { comp: 0, sens: -2, pro: 1, amb: -1, cha: 0, vol: -1 }, 'Lo dejaste estar']
      ],
      miss: { sens: -2, vol: -1 }, missTxt: 'Nadie le arropó tras su error', missTxtF: 'Nadie la arropó tras su error'
    },
    bench: {
      icon: '🪑', ttl: 2,
      title: (S, p) => `${p.short} se aburre en el banquillo`,
      text: (S, p, d) => `${p.name} lleva ${d.n} jornadas sin jugar y no entiende por qué. Se ${gx(S, 'le', 'la')} nota en los entrenamientos.`,
      opts: (S, p) => {
        const o = [
          ['role', 'Explicarle su papel', { comp: -1, sens: 1, pro: 2, amb: -2, cha: 1, vol: -1 }, 'Le explicaste su papel'],
          ['promise', 'Prometerle minutos', 'promise', 'Le prometiste minutos']
        ];
        if (p.age >= 26 && !hasGalones(S, p) && galonesLeft(S) > 0) o.push(['galones', 'Darle peso en el vestuario', { comp: 0, sens: -1, pro: 1, amb: 1, cha: 2, vol: 0 }, 'Le diste galones en el vestuario']);
        return o;
      },
      miss: { amb: -2, comp: -1, vol: -2 }, missTxt: 'Ni una explicación por no jugar'
    },
    feud: {
      icon: '⚡', ttl: 2,
      title: (S, p, d) => `${p.short} y ${S.players[d.q].short} no se hablan`,
      text: (S, p, d) => `Lo de ${p.short} y ${S.players[d.q].short} ya se nota en los rondos. Si no haces nada, el vestuario se partirá en dos.`,
      opts: (S, p, d) => [
        ['mediate', 'Sentarles juntos en el despacho', 'mediate', ''],
        ['sideA', `Dar la razón a ${p.short}`, 'sideA', ''],
        ['sideB', `Dar la razón a ${S.players[d.q].short}`, 'sideB', ''],
        ['leave', 'Que lo arreglen ellos', 'leave', '']
      ],
      miss: null
    },
    rumor: {
      icon: '📞', ttl: 2,
      title: (S, p) => `Un grande pregunta por ${p.short}`,
      text: (S, p, d) => `Se dice que el ${S.clubs[d.c].name} quiere a ${p.name}. Su entorno ya le calienta la cabeza.`,
      opts: (S, p) => [
        ['keep', gx(S, 'Convencerle de que este es su sitio', 'Convencerla de que este es su sitio'), 'keep', ''],
        ['raise', `Subirle el sueldo un 15 % (+${U.money(Math.round(p.wage * 0.15))}/sem)`, { comp: 1, sens: 1, pro: 1, amb: 2, cha: 1, vol: 1 }, 'Le subiste el sueldo para que se quedara'],
        ['door', 'Dejarle la puerta abierta', { comp: 0, sens: -1, pro: 1, amb: 1, cha: 0, vol: 0 }, 'Le dejaste la puerta abierta']
      ],
      miss: { amb: -3, comp: -1, vol: -1 }, missTxt: 'Le ignoraste cuando llamaban de fuera', missTxtF: 'La ignoraste cuando llamaban de fuera'
    },
    crisis: {
      icon: '🧯', ttl: 1,
      title: () => 'El vestuario está tocado',
      text: (S, p) => `${p.name} pide una charla con todo el grupo: «Míster, esto se nos está yendo de las manos».`,
      opts: () => [
        ['unite', 'Charla de unidad', 'unite', ''],
        ['blame', 'Señalar culpables', 'blame', ''],
        ['shield', 'Asumir tú la culpa', 'shield', '']
      ],
      miss: null
    }
  };

  function hasGalones(S, p) { return st(S).galones[p.id] === S.season; }
  function active(S) { const L = st(S); return L.mom.filter(m => m.s === S.season && m.exp >= S.week); }

  /** Galones: como mucho tres por temporada (si todos mandan, no manda nadie). */
  function galonesLeft(S) { const L = st(S); return 3 - Object.values(L.galones).filter(v => v === S.season).length; }

  function add(S, k, pid, d) {
    const L = st(S);
    if (L.mom.some(m => m.k === k && m.pid === pid && m.s === S.season && m.exp >= S.week)) return null;
    const m = { id: L.momId++, k, pid, d: d || {}, s: S.season, w: S.week, exp: S.week + KINDS[k].ttl };
    L.mom.push(m);
    const act = active(S);
    if (act.length > 4) { const old = act.sort((a, b) => a.w - b.w)[0]; expire(S, old); }
    return m;
  }

  /** Un momento que nadie atendió: también deja huella. */
  function expire(S, m) {
    const L = st(S);
    L.mom = L.mom.filter(x => x !== m);
    const K = KINDS[m.k], p = S.players[m.pid];
    if (!p || p.club !== S.user) return;
    if (m.k === 'feud') { feudLeave(S, p, S.players[m.d.q]); return; }
    if (m.k === 'crisis') { for (const q of W().squad(S, S.user)) { remember(S, q, 'crisis', -4, 4, 'El míster no dio la cara'); setConf(S, q, 0.96, 2); } return; }
    const v = K.miss && K.miss[charOf(S, p.id)];
    if (v) remember(S, p, 'miss_' + m.k, v * 4, 4, gx(S, K.missTxt, K.missTxtF || K.missTxt));
  }

  /** Tras cada jornada: nacen momentos de lo que ha pasado. Uno de cada tipo, como mucho. */
  function spawn(S, mine, played) {
    const L = st(S);
    // Los que caducan
    for (const m of L.mom.slice()) if (m.s !== S.season || m.exp < S.week) expire(S, m);
    const sq = W().squad(S, S.user);
    const rank = sq.slice().sort((a, b) => b.ovr - a.ovr).map(p => p.id);
    // Candidatos de esta jornada; solo nace el más importante (un vestuario no es un culebrón diario)
    const cands = [];
    const busy = new Set(active(S).map(m => m.pid));
    if (mine && mine.ratings) {
      const mineIds = sq.filter(p => played.has(p.id));
      const goals = {};
      for (const id of mine.scorers || []) goals[id] = (goals[id] || 0) + 1;
      const reds = new Set((mine.reds || []).filter(r => r[2] !== 'second').map(r => r[0]));
      const scored = mineIds.filter(p => !busy.has(p.id)).map(p => ({ p, r: mine.ratings[p.id] || 6, g: goals[p.id] || 0 }));
      const best = scored.filter(x => x.r >= 8.2 || x.g >= 2).sort((a, b) => b.r - a.r)[0];
      if (best && Math.random() < 0.7) cands.push([3, 'star', best.p.id, { r: best.r, g: best.g }]);
      const worst = scored.filter(x => x.r <= 5.3 || reds.has(x.p.id)).sort((a, b) => a.r - b.r)[0];
      if (worst && (!best || worst.p.id !== best.p.id) && Math.random() < 0.7) cands.push([4, 'slump', worst.p.id, { r: worst.r, red: reds.has(worst.p.id) }]);
      // Banquillo: de los 14 mejores, 3 jornadas seguidas sin jugar
      for (const p of sq) {
        if (played.has(p.id) || p.inj > 0 || p.sus > 0 || !rank.slice(0, 14).includes(p.id) || LK().onLoan(S, p.id)) { L.unused[p.id] = 0; continue; }
        L.unused[p.id] = (L.unused[p.id] || 0) + 1;
      }
      const benched = sq.filter(p => (L.unused[p.id] || 0) >= 3 && !busy.has(p.id) && !S.inbox.some(m => m.kind === 'decision' && !m.done && m.data && m.data.pid === p.id))
        .sort((a, b) => b.ovr - a.ovr)[0];
      if (benched) cands.push([2, 'bench', benched.id, { n: L.unused[benched.id] }]);
    }
    // Pique: dos que no se hablan
    if (!active(S).some(m => m.k === 'feud')) {
      const pr = LK().pairs(S).find(([a, b, r]) => r <= -40 && (L.feudCool[a.id + '_' + b.id] || -99) < S.season * 100 + S.week - 8);
      if (pr && Math.random() < 0.6) cands.push([5, 'feud', pr[0].id, { q: pr[1].id }, pr]);
    }
    // Un grande llama a la puerta
    if (!active(S).some(m => m.k === 'rumor') && S.week >= 2) {
      const club = S.clubs[S.user];
      const cand = sq.filter(p => p.ovr >= club.rep + 1 && p.age <= 29 && !p.listed && !busy.has(p.id) && Math.random() < 0.025).sort((a, b) => b.ovr - a.ovr)[0];
      if (cand) {
        const big = S.clubs.filter(c => c.id !== S.user && c.rep >= club.rep + 3 && S.leagues[c.league].playable).sort((a, b) => b.rep - a.rep).slice(0, 8);
        if (big.length) cands.push([1, 'rumor', cand.id, { c: U.pick(big).id }]);
      }
    }
    // Crisis: el vestuario hundido o tres derrotas seguidas
    const form = userForm(S, 3);
    const avg = sq.length ? U.sum(sq, p => (p.mor == null ? 70 : p.mor)) / sq.length : 70;
    if ((avg < 56 || (form.length === 3 && form.every(x => x < 0))) && (L.crisisCool == null || S.season * 100 + S.week - L.crisisCool >= 6)) {
      const speaker = heavyweights(S)[0];
      if (speaker) cands.push([6, 'crisis', speaker[0].id, {}]);
    }
    const pick = cands.sort((a, b) => b[0] - a[0])[0];
    if (!pick) return;
    const [, k, pid, d, extra] = pick;
    if (add(S, k, pid, d)) {
      if (k === 'slump') setConf(S, S.players[pid], 0.95, 2);
      if (k === 'feud') { setConf(S, S.players[pid], 0.98, 3); setConf(S, S.players[d.q], 0.98, 3); }
      if (k === 'feud') L.feudCool[extra[0].id + '_' + extra[1].id] = S.season * 100 + S.week;
      if (k === 'crisis') L.crisisCool = S.season * 100 + S.week;
      if (k === 'bench') L.unused[pid] = 0;
    }
  }

  /** Qué supone cada enfoque (se ve debajo de cada opción). */
  const DESC = {
    'star:praise': S => 'Cuatro palabras en privado: buen trabajo.',
    'star:public': S => 'Delante de todos: este es el camino.',
    'star:calm': S => 'Bien, pero esto no ha hecho más que empezar.',
    'slump:support': S => 'Un brazo por encima: a todos nos pasa.',
    'slump:challenge': S => 'Le pides más, sin rodeos.',
    'slump:leave': S => 'Ni una palabra: que lo digiera solo.',
    'bench:role': S => gx(S, 'Le explicas por qué no juega y qué esperas de él.', 'Le explicas por qué no juega y qué esperas de ella.'),
    'bench:promise': S => 'Jugará al menos 2 de las próximas 4 jornadas. Si no cumples, lo pagarás.',
    'bench:galones': S => 'Que ayude a los jóvenes y tire del grupo.',
    'feud:mediate': S => 'Los sientas juntos y que hablen.',
    'feud:sideA': S => 'Uno sale reforzado; el otro, tocado.',
    'feud:sideB': S => 'Uno sale reforzado; el otro, tocado.',
    'feud:leave': S => 'A veces se arregla solo… y a veces no.',
    'rumor:keep': S => 'Depende de su ambición y de cómo vaya el equipo.',
    'rumor:raise': S => 'Cuesta dinero, pero casi siempre funciona.',
    'rumor:door': S => gx(S, 'Le pones en el mercado. Le gustará… y podrías perderle.', 'La pones en el mercado. Le gustará… y podrías perderla.'),
    'crisis:unite': S => 'Funciona si los pesos pesados confían en ti.',
    'crisis:blame': S => 'A unos les pica para bien; a otros les hunde.',
    'crisis:shield': S => 'El vestuario lo agradece; la directiva, no tanto.'
  };

  /** Opciones de un momento, con la pista de qué le va si ya conoces su carácter. */
  function options(S, m) {
    const p = S.players[m.pid];
    const k = charOf(S, p.id), kn = known(S, p.id) >= 2;
    return KINDS[m.k].opts(S, p, m.d).map(([key, label, q]) => {
      let mark = '';
      if (kn && q && typeof q === 'object' && key !== 'door') { const v = q[k]; mark = v === 'dice' ? '?' : v > 0 ? '✓' : v < 0 ? '✗' : '·'; }
      return { key, label, mark, desc: DESC[m.k + ':' + key] ? DESC[m.k + ':' + key](S) : '' };
    });
  }

  function feudLeave(S, a, b) {
    if (!a || !b) return 'Siguen a lo suyo.';
    const okP = 0.3 + (charOf(S, a.id) === 'pro' ? 0.15 : 0) + (charOf(S, b.id) === 'pro' ? 0.15 : 0);
    if (Math.random() < okP) { LK().bond(S, a.id, b.id, 25); return 'Lo han arreglado solos, a su manera. Esta vez ha salido bien.'; }
    LK().bond(S, a.id, b.id, -10);
    remember(S, a, 'feud', -3, 4, `El pique con ${b.short}`); remember(S, b, 'feud', -3, 4, `El pique con ${a.short}`);
    return 'No lo arreglan: el pique sigue y el grupo empieza a tomar partido.';
  }

  /** Resolver un momento. Gasta una charla de la agenda. */
  function resolve(S, id, key) {
    const L = st(S);
    const m = L.mom.find(x => x.id === id);
    if (!m) return { ok: false, msg: 'Ese momento ya pasó.' };
    if (agendaLeft(S) <= 0) return { ok: false, msg: 'Tu agenda de esta semana está llena. Si no caduca, podrás atenderlo la semana que viene.' };
    const p = S.players[m.pid];
    const opt = KINDS[m.k].opts(S, p, m.d).find(o => o[0] === key);
    if (!opt) return { ok: false, msg: '' };
    useAgenda(S);
    L.mom = L.mom.filter(x => x !== m);
    const [, , q, memTxt] = opt;
    const c = charOf(S, p.id);
    let msg = '', good = false, bad = false;
    if (q && typeof q === 'object') {
      let v = q[c];
      if (v === 'dice') v = Math.random() < 0.5 ? 2 : -2;
      msg = react(S, p, v, m.k + ':' + key, memTxt);
      good = v > 0; bad = v < 0;
      if (key === 'public') {
        // Ponerle de ejemplo despierta envidias en quien no le soporta
        for (const o of W().squad(S, S.user)) if (o.id !== p.id && LK().rel(S, p.id, o.id) <= -30) remember(S, o, 'envy', -4, 4, `Envidia: pusiste de ejemplo a ${p.short}`);
      }
      if (key === 'raise') p.wage = Math.round(p.wage * 1.15);
      if (key === 'door') p.listed = true;
      if (key === 'galones') L.galones[p.id] = S.season;
    } else if (q === 'promise') {
      LK().state(S).promises.push({ pid: p.id, apps0: (S.stats[p.id] || [0])[0], need: 2, until: S.week + 4 });
      msg = react(S, p, 1, 'bench:promise', 'Le prometiste minutos') + ' Tiene que jugar al menos 2 de las próximas 4 jornadas: no le falles.';
      good = true;
    } else if (q === 'keep') {
      const tab = TL.Season.table(S), pos = tab.findIndex(r => r.id === S.user) + 1;
      const chance = { comp: 0.7, sens: 0.8, pro: 0.75, amb: 0.4, cha: 0.75, vol: 0.6 }[c] + (pos <= 4 ? 0.15 : pos > tab.length / 2 ? -0.15 : 0) + LK().boss(S, p.id) / 250;
      if (Math.random() < chance) { msg = react(S, p, 2, 'rumor:keep', gx(S, 'Le convenciste de que este es su sitio', 'La convenciste de que este es su sitio')); good = true; }
      else { msg = react(S, p, -2, 'rumor:keep', gx(S, 'Quiere salir aunque intentaste convencerle', 'Quiere salir aunque intentaste convencerla')); bad = true; }
    } else if (m.k === 'feud') {
      const b = S.players[m.d.q];
      if (key === 'mediate') {
        const mod = x => ({ pro: 0.2, cha: 0.15, vol: -0.2, comp: -0.05 }[charOf(S, x.id)] || 0);
        if (Math.random() < 0.5 + mod(p) + mod(b)) {
          LK().bond(S, p.id, b.id, 45); setConf(S, p, 1, 0); setConf(S, b, 1, 0);
          remember(S, p, 'feud', 4, 5, `Hizo las paces con ${b.short}`); remember(S, b, 'feud', 4, 5, `Hizo las paces con ${p.short}`);
          msg = `Una hora de despacho y un apretón de manos. ${p.short} y ${b.short} hacen las paces.`; good = true;
        } else {
          LK().bond(S, p.id, b.id, -10);
          remember(S, p, 'feud', -3, 4, `El pique con ${b.short}`); remember(S, b, 'feud', -3, 4, `El pique con ${p.short}`);
          msg = 'La reunión sube de tono. Salen peor de lo que entraron.'; bad = true;
        }
      } else if (key === 'sideA' || key === 'sideB') {
        const win = key === 'sideA' ? p : b, lose = key === 'sideA' ? b : p;
        remember(S, win, 'feud', 6, 5, 'Le diste la razón en el pique'); LK().bossAdd(S, win.id, 6); setConf(S, win, 1.025, 2);
        remember(S, lose, 'feud', -6, 6, 'Le quitaste la razón en el pique'); LK().bossAdd(S, lose.id, -8); setConf(S, lose, 0.95, 3);
        LK().bond(S, p.id, b.id, -15);
        msg = gx(S, `${win.short} sale reforzado del despacho. ${lose.short}, tocado: no lo olvidará pronto.`, `${win.short} sale reforzada del despacho. ${lose.short}, tocada: no lo olvidará pronto.`);
      } else { msg = feudLeave(S, p, b); }
    } else if (m.k === 'crisis') {
      const sq = W().squad(S, S.user);
      if (key === 'unite') {
        const trust = LK().boss(S, p.id) >= 0;
        for (const o of sq) { remember(S, o, 'crisis', trust ? 4 : 1, 4, 'La charla de unidad'); if (trust) setConf(S, o, 1.03, 2); }
        msg = trust ? `${p.short} te respalda delante de todos. El grupo sale más unido.` : 'Hablas bien, pero los pesos pesados no terminan de creérselo.';
        good = trust;
      } else if (key === 'blame') {
        const tab = { comp: 2, sens: -2, pro: 1, amb: 1, cha: 0, vol: 0 };
        for (const o of sq) { const v = tab[charOf(S, o.id)]; if (v) { remember(S, o, 'crisis', v * 2, 4, 'Señalaste culpables'); confFromQ(S, o, v > 0 ? 1 : -1); } }
        msg = 'Señalas culpables. A algunos les pica para bien; a otros les hunde.';
      } else {
        for (const o of sq) { remember(S, o, 'crisis', 3, 4, 'El míster dio la cara por el grupo'); LK().bossAdd(S, o.id, 3); setConf(S, o, 1.02, 2); }
        S.board.conf = U.clamp(S.board.conf - 3, 0, 100);
        msg = 'Asumes la culpa ante la prensa. El vestuario lo agradece; en el palco, no tanto.'; good = true;
      }
    }
    const reveal = m.k === 'crisis' || m.k === 'feud' ? '' : learn(S, p);
    W().dirty(S);
    return { ok: true, msg: msg + reveal, good, bad, pid: p.id };
  }

  // ------------------------------------------------------------ La semana
  /** Cada jornada: minutos, racha del equipo, contagio de los influyentes y la moral que se acerca a su objetivo. */
  function tick(S, mine, played) {
    const L = st(S);
    const sq = W().squad(S, S.user);
    if (!sq.length) return;
    const rank = sq.slice().sort((a, b) => b.ovr - a.ovr).map(p => p.id);
    if (mine) for (const p of sq) {
      const r = rank.indexOf(p.id);
      if (played.has(p.id)) remember(S, p, 'min', 2, 2, 'Juega: se siente importante');
      else if (r < 14 && p.inj <= 0 && p.sus <= 0) remember(S, p, 'min', r < 11 ? -3 : -1.5, 2, 'Sin minutos');
    }
    if (mine) for (const id in (L.cf || {})) {
      const c = L.cf[id];
      if (--c[1] <= 0) { delete L.cf[id]; if (S.players[id]) S.players[id].cf = 1; }
    }
    const form = userForm(S, 5), streak = form.reduce((a, b) => a + b, 0);
    const inf = {};
    for (const p of sq) inf[p.id] = influence(S, p, rank);
    const before = {};
    for (const p of sq) before[p.id] = p.mor == null ? 70 : p.mor;
    for (const p of sq) {
      const list = (L.mem[p.id] || []).filter(m => --m[2] > 0);
      L.mem[p.id] = list;
      const c = charOf(S, p.id);
      let target = 64 + CHAR[c].base + U.sum(list, m => m[1]) + LK().boss(S, p.id) / 8 + streak * (c === 'amb' ? 1.6 : c === 'pro' ? 0.6 : 1.1);
      let rip = 0;
      for (const q of sq) {
        if (q.id === p.id || LK().rel(S, p.id, q.id) < 40) continue;
        rip += (before[q.id] - 66) * inf[q.id] / 100 * 0.12 * (CHAR[charOf(S, q.id)].spread || 1);
      }
      target = U.clamp(target + U.clamp(rip, -6, 6), 8, 99);
      p.mor = U.clamp(Math.round((before[p.id] + (target - before[p.id]) * 0.3) * 10) / 10, 0, 100);
    }
    // Informe del segundo entrenador al empezar la temporada: te cuenta cómo son algunos
    if (L.report !== S.season && S.week >= 1) {
      L.report = S.season;
      const lv = TL.Staff ? TL.Staff.lv(S, 'assistant') : 0;
      if (lv > 0) {
        const unknown = sq.filter(p => known(S, p.id) < 2).sort((a, b) => influence(S, b, rank) - influence(S, a, rank)).slice(0, 1 + lv);
        if (unknown.length) {
          unknown.forEach(p => { L.know[p.id] = 2; });
          TL.Game.mail(S, 'Informe del segundo entrenador', 'Te he preparado unas notas sobre el carácter de algunos: ' +
            unknown.map(p => `${p.short} es ${charName(S, charOf(S, p.id)).toLowerCase()}`).join(', ') + '. Úsalo en el despacho.', 'good');
        }
      }
    }
  }

  // ------------------------------------------------------------ Para la ficha del jugador
  function profile(S, p) {
    const k = charOf(S, p.id), kn = known(S, p.id);
    return { key: k, known: kn, icon: CHAR[k].icon, name: kn >= 2 ? charName(S, k) : null, hint: kn === 1 ? CHAR[k].hint : null, desc: kn >= 2 ? charDesc(S, k) : null,
      influence: influence(S, p, rankOf(S)), memories: memories(S, p.id), conf: conf(S, p.id) };
  }

  TL.Social = {
    CHAR, KINDS, charOf, charName, known, learn, remember, memories, influence, heavyweights,
    agendaMax, agendaLeft, agendaUsed, useAgenda, active, spawn, options, resolve, tick, profile, react, hasGalones, galonesLeft, st, conf, setConf, restoreConf
  };
})();
