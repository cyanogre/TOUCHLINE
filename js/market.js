/* TOUCHLINE — mercado de fichajes, contratos y ofertas de la IA */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U, W = TL.World;

  const MAX_SQUAD = 34;

  function windowOpen(S) {
    const n = S.fixtures ? S.fixtures.length : 38;
    const mid = Math.floor(n / 2);
    return S.week <= 3 || (S.week >= mid && S.week <= mid + 2);
  }

  function yearsLeft(S, p) { return p.contract - (S.season + 1); }

  function askingPrice(S, p) {
    const v = W.value(S, p);
    if (p.club < 0) return 0;
    const sq = W.squad(S, p.club).sort((a, b) => b.ovr - a.ovr);
    const rank = sq.findIndex(x => x.id === p.id);
    let f = rank < 11 ? 1.35 : rank < 18 ? 1.15 : 1.0;
    const yl = yearsLeft(S, p);
    if (yl <= 0) f *= 0.6; else if (yl === 1) f *= 0.85;
    if (p.listed) f *= 0.9;
    f *= 1 + (S.neg[p.id] || 0) * 0.05;
    return F.roundMoney(v * f);
  }

  function wealthOf(S, clubId) { return S.leagues[S.clubs[clubId].league].wealth; }

  function wageDemand(S, p, clubId) {
    const base = F.wageFor(p.ovr, p.age, wealthOf(S, clubId), S.econ.wage);
    const from = p.club >= 0 ? S.clubs[p.club] : null;
    const to = S.clubs[clubId];
    let f = 1.1 + (from ? Math.max(0, from.rep - to.rep) * 0.03 : 0.1);
    let w = base * f;
    if (p.club >= 0 && p.club !== clubId) w = Math.max(w, p.wage * 1.08);
    return F.roundMoney(w);
  }

  function willing(S, p, clubId) {
    const to = S.clubs[clubId];
    const from = p.club >= 0 ? S.clubs[p.club] : null;
    if (p.ovr > to.rep + 11) return { ok: false, reason: `${p.short} no ve a tu club a su nivel.` };
    if (from && from.rep - to.rep > 7 && p.ovr >= to.rep) return { ok: false, reason: `${p.short} no quiere bajar de categoría de club.` };
    return { ok: true };
  }

  function maxYears(p) { return p.age >= 34 ? 1 : p.age >= 31 ? 2 : 5; }

  /** Evalúa una oferta por un jugador de otro club. */
  function offer(S, p, amount) {
    if (!windowOpen(S)) return { result: 'closed' };
    const ask = askingPrice(S, p);
    const seller = W.squad(S, p.club);
    if (seller.length <= 18) return { result: 'reject', msg: `${S.clubs[p.club].name} no quiere vender: tiene la plantilla corta.` };
    if (amount >= ask) return { result: 'accept', price: amount };
    S.neg[p.id] = (S.neg[p.id] || 0) + 1;
    if (amount >= ask * 0.8) return { result: 'counter', price: askingPrice(S, p), msg: `Piden ${U.money(askingPrice(S, p))}.` };
    return { result: 'reject', msg: `Oferta insuficiente. Su valoración ronda ${U.money(ask * (1 + 0.05 * Math.random()))}.` };
  }

  function canAfford(S, fee, wage, replacing) {
    const c = S.clubs[S.user];
    if (fee > c.cash) return `No tienes saldo suficiente (${U.money(c.cash)}).`;
    const bill = W.wageBill(S, S.user) - (replacing || 0);
    if (bill + wage > c.wageBudget) return `Superas el presupuesto salarial (${U.money(bill + wage)} de ${U.money(c.wageBudget)}/sem).`;
    if (W.squad(S, S.user).length >= MAX_SQUAD) return `Tu plantilla está completa (${MAX_SQUAD} jugadores).`;
    return null;
  }

  /** Cierra un fichaje del usuario. */
  function sign(S, p, fee, wage, years) {
    const w = willing(S, p, S.user);
    if (!w.ok) return { ok: false, msg: w.reason };
    const err = canAfford(S, fee, wage);
    if (err) return { ok: false, msg: err };
    if (p.club >= 0 && !windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    const fromName = p.club >= 0 ? S.clubs[p.club].name : 'agente libre';
    if (p.club >= 0) S.clubs[p.club].cash += fee;
    S.clubs[S.user].cash -= fee;
    S.fin.buys += fee;
    p.club = S.user; p.wage = wage; p.contract = S.season + years; p.listed = false;
    delete S.neg[p.id];
    W.dirty(S);
    TL.Game.mail(S, 'Fichaje cerrado', `${p.name} (${fromName}) firma hasta ${p.contract}` +
      (fee ? ` por ${U.money(fee)}` : '') + ` con un salario de ${U.money(wage)}/sem.`, 'market');
    return { ok: true };
  }

  function transferOut(S, p, toClub, fee) {
    S.clubs[toClub].cash -= fee;
    S.clubs[p.club].cash += fee;
    if (p.club === S.user) S.fin.sales += fee;
    p.club = toClub; p.listed = false;
    p.contract = S.season + 1 + U.int(1, maxYears(p) === 1 ? 0 : 3);
    p.wage = Math.max(p.wage, F.wageFor(p.ovr, p.age, wealthOf(S, toClub), S.econ.wage));
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    W.dirty(S);
  }

  function buyersFor(S, p, minCash) {
    return S.clubs.filter(c => c.id !== S.user && c.id !== p.club && c.cash >= minCash &&
      c.rep >= p.ovr - 7 && c.rep <= p.ovr + 9 && W.squad(S, c.id).length < MAX_SQUAD - 2);
  }

  /** Venta rápida a un club cualquiera al 70% del valor. */
  function quickSell(S, p) {
    if (!windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    const fee = F.roundMoney(W.value(S, p) * 0.7);
    const buyers = buyersFor(S, p, fee);
    if (!buyers.length) return { ok: false, msg: 'Ningún club puede pagarlo ahora mismo.' };
    const b = U.pick(buyers);
    transferOut(S, p, b.id, fee);
    TL.Game.mail(S, 'Venta cerrada', `${p.name} se marcha a ${b.name} por ${U.money(fee)}.`, 'market');
    return { ok: true, msg: `${p.short} vendido a ${b.name} por ${U.money(fee)}.` };
  }

  function releaseCost(S, p) {
    const n = S.fixtures.length;
    const weeks = Math.max(0, yearsLeft(S, p)) * n + (n - S.week);
    return F.roundMoney(p.wage * weeks * 0.5);
  }

  function release(S, p) {
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    const cost = releaseCost(S, p);
    if (cost > S.clubs[S.user].cash) return { ok: false, msg: 'No tienes saldo para pagar la rescisión.' };
    S.clubs[S.user].cash -= cost;
    S.fin.other += cost;
    p.club = -1; p.contract = 0; p.listed = false;
    S.tactics.slots = S.tactics.slots.map(id => (id === p.id ? -1 : id));
    W.dirty(S);
    TL.Game.mail(S, 'Contrato rescindido', `${p.name} queda libre. Coste: ${U.money(cost)}.`, 'club');
    return { ok: true, msg: `${p.short} ya no es jugador del club.` };
  }

  function renewDemand(S, p) {
    const base = F.wageFor(p.ovr, p.age, wealthOf(S, S.user), S.econ.wage);
    return F.roundMoney(Math.max(p.wage * 1.05, base * 1.05));
  }

  /** Duraciones posibles (en temporadas desde ahora) que alargan el contrato actual. */
  function renewOptions(S, p) {
    const out = [];
    for (let y = 1; y <= maxYears(p); y++) if (S.season + y > p.contract) out.push(y);
    return out;
  }

  function renew(S, p, years) {
    const wage = renewDemand(S, p);
    const err = canAfford(S, 0, wage - p.wage, 0);
    if (err && !/plantilla/.test(err)) return { ok: false, msg: err };
    p.wage = wage;
    p.contract = S.season + years;
    if (p.contract <= S.season) p.contract = S.season + 1;
    TL.Game.mail(S, 'Renovación', `${p.name} renueva hasta ${p.contract} (${U.money(wage)}/sem).`, 'club');
    return { ok: true, msg: `${p.short} renovado hasta ${p.contract}.` };
  }

  // ------------------------------------------------------------ IA semanal
  function weekly(S) {
    // Caducan las ofertas pendientes de la semana anterior
    for (const m of S.inbox) {
      if (m.kind === 'offer' && !m.done && m.data.exp < S.week) { m.done = true; m.res = 'Caducada'; }
    }
    if (!windowOpen(S)) return;
    const mine = W.squad(S, S.user);
    let offers = 0;
    for (const p of U.shuffle(mine.slice())) {
      if (offers >= 2) break;
      const userRep = S.clubs[S.user].rep;
      const prob = p.listed ? 0.35 : p.ovr >= userRep + 1 ? 0.035 : 0.006;
      if (!U.chance(prob)) continue;
      const val = W.value(S, p);
      const amount = F.roundMoney(val * (p.listed ? U.rand(0.75, 1.1) : U.rand(1.05, 1.45)));
      const buyers = buyersFor(S, p, amount);
      if (!buyers.length) continue;
      const b = U.pick(buyers);
      offers++;
      TL.Game.mail(S, `Oferta por ${p.short}`,
        `${b.name} ofrece ${U.money(amount)} por ${p.name} (valor ${U.money(val)}).`, 'offer',
        { pid: p.id, club: b.id, amount, exp: S.week + 1 });
    }
    aiTransfers(S, S.gender === 'M' ? 8 : 3);
  }

  function acceptOffer(S, msg) {
    const { pid, club, amount } = msg.data;
    const p = S.players[pid];
    if (p.club !== S.user) return { ok: false, msg: 'El jugador ya no está en tu club.' };
    if (!windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    if (S.clubs[club].cash < amount) return { ok: false, msg: `${S.clubs[club].name} ya no puede pagarlo.` };
    transferOut(S, p, club, amount);
    msg.done = true; msg.res = 'Aceptada';
    TL.Game.mail(S, 'Venta cerrada', `${p.name} se marcha a ${S.clubs[club].name} por ${U.money(amount)}.`, 'market');
    return { ok: true, msg: `${p.short} vendido por ${U.money(amount)}.` };
  }

  /** Traspasos entre clubes de la IA para mantener vivo el mundo. */
  function aiTransfers(S, n) {
    const userLeague = S.clubs[S.user].league;
    const clubs = S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable);
    for (let k = 0; k < n; k++) {
      const buyer = U.pick(clubs);
      if (W.squad(S, buyer.id).length >= MAX_SQUAD - 3) continue;
      let target = null;
      for (let t = 0; t < 60; t++) {
        const p = S.players[U.int(0, S.players.length - 1)];
        if (p.club < 0 || p.club === buyer.id || p.club === S.user || p.age > 31) continue;
        if (p.ovr < buyer.rep - 1 || p.ovr > buyer.rep + 4) continue;
        if (S.clubs[p.club].rep > buyer.rep + 2) continue;
        if (W.squad(S, p.club).length <= 20) continue;
        target = p; break;
      }
      if (!target) continue;
      const fee = askingPrice(S, target);
      if (fee > buyer.cash * 0.6) continue;
      const fromClub = target.club;
      transferOut(S, target, buyer.id, fee);
      if (buyer.league === userLeague || S.clubs[fromClub].league === userLeague) {
        TL.Game.mail(S, 'Rumores confirmados', `${target.name} deja ${S.clubs[fromClub].name} y ficha por ${buyer.name} por ${U.money(fee)}.`, 'news');
      }
    }
  }

  // ------------------------------------------------------------ Búsqueda
  function search(S, f) {
    const q = f.q ? U.norm(f.q.trim()) : '';
    const out = [];
    for (const p of S.players) {
      if (p.club === S.user || p.club < -1) continue;
      if (f.free ? p.club !== -1 : p.club === -1) continue;
      if (f.pos && p.pos !== f.pos && !(f.alt && p.alt.includes(f.pos))) continue;
      if (f.minOvr && p.ovr < f.minOvr) continue;
      if (f.maxAge && p.age > f.maxAge) continue;
      if (f.league != null && f.league !== '' && (p.club < 0 || S.clubs[p.club].league !== +f.league)) continue;
      if (f.maxValue && W.value(S, p) > f.maxValue) continue;
      if (f.listed && !p.listed) continue;
      if (q && !U.norm(p.name).includes(q)) continue;
      out.push(p);
    }
    const key = f.sort || 'ovr';
    out.sort((a, b) => key === 'value' ? W.value(S, b) - W.value(S, a) :
      key === 'age' ? a.age - b.age : key === 'pot' ? b.pot - a.pot : b.ovr - a.ovr);
    return out;
  }

  TL.Market = {
    MAX_SQUAD, windowOpen, yearsLeft, askingPrice, wageDemand, willing, maxYears, offer, canAfford, sign,
    quickSell, releaseCost, release, renewDemand, renewOptions, renew, weekly, acceptOffer, search
  };
})();
