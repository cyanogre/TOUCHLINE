/* TOUCHLINE — eventos que solo te pasan por cómo eres (o por cómo te ve la gente).
 *
 * Mismo formato que data/game/eventos.js (lo lee js/events.js). La condición `club.persona` exige que esa personalidad
 * sea la tuya (o una de tus secundarias) y que ya se haya empezado a notar fuera: hasta que Garrido no lo insinúa,
 * estos eventos no existen. Las opciones mueven tu personalidad con `fx.sig` (oculto: no se enseña).
 * Huecos: {m} tú · {mote} tu mote · {c} tu club · {r} el próximo rival · {s} / {n} el jugador (si lo hay). */
(function () {
  'use strict';
  const E = window.TL_EVENTOS = window.TL_EVENTOS || { cats: {}, events: [], items: {}, souls: {} };
  E.cats.imagen = { name: 'Tu imagen', icon: '🎭' };
  const base = { cat: 'imagen', who: 'c', p: 0.75, per: 'season', cd: 45, once: true };
  const ev = (id, persona, o) => Object.assign({ id }, base, o, { club: Object.assign({ persona }, o.club || {}) });

  E.events.push(
    // ============================================================ Gracioso
    ev('im_gracioso_latenight', 'gracioso', { tone: 'pos', news: 'redes',
      t: 'Te invitan a un late night', b: 'El programa de humor más visto del país quiere a «{mote}» el jueves en el sofá. El presentador promete «cero preguntas de fútbol y mucho cringe». El club no sabe si reírse o llorar.',
      o: [
        { l: 'Ir y darlo todo', d: 'Vas a salir en todos los reels del viernes.', fx: { fans: 0.012, board: -1.5, sig: { gracioso: 3 } }, r: 'Haces un monólogo sobre el VAR que acaba en trending. El presidente lo ve con el ceño fruncido y una sonrisa que no consigue esconder.' },
        { l: 'Ir, pero en modo serio', d: 'A ver si así te toman en serio.', fx: { fans: 0.004, board: 0.5, sig: { gracioso: -1, curante: 1 } }, r: 'El presentador intenta tres chistes y tú respondes con datos de presión tras pérdida. Silencio incómodo en plató. Clip viral igualmente, pero por otra razón.' },
        { l: 'Mandar a un jugador en tu lugar', d: 'Que se lleve el foco otro.', fx: { team: 1, sig: { padre: 1 } }, r: 'El canterano que mandas se convierte en el meme de la semana. Tú te lo ves desde el sofá con palomitas.' }] }),
    ev('im_gracioso_meme', 'gracioso', { tone: 'neg', news: 'redes',
      t: 'Tu chiste no ha sentado bien', b: 'Un vídeo tuyo haciendo una broma sobre la afición del {r} circula sin contexto. En ese barrio ya hay pancartas con tu cara y una nariz de payaso.',
      o: [
        { l: 'Pedir perdón con un vídeo', d: 'Un vídeo sincero, sin chistes. O con uno pequeñito.', fx: { fans: 0.002, board: 0.5, sig: { tibio: 1 } }, r: 'Pides perdón con cara de funeral. Al final se te escapa un «pero era gracioso, ¿eh?» y vuelve a empezar todo, aunque con menos fuerza.' },
        { l: 'Doblar la apuesta: otro chiste', d: 'El humor se defiende con humor.', fx: { fans: 0.006, board: -2, sig: { gracioso: 2, polemista: 1 } }, r: 'El segundo chiste es mejor que el primero. Medio país se ríe y el otro medio te odia. El partido contra el {r} va a ser divertido.' },
        { l: 'Silencio total', d: 'Que pase la tormenta.', fx: { sig: { timido: 1 } }, r: 'A los tres días nadie se acuerda. Internet tiene memoria de pez.' }] }),

    // ============================================================ Pasota
    ev('im_pasota_siesta', 'pasota', { tone: 'neu', news: 'redes',
      t: 'Te pillan durmiendo en el banquillo', b: 'Una cámara de televisión te enfoca en pleno entrenamiento abierto: tumbado en el banquillo, gafas de sol y gorra en la cara. La imagen ya tiene más visualizaciones que el último partido del {c}.',
      o: [
        { l: '«Estaba visualizando la táctica»', d: 'Con los ojos cerrados se ve mejor.', fx: { fans: 0.006, board: -1, sig: { pasota: 2, gracioso: 1 } }, r: 'Nadie se lo cree, pero la frase se convierte en camiseta. La tienda del club vende doscientas en un día.' },
        { l: 'Pedir disculpas a la directiva', d: 'Mejor que no se repita.', fx: { board: 1, sig: { pasota: -2, curante: 1 } }, r: 'El presidente te da una palmadita y te recomienda «un café antes de entrenar». Mensaje recibido.' },
        { l: 'Ignorarlo', d: 'Ni lo comentas.', fx: { board: -0.5, sig: { pasota: 1 } }, r: 'Tu pasotismo con el tema del pasotismo es tan pasota que alguien escribe un hilo de cuarenta tuits analizándolo.' }] }),
    ev('im_pasota_rueda', 'pasota', { tone: 'neg', news: 'opinion',
      t: 'La directiva te pide más implicación', b: 'El presidente te cita en su despacho. Encima de la mesa, una carpeta con tus mejores momentos de «me da igual» en rueda de prensa. «Míster, la gente necesita ver que esto le importa a alguien».',
      o: [
        { l: 'Prometer que te vas a mojar', d: 'Habrá que cumplirlo delante de los micros.', fx: { board: 1.5, sig: { pasota: -2, bocazas: 1 } }, r: 'Sales del despacho con una lista de frases motivadoras que te ha escrito el de comunicación. Algunas dan miedo.' },
        { l: '«A mí me importa el domingo»', d: 'Lo demás es ruido.', fx: { board: -1, team: 1, sig: { pasota: 1, curante: 1 } }, r: 'El presidente se queda callado. El vestuario, cuando se entera, te aplaude un poco por dentro.' },
        { l: 'Encogerte de hombros', d: 'El gesto lo dice todo.', fx: { board: -2.5, sig: { pasota: 2 } }, r: 'El presidente se pone rojo. Garrido escribe al día siguiente que «has convertido el encogimiento de hombros en una disciplina olímpica».' }] }),

    // ============================================================ Tibio
    ev('im_tibio_debate', 'tibio', { tone: 'neu', news: 'opinion',
      t: 'Te invitan a un debate y no hay forma', b: 'Una tertulia quiere que te mojes sobre el gran debate de la semana: ¿el {c} juega bonito o juega feo? Llevas tres días sin contestar al mensaje.',
      o: [
        { l: '«Jugamos como hay que jugar»', d: 'Un clásico que nunca falla.', fx: { board: 0.5, sig: { tibio: 2 } }, r: 'Los tertulianos se pasan veinte minutos intentando descifrar qué has querido decir. Ganas por agotamiento.' },
        { l: 'Mojarte de verdad: «Jugamos feo y me encanta»', d: 'Por una vez.', fx: { fans: 0.006, board: -0.5, sig: { tibio: -3, bocazas: 1 } }, r: 'Nadie se lo esperaba. «{mote} ha hablado», titula un digital. La afición se compra la frase en bufanda.' },
        { l: 'No ir', d: 'Lo más tibio de todo.', fx: { sig: { tibio: 1, timido: 1 } }, r: 'Ponen una silla vacía con tu nombre. Es el momento más comentado del programa.' }] }),
    ev('im_tibio_capitan', 'tibio', { tone: 'neg', news: 'vestuario', if: { rank: [0, 5] },
      t: 'El vestuario te pide una postura', b: '{s} se planta en tu despacho: «Míster, en el vestuario hay dos bandos con lo de las primas y usted siempre dice que "las dos partes tienen razón". Así no».',
      o: [
        { l: 'Dar la razón a {s}', d: 'El otro bando se va a molestar.', fx: { mor: 8, team: -1, boss: 8, sig: { tibio: -2, despota: 1 } }, r: '{s} sale contento. La otra mitad del vestuario, no tanto. Pero por fin hay una decisión.' },
        { l: 'Convocar una asamblea', d: 'Que voten.', fx: { team: 1, sig: { comunista: 2, tibio: -1 } }, r: 'La asamblea dura dos horas, hay pizza y al final gana la opción que tú ya querías. Democracia.' },
        { l: '«Ambas posturas son muy respetables»', d: 'Otra vez.', fx: { mor: -6, boss: -6, sig: { tibio: 2 } }, r: '{s} se va dando un portazo. Al día siguiente, en el vestuario, alguien ha pegado un póster tuyo con la cara de un muro.' }] }),

    // ============================================================ Tímido
    ev('im_timido_gala', 'timido', { tone: 'neu', news: 'club',
      t: 'Tienes que dar un discurso en la gala', b: 'La cena anual de peñas del {c}. Seiscientas personas, un micro y un atril. El protocolo dice que el entrenador habla cinco minutos. Llevas una semana soñando con ese atril.',
      o: [
        { l: 'Leer un papel sin levantar la vista', d: 'Lo justo y necesario.', fx: { fans: 0.002, sig: { timido: 1 } }, r: 'Dos minutos y medio. Nadie oye nada. La gente aplaude por educación y alguien grita «¡Que hable más alto!» justo cuando terminas.' },
        { l: 'Improvisar con el corazón', d: 'Lo que salga.', fx: { fans: 0.01, team: 1, sig: { timido: -3, leyenda: 1 } }, r: 'Se te quiebra la voz hablando de tu abuelo, que te llevaba al campo. Se hace un silencio enorme. Luego, la ovación más larga de la noche.' },
        { l: 'Que hable el capitán', d: 'Tú saludas con la mano.', fx: { team: 0.5, sig: { timido: 2 } }, r: 'El capitán lo borda. Tú saludas desde la mesa y te pones del color de la camiseta.' }] }),
    ev('im_timido_entrevista', 'timido', { tone: 'pos', news: 'opinion',
      t: 'Garrido quiere entrevistarte', b: 'Aurelio Garrido, el de la columna, te propone una entrevista larga en El Balcón. «Sin cámaras. Usted, yo y un café. Quiero saber quién se esconde detrás del Invisible».',
      o: [
        { l: 'Aceptar', d: 'Con café de por medio, quizá.', fx: { fans: 0.006, board: 0.5, sig: { timido: -2, profesor: 1 } }, r: 'La entrevista ocupa cuatro páginas. Resulta que tienes cosas que decir. Garrido la titula «El hombre que hablaba bajito y pensaba muy alto».' },
        { l: 'Responder por escrito', d: 'Mejor así.', fx: { fans: 0.002, sig: { timido: 1, profesor: 1 } }, r: 'Le mandas un documento de doce folios con diagramas. Garrido publica uno y medio. Los otros los cuelga enmarcados en su despacho.' },
        { l: 'Decir que no', d: 'Con educación.', fx: { sig: { timido: 2 } }, r: 'Garrido escribe una columna titulada «Sigue sin hablar». Es, curiosamente, la más leída del mes.' }] }),

    // ============================================================ Bocazas
    ev('im_bocazas_podcast', 'bocazas', { tone: 'neg', news: 'polemica',
      t: 'Lo que dijiste en el podcast', b: 'Fuiste a un podcast «para hablar de liderazgo» y acabaste diciendo que el {r} «juega como un equipo de solteros contra casados». El clip lleva dos millones de visualizaciones y su presidente exige una disculpa.',
      o: [
        { l: 'Disculparte', d: 'Con la boca pequeña.', fx: { board: 0.5, sig: { bocazas: -1, tibio: 1 } }, r: 'Te disculpas «si alguien se ha sentido ofendido». Nadie queda contento, pero la cosa se enfría.' },
        { l: '«Lo dije y lo mantengo»', d: 'El partido contra ellos va a arder.', fx: { fans: 0.008, board: -2, team: 1, sig: { bocazas: 2, chulo: 1 } }, r: 'Tu vestuario se ríe a carcajadas. El del {r}, no. Van a salir a morder.' },
        { l: 'Echarle la culpa al montaje', d: 'Estaba sacado de contexto.', fx: { board: -0.5, sig: { lloron: 1, conspiranoico: 1 } }, r: 'El podcast cuelga el vídeo completo. El contexto es peor. Mucho peor.' }] }),
    ev('im_bocazas_marca', 'bocazas', { tone: 'pos', news: 'positivo',
      t: 'Una marca quiere tus frases', b: 'Una marca de bebidas energéticas quiere hacer una campaña con tus «perlas» de rueda de prensa. Pagan bien y solo piden una cosa: que sigas diciendo burradas.',
      o: [
        { l: 'Firmar', d: 'Dinero fresco para el club.', fx: { gain: 1.5, fans: 0.004, board: -0.5, sig: { bocazas: 2 } }, r: 'Tu cara aparece en las latas con la frase «Yo no pierdo, aprendo a ganar más fuerte». El vestuario se las bebe por solidaridad.' },
        { l: 'Firmar y donarlo a la cantera', d: 'Lo cortés no quita lo bocazas.', fx: { fans: 0.008, board: 1, sig: { bocazas: 1, padre: 1 } }, r: 'Los canteranos estrenan botas. Tú estrenas un titular bonito, por una vez.' },
        { l: 'Rechazarlo', d: 'Tus frases no se venden.', fx: { board: 0.5, sig: { bocazas: -1, curante: 1 } }, r: 'La marca ficha a un tertuliano en tu lugar. Sus frases son peores. Te quedas con eso.' }] }),

    // ============================================================ Buscapolémicas
    ev('im_polemista_arbitro', 'polemista', { tone: 'neg', news: 'arbitraje',
      t: 'El colegio de árbitros te ha fichado', b: 'Te llega un rumor desde dentro: en el colegio de árbitros circula un dossier con tus declaraciones. Le llaman «el expediente {mote}».',
      o: [
        { l: 'Pedir una reunión con el colegio', d: 'Templar gaitas.', fx: { board: 1, sig: { polemista: -2, tibio: 1 } }, r: 'La reunión es tensa pero educada. Sales con un café, un apretón de manos y la sensación de que el dossier sigue ahí.' },
        { l: 'Publicarlo tú primero', d: 'Si hay guerra, que sea a tu manera.', fx: { fans: 0.01, board: -2.5, sig: { polemista: 3, conspiranoico: 1 } }, r: 'Cuelgas una foto de una carpeta en blanco con el texto «¿Esto es lo que tienen?». Las redes arden. El colegio, también.' },
        { l: 'No darle bola', d: 'Que hablen.', fx: { sig: { pasota: 1 } }, r: 'El rumor se apaga solo. O eso parece.' }] }),
    ev('im_polemista_portada', 'polemista', { tone: 'neu', news: 'opinion',
      t: 'Los medios te quieren cada semana', b: 'Tres periódicos se pelean por tenerte en su portada. «Usted vende», te dice un director. «Cada vez que habla, subimos un 30% en visitas». Te ofrecen una columna semanal.',
      o: [
        { l: 'Aceptar la columna', d: 'Tu tribuna, tus reglas.', fx: { gain: 0.8, fans: 0.006, board: -1.5, sig: { polemista: 2, bocazas: 1 } }, r: 'Tu primera columna se titula «Lo que nadie se atreve a decir». La segunda la escribe un abogado.' },
        { l: 'Rechazarla: «Yo hablo en el campo»', d: 'Frase de póster.', fx: { board: 1, team: 0.5, sig: { polemista: -1, leyenda: 1 } }, r: 'El director te dice que te arrepentirás. De momento, no.' }] }),

    // ============================================================ Ligón
    ev('im_ligon_revista', 'ligon', { tone: 'neu', news: 'ocio',
      t: 'Portada en una revista de moda', b: 'Una revista de moda quiere a «{mote}» en portada con traje de terciopelo y una rosa en la boca. El titular ya está escrito: «El banquillo más sexy de la liga».',
      o: [
        { l: 'Hacerla', d: 'Si hay que posar, se posa.', fx: { fans: 0.01, board: -1.5, team: -0.5, sig: { ligon: 2, chulo: 1 } }, r: 'La portada se agota. En el vestuario hay una copia en cada taquilla, con bigotes pintados.' },
        { l: 'Hacerla, pero con el equipo', d: 'Todos guapos.', fx: { fans: 0.008, team: 1.5, sig: { ligon: 1, padre: 1 } }, r: 'Sale una portada coral que parece el cartel de una peli de atracos. El vestuario está encantado.' },
        { l: 'Rechazarla', d: 'Bastante tienes con la fama que tienes.', fx: { board: 0.5, sig: { ligon: -2 } }, r: 'La revista pone en portada a un actor de serie. Tus redes respiran aliviadas.' }] }),
    ev('im_ligon_cita', 'ligon', { tone: 'neg', news: 'ocio',
      t: 'Te pillan en una cita', b: 'Un paparazzi publica fotos tuyas cenando con una persona famosa en un restaurante de esos donde el pan se cobra aparte. Las tertulias del corazón ya tienen tema para un mes.',
      o: [
        { l: 'Confirmarlo sin drama', d: '«Sí, estoy conociendo a alguien».', fx: { fans: 0.004, sig: { ligon: 1, curante: 1 } }, r: 'Tu naturalidad desactiva la bomba. A las dos semanas solo hablan de ti en el corazón, no en deportes.' },
        { l: '«Era una reunión de trabajo»', d: 'Con velitas.', fx: { fans: 0.002, board: -0.5, sig: { ligon: 2, conspiranoico: 0.5 } }, r: 'Nadie se lo cree. La persona famosa sube una historia con dos copas y un emoji guiñando el ojo.' },
        { l: 'Prohibir la prensa en los entrenamientos', d: 'Ni un fotógrafo más.', fx: { fans: -0.004, board: -0.5, sig: { despota: 2 } }, r: 'Los periodistas lo llaman «la venganza del Galán». Los entrenamientos son más tranquilos, eso sí.' }] }),

    // ============================================================ Pandillero
    ev('im_pandillero_bar', 'pandillero', { tone: 'neg', news: 'sucesos', if: { rank: [0, 18] },
      t: 'Foto en un bar a las tres', b: 'Aparece una foto tuya con {s} en un bar de tu barrio a las tres de la mañana, brindando con chupitos de hierbas encima de una mesa de billar. Faltan dos días para el partido.',
      o: [
        { l: 'Asumirlo: «Era el cumpleaños de mi madre»', d: 'Y lo era.', fx: { fans: 0.004, board: -1, mor: 4, sig: { pandillero: 1, padre: 1 } }, r: 'Tu madre sale en la tele defendiéndote. Es mejor que cualquier jefe de prensa. El país entero la quiere de presidenta.' },
        { l: 'Multar a {s} y a ti mismo', d: 'Mismo castigo para todos.', fx: { board: 1.5, mor: -4, team: 1, sig: { pandillero: -1, curante: 2 } }, r: 'Te pones tu propia multa delante de todo el vestuario. Ese gesto vale más que diez charlas.' },
        { l: '«En mi barrio esto es un martes»', d: 'Sin complejos.', fx: { fans: 0.006, board: -2.5, mor: 6, boss: 6, sig: { pandillero: 3 } }, r: 'El barrio te hace un mural. La directiva te hace un expediente.' }] }),
    ev('im_pandillero_barrio', 'pandillero', { tone: 'pos', news: 'aficion',
      t: 'Tu barrio te monta un homenaje', b: 'Los colegas de toda la vida han organizado una barbacoa en la plaza del barrio en tu honor. Hay pancarta, altavoz con reguetón y tu tía ha hecho tortilla para trescientos.',
      o: [
        { l: 'Ir con todo el vestuario', d: 'Familia es familia.', fx: { team: 2.5, fans: 0.006, teamFit: -2, sig: { pandillero: 2, padre: 1 } }, r: 'Los jugadores acaban jugando un partidillo con los chavales del barrio. Hay vídeo. Hay lágrimas. Hay tortilla.' },
        { l: 'Ir tú solo, un ratito', d: 'Discreción.', fx: { fans: 0.003, sig: { pandillero: 1 } }, r: 'Te quedas seis horas. «Un ratito», dices.' },
        { l: 'No ir: tienes que preparar el partido', d: 'El barrio lo entenderá.', fx: { board: 0.5, sig: { pandillero: -2, profesor: 1 } }, r: 'El barrio no lo entiende. Tu tía te deja de hablar hasta Navidad.' }] }),

    // ============================================================ Déspota
    ev('im_despota_motin', 'despota', { tone: 'neg', news: 'vestuario', if: { rank: [0, 8] },
      t: 'Rumor de motín', b: '{s} encabeza un grupo de WhatsApp del vestuario que se llama «Liberad a los conos». Alguien te lo ha enseñado. Hay stickers con tu cara y un látigo.',
      o: [
        { l: 'Reunión a solas con {s}', d: 'Escuchar, por una vez.', fx: { boss: 10, mor: 6, team: 1, sig: { despota: -2, padre: 1 } }, r: 'Hablas con {s} durante una hora. Sale con la sensación de que se le ha escuchado. El grupo cambia de nombre a «Conos con derechos».' },
        { l: 'Doble sesión para todos', d: 'Así se les quitan las ganas de WhatsApp.', fx: { team: -3, teamFit: -4, board: 0.5, sig: { despota: 2 } }, r: 'Nadie vuelve a escribir en el grupo. Nadie vuelve a sonreír en el vestuario.' },
        { l: 'Apartar a {s} del equipo', d: 'Ejemplo para los demás.', fx: { mor: -15, boss: -15, team: -1, list: true, sig: { despota: 3, facha: 1 } }, r: '{s} entrena aparte. El mensaje llega claro a todos. Demasiado claro.' }] }),
    ev('im_despota_puntualidad', 'despota', { tone: 'neu', news: 'vestuario',
      t: 'La norma de los cinco minutos', b: 'Has impuesto que quien llegue tarde, aunque sea un minuto, se queda fuera de la convocatoria. Hoy, el que ha llegado tarde eres tú: atasco en la autovía.',
      o: [
        { l: 'Aplicarte la norma: no vas al partido', d: 'La palabra es la palabra.', fx: { team: 3, board: 1, sig: { despota: -1, curante: 2, leyenda: 1 } }, r: 'Ves el partido desde la grada, con bufanda. El vestuario jamás olvidará ese gesto.' },
        { l: '«La norma es para los jugadores»', d: 'Rango es rango.', fx: { team: -3, sig: { despota: 2, chulo: 1 } }, r: 'Se oye un «tócate los…» desde el fondo del vestuario. No sabes de quién es. Lo sabrás.' },
        { l: 'Inventarte una reunión con el presidente', d: 'Coartada perfecta.', fx: { team: -1, sig: { conspiranoico: 1, lloron: 1 } }, r: 'El presidente desmiente la reunión en un audio que se filtra. Malas noticias.' }] }),

    // ============================================================ Leyenda
    ev('im_leyenda_estatua', 'leyenda', { tone: 'pos', news: 'aficion',
      t: 'Quieren hacerte una estatua', b: 'Una peña del {c} ha empezado una recogida de firmas para levantar una estatua de «{mote}» a la entrada del estadio. Ya van por las veinte mil.',
      o: [
        { l: 'Aceptarla con humildad', d: 'Que quede para la historia.', fx: { fans: 0.012, board: 1, sig: { leyenda: 2 } }, r: 'La estatua sale un poco rara: la nariz parece la de otro. Pero la gente se hace fotos con ella cada día.' },
        { l: '«Que la hagan del equipo, no mía»', d: 'Leyenda de verdad.', fx: { fans: 0.01, team: 2, sig: { leyenda: 1, padre: 1 } }, r: 'Acaban haciendo un mural con los once titulares. Tú sales en una esquinita, con el abrigo.' },
        { l: '«Las estatuas, cuando me muera»', d: 'Y que tarden.', fx: { fans: 0.005, sig: { leyenda: 1, gracioso: 1 } }, r: 'La frase acaba grabada en la placa del mural. Te parece perfecto.' }] }),
    ev('im_leyenda_documental', 'leyenda', { tone: 'pos', news: 'positivo',
      t: 'Una plataforma quiere tu documental', b: 'Una plataforma de streaming quiere grabar un documental de seis capítulos sobre ti. Título provisional: «{mote}: la temporada». Cámaras en el vestuario incluidas.',
      o: [
        { l: 'Aceptar con cámaras en el vestuario', d: 'Todo dentro.', fx: { gain: 2, fans: 0.01, team: -1.5, sig: { leyenda: 2, chulo: 1 } }, r: 'El documental sale espectacular. En el capítulo 4 se te oye llamar «pechofrío» al lateral. El lateral no ha visto el capítulo 4. Todavía.' },
        { l: 'Aceptar, pero sin vestuario', d: 'Hay cosas sagradas.', fx: { gain: 1, fans: 0.006, sig: { leyenda: 1, padre: 1 } }, r: 'Sale un documental bonito, aunque algo soso. Tu madre lo ve cuatro veces.' },
        { l: 'Rechazarlo', d: 'Las leyendas no se graban, se cuentan.', fx: { board: 0.5, sig: { leyenda: 1, timido: 1 } }, r: 'La plataforma graba otro documental sobre un entrenador rival. Se aburre todo el mundo. Ganas tú.' }] }),

    // ============================================================ Progre
    ev('im_progre_campana', 'progre', { tone: 'pos', news: 'positivo',
      t: 'Una ONG te propone ser su imagen', b: 'Una ONG de inclusión en el deporte quiere a «{mote}» como embajador. Habría un anuncio, visitas a escuelas y una camiseta especial del {c} en un partido.',
      o: [
        { l: 'Aceptar y llevar al equipo', d: 'Implicar a los jugadores.', fx: { fans: 0.01, team: 1, board: 0.5, sig: { progre: 2, padre: 1 } }, r: 'La visita a las escuelas acaba en partidillo con niños de 7 años. Los niños ganan 14-2. Tú, encantado.' },
        { l: 'Aceptar, pero en privado', d: 'Sin fotos.', fx: { fans: 0.003, sig: { progre: 1, timido: 1 } }, r: 'Lo haces sin cámaras. Alguien lo cuenta igualmente y queda aún mejor.' },
        { l: 'Rechazarlo: «Yo solo entreno»', d: 'Mantenerte al margen.', fx: { sig: { progre: -2, tibio: 1 } }, r: 'La ONG ficha a una entrenadora de baloncesto que lo borda. Tú sigues con tu pizarra.' }] }),
    ev('im_progre_bronca', 'progre', { tone: 'neg', news: 'polemica',
      t: 'Un sector de la grada te pita', b: 'Un grupo de la grada ha colgado una pancarta: «Menos pancartas y más goles, {mote}». El club te pide que no entres al trapo.',
      o: [
        { l: 'Responder con goles', d: 'Y con nada más.', fx: { board: 1, sig: { progre: -1, curante: 1 } }, r: 'El domingo marcáis tres. La pancarta desaparece. La gente se queda con lo que importa.' },
        { l: 'Responder en rueda de prensa', d: 'Defender tus ideas.', fx: { fans: 0.002, board: -1, sig: { progre: 2, polemista: 1 } }, r: 'Tu respuesta es buena, pero alarga el lío una semana más. Garrido escribe una columna titulada «El míster que no se calla».' },
        { l: 'Invitar a los de la pancarta a un café', d: 'Hablando se entiende la gente.', fx: { fans: 0.006, sig: { progre: 1, padre: 1, tibio: 1 } }, r: 'Tres de ellos vienen al café. Uno acaba haciéndose socio de la ONG. Otro sigue igual, pero se lleva un bollo.' }] }),

    // ============================================================ Mano dura
    ev('im_facha_disciplina', 'facha', { tone: 'neu', news: 'vestuario',
      t: 'Nuevo reglamento interno', b: 'Has redactado un reglamento interno de veintitrés páginas: pelo corto, nada de pendientes, himno antes de cada entrenamiento. El vestuario lo ha bautizado como «la Constitución de {mote}».',
      o: [
        { l: 'Aplicarlo a rajatabla', d: 'Orden ante todo.', fx: { team: -3, board: 0.5, sig: { facha: 2, despota: 1 } }, r: 'El extremo se corta las rastas llorando. La foto es viral. El país se divide como en una final.' },
        { l: 'Quedarte solo con la puntualidad', d: 'Lo razonable.', fx: { team: 1, board: 0.5, sig: { facha: -2, curante: 1 } }, r: 'El vestuario respira aliviado. Alguien pega tu reglamento en el tablón con un «versión beta» escrito encima.' },
        { l: 'Someterlo a votación', d: 'Que hable el vestuario.', fx: { team: 2, sig: { facha: -3, comunista: 1 } }, r: 'Gana el «no» por 24 a 1. El 1 eres tú. Lo aceptas con deportividad, más o menos.' }] }),
    ev('im_facha_patrocinador', 'facha', { tone: 'neg', news: 'polemica',
      t: 'Un patrocinador se echa atrás', b: 'Una marca deportiva retira su oferta al club por «la imagen del entrenador». El director comercial está pálido. El presidente, más.',
      o: [
        { l: 'Pedir disculpas públicas', d: 'A lo mejor vuelven.', fx: { board: 1, fans: -0.002, sig: { facha: -2, tibio: 1 } }, r: 'La marca acepta las disculpas, pero no vuelve. El presidente te mira con media sonrisa: «Algo es algo».' },
        { l: '«Que se vayan, que vengan otros»', d: 'No te achantas.', fx: { cost: 1, board: -2.5, fans: 0.004, sig: { facha: 2, chulo: 1 } }, r: 'Viene otro patrocinador: una marca de embutidos que paga menos. Mucho menos.' },
        { l: 'Pedir al club que te deje fuera de la imagen', d: 'Que no salga tu cara.', fx: { board: 0.5, sig: { timido: 1 } }, r: 'Desapareces de la publicidad del club. La marca vuelve a mirar el contrato.' }] }),

    // ============================================================ Machirulo
    ev('im_machista_comunicado', 'machista', { tone: 'neg', news: 'polemica',
      t: 'El club emite un comunicado por ti', b: 'El departamento de comunicación ha tenido que sacar un comunicado «aclarando» tus últimas declaraciones. La sección femenina del {c} ha pedido una reunión contigo. Ya.',
      o: [
        { l: 'Ir a la reunión y escuchar', d: 'Calladito.', fx: { board: 1.5, fans: 0.004, sig: { machista: -3, progre: 1 } }, r: 'La capitana del femenino te explica un par de cosas con mucha paciencia. Sales con los deberes hechos y algo de vergüenza. Es un principio.' },
        { l: 'Ir y defender lo que dijiste', d: 'Error, probablemente.', fx: { board: -3, fans: -0.006, sig: { machista: 2, despota: 1 } }, r: 'La reunión dura cuatro minutos. Las jugadoras del femenino salen, y detrás sale un comunicado con un tono bastante menos amable.' },
        { l: 'No ir: «Tengo entrenamiento»', d: 'Huir hacia delante.', fx: { board: -1.5, sig: { machista: 1, pasota: 1 } }, r: 'La silla vacía sale en todas partes. El presidente te llama a las once de la noche.' }] }),
    ev('im_machista_curso', 'machista', { tone: 'neu', news: 'club',
      t: 'La directiva te apunta a un curso', b: 'El club te ha inscrito en un curso de «comunicación inclusiva» de dieciséis horas. La directiva insiste en que «no es un castigo». Hay powerpoints y una dinámica de grupo con pelotas de goma.',
      o: [
        { l: 'Ir y tomártelo en serio', d: 'A ver qué sale.', fx: { board: 2, sig: { machista: -3, profesor: 1 } }, r: 'Al tercer día participas en una dinámica y te sorprende lo que dices. La monitora te pone un 8. Te lo enmarcas.' },
        { l: 'Ir, pero con el móvil', d: 'Cuerpo presente.', fx: { board: -0.5, sig: { machista: 1, pasota: 1 } }, r: 'Te pillan jugando al Candy Crush en la dinámica de las pelotas. Alguien graba un vídeo.' },
        { l: 'Negarte', d: 'Tú ya sabes hablar.', fx: { board: -3, sig: { machista: 2 } }, r: 'El presidente se toma la negativa como algo personal. Lo es.' }] }),

    // ============================================================ Camarada
    ev('im_comunista_entradas', 'comunista', { tone: 'pos', news: 'aficion',
      t: 'La grada te pide bajar las entradas', b: 'Las peñas han recogido firmas para que el club baje el precio de las entradas. Saben que «el Camarada» les va a escuchar. El director financiero ya está sudando.',
      o: [
        { l: 'Apoyarles en público', d: 'Con el puño en alto.', fx: { fans: 0.012, board: -2, sig: { comunista: 2, progre: 1 } }, r: 'El club acaba bajando un 10% las entradas de los jóvenes. Las peñas te cantan una canción que dura cinco minutos.' },
        { l: 'Mediar con la directiva en privado', d: 'Sin ruido.', fx: { fans: 0.005, board: 0.5, sig: { comunista: 1, tibio: 1 } }, r: 'Consigues un abono joven más barato. Nadie sabe que fuiste tú, salvo el presidente, que te lo recordará.' },
        { l: '«De dinero no hablo»', d: 'Fuera del césped no te metes.', fx: { fans: -0.003, sig: { comunista: -2 } }, r: 'Las peñas se sienten traicionadas. En la siguiente pancarta pone «Camarada… ¿?».' }] }),
    ev('im_comunista_primas', 'comunista', { tone: 'neu', news: 'vestuario',
      t: 'Repartir las primas a partes iguales', b: 'Propones que las primas por objetivos se repartan igual entre todos: titulares, suplentes, utilleros y la señora de la cafetería. La estrella del equipo no está muy de acuerdo.',
      o: [
        { l: 'Imponerlo', d: 'Todos somos el equipo.', fx: { team: 2, board: -1, sig: { comunista: 2, despota: 1 } }, r: 'La señora de la cafetería llora de emoción. La estrella del equipo, de rabia.' },
        { l: 'Votarlo en asamblea', d: 'Democracia de vestuario.', fx: { team: 3, sig: { comunista: 2 } }, r: 'Sale que sí por 22 votos a 3. La señora de la cafetería vota dos veces. Nadie dice nada.' },
        { l: 'Olvidarlo', d: 'Mejor no tocar el dinero.', fx: { sig: { comunista: -2, tibio: 1 } }, r: 'La idea muere en un cajón. La señora de la cafetería te mira raro durante semanas.' }] }),

    // ============================================================ Currante
    ev('im_curante_madrugon', 'curante', { tone: 'pos', news: 'positivo',
      t: 'El primero en llegar, el último en irse', b: 'Un periodista ha descubierto que llegas a la ciudad deportiva a las seis de la mañana desde hace meses. El vigilante de seguridad ya te trae el café sin preguntar.',
      o: [
        { l: 'Restarle importancia', d: '«Es mi trabajo».', fx: { board: 1.5, fans: 0.004, sig: { curante: 2 } }, r: 'La frase acaba en una taza que la tienda del club vende como churros.' },
        { l: 'Pedir al equipo que haga lo mismo', d: 'El ejemplo arrastra.', fx: { team: -1.5, teamFit: 2, board: 1, sig: { curante: 1, despota: 1 } }, r: 'Tres jugadores se presentan a las seis. Uno se duerme en el gimnasio. Se agradece el gesto.' },
        { l: 'Dormir más, por una vez', d: 'Que también te lo mereces.', fx: { team: 0.5, sig: { curante: -1, pasota: 1 } }, r: 'Llegas a las ocho. El vigilante te pregunta si estás enfermo.' }] }),
    ev('im_curante_utillero', 'curante', { tone: 'pos', news: 'club',
      t: 'Echas una mano al utillero', b: 'El utillero se ha lesionado la espalda y has aparecido tú a doblar petos y a inflar balones. Un jugador ha subido una foto. El vestuario está flipando.',
      o: [
        { l: 'Seguir toda la semana', d: 'Hasta que vuelva.', fx: { team: 2.5, board: 0.5, sig: { curante: 2, padre: 1 } }, r: 'El utillero vuelve y llora al ver los petos perfectamente doblados por colores. Tú, con las manos llenas de ampollas.' },
        { l: 'Contratar un sustituto', d: 'Hay que gestionar.', fx: { cost: 0.3, board: 0.5, sig: { profesor: 1 } }, r: 'El sustituto es eficiente pero no dobla los petos con cariño. Se nota.' }] }),

    // ============================================================ Profesor
    ev('im_profesor_charla', 'profesor', { tone: 'pos', news: 'positivo',
      t: 'Una universidad quiere que des una charla', b: 'La facultad de Ciencias del Deporte te invita a dar una conferencia: «El fútbol como sistema complejo». El aula magna tiene trescientas plazas y ya están todas pedidas.',
      o: [
        { l: 'Dar la charla con diapositivas', d: 'Muchas diapositivas.', fx: { fans: 0.004, board: 1, xp: 30, sig: { profesor: 2 } }, r: 'Presentas 94 diapositivas en una hora. Te aplauden de pie. Tres alumnos piden hacer prácticas en el club.' },
        { l: 'Llevar a un jugador como «caso práctico»', d: 'Ciencia aplicada.', fx: { fans: 0.006, team: 0.5, sig: { profesor: 1, gracioso: 1 } }, r: 'El jugador se pasa la charla sin entender nada de lo que dices sobre él. La facultad lo publica igualmente.' },
        { l: 'Rechazarla: no hay tiempo', d: 'Hay partido.', fx: { sig: { curante: 1 } }, r: 'Te mandan las preguntas por correo. Contestas en un documento de 40 páginas.' }] }),
    ev('im_profesor_espia', 'profesor', { tone: 'neu', news: 'rumor',
      t: 'Alguien filtra tu libreta', b: 'Una foto de tu libreta táctica circula por redes. Hay flechas, porcentajes y un dibujo de un delfín que nadie entiende. El {r} se la habrá visto, seguro.',
      o: [
        { l: 'Cambiar todo el plan para el próximo partido', d: 'Que no te pillen.', fx: { teamFit: -2, board: 0.5, sig: { profesor: 2, conspiranoico: 1 } }, r: 'Rehaces la táctica entera en una noche. El equipo tarda en pillarla, pero el rival no sabe por dónde le vienen.' },
        { l: 'Bromear con el delfín', d: '«Es el nuevo sistema».', fx: { fans: 0.006, sig: { profesor: -1, gracioso: 2 } }, r: '«El sistema delfín» se convierte en tendencia. Hay quien jura haberlo visto en el partido.' },
        { l: 'Ignorarlo: la libreta es de hace meses', d: 'Pura calma.', fx: { sig: { tibio: 1 } }, r: 'Nadie sabe si mientes. Eso también es estrategia.' }] }),

    // ============================================================ Llorón
    ev('im_lloron_dossier', 'lloron', { tone: 'neg', news: 'arbitraje',
      t: 'El vídeo de tus quejas', b: 'Un canal de YouTube ha montado un vídeo de diez minutos con todas tus quejas sobre el árbitro esta temporada. Se titula «{mote}: The Complete Collection». Va por un millón de visitas.',
      o: [
        { l: 'Reírte de ti mismo', d: 'Lo compartes en tus redes.', fx: { fans: 0.008, sig: { lloron: -2, gracioso: 2 } }, r: 'Tu «me he reconocido en cada segundo» es lo más gracioso que has dicho en años. Ganas medio país.' },
        { l: '«Todo lo que digo es verdad»', d: 'Que pongan las repeticiones.', fx: { board: -1, sig: { lloron: 2, conspiranoico: 1 } }, r: 'El canal saca una segunda parte. Más larga.' },
        { l: 'Pedir que lo retiren', d: 'Derechos de imagen.', fx: { fans: -0.004, sig: { lloron: 1, despota: 1 } }, r: 'Efecto Streisand: ahora lo ha visto hasta tu dentista.' }] }),
    ev('im_lloron_terapia', 'lloron', { tone: 'neu', news: 'opinion',
      t: 'El psicólogo del club quiere verte', b: 'El psicólogo del {c} te deja una nota en la taquilla: «Míster, cuando quiera hablamos de la frustración. Sin compromiso. Tengo pañuelos».',
      o: [
        { l: 'Ir', d: 'No pierdes nada.', fx: { board: 1, team: 1, sig: { lloron: -3, curante: 1 } }, r: 'Tras tres sesiones, en tu siguiente rueda de prensa hablas de «procesos» y «aceptación». La sala no te reconoce.' },
        { l: 'No ir: el problema son los árbitros', d: 'Tú estás bien.', fx: { sig: { lloron: 2 } }, r: 'El psicólogo te manda un pañuelo con el escudo bordado. Lo usas el domingo.' }] }),

    // ============================================================ Chulo
    ev('im_chulo_coche', 'chulo', { tone: 'neu', news: 'ocio',
      t: 'Llegas al entrenamiento en un deportivo', b: 'Te has comprado un coche amarillo con puertas que se abren hacia arriba. Lo aparcas en la plaza del presidente. Los jugadores ya están haciendo vídeos.',
      o: [
        { l: 'Dejarlo ahí', d: 'El que manda, manda.', fx: { fans: 0.004, board: -2, sig: { chulo: 2 } }, r: 'El presidente aparca detrás de ti y no te deja salir durante dos horas. Mensaje recibido.' },
        { l: 'Rifarlo para la cantera', d: 'Gesto de crack.', fx: { gain: 1.2, fans: 0.01, board: 1, sig: { chulo: -1, padre: 1, leyenda: 1 } }, r: 'La rifa recauda una fortuna. Gana una abuela de 84 años que no tiene carné. Lo usa de maceta.' },
        { l: 'Llevar a los jugadores a dar una vuelta', d: 'Unidad de grupo.', fx: { team: 2, board: -0.5, sig: { chulo: 1, pandillero: 1 } }, r: 'El central no cabe. Va en el maletero. Es el día más feliz de su vida.' }] }),
    ev('im_chulo_selfie', 'chulo', { tone: 'neg', news: 'redes',
      t: 'Tu selfie tras la derrota', b: 'Tras perder, subiste una foto tuya en el espejo del vestuario con el texto «Yo sigo siendo el mejor». La afición del {c} no está para selfis.',
      o: [
        { l: 'Borrarla y pedir perdón', d: 'Error de cálculo.', fx: { fans: 0.002, sig: { chulo: -2, tibio: 1 } }, r: 'La borras a los veinte minutos. Ya hay doscientas capturas.' },
        { l: 'Subir otra: «Y el domingo, también»', d: 'Doblar la apuesta.', fx: { fans: -0.004, board: -1, team: 0.5, sig: { chulo: 2, bocazas: 1 } }, r: 'Si el domingo ganas, eres un genio. Si pierdes, cámbiate de país.' },
        { l: 'Dejarla y no decir nada', d: 'Que hablen.', fx: { fans: -0.002, sig: { chulo: 1 } }, r: 'La foto sigue ahí. Sigues siendo el mejor. Según tú.' }] }),

    // ============================================================ Padre
    ev('im_padre_canterano', 'padre', { tone: 'pos', news: 'positivo', if: { age: [16, 21] },
      t: 'Un canterano te pide consejo', b: '{s} se te acerca después del entrenamiento: tiene problemas en casa y no sabe si seguir en el fútbol. «Usted es el único al que se lo puedo contar».',
      o: [
        { l: 'Tomarte la tarde y escuchar', d: 'Lo que haga falta.', fx: { mor: 15, boss: 15, sig: { padre: 2 } }, r: 'Acabáis hablando cuatro horas en un banco del parking. {s} sale con los ojos rojos y las ideas claras.' },
        { l: 'Buscarle ayuda profesional', d: 'El club tiene psicólogo.', fx: { mor: 8, boss: 6, sig: { padre: 1, profesor: 1 } }, r: 'El psicólogo le ayuda mucho. Pero {s} sigue viniendo a darte los buenos días cada mañana.' },
        { l: '«Aquí se viene a entrenar»', d: 'Lo de casa, en casa.', fx: { mor: -10, boss: -12, sig: { padre: -3, despota: 2 } }, r: '{s} asiente y se va. No vuelve a contarte nada nunca más.' }] }),
    ev('im_padre_cumple', 'padre', { tone: 'pos', news: 'vestuario',
      t: 'Te organizan un cumpleaños sorpresa', b: 'El vestuario ha decorado la ciudad deportiva con globos y una pancarta: «Feliz cumple, {mote}». Hay tarta con tu cara y un altavoz preparado. El entrenamiento empieza en diez minutos.',
      o: [
        { l: 'Suspender el entrenamiento: fiesta', d: 'Un día es un día.', fx: { team: 3, teamFit: -3, board: -0.5, sig: { padre: 2, pandillero: 1 } }, r: 'Bailas una canción que no conoces. Hay vídeo. Lo verás en tu boda.' },
        { l: 'Tarta y a entrenar', d: 'Lo mejor de los dos mundos.', fx: { team: 1.5, sig: { padre: 1, curante: 1 } }, r: 'Soplas las velas, das un abrazo general y a correr. La tarta se acaba en tres minutos.' }] }),

    // ============================================================ Conspiranoico
    ev('im_conspi_dossier', 'conspiranoico', { tone: 'neg', news: 'polemica',
      t: 'Tu «dossier» se filtra', b: 'Alguien ha filtrado un documento tuyo titulado «Todo lo que no quieren que sepas sobre el arbitraje». Tiene 47 páginas, gráficos de colores y una foto del presidente de la federación con un círculo rojo.',
      o: [
        { l: 'Reconocerlo: «Es todo verdad»', d: 'Ir con todo.', fx: { fans: 0.006, board: -3, sig: { conspiranoico: 3, polemista: 1 } }, r: 'La federación abre un expediente. Tú lo enmarcas como «prueba número 48».' },
        { l: '«Era un trabajo para un máster»', d: 'Salida elegante.', fx: { board: -0.5, sig: { conspiranoico: 1, profesor: 1 } }, r: 'Nadie se lo cree, pero la universidad que dices te escribe para que te matricules de verdad.' },
        { l: 'Decir que te lo han robado', d: 'Lo cual confirma tu teoría.', fx: { board: -1.5, sig: { conspiranoico: 2, lloron: 1 } }, r: 'Ahora tienes un dossier sobre quién robó el dossier.' }] }),
    ev('im_conspi_micro', 'conspiranoico', { tone: 'neu', news: 'rumor',
      t: 'Crees que hay micros en el vestuario', b: 'Has pedido al club que pase un detector de micrófonos por el vestuario. El de mantenimiento ha encontrado un cargador de móvil, tres calcetines y una nota de amor de 2009.',
      o: [
        { l: 'Pedir un segundo barrido', d: 'Algo se les ha escapado.', fx: { cost: 0.3, board: -1, sig: { conspiranoico: 2 } }, r: 'El segundo barrido encuentra otro calcetín. Estás seguro de que es una señal.' },
        { l: 'Leer la nota de amor en el vestuario', d: 'Descubrir el misterio.', fx: { team: 2, sig: { conspiranoico: -1, gracioso: 2 } }, r: 'La nota es del actual presidente. El vestuario no puede respirar de la risa. El presidente tampoco, por otras razones.' },
        { l: 'Olvidarlo', d: 'A lo mejor te pasaste.', fx: { board: 0.5, sig: { conspiranoico: -2 } }, r: 'Duermes bien por primera vez en semanas. Aunque con la luz encendida.' }] })
  );
})();
