/* TOUCHLINE — idiomas (español, English, Français, Deutsch, Italiano)
 *
 * El juego está escrito en castellano. Para los demás idiomas, una capa traduce lo que se pinta:
 *  - Diccionarios en data/i18n/*.js: cada entrada es [castellano, inglés, francés, alemán, italiano].
 *  - Las frases con partes variables (nombres, cifras) llevan huecos: «{} pierde los nervios» o «¡Gol de {p}!».
 *  - Un observador traduce los textos de la página (y title/placeholder/aria-label) al aparecer.
 *  - TL.t(texto) traduce a mano lo que no es HTML (lienzo del partido, diálogos del Profe antes de escribirse).
 * Lo que no esté en el diccionario se queda en castellano.
 */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const LANGS = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
  const LOCALE = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };
  const COL = { en: 1, fr: 2, de: 3, it: 4 };
  let lang = 'es';
  try {
    const saved = localStorage.getItem('touchline.lang');
    const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    lang = saved || (LANGS[nav] ? nav : 'es');
  } catch (e) { /* sin almacenamiento */ }
  if (!LANGS[lang]) lang = 'es';
  document.documentElement.lang = lang;

  const rows = [];
  /** Los diccionarios se añaden con TL_I18N_ADD([[es, en, fr, de, it], …]). */
  window.TL_I18N_ADD = list => { for (const r of list) rows.push(r); exact = null; };

  const EMOJI = /[\u{1F000}-\u{1FAFF}☀-➿⬀-⯿⏩-⏺⌀-⏿⇲]️?/gu;
  const stripEmoji = s => s.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  const HOLE = /\{[A-Za-z0-9]*\}/;
  let exact = null, buckets = null;

  // Una parte variable no cruza un final de frase («… primeros. Saldo …»), salvo iniciales como «J. Pérez»
  const CAP = '((?:(?<=[\\p{Ll}\\d)%]{2})(?![.!?…]\\s+[¡¿\\p{Lu}])[\\s\\S]|(?<![\\p{Ll}\\d)%]{2})[\\s\\S])+?)';
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function compile(src, dst) {
    const names = [];
    let re = '';
    const parts = src.split(/(\{[A-Za-z0-9]*\})/);
    for (const part of parts) {
      if (part[0] === '{' && HOLE.test(part)) { names.push(part.slice(1, -1)); re += CAP; }
      else re += esc(part);
    }
    const words = src.replace(/\{[A-Za-z0-9]*\}/g, ' ').toLowerCase().split(/[^\p{L}]+/u).filter(w => w.length >= 3);
    words.sort((a, b) => b.length - a.length);
    const tailFixed = !(parts[parts.length - 1] === '' && parts.length > 1); // termina en texto fijo (sirve como prefijo)
    return { re: new RegExp('^' + re + '$', 'u'), pre: tailFixed ? new RegExp('^' + re, 'u') : null, names, dst, anchor: words[0] || '', len: src.length };
  }
  function build() {
    exact = new Map(); buckets = new Map();
    const col = COL[lang];
    if (!col) return;
    const add = (es, tr) => {
      if (!es || !tr) return;
      const hole = HOLE.test(es);
      if (!hole) exact.set(es, tr);
      if (!hole && es.length < 8) return; // palabras sueltas: solo como texto completo
      const p = compile(es, tr);
      if (!p.anchor) return;
      if (!buckets.has(p.anchor)) buckets.set(p.anchor, []);
      buckets.get(p.anchor).push(p);
    };
    for (const r of rows) {
      const es = r[0], tr = r[col];
      add(es, tr);
      // La misma frase sin su emoji (los emojis se cambian por iconos y quedan en otro nodo)
      const e2 = stripEmoji(es);
      if (e2 !== es && tr) add(e2, stripEmoji(tr));
    }
    // Las frases largas primero: «{} de {}» no debe ganar a «{} renueva hasta {}»
    for (const list of buckets.values()) list.sort((a, b) => b.len - a.len);
    addNations();
  }
  function fill(p, m) {
    // Una parte variable puede ser a su vez un texto traducible («Defensiva», «Terminar entre los 7 primeros»…)
    const g = m.map((x, k) => (k ? sub(x) : x));
    let i = 0;
    return p.dst.replace(/\{([A-Za-z0-9]*)\}/g, (_, n) => {
      if (n === '') return g[1 + i++] ?? '';
      if (/^\d+$/.test(n)) return g[1 + +n] ?? '';
      const k = p.names.indexOf(n);
      return k >= 0 ? g[1 + k] : '';
    });
  }
  let depth = 0;
  function sub(x) {
    if (!x || depth > 3 || !/\p{L}{3}/u.test(x)) return x;
    depth++;
    try { const r = lookup(x) ?? seq(x); return r == null ? x : r; } finally { depth--; }
  }
  function candidates(s) {
    const out = [], seen = new Set();
    for (const w of s.toLowerCase().split(/[^\p{L}]+/u)) {
      if (w.length < 3) continue;
      const list = buckets.get(w);
      if (!list) continue;
      for (const p of list) if (!seen.has(p)) { seen.add(p); out.push(p); }
    }
    return out;
  }
  /** Traducción de un texto completo (o null si no se conoce). */
  function lookup(s) {
    if (!exact) build();
    const e = exact.get(s);
    if (e != null) return e;
    for (const p of candidates(s)) {
      const m = p.re.exec(s);
      if (m) return fill(p, m);
    }
    return null;
  }
  /** Texto hecho de varias frases del diccionario seguidas («Bienvenido… Saldo… El mercado…»). */
  function seq(s) {
    const cands = candidates(s).filter(p => p.pre);
    if (!cands.length) return null;
    let pos = 0, out = '', hit = false;
    while (pos < s.length) {
      const rest = s.slice(pos);
      let best = null, bm = null;
      for (const p of cands) {
        const m = p.pre.exec(rest);
        if (m && (!best || m[0].length > bm[0].length) && (m[0].length === rest.length || /[\s)]/.test(rest[m[0].length]) || /[\s.!?…:]$/.test(m[0]))) { best = p; bm = m; }
      }
      if (best) { out += fill(best, bm); pos += bm[0].length; hit = true; }
      else {
        // sin traducción: hasta el siguiente final de frase
        const k = rest.search(/[.!?…]\s+(?=[¡¿(\p{Lu}])/u);
        const n = k < 0 ? rest.length : k + 1;
        out += rest.slice(0, n); pos += n;
      }
      const ws = /^\s+/.exec(s.slice(pos));
      if (ws) { out += ws[0]; pos += ws[0].length; }
    }
    return hit ? out : null;
  }
  // Separadores y espacios de los extremos se conservan («· ¡Gol de Isco!» → «· Goal by Isco!»)
  const EDGE = /^(\s*(?:[·•|]\s+)?)([\s\S]*?)(\s*)$/;
  function t(s) {
    if (lang === 'es' || s == null) return s;
    const str = String(s);
    if (!/\p{L}/u.test(str)) return str;
    const m = EDGE.exec(str);
    const core = m[2];
    let r = lookup(core);
    if (r == null && core.endsWith(':')) { const r2 = lookup(core.slice(0, -1).trim()); if (r2 != null) r = r2 + ':'; }
    if (r == null) r = seq(core);
    return r == null ? str : m[1] + r + m[3];
  }

  // ------------------------------------------------------------ Países (nombres oficiales de cada idioma)
  const SUB = {
    'gb-eng': { en: 'England', fr: 'Angleterre', de: 'England', it: 'Inghilterra' },
    'gb-sct': { en: 'Scotland', fr: 'Écosse', de: 'Schottland', it: 'Scozia' },
    'gb-wls': { en: 'Wales', fr: 'Pays de Galles', de: 'Wales', it: 'Galles' },
    'gb-nir': { en: 'Northern Ireland', fr: 'Irlande du Nord', de: 'Nordirland', it: 'Irlanda del Nord' }
  };
  let nationsDone = false;
  function addNations() {
    const D = window.TL_DATA;
    if (!D || !window.Intl || !Intl.DisplayNames) return;
    const list = (D.M && D.M.nations || []).concat(D.F && D.F.nations || []);
    if (!list.length) return;
    nationsDone = true;
    let dn = null;
    try { dn = new Intl.DisplayNames([LOCALE[lang]], { type: 'region' }); } catch (e) { return; }
    for (const [name, code] of list) {
      if (!name || !code || exact.has(name)) continue;
      let tr = SUB[code] && SUB[code][lang];
      if (!tr && /^[a-z]{2}$/.test(code)) { try { tr = dn.of(code.toUpperCase()); } catch (e) { tr = null; } }
      if (tr && tr !== code.toUpperCase()) exact.set(name, tr);
    }
  }

  // ------------------------------------------------------------ La página
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CANVAS']);
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const done = new WeakMap(); // nodo → último texto que pusimos (para no retraducir)
  function fixText(n) {
    const p = n.parentNode;
    if (!p || SKIP.has(p.nodeName) || done.get(n) === n.data) return;
    if (p.closest && p.closest('[data-noi18n]')) return;
    const r = t(n.data);
    if (r !== n.data) { n.data = r; done.set(n, r); }
  }
  function fixAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const r = t(v); if (r !== v) el.setAttribute(a, r); }
    }
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    if (!nationsDone && exact && window.TL_DATA) addNations();
    fixAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const texts = [];
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.nodeType === 3) texts.push(n);
      else fixAttrs(n);
    }
    texts.forEach(fixText);
  }
  function start() {
    scan(document.body);
    document.title = t(document.title);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') fixText(m.target);
        else if (m.type === 'attributes') fixAttrs(m.target);
        else m.addedNodes.forEach(scan);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (lang !== 'es') {
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  /** Cambia de idioma (se guarda y se recarga la página). */
  function set(l) {
    if (!LANGS[l] || l === lang) return;
    try { localStorage.setItem('touchline.lang', l); } catch (e) { /* nada */ }
    location.reload();
  }
  /** Botones para elegir idioma. */
  function picker() {
    return `<div class="lang-pick" role="group" aria-label="Idioma">${Object.entries(LANGS).map(([k, v]) =>
      `<button class="${k === lang ? 'on' : ''}" data-act="lang" data-l="${k}" aria-pressed="${k === lang}"><b data-noi18n>${k.toUpperCase()}</b><span data-noi18n>${v}</span></button>`).join('')}</div>`;
  }

  TL.I18N = { LANGS, get lang() { return lang; }, locale: () => LOCALE[lang], t, set, picker, rows };
  TL.t = t;
})();
