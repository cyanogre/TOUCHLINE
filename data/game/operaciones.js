/* TOUCHLINE — operaciones especiales del Panel (solo en el modo fantasía).
 *
 * Las propuestas locas del centro de mando: una por partido, contra el próximo rival. Cada una:
 *   id, n (nombre), ic, d (qué haces), cond: 'home' | 'away' (solo si juegas en casa / fuera), coste (fracción de la masa
 *   salarial semanal) o board (confianza), risk (probabilidad de que te pillen), fx (efecto si sale bien):
 *     rivalFit: −forma del once rival ya · rivalK: factor del rival en el partido · ownK: el tuyo · lock: espías su plan
 *     keyMor: −moral de su jugador clave · teamMor: +moral de tu vestuario · random: la vidente decide
 *   ok: lo que pasa si sale bien · caught: [título, texto] de la noticia si te pillan · pen: castigo si te pillan
 *   (board, fine en € y sig: señales para tu personalidad oculta).
 * Huecos: {rival} {club} {yo} {key} (su jugador clave). */
(function () {
  window.TL_OPS = [
    { id: 'dron', n: 'Dron espía', ic: '🛸', d: 'Un dron sobrevuela su entrenamiento a puerta cerrada. Sabrás su once, su dibujo y su plan exactos.', coste: 0.6, risk: 0.18, fx: { lock: true },
      ok: 'El dron vuelve con 4K de su pizarra. Ya sabes exactamente cómo van a salir.', caught: ['Cazan un dron sobre el entrenamiento del {rival}', 'Los jardineros del {rival} derriban un dron con una manguera. La matrícula lleva a {club}. Escándalo.'], pen: { board: -5, fine: 40000, sig: { conspiranoico: 1.5, polemista: 1 } } },
    { id: 'mariachis', n: 'Mariachis a las 3 de la mañana', ic: '🎺', d: 'Contratas a un grupo de mariachis para que toquen debajo de su hotel toda la noche.', cond: 'home', coste: 0.3, risk: 0.22, fx: { rivalFit: -7 },
      ok: 'Tocaron «Cielito lindo» once veces. El {rival} saldrá al campo con ojeras hasta las rodillas.', caught: ['Mariachis «misteriosos» desvelan al {rival}', 'Un mariachi confiesa en la radio que les pagó alguien de {club}. Y pide que le paguen la segunda mitad.'], pen: { board: -3, fine: 15000, sig: { gracioso: 1, polemista: 1 } } },
    { id: 'riego', n: 'Riego hasta el encharcamiento', ic: '💦', d: 'El jardinero se «olvida» los aspersores encendidos. Su juego de toque se va a ahogar.', cond: 'home', coste: 0.1, risk: 0.12, fx: { rivalK: 0.975, ownK: 0.995 },
      ok: 'El césped parece un arrozal. Ellos lo van a pasar peor que vosotros (un poco).', caught: ['Competición investiga el «césped piscina» de {club}', 'El delegado del {rival} grabó los aspersores a las 4 de la mañana. Multa al canto.'], pen: { board: -2, fine: 25000, sig: { despota: 0.5, chulo: 0.5 } } },
    { id: 'calefaccion', n: 'Vestuario visitante a 40 grados', ic: '🔥', d: 'La calefacción del vestuario visitante se «estropea» en la posición máxima.', cond: 'home', coste: 0.05, risk: 0.15, fx: { rivalFit: -4 },
      ok: 'Salieron a calentar ya sudando. Alguno pidió el número de una sauna.', caught: ['El {rival} denuncia su vestuario «convertido en sauna»', 'El termómetro marcaba 41 grados. {club} habla de una avería. Nadie se lo cree.'], pen: { board: -2, fine: 10000, sig: { chulo: 1 } } },
    { id: 'once_falso', n: 'Filtrar un once falso', ic: '📰', d: 'Le pasas a un periodista amigo una alineación inventada. El {rival} preparará el partido para otro equipo.', coste: 0, board: -1, risk: 0.1, fx: { rivalK: 0.985 },
      ok: 'El {rival} ha preparado el partido contra un once que no existe. Su entrenador está desconcertado.', caught: ['{yo} filtra un once falso y la prensa se lo pilla', 'El periodista se siente utilizado y lo cuenta todo. La sala de prensa no te va a perdonar.'], pen: { board: -2, sig: { polemista: 1, conspiranoico: 1 } } },
    { id: 'vidente', n: 'Consultar a la vidente de Albacete', ic: '🔮', d: 'La vidente lee las cartas sobre el escudo del {rival}. Puede salir cualquier cosa.', coste: 0.15, risk: 0.04, fx: { random: true },
      ok: '', caught: ['{yo} consulta a una vidente antes del partido', 'Fotos del entrenador saliendo de una consulta de tarot. Las redes, encantadas.'], pen: { board: -1, sig: { conspiranoico: 1, gracioso: 1 } } },
    { id: 'influencer', n: 'Influencer contra su estrella', ic: '📱', d: 'Pagas a una influencer para que suba memes de {key} toda la semana.', coste: 0.25, risk: 0.2, fx: { keyMor: -18 },
      ok: '{key} ha visto los memes. Todos. Se le nota hundido.', caught: ['Destapan una campaña de memes pagada contra {key}', 'La influencer enseña los mensajes: el encargo venía de {club}. La federación toma nota.'], pen: { board: -4, fine: 20000, sig: { polemista: 1.5, bocazas: 1 } } },
    { id: 'balon_playa', n: 'Balones de playa en su calentamiento', ic: '🏖️', d: 'Cambias los balones de su calentamiento por unos de playa. Que pierdan el tacto.', cond: 'home', coste: 0.02, risk: 0.25, fx: { rivalK: 0.99 },
      ok: 'Calentaron con balones que volaban como globos. Su portero no ha cogido ni uno.', caught: ['Balones de playa en el calentamiento del {rival}', 'Las cámaras lo grabaron todo. El vídeo ya es viral y la directiva no se ríe.'], pen: { board: -2, fine: 5000, sig: { gracioso: 1.5 } } },
    { id: 'cocinero', n: 'Fichar a su cocinero una noche', ic: '🍲', d: 'Le pagas al cocinero de su hotel para que sirva fabada la noche antes del partido.', cond: 'away', coste: 0.2, risk: 0.2, fx: { rivalFit: -3, rivalK: 0.99 },
      ok: 'Fabada con chorizo a las once de la noche. El {rival} no ha dormido bien. Nadie del {rival}.', caught: ['La fabada del escándalo', 'El cocinero lo cuenta todo en un programa de cocina. «Me pagaron por la fabada», dice.'], pen: { board: -3, fine: 15000, sig: { pandillero: 1, polemista: 1 } } },
    { id: 'arbitro', n: 'Café con el árbitro… para hablar del tiempo', ic: '☕', d: 'Te «encuentras» con el árbitro en una cafetería. Solo habláis del tiempo. Seguro.', coste: 0.4, risk: 0.45, fx: { ownK: 1.03 },
      ok: 'Hablasteis del tiempo. Mucho. Él parecía muy de acuerdo contigo en todo.', caught: ['Escándalo: {yo}, fotografiado con el árbitro', 'Dicen que hablaban del tiempo. Competición abre expediente y la directiva está furiosa.'], pen: { board: -10, fine: 80000, sig: { conspiranoico: 2, despota: 1, polemista: 1 } } },
    { id: 'ritual', n: 'Ritual con sal gorda en las porterías', ic: '🧂', d: 'Un ritual con sal gorda, una vela y una foto del {rival}. Legal, pero raro.', coste: 0.01, risk: 0.03, fx: { ownK: 1.015, teamMor: 3 },
      ok: 'El vestuario se ríe con el ritual, pero se lo cree un poquito. Ambiente de diez.', caught: ['{yo} hace un ritual en el césped', 'El utillero lo graba y lo sube. Medio país se ríe y el otro medio se compra sal.'], pen: { board: -1, sig: { gracioso: 1, conspiranoico: 0.5 } } },
    { id: 'himno', n: 'Orquesta épica en el calentamiento', ic: '🎻', d: 'Contratas una orquesta para tocar música de película mientras calentáis.', cond: 'home', coste: 0.5, risk: 0, fx: { ownK: 1.012, teamMor: 2 },
      ok: 'Salieron al campo como si fuera la escena final de una película. La grada flipó.', caught: ['', ''], pen: {} }
  ];
})();
