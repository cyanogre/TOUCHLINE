/* TOUCHLINE — perfil del mánager: experiencia, niveles y árbol de habilidades */
(function () {
  'use strict';
  const TL = window.TL;

  const TREE = [
    { id: 'tac', name: 'Táctica', icon: '🧠', nodes: [
      { id: 'tac1', name: 'Pizarra', max: 3, desc: '+1% de rendimiento del equipo por nivel.' },
      { id: 'tac2', name: 'Lectura del partido', max: 3, desc: 'La mentalidad rinde un 4% más por nivel y el equipo aprieta mejor cuando pierde.' },
      { id: 'tac3', name: 'Maestro táctico', max: 3, desc: '+1% de rendimiento por nivel contra rivales de más nivel.' }
    ] },
    { id: 'mot', name: 'Motivación', icon: '🔥', nodes: [
      { id: 'mot1', name: 'Charla de vestuario', max: 3, desc: 'Las charlas del descanso tienen un 35% más de efecto por nivel.' },
      { id: 'mot2', name: 'Gestión de egos', max: 3, desc: 'La moral cae un 15% menos y hay un 15% menos de conflictos por nivel.' },
      { id: 'mot3', name: 'Líder del vestuario', max: 3, desc: '+4 de moral base y la directiva pierde la paciencia un 10% más despacio por nivel.' }
    ] },
    { id: 'fis', name: 'Preparación física', icon: '💪', nodes: [
      { id: 'fis1', name: 'Pretemporada', max: 3, desc: '-10% de cansancio por partido por nivel.' },
      { id: 'fis2', name: 'Prevención', max: 3, desc: '-15% de probabilidad de lesión por nivel.' },
      { id: 'fis3', name: 'Fisioterapia', max: 3, desc: '-15% de duración de las lesiones por nivel.' }
    ] },
    { id: 'can', name: 'Cantera', icon: '🌱', nodes: [
      { id: 'can1', name: 'Ojeadores juveniles', max: 3, desc: '+3 de potencial en los canteranos por nivel.' },
      { id: 'can2', name: 'Desarrollo', max: 3, desc: '+12% de progresión de los jugadores de 23 años o menos por nivel.' },
      { id: 'can3', name: 'Academia de élite', max: 2, desc: '+1 canterano por temporada por nivel.' }
    ] },
    { id: 'neg', name: 'Negocios', icon: '💼', nodes: [
      { id: 'neg1', name: 'Negociador', max: 3, desc: '-5% en traspasos y en los salarios que piden los jugadores por nivel.' },
      { id: 'neg2', name: 'Imagen pública', max: 3, desc: '+8% en ofertas de patrocinio y +10% de efecto del marketing por nivel.' },
      { id: 'neg3', name: 'Mano con la directiva', max: 3, desc: '+5% de presupuesto salarial y -0,5 puntos de interés en préstamos por nivel.' }
    ] },
    { id: 'dis', name: 'Disciplina', icon: '🟨', nodes: [
      { id: 'dis1', name: 'Juego limpio', max: 3, desc: '-8% de tarjetas por nivel.' },
      { id: 'dis2', name: 'Código de conducta', max: 3, desc: '-15% de escándalos extradeportivos por nivel.' },
      { id: 'dis3', name: 'Gabinete de crisis', max: 3, desc: '-20% de impacto de las polémicas (multas, moral, afición) por nivel.' }
    ] }
  ];
  const NODE = {};
  TREE.forEach(br => br.nodes.forEach((n, i) => { NODE[n.id] = { ...n, branch: br.id, tier: i, prev: i ? br.nodes[i - 1].id : null }; }));

  function init(S) {
    if (!S.mgr) S.mgr = { xp: 0, level: 1, points: 2, skills: {}, total: 0 };
    return S.mgr;
  }

  function lvl(S, id) { return (S.mgr && S.mgr.skills[id]) || 0; }
  function xpToNext(level) { return 100 + 25 * level; }

  function can(S, id) {
    const n = NODE[id], cur = lvl(S, id);
    if (!n) return { ok: false, reason: 'Habilidad desconocida' };
    if (cur >= n.max) return { ok: false, reason: 'Nivel máximo' };
    if (n.prev && lvl(S, n.prev) < 1) return { ok: false, reason: `Requiere ${NODE[n.prev].name}` };
    if (S.mgr.points < 1) return { ok: false, reason: 'Sin puntos de habilidad' };
    return { ok: true };
  }

  function buy(S, id) {
    const c = can(S, id);
    if (!c.ok) return c;
    S.mgr.skills[id] = lvl(S, id) + 1;
    S.mgr.points--;
    return { ok: true, msg: `${NODE[id].name} nivel ${S.mgr.skills[id]}` };
  }

  /** Suma experiencia. Devuelve los niveles subidos. */
  function addXp(S, amount) {
    const m = init(S);
    m.xp += amount; m.total += amount;
    let ups = 0;
    while (m.xp >= xpToNext(m.level)) {
      m.xp -= xpToNext(m.level);
      m.level++; m.points++; ups++;
    }
    if (ups) S._levelUp = (S._levelUp || 0) + ups;
    if (ups && TL.Game) {
      TL.Game.mail(S, '¡Subes de nivel como mánager!',
        `Ahora eres nivel ${m.level}. Tienes ${m.points} punto${m.points > 1 ? 's' : ''} de habilidad para gastar en Club → Mánager.`, 'board');
    }
    return ups;
  }

  /** Bonificaciones derivadas de las habilidades (multiplicadores y sumandos). */
  function B(S) {
    const l = id => lvl(S, id);
    return {
      teamBoost: 1 + 0.01 * l('tac1'),
      mentBonus: 0.04 * l('tac2'),
      chase: 0.02 * l('tac2'),
      bigGame: 0.01 * l('tac3'),
      talk: 1 + 0.35 * l('mot1'),
      moraleDrop: 1 - 0.15 * l('mot2'),
      conflict: 1 - 0.15 * l('mot2'),
      moraleBase: 4 * l('mot3'),
      boardLoss: 1 - 0.1 * l('mot3'),
      fatigue: 1 - 0.1 * l('fis1'),
      injury: 1 - 0.15 * l('fis2'),
      injDur: 1 - 0.15 * l('fis3'),
      youthPot: 3 * l('can1'),
      youthGrowth: 1 + 0.12 * l('can2'),
      youthExtra: l('can3'),
      neg: 1 - 0.05 * l('neg1'),
      sponsor: 1 + 0.08 * l('neg2'),
      marketing: 1 + 0.1 * l('neg2'),
      wageBudget: 1 + 0.05 * l('neg3'),
      loanRate: -0.005 * l('neg3'),
      cards: 1 - 0.08 * l('dis1'),
      scandal: 1 - 0.15 * l('dis2'),
      crisis: 1 - 0.2 * l('dis3')
    };
  }

  const NEUTRAL = B({ mgr: { skills: {} } });
  /** Bonus para un club concreto: solo el del usuario tiene habilidades. */
  function bonus(S, clubId) { return clubId === S.user ? B(S) : NEUTRAL; }

  TL.Manager = { TREE, NODE, init, lvl, can, buy, addXp, xpToNext, B, bonus, NEUTRAL };
})();
