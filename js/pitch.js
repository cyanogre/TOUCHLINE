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
  // Lo que cubre el estadio dibujado (campo, gradas y público): la cámara puede ir hasta ahí
  const ART_VIEW = { x0: -21, x1: 126, y0: -16.5, y1: 82.5 };
  try {
    const q = new URLSearchParams(location.search).get('campo');
    if (q) localStorage.setItem('touchline.campo', q === 'arte' ? '1' : '0');
    ART.on = localStorage.getItem('touchline.campo') !== '0';
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

  // Anuncios de las vallas (marcas inventadas, con guasa)
  const ADS = ['CERVEZAS EL PALO · LA QUE ENTRA SIN VAR', 'SEGUROS FUERA DE JUEGO · TE CUBRIMOS HASTA EL MINUTO 90+7', 'BOCADILLOS EL DESCANSO · 15 MINUTOS DE FELICIDAD',
    'GAFAS PARA ÁRBITROS · ÓPTICA PITAZO', 'APP DE APUESTAS NO · MEJOR VEN AL CAMPO CON TU GENTE', 'PIPAS LA GRADA · LAS DE TODA LA VIDA',
    'GIMNASIO REMONTADA · ABIERTO HASTA EL 90', 'PELUQUERÍA EL CRACK · CORTES DE CRACK, PRECIO DE CANTERA', 'TAXI CONTRAGOLPE · LLEGAMOS ANTES QUE EL LATERAL',
    'AGENCIA DE VIAJES LA PRÓRROGA', 'CHURROS EL PALO LARGO', 'BANCO LA CANTERA · INVERTIMOS EN TU FUTURO', 'ROPA TÉRMICA EL BANQUILLO · PARA LOS QUE ESPERAN SU OPORTUNIDAD',
    'ACADEMIA DE IDIOMAS · APRENDE A PROTESTAR AL ÁRBITRO EN 5 LENGUAS', 'MUDANZAS EL MERCADO DE INVIERNO', 'PIZZAS TIKI-TAKA · REPARTO AL PRIMER TOQUE'];

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
      this.warm = [0, 1].map(i => [0, 1, 2].map(k => actor('warm', i === 0 ? 14 + k * 3 : L - 14 - k * 3, Wd + 3.8, { team: i, k })));
      this.medics = [];
      this.boys = [];        // recogepelotas
      this.spare = [];       // balones viejos que se quedan fuera hasta que alguien los recoge
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
      if (this.st.name) this._banner(this.st.name + ' · ' + this.st.hour, '#ffffff', 2.6);
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
      // Arrastrar: la cámara se mueve libre (para ver la grada); con la rueda o pellizco, zoom
      this.cv.addEventListener('pointerdown', e => { this._drag = { x: e.clientX, y: e.clientY, moved: false }; if (this.pan) this.pan.down = true; });
      this.cv.addEventListener('pointermove', e => {
        const d = this._drag; if (!d || this.cv.closest('.mini') || e.buttons === 0 && e.pointerType === 'mouse') return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        d.moved = true; d.x = e.clientX; d.y = e.clientY;
        const s = this.sc * this.cam.z, P = this.pan || (this.pan = { x: 0, y: 0, at: 0 });
        P.x = clamp(P.x - dx / s, -60, 60); P.y = clamp(P.y - dy / s, -40, 40); P.at = this.t; P.down = true;
      });
      const up = () => { this._drag = null; if (this.pan) { this.pan.down = false; this.pan.at = this.t; } };
      this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
      this.cv.addEventListener('pointerleave', () => { if (this.tilt) this.tilt.tx = this.tilt.ty = 0; });
      this.cv.addEventListener('pointerup', e => { if (e.pointerType === 'touch' && this.tilt) this.tilt.tx = this.tilt.ty = 0; });
      this.cv.style.touchAction = 'none';
      this.cv.addEventListener('wheel', e => {
        if (this.cv.closest('.mini')) return;
        e.preventDefault();
        this.setZoom((this.zoom || 1) * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      }, { passive: false });
      const touches = new Map();
      let pinch0 = null;
      this.cv.addEventListener('touchstart', e => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch0 = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: this.zoom || 1 }; } }, { passive: true });
      this.cv.addEventListener('touchmove', e => {
        if (e.touches.length !== 2 || !pinch0) return;
        e.preventDefault();
        const [a, b] = e.touches; this.setZoom(pinch0.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch0.d);
      }, { passive: false });
      this.cv.addEventListener('touchend', () => { pinch0 = null; touches.clear(); });
      this._resize = () => this.resize();
      window.addEventListener('resize', this._resize);
      this.resize();
      this._last = performance.now();
      this._loop = this._loop.bind(this);
      this.raf = requestAnimationFrame(this._loop);
    }

    /** Zoom de la cámara (1 = campo entero; más, sigue el balón). */
    setZoom(z) {
      this.zoom = clamp(z, ART.on ? 0.8 : 1, 3);
      if (this.onZoom) this.onZoom(this.zoom);
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
        // Del tiempo, de momento solo la lluvia (pixelada); el resto queda despejado
        weather: this.m.weather || 'despejado',
        hour: (this.S.week * 7 + home.id) % 3 === 0 ? ['20:00', '21:00', '21:15'][h % 3] : (this.S.week * 5 + home.id) % 3 === 0 ? ['17:30', '18:30', '19:00'][h % 3] : ['12:00', '14:00', '16:15'][h % 3]
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
      // Para el filtro CRT: la capa encaja justo encima del lienzo
      const box = this.cv.parentElement;
      if (box) { box.style.setProperty('--crt-x', this.cv.offsetLeft + 'px'); box.style.setProperty('--crt-y', this.cv.offsetTop + 'px'); box.style.setProperty('--crt-w', r.width + 'px'); box.style.setProperty('--crt-h', r.height + 'px'); }
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
      // Suplentes calentando detrás de las vallas de la banda de enfrente, cada equipo en su mitad:
      // trote de ida y vuelta, algún sprint, desplazamientos laterales y estiramientos. Cuantos más cambios
      // le quedan al equipo y más avanzado el partido, más gente calentando (y más intensidad si hay un cambio cerca)
      const t = this.t;
      this.warm.forEach((ws, i) => ws.forEach(w => {
        const tm = this.m.teams[i], left = (tm.maxSubs || 5) - (tm.subs || 0);
        w.on = left > 0 && w.k < Math.min(left, (this.m.min || 0) >= 60 ? 3 : (this.m.min || 0) >= 30 ? 2 : 1);
        const x0 = i === 0 ? 12 + w.k * 4 : L - 12 - w.k * 4, ph = (t * 0.35 + w.k * 2.1) % 6;
        const hot = this.subSoon === i;
        if (ph < 3.6 || hot) { w.tx = x0 + Math.sin(t * (hot ? 0.9 : 0.55) + w.k * 1.7) * 7; w.ty = Wd + 3.8 + w.k * 0.7; w.run = hot ? 0.75 : ph > 2.8 ? 0.85 : 0.35; w.state = null; }
        else if (ph < 4.8) { w.tx = w.x; w.ty = Wd + 3.8 + w.k * 0.7 + Math.sin(t * 3 + w.k) * 0.8; w.run = 0.3; }   // lateral
        else { w.tx = w.x; w.ty = w.y; w.run = 0; w.state = 'stretch'; }
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
      if (a.kind === 'pl' && a.state !== 'walk') { gx = clamp(gx, -2.5, L + 2.5); gy = clamp(gy, -2, Wd + 2); }   // nunca a la grada
      // El portero no abandona su zona: sin el balón en los pies, nunca más allá del borde del área (con un poco de margen)
      if (a.kind === 'pl' && this.ball.owner !== a.pid && this.isGK(a)) {
        const i = a.team, own = this.dir[i] > 0 ? 0 : L, dep = Math.abs(gx - own);
        if (dep > 19) gx = own + Math.sign(gx - own || this.dir[i]) * 19;
        gy = clamp(gy, Wd / 2 - 21, Wd / 2 + 21);
      }
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
      // Nadie atraviesa la portería: ni la red de atrás ni los laterales
      for (const a of all) {
        const dy = Math.abs(a.y - Wd / 2);
        if (dy < GW / 2 + 0.6) { if (a.x < 0.3) a.x = 0.3; if (a.x > L - 0.3) a.x = L - 0.3; }
        else if (dy < GW / 2 + 1.2 && (a.x < 0 || a.x > L)) a.y = Wd / 2 + Math.sign(a.y - Wd / 2) * (GW / 2 + 1.2);
      }
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
      if (this._outside(1) && !b.path && !this.place) { this.fetch = null; if (this.brain && this.brain._outCheck) this.brain._outCheck(); return; }
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
      const byA = o.by != null ? this.A[o.by] : null;
      if (!o.free && !b.path && !this._atBall() && !(byA && Math.hypot(byA.x - b.x, byA.y - b.y) < 3)) {
        const team = o.team != null ? o.team : this.poss;
        const cand = this.team(team);
        const k = (o.by != null && this.A[o.by]) || this.nearest(cand.length ? cand : Object.values(this.A), b);
        if (k) { this._fetch(k.pid, () => this._kick(tx, ty, Object.assign({}, o, { free: true }))); return; }
      }
      const kicker = b.owner != null ? this.A[b.owner] : this._atBall(2);
      if (kicker) { this.brain.kickTeam = kicker.team; this.brain.lastTouch = kicker.team; }
      if (kicker) this._lastKick = { pid: kicker.pid, team: kicker.team, t: this.t };
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
          // Velocidad con la que llega (para que bote y ruede en vez de caer en seco)
          const dl0 = Math.max(0.01, Math.hypot(p.tx - p.fx, p.ty - p.fy)), vh = p.ease === 'out' ? 0 : dl0 / p.T;
          const vzEnd = ((p.tz - p.fz) - 4 * p.h) / p.T;
          const settle = () => {
            if (b.path || b.owner != null || this.instant) return;
            if (this.netShake && this.netShake.until > this.t) return;      // dentro de la red se queda
            const k = b.z > 0.3 || vzEnd < -2 ? 0.45 : 0.6;                 // si viene del aire pierde más al botar
            const v = Math.min(14, vh * k);
            // Bote según la altura desde la que cae (caída libre), no según lo rápido que se dibujó la parábola
            const peak = Math.max(p.fz, p.tz) + p.h, vi = Math.sqrt(2 * 9.8 * Math.max(0.05, peak));
            const vz = b.z > 0.05 ? -vi * 0.7 : (peak > 0.4 ? Math.min(4.5, vi * 0.42) : 0);
            b.roll = { vx: (p.tx - p.fx) / dl0 * v, vy: (p.ty - p.fy) / dl0 * v, vz };
          };
          if (p.done) { p.done(); settle(); }
          else if (r && !this.beat && !this.script.length && Math.hypot(r.x - b.x, r.y - b.y) > 2.2) {
            // En juego abierto, si la receptora no ha llegado, el balón sigue su camino perdiendo fuerza
            const dl = Math.max(0.1, Math.hypot(p.tx - p.fx, p.ty - p.fy)), v = Math.min(7, dl / p.T * 0.4);
            b.z = 0; b.roll = { vx: (p.tx - p.fx) / dl * v, vy: (p.ty - p.fy) / dl * v };
          }
          else if (r) this._receive(p.to);
          else settle();
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
        b.roll.vx *= 1 - dt * (b.z > 0.05 ? 0.25 : 1.6); b.roll.vy *= 1 - dt * (b.z > 0.05 ? 0.25 : 1.6);
        // Botes: sube y baja con gravedad y en cada bote pierde fuerza
        if (b.roll.vz != null) {
          b.roll.vz -= 9.8 * dt; b.z += b.roll.vz * dt;
          if (b.z <= 0) { b.z = 0; b.roll.vz = b.roll.vz < -1.2 ? -b.roll.vz * 0.48 : 0; if (b.roll.vz) { b.roll.vx *= 0.82; b.roll.vy *= 0.82; } }
        } else b.z = Math.max(0, b.z - dt * 4);
        if (Math.hypot(b.roll.vx, b.roll.vy) < 0.4 && !b.roll.vz && b.z <= 0.01) b.roll = null;
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
        b.path = null; b.roll = null; b.x = x; b.y = y; b.z = 0; b.owner = to != null && this.A[to] ? to : null; b.trail = []; this._recCut = true;
        return;
      }
      const tk = to != null && this.A[to] ? this.A[to] : null;
      if (team == null) team = tk ? tk.team : this.poss;
      // Balón fuera del campo (o casi): el recogepelotas da uno nuevo en el sitio del saque. Así nadie va
      // andando a buscarlo detrás de la portería o a la grada mientras parece que no pasa nada.
      // Fuera de verdad (más allá de las líneas) y lejos del sitio del saque; los córners están en la línea
      const outside = b.x < -0.6 || b.x > L + 0.6 || b.y < -0.6 || b.y > Wd + 0.6;
      const boy = outside && !b.path && Math.hypot(b.x - x, b.y - y) > 3;
      if (boy) this._ballBoy(x, y);
      this.place = { x, y, to: tk ? tk.pid : null, team, phase: b.path ? 'land' : 'fetch', t0: this.t, rid: null, boy };
      b.owner = null; b.roll = null;
    }
    /**
     * Balón fuera del campo: el viejo se queda donde cayó, un recogepelotas lanza uno nuevo al sitio del saque
     * y otro va a por el viejo y se lo lleva. Así nada «vuelve solo».
     */
    _ballBoy(x, y) {
      const b = this.ball;
      this.spare.push({ x: b.x, y: b.y, t: this.t });
      // El que da el balón nuevo está en su puesto junto a la línea más cercana al saque, pero en el lado
      // contrario a por donde se fue el viejo: así el balón nuevo nunca viene de donde se perdió el otro
      const old0 = this.spare[this.spare.length - 1];
      const dG = Math.min(x, L - x), dT = Math.min(y, Wd - y);
      let bx, by;
      if (dG < dT) { bx = x < L / 2 ? -2.2 : L + 2.2; by = Wd / 2 + (old0.y > Wd / 2 ? -13 : 13); }
      else { by = y < Wd / 2 ? -1.6 : Wd + 1.6; bx = clamp(x + (old0.x > x ? -12 : 12), 2, L - 2); }
      const giver = actor('boy', bx, by, { until: this.t + 3.2 }); giver.tx = bx; giver.ty = by;
      giver.state = 'throw'; giver.throwAt = this.t;
      const old = this.spare[this.spare.length - 1];
      // Si ha caído en la grada, se lo queda la gente (nadie baja a por él): desaparece entre el público.
      // Si se ha quedado en la zona de fuera del campo, va a por él otro recogepelotas.
      const inStands = old.x < -5 || old.x > L + 5 || old.y < -4.5 || old.y > Wd + 4.5;
      if (inStands) { old.crowd = true; old.t = this.t; this.boys.push(giver); }
      else this.boys.push(giver, actor('boy', bx + (bx < 0 ? -1.5 : bx > L ? 1.5 : 3), by + (by < 0 ? -1 : by > Wd ? 1 : 0), { until: this.t + 7, fetch: old }));
      b.owner = null; b.roll = null; b.x = bx; b.y = by; b.z = 1.2;
      b.trail = []; this._bpL = null; this._bl = null; this._recCut = true;
      const d = Math.hypot(x - bx, y - by);
      b.path = { fx: bx, fy: by, fz: 1.2, tx: x, ty: y, tz: 0, h: Math.min(2.2, 0.6 + d * 0.06), T: clamp(d / 14, 0.45, 1.1), t: 0, to: null, curve: 0, nx: 0, ny: 0 };
    }
    _boysStep(dt) {
      if (!this.boys.length && !this.spare.length) return;
      for (const k of this.boys) {
        if (k.fetch) {
          const o = k.fetch;
          if (!o.taken) { k.tx = o.x; k.ty = o.y; k.run = 0.8; if (Math.hypot(k.x - o.x, k.y - o.y) < 0.8) o.taken = true; }
          else { k.tx = k.x < 0 ? -6 : k.x > L ? L + 6 : k.x; k.ty = k.y < Wd / 2 ? -6 : Wd + 6; k.run = 0.5; o.x = k.x; o.y = k.y; }
        } else { k.run = 0.4; }
        this._move(k, dt);
      }
      this.boys = this.boys.filter(k => k.until > this.t);
      this.spare = this.spare.filter(o => !(o.taken && !this.boys.some(k => k.fetch === o)) && this.t - o.t < (o.crowd ? 1.6 : 9));
    }

    _placeStep() {
      const P = this.place, b = this.ball;
      const done = () => {
        b.path = null; b.roll = null; b.x = P.x; b.y = P.y; b.z = 0; b.trail = []; this._recCut = true;
        b.owner = P.to != null && this.A[P.to] ? P.to : null;
        this.place = null;
      };
      if (this.instant) { done(); return; }   // saltos de tiempo, o seguro para no atascarse
      if (P.phase === 'land') {
        if (b.path) return;
        P.phase = 'fetch';
        // Balón nuevo del recogepelotas (una sola vez por reposición: nunca en bucle)
        if (!P.boy && (b.x < -0.6 || b.x > L + 0.6 || b.y < -0.6 || b.y > Wd + 0.6) && Math.hypot(b.x - P.x, b.y - P.y) > 3) { P.boy = true; this._ballBoy(P.x, P.y); P.phase = 'land'; return; }
      }
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
        r.tx = b.x; r.ty = b.y; r.run = 1;
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
    _outside(m) { const b = this.ball, k = m == null ? 0.2 : m; return b.x < -k || b.x > L + k || b.y < -k || b.y > Wd + k; }
    _contest() {
      const b = this.ball;
      // Fuera del campo: saque (banda, puerta o córner) en vez de ir a por él
      if (this._outside()) { if (this.brain && this.brain._outCheck) this.brain._outCheck(); return; }
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
        { d: 0.5, start: () => { this._placeBall(x, y, 1.1, gk.pid, i); this.poss = i; this.ov = { p: { [gk.pid]: { x: x - this.dir[i] * 1.2, y, run: 1 } } }; this.brain.restartBy(i, 'gk'); } },
        { d: 0.3, start: () => { this.ov = null; if (this.A[gk.pid]) { this.ball.owner = gk.pid; this.poss = i; } this.brain.ownTeam = i; this.brain.next = this.t + 0.5; } }
      ];
    }

    _kickTaker(i) {
      const fw = this.team(i).filter(a => F.LINE[this.slotOf(a)] >= 2).sort((p, q) => Math.abs(p.y - Wd / 2) - Math.abs(q.y - Wd / 2));
      return fw.length ? fw[0].pid : null;
    }

    _placeKickoff(i, teleport) {
      const b = this.ball;
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
      if (teleport) { b.x = L / 2; b.y = Wd / 2; b.z = 0; b.path = null; b.roll = null; b.owner = null; }
      else this._placeBall(L / 2, Wd / 2, 2, taker, i);
      return { p, taker };
    }

    _kickoffSeq(i) {
      let taker = null;
      return [
        { d: 1.6, start: () => { const k = this._placeKickoff(i, false); taker = k.taker; this.ov = { p: k.p }; this.refOv = { x: L / 2 - 6, y: Wd / 2 + 10, run: 0.5 }; this._clearStates(); this._cut(0.85, `Saque de centro · ${this.clubName(i)}`); } },
        { d: 0.05, waitHold: true },
        { d: 0.4, start: () => { this.ov = null; this.refOv = null; TL.SFX && !this.instant && TL.SFX.whistle(false); if (taker != null && this.A[taker]) this._receive(taker); } }
      ];
    }

    /** Corte de realización: como en la tele, la jugada a balón parado ya está colocada. */
    _cut(k, cap) {
      this._targets();
      this._officials();
      // Nadie se teletransporta: todos van a su sitio por su pie y la escena espera a que lleguen
      if (this.beat) this.beat.arrive = true;
      if (cap && !this.instant) this.lowerCap = { t: cap, at: performance.now() };
    }
    clubName(i) { const c = this.S.clubs[this.m.teams[i].club]; return c ? c.name : ''; }
    pName(pid) { const p = pid != null && this.S.players[pid]; return p ? p.short : ''; }

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
      this._cut(0.92, this._cap || null); this._cap = null;
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
      // Vigilante: ninguna escena puede quedarse esperando para siempre (un jugador que no llega al balón,
      // un balón que no acaba su vuelo…). Pasado su tiempo con margen, se da por hecha y el partido sigue.
      bt.wd = (bt.wd || 0) + dt; this._wdF = this.fetch; this._wdP = this.place; this._wdB = this.ball.path;
      if (bt.wd > (bt.d || 0) + (this.place || this.fetch ? 18 : 9)) {
        this.fetch = null;
        this.place = null;   // sin recolocar nada: el balón sigue donde está y el juego continúa desde ahí
        bt.t = Math.max(bt.t, bt.d || 0);
        TL.WD = (TL.WD || 0) + 1; (TL.WDlog || (TL.WDlog = [])).push({ d: bt.d, fetch: !!this._wdF, place: !!this._wdP, path: !!this._wdB, sc: this.script.length, q: this.queue.map(x => x.type).join(','), src: (bt.start ? bt.start.toString().slice(0, 90) : '') });
      }
      if (this.fetch) return true; // esperamos a que el jugador llegue al balón
      if (this.place) return true; // y a que el balón esté en su sitio para el balón parado
      bt.t += dt;
      if (bt.tick) bt.tick(dt, bt.t);
      const waitBall = bt.ball && this.ball.path && !(bt.wd > (bt.d || 0) + 9);
      const waitArr = bt.arrive && bt.wd < (bt.d || 0) + 5 && !this._arrived();
      if (!waitBall && !waitArr && bt.t >= (bt.d || 0)) {
        if (bt.end) bt.end();
        if (bt.slow) this.slowT = 1;
        this.beat = null;
        if (!this.script.length) this._afterScript();
      }
      return true;
    }
    /** ¿Han llegado (casi) todos a donde tienen que ir? */
    _arrived() {
      let n = 0, ok = 0;
      for (const id in this.A) { const a = this.A[id]; if (a.tx == null) continue; n++; if (Math.hypot(a.x - a.tx, a.y - a.ty) < 2.5) ok++; }
      return !n || ok / n > 0.85;
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
      this._natural(e, origin);
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

    /**
     * Motor bidireccional: antes de escenificar una ocasión, se mira el campo. Remata quien de verdad está en
     * situación (quien lleva el balón cerca del área, o la compañera mejor colocada) y el motor resuelve la ocasión
     * con esa jugadora y esa situación. Así nadie tiene que ir a buscar el balón a la otra punta.
     */
    _natural(e, origin) {
      if (!this.m || !this.m.recast || !e.re || e._recast || this.instant) return;
      const i = e.team, b = this.ball, gx = this.goalX(i);
      const car = b.owner != null ? this.A[b.owner] : null;
      const field = this.team(i).filter(a => !this.isGK(a) && a.state !== 'down');
      if (!field.length) return;
      let shooter = null, ass = null;
      const dG = a => Math.hypot(a.x - gx, a.y - Wd / 2);
      if (origin === 'corner' || origin === 'cross') {
        // Al remate va quien está en el área
        const [sx, sy] = this._shotSpot(i, e.shotType || 'header');
        shooter = field.filter(a => !car || a !== car).sort((p, q) => Math.hypot(p.x - sx, p.y - sy) - Math.hypot(q.x - sx, q.y - sy))[0];
        ass = car && car.team === i && car !== shooter ? car : null;
      } else if (car && car.team === i && !this.isGK(car) && dG(car) < 30) {
        shooter = car;
        const lk = this._lastKick;
        ass = lk && lk.team === i && lk.pid !== car.pid && this.t - lk.t < 6 && this.A[lk.pid] ? this.A[lk.pid] : null;
      } else {
        // La más adelantada y mejor situada; el pase se lo da quien lleva el balón
        shooter = field.filter(a => a !== car).sort((p, q) => dG(p) - dG(q))[0] || car;
        ass = car && car.team === i && car !== shooter ? car : null;
      }
      if (!shooter) return;
      // La situación del remate: si ya está rematando (con el balón cerca del área), la suya; si no, la del punto
      // al que va a llegar la jugada
      const now = shooter === car && dG(car) < 30;
      const [px, py] = now ? [shooter.x, shooter.y] : this._shotSpot(i, e.shotType || 'placed');
      let press = 0;
      for (const a of this.team(1 - i)) if (!this.isGK(a) && Math.hypot(a.x - px, a.y - py) < 3) press++;
      const d = Math.hypot(px - gx, py - Wd / 2), angle = clamp(1 - Math.abs(py - Wd / 2) / Math.max(1, d), 0, 1);
      // Con el balón en los pies no se remata de cabeza
      if (shooter === car && ['header', 'volley', 'tapin'].includes(e.shotType)) e.shotType = d > 22 ? 'long' : 'placed';
      this.m.recast(e, shooter.pid, ass ? ass.pid : null, { d, press, angle });
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
      // Supertiro (modo fantasía): carga con su nombre en grande, cámara lenta y el balón con su efecto y colores
      const sp = e.special && TL.Special ? TL.Special.get(e.special) : null;
      if (sp) {
        epic = true;
        beats.push({ d: 1.1, slow: 0.35, start: () => {
          const a = this.A[shooter];
          this.spTitle = { name: sp.name, c: sp.c, c2: sp.c2, at: performance.now() };
          if (TL.FX) TL.FX.flash && TL.FX.flash();
          if (!this.instant && TL.SFX) (TL.SFX.rec ? TL.SFX.rec('limit-break', TL.SFX.boom) : TL.SFX.boom && TL.SFX.boom());
          if (a) { if (sp.jump) a.jump = this.t; this.superAura = { pid: shooter, c: sp.c, c2: sp.c2, until: this.t + 2.6 }; }
          // Los de dos: el compañero más cercano salta con él
          if (sp.duo && a) { const m = this.nearest(this.team(i).filter(x => x.pid !== shooter && !this.isGK(x)), a); if (m) { m.jump = this.t; this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {}; this.ov.p[m.pid] = { x: a.x - this.dir[i] * 1.2, y: a.y + 0.8, run: 1 }; } }
        } });
      }
      beats.push({ d: 0.05, ball: true, slow: epic ? 0.45 : 1, start: () => {
        if (sp) { this.superFx = { id: sp.id, fx: sp.fx, c: sp.c, c2: sp.c2, until: this.t + 3, t0: this.t, x0: this.ball.x, y0: this.ball.y }; this.shock = { x: this.ball.x, y: this.ball.y, t: this.t, c: sp.c }; }
        const b = this.ball;
        if (air) { b.z = type === 'header' ? 1.9 : 0.8; const a = this.A[shooter]; if (a) { a.jump = this.t; } }
        else if (this.A[shooter]) this._receive(shooter);
        b.owner = null;
        const fz = b.z;
        if (outcome === 'goal') {
          const ty = Wd / 2 + side * U.rand(0.6, GW / 2 - 0.5);
          const tz = { header: U.rand(0.2, 1.4), chip: 1.6, long: U.rand(1.4, 2.2), power: U.rand(0.4, 1.8), volley: U.rand(0.5, 2), tapin: 0.2, placed: 0.25, fk: 2.05 }[type] || 0.8;
          if (gk) { gk.state = 'dive'; gk.dive = -side * dir; gk.until = this.t + 1.2; this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {}; this.ov.p[gk.pid] = { x: gx - dir * 1.2, y: Wd / 2 - side * 1.5, run: 1 }; }
          this._kick(gx + dir * 1.3, ty, { by: shooter, team: i, fz, tz, h: type === 'chip' ? 3.6 : type === 'long' ? 1.2 : type === 'fk' ? 1.5 : 0.2, T, curve: type === 'fk' ? side * 2.4 : type === 'placed' ? side * 0.6 : 0, done: () => {
            this.ball.roll = null; this.netShake = { x: gx, until: this.t + 0.7 }; this._goalT = this.t;
            if (e.type === 'goal') this._reveal(e);
          } });
        } else if (outcome === 'save' && (!gk || Math.hypot(gk.x - (gx - dir * 1.0), gk.y - Wd / 2) > 9)) {
          // El portero no llega (está lejos de su portería): el balón no puede quedarse parado delante de la red vacía.
          // Lo saca un defensa bajo palos si hay alguno cerca; si no, el remate se marcha fuera.
          this._gkFar = true;
          const ty = Wd / 2 + side * U.rand(0.5, GW / 2 - 0.6);
          const def = this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), { x: gx - dir * 1.2, y: ty });
          if (def && Math.hypot(def.x - gx, def.y - ty) < 12) {
            def.state = 'slide'; def.until = this.t + 0.8;
            this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {};
            this.ov.p[def.pid] = { x: gx - dir * 0.8, y: ty, run: 1 };
            this._kick(gx - dir * 0.9, ty, { by: shooter, team: i, fz, tz: air ? 0.8 : 0.4, h: 0.3, T, done: () => {
              this._kick(gx - dir * U.rand(4, 10), Math.random() < 0.5 ? -1 : Wd + 1, { free: true, h: 2.2, T: 0.8 });
              this._reveal(e);
            } });
          } else {
            const wy = Wd / 2 + side * U.rand(GW / 2 + 0.6, GW / 2 + 3);
            this._kick(gx + dir * U.rand(4, 9), wy, { by: shooter, team: i, fz, tz: 0.3, h: 0.6, T: T * 1.35, done: () => { this._reveal(e); } });
          }
        } else if (outcome === 'save') {
          const ty = Wd / 2 + side * U.rand(0.5, GW / 2 - 0.4);
          if (gk) {
            gk.state = 'dive'; gk.dive = side * dir; gk.until = this.t + 1.2;
            this.ov = this.ov || { p: {} }; this.ov.p = this.ov.p || {};
            this.ov.p[gk.pid] = { x: gx - dir * 1.0, y: ty, run: 1 };
          }
          this._kick(gx - dir * 1.0, ty, { by: shooter, team: i, fz, tz: air ? 0.8 : 0.4, h: type === 'chip' ? 3 : 0.3, T, done: () => { this._reveal(e); } });
        } else {
          const mk = e.miss || (air ? 'header' : 'wide');
          if (mk === 'blocked') {
            const blk = this.nearest(this.team(1 - i).filter(a => !this.isGK(a)), { x: lerp(this.ball.x, gx, 0.25), y: lerp(this.ball.y, Wd / 2, 0.25) });
            const [bx, by] = blk ? [blk.x, blk.y] : [lerp(this.ball.x, gx, 0.2), this.ball.y];
            if (blk) { blk.state = 'slide'; blk.until = this.t + 0.6; }
            this._kick(bx, by, { by: shooter, team: i, fz, tz: 0.5, h: 0.2, T: 0.22, done: () => { this._reveal(e); } });
          } else if (mk === 'post') {
            const ty = Wd / 2 + side * GW / 2;
            this._kick(gx, ty, { by: shooter, team: i, fz, tz: Math.random() < 0.4 ? 2.4 : 1, h: 0.3, T, done: () => { sfx && !this.instant && sfx.post && sfx.post(); this.postShake = { x: gx, until: this.t + 0.45 }; this._reveal(e); } });
          } else {
            // Fuera de verdad: por encima del larguero acaba en la grada de detrás de la portería; desviado, se
            // marcha rozando el palo hasta la zona de fuera del campo
            const over = mk === 'header' || mk === 'long' || Math.random() < 0.4;
            const ty = Wd / 2 + side * (over ? U.rand(0, GW / 2 + 3) : U.rand(GW / 2 + 1.2, GW / 2 + 9));
            const tx = gx + dir * (over ? U.rand(8, 14) : U.rand(4, 9));
            this._kick(tx, ty, { by: shooter, team: i, fz, tz: over ? 0.6 : 0.3, h: over ? 4.6 : 0.6, T: T * 1.35, done: () => { this._reveal(e); } });
          }
        }
        if (sp && this.ball.path) {
          const P = this.ball.path;
          if (sp.curve) P.curve = sp.curve;
          ({ catapulta: () => { P.h = Math.max(P.h, 4.5); }, halcon: () => { P.h = Math.max(P.h, 5); P.ease = 'in'; }, fenix: () => { P.h = Math.max(P.h, 3.5); },
            saeta: () => { P.T *= 0.55; P.h = 0.1; }, tigre: () => { P.T *= 0.75; P.h = 0.25; }, hoja: () => { P.h = Math.max(P.h, 3); },
            monstruo: () => { P.T *= 1.2; }, ego: () => { P.T *= 0.85; } }[sp.id] || (() => {}))();
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
          if (!this.instant) beats.push(this._replayBeat());
          if (e.type === 'goal' && this.queue[0] && this.queue[0].type === 'controversy') { this.queue.shift(); beats.push(this._protestBeat(1 - i, 1.6)); }
          beats.push(...this._kickoffSeq(1 - i));
        }
      } else if (outcome === 'save') {
        beats.push({ d: 0.9, start: () => {
          this.slowT = 1;
          const big = e.big || type === 'header' || epic;
          if (big) this._banner('¡PARADÓN!', '#5db8ff', 1.3, true);
          if (!this.instant && TL.SFX) { TL.SFX.chance(); if (big) TL.SFX.save(); }
          if (this._gkFar) { this._gkFar = false; return; }   // ya lo resolvió el defensa o se fue fuera
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
        this._cut(0.88, `Córner para el ${this.clubName(i)}`);
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
        this._cut(0.9, `Falta peligrosa · ${this.clubName(i)}`);
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
      const shot = this._take(x => ((x.type === 'goal' && x.kind === 'pen') || x.type === 'penmiss') && x.team === i);
      let cancel = null;
      if (!shot) for (let v; (v = this._take(x => x.type === 'var' && x.team === i));) { if (cancel) this._reveal(cancel); cancel = v; }
      // Si el balón está lejos del área (p. ej. en el otro campo), primero se corta (cortinilla) a la jugada
      // en el área rival: un penalti siempre nace de una acción cerca de la portería, no a 60 m del balón
      if (false) { this._cap = `Llega el ${this.clubName(i)} al área`; this._cutTo(i, 84, Wd / 2 + U.rand(-10, 10), victim); }
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
        const taker = shot && this.A[shot.pid] ? shot.pid : (this.team(i).filter(a => !this.isGK(a)).sort((a, c) => (this.P(c.pid).st[1] * 1.5 + this.P(c.pid).st[2] * 0.3) - (this.P(a.pid).st[1] * 1.5 + this.P(a.pid).st[2] * 0.3))[0] || {}).pid;
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
        this._cut(0.92, `Penalti para el ${this.clubName(i)}`);
      } });
      // Sin lanzamiento (el VAR lo anula): se avisa, se suelta a todos y saca el portero; nunca se queda todo parado
      if (!shot) beats.push({ d: 2, start: () => { if (cancel) this._reveal(cancel); this._banner(cancel ? 'VAR: NO HAY PENALTI' : 'SIGUE EL JUEGO', '#5db8ff', 1.8, true); this.monitor = this.t + 1.6; },
        end: () => { this.ov = null; this.refOv = null; const gk = this.gkOf(1 - i); if (gk) this._receive(gk.pid); } });
      this._seq(beats);
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
          if (goal) this._kick(gx + dir * 1.3, ty, { by: taker, team: i, fz: 0, tz: U.rand(0.2, 2), h: 0.3, T: 0.42, done: () => { this.netShake = { x: gx, until: this.t + 0.7 }; this._reveal(e); } });
          else if (saved) this._kick(gx - dir * 0.6, Wd / 2 + side * 2.4, { by: taker, team: i, fz: 0, tz: 0.6, h: 0.2, T: 0.4, done: () => { this._reveal(e); } });
          else this._kick(gx + dir * 2, Wd / 2 + side * U.rand(GW / 2 + 0.5, GW / 2 + 3), { by: taker, team: i, fz: 0, tz: Math.random() < 0.5 ? 3 : 0.5, h: 0.4, T: 0.45, done: () => { this._reveal(e); } });
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
      // Víctima: la del motor. Solo en sucesos sin víctima (roja por protestar, etc.) se usa la rival más cercana.
      const victim = e.pid2 != null && this.A[e.pid2] ? this.A[e.pid2] : f ? this.nearest(victims, f) : null;
      if (!f || !victim) return;
      if (card === 'red') { this.keep.add(fouler); f.red = true; }
      const hard = card || e.hard;
      const spot = { x: clamp(victim.x, 2, L - 2), y: clamp(victim.y, 2, Wd - 2) };
      // Si no es penalti, la falta es fuera del área de quien la comete
      if (this.depth(1 - i, spot.x) > L - 17.5 && Math.abs(spot.y - Wd / 2) < 21) spot.x = this.world(1 - i, L - 18, 0)[0];
      const beats = [
        // La víctima recibe el balón (pase de un compañero, o un mal pase del rival) y conduce; el infractor va
        // a por ella. La falta no se pita hasta que los dos se encuentran de verdad: así siempre se ve quién es quién.
        { d: 0.1, ball: true, start: () => {
          this.poss = 1 - i;
          if (this.ball.owner !== victim.pid) this._kick(victim.x, victim.y, { h: 0.05, to: victim.pid, sfx: false });
          this.ov = { p: { [fouler]: { x: () => victim.x, y: () => victim.y, run: 1 }, [victim.pid]: { x: victim.x + this.dir[1 - i] * 3, y: victim.y, run: 0.45 } } };
        } },
        { d: 8, start: () => { if (this.ball.owner !== victim.pid && !this.ball.path) this._receive(victim.pid); },
          tick: (dt, t) => {
            const bt = this.beat, dd = Math.hypot(f.x - victim.x, f.y - victim.y);
            // Si tarda, la víctima conduce hacia el infractor (busca el hueco por donde viene) y se encuentran antes
            if (t > 1.6 && this.ov && this.ov.p) this.ov.p[victim.pid] = { x: () => lerp(victim.x, f.x, 0.5), y: () => lerp(victim.y, f.y, 0.5), run: 0.8 };
            if (dd < 1 && t > 0.3) bt.t = bt.d;
          } },
        { d: 0.1, start: () => {
          spot.x = clamp(victim.x, 2, L - 2); spot.y = clamp(victim.y, 2, Wd - 2);
          if (this.depth(1 - i, spot.x) > L - 17.5 && Math.abs(spot.y - Wd / 2) < 21) spot.x = this.world(1 - i, L - 18, 0)[0];
          this._foulT = this.t;
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
        if (!this.instant) beats.push(this._replayBeat({ mark: () => this._foulT, before: 1.4, after: 0.8, slow: 0.5, freeze: 1.2, an: { kind: 'foul', pid: fouler, pid2: victim.pid, card } }));
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
      if (e.bolt) { this.boltHit = { x: a.x, y: a.y, t: this.t, seed: Math.random() }; if (TL.SFX && TL.SFX.thunder) TL.SFX.thunder(true); }
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
      this.subSoon = e.team; setTimeout(() => { if (this.subSoon === e.team) this.subSoon = null; }, 4000);
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
        // El pase sale cuando el delantero ya está adelantado de verdad (la repetición lo enseña con líneas):
        // se espera a que llegue corriendo, nadie se recoloca
        { d: 4.5, ball: true, tick: (dt, t) => {
          const bt = this.beat;
          if (bt.kicked) return;
          const own = this.ball.owner != null ? this.A[this.ball.owner] : null;
          if (!own || own.team !== i || this.ball.path) { if (t < 4) return; }
          const ln = this.team(1 - i).map(a => this.depth(i, a.x)).sort((a, b) => b - a)[1];
          if (ln != null && this.depth(i, runner.x) < ln + 0.4 && t < 4) return;
          bt.kicked = true; this._offT = this.t; this._kick(tx, ty, { h: 0.1, to: e.pid });
          bt.t = bt.d;
        } },
        { d: 1.3, start: () => {
          ar.flag = this.t + 1.6;
          this._reveal(e);
          if (!this.instant && TL.SFX) TL.SFX.whistle(false);
          this._banner('Fuera de juego', '#ffd23f', 1.1);
          this.ov = { all: 'stay', p: {} };
        } },
        !this.instant && this._replayBeat({ mark: () => this._offT, before: 1.6, after: 0.9, slow: 0.55, freeze: 2.2, an: { kind: 'off', team: i, pid: e.pid } }),
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

    /** Vuelve a pintar las cachés (césped, público, anuncios) por si el móvil liberó su memoria. */
    _refresh() { this._grassCv = null; this._fanPts = null; this._ads = null; if (this.resize) this.resize(); }

    /** Lo llama la vista al terminar el partido. */
    end() { if (!this.finalDone) this._finalWhistle(false); }

    // ------------------------------------------------------------ Bucle
    _loop(now) {
      // Al volver de segundo plano: se rehacen los lienzos que el sistema pudo haber vaciado
      if (now - this._last > 1500) this._refresh();
      const real = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      if (this.loading()) { this._drawLoading(); this.raf = requestAnimationFrame(this._loop); return; }
      this.slow += (this.slowT - this.slow) * Math.min(1, real * 6);
      const dt = real * this.rate();
      this.t += dt;
      // Durante la repetición el partido en directo se congela: al volver, todos siguen exactamente donde estaban
      if (this.replay) this._runScript(dt);
      else { this._update(dt, real); this._record(dt); }
      if (this.replay) this._drawReplay(dt, real);
      else this._draw(real);
      this._weather(real);
      this._wipeFx(real);
      this._tube();
      this.raf = requestAnimationFrame(this._loop);
    }

    _update(dt, real) {
      this.brain.dt = dt;
      this._sync();
      if (!this.beat && !this.script.length && this.queue.length && !this.fetch && !this.place) {
        const e = this.queue[0];
        // El cerebro puede retrasar un suceso para llevar la jugada hasta él, pero como mucho unos segundos
        if (this._lead !== e) { this._lead = e; this._leadT = this.t; }
        if (!this.brain.leading(e) || this.t - this._leadT > 20) { this.queue.shift(); this._handle(e); }
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
      this.warm.forEach(ws => ws.forEach(w => { if (w.on) this._move(w, dt); }));
      this.medics.forEach(m => this._move(m, dt));
      this._boysStep(dt);
      this._ballUpdate(dt);
      this._openPlay(dt);
      // Cámara
      const c = this.cam;
      let tz = c.tz, tx = c.tx != null ? c.tx : (VIEW.x0 + VIEW.x1) / 2, ty = c.ty != null ? c.ty : (VIEW.y0 + VIEW.y1) / 2;
      // Cámara de realización: sigue el balón (un poco por delante de la jugada) con el zoom elegido
      const zoom = this.cv.closest('.mini') ? 1 : this.zoom || 1;
      if (c.tx == null && zoom > 1.05 && this.ball) {
        const b = this.ball, own = b.owner != null && this.A[b.owner];
        const lx = b.path ? lerp(b.x, b.path.tx, 0.5) : b.x + (own ? own.vx * 0.8 : 0), ly = b.path ? lerp(b.y, b.path.ty, 0.5) : b.y + (own ? own.vy * 0.5 : 0);
        c.fx = c.fx == null ? lx : lerp(c.fx, lx, Math.min(1, real * 1.6));
        c.fy = c.fy == null ? ly : lerp(c.fy, ly, Math.min(1, real * 1.2));
        tx = c.fx; ty = c.fy; tz = Math.max(tz, zoom);
      }
      if (c.tx == null && zoom < 0.98) tz = zoom;   // campo y gradas enteras
      if (this.pan && c.tx == null) {
        if (this.t - this.pan.at > 5 && !this.pan.down) { this.pan.x *= 1 - Math.min(1, real * 1.5); this.pan.y *= 1 - Math.min(1, real * 1.5); }
        tx += this.pan.x; ty += this.pan.y;
        if (zoom < 1.05) tz = Math.min(tz, zoom);
      }
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
      const V = ART.on && this._art !== false && TL.StadiumGL && TL.StadiumGL.ready() ? ART_VIEW : VIEW;
      const cxw = fit(cam.x, V.x0, V.x1, halfW), cyw = fit(cam.y, V.y0, V.y1, halfH);
      const X = x => this.w / 2 + (x - cxw) * s;
      const Y = y => this.h / 2 + (y - cyw) * s;
      this.X = X; this.Y = Y; this.s = s;
      // Grada y pista
      const night = this.st.night;
      const art = this._artCv();
      if (art) {
        c.fillStyle = '#20242a'; c.fillRect(0, 0, this.w, this.h); c.drawImage(art, X(ART_VIEW.x0), Y(ART_VIEW.y0), (ART_VIEW.x1 - ART_VIEW.x0) * s, (ART_VIEW.y1 - ART_VIEW.y0) * s);
        this._fans(X, Y, s);
        this._snowGround(X, Y, s);
        this._boards(X, Y, s);
      }
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
      people.push(this.ref, this.fourth, ...this.ars, ...this.coaches, ...this.medics, ...this.boys);
      // Balones viejos fuera del campo (hasta que se los lleva un recogepelotas)
      for (const o of this.spare) { const br0 = Math.max(2.2, 0.36 * s); if (!(TL.Balls && TL.Balls.draw(c, TL.Balls.selected(), X(o.x), Y(o.y), br0, 0))) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(o.x), Y(o.y), br0, 0, 6.283); c.fill(); } }
      this.warm.forEach(ws => ws.forEach(w => { if (w.on) people.push(w); }));
      people.sort((a, b) => a.y - b.y);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const a of people) this._person(a, X, Y, R, s);
      // Aura del supertiro alrededor del que lo lanza (y chispas de sus colores)
      const SA = this.superAura && this.superAura.until > this.t ? this.superAura : null;
      if (SA && this.A[SA.pid]) {
        const a = this.A[SA.pid], ax = X(a.x), ay = Y(a.y) - (a.jump && this.t - a.jump < 0.8 ? Math.sin((this.t - a.jump) / 0.8 * Math.PI) * R * 2.2 : 0);
        const k = Math.min(1, (SA.until - this.t) / 0.6), pul = 1 + Math.sin(this.t * 14) * 0.15;
        const g = c.createRadialGradient(ax, ay, R * 0.4, ax, ay, R * 3.2 * pul);
        g.addColorStop(0, hexA(SA.c, 0.75 * k)); g.addColorStop(0.5, hexA(SA.c2 || SA.c, 0.35 * k)); g.addColorStop(1, hexA(SA.c, 0));
        c.fillStyle = g; c.beginPath(); c.arc(ax, ay, R * 3.2 * pul, 0, 6.283); c.fill();
        for (let q = 0; q < 6; q++) { const an = this.t * 5 + q * 1.05, rr = R * (1.6 + (q % 3) * 0.5); c.fillStyle = q % 2 ? SA.c : (SA.c2 || '#fff'); c.fillRect(Math.round(ax + Math.cos(an) * rr), Math.round(ay + Math.sin(an) * rr * 0.7), 3, 3); }
      }
      // Barrera marcada con el espray
      // Balón (sombra en el suelo, balón a su altura)
      const b = this.ball;
      const br = Math.max(2.6, 0.62 * s) * (1 + b.z * 0.07);
      c.beginPath(); c.ellipse(X(b.x) + b.z * 0.25 * s, Y(b.y) + br * 0.5, br * (1 - Math.min(0.5, b.z * 0.05)), br * 0.42, 0, 0, 6.283);
      c.fillStyle = `rgb(0 0 0 / ${0.38 - Math.min(0.25, b.z * 0.03)})`; c.fill();
      const fast = b.trail.length > 3 && Math.hypot(b.trail[b.trail.length - 1][0] - b.trail[0][0], b.trail[b.trail.length - 1][1] - b.trail[0][1]) > 2.2;
      const BI = TL.Balls ? TL.Balls.selected() : 0, SF = this.superFx && this.superFx.until > this.t ? this.superFx : null;
      const fx = SF ? SF.fx : TL.Balls ? TL.Balls.fx(BI) : 'estela', bc = SF ? SF.c : TL.Balls ? TL.Balls.color(BI) : '#ffffff';
      const bx = X(b.x), by = Y(b.y) - b.z * s * 0.9;
      this._ballFx(fx, bc, br, X, Y, s, fast);
      if (fx !== 'estela') this._ballParts(fx, X, Y, s, br, bc);
      // El balón gira según lo que rueda
      const last = this._bl || [b.x, b.y]; this.ballRot = (this.ballRot || 0) + Math.hypot(b.x - last[0], b.y - last[1]) / 0.11 * (b.x >= last[0] ? 1 : -1) * 0.15; this._bl = [b.x, b.y];
      c.globalAlpha = fx === 'fantasma' ? 0.75 : 1;
      if (!TL.Balls || !TL.Balls.draw(c, BI, bx, by, br, this.ballRot)) {
        c.beginPath(); c.arc(bx, by, br, 0, 6.283); c.fillStyle = '#ffffff'; c.fill();
        c.lineWidth = 1; c.strokeStyle = '#1a1a1a'; c.stroke();
      }
      c.globalAlpha = 1;
      if (SF) this._superDraw(SF, bx, by, br, X, Y, s);
      // Porterías por encima (capa aparte): el balón que entra queda dentro de la red; tiemblan con el gol o el palo
      if (art) {
        // Las porterías salen del mismo sombreador que el estadio: misma luz y mismo desplazamiento de profundidad
        const gl = TL.StadiumGL.goals && TL.StadiumGL.goals();
        const gi = gl || TL.StadiumGL.image('goals');
        const gw = gi && (gi.naturalWidth || gi.width), gh = gi && (gi.naturalHeight || gi.height);
        if (gi) {
          for (const side of [0, 1]) {
            const gx = side ? L : 0;
            let jx = 0;
            if (this.netShake && this.netShake.until > this.t && Math.abs(this.netShake.x - gx) < 1) jx = Math.sin(this.t * 70) * 0.35;
            if (this.postShake && this.postShake.until > this.t && Math.abs(this.postShake.x - gx) < 1) jx = Math.sin(this.t * 90) * 0.25;
            // mitad del estadio de cada lado
            const wx0 = side ? L / 2 : ART_VIEW.x0, wx1 = side ? ART_VIEW.x1 : L / 2;
            const sx = (wx0 - ART_VIEW.x0) / (ART_VIEW.x1 - ART_VIEW.x0) * gw, sw = (wx1 - wx0) / (ART_VIEW.x1 - ART_VIEW.x0) * gw;
            c.drawImage(gi, sx, 0, sw, gh, X(wx0 + jx), Y(ART_VIEW.y0), (wx1 - wx0) * s, (ART_VIEW.y1 - ART_VIEW.y0) * s);
          }
        }
      }
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
      const min = this.m.min || 0;
      const dark = this.st.time === 'noche' ? 1 : this.st.time === 'tarde' ? clamp((min - 50) / 40, 0, 0.8) : 0;
      // Luz del balón con efecto (su color): suave de día, muy visible de noche
      let ballLight = null;
      if (TL.Balls) {
        const SF = this.superFx && this.superFx.until > this.t ? this.superFx : null, BI = TL.Balls.selected(), fx = SF ? SF.fx : TL.Balls.fx(BI);
        if (fx !== 'estela') {
          const hex = SF ? SF.c : TL.Balls.color(BI), b = this.ball, VW = ART_VIEW.x1 - ART_VIEW.x0, VH = ART_VIEW.y1 - ART_VIEW.y0;
          const rgb = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255), mx = Math.max(...rgb, 0.01);
          const flick = 1 + Math.sin(this.t * 13) * 0.08 + Math.sin(this.t * 7.3) * 0.06;
          ballLight = { u: (b.x - ART_VIEW.x0) / VW, v: (b.y - ART_VIEW.y0) / VH, r: 0.035 + b.z * 0.002, k: (0.12 + dark * 0.75) * flick, c: rgb.map(v => v / mx) };
        }
      }
      return TL.StadiumGL.render({ VIEW, L, Wd, t: this.t, tilt: g, time: this.st.time, dark, min, weather: this.st.weather, ballLight });
    }

    _drawLoading() {
      const c = this.cx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = '#0b1611'; c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = 'rgb(255 255 255 / 0.75)'; c.font = '600 14px Barlow, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const dots = '.'.repeat(1 + (Math.floor(performance.now() / 400) % 3));
      c.fillText((TL.t ? TL.t('Preparando el estadio') : 'Preparando el estadio') + dots, this.w / 2, this.h / 2);
    }

    /** Público en las gradas del estadio dibujado: colores del local (y un fondo visitante); salta con los goles. */
    _fans(X, Y, s) {
      if (!this._fanPts) {
        const im = TL.StadiumGL.image && TL.StadiumGL.image('mask');
        if (!im) return;
        const cv = document.createElement('canvas'); cv.width = 322; cv.height = 200;
        const g = cv.getContext('2d'); g.drawImage(im, 0, 0, cv.width, cv.height);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        // Altura de cada punto (para que el público se mueva con la profundidad igual que las gradas)
        const hi = TL.StadiumGL.image('height');
        let hd = null;
        if (hi) { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(hi, 0, 0, cv.width, cv.height); hd = g.getImageData(0, 0, cv.width, cv.height).data; }
        // Luz de los focos en cada punto (de noche, el público fuera de las zonas iluminadas queda en penumbra)
        const li = TL.StadiumGL.image('light');
        let ld = null;
        if (li) { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(li, 0, 0, cv.width, cv.height); ld = g.getImageData(0, 0, cv.width, cv.height).data; }
        const pts = [], fill = Math.min(1, 0.45 + (this.m.att || 0.6) * 0.5);
        for (let k = 0; k < 20000 && pts.length < 2600; k++) {
          const px = Math.floor(Math.random() * cv.width), py = Math.floor(Math.random() * cv.height), o = (py * cv.width + px) * 4;
          if (d[o] < 150 || d[o + 1] > 120) continue;   // solo gradas (rojo en la máscara)
          if (Math.random() > fill) continue;
          const x = ART_VIEW.x0 + (px + Math.random()) / cv.width * (ART_VIEW.x1 - ART_VIEW.x0), y = ART_VIEW.y0 + (py + Math.random()) / cv.height * (ART_VIEW.y1 - ART_VIEW.y0);
          const away = x > L * 0.86 && y > Wd / 2;
          const r = Math.random();
          pts.push({ x, y, lum: ld ? ld[o] / 255 : 1, aw: away, ang: Math.atan2(y - Wd / 2, x - L / 2), h: hd ? hd[o] / 255 : 0.5, ph: Math.random() * 6, c: away ? (r < 0.7 ? this.colors[1].main : '#d8d8d8') : r < 0.5 ? this.st.seat : r < 0.68 ? this.st.seat2 : ['#c9d3cf', '#9aa8a2', '#e6e0d0'][k % 3] });
        }
        this._fanPts = pts;
      }
      const c = this.cx, z = Math.max(1, 0.42 * s), t = this.t;
      const dt = Math.min(0.1, Math.max(0, t - (this._fanT || t))); this._fanT = t;
      const party = this.sparkUntil && this.sparkUntil > t;
      // Goles: salta la afición del que marca; con goleada o partido loco, la grada hace la ola
      const sc = this.m.score || [0, 0], last = this._fanSc || (this._fanSc = sc.slice());
      for (const i of [0, 1]) if (sc[i] > last[i]) {
        this.cheer = { team: i, until: t + 7 };
        const tot = sc[0] + sc[1], lead = Math.abs(sc[0] - sc[1]);
        if ((lead >= 2 || tot >= 3) && !(this.wave && this.wave.end > t)) this.wave = { start: t + 6, end: t + 20, dir: Math.random() < 0.5 ? 1 : -1 };
      }
      this._fanSc = sc.slice();
      // Ánimo de la grada: más goles, ventaja local y final de partido → más gente botando y alguna ola espontánea
      const excite = Math.min(1, (sc[0] + sc[1]) * 0.15 + Math.max(0, sc[0] - sc[1]) * 0.15 + ((this.m.min || 0) > 75 ? 0.15 : 0));
      if (!(this.wave && this.wave.end > t) && Math.random() < dt * (0.004 + excite * 0.03)) this.wave = { start: t, end: t + 14, dir: Math.random() < 0.5 ? 1 : -1 };
      const W8 = this.wave && t >= this.wave.start && t < this.wave.end ? this.wave : null;
      const front = W8 ? (((t - W8.start) * 1.7 * W8.dir) % 6.283 + 6.283) % 6.283 - Math.PI : 0;
      const ch = this.cheer && this.cheer.until > t ? this.cheer : null;
      const sc0 = TL.SFX && TL.SFX.crowd, crAge = sc0 ? (performance.now() - sc0.at) / 1000 : 99;
      let cr = crAge < ({ chant: 6, ovation: 5, applause: 3.5, whistles: 3, boo: 3, groan: 1.8, chance: 1.5, crowdSwell: 2 }[sc0 && sc0.kind] || 0) ? sc0.kind : null;
      // ¿Qué afición reacciona? Se decide una vez por sonido, según la jugada en ese momento:
      // ocasión y lamento → la del equipo que ataca; aplausos (parada) → la del que defiende; pitos y abucheos →
      // la contraria al que tiene el balón; ovación → la del que va ganando; cánticos → sobre todo la local
      if (cr && sc0 !== this._crEv) {
        this._crEv = sc0; const at = this.poss != null ? this.poss : 0, sc1 = this.m.score || [0, 0];
        this._crTeam = { chance: at, groan: at, applause: 1 - at, whistles: 1 - at, boo: 1 - at, ovation: sc1[0] >= sc1[1] ? 0 : 1, chant: 0, crowdSwell: at }[cr];
      }
      const crTeam = this._crTeam;
      // Mismo desplazamiento que el sombreador del estadio: uv' = uv + tilt·0,022·altura
      const g = this.tilt || { x: 0, y: 0 }, VW = ART_VIEW.x1 - ART_VIEW.x0, VH = ART_VIEW.y1 - ART_VIEW.y0;
      const px = g.x * 0.022 * VW, py = g.y * 0.022 * (VH / VW) * VH;
      const nightK = this.st.time === 'noche' ? 1 : this.st.time === 'tarde' ? clamp(((this.m.min || 0) - 50) / 40, 0, 0.8) : 0;
      for (const f of this._fanPts) {
        let j = Math.sin(t * 1.5 + f.ph) * 0.04, arms = 0;
        // Lo que se oye en la grada se ve: aplausos (brazos que suben y bajan), cánticos (botan al ritmo, sobre
        // todo la afición local), pitos y abucheos (brazos arriba sueltos), ovación (todos en pie), lamento (se agachan)
        if (cr && ((crTeam === 1) === !!f.aw || (cr === 'chant' && (f.ph * 131) % 1 < 0.15))) {
          const home = !f.aw, mine = (f.ph * 131) % 1;
          if (cr === 'applause' && mine < 0.7) arms = Math.sin(t * 16 + f.ph * 9) > 0.2 ? 1 : 0;
          else if (cr === 'chant' && (home || mine < 0.25)) { j = Math.abs(Math.sin(t * 6.3)) * 0.28 + 0.02; arms = Math.sin(t * 6.3) > 0.6 ? 1 : 0; }
          else if ((cr === 'whistles' || cr === 'boo') && mine < 0.45) { arms = Math.sin(t * 4 + f.ph * 5) > 0 ? 1 : 0; j = 0.05; }
          else if (cr === 'ovation') { j = Math.abs(Math.sin(t * 8 + f.ph)) * 0.3; arms = mine < 0.8 ? 1 : 0; }
          else if (cr === 'groan') j = -0.12;
          else if (cr === 'chance' && mine < 0.6) { j = 0.18; arms = mine < 0.3 ? 1 : 0; }
        }
        const mine = ch && (ch.team === 1) === !!f.aw;
        if (mine) { j = Math.abs(Math.sin(t * 9 + f.ph)) * 0.4; arms = Math.sin(t * 9 + f.ph) > 0.3 ? 1 : 0; }
        else if (excite > 0.3 && (f.ph * 97 % 1) < excite * 0.25) j = Math.abs(Math.sin(t * 7 + f.ph)) * 0.25;   // algunos botan solos
        if (W8) {
          let d = f.ang - front; d = Math.atan2(Math.sin(d), Math.cos(d));
          const a = Math.exp(-d * d / 0.05);
          if (a > 0.05) { j = Math.max(j, a * 0.75); if (a > 0.45) arms = 1; }
        }
        const x = X(f.x + px * f.h), y = Y(f.y + py * f.h - j);
        if (nightK) c.globalAlpha = 1 - nightK * (1 - Math.max(0.18, Math.min(1, f.lum * 1.6)));
        c.fillStyle = f.c; c.fillRect(x, y, z, z);
        if (arms) { c.fillStyle = 'rgb(255 236 214 / 0.85)'; c.fillRect(x, y - z, z, z); }   // brazos arriba
      }
      c.globalAlpha = 1;
    }

    /** Vallas LED junto a las bandas: lo que pasa en el partido, la figura de la temporada y anuncios. */
    _boards(X, Y, s) {
      const c = this.cx;
      const B = this._board || (this._board = { msg: null, until: 0 });
      // Lo que pasa en el partido ocupa toda la valla un rato; si no, anuncios por paneles
      if (B.msg && this.t > B.until) B.msg = null;
      if (!B.msg && this.boardQ && this.boardQ.length) { B.msg = this.boardQ.shift(); B.until = this.t + 7; B.born = this.t; }
      if (!this._ads || this.t > this._adsAt) { this._ads = this._makeAds(); this._adsAt = this.t + 11; this._adsBorn = this.t; }
      for (const y0 of [-2.9, Wd + 1.1]) {
        const x0 = 4, w = L - 8, hgt = 1.8;
        c.fillStyle = '#07090c'; c.fillRect(X(x0), Y(y0), w * s, hgt * s);
        c.save(); c.beginPath(); c.rect(X(x0), Y(y0), w * s, hgt * s); c.clip();
        if (B.msg) {
          const txt = TL.t ? TL.t(B.msg) : B.msg;
          c.fillStyle = Math.floor(this.t * 4) % 2 ? '#2a1600' : '#001a2a'; c.fillRect(X(x0), Y(y0), w * s, hgt * s);
          c.font = `900 ${Math.max(8, 1.05 * s)}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle';
          const tw = c.measureText(txt).width + 6 * s, off = ((this.t - B.born) * 7 * s) % tw;
          c.fillStyle = Math.floor(this.t * 4) % 2 ? '#ffd23f' : '#ffffff';
          for (let xx = X(x0) - off; xx < X(x0) + w * s; xx += tw) c.fillText(txt, xx, Y(y0 + hgt / 2));
        } else {
          const n = this._ads.length, pw = w / n, slide = Math.min(1, (this.t - this._adsBorn) * 2);
          this._ads.forEach((ad, k) => this._adPanel(ad, X(x0 + k * pw), Y(y0) + (1 - slide) * hgt * s, pw * s, hgt * s));
        }
        // Brillo de pantalla LED
        c.fillStyle = 'rgb(255 255 255 / 0.05)'; c.fillRect(X(x0), Y(y0), w * s, hgt * s * 0.35);
        c.restore();
      }
    }
    /** Un juego de anuncios: colores, «logotipos» de píxeles que parecen algo sin ser nada, texto y efectos. */
    _makeAds() {
      const pal = [['#e63946', '#ffffff'], ['#1d3557', '#a8dadc'], ['#ffb703', '#023047'], ['#2a9d8f', '#e9f5db'], ['#7b2cbf', '#ffd6ff'], ['#06d6a0', '#073b4c'], ['#ef476f', '#fff3b0'], ['#111111', '#b8f53d'], ['#f77f00', '#fcbf49'], ['#0077b6', '#caf0f8']];
      const syl = ['ZU', 'KO', 'RA', 'MI', 'TEX', 'VOL', 'NEX', 'LO', 'PA', 'GRO', 'FI', 'TA', 'XO', 'BRU', 'QI', 'NOR'];
      const ads = [], n = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const [bg, fg] = pal[Math.floor(Math.random() * pal.length)];
        // logotipo: patrón simétrico de 7×5 píxeles
        const logo = []; for (let y = 0; y < 5; y++) { const row = []; for (let x = 0; x < 4; x++) row.push(Math.random() < 0.5); logo.push(row.concat(row.slice(0, 3).reverse())); }
        const word = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => syl[Math.floor(Math.random() * syl.length)]).join('');
        const real = Math.random() < 0.25 ? U.pick(ADS).split('·')[0].trim() : null;
        ads.push({ bg, fg, logo, word: real || word, fx: ['scroll', 'flash', 'grad', 'noise', 'still'][Math.floor(Math.random() * 5)], ph: Math.random() * 6 });
      }
      const star = this._adText(); if (/GOLES/.test(star)) { ads[0].word = star; ads[0].fx = 'scroll'; }
      return ads;
    }
    _adPanel(ad, x, y, w, h) {
      const c = this.cx, t = this.t + ad.ph;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      if (ad.fx === 'grad') { const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, ad.bg); g.addColorStop((Math.sin(t) + 1) / 2, ad.fg); g.addColorStop(1, ad.bg); c.fillStyle = g; }
      else c.fillStyle = ad.fx === 'flash' && Math.floor(t * 3) % 2 ? ad.fg : ad.bg;
      c.fillRect(x, y, w, h);
      const fg = ad.fx === 'flash' && Math.floor(t * 3) % 2 ? ad.bg : ad.fg;
      // ruido de píxeles de colores (parece una imagen, no es nada)
      if (ad.fx === 'noise') { const px = Math.max(2, h / 6); for (let i = 0; i < w / px; i++) for (let j = 0; j < 6; j++) if ((Math.sin(i * 12.9 + j * 78.2 + Math.floor(t * 2)) * 43758.5) % 1 > 0.55) { c.fillStyle = (i + j) % 3 ? fg : '#ffffff55'; c.fillRect(x + i * px, y + j * px, px, px); } }
      // logotipo
      const ps = h / 7;
      c.fillStyle = fg;
      ad.logo.forEach((row, j) => row.forEach((on, i) => { if (on) c.fillRect(x + ps + i * ps, y + ps + j * ps, ps, ps); }));
      c.font = `900 ${Math.max(7, h * 0.62)}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle';
      const tx = x + ps * 9 - (ad.fx === 'scroll' ? ((t * h * 1.5) % (w * 0.6)) : 0);
      c.fillText(ad.word, tx, y + h / 2);
      c.restore();
    }
    _adText() {
      const S = this.S, ids = this.m.teams.flatMap(t => t.onPitch.map(o => o.pid));
      // La figura de la temporada (si va lanzada)
      let star = null;
      for (const id of ids) { const st = S.stats && S.stats[id]; if (st && st[1] >= 4 && (!star || st[1] > S.stats[star][1])) star = id; }
      this._bk = (this._bk || 0) + 1;
      if (star && this._bk % 3 === 0) { const p = this.P(star); return `${p.short.toUpperCase()} · ${S.stats[star][1]} GOLES ESTA TEMPORADA · ¡IMPARABLE!`; }
      return U.pick(ADS);
    }
    /** Lo que pasa en el partido sale en las vallas. */
    boardMsg(e) {
      const q = this.boardQ || (this.boardQ = []);
      const name = e.pid != null && this.P(e.pid) ? this.P(e.pid).short.toUpperCase() : '';
      const club = e.team >= 0 ? (this.S.clubs[this.m.teams[e.team].club].name || '').toUpperCase() : '';
      const t = { goal: `¡GOOOL DE ${name}!  ${this.m.score[0]}-${this.m.score[1]}`, red: `ROJA PARA ${name}`, pen: `¡PENALTI PARA ${club}!`, save: `¡PARADÓN!`, sub: 'CAMBIO', var: 'REVISIÓN VAR', ht: `DESCANSO · ${this.m.score[0]}-${this.m.score[1]}`, late: `¡ÚLTIMOS MINUTOS! · ¡VAMOS ${club}!` }[e.type];
      if (t) { q.length = 0; q.push(t); if (this._board) this._board.until = 0; }
    }

    /** Lluvia, nieve o calor (ondas y destellos del sol en la lente), sobre todo lo demás. */
    /**
     * Lluvia pixelada: gotas del tamaño de un píxel del dibujo del estadio (14 px por metro), pegadas a su rejilla,
     * en tres planos de profundidad; salpicaduras de píxeles sobre el césped y un velo gris de cielo cubierto.
     */
    _rain(real, storm) {
      if (!this.X) return;
      const c = this.cx, W = this.w, H = this.h, s = this.s, X = this.X, Y = this.Y;
      const ps = Math.max(1, Math.round(s / 14));              // un píxel del dibujo, en pantalla
      const k = Math.min(0.05, real);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = storm ? 'rgb(14 20 32 / 0.3)' : 'rgb(28 36 50 / 0.16)'; c.fillRect(0, 0, W, H);
      const want = Math.round(W * H / (storm ? 230 : 520));
      const R = this.rainP || (this.rainP = []);
      while (R.length < want) R.push({ x: Math.random() * W, y: Math.random() * H, z: [0.45, 0.7, 1][R.length % 3], len: 0.6 + Math.random() * 1.1, sp: 0.75 + Math.random() * 0.5, sl: (Math.random() - 0.5) * 0.18 });
      if (R.length > want) R.length = want;
      const cols = ['rgb(160 180 205 / 0.28)', 'rgb(185 205 228 / 0.42)', 'rgb(215 230 248 / 0.6)'];
      // Viento con rachas: la inclinación general cambia despacio; cada gota además tiene la suya
      const t = this.t, wind = (storm ? 0.38 : 0.12) + Math.sin(t * 0.23) * (storm ? 0.14 : 0.08) + Math.sin(t * 0.71 + 1.3) * 0.05;
      for (let layer = 0; layer < 3; layer++) {
        c.fillStyle = cols[layer];
        for (let i = layer; i < R.length; i += 3) {
          const d = R[i], slope = wind * (0.7 + d.z * 0.5) + d.sl, v = 620 * d.z * d.sp;
          d.y += v * k * (storm ? 1.25 : 1); d.x -= v * slope * k * (storm ? 1.25 : 1);
          if (d.y > H) { d.y -= H + 8; d.x = Math.random() * (W + 40); d.len = 0.6 + Math.random() * 1.1; }
          if (d.x < -4) d.x += W + 8; else if (d.x > W + 8) d.x -= W + 12;
          // Gota en píxeles: tantos como mida, desplazándose en x según su inclinación (como una línea pixelada)
          const n = Math.max(2, Math.round((layer + 2) * d.len * (0.8 + d.sp * 0.4))), gx = Math.round(d.x / ps), gy = Math.round(d.y / ps);
          for (let j = 0; j < n; j++) c.fillRect((gx + Math.round(j * slope)) * ps, (gy - j) * ps, ps, ps);
        }
      }
      // Salpicaduras sobre el campo (en coordenadas del mundo: se mueven con la cámara)
      const S = this.splash || (this.splash = []);
      const born = Math.min(storm ? 30 : 12, Math.round((W * H / (storm ? 1500 : 3500)) * k));
      for (let i = 0; i < born; i++) S.push({ x: -6 + Math.random() * (L + 12), y: -4 + Math.random() * (Wd + 8), a: 0 });
      c.fillStyle = 'rgb(220 235 250 / 0.55)';
      for (let i = S.length - 1; i >= 0; i--) {
        const p = S[i]; p.a += k;
        if (p.a > 0.22) { S.splice(i, 1); continue; }
        const x = Math.round(X(p.x) / ps) * ps, y = Math.round(Y(p.y) / ps) * ps;
        if (x < 0 || y < 0 || x > W || y > H) continue;
        if (p.a < 0.08) c.fillRect(x, y, ps, ps);
        else { const r = ps * (p.a < 0.15 ? 1 : 2); c.fillRect(x - r, y - ps, ps, ps); c.fillRect(x + r, y - ps, ps, ps); }
      }
      if (S.length > 400) S.splice(0, S.length - 400);
      this._lensDrops(real, ps, storm);
    }

    /** Cambia el tiempo en directo (botón de prueba). */
    setWeather(w) {
      this.st.weather = w;
      this.rainP = this.splash = this.lens = this.flakes = this.leaves = null;
      this._snowCv = null; this._snowAt = -1; this.flash = 0; this.nextBolt = 0;
    }

    /** Efectos de cada tiempo, por encima de todo lo que se pinta en el campo. */
    _weather(real) {
      const w = this.st.weather;
      if (!this.X || !w || w === 'despejado') { this._boltFx(real); return; }
      const c = this.cx, ps = Math.max(1, Math.round(this.s / 14));
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (w === 'nublado') this._clouds(real, 0.2, false);
      else if (w === 'lluvia') this._rain(real, false);
      else if (w === 'temporal') { this._puddles(ps); this._rain(real, true); this._storm(real); }
      else if (w === 'nieve') this._snow(real, ps);
      else if (w === 'calor') this._heat(real, ps);
      else if (w === 'niebla') this._fog(real);
      else if (w === 'viento') this._wind(real, ps);
      this._boltFx(real);
    }

    /** Ruido suave en mosaico (para nubes, niebla y nieve): valores 0..1 en una rejilla n×m que se repite. */
    _noise(n, m, seed) {
      const g = (x, y) => { const h = Math.sin((x % n) * 127.1 + (y % m) * 311.7 + seed * 74.7) * 43758.5453; return h - Math.floor(h); };
      const out = new Float32Array(n * m * 16), N = n * 4, M = m * 4;
      for (let oct = 0, amp = 0.6, f = 1; oct < 3; oct++, amp *= 0.5, f *= 2) {
        for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
          const fx = x / 4 * f, fy = y / 4 * f, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
          const a = g(x0, y0), b = g(x0 + 1, y0), cc = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
          out[y * N + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy);
        }
      }
      return { v: out, w: N, h: M };
    }
    /** Lienzo de manchas (nubes o niebla) a partir del ruido. */
    _blobCv(key, rgb, lo, hi, maxA, seed) {
      if (this[key]) return this[key];
      const nz = this._noise(12, 8, seed), cv = document.createElement('canvas');
      cv.width = nz.w; cv.height = nz.h;
      const g = cv.getContext('2d'), im = g.createImageData(nz.w, nz.h);
      for (let i = 0; i < nz.v.length; i++) {
        const t = Math.min(1, Math.max(0, (nz.v[i] - lo) / (hi - lo)));
        im.data[i * 4] = rgb[0]; im.data[i * 4 + 1] = rgb[1]; im.data[i * 4 + 2] = rgb[2]; im.data[i * 4 + 3] = Math.round(255 * maxA * t * t * (3 - 2 * t));
      }
      g.putImageData(im, 0, 0);
      return (this[key] = cv);
    }

    /** Sombras de nubes que cruzan el estadio con el viento (en coordenadas del mundo). */
    _clouds(real, strength, dark) {
      const c = this.cx, X = this.X, Y = this.Y, s = this.s;
      c.fillStyle = dark ? 'rgb(20 26 38 / 0.1)' : 'rgb(40 48 60 / 0.07)'; c.fillRect(0, 0, this.w, this.h);
      const cv = this._blobCv('_cloudCv', [8, 12, 20], 0.45, 0.85, strength, 3);
      const span = 190, off = (this.t * 1.4) % span;    // la nube recorre 190 m en bucle
      c.save(); c.imageSmoothingEnabled = true;
      for (let k = -1; k <= 1; k++) c.drawImage(cv, X(-40 + off + k * span), Y(-30), span * s, 130 * s);
      c.restore();
    }

    /** Temporal: relámpagos que iluminan todo de golpe (doble destello) y el cielo muy cargado. */
    _storm(real) {
      const c = this.cx;
      this._clouds(real, 0.28, true);
      if (!this.nextBolt) this.nextBolt = this.t + 4 + Math.random() * 10;
      if (this.t > this.nextBolt) {
        this.flash = 0.8; this.flash2 = this.t + 0.18; this.nextBolt = this.t + 5 + Math.random() * 12;
        this.skyBolt = this._makeBolt();
        if (TL.SFX && TL.SFX.thunder) setTimeout(() => TL.SFX.thunder(), 600 + Math.random() * 1600);
      }
      this._drawSkyBolt();
      if (this.flash2 && this.t > this.flash2) { this.flash = Math.max(this.flash, 0.7); this.flash2 = 0; }
      if (this.flash > 0) {
        c.fillStyle = `rgb(225 235 255 / ${(this.flash * 0.55).toFixed(3)})`; c.fillRect(0, 0, this.w, this.h);
        this.flash = Math.max(0, this.flash - real * 5);
      }
    }

    /**
     * Rayo de fondo: cae fuera del campo (detrás de las gradas o a lo lejos), con ramas, en píxeles.
     * Se dibuja en coordenadas del mundo para que esté «allí», no pegado a la pantalla.
     */
    _makeBolt() {
      const side = Math.floor(Math.random() * 4);
      const tx = side === 0 ? -14 - Math.random() * 6 : side === 1 ? L + 14 + Math.random() * 6 : Math.random() * L;
      const ty = side === 2 ? -11 - Math.random() * 5 : side === 3 ? Wd + 11 + Math.random() * 5 : Math.random() * Wd;
      // El rayo se genera en un espacio unitario (0 = borde de arriba de la pantalla, 1 = donde cae)
      // y se estira al dibujar: siempre entra desde fuera de la pantalla, nunca aparece a medias.
      const path = (x0, y0, x1, y1, depth) => {
        const pts = [[x0, y0]], n = 12 + Math.floor(Math.random() * 6);
        for (let i = 1; i <= n; i++) { const f = i / n; pts.push([x0 + (x1 - x0) * f + (i < n ? (Math.random() - 0.5) * 0.09 : 0), y0 + (y1 - y0) * f]); }
        const out = [{ pts, w: depth ? 1 : 2 }];
        if (depth < 2) for (let i = 2; i < n - 1; i++) if (Math.random() < 0.25) { const [bx, by] = pts[i]; out.push(...path(bx, by, bx + (Math.random() - 0.5) * 0.35, Math.min(1, by + 0.12 + Math.random() * 0.2), depth + 1)); }
        return out;
      };
      return { segs: path((Math.random() - 0.5) * 0.4, 0, 0, 1, 0), tx, ty, t: this.t };
    }
    _drawSkyBolt() {
      const B = this.skyBolt;
      if (!B) return;
      const age = this.t - B.t;
      if (age > 0.55) { this.skyBolt = null; return; }
      if (age > 0.12 && age < 0.22) return;          // parpadeo: se apaga un instante y vuelve
      const c = this.cx, P = Math.max(1, Math.round(this.s / 14)), a = age < 0.12 ? 1 : 1 - (age - 0.22) / 0.33;
      const ex = this.X(B.tx), ey = this.Y(B.ty), top = -4 * P, len = Math.max(40, ey - top);
      const S = (u, v) => [ex + u * len, top + v * len];
      for (const seg of B.segs) {
        for (let i = 1; i < seg.pts.length; i++) {
          const [X0, Y0] = S(...seg.pts[i - 1]), [X1, Y1] = S(...seg.pts[i]), steps = Math.max(1, Math.round(Math.hypot(X1 - X0, Y1 - Y0) / P));
          for (let j = 0; j <= steps; j++) {
            const px = Math.round((X0 + (X1 - X0) * j / steps) / P) * P, py = Math.round((Y0 + (Y1 - Y0) * j / steps) / P) * P;
            c.fillStyle = `rgb(150 175 255 / ${(0.35 * a).toFixed(3)})`; c.fillRect(px - P * seg.w, py, P * (seg.w * 2 + 1), P);
            c.fillStyle = `rgb(255 255 255 / ${(0.95 * a).toFixed(3)})`; c.fillRect(px, py, P * seg.w, P);
          }
        }
      }
    }

    /** Charcos que crecen durante el temporal: reflejan el cielo y tiemblan con las gotas. */
    _puddles(ps) {
      const c = this.cx, X = this.X, Y = this.Y, s = this.s;
      if (!this._pud) { const r = (i => { const h = Math.sin(i * 91.7 + 13) * 9137.1; return h - Math.floor(h); }); this._pud = Array.from({ length: 14 }, (_, i) => ({ x: 6 + r(i) * (L - 12), y: 4 + r(i + 50) * (Wd - 8), r: 0.8 + r(i + 99) * 1.8, e: 0.5 + r(i + 7) * 0.4 })); }
      const grow = Math.min(1, 0.25 + (this.m.min || 0) / 70);
      for (const p of this._pud) {
        const rx = Math.max(ps, p.r * grow * s), ry = rx * p.e, cx = Math.round(X(p.x) / ps) * ps, cy = Math.round(Y(p.y) / ps) * ps;
        // Charco en filas de píxeles (forma de elipse escalonada)
        for (let yy = -ry; yy <= ry; yy += ps) {
          const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) / ps) * ps;
          if (!half) continue;
          c.fillStyle = 'rgb(30 45 62 / 0.42)'; c.fillRect(cx - half, cy + yy, half * 2, ps);
        }
        c.fillStyle = 'rgb(200 215 235 / 0.35)'; c.fillRect(cx - rx * 0.4, cy - ry * 0.4, Math.max(ps, rx * 0.5), ps);
        // Ondas de las gotas en el charco
        if (Math.random() < 0.35) { c.fillStyle = 'rgb(230 240 255 / 0.5)'; c.fillRect(cx + (Math.random() - 0.5) * rx * 1.4, cy + (Math.random() - 0.5) * ry * 1.2, ps, ps); }
      }
    }

    /**
     * Nieve: copos de uno o dos píxeles en tres planos que bailan con el viento, y un manto que se acumula.
     * Empieza en las gradas, techos y bordes del campo (lo alto y lo que no se pisa) y se va extendiendo
     * hacia el centro; si existe assets/estadio/nieve.jpg (blanco = donde cuaja antes), manda ese mapa.
     */
    /** Manto de nieve sobre el césped (debajo de jugadores y balón). */
    _snowGround(X, Y, s) {
      if (this.st.weather !== 'nieve') return;
      const cover = Math.min(0.95, 0.12 + (this.m.min || 0) / 90 * 0.75 + (this._snowBoost || 0));
      const cv = this._snowMap(cover), c = this.cx;
      if (cv) { c.save(); c.imageSmoothingEnabled = false; c.drawImage(cv, X(ART_VIEW.x0), Y(ART_VIEW.y0), (ART_VIEW.x1 - ART_VIEW.x0) * s, (ART_VIEW.y1 - ART_VIEW.y0) * s); c.restore(); }
    }
    _snow(real, ps) {
      const c = this.cx, W = this.w, H = this.h, X = this.X, Y = this.Y, s = this.s, k = Math.min(0.05, real);
      c.fillStyle = 'rgb(200 212 230 / 0.07)'; c.fillRect(0, 0, W, H);
      // Copos
      const want = Math.round(W * H / 700), F = this.flakes || (this.flakes = []);
      while (F.length < want) F.push({ x: Math.random() * W, y: Math.random() * H, z: [0.4, 0.7, 1][F.length % 3], ph: Math.random() * 6.28, sw: 0.6 + Math.random() * 0.8 });
      const t = this.t, gust = Math.sin(t * 0.3) * 18 + Math.sin(t * 0.83 + 2) * 8;
      const cols = ['rgb(225 232 245 / 0.45)', 'rgb(240 245 252 / 0.7)', 'rgb(255 255 255 / 0.92)'];
      for (let layer = 0; layer < 3; layer++) {
        c.fillStyle = cols[layer];
        for (let i = layer; i < F.length; i += 3) {
          const f = F[i];
          f.y += (26 + 40 * f.z) * k; f.x += (Math.sin(t * f.sw + f.ph) * 22 * f.z + gust * f.z) * k;
          if (f.y > H) { f.y = -3; f.x = Math.random() * W; }
          if (f.x < -3) f.x += W + 6; else if (f.x > W + 3) f.x -= W + 6;
          const sz = (layer === 2 && f.ph > 3.5 ? 2 : 1) * ps;
          c.fillRect(Math.round(f.x / ps) * ps, Math.round(f.y / ps) * ps, sz, sz);
        }
      }
    }
    /** Mapa de acumulación de nieve (resolución del dibujo / 4), recalculado cuando crece el manto. */
    _snowMap(cover) {
      if (this._snowCv && Math.abs(cover - this._snowAt) < 0.015) return this._snowCv;
      if (!this._snowImg) {
        // Mapa de nieve (assets/estadio/nieve-top.webp, enderezado como las demás capas): blanco = donde cuaja antes; negro = nunca
        this._snowImg = new Image();
        this._snowImg.onload = () => { this._snowT = null; this._snowAt = -1; };
        this._snowImg.src = 'assets/estadio/nieve-top.webp';
      }
      if (!this._snowImg.complete) return null;
      if (!this._snowT) {
        const mask = TL.StadiumGL && TL.StadiumGL.image && TL.StadiumGL.image('mask'), hi = TL.StadiumGL && TL.StadiumGL.image('height');
        if (!mask) return null;
        const VW = ART_VIEW.x1 - ART_VIEW.x0, VH = ART_VIEW.y1 - ART_VIEW.y0, w = Math.round(VW * 3.5), h = Math.round(VH * 3.5);
        const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        const g = tmp.getContext('2d', { willReadFrequently: true });
        const read = im => { g.clearRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
        const md = read(mask), hd = hi ? read(hi) : null;
        let sd = null;
        if (this._snowImg && this._snowImg.complete && this._snowImg.naturalWidth) sd = read(this._snowImg);
        const nz = this._noise(24, 16, 11), T = new Float32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x, o = i * 4, n = nz.v[(y % nz.h) * nz.w + (x % nz.w)];
          if (sd) { const v = sd[o] / 255; T[i] = v < 0.06 ? 2 : 1.02 - v + (n - 0.5) * 0.06; continue; }
          // Sin mapa propio: cuaja antes en lo alto (gradas, techos) y en los bordes del campo, después hacia el centro
          const wx = ART_VIEW.x0 + (x + 0.5) / w * VW, wy = ART_VIEW.y0 + (y + 0.5) / h * VH;
          const inside = wx > 0 && wx < L && wy > 0 && wy < Wd;
          const edge = inside ? Math.min(wx, L - wx, wy, Wd - wy) / (Wd / 2) : 0;
          const stand = md[o] > 150 && md[o + 1] < 120 ? 1 : 0, high = hd ? hd[o] / 255 : 0;
          T[i] = (inside ? 0.25 + edge * 0.75 : 0.35 - stand * 0.25 - high * 0.2) * 0.75 + (1 - n) * 0.45 - 0.1;
        }
        this._snowT = { T, w, h };
      }
      const { T, w, h } = this._snowT;
      const cv = this._snowCv || (this._snowCv = document.createElement('canvas'));
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d'), im = g.createImageData(w, h), d = im.data;
      for (let i = 0; i < T.length; i++) {
        const a = Math.min(1, Math.max(0, (cover - T[i]) / 0.08));
        if (!a) continue;
        // Blanco azulado con algo de variación (nieve pisada / nieve virgen)
        const v = 236 + ((i * 2654435761 >>> 28) & 7) * 2;
        d[i * 4] = v - 6; d[i * 4 + 1] = v - 2; d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(a * 165);
      }
      g.putImageData(im, 0, 0);
      this._snowAt = cover;
      return cv;
    }

    /**
     * Calor: el aire tiembla sobre el césped (la imagen se ondula de verdad, por franjas finas y con el ruido
     * cambiando poco a poco, sin líneas rectas), luz cálida y un resplandor de sol suave en la esquina.
     */
    _heat(real, ps) {
      const c = this.cx, cv = this.cv, dpr = this.dpr, W = cv.width, H = cv.height, t = this.t;
      const buf = this._heatCv || (this._heatCv = document.createElement('canvas'));
      if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
      const g = buf.getContext('2d'); g.clearRect(0, 0, W, H); g.drawImage(cv, 0, 0);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      const band = Math.max(2, Math.round(2 * dpr * ps));
      for (let y = 0; y < H; y += band) {
        // Más temblor abajo (cerca del suelo caliente) y en olas que suben
        const depth = 0.35 + 0.65 * (y / H);
        const off = (Math.sin(y * 0.045 / dpr - t * 3.1) * 0.6 + Math.sin(y * 0.11 / dpr + t * 1.7) * 0.4) * dpr * 1.1 * depth;
        if (Math.abs(off) < 0.25) continue;
        c.drawImage(buf, 0, y, W, band, off, y, W, band);
      }
      c.restore();
      c.save(); c.globalCompositeOperation = 'soft-light';
      c.fillStyle = 'rgb(255 190 110 / 0.22)'; c.fillRect(0, 0, this.w, this.h);
      c.restore();
      const gr = c.createRadialGradient(this.w * 0.92, -this.h * 0.08, 0, this.w * 0.92, -this.h * 0.08, this.h * 0.9);
      gr.addColorStop(0, 'rgb(255 245 210 / 0.35)'); gr.addColorStop(0.4, 'rgb(255 220 160 / 0.1)'); gr.addColorStop(1, 'rgb(255 200 140 / 0)');
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(0, 0, this.w, this.h); c.restore();
    }

    /** Niebla: bancos de niebla que se desplazan en dos capas; se ve bien cerca del balón y lo lejano se pierde. */
    _fog(real) {
      const c = this.cx, X = this.X, Y = this.Y, s = this.s, b = this.ball;
      const bx = X(b.x), by = Y(b.y), R = Math.max(this.w, this.h);
      const gr = c.createRadialGradient(bx, by, 22 * s * 0.4, bx, by, 45 * s);
      gr.addColorStop(0, 'rgb(205 212 218 / 0.03)'); gr.addColorStop(1, 'rgb(205 212 218 / 0.32)');
      c.fillStyle = gr; c.fillRect(0, 0, this.w, this.h);
      const cv = this._blobCv('_fogCv', [222, 228, 232], 0.3, 0.9, 0.3, 7);
      c.save(); c.imageSmoothingEnabled = true;
      [[0.9, 0, 1], [1.7, 37, 0.7]].forEach(([sp, sh, a]) => {
        const span = 200, off = (this.t * sp + sh) % span; c.globalAlpha = a;
        for (let k = -1; k <= 1; k++) c.drawImage(cv, X(-45 + off + k * span), Y(-35 + sh * 0.2), span * s, 140 * s);
      });
      c.restore();
      void R;
    }

    /** Viento: hojas, papeles y envoltorios volando a rachas, dando vueltas, y algún remolino. */
    _wind(real, ps) {
      const c = this.cx, W = this.w, H = this.h, k = Math.min(0.05, real), t = this.t;
      const gust = 0.55 + 0.45 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1), speed = 120 + 260 * Math.max(0, gust);
      const P = this.leaves || (this.leaves = []);
      const want = Math.round(W * H / 3800);
      const COLS = ['#7a8c2e', '#a3741f', '#c98f2a', '#8a4b1d', '#b8a046', '#e8e3d0', '#f2f2f2', '#d9443a', '#3d7fc2'];
      while (P.length < want) P.push({ x: Math.random() * W, y: Math.random() * H, z: 0.5 + Math.random() * 0.8, ph: Math.random() * 6.28, rot: Math.random() * 6.28, c: COLS[Math.floor(Math.random() * (Math.random() < 0.75 ? 5 : COLS.length))], big: Math.random() < 0.3 });
      for (const f of P) {
        f.rot += (3 + 6 * f.z) * k * (0.4 + gust);
        f.x += (speed * f.z + Math.sin(t * 1.3 + f.ph) * 30) * k;
        f.y += (Math.sin(t * 2.1 + f.ph) * 35 + Math.cos(f.rot) * 18) * f.z * k;
        if (f.x > W + 6) { f.x = -6; f.y = Math.random() * H; }
        if (f.y < -6) f.y += H + 12; else if (f.y > H + 6) f.y -= H + 12;
        // Al girar, la hoja se ve de canto (1 píxel) o de frente (2-3 píxeles)
        const face = Math.abs(Math.cos(f.rot)), ww = (f.big ? 3 : 2) * ps, hh = Math.max(ps, Math.round(face * (f.big ? 2 : 2)) * ps);
        const x = Math.round(f.x / ps) * ps, y = Math.round(f.y / ps) * ps;
        c.fillStyle = f.c; c.fillRect(x, y, ww, hh);
        if (face > 0.6) { c.fillStyle = 'rgb(0 0 0 / 0.18)'; c.fillRect(x, y + hh, ww, ps); }
      }
      // Rachas: estelas de aire muy tenues, en píxeles, que cruzan rápido
      c.fillStyle = 'rgb(255 255 255 / 0.12)';
      for (let i = 0; i < 6; i++) {
        const yy = Math.round(((i * 97.3 + t * 11) % H) / ps) * ps, xx = Math.round((((t * speed * 1.4) + i * 211) % (W + 160) - 80) / ps) * ps;
        c.fillRect(xx, yy, 18 * ps * gust, ps); c.fillRect(xx + 6 * ps, yy - ps, 10 * ps * gust, ps);
      }
    }

    /** Rayo que cae sobre un jugador (evento rarísimo del temporal). */
    _boltFx(real) {
      const B = this.boltHit;
      if (!B || !this.X) return;
      const age = this.t - B.t;
      if (age > 2.5) { this.boltHit = null; return; }
      const c = this.cx, ps = Math.max(1, Math.round(this.s / 14)), x = this.X(B.x), y = this.Y(B.y);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (age < 0.35 || (age > 0.5 && age < 0.62)) {
        c.fillStyle = 'rgb(235 240 255 / 0.65)'; c.fillRect(0, 0, this.w, this.h);
        // Rayo en zigzag de píxeles desde arriba hasta el jugador
        c.fillStyle = '#ffffff';
        let cx = x + (B.seed - 0.5) * 60, cy = 0;
        while (cy < y) {
          const ny = Math.min(y, cy + 6 + Math.random() * 14), nx = cx + (x - cx) * ((ny - cy) / Math.max(1, y - cy)) + (Math.random() - 0.5) * 16;
          const steps = Math.max(1, Math.round((ny - cy) / ps));
          for (let j = 0; j < steps; j++) { const px = cx + (nx - cx) * j / steps, py = cy + (ny - cy) * j / steps; c.fillRect(Math.round(px / ps) * ps - ps, Math.round(py / ps) * ps, ps * 3, ps); }
          cx = nx; cy = ny;
        }
      }
      // Humo y chispas en el sitio
      const n = 10;
      for (let i = 0; i < n; i++) { const a = i / n * 6.28, r = (age * 30 + i) % 18; c.fillStyle = age < 0.8 ? '#ffe9a0' : 'rgb(80 80 80 / 0.5)'; c.fillRect(Math.round((x + Math.cos(a) * r) / ps) * ps, Math.round((y + Math.sin(a) * r * 0.6 - age * 6) / ps) * ps, ps, ps); }
    }

    // ------------------------------------------------------------ Realización: cortinilla y repetición
    /**
     * Cortinilla de televisión propia del juego: franjas en diagonal con los colores de los dos equipos que
     * tapan el campo de golpe, el logo (un balón de píxeles girando y TOUCHLINE) y se abren barriendo.
     * Tapa los cortes de realización y la entrada y salida de las repeticiones. Va en tiempo real.
     */
    wipe(cap) {
      const STY = ['diag', 'blinds', 'iris', 'pixels', 'chevron', 'split', 'spin'];
      let st = STY[Math.floor(Math.random() * STY.length)];
      if (st === this._wipeSty) st = STY[(STY.indexOf(st) + 1) % STY.length];
      this._wipeSty = st;
      this.wipeAt = performance.now(); this.wipeCap = cap || null; this.wipeSeed = Math.random();
      // Sonido: el barrido suena en cada cortinilla y se mezcla con la voz «¡TOUCHLINE!»; lo que no se hace
      // es pisar una voz con otra: si aún suena la anterior (≈1,6 s), esta cortinilla va sin voz
      if (TL.SFX && !this.instant) {
        if (TL.SFX.rec) TL.SFX.rec('cortinilla', TL.SFX.swoosh);
        const now = performance.now(), big = cap == null || /Saque de centro|Penalti/.test(cap);
        if (TL.SFX.sample && (big || Math.random() < 0.3) && !(this._voiceUntil > now)) {
          this._voiceUntil = now + 150 + 1600;
          setTimeout(() => TL.SFX.sample('cortinilla-voz', { maxWait: 400 }), 150);
        }
      }
    }
    _wipeFx() {
      const c = this.cx, W = this.w, H = this.h;
      // Nombre del supertiro: rótulo arriba que entra deslizando y se va (no tapa la jugada)
      if (this.spTitle) {
        const a = (performance.now() - this.spTitle.at) / 1000;
        if (a > 2.6) this.spTitle = null;
        else {
          c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          const T0 = this.spTitle, fs = Math.max(14, Math.round(H * 0.075)), k = Math.min(1, a / 0.18, (2.6 - a) / 0.3);
          c.font = `italic 900 ${fs}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
          const tw = c.measureText(T0.name.toUpperCase()).width, x = W / 2 - tw / 2 + (1 - k) * -W * 0.6, y = H * 0.86;
          const sk = fs * 0.35;
          c.fillStyle = hexA(T0.c, 0.92); c.beginPath(); c.moveTo(x - fs * 0.6 + sk, y - fs * 0.62); c.lineTo(x + tw + fs * 0.6 + sk, y - fs * 0.62); c.lineTo(x + tw + fs * 0.6 - sk, y + fs * 0.62); c.lineTo(x - fs * 0.6 - sk, y + fs * 0.62); c.closePath(); c.fill();
          c.fillStyle = T0.c2 || '#ffffff'; c.fillRect(x - fs * 0.6, y + fs * 0.62, tw + fs * 1.2, 3);
          c.fillStyle = '#0b1020'; c.fillText(T0.name.toUpperCase(), x + 2, y + 2);
          c.fillStyle = '#ffffff'; c.fillText(T0.name.toUpperCase(), x, y);
        }
      }
      // Rótulo inferior con lo que ha pasado, cuando la cortinilla ya se ha abierto
      if (this.lowerCap) {
        const a = (performance.now() - this.lowerCap.at) / 1000;
        if (a > 2.6) this.lowerCap = null;
        else {
          c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          const k = Math.min(1, a / 0.2, (2.6 - a) / 0.3), fs = Math.max(12, Math.round(H * 0.048));
          c.font = `800 ${fs}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
          const tw = c.measureText(this.lowerCap.t).width, x = 14 - (1 - k) * (tw + 60), y = H - fs * 2.4;
          c.fillStyle = 'rgb(5 8 16 / 0.86)'; c.fillRect(x, y - fs * 0.75, tw + fs * 1.4, fs * 1.5);
          c.fillStyle = (this.colors && this.colors[0].main) || '#b8f53d'; c.fillRect(x, y - fs * 0.75, fs * 0.28, fs * 1.5);
          c.fillStyle = '#ffffff'; c.fillText(this.lowerCap.t, x + fs * 0.6, y);
        }
      }
      if (this.wipeAt == null) return;
      const age = (performance.now() - this.wipeAt) / 1000, DUR = 0.95;
      if (age > DUR) { this.wipeAt = null; if (this.wipeCap) this.lowerCap = { t: this.wipeCap, at: performance.now() }; return; }
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const ease = k => k * k * (3 - 2 * k);
      const inK = Math.min(1, age / 0.12), outK = age < 0.45 ? 0 : Math.min(1, (age - 0.45) / 0.5);
      const cover = ease(inK) * (1 - ease(outK));       // 0 = nada, 1 = todo tapado
      const cols = [(this.colors && this.colors[0].main) || '#1d6b3a', '#0b1020', (this.colors && this.colors[1].main) || '#2d4fa0', '#f2f2f2'];
      const st = this._wipeSty || 'diag', seed = this.wipeSeed || 0;
      if (st === 'diag') {
        const n = 7, bw = (W + H) / n, slant = H * 0.6;
        for (let k = 0; k < n + 2; k++) {
          const o = ease(Math.max(0, Math.min(1, outK * 1.4 - k * 0.04)));
          const x0 = -slant + k * bw - (1 - ease(inK)) * (W + slant) + o * (W + slant + bw);
          c.fillStyle = cols[k % 4]; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + bw + 1, 0); c.lineTo(x0 + bw + 1 - slant, H); c.lineTo(x0 - slant, H); c.closePath(); c.fill();
        }
      } else if (st === 'blinds') {
        const n = 12, bw = W / n;
        for (let k = 0; k < n; k++) { const kk = Math.max(0, Math.min(1, cover * 1.3 - (k % 2 ? 0.15 : 0))); c.fillStyle = cols[k % 3]; c.fillRect(k * bw, 0, bw * kk + 1, H); }
      } else if (st === 'iris') {
        const R = Math.hypot(W, H) / 2, r = R * (1 - cover);
        c.fillStyle = cols[1]; c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2, Math.max(0, r), 0, 6.283, true); c.fill();
        c.strokeStyle = cols[0]; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r) + 4, 0, 6.283); c.stroke();
        c.strokeStyle = cols[2]; c.lineWidth = 4; c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r) + 11, 0, 6.283); c.stroke();
      } else if (st === 'pixels') {
        const B = Math.max(10, Math.round(Math.min(W, H) / 14));
        for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) {
          const h = Math.sin((x / B) * 12.9898 + (y / B) * 78.233 + seed * 43) * 43758.5453; const r = h - Math.floor(h);
          if (r < cover) { c.fillStyle = cols[((x / B) + (y / B)) % 3 | 0]; c.fillRect(x, y, B + 1, B + 1); }
        }
      } else if (st === 'chevron') {
        const n = 6, bw = W / 3;
        c.fillStyle = `rgb(11 16 32 / ${Math.min(1, cover * 1.15).toFixed(3)})`; c.fillRect(0, 0, W, H);
        for (let k = 0; k < n; k++) {
          const x0 = -bw * 1.5 + (W + bw * 3) * cover - k * bw * 0.55 + (outK > 0 ? outK * W * 1.6 : 0);
          c.fillStyle = cols[k % 4]; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + bw * 0.55, H / 2); c.lineTo(x0, H); c.lineTo(x0 - bw * 0.6, H); c.lineTo(x0 - bw * 0.05, H / 2); c.lineTo(x0 - bw * 0.6, 0); c.closePath(); c.fill();
        }
      } else if (st === 'split') {
        const hh = H / 2 * cover;
        c.fillStyle = cols[0]; c.fillRect(0, 0, W, hh + 1); c.fillStyle = cols[2]; c.fillRect(0, H - hh - 1, W, hh + 1);
        c.fillStyle = '#ffffff'; c.fillRect(0, hh - 3, W, 3); c.fillRect(0, H - hh, W, 3);
      } else if (st === 'spin') {
        const n = 10;
        c.fillStyle = `rgb(11 16 32 / ${Math.min(1, cover * 1.1).toFixed(3)})`; c.fillRect(0, 0, W, H);
        c.save(); c.translate(W / 2, H / 2); c.rotate((age - 0.3) * 2.2);
        for (let k = 0; k < n; k++) { c.fillStyle = cols[k % 4]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, Math.hypot(W, H), k / n * 6.283, (k + cover) / n * 6.283); c.closePath(); c.fill(); }
        c.restore();
      }
      // Logo (y el rótulo de a dónde vamos) mientras está tapado
      const la = Math.max(0, Math.min(1, (cover - 0.75) / 0.25));
      if (la > 0) {
        c.save(); c.globalAlpha = la;
        const cx = W / 2, cy = H / 2 - (this.wipeCap ? H * 0.05 : 0), r = Math.min(W, H) * 0.09;
        c.fillStyle = 'rgb(5 8 16 / 0.85)'; c.beginPath(); c.arc(cx - r * 2.6, cy, r * 1.35, 0, 6.283); c.fill();
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + age * 3; c.fillStyle = k % 2 ? '#ffd23f' : '#ffffff'; const px = Math.round(cx - r * 2.6 + Math.cos(a) * r * 1.15), py = Math.round(cy + Math.sin(a) * r * 1.15); c.fillRect(px - 1, py - 1, 3, 3); }
        if (TL.Balls) TL.Balls.draw(c, TL.Balls.selected(), cx - r * 2.6, cy, r * 0.75, age * 9);
        c.font = `900 ${Math.round(r * 1.25)}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
        c.fillStyle = '#0b1020'; c.fillText('TOUCHLINE', cx - r * 1.05 + 2, cy + 2);
        c.fillStyle = '#ffffff'; c.fillText('TOUCHLINE', cx - r * 1.05, cy);
        if (this.wipeCap) {
          const fs = Math.round(r * 0.62); c.font = `800 ${fs}px Barlow Condensed, sans-serif`; c.textAlign = 'center';
          const tw = c.measureText(this.wipeCap).width;
          c.fillStyle = 'rgb(5 8 16 / 0.85)'; c.fillRect(cx - tw / 2 - fs * 0.6, cy + r * 1.7 - fs * 0.7, tw + fs * 1.2, fs * 1.4);
          c.fillStyle = '#ffd23f'; c.fillText(this.wipeCap, cx, cy + r * 1.7); c.textAlign = 'left';
        }
        c.restore();
      }
    }

    /** Graba lo que pasa en el campo (20 veces por segundo, los últimos 9 s) para poder repetirlo. */
    _record(dt) {
      if (this.replay || !(dt > 0)) return;
      this._recT = (this._recT || 0) + dt;
      if (this._recT < 0.05) return;
      this._recT = 0;
      const R = this.rec || (this.rec = []), b = this.ball, a = {};
      for (const id in this.A) { const p = this.A[id]; a[id] = [p.x, p.y, p.state, p.dive, p.fall, p.jump, p.held]; }
      R.push({ t: this.t, b: [b.x, b.y, b.z, b.owner], a, r: [this.ref.x, this.ref.y], cut: !!this._recCut }); this._recCut = false;
      while (R.length && this.t - R[0].t > 9) R.shift();
    }
    /** Paso del guion: repetición a cámara lenta de la jugada (del gol), con cortinilla al entrar y al salir. */
    /**
     * Paso del guion: repetición a cámara lenta, con cortinilla al entrar y al salir.
     * o: { mark: instante clave, before/after: segundos alrededor, slow, freeze: segundos congelado en la
     *      jugada clave, an: análisis que se dibuja encima ({ kind: 'off' | 'foul', ... }) }. Sin o: el gol.
     */
    _replayBeat(o) {
      o = o || {};
      const SLOW = o.slow || 0.6, BEFORE = o.before != null ? o.before : 3.1, AFTER = o.after != null ? o.after : 0.9, FRZ = o.freeze || 0;
      return { d: (BEFORE + AFTER) / SLOW + FRZ + 0.5, start: () => {
        const mark = (o.mark ? o.mark() : this._goalT) || this.t, end = mark + AFTER, from = mark - BEFORE;
        let frames = (this.rec || []).filter(f => f.t >= from && f.t <= end);
        // Sin saltos dentro de la repetición: empieza después del último corte anterior a la jugada y acaba antes del siguiente
        const mi = frames.findIndex(f => f.t >= mark);
        if (mi >= 0) {
          let a = 0, z = frames.length;
          for (let k = mi; k > 0; k--) if (frames[k].cut) { a = k; break; }
          for (let k = mi + 1; k < frames.length; k++) if (frames[k].cut) { z = k; break; }
          frames = frames.slice(a, z);
        }
        if (frames.length < 10) return;
        this.wipe();
        setTimeout(() => { this.replay = { frames, t: frames[0].t, slow: SLOW, end: frames[frames.length - 1].t, mark, freeze: FRZ, an: o.an || null }; }, 140);
      }, end: () => { if (this.replay) { this.wipe(); setTimeout(() => { this.replay = null; }, 140); } } };
    }
    /** Análisis encima de la repetición (con los jugadores ya colocados en el fotograma). */
    _replayAnalysis(R, frozen) {
      const A = R.an; if (!A) return;
      const c = this.cx, X = this.X, Y = this.Y, s = this.s, P = Math.max(1, Math.round(s / 14));
      const k = frozen ? 1 : Math.max(0, Math.min(1, 1 - Math.abs(R.t - R.mark) / 0.8)) * 0.7;
      if (k <= 0) return;
      c.save(); c.globalAlpha = k;
      const ring = (a, col) => { if (!a) return; c.strokeStyle = col; c.lineWidth = Math.max(2, P * 2); c.beginPath(); c.ellipse(X(a.x), Y(a.y), 1.4 * s, 1.1 * s, 0, 0, 6.283); c.stroke(); };
      const tag = (txt, col) => {
        const fs = Math.max(12, Math.round(this.h * 0.05)); c.font = `900 ${fs}px Barlow Condensed, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const w = c.measureText(txt).width + fs, x = this.w / 2, y = Math.round(this.h * 0.06) + fs;
        c.fillStyle = 'rgb(5 8 16 / 0.85)'; c.fillRect(x - w / 2, y - fs * 0.7, w, fs * 1.4); c.fillStyle = col; c.fillRect(x - w / 2, y + fs * 0.62, w, P * 2);
        c.fillStyle = '#ffffff'; c.fillText(txt, x, y); c.textAlign = 'left';
      };
      if (A.kind === 'off') {
        // Líneas del fuera de juego: penúltimo defensor (rojo) y atacante (azul), de banda a banda
        const i = A.team, runner = this.A[A.pid];
        const defs = this.team(1 - i).slice().sort((p, q) => this.depth(i, q.x) - this.depth(i, p.x));
        const second = defs[1];
        if (runner && second) {
          const lx = X(second.x), rx = X(runner.x), y0 = Y(0), y1 = Y(Wd);
          c.fillStyle = 'rgb(255 60 60 / 0.16)'; c.fillRect(Math.min(lx, rx), y0, Math.abs(rx - lx), y1 - y0);
          for (let y = y0; y < y1; y += P * 4) { c.fillStyle = '#ff3b3b'; c.fillRect(Math.round(lx) - P, y, P * 2, P * 2); c.fillStyle = '#4fb4ff'; c.fillRect(Math.round(rx) - P, y + P * 2, P * 2, P * 2); }
          ring(second, '#ff3b3b'); ring(runner, '#4fb4ff');
          const m = Math.abs(this.depth(i, runner.x) - this.depth(i, second.x));
          if (frozen) tag(`FUERA DE JUEGO · ${m.toFixed(1).replace('.', ',')} m`, '#ffd23f');
        }
      } else if (A.kind === 'foul') {
        ring(this.A[A.pid], A.card === 'red' ? '#ff3b3b' : A.card ? '#ffd23f' : '#ffffff');
        ring(this.A[A.pid2], '#ffffff');
        if (frozen) tag(A.card === 'red' ? 'ENTRADA · ROJA' : A.card ? 'ENTRADA · AMARILLA' : 'FALTA', A.card === 'red' ? '#ff3b3b' : '#ffd23f');
      }
      c.restore();
    }
    /** Coloca a todos en su sitio de golpe (solo bajo una cortinilla, para que no se vea). */
    _snapAll() {
      this._targets(); this._officials();
      const mv = a => { if (a.tx != null) { a.x = a.tx; a.y = a.ty; } a.vx = a.vy = 0; a.sx = a.tx; a.sy = a.ty; };
      for (const id in this.A) mv(this.A[id]);
      mv(this.ref); this.ars.forEach(mv);
      this.ball.trail = []; this._bpL = null; this._bl = null; this._recCut = true;
    }
    /** Pinta un fotograma de la repetición: coloca a todos donde estaban, dibuja y lo devuelve todo a su sitio. */
    _drawReplay(dt, real) {
      const R = this.replay;
      // Congelado unos segundos justo en la jugada clave (el pase del fuera de juego, el contacto de la falta)
      let frozen = false;
      if (R.freeze && !R.frozeDone && R.t >= R.mark) {
        R.frozeAt = R.frozeAt || performance.now(); frozen = true;
        if (performance.now() - R.frozeAt > R.freeze * 1000) { R.frozeDone = true; frozen = false; }
      }
      if (!frozen) R.t = Math.min(R.end, R.t + dt * R.slow);
      // Por si el guion se detiene (pausa, salto): la repetición nunca se queda colgada
      if (R.t >= R.end) { R.doneAt = R.doneAt || performance.now(); if (performance.now() - R.doneAt > 1500) { this.replay = null; this.wipe(); } }
      const F = R.frames; let k = 0;
      while (k < F.length - 2 && F[k + 1].t < R.t) k++;
      const f0 = F[k], f1 = F[k + 1] || f0, u = f1.t > f0.t ? clamp((R.t - f0.t) / (f1.t - f0.t), 0, 1) : 0;
      const b = this.ball, keepB = [b.x, b.y, b.z, b.owner, b.trail], keep = {};
      b.x = lerp(f0.b[0], f1.b[0], u); b.y = lerp(f0.b[1], f1.b[1], u); b.z = lerp(f0.b[2], f1.b[2], u); b.owner = f0.b[3];
      b.trail = (R.trail = (R.trail || []).concat([[b.x, b.y, b.z]]).slice(-7));
      for (const id in this.A) {
        const p = this.A[id], s0 = f0.a[id], s1 = f1.a[id] || s0;
        keep[id] = [p.x, p.y, p.state, p.dive, p.fall, p.jump, p.held, p.vx, p.vy];
        if (!s0) continue;
        p.x = lerp(s0[0], s1[0], u); p.y = lerp(s0[1], s1[1], u); p.state = s0[2]; p.dive = s0[3]; p.fall = s0[4]; p.jump = s0[5]; p.held = s0[6];
        p.vx = (s1[0] - s0[0]) * 20; p.vy = (s1[1] - s0[1]) * 20;
      }
      const rk = [this.ref.x, this.ref.y]; this.ref.x = lerp(f0.r[0], f1.r[0], u); this.ref.y = lerp(f0.r[1], f1.r[1], u);
      this._draw(real);
      this._replayAnalysis(R, frozen);
      [b.x, b.y, b.z, b.owner, b.trail] = keepB;
      for (const id in keep) { const p = this.A[id], s = keep[id]; [p.x, p.y, p.state, p.dive, p.fall, p.jump, p.held, p.vx, p.vy] = s; }
      [this.ref.x, this.ref.y] = rk;
      // Rótulo de repetición, bandas de cine y un velo frío
      const c = this.cx, W = this.w, H = this.h, bar = Math.round(H * 0.06);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = 'rgb(20 30 60 / 0.12)'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#05070c'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
      const fs = Math.max(11, Math.round(H * 0.045));
      c.font = `900 ${fs}px Barlow Condensed, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
      const label = 'REPETICIÓN', tw = c.measureText(label).width, x = 14, y = H - bar - fs * 0.9;
      c.fillStyle = 'rgb(5 8 16 / 0.75)'; c.fillRect(x - 6, y - fs * 0.7, tw + fs * 1.6, fs * 1.4);
      if (Math.floor(performance.now() / 450) % 2) { c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(x + 4, y, fs * 0.26, 0, 6.283); c.fill(); }
      c.fillStyle = '#ffffff'; c.fillText(label, x + fs * 0.75, y);
    }

    /**
     * Filtro CRT: curva la imagen como el cristal abombado de una tele de tubo (distorsión de barril).
     * Se hace en dos pasadas por franjas: las filas se estrechan hacia arriba y abajo y las columnas hacia los lados,
     * así los bordes se arquean hacia fuera y el centro se ve un poco más cerca.
     */
    _tube() {
      const box = this.cv.closest && this.cv.closest('.match');
      if (!box || !box.classList.contains('crt') || box.classList.contains('mini')) return;
      const cv = this.cv, w = cv.width, h = cv.height, K = 0.07, N = 40;
      const mk = () => { const b = document.createElement('canvas'); b.width = w; b.height = h; return b; };
      if (!this._tb || this._tb[0].width !== w || this._tb[0].height !== h) this._tb = [mk(), mk()];
      const [a, b] = this._tb, ga = a.getContext('2d'), gb = b.getContext('2d'), c = this.cx;
      ga.clearRect(0, 0, w, h); ga.drawImage(cv, 0, 0);
      // Pasada 1: filas (más estrechas cuanto más lejos del centro en vertical)
      gb.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const y0 = Math.floor(i * h / N), y1 = Math.floor((i + 1) * h / N), v = ((y0 + y1) / 2 / h) * 2 - 1, sx = 1 - K * v * v, dw = w * sx;
        gb.drawImage(a, 0, y0, w, y1 - y0, (w - dw) / 2, y0, dw, y1 - y0);
      }
      // Pasada 2: columnas
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const x0 = Math.floor(i * w / N), x1 = Math.floor((i + 1) * w / N), u = ((x0 + x1) / 2 / w) * 2 - 1, sy = 1 - K * u * u, dh = h * sy;
        c.drawImage(b, x0, 0, x1 - x0, h, x0, (h - dh) / 2, x1 - x0, dh);
      }
      c.restore();
    }

    /** Gotas que caen en la lente de la cámara: refractan la imagen (invertida, como una gota de verdad), resbalan y se secan. */
    /**
     * Gotas que se estampan contra la lente. Al chocar se aplastan (un destello plano) y lanzan gotitas
     * alrededor; luego se recogen en una gota redonda que refracta la imagen dada la vuelta. Si dos se tocan,
     * se juntan en una más grande (suma de áreas), y las grandes pesan y resbalan dejando un rastro.
     */
    _lensDrops(real, ps, storm) {
      const c = this.cx, W = this.w, H = this.h, dpr = this.dpr, P = Math.max(1, ps);
      const D = this.lens || (this.lens = []), SP = this.lensSpray || (this.lensSpray = []);
      if (D.length < (storm ? 34 : 20) && Math.random() < real * (storm ? 4 : 2)) {
        const r = (2 + Math.random() * 3) * P, x = Math.random() * W, y = Math.random() * H * 0.92;
        D.push({ x, y, r, age: 0, life: 5 + Math.random() * 7, vy: 0 });
        // Gotitas que salen disparadas al estamparse
        const n = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (30 + Math.random() * 70) * P; SP.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.12 + Math.random() * 0.12 }); }
      }
      // Fusión: si se tocan, la grande se queda con la otra (área conservada)
      for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
        const a = D[i], b = D[j];
        if (a.age < 0.12 || b.age < 0.12) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < (a.r + b.r) * (a.r + b.r) * 0.8) {
          const big = a.r >= b.r ? a : b, sm = big === a ? b : a, A = big.r * big.r, B = sm.r * sm.r;
          big.x = (big.x * A + sm.x * B) / (A + B); big.y = (big.y * A + sm.y * B) / (A + B);
          big.r = Math.sqrt(A + B); big.life = Math.max(big.life, sm.life) + 1; big.wob = 1;
          D.splice(D.indexOf(sm), 1); j = D.length;
        }
      }
      // Gotitas del impacto
      c.fillStyle = 'rgb(225 235 250 / 0.7)';
      for (let i = SP.length - 1; i >= 0; i--) {
        const q = SP[i]; q.age += real;
        if (q.age > q.life) { SP.splice(i, 1); continue; }
        const f = 1 - q.age / q.life; q.x += q.vx * real * f; q.y += q.vy * real * f;
        c.fillRect(Math.round(q.x / P) * P, Math.round(q.y / P) * P, P, P);
      }
      for (let i = D.length - 1; i >= 0; i--) {
        const d = D[i]; d.age += real;
        if (d.age > d.life || d.y - d.r > H) { D.splice(i, 1); continue; }
        // Las grandes pesan: resbalan acelerando y dejan un rastro de agua
        if (d.r > 5.5 * P) { d.vy = Math.min(60, d.vy + real * 25 * (d.r / (6 * P))); d.y += d.vy * real; if (Math.random() < real * 6) D.push({ x: d.x + (Math.random() - 0.5) * P, y: d.y - d.r * 1.3, r: Math.max(P, d.r * 0.25), age: 0.2, life: 1.5 + Math.random(), vy: 0 }); }
        // Impacto: primero un manchurrón plano y ancho que se recoge en gota redonda
        const hit = Math.min(1, d.age / 0.14), fade = d.age > d.life - 1 ? (d.life - d.age) : 1;
        d.wob = Math.max(0, (d.wob || 0) - real * 4);
        const sx = 1 + (1 - hit) * 0.9 + Math.sin(d.age * 40) * d.wob * 0.12, sy = (1 - (1 - hit) * 0.55) * 1.1;
        const rx = d.r * sx * (0.7 + 0.3 * fade), ry = d.r * sy * (0.7 + 0.3 * fade);
        const x = Math.round(d.x / P) * P, y = Math.round(d.y / P) * P;
        c.save();
        c.globalAlpha = Math.min(1, fade) * 0.92;
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.283); c.clip();
        const src = d.r * 3.2;
        c.translate(x, y); c.scale(-1, -1);
        try { c.drawImage(this.cv, (x - src) * dpr, (y - src) * dpr, src * 2 * dpr, src * 2 * dpr, -rx, -ry, rx * 2, ry * 2); } catch (e) { /* lienzo no listo */ }
        c.restore();
        c.save(); c.globalAlpha = Math.min(1, fade);
        if (hit < 1) { c.fillStyle = `rgb(235 242 255 / ${(0.5 * (1 - hit)).toFixed(3)})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.283); c.fill(); }
        c.strokeStyle = 'rgb(10 20 30 / 0.35)'; c.lineWidth = P;
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0.25, Math.PI - 0.25); c.stroke();
        c.fillStyle = 'rgb(255 255 255 / 0.8)'; c.fillRect(Math.round((x - rx * 0.4) / P) * P, Math.round((y - ry * 0.5) / P) * P, P, P);
        if (d.r > 3.5 * P) { c.fillStyle = 'rgb(255 255 255 / 0.35)'; c.fillRect(Math.round((x - rx * 0.4) / P) * P + P, Math.round((y - ry * 0.5) / P) * P, P, P); }
        c.restore();
      }
    }

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

    /** Efectos del balón elegido: estela de su color, fuego, hielo, rayo, arcoíris, galaxia, fantasma, tóxico o vacío. */
    _ballFx(fx, col, br, X, Y, s, fast) {
      const c = this.cx, b = this.ball, T = b.trail, t = this.t;
      const P = k => [X(T[k][0]), Y(T[k][1]) - T[k][2] * s * 0.9];
      const line = (stroke, w) => { c.beginPath(); T.forEach((_, k) => { const [x, y] = P(k); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt'; };
      const [h, sat] = ballHsl(col), hs = (l, a) => `hsl(${h} ${sat < 12 ? 0 : Math.max(55, sat)}% ${l}% / ${a})`;
      // Balón normal: estela blanca si es el clásico (blanco y negro); de su color si el balón tiene color
      if (fx === 'estela') { if (fast) line(sat < 22 ? 'rgb(255 255 255 / 0.42)' : hs(62, 0.5), br); return; }
      // Aura del color del balón que late, más intensa cuanto más rápido va
      const [x, y] = [X(b.x), Y(b.y) - b.z * s * 0.9], pulse = 1 + Math.sin(t * 6) * 0.12;
      const g = c.createRadialGradient(x, y, br * 0.6, x, y, br * 3.2 * pulse);
      g.addColorStop(0, fx === 'vacio' ? hs(18, 0.7) : hs(66, fast ? 0.55 : 0.38)); g.addColorStop(1, hs(50, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, br * 3.2 * pulse, 0, 6.283); c.fill();
      if (!fast) return;
      if (fx === 'arcoiris') {
        for (let k = 1; k < T.length; k++) { const [x0, y0] = P(k - 1), [x1, y1] = P(k); c.strokeStyle = `hsl(${(k * 50 + t * 300) % 360} 90% 60% / 0.8)`; c.lineWidth = br * (0.5 + k / T.length); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      } else if (fx === 'fuego') { line(hs(50, 0.55), br * 1.6); line(hs(80, 0.7), br * 0.7); }
      else if (fx === 'hielo') line(hs(80, 0.55), br * 1.3);
      else if (fx === 'rayo') {
        c.beginPath(); T.forEach((_, k) => { const [x, y] = P(k); const j = k ? (Math.random() - 0.5) * br * 1.6 : 0; k ? c.lineTo(x + j, y + j) : c.moveTo(x, y); });
        c.strokeStyle = hs(85, 0.95); c.lineWidth = 2; c.stroke(); line(hs(60, 0.3), br * 1.2);
      } else if (fx === 'galaxia') line(hs(45, 0.5), br * 1.4);
      else if (fx === 'toxico') line(hs(55, 0.55), br * 1.3);
      else if (fx === 'fantasma') line(hs(92, 0.25), br * 2);
      else if (fx === 'vacio') line(hs(20, 0.5), br * 1.4);
    }

    /**
     * Partículas de los balones especiales (en el mundo, con vida propia): salen más cuanto más rápido va el
     * balón y estallan en un chut fuerte. Cada efecto tiene su física: el fuego sube y se apaga, el hielo cae
     * y brilla, el rayo chisporrotea, la galaxia deja estrellas que orbitan, el tóxico burbujea…
     */
    _ballParts(fx, X, Y, s, br, bc) {
      this._bpHsl = ballHsl(bc);
      const b = this.ball, t = this.t, dt = Math.min(0.05, Math.max(0, t - (this._bpT || t))); this._bpT = t;
      const P = this.bparts || (this.bparts = []);
      const lx = this._bpL || [b.x, b.y, b.z]; this._bpL = [b.x, b.y, b.z];
      const vx = dt ? (b.x - lx[0]) / dt : 0, vy = dt ? (b.y - lx[1]) / dt : 0, sp = Math.hypot(vx, vy);
      // Chut fuerte: estallido
      const kick = sp > 14 && (this._bpSp || 0) < 8; this._bpSp = sp;
      const rate = (kick ? 70 : 0) + Math.min(90, sp * 4.5) + 6;   // partículas por segundo (algunas también quieto)
      let n = rate * dt; while (n > 0 && P.length < 260) { if (Math.random() < n) P.push(this._bpNew(fx, b, vx, vy, kick, this._bpHsl)); n--; }
      const c = this.cx, S = Math.max(2, s * 0.2);
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i]; q.a += dt;
        if (q.a > q.life) { P.splice(i, 1); continue; }
        if (fx === 'galaxia') { q.ang += dt * 3; q.x = q.cx + Math.cos(q.ang) * q.r; q.y = q.cy + Math.sin(q.ang) * q.r * 0.6; }
        else { q.x += q.vx * dt; q.y += q.vy * dt; q.z = Math.max(0, q.z + q.vz * dt); q.vz -= q.g * dt; q.vx *= 1 - dt * 1.5; q.vy *= 1 - dt * 1.5; }
        const k = 1 - q.a / q.life, px = X(q.x), py = Y(q.y) - q.z * s * 0.9;
        c.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
        c.fillStyle = typeof q.col === 'function' ? q.col(k) : q.col;
        const sz = Math.max(1, Math.round(S * q.sz * (fx === 'fuego' ? k : 1)));
        c.fillRect(Math.round(px), Math.round(py), sz, sz);
        if (fx === 'rayo' && Math.random() < 0.25) { c.fillRect(Math.round(px) + sz, Math.round(py) - sz, sz, sz); }
      }
      c.globalAlpha = 1;
    }
    _bpNew(fx, b, vx, vy, kick, H) {
      // H: tono del balón. Cada efecto conserva su forma de moverse, pero con los colores de su balón
      const [h, sat] = H || [30, 90], hs = (l, a) => `hsl(${h} ${sat < 12 ? 0 : Math.max(55, sat)}% ${l}%${a != null ? ' / ' + a : ''})`;
      const R = (a, z) => a + Math.random() * (z - a), ang = Math.random() * 6.283, burst = kick ? R(2, 6) : R(0.2, 1.2);
      const q = { x: b.x + R(-0.25, 0.25), y: b.y + R(-0.25, 0.25), z: b.z + R(0, 0.3), vx: -vx * 0.08 + Math.cos(ang) * burst, vy: -vy * 0.08 + Math.sin(ang) * burst, vz: R(0, 1), g: 0, a: 0, life: R(0.4, 0.9), sz: R(1, 2), col: '#fff' };
      switch (fx) {
        case 'fuego': q.vz = R(1.5, 3.5); q.g = -0.5; q.life = R(0.35, 0.7); q.col = k => k > 0.6 ? hs(88) : k > 0.3 ? hs(60) : hs(42); break;
        case 'hielo': q.vz = R(-0.2, 0.6); q.g = 2.5; q.life = R(0.6, 1.2); q.col = Math.random() < 0.4 ? '#ffffff' : hs(78); break;
        case 'rayo': q.vx *= 2.5; q.vy *= 2.5; q.life = R(0.12, 0.3); q.col = Math.random() < 0.5 ? '#ffffff' : hs(70); q.sz = R(1, 1.6); break;
        case 'galaxia': q.cx = b.x; q.cy = b.y; q.r = R(0.4, 1.4); q.ang = ang; q.z = b.z + R(0, 0.5); q.life = R(0.8, 1.6); q.col = ['#ffffff', hs(82), hs(70), hs(58)][Math.floor(Math.random() * 4)]; q.sz = R(0.8, 1.5); break;
        case 'arcoiris': { const h = Math.floor((this.t * 240 + Math.random() * 60) % 360); q.col = `hsl(${h} 95% 62%)`; q.life = R(0.5, 1); q.g = 1.2; q.vz = R(0.5, 2); break; }
        case 'fantasma': q.vz = R(0.3, 1); q.g = -0.2; q.life = R(0.8, 1.4); q.col = hs(90, 0.6); q.sz = R(1.5, 2.5); q.vx *= 0.4; q.vy *= 0.4; break;
        case 'toxico': q.vz = R(0.4, 1.4); q.g = -0.3; q.life = R(0.6, 1.2); q.col = Math.random() < 0.5 ? hs(55) : hs(75); break;
        case 'vacio': { const r = R(1.2, 2.2); q.x = b.x + Math.cos(ang) * r; q.y = b.y + Math.sin(ang) * r * 0.6; q.vx = (b.x - q.x) * 2.2; q.vy = (b.y - q.y) * 2.2; q.life = 0.45; q.col = Math.random() < 0.5 ? hs(45) : hs(12); break; }
        default: break;
      }
      return q;
    }

    /** Animación propia de cada supertiro (alrededor del balón y en su estela). Los jugadores siguen siendo puntos. */
    _superDraw(SF, bx, by, br, X, Y, s) {
      const c = this.cx, t = this.t, age = t - SF.t0, T = this.ball.trail, P = k => [X(T[k][0]), Y(T[k][1]) - T[k][2] * s * 0.9];
      const fade = Math.max(0, Math.min(1, (SF.until - t) / 0.6)), px = Math.max(2, Math.round(s * 0.18));
      const dot = (x, y, col, z) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), z || px, z || px); };
      c.save(); c.globalAlpha = fade;
      // Onda expansiva al golpear
      const sh = this.shock;
      if (sh && t - sh.t < 0.6) { const k = (t - sh.t) / 0.6; c.strokeStyle = hexA(sh.c, 1 - k); c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.ellipse(X(sh.x), Y(sh.y), 6 * s * k, 4 * s * k, 0, 0, 6.283); c.stroke(); }
      switch (SF.id) {
        case 'catapulta': case 'espiral': { // espiral de fuego girando alrededor del balón
          for (let q = 0; q < 14; q++) { const a = t * 14 + q * 0.45, r = br * (1.6 + (q % 4) * 0.35); dot(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.6, q % 2 ? SF.c : SF.c2); }
          break;
        }
        case 'tigre': { // tres zarpazos que acompañan al balón
          for (let q = -1; q <= 1; q++) { c.strokeStyle = hexA(SF.c, 0.9); c.lineWidth = px * 0.8; c.beginPath(); c.moveTo(bx - br * 3, by + q * br * 1.2 - br * 2); c.lineTo(bx + br * 0.5, by + q * br * 1.2 + br * 0.6); c.stroke(); }
          break;
        }
        case 'hoja': { // hojas que caen del balón al bambolearse
          for (let q = 0; q < 6; q++) { const k = (age * 2 + q / 6) % 1; dot(bx + Math.sin(age * 9 + q) * br * 2.5, by + k * br * 5, q % 2 ? SF.c : '#7fc23a', px * 1.4); }
          break;
        }
        case 'dragon': { // cuerpo de dragón eléctrico serpenteando por la estela, con cabeza
          for (let k = 0; k < T.length; k++) { const [x, y] = P(k); const w = Math.sin(t * 18 + k) * br * 1.4; dot(x, y + w, k % 2 ? SF.c : SF.c2, px * (1 + k / T.length)); }
          dot(bx + br, by - br * 1.2, '#ffffff', px * 1.6); dot(bx + br * 1.8, by - br * 0.6, SF.c, px * 1.2);
          break;
        }
        case 'saeta': { // rayo recto y fogonazos
          if (T.length) { const [x0, y0] = P(0); c.strokeStyle = hexA(SF.c, 0.95); c.lineWidth = Math.max(2, br * 0.7); c.beginPath(); c.moveTo(x0, y0); c.lineTo(bx, by); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke(); }
          if (Math.random() < 0.4) dot(bx + (Math.random() - 0.5) * br * 4, by + (Math.random() - 0.5) * br * 4, '#ffffff', px * 1.5);
          break;
        }
        case 'fenix': { // alas de fuego que baten
          const flap = Math.sin(t * 16) * 0.5 + 0.5;
          for (const sd of [-1, 1]) for (let q = 1; q <= 6; q++) dot(bx + sd * q * br * 0.8, by - q * br * (0.3 + flap * 0.5) + q * q * br * 0.05, q % 2 ? SF.c : SF.c2, px * 1.2);
          break;
        }
        case 'ego': { // anillos oscuros que se cierran sobre el balón
          for (let q = 0; q < 3; q++) { const k = ((age * 1.6 + q / 3) % 1), r = br * (5 - k * 4); c.strokeStyle = hexA(SF.c, k); c.lineWidth = 2; c.beginPath(); c.arc(bx, by, r, 0, 6.283); c.stroke(); }
          break;
        }
        case 'monstruo': { // sombra de monstruo que acompaña: dos ojos y zigzag
          dot(bx - br * 2.2, by - br * 2.4, '#ffe033', px * 1.4); dot(bx - br * 1.2, by - br * 2.4, '#ffe033', px * 1.4);
          for (let k = 1; k < T.length; k++) { const [x, y] = P(k); dot(x + (k % 2 ? br : -br), y, '#1a1a1a', px * 1.3); }
          break;
        }
        case 'halcon': { // plumas blancas y alas abiertas en picado
          for (const sd of [-1, 1]) for (let q = 1; q <= 5; q++) dot(bx + sd * q * br * 0.9, by - br * 0.6 - q * br * 0.25, q % 2 ? '#ffffff' : SF.c, px);
          for (let q = 0; q < 3; q++) { const k = (age * 1.5 + q / 3) % 1; dot(bx + (q - 1) * br * 2, by - br + k * br * 4, '#ffffff', px); }
          break;
        }
        case 'galaxia': { // estrellas en órbita
          for (let q = 0; q < 10; q++) { const a = t * 4 + q * 0.63, r = br * (2 + (q % 3)); dot(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.55, ['#ffffff', SF.c, SF.c2][q % 3]); }
          break;
        }
        case 'arcoiris': { // estela de bandas de colores
          for (let k = 1; k < T.length; k++) { const [x0, y0] = P(k - 1), [x1, y1] = P(k); for (let b = 0; b < 5; b++) { c.strokeStyle = `hsl(${b * 60 + t * 200} 90% 60%)`; c.lineWidth = px; c.beginPath(); c.moveTo(x0, y0 + (b - 2) * px); c.lineTo(x1, y1 + (b - 2) * px); c.stroke(); } }
          break;
        }
        default:
      }
      c.restore();
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
      if (a.kind === 'boy') {
        // Recogepelotas: chándal del club local, más pequeño
        const r = R * 0.58, thr = a.state === 'throw' && this.t - a.throwAt < 0.5;
        c.beginPath(); c.ellipse(x + 1, y + r * 0.9, r * 0.9, r * 0.33, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.fill();
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = '#2a2f3a'; c.fill();
        c.lineWidth = 1.5; c.strokeStyle = this.colors[0].main; c.stroke();
        if (thr) { c.fillStyle = '#f2d2b6'; c.fillRect(x - r * 0.3, y - r * 1.6, r * 0.6, r * 0.7); }
        if (a.fetch && a.fetch.taken) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + r * 0.8, y - r * 0.4, r * 0.45, 0, 6.283); c.fill(); }
        return;
      }
      if (a.kind === 'warm') {
        const r = R * 0.72, st = a.state === 'stretch';
        c.beginPath(); c.ellipse(x + 1, y + r * 0.9, r * 0.9, r * 0.33, 0, 0, 6.283); c.fillStyle = 'rgb(0 0 0 / 0.25)'; c.fill();
        // Peto fosforito (distinto para cada equipo) sobre la camiseta
        c.beginPath(); c.arc(x, y - (st ? 0 : Math.abs(Math.sin(this.t * 8 + a.k)) * r * 0.25), r, 0, 6.283);
        c.fillStyle = a.team === 0 ? '#d4ff3a' : '#ff7b1c'; c.fill();
        c.lineWidth = 1.6; c.strokeStyle = this.colors[a.team].main; c.stroke();
        if (st) { c.fillStyle = '#f2d2b6'; c.fillRect(x - r * 1.5, y - r * 0.2, r * 0.6, r * 0.4); c.fillRect(x + r * 0.9, y - r * 0.2, r * 0.6, r * 0.4); }   // brazos estirando
      }
    }
  }

  /** Tono y saturación de un color '#rrggbb' → [h, s] (para teñir estelas, auras y partículas del balón). */
  function ballHsl(hex) {
    if (!hex || hex[0] !== '#') return [0, 0];
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return [0, 0];
    const sat = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
    return [h, Math.round(sat * 100)];
  }

  /** '#rrggbb' + transparencia → rgba(). */
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  TL.Pitch = Pitch;
})();
