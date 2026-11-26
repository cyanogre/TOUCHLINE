/* TOUCHLINE — frases de la rueda de prensa (5): más respuestas para lo que pasa en el partido y en el club. */
(function () {
  const P = window.TL_PRENSA = window.TL_PRENSA || {};
  const add = (id, k, arr) => { const e = P[id] || (P[id] = { q: [], o: [] }); (e.o[k] || (e.o[k] = [])).push(...arr); };
  const addQ = (id, arr) => { const e = P[id] || (P[id] = { q: [], o: [] }); e.q.push(...arr); };

  addQ('protest', ['¿Le ha faltado al respeto al árbitro?', 'Su enfado en la banda ha dado la vuelta a las redes. ¿Lo ha visto?', '¿Qué jugada le hizo saltar?']);
  add('protest', 0, ['Tenía razón. La tele lo dice y yo lo repito.', 'Si me la volviera a encontrar, protestaría igual. Era clarísima.', 'Que me enseñen el ángulo en el que no era. Espero sentado.', 'Lo vi en directo y lo he vuelto a ver. Sigo teniendo razón.', 'Cuando tienes razón, levantas la voz. Educadamente, pero la levantas.']);
  add('protest', 1, ['Me he pasado de frenada. Disculpas.', 'No me reconozco en las imágenes. Toca calmarse.', 'Hoy he sido más hincha que entrenador.', 'Me ha podido el momento. Lo siento.', 'Ese no soy yo. O sí, pero no me gusta.']);
  add('protest', 2, ['Mi sangre es caliente. Es lo que hay.', 'Prefiero pasarme que quedarme corto.', 'Así entreno y así vivo.', 'Me han hecho así. Y me gusta.', 'Que me pongan un bozal si quieren.']);
  add('protest', 3, ['Con el cuarto árbitro tengo buena relación. Hoy hemos discrepado, nada más.', 'Pregunté con calma. La respuesta no me convenció, pero lo dejé ahí.', 'Expresé mi desacuerdo sin perder las formas.', 'Mi tono fue correcto. Mi cara quizá no tanto.']);

  add('coachRed', 0, ['He perdido los papeles. Disculpas a todos.', 'No es el ejemplo que quiero dar a los niños que me ven.', 'Me arrepiento. Mucho.', 'Hoy me sobró una frase. Y la he pagado.']);
  add('coachRed', 1, ['Que me echen mil veces. No voy a callarme ante una injusticia.', 'Lo que dije lo mantengo.', 'Me echaron por decir lo que todo el estadio pensaba.', 'Defender a mis jugadores no tiene precio. Ni sanción.']);
  add('coachRed', 2, ['Sin declaraciones.', 'Siguiente tema.', 'Eso ya lo ha visto todo el mundo.', 'No tengo nada más que añadir.']);
  add('coachRed', 3, ['Mi error no puede pagarlo el equipo. Hablaré con quien haga falta.', 'Asumo la sanción. Y aprenderé de ella.', 'Hoy me ha fallado el autocontrol. Trabajaré en ello.']);

  add('refNoProtest', 0, ['No voy a ser yo quien hable del colegiado.', 'Al árbitro, ni mencionarlo.', 'Sin comentarios sobre eso.', 'No es mi tema.']);
  add('refNoProtest', 1, ['Esto es un escándalo y lo sabe todo el mundo.', 'Nos están quitando puntos semana tras semana.', 'Ya no sé qué más tiene que pasar.', 'Hoy era penalti como una casa. Como un chalet.']);
  add('refNoProtest', 2, ['Mi energía va a mis jugadores. El resto, ruido.', 'No controlo al árbitro. Controlo a mi equipo.', 'Un error arbitral no me va a sacar del partido.', 'Prefiero corregir lo mío que quejarme de lo ajeno.']);
  add('refNoProtest', 3, ['El club hará lo que tenga que hacer, con elegancia.', 'Hay mecanismos para esto y confiamos en ellos.', 'Lo trasladaremos por la vía correcta.']);

  add('lateLost', 0, ['Tenía que haber cerrado el partido con un cambio defensivo. No lo hice.', 'Esto se me ha ido a mí.', 'El final era mío y lo he gestionado fatal.', 'Mala lectura del entrenador. Así de sencillo.']);
  add('lateLost', 1, ['Algunos ya estaban celebrando antes de tiempo.', 'Hay quien se ha relajado y lo hemos pagado.', 'Al final se nos ha apagado la luz a varios.', 'Concentración de pez. Así no.']);
  add('lateLost', 2, ['El fútbol tiene estas cosas.', 'Ha sido cruel, pero es el juego.', 'Hoy el destino jugaba con ellos.', 'Se nos ha escapado de las manos. Pasa.']);
  add('lateLost', 3, ['Vamos a entrenar escenarios de final de partido. Desde el martes.', 'Hay que aprender a jugar los minutos finales. Lo haremos.', 'Nos falta colmillo para cerrar. Lo vamos a afilar.']);

  add('penMiss', 0, ['El próximo lo tira él. Y lo mete.', 'Mi confianza en él no se mueve un milímetro.', 'Quien da un paso adelante merece mi apoyo.', 'Sin miedo. El lanzador sigue siendo él.']);
  add('penMiss', 1, ['Revisaremos la lista de lanzadores.', 'Quizá rotemos un poco.', 'Hay varios que los tiran muy bien en los entrenos.', 'Lo veremos durante la semana.']);
  add('penMiss', 2, ['Eso tiene que entrar sí o sí.', 'Fallar así es imperdonable.', 'Ese penalti nos ha costado el partido.', 'Se ha puesto nervioso y lo ha pagado el equipo.']);
  add('penMiss', 3, ['Fallar un penalti forma parte del camino de los grandes. {jug} es de los grandes.', 'Mañana estará practicando más que nadie. Lo conozco.', 'Le sobra personalidad. El próximo, a la escuadra.']);

  add('og', 0, ['Abrazo grande para {jug}. Está con nosotros.', 'Nadie le va a señalar aquí dentro.', 'Hoy le toca a él, otro día a otro.', 'Un mal bote y mala suerte. Fin.']);
  add('og', 1, ['Hay que despejar mejor.', 'Ahí tiene que estar más fino.', 'Un error que no se puede cometer.', 'Le ha pillado mal colocado.']);
  add('og', 2, ['No voy a analizar acciones aisladas.', 'Eso se queda dentro.', 'No es momento de hablar de eso.', 'Hablamos del equipo, no de jugadas sueltas.']);

  add('bigMiss', 0, ['Generar es lo difícil. Marcar vendrá.', 'Hoy no entraba ni empujándola. Otro día entrarán todas.', 'Con estas ocasiones, la mayoría de días ganamos.', 'Estoy tranquilo con lo que creamos.']);
  add('bigMiss', 1, ['Hay que tener más colmillo.', 'Así es imposible ganar.', 'Hoy hemos perdonado demasiado.', 'Nos ha faltado pegada. Mucha.']);
  add('bigMiss', 2, ['Los de arriba se lo tienen que hacer mirar.', 'Ocasiones así se meten en categorías inferiores.', 'Hoy los delanteros han jugado al golf.', 'Si no metes, no juegas. Así funciona.']);
  add('bigMiss', 3, ['La estructura funciona. El acierto llegará con repetición.', 'Vamos a trabajar el último pase y la definición, pero sin dramas.', 'Lo importante es llegar. Y llegamos muchísimo.']);

  add('red', 0, ['Se ha equivocado y lo sabe. Aprenderá.', 'Un error de juventud. Se corrige.', 'Ha pedido perdón al grupo. Con eso me vale.', 'Lo asume y el vestuario le apoya.']);
  add('red', 1, ['Es una tarjeta muy severa.', 'Yo no la veo ni con lupa.', 'Ha sido una decisión desproporcionada.', 'Con ese criterio no acaba nadie el partido.']);
  add('red', 2, ['Nos ha condenado.', 'Ha hecho daño al equipo, y lo sabe.', 'Hay que tener la cabeza fría. Hoy no la ha tenido.', 'Hablaré con él muy seriamente.']);
  add('red', 3, ['Fuera le arropo, dentro le exijo. Así funciona esta familia.', 'Le defenderé públicamente y le apretaré en privado. Las dos cosas.', 'Aquí dentro nos decimos las cosas a la cara. Y luego nos abrazamos.']);

  add('subGoal', 0, ['Ha salido a comerse el mundo y se lo ha comido.', 'El gol es de {jug}. Yo solo le he abierto la puerta.', 'Gran actitud de {jug}. Ese es el camino.', '{jug} estaba esperando su momento. Y ha llegado.']);
  add('subGoal', 1, ['Soy un genio, qué quieren que les diga.', 'Me lo esperaba. Ojo clínico.', 'Para eso estoy en la banda.', 'Cambio de entrenador top. Modestia cero.']);
  add('subGoal', 2, ['Esta vez ha salido bien.', 'Hay días que aciertas.', 'Suerte de principiante, no sé.', 'Unas veces sí y otras no.']);
  add('subGoal', 3, ['El rival se iba a cansar y {jug} es puro aire fresco. Era el plan.', 'Necesitábamos velocidad al espacio y {jug} es eso.', 'Lo hablamos en el descanso: entra {jug} y atacamos la espalda.']);

  add('noSubs', 0, ['Los once de dentro estaban bien. Pensé que lo darían la vuelta.', 'Confianza total en los titulares.', 'No vi la necesidad de cambiar.', 'Estaban enchufados. Era su partido.']);
  add('noSubs', 1, ['El banquillo no me daba garantías.', 'No había nada mejor fuera.', 'Los de fuera no están para jugar.', 'Para empeorar, mejor no tocar.']);
  add('noSubs', 2, ['Tenía que haber movido el banquillo. Me equivoqué.', 'Llegué tarde. Fallo mío.', 'Me ha faltado valentía con los cambios.', 'Error de cálculo del entrenador.']);
  add('noSubs', 3, ['Mantener la estructura era la idea. Esta vez no salió.', 'Decidí no desordenar al equipo. Asumo el resultado.', 'Era una apuesta por la paciencia. No ha salido.']);

  add('tactic', 0, ['Queríamos más balón y lo hemos tenido.', 'Ha sido para ganar un hombre en el centro.', 'Buscábamos más amplitud. Ha salido bien.', 'Hemos ajustado la presión y se ha notado.']);
  add('tactic', 1, ['Secreto profesional.', 'Eso se queda en mi pizarra.', 'No voy a dar pistas al siguiente rival.', 'Lo que pasa en el vestuario, se queda en el vestuario.']);
  add('tactic', 2, ['No estaban haciendo lo que les pedí.', 'El primer plan no se ha ejecutado bien. Por eso.', 'Había que despertarlos. Así de claro.', 'Han tardado en entender lo que quería.']);
  add('tactic', 3, ['Nos atacaban por dentro. Cerramos el embudo y se acabó.', 'Vimos que su pivote estaba solo. Le pusimos compañía.', 'Ajustamos alturas y ganamos la segunda jugada.']);

  add('comeback', 0, ['Les dije que esto era nuestro. Y lo hicieron suyo.', 'Que el escudo pesa, pero también empuja.', 'Que creyeran en el de al lado. Y creyeron.', 'Que se miraran a los ojos. Ahí estaba la respuesta.']);
  add('comeback', 1, ['Cambiamos la altura de la presión y todo cambió.', 'Ajuste sencillo y efectivo.', 'Un pequeño retoque táctico.', 'Movimos dos piezas y el tablero cambió.']);
  add('comeback', 2, ['No me gusta sufrir tanto.', 'Que no lo conviertan en costumbre.', 'Ojalá no tengamos que remontar más.', 'Prefiero ganar de inicio, sinceramente.']);
  add('comeback', 3, ['Este partido ya es historia del club. Y ellos lo han escrito.', 'Hoy han demostrado quiénes son. Y son mucho.', 'Remontar así solo lo hacen los equipos que creen.']);

  add('lateWin', 0, ['Casi me da un infarto. Me lo ha curado el gol.', 'No me queda uña.', 'He saltado más que en mi boda.', 'Corazón a mil. Literal.']);
  add('lateWin', 1, ['Era cuestión de tiempo.', 'Lo hemos buscado y lo hemos encontrado.', 'Merecido, aunque tarde.', 'El premio a la insistencia.']);
  add('lateWin', 2, ['Ha caído de rebote.', 'A veces el fútbol te sonríe sin motivo.', 'Ha sido fortuna, la verdad.', 'Nos ha mirado la suerte.']);
  add('lateWin', 3, ['Esto es carácter. Y el carácter se entrena.', 'Ganar al final es cosa de equipos con fe.', 'Hasta el último segundo. Así somos.']);

  add('hat', 0, ['Tiene un hambre que asusta.', 'Si sigue así, va a hacer historia.', 'Está en estado de gracia.', 'Es un depredador del área.']);
  add('hat', 1, ['Marca porque detrás hay un equipo que le sirve.', 'Es mérito colectivo, aunque él lo remate.', 'Sus goles son de todos.', 'El equipo le hace brillar.']);
  add('hat', 2, ['Que mañana vuelva a entrenar como si no hubiera marcado.', 'Que no se le suba a la cabeza.', 'Bien, pero puede más.', 'Le exigiré igual o más.']);
  add('hat', 3, ['Cuando llegó, intuía su potencial. Hoy lo veo entero.', 'Ha dado un salto brutal. Y le queda otro.', 'Lo que está haciendo no es casualidad. Es trabajo.']);

  add('star', 0, ['Es especial. Se nota en cada toque.', 'Juega a otra velocidad.', 'Hoy ha estado en modo dios.', 'Tiene magia en las botas.']);
  add('star', 1, ['Gana el equipo, no uno.', 'Destaca porque el resto trabaja para que destaque.', 'El mérito es coral.', 'Uno solo no gana partidos. Once, sí.']);
  add('star', 2, ['Le pediré más todavía.', 'Puede mejorar. Y mucho.', 'Que no se acomode.', 'Exigencia máxima con los buenos.']);
  add('star', 3, ['Lo que más me gusta de {jug} es que juega para los demás.', '{jug} contagia. Eso no tiene precio.', 'Cuando {jug} está bien, el grupo vuela.']);

  add('kid', 0, ['Ha llegado para quedarse.', 'Se lo ha ganado a pulso.', 'El futuro ya está aquí.', 'Tendrá su sitio.']);
  add('kid', 1, ['Paso a paso. Sin presión.', 'Hay que protegerle.', 'No le vamos a quemar.', 'Despacito y con buena letra.']);
  add('kid', 2, ['Tiene que demostrar mucho más.', 'Un partido no hace a un jugador.', 'Que no se lo crea.', 'Aquí se gana el puesto cada día.']);

  add('clean', 0, ['La defensa es cosa de todos.', 'Hoy todos han defendido como si les fuera la vida.', 'Orden y sacrificio. Así de simple.', 'Defender bien es nuestra primera arma.']);
  add('clean', 1, ['Bien, pero hay que mantenerlo.', 'Un buen paso. Falta repetirlo.', 'Me gusta, pero no me relajo.', 'Ojalá sea tendencia.']);
  add('clean', 2, ['Sin el portero no lo contamos.', 'El portero ha hecho magia. Los demás, poca.', 'Gracias al portero. Y punto.', 'Hoy el portero ha sido un muro. Los demás, papel.']);

  add('crowd', 0, ['Rechazo total.', 'No hay sitio para eso en un estadio.', 'Eso no es ser aficionado.', 'Lo condeno sin matices.']);
  add('crowd', 1, ['Nuestra afición es ejemplar. Unos pocos no la representan.', 'La inmensa mayoría ha sido maravillosa.', 'No vamos a manchar a todos por unos pocos.', 'La grada ha estado de diez. Salvo cuatro.']);
  add('crowd', 2, ['El club sabrá qué hacer.', 'Hay gente encargada de eso.', 'Yo me centro en el fútbol.', 'Eso lo gestiona seguridad.']);
  add('crowd', 3, ['Pido a nuestra gente que siga siendo la mejor. Y la más limpia.', 'Nuestra grada es un orgullo. Cuidémosla entre todos.', 'Cada aficionado es embajador del club. Que se note.']);

  add('inj', 0, ['Ojalá no sea grave.', 'Estamos pendientes de las pruebas.', 'Mañana sabremos más.', 'Toca esperar.']);
  add('inj', 1, ['Sería una pérdida enorme.', 'Es muy importante para nosotros.', 'Le vamos a echar de menos.', 'Una baja que duele.']);
  add('inj', 2, ['Tenemos recambios.', 'El que entre lo hará igual de bien.', 'La plantilla está preparada.', 'Aquí nadie es imprescindible.']);
  add('inj', 3, ['Le cuidaremos como se merece. Volverá mejor.', 'Tiene a los mejores fisios. Estará de vuelta pronto.', 'Paciencia y cariño. Volverá.']);

  add('signing', 0, ['Nos va a dar mucho.', 'Es justo el perfil que buscábamos.', 'Ya se ve su calidad.', 'Aporta experiencia y talento.']);
  add('signing', 1, ['Con él somos candidatos a todo.', 'Llega para marcar diferencias.', 'Es un fichaje para soñar.', 'Nos sube el nivel de golpe.']);
  add('signing', 2, ['Tendrá que ganarse el sitio.', 'Aún tiene que demostrar.', 'Ya veremos qué tal se adapta.', 'Firmar no es jugar.']);
  add('signing', 3, ['Lo estudiamos durante meses. Encaja como un guante.', 'Era nuestro objetivo prioritario. Y aquí está.', 'Su perfil es exactamente lo que el equipo pedía.']);

  add('sale', 0, ['Le deseo lo mejor. Siempre será de la casa.', 'Gracias por todo. Que le vaya genial.', 'Se va por la puerta grande.', 'Ha sido un placer entrenarle.']);
  add('sale', 1, ['Eso lo decide el club.', 'Yo no llevo las cuentas.', 'No es cosa mía.', 'Pregunten en los despachos.']);
  add('sale', 2, ['Quería irse.', 'Ya no tenía la cabeza aquí.', 'Si alguien no quiere estar, mejor que se vaya.', 'No era feliz.']);
  add('sale', 3, ['Es una venta inteligente. El proyecto sale ganando.', 'Con ese dinero reforzaremos el equipo.', 'Vender bien también es ganar.']);

  add('staff', 0, ['Viene a sumar y a enseñarnos.', 'Un profesional enorme.', 'Nos hará mejores a todos.', 'Es de lo mejor en su campo.']);
  add('staff', 1, ['Lo de antes no funcionaba.', 'Había que cambiar.', 'Necesitábamos un salto de calidad.', 'El anterior no estaba al nivel.']);
  add('staff', 2, ['Un fichaje más.', 'Viene a trabajar.', 'Buen tipo.', 'Nada más que añadir.']);

  add('sponsorR', 0, ['Escucho a la afición. Siempre.', 'Entiendo el malestar.', 'Es un tema que hay que tratar con respeto.', 'La gente tiene derecho a quejarse.']);
  add('sponsorR', 1, ['El dinero nos hace competitivos.', 'Es la realidad económica.', 'Sin ingresos, no hay equipo.', 'El fútbol cuesta dinero.']);
  add('sponsorR', 2, ['No sé ni quiénes son.', 'No me meto en eso.', 'Paso.', 'Eso no es asunto mío.']);
  add('sponsorR', 3, ['Ese dinero tiene que volver a la gente: cantera, estadio, barrio.', 'Me aseguraré de que ese dinero se invierta en lo que importa.']);

  add('sponsor', 0, ['Un paso más para el club.', 'Noticia excelente.', 'El club crece y nosotros con él.', 'Muy contentos.']);
  add('sponsor', 1, ['Vendrá bien.', 'Más medios para trabajar.', 'Ayuda siempre.', 'Bienvenido sea.']);
  add('sponsor', 2, ['No tengo ni idea de marcas.', 'Eso es de los despachos.', 'Yo de esto no sé.', 'Ni lo sabía.']);
  add('sponsor', 3, ['Que marcas así confíen en nosotros es la prueba de que el proyecto va en serio.', 'Es un reconocimiento al trabajo de todo el club.']);

  add('campaign', 0, ['Me encanta. El club tiene que estar con su gente.', 'Todo lo que sea acercarnos, sí.', 'Una idea genial.', 'Apoyo total.']);
  add('campaign', 1, ['Si ayuda, perfecto.', 'Si llena el estadio, genial.', 'No está mal.', 'Bien.']);
  add('campaign', 2, ['Mi campaña es el césped.', 'Eso no gana partidos.', 'Me centro en lo mío.', 'No me interesa.']);

  add('bolt', 0, ['Todo el club está con {jug}. Todo lo demás sobra.', 'Le mandamos toda la fuerza del mundo.', 'Hoy solo importa {jug}.', 'Nuestro corazón está con él.']);
  add('bolt', 1, ['Hoy no puedo hablar de fútbol.', 'Disculpen, no tengo cuerpo.', 'Es un día muy duro.', 'Prefiero no hablar del partido.']);
  add('bolt', 2, ['Hay que seguir adelante.', 'El fútbol continúa.', 'El domingo volvemos.', 'Es nuestro trabajo.']);
})();
