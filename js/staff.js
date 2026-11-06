/* TOUCHLINE — cuerpo técnico
 *
 * Fisioterapeuta, preparador físico, entrenador técnico, segundo entrenador,
 * entrenador de porteros, de juveniles y ojeador jefe. Cada uno tiene un nivel
 * (1-5 estrellas) y un sueldo semanal, y su efecto se nota de verdad: menos
 * lesiones y más cortas, mejor recuperación, más crecimiento de los jugadores,
 * mejor moral, mejores canteranos y mejores informes de ojeo.
 * Los veteranos que se retiran pueden entrar en el cuerpo técnico.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;

  const ROLES = {
    physio: { name: 'Fisioterapeuta', icon: '🩺', desc: lv => `Lesiones un ${lv * 5}% menos probables y un ${lv * 7}% más cortas; acelera las recuperaciones.` },
    fitness: { name: 'Preparador físico', icon: '🏃', desc: lv => `Los jugadores se cansan un ${Math.round(lv * 3.5)}% menos en los partidos y recuperan antes.` },
    coach: { name: 'Entrenador técnico', icon: '📈', desc: lv => `Los jugadores de hasta 27 años progresan un ${lv * 5}% más rápido.` },
    assistant: { name: 'Segundo entrenador', icon: '🗣️', desc: lv => `Mejor ambiente cada semana y charlas un ${lv * 6}% más eficaces.` },
    gk: { name: 'Entrenador de porteros', icon: '🧤', desc: lv => `Los porteros progresan un ${lv * 8}% más rápido.` },
    youth: { name: 'Entrenador de juveniles', icon: '🌱', desc: lv => `Los menores de 22 crecen un ${lv * 5}% más y los canteranos llegan con +${lv} de potencial.` },
    scout: { name: 'Ojeador jefe', icon: '🔭', desc: lv => `Más informes de promesas y potencial de otros jugadores más preciso (±${Math.max(0, 3 - Math.floor(lv / 2))}).` }
  };
  const NAMES_F = ['Elena', 'Carmen', 'Lucía', 'Marta', 'Sara', 'Ana', 'Inés', 'Julia', 'Nuria', 'Paula'];
  const NAMES_M = ['Javier', 'Andrés', 'Rubén', 'Óscar', 'Iván', 'Raúl', 'Miguel', 'Víctor', 'Jorge', 'Luis', 'Manuel', 'David'];
  const SURN = ['Sanz', 'Lozano', 'Cano', 'Prieto', 'Herrero', 'Pascual', 'Vega', 'Crespo', 'Morales', 'Guerrero', 'Rubio', 'Marín', 'Domínguez', 'Iglesias'];

  function state(S) { if (!S.staff) S.staff = []; return S.staff; }
  function of(S, role) { return state(S).find(s => s.role === role) || null; }
  function lv(S, role) { const s = of(S, role); return s ? s.q : 0; }

  /** Sueldo semanal según nivel y riqueza de la liga. */
  function wageFor(S, q) {
    const L = S.leagues[S.clubs[S.user].league];
    const base = [0, 2500, 5500, 10000, 17000, 27000][q] || 0;
    return F.roundMoney(base * (0.45 + L.wealth * 0.55) * (S.econ.wage || 1) * (S.gender === 'F' ? 0.18 : 1));
  }
  function weeklyCost(S) { return U.sum(state(S), s => s.wage || 0); }

  /** Candidatos disponibles: se renuevan cada 6 semanas y en cada verano. */
  function market(S) {
    const m = S.staffMarket;
    if (m && m.s === S.season && S.week - m.w < 6 && S.week >= m.w) return m.list;
    const rep = S.clubs[S.user].rep;
    const list = [];
    for (const role of Object.keys(ROLES)) {
      for (let k = 0; k < 3; k++) {
        // Los clubes grandes atraen mejores técnicos
        const top = U.clamp(Math.round((rep - 50) / 9), 1, 5);
        const q = U.clamp(top - U.int(0, 2) + (Math.random() < 0.15 ? 1 : 0), 1, 5);
        const fem = Math.random() < (S.gender === 'F' ? 0.6 : 0.3);
        const name = `${U.pick(fem ? NAMES_F : NAMES_M)} ${U.pick(SURN)}`;
        list.push({ id: role + k + '_' + S.season + '_' + S.week, role, q, name, wage: F.roundMoney(wageFor(S, q) * U.rand(0.85, 1.2)), age: U.int(31, 62) });
      }
    }
    S.staffMarket = { s: S.season, w: S.week, list };
    return list;
  }

  function hire(S, id) {
    const c = market(S).find(x => x.id === id);
    if (!c) return { ok: false, msg: 'Ese técnico ya no está disponible.' };
    const old = of(S, c.role);
    const comp = old ? (old.wage || 0) * 6 : 0;
    if (S.clubs[S.user].cash < comp) return { ok: false, msg: `No tienes saldo para pagar la indemnización de ${old.name}.` };
    if (old) { S.clubs[S.user].cash -= comp; S.staff = state(S).filter(s => s !== old); }
    state(S).push({ name: c.name, role: c.role, q: c.q, wage: c.wage, s: S.season });
    S.staffMarket.list = S.staffMarket.list.filter(x => x.id !== id);
    TL.News.add(S, 'club', `${S.clubs[S.user].name} incorpora a ${c.name}`, `Nuevo ${ROLES[c.role].name.toLowerCase()} del primer equipo.`, S.user, null, 'pos');
    return { ok: true, msg: `${c.name} se incorpora como ${ROLES[c.role].name.toLowerCase()}${comp ? ` · indemnización a ${old.name}: ${U.money(comp)}` : ''}.` };
  }

  function fire(S, role) {
    const s = of(S, role);
    if (!s) return { ok: false, msg: '' };
    const comp = (s.wage || 0) * 6;
    if (S.clubs[S.user].cash < comp) return { ok: false, msg: 'No tienes saldo para la indemnización.' };
    S.clubs[S.user].cash -= comp;
    S.staff = state(S).filter(x => x !== s);
    return { ok: true, msg: `${s.name} deja el club${comp ? ` (indemnización ${U.money(comp)})` : ''}.` };
  }

  /** Un exjugador del club entra en el cuerpo técnico (desde el vestuario). */
  function fromPlayer(S, p, role) {
    const q = U.clamp(2 + (TL.Locker && TL.Locker.hasTrait(S, p.id, 'leader') ? 1 : 0) + (p.ovr >= 80 ? 1 : 0), 1, 5);
    S.staff = state(S).filter(s => s.role !== role);
    state(S).push({ name: p.name, role, q, wage: F.roundMoney(wageFor(S, q) * 0.7), s: S.season, from: p.id });
    return q;
  }

  // ------------------------------------------------------------ Efectos
  /** Las habilidades del mánager y el cuerpo técnico se combinan en las mismas bonificaciones. */
  const origB = TL.Manager.B;
  TL.Manager.B = function (S) {
    const b = origB(S);
    if (!S || !S.staff || !S.staff.length) return b;
    const q = r => lv(S, r);
    b.injury *= 1 - 0.05 * q('physio');
    b.injDur *= 1 - 0.07 * q('physio');
    b.fatigue *= 1 - 0.035 * q('fitness');
    b.talk *= 1 + 0.06 * q('assistant');
    b.youthPot += q('youth');
    b.youthGrowth *= 1 + 0.05 * q('youth');
    return b;
  };
  TL.Manager.bonus = (S, clubId) => (clubId === S.user ? TL.Manager.B(S) : TL.Manager.NEUTRAL);

  /** Multiplicador de crecimiento para un jugador del usuario. */
  function growth(S, p) {
    let g = 1;
    if (p.age <= 27) g *= 1 + 0.05 * lv(S, 'coach');
    if (p.pos === 'GK') g *= 1 + 0.08 * lv(S, 'gk');
    if (p.age <= 21) g *= 1 + 0.05 * lv(S, 'youth');
    return g;
  }

  /** Cada semana: el segundo cuida el ambiente; el fisio acelera alguna recuperación. */
  function weekly(S) {
    const sq = TL.World.squad(S, S.user);
    const a = lv(S, 'assistant'), ph = lv(S, 'physio'), ft = lv(S, 'fitness');
    for (const p of sq) {
      if (a) p.mor = Math.min(100, (p.mor == null ? 70 : p.mor) + 0.12 * a);
      if (ph && p.inj > 1 && Math.random() < 0.07 * ph) p.inj--;
      if (ft && p.fit < 100) p.fit = Math.min(100, p.fit + ft);
    }
  }

  /** Precisión del ojeo: margen del potencial que ves de jugadores ajenos. */
  function scoutMargin(S) { return Math.max(0, 3 - Math.floor(lv(S, 'scout') / 2)); }

  /** Partidas antiguas: los técnicos que venían del vestuario pasan aquí. */
  function migrate(S) {
    state(S);
    if (S.lk && S.lk.staff && S.lk.staff.length) {
      for (const s of S.lk.staff) if (!of(S, s.role)) S.staff.push({ name: s.name, role: s.role, q: 3, wage: wageFor(S, 3) * 0.7, s: s.s, from: s.from });
      S.lk.staff = [];
    }
  }

  TL.Staff = { ROLES, state, of, lv, wageFor, weeklyCost, market, hire, fire, fromPlayer, growth, weekly, scoutMargin, migrate };
})();
