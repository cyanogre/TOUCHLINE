/* TOUCHLINE — carrera del mánager: reputación, ofertas de trabajo y cambio de club */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U, W = TL.World, E = TL.Engine;

  function rep(S) { if (S.mgr.rep == null) S.mgr.rep = 50; return S.mgr.rep; }

  /** Actualiza la reputación del mánager con el balance de la temporada. */
  function seasonRep(S, sum) {
    let d = (sum.target - sum.pos) * 1.5 + (sum.pos <= sum.target ? 4 : -4);
    if (sum.pos === 1) d += 8;
    if (sum.moved === 'up') d += 5;
    if (sum.moved === 'down') d -= 8;
    if (sum.fired) d -= 10;
    S.mgr.rep = U.clamp(Math.round(rep(S) + d), 0, 100);
    return d;
  }

  function expectation(S, clubId) {
    const c = S.clubs[clubId], L = S.leagues[c.league];
    const ranked = L.clubs.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep);
    const r = ranked.indexOf(clubId) + 1, n = L.clubs.length;
    return r <= 2 ? 'Pelear el título' : r <= Math.ceil(n / 3) ? 'Puestos altos' : r <= Math.ceil(n * 0.66) ? 'Mitad de tabla' : 'Evitar el descenso';
  }

  /**
   * Genera ofertas de trabajo.
   * kind: 'season' (fin de temporada), 'fired' (destituido al final), 'midseason' (destituido durante la liga).
   */
  function makeOffers(S, kind, sum) {
    const cur = S.clubs[S.user];
    const r = rep(S);
    let lo, hi, n;
    if (kind === 'season') {
      const ok = sum && sum.pos <= sum.target;
      lo = cur.rep - 3 + (r - 50) / 12;
      hi = cur.rep + 2 + (r - 50) / 6 + (ok ? 3 : -2) + (sum && sum.pos === 1 ? 3 : 0);
      n = ok ? U.int(2, 3) : (Math.random() < (r >= 45 ? 0.6 : 0.3) ? 1 : 0);
    } else {
      lo = cur.rep - 14 + (r - 50) / 10;
      hi = cur.rep - 2 + (r - 50) / 10;
      n = U.int(2, 3);
    }
    let pool = S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable && c.rep >= lo && c.rep <= hi);
    if (kind === 'midseason') {
      // A mitad de temporada solo hay hueco en clubes de tu liga que van mal
      const tab = TL.Season.table(S);
      const bottom = new Set(tab.slice(Math.floor(tab.length / 2)).map(x => x.id));
      pool = S.clubs.filter(c => c.id !== S.user && c.league === cur.league && bottom.has(c.id) && c.rep <= cur.rep + 2);
      n = Math.min(2, pool.length);
    }
    if (!pool.length && kind !== 'season') {
      pool = S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable && c.rep < cur.rep)
        .sort((a, b) => b.rep - a.rep).slice(0, 8);
    }
    const out = U.shuffle(pool.slice()).slice(0, n).map(c => ({
      club: c.id, name: c.name, league: S.leagues[c.league].name, rep: Math.round(c.rep * 10) / 10,
      expect: expectation(S, c.id), cash: Math.round(c.cash), kind
    }));
    S.jobOffers = out.length ? out : null;
    return out;
  }

  /** Cambia el club del usuario (mantiene nivel, habilidades e historial del mánager). */
  function accept(S, clubId) {
    const old = S.clubs[S.user], c = S.clubs[clubId];
    const mid = !S.over;
    S.user = clubId;
    const sq = W.squad(S, clubId);
    const b = E.bestFormation(sq);
    S.tactics = { formation: b.formation, slots: E.autoLineup(sq, b.formation, false), mentality: 1, autoSubs: true };
    S.com = null; S.wageShift = 0; S.neg = {};
    TL.Commerce.init(S);
    S.board = { conf: 60 };
    S.fired = false;
    S.jobOffers = null;
    for (const p of sq) if (p.mor == null) p.mor = Math.round(U.rand(62, 80));
    for (const m of S.inbox) if (!m.done && (m.kind === 'offer' || m.kind === 'decision')) { m.done = true; m.res = 'Cambio de club'; }
    if (mid) { TL.Season.setObjective(S); S.fin = W.newFin(); }
    TL.Commerce.refreshBudget(S);
    TL.Game.mail(S, `Nuevo reto: ${c.name}`,
      `${S.manager} firma como entrenador de ${c.name}${mid ? ' con la temporada en marcha' : ''}. ` +
      (mid ? `Objetivo: ${S.board.text}.` : 'La directiva te comunicará el objetivo al empezar la temporada.'), 'board');
    TL.News.add(S, 'club', `${S.manager} firma por ${c.name}`, `Deja ${old.name} para asumir un nuevo proyecto.`, clubId, null, 'pos');
    return { ok: true, msg: `¡Eres el nuevo entrenador de ${c.name}!` };
  }

  TL.Career = { rep, seasonRep, makeOffers, accept, expectation };
})();
