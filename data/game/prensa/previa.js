/* TOUCHLINE — rueda de prensa PREVIA, antes de los partidos grandes (copa, duelo directo, top contra top, recta final).
 *
 * Mismo formato que partido.js. Además, cada respuesta puede llevar `pre`, lo que se lleva al partido:
 *   own   + los tuyos salen enchufados · − salen con dudas
 *   rival + el rival se pica y sale más motivado (lo que dices se cuelga en su vestuario)
 * Claves de `cuando` (ver PFLAGS en js/prensa.js): cup, cupKO, league, top, direct, end, title, down, fav, under, home,
 *   away, streakW, streakL, boardLow, revenge.
 * Huecos: {rival} {pos} (tu puesto) {posr} (el suyo) {figura} (su mejor jugador) {mi} (el tuyo) {ronda} {quedan} {yo} {club} */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  DB.previa = [
    // ---- La pregunta grande: por qué este partido importa
    { id: 'pv_cup', cuando: 'cupKO', peso: 6, q: '{ronda} contra el {rival}. Aquí no hay mañana. ¿Cómo se prepara un partido así?', o: [
      { t: 'Como una final, porque lo es. El que no lo sienta, que se quede en casa viéndolo por la tele.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 2 } },
      { t: 'Como uno más. Si lo convertimos en algo especial, nos vamos a atar las piernas solos.', cat: 'hum', g: 2, fx: { board: 0.3 }, pre: { own: 1 } },
      { t: 'Vamos a pasar. Pueden apuntarlo y hacerle captura.', cat: 'amb', g: 1, fx: { fans: 0.004 }, pre: { own: 1, rival: 2 } },
      { t: 'Las copas son una lotería. Ya veremos qué bola sale.', cat: 'eva', g: 0, fx: { board: -0.5 }, pre: { own: -1 } }] },
    { id: 'pv_group', cuando: ['cup', '!cupKO'], peso: 4, q: 'Jornada europea ante el {rival}. ¿Partido para dar un golpe en la mesa?', o: [
      { t: 'Cada punto aquí vale doble: dinero, prestigio y orgullo. Vamos a por los tres.', cat: 'pro', g: 2, fx: { board: 0.5 }, pre: { own: 1 } },
      { t: 'El golpe en la mesa lo dan los que ganan en mayo. Ahora toca sumar.', cat: 'hum', g: 2, fx: {}, pre: { own: 1 } },
      { t: 'Que vengan, que les vamos a enseñar cómo se juega en nuestra liga.', cat: 'amb', g: 1, fx: { fans: 0.004 }, pre: { rival: 2, own: 1 } },
      { t: 'Ya les tenemos medidos. Su lateral izquierdo deja la espalda como un portal abierto.', cat: 'tec', g: 2, need: ['tac3', 1], fx: { board: 0.6 }, pre: { own: 2 } }] },
    { id: 'pv_top', cuando: 'top', peso: 5, q: '{pos} contra {posr}. Dicen que es el partido de la jornada. ¿Lo es?', o: [
      { t: 'Lo es. Y quiero que mis jugadores disfruten de jugarlo: para estos partidos se hace uno futbolista.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 2 } },
      { t: 'Son tres puntos, como todos. Lo de partido de la jornada lo decís vosotros para vender.', cat: 'eva', g: 1, fx: {}, pre: {} },
      { t: 'El partido de la jornada será cuando les metamos tres. Antes, no.', cat: 'amb', g: 1, fx: { fans: 0.005 }, pre: { own: 1, rival: 2 } },
      { t: 'Partidos como este se ganan en los detalles: balón parado, segundas jugadas y no perder la cabeza.', cat: 'tec', g: 2, need: ['tac1', 2], fx: { board: 0.5 }, pre: { own: 2 } }] },
    { id: 'pv_direct', cuando: 'direct', peso: 5, q: 'El {rival} está justo a su lado en la tabla. ¿Final anticipada?', o: [
      { t: 'Partido de seis puntos. Si ganamos, les dejamos atrás; si perdemos, nos pasan por encima.', cat: 'hum', g: 2, fx: {}, pre: { own: 1 } },
      { t: 'Ninguna final. Faltan muchas jornadas y yo no me pongo nervioso tan pronto.', cat: 'eva', g: 1, fx: { board: 0.3 }, pre: {} },
      { t: 'Que se preparen, porque el domingo les vamos a quitar hasta el sitio en la tabla.', cat: 'amb', g: 1, fx: { fans: 0.004 }, pre: { own: 1, rival: 2 } },
      { t: 'Sus números se parecen mucho a los nuestros. Por eso sé exactamente dónde les vamos a hacer daño.', cat: 'tec', g: 2, need: ['tac3', 1], fx: { board: 0.6 }, pre: { own: 2 } }] },
    { id: 'pv_title', cuando: 'title', peso: 7, q: 'Quedan {quedan} jornadas y el título está ahí. ¿Se atreve a decir la palabra?', o: [
      { t: 'Liga. Ya está, la he dicho. Ahora que se la ganen ellos si pueden.', cat: 'amb', g: 1, fx: { fans: 0.008, board: -0.3 }, pre: { own: 2, rival: 1 } },
      { t: 'La palabra es «domingo». Después de este, el siguiente. No hay otra.', cat: 'hum', g: 2, fx: { board: 0.5 }, pre: { own: 1 } },
      { t: 'No hace falta decirla: la tienen todos en la cabeza desde enero.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 2 } },
      { t: 'Ni de broma. Eso trae mal fario.', cat: 'hu', g: 1, fx: { fans: 0.003 }, pre: {} }] },
    { id: 'pv_down', cuando: 'down', peso: 7, q: 'Quedan {quedan} jornadas y miran hacia abajo. ¿Hay miedo en el vestuario?', o: [
      { t: 'Miedo no. Respeto, todo. Y ganas de demostrar que este club no merece estar ahí abajo.', cat: 'pro', g: 2, fx: { team: 1.5 }, pre: { own: 2 } },
      { t: 'El miedo lo tienen los que no trabajan. Aquí se trabaja.', cat: 'dur', g: 1, fx: { team: -0.5, board: 0.5 }, pre: { own: 1 } },
      { t: 'Estamos bien, tranquilos. Esto se arregla solo.', cat: 'eva', g: 0, fx: { board: -1, fans: -0.003 }, pre: { own: -1 } },
      { t: 'Hemos hecho cuentas: con tres victorias, nos salvamos. Y tenemos el calendario estudiado al milímetro.', cat: 'tec', g: 2, need: ['tac2', 1], fx: { board: 1 }, pre: { own: 2 } }] },
    { id: 'pv_end', cuando: ['end', '!title', '!down'], peso: 4, q: 'Recta final: quedan {quedan} jornadas. ¿Qué se juega su equipo?', o: [
      { t: 'El orgullo. Y eso, en este club, pesa más que cualquier puesto.', cat: 'pro', g: 2, fx: { team: 1, fans: 0.003 }, pre: { own: 1 } },
      { t: 'Lo que nos pidió la directiva. Ni más ni menos.', cat: 'hum', g: 2, fx: { board: 0.6 }, pre: { own: 1 } },
      { t: 'Las vacaciones, si les soy sincero.', cat: 'hu', g: 0, fx: { board: -1, fans: 0.002 }, pre: { own: -2 } }] },

    // ---- El rival
    { id: 'pv_figura', peso: 2.6, q: '{figura} viene en un momento brutal. ¿Cómo se para a {figura}?', o: [
      { t: 'Con el equipo entero. Uno solo no le para; once, sí.', cat: 'hum', g: 2, fx: {}, pre: { own: 1 } },
      { t: 'Con un marcaje al hombre que va a ir con él hasta al baño.', cat: 'hu', g: 1, fx: { fans: 0.003 }, pre: { own: 1 } },
      { t: '¿{figura}? No sé ni quién es. ¿Juega en el {rival}?', cat: 'amb', g: 1, fx: { fans: 0.004 }, pre: { rival: 2 } },
      { t: 'Recibe el 70% de los balones por la izquierda. Si cerramos ese pasillo, se apaga.', cat: 'tec', g: 2, need: ['tac3', 2], fx: { board: 0.6 }, pre: { own: 2 } }] },
    { id: 'pv_fav', cuando: 'fav', peso: 3, q: 'Todo el mundo les da como favoritos. ¿Le pesa esa etiqueta?', o: [
      { t: 'Ser favorito es un premio a lo que hemos hecho. Lo acepto y lo disfruto.', cat: 'amb', g: 1, fx: { fans: 0.003 }, pre: { own: 1, rival: 1 } },
      { t: 'Los favoritos también pierden. Si salimos creyéndonoslo, nos meten tres.', cat: 'hum', g: 2, fx: { board: 0.3 }, pre: { own: 2 } },
      { t: 'El {rival} es mejor de lo que dice la tabla. Mucho mejor.', cat: 'hum', g: 2, fx: {}, pre: { own: 1, rival: -1 } },
      { t: 'Favoritos no: obligados. Que es distinto.', cat: 'dur', g: 1, fx: { team: -0.5, board: 0.5 }, pre: { own: 1 } }] },
    { id: 'pv_under', cuando: 'under', peso: 3, q: 'Nadie da un duro por ustedes ante el {rival}. ¿Qué responde?', o: [
      { t: 'Perfecto. A mí me encanta cuando nadie da un duro: así se gana más dinero.', cat: 'hu', g: 2, fx: { fans: 0.004 }, pre: { own: 2 } },
      { t: 'Que jueguen ellos con la presión. Nosotros jugamos con hambre.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 2 } },
      { t: 'Normal. Son mejores. Intentaremos que no sea una goleada.', cat: 'eva', g: 0, fx: { team: -2, board: -0.5 }, pre: { own: -2 } },
      { t: 'Les vamos a ganar. Lo digo hoy para que mañana no digan que fue suerte.', cat: 'amb', g: 1, fx: { fans: 0.006 }, pre: { own: 1, rival: 2 } }] },
    { id: 'pv_revenge', cuando: 'revenge', peso: 4, q: 'En la ida les pasaron por encima. ¿Hay ganas de revancha?', o: [
      { t: 'Ganas, todas. Esa derrota la tenemos clavada desde aquel día.', cat: 'pro', g: 2, fx: { team: 1.5 }, pre: { own: 2 } },
      { t: 'Revancha, no. Aprendizaje. Aquel día nos enseñaron cosas que no vamos a repetir.', cat: 'tec', g: 2, fx: { board: 0.5 }, pre: { own: 1 } },
      { t: 'Revancha y algo más. Que se lo vayan contando.', cat: 'pol', g: 1, fx: { fans: 0.004 }, pre: { own: 1, rival: 2 } }] },

    // ---- El ambiente y la guerra psicológica
    { id: 'pv_home', cuando: 'home', peso: 2, q: 'El estadio va a estar lleno. ¿Qué le pide a la grada?', o: [
      { t: 'Que sean el jugador número doce desde el calentamiento. Que se note que es nuestra casa.', cat: 'pro', g: 2, fx: { fans: 0.005 }, pre: { own: 2 } },
      { t: 'Que vengan pronto, que hay atasco. Y que se traigan la voz.', cat: 'hu', g: 2, fx: { fans: 0.003 }, pre: { own: 1 } },
      { t: 'Paciencia. Si el partido se atasca, que no piten a los suyos.', cat: 'hum', g: 1, fx: { board: 0.3 }, pre: { own: 1 } },
      { t: 'Que les hagan sentir el infierno. Que el {rival} no oiga ni sus propios pensamientos.', cat: 'pol', g: 1, fx: { fans: 0.006, board: -0.5 }, pre: { own: 2, rival: 1 } }] },
    { id: 'pv_away', cuando: 'away', peso: 2, q: 'Van a un campo muy caliente. ¿Cómo se gestiona un ambiente así?', o: [
      { t: 'Con balón. Si la tenemos nosotros, la grada se calla sola.', cat: 'tec', g: 2, fx: {}, pre: { own: 1 } },
      { t: 'Me encanta. Cuanto más me piten, mejor me lo paso.', cat: 'amb', g: 1, fx: { fans: 0.004 }, pre: { own: 1, rival: 1 } },
      { t: 'Con tapones. Ya los he comprado para todos.', cat: 'hu', g: 1, fx: { fans: 0.002 }, pre: {} },
      { t: 'Los primeros diez minutos, sin riesgos. Luego, a morder. Lo hemos ensayado con altavoces en el entreno.', cat: 'tec', g: 2, need: ['tac2', 2], fx: { board: 0.5 }, pre: { own: 2 } }] },
    { id: 'pv_mind', peso: 2.2, q: 'El entrenador del {rival} ha dicho que ustedes «juegan a no jugar». ¿Le contesta?', o: [
      { t: 'Que diga lo que quiera. Yo hablo el domingo, en el campo.', cat: 'hum', g: 2, fx: { board: 0.4 }, pre: { own: 1 } },
      { t: 'Viniendo de quien juega a no ganar, me lo tomo como un piropo.', cat: 'pol', g: 1, fx: { fans: 0.005 }, pre: { own: 1, rival: 2 } },
      { t: 'Ojalá jugásemos a no jugar: así no me dolerían tanto las rodillas.', cat: 'hu', g: 2, fx: { fans: 0.003 }, pre: {} },
      { t: 'Tiene razón. Somos malísimos. Que se confíe.', cat: 'eva', g: 1, fx: {}, pre: { rival: -1 } }] },
    { id: 'pv_form', cuando: 'streakW', peso: 2.4, q: 'Llegan en racha. ¿Qué tiene este equipo ahora mismo?', o: [
      { t: 'Confianza. Y la confianza, en fútbol, es el mejor fichaje.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 1 } },
      { t: 'Lo mismo que hace un mes, pero con suerte. Ojo, que la suerte se acaba.', cat: 'hum', g: 1, fx: { board: 0.3 }, pre: {} },
      { t: 'Hambre. Y no pienso darles de comer hasta que acabe la temporada.', cat: 'dur', g: 1, fx: { team: -0.3 }, pre: { own: 1 } }] },
    { id: 'pv_crisis', cuando: 'streakL', peso: 3, q: 'Llegan tras varias derrotas. ¿Es el partido para salir del bache?', o: [
      { t: 'Es el partido para dejar de hablar del bache. Que hable el campo.', cat: 'pro', g: 2, fx: { team: 1 }, pre: { own: 2 } },
      { t: 'El bache lo veis vosotros. Nosotros vemos un equipo que está a un gol de cambiar.', cat: 'hum', g: 1, fx: {}, pre: { own: 1 } },
      { t: 'Si no ganamos, tomaré decisiones. Y alguno no las va a ver venir.', cat: 'dur', g: 1, fx: { team: -1.5, board: 0.5 }, pre: { own: 1 } },
      { t: 'Bache, dice. Esto es un cráter.', cat: 'hu', g: 0, fx: { team: -1, fans: 0.002 }, pre: { own: -1 } }] },
    { id: 'pv_board', cuando: 'boardLow', peso: 3, q: 'Dicen que si no gana este partido, está fuera. ¿Es una final para usted?', o: [
      { t: 'Para mí todos son finales. Este, igual que el resto.', cat: 'hum', g: 2, fx: { board: 0.5 }, pre: { own: 1 } },
      { t: 'Si me echan, que sea por algo. Pero el domingo vamos a ganar.', cat: 'amb', g: 1, fx: { fans: 0.003 }, pre: { own: 2 } },
      { t: 'Eso pregúntenselo al presidente. Yo no tengo ni idea.', cat: 'pol', g: 0, fx: { board: -1.5 }, pre: { own: -1 } },
      { t: 'Mi silla no juega. Juegan ellos. Y les he visto entrenar esta semana como nunca.', cat: 'pro', g: 2, need: ['mot3', 1], fx: { team: 1.5, board: 0.5 }, pre: { own: 2 } }] }
  ];
})();
