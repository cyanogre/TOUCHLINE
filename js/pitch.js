/* TOUCHLINE — vista 2D del partido en directo (canvas).
 *
 * Cada puntito es un jugador con su puesto, su energía y su ánimo: presiona, marca,
 * se desmarca, se cansa y celebra. El balón tiene altura (pases rasos, globos,
 * centros, cabezazos, vaselinas) y su sombra se separa cuando vuela. Hay árbitro,
 * jueces de línea con banderín, cuarto árbitro, banquillos con suplentes, asistencias
 * y los dos entrenadores en su área técnica (tú incluido).
 *
 * Los eventos del motor se escenifican como en la tele: córners con el área llena,
 * faltas con barrera, penaltis con todos fuera del área, saques de banda y de puerta,
 * fueras de juego, segadas, tanganas, VAR, cambios y celebraciones. Los momentos
 * épicos van a cámara lenta y con zoom. Mientras se escenifica una jugada, el reloj
 * del partido espera (busy()).
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const L = 105, Wd = 68, GW = 7.32;
  const VIEW = { x0: -6, x1: L + 6, y0: -12, y1: Wd + 5 }; // campo + banda de banquillos (arriba)
  const TECH_Y = -3.4, BENCH_Y = -7.2, TUNNEL = { x: L / 2, y: -9.5 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const d2 = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  const KEY_EVENTS = ['goal', 'save', 'miss', 'pen', 'penmiss', 'fk', 'foul', 'yellow', 'red', 'inj', 'sub', 'ht', 'ft', 'var',
    'disallowed', 'crowd', 'heated', 'refmiss', 'tactic', 'corner', 'offside', 'late', 'controversy'];

  // ---- Colores de las equipaciones
  const RGB = {};
  function hsl2rgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
  }
  function rgbOf(c) {
    c = String(c || '#808080');
    if (RGB[c]) return RGB[c];
    let m, out = [128, 128, 128];
    if ((m = /^#([0-9a-f]{3})$/i.exec(c))) out = m[1].split('').map(h => parseInt(h + h, 16));
    else if ((m = /^#([0-9a-f]{6})$/i.exec(c))) out = [0, 2, 4].map(k => parseInt(m[1].substr(k, 2), 16));
    else if ((m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c))) out = [+m[1], +m[2], +m[3]];
    else if ((m = /hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(c))) out = hsl2rgb(+m[1], +m[2] / 100, +m[3] / 100);
    return (RGB[c] = out);
  }
  /** Distancia de color aproximada a la percepción («redmean»): 0 iguales · ~765 blanco/negro. */
  function cdist(a, b) {
    const A = Array.isArray(a) ? a : rgbOf(a), B = Array.isArray(b) ? b : rgbOf(b);
    const rm = (A[0] + B[0]) / 2, dr = A[0] - B[0], dg = A[1] - B[1], db = A[2] - B[2];
    return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
  }
  function lum(c) { const [r, g, b] = rgbOf(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  // Cuánto se ve el color secundario según el dibujo de la camiseta
  const SHARE = { '': 0, h: 0.3, x: 0.25, c: 0.2, s: 0.45, v: 0.5, k: 0.5 };
  /** Color «de lejos» de una camiseta (mezcla de sus dos colores). */
  function look(k) {
    const a = rgbOf(k.c1), b = rgbOf(k.c2), w = SHARE[k.p] || 0;
    return a.map((v, i) => v * (1 - w) + b[i] * w);
  }
  /** ¿Se distinguen dos camisetas? (más alto, mejor) */
  function contrast(k1, k2) { return 0.6 * cdist(look(k1), look(k2)) + 0.4 * cdist(k1.c1, k2.c1); }
  const CLASH = 165;
  const kit = (a, p) => ({ c1: a[0], c2: a[1] || a[0], p: a[2] || p || '' });
  /** Primera y segunda equipación de un club (oficial si la conocemos; si no, sus colores). */
  function kitsOf(club) {
    const K = club.kit || (window.TL_KITS && window.TL_KITS[club.name]);
    if (K) return { known: true, home: kit(K[0]), away: kit(K[1] || [K[0][1], K[0][0]]) };
    const c2 = club.c2 && club.c2 !== '#111' ? club.c2 : '#f4f4f0';
    return { known: false, home: kit([club.c1, club.c1]), away: kit([c2, club.c1]) };
  }

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
          if (mx - mn < 40 || mx < 50) continue;
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

  // Estadio dibujado (prueba): ?campo=arte lo activa, ?campo=no lo quita
  const ART = { on: false, img: null };
  try {
    const q = new URLSearchParams(location.search).get('campo');
    if (q) localStorage.setItem('touchline.campo', q === 'arte' ? '1' : '0');
    ART.on = localStorage.getItem('touchline.campo') === '1';
  } catch (e) { /* sin almacenamiento */ }

  /** Tiempo del partido según la época del año (invierno: lluvia y nieve; verano: calor). Se puede forzar con ?tiempo=lluvia|nieve|calor|nublado|despejado. */
  function weatherFor(S, home, h) {
    try { const q = new URLSearchParams(location.search).get('tiempo'); if (q) return q; } catch (e) { /* nada */ }
    const wk = S.week || 0, winter = wk >= 12 && wk <= 26, summer = wk <= 3 || wk >= 34;
    const r = ((h * 2654435761 + wk * 97) >>> 0) % 1000 / 1000;
    const w = [['despejado', 40], ['nublado', 25], ['lluvia', winter ? 22 : 12], ['nieve', winter ? 7 : 0], ['calor', summer ? 22 : 3]];
    const tot = w.reduce((a, x) => a + x[1], 0);
    let acc = 0; for (const [k, v] of w) { acc += v / tot; if (r < acc) return k; }
    return 'despejado';
  }

  function actor(kind, x, y, extra) {
    return Object.assign({ kind, x, y, vx: 0, vy: 0, tx: x, ty: y, run: 0.5, state: null, until: 0, bob: Math.random() * 6 }, extra || {});
  }

  class Pitch {
    constructor(canvas, match, me) {
      this.cv = canvas;
      this.cx = canvas.getContext('2d');
      this.m = match;
      this.me = me;
      this.S = match.S;
      this.speed = 1;
      this.hold = false;
      this.over = false;
      this.t = 0;
      this.dir = [1, -1];          // hacia dónde ataca cada equipo (se cambia en el descanso)
      this.A = {};                 // pid -> jugador en el campo
      this.leaving = [];           // los que se van (cambios, expulsiones)
      this.keep = new Set();       // pids que el guion retiene aunque el motor ya los haya quitado
      this.num = {};
      this.aura = TL.Events && this.S.ev ? TL.Events.auras(this.S) : {}; // limit break y almas: aura y estela
      this.kitSrc = match.teams.map(t => kitsOf(this.S.clubs[t.club]));
      this.colors = this._colors();
      this._numbers();
      this.ball = { x: L / 2, y: Wd / 2, z: 0, owner: null, path: null, roll: null, trail: [] };
      this.poss = 0;
      this.ref = actor('ref', L / 2 - 10, Wd / 2 + 8);
      this.ars = [actor('ar', L * 0.25, Wd + 0.9), actor('ar', L * 0.75, -0.9)];
      this.fourth = actor('4th', L / 2, TECH_Y + 1.2);
      this.coaches = [0, 1].map(i => actor('coach', L / 2 + (i === 0 ? -11 : 11), TECH_Y, { team: i, base: L / 2 + (i === 0 ? -11 : 11) }));
      this.warm = [0, 1].map(i => [0, 1].map(k => actor('warm', i === 0 ? 6 + k * 3 : L - 6 - k * 3, -1.8, { team: i, k })));
      this.medics = [];
      this.fx = [];
      this.sparks = [];
      this.queue = [];
      this.script = [];
      this.beat = null;
      this.ov = null;
      this.cam = { x: (VIEW.x0 + VIEW.x1) / 2, y: (VIEW.y0 + VIEW.y1) / 2, z: 1, tx: null, ty: null, tz: 1 };
      this.slow = 1; this.slowT = 1;
      this.banner = null;
      this.st = this._stadium();
      this.crowd = this._crowd();
      for (const i of [0, 1]) for (const o of match.teams[i].onPitch) this._spawn(i, o.pid);
      this._placeKickoff(0, true);
      this.ball.owner = this._kickTaker(0);
      this.brain = new TL.Brain2D(this);
      this.brain.ownTeam = 0; this.brain.lastTouch = 0;
      this.stepT = 0;
      this.handled = [];
      if (this.st.name) this._banner(this.st.name + (this.st.night ? ' · partido nocturno' : ''), '#ffffff', 2.6);
      for (const i of [0, 1]) {
        const club = this.S.clubs[match.teams[i].club];
        // Sin equipación conocida: el color dominante del escudo
        if (club.logo && !this.kitSrc[i].known) crestColor(club.logo, col => { this.kitSrc[i].home = kit([col, col]); this.colors = this._colors(); });
      }
      const gest = e => {
        const r = this.cv.getBoundingClientRect(), g = this.tilt || (this.tilt = { x: 0, y: 0, tx: 0, ty: 0 });
        if (this.cv.closest('.mini')) { g.tx = g.ty = 0; return; }
        g.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        g.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      };
      this.cv.addEventListener('pointermove', gest);
      this.cv.addEventListener('pointerdown', gest);
      this.cv.addEventListener('pointerleave', () => { if (this.tilt) this.tilt.tx = this.tilt.ty = 0; });
      this.cv.addEventListener('pointerup', e => { if (e.pointerType === 'touch' && this.tilt) this.tilt.tx = this.tilt.ty = 0; });
      this.cv.style.touchAction = 'pan-y';
      this._resize = () => this.resize();
      window.addEventListener('resize', this._resize);
      this.resize();
      this._last = performance.now();
      this._loop = this._loop.bind(this);
      this.raf = requestAnimationFrame(this._loop);
    }

    destroy() { cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._resize); }

    /** El reloj del partido espera mientras se escenifica una jugada. */
    busy() { return this.loading() || (!this.over && !!(this.beat || this.script.length || this.queue.length)); }
    /** ¿Aún se está cargando el estadio dibujado? (el partido espera) */
    loading() {
      if (!ART.on || !TL.StadiumGL) return false;
      TL.StadiumGL.load();
      return !TL.StadiumGL.ready();
    }

    /** El local viste la primera; el visitante, la que no se confunda (como manda el árbitro). */
    _colors() {
      const [A, B] = this.kitSrc;
      const home = A.home;
      const opts = [B.home, B.away, kit(['#f4f4f0', '#1b2235']), kit(['#1b2235', '#f4f4f0'])];
      let away = opts.find(k => contrast(home, k) >= CLASH);
      if (!away) away = opts.slice().sort((x, y) => contrast(home, y) - contrast(home, x))[0];
      // Porteros: un color que no se parezca a ninguna camiseta (ni al otro portero)
      const GK = ['#f2c94c', '#4ad7d1', '#ff7ab6', '#9b5de5', '#7cff6b', '#ff8c42', '#e8e8e8', '#222222'];
      const shirts = [home, away].flatMap(k => [look(k), rgbOf(k.c1)]);
      const pickGk = (pref, also) => {
        const score = c => Math.min(...shirts.concat(also).map(x => cdist(c, x)));
        const order = GK.slice(pref).concat(GK.slice(0, pref));
        return order.find(c => score(c) >= 220) || order.slice().sort((x, y) => score(y) - score(x))[0];
      };
      const gk0 = pickGk(0, []), gk1 = pickGk(1, [rgbOf(gk0)]);
      // El árbitro también se cambia de camiseta si coincide con algún equipo
      const refs = ['#121212', '#f2e94e', '#e5397a', '#2f80ed', '#16c79a'];
      const seen = shirts.concat([rgbOf(gk0), rgbOf(gk1)]);
      this.refCol = refs.find(c => Math.min(...seen.map(x => cdist(c, x))) >= 140) || '#121212';
      const ink = c => (lum(c) > 0.62 ? '#111' : '#fff');
      const out = (k, gk) => ({ main: k.c1, c1: k.c1, c2: k.c2, p: k.p, gk, gkInk: ink(gk), ink: ink(k.p === 's' || k.p === 'c' ? k.c2 : k.c1) });
      return [out(home, gk0), out(away, gk1)];
    }

    /** Dibujo de la camiseta (rayas, aros, banda…) dentro de la silueta ya trazada. */
    _kitPattern(k, x, y, r) {
      if (!k.p || k.c2 === k.c1) return;
      const c = this.cx, R2 = r * 2;
      c.fillStyle = k.c2;
      switch (k.p) {
        case 's': for (const o of [-0.72, 0, 0.72]) c.fillRect(x + (o - 0.18) * r, y - R2, 0.36 * r, 2 * R2); break;
        case 'h': for (const o of [-0.62, 0.12]) c.fillRect(x - R2, y + o * r, 2 * R2, 0.34 * r); break;
        case 'c': c.fillRect(x - 0.22 * r, y - R2, 0.44 * r, 2 * R2); break;
        case 'v': c.fillRect(x, y - R2, R2, 2 * R2); break;
        case 'x': c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); c.fillRect(-R2, -0.24 * r, 2 * R2, 0.48 * r); c.restore(); break;
        case 'k': {
          const q = r * 0.5;
          for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) if ((i + j) & 1) c.fillRect(x + i * q, y + j * q, q, q);
          break;
        }
      }
    }

    _numbers() {
      for (const t of this.m.teams) {
        const taken = new Set(t.onPitch.concat(t.bench.map(pid => ({ pid }))).map(o => this.num[o.pid]).filter(Boolean));
        let n = 2;
        for (const o of t.onPitch) {
          if (this.num[o.pid]) continue;
          if (o.slot === 'GK' && !taken.has(1)) { this.num[o.pid] = 1; taken.add(1); continue; }
          while (taken.has(n)) n++;
          this.num[o.pid] = n; taken.add(n);
        }
        let k = 12;
        for (const pid of t.bench) { if (this.num[pid]) continue; while (taken.has(k)) k++; this.num[pid] = k; taken.add(k); }
      }
    }

    /** Cada estadio es distinto: colores de la grada, dibujo del césped, de día o de noche. */
    _stadium() {
      const home = this.S.clubs[this.m.teams[0].club], away = this.S.clubs[this.m.teams[1].club];
      let h = 7;
      for (const ch of String(home.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const patterns = ['v', 'h', 'check', 'diag', 'wide', 'v'];
      const grass = [['#1b5a34', '#1f683b'], ['#1d5f2e', '#24723a'], ['#185338', '#1e6343'], ['#205a2b', '#296d34'], ['#1a5a3d', '#1f6a47']];
      return {
        pattern: patterns[h % patterns.length], grass: grass[(h >>> 5) % grass.length],
        seat: home.c1 || '#2fbf71', seat2: home.c2 || '#ffffff', away: (this.colors && this.colors[1].main) || away.c1 || '#ffffff',
        code: (home.code || home.name.slice(0, 3)).toUpperCase(), name: home.stadium || '',
        night: (this.S.week * 7 + home.id) % 3 === 0,
        time: (this.S.week * 7 + home.id) % 3 === 0 ? 'noche' : (this.S.week * 5 + home.id) % 3 === 0 ? 'tarde' : 'dia',
        weather: this.m.weather || weatherFor(this.S, home, h)
      };
    }

    _crowd() {
      const out = [];
      const st = this.st;
      const neutral = ['#c9d3cf', '#9aa8a2', '#6c7a74', '#e6e0d0'];
      for (let k = 0; k < 560; k++) {
        const top = k % 2 === 0;
        const x = U.rand(VIEW.x0, VIEW.x1), y = top ? U.rand(VIEW.y0, VIEW.y0 + 1.8) : U.rand(Wd + 2.6, VIEW.y1);
        // Esquina de la afición visitante; el resto, camisetas del local
        const awayZone = !top && x > L * 0.84;
        const r = Math.random();
        const c = awayZone ? (r < 0.75 ? st.away : U.pick(neutral)) : r < 0.45 ? st.seat : r < 0.62 ? st.seat2 : U.pick(neutral);
        out.push({ x, y, c, p: Math.random() * 6 });
      }
      return out;
    }

    /** Césped del estadio pintado una vez (10 px por metro) y reutilizado en cada fotograma. */
    _grass() {
      if (this._grassCv) return this._grassCv;
      const k = 8, cv = document.createElement('canvas');
      cv.width = L * k; cv.height = Wd * k;
      const g = cv.getContext('2d');
      const [a, b] = this.st.grass;
      g.fillStyle = a; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = b;
      const p = this.st.pattern;
      if (p === 'v' || p === 'wide') { const n = p === 'wide' ? 8 : 14; for (let i = 1; i < n; i += 2) g.fillRect(i * cv.width / n, 0, cv.width / n + 1, cv.height); }
      else if (p === 'h') { for (let i = 1; i < 10; i += 2) g.fillRect(0, i * cv.height / 10, cv.width, cv.height / 10 + 1); }
      else if (p === 'check') { const cw = cv.width / 14, ch = cv.height / 8; for (let i = 0; i < 14; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) g.fillRect(i * cw, j * ch, cw + 1, ch + 1); }
      else if (p === 'diag') {
        g.save(); g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.clip();
        g.translate(cv.width / 2, cv.height / 2); g.rotate(Math.PI / 4);
        const w = 7 * k;
        for (let x = -cv.width; x < cv.width; x += w * 2) g.fillRect(x, -cv.width, w, cv.width * 2);
        g.restore();
      }
      // Un poco de textura
      g.globalAlpha = 0.05;
      for (let i = 0; i < 1400; i++) { g.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; g.fillRect(Math.random() * cv.width, Math.random() * cv.height, 2, 2); }
      g.globalAlpha = 1;
      this._grassCv = cv;
      return cv;
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.max(10, r.width * dpr);
      this.cv.height = Math.max(10, r.height * dpr);
      this.dpr = dpr;
      this.w = r.width; this.h = r.height;
      this.sc = Math.min(this.w / (VIEW.x1 - VIEW.x0), this.h / (VIEW.y1 - VIEW.y0));
    }

    // ------------------------------------------------------------ Utilidades
    P(pid) { return this.S.players[pid]; }
    team(i) { const out = []; for (const id in this.A) if (this.A[id].team === i) out.push(this.A[id]); return out; }
    slotOf(a) { const o = this.m.teams[a.team].onPitch.find(x => x.pid === a.pid); return o ? o.slot : a.slot || 'CM'; }
    isGK(a) { return this.slotOf(a) === 'GK'; }
    gkOf(i) { return this.team(i).find(a => this.isGK(a)) || null; }
    goalX(i) { return this.dir[i] > 0 ? L : 0; }     // portería a la que ataca i
    ownX(i) { return this.dir[i] > 0 ? 0 : L; }
    depth(i, x) { return this.dir[i] > 0 ? x : L - x; }
    lat(i, y) { return this.dir[i] > 0 ? y : Wd - y; }
    world(i, depth, lat) { return this.dir[i] > 0 ? [depth, lat] : [L - depth, Wd - lat]; }
    energy(a) {
      if (a.pid == null) return 1;
      // La misma energía que usa el motor: los cansados se mueven más despacio
      const e = (this.m.energy ? this.m.energy(a.pid) : this.P(a.pid).fit) / 100;
      return clamp(this.m.teams[a.team].onPitch.find(o => o.pid === a.pid && o.hurt) ? e - 0.3 : e, 0.3, 1);
    }
    nearest(list, pt, skip) {
      let best = null, bd = 1e9;
      for (const a of list) { if (skip && skip(a)) continue; const d = d2(a, pt); if (d < bd) { bd = d; best = a; } }
      return best;
    }
    rate() { return Math.pow(this.speed, 0.62) * this.slow; }

    _spawn(i, pid, x, y) {
      const p = this.P(pid);
      const a = actor('pl', x != null ? x : L / 2, y != null ? y : Wd / 2, { team: i, pid, pace: 0.82 + 0.18 * (p.st[0] || 60) / 99 });
      this.A[pid] = a;
      return a;
    }

    /** Mantiene los puntitos al día con los que de verdad están en el campo.
     *  instant: tras un salto de tiempo el cambio ya pasó hace rato, así que nadie entra
     *  ni sale andando: los que se fueron desaparecen y los nuevos aparecen en su puesto. */
    _sync(instant) {
      const on = new Set();
      this.m.teams.forEach((t, i) => t.onPitch.forEach(o => {
        on.add(o.pid);
        if (!this.A[o.pid]) {
          // Entra desde la banda, junto al cuarto árbitro
          const a = this._spawn(i, o.pid, L / 2 + (i === 0 ? -1.5 : 1.5), -0.6);
          a.run = 0.6;
          if (instant) { const h = this._home(a); a.x = h[0]; a.y = h[1]; }
          this._numbers();
        }
      }));
      if (instant) this.leaving = [];
      for (const id in this.A) {
        if (on.has(+id) || this.keep.has(+id)) continue;
        const a = this.A[id];
        delete this.A[id];
        if (this.ball.owner === +id) this.ball.owner = null;
        if (instant) continue;
        a.leave = true; a.state = a.state === 'down' ? 'down' : 'walk';
        // Expulsado: al túnel. Cambiado o lesionado: por el punto más cercano de la banda (como manda el reglamento)
        if (a.red) { a.tx = TUNNEL.x; a.ty = TUNNEL.y; }
        else { a.tx = clamp(a.x, 1, L - 1); a.ty = a.y < Wd / 2 ? -0.8 : Wd + 0.8; }
        this.leaving.push(a);
      }
    }

    // ------------------------------------------------------------ Dibujo del equipo
    /** Altura, anchura y compacidad del bloque según el balón, la fase y la mentalidad. */
    _shape(i) {
      const t = this.m.teams[i];
      const att = this.poss === i;
      const bd = this.depth(i, this.ball.x);
      const ment = t.mentality, desp = t.desperate;
      let line, span;
      if (att) { line = clamp(bd * 0.48 + 6 + ment * 4, 15, 50); span = clamp(34 + bd * 0.2, 36, 54); }
      else { line = clamp(bd * 0.42 + 3 + ment * 3, 9, 38); span = clamp(25 + ment * 2, 23, 31); }
      if (desp) { line += att ? 10 : 5; span += 4; }
      const gkMax = desp && this.m.min >= 89 ? 24 : 16;
      const gk = clamp(att ? 4 + bd * 0.12 : 2.2 + bd * 0.04, 1.4, gkMax);
      return { line, span, width: att ? 1.05 : 0.7, shift: att ? 0 : (this.lat(i, this.ball.y) - Wd / 2) * 0.42, gk };
    }

    /** Posición de referencia de un jugador según su puesto en la formación. */
    _home(a, kickoff) {
      const i = a.team, t = this.m.teams[i];
      const o = t.onPitch.find(x => x.pid === a.pid);
      const Fm = TL.Engine.FORMATIONS[t.formation];
      const s = (o && o.idx != null && Fm[o.idx] && Fm[o.idx][0] === o.slot && Fm[o.idx]) || Fm.find(z => z[0] === (o ? o.slot : 'CM')) || ['CM', 50, 50];
      const [slot, sx, sy] = s;
      const sh = kickoff ? { line: 12, span: 30, width: 0.9, shift: 0, gk: 3 } : this._shape(i);
      let depth = slot === 'GK' ? sh.gk : sh.line + (sy - 18) / 66 * sh.span;
      let lat = Wd / 2 + (sx - 50) / 50 * (Wd / 2 - 4) * sh.width + sh.shift;
      if (kickoff) depth = Math.min(depth, L / 2 - 1.5);
      return this.world(i, clamp(depth, 0.8, L - 1), clamp(lat, 1.5, Wd - 1.5));
    }

    /** Objetivos de cada jugador en juego abierto: bloque, presión, marcas y desmarques. */
    /** Segundos que tarda en llegar a un punto (con su velocidad y el retraso con que reacciona). */
    _reach(a, p) { return Math.hypot(a.x - p.x, a.y - p.y) / (6.2 * (a.pace || 1)) + (a.react || 0.25); }
    /** Línea del fuera de juego para quien ataca hacia `dir`: la penúltima del rival (o el balón), nunca en su propio campo. */
    _offsideLine(att) {
      const dir = this.dir[att], def = 1 - att;
      const xs = this.team(def).map(a => a.x * dir).sort((p, q) => q - p);
      const second = xs.length > 1 ? xs[1] : xs[0] || L / 2 * dir;
      const half = (L / 2) * dir;                       // en su campo no hay fuera de juego
      return Math.max(second, this.ball.x * dir, half) / dir;
    }
    _targets() {
      let dtT = this.t - (this._tt == null ? this.t : this._tt); this._tt = this.t; dtT = isFinite(dtT) ? clamp(dtT, 0, 0.2) : 0;
      // Juego abierto: lo decide el cerebro táctico (fases, estructura, presión, apoyos, desmarques)
      if (!this.ov || !this.ov.all) this.brain.targets(this.instant ? 1 : dtT);
      for (const id in this.A) { const a = this.A[id]; a.tx = clamp(a.tx, 0.6, L - 0.6); a.ty = clamp(a.ty, 0.6, Wd - 0.6); }
      // Guion: posiciones forzadas (balón parado, celebraciones…)
      if (this.ov) {
        for (const id in this.ov.p || {}) {
          const a = this.A[id]; if (!a) continue;
          const o = this.ov.p[id];
          let x = typeof o.x === 'function' ? o.x() : o.x, y = typeof o.y === 'function' ? o.y() : o.y;
          if (o.jit) { x += Math.sin(this.t * 7 + a.pid) * o.jit; y += Math.cos(this.t * 6 + a.pid * 2) * o.jit; }
          a.tx = x; a.ty = y; a.run = o.run != null ? o.run : 0.6;
        }
        if (this.ov.all) for (const id in this.A) if (!this.ov.p || !this.ov.p[id]) { if (this.ov.all === 'stay') { this.A[id].tx = this.A[id].x; this.A[id].ty = this.A[id].y; this.A[id].run = 0.2; } }
      }
    }

    _officials() {
      const b = this.ball;
      if (!this.refOv) {
        // Diagonal: el árbitro sigue la jugada a 12-18 m, por el lado contrario a su juez de línea
        const side = b.x < L / 2 ? 1 : -1;
        this.ref.tx = clamp(b.x - side * 9, 4, L - 4);
        this.ref.ty = clamp(b.y + side * 9, 3, Wd - 3);
        this.ref.run = 0.55;
      } else { this.ref.tx = this.refOv.x; this.ref.ty = this.refOv.y; this.ref.run = this.refOv.run || 0.8; }
      // Jueces de línea: a la altura del penúltimo defensor de su mitad
      for (const [k, ar] of this.ars.entries()) {
        const half = k === 0 ? [0, L / 2] : [L / 2, L];
        const owner = this.dir[0] > 0 ? (k === 0 ? 0 : 1) : (k === 0 ? 1 : 0); // equipo que defiende esa portería
        const xs = this.team(owner).map(a => a.x).sort((p, q) => (k === 0 ? p - q : q - p));
        let line = xs.length > 1 ? xs[1] : half[k === 0 ? 0 : 1];
        if (k === 0) line = Math.min(line, b.x); else line = Math.max(line, b.x);
        ar.tx = clamp(line, half[0] + 1, half[1] - 1); ar.run = 0.7;
      }
      // Entrenadores en su área técnica
      this.coaches.forEach((c, i) => {
        if (c.state === 'jump' || c.state === 'sad' || c.state === 'wave' || c.goTo) { if (c.goTo) { c.tx = c.goTo.x; c.ty = c.goTo.y; } return; }
        const attacking = this.poss === i && this.depth(i, b.x) > L * 0.66;
        c.tx = c.base + Math.sin(this.t * 0.25 + i * 3) * 3; c.ty = attacking ? TECH_Y + 1.3 : TECH_Y; c.run = attacking ? 0.5 : 0.18;
      });
      // Suplentes calentando en la segunda parte
      this.warm.forEach((ws, i) => ws.forEach(w => {
        const goal = this.ownX(i) === 0 ? 0 : L;
        const base = goal === 0 ? 5 : L - 5;
        w.tx = base + (goal === 0 ? 1 : -1) * (3 + Math.sin(this.t * 0.4 + w.k * 2) * 3); w.ty = -1.8 - w.k * 0.9; w.run = 0.3;
      }));
    }

    _move(a, dt) {
      if (!(dt > 0)) return;
      if (a.state === 'down' || a.state === 'sit') { a.vx *= 0.8; a.vy *= 0.8; if (a.until && a.until < this.t) a.state = null; return; }
      if (a.until && a.until < this.t && a.state !== 'walk') a.state = null;
      const e = a.kind === 'pl' ? this.energy(a) : 1;
      // Punta de velocidad real (fútbol femenino: unos 7 m/s las más rápidas), menos con el cansancio
      const top = a.kind === 'pl' ? 6.2 * a.pace * (0.6 + 0.4 * e) : a.kind === 'ref' ? 6 : a.kind === 'ar' ? 5.5 : 4.5;
      const speed = a.state === 'walk' || a.state === 'sad' ? Math.min(a.leave ? 2.6 : 1.6, top) : top * (a.run || 0.5);
      // Cada jugadora tiene su físico: reacción, arrancada, frenada y giro (datos de tracking reales, escalados)
      if (a.react == null) {
        const r = (a.pid || 7) * 0.618 % 1;
        a.react = 0.18 + r * 0.22; a.acc = 3.4 + ((r * 7.3) % 1) * 2.2; a.dec = 4.2 + ((r * 3.1) % 1) * 2.6; a.reT = 0; a.jx = 0; a.jy = 0;
      }
      // Tiempo de reacción: el destino que «ve» se actualiza cada poco, no al instante
      if (a.kind === 'pl' && a.state !== 'walk') {
        a.reT -= dt;
        if (a.sx == null || a.reT <= 0 || Math.hypot(a.tx - a.sx, a.ty - a.sy) > 25) { a.sx = a.tx; a.sy = a.ty; a.reT = a.react * (a.run > 0.8 ? 0.6 : 1) * (0.8 + Math.random() * 0.4); }
      } else { a.sx = a.tx; a.sy = a.ty; }
      // Pequeños ajustes cuando está casi en su sitio: nadie se queda clavado
      let gx = a.sx, gy = a.sy;
      if (a.kind === 'pl') {
        if (Math.random() < dt * 0.7) { a.jx = U.rand(-0.9, 0.9); a.jy = U.rand(-0.9, 0.9); }
        if (Math.hypot(gx - a.x, gy - a.y) < 2.5) { gx += a.jx; gy += a.jy; }
      }
      const dx = gx - a.x, dy = gy - a.y, d = Math.hypot(dx, dy);
      // Llega frenando: la velocidad que quiere depende de lo que le falta y de cómo frena
      const want = Math.min(speed, Math.sqrt(2 * (a.dec || 5) * Math.max(0, d - 0.3)));
      const ux = d > 0.01 ? dx / d : 0, uy = d > 0.01 ? dy / d : 0;
      let dvx = ux * want - a.vx, dvy = uy * want - a.vy;
      const dv = Math.hypot(dvx, dvy), cur = Math.hypot(a.vx, a.vy);
      // Aceleración y frenada limitadas; girar a toda velocidad cuesta más
      const turning = cur > 0.5 ? 1 - Math.max(0, (a.vx * ux + a.vy * uy) / cur) : 0;
      const lim = (want < cur ? (a.dec || 5) : (a.acc || 4)) * (1 - 0.45 * turning * clamp(cur / 6, 0, 1)) * dt;
      if (dv > lim) { dvx *= lim / dv; dvy *= lim / dv; }
      a.vx += dvx; a.vy += dvy;
      a.x += a.vx * dt; a.y += a.vy * dt;
    }
    _separate() {
      const all = Object.values(this.A);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy;
        if (dd > 1.6 || dd < 1e-6) continue;
        const d = Math.sqrt(dd), push = (1.26 - d) * 0.25;
        if (push <= 0) continue;
        a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push;
      }
    }

    // ------------------------------------------------------------ Balón
    /** Lanza el balón: trayectoria con altura (h = altura máxima sobre la línea recta). */
    /** Jugador pegado al balón (o null). */
    _atBall(r) {
      const b = this.ball;
      r = r || 1.6;
      for (const id in this.A) { const a = this.A[id]; if (Math.hypot(a.x - b.x, a.y - b.y) < r) return a; }
      return null;
    }
    /** Un jugador va a por el balón parado; cuando llega, es suyo (y entonces, si hace falta, chuta). */
    _fetch(pid, then) {
      const a = this.A[pid], b = this.ball;
      b.owner = null; b.path = null; b.roll = null;
      this.fetch = { pid, t0: this.t, then, held: !!(a && a.held) };
      if (a) a.held = false;
    }
    _fetchStep() {
      const f = this.fetch, a = this.A[f.pid], b = this.ball;
      if (!a) { this.fetch = null; return; }
      a.tx = b.x - this.dir[a.team] * 0.5; a.ty = b.y; a.run = 1;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const late = this.t - f.t0 > 6;
      if (d < 1.1 || late) {
        if (d >= 1.1) { this.fetch = null; this._kick(a.x, a.y, { free: true, h: 0.2, to: a.pid, sfx: false, done: f.then ? () => { this._receive(a.pid, true); f.then(); } : null }); return; }
        this.fetch = null;
        a.held = f.held;
        b.owner = a.pid; b.z = 0; this.poss = a.team;
        this.brain.received(a, true);
        if (f.then) f.then();
      }
    }

    _kick(tx, ty, o) {
      o = o || {};
      const b = this.ball;
      // Un balón parado no sale disparado solo: antes llega alguien a golpearlo
      if (!o.free && !b.path && !this._atBall()) {
        const team = o.team != null ? o.team : this.poss;
        const cand = this.team(team);
        const k = (o.by != null && this.A[o.by]) || this.nearest(cand.length ? cand : Object.values(this.A), b);
        if (k) { this._fetch(k.pid, () => this._kick(tx, ty, Object.assign({}, o, { free: true }))); return; }
      }
      const kicker = b.owner != null ? this.A[b.owner] : this._atBall(2);
      if (kicker) { this.brain.kickTeam = kicker.team; this.brain.lastTouch = kicker.team; }
      const dist = Math.hypot(tx - b.x, ty - b.y);
      const T = o.T || (o.h > 1.5 ? 0.6 + dist / 26 : 0.12 + dist / 17);
      const nx = -(ty - b.y) / Math.max(0.1, dist), ny = (tx - b.x) / Math.max(0.1, dist);
      b.owner = null; b.roll = null;
      b.path = { fx: b.x, fy: b.y, fz: o.fz != null ? o.fz : b.z, tx, ty, tz: o.tz || 0, h: o.h || 0, T, t: 0, to: o.to != null ? o.to : null, curve: o.curve || 0, nx, ny, ease: o.ease, done: o.done };
      if (o.sfx !== false && TL.SFX && !this.instant) TL.SFX.kick();
    }

    _ballUpdate(dt) {
      const b = this.ball;
      if (b.path) {
        const p = b.path;
        p.t += dt;
        const u = Math.min(1, p.t / p.T);
        const ue = p.ease === 'out' ? 1 - (1 - u) * (1 - u) : u;
        const bend = p.curve * Math.sin(Math.PI * u);
        b.x = lerp(p.fx, p.tx, ue) + bend * p.nx;
        b.y = lerp(p.fy, p.ty, ue) + bend * p.ny;
        b.z = Math.max(0, lerp(p.fz, p.tz, u) + 4 * p.h * u * (1 - u));
        if (u >= 1) {
          b.path = null;
          const r = p.to != null ? this.A[p.to] : null;
          if (p.done) p.done();
          else if (r && !this.beat && !this.script.length && Math.hypot(r.x - b.x, r.y - b.y) > 2.2) {
            // En juego abierto, si la receptora no ha llegado, el balón sigue su camino perdiendo fuerza
            const dl = Math.max(0.1, Math.hypot(p.tx - p.fx, p.ty - p.fy)), v = Math.min(7, dl / p.T * 0.4);
            b.z = 0; b.roll = { vx: (p.tx - p.fx) / dl * v, vy: (p.ty - p.fy) / dl * v };
          }
          else if (r) this._receive(p.to);
          else if (b.z > 0.2 && !b.owner) b.z = 0;
        }
      } else if (b.owner != null) {
        const a = this.A[b.owner];
        if (!a) b.owner = null;
        else {
          const sp = Math.hypot(a.vx, a.vy);
          const fx = sp > 0.3 ? a.vx / sp : this.dir[a.team], fy = sp > 0.3 ? a.vy / sp : 0;
          const hold = a.held;
          const tx = a.x + fx * (hold ? 0 : 0.75), ty = a.y + fy * (hold ? 0 : 0.75);
          const ddx = tx - b.x, ddy = ty - b.y, dd = Math.hypot(ddx, ddy), mx = 22 * dt;
          if (dd > mx) { b.x += ddx / dd * mx; b.y += ddy / dd * mx; } else { b.x = tx; b.y = ty; }
          b.z = hold ? 1.6 : Math.max(0, b.z - dt * 6);
        }
      } else if (b.roll) {
        b.x += b.roll.vx * dt; b.y += b.roll.vy * dt;
        b.roll.vx *= 1 - dt * 1.6; b.roll.vy *= 1 - dt * 1.6;
        b.z = Math.max(0, b.z - dt * 4);
        if (Math.hypot(b.roll.vx, b.roll.vy) < 0.4) b.roll = null;
      }
      // Estela del balón cuando va rápido
      b.trail.push([b.x, b.y, b.z]);
      if (b.trail.length > 7) b.trail.shift();
    }

    _receive(pid, force) {
      const a = this.A[pid];
      if (!a) return;
      const b = this.ball;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (!force && d > 2.2 && b.owner !== pid) {
        // Lejos del balón: es él quien va a buscarlo (ni teletransportes ni balones que ruedan solos)
        if (b.path) return; // aún viaja: lo recibirá al llegar
        this._fetch(pid, null);
        this.poss = a.team;
        return;
      }
      b.owner = pid;
      b.z = 0;
      this.poss = a.team;
      this.brain.received(a, force);
    }

    // ------------------------------------------------------------ Juego abierto
    _openPlay(dt) {
      if (this.hold || this.over) return;
      this.brain.tick(dt);
    }

    /** Disputa de un balón dividido o aéreo: se lo queda el más cercano. */
    /**
     * Balón parado, como en un partido de verdad: si el balón está volando, primero cae; después una jugadora
     * del equipo que saca va a por él y lo lleva al punto (o, si está lejos, se lo pasa a la que va a sacar,
     * que lo coloca). La jugada no sigue hasta que el balón está en su sitio.
     */
    _placeBall(x, y, maxT, to, team) {
      const b = this.ball;
      if (this.instant || Math.hypot(x - b.x, y - b.y) < 1) {
        b.path = null; b.roll = null; b.x = x; b.y = y; b.z = 0; b.owner = to != null && this.A[to] ? to : null;
        return;
      }
      const tk = to != null && this.A[to] ? this.A[to] : null;
      if (team == null) team = tk ? tk.team : this.poss;
      this.place = { x, y, to: tk ? tk.pid : null, team, phase: b.path ? 'land' : 'fetch', t0: this.t, rid: null };
      b.owner = null; b.roll = null;
    }
    _placeStep() {
      const P = this.place, b = this.ball;
      const done = () => {
        b.path = null; b.roll = null; b.x = P.x; b.y = P.y; b.z = 0;
        b.owner = P.to != null && this.A[P.to] ? P.to : null;
        this.place = null;
      };
      if (this.instant || this.t - P.t0 > 12) { done(); return; }   // saltos de tiempo, o seguro para no atascarse
      if (P.phase === 'land') { if (!b.path) P.phase = 'fetch'; else return; }
      if (P.phase === 'fetch') {
        if (P.rid == null || !this.A[P.rid]) {
          // va a por él la más cercana del equipo que saca (la que saca, si está cerca)
          const tk = P.to != null ? this.A[P.to] : null;
          const cands = this.team(P.team).filter(a => !this.isGK(a) || a.pid === P.to);
          const near = cands.sort((p, q) => d2(p, b) - d2(q, b))[0];
          P.rid = tk && Math.sqrt(d2(tk, b)) < 15 ? tk.pid : near ? near.pid : null;
          if (P.rid == null) { done(); return; }
        }
        const r = this.A[P.rid];
        r.tx = b.x; r.ty = b.y; r.run = 0.95;
        if (Math.hypot(r.x - b.x, r.y - b.y) < 1.1) {
          b.owner = r.pid; b.z = 0;
          const far = Math.hypot(P.x - b.x, P.y - b.y) > 14;
          const recv = P.to != null && P.to !== r.pid && this.A[P.to] ? P.to : null;
          P.phase = far && recv != null ? 'pass' : 'carry';
        }
        return;
      }
      if (P.phase === 'pass') {
        const recv = this.A[P.to];
        if (!recv) { P.phase = 'carry'; return; }
        recv.tx = P.x; recv.ty = P.y; recv.run = 0.7;
        if (Math.hypot(recv.x - P.x, recv.y - P.y) < 4) {
          b.owner = null;
          const d = Math.hypot(recv.x - b.x, recv.y - b.y);
          b.path = { fx: b.x, fy: b.y, fz: 0, tx: recv.x, ty: recv.y, tz: 0, h: Math.min(2.5, d * 0.06), T: clamp(d / 15, 0.4, 1.6), t: 0, to: recv.pid, curve: 0, nx: 0, ny: 0 };
          if (TL.SFX && !this.instant) TL.SFX.kick();
          P.phase = 'passing'; P.rid = recv.pid;
        }
        return;
      }
      if (P.phase === 'passing') { if (!b.path) { b.owner = P.rid; P.phase = 'carry'; } return; }
      if (P.phase === 'carry') {
        const r = this.A[P.rid];
        if (!r) { done(); return; }
        b.owner = r.pid;
        r.tx = P.x - this.dir[r.team] * 0.4; r.ty = P.y; r.run = 0.8;
        if (Math.hypot(r.x - P.x, r.y - P.y) < 1.2) {
          // la deja en el punto; si no es ella quien saca, se aparta
          if (P.to != null && P.to !== r.pid && this.A[P.to]) { r.tx = r.x - this.dir[r.team] * 4; }
          done();
        }
      }
    }
    _contest() {
      const b = this.ball;
      const n = this.nearest(Object.values(this.A), b);
      b.z = 0;
      if (n && d2(n, b) < 9) { this._receive(n.pid); if (b.z > 1) n.jump = this.t; }
      // si no hay nadie cerca, se queda ahí y va el más cercano
    }

    /** Saque de banda donde salió el balón: lo saca el equipo que no la tocó (la que esté más cerca va a por él). */
    _throwInAt(i, x, top) {
      const b = this.ball;
      const y = top ? -0.3 : Wd + 0.3;
      const taker = this.nearest(this.team(i).filter(a => !this.isGK(a)), { x, y });
      if (!taker) return;
      this.poss = i;
      this.brain.restartBy(i, 'throw');
      this._seq([
        { d: 0.9, start: () => { b.path = null; b.roll = null; this.ov = { p: { [taker.pid]: { x, y, run: 0.9 } } }; this._placeBall(x, y, 1, taker.pid, i); } },
        { d: 0.5, start: () => { taker.held = true; b.owner = taker.pid; b.x = x; b.y = y; } },
        { d: 0.45, start: () => {
          taker.held = false; this.ov = null;
          const mate = this.brain.throwTarget(taker) || this.nearest(this.team(i).filter(a => a !== taker && !this.isGK(a)), { x: x + this.dir[i] * 6, y: top ? 8 : Wd - 8 });
          if (mate) { this._kick(mate.x + mate.vx * 0.3, mate.y + mate.vy * 0.3, { h: 1.6, T: 0.6, to: mate.pid, sfx: false, free: true }); this.brain.say('pass', { team: i, p: taker.pid, q: mate.pid, type: 'throw' }); }
        } }
      ]);
    }

    _goalKick(i) {
      const gk = this.gkOf(i);
      if (!gk) return [];
      const [x, y] = this.world(i, 5.5, Wd / 2 + (Math.random() < 0.5 ? -6 : 6));
      return [
        { d: 0.5, start: () => { this._placeBall(x, y, 1.1, gk.pid, i); this.poss = i; this.ov = { p: { [gk.pid]: { x: x - this.dir[i] * 1.2, y, run: 0.6 } } }; this.brain.restartBy(i, 'gk'); } },
        { d: 0.3, start: () => { this.ov = null; if (this.A[gk.pid]) { this.ball.owner = gk.pid; this.poss = i; } this.brain.ownTeam = i; this.brain.next = this.t + 0.5; } }
      ];
    }

    _kickTaker(i) {
      const fw = this.team(i).filter(a => F.LINE[this.slotOf(a)] >= 2).sort((p, q) => Math.abs(p.y - Wd / 2) - Math.abs(q.y - Wd / 2));
      return fw.length ? fw[0].pid : null;
    }

    _placeKickoff(i, teleport) {
      const b = this.ball;
      b.x = L / 2; b.y = Wd / 2; b.z = 0; b.path = null; b.roll = null; b.owner = null;
      this.poss = i;
      const p = {};
      const taker = this._kickTaker(i);
      for (const id in this.A) {
        const a = this.A[id];
        let [x, y] = this._home(a, true);
        if (+id === taker) { x = L / 2 - this.dir[i] * 0.6; y = Wd / 2; }
        p[id] = { x, y, run: 0.55 };
        if (teleport) { a.x = x; a.y = y; }
      }
      return { p, taker };
    }

    _kickoffSeq(i) {
      let taker = null;
      return [
        { d: 1.6, start: () => { const k = this._placeKickoff(i, false); taker = k.taker; this.ov = { p: k.p }; this.refOv = { x: L / 2 - 6, y: Wd / 2 + 10, run: 0.5 }; this._clearStates(); this._cut(0.85); } },
        { d: 0.05, waitHold: true },
        { d: 0.4, start: () => { this.ov = null; this.refOv = null; TL.SFX && !this.instant && TL.SFX.whistle(false); if (taker != null && this.A[taker]) this._receive(taker); } }
      ];
    }

    /** Corte de realización: como en la tele, la jugada a balón parado ya está colocada. */
    _cut(k) {
      this._targets();
      this._officials();
      const mv = a => { a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.vx = a.vy = 0; };
      for (const id in this.A) mv(this.A[id]);
      mv(this.ref); this.ars.forEach(mv);
      this.cutAt = this.t;
    }

    /** Corte de realización a una jugada: la poseedora aparece con el balón en la zona y el resto se recoloca (con destello). */
    _cutTo(i, d, l, pid) {
      const [x, y] = this.world(i, clamp(d, 2, L - 2), clamp(l, 2, Wd - 2));
      const a = (pid != null && this.A[pid] && !this.isGK(this.A[pid])) ? this.A[pid] : this.nearest(this.team(i).filter(p => !this.isGK(p)), { x, y });
      if (!a) return false;
      a.x = x; a.y = y; a.vx = a.vy = 0;
      const b = this.ball;
      b.path = null; b.roll = null; b.owner = a.pid; b.x = x + this.dir[i] * 0.5; b.y = y; b.z = 0;
      this.poss = i; this.fetch = null; this.place = null;
      this.brain.afterScript(); this.brain.ownTeam = i; this.brain.lastTouch = i;
      this._cut(0.92);
      return true;
    }

    _clearStates() {
      for (const id in this.A) { const a = this.A[id]; if (a.state !== 'down') a.state = null; a.held = false; }
      this.coaches.forEach(c => { c.state = null; c.goTo = null; });
      this.fx = this.fx.filter(f => f.keep);
    }

    // ------------------------------------------------------------ Guion
    _seq(beats) { for (const b of beats) if (b) this.script.push(b); }

    _runScript(dt) {
      if (!this.beat) {
        if (!this.script.length) return false;
        this.beat = this.script.shift();
        this.beat.t = 0;
        if (this.beat.start) this.beat.start();
        if (this.beat.slow) this.slowT = this.beat.slow;
      }
      const bt = this.beat;
      if (bt.waitHold && this.hold) return true;
      if (this.fetch) return true; // esperamos a que el jugador llegue al balón
      if (this.place) return true; // y a que el balón esté en su sitio para el balón parado
      bt.t += dt;
      if (bt.tick) bt.tick(dt, bt.t);
      const waitBall = bt.ball && this.ball.path;
      if (!waitBall && bt.t >= (bt.d || 0)) {
        if (bt.end) bt.end();
        if (bt.slow) this.slowT = 1;
        this.beat = null;
        if (!this.script.length) this._afterScript();
      }
      return true;
    }
    /** Acaba una escena: lo que quedara por contar se cuenta y el juego sigue desde donde quedó. */
    _afterScript() {
      if (!this.over && this.ov && !this.ov.keep) this.ov = null;
      this.brain.afterScript();
      if (!this.queue.length) this._revealAll();
    }
    /** El narrador cuenta un evento del motor justo cuando se ve en el campo. */
    _reveal(e) {
      if (!e || e._shown) return;
      e._shown = true;
      const k = this.handled.indexOf(e);
      if (k >= 0) this.handled.splice(k, 1);
      if (this.onEv) this.onEv(e);
    }
    _revealAll() { for (const e of this.handled.slice()) this._reveal(e); this.handled = []; }

    _banner(text, color, secs, big) { text = TL.t ? TL.t(text) : text; this.banner = { text, color: color || '#fff', until: this.t + (secs || 1.4), born: this.t, big: !!big }; }
    _focus(x, y, z) { this.cam.tx = x; this.cam.ty = y; this.cam.tz = z || 1.6; }
    _unfocus() { this.cam.tx = null; this.cam.ty = null; this.cam.tz = 1; }
    _icon(pid, icon, secs, color) { this.fx.push({ pid, icon, color, until: this.t + secs }); }
    _sparkStand(team) {
      const top = team === 0;
      for (let k = 0; k < 40; k++) this.sparks.push({ x: U.rand(VIEW.x0, VIEW.x1), y: top ? U.rand(VIEW.y0, VIEW.y0 + 1.8) : U.rand(Wd + 2.6, VIEW.y1), until: this.t + U.rand(0.2, 1.4) });
    }

    // ------------------------------------------------------------ Eventos del motor
    /** ¿Se ha visto suficiente juego para que avance el reloj? (segundos de campo por minuto, según la velocidad) */
    ready() {
      const per = { 1: 2.4, 2: 1.7, 4: 1.2, 8: 0.85, 16: 0.55 }[this.speed] || 1.2;
      return this.t - this.stepT >= per;
    }
    /** ¿Este evento se ve en el campo (y se cuenta cuando pasa)? */
    stages(e) { return KEY_EVENTS.includes(e.type); }
    push(evs, instant) {
      this.stepT = this.t;
      for (const e of evs) {
        if (!KEY_EVENTS.includes(e.type)) continue;
        // Falta sin tarjeta ni texto: la comete quien llegue al choque en el juego (el reloj no se para)
        if (e.type === 'foul' && !e.text && !instant) { this.handled.push(e); this._reveal(e); this.brain.foulLater(e); continue; }
        this.queue.push(e);
        // El motor ya los ha quitado del campo: siguen en pantalla hasta que se vea la jugada
        if (e.type === 'red' || e.type === 'inj') this.keep.add(e.pid);
        if (e.type === 'sub') this.keep.add(e.pid2);
      }
      if (instant) this.flush();
    }

    /** Aplica al instante lo pendiente (saltos de tiempo): solo cambia el estado. */
    flush() {
      this.instant = true;
      // Lo que se estaba escenificando ya no vale: el reloj ha saltado
      this.script = []; this.beat = null; this.ov = null; this.refOv = null; this.slow = this.slowT = 1; this.fetch = null; this.place = null;
      this.brain.ag = null;
      for (const e of this.queue) this.handled.push(e);
      this._revealAll();
      this.keep.clear();
      this._clearStates();
      this._unfocus();
      this._sync(true);
      let placed = false;
      // Si el descanso se estaba escenificando, el cambio de campo no llegó a hacerse
      if (this.htPending) { this._flip(); this._placeKickoff(1, true); this.htKick = true; placed = true; }
      while (this.queue.length) {
        const e = this.queue.shift();
        if (e.type === 'goal' || e.type === 'disallowed') { this._placeKickoff(1 - e.team, true); this.ball.owner = this._kickTaker(1 - e.team); placed = true; }
        if (e.type === 'ht') { this.htPending = true; this._flip(); this._placeKickoff(1, true); this.htKick = true; placed = true; }
        if (e.type === 'ft') this._finalWhistle(true);
      }
      if (!placed && !this.over) this._reseat();
      // Segunda parte: todos colocados y el saque espera a que reanudes (solo si seguimos en el descanso)
      if (this.htKick) { this.htKick = false; if (this.m.min <= 45 && !this.over) this._seq(this._kickoffSeq(1)); }
      this.instant = false;
    }

    /** Cambio de campo del descanso (una sola vez, se escenifique o se salte). */
    _flip() {
      if (!this.htPending) return;
      this.htPending = false;
      this.dir = [-this.dir[0], -this.dir[1]];
    }

    /** Tras un salto: cada uno en su sitio según dónde está el balón, sin carreras desde donde estaba. */
    _reseat() {
      const b = this.ball;
      b.path = null; b.roll = null; b.z = 0;
      if (b.owner == null || !this.A[b.owner]) {
        const n = this.nearest(this.team(this.poss), b) || this.nearest(Object.values(this.A), b);
        b.owner = n ? n.pid : null;
      }
      this._cut(1);
      this.cutAt = null; // sin destello: durante el salto esto pasa en cada minuto
      for (const id in this.A) { const a = this.A[id]; a.vx = a.vy = 0; }
      const own = b.owner != null && this.A[b.owner];
      if (own) { b.x = own.x + this.dir[own.team] * 0.5; b.y = own.y; this.poss = own.team; }
      this.ref.x = this.ref.tx; this.ref.y = this.ref.ty;
      this.brain.afterScript(true);
    }

    _take(pred) {
      const k = this.queue.findIndex(pred);
      const e = k >= 0 ? this.queue.splice(k, 1)[0] : null;
      if (e) this.handled.push(e);
      return e;
    }

    _handle(e) {
      const i = e.team, sfx = TL.SFX;
      this.handled.push(e);
      // Lo que no tiene desenlace se cuenta al empezar; los remates, cuando se ve cómo acaban
      if (!['goal', 'save', 'miss', 'disallowed', 'penmiss', 'foul', 'yellow', 'red', 'pen', 'fk', 'refmiss', 'offside'].includes(e.type)) this._reveal(e);
      switch (e.type) {
        case 'corner': {
          if (e.fromPlay) this._seq(this._deflect(i));
          const shot = this._take(x => ['goal', 'save', 'miss', 'disallowed'].includes(x.type) && x.team === i);
          if (shot) this._shotSeq(shot, 'corner');
          else this._seq(this._cornerSetup(i, null).concat(this._cornerPlay(i)));
          break;
        }
        case 'goal': case 'save': case 'miss': case 'disallowed':
          if (e.kind === 'pen' || e.kind === 'fk') { this._shotSeq(e, e.kind); break; }
          this._shotSeq(e, e.origin || 'open');
          break;
        case 'var': {
          const nx = this._take(x => ['disallowed', 'pen'].includes(x.type) || (x.type === 'var'));
          if (nx && nx.type === 'disallowed') { nx.viaVar = true; this._shotSeq(nx, nx.origin || 'open'); break; }
          this._seq([{ d: 2.2, start: () => { this._banner('Revisión VAR', '#5db8ff', 2); this.refOv = { x: L / 2 + 2, y: Wd + 1.2, run: 0.8 }; this.ov = { all: 'stay' }; this.monitor = this.t + 2.2; }, end: () => { this.refOv = null; this.ov = null; } }]);
          if (nx) this.queue.unshift(nx);
          break;
        }
        case 'pen': this._penaltySeq(e); break;
        case 'penmiss': this._penShot(e, false); break;
        case 'fk': this._freeKickSeq(e); break;
        case 'foul': this._tackleSeq(e, null); break;
        case 'yellow': case 'red': this._tackleSeq(e, e.type); break;
        case 'heated': this._tangana(e); break;
        case 'refmiss': this._penClaim(e); break;
        case 'inj': this._injury(e); break;
        case 'sub': this._subSeq(e); break;
        case 'offside': this._offsideSeq(e); break;
        case 'tactic': {
          const c = this.coaches[i];
          if (c) { c.state = 'wave'; c.until = this.t + 2.2; c.goTo = { x: c.base, y: -0.4 }; setTimeout(() => { c.goTo = null; }, 1800); }
          if (e.formation) this._banner(`${this.S.clubs[this.m.teams[i].club].code || ''} · ${e.formation}`, '#ffffff', 1.1);
          break;
        }
        case 'late': this._banner('¡ASEDIO FINAL!', '#ff9a3d', 1.8, true); this._sparkStand(i); break;
        case 'crowd':
          this._seq([{ d: 2.0, start: () => { this._banner('Partido detenido', '#ff9a3d', 1.8); sfx && sfx.whistle(false); this.ov = { all: 'stay' }; this.flare = { team: i, until: this.t + 2.5 }; }, end: () => { this.ov = null; } }]);
          break;
        case 'controversy': this._protest(1 - i, 1.6); break;
        case 'ht': this._halfTime(); break;
        case 'ft': this._finalWhistle(false); break;
        default:
      }
    }

    // ------------------------------------------------------------ Jugadas de ataque
    /** Dónde remata cada tipo de disparo (profundidad hacia la portería rival, lado). */
    _shotSpot(i, type) {
      const d = { long: U.rand(76, 81), header: U.rand(94, 99), volley: U.rand(89, 95), tapin: U.rand(99, 102), placed: U.rand(88, 95), power: U.rand(86, 93), solo: U.rand(90, 96), chip: U.rand(86, 92) }[type] || 90;
      const spread = { tapin: 3, header: 5, volley: 8, long: 12 }[type] || 10;
      return this.world(i, d, Wd / 2 + U.rand(-spread, spread));
    }

    /**
     * La ocasión nace de la jugada que se estaba viendo: quien lleva el balón se la da a la rematadora
     * (o al asistente, o la pone al área desde la banda), o remata ella misma si es la elegida.
     */
    _shotFromPlay(e, origin) {
      const i = e.team, dir = this.dir[i], b = this.ball;
      const car = b.owner != null ? this.A[b.owner] : null;
      if (!car || car.team !== i || b.path) return null;
      const shooter = this.A[e.pid] ? e.pid : null;
      if (shooter == null) return null;
      const type = e.shotType || 'placed';
      const outcome = e.type === 'goal' || e.type === 'disallowed' ? 'goal' : e.type;
      const late = this.m.min >= 85;
      const epic = outcome === 'goal' || origin === 'counter' || type === 'chip' || (late && outcome !== 'miss');
      const air = type === 'header' || type === 'volley';
      let [sx, sy] = this._shotSpot(i, type);
      const ass = e.pid2 != null && this.A[e.pid2] && e.pid2 !== shooter ? e.pid2 : null;
      const say = (p, q, type2) => this.brain.say('pass', { team: i, p, q, type: type2 });
      const beats = [];
      this.ov = { p: {} };
      const rebound = type === 'tapin' && /rechace/.test(e.text || '') && car.pid !== shooter;
      if (rebound) {
        const gk = this.gkOf(1 - i), gx = this.goalX(i), side = sy < Wd / 2 ? -1 : 1;
        // Quien dispara primero lo hace desde la frontal: si quien lleva el balón está lejos, se la da a quien está cerca (o conduce hasta allí)
        const [fx, fy] = this.world(i, U.rand(84, 89), Wd / 2 + U.rand(-8, 8));
        const near = this.team(i).filter(a => a.pid !== shooter && !this.isGK(a)).sort((p, q) => Math.hypot(p.x - fx, p.y - fy) - Math.hypot(q.x - fx, q.y - fy))[0];
        const first = ass != null && this.A[ass] && Math.hypot(this.A[ass].x - fx, this.A[ass].y - fy) < 22 ? ass : near ? near.pid : car.pid;
        if (first !== car.pid) {
          beats.push({ d: 0.05, ball: true, start: () => { say(car.pid, first, 'prog'); this.ov.p[first] = { x: fx, y: fy, run: 1 }; this.ov.p[shooter] = { x: lerp(this.A[shooter].x, sx, 0.5), y: lerp(this.A[shooter].y, sy, 0.5), run: 1 }; this._kick(fx, fy, { h: 0.05, to: first }); } });
          beats.push({ d: 0.2, start: () => { this._receive(first, true); } });
        } else if (this.depth(i, car.x) < 80) {
          beats.push({ d: clamp(Math.hypot(fx - car.x, fy - car.y) / 6, 0.3, 1.6), start: () => { this.ov.p[first] = { x: fx, y: fy, run: 1 }; this.ov.p[shooter] = { x: sx, y: sy, run: 1 }; } });
        }
        // Disparo, la portera la saca con una mano… y la rematadora llega antes que nadie
        beats.push({ d: 0.05, ball: true, slow: 0.7, start: () => {
          this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
          this._focus(lerp(this.ball.x, gx, 0.6), Wd / 2, 1.45);
          if (gk) { gk.state = 'dive'; gk.dive = side * dir; gk.until = this.t + 1.1; this.ov.p[gk.pid] = { x: gx - dir * 1.0, y: Wd / 2 + side * 2, run: 1 }; }
          this._kick(gx - dir * 0.9, Wd / 2 + side * 2.2, { h: 0.3, T: 0.5, done: () => {} });
        } });
        beats.push({ d: 0.05, ball: true, slow: 0.6, start: () => {
          if (!this.instant && TL.SFX) TL.SFX.save && TL.SFX.save();
          // El rechace cae donde llega la rematadora (que ya venía lanzada hacia el área)
          const S = this.A[shooter];
          let px = sx, py = sy, T = 0.45;
          if (S) {
            const d = Math.hypot(sx - S.x, sy - S.y), can = 6.2 * (S.pace || 1) * 0.6;
            if (d > can) { px = S.x + (sx - S.x) * can / d; py = S.y + (sy - S.y) * can / d; }
            T = Math.max(0.45, Math.hypot(px - S.x, py - S.y) / (6.2 * (S.pace || 1)) + 0.15);
            this.ov.p[shooter] = { x: px, y: py, run: 1 };
          }
          this._kick(px, py, { h: 0.7, T, free: true, done: () => {} });
        } });
        beats.push(...this._finish(e, shooter, type, outcome, epic));
        return beats;
      }
      if (car.pid === shooter && !air) {
        // Ella misma: se planta en la zona de remate y dispara
        const dd = Math.hypot(sx - car.x, sy - car.y);
        if (dd > 22) { sx = lerp(car.x, sx, 22 / dd); sy = lerp(car.y, sy, 22 / dd); }
        beats.push({ d: clamp(Math.hypot(sx - car.x, sy - car.y) / 6, 0.3, 1.4), slow: epic ? 0.75 : 1, start: () => {
          this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
          if (epic) this._focus(sx, sy, 1.45);
        } });
      } else {
        let from = car.pid;
        // Centro: desde la banda (si quien la lleva no está en la banda, primero abre a una compañera)
        const wide = a => Math.abs(this.lat(i, a.y) - Wd / 2) > 15 && this.depth(i, a.x) > 64;
        if (origin === 'cross' || air) {
          if (!wide(car)) {
            const mate = (ass != null && this.A[ass]) || this.team(i).filter(a => a.pid !== shooter && !this.isGK(a) && a !== car).sort((p, q) => Math.abs(this.lat(i, q.y) - Wd / 2) - Math.abs(this.lat(i, p.y) - Wd / 2))[0];
            if (mate) {
              const [cx, cy] = this.world(i, U.rand(84, 94), this.lat(i, mate.y) < Wd / 2 ? U.rand(4, 9) : Wd - U.rand(4, 9));
              beats.push({ d: 0.05, ball: true, start: () => { this.ov.p[mate.pid] = { x: cx, y: cy, run: 1 }; this.ov.p[shooter] = { x: sx - dir * 7, y: sy, run: 0.9 }; say(car.pid, mate.pid, 'wide'); this._kick(cx, cy, { h: 0.05, to: mate.pid }); } });
              beats.push({ d: 0.35, start: () => { this._receive(mate.pid, true); } });
              from = mate.pid;
            }
          }
          beats.push({ d: 0.05, ball: true, slow: epic ? 0.6 : 1, start: () => {
            this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
            if (epic) this._focus(sx, sy, 1.5);
            say(from, null, 'cross');
            this._kick(sx, sy, { h: 4.2, T: 1.0, tz: type === 'header' ? 1.9 : 0.8, done: () => {} });
          } });
        } else {
          // Pase: si la asistente está a mano, primero ella; después a la rematadora, que llega a su sitio
          if (ass != null && ass !== car.pid) {
            const A2 = this.A[ass];
            if (Math.hypot(A2.x - car.x, A2.y - car.y) < 32) {
              beats.push({ d: 0.05, ball: true, start: () => { this.ov.p[shooter] = { x: sx - dir * 5, y: sy, run: 0.95 }; say(car.pid, ass, 'pass'); this._kick(A2.x + A2.vx * 0.4, A2.y + A2.vy * 0.4, { h: 0.05, to: ass }); } });
              beats.push({ d: 0.3, start: () => { this._receive(ass, true); } });
              from = ass;
            }
          }
          beats.push({ d: 0.05, ball: true, slow: epic ? 0.65 : 1, start: () => {
            const S = this.A[shooter], b = this.ball;
            if (S) {
              // ¿Llega a tiempo? Si no, el pase va un poco antes, a su carrera
              const T = 0.12 + Math.hypot(sx - b.x, sy - b.y) / 17, dS = Math.hypot(sx - S.x, sy - S.y), can = (T + 0.15) * 6.2 * (S.pace || 1);
              if (dS > can) { const k = can / dS; sx = S.x + (sx - S.x) * k; sy = S.y + (sy - S.y) * k; }
            }
            this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
            if (epic) this._focus(sx, sy, 1.45);
            say(from, shooter, origin === 'counter' ? 'through' : 'prog');
            this._kick(sx, sy, { h: type === 'volley' ? 2.5 : 0.05, tz: type === 'volley' ? 0.8 : 0, to: shooter });
          } });
          beats.push({ d: type === 'solo' ? 0.7 : 0.25, start: () => { if (!air) this._receive(shooter, true); if (type === 'solo') this.ov.p[shooter] = { x: sx + dir * 3, y: sy + U.rand(-3, 3), run: 1 }; } });
        }
      }
      beats.push(...this._finish(e, shooter, type, outcome, epic));
      return beats;
    }

    _shotSeq(e, origin) {
      if (e.fromPlay && origin !== 'corner') { const bs = this._shotFromPlay(e, origin); if (bs) { this._seq(bs); return; } }
      const i = e.team, dir = this.dir[i];
      const shooter = this.A[e.pid] ? e.pid : (this.team(i).find(a => F.LINE[this.slotOf(a)] === 3) || {}).pid;
      if (shooter == null) return;
      const type = e.kind === 'pen' ? 'pen' : e.kind === 'fk' ? 'fk' : e.shotType || 'placed';
      const outcome = e.type === 'goal' || e.type === 'disallowed' ? 'goal' : e.type;
      if (origin === 'pen') { this._penShot(e, true); return; }
      if (origin === 'fk') { this._freeKickSeq(e, true); return; }
      const [sx, sy] = this._shotSpot(i, type);
      const ass = e.pid2 != null && this.A[e.pid2] && e.pid2 !== shooter ? e.pid2 : null;
      const late = this.m.min >= 85;
      const epic = outcome === 'goal' || origin === 'counter' || type === 'chip' || (late && outcome !== 'miss');
      const beats = [];
      if (origin === 'corner') {
        beats.push(...this._cornerSetup(i, shooter));
        beats.push({ d: 0.2, ball: true, slow: epic ? 0.55 : 1, start: () => {
          const taker = this.cornerTaker;
          this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
          if (epic) this._focus(sx, sy, 1.55);
          this._kick(sx, sy, { h: 6.5, T: 1.15, tz: type === 'header' ? 2 : 0.9, by: taker != null ? taker : undefined, team: i, done: () => {} });
        } });
      } else if (origin === 'cross') {
        const crosser = ass != null ? ass : (this.team(i).filter(a => a.pid !== shooter && !this.isGK(a)).sort((p, q) => Math.abs(q.y - Wd / 2) - Math.abs(p.y - Wd / 2))[0] || {}).pid;
        const [cx, cy] = this.world(i, U.rand(88, 97), Math.random() < 0.5 ? U.rand(3, 8) : Wd - U.rand(3, 8));
        beats.push({ d: 0.1, ball: true, start: () => { this.poss = i; this.ov = { p: { [crosser]: { x: cx, y: cy, run: 1 }, [shooter]: { x: sx - dir * 8, y: sy, run: 0.9 } } }; if (crosser != null) this._kick(cx, cy, { h: 2, to: crosser }); } });
        beats.push({ d: 0.7, start: () => { if (crosser != null) this._receive(crosser); } });
        beats.push({ d: 0.1, ball: true, slow: epic ? 0.55 : 1, start: () => {
          this.ov.p[shooter] = { x: sx, y: sy, run: 1 };
          if (epic) this._focus(sx, sy, 1.5);
          this._kick(sx, sy, { h: 4.2, T: 1.0, tz: type === 'header' ? 1.9 : 0.8, done: () => {} });
        } });
      } else if (origin === 'counter') {
        // Robo y contra: el rival estaba volcado y corre hacia atrás
        const [rx, ry] = this.world(i, U.rand(30, 42), U.rand(15, Wd - 15));
        const [gx, gy] = this.world(i, U.rand(60, 66), sy);
        beats.push({ d: 0.1, ball: true, start: () => {
          this.poss = i;
          const p = {};
          for (const a of this.team(1 - i)) if (!this.isGK(a)) { const [x, y] = this.world(1 - i, U.rand(62, 75), a.y); p[a.pid] = { x, y, run: 0.5 }; }
          this.ov = { p };
          const thief = this.nearest(this.team(i).filter(a => a.pid !== shooter), { x: rx, y: ry });
          if (thief) { this._kick(rx, ry, { h: 0.05, to: thief.pid }); }
        } });
        beats.push({ d: 0.5, start: () => { this.ov.p[shooter] = { x: gx, y: gy, run: 1 }; for (const a of this.team(1 - i)) if (!this.isGK(a)) this.ov.p[a.pid] = { x: () => lerp(a.x, this.ownX(1 - i), 0.04), y: a.y, run: 1 }; } });
        beats.push({ d: 0.1, ball: true, start: () => { this._kick(gx, gy, { h: 0.05, to: shooter }); } });
        beats.push({ d: 1.0, slow: 0.6, start: () => { this._receive(shooter); this.ov.p[shooter] = { x: sx, y: sy, run: 1 }; this._focus(sx, sy, 1.6); } });
      } else if (origin === 'long') {
        beats.push({ d: 0.1, ball: true, start: () => { this.poss = i; const mate = this.nearest(this.team(i).filter(a => a.pid !== shooter && !this.isGK(a)), { x: sx, y: sy }); this.ov = { p: { [shooter]: { x: sx, y: sy, run: 0.9 } } }; if (mate && this.ball.owner !== shooter) this._kick(sx, sy, { h: 0.05, to: shooter }); } });
        beats.push({ d: 0.45, slow: epic ? 0.55 : 1, start: () => { this._receive(shooter); if (epic) this._focus(sx, sy, 1.35); } });
      } else {
        // Juego combinativo cerca del área
        const mates = this.team(i).filter(a => a.pid !== shooter && !this.isGK(a) && F.LINE[this.slotOf(a)] >= 2);
        const first = ass != null ? ass : (mates.length ? U.pick(mates).pid : null);
        const [fx, fy] = this.world(i, U.rand(74, 82), U.rand(14, Wd - 14));
        beats.push({ d: 0.1, ball: true, start: () => { this.poss = i; this.ov = { p: { [shooter]: { x: sx - dir * 3, y: sy, run: 0.9 } } }; if (first != null) { this.ov.p[first] = { x: fx, y: fy, run: 0.9 }; this._kick(fx, fy, { h: 0.05, to: first }); } } });
        beats.push({ d: 0.45, start: () => { if (first != null) this._receive(first); } });
        beats.push({ d: 0.1, ball: true, start: () => { this._kick(sx, sy, { h: type === 'volley' ? 2.5 : 0.05, tz: type === 'volley' ? 0.8 : 0, to: shooter }); } });
        beats.push({ d: type === 'solo' ? 0.9 : 0.3, slow: epic ? 0.55 : 1, start: () => { this._receive(shooter); if (epic) this._focus(sx, sy, 1.5); if (type === 'solo') this.ov.p[shooter] = { x: sx + dir * 3, y: sy + U.rand(-3, 3), run: 1 }; } });
      }
      beats.push(...this._finish(e, shooter, type, outcome, epic));
      this._seq(beats);
    }

    /** El remate y lo que pasa después (gol, parada, fuera, palo, bloqueo). */
    _finish(e, shooter, type, outcome, epic) {
      const i = e.team, dir = this.dir[i], gx = this.goalX(i);
      const beats = [];
      const gk = this.gkOf(1 - i);
      const side = Math.random() < 0.5 ? -1 : 1;
      const air = type === 'header' || type === 'volley';
      const T = { power: 0.42, placed: 0.55, header: 0.5, chip: 1.05, long: 0.8, volley: 0.45, tapin: 0.28, solo: 0.5, pen: 0.42, fk: 0.85 }[type] || 0.5;
      const sfx = TL.SFX;
      beats.push({ d: 0.05, ball: true, slow: epic ? 0.45 : 1, start: () => {
        const b = this.ball;
        if (air) { b.z = type === 'header' ? 1.9 : 0.8; const a = this.A[shooter]; if (a) { a.jump = this.t; a.x = lerp(a.x, b.x, 0.85); a.y = lerp(a.y, b.y, 0.85); } }
        else if (this.A[shooter]) this._receive(shooter);
        b.owner = null;
        const fz = b.z;
        if (outcome === 'goal') {
          const ty = Wd / 2 + side * U.rand(0.6, GW / 2 - 0.5);
          const tz = { header: U.rand(0.2, 1.4), chip: 1.6, long: U.rand(1.4, 2.2), power: U.rand(0.4, 1.8), volley: U.rand(0.5, 2), tapin: 0.2, placed: 0.25, fk: 2.05 }[type] || 0.8;
          if (gk) { gk.state = 'dive'; gk.dive = -side * dir; gk.until = this.t + 1.2; this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {}; this.ov.p[gk.pid] = { x: gx - dir * 1.2, y: Wd / 2 - side * 1.5, run: 1 }; }
          this._kick(gx + dir * 1.3, ty, { fz, tz, h: type === 'chip' ? 3.6 : type === 'long' ? 1.2 : type === 'fk' ? 1.5 : 0.2, T, curve: type === 'fk' ? side * 2.4 : type === 'placed' ? side * 0.6 : 0, done: () => {
            this.ball.roll = null; this.netShake = { x: gx, until: this.t + 0.7 };
            if (e.type === 'goal') this._reveal(e);
          } });
        } else if (outcome === 'save') {
          const ty = Wd / 2 + side * U.rand(0.5, GW / 2 - 0.4);
          if (gk) {
            gk.state = 'dive'; gk.dive = side * dir; gk.until = this.t + 1.2;
            this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {};
            this.ov.p[gk.pid] = { x: gx - dir * 1.0, y: ty, run: 1 };
          }
          this._kick(gx - dir * 1.0, ty, { fz, tz: air ? 0.8 : 0.4, h: type === 'chip' ? 3 : 0.3, T, done: () => { this._reveal(e); } });
        } else {
          const mk = e.miss || (air ? 'header' : 'wide');
          if (mk === 'blocked') {
            const blk = this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), { x: lerp(this.ball.x, gx, 0.25), y: lerp(this.ball.y, Wd / 2, 0.25) });
            const [bx, by] = blk ? [blk.x, blk.y] : [lerp(this.ball.x, gx, 0.2), this.ball.y];
            if (blk) { blk.state = 'slide'; blk.until = this.t + 0.6; }
            this._kick(bx, by, { fz, tz: 0.5, h: 0.2, T: 0.22, done: () => { this._reveal(e); } });
          } else if (mk === 'post') {
            const ty = Wd / 2 + side * GW / 2;
            this._kick(gx, ty, { fz, tz: Math.random() < 0.4 ? 2.4 : 1, h: 0.3, T, done: () => { sfx && !this.instant && sfx.post && sfx.post(); this._reveal(e); } });
          } else {
            const over = mk === 'header' || mk === 'long' || Math.random() < 0.4;
            const ty = Wd / 2 + side * (over ? U.rand(0, GW / 2 + 2) : U.rand(GW / 2 + 0.8, GW / 2 + 7));
            this._kick(gx + dir * 2.5, ty, { fz, tz: over ? U.rand(3, 5) : 0.4, h: 0.5, T: T * 1.1, done: () => { this._reveal(e); } });
          }
        }
      } });
      // Después del remate
      if (outcome === 'goal') {
        beats.push({ d: 0.1, start: () => {
          const mine = i === this.me;
          const big = ['long', 'volley', 'chip', 'fk'].includes(type);
          this._banner(e.late || this.m.min >= 88 ? '¡GOL EN EL ÚLTIMO MINUTO!' : big ? '¡GOLAZO!' : '¡GOOOL!', mine ? '#b8f53d' : '#ffffff', 2.2, true);
          if (!this.instant && TL.SFX) { TL.SFX.goal(mine); TL.SFX.net(); }
          if (mine && TL.FX) { TL.FX.confetti(); TL.FX.flash(); } else if (TL.FX) TL.FX.shake(document.getElementById('mv-score'));
          this._sparkStand(i === 0 ? 0 : 1);
        } });
        if (e.type === 'disallowed') beats.push(...this._celebrate(i, shooter, 1.3), ...this._disallow(e));
        else {
          beats.push(...this._celebrate(i, shooter, 3.2));
          if (e.type === 'goal' && this.queue[0] && this.queue[0].type === 'controversy') { this.queue.shift(); beats.push(this._protestBeat(1 - i, 1.6)); }
          beats.push(...this._kickoffSeq(1 - i));
        }
      } else if (outcome === 'save') {
        beats.push({ d: 0.9, start: () => {
          this.slowT = 1;
          const big = e.big || type === 'header' || epic;
          if (big) this._banner('¡PARADÓN!', '#5db8ff', 1.3, true);
          if (!this.instant && TL.SFX) { TL.SFX.chance(); if (big) TL.SFX.save(); }
          const catchIt = Math.random() < 0.5;
          if (gk && catchIt) { this._receive(gk.pid); this.ball.z = 0.5; }
          else {
            // Rechace: a córner o a la frontal
            const [rx, ry] = Math.random() < 0.5 ? [gx - dir * 0.5, Math.random() < 0.5 ? -1 : Wd + 1] : this.world(i, U.rand(82, 90), U.rand(14, Wd - 14));
            this._kick(rx, ry, { free: true, h: 1.4, T: 0.7, done: () => this._contest() });
          }
        }, end: () => { this._unfocus(); } });
        beats.push({ d: 0.8, start: () => { if (this.ov) this.ov = null; if (gk && this.ball.owner === gk.pid) { const [tx, ty] = this.world(1 - i, U.rand(30, 45), U.rand(8, Wd - 8)); this._kick(tx, ty, { h: 7, T: 1.4, done: () => this._contest() }); } } });
      } else {
        const mk = e.miss || (air ? 'header' : 'wide');
        beats.push({ d: 0.9, start: () => {
          this.slowT = 1;
          if (mk === 'post') {
            this._banner('¡AL PALO!', '#ffd23f', 1.3, true);
            if (!this.instant && TL.SFX) TL.SFX.groan();
            const [rx, ry] = this.world(i, U.rand(86, 94), U.rand(18, Wd - 18));
            this._kick(rx, ry, { free: true, h: 1.2, T: 0.6, done: () => this._contest() });
          } else if (mk === 'blocked') {
            const [rx, ry] = this.world(i, U.rand(70, 82), U.rand(10, Wd - 10));
            this._kick(rx, ry, { free: true, h: 1.6, T: 0.6, done: () => this._contest() });
          } else if (!this.instant && TL.SFX) TL.SFX.groan();
          if (gk) gk.state = null;
        }, end: () => { this._unfocus(); this.ov = null; } });
        if (mk !== 'post' && mk !== 'blocked') beats.push(...this._goalKick(1 - i));
      }
      return beats;
    }

    _celebrate(i, scorer, secs) {
      const dir = this.dir[i], gx = this.goalX(i);
      const mineUser = i === this.me;
      const toBench = mineUser && Math.random() < 0.35;
      return [{ d: secs, start: () => {
        this._unfocus();
        this.slowT = 1;
        const a = this.A[scorer];
        const spot = toBench ? { x: this.coaches[i].x, y: 0.4 } : { x: gx - dir * 2, y: a && a.y < Wd / 2 ? 1.6 : Wd - 1.6 };
        const p = {};
        if (a) { p[scorer] = { x: spot.x, y: spot.y, run: 1 }; a.state = 'celebrate'; a.until = this.t + secs; }
        this.team(i).forEach((m, k) => {
          if (m.pid === scorer || this.isGK(m)) return;
          const ang = k * 1.3;
          p[m.pid] = { x: () => (this.A[scorer] ? this.A[scorer].x : spot.x) + Math.cos(ang) * (0.9 + (k % 3) * 0.45), y: () => (this.A[scorer] ? this.A[scorer].y : spot.y) + Math.sin(ang) * (0.9 + (k % 3) * 0.45), run: 0.95 };
          m.state = 'celebrate'; m.until = this.t + secs;
        });
        this.team(1 - i).forEach(m => {
          m.state = this.isGK(m) ? 'sit' : 'sad'; m.until = this.t + secs * 0.9;
          const [x, y] = this._home(m, true);
          p[m.pid] = { x, y, run: 0.25 };
        });
        this.ov = { p };
        this.ball.owner = null;
        this.coaches[i].state = 'jump'; this.coaches[i].until = this.t + secs;
        this.coaches[1 - i].state = 'sad'; this.coaches[1 - i].until = this.t + secs;
      }, end: () => { this.ov = null; this._clearStates(); } }];
    }

    _disallow(e) {
      const i = e.team;
      return [
        { d: e.viaVar ? 2.2 : 0.3, start: () => { if (e.viaVar) { this._banner('Revisión VAR', '#5db8ff', 2); this.refOv = { x: L / 2 + 2, y: Wd + 1.2, run: 0.9 }; this.monitor = this.t + 2.2; } } },
        { d: 1.8, start: () => {
          this.refOv = null;
          this._reveal(e);
          this._banner('GOL ANULADO', '#ff6b6b', 1.7, true);
          if (!this.instant && TL.SFX) TL.SFX.boo();
          this.netShake = null;
        } },
        this._protestBeat(i, 1.6),
        ...this._goalKick(1 - i)
      ];
    }

    _protestBeat(i, secs) {
      return { d: secs, start: () => {
        const p = {};
        this.team(i).filter(a => !this.isGK(a)).sort((a, b) => d2(a, this.ref) - d2(b, this.ref)).slice(0, 4).forEach((a, k) => {
          p[a.pid] = { x: () => this.ref.x + Math.cos(k * 1.6) * 1.6, y: () => this.ref.y + Math.sin(k * 1.6) * 1.6, run: 0.9, jit: 0.35 };
        });
        this.ov = { p, all: 'stay' };
      }, end: () => { this.ov = null; } };
    }
    _protest(i, secs) { this._seq([this._protestBeat(i, secs)]); }

    /** Córner: el área se llena, cada uno con su marca, el portero en la línea. */
    _cornerSetup(i, shooter) {
      const dir = this.dir[i], gx = this.goalX(i);
      return [{ d: 2.0, start: () => {
        const top = this.cornerTop != null ? this.cornerTop : Math.random() < 0.5;
        this.cornerTop = null;
        const cy = top ? 0.4 : Wd - 0.4;
        const b = this.ball;
        this._placeBall(gx - dir * 0.4, cy, 1.4, null, i);
        this.poss = i;
        const atts = this.team(i).filter(a => !this.isGK(a));
        const defs = this.team(1 - i).filter(a => !this.isGK(a));
        // Lanzador: el mejor pasador
        const taker = atts.slice().sort((a, c) => (this.P(c.pid).st[2] || 0) - (this.P(a.pid).st[2] || 0)).find(a => a.pid !== shooter) || atts[0];
        this.cornerTaker = taker ? taker.pid : null;
        const p = {};
        if (taker) p[taker.pid] = { x: gx - dir * 0.9, y: top ? -0.3 : Wd + 0.3, run: 0.8 };
        // Rematadores: los más altos/peligrosos (centrales y delanteros) al área
        const inBox = atts.filter(a => a !== taker).sort((a, c) => (F.LINE[this.slotOf(c)] === 1 || F.LINE[this.slotOf(c)] === 3 ? 1 : 0) - (F.LINE[this.slotOf(a)] === 1 || F.LINE[this.slotOf(a)] === 3 ? 1 : 0));
        const desp = this.m.teams[i].desperate;
        const nBox = desp ? 7 : 5;
        const spots = [[96, 30], [98, 36], [94, 40], [100, 33], [92, 34], [97, 27], [95, 43]];
        inBox.slice(0, nBox).forEach((a, k) => { const [x, y] = this.world(i, spots[k][0], top ? spots[k][1] : Wd - spots[k][1]); p[a.pid] = { x, y, run: 0.7, jit: 0.6 }; });
        inBox.slice(nBox).forEach((a, k) => { const [x, y] = this.world(i, k === 0 ? 84 : 58, Wd / 2 + (k % 2 ? -12 : 12)); p[a.pid] = { x, y, run: 0.5 }; });
        // Con el partido en el aire, el portero sube a rematar
        if (desp && this.m.min >= 88) { const g = this.gkOf(i); if (g) { const [x, y] = this.world(i, 95, Wd / 2); p[g.pid] = { x, y, run: 1, jit: 0.5 }; this._banner('¡SUBE EL PORTERO!', '#ff9a3d', 1.6, true); } }
        // Defensa: marcas al hombre y uno en cada palo
        const marked = inBox.slice(0, nBox);
        defs.forEach((d, k) => {
          if (k < marked.length) { const m = marked[k]; p[d.pid] = { x: () => (this.A[m.pid] ? this.A[m.pid].x : d.x) - dir * 0.9, y: () => (this.A[m.pid] ? this.A[m.pid].y : d.y) + 0.4, run: 0.8, jit: 0.5 }; }
          else if (k === marked.length) { const [x, y] = this.world(1 - i, 1.2, Wd / 2 - 3.2); p[d.pid] = { x, y, run: 0.7 }; }
          else if (k === marked.length + 1) { const [x, y] = this.world(1 - i, 1.2, Wd / 2 + 3.2); p[d.pid] = { x, y, run: 0.7 }; }
          else { const [x, y] = this.world(1 - i, 16 + (k % 2) * 4, Wd / 2 + (k % 3 - 1) * 10); p[d.pid] = { x, y, run: 0.6 }; }
        });
        const g = this.gkOf(1 - i);
        if (g) { const [x, y] = this.world(1 - i, 0.9, Wd / 2 + (top ? -1 : 1)); p[g.pid] = { x, y, run: 0.6 }; }
        this.ov = { p };
        this.refOv = { x: gx - dir * 14, y: top ? 20 : Wd - 20, run: 0.6 };
        if (!this.instant && TL.SFX) TL.SFX.whistle(false);
        this._cut(0.88);
      }, end: () => { this.refOv = null; } }];
    }

    /** Córner sin remate: centro al área y la defensa (o la portera) la despeja. */
    _cornerPlay(i) {
      return [
        { d: 0.1, ball: true, start: () => {
          const [tx, ty] = this.world(i, U.rand(93, 99), Wd / 2 + U.rand(-6, 6));
          const taker = this.cornerTaker;
          this.brain.say('pass', { team: i, p: taker, q: null, type: 'cross' });
          this._kick(tx, ty, { h: 6, T: 1.15, by: taker != null ? taker : undefined, team: i, done: () => {} });
        } },
        { d: 0.4, start: () => {
          this.ov = null;
          const b = this.ball;
          const g = this.gkOf(1 - i);
          const w = g && Math.hypot(g.x - b.x, g.y - b.y) < 5 && Math.random() < 0.5 ? g : this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), b);
          if (!w) return;
          w.jump = this.t;
          this._receive(w.pid, true);
          if (this.isGK(w)) { w.held = true; this.brain.say('poss', { team: 1 - i, p: w.pid, how: 'catch' }); }
          else this.brain.mustClear = w.pid;
        } }
      ];
    }
    /** El ataque acaba en córner: el centro lo toca una defensa y se va por la línea de fondo. */
    _deflect(i) {
      const dir = this.dir[i], gx = this.goalX(i);
      return [
        { d: 0.05, ball: true, start: () => {
          const b = this.ball, car = b.owner != null ? this.A[b.owner] : null;
          const [tx, ty] = this.world(i, U.rand(93, 97), Wd / 2 + U.rand(-6, 6));
          this.brain.say('pass', { team: i, p: car ? car.pid : null, q: null, type: 'cross' });
          this._kick(tx, ty, { h: 1.4, T: 0.75, free: true, done: () => {} });
        } },
        { d: 0.05, ball: true, start: () => {
          const b = this.ball, d = this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), b);
          if (d) { d.state = 'slide'; d.until = this.t + 0.6; d.tx = b.x; d.ty = b.y; }
          const top = b.y < Wd / 2;
          this.cornerTop = top;
          this.brain.lastTouch = 1 - i;
          this._kick(gx + dir * 1.6, top ? U.rand(1, 6) : Wd - U.rand(1, 6), { h: 1.1, T: 0.55, free: true, done: () => {} });
        } },
        { d: 0.5, start: () => { this.brain.say('out', { team: i, kind: 'corner' }); } }
      ];
    }

    /** Falta peligrosa: barrera a 9,15 m, portero al palo largo, lanzador detrás. */
    _freeKickSeq(e, fromGoal) {
      const i = e.team;
      let goalEv = fromGoal ? e : null;
      if (!fromGoal && e.pid == null) goalEv = this._take(x => x.type === 'goal' && x.kind === 'fk' && x.team === i);
      const taker = goalEv ? goalEv.pid : e.pid != null ? e.pid : (this.team(i).filter(a => !this.isGK(a)).sort((a, c) => (this.P(c.pid).st[1] + this.P(c.pid).st[2]) - (this.P(a.pid).st[1] + this.P(a.pid).st[2]))[0] || {}).pid;
      if (taker == null) return;
      const dir = this.dir[i], gx = this.goalX(i);
      let [bx, by] = this.world(i, U.rand(79, 85), Wd / 2 + U.rand(-9, 9));
      const car = this.ball.owner != null ? this.A[this.ball.owner] : null;
      const live = !fromGoal && e.fromPlay && car && car.team === i && !this.ball.path;
      if (live) [bx, by] = this.world(i, clamp(this.depth(i, car.x), 72, 85), clamp(this.lat(i, car.y), Wd / 2 - 17, Wd / 2 + 17));
      const beats = [];
      if (live) beats.push(this._foulBeat(car, i));
      beats.push({ d: 2.6, start: () => {
        if (goalEv || fromGoal) this._reveal(e);
        this._banner('Falta peligrosa', '#ffffff', 1.2);
        if (!this.instant && TL.SFX) TL.SFX.whistle(false);
        this._placeBall(bx, by, 1.4, null, i);
        this.poss = i;
        const p = {};
        if (this.A[taker]) p[taker] = { x: bx - dir * 2.4, y: by + 1.2, run: 0.6 };
        // Barrera: entre el balón y el palo corto, a 9,15 m
        const nearPost = Wd / 2 + (by < Wd / 2 ? -GW / 2 : GW / 2);
        const vx = gx - bx, vy = nearPost - by, vl = Math.hypot(vx, vy);
        const wx = bx + vx / vl * 9.15, wy = by + vy / vl * 9.15;
        const px = -vy / vl, py = vx / vl;
        const defs = this.team(1 - i).filter(a => !this.isGK(a)).sort((a, c) => d2(a, { x: wx, y: wy }) - d2(c, { x: wx, y: wy }));
        defs.slice(0, 4).forEach((d, k) => { p[d.pid] = { x: wx + px * (k - 1.5) * 0.85, y: wy + py * (k - 1.5) * 0.85, run: 0.6 }; });
        const g = this.gkOf(1 - i);
        if (g) p[g.pid] = { x: gx - dir * 0.8, y: Wd / 2 + (by < Wd / 2 ? 1.4 : -1.4), run: 0.5 };
        const atts = this.team(i).filter(a => a.pid !== taker && !this.isGK(a));
        atts.slice(0, 4).forEach((a, k) => { const [x, y] = this.world(i, 92 + (k % 2) * 3, Wd / 2 + (k - 1.5) * 5); p[a.pid] = { x, y, run: 0.6, jit: 0.3 }; });
        defs.slice(4, 8).forEach((d, k) => { const [x, y] = this.world(1 - i, 7 + (k % 2) * 3, Wd / 2 + (k - 1.5) * 5); p[d.pid] = { x, y, run: 0.6, jit: 0.3 }; });
        this.ov = { p };
        this.refOv = { x: wx + px * 3, y: wy + py * 3, run: 0.7 };
        this.wall = { until: this.t + 2.6 };
        this._cut(0.9);
      }, end: () => { this.refOv = null; } });
      beats.push({ d: 0.6, slow: goalEv ? 0.5 : 1, start: () => { if (this.A[taker]) { this.ov.p[taker] = { x: bx, y: by, run: 0.7 }; } if (goalEv) this._focus(lerp(bx, gx, 0.5), Wd / 2, 1.45); } });
      if (goalEv) beats.push(...this._finish(goalEv, taker, 'fk', 'goal', true));
      else {
        const intoWall = Math.random() < 0.5;
        beats.push({ d: 0.05, ball: true, start: () => {
          if (this.A[taker]) this._receive(taker);
          if (intoWall) { const w = this.team(1 - i).filter(a => !this.isGK(a)).sort((a, c) => d2(a, this.ball) - d2(c, this.ball))[1]; this._kick(w ? w.x : bx, w ? w.y : by, { h: 0.8, tz: 1.5, T: 0.3, done: () => { this._reveal(e); } }); }
          else this._kick(gx + dir * 2, Wd / 2 + U.rand(-5, 5), { h: 2.2, tz: 3.2, T: 0.85, curve: 2, done: () => { this._reveal(e); } });
        } });
        beats.push({ d: 0.8, start: () => {
          if (!this.instant && TL.SFX) TL.SFX.groan();
          if (intoWall) { const [rx, ry] = this.world(i, U.rand(66, 76), U.rand(14, Wd - 14)); this._kick(rx, ry, { free: true, h: 2, T: 0.7, done: () => this._contest() }); }
        }, end: () => { this.ov = null; this._unfocus(); } });
        if (!intoWall) beats.push(...this._goalKick(1 - i));
      }
      this._seq(beats);
    }

    /** Falta sobre quien lleva el balón: entra la rival más cercana, cae y pita el árbitro. */
    _foulBeat(victim, i) {
      return { d: 1.0, start: () => {
        const f = this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), victim);
        if (f) { f.state = 'slide'; f.until = this.t + 0.6; f.x = lerp(f.x, victim.x, 0.4); f.y = lerp(f.y, victim.y, 0.4); }
        victim.state = 'down'; victim.until = this.t + 1.4; victim.fall = Math.random() * 6;
        this.ball.owner = null; this.ball.roll = { vx: this.dir[i] * 2, vy: U.rand(-1, 1) };
        if (!this.instant && TL.SFX) TL.SFX.whistle(false);
        this.ov = { all: 'stay', p: {} };
      } };
    }

    /** Penalti: derribo en el área, el árbitro señala, todos fuera del área. */
    _penaltySeq(e) {
      const i = e.team, dir = this.dir[i];
      const victim = this.A[e.pid] ? e.pid : (this.team(i).find(a => F.LINE[this.slotOf(a)] === 3) || {}).pid;
      const fouler = e.pid2 != null && this.A[e.pid2] ? e.pid2 : null;
      let [vx, vy] = this.world(i, U.rand(91, 97), Wd / 2 + U.rand(-9, 9));
      const [spx, spy] = this.world(i, L - 11, Wd / 2);
      const beats = [];
      const carrying = victim != null && this.ball.owner === victim && !this.ball.path;
      if (carrying) {
        const v = this.A[victim];
        [vx, vy] = this.world(i, clamp(this.depth(i, v.x) + 7, 89, 99), clamp(this.lat(i, v.y) + (Wd / 2 - this.lat(i, v.y)) * 0.3, Wd / 2 - 16, Wd / 2 + 16));
      }
      if (victim != null) {
        if (carrying) beats.push({ d: 0.8, start: () => { this.poss = i; this.ov = { p: { [victim]: { x: vx, y: vy, run: 1 } } }; if (fouler != null) this.ov.p[fouler] = { x: () => this.A[victim].x, y: () => this.A[victim].y, run: 1 }; } });
        else {
          beats.push({ d: 0.1, ball: true, start: () => { this.poss = i; this.ov = { p: { [victim]: { x: vx, y: vy, run: 1 } } }; if (fouler != null) this.ov.p[fouler] = { x: () => this.A[victim].x, y: () => this.A[victim].y, run: 1 }; this._kick(vx, vy, { h: 0.05, to: victim }); } });
          beats.push({ d: 0.7, start: () => { this._receive(victim); } });
        }
        beats.push({ d: 0.9, start: () => {
          const v = this.A[victim]; if (v) { v.state = 'down'; v.until = this.t + 1.8; }
          if (fouler != null && this.A[fouler]) { this.A[fouler].state = 'slide'; this.A[fouler].until = this.t + 0.6; }
          if (!this.instant && TL.SFX) TL.SFX.whistle(false);
          this.ball.owner = null; this.ball.roll = { vx: dir * 2, vy: 0 };
          this.ov = { all: 'stay', p: {} };
        } });
      }
      beats.push({ d: 1.4, start: () => {
        this._reveal(e);
        this._banner('PENALTI', '#f2c94c', 1.5, true);
        this.refOv = { x: spx - dir * 1.5, y: spy + 1.5, run: 1 };
        this.ref.state = 'point'; this.ref.until = this.t + 1.6;
      } });
      beats.push(this._protestBeat(1 - i, 1.3));
      beats.push({ d: 2.4, start: () => {
        this._placeBall(spx, spy, 1.2, null, i);
        const taker = (this.team(i).filter(a => !this.isGK(a)).sort((a, c) => (this.P(c.pid).st[1] * 1.5 + this.P(c.pid).st[2] * 0.3) - (this.P(a.pid).st[1] * 1.5 + this.P(a.pid).st[2] * 0.3))[0] || {}).pid;
        this.penTaker = taker;
        const p = {};
        let k = 0;
        for (const id in this.A) {
          const a = this.A[id];
          if (+id === taker) { p[id] = { x: spx - dir * 2.6, y: spy + 0.8, run: 0.5 }; continue; }
          if (this.isGK(a)) {
            if (a.team !== i) { p[id] = { x: this.goalX(i) - dir * 0.3, y: Wd / 2, run: 0.5 }; }
            continue;
          }
          // Todos fuera del área y de la media luna, repartidos por la frontal
          const lat = Wd / 2 + ((k * 7) % 18 - 8.5) * 2.4 + U.rand(-0.8, 0.8);
          const arc = Math.abs(lat - Wd / 2) < 9 ? 21.5 + U.rand(0, 2.5) : 17.5 + U.rand(0.5, 3);
          const [x, y] = this.world(i, L - arc, lat);
          p[id] = { x, y, run: 0.6, jit: 0.15 };
          k++;
        }
        this.ov = { p };
        this.refOv = { x: spx - dir * 6, y: spy - 9, run: 0.6 };
        this._cut(0.92);
      } });
      this._seq(beats);
      // Si el lanzamiento ya está en la cola, va justo detrás
      const shot = this._take(x => (x.type === 'goal' && x.kind === 'pen') || x.type === 'penmiss');
      if (shot) this._penShot(shot, shot.type === 'goal');
    }

    _penShot(e, goal) {
      const i = e.team, dir = this.dir[i], gx = this.goalX(i);
      const taker = this.A[e.pid] ? e.pid : this.penTaker;
      const [spx, spy] = this.world(i, L - 11, Wd / 2);
      const gk = this.gkOf(1 - i);
      const side = Math.random() < 0.5 ? -1 : 1;
      const saved = !goal && Math.random() < 0.65;
      this._seq([
        { d: 1.1, slow: 0.5, start: () => { this._focus(lerp(spx, gx, 0.5), Wd / 2, 1.8); if (taker != null && this.ov && this.ov.p) this.ov.p[taker] = { x: spx, y: spy, run: 0.75 }; } },
        { d: 0.05, ball: true, slow: 0.45, start: () => {
          const b = this.ball; b.x = spx; b.y = spy; b.owner = null;
          const ty = Wd / 2 + side * U.rand(1.2, GW / 2 - 0.4);
          const dive = goal ? (Math.random() < 0.7 ? -side : side) : saved ? side : (Math.random() < 0.5 ? side : -side);
          if (gk) { gk.state = 'dive'; gk.dive = dive * dir; gk.until = this.t + 1.3; this.ov.p[gk.pid] = { x: gx - dir * 0.6, y: Wd / 2 + dive * 2.4, run: 1 }; }
          if (goal) this._kick(gx + dir * 1.3, ty, { fz: 0, tz: U.rand(0.2, 2), h: 0.3, T: 0.42, done: () => { this.netShake = { x: gx, until: this.t + 0.7 }; this._reveal(e); } });
          else if (saved) this._kick(gx - dir * 0.6, Wd / 2 + side * 2.4, { fz: 0, tz: 0.6, h: 0.2, T: 0.4, done: () => { this._reveal(e); } });
          else this._kick(gx + dir * 2, Wd / 2 + side * U.rand(GW / 2 + 0.5, GW / 2 + 3), { fz: 0, tz: Math.random() < 0.5 ? 3 : 0.5, h: 0.4, T: 0.45, done: () => { this._reveal(e); } });
        } },
        ...(goal ? [
          { d: 0.1, start: () => { const mine = i === this.me; this._banner('¡GOOOL!', mine ? '#b8f53d' : '#ffffff', 2, true); if (!this.instant && TL.SFX) { TL.SFX.goal(mine); TL.SFX.net(); } if (mine && TL.FX) TL.FX.confetti(); this._sparkStand(i); } },
          ...this._celebrate(i, taker, 3),
          ...this._kickoffSeq(1 - i)
        ] : [
          { d: 1.4, start: () => {
            this._unfocus(); this.slowT = 1;
            this._banner(saved ? '¡LO PARA!' : '¡FUERA!', saved ? '#5db8ff' : '#ff6b6b', 1.4, true);
            if (!this.instant && TL.SFX) { TL.SFX.groan(); if (saved) TL.SFX.chance(); }
            if (saved && gk) { if (Math.random() < 0.5) this._receive(gk.pid); else { const [rx, ry] = this.world(i, U.rand(86, 92), U.rand(20, Wd - 20)); this._kick(rx, ry, { free: true, h: 1, T: 0.5, done: () => this._contest() }); } }
          }, end: () => { this.ov = null; } },
          ...(saved ? [] : this._goalKick(1 - i))
        ])
      ]);
    }

    // ------------------------------------------------------------ Faltas, tarjetas, tanganas
    _tackleSeq(e, card) {
      const i = e.team; // equipo que comete la falta
      const fouler = this.A[e.pid] ? e.pid : null;
      if (fouler == null && card !== 'red') return;
      const f = this.A[fouler];
      const victims = this.team(1 - i).filter(a => !this.isGK(a));
      const victim = e.pid2 != null && this.A[e.pid2] ? this.A[e.pid2] : f ? this.nearest(victims, f) : null;
      if (!f || !victim) return;
      if (card === 'red') { this.keep.add(fouler); f.red = true; }
      const hard = card || e.hard;
      const spot = { x: clamp(victim.x, 2, L - 2), y: clamp(victim.y, 2, Wd - 2) };
      // Si no es penalti, la falta es fuera del área de quien la comete
      if (this.depth(1 - i, spot.x) > L - 17.5 && Math.abs(spot.y - Wd / 2) < 21) spot.x = this.world(1 - i, L - 18, 0)[0];
      const beats = [
        { d: 0.65, start: () => {
          this.poss = 1 - i;
          if (this.ball.owner !== victim.pid) this._kick(victim.x, victim.y, { h: 0.05, to: victim.pid, sfx: false });
          this.ov = { p: { [fouler]: { x: () => victim.x, y: () => victim.y, run: 1 }, [victim.pid]: { x: victim.x + this.dir[1 - i] * 4, y: victim.y, run: 0.6 } } };
        } },
        { d: 0.1, start: () => {
          if (!card) this._reveal(e);
          if (hard) { f.state = 'slide'; f.until = this.t + 0.7; }
          victim.state = 'down'; victim.until = this.t + (card ? 2.6 : 1.5); victim.fall = Math.random() * 6;
          this.ball.owner = null; this.ball.roll = { vx: this.dir[1 - i] * 3, vy: U.rand(-1, 1) };
          if (!this.instant && TL.SFX) TL.SFX.whistle(false);
          this.ov = { all: 'stay', p: {} };
          this.refOv = { x: spot.x - 2, y: spot.y + 2, run: 1 };
        } }
      ];
      if (card) {
        beats.push({ d: 1.2, start: () => {
          const p = {};
          this.team(i).filter(a => a.pid !== fouler && !this.isGK(a)).sort((a, b) => d2(a, spot) - d2(b, spot)).slice(0, 2).forEach((a, k) => {
            p[a.pid] = { x: () => this.ref.x + (k ? 1.4 : -1.4), y: () => this.ref.y - 1, run: 0.9, jit: 0.3 };
          });
          this.team(1 - i).filter(a => a !== victim && !this.isGK(a)).sort((a, b) => d2(a, spot) - d2(b, spot)).slice(0, 1).forEach(a => { p[a.pid] = { x: spot.x + 1.5, y: spot.y - 1.5, run: 0.8 }; });
          this.ov = { all: 'stay', p };
        } });
        beats.push({ d: 1.5, start: () => {
          this.ref.state = 'card'; this.ref.card = card; this.ref.until = this.t + 1.5;
          this._reveal(e);
          this._icon(fouler, card === 'red' ? 'red' : 'yellow', 1.6);
          if (!this.instant && TL.SFX) { TL.SFX.card(); if (card === 'red') TL.SFX.boo(); }
          if (card === 'red') this._banner('¡ROJA!', '#ff4040', 1.4, true);
        } });
        if (card === 'red') beats.push({ d: 0.3, start: () => { this.keep.delete(fouler); } });
      }
      beats.push({ d: 0.8, start: () => {
        // Se saca la falta en corto
        this.refOv = null;
        const taker = this.nearest(this.team(1 - i).filter(a => a !== victim && !this.isGK(a)), spot);
        this._placeBall(spot.x, spot.y, 0.6, taker ? taker.pid : null, 1 - i);
        this.ov = null;
        this.brain.restartBy(1 - i, 'fk');
      } });
      this._seq(beats);
    }

    _tangana(e) {
      const cx = clamp(this.ball.x, 8, L - 8), cy = clamp(this.ball.y, 6, Wd - 6);
      this._seq([{ d: 2.6, start: () => {
        this._banner('¡TANGANA!', '#ff6b6b', 1.6, true);
        if (!this.instant && TL.SFX) { TL.SFX.whistle(false); TL.SFX.boo(); }
        const p = {};
        for (const i of [0, 1]) {
          this.team(i).filter(a => !this.isGK(a)).sort((a, b) => d2(a, { x: cx, y: cy }) - d2(b, { x: cx, y: cy })).slice(0, 5).forEach((a, k) => {
            const ang = k * 1.25 + i * 0.6;
            p[a.pid] = { x: cx + Math.cos(ang) * (1 + k * 0.25), y: cy + Math.sin(ang) * (1 + k * 0.25), run: 1, jit: 0.7 };
          });
        }
        this.ov = { p, all: 'stay' };
        this.refOv = { x: cx, y: cy, run: 1 };
      }, end: () => { this.ov = null; this.refOv = null; } }]);
    }

    _penClaim(e) {
      const i = e.team, dir = this.dir[i];
      const v = this.A[e.pid] ? e.pid : (this.team(i).find(a => F.LINE[this.slotOf(a)] === 3) || {}).pid;
      if (v == null) return;
      const [vx, vy] = this.world(i, U.rand(91, 96), Wd / 2 + U.rand(-8, 8));
      this._seq([
        { d: 0.1, ball: true, start: () => { this.poss = i; this.ov = { p: { [v]: { x: vx, y: vy, run: 1 } } }; this._kick(vx, vy, { h: 0.05, to: v }); } },
        { d: 0.6, start: () => { this._receive(v); } },
        { d: 0.2, start: () => { const a = this.A[v]; if (a) { a.state = 'down'; a.until = this.t + 2; } this.ball.owner = null; this.ball.roll = { vx: dir * 2, vy: 0 }; } },
        { d: 0.1, start: () => { this._reveal(e); this._banner('¿¡No es penalti!?', '#ff6b6b', 1.5, true); if (!this.instant && TL.SFX) TL.SFX.boo(); this.ref.state = 'wave'; this.ref.until = this.t + 1.4; } },
        this._protestBeat(i, 1.6)
      ]);
    }

    _injury(e) {
      const a = this.A[e.pid];
      if (!a) return;
      this.keep.add(e.pid);
      const subNext = this.queue.findIndex(x => x.type === 'sub' && x.pid2 === e.pid) >= 0;
      this._seq([
        { d: 1.6, start: () => { a.state = 'down'; a.until = this.t + 6; this.ball.owner = null; this.ov = { all: 'stay', p: {} }; if (!this.instant && TL.SFX) TL.SFX.whistle(false); this._icon(e.pid, 'med', 5); } },
        { d: 2.2, start: () => {
          this.medics = [0, 1].map(k => actor('med', L / 2 + (k ? 1 : -1), -0.5));
          this.medics.forEach((m, k) => { m.tx = a.x + (k ? 0.9 : -0.9); m.ty = a.y - 0.6; m.run = 0.9; });
        } },
        { d: 1.6, start: () => {
          this.keep.delete(e.pid);
          a.state = subNext ? 'walk' : null;
          this.medics.forEach(m => { m.tx = L / 2; m.ty = -1; m.run = 0.6; });
          this.ov = null;
          setTimeout(() => { this.medics = []; }, 2500);
        } }
      ]);
    }

    _subSeq(e) {
      this._seq([{ d: 1.6, start: () => {
        this.keep.delete(e.pid2);
        this.board = { team: e.team, inN: this.num[e.pid], outN: this.num[e.pid2], until: this.t + 2.2 };
        this._numbers();
        this._banner('Cambio', '#ffffff', 0.9);
      } }]);
    }

    _offsideSeq(e) {
      const i = e.team, dir = this.dir[i];
      const runner = this.A[e.pid];
      if (!runner) return;
      const defs = this.team(1 - i).map(a => this.depth(i, a.x)).sort((a, b) => b - a);
      const lineDepth = defs.length > 1 ? defs[1] : 80;
      const [tx, ty] = this.world(i, clamp(lineDepth + 4, 30, 98), clamp(runner.y, 6, Wd - 6));
      const ar = this.ars[tx < L / 2 ? 0 : 1];
      this._seq([
        { d: 0.1, start: () => {
          this.poss = i;
          this.ov = { p: { [e.pid]: { x: tx, y: ty, run: 1 } } };
          const own = this.ball.owner != null ? this.A[this.ball.owner] : null;
          const carrier = own && own.team === i && own !== runner ? own : this.nearest(this.team(i).filter(a => a !== runner && !this.isGK(a)), { x: tx - dir * 22, y: ty });
          if (carrier && this.ball.owner !== carrier.pid) this._receive(carrier.pid);
        } },
        { d: 0.5, ball: true, start: () => { this._kick(tx, ty, { h: 0.1, to: e.pid }); } },
        { d: 1.3, start: () => {
          ar.flag = this.t + 1.6;
          this._reveal(e);
          if (!this.instant && TL.SFX) TL.SFX.whistle(false);
          this._banner('Fuera de juego', '#ffd23f', 1.1);
          this.ov = { all: 'stay', p: {} };
        } },
        { d: 0.6, start: () => {
          this.ov = null;
          const taker = this.nearest(this.team(1 - i), { x: tx, y: ty });
          this._placeBall(tx, ty, 0.5, taker ? taker.pid : null, 1 - i);
          this.brain.restartBy(1 - i, 'fk');
        } }
      ]);
    }

    _halfTime() {
      this.htPending = true;
      this._seq([
        { d: 2.6, start: () => {
          this._banner('DESCANSO', '#ffffff', 1.8, true);
          if (!this.instant && TL.SFX) TL.SFX.whistle(true);
          const p = {};
          for (const id in this.A) p[id] = { x: TUNNEL.x + U.rand(-4, 4), y: -0.5, run: 0.55 };
          this.ov = { p };
          this.ball.owner = null; this.ball.roll = null;
          this.refOv = { x: TUNNEL.x, y: -0.8, run: 0.3 };
        } },
        { d: 0.1, start: () => { this._flip(); this.refOv = null; } },
        ...this._kickoffSeq(1)
      ]);
    }

    _finalWhistle(instant) {
      if (this.finalDone) return;
      this.finalDone = true;
      const go = () => {
        this.over = true;
        this.ball.owner = null; this.ball.path = null; this.ball.roll = null;
        // Saludo: los dos equipos se cruzan en el centro; los entrenadores se dan la mano
        const p = {};
        this.m.teams.forEach((t, i) => this.team(i).forEach((a, k) => { p[a.pid] = { x: L / 2 + (i === 0 ? -1.2 : 1.2) + Math.sin(this.t + k) * 0.2, y: 8 + k * (Wd - 16) / 10, run: 0.3 }; }));
        this.ov = { p };
        this.coaches.forEach((c, i) => { c.goTo = { x: L / 2 + (i ? 0.7 : -0.7), y: TECH_Y + 0.6 }; c.run = 0.3; });
        this.refOv = { x: L / 2, y: Wd / 2, run: 0.3 };
      };
      if (instant) { go(); return; }
      this._seq([{ d: 0.1, start: () => { this._banner('FINAL', '#ffffff', 3, true); if (TL.SFX) TL.SFX.whistle(true); go(); } }]);
    }

    /** Lo llama la vista al terminar el partido. */
    end() { if (!this.finalDone) this._finalWhistle(false); }

    // ------------------------------------------------------------ Bucle
    _loop(now) {
      const real = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      if (this.loading()) { this._drawLoading(); this.raf = requestAnimationFrame(this._loop); return; }
      this.slow += (this.slowT - this.slow) * Math.min(1, real * 6);
      const dt = real * this.rate();
      this.t += dt;
      this._update(dt, real);
      this._draw(real);
      this.raf = requestAnimationFrame(this._loop);
    }

    _update(dt, real) {
      this.brain.dt = dt;
      this._sync();
      if (!this.beat && !this.script.length && this.queue.length && !this.fetch && !this.place) {
        const e = this.queue[0];
        if (!this.brain.leading(e)) { this.queue.shift(); this._handle(e); }
      }
      if (!this.beat && !this.script.length && !this.queue.length && this.handled.length) this._revealAll();
      this._runScript(dt);
      this._targets();
      if (this.fetch) this._fetchStep();
      if (this.place) this._placeStep();
      this._officials();
      for (const id in this.A) this._move(this.A[id], dt);
      this._separate();
      for (const a of this.leaving) this._move(a, dt);
      this.leaving = this.leaving.filter(a => Math.hypot(a.x - a.tx, a.y - a.ty) > 0.6);
      this._move(this.ref, dt);
      this.ars.forEach(a => { a.ty = a === this.ars[0] ? Wd + 0.9 : -0.9; this._move(a, dt); });
      this._move(this.fourth, dt);
      this.coaches.forEach(c => this._move(c, dt));
      if (this.m.min >= 46) this.warm.forEach(ws => ws.forEach(w => this._move(w, dt)));
      this.medics.forEach(m => this._move(m, dt));
      this._ballUpdate(dt);
      this._openPlay(dt);
      // Cámara
      const c = this.cam;
      const tz = c.tz, tx = c.tx != null ? c.tx : (VIEW.x0 + VIEW.x1) / 2, ty = c.ty != null ? c.ty : (VIEW.y0 + VIEW.y1) / 2;
      const k = Math.min(1, real * 3.2);
      c.z += (tz - c.z) * k; c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
      if (c.tx != null && this.ball) { c.tx = lerp(c.tx, this.ball.x, Math.min(1, real * 1.5)); c.ty = lerp(c.ty, this.ball.y, Math.min(1, real * 1.5)); }
    }

    // ------------------------------------------------------------ Dibujo
    _draw(real) {
      const c = this.cx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      const cam = this.cam;
      const s = this.sc * cam.z;
      // Mantener la cámara dentro del estadio
      const halfW = this.w / 2 / s, halfH = this.h / 2 / s;
      const fit = (v, a, b, half) => (b - a <= half * 2 ? (a + b) / 2 : clamp(v, a + half, b - half));
      const cxw = fit(cam.x, VIEW.x0, VIEW.x1, halfW), cyw = fit(cam.y, VIEW.y0, VIEW.y1, halfH);
      const X = x => this.w / 2 + (x - cxw) * s;
      const Y = y => this.h / 2 + (y - cyw) * s;
      this.X = X; this.Y = Y; this.s = s;
      // Grada y pista
      const night = this.st.night;
      const art = this._artCv();
      if (art) { c.fillStyle = '#20242a'; c.fillRect(0, 0, this.w, this.h); c.drawImage(art, X(VIEW.x0), Y(VIEW.y0), (VIEW.x1 - VIEW.x0) * s, (VIEW.y1 - VIEW.y0) * s); }
      else {
      c.fillStyle = night ? '#060b12' : '#0b1f14'; c.fillRect(0, 0, this.w, this.h);
      // Gradas con los colores del club local y tifo con sus siglas
      c.globalAlpha = night ? 0.28 : 0.38;
      c.fillStyle = this.st.seat; c.fillRect(X(VIEW.x0), Y(VIEW.y0), (VIEW.x1 - VIEW.x0) * s, 2.1 * s);
      c.fillRect(X(VIEW.x0), Y(Wd + 2.4), (VIEW.x1 - VIEW.x0) * s, (VIEW.y1 - Wd - 2.4) * s);
      c.globalAlpha = 1;
      c.save();
      c.globalAlpha = 0.35;
      c.fillStyle = this.st.seat2;
      c.font = `900 ${Math.max(8, 2.2 * s)}px Barlow Condensed, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const tx of [L * 0.18, L * 0.82]) c.fillText(this.st.code, X(tx), Y(VIEW.y0 + 1));
      c.restore();
      c.fillStyle = night ? '#0f2a1b' : '#14351f'; c.fillRect(X(VIEW.x0), Y(-10), (VIEW.x1 - VIEW.x0) * s, (Wd + 12.5) * s);
      for (const p of this.crowd) {
        const jump = this.sparkUntil && this.sparkUntil > this.t ? Math.abs(Math.sin(this.t * 9 + p.p)) * 0.3 : 0;
        c.fillStyle = p.c;
        c.fillRect(X(p.x), Y(p.y - jump), Math.max(1, 0.55 * s), Math.max(1, 0.55 * s));
      }
      this.sparks = this.sparks.filter(k => k.until > this.t);
      if (this.sparks.length) this.sparkUntil = this.t + 0.2;
      c.fillStyle = '#ffffff';
      for (const k of this.sparks) if (Math.random() < 0.5) c.fillRect(X(k.x), Y(k.y), Math.max(1.5, 0.6 * s), Math.max(1.5, 0.6 * s));
      if (this.flare && this.flare.until > this.t) {
        const top = this.flare.team === 0;
        for (let k = 0; k < 6; k++) {
          const fx = L * (0.2 + k * 0.12), fy = top ? -10.5 : Wd + 3.5;
          const g = c.createRadialGradient(X(fx), Y(fy), 0, X(fx), Y(fy), 3 * s);
          g.addColorStop(0, 'rgb(255 90 40 / 0.85)'); g.addColorStop(1, 'rgb(255 90 40 / 0)');
          c.fillStyle = g; c.fillRect(X(fx - 3), Y(fy - 3), 6 * s, 6 * s);
        }
      }
      // Vallas publicitarias
      const boards = [this.st.seat, '#ffffff', this.st.seat2, '#b8f53d'];
      for (let k = 0; k < 14; k++) {
        c.fillStyle = boards[k % boards.length]; c.globalAlpha = 0.28;
        c.fillRect(X(k * L / 14 + 0.5), Y(Wd + 1.7), (L / 14 - 1) * s, 0.6 * s);
      }
      for (const gx of [-2.6, L + 2]) { c.fillStyle = '#ffffff'; c.globalAlpha = 0.18; c.fillRect(X(gx), Y(6), 0.6 * s, (Wd - 12) * s); }
      c.globalAlpha = 1;
      // Césped con el dibujo de este estadio
      c.drawImage(this._grass(), X(0), Y(0), L * s, Wd * s);
      // Líneas
      c.strokeStyle = 'rgb(255 255 255 / 0.6)';
      c.lineWidth = Math.max(1, s * 0.12);
      c.strokeRect(X(0), Y(0), L * s, Wd * s);
      c.beginPath(); c.moveTo(X(L / 2), Y(0)); c.lineTo(X(L / 2), Y(Wd)); c.stroke();
      c.beginPath(); c.arc(X(L / 2), Y(Wd / 2), 9.15 * s, 0, 6.283); c.stroke();
      c.beginPath(); c.arc(X(L / 2), Y(Wd / 2), Math.max(1, 0.3 * s), 0, 6.283); c.fillStyle = 'rgb(255 255 255 / .6)'; c.fill();
      for (const side of [0, 1]) {
        const x0 = side ? L - 16.5 : 0, x1 = side ? L - 5.5 : 0;
        c.strokeRect(X(x0), Y(Wd / 2 - 20.15), 16.5 * s, 40.3 * s);
        c.strokeRect(X(x1), Y(Wd / 2 - 9.15), 5.5 * s, 18.3 * s);
        c.beginPath(); c.arc(X(side ? L - 11 : 11), Y(Wd / 2), Math.max(1, s * 0.3), 0, 6.283); c.fillStyle = 'rgb(255 255 255 / .6)'; c.fill();
        c.beginPath(); c.arc(X(side ? L - 11 : 11), Y(Wd / 2), 9.15 * s, side ? Math.PI * 0.705 : -Math.PI * 0.295, side ? Math.PI * 1.295 : Math.PI * 0.295); c.stroke();
        // Banderines de córner
        for (const cy of [0, Wd]) { c.fillStyle = '#ffd23f'; c.fillRect(X(side ? L : 0), Y(cy) - 1.2 * s, Math.max(2, 0.5 * s), Math.max(3, 1.1 * s)); }
        // Portería con red que se mueve en los goles
        const gx = side ? L : -2;
        let jig = 0;
        if (this.netShake && this.netShake.until > this.t && Math.abs(this.netShake.x - (side ? L : 0)) < 1) jig = Math.sin(this.t * 70) * 0.35;
        c.fillStyle = 'rgb(255 255 255 / 0.16)';
        c.fillRect(X(gx + jig), Y(Wd / 2 - GW / 2), 2 * s, GW * s);
        c.save(); c.strokeStyle = 'rgb(255 255 255 / 0.22)'; c.lineWidth = 1;
        for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(X(gx + jig), Y(Wd / 2 - GW / 2 + k * GW / 6)); c.lineTo(X(gx + 2 + jig), Y(Wd / 2 - GW / 2 + k * GW / 6)); c.stroke(); }
        c.restore();
        c.strokeStyle = 'rgb(255 255 255 / 0.9)'; c.lineWidth = Math.max(1.4, s * 0.16);
        c.strokeRect(X(gx + jig), Y(Wd / 2 - GW / 2), 2 * s, GW * s);
        c.strokeStyle = 'rgb(255 255 255 / 0.6)'; c.lineWidth = Math.max(1, s * 0.12);
      }
      // Banquillos, área técnica y monitor del VAR
      for (const i of [0, 1]) {
        const bx = L / 2 + (i === 0 ? -19 : 7);
        c.fillStyle = 'rgb(10 20 15 / 0.85)'; c.fillRect(X(bx), Y(BENCH_Y - 1.4), 12 * s, 2.6 * s);
        c.strokeStyle = 'rgb(255 255 255 / 0.25)'; c.strokeRect(X(bx), Y(BENCH_Y - 1.4), 12 * s, 2.6 * s);
        c.setLineDash([3, 3]); c.strokeStyle = 'rgb(255 255 255 / 0.3)';
        c.strokeRect(X(bx - 1), Y(TECH_Y - 1.4), 14 * s, 2.9 * s);
        c.setLineDash([]);
        // Suplentes sentados
        const bench = this.m.teams[i].bench;
        const r0 = Math.max(2.2, 0.55 * s);
        bench.slice(0, 9).forEach((pid, k) => {
          c.beginPath(); c.arc(X(bx + 0.9 + k * 1.3), Y(BENCH_Y), r0, 0, 6.283);
          c.fillStyle = this.colors[i].main; c.globalAlpha = 0.75; c.fill(); c.globalAlpha = 1;
        });
      }
      c.fillStyle = '#1d2a33'; c.fillRect(X(L / 2 + 1.2), Y(Wd + 0.8), 1.6 * s, 1.1 * s);
      if (this.monitor && this.monitor > this.t) { c.fillStyle = '#5db8ff'; c.fillRect(X(L / 2 + 1.35), Y(Wd + 0.95), 1.3 * s, 0.8 * s); }
      }
      // Sombras y personas, de arriba abajo
      const R = Math.max(4.2, 1.5 * s);
      const people = [];
      for (const id in this.A) people.push(this.A[id]);
      for (const a of this.leaving) people.push(a);
      people.push(this.ref, this.fourth, ...this.ars, ...this.coaches, ...this.medics);
      if (this.m.min >= 46) this.warm.forEach(ws => people.push(...ws));
      people.sort((a, b) => a.y - b.y);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const a of people) this._person(a, X, Y, R, s);
      // Barrera marcada con el espray
      // Balón (sombra en el suelo, balón a su altura)
      const b = this.ball;
      const br = Math.max(2.6, 0.62 * s) * (1 + b.z * 0.07);
      c.beginPath(); c.ellipse(X(b.x) + b.z * 0.25 * s, Y(b.y) + br * 0.5, br * (1 - Math.min(0.5, b.z * 0.05)), br * 0.42, 0, 0, 6.283);
      c.fillStyle = `rgb(0 0 0 / ${0.38 - Math.min(0.25, b.z * 0.03)})`; c.fill();
      const fast = b.trail.length > 3 && Math.hypot(b.trail[b.trail.length - 1][0] - b.trail[0][0], b.trail[b.trail.length - 1][1] - b.trail[0][1]) > 2.2;
      if (fast) {
        c.beginPath();
        b.trail.forEach(([x, y, z], k) => { const px = X(x), py = Y(y) - z * s * 0.9; k ? c.lineTo(px, py) : c.moveTo(px, py); });
        c.strokeStyle = 'rgb(255 255 255 / 0.35)'; c.lineWidth = br; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt';
      }
      c.beginPath(); c.arc(X(b.x), Y(b.y) - b.z * s * 0.9, br, 0, 6.283); c.fillStyle = '#ffffff'; c.fill();
      c.lineWidth = 1; c.strokeStyle = '#1a1a1a'; c.stroke();
      c.beginPath(); c.arc(X(b.x) - br * 0.25, Y(b.y) - b.z * s * 0.9 - br * 0.2, br * 0.35, 0, 6.283); c.fillStyle = '#2b2b2b'; c.fill();
      // Nombre del que lleva el balón
      if (b.owner != null && this.A[b.owner] && !b.path) {
        const a = this.A[b.owner];
        const name = this.P(b.owner).short;
        c.font = `600 ${Math.max(10, Math.round(R * 1.05))}px Barlow, sans-serif`;
        const tw = c.measureText(name).width + 8;
        const x = X(a.x), y = Y(a.y) + R + 9;
        c.fillStyle = 'rgb(0 0 0 / 0.62)';
        c.fillRect(x - tw / 2, y - 7, tw, 14);
        c.fillStyle = '#fff';
        c.fillText(name, x, y);
      }
      // Avisos sobre jugadores (tarjetas, asistencias)
      this.fx = this.fx.filter(f => f.until > this.t);
      for (const f of this.fx) {
        const a = this.A[f.pid] || this.leaving.find(l => l.pid === f.pid); if (!a) continue;
        const x = X(a.x), y = Y(a.y) - R * 2.5 + Math.sin(this.t * 9) * 1.5;
        if (f.icon === 'yellow' || f.icon === 'red') this._card(x, y, R, f.icon === 'red' ? '#ff4040' : '#ffd23f');
        else if (f.icon === 'med') { const q = R * 0.75; c.fillStyle = '#ff5a5a'; c.beginPath(); c.roundRect ? c.roundRect(x - q, y - q, q * 2, q * 2, q * 0.5) : c.rect(x - q, y - q, q * 2, q * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(x - q * 0.18, y - q * 0.6, q * 0.36, q * 1.2); c.fillRect(x - q * 0.6, y - q * 0.18, q * 1.2, q * 0.36); }
      }
      // Tablilla del cuarto árbitro
      if (this.board && this.board.until > this.t) {
        const x = X(this.fourth.x), y = Y(this.fourth.y) - R * 3;
        c.fillStyle = '#111'; c.fillRect(x - R * 2.2, y - R, R * 4.4, R * 2);
        c.font = `800 ${Math.round(R * 1.2)}px Barlow Condensed, sans-serif`;
        c.fillStyle = '#ff5050'; c.fillText(String(this.board.outN || ''), x - R, y);
        c.fillStyle = '#5dff7a'; c.fillText(String(this.board.inN || ''), x + R, y);
      }
      // Focos en los partidos nocturnos
      if (night) {
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [fx, fy] of [[-4, -9], [L + 4, -9], [-4, Wd + 3], [L + 4, Wd + 3]]) {
          const g = c.createRadialGradient(X(fx), Y(fy), 0, X(fx), Y(fy), 55 * s);
          g.addColorStop(0, 'rgb(255 248 220 / 0.16)'); g.addColorStop(1, 'rgb(255 248 220 / 0)');
          c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
        }
        c.restore();
        for (const [fx, fy] of [[-4, -9], [L + 4, -9], [-4, Wd + 3], [L + 4, Wd + 3]]) { c.fillStyle = '#fffbe6'; c.fillRect(X(fx) - 3, Y(fy) - 2, 6, 4); }
      }
      this._weatherFx(real);
      // Rótulo
      if (this.banner && this.banner.until > this.t) {
        const bn = this.banner;
        const age = this.t - bn.born;
        const scale = Math.min(1, 0.6 + age * 4) * (bn.big ? 1 + Math.sin(age * 12) * 0.035 : 1);
        const alpha = Math.min(1, (bn.until - this.t) * 3);
        c.save();
        c.globalAlpha = alpha;
        c.translate(this.w / 2, this.h * (bn.big ? 0.5 : 0.18));
        c.scale(scale, scale);
        const fs = bn.big ? Math.min(58, this.h * 0.2, this.w / Math.max(6, bn.text.length) * 1.5) : Math.min(24, this.h * 0.1);
        c.font = `italic 800 ${fs}px Barlow Condensed, sans-serif`;
        const tw = c.measureText(bn.text).width + fs;
        c.fillStyle = 'rgb(8 17 13 / 0.8)';
        c.beginPath(); c.roundRect ? c.roundRect(-tw / 2, -fs * 0.72, tw, fs * 1.44, 12) : c.rect(-tw / 2, -fs * 0.72, tw, fs * 1.44); c.fill();
        c.fillStyle = bn.color;
        c.fillText(bn.text, 0, 2);
        c.restore();
      }
      // Corte de realización
      if (this.cutAt != null && this.t - this.cutAt < 0.25) {
        c.fillStyle = `rgb(255 255 255 / ${0.35 * (1 - (this.t - this.cutAt) / 0.25)})`;
        c.fillRect(0, 0, this.w, this.h);
      }
      // Cámara lenta: viñeta
      if (this.slow < 0.9) {
        const g = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.3, this.w / 2, this.h / 2, this.w * 0.7);
        g.addColorStop(0, 'rgb(0 0 0 / 0)'); g.addColorStop(1, `rgb(0 0 0 / ${0.45 * (1 - this.slow)})`);
        c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
      }
    }

    /**
     * Estadio dibujado (prueba): la imagen en perspectiva se endereza una vez a vista cenital, de modo que el
     * rectángulo del campo encaja con los metros del 2D. Se activa con ?campo=arte (y se recuerda).
     */
    _artCv() {
      if (!ART.on || !TL.StadiumGL) return null;
      const g = this.tilt || (this.tilt = { x: 0, y: 0, tx: 0, ty: 0 });
      g.x += (g.tx - g.x) * 0.08; g.y += (g.ty - g.y) * 0.08;
      return TL.StadiumGL.render({ VIEW, L, Wd, t: this.t, tilt: g, time: this.st.time, weather: this.st.weather });
    }

    _drawLoading() {
      const c = this.cx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = '#0b1611'; c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = 'rgb(255 255 255 / 0.75)'; c.font = '600 14px Barlow, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const dots = '.'.repeat(1 + (Math.floor(performance.now() / 400) % 3));
      c.fillText((TL.t ? TL.t('Preparando el estadio') : 'Preparando el estadio') + dots, this.w / 2, this.h / 2);
    }

    /** Lluvia, nieve o calor (ondas y destellos del sol en la lente), sobre todo lo demás. */
    _weatherFx(real) {
      const w = this.st.weather, c = this.cx, W = this.w, H = this.h;
      if (!w || w === 'despejado' || w === 'nublado') return;
      const P = this.wfx || (this.wfx = []);
      const n = w === 'lluvia' ? 170 : w === 'nieve' ? 130 : 0;
      while (P.length < n) P.push({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 0.6, ph: Math.random() * 6 });
      const k = Math.min(0.05, real) * Math.max(1, this.rate());
      if (w === 'lluvia') {
        c.strokeStyle = 'rgb(200 220 255 / 0.45)'; c.lineWidth = 1; c.beginPath();
        for (const d of P) {
          d.y += 900 * d.z * k; d.x -= 160 * d.z * k;
          if (d.y > H) { d.y = -10; d.x = Math.random() * W * 1.2; }
          c.moveTo(d.x, d.y); c.lineTo(d.x + 4 * d.z, d.y - 16 * d.z);
        }
        c.stroke();
        c.fillStyle = 'rgb(20 30 45 / 0.12)'; c.fillRect(0, 0, W, H);
      } else if (w === 'nieve') {
        c.fillStyle = 'rgb(255 255 255 / 0.7)';
        for (const d of P) {
          d.y += 40 * d.z * k; d.x += Math.sin(this.t + d.ph) * 18 * k;
          if (d.y > H) { d.y = -5; d.x = Math.random() * W; }
          c.beginPath(); c.arc(d.x, d.y, 0.5 + 0.9 * d.z, 0, 6.283); c.fill();
        }
      } else if (w === 'calor') {
        // Destello del sol en la lente: un brillo en la esquina y círculos que se mueven con él
        const t = this.t, sx = W * (0.88 + Math.sin(t * 0.05) * 0.04), sy = H * 0.06;
        const g = c.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55);
        g.addColorStop(0, 'rgb(255 240 190 / 0.45)'); g.addColorStop(1, 'rgb(255 200 120 / 0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        [[0.35, 0.05, '255 210 140'], [0.7, 0.035, '170 220 255'], [1.15, 0.06, '255 170 120'], [1.45, 0.02, '200 255 200']].forEach(([f, r, col]) => {
          const x = sx + (cx - sx) * f * 2, y = sy + (cy - sy) * f * 2, rr = H * r * (1 + 0.15 * Math.sin(t * 1.3 + f * 5));
          c.fillStyle = `rgb(${col} / 0.16)`; c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill();
        });
        // Cáustica: bandas de luz que ondulan despacio
        c.globalAlpha = 0.07;
        for (let i = 0; i < 6; i++) { c.fillStyle = '#fff6d0'; const yy = (H * (i / 6) + t * 14) % H; c.fillRect(0, yy + Math.sin(t * 2 + i) * 6, W, 3); }
        c.restore();
      }
    }

    /** Gotas de sudor: caen desde la frente y se desvanecen; más y más seguidas cuanto más cansado. */
    _sweat(x, y, r, e, seed) {
      const c = this.cx, n = e < 0.45 ? 2 : 1, phi = 0.982;
      for (let k = 0; k < n; k++) {
        const ph = (this.t * (0.8 + (0.6 - e) * 2.2) + seed + k * 0.5) % 1;
        const side = k % 2 ? -1 : 1;
        const dx = x + side * r * (0.8 + ph * 0.15), dy = y - r * 0.9 + ph * r * 1.15;
        const s = Math.max(1.3, r * 0.22) * (1 - ph * 0.25);
        c.globalAlpha = (1 - ph) * 0.95;
        c.fillStyle = '#8fdcff';
        c.beginPath(); c.moveTo(dx, dy - s * 1.8);
        c.arc(dx, dy, s, -Math.PI / 2 + phi, Math.PI * 1.5 - phi); c.closePath(); c.fill();
        c.fillStyle = 'rgb(255 255 255 / 0.85)';
        c.beginPath(); c.arc(dx - s * 0.32, dy - s * 0.1, s * 0.3, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
    }

    /** Aura (limit break, almas): estela de imágenes residuales al moverse, halo que late y llamitas que suben. */
    _aura(a, X, Y, x, y, r, au, upright) {
      const c = this.cx, t = this.t, LIFE = 0.7;
      // Estela: imágenes residuales de las últimas posiciones (en coordenadas del campo)
      const tr = a._tr || (a._tr = []);
      const last = tr[tr.length - 1];
      if (!last || Math.hypot(last[0] - a.x, last[1] - a.y) > 0.45) { tr.push([a.x, a.y, t]); if (tr.length > 10) tr.shift(); }
      while (tr.length && t - tr[0][2] > LIFE) tr.shift();
      for (let k = 0; k < tr.length - 1; k++) {
        const age = (t - tr[k][2]) / LIFE;
        c.globalAlpha = Math.max(0, (1 - age) * 0.55 * ((k + 1) / tr.length));
        c.fillStyle = k % 2 ? au.c2 : au.c;
        c.beginPath(); c.arc(X(tr[k][0]), Y(tr[k][1]), r * (1 - age * 0.3), 0, 6.283); c.fill();
      }
      // Halo que late
      const pulse = 0.5 + 0.5 * Math.sin(t * 6 + (a.bob || 0));
      const R2 = r * (2.3 + 0.55 * pulse);
      const g = c.createRadialGradient(x, y, r * 0.7, x, y, R2);
      g.addColorStop(0, hexA(au.c, 0.8)); g.addColorStop(0.5, hexA(au.c2, 0.35)); g.addColorStop(1, hexA(au.c2, 0));
      c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(x, y, R2, 0, 6.283); c.fill();
      // Anillo de energía que gira
      c.lineWidth = Math.max(1.2, r * 0.16); c.strokeStyle = hexA(au.c, 0.55 + 0.35 * pulse);
      c.beginPath(); c.arc(x, y, r * (1.35 + 0.15 * pulse), t * 3, t * 3 + 4.4); c.stroke();
      // Llamitas que suben
      if (upright) for (let k = 0; k < 8; k++) {
        const ph = (t * 1.6 + k / 8 + (a.bob || 0)) % 1, ang = k * 0.785 + Math.sin(t * 3 + k) * 0.35;
        c.globalAlpha = (1 - ph) * 0.9;
        c.fillStyle = k % 3 ? au.c : '#ffffff';
        c.beginPath(); c.arc(x + Math.cos(ang) * r * 1.15 * (1 - ph * 0.4), y - r * 0.3 - ph * r * 2.4 + Math.sin(ang) * r * 0.35, Math.max(0.9, r * 0.22 * (1 - ph)), 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
    }

    _card(x, y, R, color) {
      const c = this.cx;
      c.save(); c.translate(x, y); c.rotate(-0.15);
      c.fillStyle = color; c.fillRect(-R * 0.5, -R * 0.75, R, R * 1.5);
      c.strokeStyle = 'rgb(0 0 0 / .45)'; c.lineWidth = 1; c.strokeRect(-R * 0.5, -R * 0.75, R, R * 1.5);
      c.restore();
    }

    _person(a, X, Y, R, s) {
      const c = this.cx;
      const x = X(a.x), y0 = Y(a.y);
      let y = y0;
      if (a.kind === 'pl') {
        const i = a.team;
        const gk = this.isGK(a);
        let col = gk ? this.colors[i].gk : this.colors[i].main;
        const e = this.energy(a);
        const upright = !['down', 'sit', 'slide', 'dive'].includes(a.state) && !a.leave;
        // Jadeo: los cansados «respiran» (más rápido y más hondo cuanto peor van)
        let r = R;
        if (upright && e < 0.72) r = R * (1 + Math.sin(this.t * (5 + (0.72 - e) * 14) + a.bob) * (0.02 + (0.72 - e) * 0.12));
        // Saltos: celebración, remate de cabeza
        if (a.state === 'celebrate') y -= Math.abs(Math.sin(this.t * 9 + a.bob)) * R * 0.7;
        if (a.jump && this.t - a.jump < 0.5) y -= Math.sin((this.t - a.jump) / 0.5 * Math.PI) * R * 1.1;
        const sad = a.state === 'sad';
        const au = this.aura[a.pid];
        if (au && !a.leave) this._aura(a, X, Y, x, y, r, au, upright);
        c.globalAlpha = a.leave ? 0.7 : sad ? 0.8 : 1;
        // Sombra
        c.beginPath(); c.ellipse(x + 1, y0 + r * 0.85, r * 0.95, r * 0.35, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.28)'; c.fill();
        const sh = new Path2D();
        if (a.state === 'down' || a.state === 'sit') sh.ellipse(x, y + r * 0.3, r * 1.35, r * 0.62, a.fall || 0.3, 0, 6.283);
        else if (a.state === 'slide') { const ang = Math.atan2(a.vy, a.vx); sh.ellipse(x, y, r * 1.6, r * 0.7, ang, 0, 6.283); }
        else if (a.state === 'dive') sh.ellipse(x, y, r * 0.7, r * 1.7, 0, 0, 6.283);
        else sh.arc(x, y, sad ? r * 0.9 : r, 0, 6.283);
        c.fillStyle = col; c.fill(sh);
        if (!gk) { c.save(); c.clip(sh); this._kitPattern(this.colors[i], x, y, r); c.restore(); }
        const carrier = this.ball.owner === a.pid;
        c.lineWidth = carrier ? 2.4 : 1.4;
        c.strokeStyle = carrier ? '#b8f53d' : a.state === 'celebrate' ? '#ffffff' : (i === this.me ? '#ffffff' : 'rgb(0 0 0 / 0.55)');
        c.stroke(sh);
        if (a.state !== 'down' && a.state !== 'sit' && a.state !== 'slide' && a.state !== 'dive') {
          const inkCol = gk ? this.colors[i].gkInk : this.colors[i].ink, dark = inkCol === '#111';
          c.fillStyle = inkCol;
          c.font = `700 ${Math.round(r * 1.05)}px Barlow Condensed, sans-serif`;
          c.shadowColor = dark ? 'rgb(255 255 255 / 0.65)' : 'rgb(0 0 0 / 0.8)'; c.shadowBlur = 3;
          // Halo del dorsal: un contorno suave en todos, algo más marcado en camisetas con dibujo (rayas, cuadros…)
          const patt = !gk && this.colors[i].p;
          c.lineJoin = 'round'; c.lineWidth = Math.max(patt ? 1.9 : 1.4, r * (patt ? 0.36 : 0.26));
          c.strokeStyle = dark ? `rgb(255 255 255 / ${patt ? 0.9 : 0.7})` : `rgb(0 0 0 / ${patt ? 0.8 : 0.6})`;
          c.strokeText(String(this.num[a.pid] || ''), x, y + 0.5);
          c.fillText(String(this.num[a.pid] || ''), x, y + 0.5);
          c.shadowBlur = 0;
        }
        if (a.state === 'down') {
          // Estrellitas del golpe
          for (let k = 0; k < 3; k++) { const ang = this.t * 5 + k * 2.1; c.fillStyle = '#ffd23f'; c.fillRect(x + Math.cos(ang) * r * 1.2, y - r * 0.9 + Math.sin(ang) * r * 0.4, 2, 2); }
        }
        // Cansancio: medidor de aire bajo el jugador (solo en los que van justos) y gotas de sudor
        if (upright && e < 0.66) {
          const a0 = Math.PI * 0.2, span = Math.PI * 0.6, rr = r + Math.max(2.4, r * 0.34);
          c.lineCap = 'round'; c.lineWidth = Math.max(1.6, r * 0.2);
          c.strokeStyle = 'rgb(0 0 0 / 0.38)'; c.beginPath(); c.arc(x, y, rr, a0, a0 + span); c.stroke();
          const frac = clamp((e - 0.25) / 0.41, 0.06, 1);
          c.strokeStyle = e > 0.5 ? '#ffc247' : '#ff5d5d';
          c.beginPath(); c.arc(x, y, rr, a0 + span * (1 - frac) / 2, a0 + span * (1 + frac) / 2); c.stroke();
          c.lineCap = 'butt';
        }
        if (upright && e < 0.6) this._sweat(x, y, r, e, a.bob);
        c.globalAlpha = 1;
        return;
      }
      if (a.kind === 'ref' || a.kind === 'ar' || a.kind === '4th') {
        const r = a.kind === 'ref' ? R * 0.82 : R * 0.7;
        c.beginPath(); c.ellipse(x + 1, y0 + r * 0.85, r * 0.9, r * 0.33, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.fill();
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = this.refCol || '#121212'; c.fill();
        c.lineWidth = 1.6; c.strokeStyle = '#e8ff3a'; c.stroke();
        if (a.kind === 'ar') {
          const up = a.flag && a.flag > this.t;
          c.fillStyle = up ? '#ffd23f' : '#ff5a3d';
          if (up) { c.fillRect(x + r * 0.3, y - r * 2.6, r * 1.1, r * 0.8); c.fillStyle = '#ddd'; c.fillRect(x + r * 0.2, y - r * 2.6, 1.2, r * 1.9); }
          else c.fillRect(x + r * 0.6, y - r * 0.2, r * 0.7, r * 0.5);
        }
        if (a.kind === 'ref' && a.state === 'card' && a.until > this.t) this._card(x + r * 0.2, y - R * 2.2, R, a.card === 'red' ? '#ff4040' : '#ffd23f');
        if (a.kind === 'ref' && a.state === 'point' && a.until > this.t) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + R * 1.6 * (this.dir[0] > 0 ? 1 : -1), y - R * 0.6); c.stroke(); }
        if (a.kind === 'ref' && a.state === 'wave' && a.until > this.t) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; const sw = Math.sin(this.t * 12) * R; c.beginPath(); c.moveTo(x - sw, y - R * 1.2); c.lineTo(x + sw, y - R * 1.2); c.stroke(); }
        return;
      }
      if (a.kind === 'coach') {
        const r = R * 0.85;
        if (a.state === 'jump' && a.until > this.t) y -= Math.abs(Math.sin(this.t * 10)) * R;
        c.beginPath(); c.ellipse(x + 1, y0 + r * 0.85, r * 0.9, r * 0.33, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.fill();
        c.beginPath(); c.arc(x, y, r, 0, 6.283);
        c.fillStyle = a.team === this.me ? '#f4f4f0' : '#2b3a33'; c.fill();
        c.lineWidth = 2.2; c.strokeStyle = a.team === this.me ? '#b8f53d' : this.colors[a.team].main; c.stroke();
        if (a.state === 'wave' && a.until > this.t) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; const sw = Math.sin(this.t * 10) * r * 1.2; c.beginPath(); c.moveTo(x - r, y - r * 0.4); c.lineTo(x - r * 1.6, y - r * 1.4 + sw * 0.4); c.moveTo(x + r, y - r * 0.4); c.lineTo(x + r * 1.6, y - r * 1.4 - sw * 0.4); c.stroke(); }
        if (a.state === 'sad' && a.until > this.t) { c.fillStyle = 'rgb(0 0 0 / 0.35)'; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
        if (a.team === this.me) {
          c.font = `800 ${Math.max(9, Math.round(R * 0.95))}px Barlow Condensed, sans-serif`;
          c.fillStyle = '#b8f53d'; c.fillText(TL.t ? TL.t('TÚ') : 'TÚ', x, y - r * 2);
        }
        return;
      }
      if (a.kind === 'med') {
        const r = R * 0.75;
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = '#ffffff'; c.fill();
        c.fillStyle = '#e53935'; c.fillRect(x - r * 0.15, y - r * 0.6, r * 0.3, r * 1.2); c.fillRect(x - r * 0.6, y - r * 0.15, r * 1.2, r * 0.3);
        return;
      }
      if (a.kind === 'warm') {
        const r = R * 0.75;
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = this.colors[a.team].main; c.globalAlpha = 0.6; c.fill(); c.globalAlpha = 1;
        c.lineWidth = 1.2; c.strokeStyle = '#ff9a3d'; c.stroke(); // peto de calentamiento
      }
    }
  }

  /** '#rrggbb' + transparencia → rgba(). */
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  TL.Pitch = Pitch;
})();
