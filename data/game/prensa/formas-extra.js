/* TOUCHLINE — más formas para la previa, la sociedad y tu personalidad, con las mismas voces de periodista que
 * formas-partido-3.js (el chat del streamer, el veterano, la radio del pueblo, la prensa extranjera, la becaria). */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  const F = DB.formas = DB.formas || {};
  const add = (k, l) => { F[k] = (F[k] || []).concat(l); };
  // ================================================================ Previa
  add('pv_cup', ['Chat ya tiene el pronóstico: ¿pasan o no pasan?', 'He visto muchas eliminatorias. ¿Esta cómo la huele?', 'Para la radio del pueblo, que ya ha alquilado un autobús: ¿pasamos?', 'Para la prensa del {rival}: ¿les tiene respeto?', 'Primera eliminatoria que cubro: ¿qué se siente la víspera?', '¿Penaltis entrenados, por si acaso?']);
  add('pv_group', ['Chat quiere himno europeo y victoria. ¿Les da las dos cosas?', 'Las noches europeas son otra cosa. ¿Se nota en el vestuario?', 'Para la radio del pueblo: ¿Europa nos queda grande?', 'Para la prensa del {rival}: ¿qué conoce de su equipo?', '¿Hay jugadores que debutan en Europa?', '¿Qué resultado firmaría?']);
  add('pv_top', ['Chat dice que esto es «la final del mes». ¿Lo es?', 'He visto muchos partidos así decidir temporadas. ¿Este también?', 'Para la radio del pueblo: ¿cómo se gana al {rival}?', 'Para la prensa del {rival}: ¿quién es el favorito?', '¿Hará cambios en el once para un partido así?', '¿Qué le diría a los que dicen que el {rival} es mejor?']);
  add('pv_direct', ['Chat lo llama «el clásico de la tabla». ¿Le gusta?', 'Los duelos directos se ganan antes de jugarlos, decían. ¿Lo cree?', 'Para la radio del pueblo: ¿estos partidos dan miedo?', 'Para la prensa del {rival}: ¿algún mensaje?', '¿Hay que salir a ganar o a no perder?', '¿Ha estudiado los últimos partidos del {rival}?']);
  add('pv_title', ['Chat ya está planeando la rúa. ¿Les pide calma?', 'He visto ligas perderse en la última jornada. ¿Le da miedo?', 'Para la radio del pueblo: ¿cuántas jornadas quedan para el alirón?', 'Para la prensa internacional: ¿es usted favorito al título?', '¿Mira los resultados de los rivales?', '¿Duerme a gusto siendo líder?']);
  add('pv_down', ['Chat está de los nervios. ¿Y usted?', 'He visto salvaciones milagrosas. ¿Cree en milagros?', 'Para la radio del pueblo, que tiene el corazón en un puño: ¿nos salvamos?', '¿Mira los resultados de los de abajo?', '¿Qué le diría a un jugador que tiene miedo?', '¿Este partido es una final?']);
  add('pv_end', ['Chat pregunta si ya hay vacaciones. ¿Hay?', 'El final de temporada saca lo mejor y lo peor. ¿Qué espera?', 'Para la radio del pueblo: ¿qué nos queda por ver?', '¿Habrá debuts en estas jornadas?', '¿Prueba cosas pensando en la próxima temporada?', '¿Le preocupa que el equipo baje los brazos?']);
  add('pv_figura', ['Chat dice que {figura} «está roto». ¿Cómo se le para?', 'He visto a muchos cracks. ¿{figura} es de los buenos?', 'Para la radio del pueblo: ¿quién marca a {figura}?', 'Para la prensa del {rival}: ¿qué opina de {figura}?', '¿{figura} es el mejor de la liga?', '¿Le gustaría tener a {figura} y a {mi} juntos?']);
  add('pv_fav', ['Chat ya les da ganadores. ¿Les pide prudencia?', 'He visto caer a muchos favoritos. ¿Teme ser uno más?', 'Para la radio del pueblo: ¿ganamos seguro?', '¿El cartel de favorito le quita el sueño?', '¿El {rival} les puede sorprender?', '¿Cómo se juega sin confiarse?']);
  add('pv_under', ['Chat no da un duro por ustedes. ¿Les responde?', 'He visto sorpresas mayores. ¿Cree en la suya?', 'Para la radio del pueblo: ¿podemos dar la campanada?', '¿Le gusta el papel de víctima?', '¿Qué le pide a los suyos para dar la sorpresa?', '¿Cuál es el punto débil del {rival}?']);
  add('pv_revenge', ['Chat no ha olvidado la ida. ¿Usted tampoco?', 'Las revanchas se juegan con la cabeza fría, decían. ¿Fría o caliente?', 'Para la radio del pueblo: ¿nos vengamos?', '¿Ha usado la derrota de la ida como motivación?', '¿Qué jugador tiene más ganas de este partido?', '¿Qué cambió desde aquel día?']);
  add('pv_home', ['Chat va a estar en el estadio. ¿Les pide algo?', 'He visto ganar partidos a la grada. ¿Mañana también?', 'Para la radio del pueblo: ¿qué le pide a los vecinos que vienen?', '¿Cuál es el mejor ambiente que ha vivido aquí?', '¿El estadio puede asustar al {rival}?', '¿Le gustaría ver más bufandas mañana?']);
  add('pv_away', ['Chat dice que el campo del {rival} es «un infierno». ¿Lo es?', 'He visto equipos derretirse en ese estadio. ¿Cómo se evita?', 'Para la radio del pueblo: ¿cuántos de los nuestros irán?', '¿Le gusta que le piten?', '¿Qué le pide a los que viajan?', '¿Jugar fuera cambia el plan?']);
  add('pv_mind', ['Chat quiere beef entre banquillos. ¿Hay beef?', 'Las guerras de micrófono vienen de lejos. ¿Usted entra?', 'Para la radio del pueblo: ¿qué le ha dicho el otro entrenador?', '¿Se llevan bien fuera del campo?', '¿Le dará la mano al acabar?', '¿Las palabras del rival le han dolido?']);
  add('pv_form', ['Chat dice que van «imparables». ¿Lo son?', 'He visto rachas acabar de golpe. ¿Le preocupa?', 'Para la radio del pueblo: ¿cuánto dura esto?', '¿Qué hace para que no se relajen?', '¿Cuál ha sido la clave de la racha?', '¿La racha cambia la exigencia?']);
  add('pv_crisis', ['Chat pide cambios. ¿Habrá cambios?', 'He visto crisis peores. ¿Esta tiene arreglo?', 'Para la radio del pueblo: ¿esto se arregla?', '¿Qué ha cambiado en los entrenamientos?', '¿El vestuario sigue creyendo en usted?', '¿Cuál es el primer paso para salir?']);
  add('pv_board', ['Chat dice que es su último partido. ¿Lo es?', 'He visto muchos entrenadores jugarse el puesto. ¿Cómo lo lleva?', 'Para la radio del pueblo: ¿le despiden si pierde?', '¿Ha hablado con su familia del tema?', '¿Qué le diría al presidente si le está escuchando?', '¿Juega usted también este partido?']);
  // ================================================================ Sociedad
  [['soc_orgullo', ['Chat apoya el brazalete arcoíris. ¿Usted?', 'Para la prensa internacional: ¿el fútbol español es inclusivo?', '¿Ha hablado de esto en su vestuario?', '¿Por qué cuesta tanto que un futbolista salga del armario?']],
   ['soc_femenino', ['Chat pregunta si ha visto algún partido del femenino. ¿Lo ha visto?', 'Para la prensa internacional: ¿cómo está el fútbol femenino en su país?', '¿Qué jugadora del femenino ficharía para su vestuario si pudiera?', '¿Las jugadoras tienen las mismas instalaciones que ustedes?']],
   ['soc_entradas', ['Chat dice que ir al fútbol es un lujo. ¿Lo es?', 'Para la radio del pueblo: ¿cuánto le cuesta a una familia venir al estadio?', '¿El fútbol se está olvidando del aficionado de toda la vida?', '¿Rebajaría las entradas si pudiera?']],
   ['soc_extranjeros', ['Chat está indignado con ese político. ¿Y usted?', 'Para la prensa internacional: ¿cómo se sienten sus jugadores extranjeros?', '¿El vestuario habla de estas cosas?', '¿Le han pedido sus jugadores que diga algo?']],
   ['soc_var', ['Chat odia el VAR. ¿Usted también?', 'Para la prensa internacional: ¿el VAR funciona igual en todas partes?', '¿El VAR ha cambiado la forma de celebrar los goles?', '¿Quién debería controlar el VAR?']],
   ['soc_disciplina', ['Chat dice que el pelo rosa mola. ¿Usted qué dice?', 'Para la radio del pueblo: ¿un futbolista debe dar ejemplo hasta con el peinado?', '¿Tiene normas de vestimenta en el club?', '¿La disciplina se ve o se demuestra?']],
   ['soc_arbitras', ['Chat celebra a la árbitra. ¿Y usted?', 'Para la prensa internacional: ¿es normal que haya árbitras en primera?', '¿Cree que la juzgarán más que a un hombre?', '¿Qué le diría a una niña que quiere ser árbitra?']],
   ['soc_apuestas', ['Chat está lleno de anuncios de apuestas. ¿Le molesta?', 'Para la radio del pueblo: ¿apuesta usted?', '¿Hay jugadores que apuestan?', '¿Debería el club renunciar a ese dinero?']],
   ['soc_salud', ['Chat manda ánimos a ese jugador. ¿Usted también?', 'Para la prensa internacional: ¿el futbolista es un privilegiado o una víctima?', '¿Cómo cuida usted su salud mental?', '¿Pedir ayuda es de valientes?']],
   ['soc_selecciones', ['Chat odia la superliga. ¿Y usted?', 'Para la radio del pueblo: ¿qué sería de clubes como el nuestro?', '¿El fútbol se está convirtiendo en un negocio sin alma?', '¿Jugaría usted una competición cerrada?']],
   ['soc_himno', ['Chat está dividido con los pitos. ¿Usted qué dice?', 'Para la prensa internacional: ¿se pita el himno en otros países?', '¿El estadio es un lugar para la política?', '¿Sancionaría al club?']],
   ['soc_ricos', ['Chat teme que el club se venda. ¿Lo teme usted?', 'Para la radio del pueblo: ¿qué cambiaría con un dueño extranjero?', '¿Prefiere un club rico o un club de los socios?', '¿Seguiría usted con un nuevo dueño?']]
  ].forEach(([k, l]) => add('soc:' + k, l));
  // ================================================================ Tu personalidad
  const MOTE = {
    gracioso: ['Chat le llama «{mote}» y le pide un chiste. ¿Lo cuenta?', 'Para la radio del pueblo: ¿es verdad que le llaman «{mote}»?', '¿«{mote}» le ayuda o le perjudica con la directiva?'],
    pasota: ['Chat dice que usted es «{mote}» y le pone un emoji durmiendo. ¿Le da igual?', 'Para la radio del pueblo: ¿le importa algo, «{mote}»?', '¿Ser «{mote}» es una estrategia?'],
    tibio: ['Chat le llama «{mote}». ¿Le molesta… o le da un poco igual?', 'Para la radio del pueblo: ¿algún día dirá lo que piensa?', '¿«{mote}» es un apodo injusto?'],
    timido: ['Chat le llama «{mote}» y pide que suba el volumen. ¿Lo sube?', 'Para la radio del pueblo, que no le oye: ¿le gusta lo de «{mote}»?', '¿Ser «{mote}» le ha costado algo en el fútbol?'],
    bocazas: ['Chat le llama «{mote}» y espera un titular. ¿Lo da?', 'Para la radio del pueblo: ¿le han multado alguna vez por hablar?', '¿«{mote}» se aprende o se nace?'],
    polemista: ['Chat le llama «{mote}» y pide salseo. ¿Hay salseo hoy?', 'Para la radio del pueblo: ¿por qué siempre hay lío con usted?', '¿«{mote}» le ha hecho más famoso que sus títulos?'],
    ligon: ['Chat le llama «{mote}» y pregunta si está soltero. ¿Lo está?', 'Para la radio del pueblo: ¿le gusta salir en el papel cuché?', '¿Ser «{mote}» le distrae del fútbol?'],
    pandillero: ['Chat le llama «{mote}» con respeto. ¿Lo recibe así?', 'Para la radio del pueblo: ¿de qué barrio es usted?', '¿Ser «{mote}» se nota en el vestuario?'],
    despota: ['Chat le llama «{mote}» y pone una corona. ¿Le gusta?', 'Para la radio del pueblo: ¿es tan duro como dicen?', '¿Se puede ganar sin mano dura?'],
    leyenda: ['Chat le llama «{mote}» y le hace reverencias. ¿Se lo cree?', 'Para la radio del pueblo: ¿cómo se vive siendo «{mote}»?', '¿Le asusta dejar de ser «{mote}» algún día?'],
    progre: ['Chat le llama «{mote}» y está dividido. ¿Les responde?', 'Para la radio del pueblo: ¿por qué se mete en política?', '¿Sus ideas le han costado partidos?'],
    facha: ['Chat le llama «{mote}» y no precisamente con cariño. ¿Qué les dice?', 'Para la radio del pueblo: ¿le molesta lo que dicen de usted?', '¿Rectificaría alguna de sus opiniones?'],
    machista: ['Chat le llama «{mote}» y pide disculpas. ¿Las va a pedir?', 'Para la radio del pueblo: ¿entiende por qué molestó lo que dijo?', '¿Ha hablado con alguna jugadora del club?'],
    comunista: ['Chat le llama «{mote}» y pone puños en alto. ¿Le gusta?', 'Para la radio del pueblo: ¿el fútbol es del pueblo?', '¿Sus ideas caben en un club con presidente?'],
    curante: ['Chat le llama «{mote}» y le manda café. ¿Lo necesita?', 'Para la radio del pueblo: ¿cuándo descansa usted?', '¿Ser «{mote}» le basta para ganar?'],
    profesor: ['Chat le llama «{mote}» y pide apuntes. ¿Los comparte?', 'Para la radio del pueblo: ¿lo puede explicar fácil?', '¿Sus jugadores aprueban sus exámenes?'],
    lloron: ['Chat le llama «{mote}» y le manda pañuelos. ¿Los necesita hoy?', 'Para la radio del pueblo: ¿hoy también ha sido el árbitro?', '¿«{mote}» le parece injusto?'],
    chulo: ['Chat le llama «{mote}» y le pone gafas de sol. ¿Le representa?', 'Para la radio del pueblo: ¿se cree el mejor?', '¿Ser «{mote}» motiva a sus jugadores?'],
    padre: ['Chat le llama «{mote}» y le manda corazones. ¿Se emociona?', 'Para la radio del pueblo: ¿trata a sus jugadores como a sus hijos?', '¿Ser «{mote}» le impide ser exigente?'],
    conspiranoico: ['Chat le llama «{mote}» y comparte sus teorías. ¿Les da la razón?', 'Para la radio del pueblo: ¿quién está contra nosotros?', '¿Tiene pruebas de algo?']
  };
  for (const id in MOTE) add('mote:' + id, MOTE[id]);
  // Los capítulos: una forma más cada uno (el chat o la radio del pueblo)
  const CAP = {
    gracioso: ['¿Plató o banquillo? Chat ya ha votado.', 'Chat no se ha reído con su chiste del {rival}. ¿Lo explica?', 'Si se fuese hoy de {club}, ¿con qué chiste cerraría?'],
    pasota: ['Chat ha hecho un remix de su siesta. ¿Lo ha oído?', 'Para la radio del pueblo: ¿el presidente tiene razón?', 'Chat no le reconoce hoy. ¿Qué ha cambiado?'],
    tibio: ['Chat exige un portero titular. ¿Cuál?', 'Para la radio del pueblo: ¿le importa ser el más indiferente?', 'Chat espera su gran frase. ¿La tiene?'],
    timido: ['Chat ha subido el audio del micro abierto. ¿Lo ha escuchado?', 'Para la radio del pueblo: ¿se oye la charla desde el banquillo?', 'Chat ha clipeado su grito. ¿Repetimos?'],
    bocazas: ['Chat ha guardado su promesa en un pantallazo. ¿La cumple?', 'Para la radio del pueblo: ¿le compensa la multa?', 'Chat le da el micro sin filtros. ¿Qué dice?'],
    polemista: ['Chat ve la tertulia solo por usted. ¿Irá?', 'Para la radio del pueblo: ¿el vestuario está harto?', 'Chat habla más de usted que del equipo. ¿Le gusta?'],
    ligon: ['Chat ha visto la portada. ¿Algo que confirmar?', 'Para la radio del pueblo: ¿hay mal rollo en el vestuario?', 'Chat quiere saber: ¿amor o fútbol?'],
    pandillero: ['Chat ya ha visto el vídeo del bar. ¿Qué pasó?', 'Para la radio del pueblo: ¿tiene jugadores favoritos?', 'Chat se ha hecho fotos con su mural. ¿Lo ha visto?'],
    despota: ['Chat dice que su vestuario es una cárcel. ¿Lo es?', 'Para la radio del pueblo: ¿hay motín?', 'Chat dice que le temen. ¿Le importa?'],
    leyenda: ['Chat ha firmado para su estatua. ¿La quiere?', 'Para la radio del pueblo: ¿se va o se queda?', 'Chat pregunta por su legado. ¿Cuál es?'],
    progre: ['Chat está dividido con el brazalete. ¿Qué les dice?', 'Para la radio del pueblo: ¿apuestas en la camiseta?', 'Chat le felicita por el premio. ¿Lo recogerá?'],
    facha: ['Chat está con el jugador que se siente incómodo. ¿Y usted?', 'Para la radio del pueblo: ¿cuánto dinero ha costado lo que dijo?', 'Chat dice que está solo. ¿Lo está?'],
    machista: ['Chat apoya a la capitana. ¿Qué le responde?', 'Para la radio del pueblo: ¿recurrirá el expediente?', 'Chat pregunta qué ha aprendido. ¿Qué ha aprendido?'],
    comunista: ['Chat apoya el reparto de primas. ¿Lo mantiene?', 'Para la radio del pueblo: ¿bajarán las entradas?', 'Chat quiere saber si respeta el voto. ¿Lo respeta?'],
    curante: ['Chat dice que vive en el estadio. ¿Es verdad?', 'Para la radio del pueblo: ¿trabajar más arregla esto?', 'Chat celebra su renovación. ¿Lo celebra usted?'],
    profesor: ['Chat se apunta a su clase. ¿La dará?', 'Para la radio del pueblo: ¿demasiadas instrucciones?', 'Chat no entendió el cambio. ¿Lo explica?'],
    lloron: ['Chat se sabe sus 23 excusas. ¿Hay una 24?', 'Para la radio del pueblo: ¿el árbitro iba por usted?', 'Chat no le reconoce sin quejarse. ¿Está bien?'],
    chulo: ['Chat ya quiere ver el documental. ¿Lo hará?', 'Para la radio del pueblo: ¿dónde está ahora el mejor?', 'Chat le corona entrenador del año. ¿Unas palabras?'],
    padre: ['Chat pide castigo para el de la fiesta. ¿Habrá castigo?', 'Para la radio del pueblo: ¿por qué fue al entierro?', 'Chat ha comprado la camiseta con su cara. ¿Se la firma?'],
    conspiranoico: ['Chat pide ver el dossier. ¿Lo enseña?', 'Para la radio del pueblo: ¿quién es el infiltrado?', 'Chat dice que la federación le ha dejado en evidencia. ¿Qué responde?']
  };
  for (const id in CAP) CAP[id].forEach((t, k) => add(`cap:${id}:${k}`, [t]));

  // ================================================================ La influencer (vlog en directo desde la sala)
  const INF = {
    win: 'Holi, míster, estoy en directo con mis seguidores: ¿cómo se celebra una victoria así, en tu casa o de fiesta?', draw: 'Mis seguidores preguntan si un empate es como un match que no contesta. ¿Lo es?',
    loss: 'Mis seguidores mandan muchos ánimos. ¿Qué les dirías para que no se bajen del barco?', thrash: 'Mis seguidores dicen que hoy toca «día de mantita y peli». ¿Para ti también?',
    protest: 'Estoy en directo y mis seguidores han visto tus gestos en la banda. ¿Qué le decías al árbitro?', coachRed: 'Mis seguidores dicen que tu expulsión ha sido «muy main character». ¿Lo fue?',
    refNoProtest: 'Mis seguidores dicen que han robado. ¿Les doy la razón de tu parte?', lateLost: 'Mis seguidores tienen el corazón roto por el gol del final. ¿Algún mensaje?',
    penMiss: 'Mis seguidores quieren mandarle mucho amor a {jug}. ¿Se lo dices tú?', og: 'Mis seguidores dicen que a {jug} hoy le ha mirado un tuerto. ¿Cómo está?',
    bigMiss: 'Mis seguidores dicen que hoy la portería estaba encantada. ¿Mal fario?', red: 'Mis seguidores preguntan qué le ha pasado a {jug}. ¿Lo cuentas?',
    subGoal: 'Mis seguidores ya son fans de {jug}. ¿Les das un spoiler: será titular?', noSubs: 'Mis seguidores preguntan por qué no han salido los guapos del banquillo. ¿Respondes?',
    tactic: 'Mis seguidores no han entendido el cambio de sistema, pero les ha encantado. ¿Lo explicas fácil?', comeback: 'Mis seguidores están gritando en el chat. ¿Qué dijiste en el descanso? ¡Exclusiva!',
    lateWin: 'Mis seguidores dicen que el gol de {jug} ha sido de película. ¿Lo viviste así?', hat: 'Mis seguidores quieren una foto con {jug}. ¿Lo organizas?',
    star: 'Mis seguidores dicen que {jug} es el crush del equipo. ¿Le pasas el mensaje?', kid: 'Mis seguidores ya han hecho un club de fans de {jug}. ¿Lo sabías?',
    clean: 'Mis seguidores dicen que la defensa hoy era «muy seguridad privada». ¿Lo era?', bolt: 'Mis seguidores mandan mucha fuerza a {jug}. ¿Cómo está?',
    crowd: 'Mis seguidores han flipado con la grada. ¿Te ha gustado el show?', inj: 'Mis seguidores preguntan por {jug}. ¿Buenas noticias?',
    signing: 'Mis seguidores dicen que {jug} es el fichaje más guapo del verano. ¿Y el mejor?', sale: 'Mis seguidores lloran por {jug}. ¿Por qué se ha ido?',
    staff: 'Mis seguidores quieren conocer a {staff}. ¿Cómo es en el día a día?', sponsorR: 'Mis seguidores no quieren a {brand}. ¿Tú sí?',
    sponsor: 'Mis seguidores dicen que la camiseta con {brand} es muy aesthetic. ¿Te gusta?', campaign: 'Mis seguidores ya han compartido «{camp}». ¿Algo más que contar?',
    next: 'Mis seguidores preguntan si el {next} da miedo. ¿Da miedo?', board: 'Mis seguidores dicen que el presidente te tiene en «visto». ¿Es verdad?',
    season: 'Mis seguidores sueñan a lo grande. ¿Les dejas soñar?', fans: 'Mis seguidores te mandan saludos. ¿Les saludas a cámara?',
    pv_cup: 'Mis seguidores tienen los nervios a flor de piel con la eliminatoria. ¿Y tú?', pv_group: 'Mis seguidores dicen que las noches europeas son «otro rollo». ¿Lo son?',
    pv_top: 'Mis seguidores dicen que es el partido del año. ¿Lo es?', pv_direct: 'Mis seguidores preguntan si el {rival} es el enemigo. ¿Lo es?',
    pv_title: 'Mis seguidores ya tienen el outfit para la rúa. ¿Lo guardan o lo sacan?', pv_down: 'Mis seguidores mandan muchísima fuerza. ¿Qué necesita el equipo?',
    pv_end: 'Mis seguidores preguntan qué haréis en vacaciones. ¿Antes o después de ganar?', pv_figura: 'Mis seguidores dicen que {figura} es muy top. ¿Te da miedo?',
    pv_fav: 'Mis seguidores dicen que sois los favoritos. ¿Lo sois?', pv_under: 'Mis seguidores creen en vosotros aunque nadie más lo haga. ¿Les das la razón?',
    pv_revenge: 'Mis seguidores dicen que hoy toca «venganza bonita». ¿Toca?', pv_home: 'Mis seguidores van a ir al estadio. ¿Qué les pides?',
    pv_away: 'Mis seguidores dicen que el campo del {rival} da miedito. ¿Te lo da?', pv_mind: 'Mis seguidores quieren drama entre entrenadores. ¿Les das drama?',
    pv_form: 'Mis seguidores dicen que vais en racha. ¿Cuál es el secreto?', pv_crisis: 'Mis seguidores dicen que esto es un bache y ya. ¿Lo es?',
    pv_board: 'Mis seguidores dicen que el presidente es un poco tóxico. ¿Lo es?'
  };
  for (const k in INF) add(k, [INF[k]]);
  // Una forma más de la pregunta del mote, también de la influencer
  ['gracioso', 'pasota', 'tibio', 'timido', 'bocazas', 'polemista', 'ligon', 'pandillero', 'despota', 'leyenda', 'progre', 'facha', 'machista', 'comunista',
    'curante', 'profesor', 'lloron', 'chulo', 'padre', 'conspiranoico'].forEach(id => add('mote:' + id, [`Mis seguidores dicen que eres «{mote}». ¿Te lo pongo de nombre en el vídeo?`]));
})();
