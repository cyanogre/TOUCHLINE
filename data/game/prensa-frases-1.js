/* TOUCHLINE — frases de la rueda de prensa (1/3): resultado y árbitro.
 * Por cada pregunta: q = otras formas de preguntarlo; o = variantes de cada respuesta, en el mismo orden que en
 * js/prensa.js (mismo tono y mismo efecto). Huecos: {rival} rival de hoy, {jug} jugador del que se habla,
 * {next} próximo rival, {gf}/{ga} goles a favor y en contra. */
(function () {
  const P = window.TL_PRENSA = window.TL_PRENSA || {};
  Object.assign(P, {
    win: {
      q: ['Victoria ante el {rival}. ¿Cómo se siente?', 'Tres puntos más. ¿Qué se lleva de hoy?', '¿Qué ha tenido este partido para llevárselo?', 'Han ganado al {rival}. ¿Esto era lo que buscaba?', 'Noche feliz. ¿Qué le ha gustado más?', '¿Se esperaba ganar así al {rival}?'],
      o: [
        ['El mérito es de ellos. Yo solo he elegido los conos.', 'Han corrido como si les persiguiera Hacienda. Todo suyo.', 'Hoy los once han sido el mejor. Así de claro.', 'Lo han dado todo. Yo me he limitado a no estorbar.', 'Les quiero. No lo digo mucho, pero hoy sí: les quiero.', 'Esto lo han ganado ellos en el campo. Yo, como mucho, en el autobús.', 'Que salgan ellos en la foto. Yo ya salgo demasiado.', 'Hoy han jugado con el corazón y un poquito con la cabeza. Perfecto.'],
        ['Bien, pero el lunes repasamos tres cosas que no me han gustado nada.', 'Ganar está bien. Ganar jugando mejor, mejor.', 'Me llevo los tres puntos y una libreta llena de deberes.', 'Contento a medias. Mi abuela diría que no me conformo con nada. Tiene razón.', 'Hemos ganado, pero con siete minutos de siesta en la segunda parte.', 'Ni tan mal. Pero tampoco tan bien.', 'Victoria sí, exhibición no. Seamos honestos.'],
        ['Hoy les hemos pasado por encima. Ni se han enterado.', 'El {rival} ha venido de excursión. Que vuelvan cuando quieran.', 'No había partido. Ha sido un entrenamiento con público.', 'Les hemos bailado. Literal, falta música.', 'Si esto es el {rival}, que suba de categoría Dios.', 'Diferencia abismal. Y aún nos hemos dejado cosas.', 'Hoy éramos Netflix y ellos la tele de los domingos.'],
        ['Este grupo tiene algo que no se compra. Y aún no habéis visto nada.', 'Lo bonito no es ganar: es ver cómo se miran entre ellos. Eso es un equipo.', 'Me emociono, perdonad. Con este grupo cualquier cosa es posible.', 'Hoy he visto a once tíos jugando para el de al lado. Eso vale más que los puntos.', 'Esto no es suerte: es un vestuario que se tiene fe. Y vamos a por todo.', 'Estoy orgulloso. Y cuando estoy orgulloso, soy peligroso.']
      ]
    },
    draw: {
      q: ['Empate con el {rival}. ¿Qué lectura hace?', 'Un punto. ¿Lo firma o le escuece?', 'Reparto de puntos. ¿Justo?', '¿Qué le ha faltado para ganar?', 'Ni pa ti ni pa mí. ¿Contento?', 'Empate. ¿Un paso adelante o atrás?'],
      o: [
        ['Hemos competido. En mayo este punto valdrá oro.', 'Un punto es un punto. Los pequeños también suman.', 'El equipo no se ha rendido. Me quedo con eso.', 'No hemos perdido, que ya es algo en este deporte tan raro.', 'Punto sumado y aprendizaje en la mochila.', 'Hoy tocaba no perder y no hemos perdido. Tick.', 'Me vale. No me encanta, pero me vale.'],
        ['Me escuece. Hemos regalado dos puntos con lazo.', 'Dos puntos que se nos escapan como el último Cercanías.', 'Sabe a poco. A muy poco.', 'Nos hemos dejado dos puntos por el camino. Duele.', 'Empate de los que te dejan mal cuerpo toda la noche.', 'Si hubiera sido una película, hoy la habríamos dejado a medias.'],
        ['El árbitro ha decidido que hoy no ganábamos y punto.', 'Ganamos en el campo y empatamos en el acta. Raro.', 'Nos han robado la cartera y encima nos piden propina.', 'Con otro árbitro estaríamos hablando de una victoria.', 'El VAR hoy estaba en modo avión.', 'Que alguien revise ese silbato, que pita solo para un lado.'],
        ['Sabe a poco y eso es lo mejor: hace un año esto nos habría sabido a gloria.', 'Que un empate nos sepa a poco dice mucho de lo que estamos construyendo.', 'Hemos jugado para ganar. El resultado no, pero el camino sí.', 'El fútbol ha sido nuestro. El marcador, de momento, no. Ya llegará.', 'Si jugamos así, los empates se convertirán en victorias. Matemáticas básicas.']
      ]
    },
    loss: {
      q: ['Derrota {ga}-{gf}. ¿Qué ha pasado?', '¿Dónde se ha escapado el partido?', 'Han perdido. ¿Explicación?', '¿Qué le dice al aficionado que se va triste a casa?', 'Mal día. ¿Por qué?', 'Derrota ante el {rival}. ¿Autocrítica?'],
      o: [
        ['La culpa es mía. Ellos lo han dado todo.', 'Firmo yo el error. A los jugadores, ni una palabra.', 'Me he equivocado en el planteamiento. Lo asumo.', 'Señálenme a mí. Ellos han sudado la camiseta.', 'Si hay que repartir culpas, me pido el trozo más grande.', 'Hoy he perdido yo. El equipo ha competido.'],
        ['Algunos hoy han venido de turismo.', 'Hay gente que tiene que mirarse al espejo esta noche.', 'Lo hablaremos dentro, y no va a ser una charla bonita.', 'Unos pocos no han estado. Y se ha notado mucho.', 'Hay jugadores que jugaban con el freno de mano puesto.', 'Alguno pensaba más en su Instagram que en el balón.'],
        ['Día malo. Pasa. A otra cosa.', 'No ha salido nada. Ni el café de la mañana.', 'Hoy los astros no estaban alineados. Mañana, a entrenar.', 'Hay días así. Este era uno de ellos.', 'Toca tragar y levantarse. Como siempre.', 'Ha sido un mal día en la oficina. Mañana, otra vez.'],
        ['Fallamos en tres detalles concretos. Los tengo apuntados y el martes los corregimos.', 'El partido se nos fue en las transiciones. Sé exactamente qué cambiar.', 'Perdimos la segunda jugada. Eso se entrena, y lo vamos a entrenar.', 'He visto dónde nos han hecho daño. Esta semana lo cerramos.', 'Tengo el diagnóstico. Ahora toca el tratamiento: trabajo.']
      ]
    },
    thrash: {
      q: ['{ga}-{gf}. ¿Ha sido una humillación?', '¿Qué le ha pasado hoy al equipo?', 'Goleada en contra. ¿Cómo se digiere esto?', '¿Se ha sentido desbordado en la banda?', 'Noche negra. ¿Algo que decir?', '¿Teme por su puesto tras este resultado?'],
      o: [
        ['Pido perdón a la afición. Esto no se repite.', 'A quien ha pagado entrada hoy: lo siento de verdad.', 'Merecen una disculpa y se la doy. Daremos la cara.', 'Lo siento por la gente. Somos los primeros avergonzados.', 'Hoy no hay excusas. Solo perdón y trabajo.', 'La afición no se merece esto. Lo arreglaremos.'],
        ['A algunos hoy la camiseta les pesaba demasiado.', 'Hay jugadores que no merecen este escudo. Así de claro.', 'Habrá cambios. Y algunos no los van a ver venir.', 'He visto gente que se escondía. Eso no lo perdono.', 'Hoy he descubierto quién está y quién no.', 'Unos cuantos van a ver los próximos partidos desde la grada.'],
        ['Un mal día lo tiene cualquiera. No voy a hacer un drama.', 'Es fútbol, no una tragedia griega.', 'Tranquilidad. Es solo un partido.', 'No pasa nada. El domingo hay otro.', 'Ha sido un accidente. Seguimos.', 'Fallo puntual. No hay que volverse locos.'],
        ['Esto duele, y tiene que doler. Mañana a las ocho estamos todos aquí.', 'Hoy tocamos fondo. Desde el fondo solo se puede subir.', 'Quiero que esto les quite el sueño. A mí ya me lo ha quitado.', 'De estas noches salen los equipos de verdad. Ya veréis.', 'Esto se recuerda para no repetirlo jamás. Y no se repetirá.']
      ]
    },
    protest: {
      q: ['¿Qué le decía tanto al cuarto árbitro?', 'Le hemos visto protestar mucho. ¿Qué pasó?', '¿Por qué tanta bronca en la banda?', '¿Se ha pasado protestando hoy?', '¿Tenía razón en sus quejas al árbitro?'],
      o: [
        ['Pongan la repetición y me cuentan.', 'Tenía razón y lo sabe hasta su madre.', 'Las imágenes hablan solas. Yo solo las he leído antes.', 'He protestado lo justo. Y la tele me da la razón.', 'Si me equivoco, me disculpo. Hoy no me equivocaba.'],
        ['Me he calentado. No estuvo bien.', 'Me he pasado de revoluciones. Perdón al cuarto árbitro.', 'Lo reconozco: no era mi mejor versión.', 'Me he dejado llevar. A veces el corazón va más rápido que la cabeza.', 'He sido un poco intenso. Un poco mucho.'],
        ['Si quieren un entrenador que no proteste, que fichen a un NPC.', 'La pasión no se apaga. Ni quiero.', 'Yo soy así. Lo toman o lo dejan.', 'Protestar es parte de mi ADN, como el sofrito.', 'Que me multen si quieren. Lo volveré a hacer.'],
        ['Hablé con respeto. Discrepar no es faltar.', 'Le dije lo que pensaba, con educación y de usted.', 'Fue una charla civilizada. Casi tomamos un café.', 'Expliqué mi punto de vista sin una mala palabra.', 'Tengo una buena relación con los árbitros. Hoy también.']
      ]
    },
    coachRed: {
      q: ['¿Por qué le han expulsado?', '¿Qué ha dicho para acabar en la grada?', '¿Se arrepiente de su expulsión?', '¿Cómo ha vivido la segunda parte desde arriba?', 'Expulsado. ¿Merecido?'],
      o: [
        ['Me equivoqué. Pido disculpas.', 'Mi culpa. No volverá a pasar.', 'Me he pasado. Lo siento por el equipo.', 'He dado mal ejemplo. Me toca disculparme.', 'Fue un error mío. Punto.'],
        ['Volvería a hacerlo. Defiendo a los míos.', 'Desde la grada se ve todo más claro. Y sigo pensando lo mismo.', 'Si hay que acabar en la grada por defender al equipo, se acaba.', 'Me han echado por decir la verdad. Me pasa mucho.', 'Lo haría mil veces más.'],
        ['Sin comentarios.', 'Next.', 'De eso no voy a hablar hoy.', 'Pregúntenle al árbitro.', 'Lo que pasó en la banda se queda en la banda.'],
        ['Me equivoqué yo, no el equipo. Llamaré al árbitro para aclararlo.', 'Error mío. Esta semana hablo con el colegiado como dos adultos.', 'Pediré disculpas personalmente al árbitro. Así se hacen las cosas.', 'Asumo la sanción y aprendo. El equipo no tiene la culpa.']
      ]
    },
    refNoProtest: {
      q: ['Hubo una jugada muy polémica en su contra y usted no dijo nada. ¿Por qué?', '¿No vio la jugada polémica?', 'Todo el estadio protestaba menos usted. ¿Cómo es eso?', '¿Le ha molestado el arbitraje?'],
      o: [
        ['De árbitros no hablo.', 'Hoy no toca hablar del árbitro.', 'Prefiero no entrar en eso.', 'El árbitro tiene su trabajo y yo el mío.', 'Paso palabra.'],
        ['Nos han perjudicado claramente. Así es imposible.', 'Nos han robado y todo el mundo lo ha visto.', 'Esto ya no es casualidad. Siempre nos toca a nosotros.', 'Me callo porque si hablo me cae un mes.', 'Esa jugada la ve mi abuela desde el sofá.'],
        ['Los árbitros también fallan. Mi energía, para mi equipo.', 'Mi tiempo es para mis jugadores, no para el silbato.', 'Prefiero gastar la voz en animar a los míos.', 'No gano nada protestando. Gano entrenando.', 'Si me quejo, pierdo el foco. Y el foco es ganar.'],
        ['Lo veré con calma y, si hay que decir algo, lo dirá el club por los cauces.', 'El club tiene sus vías. Las usaremos si hace falta.', 'Haremos llegar nuestras dudas por donde toca, con respeto.', 'No es momento de calentar. Lo analizaremos en frío.']
      ]
    }
  });
})();
