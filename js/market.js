/* TOUCHLINE — mercado de fichajes, contratos y ofertas de la IA */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U, W = TL.World;

  const MAX_SQUAD = 34;

  /** Historial de traspasos de la temporada: [jornada, pid, de, a, importe, tipo]. */
  function logMove(S, p, from, to, fee, kind) {
    p.sale = null;
    S.tlog = S.tlog || [];
    S.tlog.push([S.week, p.id, from, to, Math.round(fee || 0), kind || (fee ? 'fee' : 'free')]);
    if (S.tlog.length > 1500) S.tlog.splice(0, S.tlog.length - 1500);
  }

  function windowOpen(S) {
    const n = S.fixtures ? S.fixtures.length : 38;
    const mid = Math.floor(n / 2);
    return S.week <= 3 || (S.week >= mid && S.week <= mid + 2);
  }

  function yearsLeft(S, p) { return p.contract - (S.season + 1); }

  function askingPrice(S, p, buyer) {
    const v = W.value(S, p) * (buyer === S.user ? TL.Manager.B(S).neg : 1);
    if (p.club < 0) return 0;
    const sq = W.squad(S, p.club).sort((a, b) => b.ovr - a.ovr);
    const rank = sq.findIndex(x => x.id === p.id);
    let f = rank < 11 ? 1.35 : rank < 18 ? 1.15 : 1.0;
    const yl = yearsLeft(S, p);
    if (yl <= 0) f *= 0.6; else if (yl === 1) f *= 0.85;
    if (p.listed) f *= 0.9;
    if (p.sale) f = Math.min(f, 1.05) * (1 - p.sale.d); // lo quiere vender: sin prima de titular y con rebaja
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
    if (clubId === S.user) w *= TL.Manager.B(S).neg;
    return F.roundMoney(w);
  }

  function willing(S, p, clubId) {
    const to = S.clubs[clubId];
    const from = p.club >= 0 ? S.clubs[p.club] : null;
    if (p.ovr > to.rep + 11) return { ok: false, reason: `${p.short} no ve a tu club a su nivel.` };
    if (from && from.rep - to.rep > (p.sale && p.sale.r === 'unhappy' ? 11 : 7) && p.ovr >= to.rep) return { ok: false, reason: `${p.short} no quiere bajar de categoría de club.` };
    return { ok: true };
  }

  function maxYears(p) { return p.age >= 34 ? 1 : p.age >= 31 ? 2 : 5; }

  /** Evalúa una oferta por un jugador de otro club. */
  function offer(S, p, amount) {
    if (!windowOpen(S)) return { result: 'closed' };
    if (TL.Locker.onLoan(S, p.id)) return { result: 'reject', msg: 'Está cedido: su club de origen no negocia ahora.' };
    const ask = askingPrice(S, p, S.user);
    const seller = W.squad(S, p.club);
    if (seller.length <= 18 && !p.sale) return { result: 'reject', msg: `${S.clubs[p.club].name} no quiere vender: tiene la plantilla corta.` };
    if (amount >= ask) return { result: 'accept', price: amount };
    S.neg[p.id] = (S.neg[p.id] || 0) + 1;
    if (amount >= ask * 0.8) return { result: 'counter', price: askingPrice(S, p, S.user), msg: `Piden ${U.money(askingPrice(S, p, S.user))}.` };
    return { result: 'reject', msg: `Oferta insuficiente. Su valoración ronda ${U.money(ask * (1 + 0.05 * Math.random()))}.` };
  }

  function canAfford(S, fee, wage, replacing, tolerance) {
    const tb = TL.Commerce.transferBudget(S);
    const budget = TL.Commerce.refreshBudget(S);
    if (fee > tb) return `No tienes presupuesto de fichajes suficiente (${U.money(Math.max(0, tb))}).`;
    const bill = W.wageBill(S, S.user) - (replacing || 0);
    if (bill + wage > budget * (tolerance || 1)) return `Superas el presupuesto salarial (${U.money(bill + wage)} de ${U.money(budget)}/sem). Puedes ampliarlo en Club → Resumen.`;
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
    logMove(S, p, p.club, S.user, fee);
    if (p.club >= 0) S.clubs[p.club].cash += fee;
    S.clubs[S.user].cash -= fee;
    S.fin.buys += fee;
    p.club = S.user; p.wage = wage; p.contract = S.season + years; p.listed = false;
    delete S.neg[p.id];
    W.dirty(S);
    TL.Commerce.refreshBudget(S);
    TL.Game.mail(S, 'Fichaje cerrado', `${p.name} (${fromName}) firma hasta ${p.contract}` +
      (fee ? ` por ${U.money(fee)}` : '') + ` con un salario de ${U.money(wage)}/sem.`, 'market');
    TL.News.add(S, 'fichajes', `${S.clubs[S.user].name} ficha a ${p.name}`,
      `Llega desde ${fromName}${fee ? ' por ' + U.money(fee) : ' con la carta de libertad'}. Firma hasta ${p.contract}.`, S.user, p.id, 'pos');
    p.mor = Math.max(p.mor == null ? 70 : p.mor, 78);
    if (S.com && p.ovr >= S.clubs[S.user].rep + 3) S.com.fans = Math.round(S.com.fans * 1.006);
    return { ok: true };
  }

  function transferOut(S, p, toClub, fee) {
    logMove(S, p, p.club, toClub, fee);
    S.clubs[toClub].cash -= fee;
    S.clubs[p.club].cash += fee;
    const fromUser = p.club === S.user;
    const freed = fromUser ? p.wage : 0;
    if (fromUser) S.fin.sales += fee;
    p.club = toClub; p.listed = false;
    p.contract = S.season + 1 + U.int(1, maxYears(p) === 1 ? 0 : 3);
    p.wage = Math.max(p.wage, F.wageFor(p.ovr, p.age, wealthOf(S, toClub), S.econ.wage));
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    W.dirty(S);
    if (fromUser) TL.Commerce.refreshBudget(S);
    return freed;
  }

  /** Capacidad de compra de un club de la IA: su caja más lo que puede obtener vendiendo/financiándose. */
  function power(S, c) {
    S._power = S._power && S._power.w === S.week ? S._power : { w: S.week };
    if (S._power[c.id] == null) S._power[c.id] = Math.max(0, c.cash) + U.sum(W.squad(S, c.id), x => W.value(S, x)) * 0.2;
    return S._power[c.id];
  }

  function buyersFor(S, p, minCash, wide) {
    const lo = p.ovr - (wide ? 14 : 9), hi = p.ovr + (wide ? 16 : 12);
    return S.clubs.filter(c => c.id !== S.user && c.id !== p.club && c.rep >= lo && c.rep <= hi &&
      W.squad(S, c.id).length < MAX_SQUAD - 2 && power(S, c) >= minCash);
  }

  /** Venta rápida a un club cualquiera al 70% del valor. */
  function quickSell(S, p) {
    if (!windowOpen(S)) return { ok: false, msg: 'El mercado está cerrado.' };
    if (TL.Locker.onLoan(S, p.id)) return { ok: false, msg: 'Está cedido: no puedes venderlo.' };
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    const fee = F.roundMoney(W.value(S, p) * 0.7);
    const buyers = buyersFor(S, p, fee);
    if (!buyers.length) return { ok: false, msg: 'Ningún club puede pagarlo ahora mismo.' };
    const b = U.pick(buyers);
    const freed = transferOut(S, p, b.id, fee);
    TL.Game.mail(S, 'Venta cerrada', `${p.name} se marcha a ${b.name} por ${U.money(fee)}. Liberas ${U.money(freed)}/sem en salarios.`, 'market');
    return { ok: true, msg: `${p.short} vendido por ${U.money(fee)} · liberas ${U.money(freed)}/sem` };
  }

  function releaseCost(S, p) {
    const n = S.fixtures.length;
    const weeks = Math.max(0, yearsLeft(S, p)) * n + (n - S.week);
    return F.roundMoney(p.wage * weeks * 0.5);
  }

  function release(S, p) {
    if (TL.Locker.onLoan(S, p.id)) return { ok: false, msg: 'Está cedido: no puedes rescindir su contrato.' };
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    const cost = releaseCost(S, p);
    if (cost > S.clubs[S.user].cash) return { ok: false, msg: 'No tienes saldo para pagar la rescisión.' };
    S.clubs[S.user].cash -= cost;
    S.fin.other += cost;
    p.club = -1; p.contract = 0; p.listed = false;
    S.tactics.slots = S.tactics.slots.map(id => (id === p.id ? -1 : id));
    W.dirty(S);
    TL.Commerce.refreshBudget(S);
    TL.Game.mail(S, 'Contrato rescindido', `${p.name} queda libre. Coste: ${U.money(cost)}.`, 'club');
    return { ok: true, msg: `${p.short} ya no es jugador del club.` };
  }

  function renewDemand(S, p) {
    const base = F.wageFor(p.ovr, p.age, wealthOf(S, S.user), S.econ.wage);
    return F.roundMoney(Math.max(p.wage * 1.05, base * 1.05));
  }

  /** Duraciones posibles (en temporadas desde ahora) que alargan el contrato actual. */
  /**
   * Duraciones posibles de una renovación: temporadas extra a partir de la que
   * está en juego (renovar 1 en 2026/27 = hasta 2028). Solo las que alargan el contrato.
   */
  function renewEnd(S, y) { return S.season + 1 + y; }
  function renewOptions(S, p) {
    const out = [];
    for (let y = 1; y <= maxYears(p); y++) if (renewEnd(S, y) > p.contract) out.push(y);
    return out;
  }

  function renew(S, p, years) {
    const wage = renewDemand(S, p);
    const err = canAfford(S, 0, wage - p.wage, 0, 1.05);
    if (err && !/plantilla/.test(err)) return { ok: false, msg: err };
    if (!renewOptions(S, p).includes(years)) return { ok: false, msg: 'Duración no válida.' };
    p.wage = wage;
    p.contract = renewEnd(S, years);
    TL.Game.mail(S, 'Renovación', `${p.name} renueva hasta ${p.contract} (${U.money(wage)}/sem).`, 'club');
    return { ok: true, msg: `${p.short} renovado hasta ${p.contract}.` };
  }

  // ------------------------------------------------------------ IA semanal
  function weekly(S) {
    // Caducan las ofertas pendientes de la semana anterior
    for (const m of S.inbox) {
      if (m.kind === 'offer' && !m.done && m.data.exp < S.week) { m.done = true; m.res = 'Caducada'; }
    }
    if (!windowOpen(S)) { clearSales(S); aiEmergency(S); return; }
    aiListings(S);
    const mine = W.squad(S, S.user);
    const n = S.fixtures ? S.fixtures.length : 38, mid = Math.floor(n / 2);
    const lastWeek = S.week === 3 || S.week === mid + 2; // última semana de la ventana
    const pending = new Set(S.inbox.filter(m => m.kind === 'offer' && !m.done).map(m => m.data.pid));
    let offers = 0;
    for (const p of U.shuffle(mine.slice())) {
      if (offers >= 3) break;
      if (pending.has(p.id) || TL.Locker.onLoan(S, p.id)) continue;
      const userRep = S.clubs[S.user].rep;
      const prob = p.listed ? (lastWeek ? 1 : 0.55) : p.ovr >= userRep + 1 ? 0.05 : 0.012;
      if (!U.chance(prob)) continue;
      const val = W.value(S, p);
      // Si está en venta y no ha salido nada, al final de la ventana llega al menos una oferta a la baja
      const low = p.listed && lastWeek;
      let amount = F.roundMoney(val * (p.listed ? (low ? U.rand(0.6, 0.85) : U.rand(0.75, 1.1)) : U.rand(1.05, 1.45)));
      let buyers = buyersFor(S, p, amount, low);
      if (!buyers.length && p.listed) { amount = F.roundMoney(amount * 0.7); buyers = buyersFor(S, p, amount, true); }
      if (!buyers.length) continue;
      const b = U.pick(buyers);
      offers++;
      S._newOffers = (S._newOffers || 0) + 1;
      TL.Game.mail(S, `Oferta por ${p.short}`,
        `${b.name} ofrece ${U.money(amount)} por ${p.name} (valor ${U.money(val)}).` +
        (lastWeek ? ' Es la última semana del mercado.' : ''), 'offer',
        { pid: p.id, club: b.id, amount, exp: S.week + 1 });
    }
    aiTransfers(S, S.gender === 'M' ? 18 : 8);
  }

  function acceptOffer(S, msg) {
    const { pid, club, amount } = msg.data;
    const p = S.players[pid];
    if (p.club !== S.user) return { ok: false, msg: 'El jugador ya no está en tu club.' };
    // Una oferta recibida con el mercado abierto se puede aceptar hasta que caduca
    if (msg.data.exp < S.week) return { ok: false, msg: 'La oferta ha caducado.' };
    if (W.squad(S, S.user).length <= 16) return { ok: false, msg: 'No puedes quedarte con menos de 16 jugadores.' };
    if (power(S, S.clubs[club]) < amount) return { ok: false, msg: `${S.clubs[club].name} ya no puede pagarlo.` };
    const freed = transferOut(S, p, club, amount);
    msg.done = true; msg.res = 'Aceptada';
    TL.News.add(S, 'fichajes', `${p.name} se marcha a ${S.clubs[club].name}`, `Operación cerrada por ${U.money(amount)}.`, club, p.id, 'neu');
    TL.Game.mail(S, 'Venta cerrada', `${p.name} se marcha a ${S.clubs[club].name} por ${U.money(amount)}. Liberas ${U.money(freed)}/sem en salarios.`, 'market');
    return { ok: true, msg: `${p.short} vendido por ${U.money(amount)} · liberas ${U.money(freed)}/sem` };
  }

  // ------------------------------------------------------------ Mercado de la IA
  const LINE_NAME = ['la portería', 'la defensa', 'el centro del campo', 'la delantera'];
  const XI_LINE = [1, 4, 4, 2], DEPTH = [2, 7, 7, 4];

  /** Qué necesita un club de la IA: la línea de su once más floja para su nivel (o la más corta). */
  function needOf(S, clubId) {
    const c = S.clubs[clubId];
    const lines = [[], [], [], []];
    for (const p of W.squad(S, clubId)) if (p.age <= 34) lines[F.LINE[p.pos]].push(p.ovr);
    let best = null;
    for (let l = 0; l < 4; l++) {
      const a = lines[l].sort((x, y) => y - x), xi = a.slice(0, XI_LINE[l]);
      const level = xi.length ? U.sum(xi) / xi.length : 40;
      const gap = (c.rep - level) + (a.length < DEPTH[l] ? 3 * (DEPTH[l] - a.length) : 0) + (xi.length < XI_LINE[l] ? 12 : 0);
      if (!best || gap > best.gap) best = { line: l, gap, level, weakest: xi.length ? xi[xi.length - 1] : 40 };
    }
    return best;
  }

  /** Busca un refuerzo para esa línea: mejor que el titular más flojo, asequible y que quiera venir. */
  function findTarget(S, buyer, need) {
    const cap = power(S, buyer) * 0.55;
    let pick = null;
    for (let t = 0; t < 320; t++) {
      const p = S.players[U.int(0, S.players.length - 1)];
      if (p.club < -1 || p.club === buyer.id || p.club === S.user || F.LINE[p.pos] !== need.line || TL.Locker.onLoan(S, p.id)) continue;
      if (p.age > 32 || p.ovr <= need.weakest + 1 || p.ovr > buyer.rep + 5) continue;
      if (p.club >= 0) {
        const from = S.clubs[p.club];
        if (from.rep > buyer.rep + 3) continue; // nadie se va a un club mucho menor
        const sq = W.squad(S, p.club);
        if (sq.length <= 20 && !p.sale) continue;
        const better = sq.filter(x => x.ovr > p.ovr).length;
        if (better < 3 && from.rep >= buyer.rep - 2 && !p.listed && !p.sale) continue; // no venden a su estrella a un igual
      }
      const fee = p.club >= 0 ? askingPrice(S, p) : 0;
      if (fee > cap) continue;
      const v = p.ovr - Math.max(0, p.age - 28) * 1.3 + (p.pot - p.ovr) * 0.15 + (p.listed || p.sale ? 1.5 + (p.sale ? p.sale.d * 6 : 0) : 0) + U.rand(0, 2);
      if (!pick || v > pick.v) pick = { v, p, fee };
    }
    return pick;
  }

  /** Si la plantilla se llena, el club se deshace del que menos cuenta. */
  function trimSquad(S, clubId) {
    const sq = W.squad(S, clubId);
    if (sq.length < MAX_SQUAD - 2) return;
    const out = sq.slice().sort((a, b) => (a.ovr - Math.max(0, a.age - 30) * 2) - (b.ovr - Math.max(0, b.age - 30) * 2))[0];
    const fee = F.roundMoney(W.value(S, out) * 0.6);
    const b = buyersFor(S, out, fee, true).filter(c => c.rep < S.clubs[clubId].rep)[0];
    if (b) transferOut(S, out, b.id, fee);
    else { out.club = -1; out.contract = 0; out.listed = false; W.dirty(S); }
  }

  /**
   * Traspasos entre clubes de la IA: cada club ficha según lo que necesita
   * (su línea más floja), con su dinero, y vende al que le sobra. Los rivales
   * de tu liga cambian de plantilla igual que tú, y eso se nota en sus partidos.
   */
  function aiTransfers(S, n) {
    const userLeague = S.clubs[S.user].league;
    const clubs = S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable);
    const mineL = clubs.filter(c => c.league === userLeague);
    for (let k = 0; k < n; k++) {
      // Dos de cada tres operaciones, en tu liga: ahí es donde se nota
      const pool = k % 3 !== 2 && mineL.length ? mineL : clubs;
      let buyer = null, need = null;
      for (let t = 0; t < 6; t++) {
        const c = U.pick(pool);
        if (W.squad(S, c.id).length >= MAX_SQUAD - 2) continue;
        const nd = needOf(S, c.id);
        const score = nd.gap + U.rand(-2, 2) + Math.log10(1 + Math.max(0, c.cash) / 1e6);
        if (!need || score > need.score) { buyer = c; need = Object.assign(nd, { score }); }
      }
      if (!buyer || need.gap < -4) continue;
      const pick = findTarget(S, buyer, need);
      if (!pick) continue;
      const target = pick.p, fee = pick.fee;
      const fromClub = target.club;
      if (fromClub >= 0) transferOut(S, target, buyer.id, fee);
      else {
        logMove(S, target, -1, buyer.id, 0);
        target.club = buyer.id; target.listed = false; target.fit = Math.max(target.fit, 85);
        target.contract = S.season + 1 + U.int(0, maxYears(target) === 1 ? 0 : 2);
        target.wage = F.wageFor(target.ovr, target.age, wealthOf(S, buyer.id), S.econ.wage);
        W.dirty(S);
      }
      trimSquad(S, buyer.id);
      if (S._power) delete S._power[buyer.id];
      if (buyer.league === userLeague || (fromClub >= 0 && S.clubs[fromClub].league === userLeague) || target.ovr >= 82) {
        TL.News.add(S, 'fichajes', `${buyer.name} ficha a ${target.name}`,
          (fromClub >= 0 ? `${target.name} (${target.ovr}) deja ${S.clubs[fromClub].name} a cambio de ${U.money(fee)}.` : `${target.name} (${target.ovr}) llega con la carta de libertad.`) +
          ` Viene a reforzar ${LINE_NAME[need.line]}.`, buyer.id, target.id, 'neu');
      }
    }
  }

  /** Con el mercado cerrado, un club con la plantilla diezmada puede tirar de agentes libres. */
  function aiEmergency(S) {
    const L = W.userLeague(S);
    for (const id of L.clubs) {
      if (id === S.user || Math.random() > 0.25) continue;
      const lines = [0, 0, 0, 0];
      for (const p of W.squad(S, id)) if (p.inj <= 0 && p.sus <= 0) lines[F.LINE[p.pos]]++;
      const l = lines.findIndex((v, i) => v < [1, 3, 3, 1][i]);
      if (l < 0) continue;
      const c = S.clubs[id];
      const p = S.players.filter(x => x.club === -1 && F.LINE[x.pos] === l && x.ovr <= c.rep + 2).sort((a, b) => b.ovr - a.ovr)[0];
      if (!p) continue;
      logMove(S, p, -1, id, 0);
      p.club = id; p.contract = S.season + 1; p.listed = false;
      p.wage = F.wageFor(p.ovr, p.age, wealthOf(S, id), S.econ.wage);
      W.dirty(S);
      TL.News.add(S, 'fichajes', `${c.name} ficha a ${p.name}, agente libre`, `Con ${LINE_NAME[l]} en cuadro por lesiones y sanciones, firma hasta final de temporada.`, id, p.id, 'neu');
    }
  }


  // ------------------------------------------------------------ La IA pone jugadores en venta
  /** Motivos deportivos y económicos, con la rebaja inicial que acepta su club. */
  const SALE = {
    unhappy: { d: 0.15, eco: false, s: 'Pide salir', t: 'Pide salir: no está a gusto' },
    coach: { d: 0.2, eco: false, s: 'Fuera de los planes', t: 'No entra en los planes del míster' },
    surplus: { d: 0.25, eco: false, s: 'Le sobra', t: 'Le sobra a su club' },
    veteran: { d: 0.3, eco: false, s: 'Veterano', t: 'Veterano: su club renueva la plantilla' },
    contract: { d: 0.2, eco: false, s: 'Fin de contrato', t: 'Acaba contrato y no renovará' },
    debt: { d: 0.3, eco: true, s: 'Club en apuros', t: 'Su club está en apuros y necesita vender' },
    wages: { d: 0.2, eco: true, s: 'Masa salarial', t: 'Su club quiere rebajar la masa salarial' }
  };
  const SALE_MAX = 0.45; // rebaja máxima tras semanas sin comprador

  function saleReason(S, c, sq, p, rank) {
    const R = [];
    if (c.cash < 0 && p.wage >= sq[Math.min(sq.length - 1, 4)].wage) R.push(['debt', 4]);
    if (W.wageBill(S, c.id) > c.wageBudget * 1.04 && rank >= 3 && p.wage >= sq[Math.min(sq.length - 1, 8)].wage) R.push(['wages', 3]);
    if (p.age >= 31 && rank >= 6) R.push(['veteran', 2]);
    if (p.contract <= S.season + 1 && rank >= 4) R.push(['contract', 1.5]);
    if (rank >= 5 && rank <= 15 && p.age >= 20 && p.age <= 30) R.push(['unhappy', 1.2]);
    if (rank >= 11 && rank <= 18) R.push(['coach', 1]);
    if (rank >= 18) R.push(['surplus', 1.5]);
    if (!R.length) return null;
    return U.weighted(R.map(r => ({ k: r[0], w: r[1] })), x => x.w).k;
  }

  /** Cada semana de mercado algunos clubes ponen a alguien en venta; si no sale, rebajan el precio. */
  function aiListings(S) {
    const userLeague = S.clubs[S.user].league;
    const cap = S.gender === 'M' ? 140 : 60;
    let n = 0;
    for (const p of S.players) {
      if (!p.sale) continue;
      n++;
      // Sin comprador: cada semana el club afloja un poco más
      if (S.week - p.sale.w >= 1) p.sale.d = Math.min(SALE_MAX, Math.round((p.sale.d + 0.05) * 100) / 100);
    }
    const clubs = U.shuffle(S.clubs.filter(c => c.id !== S.user && S.leagues[c.league].playable));
    for (const c of clubs) {
      if (n >= cap) break;
      const mineL = c.league === userLeague;
      const broke = c.cash < 0 || W.wageBill(S, c.id) > c.wageBudget * 1.04;
      if (!U.chance(mineL ? 0.3 : broke ? 0.2 : 0.045)) continue;
      const sq = W.squad(S, c.id).sort((a, b) => b.ovr - a.ovr);
      if (sq.length <= 19 || sq.filter(x => x.sale).length >= 2) continue;
      const pool = sq.map((p, rank) => [p, rank]).filter(([p]) => !p.sale && !TL.Locker.onLoan(S, p.id));
      for (let t = 0; t < 4; t++) {
        const [p, rank] = U.pick(pool);
        const r = saleReason(S, c, sq, p, rank);
        if (!r) continue;
        p.sale = { r, d: SALE[r].d, w: S.week };
        n++;
        if (mineL || p.ovr >= 80) TL.News.add(S, 'fichajes', `${c.name} pone en venta a ${p.name}`, `${SALE[r].t}. Escuchará ofertas por debajo de su valor (${U.money(askingPrice(S, p))}).`, c.id, p.id, 'neu');
        break;
      }
    }
    saleDigest(S);
  }

  /** Al abrir el mercado, tu director deportivo te señala gangas para tu línea más floja. */
  function saleDigest(S) {
    const n = S.fixtures ? S.fixtures.length : 38, mid = Math.floor(n / 2);
    if (S.week !== 0 && S.week !== mid) return;
    const need = needOf(S, S.user);
    const tb = TL.Commerce.transferBudget(S);
    const picks = S.players.filter(p => p.sale && p.club >= 0 && F.LINE[p.pos] === need.line && p.ovr >= need.weakest && willing(S, p, S.user).ok && askingPrice(S, p, S.user) <= tb)
      .sort((a, b) => b.ovr - a.ovr).slice(0, 3);
    if (!picks.length) return;
    TL.Game.mail(S, 'Oportunidades del mercado', `Hay clubes que venden por debajo de su valor y te vendría bien reforzar ${LINE_NAME[need.line]}:\n` +
      picks.map(p => `• ${p.name} (${p.ovr}, ${p.age} años, ${S.clubs[p.club].name}): ${SALE[p.sale.r].t.toLowerCase()} · −${Math.round(p.sale.d * 100)}\u00a0%`).join('\n') +
      '\nLos tienes todos en Mercado → En venta.', 'market');
  }

  /** Se cierra el mercado: lo que no se vendió deja de estar en venta. */
  function clearSales(S) { for (const p of S.players) if (p.sale) p.sale = null; }

  /** Jugadores que la IA tiene en venta (para la pestaña del mercado). */
  function onSale(S, f) {
    f = f || {};
    const out = S.players.filter(p => p.sale && p.club >= 0 && p.club !== S.user &&
      (!f.kind || (f.kind === 'eco') === SALE[p.sale.r].eco) && (f.line == null || f.line === '' || F.LINE[p.pos] === +f.line));
    return out.sort((a, b) => b.ovr - a.ovr || b.sale.d - a.sale.d);
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
      if (f.listed && !p.listed && !p.sale) continue;
      if (q && !U.norm(p.name).includes(q)) continue;
      out.push(p);
    }
    const key = f.sort || 'ovr';
    out.sort((a, b) => key === 'value' ? W.value(S, b) - W.value(S, a) :
      key === 'age' ? a.age - b.age : key === 'pot' ? b.pot - a.pot : b.ovr - a.ovr);
    return out;
  }

  TL.Market = {
    MAX_SQUAD, windowOpen, logMove, yearsLeft, askingPrice, wageDemand, willing, maxYears, offer, canAfford, sign,
    quickSell, releaseCost, release, renewDemand, renewOptions, renewEnd, renew, weekly, acceptOffer, search, SALE, onSale, clearSales, aiListings
  };
})();
