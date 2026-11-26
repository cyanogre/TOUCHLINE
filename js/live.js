/* TOUCHLINE — motor de partido en vivo (como Football Manager): el campo decide.
 *
 * En el partido completo nada está escrito de antemano. El cerebro táctico mueve a las 22 jugadoras y, cuando
 * alguien dispara, entra, centra o pasa a una compañera adelantada, el resultado se calcula EN ESE INSTANTE con
 * la situación real (distancia, ángulo, rivales encima, quién tapa el disparo, dónde está el portero) y los
 * atributos de quien lo hace. El motor (js/engine.js) solo apunta lo que ha pasado: marcador, estadísticas,
 * narración y tarjetas. Lo que se ve y lo que cuenta son lo mismo.
 *
 *  - Remates: modelo de goles esperados (xG) según distancia y ángulo visible de portería, corregido por la
 *    presión, los defensas en la trayectoria y si el portero está fuera de sitio.
 *  - Faltas: en cada entrada hay una probabilidad de falta según la defensa y el físico de quien entra, su
 *    mentalidad, si ya la han superado y la zona; el tipo de falta sale de cómo llega (por detrás, al suelo…).
 *  - Fuera de juego: se mira en el momento del pase; el linier casi siempre acierta (las dudas, a veces no).
 *  - Reloj: los minutos pasan con el juego que se ve (las celebraciones y repeticiones no cuentan).
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { U } = TL;
  const L = 105, Wd = 68, CY = Wd / 2, GW = 7.32;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  // Ajustes del motor en vivo (calibrados con la auditoría de partidos completos)
  const LIVE = TL.LIVE = {
    MIN_S: 2.9,       // segundos de juego en el campo por minuto de partido
    DEAD: 0.3,        // durante saques y escenas el reloj corre más despacio (no cuentan celebraciones ni repeticiones)
    CONV: 5.0,        // el partido se ve condensado: las ocasiones que se ven valen algo más que en 90 minutos reales
    SHOOT_V: 5.5,     // cuánto pesa un buen tiro frente a seguir la jugada
    SHOOT_MIN: 0.035, // por debajo de este xG no se tira
    SHOOT_K: 14,      // pendiente: con xG 0,10 tira ~la mitad de las veces que puede; con 0,18, casi siempre
    FOUL: 0.25,       // probabilidad base de falta en una entrada
    W_FIN: 0.3, W_MID: 1.3, W_OWN: 1.5,   // cuánto reloj gasta cada segundo según dónde está el balón
    CARD: 1.8,
    HAND: 0.07,       // disparo tapado que pega en el brazo
    DIVE: 0.05,       // en un duelo dentro del área, se tira
    CARRY_FWD: 0.06,  // en vivo, avanzar conduciendo (por cada 7 m)
    PASS_FWD: 0.12,   // en vivo, pase hacia delante (por cada 20 m)
    DRIBBLE: 0.05,    // en vivo, encarar en campo rival
    TACKLE: 1.6,      // en vivo, el medio del campo se disputa más (más pérdidas y contraataques)
    PASS_ERR: 2.2     // en vivo, los pases largos fallan algo más
  };

  function segD(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, c = vx * vx + vy * vy;
    const k = c > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / c, 0, 1) : 0;
    return hyp(px - (ax + vx * k), py - (ay + vy * k));
  }
  /** Goles esperados de un disparo con el pie (modelo logístico de distancia y ángulo visible de la portería). */
  function xgFoot(d, ang) { return 1 / (1 + Math.exp(-(-1.2 + 1.5 * ang - 0.095 * d))); }
  function geom(P, i, x, y) {
    const gx = P.goalX(i), dx = Math.max(0.3, Math.abs(gx - x)), dy = y - CY;
    const a1 = Math.atan2(dy - GW / 2, dx), a2 = Math.atan2(dy + GW / 2, dx);
    return { gx, dx, d: hyp(dx, dy), ang: Math.abs(a2 - a1) };
  }
  /** La situación de un remate desde (x, y) del equipo i: xG con presión, bloqueos y portero. */
  function situation(P, i, x, y, head) {
    const g = geom(P, i, x, y), dir = P.dir[i];
    let xg = xgFoot(g.d, g.ang) * (head ? 0.55 : 1);
    let press = 0, block = 0, ogPid = null, best = 9;
    for (const o of P.team(1 - i)) {
      if (P.isGK(o) || o.state === 'down') continue;
      const od = hyp(o.x - x, o.y - y);
      if (od < 1.5) press += 1; else if (od < 3) press += 0.45;
      const ahead = (o.x - x) * dir > 0.4 && Math.abs(g.gx - o.x) < g.dx;
      if (!ahead) continue;
      const sd = segD(o.x, o.y, x, y, g.gx, CY);
      const wid = 0.9 + Math.abs(o.x - x) / g.dx * 2.2;   // el disparo se abre hacia los palos
      if (sd < wid) { block += 0.22 * (1 - sd / wid) + 0.06; if (sd < best) { best = sd; ogPid = o.pid; } }
    }
    xg *= Math.pow(head ? 0.85 : 0.72, Math.min(2.5, press)) * (1 - Math.min(0.55, block));
    const gk = P.gkOf(1 - i);
    let open = false;
    if (!gk) { xg *= 2.2; open = true; }
    else {
      const gd = segD(gk.x, gk.y, x, y, g.gx, CY), gl = hyp(gk.x - g.gx, gk.y - CY);
      if (gd > 2.2 && gl > 3) { xg *= 1.7; open = true; }   // portería vacía o portero fuera de sitio
    }
    return { xg: clamp(xg, 0.003, 0.95), d: g.d, ang: g.ang, press, block: Math.min(0.65, block), ogPid, open };
  }
  LIVE.situation = situation;

  const BP = TL.Brain2D.prototype, PP = TL.Pitch.prototype;

  // ================================================================ Cerebro: decidir tirar
  /** ¿Tiro? Se valora como una opción más de la poseedora (frente a pasar, conducir, regatear…). */
  BP._shotOpt = function (c) {
    const P = this.P, i = c.team;
    if (!P.live || P.isGK(c) || P.m.done || P.depth(i, c.x) < 72) return null;
    const s = situation(P, i, c.x, c.y, false);
    if (s.d > 31) return null;
    const sc = this.st(c), r = this.role(c).role, t = P.m.teams[i];
    const tend = 1 + (sc[1] - 65) / 110 + (r === 'ST' ? 0.12 : r === 'W' || r === 'AM' ? 0.05 : r === 'CB' || r === 'FB' ? -0.12 : 0);
    const shot = (TL.Events?.fantasy(P.S) && TL.Locker?.fx(P.S, c.pid)?.shot) || 1;
    const v = s.xg * LIVE.SHOOT_V * tend * shot * (t.desperate ? 1.2 : 1) - 0.03 + (s.d < 8 ? 0.2 : 0);
    // Probabilidad de que decida tirar ahora: como una jugadora de verdad, cuanto mejor la ocasión, más seguro dispara
    const pShoot = clamp((s.xg - LIVE.SHOOT_MIN) * LIVE.SHOOT_K * tend * shot * (t.desperate ? 1.25 : 1), 0, 0.95);
    return Object.assign({ k: 'shot', v, pShoot }, s);
  };

  // ================================================================ Campo: el remate
  /** Dispara (o remata de cabeza): el motor lo resuelve ya y el campo lo enseña. */
  PP.liveShoot = function (c, o, how) {
    const br = this.brain, i = c.team, lk = br.lastKick;
    const ass = lk && lk.team === i && lk.from !== c.pid && (lk.to === c.pid || how) && this.t - lk.t < 5 ? lk.from : null;
    const type = how || (o.d < 6 ? 'tapin' : o.d > 21 ? 'long' : o.open && o.d > 10 && Math.random() < 0.35 ? 'chip' : o.press >= 1 || Math.random() < 0.35 ? 'power' : 'placed');
    const origin = how === 'header' || how === 'volley' ? (this._cornerLive ? 'corner' : 'cross') : br.phase[i] === 'counter' ? 'counter' : 'open';
    this._cornerLive = false;
    // A veces el disparo pega en el brazo de la defensa que lo tapa: mano (penalti si es en su área)
    if (!how && o.ogPid != null && o.block > 0.1 && Math.random() < LIVE.HAND && this.A[o.ogPid]) {
      if (this.liveFoul(this.A[o.ogPid], c, 'hand')) return true;
    }
    const ctx = { xg: o.xg, d: o.d, type, origin, blockP: o.block, ogPid: o.ogPid, offMiss: !!(br.offMiss && br.offMiss.team === i) };
    const n0 = this.m.events.length;
    const e = this.m.liveShot(i, c.pid, ass, ctx);
    if (!e) return false;
    // Lo que el motor apunte justo después (dedicatoria, amarilla por la camiseta…) se cuenta a su tiempo
    for (const x of this.m.events.slice(n0)) if (x !== e && x !== e.varEv) this.queue.push(x);
    br.carry = null; br.runs = {}; br.next = this.t + 99; br.offMiss = null;
    this.handled.push(e);
    const outcome = e.type === 'goal' || e.type === 'disallowed' ? 'goal' : e.type;
    const epic = outcome === 'goal' || o.xg > 0.3 || type === 'chip' || !!e.special;
    this._seq(this._finish(e, c.pid, type, outcome, epic));
    return true;
  };

  /** Le llega un centro: si está bien colocada, remata (de cabeza o al primer toque); si no, controla. */
  PP.liveHeaderAt = function (a, kind) {
    const b = this.ball;
    if (!a || hyp(a.x - b.x, a.y - b.y) > 2.8) return false;
    const head = kind !== 'back';
    const s = situation(this, a.team, a.x, a.y, head);
    if (s.d > (head ? 16 : 22)) return false;
    return this.liveShoot(a, s, head ? 'header' : (Math.random() < 0.5 ? 'volley' : 'placed'));
  };

  /** Córner en vivo: lo gana quien mejor ataca el balón (las defensas marcan; la portera sale si puede). */
  PP._liveCornerWin = function (i) {
    const b = this.ball;
    const g = this.gkOf(1 - i);
    if (g && hyp(g.x - b.x, g.y - b.y) < 5 && Math.random() < 0.45) return g;
    const near = Object.values(this.A).filter(a => a.state !== 'down' && !this.isGK(a) && hyp(a.x - b.x, a.y - b.y) < 5.5);
    if (!near.length) return null;
    return U.weighted(near, a => (a.team === 1 - i ? 1.7 : 1) * (0.4 + this.brain.st(a)[5] / 100 + this.brain.st(a)[1] / 300) / (0.6 + hyp(a.x - b.x, a.y - b.y)));
  };

  // ================================================================ Faltas
  /** En una entrada: ¿falta? Si la hay, el motor decide tarjeta y penalti y el campo lo enseña. */
  BP._liveFoulRoll = function (c, o, box, beaten) {
    const P = this.P;
    if (!P.live || P.isGK(o) || P.m.done) return false;
    // En el área rival, a veces la atacante se deja caer (más quien tiene peor carácter)
    if (box && !beaten && !P.isGK(c)) {
      const mor = P.P(c.pid).mor;
      if (Math.random() < LIVE.DIVE * (mor != null && mor < 45 ? 1.6 : 1)) return P.liveDive(c, o);
    }
    const so = this.st(o), t = P.m.teams[o.team];
    const lfx = TL.Locker && P.S.lk ? (TL.Locker.fx(P.S, o.pid) || {}) : {};
    const fouled = (TL.Events?.fantasy(P.S) && TL.Locker?.fx(P.S, c.pid)?.fouled) || 1;
    const pf = LIVE.FOUL * (1.3 - so[4] / 140) * (0.75 + so[5] / 200) * ([0.85, 1, 1.12, 1.25][t.mentality] || 1) *
      (beaten ? 1.6 : 0.6) * (box ? 0.3 : 1) * (P.m.min > 75 ? 1.1 : 1) * (lfx.foul || 1) * fouled;
    if (Math.random() > pf) return false;
    // Cómo llega: por detrás (agarrón, empujón), lanzándose (a destiempo, zancadilla, plancha)…
    const sp = hyp(c.vx, c.vy) || 1;
    const behind = ((c.x - o.x) * c.vx + (c.y - o.y) * c.vy) / sp > 0.3;
    const slide = o.state === 'slide' || hyp(o.vx, o.vy) > 5;
    const w = behind ? { hold: 0.4, push: 0.3, trip: 0.3 } : slide ? { late: 0.45, trip: 0.35, high: 0.12, push: 0.08 } : { trip: 0.36, late: 0.24, push: 0.15, hold: 0.15, high: 0.05, elbow: 0.05 };
    const kind = U.weighted(Object.keys(w), k => w[k]);
    return P.liveFoul(o, c, kind);
  };

  PP.liveFoul = function (f, v, kind) {
    const i = f.team, opp = v.team, br = this.brain;
    const vd = this.depth(opp, v.x), inBox = vd > L - 16.5 && Math.abs(v.y - CY) < 20.16;
    // Ocasión manifiesta: se iba sola hacia la portería y no quedaba nadie entre ella y la portera
    const cover = this.team(i).filter(a => !this.isGK(a) && a !== f && this.depth(opp, a.x) > vd - 1 && Math.abs(a.y - v.y) < 20).length;
    const dogso = !inBox && vd > 68 && cover === 0 && Math.abs(v.y - CY) < 22 && this.ball.owner === v.pid;
    const mates = this.team(opp).filter(a => a !== v && !this.isGK(a) && hyp(a.x - v.x, a.y - v.y) < 12 && this.depth(opp, a.x) > vd - 3);
    const adv = !inBox && !dogso && mates.length > 0 && Math.random() < 0.14;
    const r = this.m.liveFoul(i, f.pid, v.pid, { kind, inBox, dogso, adv });
    if (!r) return false;
    br.carry = null; br.runs = {};
    if (r.missed) {
      // No lo pita: se cae, protesta y el juego sigue
      v.state = 'down'; v.until = this.t + 1.3; v.fall = Math.random() * 6;
      f.state = 'slide'; f.until = this.t + 0.6;
      this.ball.owner = null; this.ball.roll = { vx: this.dir[opp] * 3, vy: U.rand(-1, 1) }; br.lastTouch = i;
      for (const e of r.evs) this._reveal(e);
      return true;
    }
    const evs = r.evs.slice();
    for (const e of evs) e.live = true;
    br.next = this.t + 99;
    if (r.pen) {
      this.queue.push(...evs);
      this._handle(this.queue.shift());
      return true;
    }
    const main = evs.find(e => e.type === 'red' || e.type === 'yellow') || evs.find(e => e.type === 'foul');
    if (!main) { for (const e of evs) this._reveal(e); br.next = this.t + 0.3; return false; }
    for (const e of evs) if (e !== main) this.queue.push(e);
    if (main.adv) br.next = this.t + 0.3;
    this._handle(main);
    return true;
  };

  /** Falta en zona de tiro: ¿directa a portería? Devuelve true si se encarga (barrera, lanzamiento…). */
  PP._liveFkSpot = function (i, spot) {
    const d = this.depth(i, spot.x), l = this.lat(i, spot.y);
    if (d < 72 || d > L - 16 || Math.abs(l - CY) > 21) return false;
    const g = geom(this, i, spot.x, spot.y);
    if (g.d > 32 || Math.random() > (g.d < 27 ? 0.8 : 0.45)) return false;
    const taker = this.team(i).filter(a => !this.isGK(a)).sort((a, c) => (this.P(c.pid).st[1] + this.P(c.pid).st[2]) - (this.P(a.pid).st[1] + this.P(a.pid).st[2]))[0];
    if (!taker) return false;
    const xg = clamp(0.032 - (g.d - 17) * 0.0016, 0.008, 0.034);   // ~6-9 % de goles de falta directa
    const n0 = this.m.events.length;
    const e = this.m.liveShot(i, taker.pid, null, { xg, d: g.d, type: 'fk', origin: 'fk', kind: 'fk', blockP: 0.3 });
    if (!e) return false;
    for (const x of this.m.events.slice(n0)) if (x !== e && x !== e.varEv) this.queue.push(x);
    e.spot = { x: spot.x, y: spot.y };
    this.handled.push(e);
    this._freeKickSeq(e, e.type === 'goal');
    return true;
  };

  /** Piscinazo en el área: se tira cerca de la defensa; el motor decide qué ve el árbitro. */
  PP.liveDive = function (c, o) {
    const r = this.m.liveDive(c.team, c.pid, o ? o.pid : null);
    if (!r) return false;
    const br = this.brain;
    br.carry = null; br.runs = {}; br.next = this.t + 99;
    c.state = 'down'; c.until = this.t + 1.4; c.fall = Math.random() * 6;
    this.ball.owner = null; this.ball.roll = { vx: this.dir[c.team] * 2, vy: U.rand(-1, 1) };
    this.queue.push(...r.evs);
    this._handle(this.queue.shift());
    return true;
  };

  // ================================================================ Fuera de juego
  PP.liveOffsideCall = function (a, op) {
    const i = a.team, e = this.m.liveOffside(i, a.pid);
    if (!e) return false;
    this.handled.push(e);
    const br = this.brain;
    br.carry = null; br.runs = {}; br.next = this.t + 99;
    const ar = this.ars[op.x < L / 2 ? 0 : 1];
    this._offT = op.t;
    const sx = clamp(op.x, 1, L - 1), sy = clamp(op.y, 1, Wd - 1);
    this._seq([
      { d: 1.2, start: () => {
        ar.flag = this.t + 1.6;
        this._reveal(e);
        if (!this.instant && TL.SFX) TL.SFX.whistle(false);
        this._banner('Fuera de juego', '#ffd23f', 1.1);
        this.ball.owner = null; this.ball.roll = null;
        this.ov = { all: 'stay', p: {} };
      } },
      !this.instant && Math.random() < 0.5 && this._replayBeat({ mark: () => this._offT, before: 1.6, after: 0.9, slow: 0.55, freeze: 2.2, an: { kind: 'off', team: i, pid: a.pid } }),
      { d: 0.6, start: () => {
        this.ov = null;
        const tk = this.nearest(this.team(1 - i).filter(x => !this.isGK(x)), { x: sx, y: sy });
        this._placeBall(sx, sy, 0.5, tk ? tk.pid : null, 1 - i);
        br.restartBy(1 - i, 'fk');
      } }
    ]);
    return true;
  };

  // ================================================================ Reloj y posesión
  /** Cada fotograma: el reloj avanza con el juego (despacio en saques y escenas; parado en celebraciones y repeticiones). */
  PP.liveTick = function (dt) {
    if (!this.live || this.over || this.hold || this.clockStop || this.replay) return;
    const scene = this.beat || this.script.length || this.place || this.fetch;
    // Como un resumen largo: la circulación en campo propio y en el medio «gasta» más reloj y los ataques en el
    // último tercio, menos (todo se ve igual, sin cortes; solo cambia cuánto partido cuenta cada segundo)
    const b = this.ball, own = b.owner != null ? this.A[b.owner] : null;
    const team = own ? own.team : this.brain.attTeam();
    const d = this.depth(team, b.x);
    const w = scene ? LIVE.DEAD : d > 70 ? LIVE.W_FIN : d > 35 ? LIVE.W_MID : LIVE.W_OWN;
    this.playT = (this.playT || 0) + dt * w;
  };
  PP.liveReady = function () { return (this.playT || 0) - (this.stepPlay || 0) >= LIVE.MIN_S; };
  /** Al volver al directo (tras un salto o las jugadas clave): el minuto y la posesión empiezan de cero aquí,
   *  sin arrastrar lo que el campo jugó mientras mandaba el motor por minutos. */
  PP.liveResync = function () {
    this.stepPlay = this.playT || 0;
    this._possPrev = this.brain.possT.slice();
    this.clockStop = false;
  };
  /** Al pasar un minuto: lo que ha tenido cada equipo el balón en ese rato. */
  PP.liveStep = function () {
    this.stepPlay = this.playT || 0;
    const p = this.brain.possT, q = this._possPrev || [0, 0];
    const d0 = p[0] - q[0], d1 = p[1] - q[1];
    this._possPrev = p.slice();
    return d0 + d1 > 0.2 ? d0 / (d0 + d1) : 0.5;
  };
})();
