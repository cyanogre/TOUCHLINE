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
    { id: 'win', w: c => (c.diff > 0 ? 3 : 0), q: c => `Tres puntos ante el ${c.opp.name}. ¿Se va a casa con una sonrisa o con la libreta llena de deberes?`, o: c => [
      { t: 'Hoy mis jugadores han dejado el alma en el césped. Yo solo he puesto la corbata.', g: 2, fx: { team: 1.5 } },
      { t: 'Contento, sí. Pero esta noche veré el partido otra vez y no voy a dormir mucho.', g: 1, fx: { board: 0.5 } },
      { t: 'Hoy les hemos hecho un unboxing. No había color, tremendo.', g: c.diff >= 3 ? 1 : 0, fx: { fans: 0.004, rival: 1, rivalClub: c.opp } },
      { t: 'Este grupo tiene un aura que no se compra. Y aún estamos en modo tutorial.', g: 2, need: ['mot1', 2], fx: { team: 2.5, fans: 0.004 } }] },
    { id: 'draw', w: c => (c.diff === 0 ? 3 : 0), q: c => `Un punto ante el ${c.opp.name}. ¿Vaso medio lleno o medio vacío?`, o: c => [
      { t: 'Medio lleno. En mayo, los puntos que hoy parecen pequeños pesan como piedras.', g: 2, fx: { team: 1 } },
      { t: 'Medio vacío. Ni tan mal, pero no me renta.', g: 1, fx: { board: 0.3 } },
      { t: 'El árbitro hoy tenía el mando en la mano. Red flag.', g: c.refMine.length ? 1 : 0, fx: { fine: [0.35, 5000], fans: 0.003 } },
      { t: 'Sabe a poco, y eso me encanta: hace un año esto nos habría sabido a gloria.', g: 2, need: ['tac2', 1], fx: { team: 1.5, board: 0.8 } }] },
    { id: 'loss', w: c => (c.diff < 0 && c.diff > -3 ? 3 : 0), q: c => `${c.ga}-${c.gf}. ¿Dónde se ha perdido hoy el partido?`, o: () => [
      { t: 'Se ha perdido en mi pizarra. Los palos, para mí; a los chavales, ni tocarlos.', g: 2, fx: { team: 1.5, board: -0.3 } },
      { t: 'Alguno hoy ha jugado en modo avión. Y lo sabe.', g: 0, fx: { team: -3 } },
      { t: 'Día random. Mañana café cargado y a seguir.', g: 1, fx: { team: 0.5 } },
      { t: 'En tres detalles. Los tengo apuntados aquí, y el martes los vamos a machacar.', g: 2, need: ['tac1', 2], fx: { team: 1, board: 1 } }] },
    { id: 'thrash', w: c => (c.diff <= -3 ? 4 : 0), q: c => `${c.ga}-${c.gf}. ¿Le han pasado por encima?`, o: () => [
      { t: 'Nos han pasado por encima, literal. A la gente que ha venido: perdón, de corazón.', g: 2, fx: { fans: 0.003, team: 0.5 } },
      { t: 'Esta camiseta pesa, y hoy a alguno le quedaba oversize.', g: 0, fx: { team: -3.5, board: 0.5 } },
      { t: 'Cero dramas. Un mal día lo tiene cualquiera, hasta Spotify se cae.', g: 0, fx: { board: -1 } },
      { t: 'Esto escuece, y quiero que escueza. Que nadie duerma bien hoy: mañana a las ocho, todos aquí.', g: 2, need: ['mot3', 1], fx: { team: 1.5, board: 1, fans: 0.003 } }] },

    // --- Tus reclamaciones al árbitro (con lo que pasó de verdad)
    { id: 'protest', w: c => (c.protests.length && !c.coachRed ? 3.2 : 0), q: c => `Le vimos muy encendido en la banda${c.protests.some(p => p.card) ? ', hasta ver una amarilla' : ''}. ¿Por qué?`, o: c => {
      const right = c.protests.some(p => p.right), wrong = c.protests.some(p => !p.right);
      return [
        { t: 'Pongan la repetición. Si no tenía razón, les invito a unas cañas. Spoiler: la tenía.', g: right && !wrong ? 2 : 0, fx: right && !wrong ? { fans: 0.004 } : { fine: [0.35, 4000], board: -0.5 } },
        { t: 'Me he calentado más que Sevilla en agosto. No era mi mejor versión, lo reconozco.', g: wrong ? 2 : 1, fx: { board: 0.8 } },
        { t: 'Si quieren un entrenador NPC, que pongan una estatua en la banda.', g: 0, fx: { fans: 0.003, board: -0.8 } },
        { t: 'Al cuarto árbitro le hablé de usted y con educación. Discrepar no es faltar.', g: 2, need: ['arb2', 1], fx: { board: 0.6, team: 0.5 } }];
    } },
    { id: 'coachRed', w: c => (c.coachRed ? 5 : 0), q: () => '¿Qué tal se ve el fútbol desde la grada?', o: () => [
      { t: 'Fatal, se lo aseguro. Me equivoqué y pido disculpas.', g: 2, fx: { board: 1 } },
      { t: 'Desde arriba se ve todo mejor. Y lo volvería a hacer, sin filtro.', g: 0, fx: { fans: 0.005, fine: [0.5, 5000], board: -1 } },
      { t: 'Siguiente pregunta. Next.', g: 1, fx: {} },
      { t: 'Me equivoqué yo, no ellos. Esta semana llamo al colegiado y lo arreglamos como adultos.', g: 2, need: ['dis3', 1], fx: { board: 1.5, team: 0.5 } }] },
    { id: 'refNoProtest', w: c => (c.refMine.length && !c.protests.length ? 2.6 : 0), q: () => 'Hubo una jugada muy discutida en su contra y usted ni se inmutó. ¿Es zen o estaba mirando el móvil?', o: () => [
      { t: 'De árbitros no hablo, que luego me cobran.', g: 1, fx: { board: 0.3 } },
      { t: 'Ni zen ni móvil: estaba contando hasta diez. Pero que nos han robado, nos han robado.', g: 0, fx: { fans: 0.006, fine: [0.45, 6000], board: -0.5 } },
      { t: 'Zen. Mi energía la gasto en mis jugadores, no en un señor de amarillo.', g: 2, fx: { board: 0.8, team: 0.5 } },
      { t: 'Lo veré con calma. Y si hay algo que decir, el club tiene buenos abogados y mejores cauces.', g: 2, need: ['dis3', 2], fx: { board: 1.2 } }] },

    // --- Lo que salió mal
    { id: 'lateLost', w: c => (c.lateLost ? 3 : 0), q: () => 'Gol en el descuento. ¿Se apagó la luz?', o: () => [
      { t: 'Se apagó la luz del banquillo, que es la mía. No supe cerrar el partido.', g: 2, fx: { team: 1, board: -0.3 } },
      { t: 'Algunos ya estaban pensando en el after.', g: 0, fx: { team: -2 } },
      { t: 'El fútbol es así: cuando crees que lo tienes, te deja en visto.', g: 1, fx: {} },
      { t: 'Nos faltó picardía. Esta semana entrenamos a perder tiempo como profesionales.', g: 2, need: ['tac2', 2], fx: { team: 1, board: 0.8 } }] },
    { id: 'penMiss', w: c => (c.penMiss != null ? 3 : 0), q: c => `${name(c, c.penMiss)} falló el penalti. ¿Seguirá tirándolos?`, o: c => [
      { t: 'El que más. Solo falla los penaltis quien tiene lo que hay que tener para tirarlos.', g: 2, fx: { pl: [c.penMiss, 3] } },
      { t: 'Hay cola para tirar penaltis en este equipo. Ya veremos.', g: 1, fx: { pl: [c.penMiss, -2] } },
      { t: 'Eso no se falla. Ni con los ojos cerrados.', g: 0, fx: { pl: [c.penMiss, -5], team: -0.5 } },
      { t: `${name(c, c.penMiss)} es de los que más se responsabilizan. El próximo lo mete, seguro.`, g: 2, need: ['mot2', 1], fx: { pl: [c.penMiss, 5], team: 0.5 } }] },
    { id: 'og', w: c => (c.og != null ? 2.6 : 0), q: c => `El gol en propia de ${name(c, c.og)}. ¿Cómo está?`, o: c => [
      { t: 'Hoy le invito yo a cenar. A cualquiera le pasa, y él es de los que más corre.', g: 2, fx: { pl: [c.og, 3] } },
      { t: 'Hombre, hay que mirar a qué portería se dispara. Básico.', g: 0, fx: { pl: [c.og, -3] } },
      { t: 'Del vídeo no hablo, que me pongo triste.', g: 1, fx: {} }] },
    { id: 'bigMiss', w: c => (c.bigMiss >= 2 && c.diff <= 0 ? 2.4 : 0), q: () => 'Ocasiones para ganar tres partidos. ¿Mal de ojo o skill issue?', o: () => [
      { t: 'Si llegamos así, los goles vendrán como el Cercanías: tarde, pero de tres en tres.', g: 2, fx: { team: 1 } },
      { t: 'Hoy el portero rival se merece un monumento. Y nosotros, un tirón de orejas.', g: 1, fx: { team: -0.5, board: 0.3 } },
      { t: 'Skill issue. A los delanteros se les paga por meterla.', g: 0, fx: { team: -2 } },
      { t: 'La portería no se mueve. Ya les dije que algún día se van a cansar de fallar.', g: 2, need: ['mot1', 1], fx: { team: 1.5 } }] },
    { id: 'red', w: c => (c.reds.length ? 2.8 : 0), q: c => `¿Cómo valora la expulsión de ${name(c, c.reds[0])}?`, o: c => [
      { t: 'Se le ha ido la cabeza un segundo. Ya me ha pedido perdón y yo le he pedido un café.', g: 2, fx: { pl: [c.reds[0], -1], board: 0.5 } },
      { t: 'Con esa vara de medir, el partido habría acabado siete contra siete.', g: c.refMine.length ? 1 : 0, fx: { fans: 0.003, fine: [0.25, 4000] } },
      { t: 'Nos ha dejado con diez. Hablaremos, y no por WhatsApp.', g: 0, fx: { pl: [c.reds[0], -5], team: -1 } },
      { t: 'De puertas afuera, lo defiendo a muerte. De puertas adentro… que se prepare.', g: 2, need: ['mot2', 2], fx: { pl: [c.reds[0], 2], team: 1, board: 0.5 } }] },

    // --- Tus decisiones en el partido
    { id: 'subGoal', w: c => (c.subScorer != null ? 3 : 0), q: c => `${name(c, c.subScorer)} sale del banquillo y la clava. ¿Brujería?`, o: c => [
      { t: `El mérito es de ${name(c, c.subScorer)}, que ha salido con hambre.`, g: 2, fx: { pl: [c.subScorer, 4] } },
      { t: 'Brujería no: aura de entrenador. De nada.', g: 0, fx: { team: -0.5 } },
      { t: 'Hoy ha salido cara. Otro día saldrá cruz.', g: 1, fx: {} },
      { t: 'Ni brujería ni suerte: sus centrales sufrían a la espalda. Lo preparamos el jueves, y él lo ha bordado.', g: 2, need: ['tac3', 1], fx: { pl: [c.subScorer, 4], board: 0.8 } }] },
    { id: 'noSubs', w: c => (c.noSubs ? 2.6 : 0), q: () => 'Perdiendo, y el banquillo intacto. ¿Se le olvidó que había cambios?', o: () => [
      { t: 'Creía en los once que estaban dentro. Ciegamente.', g: 1, fx: { team: 0.5 } },
      { t: 'Si hubiera visto calentar a los del banquillo, tampoco. Estaban en modo siesta.', g: 0, fx: { team: -2.5 } },
      { t: 'No se me olvidó, se me pasó. Que es peor. Culpa mía.', g: 2, fx: { board: 0.5, team: 0.5 } },
      { t: 'El plan era aguantar y morder al final. No mordimos. Lo asumo.', g: 2, need: ['tac2', 1], fx: { board: 0.8 } }] },
    { id: 'tactic', w: c => (c.tactic ? 1.8 : 0), q: () => 'Cambió el dibujo en pleno partido. ¿Qué vio desde la banda?', o: c => [
      { t: c.diff >= 0 ? 'Dar un paso adelante, y el equipo lo ha entendido.' : 'Buscar soluciones. No han llegado.', g: 2, fx: { team: 0.5 } },
      { t: 'Eso se queda en mi libreta. Y mi libreta no sale de esta sala.', g: 1, fx: {} },
      { t: 'Que mis jugadores me tenían silenciado. Ya no.', g: 0, fx: { team: -2 } },
      { t: 'Que nos estaban encontrando entre líneas. Movimos dos piezas y se les acabó el chollo.', g: 2, need: ['tac3', 2], fx: { board: 1 } }] },

    // --- Lo bueno
    { id: 'comeback', w: c => (c.comeback ? 3.4 : 0), q: () => 'Remontada. ¿Qué les dijo para darle la vuelta? ¿Hubo gritos?', o: () => [
      { t: 'Ni un grito. Les miré a los ojos y les dije: este partido es nuestro, id a por él.', g: 2, fx: { team: 2, fans: 0.003 } },
      { t: 'Dos flechas en la pizarra. Son listos, lo pillaron a la primera.', g: 1, fx: { board: 0.6 } },
      { t: 'Mejor no tener que remontar, ¿eh? Que me salen canas y no tengo edad.', g: 1, fx: { team: -0.5, board: 0.6 } },
      { t: 'Les dije que el partido todavía nos estaba esperando. Y salieron a buscarlo como lobos.', g: 2, need: ['mot1', 3], fx: { team: 3, fans: 0.005 } }] },
    { id: 'lateWin', w: c => (c.lateWin != null ? 2.8 : 0), q: () => 'Gol en el último suspiro. ¿Le queda corazón?', o: c => [
      { t: 'Tengo el corazón a 200. Si alguien lo encuentra en la banda, que me lo devuelva por Wallapop.', g: 2, fx: { fans: 0.004 } },
      { t: 'Llevábamos llamando a la puerta desde el minuto uno. Al final nos abrieron.', g: 1, fx: { team: 0.5 } },
      { t: 'Suerte, para qué engañarnos. Hoy nos ha tocado la lotería de Navidad.', g: 0, fx: { team: -1 } },
      { t: `Este equipo cree hasta el final. Lo de ${c.lateWin != null && c.S.players[c.lateWin] ? name(c, c.lateWin) : 'hoy'} es el premio a eso.`, g: 2, need: ['mot3', 2], fx: { team: 2, fans: 0.004 } }] },
    { id: 'hat', w: c => (c.hat != null ? 2.6 : 0), q: c => `${c.hatN >= 3 ? 'Hat-trick' : 'Doblete'} de ${name(c, c.hat)}. ¿Hasta dónde puede llegar?`, o: c => [
      { t: 'Hasta donde quiera. Tiene más hambre que un estudiante de Erasmus.', g: 2, fx: { pl: [c.hat, 4] } },
      { t: 'Él empuja el balón, pero detrás hay diez tíos poniéndoselo en bandeja.', g: 2, fx: { team: 1, pl: [c.hat, 1] } },
      { t: 'Que no se flipe. Mañana a recoger conos, por si acaso.', g: 1, fx: { pl: [c.hat, -1], board: 0.4 } },
      { t: 'Cuando llegó, vi a un buen jugador. Hoy he visto a otra cosa. Y aún no tiene techo.', g: 2, need: ['can2', 1], fx: { pl: [c.hat, 6], board: 0.5 } }] },
    { id: 'star', w: c => (c.star != null && c.hat == null ? 2 : 0), q: c => `${name(c, c.star)} ha estado espectacular. ¿Es su mejor momento?`, o: c => [
      { t: `${name(c, c.star)} es un futbolista diferente.`, g: 1, fx: { pl: [c.star, 5], team: -0.4 } },
      { t: 'Un violín suena bonito, pero lo de hoy ha sido una orquesta.', g: 2, fx: { team: 1, pl: [c.star, 1] } },
      { t: 'Le voy a exigir el doble. A los buenos, más.', g: 1, fx: { pl: [c.star, -2], board: 0.4 } },
      { t: `${name(c, c.star)} hace mejores a los de su alrededor. Eso es lo que más valoro.`, g: 2, need: ['mot2', 1], fx: { pl: [c.star, 4], team: 1 } }] },
    { id: 'kid', w: c => (c.kid != null ? 1.8 : 0), q: c => `${name(c, c.kid)} ha dado un paso adelante. ¿Le veremos más?`, o: c => [
      { t: 'Ha llamado a la puerta, y la puerta se le ha abierto.', g: 2, fx: { pl: [c.kid, 5] } },
      { t: 'Despacito. A los chavales no se les quema: se les cocina a fuego lento.', g: 2, fx: { pl: [c.kid, 1], board: 0.4 } },
      { t: 'Que no se emocione. Aquí nadie tiene el sitio reservado, esto no es Ryanair con prioridad.', g: 0, fx: { pl: [c.kid, -2] } }] },
    { id: 'clean', w: c => (c.clean && c.diff > 0 ? 1.4 : 0), q: () => 'Portería a cero. ¿La defensa es la clave?', o: () => [
      { t: 'Aquí defiende hasta el utillero. Empezando por el nueve.', g: 2, fx: { team: 1 } },
      { t: 'Hoy sí. No me acostumbro, que otras semanas parecemos un colador.', g: 1, fx: { board: 0.4 } },
      { t: 'Hoy el portero ha hecho speedrun de paradas. A los demás, ni las buenas noches.', g: 0, fx: { team: -1.5 } }] },

    // --- Lo inesperado
    { id: 'bolt', w: c => (c.bolt != null ? 6 : 0), q: c => `Lo ocurrido con ${name(c, c.bolt)} ha conmocionado a todos. ¿Unas palabras?`, o: () => [
      { t: 'Hoy el marcador me da igual. Todo el vestuario está con él y con su familia.', g: 2, fx: { team: 1, board: 1, fans: 0.004 } },
      { t: 'Perdonen, hoy no me salen las palabras de fútbol.', g: 2, fx: { team: 0.5 } },
      { t: 'La temporada no espera a nadie. El domingo, otra vez.', g: 0, fx: { team: -2, fans: -0.004 } }] },
    { id: 'crowd', w: c => (c.crowd ? 2.2 : 0), q: () => '¿Qué le ha parecido el espectáculo de la grada?', o: c => [
      { t: 'Eso no es fútbol. Quien venga a eso, que se quede en casa.', g: c.crowd && c.crowd.party ? 1 : 2, fx: { board: 0.8 } },
      { t: 'Cuatro random no son una afición. La nuestra es top.', g: c.crowd && c.crowd.party ? 2 : 0, fx: { fans: 0.004 } },
      { t: 'Para eso hay un club con despachos. Yo tengo una pizarra.', g: 1, fx: {} },
      { t: 'Nuestra grada es lo mejor que tenemos. Por eso le pido que la cuide como cuida el escudo.', g: 2, need: ['neg2', 1], fx: { fans: 0.005, board: 0.6 } }] },
    { id: 'inj', w: c => (c.inj.length ? 1.8 : 0), q: c => `¿Cómo está ${name(c, c.inj[0])}?`, o: c => [
      { t: 'Crucemos los dedos. Mañana, resonancia y a rezar.', g: 2, fx: { pl: [c.inj[0], 1] } },
      { t: 'Si es lo que parece, nos quitan un pulmón.', g: 1, fx: { pl: [c.inj[0], 2], team: -0.3 } },
      { t: 'Para eso tenemos veinticinco. Aquí nadie es imprescindible.', g: 1, fx: { team: 0.5, pl: [c.inj[0], -1] } },
      { t: 'Está en las mejores manos. Y cuando vuelva, le estará esperando su sitio.', g: 2, need: ['fis3', 1], fx: { pl: [c.inj[0], 3], team: 0.5 } }] },
    // --- Lo que has hecho en el club estas semanas (fichajes, ventas, técnicos, patrocinios, campañas)
    { id: 'signing', w: c => (c.feed.signing ? 2.2 : 0), q: c => `¿Qué aporta ${name(c, c.feed.signing.pid)}, el fichaje?`, o: c => {
      const pid = c.feed.signing.pid, played = c.m.pl[pid] && c.m.pl[pid].team === c.me;
      return [
        { t: played ? 'Lo han visto ustedes igual que yo: carácter y una zurda que da gusto.' : 'Necesita su rodaje, como un coche nuevo. Pero acelera que da miedo.', g: 2, fx: { pl: [pid, 3] } },
        { t: 'Con él vamos a por todo. Hacedle captura a esto.', g: 1, fx: { pl: [pid, 2], fans: 0.003, board: -0.3 } },
        { t: 'Firmar es fácil. Ahora, que se lo curre.', g: 0, fx: { pl: [pid, -3] } },
        { t: 'Le seguíamos desde hace meses. Era la pieza que le faltaba al puzle.', g: 2, need: ['neg1', 1], fx: { pl: [pid, 3], board: 0.8 } }];
    } },
    { id: 'sale', w: c => (c.feed.sale ? 2 : 0), q: c => `¿Por qué ha dejado salir a ${c.S.players[c.feed.sale.pid] ? name(c, c.feed.sale.pid) : 'uno de sus jugadores'}?`, o: () => [
      { t: 'Se va un amigo. Le deseo todo, menos contra nosotros.', g: 2, fx: { board: 0.6 } },
      { t: 'Pregunten arriba. Yo solo entreno.', g: 0, fx: { board: -1 } },
      { t: 'No se puede retener a quien ya tenía la maleta en el Bizum.', g: 1, fx: { team: -0.3 } },
      { t: 'Con ese dinero el club respira. Y el chaval que esperaba su hueco, ya lo tiene.', g: 2, need: ['neg3', 1], fx: { board: 1, team: 0.5 } }] },
    { id: 'staff', w: c => (c.feed.staff ? 1.4 : 0), q: c => `Ha incorporado a ${c.feed.staff.name} a su cuerpo técnico. ¿Por qué?`, o: () => [
      { t: 'Sabe cosas que yo no sé. Y eso, en un cuerpo técnico, vale oro.', g: 2, fx: { team: 0.5 } },
      { t: 'Porque el anterior era muy de boomer. Así de claro.', g: 0, fx: { board: -0.5 } },
      { t: 'Buen profesional. Mejor persona. Fin.', g: 1, fx: {} }] },
    { id: 'sponsor', w: c => (c.feed.sponsor ? (c.feed.sponsor.risky ? 2.4 : 1.2) : 0), q: c => c.feed.sponsor.risky ? `El nuevo patrocinador, ${c.feed.sponsor.brand}, no gusta a parte de la afición. ¿Qué opina?` : `${c.feed.sponsor.brand} entra como patrocinador. ¿Qué supone para el club?`, o: c => c.feed.sponsor.risky ? [
      { t: 'Entiendo el enfado. Yo pongo el once, no el logo de la camiseta.', g: 2, fx: { fans: 0.002 } },
      { t: 'Con poesía no se paga el alquiler. Y mira cómo está Madrid.', g: 1, fx: { board: 0.5, fans: -0.002 } },
      { t: '¿Patrocinador? Ni idea de lo que venden, la verdad.', g: 0, fx: { fans: -0.003 } },
      { t: 'Les doy mi palabra: ese dinero irá a la cantera y al estadio. Y yo vigilaré que así sea.', g: 2, need: ['neg2', 2], fx: { fans: 0.004, board: 0.8 } }] : [
      { t: 'Que el club crece. Y cuando el club crece, crecemos todos.', g: 2, fx: { board: 0.6 } },
      { t: 'Más balones, más vídeo, más de todo. Bienvenidos.', g: 1, fx: { board: 0.3 } },
      { t: 'Yo de eso sé lo mismo que de criptos.', g: 0, fx: { board: -0.5 } },
      { t: 'Que una marca así quiera nuestro escudo en el pecho dice mucho de lo que estamos construyendo.', g: 2, need: ['neg2', 1], fx: { board: 1, fans: 0.003 } }] },
    { id: 'campaign', w: c => (c.feed.campaign ? 1.2 : 0), q: c => `El club ha lanzado «${c.feed.campaign.name}». ¿Lo apoya?`, o: () => [
      { t: 'Al cien por cien. Un club sin su gente es un solar.', g: 2, fx: { fans: 0.003 } },
      { t: 'Si llena el estadio, yo mismo hago el TikTok.', g: 1, fx: {} },
      { t: 'Mi única campaña es ganar el domingo. Lo demás, contenido.', g: 0, fx: { board: -0.5 } }] },

    // --- Para completar la rueda de prensa
    { id: 'next', w: c => (c.next ? 1 : 0), q: c => `Ahora viene el ${c.next.name}. ¿Les ha mandado algún mensaje?`, o: c => [
      { t: 'Respeto, todo el del mundo. Miedo, ninguno.', g: 2, fx: { team: 0.3 } },
      { t: 'Que vayan reservando el BlaBlaCar de vuelta.', g: 1, fx: { team: 0.8, fans: 0.003, rival: 1, rivalClub: c.next } },
      { t: 'Que se preocupen ellos. Nosotros, tranqui.', g: 0, fx: { rival: 1, rivalClub: c.next, fans: 0.003 } },
      { t: 'Ya tengo tres vídeos suyos vistos. Sé dónde les duele.', g: 2, need: ['tac3', 1], fx: { team: 1, board: 0.4 } }] },
    { id: 'board', w: c => (c.S.board && c.S.board.conf < 40 ? 2 : 0.6), q: () => 'Se dice que su silla tiembla. ¿Lo nota?', o: () => [
      { t: 'Mi silla está más firme que nunca. Pregunten al vestuario.', g: 1, fx: { team: 0.3 } },
      { t: 'Mi silla me la gano cada domingo. Lo demás son tertulias.', g: 2, fx: {} },
      { t: 'Si alguien quiere mi silla, que me lo diga a la cara y no por un audio de tres minutos.', g: 0, fx: { board: -2 } },
      { t: 'Ceno con el presidente cada semana. Y de momento me sigue invitando.', g: 2, need: ['neg3', 1], fx: { board: 1.5 } }] },
    { id: 'season', w: () => 0.8, q: () => '¿Con qué sueña para lo que queda de temporada?', o: c => [
      { t: `El que nos ha pedido el club: ${String((c.S.board && c.S.board.text) || 'competir').toLowerCase()}.`, g: 2, fx: { board: 0.8 } },
      { t: 'Con ganarlo todo. Main character energy.', g: 0, fx: { fans: 0.004, board: -0.5 } },
      { t: 'Sueño despierto: con el próximo domingo.', g: 1, fx: {} },
      { t: 'Con ver a este equipo mejor cada lunes que el anterior. Lo demás vendrá solo.', g: 2, need: ['mot3', 1], fx: { team: 1, board: 0.6 } }] },
    { id: 'fans', w: () => 0.7, q: () => 'Última pregunta. ¿Algo para los que les siguen desde casa?', o: () => [
      { t: 'Que el domingo los quiero afónicos. Os necesitamos, de verdad.', g: 2, fx: { fans: 0.003 } },
      { t: 'Paciencia. Esto no es un reel de quince segundos.', g: 1, fx: {} },
      { t: 'Que vengan más, que hay asientos con más polvo que mi Tuenti.', g: 0, fx: { fans: -0.004 } },
      { t: 'Este escudo es suyo. Nosotros solo lo llevamos prestado noventa minutos.', g: 2, need: ['neg2', 2], fx: { fans: 0.007 } }] }
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
  // Frases de base (data/game/prensa-frases-*.js): otras formas de preguntar y de responder cada cosa.
  const ES = () => !TL.I18N || TL.I18N.lang === 'es';
  // Las frases extra del banco y las coletillas solo existen en castellano: en otros idiomas, las básicas (traducidas)
  const BANK = () => (ES() ? window.TL_PRENSA || {} : {});
  const bankKey = (q, c) => (q.id === 'sponsor' && c.feed.sponsor && c.feed.sponsor.risky ? 'sponsorR' : q.id);
  function jugOf(id, c) {
    const f = c.feed;
    const m = { penMiss: c.penMiss, og: c.og, red: c.reds[0], subGoal: c.subScorer, hat: c.hat, star: c.star, kid: c.kid, inj: c.inj[0], bolt: c.bolt,
      signing: f.signing && f.signing.pid, sale: f.sale && f.sale.pid, lateWin: c.lateWin };
    const pid = m[id];
    return pid != null && c.S.players[pid] ? c.S.players[pid].short : 'él';
  }
  function fill(t, q, c) {
    const f = c.feed;
    return t.replace(/\{(\w+)\}/g, (_, k) => ({
      rival: c.opp.name, next: c.next ? c.next.name : 'próximo rival', gf: c.gf, ga: c.ga, jug: jugOf(q.id, c),
      staff: f.staff ? f.staff.name : 'el nuevo', brand: f.sponsor ? f.sponsor.brand : 'la marca', camp: f.campaign ? f.campaign.name : 'la campaña'
    })[k] ?? _);
  }
  function qText(q, c) {
    const b = BANK()[bankKey(q, c)];
    c._qb = !!(b && b.q && b.q.length && Math.random() < 0.65);
    return c._qb ? fill(pick(b.q), q, c) : q.q(c);
  }
  function bankVary(all, q, c) {
    const b = BANK()[bankKey(q, c)];
    if (!b || !b.o) return;
    all.forEach((o, k) => { const v = b.o[k]; if (v && v.length && (c._qb || Math.random() < 0.8)) o.t = fill(pick(v), q, c); });
  }
  /** Las opciones que puedes dar: las de tus habilidades sustituyen a la peor; las bloqueadas se enseñan. */
  function options(S, q, c) {
    const all = q.o(c);
    bankVary(all, q, c);
    const open = all.filter(o => !o.need || lv(S, o.need[0]) >= o.need[1]);
    const locked = all.filter(o => o.need && lv(S, o.need[0]) < o.need[1]);
    let shown = open;
    if (open.length > 3) { const worst = open.slice().sort((a, b) => a.g - b.g)[0]; shown = open.filter(o => o !== worst); }
    shown.forEach(o => { o.t = dress(o.t, o.g); });
    return { shown: shown.slice().sort(() => Math.random() - 0.5), locked: locked.slice(0, 1) };
  }

  // ------------------------------------------------------------ Giros de guion: el flechazo
  // Un titular retorcido sobre una jugadora (o un jugador) puede acabar, semanas después, en un culebrón: la prensa
  // destapa que le gustas, os pillan de croquetas… y si la cosa sale bien, desbloqueas un alma especial y un supertiro
  // (en el modo fantasía) o un subidón de verdad para ese jugador. O acabas en la friendzone, que también pasa.
  const ago = (S, r) => (S.season - r.s) * 52 + (S.week - r.w);
  const romAt = (S, stage, gap) => { const r = S.romance; return r && !r.done && r.stage === stage && S.players[r.pid] && ago(S, r) >= gap; };
  const rn = c => c.S.players[c.S.romance.pid].short;
  const romStep = (d, fx) => Object.assign({ arc: S => { const r = S.romance; r.aff = (r.aff || 0) + d; r.stage++; r.w = S.week; r.s = S.season; } }, fx ? { fx } : {});
  function romFinish(S) {
    const r = S.romance, p = S.players[r.pid], club = S.clubs[S.user];
    r.done = true; r.win = (r.aff || 0) >= 2;
    if (!r.win) { if (TL.News) TL.News.add(S, 'redes', `${p.short} manda a ${S.manager} a la friendzone`, `«Es como un tío majo que me explica el fuera de juego», declara. Las redes, en shock.`, club.id, null, 'neg'); return; }
    p.mor = 100;
    let extra = '';
    if (TL.Events && TL.Events.fantasy(S)) {
      const catalog = TL.Events.DB().souls;
      const souls = Object.keys(catalog).filter(key => !catalog[key].hidden);
      const k = souls[Math.floor(Math.random() * souls.length)];
      const g = TL.Events.giveSoul(S, k);
      if (g && TL.Events.canEquip && TL.Events.canEquip(S, 'soul', g.u, p.id) !== false) { try { TL.Events.equip(S, 'soul', g.u, p.id); } catch (e) { /* va al inventario */ } }
      extra = ` Desbloqueas un alma especial y el «Disparo del Flechazo» para ${p.short}.`;
    } else {
      p.st[1] = Math.min(99, p.st[1] + 4); p.st[4] = Math.min(99, (p.st[4] || 60) + 3);
      extra = ` ${p.short} juega con una motivación que no se había visto nunca.`;
    }
    if (TL.News) TL.News.add(S, 'positivo', `Flechazo en el banquillo`, `${p.short} dedica su gol con un corazón hacia ${S.manager}. Medio país ya les ha puesto nombre de pareja.${extra}`, club.id, null, 'pos');
  }
  const ROM = [
    { id: 'rom1', w: c => (romAt(c.S, 1, 3) ? 9 : 0), q: c => `Después del lío con aquel titular, ¿ha hablado con ${rn(c)}?`, o: () => [
      Object.assign({ t: 'Le pedí perdón en persona. Se rio y me dijo que soy muy raro. Lo acepto.', g: 2 }, romStep(1, { team: 0.5 })),
      Object.assign({ t: 'No hay nada que hablar. Fue un bulo y punto.', g: 1 }, romStep(0)),
      Object.assign({ t: 'Hablamos por WhatsApp. Me dejó en visto dos días. Normal.', g: 1 }, romStep(1)),
      Object.assign({ t: 'Pregúntenle a quien escribió el titular, que parece que sabe más que yo.', g: 0 }, romStep(-1, { board: -0.5 }))] },
    { id: 'rom2', w: c => (romAt(c.S, 2, 4) ? 9 : 0), q: c => `Exclusiva: fuentes del vestuario dicen que a ${rn(c)}… le gusta usted. Dicen que dibuja corazones en la pizarra táctica.`, o: () => [
      Object.assign({ t: '😳 … Siguiente pregunta, por favor.', g: 1 }, romStep(1)),
      Object.assign({ t: 'Aquí somos profesionales. La pizarra es para flechas, no para corazones.', g: 2 }, romStep(0, { board: 0.5 })),
      Object.assign({ t: '¿Corazones? ¿De qué color? Pregunto por… cuestiones tácticas.', g: 1 }, romStep(2, { fans: 0.003 })),
      Object.assign({ t: 'Eso es mentira y ustedes lo saben.', g: 0 }, romStep(-1))] },
    { id: 'rom3', w: c => (romAt(c.S, 3, 5) ? 9 : 0), q: c => `Les han pillado a usted y a ${rn(c)} compartiendo croquetas en una tasca a las dos de la mañana. ¿Reunión táctica?`, o: () => [
      Object.assign({ t: 'Totalmente. Las croquetas eran los centrales. Hablábamos de la línea de cuatro.', g: 2 }, romStep(1)),
      Object.assign({ t: 'Mi vida privada es privada. Las croquetas, también.', g: 1 }, romStep(1)),
      Object.assign({ t: 'Me habéis pillado. Pero eran de jamón, y eso no lo voy a negar.', g: 1 }, romStep(2, { fans: 0.004 })),
      Object.assign({ t: 'Coincidencia. Tengo muchas croquetas en mi vida.', g: 0 }, romStep(-1))] },
    { id: 'rom4', w: c => (romAt(c.S, 4, 4) ? 9 : 0), q: c => (c.S.romance.aff >= 2 ? `${rn(c)} ha celebrado su último gol haciendo un corazón hacia el banquillo. ¿Algo que declarar?` : `${rn(c)} dice que usted es «como un tío majo que le explica el fuera de juego». ¿Cómo lo encaja?`), o: c => (c.S.romance.aff >= 2 ? [
      { t: 'Que me ha dedicado un gol. Y yo le dedico la temporada.', g: 2, arc: romFinish, fx: { fans: 0.005 } },
      { t: 'Que el amor y el fútbol no se mezclan… pero hoy un poquito sí.', g: 2, arc: romFinish },
      { t: 'Sin comentarios. Pero que no pare de marcar.', g: 1, arc: romFinish }] : [
      { t: 'Con deportividad. El fuera de juego se lo seguiré explicando, que no lo pilla.', g: 2, arc: romFinish },
      { t: 'Friendzone confirmada. Lo superaré con una caña.', g: 1, arc: romFinish, fx: { fans: 0.003 } },
      { t: 'Yo tampoco estaba interesado. Que conste.', g: 0, arc: romFinish, fx: { team: -0.5 } }]) }
  ];
  QS.push(...ROM);
  RESULT.push('rom1', 'rom2', 'rom3', 'rom4');

  // ------------------------------------------------------------ Giros de guion: el lío a escondidas
  // Muy de vez en cuando, con un flechazo en marcha, otra persona del vestuario también se fija en ti. Nunca hay
  // botón de «aceptar»: es la prensa la que tira del hilo con rumores, y según cómo respondas se destapa o se apaga.
  // Si se destapa: triángulo en el vestuario, moral por los suelos y alguien pide salir. Vale para entrenador con
  // jugadora y para entrenadora con jugador (los textos no dan por hecho el género).
  function affairMaybe(S) {
    const r = S.romance;
    if (S.affair || !r || r.stage < 2 || (r.done && !r.win) || Math.random() > 0.18) return;
    const sq = W.squad(S, S.user).filter(p => p.id !== r.pid && p.age >= 20);
    if (!sq.length) return;
    S.affair = { pid: pick(sq).id, stage: 1, risk: 0.25, w: S.week, s: S.season };
  }
  const affAt = (S, stage, gap) => { const a = S.affair; return a && !a.done && a.stage === stage && S.players[a.pid] && S.romance && S.players[S.romance.pid] && ago(S, a) >= gap; };
  const an = c => c.S.players[c.S.affair.pid].short;
  const affStep = (dr, fx) => Object.assign({ arc: S => { const a = S.affair; a.risk = Math.max(0, a.risk + dr); a.stage++; a.w = S.week; a.s = S.season; } }, fx ? { fx } : {});
  function affEnd(S, dr) {
    const a = S.affair, r = S.romance, club = S.clubs[S.user];
    const p = S.players[a.pid], q = r && S.players[r.pid];
    a.done = true;
    const calm = lv(S, 'pre1') * 0.08 + lv(S, 'dis3') * 0.05;
    if (Math.random() < Math.max(0.05, a.risk + dr - calm)) {
      a.exposed = true;
      const N = TL.News.fx;
      N.board(S, -3); N.fans(S, -0.006); N.teamMor(S, -2);
      if (p) { N.mor(p, -15); p.listed = true; }
      if (q) { N.mor(q, -18); if (r) { r.done = true; r.win = false; } }
      TL.News.add(S, 'polemica', `Triángulo en el vestuario del ${club.name}`, `Salen a la luz las fotos de ${S.manager} con ${p ? p.short : 'alguien de la plantilla'}. ${q ? q.short : 'El vestuario'} no se lo toma nada bien y ${p ? p.short : 'una de las partes'} pide salir del club.`, club.id, a.pid, 'neg');
      return 'Mañana estará en todas partes.';
    }
    TL.News.add(S, 'redes', 'El rumor se apaga', `Nadie consigue una sola foto. Lo del técnico del ${club.name} se queda en cotilleo de tertulia.`, club.id, null, 'pos');
    return 'El rumor se desinfla. Nadie se lo compra.';
  }
  const AFF = [
    { id: 'aff1', w: c => (affAt(c.S, 1, 2) ? 9 : 0), q: c => `Dicen que le han visto salir de un hotel con ${an(c)}, y no es ${rn(c)}. ¿Qué hay de cierto?`, o: () => [
      Object.assign({ t: 'Concentración del equipo. Hay hoteles y hay rumores, y yo solo conozco los primeros.', g: 2 }, affStep(-0.08)),
      Object.assign({ t: 'Era una reunión de nutrición. Muy… nutritiva.', g: 1 }, affStep(0.15, { fans: 0.002 })),
      Object.assign({ t: 'Mi vida privada es mía. Y punto.', g: 1 }, affStep(0.05)),
      Object.assign({ t: 'Ustedes ven cosas donde no las hay. Vayan al oculista.', g: 0 }, affStep(0.1, { board: -0.5 }))] },
    { id: 'aff2', w: c => (affAt(c.S, 2, 3) ? 9 : 0), q: c => `${rn(c)} y ${an(c)} no se hablan en los entrenamientos. ¿Hay mal rollo en el vestuario?`, o: () => [
      Object.assign({ t: 'Discusiones de fútbol: por dentro o por fuera. Lo arreglo yo.', g: 2 }, affStep(-0.06, { team: 0.3 })),
      Object.assign({ t: 'Cada uno tiene sus amistades. No hace falta irse de cañas con todo el mundo.', g: 1 }, affStep(0.04)),
      Object.assign({ t: 'Pregúntenselo directamente.', g: 0 }, affStep(0.15)),
      Object.assign({ t: 'Aquí se viene a competir. Lo de fuera se queda fuera.', g: 2, need: ['dis3', 1] }, affStep(-0.12))] },
    { id: 'aff3', w: c => (affAt(c.S, 3, 3) ? 9 : 0), q: c => `Última hora: un paparazzi asegura tener fotos suyas con ${an(c)}. ¿Algo que decir antes de que salgan?`, o: () => [
      { t: 'Que las publiquen. Saldré yo con cara de cansado y un café. Poco más.', g: 2, arc: S => { S._affRx = affEnd(S, -0.1); } },
      { t: 'Que se compren una cámara mejor.', g: 1, arc: S => { S._affRx = affEnd(S, 0.05); } },
      { t: 'Sin comentarios.', g: 1, arc: S => { S._affRx = affEnd(S, 0); } },
      { t: 'Hablaré con mis abogados esta misma noche.', g: 0, arc: S => { S._affRx = affEnd(S, 0.15); }, fx: { board: -0.5 } }] }
  ];
  QS.push(...AFF);
  RESULT.push('aff1', 'aff2', 'aff3');

  // ------------------------------------------------------------ Variedad
  // Cada pregunta y cada respuesta se monta con entradillas y coletillas al azar (según el tono), así que entre las
  // ~150 frases base y estas piezas salen miles de combinaciones y nunca suena igual dos veces.
  const Q_IN = ['Buenas noches, míster.', 'Una rápida:', 'Desde la radio:', 'Para los que nos ven en streaming:', 'Le pregunto lo que pregunta todo el mundo en X:',
    'Sin rodeos:', 'Ojo, que viene curva:', 'Hola, hola.', 'Con todo el cariño:', 'La pregunta del millón:', 'Vamos al lío:', 'Para el directo de Twitch:',
    'Llevo toda la semana queriendo preguntarle esto:', 'Perdone que insista:', 'Mi abuela me ha pedido que le pregunte:', 'Rapidito, que cierra la edición:',
    'Míster, sin filtro:', 'Una de las de verdad:', 'Para el podcast:', 'Le leo una pregunta de un oyente:'];
  const IN = {
    2: ['Mira:', 'A ver:', 'Te soy sincero:', 'Real:', 'Escúchame bien:', 'Con la mano en el corazón:', 'Lo digo y me quedo tan ancho:', 'Hoy toca decirlo:', 'Fuera de bromas:', 'Sin postureo:'],
    1: ['Bueno…', 'Pues mira:', 'Hmm.', 'Qué quieres que te diga:', 'En plan:', 'A ver cómo lo digo:', 'Uf.'],
    0: ['Pues mira, sin anestesia:', 'Te lo digo claro:', 'Ya que preguntas:', 'Perdón, pero lo digo:', 'Vale, voy:', 'Sin pelos en la lengua:', 'Agárrate:']
  };
  const OUT = {
    2: ['Y punto.', 'Así de fácil.', 'Siguiente.', 'Lo firmo.', 'Eso es todo, amigos.', 'Grábenlo.', 'Y lo saben.', 'Fin del hilo.', 'Con cariño.', 'Así somos.'],
    1: ['Ya veremos.', 'Y poco más.', 'Es lo que hay.', 'No sé, la verdad.', 'Pues eso.', 'Lo que yo te diga.', 'Ahí lo dejo.'],
    0: ['Y el que se pique, ajos come.', 'Tal cual.', 'Que se escuche bien.', 'Y no me arrepiento.', 'Clip para TikTok, de nada.', 'Pónganlo en grande.', 'Lo he dicho y lo repito.']
  };
  function dress(t, g) {
    if (!ES()) return t;
    const k = g >= 2 ? 2 : g === 1 ? 1 : 0;
    let out = t;
    if (Math.random() < 0.35) out = pick(IN[k]) + ' ' + out;
    if (Math.random() < 0.3 && /[.!?»]$/.test(out)) out = out + ' ' + pick(OUT[k]);
    return out;
  }
  const dressQ = q => (ES() && Math.random() < 0.45 ? pick(Q_IN) + ' ' + q.charAt(0).toLowerCase() + q.slice(1) : q);

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
    const ps = S.prensaStats || (S.prensaStats = { n: 0, wins: 0, bestStreak: 0, twists: 0, twistOk: 0, rep: 50, skipped: 0 });
    ps.n++; ps.bestStreak = Math.max(ps.bestStreak, st.best);
    if (st.twisted) { ps.twists++; if (st.log.twistOk) ps.twistOk++; }
    const badN = st.marks.filter(x => x === 0).length;
    ps.rep = U.clamp(ps.rep + (st.best >= NEED_STREAK ? 6 : -2 - badN * 2), 0, 100);
    if (st.best >= NEED_STREAK) ps.wins++;
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
    if (log.twistBad) out.push(`Mañana abrirán con «${log.twistBad}».`);
    if (log.twistOk) out.push('Intentaron retorcer tus palabras, pero no coló.');
    if (log.fine) out.push(`Competición abre expediente por tus declaraciones: multa de ${U.money(log.fine)}.`);
    return out;
  }

  // ------------------------------------------------------------ Muletillas
  // Tu frase de la casa. La primera rueda de prensa puedes inventártela; luego, cada vez que la sueltas, se hace más
  // famosa (sobre todo si ganas). La fama desbloquea cosas: se hace viral, camisetas con la frase, un anuncio de
  // televisión, la grada te la canta… Pero si la repites después de una paliza, te convierten en meme.
  const MULES = [
    { id: 'bocata', t: 'Partido a partido… y bocadillo a bocadillo.', shirt: 'BOCADILLO A BOCADILLO' },
    { id: 'sudar', t: 'Aquí se viene a sudar la camiseta, no a lucirla.', shirt: 'A SUDARLA' },
    { id: 'carrerilla', t: 'Ni un paso atrás. Ni para coger carrerilla.', shirt: 'NI PARA COGER CARRERILLA' },
    { id: 'memoria', t: 'El balón no tiene memoria. Yo tengo capturas.', shirt: 'YO TENGO CAPTURAS' },
    { id: 'abuela', t: 'Esto lo ganaba hasta mi abuela, y mi abuela juega al bingo.', shirt: 'MI ABUELA JUEGA AL BINGO' },
    { id: 'cafe', t: 'Mañana, café cargado y a trabajar.', shirt: 'CAFÉ CARGADO' },
    { id: 'tortilla', t: 'El fútbol es como la tortilla: con cebolla y con calma.', shirt: 'CON CEBOLLA Y CON CALMA' },
    { id: 'aura', t: 'Este equipo tiene aura, y el aura no se entrena.', shirt: '+1000 DE AURA' },
    { id: 'pancho', t: 'Ni tan mal. Pero ni tan bien. Pero ni tan mal.', shirt: 'NI TAN MAL' },
    { id: 'cana', t: 'Se gana, se celebra con una caña y el lunes, a currar.', shirt: 'CAÑA Y A CURRAR' },
    { id: 'lobos', t: 'Aquí no hay red flags, solo bandera blanca para el rival.', shirt: 'SOLO GREEN FLAGS' }
  ];
  const STEPS = [
    { at: 3, id: 'viral', title: f => `«${f}» se hace viral`, text: 'Tu frase es trend en TikTok. Hasta los críos la dicen en el patio y alguien ya la ha remezclado con reguetón.', fx: S => TL.News.fx.fans(S, 0.006) },
    { at: 6, id: 'shirts', title: () => 'Camisetas con tu frase', text: 'La tienda del club agota una camiseta con tu muletilla.', fx: S => { S.clubs[S.user].cash += 60000; } },
    { at: 10, id: 'ad', title: () => 'Te llaman para un anuncio', text: 'Una marca de patatas fritas te ficha para un anuncio. Tu cara de póker en el plató ya es un meme, pero pagan bien.', fx: S => { S.clubs[S.user].cash += 180000; TL.News.fx.board(S, 1); } },
    { at: 15, id: 'chant', title: () => 'La grada canta tu frase', text: 'El fondo ya tiene cántico nuevo. El vestuario lo sabe y se viene arriba.', fx: S => { TL.News.fx.fans(S, 0.008); TL.News.fx.teamMor(S, 2); } }
  ];
  const muleOf = S => S.mule && MULES.find(x => x.id === S.mule.id);
  /** La sueltas en esta pregunta: lo que pasa depende de cómo ha ido el partido. */
  function useMule(S, c) {
    const mu = S.mule, f = muleOf(S);
    mu.uses = (mu.uses || 0) + 1;
    let g, react;
    if (c.diff > 0) { mu.fame += 1.5; g = 2; react = 'La sala se ríe. Alguien ya lo está subiendo a TikTok.'; }
    else if (c.diff === 0) { mu.fame += 1; g = 1; react = 'Sonrisas en la sala.'; }
    else if (c.diff <= -3) { mu.fame += 0.5; mu.meme = (mu.meme || 0) + 1; g = 0; react = 'Silencio incómodo. Cringe máximo: eso acaba en meme.'; }
    else { mu.fame += 0.5; g = 1; react = 'Alguna risa nerviosa.'; }
    if (mu.merch && c.diff > 0) { const k = Math.round(4000 + Math.random() * 6000); S.clubs[S.user].cash += k; R.log.merch = (R.log.merch || 0) + k; }
    if (mu.meme === 2 && !mu.memed && TL.News) { mu.memed = true; TL.News.add(S, 'polemica', `«${f.t}», el meme de la jornada`, `Las redes se ceban con la frase de ${S.manager} tras la derrota.`, S.user, null, 'neg'); TL.News.fx.board(S, -1); }
    return { g, react };
  }
  function muleSteps(S) {
    const mu = S.mule, f = muleOf(S), out = [];
    if (!mu || !f) return out;
    mu.got = mu.got || [];
    for (const st of STEPS) if (mu.fame >= st.at && !mu.got.includes(st.id)) {
      mu.got.push(st.id); if (st.id === 'shirts') mu.merch = true;
      st.fx(S);
      if (TL.News) TL.News.add(S, 'club', st.title(f.t), st.text, S.user, null, 'pos');
      out.push(`${st.title(f.t)}. ${st.text}`);
    }
    return out;
  }

  // ------------------------------------------------------------ Titulares retorcidos
  // De vez en cuando (no siempre) un medio sensacionalista coge una respuesta normal y la retuerce hasta hacerla
  // parecer otra cosa. Te repregunta con el titular ya escrito y tienes que apagar el fuego… o echarle gasolina.
  const TABLOIDS = ['El Chismoso', 'Titular Fácil', 'ClickGol', 'La Lupa Rosa', 'Al Rojo Deportivo'];
  const SLY = ['Bruno Rapiña', 'Sonia Morbo', 'Ramón Cebo', 'Vero Trending'];
  function twist(S, a, c) {
    const co = S.manager, t = a.t.toLowerCase(), F = S.gender === 'F';
    const pid = a.fx && a.fx.pl && S.players[a.fx.pl[0]] ? a.fx.pl[0] : (c.star != null ? c.star : c.guest);
    const nm = pid != null && S.players[pid] ? S.players[pid].short : 'una futbolista';
    const out = [];
    if (F && pid != null && /(físic|fuerte|forma|cuerpo|espectacular|zurda|pulm|hambre|valorad|talento|diferente)/.test(t + ' ' + (a.fx && a.fx.pl ? 'valorad' : '')))
      out.push(`${co}, en el punto de mira por sus comentarios sobre el físico de ${nm}`, `«¿Espectacular?»: la frase de ${co} sobre ${nm} que incomoda al vestuario`);
    R.twistPid = pid; R.twistHot = F && pid != null && out.length >= 2;
    if (a.fx && a.fx.pl && a.fx.pl[1] > 0) out.push(`${co} desprecia al resto: «aquí solo hay ${F ? 'una' : 'uno'}»`);
    if (a.fx && a.fx.pl && a.fx.pl[1] < 0) out.push(`${co} humilla a ${nm} delante de toda España`);
    if (/(culpa|mía|mio|asumo|perdón|disculpa|equivoqu)/.test(t)) out.push(`${co} entona el mea culpa: ¿preparando la despedida?`);
    if (/(caf|cena|bocadillo|tortilla|patatas|desayun)/.test(t)) out.push(`${co} reconoce que el equipo funciona «a base de café» y Sanidad toma nota`);
    if (/(respeto|gran equipo|mérito)/.test(t)) out.push(`${co} se arrodilla ante el ${c.opp.name}`);
    if (/(árbitro|colegiado|amarillo|repetición)/.test(t)) out.push(`${co} insinúa un complot arbitral contra su club`);
    if (/(afición|grada|gente|casa)/.test(t)) out.push(`${co} pone deberes a su propia afición`);
    if (/(club|directiva|presidente|arriba|dinero)/.test(t)) out.push(`Guerra abierta: ${co} lanza un mensaje a la directiva`);
    out.push(`${co} deja caer que el vestuario está roto`, `Lectura entre líneas: ${co} ya mira a otro banquillo`);
    const spec = out.slice(0, -2);
    return pick(spec.length && Math.random() < 0.85 ? spec : out.slice(-2));
  }
  function showTwist(a) {
    const S = R.c.S, head = twist(S, a, R.c);
    R.twisted = head;
    const panel = document.querySelector('#prensa .pr-panel');
    panel.querySelector('.pr-q').innerHTML = `<small>${esc(pick(SLY))} · ${esc(pick(TABLOIDS))} <span class="pr-n">repregunta</span></small>`
      + `<span class="pr-head">${esc(head)}</span> Así titularemos mañana. ¿Algo que añadir?`;
    const calm = lv(S, 'pre1') >= 1 || lv(S, 'dis3') >= 1;
    const opts = [
      { t: 'Lo tienen grabado. Pongan la frase entera y que la gente juzgue.', cat: 'tec', g: calm ? 2 : 1, kill: calm ? 0.8 : 0.45, fx: { board: 0.3 } },
      { t: 'Ustedes no hacen periodismo, hacen ficción. Y mala.', cat: 'pol', g: 1, kill: 0.25, fx: { fans: 0.004, board: -0.8 } },
      { t: 'Si quieren, también les firmo la portada.', cat: 'hu', g: 0, kill: 0.1, fx: { fans: 0.002 } }
    ];
    const pro = { t: 'Mi jefe de prensa hablará con su director esta misma noche.', cat: 'hum', g: 2, kill: 1, fx: { board: 0.5 }, need: ['pre2', 1] };
    const open = lv(S, 'pre2') >= 1;
    if (open) opts.push(pro);
    R.cur = opts.sort(() => Math.random() - 0.5);
    R.rep = { n: pick(SLY), m: pick(TABLOIDS), t: 'sensa', g: 0 };
    meter();
    panel.querySelector('.pr-as').innerHTML = R.cur.map((o, k) => btnHtml(o, k)).join('')
      + (open ? '' : `<button class="btn block pr-a locked" disabled><span>${esc(pro.t)}</span><small>Requiere: ${esc(skillName('pre2'))} 1</small></button>`);
    const stage = document.querySelector('#prensa .pr-stage');
    if (stage) { stage.classList.remove('murmur'); void stage.offsetWidth; stage.classList.add('murmur'); }
    burst(9); react(RX.scoop, 4);
    R.temp += 8; meter();
    startClock();
  }
  function settleTwist(S, a) {
    const club = S.clubs[S.user];
    if (Math.random() < (a.kill || 0)) { R.log.twistOk = R.twisted; return 'El titular se desinfla. Nadie se lo compra.'; }
    if (TL.News) TL.News.add(S, 'polemica', R.twisted, `${pick(TABLOIDS)} saca de contexto unas palabras del técnico de ${club.name}. Las redes, divididas.`, club.id, null, 'neg');
    TL.News.fx.board(S, -0.8); TL.News.fx.fans(S, -0.002);
    R.log.twistBad = R.twisted;
    const hot = R.twistHot && /físico|Espectacular/.test(R.twisted);
    if (!S.romance && R.twistPid != null && S.players[R.twistPid] && S.players[R.twistPid].club === S.user && (hot ? Math.random() < 0.3 : Math.random() < 0.04))
      S.romance = { pid: R.twistPid, stage: 1, w: S.week, s: S.season, aff: 0 };
    return 'Mañana estará en todas partes.';
  }

  // ------------------------------------------------------------ Escena y minijuego
  // Cada respuesta tiene un estilo (humilde, protectora, exigente, polémica, evasiva, técnica, ambiciosa, humor) que
  // gusta a unos y molesta a otros (vestuario, directiva, afición, sala). Esa semana necesitas contentar sobre todo
  // a uno de ellos. Cada estilo cansa la cabeza: si repites, cuesta más, y los recursos fáciles (las evasivas) se
  // agotan enseguida. Los periodistas tienen carácter y memoria, repreguntan si les das cuerda, hay tiempo para
  // contestar y la sala se calienta. Antes de empezar eliges quién te acompaña: según su forma de ser, te salva una
  // pregunta… o te la lía. Al día siguiente, la portada.
  const CATS = {
    hum: { n: 'Humilde', ic: '🙏', cost: 12, cap: 3, aud: { vest: 1, dir: 1, afi: 0, sala: 0 } },
    pro: { n: 'Protectora', ic: '🛡️', cost: 12, cap: 3, aud: { vest: 2, dir: -0.5, afi: 0.5, sala: 0 } },
    dur: { n: 'Exigente', ic: '🔨', cost: 14, cap: 2, aud: { vest: -2, dir: 1, afi: 0.5, sala: 1 } },
    pol: { n: 'Polémica', ic: '🔥', cost: 10, cap: 2, aud: { vest: 0.5, dir: -1.5, afi: 1.5, sala: 2 } },
    eva: { n: 'Evasiva', ic: '🤐', cost: 20, cap: 2, aud: { vest: 0, dir: 0, afi: -0.5, sala: -2 } },
    tec: { n: 'Técnica', ic: '🧠', cost: 16, cap: 3, aud: { vest: 0.5, dir: 1, afi: 0, sala: 0.5 } },
    amb: { n: 'Ambiciosa', ic: '🚀', cost: 10, cap: 2, aud: { vest: 1, dir: -0.5, afi: 1.5, sala: 1 } },
    hu: { n: 'Humor', ic: '😂', cost: 8, cap: 2, aud: { vest: 0.5, dir: 0, afi: 1, sala: 1.5 } }
  };
  const AUD = { vest: 'el vestuario', dir: 'la directiva', afi: 'la afición', sala: 'la prensa' };
  const AUD_T = { vest: 'Vestuario', dir: 'Directiva', afi: 'Afición', sala: 'Prensa' };
  function catOf(o) {
    if (o.cat) return o.cat;
    const fx = o.fx || {}, t = (o.t || '').toLowerCase();
    if (o.need) return /^tac|^can|^fis|^neg/.test(o.need[0]) ? 'tec' : /^mot/.test(o.need[0]) ? 'pro' : 'hum';
    if (fx.fine || fx.rival || /árbitro|robad|colegiado|amarillo|vergüenza|escándalo/.test(t)) return 'pol';
    if ((fx.pl && fx.pl[1] < 0) || (fx.team || 0) < -0.4) return 'dur';
    if (/jaja|bocadillo|croqueta|caña|tiktok|abuela|netflix|wallapop|ryanair|spotify|speedrun|unboxing/.test(t)) return 'hu';
    if (fx.pl && fx.pl[1] > 0) return 'pro';
    if (o.g === 1 && !Object.keys(fx).length) return 'eva';
    if (/siguiente|no voy a|prefiero no|sin comentarios|no tengo nada|no entro/.test(t)) return 'eva';
    if (fx.fans && !(fx.board > 0)) return 'amb';
    if ((fx.board || 0) > 0) return /pizarra|detall|sistema|líneas|presión|transicion|plan/.test(t) ? 'tec' : 'hum';
    if ((fx.team || 0) > 0) return 'pro';
    return 'eva';
  }
  // Periodistas: tipo (qué les gusta) y memoria entre ruedas de prensa
  const REPS = [
    ['Marta Ibarra', 'Diario Deportivo', 'serio'], ['Luis Cardoso', 'Radio Estadio', 'local'], ['Nerea Sanz', 'La Grada TV', 'local'],
    ['Pablo Ferrán', 'El Balcón', 'serio'], ['Lucía Mendo', 'Mundo Gol', 'serio'], ['Óscar Rial', 'Pizarra FM', 'serio'],
    ['Irene Valdés', 'Onda Fútbol', 'local'], ['Bruno Rapiña', 'El Chismoso', 'sensa'], ['Sonia Morbo', 'ClickGol', 'sensa'],
    ['Ramón Cebo', 'Titular Fácil', 'sensa'], ['Vero Trending', 'La Lupa Rosa', 'sensa'], ['Hugo Ledesma', 'Al Larguero Digital', 'rival']
  ];
  const REP_T = { serio: 'serio', local: 'de la casa', sensa: 'sensacionalista', rival: 'del rival' };
  const PREF = {
    serio: { hum: 1, pro: 0, dur: 0, pol: -2, eva: -1, tec: 2, amb: -1, hu: -1 },
    local: { hum: 1, pro: 2, dur: -2, pol: 1, eva: -1, tec: 0, amb: 1, hu: 2 },
    sensa: { hum: -1, pro: 0, dur: 2, pol: 2, eva: -2, tec: -1, amb: 1, hu: 1 },
    rival: { hum: 2, pro: 0, dur: 0, pol: -1, eva: 0, tec: 0, amb: -2, hu: -1 }
  };
  const mem = S => S.pressMem || (S.pressMem = {});
  // Repreguntas según el estilo de tu respuesta
  const FOLLOW = {
    eva: ['Insisto, míster: ¿no va a contestar a la pregunta?', [
      { t: 'Vale, se lo digo: no estuvimos finos y lo sabemos.', cat: 'hum', g: 2, fx: { board: 0.3 } },
      { t: 'Ya he contestado. Siguiente, por favor.', cat: 'eva', g: 0 },
      { t: 'Le contesto con datos: perdimos los duelos y eso no se negocia.', cat: 'tec', g: 2 }]],
    pol: ['¿Está acusando directamente al árbitro?', [
      { t: 'Digo lo que ha visto todo el estadio. Y lo mantengo.', cat: 'pol', g: 1, fx: { fine: [0.45, 5000], fans: 0.003 } },
      { t: 'No acuso a nadie. Pido que se revise y ya está.', cat: 'hum', g: 2, fx: { board: 0.4 } },
      { t: 'Le acuso de tener un mal día. Como todos alguna vez.', cat: 'hu', g: 1 }]],
    dur: ['¿Está diciendo que alguno no tiene nivel para este equipo?', [
      { t: 'Digo que aquí se exige. El que no lo entienda, lo entenderá.', cat: 'dur', g: 1, fx: { team: -1 } },
      { t: 'No. Digo que todos podemos dar más, empezando por mí.', cat: 'hum', g: 2, fx: { team: 0.5 } },
      { t: 'Lo que pasa en el vestuario se queda en el vestuario.', cat: 'eva', g: 1 }]],
    amb: ['¿Y si no lo consigue? ¿Se iría?', [
      { t: 'Si no lo consigo, que me lo digan. Pero lo vamos a conseguir.', cat: 'amb', g: 1, fx: { fans: 0.003 } },
      { t: 'Me iría con la cabeza alta y el trabajo hecho.', cat: 'hum', g: 2, fx: { board: 0.4 } },
      { t: 'Eso es una pregunta para mayo. Estamos en otro mes.', cat: 'hu', g: 1 }]],
    pro: ['¿Aunque haya fallado? ¿No es demasiado blando con los suyos?', [
      { t: 'Blando no. Justo. Al que se equivoca, se le corrige dentro.', cat: 'tec', g: 2, fx: { board: 0.3 } },
      { t: 'Con los míos, siempre. Que se metan conmigo, no con ellos.', cat: 'pro', g: 1, fx: { team: 0.8, board: -0.3 } },
      { t: 'Si quiere un sargento, hay películas muy buenas.', cat: 'hu', g: 1 }]],
    hum: ['¿No le preocupa parecer débil ante el vestuario?', [
      { t: 'Reconocer errores es de fuertes. Débil es esconderse.', cat: 'hum', g: 2, fx: { team: 0.4 } },
      { t: 'Débil no. Y el domingo lo verán.', cat: 'amb', g: 1, fx: { fans: 0.002 } },
      { t: 'Prefiero no seguir por ahí.', cat: 'eva', g: 0 }]],
    tec: ['Eso suena a excusa de pizarra. ¿Y la actitud?', [
      { t: 'La actitud ha sido buena. El problema estaba donde le digo.', cat: 'tec', g: 2 },
      { t: 'Ahí tiene razón: hubo jugadores que no estuvieron.', cat: 'dur', g: 1, fx: { team: -1 } },
      { t: 'La actitud se entrena. Y la vamos a entrenar.', cat: 'hum', g: 2, fx: { board: 0.3 } }]],
    hu: ['¿Le parece momento para bromas?', [
      { t: 'Tiene razón. Perdonen. Hoy no tocaba.', cat: 'hum', g: 2, fx: { board: 0.3 } },
      { t: 'Si no me río, lloro. Y llorar sale caro.', cat: 'hu', g: 1, fx: { fans: 0.002 } },
      { t: 'Siguiente pregunta.', cat: 'eva', g: 0 }]]
  };
  // Acompañantes: su forma de ser decide si te salvan o te la lían
  const PERS = {
    lider: { n: 'Líder', d: 'Comodín: contesta por ti una pregunta y calma la sala.' },
    profesional: { n: 'Profesional', d: 'Comodín: se queda una pregunta y responde sin sorpresas.' },
    bromista: { n: 'Bromista', d: 'Comodín: un chiste que destensa la sala (a la prensa seria no le hace gracia).' },
    bocazas: { n: 'Bocazas', d: 'Puede soltar lo que no debe en cualquier momento. Comodín: una frase que levanta a la grada.' },
    timido: { n: 'Tímido', d: 'No ayuda. Si le preguntan a él, se bloquea.' }
  };
  function persOf(S, p) {
    const pr = TL.Social && TL.Social.profile ? (() => { try { return TL.Social.profile(S, p); } catch (e) { return null; } })() : null;
    const tx = JSON.stringify(pr || {}).toLowerCase();
    if (/líder|lider|capit/.test(tx)) return 'lider';
    if (/bromist|payas|gracios/.test(tx)) return 'bromista';
    if (/tímid|timid|introvert/.test(tx)) return 'timido';
    if (/ego|bocaz|polém|conflict/.test(tx)) return 'bocazas';
    return ['lider', 'profesional', 'bromista', 'bocazas', 'timido'][(p.id * 7 + (p.age || 0)) % 5];
  }

  /** El jugador que te acompaña lleva la primera equipación del club (oficial si la conocemos). */
  function kitCss(club) {
    const K = club.kit || (window.TL_KITS && window.TL_KITS[club.name]);
    const c1 = K ? K[0][0] : club.c1 || '#888', c2 = K ? (K[0][1] || K[0][0]) : (club.c2 && club.c2 !== '#111' ? club.c2 : club.c1), p = K ? K[0][2] || '' : '';
    if (c1 === c2 || !p) return { bg: c1, ring: c2 === c1 ? 'rgba(255,255,255,.85)' : c2 };
    const bg = {
      s: `repeating-linear-gradient(90deg, ${c1} 0 14%, ${c2} 14% 28%)`,
      h: `repeating-linear-gradient(0deg, ${c1} 0 16%, ${c2} 16% 32%)`,
      c: `linear-gradient(90deg, ${c1} 39%, ${c2} 39% 61%, ${c1} 61%)`,
      v: `linear-gradient(90deg, ${c1} 50%, ${c2} 50%)`,
      x: `linear-gradient(135deg, ${c1} 38%, ${c2} 38% 62%, ${c1} 62%)`,
      k: `conic-gradient(${c1} 25%, ${c2} 0 50%, ${c1} 0 75%, ${c2} 0) 0 0 / 50% 50%`
    }[p] || c1;
    return { bg, ring: c2 };
  }
  const R = { c: null, qs: [], k: 0, log: {}, timers: [], raf: 0, onDone: null };
  function el(id) { return document.getElementById(id); }
  const timerOn = () => { try { return localStorage.getItem('touchline.prTimer') !== '0'; } catch (e) { return true; } };

  function open(S, m, me, onDone) {
    affairMaybe(S);
    const c = context(S, m, me);
    R.c = c; R.qs = questions(c); R.k = 0; R.log = {}; R.onDone = onDone || null;
    R.muleUsed = false; R.twisted = null; R.inTwist = false; R.fu = 0; R.follow = null;
    R.en = 100 + 15 * lv(S, 'pre1'); R.uses = {}; R.temp = 25; R.aud = { vest: 0, dir: 0, afi: 0, sala: 0 };
    R.bigForce = null; R.nuked = null; R.ban = false; R.best = 0; R.streak = 0; R.goodN = 0; R.badN = 0; R.big = null; R.walk = false; R.joker = 1; R.comp = null;
    // Lo que más necesitas esta semana: lo que peor está
    const conf = S.board.conf, fan = TL.Hud ? TL.Hud.fansOpinion(S) : 50, mood = TL.Hud ? TL.Hud.squadMood(S) : 60;
    R.prio = conf <= fan && conf <= mood ? 'dir' : fan <= mood ? 'afi' : 'vest';
    for (const k in c.feed) c.feed[k].asked = true;
    if (!R.qs.length) { if (onDone) onDone(); return; }
    const club = S.clubs[S.user], [c1, c2] = U.clubColors(club.name);
    R.cols = [c1, c2];
    const root = document.createElement('div');
    root.id = 'prensa'; root.className = 'prensa';
    root.innerHTML = `<div class="pr-stage" style="--c1:${c1};--c2:${c2}">
        <img class="pr-bg" src="assets/prensa/sala.webp" alt="">
        <canvas class="pr-wall"></canvas>
        <div class="pr-tv"><div class="pr-ad"></div></div>
        <div class="pr-dot pr-l" title="Jefe de prensa"><i></i><b>Prensa</b></div>
        <div class="pr-dot pr-c me" title="${esc(S.manager)}"><i></i><b>Tú</b></div>
        <img class="pr-table" src="assets/prensa/mesa.webp" alt="">
        <canvas class="pr-light"></canvas>
        <div class="pr-crowd">${Array.from({ length: 9 }, (_, k) => `<i style="--h:${(k * 47) % 360};--x:${4 + k * 11.5}%;--s:${0.85 + ((k * 37) % 30) / 100}"></i>`).join('')}</div>
        <div class="pr-say"></div>
        <div class="pr-flash"></div>
        <div class="pr-live"><i></i>EN DIRECTO</div>
      </div>
      <div class="pr-panel"><div class="pr-meter"></div><div class="pr-q"></div><div class="pr-as"></div></div>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('on'));
    startFx(root, c1, c2, club);
    lightInit(root);
    requestAnimationFrame(() => fitTv(root));
    R.timers.push(setTimeout(ambient, 900));
    window.addEventListener('resize', () => { const r = document.getElementById('prensa'); if (r) fitTv(r); });
    pickCompanion();
  }

  // ---- Antes de empezar: ¿quién te acompaña?
  function pickCompanion() {
    const c = R.c, S = c.S, sq = W.squad(S, S.user).filter(p => !(p.inj > 0));
    const notes = c.m.lastRatings || {};
    const cand = [];
    const add = (p, why) => { if (p && !cand.some(x => x.p.id === p.id)) cand.push({ p, why }); };
    if (c.guest != null) add(S.players[c.guest], 'Mejor del partido');
    add(sq.slice().sort((a, b) => (b.age - a.age) || (b.ovr - a.ovr))[0], 'Capitán');
    add(sq.slice().sort((a, b) => b.ovr - a.ovr)[0], 'Estrella');
    add(sq.filter(p => notes[p.id] != null).sort((a, b) => notes[a.id] - notes[b.id])[0], 'Ha tenido un mal día');
    add(pick(sq), 'Le apetecía venir');
    const H = S.pressComp || (S.pressComp = {}), now = S.season * 60 + S.week;
    const tired = p => { const h = H[p.id]; return h ? Math.max(0, h.n - Math.floor((now - h.last) / 2)) : 0; };
    R.cand = cand.slice(0, 4).map(x => ({ ...x, pers: persOf(S, x.p), times: tired(x.p) }));
    const lim = 3 + lv(S, 'pre3');
    const panel = document.querySelector('#prensa .pr-panel');
    panel.querySelector('.pr-meter').innerHTML = '';
    panel.querySelector('.pr-q').innerHTML = `<small>Antes de salir</small>¿Quién te acompaña en la sala?
      <span class="pr-prio">Esta semana te conviene contentar a <b>${esc(AUD[R.prio])}</b>.</span>`;
    panel.querySelector('.pr-as').innerHTML = R.cand.map((x, k) => { const no = x.times >= lim; return `<button class="btn block pr-a pr-comp ${no ? 'tired' : ''}" data-act="pr-comp" data-k="${k}" ${no ? 'disabled' : ''}>
        <span><b>${esc(x.p.short)}</b> · ${esc(x.why)} · <i class="pr-pers">${esc(PERS[x.pers].n)}</i></span><small>${esc(no ? 'Se niega a volver: está harto de micrófonos.' : x.times >= lim - 1 ? 'Ya ha venido mucho: saldrá quemado y de mal humor.' : x.times >= 1 ? 'Repite: se desgastará más que la última vez.' : PERS[x.pers].d)}</small></button>`; }).join('')
      + '<button class="btn block ghost pr-a" data-act="pr-comp" data-k="-1">Voy solo</button>';
  }
  A['pr-comp'] = b => {
    const k = +b.dataset.k, S = R.c.S;
    R.comp = k >= 0 ? R.cand[k] : null;
    if (R.comp) {
      const st = document.querySelector('#prensa .pr-stage');
      const kc = kitCss(S.clubs[S.user]);
      st.insertAdjacentHTML('beforeend', `<div class="pr-dot pr-r" title="${esc(R.comp.p.name)}"><i style="background:${kc.bg};box-shadow:0 0 0 3px ${kc.ring}, 0 4px 10px rgb(0 0 0 / .45)"></i><b>${esc(R.comp.p.short)}</b></div>`);
      const tb = st.querySelector('.pr-table'); if (tb) st.appendChild(tb); const lt = st.querySelector('.pr-light'); if (lt) st.appendChild(lt);
      const cw = st.querySelector('.pr-crowd'); if (cw) st.appendChild(cw); const sy = st.querySelector('.pr-say'); if (sy) st.appendChild(sy);
      R.c.guest = R.comp.p.id;
      const H = S.pressComp || (S.pressComp = {}), h = H[R.comp.p.id] || { n: 0, last: 0 };
      H[R.comp.p.id] = { n: (R.comp.times || 0) + 1, last: S.season * 60 + S.week };
      if (R.comp.times >= 2 + lv(S, 'pre3') - 1) R.comp.grumpy = true;
      if (R.comp.pers === 'timido') R.joker = 0;
    } else R.joker = 0;
    ask();
  };

  // ---- Marcadores: cabeza (agotamiento), temperatura de la sala, tiempo y a quién estás contentando
  function meter() {
    const el0 = document.querySelector('#prensa .pr-meter');
    if (!el0) return;
    const en = Math.max(0, Math.round(R.en)), tp = Math.min(100, Math.round(R.temp));
    const aud = Object.keys(R.aud).map(k => `<span class="pr-aud ${k === R.prio ? 'prio' : ''} ${R.aud[k] > 0.4 ? 'up' : R.aud[k] < -0.4 ? 'dn' : ''}" title="${AUD_T[k]}">${AUD_T[k]} ${R.aud[k] > 0.4 ? '▲' : R.aud[k] < -0.4 ? '▼' : '·'}</span>`).join('');
    el0.innerHTML = `<div class="pr-bars"><label>🧠 Cabeza<span class="pr-bar en"><i style="width:${Math.min(100, en)}%"></i></span></label>
      <label>🌡️ Sala<span class="pr-bar tp ${tp >= 70 ? 'hot' : ''}"><i style="width:${tp}%"></i></span></label>
      <button class="pr-tmr ${timerOn() ? 'on' : ''}" data-act="pr-tmr" title="Tiempo para responder">⏱</button></div>
      <div class="pr-auds">${aud}</div>`;
    const st = document.querySelector('#prensa .pr-stage');
    if (st) st.classList.toggle('tense', tp >= 70);
  }
  A['pr-tmr'] = () => { try { localStorage.setItem('touchline.prTimer', timerOn() ? '0' : '1'); } catch (e) { /* nada */ } meter(); if (!timerOn()) stopClock(); };
  function stopClock() { clearInterval(R.clock); R.clock = 0; const b = document.querySelector('#prensa .pr-clock'); if (b) b.remove(); }
  function startClock() {
    stopClock();
    if (!timerOn()) return;
    const total = 14000 + 2000 * lv(R.c.S, 'pre1'), t0 = performance.now();
    const q = document.querySelector('#prensa .pr-q');
    if (q) q.insertAdjacentHTML('beforeend', '<span class="pr-clock"><i></i></span>');
    R.clock = setInterval(() => {
      const k = (performance.now() - t0) / total, bar = document.querySelector('#prensa .pr-clock i');
      if (bar) bar.style.width = Math.max(0, 100 - k * 100) + '%';
      if (k >= 1) { stopClock(); if (R.cur) answer({ t: '…', cat: 'eva', g: 0, silence: true, fx: {} }); }
    }, 100);
  }

  const satOf = cat => Math.floor(((R.c && R.c.S.pressStyle) || {})[cat] || 0);
  function capOf(cat) { return CATS[cat].cap + (lv(R.c.S, 'pre4') >= 2 ? 1 : 0) - (satOf(cat) >= 4 ? 1 : 0); }
  function costOf(cat, extra) { return CATS[cat].cost + (6 - 1.5 * lv(R.c.S, 'pre4')) * (R.uses[cat] || 0) + 3 * satOf(cat) + (extra || 0); }
  function btnHtml(a, k, extra) {
    const cat = a.cat, C = CATS[cat], used = R.uses[cat] || 0, cost = costOf(cat, extra);
    const out = used >= capOf(cat), poor = R.en < cost;
    return `<button class="btn block pr-a ${out || poor ? 'tired' : ''}" data-act="pr-answer" data-k="${k}" ${out || poor ? 'disabled' : ''}>
      <span>${esc(a.t)}</span><small class="pr-cat c-${cat}">${C.ic} ${C.n}${satOf(cat) >= 3 && !out && !poor ? ' · muy vista' : ''}${out ? ' · ya no te sale' : poor ? ' · sin fuerzas' : ` · ${'●'.repeat(Math.max(1, Math.round(cost / 8)))}`}</small></button>`;
  }
  /** Quién pregunta: un periodista con carácter y memoria (si le dejaste mal, viene a por ti). */
  function reporter(forced) {
    if (forced) return forced;
    const S = R.c.S;
    const pool = REPS.filter(r => r[2] !== 'rival' || Math.random() < 0.5);
    const grudgers = pool.filter(r => (mem(S)[r[0]] || 0) >= 2);
    const r = grudgers.length && Math.random() < 0.45 ? pick(grudgers) : pick(pool);
    return { n: r[0], m: r[2] === 'rival' ? `corresponsal del ${R.c.opp.name}` : r[1], t: r[2], g: mem(S)[r[0]] || 0 };
  }
  function ask() {
    const c = R.c, S = c.S;
    const panel = document.querySelector('#prensa .pr-panel');
    if (R.walk) return end();
    // Repregunta pendiente
    let q, rep, opts, locked = [], qtxt, tag = '';
    if (R.follow) {
      rep = R.follow.rep; const F = FOLLOW[R.follow.cat];
      qtxt = F[0]; opts = F[1].map(o => ({ ...o })); tag = 'repregunta';
      R.follow = null; R.fu++;
      const h = pick(Array.from(document.querySelectorAll('#prensa .pr-crowd i')));
      if (h) { h.classList.add('mic'); R.timers.push(setTimeout(() => h.classList.remove('mic'), 2400)); }
    } else {
      q = R.qs[R.k];
      if (!q) return end();
      rep = reporter();
      qtxt = dressQ(qText(q, c));
      const o = options(S, q, c);
      opts = o.shown; locked = o.locked;
      tag = `${R.k + 1}/${R.qs.length}`;
      R.k++;
    }
    opts.forEach(o => { o.cat = catOf(o); });
    R.rep = rep; R.q = q || null;
    // Muletilla: un recurso de humor más
    const mu = muleOf(S);
    R.cur = opts.slice();
    if (!R.muleUsed && mu) R.cur.push({ t: '«' + mu.t + '»', cat: 'hu', g: 1, mule: true, fx: {} });
    // Con la sala ardiendo, aparecen las salidas de tono: liarla muy parda (y que te echen)
    if (R.temp >= 70 && !R.nuked) R.cur.push(
      { t: 'Pues ya que estamos: el presidente no tiene ni idea de fútbol. Ni de nada.', cat: 'pol', g: 0, nuke: 'pres', fx: {} },
      { t: 'Me levanto, tiro el micro y me voy. Que pregunten a la pared.', cat: 'pol', g: 0, nuke: 'walk', fx: {} },
      { t: 'Ustedes y el árbitro van en el mismo autobús. Y yo sé quién conduce.', cat: 'pol', g: 0, nuke: 'ref', fx: {} });
    const extra = rep.g >= 2 ? 6 : 0;
    meter();
    panel.querySelector('.pr-q').innerHTML = `<small>${esc(rep.n)} · ${esc(rep.m)} <i class="pr-rt t-${rep.t}">${esc(REP_T[rep.t])}</i>${rep.g >= 2 ? ' <i class="pr-grudge">🎯 viene a por ti</i>' : ''} <span class="pr-n">${esc(tag)}</span></small>${(q && (q.id.startsWith('rom') || q.id.startsWith('aff'))) ? '<img class="pr-gif" src="assets/almas/gif/flechazo.gif" alt="">' : ''}${esc(qtxt)}`;
    hands();
    panel.querySelector('.pr-as').innerHTML = R.cur.map((a, k) => btnHtml(a, k, extra)).join('')
      + (!S.mule && !R.muleUsed && R.k === Math.max(2, R.qs.length - 1) ? `<button class="btn block pr-a mule" data-act="pr-mule-new">Soltar una frase propia…<small>Puede hacerse famosa</small></button>` : '')
      + (R.joker && R.comp ? `<button class="btn block pr-a joker" data-act="pr-joker">🃏 Que conteste ${esc(R.comp.p.short)}<small>${esc(PERS[R.comp.pers].n)}</small></button>` : '')
      + locked.map(a => `<button class="btn block pr-a locked" disabled><span>${esc(a.t)}</span><small>Requiere: ${esc(TL.t ? TL.t(skillName(a.need[0])) : skillName(a.need[0]))} ${a.need[1]}</small></button>`).join('');
    // Sin fuerzas para nada: te quedas en blanco
    if (!R.cur.some(a => (R.uses[a.cat] || 0) < capOf(a.cat) && R.en >= costOf(a.cat, extra))) {
      R.timers.push(setTimeout(() => answer({ t: '… (te quedas en blanco)', cat: 'eva', g: 0, silence: true, fx: {} }), 1400));
      return;
    }
    flash();
    startClock();
    // El tímido: a veces le preguntan a él y se bloquea. El bocazas: a veces se arranca solo.
    if (R.comp && !tag.startsWith('rep')) {
      const P = R.comp.pers, p = R.comp.p;
      if (P === 'timido' && Math.random() < 0.18) R.timers.push(setTimeout(() => companionLine(`${p.short}: «Eh… yo… mejor que conteste el míster.»`, { temp: 8 }), 900));
      if (P === 'bocazas' && Math.random() < 0.18) R.timers.push(setTimeout(() => companionLine(`${p.short}, sin que nadie le pregunte: «¡Y que lo sepa todo el mundo: aquí venimos a ganarlo todo!»`, { temp: 12, aud: { afi: 1, dir: -1 } }), 1200));
      if (R.comp.grumpy && Math.random() < 0.3) R.timers.push(setTimeout(() => companionLine(`${p.short}, mirando el reloj: «¿Cuánto queda? Llevo tres ruedas de prensa seguidas…»`, { temp: 10, aud: { vest: -0.8 } }), 1000));
      if ((p.mor == null ? 70 : p.mor) < 35 && Math.random() < 0.1) R.timers.push(setTimeout(() => companionLine(`${p.short} resopla en el micro: «Ya veremos si sigo aquí en enero…»`, { temp: 14, aud: { vest: -1, dir: -1 } }), 1500));
    }
  }
  function companionLine(text, fx) {
    if (!document.getElementById('prensa')) return;
    const say = document.querySelector('#prensa .pr-say');
    if (say) { say.textContent = text; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); }
    const g = document.querySelector('#prensa .pr-r'); if (g) { g.classList.remove('talk'); void g.offsetWidth; g.classList.add('talk'); }
    if (fx.temp) R.temp += fx.temp;
    for (const k in fx.aud || {}) R.aud[k] += fx.aud[k];
    if (fx.temp > 0) { burst(5); react(RX.bad, 2); } else react(RX.good, 2);
    meter();
  }
  A['pr-joker'] = () => {
    if (!R.cur || !R.joker || !R.comp) return;
    R.joker = 0; stopClock();
    const P = R.comp.pers, p = R.comp.p, rep = R.rep;
    const L = {
      lider: [`${p.short}: «Esto lo arreglamos dentro y lo demostramos el domingo. Todos a una.»`, { temp: -15, aud: { vest: 1.5, dir: 0.5 } }, 2],
      profesional: [`${p.short}: «Hemos hablado mucho de esto. Sabemos qué corregir y lo vamos a corregir.»`, { temp: -8, aud: { dir: 0.8, sala: 0.5 } }, 1],
      bromista: [`${p.short}: «Yo solo sé que el míster ha prometido pizza si ganamos. Pregunten por la pizza.»`, { temp: -20, aud: { sala: 1, afi: 0.5 } }, rep.t === 'serio' ? -1 : 2],
      bocazas: [`${p.short}: «¡El domingo les pasamos por encima! ¡Apunten!»`, { temp: 6, aud: { afi: 1.5, dir: -0.5 } }, rep.t === 'sensa' ? 2 : 0]
    }[P];
    if (!L) return;
    R.cur = null;
    companionLine(L[0], L[1]);
    reaction(L[2], { t: L[0] });
    document.querySelectorAll('#prensa .pr-a').forEach(x => { x.disabled = true; });
    R.timers.push(setTimeout(ask, 2300));
  };
  A['pr-mule-new'] = () => {
    if (!R.cur) return;
    stopClock();
    const opts = MULES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    document.querySelector('#prensa .pr-as').innerHTML = '<p class="muted small" style="margin:0 0 6px">Elige con cuidado: si cala, te acompañará siempre.</p>'
      + opts.map(m => `<button class="btn block pr-a mule" data-act="pr-mule-pick" data-id="${m.id}">«${esc(m.t)}»</button>`).join('');
  };
  A['pr-mule-pick'] = b => {
    const S = R.c.S;
    S.mule = { id: b.dataset.id, fame: 0, uses: 0 };
    answer({ t: '«' + muleOf(S).t + '»', cat: 'hu', g: 1, mule: true, fx: {} });
  };
  A['pr-answer'] = b => {
    const a = R.cur && R.cur[+b.dataset.k];
    if (a) answer(a);
  };
  /** Cómo le sienta a la sala: sube o baja la temperatura y queda en la memoria del periodista. */
  function reaction(score, a) {
    const S = R.c.S, rep = R.rep;
    R.temp += score >= 2 ? -8 : score === 1 ? -3 : score === 0 ? 5 : score === -1 ? 12 : 20;
    R.temp = Math.max(0, R.temp);
    if (rep && rep.n) { const M = mem(S); M[rep.n] = U.clamp((M[rep.n] || 0) + (score < 0 ? 1 : score >= 2 ? -1 : 0), -2, 3); }
    if (score >= 1) { R.goodN++; R.streak++; R.best = Math.max(R.best, R.streak); } else { R.badN += score < 0 ? 1 : 0; R.streak = 0; }
    if (!R.big || Math.abs(score) >= Math.abs(R.big.score)) R.big = { score, t: a.t, rep };
  }
  function answer(a) {
    const S = R.c.S, rep = R.rep;
    R.cur = null; stopClock();
    if (R.inTwist) { R.inTwist = false; a.react = settleTwist(S, a); }
    if (a.arc) { a.arc(S); if (S._affRx) { a.react = S._affRx; delete S._affRx; } }
    if (a.nuke) {
      R.nuked = a.nuke; R.bigForce = { score: -3, t: a.t, rep: R.rep }; const N = TL.News.fx, club = S.clubs[S.user];
      if (a.nuke === 'pres') { N.board(S, -22); N.fans(S, 0.008); TL.News.add(S, 'polemica', `Bomba: ${S.manager} carga contra su presidente`, `«No tiene ni idea de fútbol. Ni de nada.» El técnico de ${club.name} incendia la sala de prensa.`, club.id, null, 'neg'); }
      if (a.nuke === 'walk') { N.board(S, -8); TL.News.add(S, 'polemica', `${S.manager} tira el micrófono y se va`, `Escena insólita en la sala de prensa de ${club.name}. El vídeo ya da la vuelta al mundo.`, club.id, null, 'neg'); }
      if (a.nuke === 'ref') { N.board(S, -10); const f = N.fineClub(S, S.user, 30000); R.log.fine = (R.log.fine || 0) + f; R.ban = true; TL.News.add(S, 'polemica', `Competición abre expediente a ${S.manager}`, `Insinúa un complot entre la prensa y los árbitros. Le puede caer sanción.`, club.id, null, 'neg'); }
      R.temp = 100; R.walk = true;
    }
    if (a.mule) { R.muleUsed = true; const u = useMule(S, R.c); a.g = u.g; a.react = u.react; }
    apply(S, a.fx, R.log);
    const cat = a.cat || 'eva', C = CATS[cat];
    R.en -= a.silence ? 0 : costOf(cat, rep && rep.g >= 2 ? 6 : 0);
    R.uses[cat] = (R.uses[cat] || 0) + 1;
    const w = a.g === 0 ? 0.6 : 1;
    for (const k in C.aud) R.aud[k] += C.aud[k] * w * (a.silence ? 0 : 1);
    let score = (PREF[rep ? rep.t : 'serio'][cat] || 0) + ((a.g == null ? 1 : a.g) - 1) - (rep && rep.g >= 2 ? 1 : 0);
    if (!a.silence && satOf(cat) >= 3) { score -= 1; a.react = a.react || pick(['«¡Siempre dice lo mismo!», se oye al fondo.', 'La sala bosteza: esa ya se la sabían.', 'Alguien hace como que ronca. Ese discurso está muy visto.']); }
    if (a.silence) score = -2;
    reaction(score, a);
    // En escena
    const say = document.querySelector('#prensa .pr-say'), me = document.querySelector('#prensa .pr-c');
    if (say) { say.textContent = a.t; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); }
    if (me) { me.classList.remove('talk', 'happy', 'sad'); void me.offsetWidth; me.classList.add('talk', score >= 1 ? 'happy' : score < 0 ? 'sad' : 'talk'); }
    lightPulse(0.5, 0.25, 0.5, 0.35, 1400, [255, 236, 200]);
    const gg = document.querySelector('#prensa .pr-r');
    if (gg && a.fx && a.fx.pl && a.fx.pl[0] === R.c.guest) { const k = a.fx.pl[1] > 0 ? 'happy' : 'sad'; gg.classList.remove('happy', 'sad'); void gg.offsetWidth; gg.classList.add(k); }
    const l = document.querySelector('#prensa .pr-l');
    if (l) { const k = score < 0 ? 'sad' : 'nod'; l.classList.remove('nod', 'sad'); void l.offsetWidth; l.classList.add(k); }
    if (cat === 'hu' && score >= 1) { burst(4); react(RX.funny, 3); }
    else if (score >= 2) { burst(3); react(RX.good, 2); }
    else if (score >= 0) react(RX.meh, 1);
    else { burst(score <= -2 ? 9 : 6); react(RX.bad, score <= -2 ? 5 : 3); }
    const stage = document.querySelector('#prensa .pr-stage');
    if (stage) { stage.classList.remove('murmur'); if (score < 0) { void stage.offsetWidth; stage.classList.add('murmur'); } }
    meter();
    document.querySelectorAll('#prensa .pr-a').forEach(x => { x.disabled = true; });
    if (TL.SFX && TL.SFX.click) TL.SFX.click();
    if (a.react) { const q = document.querySelector('#prensa .pr-q'); if (q) q.insertAdjacentHTML('beforeend', `<em class="pr-react">${esc(a.react)}</em>`); }
    // La sala se desborda: te levantas y te vas (o te echan)
    if (R.temp >= 100) { R.walk = true; R.timers.push(setTimeout(end, 1900)); return; }
    // Titular retorcido (los sensacionalistas, sobre todo)
    const twistP = rep && rep.t === 'sensa' ? 0.35 : 0.08;
    if (!R.twisted && !a.react && !a.silence && !a.cat2 && Math.random() < twistP && R.k < R.qs.length) { R.inTwist = true; R.timers.push(setTimeout(() => showTwist(a), 1900)); return; }
    // Repregunta: si les das cuerda, o si vienen a por ti
    const fuP = (['eva', 'pol', 'dur', 'amb', 'hu'].includes(cat) ? 0.45 : 0.18) + (rep && rep.g >= 2 ? 0.3 : 0);
    if (R.fu < 2 && !a.fu && Math.random() < fuP) R.follow = { cat, rep };
    R.timers.push(setTimeout(ask, a.react ? 2300 : 1700));
  }

  // ---- Final: veredicto según a quién necesitabas contentar, y la portada de mañana
  /** ¿Te echan por la rueda de prensa? Si la directiva cae muy abajo (o has cargado contra el presidente), sí. */
  function fireCheck(S) {
    const conf = S.board.conf;
    const fire = conf <= 12 || (R.nuked === 'pres' && conf < 45 && Math.random() < 0.7);
    if (!fire || S.fired) return false;
    const club = S.clubs[S.user];
    S.fired = true;
    if (TL.Career) { TL.Career.cv(S); TL.Career.cvClose(S, 'fired'); if (!S.over) TL.Career.makeOffers(S, 'midseason'); }
    TL.News.add(S, 'polemica', `${club.name} destituye a ${S.manager}`, 'La rueda de prensa fue la gota que colmó el vaso. El club anuncia el cese del técnico.', club.id, null, 'neg');
    return true;
  }
  function verdict2(S) {
    const club = S.clubs[S.user], N = TL.News.fx;
    const ps = S.prensaStats || (S.prensaStats = { n: 0, wins: 0, bestStreak: 0, twists: 0, twistOk: 0, rep: 50, skipped: 0 });
    ps.n++; ps.bestStreak = Math.max(ps.bestStreak, R.best);
    if (R.twisted) { ps.twists++; if (R.log.twistOk) ps.twistOk++; }
    // Efectos de los públicos
    const A0 = R.aud;
    N.board(S, A0.dir * 0.6); N.teamMor(S, A0.vest * 0.5); N.fans(S, A0.afi * 0.0015);
    R.log.board = (R.log.board || 0) + A0.dir * 0.6; R.log.team = (R.log.team || 0) + A0.vest * 0.5; R.log.fans = (R.log.fans || 0) + A0.afi * 0.0015;
    ps.rep = U.clamp(ps.rep + A0.sala * 2 - (R.walk ? 10 : 0), 0, 100);
    if (R.walk) {
      N.board(S, R.nuked ? 0 : -5);
      if (R.badN >= 3) N.board(S, -3);
      if (fireCheck(S)) return { win: false, fired: true, title: 'Destituido', text: `${club.name} no aguanta más: la directiva te echa esta misma noche.` };
      TL.News.add(S, 'polemica', `${S.manager} abandona la rueda de prensa`, `El técnico de ${club.name} se levanta a mitad de las preguntas. La sala, en llamas.`, club.id, null, 'neg');
      return { win: false, title: 'Te has levantado y te has ido', text: 'La sala estaba al rojo vivo. Mañana se hablará más de tu salida que del partido.' };
    }
    const ok = A0[R.prio] >= 1.2 && R.temp < 70;
    if (ok) {
      ps.wins++;
      TL.News.add(S, 'club', `${S.manager}, sobresaliente ante los micrófonos`, `El técnico de ${club.name} firmó una rueda de prensa impecable tras el partido.`, club.id, null, 'pos');
      return { win: true, title: 'Rueda de prensa redonda', text: `Has contentado a ${AUD[R.prio]}, que era lo que tocaba esta semana.` };
    }
    if (R.temp >= 70 && fireCheck(S)) return { win: false, fired: true, title: 'Destituido', text: `${club.name} no aguanta más: la directiva te echa esta misma noche.` };
    if (R.temp >= 70) TL.News.add(S, 'polemica', `Rueda de prensa tensa de ${S.manager}`, `Las respuestas del técnico de ${club.name} no gustaron ni en la sala ni en el club.`, club.id, null, 'neg');
    return { win: false, title: R.temp >= 70 ? 'Se te ha ido de las manos' : 'No has convencido', text: A0[R.prio] < 1.2 ? `Esta semana necesitabas a ${AUD[R.prio]} y no te ha comprado el discurso.` : 'La sala ha acabado demasiado caliente.' };
  }
  function portada(S, v) {
    const big = R.bigForce || R.big || { t: '…', rep: { m: 'Diario Deportivo' }, score: 0 };
    const media = big.rep && big.rep.m ? big.rep.m : 'Diario Deportivo';
    const raw = big.t.replace(/^[^«]*«|»$/g, '').replace(/^«|»$/g, ''); const quote = raw.length > 95 ? raw.slice(0, 92) + '…' : raw;
    const d = TL.Events ? TL.Events.dateOf(S, TL.Events.st(S).d + 1) : new Date();
    const line = k => `${AUD_T[k]}: ${R.aud[k] > 0.4 ? 'a favor' : R.aud[k] < -0.4 ? 'en contra' : 'indiferente'}`;
    return `<div class="pr-paper ${v.win ? 'win' : 'lose'}"><div class="pp-mast">${esc(media)}</div>
      <div class="pp-date">${esc(d.toLocaleDateString(TL.I18N ? TL.I18N.locale() : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div>
      <div class="pp-body"><i class="pp-photo" style="--c:${R.cols[0]}"></i><div><h3>«${esc(quote)}»</h3><p>${esc(S.manager)}, ${big.score >= 1 ? 'convincente' : big.score < 0 ? 'en el ojo del huracán' : 'sin mojarse demasiado'} tras el partido.</p></div></div>
      <div class="pp-cols">${['vest', 'dir', 'afi', 'sala'].map(k => `<span class="${R.aud[k] > 0.4 ? 'up' : R.aud[k] < -0.4 ? 'dn' : ''}">${esc(line(k))}</span>`).join('')}</div></div>`;
  }
  function end() {
    const S = R.c.S;
    stopClock();
    const panel = document.querySelector('#prensa .pr-panel');
    const v = verdict2(S);
    const fame = muleSteps(S);
    // La prensa se acuerda de tus estilos de siempre (se olvida poco a poco, antes con Discurso renovado)
    const PS = S.pressStyle || (S.pressStyle = {});
    for (const k in PS) PS[k] = Math.max(0, PS[k] - (1 + 0.6 * lv(S, 'pre5')));
    for (const k in R.uses) PS[k] = (PS[k] || 0) + R.uses[k] * 1.2;
    // El que te acompaña sale desgastado: cuanto más larga y caliente la sala, más (y si le hiciste contestar, más aún)
    if (R.comp && S.players[R.comp.p.id]) {
      const p = S.players[R.comp.p.id];
      const n = R.goodN + R.badN + R.fu + 3;
      const wear = Math.round((8 + n * 1.6 + (R.temp >= 70 ? 8 : 0) + (R.joker ? 0 : 5) + (R.comp.pers === 'timido' ? 5 : 0)) * (1 + 0.6 * (R.comp.times || 0)) * (1 - 0.15 * lv(S, 'pre3')));
      if (R.comp.times >= 1 && TL.News && TL.News.fx) TL.News.fx.mor(p, -Math.round(3 * R.comp.times * (1 - 0.25 * lv(S, 'pre3'))));
      p.fit = Math.max(35, (p.fit == null ? 100 : p.fit) - wear);
      if (R.temp >= 70 && TL.News && TL.News.fx) TL.News.fx.mor(p, -4);
      fame.push(wear >= 22 ? `${p.short} sale de la sala exprimido: le costará rendir en los próximos días.` : `${p.short} acaba cansado de tanto micrófono.`);
    }
    if (R.log.merch) fame.push(`Las camisetas con tu frase vuelan: +${U.money(R.log.merch)}.`);
    meter();
    panel.querySelector('.pr-q').innerHTML = `<small>Fin de la rueda de prensa</small><span class="pr-v ${v.win ? 'win' : 'lose'}">${esc(v.title)}</span> ${esc(v.text)}`;
    panel.querySelector('.pr-as').innerHTML = portada(S, v) + `<ul class="pr-sum">${fame.map(x => `<li class="pr-fame">${esc(x)}</li>`).join('')}${summary(S, R.log).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <button class="btn primary block" data-act="pr-close">${v.fired ? 'Recoger tus cosas' : 'Salir de la sala'}</button>`;
    burst(v.win ? 4 : 8);
    if (v.fired) { const st = document.querySelector('#prensa .pr-stage'); if (st) st.classList.add('fired'); }
    G.save();
  }
  A['pr-close'] = () => {
    R.timers.forEach(clearTimeout); R.timers = []; stopClock();
    cancelAnimationFrame(R.raf);
    const root = el('prensa'); if (root) root.remove();
    const cb = R.onDone; R.onDone = null;
    if (cb) cb();
    if (R.c && R.c.S.fired) { G.save(); UI.closeSheet && UI.closeSheet(); if (document.getElementById('match') && A['mv-close']) A['mv-close'](); else UI.render(false); }
  };

  /** Deforma el anuncio para que case con las esquinas reales de la pantalla (máscara): el lado izquierdo es más alto. */
  function fitTv(root) {
    const tv = root.querySelector('.pr-tv'), ad = root.querySelector('.pr-ad');
    if (!tv || !ad) return;
    const w = tv.clientWidth, h = tv.clientHeight;
    if (!w || !h) return;
    // Esquinas destino (px dentro de la caja): arriba-izq, arriba-der, abajo-der, abajo-izq
    const D = [[0, 0], [w, 0.071 * h], [w, 0.976 * h], [0, h]];
    const S0 = [[0, 0], [w, 0], [w, h], [0, h]];
    // Homografía S0 → D (8 incógnitas)
    const A0 = [], B0 = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = S0[i], [u, v] = D[i];
      A0.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B0.push(u);
      A0.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B0.push(v);
    }
    const n = 8, M = A0.map((r, i) => r.concat(B0[i]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const H = M.map((r, i) => r[n] / r[i]);
    const [a, b, c, d, e, f, g, hh] = H;
    ad.style.transformOrigin = '0 0';
    ad.style.transform = `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
  }
  /** Luz con relieve: los flashes de las cámaras (y el foco cuando hablas) iluminan la sala según su mapa de normales. */
  const LIT = { img: null, nrm: null, cv: null, g: null, out: null, lights: [], raf: 0 };
  function lightInit(root) {
    const cv = root.querySelector('.pr-light');
    if (!cv) return;
    LIT.cv = cv; LIT.g = cv.getContext('2d'); LIT.lights = [];
    const W0 = 344, H0 = 192; cv.width = W0; cv.height = H0;
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = W0; c.height = H0;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0, W0, H0);
      const d = g.getImageData(0, 0, W0, H0).data, n = new Float32Array(W0 * H0 * 3);
      for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { n[j] = d[i] / 127.5 - 1; n[j + 1] = -(d[i + 1] / 127.5 - 1); n[j + 2] = d[i + 2] / 127.5 - 1; }
      LIT.nrm = n; LIT.out = LIT.g.createImageData(W0, H0);
    };
    im.src = 'assets/prensa/normales.webp';
  }
  /** x, y en 0..1 de la sala; z: lo cerca que está la luz; str: fuerza; ms: lo que dura. */
  function lightPulse(x, y, z, str, ms, col) {
    LIT.lights.push({ x, y, z, str, ms, t0: performance.now(), col: col || [255, 255, 255] });
    if (!LIT.raf) LIT.raf = requestAnimationFrame(lightFrame);
  }
  function lightFrame(now) {
    LIT.raf = 0;
    if (!LIT.cv || !document.body.contains(LIT.cv)) { LIT.lights = []; return; }
    LIT.lights = LIT.lights.filter(l => now - l.t0 < l.ms);
    const g = LIT.g, W0 = LIT.cv.width, H0 = LIT.cv.height;
    if (!LIT.nrm || !LIT.lights.length) { g.clearRect(0, 0, W0, H0); if (LIT.lights.length) LIT.raf = requestAnimationFrame(lightFrame); return; }
    const n = LIT.nrm, o = LIT.out.data;
    const Ls = LIT.lights.map(l => { const k = (now - l.t0) / l.ms; return { x: l.x * W0, y: l.y * H0, z: l.z * W0, a: l.str * (k < 0.15 ? k / 0.15 : Math.pow(1 - (k - 0.15) / 0.85, 2)), c: l.col }; });
    for (let y = 0, i = 0, j = 0; y < H0; y++) for (let x = 0; x < W0; x++, i += 4, j += 3) {
      let r = 0, gg = 0, b = 0;
      for (const L of Ls) {
        let dx = L.x - x, dy = L.y - y, dz = L.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= dist; dy /= dist; dz /= dist;
        const lam = n[j] * dx + n[j + 1] * -dy + n[j + 2] * dz;
        if (lam <= 0) continue;
        const v = lam * L.a * Math.min(1, (W0 * 0.55) / dist);
        r += v * L.c[0]; gg += v * L.c[1]; b += v * L.c[2];
      }
      o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = Math.min(255, Math.max(r, gg, b));
    }
    g.putImageData(LIT.out, 0, 0);
    LIT.raf = requestAnimationFrame(lightFrame);
  }

  // ------------------------------------------------------------ Ambiente: periodistas, flashes y reacciones
  let AC = null;
  /** Clic de obturador (sintetizado, muy corto). */
  function shutter(vol) {
    if (!TL.SFX || !TL.SFX.on || !TL.SFX.on()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const n = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.05), AC.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * (i < d.length * 0.3 || i > d.length * 0.55 ? 1 : 0.2);
      const src = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = (vol || 0.25) * (0.7 + Math.random() * 0.6);
      src.buffer = n; src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
    } catch (e) { /* sin audio */ }
  }
  /** Un flash suelto: cámara de un lateral o móvil de un periodista de la primera fila. */
  function oneFlash(big) {
    const st = document.querySelector('#prensa .pr-stage');
    if (!st) return;
    const f = document.createElement('i');
    const side = Math.random() < 0.65;
    const lx = side ? (Math.random() < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14) : 8 + Math.random() * 84;
    const ly = side ? 62 + Math.random() * 12 : 86 + Math.random() * 10;
    f.className = 'pr-fl' + (side ? '' : ' sm');
    f.style.left = lx + '%'; f.style.top = ly + '%';
    st.appendChild(f);
    setTimeout(() => f.remove(), 420);
    lightPulse((lx + 2) / 100, ly / 100, side ? 0.3 : 0.45, side ? (big ? 1.7 : 1.3) : 0.6, side ? 420 : 300);
    shutter(side ? 0.28 : 0.15);
  }
  /** Ráfaga de fotos: n flashes muy seguidos (las grandes frases y las meteduras de pata). */
  function burst(n) { for (let k = 0; k < n; k++) R.timers.push(setTimeout(() => oneFlash(k % 3 === 0), k * (70 + Math.random() * 90))); }
  /** Reacción de la sala: un bocadillo que sube desde un periodista de la primera fila. */
  function react(list, n) {
    const row = document.querySelectorAll('#prensa .pr-crowd i');
    if (!row.length) return;
    for (let k = 0; k < (n || 1); k++) R.timers.push(setTimeout(() => {
      const h = row[Math.floor(Math.random() * row.length)];
      const b = document.createElement('span');
      b.className = 'pr-rx'; b.textContent = TL.t ? TL.t(pick(list)) : pick(list);
      h.appendChild(b); h.classList.remove('bob'); void h.offsetWidth; h.classList.add('bob');
      setTimeout(() => b.remove(), 1700);
    }, k * 220 + Math.random() * 150));
  }
  /** Manos arriba al empezar cada pregunta; elige a uno. */
  function hands() {
    const row = Array.from(document.querySelectorAll('#prensa .pr-crowd i'));
    row.forEach(h => h.classList.toggle('hand', Math.random() < 0.55));
    R.timers.push(setTimeout(() => { row.forEach(h => h.classList.remove('hand')); const w = pick(row); if (w) { w.classList.add('hand', 'pick'); R.timers.push(setTimeout(() => w.classList.remove('hand', 'pick'), 1400)); } }, 700));
  }
  const RX = {
    good: ['👏', '📸', '¡Titular!', '🔥', 'Bien dicho', '✍️', '¡Eso es!'],
    meh: ['Hmm…', '📝', '…', '🤔', 'Ya…', '¿Y ya?'],
    bad: ['¡Uuuh!', '¿Perdón?', '😱', '¡Polémica!', '📸📸', 'Murmullos…', '¡Toma ya!', '🫢'],
    funny: ['JAJAJA', '😂', '¡Viral!', '🤣', 'Clip', 'jajaja'],
    scoop: ['¡Exclusiva!', '📸📸📸', '🔥', '¡Bombazo!', '😳']
  };
  function ambient() {
    if (!document.getElementById('prensa')) return;
    oneFlash(false);
    if (Math.random() < 0.35) R.timers.push(setTimeout(() => oneFlash(false), 140));
    if (Math.random() < 0.12) react(['📝', '📸', '✍️', '🎙️', '…'], 1);
    R.timers.push(setTimeout(ambient, 1100 + Math.random() * 2600));
  }

  /** Flashes de las cámaras al preguntar. */
  function flash() {
    const f = document.querySelector('#prensa .pr-flash');
    if (!f) return;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      R.timers.push(setTimeout(() => {
        const lx = Math.random() < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14;
        f.style.left = lx + '%';
        f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
        lightPulse((lx + 7) / 100, 0.8, 0.3, 1.5, 420);
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
  function offered() { return true; }   // después de cada partido hay rueda de prensa (no ir tiene castigo)

  /** No ir: con «Portavoz» va el jefe de prensa y no pasa nada; si no, a la directiva y a la prensa no les gusta. */
  function skip(S, m, me) {
    const club = S.clubs[S.user];
    const ps = S.prensaStats || (S.prensaStats = { n: 0, wins: 0, bestStreak: 0, twists: 0, twistOk: 0, rep: 50, skipped: 0 });
    ps.skipped++;
    if (lv(S, 'pre2') >= 1) return 'El jefe de prensa atiende a los medios por ti.';
    ps.rep = Math.max(0, ps.rep - 5);
    const N = TL.News && TL.News.fx;
    if (N) { N.board(S, -1.2); N.fans(S, -0.002); }
    if (TL.News) TL.News.add(S, 'polemica', `${S.manager} plantó a la prensa`, `El técnico de ${club.name} no compareció tras el partido.`, club.id, null, 'neg');
    return 'No te has presentado. A la directiva no le ha gustado.';
  }
  const canDelegate = S => lv(S, 'pre2') >= 1;

  TL.Prensa = { MULES, STEPS, open, offered, skip, canDelegate, _options: options, _verdict: verdict, _questions: questions, _context: context };
})();
