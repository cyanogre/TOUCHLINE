/* TOUCHLINE — personalidades ocultas del entrenador (2/2). Mismo esquema que personalidades-1.js.
 * Las personalidades ideológicas están escritas como sátira: el juego se ríe del personaje, y casi siempre le pasa
 * factura (patrocinadores que se van, expedientes, vestuarios divididos). Ninguna sale gratis. */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  const P = DB.personas = DB.personas || {};

  P.progre = {
    n: 'Progre', motes: ['el Concienciado', 'Míster Pancarta', 'el Entrenador de las Causas'],
    sig: { 'soc:progre': 3, 'estilo:pro': 0.3, campana: 1, sponsor_riesgo: -1.5 },
    eff: { vest: 0.2, dir: -0.15, afi: 0.0006, sala: 1, spons: 0.05 }, nat: ['pro', 'hum'], anti: ['dur'],
    pista: ['Le pregunté por el lateral izquierdo y acabó hablando del cambio climático. Lo peor es que tenía razón en las dos cosas.',
      'El entrenador de {club} lleva más causas en la solapa que escudos en la camiseta. A sus jugadores les gusta. A la mitad de la grada, también. A la otra mitad, no tanto.'],
    mote: { q: 'Le llaman «{mote}». ¿Debería un entrenador hablar de política?', a: [
      { t: 'Un entrenador es una persona. Y las personas tienen opinión.', cat: 'pro', abraza: true },
      { t: 'Mejor no. Aquí venimos a hablar de fútbol.', cat: 'eva', abraza: false },
      { t: 'El fútbol es política. Que se lo pregunten a quien no puede pagar la entrada.', cat: 'pol', abraza: true }] },
    noticia: ['«{mote}»: el técnico que no se calla ante nada', '{yo} convierte cada rueda de prensa en una tribuna. Aplausos en las redes… y alguna baja en el palco.'],
    profe: ['Defender lo que crees está bien, chaval. Pero que no se te olvide que también defiendes un escudo, y ese escudo es de todos, también de los que no piensan como tú.'],
    caps: [
      { tit: 'La camiseta', q: 'El equipo saldrá con un brazalete por una causa social. Algunos aficionados protestan. ¿Qué les dice?', o: [
        { t: 'Que el escudo es de todos. Y que hay causas que también.', cat: 'pro', fx: { fans: 0.002, board: -0.3 }, sig: { progre: 2 } },
        { t: 'Que lo decidió el club. Yo entreno.', cat: 'eva', fx: {}, sig: { progre: -1, tibio: 2 } },
        { t: 'Que si les molesta un brazalete, el problema no es el brazalete.', cat: 'pol', fx: { fans: 0.003, board: -1 }, sig: { progre: 2, polemista: 1 } }],
        n: ['Polémica por el brazalete de {club}', '{yo} defiende la iniciativa. La grada, dividida.'] },
      { tit: 'El patrocinador incómodo', q: 'El club está a punto de firmar con un patrocinador de apuestas. ¿Va a decir algo?', o: [
        { t: 'Que no lo comparto. Y lo digo aquí porque arriba ya lo dije.', cat: 'pol', fx: { board: -2.5, fans: 0.006 }, sig: { progre: 3 } },
        { t: 'Que eso lo decide el club. Yo respeto las decisiones.', cat: 'eva', fx: { board: 0.5 }, sig: { progre: -2 } },
        { t: 'Que con ese dinero, al menos, que paguen las entradas de los chavales.', cat: 'pro', fx: { board: -0.5, fans: 0.004 }, sig: { progre: 1, comunista: 1 } }],
        n: ['{yo} contra el patrocinador', 'El técnico de {club} se desmarca de la directiva. Garrido: «Valiente o imprudente. A veces es lo mismo».'] },
      { tit: 'El premio', q: 'Le van a dar un premio por su compromiso social. ¿Lo recogerá?', o: [
        { t: 'Lo recogerá el utillero, que lleva treinta años en el club sin que nadie se lo agradezca.', cat: 'pro', fx: { team: 2, fans: 0.006, board: 1 }, sig: { progre: 1, padre: 2, leyenda: 1 } },
        { t: 'Sí. Y daré un discurso de veinte minutos. Avisados quedan.', cat: 'hu', fx: { fans: 0.003, board: -0.5 }, sig: { progre: 2, gracioso: 1 } },
        { t: 'No. Los premios se los dan a los que hablan; yo prefiero que me juzguen por lo que hago.', cat: 'hum', fx: { board: 1.5 }, sig: { progre: -1, curante: 2 } }],
        n: ['Premio al compromiso para {yo}', 'El técnico de {club}, reconocido fuera del campo. Dentro, el debate sigue.'] }
    ]
  };

  P.facha = {
    n: 'Mano dura', motes: ['el Sargento Patrio', 'Míster Mano Dura', 'el Nostálgico'],
    sig: { 'soc:facha': 3, 'estilo:dur': 0.6, 'nuke:ref': 0.5 },
    eff: { vest: -0.4, dir: -0.3, afi: -0.001, sala: 1, spons: -0.08 }, nat: ['dur', 'pol'], anti: ['pro', 'hu'],
    pista: ['El entrenador de {club} dice que «antes se respetaba más». No ha aclarado cuándo era antes ni quién respetaba a quién.',
      'Hay técnicos que añoran el líbero. Este añora cosas bastante más antiguas. En el vestuario, cada vez que habla de «orden», alguien mira al suelo.'],
    mote: { q: 'En redes le llaman «{mote}». Hay quien dice que sus opiniones no caben en un club de fútbol. ¿Qué responde?', a: [
      { t: 'Que yo digo lo que pienso. Y que pienso que aquí falta mano dura.', cat: 'dur', abraza: true },
      { t: 'Que a lo mejor me he pasado en las formas. Me quedo con el fútbol.', cat: 'hum', abraza: false },
      { t: 'Que mi vestuario es de todos los colores. Y que me equivoqué al hablar.', cat: 'pro', abraza: false }] },
    noticia: ['«{mote}»: las opiniones de {yo} incendian las redes', 'Dos patrocinadores de {club} piden explicaciones. Parte del vestuario, incómodo.'],
    profe: ['Mira a tu vestuario, chaval: chavales de diez países distintos que se juegan la vida por el mismo escudo. Eso es lo único que tiene que importarte. Lo demás, en tu casa.'],
    caps: [
      { tit: 'El vestuario de todos', q: 'Un jugador extranjero de su plantilla dice sentirse «incómodo» con sus declaraciones. ¿Qué le dice?', o: [
        { t: 'Que se adapte. Aquí se hace como se hace aquí.', cat: 'dur', fx: { team: -3, board: -1.5, fans: -0.004 }, sig: { facha: 3 } },
        { t: 'Que tiene razón. Le pido perdón delante de todos.', cat: 'hum', fx: { team: 2, board: 1 }, sig: { facha: -5, curante: 2 } },
        { t: 'Que hablaré con él. En privado, como se hacen las cosas.', cat: 'pro', fx: { team: 0.5 }, sig: { facha: -2, padre: 1 } }],
        n: ['Malestar en el vestuario de {club} por {yo}', 'Un jugador del equipo rompe el silencio. El club anuncia una reunión interna.'] },
      { tit: 'Los patrocinadores', q: 'Un patrocinador rescinde su contrato por sus declaraciones. ¿Se arrepiente?', o: [
        { t: 'No. Que se vayan los que no aguantan la verdad.', cat: 'pol', fx: { board: -3, fans: -0.003 }, sig: { facha: 3 } },
        { t: 'Sí. He hecho daño al club y lo voy a reparar.', cat: 'hum', fx: { board: 1.5 }, sig: { facha: -4 } },
        { t: 'Prefiero no hablar de eso.', cat: 'eva', fx: { board: -1 }, sig: { facha: 0 } }],
        n: ['Un patrocinador abandona {club}', 'La marca rompe su acuerdo tras las declaraciones del entrenador.'] },
      { tit: 'La caída o la vuelta', q: 'Competición, patrocinadores y medio vestuario contra usted. ¿Cómo sale de esta?', o: [
        { t: 'Rectificando. Me equivoqué, y no solo en las formas. Quiero aprender.', cat: 'hum', fx: { board: 2, team: 2, fans: 0.004 }, sig: { facha: -8, curante: 3 } },
        { t: 'Como entré: con la cabeza alta y sin pedir perdón a nadie.', cat: 'dur', fx: { board: -5, team: -2, fans: -0.006 }, sig: { facha: 3 } },
        { t: 'Hablando solo de fútbol. A partir de hoy, solo fútbol.', cat: 'tec', fx: { board: 0.5 }, sig: { facha: -3, profesor: 1 } }],
        n: ['{yo}, ante su momento más difícil', 'Garrido: «Se puede volver de casi todo. Pero hay que querer volver».'] }
    ]
  };

  P.machista = {
    n: 'Machirulo', motes: ['el Cavernícola', 'Míster Siglo Pasado', 'el Machirulo'],
    sig: { 'soc:machista': 3 },
    eff: { vest: -0.4, dir: -0.4, afi: -0.0012, sala: 1, spons: -0.1 }, nat: ['dur', 'pol'], anti: ['pro', 'hum'],
    pista: ['Le pregunté por el fútbol femenino y me miró como si le hubiera preguntado por la física cuántica. Le dio tiempo a soltar dos frases que su jefe de prensa todavía está intentando borrar.',
      'Hay entrenadores que viven en otra época. El de {club} parece haber hecho la reserva en el siglo pasado y no haber hecho nunca el check-out.'],
    mote: { q: 'Le llaman «{mote}». Varias asociaciones piden su sanción. ¿Va a rectificar?', a: [
      { t: 'No tengo nada que rectificar. Se ofende todo el mundo por todo.', cat: 'pol', abraza: true },
      { t: 'Sí. Lo que dije estuvo fuera de lugar, sin matices.', cat: 'hum', abraza: false },
      { t: 'Voy a escuchar más y a hablar menos. Empiezo hoy.', cat: 'hum', abraza: false }] },
    noticia: ['«{mote}»: las frases de {yo} desatan una tormenta', 'Asociaciones, patrocinadores y parte del vestuario piden explicaciones al técnico de {club}.'],
    profe: ['Chaval, tu madre te está leyendo. Y tus jugadoras de la cantera también. Piénsalo antes de abrir la boca la próxima vez.'],
    caps: [
      { tit: 'La capitana', q: 'La capitana del equipo femenino del club ha dicho que usted «no es bienvenido» en su vestuario. ¿Qué le responde?', o: [
        { t: 'Que tiene razón. Iré a pedirles perdón en persona, si me dejan.', cat: 'hum', fx: { board: 1.5, fans: 0.004 }, sig: { machista: -5, curante: 2 } },
        { t: 'Que no pensaba ir.', cat: 'pol', fx: { board: -2, fans: -0.005 }, sig: { machista: 3 } },
        { t: 'Que lo respeto. Y que me lo tengo que ganar.', cat: 'pro', fx: { board: 1 }, sig: { machista: -3, padre: 1 } }],
        n: ['La capitana planta cara a {yo}', 'El equipo femenino de {club} cierra filas. El técnico del primer equipo, en el centro de la polémica.'] },
      { tit: 'El expediente', q: 'La federación le abre expediente por sus comentarios. ¿Recurrirá?', o: [
        { t: 'Recurriré. Esto es una persecución.', cat: 'pol', fx: { fine: [1, 25000], board: -2.5 }, sig: { machista: 3, conspiranoico: 1 } },
        { t: 'No. Acepto la sanción y haré el curso de formación que me pidan.', cat: 'hum', fx: { fine: [1, 10000], board: 1 }, sig: { machista: -4, curante: 1 } },
        { t: 'Lo llevarán mis abogados. Yo, a entrenar.', cat: 'eva', fx: { fine: [1, 15000] }, sig: { machista: 0, tibio: 1 } }],
        n: ['Expediente a {yo}', 'La federación actúa contra el técnico de {club}.'] },
      { tit: 'La lección', q: 'Ha pasado una semana entrenando con el equipo femenino del club. ¿Qué ha aprendido?', o: [
        { t: 'Que me han dado un baño táctico. Y que me tenía que haber callado hace mucho.', cat: 'hum', fx: { board: 2.5, fans: 0.008, team: 1 }, sig: { machista: -10, curante: 3, leyenda: 1 } },
        { t: 'Que lo hacen bien. Pero no es lo mismo.', cat: 'eva', fx: { board: -1.5, fans: -0.004 }, sig: { machista: 2 } },
        { t: 'Que la mejor lateral del club juega en el otro vestuario. Y que la quiero en mi cuerpo técnico.', cat: 'tec', fx: { board: 1.5, fans: 0.006 }, sig: { machista: -7, profesor: 2 } }],
        n: ['La lección de {yo}', 'Garrido: «Hay columnas que se escriben con gusto. Esta es una: el hombre que llegó a la caverna ha encontrado la salida. O eso parece».'] }
    ]
  };

  P.comunista = {
    n: 'Camarada', motes: ['el Camarada', 'Míster Asamblea', 'el Comandante'],
    sig: { 'soc:comunista': 3, sponsor_riesgo: -1, campana: 0.8, 'act:bbq': 0.3, 'estilo:pro': 0.3 },
    eff: { vest: 0.3, dir: -0.35, afi: 0.0012, sala: 1, spons: -0.05 }, nat: ['pro', 'pol'], anti: ['amb'],
    pista: ['El entrenador de {club} ha propuesto que las primas se repartan a partes iguales entre todos, utillero incluido. El utillero está encantado. El delantero, menos.',
      'Dicen que en {club} ya no hay charla técnica: hay asamblea. Se vota la alineación a mano alzada, y el entrenador siempre gana por un voto.'],
    mote: { q: 'Le llaman «{mote}». ¿El fútbol debería ser del pueblo?', a: [
      { t: 'El fútbol ya es del pueblo. Solo hay que devolvérselo.', cat: 'pol', abraza: true },
      { t: 'El fútbol es de quien lo juega y de quien lo ve. Lo demás, ideología.', cat: 'eva', abraza: false },
      { t: 'El fútbol debería ser gratis los domingos. Y el palco, para los socios.', cat: 'pol', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que quiere repartir hasta el balón', 'Primas iguales, entradas baratas y asambleas en el vestuario: la revolución de {yo}.'],
    profe: ['Repartir está muy bien, chaval. Pero el que se deja la piel quiere sentir que se la deja por algo. No todos son iguales, aunque todos valgan lo mismo.'],
    caps: [
      { tit: 'Las primas', q: 'Propone que las primas por objetivos se repartan igual entre toda la plantilla. Las estrellas protestan. ¿Mantiene la idea?', o: [
        { t: 'La mantengo. Aquí gana el equipo, no el que marca.', cat: 'pol', fx: { team: 0.5, board: -1 }, sig: { comunista: 3 } },
        { t: 'La retiro. Hay que premiar a los que más rinden.', cat: 'tec', fx: { board: 1 }, sig: { comunista: -3 } },
        { t: 'Que lo vote el vestuario. Lo que salga, se hace.', cat: 'pro', fx: { team: 1.5 }, sig: { comunista: 2, padre: 1 } }],
        n: ['Revolución de las primas en {club}', 'El técnico quiere repartir a partes iguales. Las estrellas no lo ven claro.'] },
      { tit: 'Las entradas', q: 'Ha pedido públicamente bajar el precio de las entradas. El presidente no está contento. ¿Rectifica?', o: [
        { t: 'No. Un estadio vacío no gana partidos.', cat: 'pol', fx: { board: -2, fans: 0.008 }, sig: { comunista: 3 } },
        { t: 'Rectifico. Las finanzas son cosa del presidente.', cat: 'hum', fx: { board: 1.5 }, sig: { comunista: -3 } },
        { t: 'Que bajen mi sueldo, y con eso, las entradas.', cat: 'pro', fx: { board: -0.5, fans: 0.01 }, sig: { comunista: 2, leyenda: 1 } }],
        n: ['{yo} pide entradas más baratas', 'El técnico de {club} se enfrenta al palco por los precios.'] },
      { tit: 'La asamblea', q: 'El vestuario ha votado contra su planteamiento para el partido del domingo. ¿Respetará el voto?', o: [
        { t: 'Lo respeto. La asamblea es soberana. Que juegue el 4-4-2.', cat: 'pro', fx: { team: 2.5, board: -1.5 }, sig: { comunista: 3, padre: 1 } },
        { t: 'Hasta aquí la democracia. El entrenador soy yo.', cat: 'dur', fx: { team: -2, board: 1 }, sig: { comunista: -4, despota: 2 } },
        { t: 'Escucho, pero decido. Así ha sido siempre, aunque votemos.', cat: 'tec', fx: { team: 0.5, board: 0.5 }, sig: { comunista: -1, profesor: 1 } }],
        n: ['El vestuario vota contra {yo}', 'Garrido: «Ha creado un monstruo democrático. Ahora tiene que convivir con él».'] }
    ]
  };

  P.curante = {
    n: 'Currante', motes: ['el Currante', 'el Obrero del Banquillo', 'Míster Sin Excusas'],
    sig: { 'estilo:hum': 2, 'estilo:tec': 0.5, 'act:retreat': 0.5, 'nuke:pres': -2, 'nuke:walk': -2, plantar: -2, redencion: 1 },
    eff: { vest: 0.2, dir: 0.35, afi: 0.0006, sala: 0.5 }, nat: ['hum', 'tec'], anti: ['pol', 'amb'],
    pista: ['El entrenador de {club} es el primero en llegar y el último en irse. El conserje ya le ha dado una copia de las llaves.',
      'No tiene frases para la portada, ni gestos para la tele. Tiene ojeras, una libreta y un equipo que corre. Hay quien piensa que eso es poco. Yo pienso que es todo.'],
    mote: { q: 'Le llaman «{mote}». ¿Es usted un entrenador aburrido?', a: [
      { t: 'Aburrido no. Trabajador. Los domingos, si ganamos, también me divierto.', cat: 'hum', abraza: true },
      { t: 'Si quieren espectáculo, que miren el partido. Yo aquí vengo a trabajar.', cat: 'tec', abraza: true },
      { t: 'Me han llamado cosas peores. Bastantes peores.', cat: 'hu', abraza: false }] },
    noticia: ['«{mote}»: el entrenador que no busca excusas', '{yo} se gana a la directiva y a la grada a base de trabajo. Sin titulares, sin polémicas, sin descanso.'],
    profe: ['Eso es, chaval. Trabajo y humildad. No sale en las portadas, pero es lo único que sale en los resultados.'],
    caps: [
      { tit: 'Las horas', q: 'Dicen que duerme en el estadio algunos días. ¿Es cierto?', o: [
        { t: 'Alguna noche. El sofá de mi despacho es muy cómodo y el vídeo no se analiza solo.', cat: 'tec', fx: { board: 1 }, sig: { curante: 2, profesor: 1 } },
        { t: 'Mi familia diría que sí. Y tendría razón. Tengo que cuidar eso.', cat: 'hum', fx: { board: 0.5, fans: 0.002 }, sig: { curante: 1 } },
        { t: 'No, pero me gustaría. Hay menos tráfico.', cat: 'hu', fx: { fans: 0.002 }, sig: { curante: 1, gracioso: 1 } }],
        n: ['{yo}, el técnico que no sale del estadio', 'Jornadas de catorce horas en {club}. La directiva, encantada.'] },
      { tit: 'La racha mala', q: 'Cuatro partidos sin ganar. ¿Sigue pensando que el trabajo es suficiente?', o: [
        { t: 'Lo sigo pensando. Y por eso mañana trabajaremos más.', cat: 'hum', fx: { board: 1, team: 0.5 }, sig: { curante: 2 } },
        { t: 'El trabajo es necesario. Pero también hace falta acierto, y lo estamos buscando.', cat: 'tec', fx: { board: 0.5 }, sig: { curante: 1, profesor: 1 } },
        { t: 'A lo mejor necesitamos un golpe en la mesa. Y lo voy a dar.', cat: 'dur', fx: { team: -0.5, board: 0.5 }, sig: { curante: -1, despota: 1 } }],
        n: ['Racha negra para {yo}', 'El técnico de {club} no cambia el discurso: trabajo y más trabajo.'] },
      { tit: 'La recompensa', q: 'Le han renovado. Dicen que nadie en la directiva tuvo la más mínima duda. ¿Cómo se lo explica?', o: [
        { t: 'Me lo explico con el equipo: ellos han hecho el trabajo. Yo solo he puesto las horas.', cat: 'hum', fx: { board: 3, team: 2 }, sig: { curante: 3, leyenda: 1 } },
        { t: 'Me lo explico con los datos: hemos mejorado en todo. Lo tengo en una tabla.', cat: 'tec', fx: { board: 2.5 }, sig: { curante: 1, profesor: 2 } },
        { t: 'No me lo explico. Pero no voy a preguntar, no vaya a ser que cambien de opinión.', cat: 'hu', fx: { board: 2, fans: 0.004 }, sig: { curante: 1, gracioso: 1 } }],
        n: ['{club} renueva a {yo}', 'Garrido: «No hay nada más revolucionario en el fútbol moderno que un hombre que trabaja y no presume. Larga vida al currante».'] }
    ]
  };

  P.profesor = {
    n: 'Profesor', motes: ['el Ajedrecista', 'el Profesor', 'Míster Pizarra'],
    sig: { 'estilo:tec': 2, 'act:retreat': 0.5, twist_desmonta: 1 },
    eff: { vest: 0.1, dir: 0.3, afi: -0.0003, sala: 0.5 }, nat: ['tec'], anti: ['hu', 'pol'],
    pista: ['Le pregunté si estaba contento y me respondió con un porcentaje de duelos ganados. Me fui con la sensación de haber suspendido un examen.',
      'En {club} dicen que las charlas del entrenador duran dos horas y tienen diapositivas. Los jugadores han empezado a tomar apuntes. Algunos, de verdad.'],
    mote: { q: 'Le llaman «{mote}». ¿Es usted demasiado cerebral para el fútbol?', a: [
      { t: 'El fútbol es ajedrez con sudor. Yo solo intento que no se note el sudor.', cat: 'tec', abraza: true },
      { t: 'Ojalá. A veces pienso que me sobra cabeza y me falta corazón.', cat: 'hum', abraza: false },
      { t: 'Le contesto con una diapositiva. Tengo tres preparadas.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que convierte cada partido en una partida de ajedrez', 'Vídeo, datos y pizarra: la obsesión táctica de {yo} conquista a los analistas.'],
    profe: ['La pizarra no marca goles, chaval. Los marcan los chavales que se creen la pizarra. Asegúrate de que se la creen.'],
    caps: [
      { tit: 'La lección magistral', q: 'Una universidad le invita a dar una clase sobre su sistema. ¿Irá?', o: [
        { t: 'Iré. Y les pondré examen.', cat: 'hu', fx: { fans: 0.002, board: 0.5 }, sig: { profesor: 2, gracioso: 1 } },
        { t: 'No. Mis ideas son del club, no de una universidad.', cat: 'pro', fx: { board: 1 }, sig: { profesor: 1, padre: 1 } },
        { t: 'Iré y llevaré a dos jugadores. Ellos lo explican mejor que yo.', cat: 'hum', fx: { team: 1 }, sig: { profesor: 1, curante: 1 } }],
        n: ['{yo}, profesor universitario por un día', 'La pizarra del técnico de {club} llega a las aulas.'] },
      { tit: 'Demasiadas instrucciones', q: 'Un jugador ha dicho que «hay tantas instrucciones que a veces no sabe ni dónde está». ¿Simplificará?', o: [
        { t: 'Simplificaré. Si el jugador duda, el que se ha equivocado soy yo.', cat: 'hum', fx: { team: 2 }, sig: { profesor: -1, curante: 2 } },
        { t: 'No. El fútbol de élite es complejo. Que estudie más.', cat: 'dur', fx: { team: -2, board: 0.5 }, sig: { profesor: 2, despota: 1 } },
        { t: 'Le daré un esquema plastificado. Para el bolsillo del pantalón.', cat: 'hu', fx: { team: 0.5, fans: 0.002 }, sig: { profesor: 1, gracioso: 1 } }],
        n: ['¿Demasiada pizarra en {club}?', 'Un jugador se queja de la complejidad del sistema de {yo}.'] },
      { tit: 'Jaque mate', q: 'Ha ganado con un cambio de sistema en el minuto 60 que nadie entendía. ¿Nos lo explica?', o: [
        { t: 'Se lo explico: lo preparamos hace tres semanas. Solo esperábamos el momento.', cat: 'tec', fx: { board: 2, fans: 0.004 }, sig: { profesor: 3, leyenda: 1 } },
        { t: 'No se lo explico. Así el próximo rival tampoco lo entiende.', cat: 'amb', fx: { fans: 0.004, rival: 1 }, sig: { profesor: 2, chulo: 1 } },
        { t: 'El mérito es de ellos: lo ejecutaron a ciegas porque confían en el plan.', cat: 'pro', fx: { team: 2.5 }, sig: { profesor: 1, padre: 2 } }],
        n: ['El jaque mate de {yo}', 'Garrido: «He visto a muchos entrenadores mover piezas. Pocos que movieran el tablero entero sin que nadie se diera cuenta».'] }
    ]
  };

  P.lloron = {
    n: 'Llorón', motes: ['el Llorón', 'Míster Excusa', 'el Plañidero'],
    sig: { protesta: 1.5, protesta_mal: 2, 'nuke:ref': 2, 'estilo:pol': 0.5, roja_tecnico: 0.5 },
    eff: { vest: -0.15, dir: -0.25, afi: 0, sala: 1 }, nat: ['pol', 'eva'], anti: ['hum', 'amb'],
    pista: ['Esta semana el entrenador de {club} ha culpado de la derrota al árbitro, al césped, al calendario y al viento. Me quedé esperando a que culpara a la luna. No hubo tiempo.',
      'Hay entrenadores que pierden y analizan. El de {club} pierde y redacta una lista. La lista es larga, y él nunca aparece en ella.'],
    mote: { q: 'Le llaman «{mote}». Dicen que siempre tiene una excusa. ¿Tiene una para esto?', a: [
      { t: 'Tengo varias. Pero hoy no las voy a usar.', cat: 'hu', abraza: false },
      { t: 'Excusas no: razones. Y hoy las razones vestían de negro.', cat: 'pol', abraza: true },
      { t: 'Me lo he ganado. A partir de hoy, la culpa es mía.', cat: 'hum', abraza: false }] },
    noticia: ['«{mote}»: el entrenador que nunca pierde por su culpa', 'Árbitros, césped, calendario… el catálogo de excusas de {yo} da para un libro.'],
    profe: ['Cuando la culpa siempre es de otro, chaval, los chavales aprenden a buscar culpables en vez de soluciones. Y eso se pega.'],
    caps: [
      { tit: 'La lista', q: 'Un periódico ha publicado la lista de todas sus excusas de la temporada. Son veintitrés. ¿Algo que decir?', o: [
        { t: 'Que se les han olvidado tres.', cat: 'hu', fx: { fans: 0.003 }, sig: { lloron: 1, gracioso: 2 } },
        { t: 'Que todas eran verdad.', cat: 'pol', fx: { board: -1 }, sig: { lloron: 3 } },
        { t: 'Que la lista es justa. Y que la próxima la escribo yo, con mis errores.', cat: 'hum', fx: { board: 1.5, team: 0.5 }, sig: { lloron: -4, curante: 2 } }],
        n: ['Las veintitrés excusas de {yo}', 'Un medio recopila los lamentos del técnico de {club}. Se vuelve viral.'] },
      { tit: 'El árbitro responde', q: 'El árbitro del domingo ha dicho que «hay entrenadores que deberían mirarse al espejo». ¿Va por usted?', o: [
        { t: 'Que se mire él, que ve poco.', cat: 'pol', fx: { fine: [0.7, 10000], board: -1.5 }, sig: { lloron: 3, bocazas: 1 } },
        { t: 'Puede que vaya por mí. Y puede que tenga razón.', cat: 'hum', fx: { board: 1 }, sig: { lloron: -3 } },
        { t: 'No contesto a árbitros. Ni a espejos.', cat: 'eva', fx: {}, sig: { lloron: 0, tibio: 1 } }],
        n: ['El árbitro contesta a {yo}', 'Choque público entre el colegiado y el técnico de {club}.'] },
      { tit: 'Sin excusas', q: 'Hoy ha perdido y no ha mencionado al árbitro ni una vez. ¿Está enfermo?', o: [
        { t: 'Estoy curado. Hemos perdido porque el rival fue mejor. Punto.', cat: 'hum', fx: { board: 2.5, team: 1, fans: 0.004 }, sig: { lloron: -6, curante: 2 } },
        { t: 'Estoy guardando fuerzas para la rueda de prensa del martes.', cat: 'hu', fx: { fans: 0.003 }, sig: { lloron: 1, gracioso: 1 } },
        { t: 'No hacía falta. Lo han visto ustedes igual que yo.', cat: 'pol', fx: { board: -0.5 }, sig: { lloron: 2 } }],
        n: ['{yo}, sin excusas por primera vez', 'Garrido: «Ha ocurrido. Ha perdido y ha dicho que el otro fue mejor. Guardo el periódico para enmarcarlo».'] }
    ]
  };

  P.chulo = {
    n: 'Chulo', motes: ['el Especial', 'Míster Ego', 'el Único'],
    sig: { 'estilo:amb': 2, solo: 1, 'nuke:walk': 2, sponsor_riesgo: 1, 'estilo:pol': 0.3 },
    eff: { vest: 0.1, dir: -0.2, afi: 0.0012, sala: 1.5 }, nat: ['amb'], anti: ['hum', 'eva'],
    pista: ['El entrenador de {club} habla de sí mismo en tercera persona dos de cada diez veces. Las otras ocho, en primera del plural mayestático.',
      'Entra en la sala de prensa como quien entra en un escenario: tarde, despacio y mirando a la cámara buena. Lo malo es que, de momento, los resultados le acompañan.'],
    mote: { q: 'Le llaman «{mote}». ¿Se considera el mejor entrenador de la liga?', a: [
      { t: 'De la liga, sí. Del mundo, lo estoy valorando.', cat: 'amb', abraza: true },
      { t: 'Me considero afortunado. Los mejores son los que juegan.', cat: 'hum', abraza: false },
      { t: 'Que lo digan ustedes. Yo me limito a ganar.', cat: 'amb', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que no conoce la modestia', 'Gafas de sol en rueda de prensa, frases para la historia y una autoestima a prueba de derrotas: así es {yo}.'],
    profe: ['Un poco de chulería está bien, chaval, da confianza. Pero el día que pierdas, todo lo que has dicho volverá a por ti. Y ese día llega.'],
    caps: [
      { tit: 'El documental', q: 'Una plataforma quiere grabar un documental sobre usted. ¿Lo hará?', o: [
        { t: 'Lo haré. Pero quiero aprobar el montaje. Y salir bien de perfil.', cat: 'amb', fx: { fans: 0.006, board: -1 }, sig: { chulo: 3 } },
        { t: 'Sobre mí no. Sobre el equipo, encantado.', cat: 'pro', fx: { team: 1.5, fans: 0.003 }, sig: { chulo: -2, padre: 1 } },
        { t: 'Ya lo tengo escrito. Se llama «Yo». Tres temporadas.', cat: 'hu', fx: { fans: 0.004 }, sig: { chulo: 2, gracioso: 1 } }],
        n: ['Un documental sobre {yo}', 'Las cámaras desembarcan en {club}. El técnico, protagonista absoluto.'] },
      { tit: 'La derrota humillante', q: 'Le han metido cuatro. ¿Dónde está ahora el mejor entrenador de la liga?', o: [
        { t: 'Aquí. Y el domingo seguiré siendo el mejor. Un mal día no cambia la historia.', cat: 'amb', fx: { fans: 0.002, board: -1.5 }, sig: { chulo: 3 } },
        { t: 'Hoy, en el banquillo de los que se equivocan. Y me lo he ganado.', cat: 'hum', fx: { board: 1.5, team: 1 }, sig: { chulo: -4, curante: 1 } },
        { t: 'En el vestuario, consolando a los míos. Eso es lo que hacen los mejores.', cat: 'pro', fx: { team: 2 }, sig: { chulo: -1, padre: 2 } }],
        n: ['{yo}, ante su peor día', 'Goleada en contra para el técnico más seguro de sí mismo de la liga.'] },
      { tit: 'La corona o el espejo', q: 'La revista más importante del fútbol le ha nombrado entrenador del año. ¿Unas palabras?', o: [
        { t: 'Ya era hora. Llevo tres años siéndolo.', cat: 'amb', fx: { fans: 0.006, board: -0.5 }, sig: { chulo: 3, leyenda: 1 } },
        { t: 'El premio es de veinticinco jugadores y de un utillero que me aguanta. Yo solo me lo llevo a casa.', cat: 'hum', fx: { team: 3, board: 2, fans: 0.006 }, sig: { chulo: -3, leyenda: 3 } },
        { t: 'Gracias. Me lo esperaba, pero me hace ilusión igual.', cat: 'hu', fx: { fans: 0.004 }, sig: { chulo: 1, gracioso: 1 } }],
        n: ['{yo}, entrenador del año', 'Garrido: «Ha ganado el premio. Ahora le queda el más difícil: no creérselo».'] }
    ]
  };

  P.padre = {
    n: 'Padre', motes: ['el Padre del Vestuario', 'Míster Abrazo', 'el Patriarca'],
    sig: { 'estilo:pro': 2, comodin: 0.5, 'act:bbq': 1, 'act:dayoff': 0.5, 'nuke:pres': -1 },
    eff: { vest: 0.5, dir: -0.1, afi: 0.0005, sala: 0 }, nat: ['pro', 'hum'], anti: ['dur', 'pol'],
    pista: ['En {club}, cuando un jugador tiene un problema en casa, lo primero que hace es llamar al entrenador. Lo segundo, a su madre.',
      'Le pregunté por un jugador que había fallado un penalti y me habló de él como si fuera su hijo. A lo mejor por eso ese chaval corre como corre.'],
    mote: { q: 'Le llaman «{mote}». ¿No es demasiado blando con sus jugadores?', a: [
      { t: 'Blando no. Cerca. Y a los que tengo cerca les exijo más que a nadie.', cat: 'pro', abraza: true },
      { t: 'Puede que sí. Tendré que apretar más.', cat: 'dur', abraza: false },
      { t: 'Con los míos, siempre. Con los demás, ya veremos.', cat: 'pro', abraza: true }] },
    noticia: ['«{mote}»: el entrenador al que su plantilla adora', 'Los jugadores de {club} hablan de {yo} con una devoción que pocas veces se ve en el fútbol profesional.'],
    profe: ['Eso es lo más bonito de este oficio, chaval. Pero ojo: el padre también tiene que saber decir que no.'],
    caps: [
      { tit: 'El hijo pródigo', q: 'Uno de sus jugadores ha sido pillado de fiesta antes del partido. ¿Le va a sancionar?', o: [
        { t: 'Le sancionaré. Y luego le daré un abrazo. Las dos cosas.', cat: 'pro', fx: { team: 1, board: 0.5 }, sig: { padre: 2 } },
        { t: 'No. Ya se siente bastante mal.', cat: 'pro', fx: { team: 0.5, board: -1 }, sig: { padre: 2, tibio: 1 } },
        { t: 'Con todo el peso de las normas. Aquí no hay favoritos.', cat: 'dur', fx: { team: -0.5, board: 1 }, sig: { padre: -2, despota: 1 } }],
        n: ['Un jugador de {club}, de fiesta antes del partido', 'El técnico decide cómo actuar. Su relación con la plantilla, a prueba.'] },
      { tit: 'La familia', q: 'Ha ido al entierro del padre de un juvenil del club, a quinientos kilómetros, la víspera de un partido. ¿Por qué?', o: [
        { t: 'Porque es de los nuestros. Y los nuestros no están solos.', cat: 'pro', fx: { team: 2.5, fans: 0.004 }, sig: { padre: 3 } },
        { t: 'No voy a hablar de eso. Es privado.', cat: 'eva', fx: { team: 1 }, sig: { padre: 1 } },
        { t: 'Porque hay cosas más importantes que el fútbol. Pocas, pero hay.', cat: 'hum', fx: { team: 2, board: 0.5 }, sig: { padre: 2, curante: 1 } }],
        n: ['El gesto de {yo}', 'El técnico de {club} recorre quinientos kilómetros para acompañar a un juvenil.'] },
      { tit: 'Todos a una', q: 'Sus jugadores han hecho una camiseta con su cara para celebrar el gol. ¿Cómo se siente?', o: [
        { t: 'Como el hombre más afortunado del mundo. Y un poco feo, la foto no me favorece.', cat: 'hu', fx: { team: 2, fans: 0.004 }, sig: { padre: 2, gracioso: 1 } },
        { t: 'Que no la vuelvan a hacer. La camiseta que importa es la del escudo.', cat: 'hum', fx: { team: 1, board: 1 }, sig: { padre: 1, curante: 1 } },
        { t: 'Que esto no lo cambio ni por un título. Bueno, por un título a lo mejor sí.', cat: 'pro', fx: { team: 3, fans: 0.004 }, sig: { padre: 3, leyenda: 1 } }],
        n: ['Los jugadores celebran con la cara de {yo}', 'Garrido: «He visto vestuarios unidos por el dinero y por el miedo. Este está unido por algo que no sale en las cuentas».'] }
    ]
  };

  P.conspiranoico = {
    n: 'Conspiranoico', motes: ['el Conspiranoico', 'Míster Complot', 'el de la Mano Negra'],
    sig: { 'nuke:ref': 3, protesta_mal: 1.5, 'soc:conspi': 3, 'estilo:pol': 0.5 },
    eff: { vest: -0.1, dir: -0.3, afi: 0.0005, sala: 1.5 }, nat: ['pol', 'eva'], anti: ['hum', 'tec'],
    pista: ['El entrenador de {club} me ha preguntado si los árbitros y los periodistas comemos juntos. Le he dicho que solo en Navidad. No me ha creído.',
      'Ha hablado de «intereses», de «fuerzas oscuras» y de «quien mueve los hilos». Me he quedado con ganas de preguntarle por el lateral derecho, pero no me ha parecido el momento.'],
    mote: { q: 'Le llaman «{mote}». ¿De verdad cree que hay una conspiración contra {club}?', a: [
      { t: 'No lo creo. Lo sé. Y algún día lo demostraré.', cat: 'pol', abraza: true },
      { t: 'No. Creo que a veces busco culpables donde no los hay.', cat: 'hum', abraza: false },
      { t: 'Si se lo cuento, tendría que pedirle que apagara la grabadora.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que ve complots en todas partes', 'Árbitros, periodistas, la federación… nadie se libra de las sospechas de {yo}.'],
    profe: ['Chaval, a veces el árbitro se equivoca y punto. Si buscas un culpable fuera, nunca miras dentro. Y dentro es donde está la solución.'],
    caps: [
      { tit: 'El dossier', q: 'Dice tener un dossier con «pruebas» de que los árbitros perjudican a {club}. ¿Lo va a enseñar?', o: [
        { t: 'Lo enviaré a la federación. Y a tres periódicos, por si acaso.', cat: 'pol', fx: { board: -1.5, fans: 0.004 }, sig: { conspiranoico: 3 } },
        { t: 'No hay dossier. Fue un calentón y pido perdón.', cat: 'hum', fx: { board: 1.5 }, sig: { conspiranoico: -4 } },
        { t: 'El dossier tiene doscientas páginas. La mitad son vídeos.', cat: 'hu', fx: { fans: 0.002 }, sig: { conspiranoico: 2, gracioso: 1 } }],
        n: ['El dossier de {yo}', 'El técnico de {club} asegura tener pruebas contra el arbitraje.'] },
      { tit: 'El periodista infiltrado', q: 'Acusa a un periodista de esta sala de «trabajar para el rival». ¿A quién se refiere?', o: [
        { t: 'Él lo sabe. Y yo sé que él lo sabe.', cat: 'pol', fx: { board: -1, fans: 0.002 }, sig: { conspiranoico: 3 } },
        { t: 'A nadie. Me he dejado llevar.', cat: 'hum', fx: { board: 1 }, sig: { conspiranoico: -3 } },
        { t: 'Al que se ha puesto nervioso ahora mismo.', cat: 'hu', fx: { fans: 0.003 }, sig: { conspiranoico: 2, gracioso: 1 } }],
        n: ['{yo} señala a la prensa', 'El técnico de {club} acusa a un periodista de trabajar para el rival.'] },
      { tit: 'La verdad', q: 'La federación ha investigado sus denuncias y no ha encontrado nada. ¿Qué tiene que decir?', o: [
        { t: 'Que eso es exactamente lo que diría quien está en el ajo.', cat: 'pol', fx: { board: -3, fans: 0.003 }, sig: { conspiranoico: 4 } },
        { t: 'Que me equivoqué. Pido perdón a los árbitros, a la federación y a ustedes.', cat: 'hum', fx: { board: 2.5, fans: 0.002 }, sig: { conspiranoico: -8, curante: 2 } },
        { t: 'Que seguiré atento. Por si acaso.', cat: 'eva', fx: { board: -0.5 }, sig: { conspiranoico: 1 } }],
        n: ['La federación no encuentra nada', 'Garrido: «Llevo cuarenta años en esto y nunca he visto una conspiración. He visto errores, egos y mala suerte. Que es peor, porque no se pueden denunciar».'] }
    ]
  };
})();
