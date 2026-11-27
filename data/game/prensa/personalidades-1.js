/* TOUCHLINE — personalidades ocultas del entrenador (1/2).
 *
 * Nadie te dice quién eres. Lo vas siendo. Cada cosa que haces (cómo contestas a la prensa, si plantas a los
 * periodistas, si reclamas, si te lías…) alimenta en silencio una o varias personalidades. La que domina se va
 * notando: primero en la columna de Aurelio Garrido, luego en un mote, luego en las redes, y por fin en una historia
 * en tres capítulos que puede acabar en gloria o en desastre.
 *
 * Esquema de cada personalidad:
 *   n        nombre interno (nunca se enseña tal cual: lo que ve el jugador son los motes)
 *   motes    cómo te llama la prensa
 *   sig      qué señales la alimentan y con qué peso (las emite js/persona.js desde todo el juego)
 *   eff      efectos semanales mientras domina: dir (confianza directiva), afi (afición, %), vest (moral), sala (prensa)
 *   nat/anti estilos de respuesta que te salen solos (cuestan menos) o que te cuestan horrores
 *   pista    lo que escribe Garrido cuando aún no sabe ponerte nombre
 *   mote     la rueda de prensa en la que te lo sueltan a la cara (abrazarlo lo refuerza, rechazarlo lo debilita)
 *   noticia  cuando el mote se hace oficial en las redes
 *   profe    lo que te dice el Profe, a solas
 *   caps     tres capítulos: pregunta de prensa con sus respuestas (efectos y señales) y la noticia que lo cierra
 * Huecos: {mote} {club} {yo} (tu nombre) {rival} {pres} (el presidente) */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  const P = DB.personas = DB.personas || {};

  P.gracioso = {
    n: 'Gracioso', motes: ['el Showman', 'Míster Meme', 'el Monologuista'],
    sig: { 'estilo:hu': 2, muletilla: 1.5, 'act:bbq': 0.5, comodin_bromista: 1 },
    eff: { vest: 0.3, dir: -0.15, afi: 0.0008, sala: 1 }, nat: ['hu'], anti: ['dur', 'tec'],
    pista: ['Hay entrenadores que explican derrotas y entrenadores que las convierten en sketch. Este es de los segundos. Aún no sé si es un genio o un peligro.',
      'La sala de prensa de {club} se ha convertido en el mejor espectáculo de la ciudad. Los martes ya hay gente que viene sin ser periodista.'],
    mote: { q: 'Míster, en las redes ya le llaman «{mote}». ¿Se ve más en un escenario que en un banquillo?', a: [
      { t: 'Si me dan un micro y un taburete, hago dos funciones. Pero la buena es la del domingo.', cat: 'hu', abraza: true },
      { t: 'Yo soy entrenador. Lo de hacer gracia es un efecto secundario.', cat: 'tec', abraza: false },
      { t: 'Aceptamos el mote. Y propinas.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que convierte cada rueda de prensa en un monólogo', 'Los vídeos de {yo} superan en visualizaciones a los resúmenes de los partidos. En {club} no saben si reírse o preocuparse.'],
    profe: ['Chaval, la gente se ríe contigo. Cuidado con el día que empiece a reírse de ti: es la misma risa, pero suena distinto.'],
    caps: [
      { tit: 'El club de la comedia', q: 'Una cadena le ofrece un programa propio los lunes. ¿Lo va a aceptar?', o: [
        { t: 'Solo si el plató tiene pizarra. Y si me dejan hacer los cambios desde allí.', cat: 'hu', fx: { fans: 0.004, board: -0.8 }, sig: { gracioso: 2 } },
        { t: 'No. Mi programa es el partido del domingo, y ese no lo cambio.', cat: 'hum', fx: { board: 1 }, sig: { gracioso: -2 } },
        { t: 'Ya lo he grabado. Sale en el segundo bloque, después de la publicidad.', cat: 'hu', fx: { fans: 0.006, board: -1.5 }, sig: { gracioso: 3 } }],
        n: ['{yo}, ¿humorista o entrenador?', 'Una cadena tienta al técnico de {club} con un programa propio. En el palco, gesto serio.'] },
      { tit: 'La broma que no hizo gracia', q: 'Su chiste del domingo sobre el rival ha molestado mucho en {rival}. Piden una disculpa. ¿La va a dar?', o: [
        { t: 'Me disculpo. El humor es para unir, y si separa, no sirve.', cat: 'hum', fx: { board: 1, fans: -0.002 }, sig: { gracioso: -1, curante: 1 } },
        { t: 'Si no aguantan un chiste, que no vean el partido de vuelta.', cat: 'pol', fx: { board: -1.5, fans: 0.004 }, sig: { gracioso: 1, polemista: 2 } },
        { t: 'Les mando una tarta. Con la cara del chiste dibujada. Pero con cariño.', cat: 'hu', fx: { fans: 0.003 }, sig: { gracioso: 2 } }],
        n: ['El chiste de {yo} cruza la frontera', 'El técnico de {club} convierte una rueda de prensa en conflicto diplomático con {rival}.'] },
      { tit: 'El último monólogo', q: 'Dicen que esta podría ser su última rueda de prensa en {club}. Si lo fuera, ¿con qué se despediría?', o: [
        { t: 'Con una reverencia. Y con la clasificación en la mano, que es el mejor chiste que me sé.', cat: 'hu', fx: { fans: 0.008, board: 1 }, sig: { gracioso: 2, leyenda: 2 } },
        { t: 'No me despido. Los buenos cómicos siempre vuelven para el bis.', cat: 'amb', fx: { fans: 0.004 }, sig: { gracioso: 1 } },
        { t: 'Sin bromas. Gracias por todo. Va en serio, que lo he ensayado.', cat: 'hum', fx: { board: 2, team: 1 }, sig: { gracioso: -1, curante: 2 } }],
        n: ['La sala de prensa de {club} aplaude en pie a {yo}', 'Por primera vez en años, los periodistas aplauden al acabar una rueda de prensa. Garrido escribe que ha visto «teatro del bueno».'] }
    ]
  };

  P.pasota = {
    n: 'Pasota', motes: ['el Pasota', 'Míster Siesta', 'el Encogido de Hombros'],
    sig: { plantar: 3, silencio: 1.5, 'estilo:eva': 1, 'act:dayoff': 1, 'nuke:walk': 1 },
    eff: { vest: 0.2, dir: -0.35, afi: -0.0008, sala: -1 }, nat: ['eva'], anti: ['amb', 'dur'],
    pista: ['Le he visto bostezar durante el himno. No sé si es una estrategia psicológica o simplemente sueño.',
      'Pregunté a un empleado de {club} cuándo llega el entrenador por las mañanas. «Llegar, llega», me dijo. No quiso añadir más.'],
    mote: { q: 'Le llaman «{mote}». Dicen que le da todo igual. ¿Le da todo igual?', a: [
      { t: 'Un poco. Pero con mucha intensidad.', cat: 'hu', abraza: true },
      { t: 'Me importa más de lo que parece. Lo que pasa es que no lo grito.', cat: 'hum', abraza: false },
      { t: '…', cat: 'eva', abraza: true }] },
    noticia: ['«{mote}»: el entrenador al que nada le quita el sueño', 'Ni las derrotas ni las polémicas alteran el pulso de {yo}. Unos lo llaman calma; otros, desgana.'],
    profe: ['Una cosa es no volverse loco y otra no estar. Los chavales notan la diferencia antes que tú.'],
    caps: [
      { tit: 'La siesta', q: 'Le han grabado dormido en el banquillo durante el calentamiento. ¿Qué tiene que decir?', o: [
        { t: 'Estaba visualizando el partido. Con los ojos cerrados se ve mejor.', cat: 'hu', fx: { fans: 0.002, board: -0.8 }, sig: { pasota: 2, gracioso: 1 } },
        { t: 'Mal hecho. No volverá a pasar.', cat: 'hum', fx: { board: 0.8 }, sig: { pasota: -2 } },
        { t: 'Y ganamos. Pues igual duermo más.', cat: 'amb', fx: { board: -1.2, fans: 0.003 }, sig: { pasota: 3 } }],
        n: ['¿Dormido en el banquillo?', 'El vídeo de {yo} con los ojos cerrados durante el calentamiento da la vuelta a las redes.'] },
      { tit: 'El presidente pierde la paciencia', q: 'El presidente dice que «le gustaría ver más hambre» en el banquillo. ¿Se da por aludido?', o: [
        { t: 'Hambre tengo. Lo que pasa es que como despacio.', cat: 'hu', fx: { board: -1 }, sig: { pasota: 2 } },
        { t: 'Tiene razón. Me pongo las pilas desde mañana.', cat: 'hum', fx: { board: 1.5 }, sig: { pasota: -3, curante: 1 } },
        { t: 'Que venga él a entrenar. Le dejo el silbato.', cat: 'pol', fx: { board: -2.5, fans: 0.003 }, sig: { pasota: 1, bocazas: 2 } }],
        n: ['Tensión entre {pres} y {yo}', 'El presidente de {club} pide «más hambre» al banquillo. El técnico responde a su manera.'] },
      { tit: 'Despertar', q: 'Hoy ha estado irreconocible en la banda: gritos, carreras, saltos. ¿Qué le ha pasado?', o: [
        { t: 'Que me he despertado. Llevaba meses dormido y no me había dado cuenta.', cat: 'hum', fx: { board: 2, team: 1.5 }, sig: { pasota: -5, curante: 2 } },
        { t: 'Un café de más. No se acostumbren.', cat: 'hu', fx: { fans: 0.003 }, sig: { pasota: 1, gracioso: 1 } },
        { t: 'Nada. Mañana vuelvo a ser el de siempre.', cat: 'eva', fx: { board: -1.5 }, sig: { pasota: 3 } }],
        n: ['El despertar de {yo}', 'Nadie había visto así al técnico de {club}. Garrido escribe: «Algo ha cambiado. O alguien le ha cambiado el café».'] }
    ]
  };

  P.tibio = {
    n: 'Tibio', motes: ['el Tibio', 'Míster Ni Fu Ni Fa', 'el Equilibrista'],
    sig: { 'estilo:eva': 2, 'estilo:hum': 0.5, 'soc:tibio': 3, comodin: 0.5 },
    eff: { vest: 0, dir: 0.2, afi: -0.0006, sala: -1 }, nat: ['eva', 'hum'], anti: ['pol', 'amb'],
    pista: ['He releído mis notas de sus últimas cinco ruedas de prensa. No he encontrado una sola frase que se pueda subrayar. Eso, en este oficio, también es un talento.',
      'Le pregunté si el partido había sido bueno o malo. Me contestó que «había tenido cosas». Sigo pensando en qué cosas.'],
    mote: { q: 'Los aficionados le llaman «{mote}». Dicen que nunca se moja. ¿Se va a mojar hoy?', a: [
      { t: 'Depende. Hay días que sí y días que también.', cat: 'eva', abraza: true },
      { t: 'Me mojo: este equipo va a pelear por todo. Ahí lo tienen.', cat: 'amb', abraza: false },
      { t: 'Me traigo paraguas, por si acaso.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que nunca dice nada', 'Un medio ha analizado las declaraciones de {yo}: el 80 % podrían aplicarse a cualquier partido de la historia.'],
    profe: ['No mojarse es cómodo hasta que llueve. Y en el fútbol siempre acaba lloviendo.'],
    caps: [
      { tit: 'El dilema', q: 'El vestuario está partido en dos por la titularidad del portero. ¿A quién apoya?', o: [
        { t: 'A los dos. Y al de la cantera también, que viene apretando.', cat: 'eva', fx: { team: -1 }, sig: { tibio: 2 } },
        { t: 'Al que juega. Y juega el que mejor está, sin más.', cat: 'tec', fx: { team: 0.5, board: 0.5 }, sig: { tibio: -2, profesor: 1 } },
        { t: 'Eso lo hablo con ellos, no con ustedes.', cat: 'pro', fx: { team: 1 }, sig: { tibio: -1, padre: 1 } }],
        n: ['{yo} no elige', 'El debate de la portería sigue abierto en {club}. El técnico, una vez más, no se pronuncia.'] },
      { tit: 'La encuesta', q: 'Una encuesta dice que usted es el entrenador más indiferente de la liga. ¿Qué le parece?', o: [
        { t: 'Ni bien ni mal. Indiferente, como dice la encuesta.', cat: 'hu', fx: { fans: 0.002 }, sig: { tibio: 2, gracioso: 1 } },
        { t: 'Me parece injusta. Y ya está, ya me he mojado.', cat: 'pol', fx: { fans: 0.003 }, sig: { tibio: -2, polemista: 1 } },
        { t: 'Prefiero no valorar encuestas.', cat: 'eva', fx: { board: -0.5 }, sig: { tibio: 3 } }],
        n: ['El entrenador más indiferente de la liga', 'Ni amor ni odio: {yo} lidera un ranking que nadie quiere liderar.'] },
      { tit: 'Mojarse', q: 'Hoy se juega usted el puesto. Si tuviera que decir una sola frase que la gente recuerde, ¿cuál sería?', o: [
        { t: 'Que aquí no se rinde nadie. Y yo, el primero.', cat: 'amb', fx: { board: 1.5, fans: 0.006, team: 1 }, sig: { tibio: -6, leyenda: 2 } },
        { t: 'Que el fútbol tiene cosas buenas y cosas mejorables.', cat: 'eva', fx: { board: -2, fans: -0.004 }, sig: { tibio: 3 } },
        { t: 'Que os quiero. Ya está, lo he dicho.', cat: 'pro', fx: { team: 2, fans: 0.004 }, sig: { tibio: -4, padre: 2 } }],
        n: ['{yo}, al fin, se moja', 'La frase del técnico de {club} abre todas las portadas. Garrido: «Llevaba meses esperándolo. Ha merecido la pena».'] }
    ]
  };

  P.timido = {
    n: 'Tímido', motes: ['el Invisible', 'Míster Susurro', 'el Mudo'],
    sig: { silencio: 2.5, 'estilo:eva': 1, comodin: 1.5, plantar: 1, solo: -1 },
    eff: { vest: 0.1, dir: -0.1, afi: -0.0004, sala: -0.5 }, nat: ['eva', 'tec'], anti: ['pol', 'hu', 'amb'],
    pista: ['Su voz en la sala de prensa no llega a la tercera fila. Los de la cuarta fila ya han pedido un micrófono adicional.',
      'Hay entrenadores que llenan la sala. Este parece querer que la sala se vacíe cuanto antes. Y lo consigue.'],
    mote: { q: '¿Puede hablar un poco más alto? Le llaman «{mote}» y empezamos a entender por qué.', a: [
      { t: '(más bajo todavía) Lo intento.', cat: 'eva', abraza: true },
      { t: '¿ASÍ MEJOR? Perdonen. Estoy aprendiendo.', cat: 'hu', abraza: false },
      { t: 'Hablo poco porque prefiero que hable el equipo.', cat: 'hum', abraza: false }] },
    noticia: ['«{mote}»: el entrenador al que nadie oye', 'Los micrófonos de la sala de prensa de {club} se han cambiado dos veces este mes. El problema no eran los micrófonos.'],
    profe: ['Que hables poco no es malo. Lo malo es que los chavales no sepan lo que piensas. Díselo a ellos, aunque no se lo digas a la prensa.'],
    caps: [
      { tit: 'El micro abierto', q: 'Un micrófono le ha pillado diciendo a su ayudante «ojalá acabe pronto esto». ¿Se refería a la rueda de prensa?', o: [
        { t: 'Sí. Y no me arrepiento.', cat: 'hu', fx: { fans: 0.003, board: -0.5 }, sig: { timido: 1, gracioso: 1 } },
        { t: 'Me refería al partido. Estaba sufriendo mucho.', cat: 'eva', fx: {}, sig: { timido: 2 } },
        { t: 'Perdón. Hablar en público no es lo mío. Lo mío es el campo.', cat: 'hum', fx: { board: 0.5, fans: 0.002 }, sig: { timido: 1, curante: 1 } }],
        n: ['El micro que delató a {yo}', 'El técnico de {club} reconoce que las ruedas de prensa se le hacen eternas.'] },
      { tit: 'La charla que nadie oyó', q: 'Dicen que en el descanso dio la charla tan bajito que el capitán tuvo que repetirla. ¿Es verdad?', o: [
        { t: 'Es verdad. Y la repitió mejor que yo. Por eso es el capitán.', cat: 'hum', fx: { team: 1 }, sig: { timido: 1, padre: 1 } },
        { t: 'No. Simplemente hablo para quien quiere escuchar.', cat: 'tec', fx: { team: -0.5 }, sig: { timido: 1 } },
        { t: 'A partir de hoy, megáfono.', cat: 'hu', fx: { team: 0.5, fans: 0.002 }, sig: { timido: -2, gracioso: 1 } }],
        n: ['El capitán, portavoz de {yo}', 'En el vestuario de {club} se dice que el capitán traduce al entrenador. En voz alta.'] },
      { tit: 'El grito', q: 'Hoy ha gritado tan fuerte en la banda que se le ha oído en la tribuna. ¿Qué ha pasado?', o: [
        { t: 'Que llevaba dos años guardándolo. Y ha salido todo junto.', cat: 'hu', fx: { team: 2, fans: 0.005 }, sig: { timido: -5, leyenda: 1 } },
        { t: 'Perdón. No era mi intención.', cat: 'hum', fx: {}, sig: { timido: 2 } },
        { t: 'Que este equipo me ha dado una voz que no sabía que tenía.', cat: 'pro', fx: { team: 2.5, board: 1 }, sig: { timido: -4, padre: 2 } }],
        n: ['El grito de {yo}', 'El técnico más silencioso de la liga rompe su silencio en la banda. La grada, en pie.'] }
    ]
  };

  P.bocazas = {
    n: 'Bocazas', motes: ['el Bocazas', 'el Altavoz', 'Míster Megáfono'],
    sig: { 'estilo:pol': 1, 'estilo:amb': 1.2, 'nuke:pres': 3, 'nuke:ref': 1, roja_tecnico: 1, protesta: 0.5, comodin_bocazas: 1 },
    eff: { vest: 0.1, dir: -0.4, afi: 0.0012, sala: 1.5 }, nat: ['amb', 'pol'], anti: ['eva', 'hum'],
    pista: ['Le pregunté por el clima y acabó prometiendo la liga. No era una pregunta sobre la liga.',
      'Hay hombres que piensan antes de hablar. Y luego está el entrenador de {club}, que habla para enterarse de lo que piensa.'],
    mote: { q: 'Le llaman «{mote}». Dicen que habla más de la cuenta. ¿Habla más de la cuenta?', a: [
      { t: 'Hablo lo justo. Lo que pasa es que lo justo, en mi caso, es mucho.', cat: 'amb', abraza: true },
      { t: 'Puede ser. Voy a intentar medirme más.', cat: 'hum', abraza: false },
      { t: 'Y lo que me queda por decir. Saquen libreta.', cat: 'pol', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que no tiene filtro', 'Cada rueda de prensa de {yo} es un titular. En {club} ya han contratado a un segundo jefe de prensa.'],
    profe: ['Cada palabra que sueltas la pagan once tíos el domingo. Habla lo que quieras, pero sabiendo quién paga.'],
    caps: [
      { tit: 'La promesa', q: 'La semana pasada prometió ganar al {rival} «por tres goles». ¿Lo mantiene?', o: [
        { t: 'Por tres. O por cuatro, que hoy me he levantado generoso.', cat: 'amb', fx: { fans: 0.005, board: -1, rival: 1 }, sig: { bocazas: 3 } },
        { t: 'Me pasé. Me conformo con ganar.', cat: 'hum', fx: { board: 0.8 }, sig: { bocazas: -2 } },
        { t: 'Lo dije yo, pero lo firmaban mis jugadores.', cat: 'pro', fx: { team: 0.5, fans: 0.002 }, sig: { bocazas: 1 } }],
        n: ['{yo} promete una goleada', 'El técnico de {club} calienta el partido ante {rival}. En el vestuario rival lo han colgado en la pared.'] },
      { tit: 'La multa', q: 'Competición le estudia por sus declaraciones. ¿Le preocupa?', o: [
        { t: 'Que me multen. Lo pago con gusto, que la verdad sale cara.', cat: 'pol', fx: { fine: [0.8, 12000], fans: 0.004, board: -1 }, sig: { bocazas: 2, polemista: 1 } },
        { t: 'Me preocupa. Me he equivocado en las formas.', cat: 'hum', fx: { board: 1 }, sig: { bocazas: -2 } },
        { t: 'Me preocupa más el domingo. Lo otro, para los abogados.', cat: 'tec', fx: {}, sig: { bocazas: -1, profesor: 1 } }],
        n: ['Competición estudia a {yo}', 'Las declaraciones del técnico de {club} podrían acabar en sanción.'] },
      { tit: 'La última palabra', q: 'Si hoy pudiera decir lo que quisiera sin consecuencias, ¿qué diría?', o: [
        { t: 'Que somos los mejores. Y que el que no lo vea, que se compre gafas.', cat: 'amb', fx: { fans: 0.008, board: -2 }, sig: { bocazas: 3, chulo: 1 } },
        { t: 'Gracias. A la gente. Ya está. A veces lo más difícil es decir poco.', cat: 'hum', fx: { board: 2, fans: 0.004 }, sig: { bocazas: -4, curante: 2 } },
        { t: 'Lo diría en el campo. Que es donde se dicen las cosas.', cat: 'tec', fx: { team: 1.5 }, sig: { bocazas: -3, profesor: 1 } }],
        n: ['{yo}, sin filtro (o casi)', 'Garrido: «He conocido muchos bocazas. Pocos que supieran callarse a tiempo. Hoy ha estado a punto».'] }
    ]
  };

  P.polemista = {
    n: 'Buscapolémicas', motes: ['el Incendiario', 'el Pirómano', 'el Rey del Titular'],
    sig: { 'estilo:pol': 2, 'nuke:pres': 2, 'nuke:ref': 2, twist_echa: 2, protesta: 0.5 },
    eff: { vest: 0, dir: -0.4, afi: 0.0015, sala: 2 }, nat: ['pol'], anti: ['hum', 'eva'],
    pista: ['Llevo treinta años en esto y nunca había visto a un entrenador buscar las cámaras como quien busca el balón suelto.',
      'Hay una regla no escrita en este oficio: cuando no hay noticia, la crea el entrenador de {club}.'],
    mote: { q: 'Le llaman «{mote}». ¿Busca usted las polémicas o le encuentran ellas?', a: [
      { t: 'Yo las invito. Ellas vienen solas.', cat: 'pol', abraza: true },
      { t: 'Yo solo digo lo que pienso. Si eso es polémica, el problema no es mío.', cat: 'pol', abraza: true },
      { t: 'No quiero más líos. De verdad.', cat: 'hum', abraza: false }] },
    noticia: ['«{mote}»: el entrenador que vive del titular', 'Ningún técnico de la liga acumula tantas polémicas como {yo}. Las tertulias ya tienen sección fija.'],
    profe: ['El fuego calienta, chaval. Hasta que te quema la casa. Y la casa es el vestuario.'],
    caps: [
      { tit: 'La tertulia', q: 'Un programa de televisión le dedica una sección semanal. ¿Va a ir a defenderse?', o: [
        { t: 'Voy. Y llevo palomitas.', cat: 'pol', fx: { fans: 0.004, board: -1 }, sig: { polemista: 2, gracioso: 1 } },
        { t: 'No. Mi tertulia es el entrenamiento.', cat: 'tec', fx: { board: 1 }, sig: { polemista: -2 } },
        { t: 'Que me pongan de presentador y lo hago yo.', cat: 'amb', fx: { fans: 0.003, board: -1.5 }, sig: { polemista: 2, bocazas: 1 } }],
        n: ['{yo}, protagonista de las tertulias', 'Una televisión dedica una sección semanal a las polémicas del técnico de {club}.'] },
      { tit: 'El vestuario harto', q: 'Fuentes del vestuario dicen que los jugadores están cansados de leer su nombre en las polémicas. ¿Qué responde?', o: [
        { t: 'Que lean la clasificación, que también salen.', cat: 'pol', fx: { team: -2, fans: 0.002 }, sig: { polemista: 2, despota: 1 } },
        { t: 'Que tienen razón. Me lo como yo, no ellos.', cat: 'pro', fx: { team: 1.5 }, sig: { polemista: -2, padre: 2 } },
        { t: 'Las fuentes del vestuario no existen. Existe el vestuario.', cat: 'eva', fx: { team: -0.5 }, sig: { polemista: 1 } }],
        n: ['Malestar en el vestuario de {club}', 'Los jugadores, cansados del ruido que rodea a {yo}.'] },
      { tit: 'El incendio', q: 'Dicen que usted ha conseguido algo histórico: que hablen más de usted que del equipo. ¿Era el plan?', o: [
        { t: 'El plan era ganar. Lo de que hablen de mí es para que no hablen de ellos.', cat: 'pro', fx: { team: 2, board: 1 }, sig: { polemista: -1, padre: 2, leyenda: 1 } },
        { t: 'Que hablen. Mientras hablen de mí, nadie mira lo que hacemos en el campo.', cat: 'tec', fx: { board: 0.5, fans: 0.003 }, sig: { polemista: 2, profesor: 1 } },
        { t: 'Lo histórico vendrá. Esto es solo el tráiler.', cat: 'amb', fx: { fans: 0.006, board: -2 }, sig: { polemista: 3 } }],
        n: ['{yo}, más famoso que su equipo', 'Garrido: «Hay entrenadores que hacen historia y entrenadores que hacen ruido. Este aún está a tiempo de elegir».'] }
    ]
  };

  P.ligon = {
    n: 'Ligón', motes: ['el Galán', 'Don Juan de la banda', 'Míster Romántico'],
    sig: { flechazo: 3, lio: 4, 'estilo:hu': 0.3, 'act:bbq': 0.3, muletilla: 0.3 },
    eff: { vest: -0.2, dir: -0.25, afi: 0.0008, sala: 1 }, nat: ['hu', 'amb'], anti: ['dur'],
    pista: ['Las revistas del corazón han empezado a pedir acreditación para las ruedas de prensa de {club}. No vienen a preguntar por el sistema.',
      'Me cuentan que el entrenador de {club} sonríe más a las cámaras que a su propio presidente. Las cámaras, de momento, le devuelven la sonrisa.'],
    mote: { q: 'Las revistas le llaman «{mote}». ¿Le molesta salir más en la prensa rosa que en la deportiva?', a: [
      { t: 'Me molesta que no salga el equipo en la foto.', cat: 'hu', abraza: true },
      { t: 'Mi vida privada no le interesa a nadie. Hablemos del partido.', cat: 'eva', abraza: false },
      { t: 'Me molesta que me saquen el perfil malo. El bueno es el izquierdo.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que arrasa en la prensa rosa', 'Las portadas del corazón se disputan a {yo}. En {club}, preocupación por la «distracción».'],
    profe: ['Una cosa es caer bien y otra que caigan los que tienes alrededor. Cuida a quien tienes cerca.'],
    caps: [
      { tit: 'La portada', q: 'Sale en la portada de una revista con el titular «El soltero más deseado del fútbol». ¿Es cierto?', o: [
        { t: 'Lo de soltero, no se lo confirmo. Lo de deseado, que pregunten al presidente.', cat: 'hu', fx: { fans: 0.004, board: -0.6 }, sig: { ligon: 2, gracioso: 1 } },
        { t: 'No voy a hablar de mi vida privada.', cat: 'eva', fx: {}, sig: { ligon: -1 } },
        { t: 'El más deseado es el delantero, que lleva diez goles.', cat: 'pro', fx: { team: 0.8 }, sig: { ligon: -1, padre: 1 } }],
        n: ['{yo}, portada del corazón', 'El técnico de {club} aparece en la revista más leída del país. No precisamente hablando de fútbol.'] },
      { tit: 'Celos en el vestuario', q: 'Dicen que hay celos en el vestuario por sus «amistades». ¿Hay mal ambiente?', o: [
        { t: 'Hay buen ambiente. Y si hay celos, que se pongan guapos.', cat: 'hu', fx: { team: -1.5, fans: 0.002 }, sig: { ligon: 3 } },
        { t: 'Nunca mezclo lo personal con lo profesional. Nunca.', cat: 'tec', fx: { team: 0.5, board: 0.5 }, sig: { ligon: -2 } },
        { t: 'Si alguien se siente mal, que venga a hablar conmigo.', cat: 'pro', fx: { team: 1 }, sig: { ligon: -1, padre: 1 } }],
        n: ['¿Celos en el vestuario de {club}?', 'El entorno personal de {yo} genera tensión, según fuentes del club.'] },
      { tit: 'El amor y el fútbol', q: 'Si tuviera que elegir entre el amor y el fútbol, ¿qué elegiría?', o: [
        { t: 'El fútbol. El amor ya me eligió a mí, que es más cómodo.', cat: 'hu', fx: { fans: 0.006 }, sig: { ligon: 2, leyenda: 1 } },
        { t: 'El amor. El fútbol es lo que hago; el amor es lo que soy.', cat: 'amb', fx: { fans: 0.004, board: -1.5 }, sig: { ligon: 3 } },
        { t: 'Elijo a mis jugadores. Ellos son lo que me queda cuando apagan los focos.', cat: 'pro', fx: { team: 2.5, board: 1 }, sig: { ligon: -3, padre: 3 } }],
        n: ['El dilema de {yo}', 'Garrido: «Me han preguntado si este hombre es un romántico o un donjuán. Lo segundo se cura. Lo primero, nunca».'] }
    ]
  };

  P.pandillero = {
    n: 'Pandillero', motes: ['el del Barrio', 'el Callejero', 'Míster Chándal'],
    sig: { roja_tecnico: 2, 'nuke:walk': 1, 'nuke:pres': 1, 'act:bbq': 1.5, 'estilo:pro': 0.8, protesta: 0.5 },
    eff: { vest: 0.5, dir: -0.35, afi: 0.001, sala: 0 }, nat: ['pro', 'pol'], anti: ['tec', 'eva'],
    pista: ['Le vi llegar al estadio en chándal, con una bolsa de pipas y tres jugadores detrás como si fueran su cuadrilla. Le saludaron hasta los de seguridad.',
      'Hay entrenadores que salen de las escuelas de entrenadores. Este parece haber salido de un portal. Y lo digo como un elogio.'],
    mote: { q: 'Le llaman «{mote}». ¿Se siente orgulloso de dónde viene?', a: [
      { t: 'Orgulloso y con el chándal planchado. Del barrio no se sale: se lleva dentro.', cat: 'pro', abraza: true },
      { t: 'Vengo de donde vengo. Pero ahora represento a {club}.', cat: 'hum', abraza: false },
      { t: 'Que vengan al barrio y me lo digan. Les invito a un bocata.', cat: 'hu', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que trajo el barrio al banquillo', '{yo} rompe moldes: chándal, pipas y una plantilla que le seguiría a cualquier parte.'],
    profe: ['Los tuyos te van a seguir siempre, eso es oro. Pero un banquillo no es una esquina: aquí también hay que saber perder.'],
    caps: [
      { tit: 'La pelea del bar', q: 'Le vieron anoche en un bar discutiendo con aficionados rivales. ¿Qué pasó?', o: [
        { t: 'Que defendí mis colores. Y la cuenta la pagué yo.', cat: 'pro', fx: { fans: 0.004, board: -2 }, sig: { pandillero: 3 } },
        { t: 'Un malentendido. Pido disculpas.', cat: 'hum', fx: { board: 1 }, sig: { pandillero: -2 } },
        { t: 'Discutimos de fútbol. En voz alta, eso sí.', cat: 'hu', fx: { fans: 0.002, board: -0.8 }, sig: { pandillero: 1, gracioso: 1 } }],
        n: ['{yo}, protagonista de una discusión en un bar', 'El técnico de {club} se encara con aficionados rivales. El club estudia el caso.'] },
      { tit: 'La cuadrilla', q: 'Dicen que tiene un grupo de jugadores intocables, «su cuadrilla». ¿Es verdad?', o: [
        { t: 'Tengo una familia. Y en la familia no se deja a nadie atrás.', cat: 'pro', fx: { team: 0.5 }, sig: { pandillero: 2, padre: 1 } },
        { t: 'Aquí juega el que mejor está. Sin cuadrillas.', cat: 'tec', fx: { team: 1, board: 0.5 }, sig: { pandillero: -2, profesor: 1 } },
        { t: 'Que los que no están en la cuadrilla se lo ganen.', cat: 'dur', fx: { team: -2 }, sig: { pandillero: 2, despota: 1 } }],
        n: ['¿Hay una «cuadrilla» en {club}?', 'Malestar entre los menos habituales por los favoritos de {yo}.'] },
      { tit: 'El barrio te espera', q: 'Le han hecho un mural en su barrio. ¿Qué siente?', o: [
        { t: 'Que esto lo he ganado yo, pero es de ellos. Siempre ha sido de ellos.', cat: 'pro', fx: { fans: 0.008, team: 1 }, sig: { pandillero: 1, leyenda: 3 } },
        { t: 'Que me han sacado más guapo de lo que soy.', cat: 'hu', fx: { fans: 0.004 }, sig: { pandillero: 1, gracioso: 1 } },
        { t: 'Que tengo que estar a la altura de ese mural. Y aún no lo estoy.', cat: 'hum', fx: { board: 1.5, team: 1 }, sig: { pandillero: -1, curante: 2 } }],
        n: ['El barrio pinta a {yo}', 'Un mural gigante en el barrio natal del técnico de {club}. Garrido: «De la esquina al escudo. Así se escriben las leyendas de verdad».'] }
    ]
  };

  P.despota = {
    n: 'Déspota', motes: ['el Emperador', 'Míster Látigo', 'el Dictador del Banquillo'],
    sig: { 'estilo:dur': 2, 'nuke:walk': 1, 'act:retreat': 1, roja_tecnico: 0.5, comodin: -0.5 },
    eff: { vest: -0.4, dir: 0.25, afi: 0, sala: 0.5 }, nat: ['dur', 'tec'], anti: ['pro', 'hu'],
    pista: ['En los entrenamientos de {club} no se oye un balón botar sin permiso. El silencio, me dicen, es lo que más asusta.',
      'Un jugador me confesó, sin dar su nombre, que en el vestuario se habla en susurros. «Por si acaso», me dijo. No me aclaró por si acaso qué.'],
    mote: { q: 'En el vestuario, dicen, le llaman «{mote}». ¿Gobierna con mano de hierro?', a: [
      { t: 'Con mano de hierro y guante de hierro. Aquí se viene a ganar.', cat: 'dur', abraza: true },
      { t: 'Exijo, pero también escucho. Que me pregunten a mí qué mote les pongo.', cat: 'hu', abraza: false },
      { t: 'Quien quiera un amigo, que se compre un perro.', cat: 'dur', abraza: true }] },
    noticia: ['«{mote}»: el entrenador que gobierna por el miedo', 'Disciplina militar en {club}: multas por llegar tarde, móviles prohibidos y silencio en el autobús.'],
    profe: ['Con miedo se gana un mes. Con respeto, una carrera. El miedo se nota en las piernas, chaval, y se nota en el minuto 80.'],
    caps: [
      { tit: 'Las normas', q: 'Ha prohibido los móviles, las redes y la música en el vestuario. ¿No es excesivo?', o: [
        { t: 'Excesivo es perder. Lo demás son normas.', cat: 'dur', fx: { team: -1.5, board: 1 }, sig: { despota: 2 } },
        { t: 'Puede que sí. Revisaré alguna.', cat: 'hum', fx: { team: 1 }, sig: { despota: -2 } },
        { t: 'La música la elijo yo. Pasodobles.', cat: 'hu', fx: { team: -0.5, fans: 0.002 }, sig: { despota: 1, gracioso: 1 } }],
        n: ['Ley seca de móviles en {club}', 'Las normas de {yo} levantan ampollas en el vestuario.'] },
      { tit: 'El motín', q: 'Hay rumores de motín: varios capitanes habrían pedido una reunión con el presidente. ¿Qué sabe?', o: [
        { t: 'Que en este club manda quien manda. Y el que no lo entienda, tiene la puerta abierta.', cat: 'dur', fx: { team: -3, board: -1 }, sig: { despota: 3 } },
        { t: 'Que algo habré hecho mal. Hablaré con ellos hoy mismo.', cat: 'hum', fx: { team: 2, board: 0.5 }, sig: { despota: -3, padre: 1 } },
        { t: 'Que los rumores no juegan. Juegan ellos, y el domingo veremos.', cat: 'tec', fx: { team: -0.5 }, sig: { despota: 1 } }],
        n: ['Rumores de motín en {club}', 'Varios pesos pesados del vestuario, contra los métodos de {yo}.'] },
      { tit: 'La corona', q: 'Hoy ha ganado con un equipo que, dicen, le teme más que le quiere. ¿Le importa?', o: [
        { t: 'No. El cariño no da puntos. El miedo, por lo visto, sí.', cat: 'dur', fx: { team: -2, board: 1.5 }, sig: { despota: 3 } },
        { t: 'Me importa mucho. Y voy a cambiarlo. Empezando hoy.', cat: 'pro', fx: { team: 3, board: 0.5 }, sig: { despota: -5, padre: 3 } },
        { t: 'Que me teman los rivales. A los míos, prefiero que me sigan.', cat: 'amb', fx: { team: 1.5, fans: 0.004 }, sig: { despota: -2, leyenda: 2 } }],
        n: ['El imperio de {yo}', 'Garrido: «Todos los imperios caen. La pregunta es si su emperador estará dentro o fuera cuando ocurra».'] }
    ]
  };

  P.leyenda = {
    n: 'Leyenda', motes: ['la Leyenda', 'el Profeta', 'Míster Mito'],
    sig: { titulo: 4, ascenso: 2, gran_victoria: 0.6, 'estilo:hum': 0.4, 'estilo:amb': 0.4, redencion: 3, venganza: 1 },
    eff: { vest: 0.4, dir: 0.4, afi: 0.002, sala: 1 }, nat: ['amb', 'hum'], anti: ['eva', 'pol'],
    pista: ['Hay entrenadores a los que la grada aplaude. Y hay entrenadores a los que la grada empieza a mirar como se mira a una estatua antes de que exista.',
      'Le pregunté a un abuelo en la puerta del estadio qué pensaba del entrenador. Se quitó la gorra antes de contestar. No necesité escuchar la respuesta.'],
    mote: { q: 'Ya le llaman «{mote}». ¿Le pesa?', a: [
      { t: 'Me pesa como pesa una medalla: con gusto.', cat: 'amb', abraza: true },
      { t: 'Las leyendas son los jugadores. Yo solo les paso el agua.', cat: 'hum', abraza: true },
      { t: 'Me da miedo. Las leyendas acaban en bronce y yo quiero seguir entrenando.', cat: 'hu', abraza: false }] },
    noticia: ['«{mote}»: {yo} entra en la historia de {club}', 'La afición ya pide una estatua. El club no lo descarta.'],
    profe: ['Ya está, chaval. Ya no te van a recordar por un partido: te van a recordar por una forma de ser. Cuídala. Es lo único que no se puede fichar.'],
    caps: [
      { tit: 'La estatua', q: 'La afición recoge firmas para hacerle una estatua. ¿Qué le parece?', o: [
        { t: 'Que la hagan de los jugadores. Yo me pongo detrás, que es donde estoy bien.', cat: 'hum', fx: { team: 2, fans: 0.005 }, sig: { leyenda: 2, padre: 1 } },
        { t: 'Que me la hagan con el brazo levantado. Señalando el próximo título.', cat: 'amb', fx: { fans: 0.006, board: -0.5 }, sig: { leyenda: 2, chulo: 1 } },
        { t: 'Que esperen a que me jubile. Las estatuas dan mala suerte.', cat: 'hu', fx: { fans: 0.004 }, sig: { leyenda: 1, gracioso: 1 } }],
        n: ['Firmas para una estatua de {yo}', 'Miles de aficionados de {club} piden inmortalizar al técnico en bronce.'] },
      { tit: 'La tentación', q: 'Un gigante de Europa le quiere. Dicen que la oferta es irrechazable. ¿La rechazará?', o: [
        { t: 'Aquí tengo lo que no se puede pagar. Me quedo.', cat: 'pro', fx: { fans: 0.01, board: 2, team: 1.5 }, sig: { leyenda: 3 } },
        { t: 'Escucharé. Sería un mentiroso si dijera que no.', cat: 'hum', fx: { fans: -0.004, board: -1 }, sig: { leyenda: -1 } },
        { t: 'Que esperen. Primero acabo lo que empecé.', cat: 'amb', fx: { fans: 0.005, board: 1 }, sig: { leyenda: 2 } }],
        n: ['Un gigante de Europa tienta a {yo}', 'La continuidad de la leyenda de {club}, en el aire.'] },
      { tit: 'El legado', q: 'Cuando se vaya, ¿cómo quiere que le recuerden?', o: [
        { t: 'Como uno más de la grada que tuvo la suerte de bajar al césped.', cat: 'hum', fx: { fans: 0.01, team: 2, board: 1 }, sig: { leyenda: 3 } },
        { t: 'Como el que lo ganó todo. Y que lo escriban bien grande.', cat: 'amb', fx: { fans: 0.006, board: 0.5 }, sig: { leyenda: 2, chulo: 1 } },
        { t: 'Que no me recuerden. Que recuerden al equipo.', cat: 'pro', fx: { team: 3 }, sig: { leyenda: 2, padre: 2 } }],
        n: ['El legado de {yo}', 'Garrido: «He escrito cuarenta años de fútbol y cuatro biografías que merecían la pena. Hoy he empezado la quinta».'] }
    ]
  };
})();
