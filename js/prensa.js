/* TOUCHLINE — rueda de prensa tras el partido (minijuego).
 *
 * La sala (assets/prensa/sala.webp) con tres puntitos sentados: el jefe de prensa, tú y el mejor del partido
 * (o el capitán). La mesa (assets/prensa/mesa.webp) va delante y les tapa la mitad. En la pantalla pasan
 * anuncios y la pared de cuadros se anima con los colores del club.
 *
 * Las preguntas salen de lo que ha pasado de verdad: el resultado y cómo llegó (remontada, gol al final, goleada),
 * tus reclamaciones al árbitro (si tenías razón, si te ganaste una tarjeta), la polémica que no reclamaste, los
 * cambios (el suplente que marcó, el banquillo que no moviste), el cambio de sistema, penaltis fallados, goles en
 * propia, ocasiones falladas, expulsiones, lesiones, la grada, el rayo… y lo que has hecho en el club estas
 * semanas (fichajes, ventas, técnicos, patrocinios, campañas).
 *
 * Minijuego: cinco preguntas; cada respuesta es buena, regular o mala según lo que ha pasado (no se ve antes).
 * Hay que encadenar TRES buenas seguidas: si lo consigues, rueda de prensa redonda; si no, la sala se te va de las
 * manos. Las mejores respuestas dependen de tus habilidades de entrenador: sin ellas solo tienes las flojas (las
 * bloqueadas se ven, en gris, con lo que piden). «Don de gentes» perdona respuestas regulares y «Portavoz» te deja
 * mandar al jefe de prensa y saltártela sin consecuencias. */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, World: W, Game: G, UI } = TL;
  const esc = U.esc;
  const A = UI.actions;
  const MEDIA = ['Diario Deportivo', 'Radio Estadio', 'La Grada TV', 'El Balcón', 'Onda Fútbol', 'Mundo Gol', 'Pizarra FM', 'Al Larguero Digital'];
  const REPORTERS = ['Marta Ibarra', 'Luis Cardoso', 'Nerea Sanz', 'Pablo Ferrán', 'Lucía Mendo', 'Óscar Rial', 'Irene Valdés', 'Hugo Ledesma', 'Carla Brun', 'Dani Oteo'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const NEED_STREAK = 3, N_QUESTIONS = 5;
  const lv = (S, id) => (TL.Manager ? TL.Manager.lvl(S, id) : 0);
  const skillName = id => (TL.Manager && TL.Manager.NODE[id] ? TL.Manager.NODE[id].name : id);

  // ------------------------------------------------------------ Lo que ha pasado
  function context(S, m, me) {
    const opp = 1 - me, oc = S.clubs[m.teams[opp].club];
    const gf = m.score[me], ga = m.score[opp], diff = gf - ga;
    const evs = m.events || [];
    const mine = e => e.team === me;
    const P = id => S.players[id];
    const reds = evs.filter(e => e.type === 'red' && mine(e)).map(e => e.pid).filter(p => p != null && P(p));
    const refMine = evs.filter(e => (e.type === 'refmiss' && mine(e)) || (e.type === 'pen' && !mine(e) && e.team >= 0) || (e.type === 'disallowed' && mine(e)));
    const protests = m.protests || [];
    const crowd = evs.find(e => e.type === 'crowd') || null;
    const inj = evs.filter(e => e.type === 'inj' && mine(e) && !e.bolt).map(e => e.pid).filter(p => p != null && P(p));
    const notes = m.lastRatings || {};
    let star = null, best = 7.4;
    for (const id in notes) if (m.pl[id] && m.pl[id].team === me && notes[id] > best) { best = notes[id]; star = +id; }
    // Goles en orden: remontada, gol decisivo o encajado al final, doblete/hat-trick, gol en propia
    let run = 0, worst = 0, lateWin = null, lateLost = false, og = null;
    const byP = {};
    for (const e of evs) if (e.type === 'goal') {
      run += e.team === me ? 1 : -1; worst = Math.min(worst, run);
      if (e.team === me && e.pid != null && !e.og) byP[e.pid] = (byP[e.pid] || 0) + 1;
      if (e.team !== me && e.og && e.pid != null && P(e.pid)) og = e.pid;
      if (e.min >= 85) { if (e.team === me && run === 1) lateWin = e.pid; if (e.team !== me && run <= 0) lateLost = true; }
    }
    let hat = null; for (const id in byP) if (byP[id] >= 2 && (!hat || byP[id] > byP[hat])) hat = +id;
    const subs = evs.filter(e => e.type === 'sub' && mine(e));
    const subScorer = subs.map(e => e.pid).find(pid => byP[pid]) || null;
    const noSubs = !subs.length && diff < 0;
    const tactic = evs.some(e => e.type === 'tactic' && mine(e));
    const penMiss = evs.filter(e => e.type === 'penmiss' && mine(e)).map(e => e.pid).find(p => p != null && P(p)) || null;
    const bigMiss = evs.filter(e => e.type === 'miss' && mine(e) && (e.xgv || 0) >= 0.3).length;
    const bolt = m.bolt && m.bolt.team === me && P(m.bolt.pid) ? m.bolt.pid : null;
    let kid = null;
    for (const id in notes) { const p = P(id); if (m.pl[id] && m.pl[id].team === me && p && p.age <= 21 && notes[id] >= 7 && +id !== star) { kid = +id; break; } }
    let guest = star;
    if (guest == null) { const pl = Object.keys(m.pl).map(Number).filter(id => m.pl[id].team === me && P(id)); guest = pl.sort((a, b) => (P(b).ovr || 0) - (P(a).ovr || 0))[0]; }
    let next = null;
    try { const fx = TL.Season.nextFixture(S); if (fx) next = S.clubs[fx[0] === S.user ? fx[1] : fx[0]]; } catch (e) { next = null; }
    // Lo que has hecho en el club estas semanas (solo lo reciente y que aún no se te ha preguntado)
    const feed = {};
    for (const f of (S.prensaFeed || []).slice().reverse()) {
      if (f.asked || f.season !== S.season || S.week - f.week > 3 || feed[f.kind]) continue;
      if ((f.kind === 'signing' || f.kind === 'sale') && !P(f.pid)) continue;
      feed[f.kind] = f;
    }
    return { S, m, me, opp: oc, gf, ga, diff, reds, refMine, protests, crowd, inj, star, hat, hatN: hat != null ? byP[hat] : 0, comeback: diff > 0 && worst <= -1,
      lateWin, lateLost, og, subs, subScorer, noSubs, tactic, penMiss, bigMiss, bolt, kid, guest, next, feed, clean: ga === 0, coachRed: !!m.coachOff, cup: !!m.cup };
  }

  // ------------------------------------------------------------ Preguntas
  // Opción: { t, g: 2 buena · 1 regular · 0 mala, need: [habilidad, nivel], fx: { team, pl: [pid, d], board, fans, fine: [p, €], rival, rivalClub } }
  const name = (c, id) => c.S.players[id].short;
  const QS = [
    { id: 'win', w: c => (c.diff > 0 ? 3 : 0), q: c => `Victoria ante el ${c.opp.name}. ¿Qué valoración hace?`, o: c => [
      { t: 'Todo el mérito es de los jugadores. Se han vaciado.', g: 2, fx: { team: 1.5 } },
      { t: 'Contento, pero aún tenemos mucho que mejorar.', g: 1, fx: { board: 0.5 } },
      { t: 'Hoy hemos sido claramente superiores. No había color.', g: c.diff >= 3 ? 1 : 0, fx: { fans: 0.004, rival: 1, rivalClub: c.opp } },
      { t: 'Ganar así, con este grupo, me hace sentir orgulloso. Y vamos a por más.', g: 2, need: ['mot1', 2], fx: { team: 2.5, fans: 0.004 } }] },
    { id: 'draw', w: c => (c.diff === 0 ? 3 : 0), q: c => `Empate ante el ${c.opp.name}. ¿Sabe a poco?`, o: c => [
      { t: 'El equipo ha competido. Es un punto que hay que valorar.', g: 2, fx: { team: 1 } },
      { t: 'Sí, hemos dejado escapar dos puntos.', g: 1, fx: { board: 0.3 } },
      { t: 'El árbitro nos ha quitado la victoria.', g: c.refMine.length ? 1 : 0, fx: { fine: [0.35, 5000], fans: 0.003 } },
      { t: 'Sabe a poco por cómo hemos jugado, y eso es buena noticia: el camino es este.', g: 2, need: ['tac2', 1], fx: { team: 1.5, board: 0.8 } }] },
    { id: 'loss', w: c => (c.diff < 0 && c.diff > -3 ? 3 : 0), q: c => `Derrota ${c.ga}-${c.gf}. ¿Qué ha fallado?`, o: () => [
      { t: 'La responsabilidad es mía. Los jugadores lo han dado todo.', g: 2, fx: { team: 1.5, board: -0.3 } },
      { t: 'Algunos no han estado a la altura y lo hablaremos dentro.', g: 0, fx: { team: -3 } },
      { t: 'Hoy no ha salido nada. Toca levantarse.', g: 1, fx: { team: 0.5 } },
      { t: 'Hemos fallado en los detalles. Ya sé qué corregir y lo vamos a trabajar esta semana.', g: 2, need: ['tac1', 2], fx: { team: 1, board: 1 } }] },
    { id: 'thrash', w: c => (c.diff <= -3 ? 4 : 0), q: c => `${c.ga}-${c.gf}. ¿Ha sido el peor día desde que está aquí?`, o: () => [
      { t: 'Sí. Pido perdón a la afición. Daremos la cara.', g: 2, fx: { fans: 0.003, team: 0.5 } },
      { t: 'Hay jugadores que tendrán que demostrar que merecen esta camiseta.', g: 0, fx: { team: -3.5, board: 0.5 } },
      { t: 'Es un mal día. No voy a dramatizar.', g: 0, fx: { board: -1 } },
      { t: 'Esto duele, y tiene que doler. Mañana a primera hora estaremos trabajando.', g: 2, need: ['mot3', 1], fx: { team: 1.5, board: 1, fans: 0.003 } }] },

    // --- Tus reclamaciones al árbitro (con lo que pasó de verdad)
    { id: 'protest', w: c => (c.protests.length && !c.coachRed ? 3.2 : 0), q: c => `Le vimos muy encendido en la banda${c.protests.some(p => p.card) ? ', hasta ver una amarilla' : ''}. ¿Por qué?`, o: c => {
      const right = c.protests.some(p => p.right), wrong = c.protests.some(p => !p.right);
      return [
        { t: 'Las repeticiones me dan la razón. Defiendo lo que es justo.', g: right && !wrong ? 2 : 0, fx: right && !wrong ? { fans: 0.004 } : { fine: [0.35, 4000], board: -0.5 } },
        { t: 'Me he dejado llevar. No es el ejemplo que quiero dar.', g: wrong ? 2 : 1, fx: { board: 0.8 } },
        { t: 'El fútbol es pasión. No voy a cambiar.', g: 0, fx: { fans: 0.003, board: -0.8 } },
        { t: 'Hablé con el cuarto árbitro con respeto. Discrepar no es faltar.', g: 2, need: ['arb2', 1], fx: { board: 0.6, team: 0.5 } }];
    } },
    { id: 'coachRed', w: c => (c.coachRed ? 5 : 0), q: () => '¿Por qué ha terminado el partido en la grada?', o: () => [
      { t: 'Me he equivocado y pido disculpas.', g: 2, fx: { board: 1 } },
      { t: 'Defenderé a mi equipo siempre, cueste lo que cueste.', g: 0, fx: { fans: 0.005, fine: [0.5, 5000], board: -1 } },
      { t: 'No tengo nada que decir sobre eso.', g: 1, fx: {} },
      { t: 'Me equivoqué yo, no el equipo. Hablaré con el árbitro para aclararlo.', g: 2, need: ['dis3', 1], fx: { board: 1.5, team: 0.5 } }] },
    { id: 'refNoProtest', w: c => (c.refMine.length && !c.protests.length ? 2.6 : 0), q: () => 'Hubo una decisión polémica en su contra y no le vimos protestar. ¿Por qué?', o: () => [
      { t: 'Prefiero no hablar del árbitro.', g: 1, fx: { board: 0.3 } },
      { t: 'Nos han perjudicado claramente. Así no se puede.', g: 0, fx: { fans: 0.006, fine: [0.45, 6000], board: -0.5 } },
      { t: 'Los árbitros también fallan. Mi energía, en mi equipo.', g: 2, fx: { board: 0.8, team: 0.5 } },
      { t: 'Lo veré con calma y, si hay algo que decir, lo diremos por los cauces del club.', g: 2, need: ['dis3', 2], fx: { board: 1.2 } }] },

    // --- Lo que salió mal
    { id: 'lateLost', w: c => (c.lateLost ? 3 : 0), q: () => 'Encajaron al final. ¿Falta de concentración?', o: () => [
      { t: 'Es culpa mía: no supe cerrar el partido desde el banquillo.', g: 2, fx: { team: 1, board: -0.3 } },
      { t: 'Hay jugadores que se han desconectado.', g: 0, fx: { team: -2 } },
      { t: 'El fútbol es así. A veces pasa.', g: 1, fx: {} },
      { t: 'Nos faltó oficio en los últimos minutos. Se entrena, y lo vamos a entrenar.', g: 2, need: ['tac2', 2], fx: { team: 1, board: 0.8 } }] },
    { id: 'penMiss', w: c => (c.penMiss != null ? 3 : 0), q: c => `${name(c, c.penMiss)} falló el penalti. ¿Seguirá tirándolos?`, o: c => [
      { t: 'Sí. Solo falla el que se atreve a tirarlo.', g: 2, fx: { pl: [c.penMiss, 3] } },
      { t: 'Lo revisaremos. Hay más lanzadores.', g: 1, fx: { pl: [c.penMiss, -2] } },
      { t: 'No se puede fallar un penalti así en un partido así.', g: 0, fx: { pl: [c.penMiss, -5], team: -0.5 } },
      { t: `${name(c, c.penMiss)} es de los que más se responsabilizan. El próximo lo mete, seguro.`, g: 2, need: ['mot2', 1], fx: { pl: [c.penMiss, 5], team: 0.5 } }] },
    { id: 'og', w: c => (c.og != null ? 2.6 : 0), q: c => `El gol en propia de ${name(c, c.og)}. ¿Cómo está?`, o: c => [
      { t: 'Le pasa a cualquiera. Está con nosotros.', g: 2, fx: { pl: [c.og, 3] } },
      { t: 'Hay que estar más atento ahí.', g: 0, fx: { pl: [c.og, -3] } },
      { t: 'Prefiero no hablar de jugadas individuales.', g: 1, fx: {} }] },
    { id: 'bigMiss', w: c => (c.bigMiss >= 2 && c.diff <= 0 ? 2.4 : 0), q: () => 'Ha tenido ocasiones clarísimas. ¿Problema de puntería?', o: () => [
      { t: 'Si seguimos llegando así, los goles llegarán.', g: 2, fx: { team: 1 } },
      { t: 'Hay que ser más contundentes. Así no se gana.', g: 1, fx: { team: -0.5, board: 0.3 } },
      { t: 'Los delanteros tienen que hacer su trabajo.', g: 0, fx: { team: -2 } },
      { t: 'Generamos lo que buscábamos. Con calma, delante de la portería saldrá.', g: 2, need: ['mot1', 1], fx: { team: 1.5 } }] },
    { id: 'red', w: c => (c.reds.length ? 2.8 : 0), q: c => `¿Cómo valora la expulsión de ${name(c, c.reds[0])}?`, o: c => [
      { t: 'Ha sido un error. Lo acepta y aprenderemos.', g: 2, fx: { pl: [c.reds[0], -1], board: 0.5 } },
      { t: 'Me parece muy rigurosa.', g: c.refMine.length ? 1 : 0, fx: { fans: 0.003, fine: [0.25, 4000] } },
      { t: 'Ha dejado tirado al equipo. Hablaremos.', g: 0, fx: { pl: [c.reds[0], -5], team: -1 } },
      { t: 'Lo protegeremos de puertas afuera y lo corregiremos de puertas adentro.', g: 2, need: ['mot2', 2], fx: { pl: [c.reds[0], 2], team: 1, board: 0.5 } }] },

    // --- Tus decisiones en el partido
    { id: 'subGoal', w: c => (c.subScorer != null ? 3 : 0), q: c => `${name(c, c.subScorer)} salió del banquillo y marcó. ¿Lo vio venir?`, o: c => [
      { t: `El mérito es de ${name(c, c.subScorer)}, que ha salido con hambre.`, g: 2, fx: { pl: [c.subScorer, 4] } },
      { t: 'Para eso estoy. Los cambios son mi trabajo.', g: 0, fx: { team: -0.5 } },
      { t: 'A veces sale bien y a veces no.', g: 1, fx: {} },
      { t: 'Su desmarque al espacio les hacía daño. Lo habíamos preparado y él lo ha ejecutado perfecto.', g: 2, need: ['tac3', 1], fx: { pl: [c.subScorer, 4], board: 0.8 } }] },
    { id: 'noSubs', w: c => (c.noSubs ? 2.6 : 0), q: () => 'Iban perdiendo y no movió el banquillo. ¿Por qué?', o: () => [
      { t: 'Confiaba en los que estaban en el campo.', g: 1, fx: { team: 0.5 } },
      { t: 'Los que estaban en el banquillo no me convencían.', g: 0, fx: { team: -2.5 } },
      { t: 'Me equivoqué. Debí refrescar al equipo antes.', g: 2, fx: { board: 0.5, team: 0.5 } },
      { t: 'El plan pedía paciencia. No salió, y lo asumo.', g: 2, need: ['tac2', 1], fx: { board: 0.8 } }] },
    { id: 'tactic', w: c => (c.tactic ? 1.8 : 0), q: () => 'Cambió el sistema durante el partido. ¿Qué buscaba?', o: c => [
      { t: c.diff >= 0 ? 'Dar un paso adelante, y el equipo lo ha entendido.' : 'Buscar soluciones. No han llegado.', g: 2, fx: { team: 0.5 } },
      { t: 'Eso queda entre el equipo y yo.', g: 1, fx: {} },
      { t: 'Los jugadores no estaban haciendo lo que les pedía.', g: 0, fx: { team: -2 } },
      { t: 'Leímos dónde nos estaban haciendo daño y lo corregimos. Esto también es el trabajo de la semana.', g: 2, need: ['tac3', 2], fx: { board: 1 } }] },

    // --- Lo bueno
    { id: 'comeback', w: c => (c.comeback ? 3.4 : 0), q: () => 'Remontada. ¿Qué les dijo para darle la vuelta?', o: () => [
      { t: 'Que creyeran. Este equipo no se rinde nunca.', g: 2, fx: { team: 2, fans: 0.003 } },
      { t: 'Ajustamos un par de cosas y lo entendieron a la primera.', g: 1, fx: { board: 0.6 } },
      { t: 'No debimos ponernos por detrás. Eso hay que corregirlo.', g: 1, fx: { team: -0.5, board: 0.6 } },
      { t: 'Que el partido aún nos estaba esperando. Y ellos fueron a buscarlo.', g: 2, need: ['mot1', 3], fx: { team: 3, fans: 0.005 } }] },
    { id: 'lateWin', w: c => (c.lateWin != null ? 2.8 : 0), q: () => 'Gol en el último suspiro. ¿Cómo lo ha vivido?', o: c => [
      { t: 'Con el corazón en la boca. Esto es el fútbol.', g: 2, fx: { fans: 0.004 } },
      { t: 'Ya era hora. Lo merecíamos desde hace rato.', g: 1, fx: { team: 0.5 } },
      { t: 'Ha sido suerte, hay que reconocerlo.', g: 0, fx: { team: -1 } },
      { t: `Este equipo cree hasta el final. Lo de ${c.lateWin != null && c.S.players[c.lateWin] ? name(c, c.lateWin) : 'hoy'} es el premio a eso.`, g: 2, need: ['mot3', 2], fx: { team: 2, fans: 0.004 } }] },
    { id: 'hat', w: c => (c.hat != null ? 2.6 : 0), q: c => `${c.hatN >= 3 ? 'Hat-trick' : 'Doblete'} de ${name(c, c.hat)}. ¿Hasta dónde puede llegar?`, o: c => [
      { t: 'Hasta donde él quiera. Tiene hambre y talento.', g: 2, fx: { pl: [c.hat, 4] } },
      { t: 'Marca porque el equipo le pone el balón donde le gusta.', g: 2, fx: { team: 1, pl: [c.hat, 1] } },
      { t: 'Que no se relaje. Mañana se vuelve a empezar.', g: 1, fx: { pl: [c.hat, -1], board: 0.4 } },
      { t: 'Está por encima de todo lo que vi en él cuando llegó. Y aún no ha tocado techo.', g: 2, need: ['can2', 1], fx: { pl: [c.hat, 6], board: 0.5 } }] },
    { id: 'star', w: c => (c.star != null && c.hat == null ? 2 : 0), q: c => `${name(c, c.star)} ha estado espectacular. ¿Es su mejor momento?`, o: c => [
      { t: `${name(c, c.star)} es un futbolista diferente.`, g: 1, fx: { pl: [c.star, 5], team: -0.4 } },
      { t: 'Es mérito de todo el equipo, no de uno solo.', g: 2, fx: { team: 1, pl: [c.star, 1] } },
      { t: 'Le voy a exigir todavía más.', g: 1, fx: { pl: [c.star, -2], board: 0.4 } },
      { t: `${name(c, c.star)} hace mejores a los de su alrededor. Eso es lo que más valoro.`, g: 2, need: ['mot2', 1], fx: { pl: [c.star, 4], team: 1 } }] },
    { id: 'kid', w: c => (c.kid != null ? 1.8 : 0), q: c => `${name(c, c.kid)} ha dado un paso adelante. ¿Le veremos más?`, o: c => [
      { t: 'Se lo ha ganado. Contará más a partir de ahora.', g: 2, fx: { pl: [c.kid, 5] } },
      { t: 'Poco a poco. No hay que quemar etapas.', g: 2, fx: { pl: [c.kid, 1], board: 0.4 } },
      { t: 'Aquí nadie tiene el puesto asegurado.', g: 0, fx: { pl: [c.kid, -2] } }] },
    { id: 'clean', w: c => (c.clean && c.diff > 0 ? 1.4 : 0), q: () => 'Portería a cero. ¿La defensa es la clave?', o: () => [
      { t: 'Defendemos todos, desde el delantero.', g: 2, fx: { team: 1 } },
      { t: 'Hoy sí. Otros días hemos sufrido demasiado.', g: 1, fx: { board: 0.4 } },
      { t: 'El portero nos ha salvado. Los demás, regular.', g: 0, fx: { team: -1.5 } }] },

    // --- Lo inesperado
    { id: 'bolt', w: c => (c.bolt != null ? 6 : 0), q: c => `Lo ocurrido con ${name(c, c.bolt)} ha conmocionado a todos. ¿Unas palabras?`, o: () => [
      { t: 'Hoy el fútbol no importa. Nuestro pensamiento está con él y con su familia.', g: 2, fx: { team: 1, board: 1, fans: 0.004 } },
      { t: 'Es muy duro. Prefiero no hablar del partido.', g: 2, fx: { team: 0.5 } },
      { t: 'Hay que seguir. La temporada no espera.', g: 0, fx: { team: -2, fans: -0.004 } }] },
    { id: 'crowd', w: c => (c.crowd ? 2.2 : 0), q: () => '¿Qué le parece lo que ha pasado en la grada?', o: c => [
      { t: 'Lo condeno. Eso no es fútbol.', g: c.crowd && c.crowd.party ? 1 : 2, fx: { board: 0.8 } },
      { t: 'Ha sido un hecho aislado. Nuestra afición es ejemplar.', g: c.crowd && c.crowd.party ? 2 : 0, fx: { fans: 0.004 } },
      { t: 'De eso se encargará el club.', g: 1, fx: {} },
      { t: 'La afición es lo mejor que tenemos, y por eso le pido que nos ayude a cuidar el estadio.', g: 2, need: ['neg2', 1], fx: { fans: 0.005, board: 0.6 } }] },
    { id: 'inj', w: c => (c.inj.length ? 1.8 : 0), q: c => `¿Cómo está ${name(c, c.inj[0])}?`, o: c => [
      { t: 'Esperemos que no sea nada. Mañana le harán pruebas.', g: 2, fx: { pl: [c.inj[0], 1] } },
      { t: 'Le vamos a echar mucho de menos.', g: 1, fx: { pl: [c.inj[0], 2], team: -0.3 } },
      { t: 'Tenemos plantilla para suplir cualquier baja.', g: 1, fx: { team: 0.5, pl: [c.inj[0], -1] } },
      { t: 'Los fisios ya están con él. Volverá más fuerte, y le esperaremos.', g: 2, need: ['fis3', 1], fx: { pl: [c.inj[0], 3], team: 0.5 } }] },
    // --- Lo que has hecho en el club estas semanas (fichajes, ventas, técnicos, patrocinios, campañas)
    { id: 'signing', w: c => (c.feed.signing ? 2.2 : 0), q: c => `¿Qué aporta ${name(c, c.feed.signing.pid)}, el fichaje?`, o: c => {
      const pid = c.feed.signing.pid, played = c.m.pl[pid] && c.m.pl[pid].team === c.me;
      return [
        { t: played ? 'Ya se ha visto hoy: carácter y calidad.' : 'Necesita su tiempo. Le daremos minutos.', g: 2, fx: { pl: [pid, 3] } },
        { t: 'Es el fichaje que necesitábamos para pelear por todo.', g: 1, fx: { pl: [pid, 2], fans: 0.003, board: -0.3 } },
        { t: 'Que lo demuestre en el campo. Aquí nadie regala nada.', g: 0, fx: { pl: [pid, -3] } },
        { t: 'Lo seguimos durante meses. Encaja en lo que queremos ser.', g: 2, need: ['neg1', 1], fx: { pl: [pid, 3], board: 0.8 } }];
    } },
    { id: 'sale', w: c => (c.feed.sale ? 2 : 0), q: c => `¿Por qué ha dejado salir a ${c.S.players[c.feed.sale.pid] ? name(c, c.feed.sale.pid) : 'uno de sus jugadores'}?`, o: () => [
      { t: 'Era una buena operación para todos. Le deseo lo mejor.', g: 2, fx: { board: 0.6 } },
      { t: 'Decisión del club. Yo solo entreno.', g: 0, fx: { board: -1 } },
      { t: 'No era feliz aquí. Así es mejor.', g: 1, fx: { team: -0.3 } },
      { t: 'Con ese dinero el club se hace más fuerte. Y el que llegue tendrá su oportunidad.', g: 2, need: ['neg3', 1], fx: { board: 1, team: 0.5 } }] },
    { id: 'staff', w: c => (c.feed.staff ? 1.4 : 0), q: c => `Ha incorporado a ${c.feed.staff.name} a su cuerpo técnico. ¿Por qué?`, o: () => [
      { t: 'Suma experiencia. Aprenderemos todos de él.', g: 2, fx: { team: 0.5 } },
      { t: 'Porque lo necesitaba. El anterior no estaba al nivel.', g: 0, fx: { board: -0.5 } },
      { t: 'Es un buen profesional. Nada más que añadir.', g: 1, fx: {} }] },
    { id: 'sponsor', w: c => (c.feed.sponsor ? (c.feed.sponsor.risky ? 2.4 : 1.2) : 0), q: c => c.feed.sponsor.risky ? `El nuevo patrocinador, ${c.feed.sponsor.brand}, no gusta a parte de la afición. ¿Qué opina?` : `${c.feed.sponsor.brand} entra como patrocinador. ¿Qué supone para el club?`, o: c => c.feed.sponsor.risky ? [
      { t: 'Entiendo a la afición. Son decisiones del club que respeto.', g: 2, fx: { fans: 0.002 } },
      { t: 'Gracias a ese dinero podemos competir. Es lo que hay.', g: 1, fx: { board: 0.5, fans: -0.002 } },
      { t: 'No me interesan esos temas.', g: 0, fx: { fans: -0.003 } },
      { t: 'Ese dinero irá a la cantera y al estadio. Esa es la garantía que le doy a la afición.', g: 2, need: ['neg2', 2], fx: { fans: 0.004, board: 0.8 } }] : [
      { t: 'Que el club crece. Es una gran noticia para todos.', g: 2, fx: { board: 0.6 } },
      { t: 'Más recursos para competir.', g: 1, fx: { board: 0.3 } },
      { t: 'Yo de eso no sé nada, me dedico al campo.', g: 0, fx: { board: -0.5 } },
      { t: 'Que marcas así quieran estar con nosotros dice mucho del proyecto.', g: 2, need: ['neg2', 1], fx: { board: 1, fans: 0.003 } }] },
    { id: 'campaign', w: c => (c.feed.campaign ? 1.2 : 0), q: c => `El club ha lanzado «${c.feed.campaign.name}». ¿Lo apoya?`, o: () => [
      { t: 'Totalmente. Hay que estar cerca de la gente.', g: 2, fx: { fans: 0.003 } },
      { t: 'Si ayuda a llenar el estadio, bienvenido sea.', g: 1, fx: {} },
      { t: 'A mí me importa lo que pasa en el campo.', g: 0, fx: { board: -0.5 } }] },

    // --- Para completar la rueda de prensa
    { id: 'next', w: c => (c.next ? 1 : 0), q: c => `El próximo rival es el ${c.next.name}. ¿Cómo lo afronta?`, o: c => [
      { t: 'Con mucho respeto. Es un gran equipo.', g: 2, fx: { team: 0.3 } },
      { t: 'Vamos a por los tres puntos, sin miedo.', g: 1, fx: { team: 0.8, fans: 0.003, rival: 1, rivalClub: c.next } },
      { t: 'Ellos sabrán cómo nos afrontan a nosotros.', g: 0, fx: { rival: 1, rivalClub: c.next, fans: 0.003 } },
      { t: 'Ya lo estamos analizando. Sabemos dónde les podemos hacer daño.', g: 2, need: ['tac3', 1], fx: { team: 1, board: 0.4 } }] },
    { id: 'board', w: c => (c.S.board && c.S.board.conf < 40 ? 2 : 0.6), q: () => 'Se habla de su futuro. ¿Se siente respaldado?', o: () => [
      { t: 'Tengo la confianza del club y de los jugadores.', g: 1, fx: { team: 0.3 } },
      { t: 'Mi trabajo habla por mí. No voy a entrar en eso.', g: 2, fx: {} },
      { t: 'Si me quieren echar, que me lo digan a la cara.', g: 0, fx: { board: -2 } },
      { t: 'Hablo con la directiva cada semana. Estamos todos remando en la misma dirección.', g: 2, need: ['neg3', 1], fx: { board: 1.5 } }] },
    { id: 'season', w: () => 0.8, q: () => '¿Qué objetivo se marca para lo que queda de temporada?', o: c => [
      { t: `El que nos ha pedido el club: ${String((c.S.board && c.S.board.text) || 'competir').toLowerCase()}.`, g: 2, fx: { board: 0.8 } },
      { t: 'Ganarlo todo. No me conformo con menos.', g: 0, fx: { fans: 0.004, board: -0.5 } },
      { t: 'Partido a partido.', g: 1, fx: {} },
      { t: 'Crecer cada semana. Si lo hacemos, los objetivos llegarán solos.', g: 2, need: ['mot3', 1], fx: { team: 1, board: 0.6 } }] },
    { id: 'fans', w: () => 0.7, q: () => '¿Un mensaje para la afición?', o: () => [
      { t: 'Gracias por estar siempre. Os necesitamos.', g: 2, fx: { fans: 0.003 } },
      { t: 'Que tengan paciencia.', g: 1, fx: {} },
      { t: 'Que vengan más al estadio, que se nota cuando no están.', g: 0, fx: { fans: -0.004 } },
      { t: 'Este escudo es suyo. Nosotros solo intentamos estar a su altura.', g: 2, need: ['neg2', 2], fx: { fans: 0.007 } }] }
  ];

  const RESULT = ['win', 'draw', 'loss', 'thrash', 'bolt'];
  /** Las preguntas de hoy: lo que ha pasado según su peso, el resultado primero, y se completa hasta cinco. */
  function questions(c) {
    const pool = QS.map(q => ({ q, w: q.w(c) })).filter(x => x.w > 0);
    const out = [];
    while (pool.length && out.length < N_QUESTIONS) {
      const ws = pool.map(x => x.w * (0.75 + Math.random() * 0.5));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0), k = 0;
      for (; k < pool.length - 1; k++) { r -= ws[k]; if (r <= 0) break; }
      out.push(pool.splice(k, 1)[0].q);
    }
    out.sort((a, b) => (RESULT.includes(b.id) ? 1 : 0) - (RESULT.includes(a.id) ? 1 : 0));
    return out;
  }
  /** Las opciones que puedes dar: las de tus habilidades sustituyen a la peor; las bloqueadas se enseñan. */
  function options(S, q, c) {
    const all = q.o(c);
    const open = all.filter(o => !o.need || lv(S, o.need[0]) >= o.need[1]);
    const locked = all.filter(o => o.need && lv(S, o.need[0]) < o.need[1]);
    let shown = open;
    if (open.length > 3) { const worst = open.slice().sort((a, b) => a.g - b.g)[0]; shown = open.filter(o => o !== worst); }
    return { shown: shown.slice().sort(() => Math.random() - 0.5), locked: locked.slice(0, 1) };
  }

  // ------------------------------------------------------------ Efectos
  function apply(S, fx, log) {
    const N = TL.News && TL.News.fx;
    if (!fx || !N) return;
    if (fx.team) { N.teamMor(S, fx.team); log.team = (log.team || 0) + fx.team; }
    if (fx.pl && S.players[fx.pl[0]]) { N.mor(S.players[fx.pl[0]], fx.pl[1]); log.pl = log.pl || {}; log.pl[fx.pl[0]] = (log.pl[fx.pl[0]] || 0) + fx.pl[1]; }
    if (fx.board) { N.board(S, fx.board); log.board = (log.board || 0) + fx.board; }
    if (fx.fans) { N.fans(S, fx.fans); log.fans = (log.fans || 0) + fx.fans; }
    if (fx.rival && fx.rivalClub) { log.rival = true; S.prensaRival = { club: fx.rivalClub.id, season: S.season }; }
    if (fx.fine && Math.random() < fx.fine[0]) { const f = N.fineClub(S, S.user, fx.fine[1] * (0.8 + Math.random() * 0.4)); log.fine = (log.fine || 0) + f; }
  }
  /** Final del minijuego: con tres buenas seguidas, redonda; si no, no has convencido o se te ha ido de las manos. */
  function verdict(S, st) {
    const club = S.clubs[S.user];
    if (st.best >= NEED_STREAK) {
      apply(S, { team: 1.5, board: 1.5, fans: 0.006 }, st.log);
      if (TL.News) TL.News.add(S, 'club', `${S.manager}, sobresaliente ante los micrófonos`, `El técnico de ${club.name} firmó una rueda de prensa impecable tras el partido.`, club.id, null, 'pos');
      return { win: true, title: 'Rueda de prensa redonda', text: 'Has tenido a la sala en la palma de la mano.' };
    }
    const bad = st.marks.filter(x => x === 0).length;
    apply(S, { board: -1 - bad * 0.5, fans: -0.002 * bad, team: bad >= 2 ? -1 : 0 }, st.log);
    if (bad >= 2 && TL.News) TL.News.add(S, 'polemica', `Rueda de prensa tensa de ${S.manager}`, `Las respuestas del técnico de ${club.name} no gustaron ni en la sala ni en el club.`, club.id, null, 'neg');
    return { win: false, title: bad >= 2 ? 'Se te ha ido de las manos' : 'No has convencido', text: bad >= 2 ? 'La sala se queda con tus peores frases.' : `Te ha faltado encadenar ${NEED_STREAK} buenas respuestas seguidas.` };
  }
  /** Lo que ha supuesto, en palabras. */
  function summary(S, log) {
    const out = [];
    if (log.team > 1) out.push('La plantilla agradece tus palabras.');
    else if (log.team < -1) out.push('En el vestuario no ha sentado bien lo que has dicho.');
    for (const id in log.pl || {}) {
      const p = S.players[id], d = log.pl[id];
      if (!p) continue;
      if (d >= 3) out.push(`${p.short} se siente valorado.`);
      else if (d <= -2) out.push(`${p.short} se ha quedado tocado.`);
    }
    if (log.board >= 1) out.push('La directiva valora tu actitud.');
    else if (log.board <= -0.8) out.push('A la directiva no le ha gustado.');
    if (log.fans > 0.004) out.push('La afición se queda con tu mensaje.');
    else if (log.fans < -0.002) out.push('A la afición no le ha gustado.');
    if (log.rival) out.push('Tus palabras llegarán al vestuario rival.');
    if (log.fine) out.push(`Competición abre expediente por tus declaraciones: multa de ${U.money(log.fine)}.`);
    return out;
  }

  // ------------------------------------------------------------ Escena
  const R = { c: null, qs: [], k: 0, log: {}, timers: [], raf: 0, onDone: null };
  function el(id) { return document.getElementById(id); }

  function open(S, m, me, onDone) {
    const c = context(S, m, me);
    R.c = c; R.qs = questions(c); R.k = 0; R.log = {}; R.onDone = onDone || null; R.streak = 0; R.best = 0; R.marks = []; R.grace = lv(S, 'pre1');
    for (const k in c.feed) c.feed[k].asked = true;
    if (!R.qs.length) { if (onDone) onDone(); return; }
    const club = S.clubs[S.user], [c1, c2] = U.clubColors(club.name);
    const right = c.guest != null ? S.players[c.guest] : null;
    const root = document.createElement('div');
    root.id = 'prensa'; root.className = 'prensa';
    root.innerHTML = `<div class="pr-stage" style="--c1:${c1};--c2:${c2}">
        <img class="pr-bg" src="assets/prensa/sala.webp" alt="">
        <canvas class="pr-wall"></canvas>
        <div class="pr-tv"><div class="pr-ad"></div></div>
        <div class="pr-dot pr-l" title="Jefe de prensa"><i></i><b>Prensa</b></div>
        <div class="pr-dot pr-c me" title="${esc(S.manager)}"><i></i><b>Tú</b></div>
        ${right ? `<div class="pr-dot pr-r" title="${esc(right.name)}"><i></i><b>${esc(right.short)}</b></div>` : ''}
        <img class="pr-table" src="assets/prensa/mesa.webp" alt="">
        <div class="pr-say"></div>
        <div class="pr-flash"></div>
        <div class="pr-live"><i></i>EN DIRECTO</div>
      </div>
      <div class="pr-panel"><div class="pr-meter"></div><div class="pr-q"></div><div class="pr-as"></div></div>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('on'));
    startFx(root, c1, c2, club);
    ask();
  }

  function meter() {
    const el0 = document.querySelector('#prensa .pr-meter');
    if (!el0) return;
    const dots = Array.from({ length: NEED_STREAK }, (_, k) => `<i class="${k < R.streak ? 'on' : ''}"></i>`).join('');
    const marks = R.marks.map(g => `<b class="g${g}"></b>`).join('');
    el0.innerHTML = `<span class="pr-st" title="Respuestas buenas seguidas">${dots}</span><span class="pr-mk">${marks}</span>`;
  }
  function ask() {
    const q = R.qs[R.k], c = R.c;
    const panel = document.querySelector('#prensa .pr-panel');
    if (!q || R.best >= NEED_STREAK || NEED_STREAK - R.streak > R.qs.length - R.k) return end();
    meter();
    panel.querySelector('.pr-q').innerHTML = `<small>${esc(pick(REPORTERS))} · ${esc(pick(MEDIA))} <span class="pr-n">${R.k + 1}/${R.qs.length}</span></small>${esc(q.q(c))}`;
    const { shown, locked } = options(c.S, q, c);
    R.cur = shown;
    panel.querySelector('.pr-as').innerHTML = shown.map((a, k) => `<button class="btn block pr-a" data-act="pr-answer" data-k="${k}">${esc(a.t)}</button>`).join('')
      + locked.map(a => `<button class="btn block pr-a locked" disabled><span>${esc(a.t)}</span><small>Requiere: ${esc(skillName(a.need[0]))} ${a.need[1]}</small></button>`).join('');
    flash();
  }
  A['pr-answer'] = b => {
    const a = R.cur && R.cur[+b.dataset.k];
    if (!a) return;
    R.cur = null;
    apply(R.c.S, a.fx, R.log);
    let g = a.g;
    if (g === 1 && R.grace > 0 && R.streak > 0) { R.grace--; g = 1.5; }
    if (g === 2) R.streak++; else if (g !== 1.5) R.streak = 0;
    R.best = Math.max(R.best, R.streak);
    R.marks.push(g === 1.5 ? 1 : g);
    const say = document.querySelector('#prensa .pr-say'), me = document.querySelector('#prensa .pr-c');
    if (say) { say.textContent = a.t; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); }
    if (me) { me.classList.remove('talk'); void me.offsetWidth; me.classList.add('talk'); }
    const gg = document.querySelector('#prensa .pr-r');
    if (gg && a.fx && a.fx.pl && a.fx.pl[0] === R.c.guest) { const k = a.fx.pl[1] > 0 ? 'happy' : 'sad'; gg.classList.remove('happy', 'sad'); void gg.offsetWidth; gg.classList.add(k); }
    // La sala reacciona: el de prensa asiente con las buenas y se lleva la mano a la frente con las malas
    const l = document.querySelector('#prensa .pr-l');
    if (l) { const k = a.g === 0 ? 'sad' : 'nod'; l.classList.remove('nod', 'sad'); void l.offsetWidth; l.classList.add(k); }
    if (a.g === 2) flash();
    const stage = document.querySelector('#prensa .pr-stage');
    if (stage) { stage.classList.remove('murmur'); if (a.g === 0) { void stage.offsetWidth; stage.classList.add('murmur'); } }
    meter();
    document.querySelectorAll('#prensa .pr-a').forEach(x => { x.disabled = true; });
    if (TL.SFX && TL.SFX.click) TL.SFX.click();
    R.timers.push(setTimeout(() => { R.k++; ask(); }, 1700));
  };
  function end() {
    const S = R.c.S;
    const panel = document.querySelector('#prensa .pr-panel');
    const v = verdict(S, R);
    meter();
    panel.querySelector('.pr-q').innerHTML = `<small>Fin de la rueda de prensa</small><span class="pr-v ${v.win ? 'win' : 'lose'}">${esc(v.title)}</span> ${esc(v.text)}`;
    panel.querySelector('.pr-as').innerHTML = `<ul class="pr-sum">${summary(S, R.log).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <button class="btn primary block" data-act="pr-close">Salir de la sala</button>`;
    G.save();
  }
  A['pr-close'] = () => {
    R.timers.forEach(clearTimeout); R.timers = [];
    cancelAnimationFrame(R.raf);
    const root = el('prensa'); if (root) root.remove();
    const cb = R.onDone; R.onDone = null;
    if (cb) cb();
  };

  /** Flashes de las cámaras al preguntar. */
  function flash() {
    const f = document.querySelector('#prensa .pr-flash');
    if (!f) return;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      R.timers.push(setTimeout(() => {
        f.style.left = (Math.random() < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14) + '%';
        f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
      }, k * 260 + Math.random() * 200));
    }
  }

  /** Pared de cuadros que se anima con los colores del club, y anuncios en la pantalla. */
  function startFx(root, c1, c2, club) {
    const cv = root.querySelector('.pr-wall'), g = cv.getContext('2d');
    const COLS = 12, ROWS = 9;
    const pal = [c1, c2, '#ffffff', c1];
    const modes = ['ola', 'escudo', 'chispas', 'barrido'];
    let mode = 0, t0 = performance.now();
    const fit = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * (window.devicePixelRatio || 1))); cv.height = Math.max(1, Math.round(r.height * (window.devicePixelRatio || 1))); };
    fit();
    const loop = now => {
      if (!document.getElementById('prensa')) return;
      const t = (now - t0) / 1000;
      if (t > 7) { t0 = now; mode = (mode + 1) % modes.length; }
      if (cv.width < 4) fit();
      const W0 = cv.width, H0 = cv.height, cw = W0 / COLS, ch = H0 / ROWS;
      g.clearRect(0, 0, W0, H0);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        let a = 0, col = pal[(x + y) % pal.length];
        const m = modes[mode];
        if (m === 'ola') a = 0.5 + 0.5 * Math.sin(t * 3 - x * 0.6 - y * 0.35);
        else if (m === 'barrido') a = Math.max(0, 1 - Math.abs(((t * 4) % (COLS + 4)) - 2 - x) / 2);
        else if (m === 'chispas') a = (Math.sin(x * 12.9 + y * 78.2 + Math.floor(t * 3) * 37.7) * 43758.5 % 1 + 1) % 1 > 0.82 ? 1 : 0;
        else { const dx = x - 5.5, dy = y - 4, d = Math.sqrt(dx * dx + dy * dy); a = d < 2.2 + Math.sin(t * 2) * 0.6 ? 1 : 0; col = d < 1.4 ? '#ffffff' : c1; }
        if (a <= 0.02) continue;
        g.globalAlpha = a * 0.55;
        g.fillStyle = col;
        g.fillRect(x * cw + cw * 0.06, y * ch + ch * 0.08, cw * 0.88, ch * 0.84);
      }
      g.globalAlpha = 1;
      R.raf = requestAnimationFrame(loop);
    };
    R.raf = requestAnimationFrame(loop);
    // Anuncios: patrocinadores inventados que van pasando (y el escudo del club de vez en cuando)
    const ad = root.querySelector('.pr-ad');
    const SYL = ['ZU', 'KO', 'RA', 'MI', 'TEX', 'VOL', 'NEX', 'LO', 'PA', 'GRO', 'FI', 'TA', 'XO', 'BRU', 'NOR'];
    const BG = [['#e63946', '#fff'], ['#1d3557', '#a8dadc'], ['#ffb703', '#023047'], ['#2a9d8f', '#e9f5db'], ['#7b2cbf', '#ffd6ff'], ['#111', '#b8f53d'], ['#0077b6', '#caf0f8']];
    const TAG = ['Energía para ganar', 'Tu seguro de confianza', 'Siempre en juego', 'El sabor del fútbol', 'Conecta con tu equipo', 'Más rápido que un contraataque'];
    let n = 0;
    const next = () => {
      if (!document.getElementById('prensa')) return;
      n++;
      if (n % 4 === 0) { ad.style.background = c1; ad.style.color = c2; ad.innerHTML = `<b>${esc(club.name)}</b><span>Juntos, siempre</span>`; }
      else {
        const [bg, fg] = pick(BG), word = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => pick(SYL)).join('');
        ad.style.background = bg; ad.style.color = fg; ad.innerHTML = `<b>${word}</b><span>${pick(TAG)}</span>`;
      }
      ad.classList.remove('in'); void ad.offsetWidth; ad.classList.add('in');
      R.timers.push(setTimeout(next, 3200));
    };
    next();
  }

  /** ¿Hay rueda de prensa hoy? Tras los partidos que dan que hablar, siempre; si no, a veces. */
  function offered(S, m, me) {
    const c = context(S, m, me);
    if (c.coachRed || c.reds.length || c.refMine.length || c.protests.length || c.crowd || c.bolt != null || Math.abs(c.diff) >= 3 || c.cup || c.comeback || c.lateWin != null || c.lateLost) return true;
    if (Object.keys(c.feed).length) return Math.random() < 0.7;
    return Math.random() < 0.45;
  }
  /** No ir: con «Portavoz» va el jefe de prensa y no pasa nada; si no, a la directiva y a la prensa no les gusta. */
  function skip(S, m, me) {
    const club = S.clubs[S.user];
    if (lv(S, 'pre2') >= 1) return 'El jefe de prensa atiende a los medios por ti.';
    const N = TL.News && TL.News.fx;
    if (N) { N.board(S, -1.2); N.fans(S, -0.002); }
    if (TL.News) TL.News.add(S, 'polemica', `${S.manager} plantó a la prensa`, `El técnico de ${club.name} no compareció tras el partido.`, club.id, null, 'neg');
    return 'No te has presentado. A la directiva no le ha gustado.';
  }
  const canDelegate = S => lv(S, 'pre2') >= 1;

  TL.Prensa = { open, offered, skip, canDelegate, _options: options, _verdict: verdict, _questions: questions, _context: context };
})();
