/* TOUCHLINE — preguntas de la rueda de prensa del partido (lo que ha pasado de verdad).
 *
 * Datos, no código. Cada pregunta:
 *   id      se usa también para las variantes del banco de frases (data/game/prensa-frases-*.js)
 *   cuando  situación (una clave o varias, todas ciertas; '!clave' la niega). Claves: ver flags() en js/prensa.js
 *   peso    lo probable que es que salga (número, o { si: clave, n, no } para que dependa de algo)
 *   q       la pregunta, con huecos: {rival} {gf} {ga} {jug} {next} {staff} {brand} {camp} {hatTipo} {objetivo} {tarjeta}
 *   o       respuestas: t (texto; tsi/tno para cambiarlo según una clave), cat (estilo, opcional: si no, se deduce),
 *           g (encaje 0-2; gsi: [clave, si, no]), need [habilidad, nivel], fx (efectos; fxsi: [clave, si, no])
 *   fx      team, board, fans, fine [prob, €], pl ['@quién', moral], rival 1 (+ rivalClub '@opp'|'@next')
 *           quién: @penMiss @og @red @subGoal @hat @star @kid @inj @signing */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  DB.partido = [
    // ---- El resultado
    { id: 'win', cuando: 'win', peso: 3, q: 'Tres puntos ante el {rival}. ¿Se va a casa con una sonrisa o con la libreta llena de deberes?', o: [
      { t: 'Hoy mis jugadores han dejado el alma en el césped. Yo solo he puesto la corbata.', g: 2, fx: { team: 1.5 } },
      { t: 'Contento, sí. Pero esta noche veré el partido otra vez y no voy a dormir mucho.', g: 1, fx: { board: 0.5 } },
      { t: 'Hoy les hemos hecho un unboxing. No había color, tremendo.', gsi: ['goleada', 1, 0], fx: { fans: 0.004, rival: 1 } },
      { t: 'Este grupo tiene un aura que no se compra. Y aún estamos en modo tutorial.', g: 2, need: ['mot1', 2], fx: { team: 2.5, fans: 0.004 } }] },
    { id: 'draw', cuando: 'draw', peso: 3, q: 'Un punto ante el {rival}. ¿Vaso medio lleno o medio vacío?', o: [
      { t: 'Medio lleno. En mayo, los puntos que hoy parecen pequeños pesan como piedras.', g: 2, fx: { team: 1 } },
      { t: 'Medio vacío. Ni tan mal, pero no me renta.', g: 1, fx: { board: 0.3 } },
      { t: 'El árbitro hoy tenía el mando en la mano. Red flag.', gsi: ['refMine', 1, 0], fx: { fine: [0.35, 5000], fans: 0.003 } },
      { t: 'Sabe a poco, y eso me encanta: hace un año esto nos habría sabido a gloria.', g: 2, need: ['tac2', 1], fx: { team: 1.5, board: 0.8 } }] },
    { id: 'loss', cuando: 'loss', peso: 3, q: '{ga}-{gf}. ¿Dónde se ha perdido hoy el partido?', o: [
      { t: 'Se ha perdido en mi pizarra. Los palos, para mí; a los chavales, ni tocarlos.', g: 2, fx: { team: 1.5, board: -0.3 } },
      { t: 'Alguno hoy ha jugado en modo avión. Y lo sabe.', g: 0, fx: { team: -3 } },
      { t: 'Día random. Mañana café cargado y a seguir.', g: 1, fx: { team: 0.5 } },
      { t: 'En tres detalles. Los tengo apuntados aquí, y el martes los vamos a machacar.', g: 2, need: ['tac1', 2], fx: { team: 1, board: 1 } }] },
    { id: 'thrash', cuando: 'thrash', peso: 4, q: '{ga}-{gf}. ¿Le han pasado por encima?', o: [
      { t: 'Nos han pasado por encima, literal. A la gente que ha venido: perdón, de corazón.', g: 2, fx: { fans: 0.003, team: 0.5 } },
      { t: 'Esta camiseta pesa, y hoy a alguno le quedaba oversize.', g: 0, fx: { team: -3.5, board: 0.5 } },
      { t: 'Cero dramas. Un mal día lo tiene cualquiera, hasta Spotify se cae.', g: 0, fx: { board: -1 } },
      { t: 'Esto escuece, y quiero que escueza. Que nadie duerma bien hoy: mañana a las ocho, todos aquí.', g: 2, need: ['mot3', 1], fx: { team: 1.5, board: 1, fans: 0.003 } }] },

    // ---- El árbitro y tú
    { id: 'protest', cuando: 'protests', peso: 3.2, q: 'Le vimos muy encendido en la banda{tarjeta}. ¿Por qué?', o: [
      { t: 'Pongan la repetición. Si no tenía razón, les invito a unas cañas. Spoiler: la tenía.', gsi: ['protestRight', 2, 0], fxsi: ['protestRight', { fans: 0.004 }, { fine: [0.35, 4000], board: -0.5 }] },
      { t: 'Me he calentado más que Sevilla en agosto. No era mi mejor versión, lo reconozco.', gsi: ['protestWrong', 2, 1], fx: { board: 0.8 } },
      { t: 'Si quieren un entrenador NPC, que pongan una estatua en la banda.', g: 0, fx: { fans: 0.003, board: -0.8 } },
      { t: 'Al cuarto árbitro le hablé de usted y con educación. Discrepar no es faltar.', g: 2, need: ['arb2', 1], fx: { board: 0.6, team: 0.5 } }] },
    { id: 'coachRed', cuando: 'coachRed', peso: 5, q: '¿Qué tal se ve el fútbol desde la grada?', o: [
      { t: 'Fatal, se lo aseguro. Me equivoqué y pido disculpas.', g: 2, fx: { board: 1 } },
      { t: 'Desde arriba se ve todo mejor. Y lo volvería a hacer, sin filtro.', g: 0, fx: { fans: 0.005, fine: [0.5, 5000], board: -1 } },
      { t: 'Siguiente pregunta. Next.', g: 1, fx: {} },
      { t: 'Me equivoqué yo, no ellos. Esta semana llamo al colegiado y lo arreglamos como adultos.', g: 2, need: ['dis3', 1], fx: { board: 1.5, team: 0.5 } }] },
    { id: 'refNoProtest', cuando: 'refNoProtest', peso: 2.6, q: 'Hubo una jugada muy discutida en su contra y usted ni se inmutó. ¿Es zen o estaba mirando el móvil?', o: [
      { t: 'De árbitros no hablo, que luego me cobran.', g: 1, fx: { board: 0.3 } },
      { t: 'Ni zen ni móvil: estaba contando hasta diez. Pero que nos han robado, nos han robado.', g: 0, fx: { fans: 0.006, fine: [0.45, 6000], board: -0.5 } },
      { t: 'Zen. Mi energía la gasto en mis jugadores, no en un señor de amarillo.', g: 2, fx: { board: 0.8, team: 0.5 } },
      { t: 'Lo veré con calma. Y si hay algo que decir, el club tiene buenos abogados y mejores cauces.', g: 2, need: ['dis3', 2], fx: { board: 1.2 } }] },

    // ---- Lo que salió mal
    { id: 'lateLost', cuando: 'lateLost', peso: 3, q: 'Gol en el descuento. ¿Se apagó la luz?', o: [
      { t: 'Se apagó la luz del banquillo, que es la mía. No supe cerrar el partido.', g: 2, fx: { team: 1, board: -0.3 } },
      { t: 'Algunos ya estaban pensando en el after.', g: 0, fx: { team: -2 } },
      { t: 'El fútbol es así: cuando crees que lo tienes, te deja en visto.', g: 1, fx: {} },
      { t: 'Nos faltó picardía. Esta semana entrenamos a perder tiempo como profesionales.', g: 2, need: ['tac2', 2], fx: { team: 1, board: 0.8 } }] },
    { id: 'penMiss', cuando: 'penMiss', peso: 3, q: '{jug} falló el penalti. ¿Seguirá tirándolos?', o: [
      { t: 'El que más. Solo falla los penaltis quien tiene lo que hay que tener para tirarlos.', g: 2, fx: { pl: ['@penMiss', 3] } },
      { t: 'Hay cola para tirar penaltis en este equipo. Ya veremos.', g: 1, fx: { pl: ['@penMiss', -2] } },
      { t: 'Eso no se falla. Ni con los ojos cerrados.', g: 0, fx: { pl: ['@penMiss', -5], team: -0.5 } },
      { t: '{jug} es de los que más se responsabilizan. El próximo lo mete, seguro.', g: 2, need: ['mot2', 1], fx: { pl: ['@penMiss', 5], team: 0.5 } }] },
    { id: 'og', cuando: 'og', peso: 2.6, q: 'El gol en propia de {jug}. ¿Cómo está?', o: [
      { t: 'Hoy le invito yo a cenar. A cualquiera le pasa, y él es de los que más corre.', g: 2, fx: { pl: ['@og', 3] } },
      { t: 'Hombre, hay que mirar a qué portería se dispara. Básico.', g: 0, fx: { pl: ['@og', -3] } },
      { t: 'Del vídeo no hablo, que me pongo triste.', g: 1, fx: {} }] },
    { id: 'bigMiss', cuando: 'bigMissLoss', peso: 2.4, q: 'Ocasiones para ganar tres partidos. ¿Mal de ojo o skill issue?', o: [
      { t: 'Si llegamos así, los goles vendrán como el Cercanías: tarde, pero de tres en tres.', g: 2, fx: { team: 1 } },
      { t: 'Hoy el portero rival se merece un monumento. Y nosotros, un tirón de orejas.', g: 1, fx: { team: -0.5, board: 0.3 } },
      { t: 'Skill issue. A los delanteros se les paga por meterla.', g: 0, fx: { team: -2 } },
      { t: 'La portería no se mueve. Ya les dije que algún día se van a cansar de fallar.', g: 2, need: ['mot1', 1], fx: { team: 1.5 } }] },
    { id: 'red', cuando: 'red', peso: 2.8, q: '¿Cómo valora la expulsión de {jug}?', o: [
      { t: 'Se le ha ido la cabeza un segundo. Ya me ha pedido perdón y yo le he pedido un café.', g: 2, fx: { pl: ['@red', -1], board: 0.5 } },
      { t: 'Con esa vara de medir, el partido habría acabado siete contra siete.', gsi: ['refMine', 1, 0], fx: { fans: 0.003, fine: [0.25, 4000] } },
      { t: 'Nos ha dejado con diez. Hablaremos, y no por WhatsApp.', g: 0, fx: { pl: ['@red', -5], team: -1 } },
      { t: 'De puertas afuera, lo defiendo a muerte. De puertas adentro… que se prepare.', g: 2, need: ['mot2', 2], fx: { pl: ['@red', 2], team: 1, board: 0.5 } }] },

    // ---- Tus decisiones en el partido
    { id: 'subGoal', cuando: 'subGoal', peso: 3, q: '{jug} sale del banquillo y la clava. ¿Brujería?', o: [
      { t: 'El mérito es de {jug}, que ha salido con hambre.', g: 2, fx: { pl: ['@subGoal', 4] } },
      { t: 'Brujería no: aura de entrenador. De nada.', g: 0, fx: { team: -0.5 } },
      { t: 'Hoy ha salido cara. Otro día saldrá cruz.', g: 1, fx: {} },
      { t: 'Ni brujería ni suerte: sus centrales sufrían a la espalda. Lo preparamos el jueves, y él lo ha bordado.', g: 2, need: ['tac3', 1], fx: { pl: ['@subGoal', 4], board: 0.8 } }] },
    { id: 'noSubs', cuando: 'noSubs', peso: 2.6, q: 'Perdiendo, y el banquillo intacto. ¿Se le olvidó que había cambios?', o: [
      { t: 'Creía en los once que estaban dentro. Ciegamente.', g: 1, fx: { team: 0.5 } },
      { t: 'Si hubiera visto calentar a los del banquillo, tampoco. Estaban en modo siesta.', g: 0, fx: { team: -2.5 } },
      { t: 'No se me olvidó, se me pasó. Que es peor. Culpa mía.', g: 2, fx: { board: 0.5, team: 0.5 } },
      { t: 'El plan era aguantar y morder al final. No mordimos. Lo asumo.', g: 2, need: ['tac2', 1], fx: { board: 0.8 } }] },
    { id: 'tactic', cuando: 'tactic', peso: 1.8, q: 'Cambió el dibujo en pleno partido. ¿Qué vio desde la banda?', o: [
      { t: 'Dar un paso adelante, y el equipo lo ha entendido.', tsi: 'ahead', tno: 'Buscar soluciones. No han llegado.', g: 2, fx: { team: 0.5 } },
      { t: 'Eso se queda en mi libreta. Y mi libreta no sale de esta sala.', g: 1, fx: {} },
      { t: 'Que mis jugadores me tenían silenciado. Ya no.', g: 0, fx: { team: -2 } },
      { t: 'Que nos estaban encontrando entre líneas. Movimos dos piezas y se les acabó el chollo.', g: 2, need: ['tac3', 2], fx: { board: 1 } }] },

    // ---- Lo bueno
    { id: 'comeback', cuando: 'comeback', peso: 3.4, q: 'Remontada. ¿Qué les dijo para darle la vuelta? ¿Hubo gritos?', o: [
      { t: 'Ni un grito. Les miré a los ojos y les dije: este partido es nuestro, id a por él.', g: 2, fx: { team: 2, fans: 0.003 } },
      { t: 'Dos flechas en la pizarra. Son listos, lo pillaron a la primera.', g: 1, fx: { board: 0.6 } },
      { t: 'Mejor no tener que remontar, ¿eh? Que me salen canas y no tengo edad.', g: 1, fx: { team: -0.5, board: 0.6 } },
      { t: 'Les dije que el partido todavía nos estaba esperando. Y salieron a buscarlo como lobos.', g: 2, need: ['mot1', 3], fx: { team: 3, fans: 0.005 } }] },
    { id: 'lateWin', cuando: 'lateWin', peso: 2.8, q: 'Gol en el último suspiro. ¿Le queda corazón?', o: [
      { t: 'Tengo el corazón a 200. Si alguien lo encuentra en la banda, que me lo devuelva por Wallapop.', g: 2, fx: { fans: 0.004 } },
      { t: 'Llevábamos llamando a la puerta desde el minuto uno. Al final nos abrieron.', g: 1, fx: { team: 0.5 } },
      { t: 'Suerte, para qué engañarnos. Hoy nos ha tocado la lotería de Navidad.', g: 0, fx: { team: -1 } },
      { t: 'Este equipo cree hasta el final. Lo de {jug} es el premio a eso.', g: 2, need: ['mot3', 2], fx: { team: 2, fans: 0.004 } }] },
    { id: 'hat', cuando: 'hat', peso: 2.6, q: '{hatTipo} de {jug}. ¿Hasta dónde puede llegar?', o: [
      { t: 'Hasta donde quiera. Tiene más hambre que un estudiante de Erasmus.', g: 2, fx: { pl: ['@hat', 4] } },
      { t: 'Él empuja el balón, pero detrás hay diez tíos poniéndoselo en bandeja.', g: 2, fx: { team: 1, pl: ['@hat', 1] } },
      { t: 'Que no se flipe. Mañana a recoger conos, por si acaso.', g: 1, fx: { pl: ['@hat', -1], board: 0.4 } },
      { t: 'Cuando llegó, vi a un buen jugador. Hoy he visto a otra cosa. Y aún no tiene techo.', g: 2, need: ['can2', 1], fx: { pl: ['@hat', 6], board: 0.5 } }] },
    { id: 'star', cuando: 'star', peso: 2, q: '{jug} ha estado espectacular. ¿Es su mejor momento?', o: [
      { t: '{jug} es un futbolista diferente.', g: 1, fx: { pl: ['@star', 5], team: -0.4 } },
      { t: 'Un violín suena bonito, pero lo de hoy ha sido una orquesta.', g: 2, fx: { team: 1, pl: ['@star', 1] } },
      { t: 'Le voy a exigir el doble. A los buenos, más.', g: 1, fx: { pl: ['@star', -2], board: 0.4 } },
      { t: '{jug} hace mejores a los de su alrededor. Eso es lo que más valoro.', g: 2, need: ['mot2', 1], fx: { pl: ['@star', 4], team: 1 } }] },
    { id: 'kid', cuando: 'kid', peso: 1.8, q: '{jug} ha dado un paso adelante. ¿Le veremos más?', o: [
      { t: 'Ha llamado a la puerta, y la puerta se le ha abierto.', g: 2, fx: { pl: ['@kid', 5] } },
      { t: 'Despacito. A los chavales no se les quema: se les cocina a fuego lento.', g: 2, fx: { pl: ['@kid', 1], board: 0.4 } },
      { t: 'Que no se emocione. Aquí nadie tiene el sitio reservado, esto no es Ryanair con prioridad.', g: 0, fx: { pl: ['@kid', -2] } }] },
    { id: 'clean', cuando: 'cleanWin', peso: 1.4, q: 'Portería a cero. ¿La defensa es la clave?', o: [
      { t: 'Aquí defiende hasta el utillero. Empezando por el nueve.', g: 2, fx: { team: 1 } },
      { t: 'Hoy sí. No me acostumbro, que otras semanas parecemos un colador.', g: 1, fx: { board: 0.4 } },
      { t: 'Hoy el portero ha hecho speedrun de paradas. A los demás, ni las buenas noches.', g: 0, fx: { team: -1.5 } }] },

    // ---- Lo inesperado
    { id: 'bolt', cuando: 'bolt', peso: 6, q: 'Lo ocurrido con {jug} ha conmocionado a todos. ¿Unas palabras?', o: [
      { t: 'Hoy el marcador me da igual. Todo el vestuario está con él y con su familia.', g: 2, fx: { team: 1, board: 1, fans: 0.004 } },
      { t: 'Perdonen, hoy no me salen las palabras de fútbol.', g: 2, fx: { team: 0.5 } },
      { t: 'La temporada no espera a nadie. El domingo, otra vez.', g: 0, fx: { team: -2, fans: -0.004 } }] },
    { id: 'crowd', cuando: 'crowd', peso: 2.2, q: '¿Qué le ha parecido el espectáculo de la grada?', o: [
      { t: 'Eso no es fútbol. Quien venga a eso, que se quede en casa.', gsi: ['crowdParty', 1, 2], fx: { board: 0.8 } },
      { t: 'Cuatro random no son una afición. La nuestra es top.', gsi: ['crowdParty', 2, 0], fx: { fans: 0.004 } },
      { t: 'Para eso hay un club con despachos. Yo tengo una pizarra.', g: 1, fx: {} },
      { t: 'Nuestra grada es lo mejor que tenemos. Por eso le pido que la cuide como cuida el escudo.', g: 2, need: ['neg2', 1], fx: { fans: 0.005, board: 0.6 } }] },
    { id: 'inj', cuando: 'inj', peso: 1.8, q: '¿Cómo está {jug}?', o: [
      { t: 'Crucemos los dedos. Mañana, resonancia y a rezar.', g: 2, fx: { pl: ['@inj', 1] } },
      { t: 'Si es lo que parece, nos quitan un pulmón.', g: 1, fx: { pl: ['@inj', 2], team: -0.3 } },
      { t: 'Para eso tenemos veinticinco. Aquí nadie es imprescindible.', g: 1, fx: { team: 0.5, pl: ['@inj', -1] } },
      { t: 'Está en las mejores manos. Y cuando vuelva, le estará esperando su sitio.', g: 2, need: ['fis3', 1], fx: { pl: ['@inj', 3], team: 0.5 } }] },

    // ---- Lo que has hecho en el club estas semanas
    { id: 'signing', cuando: 'signing', peso: 2.2, q: '¿Qué aporta {jug}, el fichaje?', o: [
      { t: 'Lo han visto ustedes igual que yo: carácter y una zurda que da gusto.', tsi: 'signingPlayed', tno: 'Necesita su rodaje, como un coche nuevo. Pero acelera que da miedo.', g: 2, fx: { pl: ['@signing', 3] } },
      { t: 'Con él vamos a por todo. Hacedle captura a esto.', g: 1, fx: { pl: ['@signing', 2], fans: 0.003, board: -0.3 } },
      { t: 'Firmar es fácil. Ahora, que se lo curre.', g: 0, fx: { pl: ['@signing', -3] } },
      { t: 'Le seguíamos desde hace meses. Era la pieza que le faltaba al puzle.', g: 2, need: ['neg1', 1], fx: { pl: ['@signing', 3], board: 0.8 } }] },
    { id: 'sale', cuando: 'sale', peso: 2, q: '¿Por qué ha dejado salir a {jug}?', o: [
      { t: 'Se va un amigo. Le deseo todo, menos contra nosotros.', g: 2, fx: { board: 0.6 } },
      { t: 'Pregunten arriba. Yo solo entreno.', g: 0, fx: { board: -1 } },
      { t: 'No se puede retener a quien ya tenía la maleta en el Bizum.', g: 1, fx: { team: -0.3 } },
      { t: 'Con ese dinero el club respira. Y el chaval que esperaba su hueco, ya lo tiene.', g: 2, need: ['neg3', 1], fx: { board: 1, team: 0.5 } }] },
    { id: 'staff', cuando: 'staff', peso: 1.4, q: 'Ha incorporado a {staff} a su cuerpo técnico. ¿Por qué?', o: [
      { t: 'Sabe cosas que yo no sé. Y eso, en un cuerpo técnico, vale oro.', g: 2, fx: { team: 0.5 } },
      { t: 'Porque el anterior era muy de boomer. Así de claro.', g: 0, fx: { board: -0.5 } },
      { t: 'Buen profesional. Mejor persona. Fin.', g: 1, fx: {} }] },
    { id: 'sponsorR', cuando: 'sponsorR', peso: 2.4, q: 'El nuevo patrocinador, {brand}, no gusta a parte de la afición. ¿Qué opina?', o: [
      { t: 'Entiendo el enfado. Yo pongo el once, no el logo de la camiseta.', g: 2, fx: { fans: 0.002 } },
      { t: 'Con poesía no se paga el alquiler. Y mira cómo está Madrid.', g: 1, fx: { board: 0.5, fans: -0.002 } },
      { t: '¿Patrocinador? Ni idea de lo que venden, la verdad.', g: 0, fx: { fans: -0.003 } },
      { t: 'Les doy mi palabra: ese dinero irá a la cantera y al estadio. Y yo vigilaré que así sea.', g: 2, need: ['neg2', 2], fx: { fans: 0.004, board: 0.8 } }] },
    { id: 'sponsor', cuando: 'sponsor', peso: 1.2, q: '{brand} entra como patrocinador. ¿Qué supone para el club?', o: [
      { t: 'Que el club crece. Y cuando el club crece, crecemos todos.', g: 2, fx: { board: 0.6 } },
      { t: 'Más balones, más vídeo, más de todo. Bienvenidos.', g: 1, fx: { board: 0.3 } },
      { t: 'Yo de eso sé lo mismo que de criptos.', g: 0, fx: { board: -0.5 } },
      { t: 'Que una marca así quiera nuestro escudo en el pecho dice mucho de lo que estamos construyendo.', g: 2, need: ['neg2', 1], fx: { board: 1, fans: 0.003 } }] },
    { id: 'campaign', cuando: 'campaign', peso: 1.2, q: 'El club ha lanzado «{camp}». ¿Lo apoya?', o: [
      { t: 'Al cien por cien. Un club sin su gente es un solar.', g: 2, fx: { fans: 0.003 } },
      { t: 'Si llena el estadio, yo mismo hago el TikTok.', g: 1, fx: {} },
      { t: 'Mi única campaña es ganar el domingo. Lo demás, contenido.', g: 0, fx: { board: -0.5 } }] },

    // ---- Para completar la rueda de prensa
    { id: 'next', cuando: 'next', peso: 1, q: 'Ahora viene el {next}. ¿Les ha mandado algún mensaje?', o: [
      { t: 'Respeto, todo el del mundo. Miedo, ninguno.', g: 2, fx: { team: 0.3 } },
      { t: 'Que vayan reservando el BlaBlaCar de vuelta.', g: 1, fx: { team: 0.8, fans: 0.003, rival: 1, rivalClub: '@next' } },
      { t: 'Que se preocupen ellos. Nosotros, tranqui.', g: 0, fx: { rival: 1, rivalClub: '@next', fans: 0.003 } },
      { t: 'Ya tengo tres vídeos suyos vistos. Sé dónde les duele.', g: 2, need: ['tac3', 1], fx: { team: 1, board: 0.4 } }] },
    { id: 'board', peso: { si: 'boardLow', n: 2, no: 0.6 }, q: 'Se dice que su silla tiembla. ¿Lo nota?', o: [
      { t: 'Mi silla está más firme que nunca. Pregunten al vestuario.', g: 1, fx: { team: 0.3 } },
      { t: 'Mi silla me la gano cada domingo. Lo demás son tertulias.', g: 2, fx: {} },
      { t: 'Si alguien quiere mi silla, que me lo diga a la cara y no por un audio de tres minutos.', g: 0, fx: { board: -2 } },
      { t: 'Ceno con el presidente cada semana. Y de momento me sigue invitando.', g: 2, need: ['neg3', 1], fx: { board: 1.5 } }] },
    { id: 'season', peso: 0.8, q: '¿Con qué sueña para lo que queda de temporada?', o: [
      { t: 'El que nos ha pedido el club: {objetivo}.', g: 2, fx: { board: 0.8 } },
      { t: 'Con ganarlo todo. Main character energy.', g: 0, fx: { fans: 0.004, board: -0.5 } },
      { t: 'Sueño despierto: con el próximo domingo.', g: 1, fx: {} },
      { t: 'Con ver a este equipo mejor cada lunes que el anterior. Lo demás vendrá solo.', g: 2, need: ['mot3', 1], fx: { team: 1, board: 0.6 } }] },
    { id: 'fans', peso: 0.7, q: 'Última pregunta. ¿Algo para los que les siguen desde casa?', o: [
      { t: 'Que el domingo los quiero afónicos. Os necesitamos, de verdad.', g: 2, fx: { fans: 0.003 } },
      { t: 'Paciencia. Esto no es un reel de quince segundos.', g: 1, fx: {} },
      { t: 'Que vengan más, que hay asientos con más polvo que mi Tuenti.', g: 0, fx: { fans: -0.004 } },
      { t: 'Este escudo es suyo. Nosotros solo lo llevamos prestado noventa minutos.', g: 2, need: ['neg2', 2], fx: { fans: 0.007 } }] }
  ];
})();
