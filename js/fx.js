/* TOUCHLINE — efectos visuales: partículas, confeti, ondas en botones, sacudidas */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cv = null, cx = null, parts = [], raf = 0, dpr = 1;
  function canvas() {
    if (cv) return cx;
    cv = document.createElement('canvas');
    cv.id = 'fx';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    cx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return cx;
  }
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  }

  const PALETTE = {
    confetti: ['#b8f53d', '#2fd17c', '#f2c94c', '#5db8ff', '#ff6b9a', '#ffffff'],
    gold: ['#f2c94c', '#ffe08a', '#c79a2b', '#fff3c4'],
    green: ['#b8f53d', '#2fd17c', '#d6ff7a'],
    red: ['#ff5d5d', '#ff9a9a', '#ffd1d1']
  };

  function spawn(x, y, o) {
    o = o || {};
    if (reduce) return;
    canvas();
    const n = o.count || 24;
    const colors = o.colors || PALETTE[o.palette || 'confetti'];
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed || 6) * (0.4 + Math.random() * 0.8);
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0),
        g: o.gravity != null ? o.gravity : 0.22, life: 0, max: (o.life || 60) * (0.7 + Math.random() * 0.6),
        size: (o.size || 6) * (0.6 + Math.random() * 0.8), rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        color: colors[(Math.random() * colors.length) | 0], shape: o.shape || 'confetti', drag: o.drag || 0.985
      });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function loop() {
    const c = cx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life < p.max);
    for (const p of parts) {
      p.life++;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const alpha = Math.min(1, (p.max - p.life) / 18);
      c.globalAlpha = alpha;
      c.fillStyle = p.color;
      c.save();
      c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.shape === 'spark') { c.beginPath(); c.arc(0, 0, p.size / 2, 0, 6.28); c.fill(); }
      else if (p.shape === 'star') { star(c, p.size); }
      else if (p.shape === 'coin') { c.beginPath(); c.ellipse(0, 0, p.size / 2, p.size / 2 * Math.abs(Math.cos(p.rot * 2)) + 0.5, 0, 0, 6.28); c.fill(); }
      else c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      c.restore();
    }
    c.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; c.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function star(c, s) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s / 4 : s / 2, a = i * Math.PI / 5;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath(); c.fill();
  }

  function center(el) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  const FX = {
    burst: spawn,
    fromEl(el, o) { if (!el) return; const [x, y] = center(el); spawn(x, y, o); },
    confetti(o) {
      o = o || {};
      const w = innerWidth;
      for (let k = 0; k < 3; k++) {
        setTimeout(() => {
          spawn(w * 0.15, innerHeight * 0.45, { count: 40, angle: -Math.PI / 3, spread: 0.9, speed: 14, gravity: 0.3, life: 110, size: 9, palette: o.palette });
          spawn(w * 0.85, innerHeight * 0.45, { count: 40, angle: -Math.PI * 2 / 3, spread: 0.9, speed: 14, gravity: 0.3, life: 110, size: 9, palette: o.palette });
        }, k * 160);
      }
    },
    coins(el) { FX.fromEl(el, { count: 18, shape: 'coin', palette: 'gold', speed: 7, lift: 4, size: 10, life: 55 }); },
    sparkle(el) { FX.fromEl(el, { count: 14, shape: 'star', palette: 'green', speed: 4, gravity: 0.05, size: 9, life: 40 }); },
    shake(el, strong) {
      if (reduce || !el) return;
      el.classList.remove('shake', 'shake-strong');
      void el.offsetWidth;
      el.classList.add(strong ? 'shake-strong' : 'shake');
    },
    flash(color) {
      if (reduce) return;
      const d = document.createElement('div');
      d.className = 'flash';
      d.style.background = color || 'rgb(184 245 61 / 0.35)';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 600);
    },
    pop(el) {
      if (!el || reduce) return;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }
  };

  // Onda + chispa al pulsar botones
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .chip, .pick, .seg button, .nav button, .prow, .tok');
    if (!b || b.disabled) return;
    if (reduce) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const size = Math.max(r.width, r.height) * 1.6;
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
    if (b.classList.contains('primary')) spawn(e.clientX, e.clientY, { count: 8, shape: 'spark', palette: 'green', speed: 3.5, gravity: 0.05, size: 5, life: 26 });
  }, { passive: true });

  TL.FX = FX;
})();
