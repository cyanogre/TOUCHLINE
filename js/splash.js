/* TOUCHLINE — portadas vivas («splash art» animado) para elegir fútbol masculino o femenino.
   Sobre la acuarela: cámara lenta, parallax con el puntero, cintas y banderas que ondean, rayos y
   brillo en la copa, destellos en las medallas, flashes de cámara en la grada, confeti y un
   revelado de pintura al entrar. Todo en un <canvas> por tarjeta; se para solo cuando la tarjeta
   desaparece o la pestaña no se ve. */
(function () {
  const TL = window.TL = window.TL || {};
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const easeInOut = x => (x = clamp(x, 0, 1)) < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  // Coordenadas normalizadas (0–1) sobre cada acuarela.
  // warps: zonas que ondean. r = rectángulo; m = 'h' (filas que se mueven en horizontal: cintas y
  // banderas colgando) o 'v' (columnas en vertical: pelo al viento); a = amplitud en píxeles de la
  // imagen; k = ondas; sp = velocidad; e = dónde está sujeta ('a' al principio, 'b' al final);
  // f = bordes difuminados [izq, der, arriba, abajo] para que no se note el corte.
  const ART = {
    F: {
      src: 'assets/splash/fem.webp', focus: [0.5, 0.4],
      trophy: [0.475, 0.1], cup: [0.48, 0.09, 0.09, 0.08],
      warps: [
        { r: [0.26, 0.075, 0.415, 0.31], m: 'h', a: 4, k: 1.1, sp: 2.2, f: [0.25, 0.4, 0.1, 0.3] },
        { r: [0.545, 0.075, 0.68, 0.33], m: 'h', a: 4, k: 1.2, sp: 2.5, ph: 1.7, f: [0.4, 0.25, 0.1, 0.3] },
        { r: [0.0, 0.43, 0.2, 0.63], m: 'v', a: 3, k: 1.3, sp: 1.8, e: 'b', f: [0.12, 0.35, 0.25, 0.25] },
        { r: [0.82, 0.6, 0.94, 0.78], m: 'h', a: 2.5, k: 1, sp: 2.6, ph: 0.6, f: [0.3, 0.3, 0.1, 0.3] },
      ],
      glints: [[0.43, 0.04], [0.53, 0.05], [0.465, 0.16], [0.528, 0.586], [0.628, 0.746]],
      stands: [[0.0, 0.2, 0.3, 0.42], [0.62, 0.2, 1.0, 0.44]],
      colors: ['#5b2a86', '#8e5cc2', '#c9a7e8', '#f2c94c', '#fff4d6'],
    },
    M: {
      src: 'assets/splash/masc.webp', focus: [0.56, 0.4],
      trophy: [0.585, 0.13], cup: [0.585, 0.12, 0.095, 0.09],
      warps: [
        { r: [0.0, 0.03, 0.15, 0.34], m: 'h', a: 3.5, k: 1.2, sp: 2.4, f: [0.1, 0.3, 0.1, 0.3] },
        { r: [0.87, 0.15, 1.0, 0.44], m: 'h', a: 3.5, k: 1.1, sp: 2.1, ph: 2.2, f: [0.3, 0.1, 0.1, 0.3] },
        { r: [0.37, 0.09, 0.515, 0.37], m: 'h', a: 4, k: 1.2, sp: 2.3, ph: 0.9, f: [0.25, 0.4, 0.1, 0.3] },
        { r: [0.655, 0.12, 0.745, 0.43], m: 'h', a: 4, k: 1.1, sp: 2.6, ph: 2.9, f: [0.4, 0.25, 0.1, 0.3] },
      ],
      glints: [[0.53, 0.055], [0.645, 0.075], [0.6, 0.215], [0.59, 0.674], [0.215, 0.907], [0.383, 0.814]],
      stands: [[0.0, 0.3, 0.42, 0.5], [0.68, 0.33, 1.0, 0.52]],
      colors: ['#1d4e9e', '#4f86d9', '#ffffff', '#f2c94c', '#cfe0ff'],
    },
  };

  const imgs = {};
  function image(src) {
    if (!imgs[src]) { const im = new Image(); im.decoding = 'async'; im.src = src; imgs[src] = im; }
    return imgs[src];
  }
  const preload = () => { for (const k in ART) image(ART[k].src); };

  // ---- Sprites compartidos (se dibujan una vez)
  let RAYS = null, STAR = null, DOT = null;
  function raysSprite() {
    if (RAYS) return RAYS;
    const S = 512, R = S / 2, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.translate(R, R);
    for (let i = 0, N = 15; i < N; i++) {
      const a = (i / N) * TAU + rnd(-0.1, 0.1), w = rnd(0.035, 0.1);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
      grd.addColorStop(0, 'rgba(255,247,220,0.6)'); grd.addColorStop(0.3, 'rgba(255,238,196,0.25)'); grd.addColorStop(1, 'rgba(255,238,196,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * rnd(0.65, 1), a - w, a + w); g.closePath(); g.fill();
    }
    return (RAYS = c);
  }
  function starSprite() {
    if (STAR) return STAR;
    const S = 96, h = S / 2, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const glow = g.createRadialGradient(h, h, 0, h, h, h * 0.55);
    glow.addColorStop(0, 'rgba(255,250,235,0.9)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = glow; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,255,250,0.95)';
    for (const [w, l] of [[0.07, 1], [0.045, 0.6]]) {
      for (let i = 0; i < 4; i++) {
        g.save(); g.translate(h, h); g.rotate(i * Math.PI / 2 + (l < 1 ? Math.PI / 4 : 0));
        g.beginPath(); g.moveTo(0, -h * l); g.lineTo(h * w, 0); g.lineTo(0, h * w * 2); g.lineTo(-h * w, 0); g.closePath(); g.fill();
        g.restore();
      }
    }
    return (STAR = c);
  }
  function dotSprite() {
    if (DOT) return DOT;
    const S = 32, h = S / 2, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), grd = g.createRadialGradient(h, h, 0, h, h, h);
    grd.addColorStop(0, 'rgba(255,240,190,1)'); grd.addColorStop(0.3, 'rgba(255,214,120,0.55)'); grd.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    return (DOT = c);
  }

  // ---- Partículas (coordenadas normalizadas al lienzo)
  function confetti(cols, anywhere) {
    const z = rnd(0.35, 1.35);
    return {
      k: 'c', x: Math.random(), y: anywhere ? rnd(-0.1, 1) : rnd(-0.18, -0.04), z,
      vy: rnd(0.045, 0.09) * (0.6 + z * 0.5), vx: rnd(-0.015, 0.015), sw: rnd(0.015, 0.04), ph: rnd(0, TAU),
      rot: rnd(0, TAU), vr: rnd(-2.2, 2.2), fl: rnd(0, TAU), vf: rnd(3, 7),
      col: cols[Math.random() * cols.length | 0], w: rnd(0.012, 0.02), h: rnd(0.006, 0.01),
    };
  }
  const mote = anywhere => ({ k: 'd', x: rnd(0.12, 0.88), y: anywhere ? Math.random() : rnd(1, 1.1), z: rnd(0.5, 1.2), vy: -rnd(0.02, 0.05), ph: rnd(0, TAU), r: rnd(0.004, 0.008) });

  const live = new Set();
  let raf = 0, last = 0;
  function kick() { if (!raf && live.size && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    for (const st of live) {
      if (!st.btn.isConnected) { live.delete(st); continue; }
      try { frame(st, dt, now); } catch (e) { live.delete(st); console.warn('splash', e); }
      if (reduce && st.drawn) live.delete(st);
    }
    kick();
  }
  document.addEventListener('visibilitychange', kick);

  /** Monta la animación en un botón `.sp-card` que contiene un `canvas.sp-art`. */
  function mount(btn, kind, delay) {
    const A = ART[kind], cv = btn && btn.querySelector('canvas.sp-art');
    if (!A || !cv) return;
    const st = {
      btn, cv, A, ctx: cv.getContext('2d'), img: image(A.src), delay: delay || 0, ready: 0, drawn: false,
      t: rnd(0, 40), seed: rnd(0, 10), px: 0, py: 0, tx: 0, ty: 0, hov: 0, hovT: 0, press: 0, down: 0,
      flash: 0, boost: 0, parts: [], flashes: [], blobs: null, tro: [0.5, 0.15],
      off: document.createElement('canvas'), off2: null, mask: null,
    };
    if (!reduce) {
      for (let i = 0; i < 24; i++) st.parts.push(confetti(A.colors, true));
      for (let i = 0; i < 14; i++) st.parts.push(mote(true));
    }
    btn._sp = st;
    const slot = btn.parentElement || btn;
    const aim = e => {
      const r = slot.getBoundingClientRect();
      st.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      st.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    };
    slot.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { st.hovT = 1; aim(e); } });
    slot.addEventListener('pointerleave', () => { st.hovT = 0; st.down = 0; });
    slot.addEventListener('pointerdown', () => { st.down = 1; });
    slot.addEventListener('pointerup', () => { st.down = 0; });
    slot.addEventListener('pointercancel', () => { st.down = 0; });
    live.add(st); kick();
  }

  function frame(st, dt, now) {
    const { cv, ctx, img, A } = st;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (!img.complete || !img.naturalWidth) return;
    if (!st.ready) st.ready = now + st.delay;
    st.t += dt;
    const t = st.t;
    const rev = reduce ? 1 : (now - st.ready) / 1700;

    // Puntero suavizado; sin ratón encima, un vaivén lento para que el parallax respire
    if (!st.hovT) { st.tx = 0.45 * Math.sin(t * 0.21 + st.seed); st.ty = 0.3 * Math.sin(t * 0.16 + st.seed * 2); }
    const k = Math.min(1, dt * 5);
    st.px += (st.tx - st.px) * k; st.py += (st.ty - st.py) * k;
    st.hov += (st.hovT - st.hov) * Math.min(1, dt * 6);
    st.press += (st.down - st.press) * Math.min(1, dt * 14);
    st.flash = Math.max(0, st.flash - dt * 1.6);
    st.boost = Math.max(0, st.boost - dt * 0.5);

    // Cámara: plano lento que se acerca y se aleja + parallax
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih) * (reduce ? 1.04 : 1.09 + 0.025 * Math.sin(t * 0.11) + 0.035 * st.hov);
    let ox = W / 2 - A.focus[0] * iw * s, oy = H / 2 - A.focus[1] * ih * s;
    if (!reduce) {
      ox += Math.sin(t * 0.07) * W * 0.018 - st.px * W * 0.022;
      oy += Math.cos(t * 0.053) * H * 0.014 - st.py * H * 0.018;
    }
    ox = clamp(ox, W - iw * s, 0); oy = clamp(oy, H - ih * s, 0);
    const X = u => ox + u * iw * s, Y = v => oy + v * ih * s;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, ox, oy, iw * s, ih * s);
    st.drawn = true;
    if (reduce) return;
    for (const w of A.warps) warp(st, w, ox, oy, s);

    const Tx = X(A.trophy[0]), Ty = Y(A.trophy[1]);
    st.tro = [Tx / W, Ty / H];
    if (rev < 1) reveal(st, rev, W, H);
    const on = easeOut(rev);

    // Luz de la copa: rayos que giran despacio y halo que late
    const glow = on * (0.4 + 0.1 * Math.sin(t * 1.1) + 0.2 * st.hov + st.boost);
    const R = Math.max(W, H) * 0.95, rays = raysSprite();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(Tx, Ty); ctx.rotate(t * 0.045);
    ctx.globalAlpha = Math.min(1, 0.38 * glow); ctx.drawImage(rays, -R, -R, R * 2, R * 2);
    ctx.rotate(-t * 0.1);
    ctx.globalAlpha = Math.min(1, 0.3 * glow); ctx.drawImage(rays, -R * 0.7, -R * 0.7, R * 1.4, R * 1.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hr = W * 0.34, hg = ctx.createRadialGradient(Tx, Ty, 0, Tx, Ty, hr);
    hg.addColorStop(0, 'rgba(255,244,212,0.45)'); hg.addColorStop(1, 'rgba(255,244,212,0)');
    ctx.globalAlpha = Math.min(1, glow); ctx.fillStyle = hg; ctx.fillRect(Tx - hr, Ty - hr, hr * 2, hr * 2);

    // Reflejo que cruza la copa cada pocos segundos
    sheen(st, X(A.cup[0]), Y(A.cup[1]), A.cup[2] * iw * s, A.cup[3] * ih * s, on);

    // Flashes de cámara en la grada
    if (Math.random() < dt * 1.7 * on) {
      const z = A.stands[Math.random() * A.stands.length | 0];
      st.flashes.push({ u: rnd(z[0], z[2]), v: rnd(z[1], z[3]), life: 0, max: rnd(0.1, 0.22), r: rnd(0.012, 0.026) });
    }
    ctx.globalCompositeOperation = 'lighter';
    const star = starSprite();
    for (let i = st.flashes.length - 1; i >= 0; i--) {
      const f = st.flashes[i]; f.life += dt;
      if (f.life > f.max) { st.flashes.splice(i, 1); continue; }
      const a = 1 - f.life / f.max, r = f.r * W * (1 + 1.5 * (1 - a));
      ctx.globalAlpha = a * 0.9;
      ctx.drawImage(star, X(f.u) - r * 2, Y(f.v) - r * 2, r * 4, r * 4);
    }
    // Destellos en el borde de la copa y en las medallas
    A.glints.forEach(([u, v], i) => {
      const a = Math.pow(Math.max(0, Math.sin(t * (0.8 + i * 0.13) + i * 2.1)), 14) * on;
      if (a < 0.02) return;
      const sz = W * (0.07 + 0.025 * (i % 2)) * (0.55 + 0.45 * a);
      ctx.globalAlpha = a;
      ctx.translate(X(u), Y(v)); ctx.rotate(t * 0.7 + i);
      ctx.drawImage(star, -sz / 2, -sz / 2, sz, sz);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });

    particles(st, dt, W, H, on);

    if (st.flash > 0) {
      const fr = Math.max(W, H) * 1.1, fg = ctx.createRadialGradient(Tx, Ty, 0, Tx, Ty, fr);
      fg.addColorStop(0, 'rgba(255,250,235,0.9)'); fg.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = st.flash * 0.7;
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // La tarjeta se inclina hacia el ratón y un brillo la recorre
    const b = st.btn.style;
    b.transform = `rotateX(${(-st.py * 5 * st.hov).toFixed(2)}deg) rotateY(${(st.px * 7 * st.hov).toFixed(2)}deg) translateY(${(-4 * st.hov).toFixed(1)}px) scale(${(1 + 0.012 * st.hov - 0.035 * st.press).toFixed(3)})`;
    b.setProperty('--hov', st.hov.toFixed(3));
    b.setProperty('--gx', ((st.px * 0.5 + 0.5) * 100).toFixed(1) + '%');
    b.setProperty('--gy', ((st.py * 0.5 + 0.5) * 100).toFixed(1) + '%');
  }

  /** Una zona de la imagen que ondea: se redibuja en tiras finas desplazadas por una onda. */
  function warp(st, w, ox, oy, s) {
    const { ctx, img, off } = st;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const [x0, y0, x1, y1] = w.r;
    const X0 = ox + x0 * iw * s, Y0 = oy + y0 * ih * s;
    const RW = Math.ceil((x1 - x0) * iw * s), RH = Math.ceil((y1 - y0) * ih * s);
    const pad = Math.ceil(w.a * s) + 2, ow = RW + pad * 2, oh = RH + pad * 2;
    if (off.width < ow || off.height < oh) { off.width = Math.max(off.width, ow); off.height = Math.max(off.height, oh); }
    const g = off.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, off.width, off.height);
    const step = Math.max(2, Math.round(2 * (window.devicePixelRatio || 1)));
    const horiz = w.m === 'h', len = horiz ? RH : RW, n = Math.ceil(len / step);
    const t = st.t, amp = w.a * s, ph = w.ph || 0;
    for (let i = 0; i < n; i++) {
      const p = (i * step) / len;
      const env = w.e === 'b' ? 1 - p : w.e === 'f' ? 1 : p;
      const d = amp * env * (Math.sin(TAU * w.k * p - t * w.sp + ph) * 0.8 + Math.sin(TAU * w.k * 2.3 * p - t * w.sp * 1.7 + ph * 2) * 0.2);
      if (horiz) {
        const sy = y0 * ih + (i * step) / s, sh = Math.min(step / s, ih - sy);
        if (sh <= 0) break;
        g.drawImage(img, x0 * iw, sy, (x1 - x0) * iw, sh, pad + d, pad + i * step, RW, step + 0.6);
      } else {
        const sx = x0 * iw + (i * step) / s, sw = Math.min(step / s, iw - sx);
        if (sw <= 0) break;
        g.drawImage(img, sx, y0 * ih, sw, (y1 - y0) * ih, pad + i * step, pad + d, step + 0.6, RH);
      }
    }
    // Bordes difuminados: la zona se funde con la imagen de debajo
    const [fl, fr, ft, fb] = w.f || [0.25, 0.25, 0.25, 0.25];
    g.globalCompositeOperation = 'destination-in';
    const lx = g.createLinearGradient(pad, 0, pad + RW, 0);
    lx.addColorStop(0, 'rgba(0,0,0,0)'); lx.addColorStop(fl, '#000'); lx.addColorStop(1 - fr, '#000'); lx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lx; g.fillRect(0, 0, ow, oh);
    const ly = g.createLinearGradient(0, pad, 0, pad + RH);
    ly.addColorStop(0, 'rgba(0,0,0,0)'); ly.addColorStop(ft, '#000'); ly.addColorStop(1 - fb, '#000'); ly.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ly; g.fillRect(0, 0, ow, oh);
    ctx.drawImage(off, 0, 0, ow, oh, X0 - pad, Y0 - pad, ow, oh);
  }

  /** Banda de luz en diagonal que cruza el cuerpo de la copa (recortada con bordes suaves). */
  function sheen(st, cx, cy, rx, ry, on) {
    const cyc = 4.6, p = ((st.t + st.seed) % cyc) / 1.2;
    if (p > 1) return;
    const o = st.off2 || (st.off2 = document.createElement('canvas'));
    const w = Math.max(2, Math.ceil(rx * 2)), h = Math.max(2, Math.ceil(ry * 2));
    if (o.width !== w || o.height !== h) { o.width = w; o.height = h; }
    const g = o.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.55);
    const bx = -w * 0.9 + p * w * 1.8, bw = w * 0.16;
    const lg = g.createLinearGradient(bx - bw, 0, bx + bw, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,250,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(bx - bw, -h * 1.5, bw * 2, h * 3);
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    g.save(); g.scale(1, h / w);
    const rg = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    rg.addColorStop(0, '#000'); rg.addColorStop(0.65, '#000'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, w);
    g.restore();
    const c = st.ctx;
    c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.75 * on * Math.sin(Math.PI * p);
    c.drawImage(o, cx - rx, cy - ry);
  }

  /** Revelado de acuarela: manchas que crecen desde la copa hasta cubrir la tarjeta. */
  function reveal(st, rev, W, H) {
    if (rev <= 0) { st.ctx.clearRect(0, 0, W, H); return; }
    if (!st.blobs) {
      const b = [{ x: st.tro[0], y: st.tro[1], R: 1.3, d: 0 }];
      for (let i = 0; i < 7; i++) b.push({ x: rnd(0.08, 0.92), y: rnd(0.25, 0.95), R: rnd(0.18, 0.32), d: rnd(0.04, 0.4) });
      for (const o of b) Object.assign(o, { amp: rnd(0.12, 0.22), p1: rnd(0, TAU), p2: rnd(0, TAU), p3: rnd(0, TAU) });
      st.blobs = b;
    }
    const m = st.mask || (st.mask = document.createElement('canvas'));
    if (m.width !== W || m.height !== H) { m.width = W; m.height = H; }
    const g = m.getContext('2d'), D = Math.hypot(W, H);
    g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.fillStyle = '#000';
    st.blobs.forEach((b, j) => {
      const q = (rev - b.d) / (1 - b.d);
      const p = j ? easeOut(q) : easeInOut(q);
      if (p <= 0) return;
      const r = b.R * D * p;
      for (const [sc, al] of [[1, 0.4], [0.86, 1]]) {
        g.globalAlpha = al; g.beginPath();
        for (let i = 0; i <= 30; i++) {
          const a = (i / 30) * TAU;
          const n = 1 + b.amp * (Math.sin(a * 3 + b.p1) * 0.5 + Math.sin(a * 5 + b.p2) * 0.3 + Math.sin(a * 9 + b.p3) * 0.2);
          const x = b.x * W + Math.cos(a) * r * sc * n, y = b.y * H + Math.sin(a) * r * sc * n;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.fill();
      }
    });
    const c = st.ctx;
    c.globalCompositeOperation = 'destination-in'; c.globalAlpha = 1;
    c.drawImage(m, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }

  function particles(st, dt, W, H, on) {
    const { ctx, A } = st, t = st.t, dot = dotSprite();
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const p = st.parts[i];
      if (p.b) { // confeti del estallido al elegir
        p.bx *= 1 - dt * 1.4; p.by += dt * 0.95;
        p.x += p.bx * dt; p.y += p.by * dt; p.rot += p.vr * dt * 2; p.fl += p.vf * dt;
        if (p.y > 1.2 || p.x < -0.25 || p.x > 1.25) { st.parts.splice(i, 1); continue; }
      } else if (p.k === 'c') {
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * p.sw) * dt; p.rot += p.vr * dt; p.fl += p.vf * dt;
        if (p.y > 1.12) Object.assign(p, confetti(A.colors, false));
      } else {
        p.y += p.vy * dt; p.x += Math.sin(t * 0.8 + p.ph) * 0.01 * dt;
        if (p.y < -0.05) Object.assign(p, mote(false));
      }
      const x = p.x * W - st.px * W * 0.03 * p.z, y = p.y * H - st.py * H * 0.02 * p.z;
      if (p.k === 'c') {
        const f = Math.cos(p.fl);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = on * (0.45 + 0.4 * Math.min(1, p.z)) * (f < 0 ? 0.75 : 1);
        ctx.fillStyle = p.col;
        const w = p.w * W * p.z, h = p.h * W * p.z;
        ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(1, Math.max(0.12, Math.abs(f)));
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        const r = p.r * W * p.z * 3;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = on * (0.35 + 0.35 * Math.sin(t * 2.2 + p.ph));
        ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
      }
    }
  }

  /** Celebración al elegir: estallido de confeti desde la copa, fogonazo y aplausos. */
  function burst(btn) {
    const st = btn && btn._sp;
    if (!st) return false;
    if (TL.SFX && TL.SFX.applause) TL.SFX.applause(1.8, 0.4);
    if (reduce) return false;
    for (let i = 0; i < 70; i++) {
      const a = rnd(0, TAU), sp = rnd(0.25, 0.95), p = confetti(st.A.colors, false);
      Object.assign(p, { b: 1, x: st.tro[0], y: st.tro[1], bx: Math.cos(a) * sp * 0.8, by: Math.sin(a) * sp - 0.35, z: rnd(0.7, 1.5) });
      st.parts.push(p);
    }
    st.flash = 1; st.boost = 0.9;
    kick();
    return true;
  }

  TL.Splash = { mount, burst, preload, ART };
})();
