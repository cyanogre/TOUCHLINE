/* TOUCHLINE — la entrevista de fin de temporada con Aurelio Garrido (El Balcón).
 *
 * Al cerrar la temporada, Garrido te cita en el café de siempre. Cuatro preguntas (balance, el momento, quién eres,
 * lo que viene); cada respuesta deja rastro en tu personalidad (sig) y Garrido apostilla (r). Al final escribe el
 * título del capítulo de esa temporada en tu biografía y publica su columna de cierre.
 * Resultado de la temporada: great (campeón) · good (objetivo cumplido) · bad (no cumplido) · up (ascenso) ·
 * down (descenso) · fired (despedido).
 * Huecos: {mote} {club} {yo} {pos} {temporada}. En las respuestas, sigDom suma (o resta) a tu personalidad principal. */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  DB.temporada = {
    intro: {
      great: ['Garrido te espera en el café de siempre con dos cortados y un periódico doblado por la página de los campeones. «Siéntese. Hoy invito yo, que no pasa todos los años».',
        'El café está lleno de bufandas del {club}. Garrido ha conseguido la única mesa libre, al fondo, y te saluda levantando la libreta como si fuera una copa.'],
      good: ['Garrido remueve el café sin prisa. «Temporada de las que no salen en los documentales», dice. «Esas son las que más me gustan».',
        'Libreta negra, bolígrafo mordisqueado y la misma mesa junto a la ventana. «Ha cumplido usted. Ahora cuénteme cómo se cumple».'],
      bad: ['Garrido no sonríe al verte llegar, pero te ha guardado el sitio. «Las entrevistas de los años malos son las únicas en las que la gente dice la verdad».',
        'Llueve. Garrido tiene el abrigo puesto y una página en blanco. «No he venido a hacer leña. He venido a entender qué pasó».'],
      up: ['En la mesa hay una tarta pequeña con una vela con forma de flecha hacia arriba. «Ha sido idea del camarero», jura Garrido. No te lo crees.',
        'Garrido te recibe de pie, cosa que no hace nunca. «Un ascenso se celebra hasta en El Balcón. Siéntese, señor de la categoría de arriba».'],
      down: ['El café está casi vacío. Garrido ha pedido una tila para ti sin preguntar. «He escrito muchas crónicas de descensos. Nunca me salen bien».',
        'Garrido te mira un buen rato antes de abrir la libreta. «Esto no es una autopsia. Pero casi».'],
      fired: ['Garrido te ha citado lejos del estadio, en un bar donde nadie te conoce. «Ya no es usted el entrenador del {club}. Ahora por fin podemos hablar».',
        'Es la primera vez que Garrido te llama por tu nombre y no por el cargo. «Lo siento, {yo}. Cuénteme lo que no se pudo contar».']
    },
    balance: {
      great: { q: 'Campeones. Dígame la verdad: ¿en qué momento supo que lo iban a ganar?', o: [
        { t: 'En la primera semana. Vi a este grupo entrenar y lo supe. No se lo dije a nadie, por si acaso.', cat: 'amb', sig: { leyenda: 1, chulo: 1 }, r: '«Eso lo dicen todos los campeones», apunta. «Pero usted lo dice como si fuera verdad».' },
        { t: 'Nunca. Hasta el pitido final pensaba que se nos escapaba.', cat: 'hum', sig: { curante: 1, timido: 1 }, r: 'Garrido sonríe por primera vez. «Los que dudan hasta el final son los que acaban ganando».' },
        { t: 'Cuando el vestuario dejó de necesitarme para animarse. Ahí ya era suyo, no mío.', cat: 'pro', sig: { padre: 2 }, r: 'Garrido deja de escribir un momento. «Esa frase me la quedo».' }] },
      good: { q: 'Objetivo cumplido. ¿Satisfecho o con la sensación de que se podía más?', o: [
        { t: 'Satisfecho. Hicimos exactamente lo que nos pidieron, y eso en este fútbol es casi revolucionario.', cat: 'hum', sig: { curante: 1, tibio: 1 }, r: '«Revolucionario», repite, divertido. «Le va a gustar al presidente».' },
        { t: 'Se podía más. Y el año que viene lo vamos a demostrar.', cat: 'amb', sig: { bocazas: 1, chulo: 1 }, r: '«Lo apunto», dice. «Y en mayo se lo leo en voz alta».' },
        { t: 'Satisfecho a medias. Me quedan tres partidos que todavía me quitan el sueño.', cat: 'tec', sig: { profesor: 2 }, r: '«¿Solo tres?», pregunta. Le recitas los tres de memoria. Garrido se ríe.' }] },
      bad: { q: 'No ha cumplido el objetivo. ¿De quién es la culpa?', o: [
        { t: 'Mía. El entrenador es el primero que tiene que dar la cara, y la doy.', cat: 'hum', sig: { curante: 2, leyenda: 1 }, r: 'Garrido asiente despacio. «No es tan habitual oír eso en esta mesa».' },
        { t: 'De muchas cosas. Lesiones, árbitros, mala suerte… No ha sido un año normal.', cat: 'pol', sig: { lloron: 2, conspiranoico: 1 }, r: '«Lesiones, árbitros, mala suerte», repite mientras escribe. «Tengo la lista entera de todos los años».' },
        { t: 'De quien diseñó la plantilla. Y no fui yo.', cat: 'pol', sig: { polemista: 2, bocazas: 1 }, r: 'Garrido levanta las cejas. «Esto mañana lo va a leer mucha gente, ¿lo sabe?».' }] },
      up: { q: 'Ascenso. ¿Qué le ha dado este equipo que no se ve en la clasificación?', o: [
        { t: 'Hambre. Este equipo tenía más hambre que nadie, y eso no se entrena.', cat: 'pro', sig: { pandillero: 1, padre: 1 }, r: '«Hambre», anota, y lo subraya dos veces.' },
        { t: 'Orden. Cada uno sabía exactamente qué hacer en cada momento.', cat: 'tec', sig: { profesor: 2, despota: 1 }, r: '«Suena a reloj suizo», dice. «A mí me sonó más a orquesta».' },
        { t: 'Un vestuario que se lo pasaba bien. Ganar riéndose es lo mejor que hay.', cat: 'hu', sig: { gracioso: 2 }, r: 'Garrido recuerda en voz alta un par de celebraciones. Se le escapa la risa.' }] },
      down: { q: 'Descenso. ¿Cuándo empezó a caerse esto?', o: [
        { t: 'Antes de que yo lo viera. Y eso es lo que más me duele.', cat: 'hum', sig: { curante: 1, timido: 1 }, r: 'Garrido no escribe. Solo escucha. Luego apunta una sola palabra.' },
        { t: 'Cuando dejamos de creer. Y eso es culpa del entrenador, o sea, mía.', cat: 'pro', sig: { padre: 1, leyenda: 1 }, r: '«Dar la cara en un descenso es lo más difícil del oficio», dice. «Usted la ha dado».' },
        { t: 'Desde el principio. Este equipo no estaba hecho para esta categoría, y todo el mundo lo sabía.', cat: 'pol', sig: { lloron: 1, polemista: 1 }, r: '«Todo el mundo lo sabía», repite. «Curioso que nadie lo dijera hasta hoy».' }] },
      fired: { q: 'Le han echado. ¿Lo vio venir?', o: [
        { t: 'Desde hace semanas. En el fútbol, cuando el presidente deja de mirarte a los ojos, ya está.', cat: 'hum', sig: { tibio: 1, curante: 1 }, r: '«Lo de mirar a los ojos lo he oído antes», dice. «Siempre lo dicen los que tenían razón».' },
        { t: 'No. Y no lo entiendo. Pero así es este negocio.', cat: 'eva', sig: { pasota: 1, lloron: 1 }, r: 'Garrido asiente, pero escribe algo que no te deja ver.' },
        { t: 'Lo vi venir y no hice nada para evitarlo. Hice lo que creía. Me voy tranquilo.', cat: 'amb', sig: { leyenda: 2, chulo: 1 }, r: '«Tranquilo», repite. «Es la palabra más rara que he oído hoy, y la más bonita».' }] }
    },
    momento: [
      { q: 'Si tuviera que quedarse con un solo momento de la temporada, ¿cuál sería?', o: [
        { t: 'Un abrazo en el vestuario después de una derrota. Ahí supe que este grupo era especial.', cat: 'pro', sig: { padre: 2 }, r: '«De las derrotas nadie se acuerda», dice Garrido. «Salvo los que las entienden».' },
        { t: 'Una rueda de prensa. Ustedes saben cuál.', cat: 'hu', sig: { gracioso: 2, polemista: 1 }, r: 'Garrido se ríe tanto que el camarero se gira. «Lo sé. La tengo grabada».' },
        { t: 'Ninguno. Yo ya estoy pensando en la temporada que viene.', cat: 'eva', sig: { pasota: 1, curante: 1 }, r: '«Pasar página tan rápido es un don o una maldición», dice. «Aún no sé cuál de las dos».' }] },
      { q: '¿Qué partido volvería a jugar mañana mismo, si pudiera?', o: [
        { t: 'Uno que perdimos. Sé exactamente qué cambiaría, minuto a minuto.', cat: 'tec', sig: { profesor: 2 }, r: 'Garrido te deja explicarlo con los sobrecitos de azúcar. Tarda once minutos.' },
        { t: 'El mejor que ganamos. Para disfrutarlo otra vez, que con los nervios no me enteré.', cat: 'hu', sig: { gracioso: 1, ligon: 1 }, r: '«Eso no se suele decir», dice. «Y debería decirse más».' },
        { t: 'Ninguno. Lo jugado, jugado está.', cat: 'dur', sig: { despota: 1, facha: 1 }, r: 'Garrido cierra la libreta un segundo y la vuelve a abrir. «Siguiente pregunta, entonces».' }] }
    ],
    tu: {
      known: { q: 'En la calle ya le llaman «{mote}». ¿Se reconoce en el mote?', o: [
        { t: 'Sí. Y a mucha honra. Prefiero un mote que la indiferencia.', cat: 'amb', sigDom: 3, r: 'Garrido escribe «{mote}» en mayúsculas en la libreta. «Entonces ya tengo el titular».' },
        { t: 'Es una caricatura. Yo soy bastante más que eso.', cat: 'hum', sigDom: -3, r: '«Todos somos más que nuestro mote», dice. «Pero el mote es lo que queda».' },
        { t: 'Me han llamado cosas peores. Esa es de las bonitas.', cat: 'hu', sigDom: 1, r: 'Garrido se ríe. «Le prometo no publicar la lista de las peores».' }] },
      unknown: { q: 'Llevo un año siguiéndole y todavía no sé quién es usted. ¿Me ayuda?', o: [
        { t: 'Un currante. Nada más. Ni nada menos.', cat: 'hum', sig: { curante: 3 }, r: '«Un currante», anota. «Es lo que dicen todos, pero a usted casi me lo creo».' },
        { t: 'Alguien que dice lo que piensa, aunque no guste.', cat: 'pol', sig: { bocazas: 2, polemista: 1 }, r: '«Eso ya lo había notado», responde, señalando una carpeta llena de recortes.' },
        { t: 'Un padre para este vestuario. Con lo bueno y con lo malo.', cat: 'pro', sig: { padre: 3 }, r: 'Garrido se queda mirando por la ventana. «Mi padre también era así», dice, y no añade más.' },
        { t: 'No lo sé ni yo. Por eso me gusta este trabajo.', cat: 'eva', sig: { tibio: 2, timido: 1 }, r: '«Es la respuesta más honesta del año», dice. «Y la más difícil de titular».' }] }
    },
    futuro: {
      stay: { q: 'Última pregunta: ¿qué le pide a la temporada que viene?', o: [
        { t: 'Más. Siempre más. Si no, ¿para qué estamos aquí?', cat: 'amb', sig: { chulo: 1, bocazas: 1 }, r: '«Más», escribe. «Le volveré a citar en mayo para ver cuánto más».' },
        { t: 'Lo mismo, pero con menos sustos. Mi corazón ya tiene una edad.', cat: 'hu', sig: { gracioso: 1, tibio: 1 }, r: 'Garrido paga los cafés. «Para el corazón», dice.' },
        { t: 'Que mis jugadores sigan creciendo. Lo demás llega solo.', cat: 'pro', sig: { padre: 1, curante: 1 }, r: '«Lo demás llega solo», repite. «Ojalá. Rara vez llega».' },
        { t: 'Primero, unas vacaciones. Después ya hablamos.', cat: 'eva', sig: { pasota: 2 }, r: 'Garrido se ríe y te desea buen viaje. Sabe que estarás viendo vídeos el segundo día.' }] },
      fired: { q: 'Última pregunta: ¿y ahora qué?', o: [
        { t: 'Volveré. Más fuerte, más sabio y con más canas.', cat: 'amb', sig: { leyenda: 2 }, r: '«Lo apunto con fecha», dice. «Para el día que vuelva».' },
        { t: 'Sofá, fútbol en la tele y, por una vez, opinar sin consecuencias.', cat: 'hu', sig: { pasota: 1, gracioso: 1 }, r: '«Bienvenido al otro lado», dice Garrido. «Aquí se opina gratis».' },
        { t: 'Me quedo con la gente de este club. Lo demás pasará.', cat: 'pro', sig: { padre: 2 }, r: 'Garrido deja el bolígrafo en la mesa. «Esa es la frase que va a quedar».' },
        { t: 'Que se arrepientan. Y se van a arrepentir.', cat: 'pol', sig: { polemista: 1, lloron: 1, chulo: 1 }, r: '«Tenga cuidado», dice Garrido. «El fútbol tiene muy buena memoria para estas frases».' }] }
    },
    // Títulos de capítulo: los generales y, si ya tienes mote, los de tu personalidad (pos: el año fue bien · neg: mal)
    titulos: {
      great: ['La temporada en que {club} tocó el cielo', 'El año de la vuelta de honor', 'Champán en la sala de prensa'],
      good: ['El año en que todo salió según el guion', 'La temporada tranquila (que nadie vio tranquila)', 'Cumplir, que no es poco'],
      bad: ['La temporada que se torció en octubre', 'El año de las excusas', 'Un otoño largo y un invierno más largo'],
      up: ['Subir, que es lo más bonito', 'El ascensor solo va hacia arriba', 'El año en que {club} cambió de piso'],
      down: ['El año del descenso', 'Bajar al sótano con la luz apagada', 'La temporada que nadie quiere recordar'],
      fired: ['El último café en {club}', 'La carta de despido', 'Cuando el teléfono sonó a las once de la noche']
    },
    persona: {
      gracioso: { pos: ['La temporada en que {mote} hizo reír hasta a la directiva'], neg: ['El chiste que nadie entendió'] },
      pasota: { pos: ['Ganar sin despeinarse'], neg: ['La temporada que a {mote} le dio igual (y se notó)'] },
      tibio: { pos: ['Ni fu ni fa, pero con premio'], neg: ['El año en que {mote} no se mojó y se ahogó igual'] },
      timido: { pos: ['La temporada en que {mote} gritó'], neg: ['El silencio de {mote}'] },
      bocazas: { pos: ['Lo dijo y lo cumplió'], neg: ['El año en que {mote} habló demasiado'] },
      polemista: { pos: ['El año del incendio (y del trofeo)'], neg: ['El año del incendio'] },
      ligon: { pos: ['Un romance con la victoria'], neg: ['Corazones rotos en el banquillo'] },
      pandillero: { pos: ['El barrio llegó a la cima'], neg: ['La pandilla se quedó en la esquina'] },
      despota: { pos: ['El imperio de {mote}'], neg: ['La caída del imperio'] },
      leyenda: { pos: ['Otra página en la leyenda'], neg: ['Hasta las leyendas tienen un mal año'] },
      progre: { pos: ['La causa también gana partidos'], neg: ['Pancartas y derrotas'] },
      facha: { pos: ['Orden, disciplina y tres puntos'], neg: ['El sargento que perdió la guerra'] },
      machista: { pos: ['Ganar en otro siglo'], neg: ['El año en que el siglo pasado le pasó factura'] },
      comunista: { pos: ['El colectivo al poder'], neg: ['La asamblea que votó perder'] },
      curante: { pos: ['El obrero que levantó la copa'], neg: ['Trabajar mucho, ganar poco'] },
      profesor: { pos: ['La pizarra tenía razón'], neg: ['Lección suspendida'] },
      lloron: { pos: ['Ganar sin quejarse (casi)'], neg: ['La temporada de las lágrimas'] },
      chulo: { pos: ['El año en que {mote} tenía razón'], neg: ['El ego en el banquillo'] },
      padre: { pos: ['Una familia campeona'], neg: ['La familia se rompió en invierno'] },
      conspiranoico: { pos: ['Ni el complot pudo con {mote}'], neg: ['El dossier de la temporada perdida'] }
    },
    // La columna de cierre (se publica en Noticias, sección Opinión)
    cierre: {
      great: ['Hay temporadas que se ganan y temporadas que se escriben. La de {yo} en el {club} fue de las dos. Le pregunté cuándo supo que serían campeones y me contestó con la mirada de quien aún no se lo cree. Yo tampoco. Por eso esta columna llega tarde: llevo dos días buscando adjetivos.',
        'Escribo esto con el café frío y la libreta llena. {yo} se ha ganado algo más que un título: se ha ganado que este viejo columnista no encuentre nada que reprocharle. Volveremos a hablar. Ojalá en otra final.'],
      good: ['El {club} terminó {pos} y nadie hará una película con eso. Hacen mal. Cumplir en el fútbol de hoy es un ejercicio de equilibrio que {yo} ha hecho parecer fácil. No lo es. Lo sé porque he visto a muchos caerse del alambre.',
        'Una temporada sin titulares es una temporada bien hecha. {yo} ha cumplido el objetivo y se ha marchado de vacaciones sin hacer ruido. Me quedo con una frase suya que no publicaré. Algunas cosas son solo para la libreta.'],
      bad: ['El {club} acabó {pos} y {yo} no buscó excusas. O no muchas. Le escuché durante una hora y salí con la sensación de que este año le ha enseñado más que cualquier victoria. La próxima temporada dirá si lo ha aprendido.',
        'Hay años que hay que pasar para llegar a los buenos. {yo} lo sabe, o eso dice. Yo he visto entrenadores salir de temporadas peores y hundirse en temporadas mejores. El fútbol no tiene memoria, pero yo sí. Y esta columna también.'],
      up: ['Un ascenso tiene algo de infancia: todo el mundo vuelve a ser niño durante una semana. {yo} me recibió con cara de no haber dormido desde el último partido. El {club} sube y yo subo con él la apuesta: este entrenador va a dar que hablar arriba.',
        'Me prometí no escribir la palabra «histórico». Fracaso: histórico. El {club} sube y {yo} tiene la culpa. Ahora empieza lo difícil, que es lo que a mí más me gusta contar.'],
      down: ['Las crónicas de descensos no se escriben, se sobreviven. {yo} no se escondió, y eso dice mucho de quién es. El {club} baja, pero algo me dice que esta historia todavía no ha terminado.',
        'Tomamos una tila, que es lo que se toma en estos casos. {yo} habló poco y bien. El {club} baja de categoría y la ciudad está de luto. Yo, por una vez, no tengo ganas de tener razón.'],
      fired: ['Despedir a un entrenador es el deporte nacional que más se practica y menos se entiende. {yo} se va del {club} con la cabeza alta, o eso parecía mientras pagaba su café. Le he pedido que me avise cuando vuelva a un banquillo. Me ha prometido que sí.',
        'Esta es la última vez que escribo «el entrenador del {club}» al lado del nombre de {yo}. Me ha dado pena, y no suelo tenerla. El fútbol es así, dicen. Yo creo que el fútbol es como lo hacemos. Y este despido, francamente, lo hemos hecho mal.']
    }
  };
})();
