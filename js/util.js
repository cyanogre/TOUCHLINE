/* TOUCHLINE — utilidades: azar, formato, colores */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const F = TL.F;

  const U = {
    rand(a, b) { return a + Math.random() * (b - a); },
    int(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    chance(p) { return Math.random() < p; },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    /** Elige un elemento con probabilidad proporcional a weight(item). */
    weighted(items, weight) {
      let total = 0;
      const w = items.map(it => { const x = Math.max(0, weight(it)); total += x; return x; });
      if (total <= 0) return items[Math.floor(Math.random() * items.length)];
      let r = Math.random() * total;
      for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    },
    poisson(lambda) {
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    },
    sum(arr, fn) { let s = 0; for (const x of arr) s += fn ? fn(x) : x; return s; },

    money(v) {
      const neg = v < 0; v = Math.abs(v);
      let s;
      if (v >= 1e8) s = Math.round(v / 1e6) + 'M';
      else if (v >= 1e6) s = (v / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'M';
      else if (v >= 1e3) s = Math.round(v / 1e3) + 'K';
      else s = Math.round(v) + '';
      return (neg ? '-' : '') + '€' + s;
    },
    num(v) { return Math.round(v).toLocaleString('es-ES'); },

    seasonLabel(season) { return season + '/' + String(season + 1).slice(2); },
    /** Fecha de la jornada (semana) dentro de una temporada. */
    dateOf(season, week) {
      const d = new Date(Date.UTC(season, 7, 15));
      while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCDate(d.getUTCDate() + 7 * week);
      return d;
    },
    fmtDate(d) {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    },

    esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },

    clubCode(name) {
      const stop = /^(fc|cf|ac|sc|afc|cd|ud|sd|rc|rcd|ss|as|sv|vfb|vfl|tsg|bv|fk|sk|nk|if|ik|bk|aik|ca|cs|club|de|del|la|el|the|of|1\.|real)$/i;
      const words = name.replace(/[^\p{L}\d ]/gu, ' ').split(/\s+/).filter(Boolean);
      const sig = words.filter(w => !stop.test(w) && !/^\d+$/.test(w));
      const ws = sig.length ? sig : words;
      if (ws.length === 1) return ws[0].slice(0, 3).toUpperCase();
      return (ws[0][0] + ws[ws.length - 1].slice(0, 2)).toUpperCase();
    },
    /** URL del escudo real (si existe en data/game/crests.js). */
    crestUrl(gender, name) {
      const C = window.TL_CRESTS;
      const path = C && C[gender] && C[gender][name];
      return path ? C.base + path : null;
    },
    clubColors(name) {
      const h = F.hash(name);
      const hue = h % 360;
      const sat = 55 + (h >> 9) % 25;
      const light = 34 + (h >> 13) % 14;
      const alt = (h >> 17) % 3;
      const c1 = `hsl(${hue} ${sat}% ${light}%)`;
      const c2 = alt === 0 ? '#f4f4f0' : alt === 1 ? `hsl(${(hue + 40) % 360} 80% 60%)` : '#111';
      return [c1, c2];
    }
  };

  TL.U = U;
})();
