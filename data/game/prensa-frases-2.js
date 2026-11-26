/* TOUCHLINE — frases de la rueda de prensa (2/3): lo que salió mal, tus decisiones y lo bueno. */
(function () {
  const P = window.TL_PRENSA = window.TL_PRENSA || {};
  Object.assign(P, {
    lateLost: {
      q: ['Gol encajado al final. ¿Qué ha fallado?', '¿Se puede perder así en el descuento?', '¿Le duele más por cómo ha llegado?', 'Se les escapó en el último minuto. ¿Concentración?'],
      o: [
        ['Fallo mío: no supe cerrar el partido.', 'Desde la banda no di las órdenes a tiempo. Culpa mía.', 'Tenía que haber metido un central más. No lo hice.', 'No leí el final del partido. Lo asumo.'],
        ['Hay jugadores que ya estaban en la ducha.', 'Algunos ya pensaban en la cena.', 'Hay quien se ha desconectado antes de tiempo.', 'Al final había gente en modo ahorro de energía.'],
        ['El fútbol a veces es así de cruel.', 'Cosas que pasan. Duele, pero pasan.', 'Hoy el fútbol nos ha dejado en visto.', 'A veces te toca y hoy nos ha tocado.'],
        ['Nos faltó oficio. Lo vamos a entrenar.', 'Esta semana practicamos a cerrar partidos. Literal.', 'Hay que aprender a sufrir y a cerrar. Se aprende.', 'Gestionar los últimos minutos también es fútbol, y lo trabajaremos.']
      ]
    },
    penMiss: {
      q: ['¿Qué le dice a {jug} tras el penalti fallado?', '{jug} falló desde los once metros. ¿Le seguirá dando la confianza?', '¿El penalti fallado de {jug} ha decidido el partido?', '¿Cambiará de lanzador tras lo de hoy?'],
      o: [
        ['Seguirá tirándolos. Solo falla el que se atreve.', 'El próximo es suyo. Sin dudar.', 'Le he dado un abrazo. Y el siguiente penalti.', 'Quien tiene valor para tirarlos, tiene derecho a fallarlos.'],
        ['Lo hablaremos. Hay más lanzadores.', 'Veremos quién está más fino en los entrenos.', 'Tenemos varias opciones. Ya decidiremos.', 'Es una decisión que tomaremos con calma.'],
        ['Un penalti así no se puede fallar.', 'Un penalti en un partido así se mete. Fin.', 'Eso lo mete un infantil.', 'Ha fallado lo que no se puede fallar.'],
        ['{jug} es de los que dan un paso al frente. El próximo lo mete.', 'Conozco a {jug}: esta noche no duerme y el próximo lo clava en la escuadra.', '{jug} tiene más carácter que nadie. Volverá a tirar y a marcar.', 'Los grandes fallan y vuelven. {jug} es de esos.']
      ]
    },
    og: {
      q: ['¿Cómo está {jug} tras el gol en propia puerta?', '¿Ha hablado con {jug} después del autogol?', 'Gol en propia de {jug}. ¿Mala suerte?'],
      o: [
        ['Le pasa a cualquiera. Está arropado.', 'Hoy le invitamos a cenar entre todos.', 'Es de los que más corre. Mala suerte, nada más.', 'Lo más importante: el vestuario está con él.'],
        ['Hay que estar más atento.', 'Esa jugada se puede defender mejor.', 'Hay que mirar a qué portería se apunta, ¿no?', 'Un despiste que nos ha costado caro.'],
        ['De jugadas individuales no hablo.', 'Prefiero no entrar en eso.', 'Eso lo vemos dentro.', 'No voy a señalar a nadie.']
      ]
    },
    bigMiss: {
      q: ['Muchas ocasiones y poco gol. ¿Qué pasa?', '¿Le preocupa la falta de puntería?', '¿Les ha faltado instinto delante de la portería?', 'Han perdonado mucho. ¿Por qué?'],
      o: [
        ['Si seguimos llegando así, los goles caerán.', 'Llegar ya llegamos. Lo demás es cuestión de tiempo.', 'Prefiero fallar ocasiones a no tenerlas.', 'La portería no se mueve. Un día acertamos todas.'],
        ['Tenemos que ser más contundentes.', 'Así no se ganan partidos. Hay que afinar.', 'Hoy el portero rival se ha ganado un monumento. Y nosotros, un tirón de orejas.', 'Ocasiones sin gol son buenas intenciones. No sirven.'],
        ['Los delanteros cobran por marcar.', 'Que los de arriba hagan su trabajo.', 'Si no la metes, no sirves. Así de duro.', 'Hoy los delanteros tenían el punto de mira torcido.'],
        ['Hemos generado justo lo que buscábamos. Con calma, el gol llegará.', 'El plan funciona. Solo falta el último toque, y ese llegará.', 'Estoy tranquilo: el proceso es bueno y los goles vienen detrás.']
      ]
    },
    red: {
      q: ['¿Qué opina de la roja a {jug}?', '¿Le dejó tirado {jug} con la expulsión?', '¿Ha sido justa la expulsión de {jug}?', '¿Hablará con {jug} sobre la roja?'],
      o: [
        ['Ha sido un error. Lo sabe y aprenderemos.', 'Se ha equivocado y lo asume. Así de sencillo.', 'Ya me ha pedido perdón. Pasa página.', 'Un calentón. Le pasa a cualquiera, pero no puede volver a pasar.'],
        ['Me parece muy rigurosa.', 'Con esa vara de medir, hoy acabábamos siete contra siete.', 'Ha sido exagerada. Muy exagerada.', 'Esa roja la ve un árbitro de cada diez.'],
        ['Nos ha dejado tirados. Hablaremos.', 'Ha perjudicado al equipo. Le caerá una buena.', 'No se puede dejar al equipo con diez. Punto.', 'Se ha borrado del partido él solito.'],
        ['De puertas afuera, le defiendo. De puertas adentro, que se prepare.', 'Fuera le protejo; dentro se lo corrijo.', 'Le voy a defender en público y a apretar en privado.', 'Le abrazaré mañana. Y luego le pondré a hacer series.']
      ]
    },
    subGoal: {
      q: ['{jug} salió y marcó. ¿Intuición?', '¿Cómo supo que {jug} iba a marcar?', 'Cambio y gol de {jug}. ¿Lo tenía pensado?', '¿Es {jug} su arma secreta?'],
      o: [
        ['El mérito es de {jug}, que ha salido con hambre.', 'Ha salido como un león. Todo suyo.', '{jug} ha aprovechado su oportunidad. Así se hace.', 'Ese gol es de {jug} y de nadie más.'],
        ['Para eso me pagan.', 'Visión de entrenador, qué le vamos a hacer.', 'Lo vi venir. Soy así de bueno.', 'Toque de genio, modestia aparte. Mucha modestia aparte.'],
        ['A veces sale cara y a veces cruz.', 'Hoy ha salido bien. Otro día no.', 'Suerte, un poco.', 'Cosas del fútbol.'],
        ['Les hacíamos daño a la espalda. Lo preparamos y {jug} lo ha bordado.', 'Su desmarque era la llave. Lo trabajamos el jueves.', 'Sabíamos que sus centrales sufrían con los cambios de ritmo. Por eso {jug}.']
      ]
    },
    noSubs: {
      q: ['¿Por qué no hizo cambios yendo por detrás?', '¿No veía a nadie en el banquillo?', 'Cero cambios perdiendo. ¿Explicación?', '¿Se arrepiente de no haber movido el banquillo?'],
      o: [
        ['Confiaba en los que estaban dentro.', 'Creía en el once. Ciegamente.', 'Pensé que podían darle la vuelta ellos solos.', 'Les vi enchufados. No quise romper nada.'],
        ['Los de fuera no me convencían.', 'Lo que había en el banquillo no mejoraba lo de dentro.', 'Si hubiera visto los calentamientos, me entendería.', 'No tenía a nadie mejor. Es así.'],
        ['Me equivoqué. Tenía que haber movido el equipo antes.', 'Error mío. Los cambios tenían que haber llegado.', 'Me he quedado corto. Lo reconozco.', 'Me pasé de prudente. Fallo mío.'],
        ['El plan era aguantar y morder al final. No mordimos, y lo asumo.', 'Quería mantener la estructura. No salió.', 'Era una apuesta táctica. Esta vez no ha salido.']
      ]
    },
    tactic: {
      q: ['¿Por qué cambió el sistema?', '¿Qué buscaba con el cambio de dibujo?', 'Cambio táctico a mitad de partido. ¿Funcionó?', '¿Fue un plan B o el plan A desde el principio?'],
      o: [
        ['Buscaba dar un paso adelante, y el equipo lo ha entendido.', 'Quería más presencia en zonas clave. Ha funcionado a ratos.', 'Necesitábamos otro aire. Lo hemos buscado.', 'Lo vi claro desde la banda y lo cambiamos.'],
        ['Eso queda entre el equipo y yo.', 'Secreto de vestuario.', 'Lo sabremos los que tenemos que saberlo.', 'Si se lo cuento, se lo cuento también al próximo rival.'],
        ['No me hacían caso. Ahora sí.', 'Los jugadores no estaban cumpliendo. Había que cambiar.', 'Lo que pedía no se hacía. Fin.', 'El primer plan lo han ejecutado fatal.'],
        ['Nos encontraban entre líneas. Movimos dos piezas y se acabó.', 'Les vimos el truco y se lo desmontamos.', 'Leímos el partido y lo corregimos. El trabajo de la semana sirve para esto.']
      ]
    },
    comeback: {
      q: ['¿Qué pasó en el vestuario para remontar?', 'Remontada épica. ¿La clave?', '¿Cuándo supo que se podía remontar?', '¿Qué les dijo para darle la vuelta?'],
      o: [
        ['Que creyeran. Este equipo no se rinde jamás.', 'Que esto no se había acabado. Y no se había acabado.', 'Les dije: o nos dejamos la piel, o nos la dejan. Eligieron bien.', 'Fe. Mucha fe. Y algo de café.'],
        ['Dos ajustes y lo pillaron a la primera.', 'Retocamos la presión y lo demás salió solo.', 'Pequeños cambios, gran diferencia.', 'Una flecha en la pizarra y listo.'],
        ['Mejor no tener que remontar. Me salen canas.', 'No me gusta ir por detrás. Hay que corregirlo.', 'Que no se acostumbren a remontar, que me da algo.', 'Bonito, sí. Pero preferiría no sufrir tanto.'],
        ['Que el partido nos estaba esperando. Y fueron a por él.', 'Que todavía quedaba nuestra mejor versión. Y salió.', 'Que el miedo era del rival. Y se lo demostramos.']
      ]
    },
    lateWin: {
      q: ['Gol al final para ganar. ¿Cómo lo vivió?', '¿Ha sufrido mucho hasta el último minuto?', 'Victoria en el descuento. ¿Corazón o cabeza?', '¿Se esperaba ganarlo tan tarde?'],
      o: [
        ['Con el corazón en la boca. Esto es fútbol.', 'Casi me da algo. Pero ha merecido la pena.', 'He envejecido cinco años en un minuto.', 'He gritado tanto que mañana no tengo voz.'],
        ['Ya tocaba. Lo merecíamos desde hace rato.', 'Lo estábamos buscando todo el partido. Ha llegado.', 'Justicia poética. Tarde, pero justicia.', 'Llamábamos a la puerta y por fin nos abrieron.'],
        ['Suerte, hay que reconocerlo.', 'Hoy nos ha tocado la lotería.', 'Si te soy sincero, ha sido una moneda al aire.', 'Fortuna. No hay más.'],
        ['Este equipo cree hasta el final. Es su premio.', 'Cuando un equipo no se rinde, el fútbol le paga. Hoy ha pagado.', 'Ganar al final dice mucho del carácter de este vestuario.']
      ]
    },
    hat: {
      q: ['¿Qué techo tiene {jug}?', '¿Es {jug} el mejor de la liga ahora mismo?', '{jug} no para de marcar. ¿Cuál es el secreto?', '¿Ha nacido una estrella con {jug}?'],
      o: [
        ['El que él quiera. Tiene hambre y talento.', 'No tiene techo. Tiene ático con terraza.', 'Hasta donde le lleven las piernas, y le llevan lejos.', 'Ni él sabe dónde está su límite.'],
        ['Marca porque el equipo le da el balón donde le gusta.', 'Él la empuja, pero detrás hay diez currando.', 'Es el nombre en el marcador, pero el gol es de todos.', 'Cuando el equipo funciona, {jug} se pone las botas.'],
        ['Que no se relaje. Mañana se empieza de cero.', 'Que no se lo crea demasiado. Lo vigilaremos.', 'Bien, pero hay mucho que mejorar.', 'Contento con él, pero exigente. Como siempre.'],
        ['Está por encima de lo que vi cuando llegó. Y aún no ha tocado techo.', 'Cuando lo fichamos sabía que era bueno. No sabía que tanto.', 'Ha crecido una barbaridad. Y va a crecer más.']
      ]
    },
    star: {
      q: ['¿Qué le parece el partidazo de {jug}?', '¿{jug} es su mejor jugador ahora mismo?', '{jug} ha estado en todas. ¿Qué le ha dicho?', '¿Se le está quedando pequeño el equipo a {jug}?'],
      o: [
        ['{jug} es diferente. Juega a otro deporte.', '{jug} tiene algo que no se enseña.', 'Hoy {jug} ha jugado en modo leyenda.', 'Pocos jugadores hacen lo que hace {jug}.'],
        ['Mérito de todos. Uno solo no gana nada.', 'Un violín suena bonito, pero lo de hoy era una orquesta.', 'Brilla porque los demás le hacen brillar.', 'Destaca uno, gana el grupo.'],
        ['Le voy a exigir aún más.', 'A los buenos, más caña.', 'Puede dar todavía más. Y lo va a dar.', 'Que no se acomode. Le apretaré.'],
        ['{jug} hace mejores a los que tiene al lado. Eso es lo que más valoro.', 'Lo mejor de {jug} no son sus regates: es cómo levanta al grupo.', '{jug} es un líder sin necesidad de brazalete.']
      ]
    },
    kid: {
      q: ['¿Tendrá más minutos {jug}?', '{jug} ha estado muy bien. ¿Ha llegado su momento?', '¿Ha nacido una perla con {jug}?'],
      o: [
        ['Se lo ha ganado. Contará más.', 'Ha llamado a la puerta y se le ha abierto.', 'A partir de hoy, {jug} es una opción de verdad.', 'Se ha ganado más minutos a pulso.'],
        ['Poco a poco. Sin prisa.', 'Hay que cuidarle. A fuego lento.', 'Le daremos minutos sin quemarle.', 'Con calma. Tiene toda la carrera por delante.'],
        ['Aquí nadie tiene el puesto asegurado.', 'Que no se emocione. Un partido no es una carrera.', 'Bien, pero tiene que demostrar mucho más.', 'Ni uno bueno ni uno malo definen a nadie.']
      ]
    },
    clean: {
      q: ['Portería a cero. ¿Secreto?', '¿Está más orgulloso de la defensa que del ataque?', 'Ni un gol encajado. ¿Clave?'],
      o: [
        ['Defendemos todos, empezando por el nueve.', 'Aquí defiende hasta el utillero.', 'Esto es un trabajo coral. Once defensas.', 'La portería a cero empieza en el delantero.'],
        ['Hoy sí. Otros días hemos parecido un colador.', 'Bien hoy, pero no siempre.', 'Me alegra, pero no me fío.', 'Toca repetirlo. Una vez no es tendencia.'],
        ['El portero nos ha salvado. Los demás, regular.', 'Dad las gracias al portero.', 'Sin el portero, hoy hablábamos de otra cosa.', 'El portero ha parado hasta las malas decisiones.']
      ]
    }
  });
})();
