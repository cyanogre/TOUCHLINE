/* TOUCHLINE — la cantera: el filial de tu club
 *
 * - Los canteranos nuevos (generados al azar cada verano, no vienen de la base de datos) llegan
 *   al filial, no al primer equipo. El filial no juega tus partidos: para alinearlos, súbelos.
 * - Puedes subir y bajar jugadores entre el primer equipo y el filial. A los 23 años suben sí o sí.
 *   Si el primer equipo baja de 16 (o se queda sin portero), suben los mejores del filial.
 * - En el filial cobran muy poco (1K/sem) hasta que les renuevas: la renovación es un contrato normal.
 * - En el filial crecen como si estuvieran cedidos (juegan cada semana), pero solo hasta el 80 % de
 *   su potencial. Para pasar de ahí: primer equipo o cesión.
 * - Un jugador es del filial si p.res (se guarda en los bits de la partida). World.squad(S, S.user) no
 *   lo incluye; World.reserve(S) lo devuelve.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const W = () => TL.World;
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);

  const RES_WAGE = 1000;      // sueldo semanal del filial
  const CAP = 0.8;            // techo en el filial: 80 % del potencial
  const PROMOTE_AGE = 23;     // a esta edad suben obligatoriamente
  const DEMOTE_MAX_AGE = 22;  // se puede bajar al filial hasta los 22
  const MAX_RES = 26;         // plazas del filial
  const MIN_FIRST = 16;       // por debajo, suben del filial

  const on = S => !!(S && S.user != null && S.mode !== 'tour');
  const reserve = S => (on(S) ? W().reserve(S) : []);
  /** Hasta dónde puede crecer en el filial. */
  const capOf = p => Math.max(1, Math.floor(p.pot * CAP));
  const atCap = p => p.ovr >= capOf(p);

  /** Un canterano nuevo para el filial. */
  function makeYouth(S, opt) {
    const c = S.clubs[S.user];
    const yb = TL.Manager.bonus(S, S.user);
    const nats = W().squad(S, S.user).map(p => p.nat);
    const line = opt && opt.line != null ? opt.line : U.weighted([0, 1, 2, 3], l => [1, 3, 3, 2][l]);
    const pos = line === 0 ? 'GK' : U.pick(W().LINE_POS[line]);
    // Primero el techo y luego la media actual: así casi todos tienen margen para crecer en el filial
    const pot = U.clamp(Math.min(c.rep + 12, c.rep + U.int(-8, 10)) + yb.youthPot, 50, 93);
    const ovr = U.clamp(Math.round(pot * U.rand(0.58, 0.74)), 38, 70);
    const p = W().makePlayer(S, {
      club: S.user, nat: U.pick((nats.length ? nats : [0]).slice(0, 12)), pos, age: opt && opt.age ? opt.age : U.int(16, 18), ovr,
      pot, contract: S.season + 1 + U.int(2, 3)
    });
    p.res = true;
    p.wage = RES_WAGE;
    p.mor = U.int(66, 82);
    return p;
  }

  /** Canteranos del verano: cuantos menos haya en el filial, más llegan. */
  function intake(S) {
    if (!on(S)) return [];
    const n = reserve(S).length;
    const yb = TL.Manager.bonus(S, S.user);
    let k = (n < 8 ? 6 : n < 14 ? 4 : n < 20 ? 3 : n < MAX_RES ? 1 : 0) + (n < MAX_RES - 2 ? yb.youthExtra : 0);
    k = Math.min(k, MAX_RES - n);
    const out = [];
    for (let i = 0; i < k; i++) out.push(makeYouth(S).id);
    W().dirty(S);
    if (out.length) TL.Game.mail(S, gx(S, `Llegan ${out.length} canteranos al filial`, `Llegan ${out.length} canteranas al filial`), `${out.map(id => S.players[id].short).join(', ')} se incorporan al filial. Cobran ${U.money(RES_WAGE)}/sem. ` +
      gx(S, 'Allí crecen hasta el 80 % de su potencial; para llegar más arriba, súbelos al primer equipo o cédelos.', 'Allí crecen hasta el 80 % de su potencial; para llegar más arriba, súbelas al primer equipo o cédelas.'), 'club');
    return out;
  }

  /** Partida nueva (o de antes de la cantera): un filial para empezar. */
  function start(S) {
    if (!on(S)) return;
    S.ac = S.ac || {};
    if (S.ac.started) return;
    S.ac.started = 1;
    for (const line of [0, 1, 1, 1, 2, 2, 2, 3, 3, 1, 2, 3]) makeYouth(S, { line, age: U.int(16, 20) });
    W().dirty(S);
  }

  /** Fin de temporada (ya con un año más): los de 23 suben al primer equipo. */
  function promoteAged(S) {
    if (!on(S)) return [];
    const up = reserve(S).filter(p => p.age >= PROMOTE_AGE);
    for (const p of up) p.res = false;
    if (up.length) {
      W().dirty(S);
      const many = up.length > 1;
      TL.Game.mail(S, 'Del filial al primer equipo', `${up.map(p => p.short).join(', ')} ${many ? 'cumplen' : 'cumple'} ${PROMOTE_AGE} años y ${many ? 'suben' : 'sube'} al primer equipo. ` +
        (many ? gx(S, 'Si no entran en tus planes, véndelos o cédelos.', 'Si no entran en tus planes, véndelas o cédelas.') : gx(S, 'Si no entra en tus planes, véndelo o cédelo.', 'Si no entra en tus planes, véndela o cédela.')), 'club');
    }
    return up;
  }

  /** Del filial al primer equipo. */
  function promote(S, p) {
    if (!p || !p.res || p.club !== S.user) return { ok: false, msg: 'No está en el filial.' };
    if (W().squad(S, S.user).length >= TL.Market.MAX_SQUAD) return { ok: false, msg: `El primer equipo está lleno (${TL.Market.MAX_SQUAD}). Baja, vende o cede a alguien antes.` };
    p.res = false;
    W().dirty(S);
    p.mor = U.clamp((p.mor == null ? 70 : p.mor) + 8, 0, 100);
    return { ok: true, msg: `${p.short} sube al primer equipo.` };
  }
  /**
   * Si el primer equipo se queda corto (menos de 16, o sin portero), suben los mejores del filial.
   * Pasa sobre todo en verano, cuando se van los que acaban contrato.
   */
  function fillFirst(S) {
    if (!on(S)) return [];
    const sq = W().squad(S, S.user);
    const pool = reserve(S).slice().sort((a, b) => b.ovr - a.ovr);
    const up = [];
    const noGk = !sq.some(p => p.pos === 'GK');
    if (noGk) { const gk = pool.find(p => p.pos === 'GK'); if (gk) up.push(gk); }
    for (const p of pool) { if (sq.length + up.length >= MIN_FIRST) break; if (!up.includes(p)) up.push(p); }
    if (!up.length) return up;
    for (const p of up) p.res = false;
    W().dirty(S);
    const many = up.length > 1;
    const why = sq.length < MIN_FIRST ? `Te quedaban menos de ${MIN_FIRST} jugadores.` : gx(S, 'No te quedaba ningún portero.', 'No te quedaba ninguna portera.');
    TL.Game.mail(S, 'Suben del filial por falta de efectivos', `${up.map(p => p.short).join(', ')} ${many ? 'suben' : 'sube'} del filial al primer equipo. ${why} ` +
      gx(S, 'Si fichas, puedes volver a bajar a los menores de 23.', 'Si fichas, puedes volver a bajar a las menores de 23.'), 'club');
    return up;
  }

  /** Del primer equipo al filial (hasta los 22). */
  function demote(S, p) {
    if (!p || p.res || p.club !== S.user) return { ok: false, msg: 'No está en el primer equipo.' };
    if (p.age > DEMOTE_MAX_AGE) return { ok: false, msg: `Solo pueden bajar al filial los menores de ${DEMOTE_MAX_AGE + 1} años.` };
    if (reserve(S).length >= MAX_RES) return { ok: false, msg: `El filial está lleno (${MAX_RES}).` };
    if (W().squad(S, S.user).length <= MIN_FIRST) return { ok: false, msg: 'Te quedarías sin jugadores en el primer equipo.' };
    p.res = true;
    S.tactics.slots = (S.tactics.slots || []).map(id => (id === p.id ? -1 : id));
    W().dirty(S);
    p.mor = U.clamp((p.mor == null ? 70 : p.mor) - 6, 0, 100);
    return { ok: true, msg: `${p.short} baja al filial.` };
  }
  const canDemote = (S, p) => !p.res && p.club === S.user && p.age <= DEMOTE_MAX_AGE;

  /**
   * Crecimiento semanal en el filial: como un cedido que juega cada semana, con techo en el 80 %.
   * (Lo llama Locker.growWeek; devuelve lo ganado.)
   */
  function grow(S, p, ageF, morF, growth, youthSkill) {
    const room = Math.max(0, capOf(p) - p.ovr);
    return room * 0.016 * ageF * 0.95 * morF * growth * youthSkill;
  }

  TL.Academy = { RES_WAGE, CAP, PROMOTE_AGE, DEMOTE_MAX_AGE, MAX_RES, on, reserve, capOf, atCap, makeYouth, intake, start, promoteAged, fillFirst, MIN_FIRST, promote, demote, canDemote, grow };
})();
