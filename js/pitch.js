/* TOUCHLINE — vista 2D del partido en directo (canvas).
 * Los jugadores se colocan según su formación, se desplazan con el balón y
 * representan los eventos del motor: pases, tiros, paradas, goles, faltas y tarjetas. */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const L = 105, Wd = 68; // medidas del campo (m)
  const GOAL_W = 7.32;

  function hueOf(c) { const m = /hsl\((\d+)/.exec(c || ''); return m ? +m[1] : null; }
  function hueDist(a, b) { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); }

  /** Color dominante de un escudo (si el CDN permite leer los píxeles). */
  const kitCache = {};
  function crestColor(url, cb) {
    if (!url) return;
    if (kitCache[url]) { cb(kitCache[url]); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 24; c.height = 30;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, 24, 30);
        const d = x.getImageData(0, 0, 24, 30).data;
        const bins = {};
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
          if (a < 200) continue;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 40 || mx < 50) continue; // ignora blancos, grises y negros
          const k = `${r >> 5},${g >> 5},${b >> 5}`;
          (bins[k] || (bins[k] = [0, 0, 0, 0]));
          bins[k][0] += r; bins[k][1] += g; bins[k][2] += b; bins[k][3]++;
        }
        const best = Object.values(bins).sort((a, b) => b[3] - a[3])[0];
        if (!best || best[3] < 12) return;
        const col = `rgb(${(best[0] / best[3]) | 0} ${(best[1] / best[3]) | 0} ${(best[2] / best[3]) | 0})`;
        kitCache[url] = col;
        cb(col);
      } catch (e) { /* sin CORS: se queda el color generado */ }
    };
    img.src = url;
  }

  class Pitch {
    constructor(canvas, match, me) {
      this.cv = canvas;
      this.cx = canvas.getContext('2d');
      this.m = match;
      this.me = me;
      this.S = match.S;
      this.pos = {};      // pid -> {x, y}
      this.num = {};      // pid -> dorsal
      this.ball = { x: L / 2, y: Wd / 2, h: 0 };
      this.tw = null;     // interpolación del balón
      this.carrier = null;
      this.poss = 0;
      this.queue = [];
      this.act = null;
      this.cards = [];
      this.banner = null;
      this.speed = 1;
      this.paused = false;
      this.nextPass = 0;
      this.t = 0;
      this.colors = this._colors();
      this._numbers();
      this.kick(Math.random() < 0.5 ? 0 : 1);
      for (const i of [0, 1]) {
        const club = this.S.clubs[match.teams[i].club];
        if (club.logo) crestColor(club.logo, col => { this.colors[i].main = col; });
      }
      this._resize = () => this.resize();
      window.addEventListener('resize', this._resize);
      this.resize();
      this._last = performance.now();
      this._loop = this._loop.bind(this);
      this.raf = requestAnimationFrame(this._loop);
    }

    destroy() { cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._resize); }

    _colors() {
      const [a, b] = this.m.teams.map(t => this.S.clubs[t.club]);
      const away = { main: b.c1, alt: b.c2 };
      const ha = hueOf(a.c1), hb = hueOf(b.c1);
      if (ha != null && hb != null && hueDist(ha, hb) < 45) away.main = b.c2 && b.c2 !== '#111' ? b.c2 : '#f4f4f0';
      return [{ main: a.c1, gk: '#f2c94c' }, { main: away.main, gk: '#4ad7d1' }];
    }

    _numbers() {
      for (const t of this.m.teams) {
        let n = 2;
        for (const o of t.onPitch) this.num[o.pid] = o.slot === 'GK' ? 1 : n++;
        let k = 12;
        for (const pid of t.bench) this.num[pid] = k++;
      }
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.max(10, r.width * dpr);
      this.cv.height = Math.max(10, r.height * dpr);
      this.dpr = dpr;
      this.w = r.width; this.h = r.height;
      const pad = 8;
      this.sc = Math.min((this.w - pad * 2) / L, (this.h - pad * 2) / Wd);
      this.ox = (this.w - L * this.sc) / 2;
      this.oy = (this.h - Wd * this.sc) / 2;
    }

    // ------------------------------------------------------------ Posiciones
    _slotPos(i, o, k) {
      const t = this.m.teams[i];
      const slot = TL.Engine.FORMATIONS[t.formation].find(s => s[0] === o.slot && !this._used.has(i + ':' + s[1] + ':' + s[2]));
      let sx = 50, sy = 50;
      if (slot) { this._used.add(i + ':' + slot[1] + ':' + slot[2]); sx = slot[1]; sy = slot[2]; }
      const att = this.poss === i;
      const prog = i === 0 ? this.ball.x / L : 1 - this.ball.x / L;
      const gk = o.slot === 'GK';
      let depth = 3 + sy * 0.6 + (gk ? 0 : (att ? 16 : 3) + (prog - 0.5) * 20);
      depth = U.clamp(depth, gk ? 2 : 6, 98);
      let lat = sx / 100 * Wd;
      const by = this.ball.y;
      lat += (by - lat) * (gk ? 0.05 : 0.2);
      lat += Math.sin(this.t * 0.9 + k * 1.7) * 0.9;
      depth += Math.cos(this.t * 0.7 + k) * 0.8;
      return i === 0 ? [depth, Wd - lat] : [L - depth, lat];
    }

    _targets() {
      this._used = new Set();
      const out = {};
      this.m.teams.forEach((t, i) => t.onPitch.forEach((o, k) => { out[o.pid] = this._slotPos(i, o, k); }));
      return out;
    }

    team(pid) { const r = this.m.pl[pid]; return r ? r.team : -1; }
    onPitch(i) { return this.m.teams[i].onPitch; }
    gk(i) { const o = this.onPitch(i).find(o => o.slot === 'GK'); return o ? o.pid : null; }

    kick(i) {
      this.poss = i;
      this.ball.x = L / 2; this.ball.y = Wd / 2; this.ball.h = 0;
      const mid = this.onPitch(i).filter(o => F.LINE[o.slot] >= 2);
      this.carrier = mid.length ? U.pick(mid).pid : null;
      this.tw = null;
    }

    // ------------------------------------------------------------ Acciones
    push(evs) {
      for (const e of evs) {
        if (['goal', 'save', 'miss', 'pen', 'penmiss', 'fk', 'foul', 'yellow', 'red', 'inj', 'sub', 'ht', 'ft', 'var', 'disallowed', 'crowd', 'heated', 'refmiss', 'tactic'].includes(e.type)) this.queue.push(e);
      }
      // Si se acumulan muchas (velocidades altas), se resuelven las más antiguas al instante
      while (this.queue.length > 4) this._apply(this.queue.shift(), true);
    }

    _dur(base) { return Math.max(0.06, base / Math.pow(this.speed, 0.85)); }

    _passTo(pid, dur, h) {
      const p = this.pos[pid];
      if (!p) return;
      this.tw = { fx: this.ball.x, fy: this.ball.y, tx: p[0], ty: p[1], t: 0, d: dur, h: h || 0, pid };
    }

    _shoot(team, kind, cb) {
      const gx = team === 0 ? L + 0.5 : -0.5;
      let gy = Wd / 2 + U.rand(-GOAL_W / 2 + 0.6, GOAL_W / 2 - 0.6);
      if (kind === 'miss') gy = Wd / 2 + (Math.random() < 0.5 ? -1 : 1) * U.rand(GOAL_W / 2 + 1, GOAL_W / 2 + 7);
      if (kind === 'save') {
        const g = this.gk(1 - team);
        const p = g && this.pos[g];
        if (p) { gy = p[1]; }
        this.tw = { fx: this.ball.x, fy: this.ball.y, tx: p ? p[0] : gx, ty: gy, t: 0, d: this._dur(0.35), h: 1.2, pid: g, cb };
        return;
      }
      this.tw = { fx: this.ball.x, fy: this.ball.y, tx: gx, ty: gy, t: 0, d: this._dur(0.38), h: kind === 'miss' ? 2.4 : 1.4, pid: null, cb };
      TL.SFX && TL.SFX.kick();
    }

    _showBanner(text, color, secs) { this.banner = { text, color: color || '#fff', until: this.t + (secs || 1.4), born: this.t }; }

    _apply(e, instant) {
      const i = e.team;
      const P = this.pos;
      const sfx = !instant && TL.SFX;
      switch (e.type) {
        case 'goal': {
          this.poss = i;
          if (instant) { this.kick(1 - i); break; }
          const shooter = e.pid, ass = e.pid2;
          const steps = [];
          if (ass != null && P[ass]) steps.push(() => this._passTo(ass, this._dur(0.3)));
          if (e.kind === 'pen') steps.push(() => { this.ball.x = i === 0 ? L - 11 : 11; this.ball.y = Wd / 2; this.carrier = shooter; });
          else if (shooter != null && P[shooter]) steps.push(() => this._passTo(shooter, this._dur(0.3)));
          steps.push(() => this._shoot(i, 'goal', () => {
            const mine = i === this.me;
            this._showBanner('¡GOOOL!', mine ? '#b8f53d' : '#ffffff', 1.8);
            this.netShake = { side: i, until: this.t + 0.6 };
            if (sfx) { sfx.goal(mine); sfx.net(); }
            if (mine && TL.FX) { TL.FX.confetti(); TL.FX.flash(); }
            else if (TL.FX) TL.FX.shake(document.getElementById('mv-score'));
          }));
          steps.push(null); // pausa de celebración
          steps.push(() => this.kick(1 - i));
          this.act = { steps, wait: 0 };
          break;
        }
        case 'save': case 'miss': {
          if (instant) { this.poss = 1 - i; this.carrier = this.gk(1 - i); break; }
          this.poss = i;
          const steps = [];
          if (e.pid != null && P[e.pid]) steps.push(() => this._passTo(e.pid, this._dur(0.3)));
          steps.push(() => this._shoot(i, e.type, () => {
            if (sfx) { e.type === 'save' ? sfx.chance() : sfx.groan(); }
            this.poss = 1 - i;
            this.carrier = this.gk(1 - i);
          }));
          this.act = { steps, wait: 0 };
          break;
        }
        case 'pen':
          this.poss = i;
          this.ball.x = i === 0 ? L - 11 : 11; this.ball.y = Wd / 2; this.tw = null; this.carrier = e.pid;
          if (!instant) { this._showBanner('PENALTI', '#f2c94c', 1.4); sfx && sfx.whistle(false); }
          break;
        case 'penmiss':
          if (!instant) { this._shoot(i, Math.random() < 0.6 ? 'save' : 'miss', () => { sfx && sfx.groan(); this.poss = 1 - i; this.carrier = this.gk(1 - i); }); }
          break;
        case 'fk':
          this.poss = i;
          this.ball.x = i === 0 ? L - 24 : 24; this.ball.y = Wd / 2 + U.rand(-10, 10); this.tw = null;
          if (!instant) { this._showBanner('Falta peligrosa', '#ffffff', 1.0); sfx && sfx.whistle(false); }
          break;
        case 'foul': case 'yellow': case 'red': case 'heated': {
          if (e.pid != null && P[e.pid]) { this.ball.x = P[e.pid][0]; this.ball.y = P[e.pid][1]; this.tw = null; }
          if (e.type === 'foul') { sfx && sfx.whistle(false); this.poss = 1 - i; }
          if (e.type === 'yellow' || e.type === 'red') {
            this.cards.push({ pid: e.pid, color: e.type === 'red' ? '#ff4040' : '#ffd23f', until: this.t + 2, at: P[e.pid] ? P[e.pid].slice() : null });
            if (sfx) { sfx.card(); if (e.type === 'red') sfx.boo(); }
            this.poss = 1 - i;
          }
          if (e.type === 'heated' && !instant) { this._showBanner('¡TANGANA!', '#ff6b6b', 1.2); sfx && sfx.boo(); }
          break;
        }
        case 'inj':
          if (e.pid != null) this.cards.push({ pid: e.pid, icon: '🚑', until: this.t + 2.2, at: P[e.pid] ? P[e.pid].slice() : null });
          break;
        case 'var': if (!instant) this._showBanner('Revisión VAR', '#5db8ff', 1.2); break;
        case 'disallowed': if (!instant) { this._showBanner('GOL ANULADO', '#ff6b6b', 1.4); sfx && sfx.boo(); } this.kick(1 - i); break;
        case 'refmiss': if (!instant) { this._showBanner('¿¡No es penalti!?', '#ff6b6b', 1.3); sfx && sfx.boo(); } break;
        case 'crowd': if (!instant) { this._showBanner('Partido detenido', '#ff9a3d', 1.3); sfx && sfx.whistle(false); } break;
        case 'sub': if (!instant) this._showBanner('Cambio', '#ffffff', 0.8); this._numbers(); break;
        case 'tactic': if (!instant) this._showBanner('Cambio táctico', '#ffffff', 0.9); break;
        case 'ht': if (!instant) { this._showBanner('DESCANSO', '#ffffff', 1.6); sfx && sfx.whistle(true); } this.kick(1); break;
        case 'ft': if (!instant) { this._showBanner('FINAL', '#ffffff', 3); sfx && sfx.whistle(true); } break;
        default:
      }
    }

    // ------------------------------------------------------------ Bucle
    _loop(now) {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.t += dt;
      this._update(dt);
      this._draw();
      this.raf = requestAnimationFrame(this._loop);
    }

    _update(dt) {
      // Movimiento de jugadores
      const tg = this._targets();
      const k = Math.min(1, dt * 2.6 * Math.max(1, Math.sqrt(this.speed)));
      for (const pid in tg) {
        const p = this.pos[pid] || (this.pos[pid] = tg[pid].slice());
        p[0] += (tg[pid][0] - p[0]) * k;
        p[1] += (tg[pid][1] - p[1]) * k;
      }
      for (const pid in this.pos) if (!tg[pid]) delete this.pos[pid];
      if (!dt) return;
      // Balón en vuelo
      if (this.tw) {
        const w = this.tw;
        w.t += dt;
        const a = Math.min(1, w.t / w.d);
        const e = a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
        const tx = w.pid != null && this.pos[w.pid] ? this.pos[w.pid][0] : w.tx;
        const ty = w.pid != null && this.pos[w.pid] ? this.pos[w.pid][1] : w.ty;
        this.ball.x = w.fx + (tx - w.fx) * e;
        this.ball.y = w.fy + (ty - w.fy) * e;
        this.ball.h = w.h * Math.sin(Math.PI * a);
        if (a >= 1) {
          this.tw = null;
          if (w.pid != null) this.carrier = w.pid;
          if (w.cb) w.cb();
        }
        return;
      }
      // Secuencia de una acción (gol, tiro…)
      if (this.act) {
        if (this.act.wait > 0) { this.act.wait -= dt; return; }
        const step = this.act.steps.shift();
        if (step === undefined) { this.act = null; }
        else if (step === null) this.act.wait = this._dur(1.3);
        else step();
        return;
      }
      if (this.queue.length) { this._apply(this.queue.shift(), false); return; }
      // Conducción y pases
      if (this.carrier != null && this.pos[this.carrier]) {
        const p = this.pos[this.carrier], dir = this.team(this.carrier) === 0 ? 1 : -1;
        this.ball.x += (p[0] + dir * 0.9 - this.ball.x) * Math.min(1, dt * 8);
        this.ball.y += (p[1] - this.ball.y) * Math.min(1, dt * 8);
        this.ball.h = 0;
      }
      if (this.hold) return;
      this.nextPass -= dt;
      if (this.nextPass <= 0) {
        this.nextPass = this._dur(U.rand(0.55, 1.1));
        this._autoPass();
      }
    }

    _autoPass() {
      let i = this.poss;
      const poss = this.m.min ? this.m.stats.possSum[0] / this.m.min : 0.5;
      const keep = i === 0 ? poss : 1 - poss;
      if (Math.random() < 0.2 * (1.2 - keep)) {
        // Pérdida: roba el rival más cercano
        i = this.poss = 1 - i;
        let best = null, bd = 1e9;
        for (const o of this.onPitch(i)) {
          const p = this.pos[o.pid]; if (!p) continue;
          const d = (p[0] - this.ball.x) ** 2 + (p[1] - this.ball.y) ** 2;
          if (d < bd) { bd = d; best = o.pid; }
        }
        if (best != null) this._passTo(best, this._dur(0.25));
        return;
      }
      const dir = i === 0 ? 1 : -1;
      const mates = this.onPitch(i).filter(o => o.pid !== this.carrier && this.pos[o.pid]);
      if (!mates.length) return;
      const o = U.weighted(mates, o => {
        const p = this.pos[o.pid];
        const gain = (p[0] - this.ball.x) * dir;
        const dist = Math.hypot(p[0] - this.ball.x, p[1] - this.ball.y);
        return (gain > -8 ? 1 + Math.max(0, gain) / 12 : 0.25) * (dist < 40 ? 1 : 0.3) * (o.slot === 'GK' ? 0.15 : 1);
      });
      const d = Math.hypot(this.pos[o.pid][0] - this.ball.x, this.pos[o.pid][1] - this.ball.y);
      this._passTo(o.pid, this._dur(0.25 + d / 60), d > 25 ? 1.2 : 0.2);
    }

    // ------------------------------------------------------------ Dibujo
    X(x) { return this.ox + x * this.sc; }
    Y(y) { return this.oy + y * this.sc; }

    _draw() {
      const c = this.cx, s = this.sc;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      // Césped a franjas
      for (let k = 0; k < 12; k++) {
        c.fillStyle = k % 2 ? '#1b5a34' : '#1e6339';
        c.fillRect(this.X(k * L / 12), this.Y(0), L / 12 * s + 1, Wd * s);
      }
      // Líneas
      c.strokeStyle = 'rgb(255 255 255 / 0.55)';
      c.lineWidth = Math.max(1, s * 0.12);
      c.strokeRect(this.X(0), this.Y(0), L * s, Wd * s);
      c.beginPath(); c.moveTo(this.X(L / 2), this.Y(0)); c.lineTo(this.X(L / 2), this.Y(Wd)); c.stroke();
      c.beginPath(); c.arc(this.X(L / 2), this.Y(Wd / 2), 9.15 * s, 0, 6.283); c.stroke();
      for (const side of [0, 1]) {
        const x0 = side ? L - 16.5 : 0, x1 = side ? L - 5.5 : 0;
        c.strokeRect(this.X(x0), this.Y(Wd / 2 - 20.15), 16.5 * s, 40.3 * s);
        c.strokeRect(this.X(x1), this.Y(Wd / 2 - 9.15), 5.5 * s, 18.3 * s);
        c.beginPath(); c.arc(this.X(side ? L - 11 : 11), this.Y(Wd / 2), s * 0.35, 0, 6.283); c.fillStyle = 'rgb(255 255 255 / .6)'; c.fill();
        c.beginPath(); c.arc(this.X(side ? L - 11 : 11), this.Y(Wd / 2), 9.15 * s, side ? Math.PI * 0.705 : -Math.PI * 0.295, side ? Math.PI * 1.295 : Math.PI * 0.295); c.stroke();
        // Portería (con red que tiembla en los goles)
        const gx = side ? L : -2;
        let jiggle = 0;
        if (this.netShake && this.netShake.until > this.t && this.netShake.side === (side ? 0 : 1)) jiggle = Math.sin(this.t * 60) * 0.4;
        c.fillStyle = 'rgb(255 255 255 / 0.18)';
        c.fillRect(this.X(gx + jiggle), this.Y(Wd / 2 - GOAL_W / 2), 2 * s, GOAL_W * s);
        c.strokeStyle = 'rgb(255 255 255 / 0.85)';
        c.strokeRect(this.X(gx + jiggle), this.Y(Wd / 2 - GOAL_W / 2), 2 * s, GOAL_W * s);
        c.strokeStyle = 'rgb(255 255 255 / 0.55)';
      }
      // Jugadores
      const r = Math.max(5, 1.75 * s);
      c.font = `700 ${Math.round(r * 1.05)}px Barlow Condensed, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      this.m.teams.forEach((t, i) => {
        for (const o of t.onPitch) {
          const p = this.pos[o.pid]; if (!p) continue;
          const x = this.X(p[0]), y = this.Y(p[1]);
          c.beginPath(); c.ellipse(x + 1, y + r * 0.9, r * 0.9, r * 0.35, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.fill();
          c.beginPath(); c.arc(x, y, r, 0, 6.283);
          c.fillStyle = o.slot === 'GK' ? this.colors[i].gk : this.colors[i].main; c.fill();
          c.lineWidth = o.pid === this.carrier ? 2.4 : 1.4;
          c.strokeStyle = o.pid === this.carrier ? '#b8f53d' : (i === this.me ? '#ffffff' : 'rgb(0 0 0 / 0.55)');
          c.stroke();
          c.fillStyle = '#fff';
          c.shadowColor = 'rgb(0 0 0 / 0.7)'; c.shadowBlur = 2;
          c.fillText(String(this.num[o.pid] || ''), x, y + 0.5);
          c.shadowBlur = 0;
          if (o.hurt) { c.font = `${Math.round(r * 1.2)}px sans-serif`; c.fillText('🚑', x + r, y - r); c.font = `700 ${Math.round(r * 1.05)}px Barlow Condensed, sans-serif`; }
        }
      });
      // Nombre del que lleva el balón
      if (this.carrier != null && this.pos[this.carrier] && !this.tw) {
        const p = this.pos[this.carrier];
        const name = this.S.players[this.carrier].short;
        c.font = `600 ${Math.max(10, Math.round(r * 1.1))}px Barlow, sans-serif`;
        const tw = c.measureText(name).width + 8;
        const x = this.X(p[0]), y = this.Y(p[1]) + r + 9;
        c.fillStyle = 'rgb(0 0 0 / 0.6)';
        c.fillRect(x - tw / 2, y - 7, tw, 14);
        c.fillStyle = '#fff';
        c.fillText(name, x, y);
      }
      // Tarjetas y avisos sobre jugadores
      this.cards = this.cards.filter(k => k.until > this.t);
      for (const k of this.cards) {
        const p = this.pos[k.pid] || k.at; if (!p) continue;
        const x = this.X(p[0]), y = this.Y(p[1]) - r * 2.4;
        const bob = Math.sin(this.t * 10) * 1.5;
        if (k.icon) { c.font = `${Math.round(r * 1.6)}px sans-serif`; c.fillText(k.icon, x, y + bob); continue; }
        c.save(); c.translate(x, y + bob); c.rotate(-0.15);
        c.fillStyle = k.color; c.fillRect(-r * 0.55, -r * 0.8, r * 1.1, r * 1.6);
        c.strokeStyle = 'rgb(0 0 0 / .4)'; c.strokeRect(-r * 0.55, -r * 0.8, r * 1.1, r * 1.6);
        c.restore();
      }
      // Balón
      const bx = this.X(this.ball.x), by = this.Y(this.ball.y), bh = this.ball.h * s;
      const br = Math.max(3, 0.85 * s) * (1 + this.ball.h * 0.12);
      c.beginPath(); c.ellipse(bx + bh * 0.4, by + br * 0.6, br, br * 0.45, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.35)'; c.fill();
      c.beginPath(); c.arc(bx, by - bh, br, 0, 6.283); c.fillStyle = '#ffffff'; c.fill();
      c.lineWidth = 1; c.strokeStyle = '#222'; c.stroke();
      // Rótulo
      if (this.banner && this.banner.until > this.t) {
        const b = this.banner;
        const age = this.t - b.born;
        const scale = Math.min(1, 0.6 + age * 4) * (b.text === '¡GOOOL!' ? 1 + Math.sin(age * 12) * 0.04 : 1);
        const alpha = Math.min(1, (b.until - this.t) * 3);
        c.save();
        c.globalAlpha = alpha;
        c.translate(this.w / 2, this.h / 2);
        c.scale(scale, scale);
        const fs = b.text === '¡GOOOL!' ? Math.min(64, this.h * 0.3) : Math.min(30, this.h * 0.14);
        c.font = `italic 800 ${fs}px Barlow Condensed, sans-serif`;
        const tw = c.measureText(b.text).width + fs;
        c.fillStyle = 'rgb(8 17 13 / 0.78)';
        c.beginPath(); c.roundRect ? c.roundRect(-tw / 2, -fs * 0.75, tw, fs * 1.5, 12) : c.rect(-tw / 2, -fs * 0.75, tw, fs * 1.5); c.fill();
        c.fillStyle = b.color;
        c.fillText(b.text, 0, 2);
        c.restore();
      }
    }
  }

  TL.Pitch = Pitch;
})();
