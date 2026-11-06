/* TOUCHLINE — gráficas en SVG (sin librerías)
 * Se adaptan al ancho disponible (viewBox) y se ven igual de nítidas en móvil y en PC.
 *  - radar: la «telaraña» de un jugador (y, opcional, otra para comparar)
 *  - line: evolución (saldo, media, posición…)
 *  - bars: valores positivos y negativos (balance semanal, notas)
 */
(function () {
  'use strict';
  const TL = window.TL;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let uid = 0;

  /** Telaraña de 6 ejes (0-99). */
  function radar(vals, labels, o) {
    o = o || {};
    const W = 260, H = 236, cx = W / 2, cy = 118, R = 80, n = vals.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
    const poly = vs => vs.map((v, i) => pt(i, Math.max(4, v)).map(x => x.toFixed(1)).join(',')).join(' ');
    let g = '';
    for (const lv of [25, 50, 75, 100]) g += `<polygon points="${poly(vals.map(() => lv))}" class="ch-ring${lv === 100 ? ' out' : ''}"/>`;
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, 100); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="ch-axis"/>`; }
    if (o.ghost) g += `<polygon points="${poly(o.ghost)}" class="ch-ghost"/>`;
    if (o.compare) g += `<polygon points="${poly(o.compare)}" class="ch-cmp"/>`;
    g += `<polygon points="${poly(vals)}" class="ch-area" style="--c:${o.color || 'var(--accent)'}"/>`;
    vals.forEach((v, i) => { const [x, y] = pt(i, v); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="ch-dot" style="--c:${o.color || 'var(--accent)'}"/>`; });
    labels.forEach((l, i) => {
      const [x, y] = pt(i, 128);
      const anchor = Math.abs(x - cx) < 6 ? 'middle' : x < cx ? 'end' : 'start';
      g += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="ch-lbl">${esc(l)} <tspan class="ch-val">${vals[i]}</tspan></text>`;
    });
    return `<svg class="chart radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Atributos')}">${g}</svg>`;
  }

  /** Línea con área. series: [{ name, color, data: [números o null] }]; xl: etiquetas del eje X. */
  function line(series, o) {
    o = o || {};
    const W = 340, H = o.h || 150, L = o.padL || 44, Rr = 12, T = 12, B = 22;
    const all = series.flatMap(s => s.data).filter(v => v != null && isFinite(v));
    if (!all.length) return '';
    let min = o.min != null ? o.min : Math.min(...all), max = o.max != null ? o.max : Math.max(...all);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08; if (o.min == null) min -= pad; if (o.max == null) max += pad;
    const n = Math.max(...series.map(s => s.data.length));
    const X = i => L + (n <= 1 ? 0 : i * (W - L - Rr) / (n - 1));
    const Y = v => o.invert ? T + (v - min) / (max - min) * (H - T - B) : H - B - (v - min) / (max - min) * (H - T - B);
    const fmt = o.fmt || (v => Math.round(v));
    const id = 'g' + (++uid);
    let g = '';
    // Rejilla y eje Y
    for (let k = 0; k <= 3; k++) {
      const v = min + (max - min) * k / 3, y = Y(v);
      g += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${W - Rr}" y2="${y.toFixed(1)}" class="ch-grid"/><text x="${L - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="ch-tick">${esc(fmt(v))}</text>`;
    }
    if (o.zero && min < 0 && max > 0) g += `<line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - Rr}" y2="${Y(0).toFixed(1)}" class="ch-zero"/>`;
    // Eje X: pocas etiquetas
    const xl = o.xl || [];
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step) if (xl[i] != null) g += `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ch-tick">${esc(xl[i])}</text>`;
    series.forEach((s, si) => {
      const pts = s.data.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
      if (!pts.length) return;
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const c = s.color || 'var(--accent)';
      if (si === 0 && !o.noArea) {
        const base = o.invert ? T : H - B;
        g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="${o.invert ? 0 : 0.35}"/><stop offset="1" stop-color="${c}" stop-opacity="${o.invert ? 0.3 : 0}"/></linearGradient></defs>`;
        g += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z" fill="url(#${id})"/>`;
      }
      g += `<path d="${d}" class="ch-line" style="stroke:${c}"${s.dash ? ' stroke-dasharray="4 4"' : ''}/>`;
      const lp = pts[pts.length - 1];
      g += `<circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="3.5" fill="${c}"/>`;
      if (si === 0) {
        const last = s.data.filter(v => v != null).pop();
        const txt = fmt(last), tw = String(txt).length * 6.2 + 10;
        const bx = Math.min(W - Rr - tw, Math.max(L, lp[0] - tw / 2)), by = Math.max(2, lp[1] - 22);
        g += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${tw.toFixed(1)}" height="16" rx="5" class="ch-bubble"/><text x="${(bx + tw / 2).toFixed(1)}" y="${(by + 11.5).toFixed(1)}" text-anchor="middle" class="ch-btxt">${esc(txt)}</text>`;
      }
    });
    const legend = series.length > 1 ? `<div class="ch-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
    return `<svg class="chart line" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Evolución')}">${g}</svg>${legend}`;
  }

  /** Barras (pueden ser negativas). */
  function bars(data, o) {
    o = o || {};
    const W = 340, H = o.h || 120, L = o.padL || 44, Rr = 8, T = 10, B = 20;
    if (!data.length) return '';
    const vals = data.map(d => d.v);
    let max = Math.max(0, ...vals), min = Math.min(0, ...vals);
    if (o.min != null) min = o.min; if (o.max != null) max = o.max;
    if (max === min) max = min + 1;
    const Y = v => H - B - (v - min) / (max - min) * (H - T - B);
    const bw = (W - L - Rr) / data.length;
    const fmt = o.fmt || (v => Math.round(v));
    let g = '';
    for (const v of [min, (min + max) / 2, max]) g += `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - Rr}" y2="${Y(v).toFixed(1)}" class="ch-grid"/><text x="${L - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="ch-tick">${esc(fmt(v))}</text>`;
    const y0 = Y(Math.max(min, 0));
    data.forEach((d, i) => {
      const y = Y(d.v), h = Math.abs(y - y0);
      const cls = d.cls || (d.v >= 0 ? 'pos' : 'neg');
      g += `<rect x="${(L + i * bw + bw * 0.15).toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" class="ch-bar ${cls}"><title>${esc(d.t || fmt(d.v))}</title></rect>`;
      if (d.l != null && (data.length <= 14 || i % Math.ceil(data.length / 10) === 0)) g += `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ch-tick">${esc(d.l)}</text>`;
    });
    return `<svg class="chart bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Barras')}">${g}</svg>`;
  }

  TL.Charts = { radar, line, bars };
})();
