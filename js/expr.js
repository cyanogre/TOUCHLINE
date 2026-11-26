/* TOUCHLINE — expresividad de los puntitos del 2D.
 *
 * Mirada y cuerpo: cada jugador mira a algún sitio (al balón, a quién va a pasar, a donde corre) y lo enseña con
 * una muesca en el borde; al esprintar se estira, al frenar en seco se aplasta, levanta polvillo (o agua, o nieve)
 * en arrancadas, frenazos y giros, y en los esprints deja una estela corta.
 * Gestos con manitas: pedir el balón, señalar el desmarque, protestar, manos a la cabeza, aplaudir, el puño, el
 * avión, el portero colocando la barrera.
 * Emociones: bocadillos breves («!», «?», enfado) y reacciones a lo que pasa (gol, parada, fallo, falta, fuera de juego).
 * Personalidad: los rasgos del vestuario (líder, sangre caliente, ego, alma de la fiesta / estrella) y la confianza
 * que lleva en el partido cambian cuánto y cómo gesticula cada uno.
 * Todo es dibujo: no cambia nada del juego ni del motor. */
(function () {
  'use strict';
  const TL = window.TL;
  const PP = TL.Pitch.prototype;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hyp = Math.hypot;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const SKIN = ['#f3d0b5', '#e8bb98', '#d6a07a', '#b97f57', '#94603d', '#6f4529', '#55331f'];
  // Duración y peso de cada gesto (los de más peso no los pisa uno menor)
  const G = {
    ask: { d: 0.9, w: 1 }, point: { d: 0.9, w: 1 }, clap: { d: 1.4, w: 2 }, look: { d: 0.4, w: 0 },
    protest: { d: 1.6, w: 3 }, head: { d: 1.8, w: 3 }, fist: { d: 1.4, w: 3 }, wide: { d: 2.6, w: 4 }, wall: { d: 2.2, w: 2 }, calm: { d: 1.4, w: 2 }
  };

  // ------------------------------------------------------------ Personalidad
  /** Carácter de cada jugador (del vestuario) y su confianza en el partido. */
  PP._persona = function (pid) {
    const P = this, cache = P._pers || (P._pers = {});
    if (cache[pid]) return cache[pid];
    let tr = [];
    try { tr = (TL.Locker && P.m && P.m.S ? TL.Locker.traits(P.m.S, pid) : []) || []; } catch (e) { tr = []; }
    const has = k => tr.includes(k);
    const h = ((pid || 7) * 2654435761 >>> 0) % 1000 / 1000;
    return (cache[pid] = {
      leader: has('leader'), hot: has('hothead'), ego: has('ego'), show: has('party') || has('diva') || has('limitBreak'),
      // Un poco de salsa propia para todos: unos gesticulan más que otros
      talk: 0.6 + h * 0.8, skin: SKIN[Math.floor(((pid || 3) * 0.618 % 1) * SKIN.length)]
    });
  };
  /** Confianza: lo que va haciendo en el partido (nota en directo). 1 crecido, -1 tocado. */
  PP._mood = function (a) {
    if (a._moodT != null && this.t - a._moodT < 3) return a._mood || 0;
    a._moodT = this.t;
    let v = 6.3;
    try { if (this.m && this.m.liveRating && this.m.pl && this.m.pl[a.pid]) v = this.m.liveRating(a.pid); } catch (e) { /* nada */ }
    a._mood = v >= 7.2 ? 1 : v <= 5.6 ? -1 : 0;
    return a._mood;
  };

  // ------------------------------------------------------------ Gestos y bocadillos
  /** Gesto de un jugador. o: { secs, tx, ty (a dónde señala), delay, force } */
  PP.gesture = function (pid, k, o) {
    const a = this.A && this.A[pid];
    if (!a || a.kind !== 'pl' || this.instant || this.replay) return false;
    o = o || {};
    const g = G[k] || { d: 1, w: 1 }, t0 = this.t + (o.delay || 0);
    const cur = a.gest;
    if (cur && cur.until > this.t && (G[cur.k] || {}).w > g.w && !o.force) return false;
    a.gest = { k, t0, until: t0 + (o.secs || g.d), tx: o.tx, ty: o.ty, ph: Math.random() * 6 };
    return true;
  };
  /** Bocadillo: «!», «?», «anger». Pocos a la vez y no repetidos seguidos por el mismo. */
  PP.bubble = function (pid, k, secs) {
    const a = this.A && this.A[pid];
    if (!a || this.instant || this.replay) return false;
    const live = Object.values(this.A).filter(x => x.bub && x.bub.until > this.t).length;
    if (live >= 3 || (a.bubT && this.t - a.bubT < 3)) return false;
    a.bub = { k, t0: this.t, until: this.t + (secs || 1.2) };
    a.bubT = this.t;
    return true;
  };

  // ------------------------------------------------------------ Cada fotograma: mirada, cuerpo y polvillo
  PP._exprUpdate = function (dt) {
    if (!(dt > 0)) return;
    const b = this.ball, t = this.t;
    const dust = this.dust || (this.dust = []);
    for (const id in this.A) {
      const a = this.A[id];
      const v = hyp(a.vx || 0, a.vy || 0), mv = Math.atan2(a.vy || 0, a.vx || 0);
      const lying = a.state === 'down' || a.state === 'sit' || a.state === 'slide' || a.state === 'dive';
      // Mirada
      if (!lying) {
        let tgt;
        const toBall = Math.atan2(b.y - a.y, b.x - a.x);
        const g = a.gest && a.gest.t0 <= t && a.gest.until > t ? a.gest : null;
        if (g && g.k === 'look' && g.tx != null) tgt = Math.atan2(g.ty - a.y, g.tx - a.x);
        else if (g && (g.k === 'point' || g.k === 'wall') && g.tx != null) tgt = Math.atan2(g.ty - a.y, g.tx - a.x);
        else if (b.owner === a.pid) tgt = v > 0.8 ? mv : (this.dir[a.team] > 0 ? 0 : Math.PI);
        else if (v > 4.2) {
          // Corriendo: mira adonde va y echa un vistazo al balón de vez en cuando
          tgt = ((t + (a.bob || 0)) % 1.5) < 0.28 && Math.abs(angDiff(mv, toBall)) < 2.3 ? toBall : mv;
        } else tgt = toBall;
        if (a.face == null) a.face = tgt;
        const d = angDiff(tgt, a.face), turn = dt * (v > 4 ? 7 : 10);
        a.face += clamp(d, -turn, turn);
      }
      // Cuerpo: frenazo (se aplasta) y polvillo en arrancadas, frenadas y giros bruscos
      const pv = a._pv == null ? v : a._pv, pm = a._pm == null ? mv : a._pm;
      const acc = (v - pv) / dt, lat = v > 2 && pv > 2 ? Math.abs(angDiff(mv, pm)) / dt * v : 0;
      a._pv = v; a._pm = mv;
      if (lying || a.leave) continue;
      if (acc < -7 && pv > 3.2) { a.sq = { until: t + 0.18, ang: pm }; }
      const kick = (acc > 4.5 && v > 2.2) || (acc < -6.5 && pv > 3) || lat > 14;
      if (kick && dust.length < 70 && Math.random() < dt * 14) {
        const n = 1 + (Math.random() < 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          dust.push({ x: a.x - (a.vx || 0) * 0.05 + (Math.random() - 0.5) * 0.5, y: a.y + 0.35 + (Math.random() - 0.5) * 0.3,
            vx: -(a.vx || 0) * 0.12 + (Math.random() - 0.5) * 0.8, vy: -(a.vy || 0) * 0.12 + (Math.random() - 0.5) * 0.5, t0: t, life: 0.35 + Math.random() * 0.25 });
        }
      }
    }
    for (let k = dust.length - 1; k >= 0; k--) {
      const p = dust[k];
      if (t - p.t0 > p.life) { dust.splice(k, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 3; p.vy *= 1 - dt * 3;
    }
  };

  /** Suelo: polvillo y estelas (debajo de los jugadores). */
  PP._exprGround = function (X, Y, s, R) {
    const c = this.cx, t = this.t, wx = this.st && this.st.weather;
    const col = wx === 'nieve' ? '255 255 255' : wx === 'lluvia' || wx === 'temporal' ? '205 225 255' : '226 236 196';
    if (this.dust && this.dust.length && !this.replay) {
      for (const p of this.dust) {
        const u = (t - p.t0) / p.life;
        c.fillStyle = `rgb(${col} / ${(0.42 * (1 - u)).toFixed(3)})`;
        c.beginPath(); c.arc(X(p.x), Y(p.y), Math.max(1, (0.18 + u * 0.32) * s), 0, 6.283); c.fill();
      }
    }
    // Estela de los esprints
    for (const id in this.A) {
      const a = this.A[id];
      const v = hyp(a.vx || 0, a.vy || 0);
      if (v < 5.4 || a.state === 'down' || a.leave) continue;
      const k0 = clamp((v - 5.4) / 1.6, 0, 1);
      const col2 = this.isGK(a) ? this.colors[a.team].gk : this.colors[a.team].main;
      for (const [f, al] of [[0.07, 0.22], [0.14, 0.11]]) {
        c.globalAlpha = al * k0;
        c.fillStyle = col2;
        c.beginPath(); c.arc(X(a.x - a.vx * f), Y(a.y - a.vy * f), R * (1 - f * 1.4), 0, 6.283); c.fill();
      }
    }
    c.globalAlpha = 1;
  };

  /** Forma del cuerpo: se estira al esprintar y se aplasta en los frenazos. Devuelve [radio largo, radio corto, ángulo]. */
  PP._exprShape = function (a, r) {
    const v = hyp(a.vx || 0, a.vy || 0);
    if (a.sq && a.sq.until > this.t) return [r * 0.86, r * 1.08, a.sq.ang];
    if (v < 0.6) return [r, r, 0];
    const st = 1 + clamp((v - 0.6) / 6.5, 0, 1) * 0.15;
    return [r * st, r / Math.sqrt(st), Math.atan2(a.vy, a.vx)];
  };
  /** Bote del que va crecido (andando o al trote). */
  PP._exprBob = function (a, R) {
    if (this.replay || a.state || this._mood(a) < 1) return 0;
    const v = hyp(a.vx || 0, a.vy || 0);
    return v > 0.4 && v < 4 ? Math.abs(Math.sin(this.t * 7 + (a.bob || 0))) * R * 0.1 : 0;
  };

  // ------------------------------------------------------------ Dibujo encima: muesca de la mirada, manitas y bocadillo
  PP._exprOver = function (a, x, y, r, R, upright, line) {
    const c = this.cx, t = this.t;
    // Muesca de la mirada (en las repeticiones, hacia donde se mueve)
    if (upright) {
      let f = a.face;
      if (this.replay) { const v = hyp(a.vx || 0, a.vy || 0); f = v > 0.6 ? Math.atan2(a.vy, a.vx) : a.face; }
      if (f != null) {
        const r0 = r * 1.0, tip = r * 1.36, half = 0.4;
        c.beginPath();
        c.moveTo(x + Math.cos(f) * tip, y + Math.sin(f) * tip);
        c.lineTo(x + Math.cos(f + half) * r0, y + Math.sin(f + half) * r0);
        c.lineTo(x + Math.cos(f - half) * r0, y + Math.sin(f - half) * r0);
        c.closePath();
        c.fillStyle = line; c.fill();
        // borde fino del color contrario: se ve sobre cualquier césped y cualquier camiseta
        c.lineWidth = 1; c.strokeStyle = line === '#111' || line === '#000' || line === '#000000' ? 'rgb(255 255 255 / 0.55)' : 'rgb(0 0 0 / 0.55)'; c.stroke();
      }
    }
    if (this.replay) return;
    // Manitas
    const g = a.gest && a.gest.t0 <= t && a.gest.until > t ? a.gest : null;
    if (g && upright && g.k !== 'look') this._hands(a, g, x, y, r);
    // Bocadillo
    const bu = a.bub && a.bub.until > t ? a.bub : null;
    if (bu) this._bubbleDraw(bu, x, y, r, R);
  };

  PP._hands = function (a, g, x, y, r) {
    const c = this.cx, t = this.t, pe = this._persona(a.pid);
    const gk = this.isGK(a), hr = Math.max(1.7, r * 0.34);
    const col = gk ? '#f2f2ea' : pe.skin;
    const age = t - g.t0, out = clamp((g.until - t) / 0.18, 0, 1), inn = clamp(age / 0.15, 0, 1), k = Math.min(out, inn);
    const pts = [];
    const f = a.face != null ? a.face : 0;
    const toT = g.tx != null ? Math.atan2(g.ty - a.y, g.tx - a.x) : f;
    switch (g.k) {
      case 'ask': {   // brazo en alto pidiendo el balón
        const w = Math.sin(t * 11 + g.ph) * r * 0.16;
        pts.push([x + r * 0.55 + w, y - r * (0.8 + 0.75 * k)]);
        break;
      }
      case 'point': case 'wall': {   // señala el hueco / coloca la barrera
        const wob = g.k === 'wall' ? Math.sin(t * 9 + g.ph) * 0.25 : 0;
        const d = r * (1 + 0.8 * k);
        pts.push([x + Math.cos(toT + wob) * d, y + Math.sin(toT + wob) * d]);
        break;
      }
      case 'protest': {   // brazos arriba, quejándose
        const sh = Math.sin(t * 15 + g.ph) * r * 0.22;
        pts.push([x - r * 0.62 + sh, y - r * (0.7 + 0.8 * k)], [x + r * 0.62 + sh, y - r * (0.7 + 0.8 * k)]);
        break;
      }
      case 'head': {   // manos a la cabeza
        pts.push([x - r * (0.95 - 0.5 * k), y - r * 0.75 * k], [x + r * (0.95 - 0.5 * k), y - r * 0.75 * k]);
        break;
      }
      case 'clap': {   // aplaude
        const sep = r * (0.12 + 0.34 * Math.abs(Math.sin(t * 7 + g.ph)));
        const fx = x + Math.cos(f) * r * 1.1, fy = y + Math.sin(f) * r * 1.1, px = -Math.sin(f), py = Math.cos(f);
        pts.push([fx + px * sep, fy + py * sep], [fx - px * sep, fy - py * sep]);
        break;
      }
      case 'fist': {   // puño al aire
        pts.push([x + r * 0.5, y - r * (0.9 + (0.55 + 0.35 * Math.abs(Math.sin(t * 9 + g.ph))) * k)]);
        break;
      }
      case 'wide': {   // el avión
        const wob = Math.sin(t * 5 + g.ph) * r * 0.18;
        pts.push([x - r * (1 + 1.1 * k), y + wob], [x + r * (1 + 1.1 * k), y - wob]);
        break;
      }
      case 'calm': {   // pide calma (palmas abajo)
        const yy = y + Math.sin(t * 4 + g.ph) * r * 0.18;
        pts.push([x - r * 0.7, yy + r * 0.25], [x + r * 0.7, yy + r * 0.25]);
        break;
      }
    }
    if (!pts.length) return;
    c.lineCap = 'round';
    for (const [hx, hy] of pts) {
      // brazo (del borde del cuerpo a la mano) y mano
      const ang = Math.atan2(hy - y, hx - x), sx = x + Math.cos(ang) * r * 0.85, sy = y + Math.sin(ang) * r * 0.85;
      if (hyp(hx - sx, hy - sy) > r * 0.25) {
        c.strokeStyle = 'rgb(0 0 0 / 0.45)'; c.lineWidth = Math.max(2.2, r * 0.36); c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke();
        c.strokeStyle = gk ? (this.colors[a.team].gk || col) : (this.colors[a.team].main || col); c.lineWidth = Math.max(1.4, r * 0.24); c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke();
      }
      c.beginPath(); c.arc(hx, hy, hr, 0, 6.283);
      c.fillStyle = col; c.fill();
      c.lineWidth = 1; c.strokeStyle = 'rgb(0 0 0 / 0.5)'; c.stroke();
    }
    c.lineCap = 'butt';
  };

  PP._bubbleDraw = function (bu, x, y, r, R) {
    const c = this.cx, t = this.t;
    const age = t - bu.t0, pop = age < 0.12 ? 0.6 + age / 0.12 * 0.5 : age < 0.22 ? 1.1 - (age - 0.12) : 1;
    const fade = clamp((bu.until - t) / 0.25, 0, 1);
    const sz = Math.max(7, R * 1.05) * pop, bx = x + r * 0.95, by = y - r * 1.9 - (1 - fade) * r * 0.4;
    c.globalAlpha = fade;
    // globo con colita
    const bg = bu.k === 'anger' ? '#e53935' : bu.k === '!' ? '#ffd23f' : '#ffffff';
    c.fillStyle = bg; c.strokeStyle = 'rgb(0 0 0 / 0.6)'; c.lineWidth = 1.2;
    c.beginPath();
    const bw = bu.k === 'anger' ? 1.5 : 1.1;
    if (c.roundRect) c.roundRect(bx - sz * bw / 2, by - sz * 0.55, sz * bw, sz * 1.1, sz * 0.35); else c.rect(bx - sz * bw / 2, by - sz * 0.55, sz * bw, sz * 1.1);
    c.fill(); c.stroke();
    c.beginPath(); c.moveTo(bx - sz * 0.32, by + sz * 0.5); c.lineTo(bx - sz * 0.6, by + sz * 0.9); c.lineTo(bx - sz * 0.05, by + sz * 0.55); c.closePath(); c.fill();
    if (bu.k === 'anger') {
      // tacos de cómic («#@!») en blanco sobre rojo
      c.fillStyle = '#ffffff';
      c.font = `900 ${Math.round(sz * 0.62)}px Barlow Condensed, sans-serif`;
      c.fillText('#@!', bx, by + sz * 0.04);
    } else {
      c.fillStyle = '#111';
      c.font = `900 ${Math.round(sz * 0.95)}px Barlow Condensed, sans-serif`;
      c.fillText(bu.k, bx, by + sz * 0.05);
    }
    c.globalAlpha = 1;
  };

  // ------------------------------------------------------------ Qué lo provoca
  /** Lo que cuenta el cerebro del 2D jugada a jugada (pases, desmarques, entradas, malos controles…). */
  PP._exprSay = function (k, d) {
    if (this.instant || this.replay || !d) return;
    const A = this.A, p = d.p != null ? A[d.p] : null;
    switch (k) {
      case 'run': {   // desmarque: señala el hueco (y a veces lo pide a gritos)
        if (!p) break;
        const run = this.brain.runs && this.brain.runs[d.p];
        const pe = this._persona(d.p);
        if (Math.random() < 0.55 * pe.talk) this.gesture(d.p, 'point', { tx: run ? run.tx : p.x + this.dir[p.team] * 8, ty: run ? run.ty : p.y });
        if ((pe.ego || pe.leader || this._mood(p) > 0) && Math.random() < 0.35) this.bubble(d.p, '!');
        break;
      }
      case 'pass': {   // mira a quién se la da
        if (p && d.q != null && A[d.q]) this.gesture(d.p, 'look', { tx: A[d.q].x, ty: A[d.q].y });
        break;
      }
      case 'badtouch': {
        if (!p) break;
        if (Math.random() < 0.6) this.bubble(d.p, '?', 1);
        else this.gesture(d.p, 'head', { secs: 1.1 });
        break;
      }
      case 'tackle': {   // entrada limpia: el que la gana lo celebra a veces; el que la pierde pide falta
        const o = d.o != null ? A[d.o] : null;
        if (p && Math.random() < (this._persona(d.p).hot ? 0.5 : 0.2)) this.gesture(d.p, 'fist', { secs: 0.9 });
        if (o && Math.random() < (this._persona(d.o).hot ? 0.75 : 0.35)) { this.gesture(d.o, 'protest', { secs: 1.2, delay: 0.25 }); if (this._persona(d.o).hot) this.bubble(d.o, 'anger'); }
        break;
      }
      case 'keep': {   // muchos pases seguidos: alguien lo jalea
        const lead = this.team(d.team).find(a => this._persona(a.pid).leader && !this.isGK(a));
        if (lead) this.gesture(lead.pid, 'clap');
        break;
      }
    }
  };

  /** El que tiene el balón decide: si había una compañera mejor colocada y no se la da, ella la pide. */
  PP._exprDecide = function (c, opts, pick) {
    if (this.instant || this.replay || !pick) return;
    if (this._askT && this.t - this._askT < 1.1) return;
    let best = null;
    for (const o of opts) if (o.k === 'pass' && o.r && o !== pick && (!best || o.v > best.v)) best = o;
    if (!best || best.v < (pick.v || 0) - 0.025) return;
    const pid = best.r.pid, pe = this._persona(pid), mood = this._mood(best.r);
    const p = (0.35 + (pe.ego ? 0.35 : 0) + (mood > 0 ? 0.15 : mood < 0 ? -0.15 : 0)) * pe.talk;
    if (Math.random() > p) return;
    this._askT = this.t;
    this.gesture(pid, 'ask');
    // El de ego, si no se la dan, protesta
    if (pe.ego && Math.random() < 0.4) this.gesture(pid, 'protest', { secs: 1, delay: 0.9 });
  };

  /** Lo que se ve pasar (gol, parada, fallo, falta, tarjeta, fuera de juego…). */
  PP._exprEvent = function (e) {
    if (this.instant || !e || e.team == null || e.team < 0) return;
    const A = this.A, i = e.team, pid = e.pid;
    const near = (team, x, y, n, skip) => this.team(team).filter(a => a.pid !== skip && !this.isGK(a)).sort((a, b) => hyp(a.x - x, a.y - y) - hyp(b.x - x, b.y - y)).slice(0, n);
    switch (e.type) {
      case 'goal': {
        const sc = A[pid];
        if (sc && !e.og) {
          const pe = this._persona(pid);
          const k = pe.show ? 'wide' : pe.leader ? 'fist' : ['fist', 'wide', 'ask'][Math.floor(Math.random() * 3)];
          this.gesture(pid, k, { secs: 2.8, force: true, delay: 0.2 });
          if (pe.show || pe.ego) this.bubble(pid, '!', 1.6);
        }
        const gk = this.gkOf(1 - i);
        if (gk) this.gesture(gk.pid, 'head', { secs: 2.2, delay: 0.3, force: true });
        const g0 = A[pid] || this.ball;
        near(1 - i, g0.x, g0.y, 2).forEach((a, n) => this.gesture(a.pid, Math.random() < 0.6 ? 'head' : 'protest', { secs: 1.8, delay: 0.4 + n * 0.25 }));
        // El líder del que encaja levanta al equipo
        const lead = this.team(1 - i).find(a => this._persona(a.pid).leader);
        if (lead) this.gesture(lead.pid, 'clap', { delay: 2.4, secs: 1.6 });
        break;
      }
      case 'save': {
        const gk = this.gkOf(1 - i);
        if (gk && (e.big || Math.random() < 0.35)) this.gesture(gk.pid, 'fist', { delay: 0.7, secs: 1.2 });
        if (A[pid] && (e.big || (e.xgv || 0) > 0.2)) this.gesture(pid, 'head', { delay: 0.3 });
        else if (A[pid] && Math.random() < 0.4) this.gesture(pid, 'clap', { delay: 0.4, secs: 1 });   // aplaude la parada
        break;
      }
      case 'miss': {
        if (!A[pid] || e.miss === 'blocked') break;
        if (e.miss === 'post' || (e.xgv || 0) > 0.16) {
          this.gesture(pid, 'head', { delay: 0.25 });
          const m = near(i, A[pid].x, A[pid].y, 1, pid)[0];
          if (m && Math.random() < 0.5) this.gesture(m.pid, this._persona(m.pid).ego ? 'protest' : 'head', { delay: 0.5 });
        } else if (Math.random() < 0.3) this.gesture(pid, 'head', { delay: 0.25, secs: 1.2 });
        break;
      }
      case 'penmiss': if (A[pid]) this.gesture(pid, 'head', { delay: 0.2, secs: 2.2, force: true }); break;
      case 'disallowed': if (A[pid]) this.gesture(pid, 'protest', { delay: 0.2, secs: 2, force: true }); break;
      case 'offside': {
        if (A[pid]) { this.gesture(pid, 'protest', { secs: 1.4 }); if (this._persona(pid).hot) this.bubble(pid, 'anger'); }
        break;
      }
      case 'foul': case 'yellow': case 'red': {
        const f = A[pid];
        if (!f) break;
        const pe = this._persona(pid), card = e.type !== 'foul';
        if (card || Math.random() < (pe.hot ? 0.8 : 0.45)) this.gesture(pid, 'protest', { delay: 0.3, secs: card ? 2 : 1.3, force: card });
        if (card && (pe.hot || e.type === 'red')) this.bubble(pid, 'anger', 1.6);
        // Una compañera templada pide calma (o el líder)
        if (card) {
          const m = near(i, f.x, f.y, 2, pid).find(a => this._persona(a.pid).leader) || (Math.random() < 0.35 ? near(i, f.x, f.y, 1, pid)[0] : null);
          if (m) this.gesture(m.pid, 'calm', { delay: 0.8 });
        }
        break;
      }
    }
  };
})();
