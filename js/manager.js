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
      { id: 'neg2', name: 'Imagen pública', max: 3, bloq: ['machista', 'facha'], desc: '+8% en ofertas de patrocinio y +10% de efecto del marketing por nivel.' },
      { id: 'neg3', name: 'Mano con la directiva', max: 3, desc: '+5% de presupuesto salarial y -0,5 puntos de interés en préstamos por nivel.' }
    ] },
    { id: 'pre', name: 'Medios', icon: '🎤', nodes: [
      { id: 'pre1', name: 'Don de gentes', max: 3, desc: 'En rueda de prensa tienes más cabeza y más tiempo para contestar, por nivel.' },
      { id: 'pre2', name: 'Portavoz', max: 1, desc: 'Puedes mandar al jefe de prensa a la rueda de prensa y saltártela sin consecuencias.' },
      { id: 'pre3', name: 'Rotación mediática', max: 3, desc: 'Los jugadores que te acompañan a la prensa se desgastan menos y se hartan más despacio de repetir, por nivel.' },
      { id: 'pre4', name: 'Mente fría', max: 3, desc: 'Repetir el mismo estilo de respuesta te agota menos y se te gasta más tarde, por nivel.' },
      { id: 'pre5', name: 'Discurso renovado', max: 2, desc: 'La prensa tarda más en cansarse de tus estilos de siempre entre una rueda de prensa y otra, por nivel.' }
    ] },
    { id: 'arb', name: 'Árbitros', icon: '⚖️', nodes: [
      { id: 'arb1', name: 'Ojo arbitral', max: 3, desc: 'Tu impresión de las decisiones del árbitro acierta más por nivel (nunca del todo).' },
      { id: 'arb2', name: 'Mano izquierda', max: 2, bloq: ['conspiranoico'], desc: 'Reclamar te cuesta menos tarjetas y el árbitro pierde la paciencia más despacio, por nivel.' }
    ] },
    { id: 'dis', name: 'Disciplina', icon: '🟨', nodes: [
      { id: 'dis1', name: 'Juego limpio', max: 3, desc: '-8% de tarjetas por nivel.' },
      { id: 'dis2', name: 'Código de conducta', max: 3, desc: '-15% de escándalos extradeportivos por nivel.' },
      { id: 'dis3', name: 'Gabinete de crisis', max: 3, desc: '-20% de impacto de las polémicas (multas, moral, afición) por nivel.' }
    ] },
    // Tu sello: habilidades que solo existen para quien eres de verdad (tu personalidad, ya con mote: js/persona.js).
    // Ninguna pide la anterior. Si cambias de personalidad, la que compraste se queda dormida hasta que vuelvas a serlo.
    { id: 'sel', name: 'Tu sello', icon: '🎭', free: true, nodes: [
      { id: 'se_show', name: 'Showman', max: 1, persona: ['gracioso', 'chulo', 'bocazas'], pista: 'Para quien convierte cada rueda de prensa en un monólogo.',
        desc: 'Las respuestas de humor y las ambiciosas te cansan la mitad en la sala, y tu muletilla se hace famosa el doble de rápido.' },
      { id: 'se_goma', name: 'Muro de goma', max: 1, persona: ['tibio', 'timido', 'pasota'], pista: 'Para quien no se moja ni bajo la lluvia.',
        desc: 'Las respuestas evasivas ya no enfadan a la sala: rebotan.' },
      { id: 'se_puno', name: 'Puño de hierro', max: 1, persona: ['despota', 'profesor'], pista: 'Para quien manda con la pizarra… o con el látigo.',
        desc: 'Las respuestas exigentes solo restan la mitad de moral al vestuario y a quien señalas.' },
      { id: 'se_familia', name: 'Familia', max: 1, persona: ['padre', 'pandillero', 'curante'], pista: 'Para quien trata al vestuario como a su casa.',
        desc: 'Tu acompañante en la prensa se desgasta la mitad y su comodín se puede usar dos veces.' },
      { id: 'se_aura', name: 'Aura de leyenda', max: 1, persona: ['leyenda'], pista: 'Para quien ya tiene sitio en la historia del club.',
        desc: 'Las derrotas restan la mitad de confianza a la directiva.' },
      { id: 'se_trinchera', name: 'Trinchera', max: 1, persona: ['lloron', 'conspiranoico', 'polemista'], pista: 'Para quien ve enemigos en cada esquina… y lo dice.',
        desc: 'Cuando reclamas al árbitro, la grada se viene arriba y empuja al equipo un rato.' },
      { id: 'se_causa', name: 'La causa', max: 1, persona: ['progre', 'comunista'], pista: 'Para quien lleva una pancarta en el bolsillo.',
        desc: 'Las preguntas de sociedad te suman el doble de afición y nunca calientan la sala.' },
      { id: 'se_encanto', name: 'Encanto', max: 1, persona: ['ligon'], pista: 'Para quien conquista hasta a los periodistas.',
        desc: 'Los titulares retorcidos se desinflan mucho más a menudo.' },
      { id: 'se_sincomplejos', name: 'Sin complejos', max: 1, persona: ['facha', 'machista'], pista: 'Para quien vive en otro siglo y presume de ello.',
        desc: 'Las respuestas polémicas y duras te ganan a los tuyos en la grada. A cambio, las marcas huyen: −15% en patrocinios.' }
    ] }
  ];
  const NODE = {};
  TREE.forEach(br => br.nodes.forEach((n, i) => { NODE[n.id] = { ...n, branch: br.id, tier: i, prev: i && !br.free ? br.nodes[i - 1].id : null }; }));

  function init(S) {
    if (!S.mgr) S.mgr = { xp: 0, level: 1, points: 2, skills: {}, total: 0 };
    return S.mgr;
  }

  const PE = () => TL.Persona;
  /** Nivel comprado, aunque ahora no funcione. */
  function raw(S, id) { return (S.mgr && S.mgr.skills[id]) || 0; }
  /** ¿Tu imagen pública te cierra esta puerta? (solo cuenta la personalidad que ya tiene mote) */
  function closed(S, id) { const n = NODE[id]; return !!(n && n.bloq && PE() && PE().is(S, n.bloq, 2)); }
  /** ¿Eres quien esta habilidad pide? (las de «Tu sello») */
  function fits(S, id) { const n = NODE[id]; return !n || !n.persona || !!(PE() && PE().is(S, n.persona, 2)); }
  /** Nivel que funciona: las de tu sello se duermen si dejas de ser así y las cerradas por tu imagen no rinden. */
  function lvl(S, id) {
    const l = raw(S, id);
    if (!l) return 0;
    const n = NODE[id];
    if (n && (n.persona || n.bloq) && (!fits(S, id) || closed(S, id))) return 0;
    return l;
  }
  function xpToNext(level) { return 100 + 25 * level; }

  function can(S, id) {
    const n = NODE[id], cur = lvl(S, id);
    if (!n) return { ok: false, reason: 'Habilidad desconocida' };
    if (raw(S, id) >= n.max) return { ok: false, reason: cur ? 'Nivel máximo' : n.persona ? 'Dormida: ya no eres así' : 'Con la imagen que tienes, esta puerta está cerrada', closed: !cur && !n.persona };
    if (n.persona && !fits(S, id)) return { ok: false, reason: raw(S, id) ? 'Dormida: ya no eres así' : '???', hidden: !raw(S, id) };
    if (closed(S, id)) return { ok: false, reason: 'Con la imagen que tienes, esta puerta está cerrada', closed: true };
    if (n.prev && lvl(S, n.prev) < 1) return { ok: false, reason: `Requiere ${NODE[n.prev].name}` };
    if (S.mgr.points < 1) return { ok: false, reason: 'Sin puntos de habilidad' };
    return { ok: true };
  }

  function buy(S, id) {
    const c = can(S, id);
    if (!c.ok) return c;
    S.mgr.skills[id] = raw(S, id) + 1;
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
      boardLoss: (1 - 0.1 * l('mot3')) * (l('se_aura') ? 0.5 : 1),
      fatigue: 1 - 0.1 * l('fis1'),
      injury: 1 - 0.15 * l('fis2'),
      injDur: 1 - 0.15 * l('fis3'),
      youthPot: 3 * l('can1'),
      youthGrowth: 1 + 0.12 * l('can2'),
      youthExtra: l('can3'),
      neg: 1 - 0.05 * l('neg1'),
      sponsor: (1 + 0.08 * l('neg2')) * (l('se_sincomplejos') ? 0.85 : 1),
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

  TL.Manager = { TREE, NODE, init, lvl, raw, fits, closed, can, buy, addXp, xpToNext, B, bonus, NEUTRAL };
})();
