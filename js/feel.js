/* TOUCHLINE — sensaciones: lo que ve un míster, sin los números del motor.
 *
 * La forma física, la confianza de la directiva, el encaje en un puesto, el peso en el vestuario o el
 * techo de un chaval no son cifras exactas para quien entrena: son impresiones. Aquí se traducen a
 * palabras, flechas y horquillas. Los números siguen en el motor; este módulo solo decide qué se enseña.
 *
 * Regla de la casa: se enseña lo que se puede ver o medir desde el banquillo (resultados, goles,
 * posesión, dinero, contratos, edades, medias) y se cuenta con palabras lo que solo se intuye.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, F } = TL;
  const gx = (S, m, f) => (S && S.gender === 'F' ? f : m);
  const pick = (table, v) => table.find(r => v >= r[0]) || table[table.length - 1];

  // ------------------------------------------------------------ Forma física y energía en el partido
  const FIT = [[90, 'Fresco', 'Fresca', 'ok'], [80, 'En forma', 'En forma', 'ok'], [70, 'Algo cansado', 'Algo cansada', 'mid'],
    [58, 'Cansado', 'Cansada', 'low'], [0, 'Fundido', 'Fundida', 'low']];
  /** { word, cls } de una forma física (o una energía) de 0 a 100. */
  function fit(S, v) { const r = pick(FIT, v == null ? 100 : v); return { word: gx(S, r[1], r[2]), cls: r[3] }; }
  /** ¿Conviene darle descanso? (el umbral que antes se enseñaba como «75 %»). */
  const tired = v => v < 75;

  // ------------------------------------------------------------ Encaje en un puesto (0 a 1)
  const POSFIT = [[0.99, 'Su puesto', 'Su puesto', 'ok'], [0.94, 'Lo conoce bien', 'Lo conoce bien', 'ok'], [0.84, 'Se adapta', 'Se adapta', 'mid'],
    [0.7, 'Fuera de sitio', 'Fuera de sitio', 'low'], [0, 'Perdido ahí', 'Perdida ahí', 'low']];
  function posFit(S, v) { const r = pick(POSFIT, v); return { word: gx(S, r[1], r[2]), cls: r[3] }; }

  // ------------------------------------------------------------ Confianza de la directiva (0 a 100)
  const BOARD = [[80, 'Total', 'ok'], [62, 'Alta', 'ok'], [45, 'Estable', 'mid'], [30, 'En duda', 'mid'], [15, 'Pende de un hilo', 'low'], [0, 'Crítica', 'low']];
  function board(v) { const r = pick(BOARD, v); return { word: r[1], cls: r[2] }; }
  /** Cómo se ha movido la confianza en una temporada. */
  function boardTrend(d) { return d >= 8 ? 'ha subido mucho' : d >= 2 ? 'ha subido' : d > -2 ? 'sigue igual' : d > -8 ? 'ha bajado' : 'ha caído en picado'; }

  // ------------------------------------------------------------ Peso en el vestuario (0 a 100)
  const WEIGHT = [[70, 'Manda en el vestuario'], [50, 'Mucho peso'], [30, 'Tiene voz'], [0, 'Poco peso']];
  function weight(v) { return pick(WEIGHT, v)[1]; }

  // ------------------------------------------------------------ Flechas: cuánto sube o baja algo, sin decir cuánto
  /** Nivel −2…2 de un cambio: `big` es a partir de dónde se considera grande. */
  function level(d, big) { return !d ? 0 : (d > 0 ? 1 : -1) * (Math.abs(d) >= big ? 2 : 1); }
  const ARROW = { 2: '▲▲', 1: '▲', 0: '=', '-1': '▼', '-2': '▼▼' };
  function arrows(lv) { return ARROW[U.clamp(Math.round(lv), -2, 2)]; }

  // ------------------------------------------------------------ Potencial: una horquilla, no una cifra
  /** Cuánto se equivoca el cuerpo técnico al calcular el techo de un jugador (0 = lo tienen claro). */
  function potMargin(S, p) {
    if (!p || p.pot <= p.ovr || p.age >= 27) return 0;
    if (TL.Events && TL.Events.isLB && S.ev && TL.Events.isLB(S, p.id)) return 0;   // el límite roto lo vio todo el mundo
    const loan = TL.Locker && TL.Locker.loanOf ? TL.Locker.loanOf(S, p.id) : null;
    const mine = p.club === S.user || (loan && loan.from === S.user);
    let m = p.age <= 18 ? 5 : p.age <= 20 ? 4 : p.age <= 22 ? 3 : 2;
    const lv = r => (TL.Staff ? TL.Staff.lv(S, r) : 0);
    // A los tuyos los ves entrenar cada día: el técnico de juveniles afina. A los de fuera, el ojeador.
    m -= mine ? 1 + Math.floor(lv('youth') / 2) : Math.floor(lv('scout') / 2) - 1;
    return U.clamp(m, 1, 6);
  }
  /** { lo, hi, mid, exact, txt }: lo que el cuerpo técnico cree que puede llegar a ser. */
  function potential(S, p) {
    const m = potMargin(S, p);
    if (!m) { const v = Math.max(p.ovr, p.pot); return { lo: v, hi: v, mid: v, exact: true, txt: String(v) }; }
    // El error es fijo para cada jugador (no baila de una visita a otra) y no siempre va centrado
    const r = F.seeded('pot:' + p.name + ':' + p.nat + ':' + p.pos);
    const below = Math.round(r * 2 * m);
    const lo = Math.max(p.ovr, p.pot - below), hi = Math.min(95, Math.max(lo + 1, p.pot + (2 * m - below)));
    return { lo, hi, mid: Math.round((lo + hi) / 2), exact: false, txt: `${lo}–${hi}` };
  }
  /** En el filial: cuánto le queda antes de tocar el tope de crecer allí. */
  function reserveRoom(S, p) {
    const A = TL.Academy;
    if (!A) return { word: '', cls: '' };
    const room = A.capOf(p) - p.ovr;
    return room <= 0 ? { word: gx(S, 'Ya no crece aquí', 'Ya no crece aquí'), cls: 'low' } : room <= 3 ? { word: 'Cerca de su tope aquí', cls: 'mid' } : { word: 'Le queda margen aquí', cls: 'ok' };
  }

  // ------------------------------------------------------------ Subidón o bajón de confianza
  function confLine(S, c) {
    if (!c) return '';
    const up = c.mult > 1, big = Math.abs(c.mult - 1) >= 0.045;
    if (up) return big ? gx(S, 'Está que se sale: se le va a notar en el campo.', 'Está que se sale: se le va a notar en el campo.') : 'Con confianza: llega con un punto más.';
    return big ? gx(S, 'Está tocado: lo va a acusar en el campo.', 'Está tocada: lo va a acusar en el campo.') : 'Con dudas: llega con un punto menos.';
  }
  /** «unas jornadas», «la próxima jornada»… */
  function forWeeks(n) { return n <= 1 ? 'la próxima jornada' : n <= 3 ? 'unas jornadas' : 'bastantes jornadas'; }

  // ------------------------------------------------------------ Recuerdos (lo que lleva dentro)
  /** Cuánto pesa un recuerdo y cuánto le queda, sin puntos ni semanas exactas. */
  function memory(v, weeks) {
    return { arrows: arrows(level(v, 6)), fade: weeks <= 1 ? 'se le está pasando' : weeks <= 3 ? 'aún le dura' : 'le va a durar' };
  }

  // ------------------------------------------------------------ Moral, en su género
  const MOR_F = { 'Eufórico': 'Eufórica', 'Contento': 'Contenta', 'Descontento': 'Descontenta', 'Muy molesto': 'Muy molesta' };
  /** [palabra, emoji] de una moral, en masculino o femenino. */
  function morale(S, m) {
    const [w, e] = TL.News.moraleLabel(m);
    return [S && S.gender === 'F' && MOR_F[w] ? MOR_F[w] : w, e];
  }

  // ------------------------------------------------------------ Efectos de rasgos, almas y objetos
  /** Nivel −2…2 de un efecto del motor (multiplicador o suma), para enseñarlo con flechas. */
  function effLevel(k, v) {
    if (typeof v === 'boolean') return 0;
    if (k === 'mid' || k === 'att' || k === 'def') return level(v, 0.6);
    if (k === 'save') return level(1 - v, 0.12);
    const d = v - 1;
    const lv = level(d, k === 'team' ? 0.007 : k === 'conv' ? 0.08 : 0.4);
    return k === 'foul' || k === 'card' ? -lv : lv;
  }

  TL.Feel = { fit, tired, posFit, board, boardTrend, weight, level, arrows, potMargin, potential, reserveRoom, confLine, forWeeks, memory, morale, effLevel };
})();
