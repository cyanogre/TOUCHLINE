/* TOUCHLINE — la grada: la ola cuando toca y los incidentes que se ven.
 *
 * La ola la hace el estadio (la afición local): solo con el local ganando con holgura o en una posesión larga
 * ganando («¡olé!»), y nunca dos seguidas. Los incidentes llegan del motor (Match._crowdReact y los sueltos) y
 * aquí se escenifican en su grada: objetos que vuelan al césped, bengalas con humo (de colores si es para
 * celebrar), un espontáneo perseguido por los de seguridad, insultos con bocadillos sobre la grada, una pelea
 * con su corro y los de seguridad entrando, y el protocolo antirracista. Solo dibujo: el motor ya lo ha decidido. */
(function () {
  'use strict';
  const TL = window.TL;
  const PP = TL.Pitch.prototype;
  const L = 105, Wd = 68;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hyp = Math.hypot;

  // ------------------------------------------------------------ La ola
  /** ¿Puede empezar otra? Nunca dos seguidas: al menos minuto y medio entre una y otra. */
  PP._waveOk = function () { return !(this.wave && this.wave.end + 90 > this.t); };
  PP._waveGo = function (delay) { const t = this.t + (delay || 0); this.wave = { start: t, end: t + 14, dir: Math.random() < 0.5 ? 1 : -1 }; };
  /** Muchos pases seguidos del local mientras gana: «¡olé!» y ola. */
  PP._gradaKeep = function (d) {
    const sc = this.m.score || [0, 0];
    if (d && d.team === 0 && d.n >= 14 && sc[0] > sc[1] && this._waveOk()) this._waveGo(1);
  };

  // ------------------------------------------------------------ Dónde
  /** Un sitio de la grada de esa afición (local: casi todo el estadio; visitante: su rincón). */
  PP._standSpot = function (i) {
    const pts = this._fanPts;
    if (pts && pts.length) {
      const pool = pts.filter(f => (i === 1) === !!f.aw && (f.y < -10 || f.y > Wd + 10 || f.x < -9 || f.x > L + 9));
      const f = (pool.length ? pool : pts)[Math.floor(Math.random() * (pool.length || pts.length))];
      return { x: f.x, y: f.y };
    }
    return i === 1 ? { x: L + 11, y: Wd * 0.75 } : { x: rnd(L * 0.25, L * 0.75), y: Math.random() < 0.5 ? -12 : Wd + 12 };
  };
  /** El punto de la banda (o línea de fondo) más cercano a esa grada, y hacia dónde queda el campo. */
  PP._edgeOf = function (S) {
    const x = clamp(S.x, 0.5, L - 0.5), y = clamp(S.y, 0.5, Wd - 0.5);
    let nx = x - S.x, ny = y - S.y; const n = hyp(nx, ny) || 1;
    nx /= n; ny /= n;
    if (!(n > 0.2)) { nx = L / 2 - x; ny = Wd / 2 - y; const m = hyp(nx, ny) || 1; nx /= m; ny /= m; }
    return { x, y, nx, ny };
  };

  // ------------------------------------------------------------ Escenificar el incidente
  PP._gradaStage = function (e) {
    if (this.instant) return;
    const G = this.grada || (this.grada = { objs: [], smoke: [], flares: [], bubs: [], fight: null, folk: [] });
    const k = String(e.kind || '').replace('crowd_', ''), i = e.team != null && e.team >= 0 ? e.team : 0, t = this.t;
    const S = this._standSpot(i), E = this._edgeOf(S);
    const tx = -E.ny, ty = E.nx;   // a lo largo de la banda
    const sfx = TL.SFX && !this.instant ? TL.SFX : null;
    // Sin carteles: la escena se entiende sola y el texto va en la narración
    const stop = (secs) => this._seq([{ d: secs, start: () => {
      if (sfx) sfx.whistle(false);
      this.ov = { all: 'stay' };
      this.refOv = { x: clamp(E.x + E.nx * 7, 2, L - 2), y: clamp(E.y + E.ny * 7, 2, Wd - 2), run: 0.6 };
    }, end: () => { this.ov = null; this.refOv = null; } }]);
    const mood = (kind, secs) => { this.crowdMood = { kind, team: i, until: t + secs }; };
    const front = { x: S.x * 0.45 + E.x * 0.55 - E.nx * 1.5, y: S.y * 0.45 + E.y * 0.55 - E.ny * 1.5 };   // delante de la grada, junto a la valla
    const swear = (n, spread) => { for (let q = 0; q < n; q++) G.bubs.push({ x: front.x + tx * rnd(-spread, spread), y: front.y + ty * rnd(-spread, spread), t0: t + q * 0.45, until: t + q * 0.45 + 1.9 }); };
    // Los jugadores más cerca de esa banda miran a la grada y alguno pide calma o protesta
    const react = (kind, n) => {
      if (!this.gesture) return;
      const near = Object.values(this.A).filter(a => a.kind === 'pl' && !this.isGK(a)).sort((a, b) => hyp(a.x - E.x, a.y - E.y) - hyp(b.x - E.x, b.y - E.y)).slice(0, n);
      near.forEach((a, q) => { this.gesture(a.pid, 'look', { tx: S.x, ty: S.y, secs: 2.5 }); if (kind) this.gesture(a.pid, kind, { tx: S.x, ty: S.y, delay: 0.5 + q * 0.3, secs: 1.6, force: true }); });
    };
    switch (k) {
      case 'objects': {
        // A escala de los puntitos (que también son grandes): botellas, mecheros, monedas y algún rollo de papel
        const KINDS = [['#e8f4ff', 1.5, 0.55], ['#9fd38a', 1.5, 0.55], ['#ff4d4d', 0.85, 0.42], ['#3b82f6', 0.85, 0.42], ['#ffd23f', 0.55, 0.55], ['#ffffff', 1.1, 0.8]];
        const n = 5 + Math.floor(Math.random() * 4);
        for (let q = 0; q < n; q++) {
          const [col, w, h] = KINDS[Math.floor(Math.random() * KINDS.length)];
          const d0 = rnd(1.5, 7.5), along = rnd(-7, 7);
          G.objs.push({ x0: S.x + rnd(-2, 2), y0: S.y + rnd(-1.5, 1.5), x1: clamp(E.x + E.nx * d0 + tx * along, 0.5, L - 0.5), y1: clamp(E.y + E.ny * d0 + ty * along, 0.5, Wd - 0.5),
            t0: t + q * rnd(0.15, 0.4), T: rnd(0.8, 1.25), until: t + 9, col, w, h, rot: rnd(0, 6.28), spin: rnd(-9, 9) });
        }
        mood('boo', 6); swear(2, 3);
        this.camHold = { x: E.x + E.nx * 3, y: E.y + E.ny * 3, z: 1.8, until: t + 5 };
        stop(5.5);
        this._seq([{ d: 0.1, start: () => { if (this.ref) { this.ref.state = 'point'; this.ref.until = this.t + 2.2; } } }]);
        react('calm', 2);
        break;
      }
      case 'pyro': {
        const party = !!e.party;
        const col = party ? (this.colors[i] && this.colors[i].main) || '#ff3b3b' : null;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let q = 0; q < n; q++) G.flares.push({ x: S.x + rnd(-2.2, 2.2), y: S.y + rnd(-1.2, 1.2), t0: t + q * 0.3, until: t + 9 + rnd(0, 2), ph: rnd(0, 6), smokeCol: col, nx: E.nx, ny: E.ny, acc: 0 });
        this.camHold = { x: E.x + E.nx * 2, y: E.y + E.ny * 2, z: 1.7, until: t + 4.5 };
        if (party) mood('chant', 8);
        else { mood('whistles', 5); stop(4.5); }
        break;
      }
      case 'invader': {
        const party = !!e.party;
        // Va a por el que ha marcado (si es para celebrar) o a por la estrella del partido
        let target = party && e.pid != null && this.A[e.pid] ? this.A[e.pid] : null;
        if (!target) { const pl = Object.values(this.A).filter(a => a.kind === 'pl' && !this.isGK(a)); target = pl.sort((a, b) => (this.P(b.pid).ovr || 0) - (this.P(a.pid).ovr || 0))[0]; }
        const ex = { x: E.x - E.nx * 2.5, y: E.y - E.ny * 2.5 };
        G.folk.push({ kind: 'fan', x: E.x - E.nx * 1.5, y: E.y - E.ny * 1.5, st: 'run', target: target ? target.pid : null, t0: t, ex, col: (this.colors[i] && this.colors[i].main) || '#ffffff', party });
        for (const s of [-1, 1]) G.folk.push({ kind: 'stew', x: E.x - E.nx * 2 + tx * s * 9, y: E.y - E.ny * 2 + ty * s * 9, st: 'wait', t0: t + 1.1, ex });
        this.camHold = { follow: G.folk[G.folk.length - 3], z: 1.9, until: t + 9.5 };
        if (party) mood('ovation', 5); else mood('chance', 4);
        stop(10);
        if (target && this.gesture) this.gesture(target.pid, party ? 'wide' : 'calm', { delay: 2.2, secs: 2, force: true });
        break;
      }
      case 'insults': {
        mood('boo', 6); swear(4, 4);
        this.camHold = { x: E.x + E.nx * 2, y: E.y + E.ny * 2, z: 1.8, until: t + 3.5 };
        react(Math.random() < 0.6 ? 'calm' : null, 1);
        break;
      }
      case 'fight': {
        G.fight = { x: front.x - E.nx * 1, y: front.y - E.ny * 1, r: 3.6, until: t + 9, t0: t };
        // Los de seguridad suben por el pasillo de la grada desde la banda
        G.folk.push(...[-1, 1, 0].map((s, q) => ({ kind: 'stew', stand: true, x: E.x - E.nx * 1.2 + tx * s * 4, y: E.y - E.ny * 1.2 + ty * s * 4, st: 'fight', t0: t + 0.8 + q * 0.6, fx: front.x - E.nx + rnd(-1, 1), fy: front.y - E.ny + rnd(-1, 1), until: t + 9.5 })));
        mood('boo', 6); swear(3, 2);
        this.camHold = { x: E.x + E.nx * 2, y: E.y + E.ny * 2, z: 1.8, until: t + 5.5 };
        react(null, 3);
        break;
      }
      case 'racism': {
        stop(7);
        mood('whistles', 7);
        this._seq([{ d: 0.1, start: () => { if (this.ref) { this.ref.state = 'wave'; this.ref.until = this.t + 3; } } }]);
        break;
      }
      default: stop(2.5);
    }
  };

  // ------------------------------------------------------------ Cada fotograma
  PP._gradaUpdate = function (dt) {
    const G = this.grada;
    if (!G || !(dt > 0)) return;
    const t = this.t;
    G.objs = G.objs.filter(o => o.until > t);
    G.bubs = G.bubs.filter(b => b.until > t);
    if (G.fight && G.fight.until < t) G.fight = null;
    // Humo de las bengalas: sale de cada una y deriva hacia el campo
    for (const f of G.flares) {
      if (t < f.t0 || t > f.until) continue;
      f.acc += dt * 9;
      while (f.acc > 1 && G.smoke.length < 140) {
        f.acc -= 1;
        G.smoke.push({ x: f.x + rnd(-0.3, 0.3), y: f.y + rnd(-0.3, 0.3), vx: f.nx * rnd(0.6, 1.4) + rnd(-0.4, 0.4), vy: f.ny * rnd(0.6, 1.4) + rnd(-0.4, 0.4), t0: t, life: rnd(4, 6.5), col: f.smokeCol });
      }
    }
    G.flares = G.flares.filter(f => f.until > t);
    for (let q = G.smoke.length - 1; q >= 0; q--) {
      const p = G.smoke[q];
      if (t - p.t0 > p.life) { G.smoke.splice(q, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 0.15; p.vy *= 1 - dt * 0.15;
    }
    // Espontáneo y seguridad
    const fan = G.folk.find(f => f.kind === 'fan');
    for (const f of G.folk) {
      if (t < f.t0) continue;
      let gx = f.x, gy = f.y, v = 0;
      if (f.kind === 'fan') {
        const tg = f.target != null && this.A[f.target] ? this.A[f.target] : null;
        if (f.st === 'run') {
          if (tg) { gx = tg.x; gy = tg.y; v = 5.4; if (hyp(tg.x - f.x, tg.y - f.y) < 1.3) { f.st = 'hug'; f.hugT = t; } }
          else f.st = 'hug';
        } else if (f.st === 'hug') { v = 0; if (t - (f.hugT || t) > 1.3) f.st = 'wait'; }
        else if (f.st === 'out') { gx = f.ex.x; gy = f.ex.y; v = 2.3; if (hyp(gx - f.x, gy - f.y) < 0.4) f.gone = true; }
      } else if (f.kind === 'stew' && !f.stand) {
        if (f.st === 'wait') f.st = 'chase';
        if (f.st === 'chase' && fan) { gx = fan.x; gy = fan.y; v = 6; if (hyp(fan.x - f.x, fan.y - f.y) < 1) { f.st = 'out'; fan.st = 'out'; } }
        else if (f.st === 'chase' && !fan) f.st = 'out';
        if (f.st === 'out') {
          // Se lo llevan agarrado, uno a cada lado
          if (fan && !fan.gone) { const s = G.folk.indexOf(f) % 2 ? 1 : -1; gx = fan.x + s * 0.7; gy = fan.y + 0.3; v = 2.6; }
          else { gx = f.ex.x; gy = f.ex.y; v = 2.6; if (hyp(gx - f.x, gy - f.y) < 0.5) f.gone = true; }
        }
      } else if (f.kind === 'stew' && f.stand) {
        gx = f.fx; gy = f.fy; v = 2.2;
        if (t > f.until) f.gone = true;
      }
      const dx = gx - f.x, dy = gy - f.y, d = hyp(dx, dy);
      if (v > 0 && d > 0.05) { const s = Math.min(d, v * dt); f.x += dx / d * s; f.y += dy / d * s; f.vx = dx / d * v; f.vy = dy / d * v; } else { f.vx = 0; f.vy = 0; }
      if (t - f.t0 > 18) f.gone = true;   // por si acaso: nadie se queda para siempre en el campo
    }
    G.folk = G.folk.filter(f => !f.gone);
  };

  // ------------------------------------------------------------ Dibujo
  /** En el césped (debajo de los jugadores): lo que han tirado. */
  PP._gradaGround = function (X, Y, s) {
    const G = this.grada;
    if (!G || !G.objs.length) return;
    const c = this.cx, t = this.t;
    for (const o of G.objs) {
      if (t < o.t0) continue;
      const u = clamp((t - o.t0) / o.T, 0, 1);
      if (u < 1) continue;   // los que vuelan, encima (_gradaTop)
      const fade = clamp((o.until - t) / 0.8, 0, 1);
      c.save(); c.globalAlpha = fade;
      c.translate(X(o.x1), Y(o.y1)); c.rotate(o.rot + o.spin * o.T);
      c.fillStyle = o.col; c.fillRect(-o.w * s / 2, -o.h * s / 2, o.w * s, o.h * s);
      c.strokeStyle = 'rgb(0 0 0 / 0.55)'; c.lineWidth = 1.2; c.strokeRect(-o.w * s / 2, -o.h * s / 2, o.w * s, o.h * s);
      c.restore();
    }
  };

  /** Encima de todo: objetos en el aire, bengalas, humo, gente que entra al campo y bocadillos de la grada. */
  PP._gradaTop = function (X, Y, s, R) {
    const G = this.grada;
    if (!G) return;
    const c = this.cx, t = this.t;
    // Objetos volando
    for (const o of G.objs) {
      if (t < o.t0) continue;
      const u = (t - o.t0) / o.T;
      if (u >= 1) continue;
      const x = o.x0 + (o.x1 - o.x0) * u, y = o.y0 + (o.y1 - o.y0) * u, h = Math.sin(u * Math.PI) * 5;
      c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.beginPath(); c.ellipse(X(x), Y(y), o.w * s * 0.5, o.w * s * 0.2, 0, 0, 6.283); c.fill();
      c.save(); c.translate(X(x), Y(y - h * 0.6)); c.rotate(o.rot + o.spin * u * o.T);
      c.fillStyle = o.col; c.fillRect(-o.w * s / 2, -o.h * s / 2, o.w * s, o.h * s);
      c.restore();
    }
    // Bengalas: luz roja que parpadea
    for (const f of G.flares) {
      if (t < f.t0) continue;
      const fl = 0.75 + 0.25 * Math.sin(t * 31 + f.ph) * Math.sin(t * 17 + f.ph * 2), rr = (1.4 + 0.4 * fl) * s;
      const g = c.createRadialGradient(X(f.x), Y(f.y), 0, X(f.x), Y(f.y), rr * 2.2);
      g.addColorStop(0, `rgb(255 245 220 / ${0.95 * fl})`); g.addColorStop(0.18, `rgb(255 70 40 / ${0.85 * fl})`); g.addColorStop(1, 'rgb(255 40 20 / 0)');
      c.fillStyle = g; c.beginPath(); c.arc(X(f.x), Y(f.y), rr * 2.2, 0, 6.283); c.fill();
    }
    // Humo
    for (const p of G.smoke) {
      const u = (t - p.t0) / p.life, r = (0.8 + u * 4.2) * s;
      c.fillStyle = p.col ? hexA(p.col, 0.34 * (1 - u)) : `rgb(220 220 226 / ${(0.32 * (1 - u)).toFixed(3)})`;
      c.beginPath(); c.arc(X(p.x), Y(p.y), r, 0, 6.283); c.fill();
    }
    // Espontáneo y seguridad
    for (const f of G.folk) {
      if (t < f.t0 - 0.01 && f.kind === 'stew') continue;
      const r = (f.stand ? 0.55 : 0.85) * R;
      const hug = f.kind === 'fan' && f.st === 'hug' ? Math.abs(Math.sin(t * 9)) * R * 0.5 : 0;
      const x = X(f.x), y = Y(f.y) - hug;
      c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.beginPath(); c.ellipse(x + 1, Y(f.y) + r * 0.85, r * 0.9, r * 0.33, 0, 0, 6.283); c.fill();
      c.beginPath(); c.arc(x, y, r, 0, 6.283);
      if (f.kind === 'fan') {
        c.fillStyle = '#f4efe6'; c.fill();
        c.lineWidth = Math.max(2, r * 0.35); c.strokeStyle = f.col; c.stroke();   // la bufanda de su equipo
      } else {
        c.fillStyle = '#ff8a1f'; c.fill();   // chaleco de seguridad
        c.lineWidth = 1.4; c.strokeStyle = '#3a2a10'; c.stroke();
        c.fillStyle = '#fff6c8'; c.fillRect(x - r * 0.7, y - r * 0.12, r * 1.4, r * 0.24);   // banda reflectante
      }
    }
    // Pelea en la grada: la nube de polvo de los tebeos, con brazos, piernas y estrellitas
    if (G.fight) {
      const F = G.fight, age = t - F.t0, k0 = Math.min(1, age / 0.4) * Math.min(1, (F.until - t) / 0.6);
      if (k0 > 0) {
        const cx0 = X(F.x), cy0 = Y(F.y), rr = F.r * s * 0.9;
        c.globalAlpha = 0.92 * k0;
        for (let q = 0; q < 7; q++) {
          const a = q / 7 * 6.283 + Math.sin(t * 5 + q) * 0.3, d = rr * (0.45 + 0.12 * Math.sin(t * 11 + q * 2));
          c.fillStyle = q % 2 ? '#e8e2d4' : '#d6cfbf';
          c.beginPath(); c.arc(cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d * 0.75, rr * (0.42 + 0.08 * Math.sin(t * 9 + q)), 0, 6.283); c.fill();
        }
        c.fillStyle = '#efe9dc'; c.beginPath(); c.arc(cx0, cy0, rr * 0.55, 0, 6.283); c.fill();
        // brazos y piernas que asoman
        c.strokeStyle = '#3a3a3a'; c.lineWidth = Math.max(1.5, s * 0.22); c.lineCap = 'round';
        for (let q = 0; q < 4; q++) {
          const a = t * 3.1 + q * 1.7, ox = Math.cos(a) * rr * 0.95, oy = Math.sin(a) * rr * 0.7;
          c.beginPath(); c.moveTo(cx0 + ox * 0.6, cy0 + oy * 0.6); c.lineTo(cx0 + ox * 1.15, cy0 + oy * 1.15); c.stroke();
          c.fillStyle = '#e8bb98'; c.beginPath(); c.arc(cx0 + ox * 1.2, cy0 + oy * 1.2, Math.max(1.4, s * 0.2), 0, 6.283); c.fill();
        }
        c.lineCap = 'butt';
        // estrellitas
        for (let q = 0; q < 3; q++) {
          const a = t * 4 + q * 2.1, sx = cx0 + Math.cos(a) * rr * 0.9, sy = cy0 - rr * 0.6 + Math.sin(a) * rr * 0.3;
          c.fillStyle = '#ffd23f'; c.font = `900 ${Math.max(9, Math.round(s * 1.2))}px Barlow Condensed, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('✶', sx, sy);
        }
        c.globalAlpha = 1;
      }
    }
    // Insultos desde la grada
    for (const b of G.bubs) {
      if (t < b.t0) continue;
      const age = t - b.t0, pop = age < 0.12 ? 0.6 + age / 0.12 * 0.5 : age < 0.22 ? 1.1 - (age - 0.12) : 1;
      const fade = clamp((b.until - t) / 0.25, 0, 1), sz = Math.max(8, R * 1.05) * pop, x = X(b.x), y = Y(b.y) - R * 1.2;
      c.globalAlpha = fade;
      c.fillStyle = '#e53935'; c.strokeStyle = 'rgb(0 0 0 / 0.6)'; c.lineWidth = 1.2;
      c.beginPath(); if (c.roundRect) c.roundRect(x - sz * 0.75, y - sz * 0.55, sz * 1.5, sz * 1.1, sz * 0.35); else c.rect(x - sz * 0.75, y - sz * 0.55, sz * 1.5, sz * 1.1);
      c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - sz * 0.2, y + sz * 0.5); c.lineTo(x - sz * 0.05, y + sz * 0.95); c.lineTo(x + sz * 0.2, y + sz * 0.5); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.font = `900 ${Math.round(sz * 0.62)}px Barlow Condensed, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('#@!', x, y + sz * 0.04);
      c.globalAlpha = 1;
    }
  };
  function hexA(hex, a) {
    const h = String(hex || '#ffffff').replace('#', '');
    const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
    const v = parseInt(n, 16) || 0xffffff;
    return `rgb(${(v >> 16) & 255} ${(v >> 8) & 255} ${v & 255} / ${a.toFixed(3)})`;
  }
})();
