/* TOUCHLINE — área comercial del club del usuario: afición, patrocinios,
 * marketing, entradas, préstamos y ampliación del estadio. */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U, W = TL.World;

  // ------------------------------------------------------------ Patrocinadores ficticios
  const BRANDS = {
    bank: ['Banco Atlas', 'Nordia Bank', 'Caja Meridiana', 'Fidelis Banca', 'Crédito Austral'],
    telco: ['Voxa', 'Telinka', 'Onda Móvil', 'Fibrix'],
    energy: ['Solaris Energía', 'Ventum', 'Hidra Power', 'Ecovolt'],
    air: ['Aerolínea Polar', 'SkyNomad', 'Azul Airways', 'Fly Meridian'],
    auto: ['Kaizen Motors', 'Valdor', 'Rinaldi Auto', 'Torque EV'],
    tech: ['Nexo Tech', 'Quanta', 'Pixelia', 'Orbis Cloud'],
    kit: ['Strider', 'Kaze Sport', 'Volt Athletic', 'Ardent', 'Lince Sportswear'],
    crypto: ['BitNova', 'Coinly', 'HODLX Exchange', 'MoonChain'],
    betting: ['BetMundo', 'ApuestaYa', 'GoalOdds'],
    fashion: ['Moda Pronto', 'Urban Thread']
  };
  const SECTOR_NAME = {
    bank: 'Banca', telco: 'Telecomunicaciones', energy: 'Energía', air: 'Aerolínea', auto: 'Automoción',
    tech: 'Tecnología', kit: 'Material deportivo', crypto: 'Criptomonedas', betting: 'Casa de apuestas', fashion: 'Moda'
  };
  const SLOTS = {
    shirt: { name: 'Patrocinador principal (camiseta)', share: 0.18, sectors: ['bank', 'telco', 'energy', 'air', 'tech'] },
    kit: { name: 'Proveedor técnico', share: 0.09, sectors: ['kit'] },
    stadium: { name: 'Naming del estadio', share: 0.08, sectors: ['bank', 'telco', 'energy', 'auto', 'tech', 'air'] },
    sleeve: { name: 'Manga y secundarios', share: 0.05, sectors: ['auto', 'tech', 'fashion', 'energy'] }
  };
  // Las casas de apuestas no pueden patrocinar camisetas en España (2021) ni en Italia (2018)
  const BETTING_BANNED = ['España', 'Italia'];

  const CAMPAIGNS = [
    { id: 'social', name: 'Campaña en redes sociales', cost: 0.5, weeks: 8, desc: 'Afición +0,4%/sem y merchandising +10% durante 8 semanas.', fx: { fans: 0.004, merch: 0.10 } },
    { id: 'season', name: 'Campaña de abonados', cost: 0.6, weeks: 99, desc: 'Asistencia +8% hasta final de temporada.', fx: { att: 0.08 } },
    { id: 'kit', name: 'Lanzamiento de nueva equipación', cost: 1.0, weeks: 10, desc: 'Merchandising +35% durante 10 semanas.', fx: { merch: 0.35 } },
    { id: 'stars', name: 'Anuncios con las estrellas', cost: 0.7, weeks: 6, desc: 'Merchandising +20% y afición +0,3%/sem, pero las estrellas pierden algo de moral por la agenda.', fx: { merch: 0.2, fans: 0.003 } },
    { id: 'community', name: 'Programa social de la fundación', cost: 0.4, weeks: 12, desc: 'Afición +0,15%/sem, +4 de confianza de la directiva y amortigua el daño de los escándalos.', fx: { fans: 0.0015, shield: 0.3 } },
    { id: 'tour', name: 'Gira de pretemporada (Asia/EE. UU.)', cost: 0, weeks: 0, preseason: true, desc: 'Ingreso inmediato y +2% de afición, pero la plantilla empieza cansada (-12 de forma física).' }
  ];

  // ------------------------------------------------------------ Estado
  function base(S) {
    const c = S.clubs[S.user];
    return c.revScale * W.revenueCurve(c.rep);
  }

  function init(S) {
    if (S.com) return S.com;
    const c = S.clubs[S.user];
    const C = base(S);
    const fans = Math.round(c.capacity * (1.1 + Math.max(0, c.rep - 60) / 18) * U.rand(0.9, 1.1) / 10) * 10;
    S.com = {
      fans, fans0: fans, merchPerFan: (C * 0.2) / fans, ticketMult: 1,
      sponsors: [], offers: {}, campaigns: [], tour: -1, loans: [], expansion: null, closure: 0, loanId: 1
    };
    // Contratos heredados: camiseta y proveedor técnico activos; naming y manga, libres
    S.com.sponsors.push(makeOffer(S, 'shirt', 'safe', S.season + 1));
    S.com.sponsors.push(makeOffer(S, 'kit', 'safe', S.season + 2));
    for (const sl of ['stadium', 'sleeve']) S.com.offers[sl] = offersFor(S, sl);
    return S.com;
  }

  function country(S) { return S.leagues[S.clubs[S.user].league].country; }

  function makeOffer(S, slot, style, until) {
    const C = base(S);
    const b = TL.Manager.B(S);
    const def = SLOTS[slot];
    let sectors = def.sectors.slice();
    if (style === 'risky') sectors = slot === 'kit' ? ['kit'] : (BETTING_BANNED.includes(country(S)) ? ['crypto', 'fashion'] : ['crypto', 'betting']);
    const sector = U.pick(sectors);
    const brand = U.pick(BRANDS[sector]);
    const k = C * def.share * b.sponsor;
    const o = { slot, brand, sector, style, until: until || S.season + U.int(1, 3), weekly: 0, winBonus: 0, risk: 0 };
    if (style === 'safe') { o.weekly = F.roundMoney(k * U.rand(0.92, 1.05)); o.until = until || S.season + 3; }
    else if (style === 'perf') { o.weekly = F.roundMoney(k * 0.7); o.winBonus = F.roundMoney(k * U.rand(0.7, 0.85)); o.until = until || S.season + 2; }
    else { o.weekly = F.roundMoney(k * U.rand(1.3, 1.5)); o.risk = sector === 'betting' ? 0.06 : 0.15; o.until = until || S.season + 2; }
    return o;
  }

  function offersFor(S, slot) {
    return ['safe', 'perf', 'risky'].map(st => makeOffer(S, slot, st));
  }

  function sponsor(S, slot) { return S.com.sponsors.find(s => s.slot === slot) || null; }

  function signSponsor(S, slot, idx) {
    const o = (S.com.offers[slot] || [])[idx];
    if (!o) return { ok: false, msg: 'Oferta no disponible' };
    if (sponsor(S, slot)) return { ok: false, msg: 'Ese espacio ya tiene patrocinador' };
    S.com.sponsors.push(o);
    delete S.com.offers[slot];
    if (o.style === 'risky') S.com.fans = Math.round(S.com.fans * (o.sector === 'betting' ? 0.985 : 0.99));
    if (slot === 'stadium') {
      const c = S.clubs[S.user];
      S.com.oldStadium = c.stadium;
      c.stadium = `${o.brand} ${U.pick(['Arena', 'Stadium', 'Park'])}`;
    }
    TL.News.add(S, 'club', `${S.clubs[S.user].name} firma con ${o.brand}`,
      `${SLOTS[slot].name}: ${U.money(o.weekly)}/sem${o.winBonus ? ` + ${U.money(o.winBonus)} por victoria` : ''} hasta ${o.until}.`, S.user);
    return { ok: true, msg: `Contrato firmado con ${o.brand}` };
  }

  function endSponsor(S, s, reason) {
    S.com.sponsors = S.com.sponsors.filter(x => x !== s);
    if (s.slot === 'stadium' && S.com.oldStadium) { S.clubs[S.user].stadium = S.com.oldStadium; S.com.oldStadium = null; }
    S.com.offers[s.slot] = offersFor(S, s.slot);
    if (reason) TL.Game.mail(S, `Fin del patrocinio de ${s.brand}`, reason + ' Tienes nuevas ofertas en Club → Comercial.', 'market');
  }

  // ------------------------------------------------------------ Marketing
  function campaignCost(S, c) { return F.roundMoney(base(S) * c.cost); }

  function launch(S, id) {
    const def = CAMPAIGNS.find(c => c.id === id);
    if (!def) return { ok: false, msg: 'Campaña desconocida' };
    const club = S.clubs[S.user];
    if (def.preseason) {
      if (S.week > 0) return { ok: false, msg: 'La gira solo se puede hacer en pretemporada.' };
      if (S.com.tour === S.season) return { ok: false, msg: 'Ya has hecho la gira este verano.' };
      const income = F.roundMoney(base(S) * 2.2 * TL.Manager.B(S).marketing * (0.8 + Math.max(0, club.rep - 65) / 25));
      club.cash += income;
      S.fin.tour = (S.fin.tour || 0) + income;
      S.com.fans = Math.round(S.com.fans * 1.02);
      S.com.tour = S.season;
      for (const p of W.squad(S, S.user)) {
        p.fit = Math.max(60, p.fit - 12);
        if (Math.random() < 0.03) p.inj = Math.max(p.inj, U.int(1, 3));
      }
      TL.News.add(S, 'club', `${club.name} completa su gira de pretemporada`, `El club ingresa ${U.money(income)} y gana seguidores, aunque la plantilla llega cansada al inicio de liga.`, S.user);
      return { ok: true, msg: `Gira completada: +${U.money(income)}` };
    }
    if (S.com.campaigns.some(c => c.id === id)) return { ok: false, msg: 'Esa campaña ya está en marcha.' };
    const cost = campaignCost(S, def);
    if (club.cash < cost) return { ok: false, msg: 'No tienes saldo suficiente.' };
    club.cash -= cost;
    S.fin.marketing = (S.fin.marketing || 0) + cost;
    S.com.campaigns.push({ id, weeksLeft: def.weeks === 99 ? S.fixtures.length - S.week : def.weeks });
    if (id === 'community') S.board.conf = U.clamp(S.board.conf + 4, 0, 100);
    if (id === 'stars') {
      W.squad(S, S.user).sort((a, b) => b.ovr - a.ovr).slice(0, 4).forEach(p => { p.mor = U.clamp((p.mor || 70) - 4, 0, 100); });
    }
    return { ok: true, msg: `Campaña lanzada (${U.money(cost)})` };
  }

  function fx(S, key) {
    const mk = TL.Manager.B(S).marketing;
    let v = 0;
    for (const c of S.com.campaigns) {
      const def = CAMPAIGNS.find(d => d.id === c.id);
      if (def && def.fx[key]) v += def.fx[key] * mk;
    }
    return v;
  }

  // ------------------------------------------------------------ Préstamos
  function maxDebt(S) { return F.roundMoney(base(S) * 30 * (1 + TL.Manager.lvl(S, 'neg3') * 0.1)); }
  function debt(S) { return U.sum(S.com.loans, l => l.balance); }

  function loanRate(S, extra) {
    const ratio = (debt(S) + (extra || 0)) / Math.max(1, maxDebt(S));
    const c = S.clubs[S.user];
    const r = 0.045 + 0.08 * ratio + (c.cash < 0 ? 0.03 : 0) + TL.Manager.B(S).loanRate;
    return Math.round(Math.max(0.02, r) * 1000) / 1000;
  }

  /** Condiciones de un préstamo: importe y duración en temporadas. */
  function loanQuote(S, amount, seasons) {
    const rate = loanRate(S, amount);
    const weeks = Math.max(1, Math.round(seasons * (S.fixtures ? S.fixtures.length : 38)));
    const total = amount * (1 + rate * seasons);
    return { amount, seasons, rate, weeks, weekly: Math.ceil(total / weeks), total: Math.round(total) };
  }

  function takeLoan(S, amount, seasons) {
    if (amount <= 0) return { ok: false, msg: 'Importe no válido' };
    if (debt(S) + amount > maxDebt(S)) return { ok: false, msg: `El banco no presta más de ${U.money(maxDebt(S) - debt(S))}.` };
    const q = loanQuote(S, amount, seasons);
    S.com.loans.push({ id: S.com.loanId++, principal: amount, balance: q.total, weekly: q.weekly, weeksLeft: q.weeks, rate: q.rate, season: S.season });
    S.clubs[S.user].cash += amount;
    if (debt(S) > maxDebt(S) * 0.6) S.board.conf = U.clamp(S.board.conf - 3, 0, 100);
    TL.Game.mail(S, 'Préstamo concedido', `Recibes ${U.money(amount)} al ${(q.rate * 100).toFixed(1)}% anual. Cuota: ${U.money(q.weekly)}/sem durante ${q.weeks} semanas.`, 'club');
    return { ok: true, msg: `Préstamo de ${U.money(amount)} concedido` };
  }

  function repayLoan(S, id) {
    const l = S.com.loans.find(x => x.id === id);
    if (!l) return { ok: false, msg: 'Préstamo no encontrado' };
    const due = Math.round(l.balance * 0.97); // descuento por amortización anticipada de intereses
    const c = S.clubs[S.user];
    if (c.cash < due) return { ok: false, msg: `Necesitas ${U.money(due)} para cancelarlo.` };
    c.cash -= due;
    S.fin.loans = (S.fin.loans || 0) + due;
    S.com.loans = S.com.loans.filter(x => x !== l);
    return { ok: true, msg: `Préstamo cancelado (${U.money(due)})` };
  }

  // ------------------------------------------------------------ Estadio
  function seatCost(S) {
    const w = S.leagues[S.clubs[S.user].league].wealth;
    return S.gender === 'F' ? 300 : Math.round(2600 * Math.sqrt(w));
  }
  function expansionOptions(S) {
    const c = S.clubs[S.user];
    return [[0.05, 10], [0.1, 16], [0.2, 26]].map(([pct, weeks]) => {
      const seats = Math.max(500, Math.round(c.capacity * pct / 100) * 100);
      return { seats, weeks, cost: F.roundMoney(seats * seatCost(S)) };
    }).filter(o => c.capacity + o.seats <= 110000);
  }
  function expand(S, idx) {
    if (S.com.expansion) return { ok: false, msg: 'Ya hay una ampliación en obras.' };
    const o = expansionOptions(S)[idx];
    if (!o) return { ok: false, msg: 'Opción no disponible' };
    const c = S.clubs[S.user];
    if (c.cash < o.cost) return { ok: false, msg: 'No tienes saldo suficiente (puedes pedir un préstamo).' };
    c.cash -= o.cost;
    S.fin.other = (S.fin.other || 0) + o.cost;
    S.com.expansion = { seats: o.seats, weeksLeft: o.weeks };
    TL.News.add(S, 'club', `${c.name} amplía su estadio`, `Obras para ${U.num(o.seats)} nuevas localidades (${U.money(o.cost)}). Estarán listas en ${o.weeks} semanas.`, S.user);
    return { ok: true, msg: 'Obras iniciadas' };
  }

  // ------------------------------------------------------------ Semana
  /** Ingresos y gastos semanales del club del usuario. */
  function weekly(S, round, result) {
    const com = init(S);
    const c = S.clubs[S.user];
    const C = base(S);
    const L = S.leagues[c.league];
    const wages = W.wageBill(S, S.user);
    const tv = C * 0.45;
    let spons = 0;
    for (const s of com.sponsors) spons += s.weekly + (result === 'V' ? s.winBonus : 0);
    const top = W.squad(S, S.user).reduce((m, p) => Math.max(m, p.ovr), 0);
    const merch = com.fans * com.merchPerFan * (1 + Math.max(0, top - c.rep) / 40) * (1 + fx(S, 'merch'));
    let tickets = 0;
    const m = round.find(m => m[0] === S.user);
    if (m) {
      const avgRep = U.sum(L.clubs, id => S.clubs[id].rep) / L.clubs.length;
      const opp = S.clubs[m[1]];
      let fill = 0.72 + (c.rep - avgRep) * 0.02 + (opp.rep - avgRep) * 0.015 + U.rand(-0.05, 0.05);
      fill += Math.log(com.fans / com.fans0) * 0.6 + fx(S, 'att') - (com.ticketMult - 1) * 0.45;
      fill = U.clamp(fill, 0.25, 1);
      if (com.closure > 0) { fill *= 0.5; com.closure--; }
      const att = Math.round(c.capacity * fill);
      tickets = Math.round(att * c.price * com.ticketMult);
      S.lastAttendance = att;
    }
    let loans = 0;
    for (const l of com.loans) {
      const pay = Math.min(l.weekly, l.balance);
      l.balance -= pay; l.weeksLeft--; loans += pay;
    }
    com.loans = com.loans.filter(l => l.balance > 0 && l.weeksLeft > 0);
    c.cash += tv + spons + merch + tickets - wages - loans;
    Object.assign(S.fin, {
      tv: (S.fin.tv || 0) + tv, sponsors: (S.fin.sponsors || 0) + spons, merch: (S.fin.merch || 0) + merch,
      tickets: (S.fin.tickets || 0) + tickets, wages: (S.fin.wages || 0) + wages, loans: (S.fin.loans || 0) + loans
    });
    // Afición
    let g = result === 'V' ? 0.0035 : result === 'E' ? 0.0005 : result === 'D' ? -0.0025 : 0;
    g += fx(S, 'fans');
    if (com.ticketMult > 1.3) g -= 0.001;
    com.fans = Math.max(Math.round(c.capacity * 0.5), Math.round(com.fans * (1 + g)));
    // Campañas y obras
    for (const k of com.campaigns) k.weeksLeft--;
    com.campaigns = com.campaigns.filter(k => k.weeksLeft > 0);
    if (com.expansion && --com.expansion.weeksLeft <= 0) {
      c.capacity += com.expansion.seats;
      TL.Game.mail(S, 'Ampliación terminada', `El estadio ya tiene ${U.num(c.capacity)} localidades.`, 'club');
      com.expansion = null;
    }
    // Patrocinadores de riesgo que quiebran
    for (const s of com.sponsors.slice()) {
      if (s.risk && Math.random() < s.risk / (S.fixtures.length || 38)) {
        TL.News.add(S, 'club', `${s.brand} deja de pagar a ${c.name}`, `La empresa (${SECTOR_NAME[s.sector].toLowerCase()}) entra en concurso de acreedores y rompe el contrato de patrocinio.`, S.user, null, 'neg');
        endSponsor(S, s, `${s.brand} ha quebrado y deja de pagar.`);
      }
    }
    // Deuda: la directiva se impacienta si el saldo es negativo
    if (c.cash < 0) S.board.conf = U.clamp(S.board.conf - 0.6 * TL.Manager.B(S).boardLoss, 0, 100);
    return { tv, spons, merch, tickets, wages, loans };
  }

  /** Cambios de temporada: caducan patrocinios y se generan ofertas. */
  function newSeason(S) {
    const com = init(S);
    for (const s of com.sponsors.slice()) {
      if (s.until <= S.season) endSponsor(S, s, `El contrato con ${s.brand} ha terminado.`);
    }
    for (const sl of Object.keys(SLOTS)) if (!sponsor(S, sl) && !com.offers[sl]) com.offers[sl] = offersFor(S, sl);
    com.campaigns = com.campaigns.filter(k => CAMPAIGNS.find(d => d.id === k.id).weeks !== 99);
    com.fans0 = Math.max(com.fans0, Math.round(com.fans * 0.9));
  }

  /** Ingresos semanales estimados (para la UI). */
  function estimate(S) {
    const com = init(S);
    const c = S.clubs[S.user];
    const C = base(S);
    const spons = U.sum(com.sponsors, s => s.weekly);
    const merch = com.fans * com.merchPerFan * (1 + fx(S, 'merch'));
    const tickets = c.capacity * 0.75 * c.price * com.ticketMult / 2;
    return { tv: C * 0.45, spons, merch, tickets, loans: U.sum(com.loans, l => l.weekly), wages: W.wageBill(S, S.user) };
  }

  TL.Commerce = {
    SLOTS, CAMPAIGNS, SECTOR_NAME, init, base, sponsor, signSponsor, endSponsor, offersFor, campaignCost, launch, fx,
    maxDebt, debt, loanRate, loanQuote, takeLoan, repayLoan, expansionOptions, expand, weekly, newSeason, estimate
  };
})();
