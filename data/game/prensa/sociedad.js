/* TOUCHLINE — preguntas de sociedad: lo que no es fútbol pero te preguntan igual.
 * Salen de vez en cuando en la rueda de prensa. Sus respuestas alimentan las personalidades ideológicas (progre,
 * mano dura, machirulo, camarada, conspiranoico) o al que nunca se moja. Cada respuesta: t texto, cat estilo,
 * g encaje (0-2), sig señales, fx efectos. */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  DB.sociedad = [
    { id: 'soc_orgullo', q: 'El club lucirá los colores del Orgullo en los córners este fin de semana. ¿Le parece bien?', o: [
      { t: 'Me parece perfecto. En este vestuario cabe todo el mundo.', cat: 'pro', g: 2, sig: { 'soc:progre': 1.5 }, fx: { fans: 0.001 } },
      { t: 'Yo de banderines de córner no opino. Opino de los córners.', cat: 'hu', g: 1, sig: { 'soc:tibio': 1 } },
      { t: 'El fútbol es fútbol. Lo demás, que lo hagan en otro sitio.', cat: 'dur', g: 0, sig: { 'soc:facha': 1.5 }, fx: { board: -1, fans: -0.002 } },
      { t: 'Es una decisión del club. La respeto.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1.5 } }] },
    { id: 'soc_femenino', q: 'La jugadora franquicia del equipo femenino cobra cuarenta veces menos que el último suplente del masculino. ¿Opina algo?', o: [
      { t: 'Que eso hay que arreglarlo. Y que lo diga yo no debería ser noticia.', cat: 'pro', g: 2, sig: { 'soc:progre': 1.5 }, fx: { fans: 0.002 } },
      { t: 'Es el mercado. El femenino genera lo que genera.', cat: 'tec', g: 1, sig: { 'soc:machista': 0.8, 'soc:tibio': 0.5 } },
      { t: 'El femenino está bien, pero que no me pidan que lo vea.', cat: 'pol', g: 0, sig: { 'soc:machista': 2.5 }, fx: { board: -1.5, fans: -0.004 } },
      { t: 'Que repartan los ingresos de la tele a partes iguales. Problema resuelto.', cat: 'pol', g: 1, sig: { 'soc:comunista': 2 }, fx: { board: -0.5 } }] },
    { id: 'soc_entradas', q: 'El club ha subido las entradas un 20 %. Muchos socios no podrán renovar. ¿Qué piensa?', o: [
      { t: 'Que el fútbol sin la gente de siempre no es fútbol. Hay que pensarlo.', cat: 'pro', g: 2, sig: { 'soc:comunista': 1, 'soc:progre': 0.5 }, fx: { fans: 0.003, board: -0.5 } },
      { t: 'Que el fútbol es del pueblo, no de los fondos. Entradas a precio popular ya.', cat: 'pol', g: 1, sig: { 'soc:comunista': 2.5 }, fx: { fans: 0.006, board: -1.5 } },
      { t: 'El club tiene que ser competitivo. Si cuesta dinero, cuesta dinero.', cat: 'tec', g: 1, sig: { 'soc:tibio': 0.5 }, fx: { board: 0.5, fans: -0.002 } },
      { t: 'Yo de precios no sé. Pregunten en el despacho.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1.5 } }] },
    { id: 'soc_extranjeros', q: 'Un político ha dicho que «hay demasiados extranjeros en la liga». Su once titular tiene siete. ¿Qué le responde?', o: [
      { t: 'Que venga a ver un entrenamiento. Aquí todos hablamos el mismo idioma: el balón.', cat: 'pro', g: 2, sig: { 'soc:progre': 1.5 }, fx: { team: 1, fans: 0.002 } },
      { t: 'Algo de razón tiene. Hay que apostar más por los de casa.', cat: 'dur', g: 0, sig: { 'soc:facha': 2 }, fx: { team: -2, board: -1 } },
      { t: 'No contesto a políticos. Ni a favor ni en contra.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1.5 } },
      { t: 'Que los siete juegan porque son buenos. Y los cuatro restantes, también.', cat: 'tec', g: 2, sig: {}, fx: { team: 0.5 } }] },
    { id: 'soc_var', q: 'Hay quien dice que el VAR está «controlado» por los clubes grandes. ¿Lo cree?', o: [
      { t: 'Lo creo. Y no soy el único que lo piensa.', cat: 'pol', g: 0, sig: { 'soc:conspi': 2 }, fx: { fans: 0.003, board: -0.8 } },
      { t: 'No. El VAR se equivoca igual con todos. Que es peor.', cat: 'hu', g: 2, sig: {}, fx: { fans: 0.002 } },
      { t: 'Prefiero no entrar en teorías.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1 } },
      { t: 'Que lo investiguen. Yo tengo un dossier preparado, por si acaso.', cat: 'pol', g: 0, sig: { 'soc:conspi': 3 }, fx: { board: -1.2 } }] },
    { id: 'soc_disciplina', q: 'Hay técnicos que defienden prohibir los tatuajes y los pelos de colores en el vestuario. ¿Usted lo haría?', o: [
      { t: 'Por supuesto. Disciplina en la imagen, disciplina en el campo.', cat: 'dur', g: 0, sig: { 'soc:facha': 1.5 }, fx: { team: -1.5 } },
      { t: 'Que cada uno se pinte el pelo como quiera, mientras corra.', cat: 'hu', g: 2, sig: { 'soc:progre': 0.5 }, fx: { team: 1 } },
      { t: 'No es una prioridad. Me preocupa más la presión tras pérdida.', cat: 'tec', g: 2, sig: { 'soc:tibio': 0.5 } },
      { t: 'Me pinto yo el pelo si ganamos la liga. Rosa.', cat: 'hu', g: 1, sig: {}, fx: { fans: 0.003 } }] },
    { id: 'soc_arbitras', q: 'Por primera vez, una mujer arbitrará el partido del domingo. ¿Algún comentario?', o: [
      { t: 'Que ojalá deje de ser noticia pronto. Le deseo un gran partido.', cat: 'pro', g: 2, sig: { 'soc:progre': 1 }, fx: { fans: 0.002 } },
      { t: 'Ninguno. Una árbitra más. Si se equivoca, protestaré igual que con los demás.', cat: 'hu', g: 2, sig: {} },
      { t: 'A ver si aguanta el ritmo de un partido de verdad.', cat: 'pol', g: 0, sig: { 'soc:machista': 3 }, fx: { board: -2, fans: -0.005, fine: [0.6, 12000] } },
      { t: 'No tengo nada que decir.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1 } }] },
    { id: 'soc_apuestas', q: 'Las casas de apuestas patrocinan a media liga. ¿Debería prohibirse?', o: [
      { t: 'Sí. No quiero que un chaval de quince años vea mi escudo al lado de una ruleta.', cat: 'pro', g: 2, sig: { 'soc:progre': 1, 'soc:comunista': 0.5 }, fx: { board: -0.5, fans: 0.003 } },
      { t: 'Es legal. Si es legal, el club decide.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1 } },
      { t: 'Que prohíban también el dinero, ya puestos. Fútbol sin presupuesto, como de chavales.', cat: 'hu', g: 1, sig: {} },
      { t: 'Las apuestas son el capitalismo en estado puro. Fuera del fútbol.', cat: 'pol', g: 1, sig: { 'soc:comunista': 2 }, fx: { board: -1 } }] },
    { id: 'soc_salud', q: 'Un jugador de la liga ha hablado públicamente de su depresión. ¿Se habla poco de salud mental en el fútbol?', o: [
      { t: 'Muy poco. Y en mi vestuario hay una psicóloga para quien la necesite.', cat: 'pro', g: 2, sig: { 'soc:progre': 0.8 }, fx: { team: 1.5 } },
      { t: 'En mis tiempos se curaba con un buen entrenamiento.', cat: 'dur', g: 0, sig: { 'soc:facha': 1, 'soc:machista': 1 }, fx: { team: -2, fans: -0.003 } },
      { t: 'Mucho respeto por su valentía. Es más valiente que tirar un penalti en una final.', cat: 'hum', g: 2, sig: {}, fx: { fans: 0.002 } },
      { t: 'No soy médico. Prefiero no opinar.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1 } }] },
    { id: 'soc_selecciones', q: 'Se habla de una superliga europea cerrada para los clubes ricos. ¿A favor o en contra?', o: [
      { t: 'En contra. El fútbol es que el pequeño pueda ganar al grande.', cat: 'pro', g: 2, sig: { 'soc:comunista': 1, 'soc:progre': 0.5 }, fx: { fans: 0.004 } },
      { t: 'A favor, si estamos dentro. Si no, en contra. Como todo el mundo.', cat: 'hu', g: 1, sig: {}, fx: { fans: 0.002 } },
      { t: 'Hay que estudiarlo con calma.', cat: 'eva', g: 1, sig: { 'soc:tibio': 1.5 } },
      { t: 'Eso lo han decidido ya en una cena a la que no nos invitaron.', cat: 'pol', g: 1, sig: { 'soc:conspi': 2 }, fx: { board: -0.5 } }] },
    { id: 'soc_himno', q: 'Parte de la grada pitó el himno en la final. ¿Qué opina?', o: [
      { t: 'Que la libertad de expresión también se pita. No me gusta, pero se respeta.', cat: 'hum', g: 2, sig: { 'soc:progre': 0.5 } },
      { t: 'Que los que pitan deberían quedarse en casa. Respeto a los símbolos.', cat: 'dur', g: 0, sig: { 'soc:facha': 2 }, fx: { fans: -0.003, board: -0.5 } },
      { t: 'Que yo solo pito los fueras de juego.', cat: 'hu', g: 2, sig: { 'soc:tibio': 0.5 } },
      { t: 'De eso no hablo. Ni loco.', cat: 'eva', g: 1, sig: { 'soc:tibio': 2 } }] },
    { id: 'soc_ricos', q: 'Un fondo de inversión quiere comprar el club. ¿Le parece una buena noticia?', o: [
      { t: 'Si trae dinero y respeta la historia, bienvenido.', cat: 'tec', g: 2, sig: { 'soc:tibio': 0.5 }, fx: { board: 1 } },
      { t: 'Los fondos no tienen corazón ni escudo. Prefiero un club de socios.', cat: 'pol', g: 1, sig: { 'soc:comunista': 2 }, fx: { fans: 0.004, board: -1.5 } },
      { t: 'Que lo compren, que yo me quedo con el chándal.', cat: 'hu', g: 1, sig: {} },
      { t: 'Hay algo detrás de esa compra que todavía no nos han contado.', cat: 'pol', g: 0, sig: { 'soc:conspi': 2 }, fx: { board: -1 } }] }
  ];
})();
