/* TOUCHLINE — otras formas de hacer las preguntas de la rueda de prensa del partido (2/2: el club, lo que viene y el cierre).
 * Ver formas-partido.js. */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  const F = DB.formas = DB.formas || {};
  const merge = o => { for (const k in o) F[k] = (F[k] || []).concat(o[k]); };   // se suman, no se pisan
  merge({
    signing: [
      '¿Cómo ve a {jug} en sus primeros días en el club?',
      '{jug}, el fichaje. ¿Ha cumplido sus expectativas?',
      'Míster, ¿qué le pidió a la dirección deportiva cuando fichó a {jug}?',
      'Desde la radio: ¿{jug} es fichaje para hoy o para el futuro?',
      '¿Cuánto tardará {jug} en adaptarse del todo?',
      'Las redes ya han hecho un vídeo de presentación de {jug} con música épica. ¿Lo ha visto?',
      '¿{jug} viene a ser titular?',
      '¿Qué le dijo a {jug} el primer día?',
      '¿Era {jug} su primera opción?',
      '¿El precio de {jug} es una presión añadida?',
      '¿En qué posición ve a {jug}?',
      '¿Qué aporta {jug} que no tuviera ya la plantilla?'
    ],
    sale: [
      'La marcha de {jug} ha pillado a muchos por sorpresa. ¿A usted también?',
      'La salida de {jug}. ¿Era necesaria?',
      'Míster, ¿le consultaron antes de vender a {jug}?',
      'Desde la radio: ¿el equipo es más débil sin {jug}?',
      '¿Cómo se ha tomado el vestuario la marcha de {jug}?',
      'Las redes no entienden la venta de {jug}. ¿Se la explica usted?',
      '¿Echará de menos a {jug}?',
      '¿Quién ocupará el sitio de {jug}?',
      '¿Habló con {jug} antes de que se fuera?',
      '¿El dinero de la venta de {jug} se reinvertirá en la plantilla?',
      '¿Fue decisión del club, de {jug} o suya?'
    ],
    staff: [
      '{staff} se ha incorporado a su cuerpo técnico. ¿Qué le aporta?',
      '¿Por qué ha elegido a {staff}?',
      'Míster, ¿{staff} viene a cambiar la forma de trabajar?',
      'Desde la radio: ¿conocía usted antes a {staff}?',
      '¿Qué le pidió a {staff} el primer día?',
      '¿El cuerpo técnico estaba cojo antes de {staff}?',
      '¿Cómo ha encajado {staff} con el resto del staff?',
      'Las redes dicen que {staff} es un fichaje top. ¿Lo es?',
      '¿Qué va a notar el jugador con la llegada de {staff}?',
      '¿Es {staff} una apuesta personal suya?'
    ],
    sponsorR: [
      '{brand} no gusta a parte de la afición. ¿Usted qué piensa?',
      'Hay pancartas contra {brand} en la grada. ¿Las ha visto?',
      'Míster, ¿un club debería aceptar dinero de cualquiera?',
      'Desde la radio: ¿le incomoda llevar a {brand} en el pecho?',
      'Las redes están en pie de guerra con {brand}. ¿Se moja?',
      '¿Le consultaron sobre el acuerdo con {brand}?',
      '¿Entiende a los socios que protestan por {brand}?',
      '¿El dinero de {brand} justifica la polémica?',
      'Algunos jugadores tampoco están contentos con {brand}, dicen. ¿Es así?',
      'Si dependiera de usted, ¿habría firmado con {brand}?'
    ],
    sponsor: [
      '{brand} es el nuevo patrocinador. ¿Qué cambia?',
      '¿Qué le parece ver a {brand} en el pecho de sus jugadores?',
      'Míster, ¿el dinero de {brand} llegará al primer equipo?',
      'Desde la radio: ¿{brand} es una buena noticia para el club?',
      '¿Ha visto ya la camiseta con {brand}?',
      'Las redes celebran el acuerdo con {brand}. ¿Usted también?',
      '¿Le van a pedir que salga en algún anuncio de {brand}?',
      '¿Un patrocinador así cambia la ambición del club?',
      '¿Qué le pediría a {brand} además del dinero?',
      '¿El acuerdo con {brand} es un premio a lo que está haciendo el equipo?'
    ],
    campaign: [
      '«{camp}», la nueva campaña del club. ¿Le gusta?',
      '¿Apoya usted «{camp}»?',
      'Míster, ¿va a participar en «{camp}»?',
      'Desde la radio: ¿«{camp}» llenará el estadio?',
      'Las redes están divididas con «{camp}». ¿Usted qué opina?',
      '¿Le han pedido salir en la campaña «{camp}»?',
      '¿Las campañas ayudan a ganar partidos?',
      '¿Qué le diría a un socio indeciso sobre «{camp}»?',
      '¿Hacía falta algo como «{camp}»?',
      '¿El vestuario se implica en «{camp}»?'
    ],

    // ---- Para completar
    next: [
      'El próximo es el {next}. ¿Cómo lo ve?',
      '¿Qué le preocupa del {next}?',
      'Míster, ¿ya está pensando en el {next}?',
      'Desde la radio: ¿el {next} es un rival directo?',
      '¿Ha visto algún partido del {next} esta semana?',
      'Las redes ya calientan el partido contra el {next}. ¿Usted también?',
      '¿Es el {next} el rival más difícil que les queda?',
      '¿Qué tiene que hacer su equipo para ganar al {next}?',
      '¿Habrá rotaciones contra el {next}?',
      '¿Le hace ilusión el partido contra el {next}?',
      'Contra el {next}, ¿mismo plan o plan nuevo?',
      '¿Algún mensaje para la afición del {next}?'
    ],
    board: [
      '¿Siente la confianza del presidente?',
      'Hay rumores sobre su continuidad. ¿Le llegan?',
      'Míster, ¿ha hablado con la directiva esta semana?',
      'Desde la radio: ¿se siente cuestionado?',
      '¿Cree que la directiva tiene paciencia con usted?',
      'Las redes ya le buscan sustituto. ¿Las lee?',
      '¿Le han dado algún ultimátum?',
      '¿Tiene miedo de perder el puesto?',
      'Se habla de otros entrenadores para su banquillo. ¿Le molesta?',
      '¿Cuántos partidos cree que tiene de margen?',
      '¿El presidente le ha llamado después del partido?',
      'Si mañana le despidieran, ¿qué se llevaría de aquí?'
    ],
    season: [
      'Sin falsa modestia: ¿qué techo tiene este grupo?',
      '¿Cuál es el objetivo real de la temporada?',
      'Míster, ¿a qué aspira este equipo?',
      'Desde la radio: la directiva pide {objetivo}. ¿Es realista?',
      '¿Se atreve a decir un puesto para final de temporada?',
      'Las redes ya sueñan con cosas grandes. ¿Sueña usted también?',
      '¿Qué tiene que pasar para que la temporada sea un éxito?',
      '¿Hay techo para este equipo?',
      '¿Se conformaría con {objetivo}?',
      '¿Cómo ve la temporada a estas alturas?',
      '¿La temporada va como esperaba?'
    ],
    fans: [
      '¿Algún mensaje para la afición?',
      'Para terminar: ¿qué le diría a la gente que les ha seguido hoy?',
      'Míster, ¿la afición está con ustedes?',
      'Desde la radio: un mensaje para los oyentes, por favor.',
      '¿Siente el cariño de la grada?',
      'Las redes han estado on fire durante el partido. ¿Un mensaje para ellas?',
      'Si la afición pudiera oírle ahora mismo, ¿qué le diría?',
      '¿Cómo se gana a una afición exigente?',
      'Última: ¿la afición se merece algo más de este equipo?',
      '¿Lee lo que dicen de usted los aficionados?',
      '¿Qué haría para traer más gente al estadio?'
    ]
  });
})();
