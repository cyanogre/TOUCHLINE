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

  // Perfiles del mercado: la calidad se paga
  const PROFILES = {
    joven: { n: 'Joven promesa', d: 'Barato y con hambre. Mejora cada temporada.' },
    monton: { n: 'Del montón', d: 'Cumple sin hacer ruido.' },
    top: { n: 'Contrastado', d: 'Viene de hacerlo bien en otros clubes. No es barato.' },
    star: { n: 'Estrella', d: 'Uno de los mejores del país. Cobra como tal.' }
  };
  // Rasgos: dan carácter y un pequeño matiz a su trabajo
  const TRAITS = {
    obseso: { n: 'Obseso del trabajo', d: 'Rinde un poco más, pero el vestuario lo nota.', k: 1.1, mor: -0.04 },
    vieja: { n: 'Vieja escuela', d: 'Sabe lo que hace; cuesta que cambie.', k: 1, grow: 0.5 },
    innovador: { n: 'Innovador', d: 'Métodos nuevos: mejora rápido.', k: 1, grow: 2 },
    mediatico: { n: 'Mediático', d: 'Le encantan las cámaras. A la afición también.', k: 0.95, fans: true },
    leal: { n: 'Leal', d: 'Nunca se irá por dinero. Pide poco al renovar.', k: 1, loyal: true },
    conflictivo: { n: 'Conflictivo', d: 'Muy bueno… cuando no está discutiendo.', k: 1.15, mor: -0.08 },
    pupilo: { n: 'Tu pupilo', d: 'Le encanta aprender de ti.', k: 1, grow: 1.5 }
  };
  const QWORD = r => (r >= 88 ? 'Élite' : r >= 76 ? 'Muy bueno' : r >= 63 ? 'Bueno' : r >= 48 ? 'Correcto' : 'Flojo');
  const qOf = r => U.clamp(Math.round((r - 20) / 16), 1, 5);

  function state(S) { if (!S.staff) S.staff = []; return S.staff; }
  function of(S, role) { return state(S).find(s => s.role === role) || null; }
  /** Estrellas (1-5): lo que usan los demás módulos. */
  function lv(S, role) { const s = of(S, role); return s ? s.q : 0; }
  /** Nivel fino para los efectos: un 74 rinde más que un 61 aunque los dos sean 3★. */
  function lvF(S, role) { const s = of(S, role); return s ? ((s.r || s.q * 16 + 20) / 20) * ((TRAITS[s.tr] || {}).k || 1) : 0; }

  /** Sueldo semanal: crece exponencialmente con la valoración (un 90 cobra ~8 veces lo de un 50). */
  function wageFor(S, q, r, prof, age) {
    const L = S.leagues[S.clubs[S.user].league];
    r = r || q * 16 + 20;
    let w = 2600 * Math.pow(1.053, r - 50);
    if (prof === 'star') w *= 1.35;
    if (prof === 'joven') w *= 0.8;
    if (age && age >= 55) w *= 0.9;
    // A un club pequeño le cuesta más atraer a alguien por encima de su nivel
    const lvl = 35 + (S.clubs[S.user].rep - 40) * 0.9;
    if (r > lvl) w *= 1 + (r - lvl) * 0.012;
    return F.roundMoney(w * (0.45 + L.wealth * 0.55) * (S.econ.wage || 1) * (S.gender === 'F' ? 0.18 : 1));
  }
  function weeklyCost(S) { return U.sum(state(S), s => s.wage || 0); }

  function person(S, role, prof, r, age, id) {
    const fem = Math.random() < (S.gender === 'F' ? 0.6 : 0.3);
    const name = `${U.pick(fem ? NAMES_F : NAMES_M)} ${U.pick(SURN)}`;
    const tr = prof === 'joven' && Math.random() < 0.4 ? 'pupilo' : U.pick(Object.keys(TRAITS).filter(k => k !== 'pupilo'));
    r = U.clamp(Math.round(r), 20, 99);
    const wage = F.roundMoney(wageFor(S, 0, r, prof, age) * U.rand(0.9, 1.1));
    return { id, role, prof, r, q: qOf(r), name, age, tr, wage, yrs: prof === 'star' ? 3 : U.int(1, 3) };
  }
  /** Candidatos: por puesto, una promesa, uno del montón, uno contrastado y, a veces, una estrella. */
  function market(S) {
    const m = S.staffMarket;
    if (m && m.s === S.season && S.week - m.w < 6 && S.week >= m.w && m.v === 2) return m.list;
    const lvl = U.clamp(35 + (S.clubs[S.user].rep - 40) * 0.9, 30, 85);
    const list = [];
    for (const role of Object.keys(ROLES)) {
      const id = k => role + k + '_' + S.season + '_' + S.week;
      list.push(person(S, role, 'joven', lvl - 18 + U.rand(-6, 8), U.int(26, 33), id(0)));
      list.push(person(S, role, 'monton', lvl + U.rand(-6, 5), U.int(34, 60), id(1)));
      list.push(person(S, role, 'top', lvl + 10 + U.rand(0, 10), U.int(38, 62), id(2)));
      if (Math.random() < 0.45) list.push(person(S, role, 'star', Math.max(lvl + 22, 82) + U.rand(0, 8), U.int(42, 64), id(3)));
    }
    S.staffMarket = { s: S.season, w: S.week, v: 2, list };
    return list;
  }

  /** Contratar. mode: 'accept' lo que pide · 'haggle' regatear (puede ofenderse) · 'raise' pagar más y asegurarlo. */
  function hire(S, id, mode) {
    const c = market(S).find(x => x.id === id);
    if (!c) return { ok: false, msg: 'Ese técnico ya no está disponible.' };
    let wage = c.wage, note = '';
    if (mode === 'haggle') {
      const p = 0.55 + 0.08 * (TL.Manager ? TL.Manager.lvl(S, 'neg1') : 0) - (c.prof === 'star' ? 0.2 : 0);
      if (Math.random() < p) { wage = F.roundMoney(wage * U.rand(0.78, 0.9)); note = ' Ha aceptado rebajar su sueldo.'; }
      else if (Math.random() < 0.5) { S.staffMarket.list = S.staffMarket.list.filter(x => x.id !== id); return { ok: false, gone: true, msg: `${c.name} se siente ofendido por la oferta y se retira.` }; }
      else note = ' No ha cedido ni un euro.';
    }
    if (mode === 'raise') { wage = F.roundMoney(wage * 1.15); note = ' Llega encantado con el trato.'; }
    const old = of(S, c.role);
    const comp = old ? severance(old) : 0;
    if (S.clubs[S.user].cash < comp) return { ok: false, msg: `No tienes saldo para pagar la indemnización de ${old.name}.` };
    if (old) { S.clubs[S.user].cash -= comp; S.staff = state(S).filter(s => s !== old); }
    state(S).push({ name: c.name, role: c.role, q: c.q, r: c.r, tr: c.tr, prof: c.prof, age: c.age, wage, yrs: c.yrs, s: S.season, happy: mode === 'raise' ? 1 : 0 });
    S.staffMarket.list = S.staffMarket.list.filter(x => x.id !== id);
    TL.News.add(S, 'club', `${S.clubs[S.user].name} incorpora a ${c.name}`, `Nuevo ${ROLES[c.role].name.toLowerCase()} del primer equipo${c.prof === 'star' ? ': todo un golpe de efecto' : ''}.`, S.user, null, 'pos');
    if (c.prof === 'star' && TL.News.fx) TL.News.fx.fans(S, 0.004);
    (S.prensaFeed || (S.prensaFeed = [])).push({ kind: 'staff', week: S.week, season: S.season, name: c.name, role: c.role }); if (S.prensaFeed.length > 8) S.prensaFeed.shift();   // para la rueda de prensa
    return { ok: true, msg: `${c.name} se incorpora como ${ROLES[c.role].name.toLowerCase()} por ${U.money(wage)}/sem.${note}${comp ? ` Indemnización a ${old.name}: ${U.money(comp)}.` : ''}` };
  }
  /** Indemnización: lo que le queda de contrato (tope: 20 semanas). */
  const severance = s => Math.round((s.wage || 0) * Math.min(20, Math.max(6, (s.yrs || 1) * 10)));

  function fire(S, role) {
    const s = of(S, role);
    if (!s) return { ok: false, msg: '' };
    const comp = severance(s);
    if (S.clubs[S.user].cash < comp) return { ok: false, msg: 'No tienes saldo para la indemnización.' };
    S.clubs[S.user].cash -= comp;
    S.staff = state(S).filter(x => x !== s);
    return { ok: true, msg: `${s.name} deja el club${comp ? ` (indemnización ${U.money(comp)})` : ''}.` };
  }

  /** Un exjugador del club entra en el cuerpo técnico (desde el vestuario). */
  function fromPlayer(S, p, role) {
    const q = U.clamp(2 + (TL.Locker && TL.Locker.hasTrait(S, p.id, 'leader') ? 1 : 0) + (p.ovr >= 80 ? 1 : 0), 1, 5);
    const r = q * 16 + 20 + U.int(-3, 5);
    S.staff = state(S).filter(s => s.role !== role);
    state(S).push({ name: p.name, role, q, r, tr: 'leal', prof: 'monton', age: p.age, wage: F.roundMoney(wageFor(S, q, r) * 0.7), yrs: 2, s: S.season, from: p.id });
    return q;
  }

  /** Cada verano: envejecen, mejoran o bajan, acaban contratos (renovar o se van). Devuelve los avisos. */
  function newSeason(S) {
    const out = [];
    for (const s of state(S).slice()) {
      s.r = s.r || s.q * 16 + 20; s.age = (s.age || 45) + 1;
      const t = TRAITS[s.tr] || {};
      const d = (s.age <= 35 ? U.rand(1, 5) : s.age >= 58 ? U.rand(-4, 0) : U.rand(-1, 2.5)) * (t.grow || 1);
      s.r = U.clamp(Math.round(s.r + d), 20, 99); s.q = qOf(s.r);
      s.yrs = (s.yrs || 1) - 1;
      if (s.yrs <= 0) {
        // Renovación: pide según lo que vale ahora (el leal, poco)
        const ask = F.roundMoney(Math.max(s.wage, wageFor(S, s.q, s.r, s.prof, s.age)) * (t.loyal ? 1.03 : 1.12));
        if (S.clubs[S.user].cash > ask * 30 || t.loyal) { s.wage = ask; s.yrs = U.int(1, 3); out.push(`${s.name} renueva: ahora cobra ${U.money(ask)}/sem.`); }
        else { S.staff = state(S).filter(x => x !== s); out.push(`${s.name} acaba contrato y se marcha: no podías igualar lo que pide.`); }
      }
    }
    if (out.length && TL.Game) TL.Game.mail(S, 'Cuerpo técnico: fin de temporada', out.join('\n'), 'board');
    return out;
  }

  /** De vez en cuando, otro club intenta llevarse a tu técnico estrella: lo retienes pagando o se va. */
  function poach(S) {
    const best = state(S).filter(s => (s.r || 0) >= 78 && !(TRAITS[s.tr] || {}).loyal).sort((a, b) => b.r - a.r)[0];
    if (!best || Math.random() > 0.035) return null;
    const ask = F.roundMoney(best.wage * 1.3);
    if (S.clubs[S.user].cash > ask * 40 && Math.random() < 0.6) {
      best.wage = ask; best.yrs = Math.max(best.yrs || 1, 2);
      TL.News.add(S, 'club', `${S.clubs[S.user].name} blinda a ${best.name}`, `Otro club quería al ${ROLES[best.role].name.toLowerCase()}; se queda con mejor sueldo (${U.money(ask)}/sem).`, S.user, null, 'pos');
    } else {
      S.staff = state(S).filter(x => x !== best);
      TL.News.add(S, 'club', `${best.name} deja ${S.clubs[S.user].name}`, `Un club más poderoso se lleva a tu ${ROLES[best.role].name.toLowerCase()}. Tocará buscar sustituto.`, S.user, null, 'neg');
    }
    return best;
  }

  // ------------------------------------------------------------ Efectos
  /** Las habilidades del mánager y el cuerpo técnico se combinan en las mismas bonificaciones. */
  const origB = TL.Manager.B;
  TL.Manager.B = function (S) {
    const b = origB(S);
    if (!S || !S.staff || !S.staff.length) return b;
    const q = r => lvF(S, r);
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
    if (p.age <= 27) g *= 1 + 0.05 * lvF(S, 'coach');
    if (p.pos === 'GK') g *= 1 + 0.08 * lvF(S, 'gk');
    if (p.age <= 21) g *= 1 + 0.05 * lvF(S, 'youth');
    return g;
  }

  /** Cada semana: el segundo cuida el ambiente; el fisio acelera alguna recuperación. */
  function weekly(S) {
    const sq = TL.World.squad(S, S.user);
    const a = lvF(S, 'assistant'), ph = lvF(S, 'physio'), ft = lvF(S, 'fitness');
    const sour = U.sum(state(S), s => (TRAITS[s.tr] || {}).mor || 0);   // obsesos y conflictivos pesan en el vestuario
    for (const p of sq) {
      if (a || sour) p.mor = U.clamp((p.mor == null ? 70 : p.mor) + 0.12 * a + sour, 0, 100);
      if (ph && p.inj > 1 && Math.random() < 0.07 * ph) p.inj--;
      if (ft && p.fit < 100) p.fit = Math.min(100, p.fit + ft);
    }
  }

  /** Precisión del ojeo: margen del potencial que ves de jugadores ajenos. */
  function scoutMargin(S) { return Math.max(0, 3 - Math.floor(lv(S, 'scout') / 2)); }

  /** Partidas antiguas: los técnicos que venían del vestuario pasan aquí. */
  function migrate(S) {
    state(S);
    for (const s of S.staff) if (s.r == null) { s.r = s.q * 16 + 20; s.tr = s.tr || U.pick(['vieja', 'leal', 'obseso', 'innovador']); s.yrs = s.yrs || 1; s.age = s.age || U.int(38, 58); s.prof = s.prof || 'monton'; }
    if (S.lk && S.lk.staff && S.lk.staff.length) {
      for (const s of S.lk.staff) if (!of(S, s.role)) S.staff.push({ name: s.name, role: s.role, q: 3, r: 68, tr: 'leal', yrs: 1, wage: wageFor(S, 3) * 0.7, s: s.s, from: s.from });
      S.lk.staff = [];
    }
  }

  TL.Staff = { ROLES, PROFILES, TRAITS, QWORD, lvF, newSeason, poach, severance, state, of, lv, wageFor, weeklyCost, market, hire, fire, fromPlayer, growth, weekly, scoutMargin, migrate };
})();
