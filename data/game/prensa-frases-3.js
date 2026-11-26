/* TOUCHLINE — frases de la rueda de prensa (3/3): lo inesperado, el club y el cierre. */
(function () {
  const P = window.TL_PRENSA = window.TL_PRENSA || {};
  Object.assign(P, {
    bolt: {
      q: ['¿Cómo está el vestuario tras lo de {jug}?', '¿Qué mensaje manda a {jug} y a su familia?', 'Hoy el resultado parece lo de menos. ¿Cómo se siente?'],
      o: [
        ['Hoy el fútbol no importa. Estamos con {jug} y su familia.', 'Todo el club está con {jug}. Lo demás da igual.', 'Lo único que quiero oír esta noche es que {jug} está bien.', 'Mi cabeza está en el hospital, no en el marcador.'],
        ['Perdonen, hoy no puedo hablar de fútbol.', 'No tengo palabras. Disculpen.', 'Hoy no es día de análisis.', 'Me cuesta hablar. Lo entenderán.'],
        ['La temporada sigue. Hay que continuar.', 'El calendario no espera a nadie.', 'Duele, pero el domingo hay que jugar.', 'Toca seguir. Es nuestra profesión.']
      ]
    },
    crowd: {
      q: ['¿Qué le ha parecido lo de la grada?', '¿Condena lo ocurrido en las gradas?', '¿Ha afectado al equipo lo que ha pasado en la grada?', '¿Algo que decir a los aficionados implicados?'],
      o: [
        ['Eso no es fútbol. Lo condeno.', 'Quien venga a eso, que se quede en casa.', 'No representa a este club. Punto.', 'Tolerancia cero. Así de claro.'],
        ['Hecho aislado. Nuestra afición es ejemplar.', 'Cuatro personas no son una afición.', 'No voy a manchar a miles por unos pocos.', 'Nuestra grada es de las mejores. Hoy también.'],
        ['De eso se encarga el club.', 'Hay gente para gestionar eso. Yo entreno.', 'El club tomará medidas.', 'No me corresponde a mí.'],
        ['La grada es lo mejor que tenemos. Que la cuidemos todos, como se cuida el escudo.', 'Pido a nuestra gente que siga siendo ejemplar. Lo es casi siempre.', 'Nuestra afición nos da la vida. Por eso le pido que proteja el estadio.']
      ]
    },
    inj: {
      q: ['¿Cómo está {jug}?', '¿Es grave lo de {jug}?', '¿Cuánto tiempo estará fuera {jug}?', '¿Les preocupa la lesión de {jug}?'],
      o: [
        ['Esperamos que no sea nada. Mañana, pruebas.', 'Crucemos los dedos.', 'Hasta las pruebas no sabremos nada.', 'Ojalá sea un susto.'],
        ['Le echaremos mucho de menos.', 'Si es grave, perdemos una pieza clave.', 'Sería una baja muy sensible.', 'Nos quita mucho.'],
        ['Tenemos plantilla para cubrir cualquier baja.', 'Aquí nadie es imprescindible.', 'El que entre lo hará bien.', 'Para eso tenemos veinticinco.'],
        ['Está en las mejores manos. Volverá más fuerte.', 'Los fisios ya están con él. Le esperaremos lo que haga falta.', 'Tenemos el mejor cuerpo médico. Volverá como un tiro.']
      ]
    },
    signing: {
      q: ['¿Qué aporta {jug}?', '¿Por qué {jug}?', '¿Está contento con el fichaje de {jug}?', '{jug} ya está aquí. ¿Qué espera de él?'],
      o: [
        ['Carácter y calidad. Ya se ha visto.', 'Lo que necesitábamos. Ni más ni menos.', 'Nos da cosas que no teníamos.', 'Le daremos su tiempo, pero promete mucho.'],
        ['Con él peleamos por todo.', 'Es el fichaje que nos faltaba para soñar.', 'Llega para cambiar la temporada.', 'Con {jug} somos otro equipo.'],
        ['Que lo demuestre. Aquí nadie regala nada.', 'Firmar es fácil. Ahora, que se lo curre.', 'Ya veremos. Aún no ha hecho nada.', 'Que se gane el sitio como todos.'],
        ['Lo seguíamos desde hace meses. Encaja en lo que queremos ser.', 'Era nuestra prioridad. Hemos ido a por él y aquí está.', 'Lo estudiamos a fondo. Es exactamente el perfil que buscábamos.']
      ]
    },
    sale: {
      q: ['¿Por qué se ha ido {jug}?', '¿Le ha dolido la salida de {jug}?', '¿Era necesaria la venta de {jug}?', '¿Quién sustituirá a {jug}?'],
      o: [
        ['Buena operación para todos. Le deseo lo mejor.', 'Se va un amigo. Que le vaya genial, menos contra nosotros.', 'Ha sido una salida limpia. Gracias por todo.', 'Le echaremos de menos, pero es lo mejor.'],
        ['Decisión del club. Yo entreno.', 'Pregunten arriba.', 'Yo no hago las cuentas.', 'Eso lo decide la dirección deportiva.'],
        ['No era feliz. Mejor así.', 'Tenía la cabeza en otro sitio.', 'Cuando alguien quiere irse, hay que dejarle.', 'Ya tenía la maleta hecha.'],
        ['Con ese dinero el club respira. Y el que llegue tendrá su oportunidad.', 'Era una oportunidad de mercado. El proyecto sale reforzado.', 'Vender bien también es ganar. Y hemos vendido muy bien.']
      ]
    },
    staff: {
      q: ['¿Por qué ha fichado a {staff}?', '¿Qué aporta {staff} al cuerpo técnico?', 'Nuevo miembro en el staff. ¿Necesario?'],
      o: [
        ['Suma muchísimo. Aprenderemos todos.', 'Es de los mejores en lo suyo.', 'Viene a hacernos mejores a todos.', 'Tiene conocimientos que nos faltaban.'],
        ['El anterior no estaba al nivel.', 'Había que cambiar. No funcionaba.', 'Necesitábamos un cambio urgente.', 'Lo de antes no servía.'],
        ['Buen profesional. Nada más.', 'Viene a trabajar. Ya está.', 'Un fichaje más.', 'Es uno más del equipo.']
      ]
    },
    sponsorR: {
      q: ['¿Qué opina del nuevo patrocinador, {brand}, tan criticado?', 'La afición protesta por {brand}. ¿Su opinión?', '¿Le incomoda llevar a {brand} en la camiseta?'],
      o: [
        ['Entiendo a la afición. Respeto las decisiones del club.', 'Comprendo el enfado. Yo pongo el once, no el logo.', 'Escucho a la gente. Y respeto al club.', 'Es un tema delicado. Lo entiendo.'],
        ['Con ese dinero competimos. Es lo que hay.', 'Las nóminas no se pagan con poesía.', 'Es la realidad del fútbol moderno.', 'Sin dinero no hay fichajes.'],
        ['No me interesan esos temas.', 'Ni sé lo que venden.', 'Paso de esas cosas.', 'Yo solo veo el balón.'],
        ['Ese dinero irá a la cantera y al estadio. Doy mi palabra.', 'Me comprometo a que ese dinero se note donde importa: en los chavales.', 'Vigilaré personalmente que ese dinero revierta en el club.']
      ]
    },
    sponsor: {
      q: ['{brand} entra como patrocinador. ¿Qué supone?', '¿Le gusta el acuerdo con {brand}?', 'Nuevo patrocinador: {brand}. ¿Valoración?'],
      o: [
        ['El club crece. Gran noticia.', 'Más recursos, más ambición.', 'Una buena noticia para todos.', 'Que el club crezca es cosa de todos.'],
        ['Más recursos para competir.', 'Más balones y más vídeo. Bienvenidos.', 'Ayudará, seguro.', 'Siempre viene bien.'],
        ['Yo de eso no sé nada.', 'Eso es cosa de los despachos.', 'Ni idea.', 'Mi patrocinador es el balón.'],
        ['Que una marca así quiera nuestro escudo dice mucho del proyecto.', 'Es una señal: el club está en el mapa.', 'Las marcas apuestan por proyectos serios. Este lo es.']
      ]
    },
    campaign: {
      q: ['¿Qué le parece la campaña «{camp}»?', '¿Apoya la campaña «{camp}» del club?', '«{camp}»: ¿servirá para algo?'],
      o: [
        ['Totalmente. Hay que estar cerca de la gente.', 'El club tiene que salir a la calle. Me encanta.', 'Todo lo que acerque a la afición, bienvenido.', 'Cuenten conmigo.'],
        ['Si llena el estadio, adelante.', 'Si ayuda, perfecto.', 'Bien, si sirve.', 'No hace daño.'],
        ['A mí lo que me importa es el campo.', 'Mi campaña es ganar el domingo.', 'Eso no gana partidos.', 'Yo a lo mío.']
      ]
    },
    next: {
      q: ['¿Cómo ve al {next}, su próximo rival?', 'Se viene el {next}. ¿Preparados?', '¿Le asusta el {next}?', '¿Qué sabe del {next}?'],
      o: [
        ['Mucho respeto. Gran equipo.', 'Respeto todo. Miedo, ninguno.', 'Es un rival durísimo. Lo sabemos.', 'Les tenemos mucho respeto.'],
        ['A por los tres puntos, sin miedo.', 'Vamos a ir a ganar, como siempre.', 'Que se preparen.', 'Vamos a por ellos.'],
        ['Que se preocupen ellos.', 'Ellos sabrán cómo pararnos. Yo duermo tranquilo.', 'Me da igual quién venga.', 'No les tengo en cuenta.'],
        ['Ya los estamos analizando. Sabemos dónde les duele.', 'He visto sus últimos cinco partidos. Tengo ideas.', 'Tienen puntos débiles. Los vamos a buscar.']
      ]
    },
    board: {
      q: ['¿Se siente respaldado por la directiva?', 'Se habla de su futuro. ¿Preocupado?', '¿Ha hablado con el presidente?', '¿Tiene miedo a que le destituyan?'],
      o: [
        ['Tengo la confianza del club y del vestuario.', 'Me siento respaldado.', 'El club está conmigo.', 'Tengo el apoyo que necesito.'],
        ['Mi trabajo habla por mí.', 'Hablaré en el campo.', 'Los resultados dirán.', 'No entro en eso.'],
        ['Si me quieren echar, que me lo digan a la cara.', 'Que lo digan claro si quieren otro.', 'No voy a mendigar mi puesto.', 'Si hay que irse, me voy con la cabeza alta. Pero que lo digan.'],
        ['Hablo con la directiva cada semana. Remamos juntos.', 'Hay comunicación total con el presidente.', 'Estamos alineados. Lo sé de primera mano.']
      ]
    },
    season: {
      q: ['¿Qué objetivo tiene para la temporada?', '¿Hasta dónde puede llegar este equipo?', '¿Con qué sueña este año?', '¿Firmaría ya acabar donde pide el club?'],
      o: [
        ['El que pide el club. Y si se puede más, más.', 'Cumplir lo que nos han pedido. Primero eso.', 'El objetivo del club es el mío.', 'Lo que marca la directiva. Sin rodeos.'],
        ['Ganarlo todo. No me conformo.', 'Todos los trofeos. Sí, todos.', 'Si no salimos a ganarlo todo, ¿para qué salimos?', 'Lo quiero todo y lo quiero ya.'],
        ['Partido a partido.', 'Semana a semana.', 'El próximo partido, y luego el siguiente.', 'No miro más allá del domingo.'],
        ['Crecer cada semana. Si crecemos, los objetivos vendrán solos.', 'Que este equipo sea mejor en mayo que hoy. Lo demás vendrá.', 'Mejorar cada día. El resto es consecuencia.']
      ]
    },
    fans: {
      q: ['¿Algo para la afición?', '¿Un mensaje para su gente?', 'Última: ¿qué le dice al aficionado?', 'Para acabar, ¿unas palabras a la grada?'],
      o: [
        ['Gracias por estar siempre. Os necesitamos.', 'Sois la gasolina de este equipo.', 'Gracias. De corazón.', 'El domingo os quiero afónicos.'],
        ['Paciencia.', 'Que confíen, que esto se arregla.', 'Calma, que llegará lo bueno.', 'Esto es una maratón, no un sprint.'],
        ['Que vengan más, que se nota cuando no están.', 'Hay asientos vacíos que duelen.', 'Que no nos dejen solos en casa.', 'A ver si se animan a venir, que hay sitio.'],
        ['Este escudo es vuestro. Nosotros solo lo llevamos prestado.', 'Jugamos por vosotros. Siempre.', 'Somos lo que sois vosotros. Gracias por todo.']
      ]
    }
  });
})();
