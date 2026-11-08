/* TOUCHLINE — el día a día: calendario por días, eventos, limit break, almas y objetos
 *
 * El calendario avanza día a día de partido a partido y se para cuando pasa algo: el sábado
 * juegas y el martes, ¡bum!, un jugador la lía, llega un programa experimental, alguien juega
 * como una leyenda reencarnada o te retan a un partido especial.
 *
 * - La base de datos está en data/game/eventos.js: eventos (con sus variantes), objetos y almas.
 * - Cada evento tiene una probabilidad por periodo (semana, mes, trimestre o temporada) para
 *   cada jugador que cumple sus condiciones, o para el club. Aquí se pasa a probabilidad diaria:
 *   1 − (1 − p)^(1/días del periodo). Los días de partido no hay eventos.
 * - Como mucho dos paradas entre partido y partido, y nunca dos días seguidos.
 * - Limit break: muy de vez en cuando, un jugador de techo bajo que juega y rinde con el equipo
 *   en buena racha rompe su límite (potencial entre 85 y 95).
 * - Partidos especiales: un amistoso exprés contra un rival peculiar; si ganas, objeto (o alma).
 * - Modo fantasía: almas con poderes que se equipan a los jugadores. Los objetos existen en los
 *   dos modos. Un alma rinde entera en su línea del campo y a medias fuera de ella.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World;
  const LK = () => TL.Locker;
  const DB = () => window.TL_EVENTOS || { events: [], items: {}, souls: {}, cats: {} };
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);

  /** Rasgos de doble filo: los que pueden liarla cada cierto tiempo. */
  const CONFLICT = ['ego', 'hothead', 'party', 'diva', 'reborn'];
  const MAX_STOPS = 2;                         // paradas entre partido y partido
  const ABS = (S, d) => S.season * 400 + d;    // día absoluto (para enfriamientos)
  const LB_P = 1 / 1400;                       // limit break: por jugador que cumple y semana (≈ 1 cada 3-4 temporadas)
  const RATE = 1.5;                            // ritmo general de los eventos (no toca los de probabilidad fija)

  // ------------------------------------------------------------ Estado
  function st(S) {
    if (!S.ev) S.ev = {};
    const E = S.ev;
    if (E.d == null) E.d = S.week > 0 ? 7 * (S.week - 1) : -5;
    if (E.m0 == null) E.m0 = S.week > 0 ? 7 * (S.week - 1) : -5;
    E.n = E.n || 0;
    E.cd = E.cd || {};
    E.seen = E.seen || {};
    E.log = E.log || [];
    E.q = E.q || [];
    E.away = E.away || {};
    E.souls = E.souls || [];
    E.items = E.items || [];
    E.lb = E.lb || {};
    E.uid = E.uid || 1;
    if (E.pend === undefined) E.pend = null;
    if (E.fan == null) E.fan = false;
    return E;
  }
  const fantasy = S => !!(S && S.ev && S.ev.fan);
  const dirtyFx = S => { if (S.lk) S.lk._fx = null; };

  /** Partida nueva: modo fantasía y, si lo hay, un alma para empezar. */
  function start(S, fan) {
    const E = st(S);
    E.fan = !!fan;
    E.d = -5; E.m0 = -5; E.n = 0;
    if (E.fan) {
      const k = U.pick(Object.keys(DB().souls).filter(k => DB().souls[k].starter));
      if (k) giveSoul(S, k);
      TL.Game.mail(S, 'Modo fantasía', 'En este mundo el fútbol tiene algo de magia: las almas de las leyendas se pueden equipar a tus jugadores y les dan poderes. Empiezas con una en tu inventario (Plantilla → Almas y objetos). Encontrarás más en eventos y partidos especiales.', 'good');
    }
  }
  function newSeason(S) {
    const E = st(S);
    E.d = -5; E.m0 = -5; E.n = 0; E.lastStop = null; E.pend = null;
    E.q = E.q.filter(x => x.s === S.season);
    E.away = {};
    syncAway(S);
  }
  function init(S) {
    if (S.user == null || S.mode === 'tour') return;
    st(S);
    syncAway(S);
  }

  // ------------------------------------------------------------ Calendario
  /** Día del próximo partido (la copa va entre semana, el miércoles). */
  function matchDay(S) {
    if (!S || S.mode === 'tour' || S.over || S.user == null || S.fired) return null;
    return TL.Cups.pendingUser(S) ? 7 * S.week - 3 : 7 * S.week;
  }
  function dateOf(S, d) { const x = U.dateOf(S.season, 0); x.setUTCDate(x.getUTCDate() + d); return x; }
  function daysLeft(S) { const md = matchDay(S); return md == null ? 0 : Math.max(0, md - st(S).d); }

  /** Avanza un día. { ready } cuando toca jugar; { ev } si pasa algo; { pend } si hay algo sin resolver. */
  function step(S) {
    const E = st(S);
    if (E.pend) return { pend: E.pend };
    const md = matchDay(S);
    if (md == null || E.d >= md) return { ready: true };
    E.d++;
    syncAway(S);
    if (E.d >= md) return { ready: true, day: E.d };
    const ev = roll(S);
    return { day: E.d, ev };
  }

  /** Se ha jugado el partido del día md. */
  function played(S, md) {
    const E = st(S);
    if (md != null) { E.d = Math.max(E.d, md); E.m0 = md; }
    E.n = 0;
    if (E.pend) { E.pend = null; } // lo que no se atendió, se queda sin atender
    release(S);
    dirtyFx(S);
    syncAway(S);
  }

  /** Jugadores fuera unos días (programa, viaje familiar…): no se pueden alinear. */
  function syncAway(S) {
    const E = S.ev;
    if (!E) return;
    const now = ABS(S, E.d);
    for (const id in E.away) {
      const p = S.players[id];
      if (!p || E.away[id] <= now) { if (p) p.away = 0; delete E.away[id]; } else p.away = 1;
    }
  }
  function sendAway(S, p, days) {
    const E = st(S);
    E.away[p.id] = ABS(S, E.d) + days;
    p.away = 1;
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
  }

  // ------------------------------------------------------------ Contexto y condiciones
  const squad = S => W().squad(S, S.user);
  function share(S, p) { return S.week >= 4 ? ((S.stats[p.id] || [0])[0]) / Math.max(1, S.week) : null; }
  function avgRating(S, p) { const s = S.stats[p.id]; return s && s[0] ? s[3] / s[0] : null; }
  /** Puntos de los últimos cinco partidos (0 a 1). */
  function form(S) {
    let pts = 0, n = 0;
    for (let r = S.week - 1; r >= 0 && n < 5; r--) {
      const m = (S.fixtures[r] || []).find(m => m[0] === S.user || m[1] === S.user);
      if (!m || m[2] == null || m[2] < 0) continue;
      const a = m[0] === S.user ? m[2] : m[3], b = m[0] === S.user ? m[3] : m[2];
      pts += a > b ? 3 : a === b ? 1 : 0; n++;
    }
    return n ? pts / (3 * n) : 0.5;
  }
  function foreign(S, p) {
    const c = S.leagues[S.clubs[S.user].league].country;
    return !!(S.nations[p.nat] && S.nations[p.nat][0] !== c);
  }
  const inR = (v, r) => v != null && v >= r[0] && v <= r[1];
  function ctxOf(S) {
    const sq = squad(S).slice().sort((a, b) => b.ovr - a.ovr);
    const rank = {};
    sq.forEach((p, i) => { rank[p.id] = i; });
    return { sq, rank, form: form(S), fan: fantasy(S) };
  }

  /** ¿Cumple las condiciones? (c = condiciones del evento o de la variante). */
  function cond(S, c, p, ctx) {
    if (!c) return true;
    if (c.fan != null && ctx.fan !== c.fan) return false;
    if (c.g && S.gender !== c.g) return false;
    if (c.wk && !inR(S.week, c.wk)) return false;
    if (c.form === 'good' && ctx.form < 0.6) return false;
    if (c.form === 'bad' && ctx.form > 0.34) return false;
    if (c.window && !TL.Market.windowOpen(S)) return false;
    if (c.cash === 'rich' && S.clubs[S.user].cash < W().wageBill(S, S.user) * 20) return false;
    if (c.cash === 'poor' && S.clubs[S.user].cash > W().wageBill(S, S.user) * 6) return false;
    if (c.items && !st(S).items.length) return false;
    if (c.souls && !st(S).souls.length) return false;
    if (!p) return true;
    const L = LK();
    if (c.mor && !inR(p.mor == null ? 70 : p.mor, c.mor)) return false;
    if (c.age && !inR(p.age, c.age)) return false;
    if (c.pos && !c.pos.includes(p.pos)) return false;
    if (c.line != null && ![].concat(c.line).includes(F.LINE[p.pos])) return false;
    if (c.ovr && !inR(p.ovr, c.ovr)) return false;
    if (c.pot && !inR(p.pot, c.pot)) return false;
    if (c.share && !inR(share(S, p), c.share)) return false;
    if (c.rank && !inR(ctx.rank[p.id], c.rank)) return false;
    if (c.trait && !L.hasTrait(S, p.id, c.trait)) return false;
    if (c.traits && !c.traits.some(t => L.hasTrait(S, p.id, t))) return false;
    if (c.no && [].concat(c.no).some(t => L.hasTrait(S, p.id, t))) return false;
    if (c.conflict && !CONFLICT.some(t => L.hasTrait(S, p.id, t))) return false;
    if (c.foreign != null && foreign(S, p) !== c.foreign) return false;
    if (c.inj != null && (p.inj > 0) !== c.inj) return false;
    if (c.fit && !inR(p.fit, c.fit)) return false;
    if (c.boss && !inR(L.boss(S, p.id), c.boss)) return false;
    if (c.lb != null && !!st(S).lb[p.id] !== c.lb) return false;
    if (c.soul != null && !!soulOf(S, p.id) !== c.soul) return false;
    if (c.goals && !inR((S.stats[p.id] || [0, 0])[1], c.goals)) return false;
    if (c.rating && !inR(avgRating(S, p), c.rating)) return false;
    if (c.loan && !L.loanOf(S, p.id)) return false;
    if (p.away || L.loanOf(S, p.id) && L.loanOf(S, p.id).from === S.user) return false;
    return true;
  }

  // ------------------------------------------------------------ Probabilidades
  function periodDays(S, per) {
    if (per === 'season') return Math.max(70, 7 * (S.fixtures ? S.fixtures.length : 38));
    return { day: 1, week: 7, month: 30, quarter: 91 }[per] || 7;
  }
  /** Probabilidad de que salga hoy (6 de cada 7 días pueden tener evento). */
  function dayP(S, def) {
    let p = def.p * (def.fixed ? 1 : RATE);
    if (def.tone === 'neg' && !def.fixed) {
      const b = TL.Manager.B(S);
      p *= def.cat === 'escandalo' ? b.scandal : b.conflict;
      if (def.cat === 'escandalo' && TL.Commerce.fx) p *= 1 - TL.Commerce.fx(S, 'shield') * 0.3;
    }
    p = Math.min(0.999, p);
    return 1 - Math.pow(1 - p, 7 / 6 / periodDays(S, def.per || 'season'));
  }

  const byId = id => DB().events.find(e => e.id === id);
  function cooling(S, key) { const E = st(S); return E.cd[key] != null && E.cd[key] > ABS(S, E.d); }

  /** Variantes posibles de un evento para este jugador. */
  function variants(S, def, p, ctx) {
    if (!def.var) return [null];
    return def.var.map((v, i) => [v, i]).filter(([v]) => cond(S, v.if, p, ctx) && (!v.tr || (p && LK().hasTrait(S, p.id, v.tr)))).map(x => x[1]);
  }

  /** El día de hoy: ¿pasa algo? Devuelve la instancia del evento (o null). */
  function roll(S, force) {
    const E = st(S);
    const now = ABS(S, E.d);
    // Lo que tenía que volver (encadenados) llega puntual, aunque no queden paradas
    const due = E.q.find(x => x.at <= now);
    if (due) {
      E.q = E.q.filter(x => x !== due);
      const def = byId(due.id), p = due.pid != null ? S.players[due.pid] : null;
      if (def && (due.pid == null || (p && p.club === S.user))) return fire(S, make(S, def, p, due.qid != null ? S.players[due.qid] : null, due.vi, due.v));
    }
    if (!force && (E.n >= MAX_STOPS || (E.lastStop != null && now - E.lastStop < 2))) return null;
    const ctx = ctxOf(S);
    // Limit break: se mira una vez por semana, el primer día tras el partido
    const lb = lbCheck(S, ctx);
    if (lb) return fire(S, make(S, byId('limit_break'), lb, null, null));
    for (const def of U.shuffle(DB().events.slice())) {
      if (def.manual || !cond(S, def.club, null, ctx)) continue;
      if (def.once && E.seen[def.id] === S.season) continue;
      if (def.gap && E.seen[def.id] != null && S.season - E.seen[def.id] < def.gap) continue;
      if (cooling(S, def.id)) continue;
      const pd = dayP(S, def);
      if (def.who === 'c') {
        if (Math.random() >= pd) continue;
        // Evento del club que va con alguien: uno de los que cumplen las condiciones
        let p = null;
        if (def.if) {
          const cands = ctx.sq.filter(x => cond(S, def.if, x, ctx) && !cooling(S, 'p:' + x.id));
          if (!cands.length) continue;
          p = U.pick(cands);
        }
        const vs = variants(S, def, p, ctx);
        if (!vs.length) continue;
        return fire(S, make(S, def, p, null, pickVar(def, vs)));
      }
      for (const p of U.shuffle(ctx.sq.slice())) {
        if (!cond(S, def.if, p, ctx) || cooling(S, def.id + ':' + p.id) || cooling(S, 'p:' + p.id)) continue;
        if (Math.random() >= pd) continue;
        const vs = variants(S, def, p, ctx);
        if (!vs.length) continue;
        let q = null;
        if (def.who === 'pp') {
          const mates = ctx.sq.filter(x => x.id !== p.id && cond(S, def.if2, x, ctx) && (!def.rel || inR(LK().rel(S, p.id, x.id), def.rel)));
          q = mates.length ? U.pick(mates) : null;
          if (!q) continue;
        }
        return fire(S, make(S, def, p, q, pickVar(def, vs)));
      }
    }
    return null;
  }
  const pickVar = (def, vs) => (def.var ? U.weighted(vs, i => def.var[i].w || 1) : null);

  /** Crea la instancia: quién, qué variante y las partes variables del texto. */
  function make(S, def, p, q, vi, v0) {
    const inst = { id: def.id, pid: p ? p.id : null, qid: q ? q.id : null, vi: vi == null ? null : vi, d: st(S).d, s: S.season, v: Object.assign({}, v0 || {}) };
    const D = Object.assign({}, def, vi != null ? def.var[vi] : {});
    if (D.x && inst.v.x == null) inst.v.x = F.roundMoney(Math.max(D.x[2] || 3000, W().wageBill(S, S.user) * U.rand(D.x[0], D.x[1])));
    if (D.give && inst.v.k == null) inst.v.k = D.give === 'soul' ? (fantasy(S) ? randomSoul(S, p) : randomItem(S)) : D.give === 'item' ? randomItem(S) : D.give;
    if (inst.v.r == null) {
      const fx = TL.Season.nextFixture(S);
      const rid = fx ? (fx[0] === S.user ? fx[1] : fx[0]) : U.pick(W().userLeague(S).clubs.filter(id => id !== S.user));
      inst.v.r = rid;
    }
    return inst;
  }
  /** Lo que pasa al salir: se para el calendario y se aplica lo inmediato. */
  function fire(S, inst) {
    const E = st(S), def = byId(inst.id), D = full(def, inst);
    const now = ABS(S, E.d);
    E.pend = inst; E.n++; E.lastStop = now;
    E.cd[def.id] = now + (def.cd != null ? def.cd : 21);
    if (inst.pid != null) {
      E.cd[def.id + ':' + inst.pid] = now + (def.cdp != null ? def.cdp : 70);
      E.cd['p:' + inst.pid] = now + 6;
    }
    if (def.once || def.gap) E.seen[def.id] = S.season;
    const out = { chips: [] };
    if (D.now) apply(S, D.now, inst, out);
    if (def.id === 'limit_break') inst.lb = limitBreak(S, S.players[inst.pid]);
    inst.chips = out.chips;
    for (const k in E.cd) if (E.cd[k] < now) delete E.cd[k];
    W().dirty(S);
    return inst;
  }
  /** Evento con su variante ya mezclada. */
  function full(def, inst) { return inst.vi != null && def.var ? Object.assign({}, def, def.var[inst.vi]) : def; }

  // ------------------------------------------------------------ Textos
  function fill(S, s, inst) {
    if (!s) return '';
    const p = inst.pid != null ? S.players[inst.pid] : null, q = inst.qid != null ? S.players[inst.qid] : null;
    const it = inst.v.k ? (DB().items[inst.v.k] || DB().souls[inst.v.k]) : null;
    return s.replace(/\{(\w+)\}/g, (m, k) => {
      switch (k) {
        case 'n': return p ? p.name : '';
        case 's': return p ? p.short : '';
        case 'o': return q ? q.short : '';
        case 'on': return q ? q.name : '';
        case 'c': return S.clubs[S.user].name;
        case 'r': return S.clubs[inst.v.r] ? S.clubs[inst.v.r].name : '';
        case 'm': return S.manager;
        case 'x': return U.money(inst.v.x || 0);
        case 'k': return it ? it.name : '';
        case 'pos': return p ? F.POS_ES[p.pos].toLowerCase() : '';
        default: return m;
      }
    });
  }
  const pick = (S, D, k) => (S.gender === 'F' && D[k + 'F'] != null ? D[k + 'F'] : D[k]);
  /** Lo que se enseña: título, texto, opciones (con sus condiciones). */
  function view(S, inst) {
    const def = byId(inst.id);
    if (!def) return null;
    const D = full(def, inst), ctx = ctxOf(S);
    const p = inst.pid != null ? S.players[inst.pid] : null;
    const cat = DB().cats[def.cat] || { name: def.cat, icon: '⚡' };
    const opts = (D.o || []).map((o, k) => ({ k, o })).filter(({ o }) => cond(S, o.if, p, ctx) && (!o.need || canPay(S, o, inst)))
      .map(({ k, o }) => ({ k, l: fill(S, pick(S, o, 'l'), inst), d: fill(S, pick(S, o, 'd'), inst) }));
    return {
      id: def.id, cat: def.cat, catName: cat.name, icon: D.icon || cat.icon, tone: D.tone || def.tone || 'neu',
      title: fill(S, pick(S, D, 't'), inst), body: fill(S, pick(S, D, 'b'), inst), chips: inst.chips || [],
      pid: inst.pid, qid: inst.qid, date: dateOf(S, inst.d), opts: opts.length ? opts : [{ k: -1, l: 'Entendido', d: '' }],
      sm: D.sm || null, lb: inst.lb || null, reward: inst.v.k ? (DB().souls[inst.v.k] ? { soul: true, k: inst.v.k } : { k: inst.v.k }) : null
    };
  }
  function canPay(S, o, inst) {
    const bill = W().wageBill(S, S.user);
    const v = o.fx && o.fx.cost ? (o.fx.cost === 'x' ? inst.v.x : bill * o.fx.cost) : 0;
    return S.clubs[S.user].cash >= v;
  }

  // ------------------------------------------------------------ Decidir
  /** Resuelve el evento en curso con la opción k. */
  function resolve(S, k) {
    const E = st(S), inst = E.pend;
    if (!inst) return { ok: false, msg: 'No hay nada pendiente.' };
    const def = byId(inst.id), D = full(def, inst);
    const p = inst.pid != null ? S.players[inst.pid] : null;
    const vw = view(S, inst);
    E.pend = null;
    if (inst.pid != null && (!p || p.club !== S.user)) return { ok: true, title: vw.title, msg: 'Ya no está en el club: el asunto se olvida.', chips: [] };
    const o = k >= 0 && D.o ? D.o[k] : null;
    let fx = o ? o.fx : null, res = o ? pick(S, o, 'r') : '';
    let tone = o && o.tone;
    if (o && o.odds) {
      const r = Math.random();
      let acc = 0;
      for (const alt of o.odds) {
        acc += alt.p;
        if (r < acc || alt === o.odds[o.odds.length - 1]) { fx = alt.fx; res = pick(S, alt, 'r'); tone = alt.tone || tone; break; }
      }
    }
    const out = { chips: [] };
    apply(S, fx, inst, out);
    if (!tone) { const net = out.chips.reduce((a, c) => a + c[1], 0); tone = net > 0 ? 'good' : net < 0 ? 'bad' : null; }
    const label = o ? fill(S, pick(S, o, 'l'), inst) : '';
    let msg = fill(S, res, inst);
    if (out.match) {
      const mm = out.match, rw = mm.reward && (DB().items[mm.reward.k] || DB().souls[mm.reward.k]);
      msg = `${mm.a}-${mm.b} contra ${mm.opp}. ` + (mm.pens ? `Penaltis: ${mm.pens[0]}-${mm.pens[1]}. ` : '') + (mm.win ? (rw ? `Premio: ${rw.name}.` : '¡Victoria!') : 'Sin premio esta vez.');
      tone = mm.win ? 'good' : 'bad';
    }
    E.log.unshift({ s: S.season, d: inst.d, id: inst.id, pid: inst.pid, t: vw.title, r: msg, c: def.cat });
    if (E.log.length > 60) E.log.length = 60;
    // Queda en el buzón, con lo que decidiste
    TL.Game.mail(S, vw.title, vw.body, tone === 'good' ? 'good' : 'news');
    const m = S.inbox[0];
    m.read = true; m.done = true; m.res = (label ? label + ' · ' : '') + msg;
    if (D.news && (!o || o.news !== false)) TL.News.add(S, D.news, vw.title, msg || vw.body, S.user, inst.pid, def.tone === 'pos' ? 'pos' : def.tone === 'neg' ? 'neg' : 'neu');
    W().dirty(S);
    return Object.assign({ ok: true, title: vw.title, label, msg, tone, pid: inst.pid }, out);
  }

  /** Efectos de una decisión. Cada uno deja una etiqueta para enseñarlo. */
  function apply(S, fx, inst, out) {
    if (!fx) return;
    const p = inst.pid != null ? S.players[inst.pid] : null, q = inst.qid != null ? S.players[inst.qid] : null;
    const c = S.clubs[S.user], bill = W().wageBill(S, S.user), L = LK();
    const sq = squad(S);
    const chip = (t, good) => out.chips.push([t, good == null ? 0 : good ? 1 : -1]);
    const sign = v => (v > 0 ? '+' : '') + v;
    const mor = (x, d) => { if (x) x.mor = U.clamp(Math.round((x.mor == null ? 70 : x.mor) + d), 0, 100); };
    if (fx.mor && p) { mor(p, fx.mor); chip(`${sign(fx.mor)} moral (${p.short})`, fx.mor > 0); }
    if (fx.mor2 && q) { mor(q, fx.mor2); chip(`${sign(fx.mor2)} moral (${q.short})`, fx.mor2 > 0); }
    if (fx.team) { for (const x of sq) mor(x, fx.team); chip(`${sign(fx.team)} moral del vestuario`, fx.team > 0); }
    if (fx.boss && p) { L.bossAdd(S, p.id, fx.boss); chip(`${sign(fx.boss)} relación con ${p.short}`, fx.boss > 0); }
    if (fx.boss2 && q) { L.bossAdd(S, q.id, fx.boss2); chip(`${sign(fx.boss2)} relación con ${q.short}`, fx.boss2 > 0); }
    if (fx.bond && p && q) { L.bond(S, p.id, q.id, fx.bond); chip(`${p.short} y ${q.short}: ${fx.bond > 0 ? 'más unidos' : 'más distanciados'}`, fx.bond > 0); }
    let money = 0;
    if (fx.cost) money -= fx.cost === 'x' ? inst.v.x : Math.round(bill * fx.cost);
    if (fx.gain) money += fx.gain === 'x' ? inst.v.x : Math.round(bill * fx.gain);
    if (fx.fine && p) money += Math.round(p.wage * fx.fine);
    if (money) { c.cash += money; chip(`${money > 0 ? '+' : '−'}${U.money(Math.abs(money))}`, money > 0); }
    if (fx.fans && S.com) { S.com.fans = Math.round(S.com.fans * (1 + fx.fans)); chip(`Afición: ${fx.fans > 0 ? '+' : '−'}${Math.round(Math.abs(fx.fans) * 1000) / 10} %`, fx.fans > 0); }
    if (fx.board) { S.board.conf = U.clamp(Math.round((S.board.conf + fx.board) * 10) / 10, 0, 100); chip(`Directiva: ${sign(fx.board)}`, fx.board > 0); }
    if (fx.fit && p) { p.fit = U.clamp(p.fit + fx.fit, 30, 100); chip(`${sign(fx.fit)} % forma (${p.short})`, fx.fit > 0); }
    if (fx.teamFit) { for (const x of sq) x.fit = U.clamp(x.fit + fx.teamFit, 30, 100); chip(`${sign(fx.teamFit)} % forma del equipo`, fx.teamFit > 0); }
    if (fx.inj && p) { const w = Array.isArray(fx.inj) ? U.int(fx.inj[0], fx.inj[1]) : fx.inj; p.inj = Math.max(p.inj, w); chip(`${p.short}: baja ${w} sem.`, false); }
    if (fx.sus && p) { p.sus = Math.max(p.sus, fx.sus); chip(`${p.short}: ${fx.sus} partido${fx.sus > 1 ? 's' : ''} sin jugar`, false); }
    if (fx.away && p) { sendAway(S, p, fx.away); chip(`${p.short}: fuera ${fx.away} días`, null); }
    if (fx.conf && p && TL.Social) { TL.Social.setConf(S, p, fx.conf[0], fx.conf[1]); chip(`${p.short}: ${fx.conf[0] > 1 ? 'subidón' : 'bajón'} ${fx.conf[1]} jornada${fx.conf[1] > 1 ? 's' : ''}`, fx.conf[0] > 1); }
    if (fx.teamConf && TL.Social) {
      const xi = (S.tactics.slots || []).map(id => S.players[id]).filter(x => x && x.club === S.user);
      for (const x of xi) TL.Social.setConf(S, x, fx.teamConf[0], fx.teamConf[1]);
      chip(`Once: ${fx.teamConf[0] > 1 ? 'subidón' : 'bajón'} ${fx.teamConf[1]} jornada${fx.teamConf[1] > 1 ? 's' : ''}`, fx.teamConf[0] > 1);
    }
    if (fx.ovr && p) { L.raise(S, p, fx.ovr); if (p.pot < p.ovr) p.pot = p.ovr; chip(`${p.short}: media ${sign(fx.ovr)}`, fx.ovr > 0); }
    if (fx.pot && p) { p.pot = U.clamp(p.pot + fx.pot, p.ovr, 95); chip(`${p.short}: potencial ${sign(fx.pot)}`, fx.pot > 0); }
    if (fx.trait && p) {
      const t = fx.trait === 'dna' ? U.pick(Object.values(L.DNA)).trait : fx.trait;
      L.addTrait(S, p.id, t); chip(`${p.short} gana «${L.traitInfo(S, t).name}»`, !CONFLICT.includes(t));
    }
    if (fx.untrait && p && L.hasTrait(S, p.id, fx.untrait)) { L.removeTrait(S, p.id, fx.untrait); chip(`${p.short} pierde «${L.traitInfo(S, fx.untrait).name}»`, CONFLICT.includes(fx.untrait)); }
    if (fx.ego && p && L.hasTrait(S, p.id, 'ego')) { L.removeTrait(S, p.id, 'ego'); L.addTrait(S, p.id, 'egoTeam'); chip(`${p.short} gana «${L.traitInfo(S, 'egoTeam').name}»`, true); }
    if (fx.list && p) { p.listed = true; chip(`${p.short}: en venta`, null); }
    if (fx.promise && p) { L.state(S).promises.push({ pid: p.id, apps0: (S.stats[p.id] || [0])[0], need: 2, until: S.week + 4 }); chip(`Promesa: 2 partidos de 4 para ${p.short}`, null); }
    if (fx.xp) TL.Manager.addXp(S, fx.xp);
    if (fx.item) { const k = fx.item === 'k' ? inst.v.k : fx.item === 'random' ? randomItem(S) : fx.item; out.reward = giveItem(S, k); }
    if (fx.soul) {
      const k = fx.soul === 'k' ? inst.v.k : fx.soul === 'random' ? randomSoul(S, fx.equip ? p : null) : fx.soul;
      out.reward = fantasy(S) && DB().souls[k] ? giveSoul(S, k, fx.equip && p ? p.id : null) : giveItem(S, randomItem(S));
    }
    if (fx.unsoul && p) { const so = soulOf(S, p.id); if (so) { equip(S, 'soul', so.u, null); chip(`${so.def.name}: al inventario`, null); } }
    if (fx.play) out.match = specialMatch(S, inst, fx);
    if (fx.next) {
      const E = st(S);
      E.q.push({ id: fx.next[0], at: ABS(S, E.d) + fx.next[1], pid: inst.pid, qid: inst.qid, vi: fx.next[2] == null ? null : fx.next[2], v: inst.v, s: S.season });
    }
  }

  // ------------------------------------------------------------ Partidos especiales
  /** Amistoso exprés contra un rival peculiar. fx.play: 1 titulares · 0.9 mezcla · 0.8 canteranos. */
  function specialMatch(S, inst, fx) {
    const def = byId(inst.id), D = full(def, inst), sm = D.sm || {};
    const sq = squad(S).filter(p => p.inj <= 0 && !p.away).sort((a, b) => b.ovr - a.ovr);
    const pool = fx.play >= 1 ? sq.slice(0, 11) : fx.play >= 0.9 ? sq.slice(5, 16) : sq.slice().sort((a, b) => a.age - b.age || b.ovr - a.ovr).slice(0, 11);
    const mine = (pool.length ? U.sum(pool, p => p.ovr) / pool.length : 50) + (fx.play >= 1 ? 1 : 0);
    const opp = S.clubs[S.user].rep + (sm.rel || 0) + U.rand(-2.5, 2.5);
    const diff = mine - opp;
    let a = U.poisson(Math.max(0.3, 1.45 * Math.exp(0.085 * diff)));
    let b = U.poisson(Math.max(0.3, 1.45 * Math.exp(-0.085 * diff)));
    a = Math.min(a, 7); b = Math.min(b, 7);
    let pens = null;
    if (a === b) { const w = Math.random() < U.clamp(0.5 + diff * 0.012, 0.25, 0.75); pens = w ? [U.int(4, 5), U.int(2, 4)] : [U.int(2, 4), U.int(4, 5)]; if (pens[0] === pens[1]) pens[w ? 0 : 1]++; }
    const win = a > b || (pens && pens[0] > pens[1]);
    // Quién marca (de los tuyos) y en qué minuto
    const att = pool.filter(p => F.LINE[p.pos] >= 2);
    const goals = [];
    for (let i = 0; i < a; i++) goals.push({ t: 0, min: U.int(3, 89), who: (U.weighted(att.length ? att : pool, p => p.st[1]) || {}).short || '' });
    for (let i = 0; i < b; i++) goals.push({ t: 1, min: U.int(3, 89) });
    goals.sort((x, y) => x.min - y.min);
    const out = { a, b, pens, win, opp: fill(S, pick(S, sm, 'opp') || '', inst), goals, chips: [] };
    // Titulares: cansancio y algún golpe · canteranos: un subidón para ellos
    if (fx.play >= 1) {
      pool.forEach(p => { p.fit = U.clamp(p.fit - 10, 30, 100); });
      if (Math.random() < 0.15 && pool.length) { const x = U.pick(pool); x.inj = Math.max(x.inj, U.int(1, 2)); out.hurt = x.short; }
    } else if (fx.play < 0.9) pool.forEach(p => { p.mor = U.clamp((p.mor == null ? 70 : p.mor) + 4, 0, 100); });
    if (win) {
      const k = sm.win === 'soul' ? (fantasy(S) ? randomSoul(S) : randomItem(S)) : sm.win === 'item' || !sm.win ? (inst.v.k || randomItem(S)) : sm.win;
      out.reward = DB().souls[k] ? giveSoul(S, k) : giveItem(S, k);
      if (S.com) S.com.fans = Math.round(S.com.fans * 1.004);
    } else if (S.com && sm.fans) S.com.fans = Math.round(S.com.fans * (1 + sm.fans));
    return out;
  }

  // ------------------------------------------------------------ Limit break
  function lbCheck(S, ctx) {
    const E = st(S), wk = S.season * 100 + S.week;
    if (E.lbW === wk) return null;
    E.lbW = wk;
    if (S.week < 6 || ctx.form < 0.5) return null;
    const top = TL.Season.table(S).findIndex(r => r.id === S.user) < 4;
    const cands = ctx.sq.filter(p => p.pot < 85 && p.age <= 31 && !E.lb[p.id] && !p.away && (share(S, p) || 0) >= 0.6 && (avgRating(S, p) || 0) >= 6.7);
    for (const p of U.shuffle(cands)) {
      let pr = LB_P * (avgRating(S, p) >= 7.2 ? 2 : 1) * (ctx.form >= 0.75 ? 1.5 : 1) * (top ? 1.3 : 1);
      if (Math.random() < pr) return p;
    }
    return null;
  }
  /** Rompe el límite: potencial entre 85 y 95 y un empujón inmediato. */
  function limitBreak(S, p) {
    if (!p) return null;
    const E = st(S);
    const from = p.pot, o0 = p.ovr;
    const to = Math.max(from + 1, U.int(85, 95));
    p.pot = Math.min(95, to);
    LK().raise(S, p, U.int(2, 4));
    p.pot = Math.max(p.pot, p.ovr);
    p.mor = Math.max(p.mor == null ? 70 : p.mor, 92);
    LK().addTrait(S, p.id, 'limitBreak');
    E.lb[p.id] = { s: S.season, from, to: p.pot, o0, o1: p.ovr };
    dirtyFx(S);
    TL.News.add(S, 'positivo', `${p.short} rompe su límite`, `Nadie lo esperaba de ${p.name}. Ahora juega con un aura distinta y en ${S.clubs[S.user].name} hablan de un antes y un después.`, S.user, p.id, 'pos');
    return { pid: p.id, from, to: p.pot, o0, o1: p.ovr };
  }
  const isLB = (S, pid) => !!(S.ev && S.ev.lb && S.ev.lb[pid]);

  // ------------------------------------------------------------ Objetos y almas
  function randomItem(S) {
    const all = Object.keys(DB().items), have = new Set(st(S).items.map(x => x.k));
    const fresh = all.filter(k => !have.has(k));
    return U.weighted(fresh.length ? fresh : all, k => DB().items[k].w || 1);
  }
  /** Un alma al azar (mejor una que aún no tengas y, si va para alguien, de su línea del campo). */
  function randomSoul(S, p) {
    const all = Object.keys(DB().souls).filter(k => !DB().souls[k].hidden), have = new Set(st(S).souls.map(x => x.k));
    const fresh = all.filter(k => !have.has(k));
    const pool = fresh.length ? fresh : all;
    const fit = p ? pool.filter(k => affinity(DB().souls[k], p) >= 1) : [];
    return U.weighted(fit.length ? fit : pool, k => DB().souls[k].w || 1);
  }
  function giveItem(S, k) {
    const E = st(S);
    if (!DB().items[k]) return null;
    const it = { u: E.uid++, k, pid: null };
    E.items.push(it);
    return { kind: 'item', k, u: it.u };
  }
  function giveSoul(S, k, pid) {
    const E = st(S);
    if (!DB().souls[k]) return null;
    const it = { u: E.uid++, k, pid: null };
    E.souls.push(it);
    if (pid != null) equip(S, 'soul', it.u, pid);
    return { kind: 'soul', k, u: it.u, pid: pid == null ? null : pid };
  }
  const listOf = (S, kind) => (kind === 'soul' ? st(S).souls : st(S).items);
  function soulOf(S, pid) { const x = S.ev && S.ev.souls.find(s => s.pid === pid); return x ? Object.assign({ def: DB().souls[x.k] }, x) : null; }
  function itemOf(S, pid) { const x = S.ev && S.ev.items.find(s => s.pid === pid); return x ? Object.assign({ def: DB().items[x.k] }, x) : null; }
  /** ¿Puede llevarlo? (porteros con lo de porteros, y las almas solo en modo fantasía). */
  function canEquip(S, kind, k, p) {
    const d = kind === 'soul' ? DB().souls[k] : DB().items[k];
    if (!d || !p || p.club !== S.user) return false;
    if (kind === 'soul' && !fantasy(S)) return false;
    if (d.gk === true && p.pos !== 'GK') return false;
    if (d.gk === false && p.pos === 'GK') return false;
    return true;
  }
  function equip(S, kind, u, pid) {
    const list = listOf(S, kind), it = list.find(x => x.u === u);
    if (!it) return { ok: false, msg: 'No lo encuentro en el inventario.' };
    const p = pid == null ? null : S.players[pid];
    if (p && !canEquip(S, kind, it.k, p)) return { ok: false, msg: kind === 'soul' ? 'Esa alma no encaja con ese jugador.' : 'Ese objeto no le sirve.' };
    if (p) for (const x of list) if (x.pid === pid) x.pid = null;   // uno por jugador
    it.pid = p ? pid : null;
    dirtyFx(S);
    const d = kind === 'soul' ? DB().souls[it.k] : DB().items[it.k];
    return { ok: true, msg: p ? `${p.short} lleva ahora ${d.name}.` : `${d.name} vuelve al inventario.` };
  }
  /** Afinidad del alma con el jugador: 1 en su línea, 0,5 fuera. */
  function affinity(d, p) { return !d.line || d.line.includes(F.LINE[p.pos]) ? 1 : 0.5; }
  function scaled(eff, a) {
    if (a >= 1) return eff;
    const out = {};
    for (const k in eff) {
      const v = eff[k];
      if (typeof v === 'boolean') { if (a >= 1) out[k] = v; }
      else if (['mid', 'att', 'def'].includes(k)) out[k] = v * a;
      else out[k] = 1 + (v - 1) * a;
    }
    return out;
  }
  /** Efectos en el partido que vienen de aquí (alma y objeto equipados). */
  function effs(S, pid) {
    if (!S.ev) return [];
    const out = [];
    const p = S.players[pid];
    if (!p || p.club !== S.user) return out;
    const so = fantasy(S) && soulOf(S, pid);
    if (so && so.def) out.push(scaled(so.def.eff, affinity(so.def, p)));
    const it = itemOf(S, pid);
    if (it && it.def) out.push(it.def.eff);
    return out;
  }
  /** Auras para el 2D: limit break (dorada) y almas (de su color). */
  function auras(S) {
    const out = {};
    if (!S.ev) return out;
    for (const id in S.ev.lb) out[id] = { c: '#ffd23f', c2: '#ff7a1a', kind: 'lb' };
    if (fantasy(S)) for (const x of S.ev.souls) if (x.pid != null && DB().souls[x.k]) { const d = DB().souls[x.k]; out[x.pid] = out[x.pid] || { c: d.c, c2: d.c2 || d.c, kind: 'soul' }; }
    return out;
  }

  // ------------------------------------------------------------ Varios
  /** Los ids de jugador cambian al compactar la lista cada verano. */
  function remap(S, map) {
    const E = S.ev;
    if (!E) return;
    const id = v => (map.has(+v) ? map.get(+v) : null);
    const byKey = obj => { const out = {}; for (const k in obj) { const n = id(k); if (n != null) out[n] = obj[k]; } return out; };
    E.lb = byKey(E.lb); E.away = byKey(E.away);
    for (const x of E.souls.concat(E.items)) if (x.pid != null) x.pid = id(x.pid);
    E.q = E.q.map(x => Object.assign(x, { pid: x.pid == null ? null : id(x.pid), qid: x.qid == null ? null : id(x.qid) })).filter(x => x.pid !== null || x.pid === undefined);
    E.log.forEach(x => { x.pid = x.pid == null ? null : id(x.pid); });
    const cd = {};
    for (const k in E.cd) { const m = /^(.*):(\d+)$/.exec(k); if (!m) cd[k] = E.cd[k]; else { const n = id(m[2]); if (n != null) cd[m[1] + ':' + n] = E.cd[k]; } }
    E.cd = cd;
    E.pend = null;
  }
  /** Al irse un jugador, lo que llevaba vuelve al inventario. */
  function release(S) {
    const E = S.ev;
    if (!E) return;
    for (const x of E.souls.concat(E.items)) if (x.pid != null && (!S.players[x.pid] || S.players[x.pid].club !== S.user)) x.pid = null;
  }
  /** Para probar: fuerza un evento (desde la consola: TL.Events.force(TL.Game.S, 'limit_break', id)). */
  function force(S, id, pid, vi) {
    const def = byId(id);
    if (!def) return null;
    const ctx = ctxOf(S);
    const pool = def.if ? ctx.sq.filter(x => cond(S, def.if, x, ctx)) : ctx.sq;
    const p = pid != null ? S.players[pid] : def.who === 'c' && !def.if ? null : U.pick(pool.length ? pool : ctx.sq);
    let q = null;
    if (def.who === 'pp') q = U.pick(squad(S).filter(x => x !== p));
    return fire(S, make(S, def, p, q, vi == null ? (def.var ? 0 : null) : vi));
  }

  TL.Events = {
    CONFLICT, st, start, init, newSeason, matchDay, dateOf, daysLeft, step, played, roll, view, resolve, force, fantasy,
    soulOf, itemOf, canEquip, equip, giveItem, giveSoul, affinity, effs, auras, isLB, remap, release, form, share,
    DB, byId, cats: () => DB().cats
  };
})();
