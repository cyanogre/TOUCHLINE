/* TOUCHLINE — la personalidad oculta del entrenador (un algoritmo «tipo TikTok»).
 *
 * Todo lo que haces deja rastro: cómo contestas a la prensa, si la plantas, si reclamas, si te lías, si haces
 * barbacoas o concentraciones, si firmas con un patrocinador polémico, si ganas un título… Cada acción emite una
 * señal, y cada señal alimenta en silencio a una o varias personalidades (data/game/prensa/personalidades-*.js).
 * Lo reciente pesa más que lo antiguo: si cambias de actitud, poco a poco cambias de piel.
 *
 * Nunca se muestra una barra ni una etiqueta. Te enteras como en la vida: primero lo intuye Aurelio Garrido en su
 * columna, luego te lo sueltan a la cara en una rueda de prensa (y puedes abrazar el mote o rechazarlo), luego lo
 * repiten las redes y el Profe te escribe a solas. A partir de ahí, tu personalidad tiene su propia historia en tres
 * capítulos, con un final que puede ser de gloria o de caída. Garrido lo va apuntando todo en tu biografía no
 * autorizada (Panel → Expediente). */
(function () {
  'use strict';
  const TL = window.TL;
  const DB = () => window.TL_PRENSA_DB || {};
  const PS = () => DB().personas || {};
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const DECAY = 0.94, MIN_PTS = 10;

  function st(S) {
    if (!S.persona) S.persona = { pts: {}, dom: null, domW: 0, rev: {}, chap: {}, motes: {}, bio: [], pend: null, soc: [], born: false };
    return S.persona;
  }

  // ------------------------------------------------------------ Señales
  /** key: una señal ('estilo:pol', 'plantar'…), el id de una personalidad, o un objeto {clave: peso}. */
  function signal(S, key, w) {
    if (!S || S.mode === 'tour' || !key) return;
    const s = st(S), P = PS();
    w = w == null ? 1 : w;
    const one = (k, ww) => {
      if (P[k]) { s.pts[k] = Math.max(0, (s.pts[k] || 0) + ww); return; }
      for (const id in P) { const g = P[id].sig && P[id].sig[k]; if (g) s.pts[id] = Math.max(0, (s.pts[id] || 0) + g * ww); }
    };
    if (typeof key === 'object') { for (const k in key) one(k, key[k] * w); } else one(key, w);
  }
  function ranking(S) {
    const s = st(S);
    return Object.keys(s.pts).map(id => [id, s.pts[id]]).filter(x => PS()[x[0]]).sort((a, b) => b[1] - a[1]);
  }
  /** La personalidad que manda (o null si aún no hay ninguna clara). */
  function dominant(S) {
    const r = ranking(S);
    if (!r.length || r[0][1] < MIN_PTS) return null;
    const second = r[1] ? r[1][1] : 0;
    return r[0][1] >= second * 1.2 + 1.5 ? r[0][0] : null;
  }
  /** Rasgos: la principal y hasta dos secundarias (para matices). */
  function traits(S) { return ranking(S).filter(x => x[1] >= MIN_PTS * 0.6).slice(0, 3).map(x => x[0]); }
  /** ¿Eres así, y ya se te nota fuera? ids: una personalidad o varias. Cuenta la principal y las secundarias que
   *  alguna vez se destaparon (rev ≥ minRev: 1 = Garrido ya lo insinuó · 2 = ya tienes mote). */
  function is(S, ids, minRev) {
    if (!S || S.mode === 'tour') return false;
    const s = st(S), list = [].concat(ids), mr = minRev == null ? 1 : minRev;
    const d = dominant(S);
    if (d && list.includes(d) && (s.rev[d] || 0) >= mr) return true;
    return traits(S).some(t => t !== d && list.includes(t) && (s.rev[t] || 0) >= mr);
  }
  /** Tu personalidad pública (la principal, si ya tiene mote), o null. */
  function known(S) { const d = dominant(S); return d && (st(S).rev[d] || 0) >= 2 ? d : null; }

  // ------------------------------------------------------------ Textos
  function moteOf(S, id) {
    const s = st(S), p = PS()[id];
    if (!p) return '';
    if (!s.motes[id]) s.motes[id] = pick(p.motes);
    return s.motes[id];
  }
  function fill(S, t, id, extra) {
    const club = S.clubs[S.user];
    const ex = extra || {};
    return String(t).replace(/\{(\w+)\}/g, (m, k) => ({
      mote: id ? moteOf(S, id) : '', club: club ? club.name : '', yo: S.manager || 'el míster',
      rival: ex.rival || 'el rival', pres: 'el presidente'
    })[k] ?? m).replace(/\b([Dd])e el /g, '$1el ').replace(/\b([Aa]) el /g, '$1l ');   // «de el Invisible» → «del Invisible»
  }
  const bio = (S, t) => { const s = st(S); s.bio.push({ s: S.season, w: S.week, t }); if (s.bio.length > 40) s.bio.shift(); };
  function column(S, text, title) {
    const G = DB().garrido;
    if (!G || !TL.News) return;
    TL.News.add(S, 'opinion', title || `${G.titulo}`, `«${text}» — ${G.nombre}, ${G.medio}.`, S.user, null, 'neu');
  }

  // ------------------------------------------------------------ Cada semana
  /** Tras el partido del usuario: decae lo antiguo, se decide quién manda, efectos y el siguiente paso de la historia. */
  function weekly(S, gf, ga) {
    if (!S || S.mode === 'tour') return;
    const s = st(S), P = PS(), G = DB().garrido, N = TL.News && TL.News.fx;
    if (!s.born && G) { s.born = true; bio(S, fill(S, pick(G.biografia.inicio))); }
    for (const id in s.pts) s.pts[id] *= DECAY;
    if (gf != null && ga != null && gf - ga >= 3) signal(S, 'gran_victoria');
    const d = dominant(S);
    let told = false;
    if (d !== s.dom) {
      // Cambio de piel: si la anterior estaba asentada, Garrido lo nota
      if (s.dom && s.domW >= 6 && G) { column(S, fill(S, pick(G.columnas.cambio))); bio(S, fill(S, pick(G.biografia.cambio), s.dom)); told = true; }
      s.dom = d; s.domW = d ? 1 : 0;
    } else if (d) s.domW++;
    const p = d && P[d];
    // Efectos ocultos de la personalidad que manda
    if (p && N && p.eff) {
      const e = p.eff, k = Math.min(1, s.domW / 4);
      if (e.dir) N.board(S, e.dir * k);
      if (e.afi) N.fans(S, e.afi * k);
      if (e.vest) N.teamMor(S, e.vest * k);
      if (e.sala && S.prensaStats) S.prensaStats.rep = Math.max(0, Math.min(100, S.prensaStats.rep + e.sala * k));
      if (e.spons < 0 && Math.random() < -e.spons) {
        const club = S.clubs[S.user], loss = Math.round(Math.max(5000, club.cash * 0.004) / 1000) * 1000;
        club.cash -= loss;
        TL.News.add(S, 'mercado', 'Un patrocinador se distancia', `Una marca asociada a ${club.name} congela su campaña por la imagen del entrenador.`, S.user, null, 'neg');
      }
    }
    // La historia avanza
    if (p) {
      const r = s.rev[d] || 0;
      if (r < 1 && s.domW >= 2) { column(S, fill(S, pick(p.pista), d)); s.rev[d] = 1; told = true; }
      else if (r === 1 && s.domW >= 4 && !s.pend) s.pend = { id: d, type: 'mote' };
      else if (r === 2 && s.domW >= 6) {
        TL.News.add(S, 'redes', fill(S, p.noticia[0], d), fill(S, p.noticia[1], d), S.user, null, 'neu');
        if (p.profe && TL.Game && TL.Game.mail) TL.Game.mail(S, 'Un mensaje del Profe', fill(S, pick(p.profe), d), 'club');
        if (G) bio(S, fill(S, pick(G.biografia.revela), d));
        s.rev[d] = 3; told = true;
      } else if (r >= 3 && !s.pend) {
        const c = s.chap[d] || 0;
        if (c < 3 && s.domW >= 8 + c * 4) s.pend = { id: d, type: 'cap', k: c };
      }
    }
    // La columna de los lunes (no todas las semanas: Garrido escribe cuando tiene algo que decir)
    if (!told && G && Math.random() < 0.22) {
      if (!d) column(S, fill(S, pick(G.columnas.duda)));
      else if ((s.rev[d] || 0) >= 1) column(S, fill(S, pick(P[d].pista), d));
      else if (gf != null) column(S, fill(S, pick(gf > ga ? G.columnas.buena : G.columnas.mala)));
    }
  }

  // ------------------------------------------------------------ Rueda de prensa
  /** Pregunta especial de tu personalidad (el mote o un capítulo), con forma de pregunta de prensa. */
  function pressQ(S, c) {
    const s = st(S), P = PS(), pe = s.pend;
    if (!pe || !P[pe.id]) return null;
    const p = P[pe.id], id = pe.id, ex = { rival: c && c.opp ? c.opp.name : '' };
    if (pe.type === 'mote') {
      return { id: 'per_mote', vkey: 'mote:' + id, vfill: t => fill(S, t, id, ex), persona: true, w: () => 99, q: () => fill(S, p.mote.q, id, ex), o: () => p.mote.a.map(a => ({
        t: fill(S, a.t, id, ex), cat: a.cat, g: 1, fx: {},
        arc: S2 => { signal(S2, { [id]: a.abraza ? 3 : -3 }); const s2 = st(S2); s2.rev[id] = 2; s2.pend = null; }
      })) };
    }
    const cap = p.caps[pe.k];
    if (!cap) { s.pend = null; return null; }
    return { id: 'per_cap', vkey: `cap:${id}:${pe.k}`, vfill: t => fill(S, t, id, ex), persona: true, w: () => 99, q: () => fill(S, cap.q, id, ex), o: () => cap.o.map(a => ({
      t: fill(S, a.t, id, ex), cat: a.cat, g: a.fx && (a.fx.board || 0) < -1.5 ? 0 : 1, fx: a.fx || {},
      arc: S2 => {
        if (a.sig) signal(S2, a.sig);
        const s2 = st(S2); s2.chap[id] = pe.k + 1; s2.pend = null;
        TL.News.add(S2, pe.k === 2 ? 'positivo' : 'rumor', fill(S2, cap.n[0], id, ex), fill(S2, cap.n[1], id, ex), S2.user, null, 'neu');
        bio(S2, `${['I', 'II', 'III'][pe.k]}. ${cap.tit}`);
      }
    })) };
  }
  /** Una pregunta de sociedad de vez en cuando (no repite las recientes). */
  function socQ(S) {
    const s = st(S), L = DB().sociedad || [];
    if (!L.length || Math.random() > 0.35) return null;
    const pool = L.filter(q => !s.soc.includes(q.id));
    const q = pick(pool.length ? pool : L);
    s.soc.push(q.id); if (s.soc.length > 8) s.soc.shift();
    return { id: 'soc', vkey: 'soc:' + q.id, vfill: t => fill(S, t, null), w: () => 99, q: () => q.q, o: () => q.o.map(a => ({ t: a.t, cat: a.cat, g: a.g, fx: a.fx || {}, sig: a.sig })) };
  }
  /** Coste de un estilo según quién eres: lo natural cuesta menos; lo contrario, mucho más. */
  function costMod(S, cat) {
    const P = PS(), tr = traits(S);
    let m = 0;
    tr.forEach((id, k) => { const p = P[id], f = k === 0 ? 1 : 0.5; if (p.nat && p.nat.includes(cat)) m -= 3 * f; if (p.anti && p.anti.includes(cat)) m += 4 * f; });
    return Math.round(m);
  }
  /** Si ya te han puesto mote, los periodistas lo usan de vez en cuando. */
  function nickname(S) {
    const s = st(S), d = s.dom;
    return d && (s.rev[d] || 0) >= 2 ? moteOf(S, d) : null;
  }
  function bioList(S) { return st(S).bio.slice(); }
  /** El título del capítulo de una temporada (lo escribe Garrido en la entrevista de fin de temporada). */
  function chapter(S, season, title) { const s = st(S); s.bio.push({ s: season, w: 0, t: title, cap: true }); if (s.bio.length > 40) s.bio.shift(); }
  function milestone(S, key) { const G = DB().garrido; if (G && G.biografia[key]) bio(S, fill(S, pick(G.biografia[key]), st(S).dom)); }

  TL.Persona = { st, signal, ranking, dominant, traits, is, known, weekly, pressQ, socQ, costMod, nickname, bioList, milestone, moteOf, chapter, column, fill };
})();
