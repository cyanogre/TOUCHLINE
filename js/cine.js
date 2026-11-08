/* TOUCHLINE — cinemáticas cortas: el «¡BUM!» de los eventos y el LIMIT BREAK
 *
 * LIMIT BREAK: el jugador (su puntito, como en el partido 2D) cruza la pantalla en zigzag dejando
 * imágenes residuales, se para en el centro, carga un aura y estalla: destello, ondas de choque,
 * temblor, letras enormes con aberración cromática y el potencial subiendo número a número.
 * Suena assets/sfx/limit-break/1.mp3 si existe (si no, un efecto sintetizado).
 */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = s => (TL.t ? TL.t(s) : s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function layer(cls, html) {
    const el = document.createElement('div');
    el.className = 'cine ' + cls;
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  // ------------------------------------------------------------ ¡BUM!
  /** Golpe corto antes de enseñar un evento. Devuelve una promesa (≈ 0,8 s). */
  function boom(o) {
    o = o || {};
    if (TL.SFX) { if (!(TL.SFX.sample && TL.SFX.sample('evento'))) TL.SFX.boom && TL.SFX.boom(); }
    if (reduce()) return Promise.resolve();
    const word = o.word || '¡BUM!';
    const el = layer('boom tone-' + (o.tone || 'neu'), `<div class="boom-burst"><svg viewBox="-100 -100 200 200" aria-hidden="true"><polygon points="${burst(14, 92, 58)}"/></svg>
      <div class="boom-word">${esc(tr(word))}</div>${o.label ? `<div class="boom-cat">${esc(o.icon || '')} ${esc(tr(o.label))}</div>` : ''}</div>`);
    document.body.classList.add('shake-s');
    setTimeout(() => document.body.classList.remove('shake-s'), 380);
    return new Promise(res => {
      let done = false;
      const end = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 220); res(); };
      el.addEventListener('click', end);
      setTimeout(end, 820);
    });
  }
  function burst(n, R, r) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = (i % 2 ? r : R) * (0.9 + Math.random() * 0.18);
      pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1));
    }
    return pts.join(' ');
  }

  // ------------------------------------------------------------ LIMIT BREAK
  /**
   * info: { name, num, pos, from, to, o0, o1, col (color de su camiseta), ink }
   * Devuelve una promesa que se cumple al cerrar.
   */
  function limitBreak(info) {
    const rm = reduce();
    playLB();
    const el = layer('lb' + (rm ? ' static' : ''), `<canvas class="cine-cv" aria-hidden="true"></canvas><div class="cine-flash"></div>
      <div class="lb-stage" role="dialog" aria-label="Limit break">
        <div class="lb-kicker">${esc(info.name)}</div>
        <div class="lb-title" aria-label="Limit break"><span class="lb-w" data-t="LIMIT">LIMIT</span><span class="lb-w" data-t="BREAK">BREAK</span></div>
        <div class="lb-sub">${esc(tr('Potencial'))}</div>
        <div class="lb-pot"><b class="lb-from">${info.from}</b><i>➜</i><b class="lb-to">${rm ? info.to : info.from}</b></div>
        <div class="lb-ovr">${esc(tr('Media'))} ${info.o0} ➜ <b>${info.o1}</b></div>
        <div class="lb-tap">${esc(tr('Toca para seguir'))}</div>
      </div>`);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    window.addEventListener('resize', size);
    const col = info.col || '#2b6cff', gold = '#ffd23f', fire = '#ff7a1a';
    const t0 = performance.now();
    const T_ZIP = 950, T_CHARGE = 1550, T_SLAM = 1600;
    const trail = [], sparks = [], rings = [];
    let slammed = false, raf = 0, closed = false;
    // Recorrido del puntito: zigzag de izquierda a derecha hasta el centro
    const path = t => {
      const k = Math.min(1, t / T_ZIP), e = 1 - Math.pow(1 - k, 3);
      const x = W * (-0.1 + 0.6 * e), zig = Math.sin(k * Math.PI * 3.2) * H * 0.16 * (1 - k);
      return [x, H * 0.36 + zig];
    };
    function spark(x, y, sp, colr, life) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random());
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life, max: life, col: colr, r: 1.2 + Math.random() * 2.6 });
    }
    function frame(now) {
      const t = now - t0;
      c.clearRect(0, 0, W, H);
      const cx = W * 0.5, cy = H * 0.36;
      const R = Math.max(12, Math.min(W, H) * 0.028);
      // Rayos de luz girando tras el estallido
      if (slammed) {
        const k = Math.min(1, (t - T_SLAM) / 600);
        c.save(); c.translate(cx, cy); c.rotate(t / 2400);
        for (let i = 0; i < 14; i++) {
          c.rotate(Math.PI * 2 / 14);
          const g = c.createLinearGradient(0, 0, Math.max(W, H), 0);
          g.addColorStop(0, `rgba(255,210,63,${0.32 * k})`); g.addColorStop(1, 'rgba(255,122,26,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(W, H), -40); c.lineTo(Math.max(W, H), 40); c.closePath(); c.fill();
        }
        c.restore();
      }
      // El puntito
      let x = cx, y = cy;
      if (t < T_ZIP) { [x, y] = path(t); }
      if (!slammed || t < T_SLAM + 2600) {
        trail.push([x, y, t]);
        while (trail.length && t - trail[0][2] > 260) trail.shift();
        // Imágenes residuales
        for (let i = 0; i < trail.length; i += 2) {
          const [tx, ty, tt] = trail[i], a = 1 - (t - tt) / 260;
          c.globalAlpha = a * 0.45; c.fillStyle = i % 4 ? col : gold;
          c.beginPath(); c.arc(tx, ty, R * (0.7 + 0.3 * a), 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }
      // Aura que se carga y late
      const charge = t < T_ZIP ? 0.25 : Math.min(1, (t - T_ZIP) / (T_CHARGE - T_ZIP));
      const pulse = 0.5 + 0.5 * Math.sin(t / 70);
      const AR = R * (1.6 + charge * 2.4 + pulse * 0.5 * charge);
      const g = c.createRadialGradient(x, y, R * 0.5, x, y, AR);
      g.addColorStop(0, `rgba(255,240,180,${0.65 * charge + 0.2})`); g.addColorStop(0.45, `rgba(255,210,63,${0.45 * charge + 0.1})`); g.addColorStop(1, 'rgba(255,122,26,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, AR, 0, Math.PI * 2); c.fill();
      // Llamas del aura
      for (let i = 0; i < 9; i++) {
        const ph = ((t / 520) + i / 9) % 1, ang = i * 0.698 + Math.sin(t / 300 + i) * 0.3;
        c.globalAlpha = (1 - ph) * (0.5 + charge * 0.5);
        c.fillStyle = i % 3 ? gold : '#fff6d6';
        c.beginPath(); c.arc(x + Math.cos(ang) * R * 1.3 * (1 - ph * 0.3), y - R * 0.3 - ph * R * 3 + Math.sin(ang) * R * 0.5, Math.max(1, R * 0.22 * (1 - ph)), 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      // Cuerpo del puntito
      c.fillStyle = col; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3; c.strokeStyle = charge > 0.6 ? '#fff6d6' : gold; c.stroke();
      if (info.num) { c.fillStyle = info.ink || '#fff'; c.font = `800 ${Math.round(R * 1.05)}px Barlow Condensed, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(info.num), x, y + 1); }
      // Carga: partículas que convergen
      if (t > T_ZIP && t < T_SLAM && sparks.length < 160) for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.25 + Math.random() * 0.2);
        sparks.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, life: 420, max: 420, col: Math.random() < 0.5 ? gold : '#fff', r: 1.5 + Math.random() * 2, conv: true });
      }
      // Estallido
      if (!slammed && t >= T_SLAM) {
        slammed = true;
        el.classList.add('slam');
        for (let i = 0; i < 140; i++) spark(cx, cy, 9 + Math.random() * 8, i % 3 ? gold : i % 2 ? fire : '#ffffff', 900 + Math.random() * 700);
        rings.push({ t: T_SLAM, col: '#fff6d6' }, { t: T_SLAM + 120, col: gold }, { t: T_SLAM + 260, col: fire });
        countUp();
      }
      for (const r of rings) {
        const k = (t - r.t) / 900;
        if (k < 0 || k > 1) continue;
        c.globalAlpha = 1 - k; c.strokeStyle = r.col; c.lineWidth = 10 * (1 - k) + 1;
        c.beginPath(); c.arc(cx, cy, k * Math.max(W, H) * 0.75, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
      // Chispas
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= 16;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        if (s.conv) { s.x += (s.tx - s.x) * 0.12; s.y += (s.ty - s.y) * 0.12; }
        else { s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.vx *= 0.985; }
        c.globalAlpha = s.life / s.max; c.fillStyle = s.col;
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      // Tras el estallido, chispas que suben sin parar
      if (slammed && Math.random() < 0.5) spark(cx + (Math.random() - 0.5) * W * 0.6, H * 0.9, 2.5, Math.random() < 0.6 ? gold : fire, 1400);
      if (!closed) raf = requestAnimationFrame(frame);
    }
    function countUp() {
      const to = el.querySelector('.lb-to');
      const steps = Math.max(1, info.to - info.from), dur = 900;
      for (let k = 1; k <= steps; k++) setTimeout(() => { to.textContent = info.from + k; to.classList.remove('tick'); void to.offsetWidth; to.classList.add('tick'); }, (dur / steps) * k);
      setTimeout(() => el.classList.add('done'), dur + 300);
    }
    if (rm) { el.classList.add('slam', 'done'); } else raf = requestAnimationFrame(frame);
    return new Promise(res => {
      const end = () => {
        if (closed) return;
        closed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', size);
        el.classList.add('out');
        setTimeout(() => el.remove(), 380);
        res();
      };
      const ready = rm ? 0 : 2600;
      setTimeout(() => el.addEventListener('click', end), ready);
      setTimeout(end, 11000);
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter') { document.removeEventListener('keydown', k); end(); } });
    });
  }
  function playLB() {
    const S = TL.SFX;
    if (!S) return;
    if (S.sample && S.sample('limit-break')) return;
    if (S.limitBreak) S.limitBreak();
  }

  /** Brillo de una recompensa (objeto o alma) dentro de una hoja. */
  function reward(el, soul) {
    if (!el) return;
    el.classList.add('rw-in');
    if (TL.SFX) { if (soul) { if (!(TL.SFX.sample && TL.SFX.sample('alma'))) TL.SFX.soul && TL.SFX.soul(); } else TL.SFX.levelUp && TL.SFX.levelUp(); }
    if (TL.FX && !reduce()) setTimeout(() => TL.FX.sparkle && TL.FX.sparkle(el), 120);
  }

  TL.Cine = { boom, limitBreak, reward, sleep };
})();
