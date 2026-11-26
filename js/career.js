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
    if (kind !== 'midseason') { const r = returnOffer(S); if (r) out.unshift(r); }
    S.jobOffers = out.length ? out : null;
    return out;
  }

  /** Cambia el club del usuario (mantiene nivel, habilidades e historial del mánager). */
  function accept(S, clubId) {
    const old = S.clubs[S.user], c = S.clubs[clubId];
    const mid = !S.over;
    const st = cvOpen(S, clubId);
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
    if (st.back) S.board.conf = st.firedBefore ? 55 : 65;
    if (st.firedBefore) TL.News.add(S, 'club', `La vuelta de ${S.manager}`, `${c.name} llama al técnico que despidió. Él coge el teléfono. Esto huele a guion de Netflix.`, clubId, null, 'pos');
    else TL.News.add(S, 'club', `${S.manager} firma por ${c.name}`, `Deja ${old.name} para asumir un nuevo proyecto.`, clubId, null, 'pos');
    return { ok: true, msg: `¡Eres el nuevo entrenador de ${c.name}!` };
  }


  // ------------------------------------------------------------ Historial de entrenador (CV) y redención
  // Cada etapa en un club queda apuntada: partidos, temporadas, puesto, títulos y cómo acabó (destituido, te fuiste,
  // sigues). Si te echan, la historia no acaba ahí: puedes vengarte ganando al club que te despidió, y con los años
  // ese club puede volver a llamarte. Volver y cumplir es la redención.
  function cv(S) {
    if (!S.cv) S.cv = [];
    if (!S.cv.length) S.cv.push(stint(S, S.user, false));
    return S.cv;
  }
  function stint(S, clubId, back) {
    const prev = (S.cv || []).filter(x => x.club === clubId);
    return { club: clubId, name: S.clubs[clubId].name, from: [S.season, S.week], to: null, g: 0, e: 0, p: 0, seasons: [], titles: 0,
      end: null, back: !!back || prev.length > 0, firedBefore: prev.some(x => x.end === 'fired'), redeemed: false, revenge: [] };
  }
  const cur = S => { const l = cv(S); const x = l[l.length - 1]; return x && !x.end ? x : null; };
  function cvMatch(S, gf, ga, oppId) {
    const c = cur(S); if (!c) return;
    if (gf > ga) c.g++; else if (gf < ga) c.p++; else c.e++;
    // Venganza: ganas al club que te echó
    const old = S.cv.find(x => x.club === oppId && x.end === 'fired');
    if (old && gf > ga && !c.revenge.includes(S.season + ':' + oppId)) {
      c.revenge.push(S.season + ':' + oppId);
      S.mgr.rep = U.clamp(rep(S) + 2, 0, 100);
      TL.News.add(S, 'club', `La venganza de ${S.manager}`, `El técnico que despidió ${S.clubs[oppId].name} vuelve y les gana ${gf}-${ga}. En el palco hay caras largas.`, S.user, null, 'pos');
    }
  }
  function cvSeason(S, sum) {
    const c = cur(S); if (!c) return;
    c.seasons.push({ s: S.season, pos: sum.pos, n: sum.n, target: sum.target, league: sum.league });
    if (sum.pos === 1) c.titles++;
    // Redención: vuelves al club que te echó y cumples
    if (c.firedBefore && !c.redeemed && sum.pos <= sum.target) {
      c.redeemed = true;
      S.mgr.rep = U.clamp(rep(S) + 6, 0, 100);
      TL.News.add(S, 'positivo', `Redención completa`, `${S.manager} vuelve a ${c.name}, el club que le echó, y cumple el objetivo. Ya hay quien habla de película.`, S.user, null, 'pos');
    }
  }
  function cvClose(S, how) {
    const c = cur(S); if (!c) return;
    c.end = how; c.to = [S.season, S.week];
  }
  function cvOpen(S, clubId) {
    cv(S); cvClose(S, S.fired ? 'fired' : 'left');
    const st = stint(S, clubId, false);
    S.cv.push(st);
    return st;
  }
  /** ¿Te llama un club que te echó? Pasado un tiempo, si les va mal y tu reputación ha crecido. */
  function returnOffer(S) {
    const l = cv(S);
    for (const x of l.slice().reverse()) {
      if (x.end !== 'fired' || x.club === S.user || x.called) continue;
      const gone = S.season - x.to[0];
      if (gone < 1 || Math.random() > 0.35 + Math.min(0.3, gone * 0.08)) continue;
      x.called = true;
      const c = S.clubs[x.club];
      return { club: c.id, name: c.name, league: S.leagues[c.league].name, rep: Math.round(c.rep * 10) / 10, expect: expectation(S, c.id), cash: Math.round(c.cash), kind: 'return' };
    }
    return null;
  }

  TL.Career = { cv, cvMatch, cvSeason, cvClose, cvOpen, returnOffer, rep, seasonRep, makeOffers, accept, expectation };
})();
