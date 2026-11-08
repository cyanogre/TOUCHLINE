/* TOUCHLINE — base de datos de eventos del día a día, objetos y almas (la usa js/events.js)
 *
 * EVENTO
 *   id, cat (ver CATS), tone: pos | neg | neu
 *   who: 'p' un jugador de tu plantilla · 'pp' dos jugadores · 'c' el club (con `if`, elige a un jugador que lo cumpla)
 *   p + per: probabilidad por periodo ('week', 'month', 'quarter', 'season'), para cada jugador que cumple `if`
 *            (o para el club si who = 'c'). Se pasa a probabilidad diaria. Ej.: p: 0.2, per: 'season' = 1 cada 5 temporadas.
 *   if: condiciones del jugador · if2: las del segundo jugador (pp) · rel: [min, max] relación entre los dos · club: condiciones generales
 *       mor, age, ovr, pot, share (cuota de partidos), rank (0 = el mejor), fit, boss, rating, goals: [min, max]
 *       pos: [...], line: 0 portero · 1 defensa · 2 medio · 3 delantero, trait / traits / no: rasgos, conflict: perk de doble filo
 *       foreign, inj, lb (limit break), soul (lleva alma), fan (modo fantasía), g ('M' | 'F'), wk: [min, max] jornada,
 *       form ('good' | 'bad'), window (mercado abierto), cash ('rich' | 'poor'), items / souls (tienes alguno)
 *   fixed: probabilidad exacta (sin el ritmo general ni las habilidades del mánager)
 *   cd: días sin repetirse el evento · cdp: días sin repetirse con el mismo jugador · once: una vez por temporada · gap: temporadas mínimas
 *   x: [min, max] dinero en fracción de la masa salarial semanal ({x} en el texto) · give: 'item' | 'soul' | clave ({k} en el texto)
 *   t, b: título y texto ({n} nombre, {s} nombre corto, {o} el otro jugador, {c} tu club, {r} rival, {m} tú, {x} dinero, {k} objeto o alma)
 *       tF, bF…: versión para fútbol femenino cuando el texto cambia
 *   now: efectos al ocurrir · news: categoría de noticia (se publica) · sm: partido especial { opp, rel, win }
 *   var: variantes [{ w (peso), tr (rasgo que debe tener), if, t, b, o, now }]
 *   o: opciones [{ l, d, if, fx, r, odds: [{ p, fx, r }] }]
 * EFECTOS (fx): mor, mor2, team (moral), boss, boss2 (relación contigo), bond (entre los dos), cost / gain (fracción de la masa
 *   salarial semanal o 'x'), fine (semanas de sueldo), fans (%), board, fit, teamFit, inj (semanas o [min, max]), sus (partidos),
 *   away (días fuera), conf: [multiplicador, jornadas], teamConf, ovr, pot, trait ('dna' = un ADN de leyenda), untrait, ego
 *   (reconduce el ego), list, promise, xp, item / soul ('k' el del evento, 'random' o clave), equip, play (partido especial:
 *   1 titulares, 0.9 suplentes, 0.8 canteranos), next: [id, días] (evento encadenado)
 */
(function () {
  'use strict';

  const CATS = {
    personal: { name: 'Vida personal', icon: '🏠' },
    vestuario: { name: 'Vestuario', icon: '🚪' },
    rol: { name: 'Minutos y rol', icon: '🪑' },
    perk: { name: 'Doble filo', icon: '⚠️' },
    escandalo: { name: 'Escándalo', icon: '📸' },
    prensa: { name: 'Prensa', icon: '🎙️' },
    aficion: { name: 'Afición', icon: '📣' },
    club: { name: 'Club', icon: '🏛️' },
    especial: { name: 'Partido especial', icon: '🏟️' },
    leyenda: { name: 'Leyenda', icon: '🌀' },
    fantasia: { name: 'Fantasía', icon: '✨' },
    limit: { name: 'Limit break', icon: '💥' }
  };

  // Opciones de los partidos especiales
  const PLAY = rej => [
    { l: 'Con los titulares', d: 'Más opciones de ganar el premio, pero acaban cansados y alguno puede llevarse un golpe.', fx: { play: 1 } },
    { l: 'Con los suplentes', d: 'Minutos para los que menos juegan. Un partido igualado.', fx: { play: 0.9 } },
    { l: 'Con los canteranos', d: 'Difícil, pero a los jóvenes les encanta y les sube la moral.', fx: { play: 0.8 } },
    rej
  ];

  const EVENTS = [
    // ============================================================ VIDA PERSONAL
    { id: 'hijo', cat: 'personal', tone: 'pos', who: 'p', if: { age: [22, 38] }, p: 0.025, per: 'season', cdp: 300,
      t: '¡{s} ha sido papá!', tF: '¡{s} ha sido mamá!',
      b: 'Ha nacido el primer hijo de {n}. Está en una nube, pero lleva dos noches sin dormir.', bF: 'Ha nacido la primera hija de {n}. Está en una nube, pero lleva dos noches sin dormir.',
      o: [
        { l: 'Tres días libres', d: 'Que disfrute del momento.', fx: { mor: 12, boss: 12, fit: 4, away: 3 }, r: 'Vuelve feliz y te lo agradece de corazón.' },
        { l: 'Felicitarle delante del grupo', lF: 'Felicitarla delante del grupo', fx: { mor: 6, team: 2, fans: 0.002 }, r: 'El vestuario le hace un pasillo con aplausos.' },
        { l: 'Que entrene como siempre', fx: { mor: -6, boss: -8 }, r: 'Entrena, pero con la cabeza en casa.' }
      ] },
    { id: 'boda', cat: 'personal', tone: 'pos', who: 'p', if: { age: [23, 36] }, p: 0.02, per: 'season', cdp: 400,
      t: '{s} se casa', b: '{n} quiere casarse este mes y te pide unos días. La boda cae en mitad de la temporada.',
      o: [
        { l: 'Días libres para la boda', fx: { mor: 10, boss: 10, away: 4 }, r: 'Se casa feliz y vuelve con energía.' },
        { l: 'Mejor en verano', d: 'La temporada manda.', odds: [{ p: 0.5, fx: { mor: -4 }, r: 'Lo entiende… a regañadientes.' }, { p: 0.5, fx: { mor: -10, boss: -10 }, r: 'Se lo toma fatal. «Es mi vida, míster».' }] },
        { l: 'Que el club pague el banquete', fx: { mor: 14, boss: 15, cost: 0.12, team: 2 }, r: 'Invita a todo el vestuario. Gran fiesta y mejor ambiente.' }
      ] },
    { id: 'duelo', cat: 'personal', tone: 'neg', who: 'p', p: 0.012, per: 'season', cdp: 400,
      t: 'Duelo en la familia de {s}', b: 'Ha fallecido un familiar muy cercano de {n}. Está destrozado y quiere volver a casa unos días.', bF: 'Ha fallecido un familiar muy cercano de {n}. Está destrozada y quiere volver a casa unos días.',
      now: { mor: -10 },
      o: [
        { l: 'Que vaya con su familia', fx: { away: 6, boss: 15, mor: 4 }, r: 'Se va con su familia. No olvidará este gesto.' },
        { l: 'Minuto de silencio en el próximo partido', fx: { team: 3, fans: 0.003, boss: 10 }, r: 'Todo el estadio le arropa. Se emociona.' },
        { l: 'Que decida si juega', odds: [{ p: 0.6, fx: { conf: [1.05, 1] }, r: 'Quiere jugar y dedicárselo.' }, { p: 0.4, fx: { conf: [0.93, 2] }, r: 'Juega, pero no está.' }] }
      ] },
    { id: 'familiar_enfermo', cat: 'personal', tone: 'neg', who: 'p', p: 0.015, per: 'season', cdp: 300,
      t: 'Un familiar de {s}, en el hospital', b: '{n} está muy preocupado: su madre está ingresada y los médicos no se aclaran.', bF: '{n} está muy preocupada: su madre está ingresada y los médicos no se aclaran.',
      now: { mor: -8 },
      o: [
        { l: 'Que la vean los médicos del club', fx: { cost: 0.05, boss: 18, mor: 8 }, r: 'Nuestros médicos dan con el problema. Gratitud eterna.' },
        { l: 'Unos días en casa', fx: { away: 4, mor: 5, boss: 8 }, r: 'Vuelve más tranquilo.', rF: 'Vuelve más tranquila.' },
        { l: 'La temporada no espera', fx: { mor: -6, boss: -12 }, r: 'Se lo guarda, pero no te lo perdona.' }
      ] },
    { id: 'morrina', cat: 'personal', tone: 'neg', who: 'p', if: { foreign: true, age: [16, 30] }, p: 0.05, per: 'season', cdp: 200,
      t: '{s} echa de menos su país', b: '{n} no se adapta: no entiende el idioma, come mal y se pasa el día al teléfono con su familia.',
      now: { mor: -6 },
      o: [
        { l: 'Traer a su familia', d: 'El club paga el traslado.', fx: { cost: 0.06, mor: 14, boss: 10 }, r: 'Con su familia cerca, es otra persona.' },
        { l: 'Clases de idioma', fx: { cost: 0.01, mor: 6 }, r: 'Empieza a soltarse. Poco a poco.' },
        { l: 'Un compañero que le haga de guía', lF: 'Una compañera que le haga de guía', fx: { mor: 8, team: 1 }, r: 'El vestuario le adopta.', rF: 'El vestuario la adopta.' }
      ] },
    { id: 'casa', cat: 'personal', tone: 'neu', who: 'p', if: { age: [17, 30] }, p: 0.015, per: 'season', cdp: 300,
      t: '{s} no encuentra casa', b: '{n} lleva semanas en un hotel y está harto de vivir con la maleta abierta.', bF: '{n} lleva semanas en un hotel y está harta de vivir con la maleta abierta.',
      o: [
        { l: 'El club le ayuda', lF: 'El club la ayuda', fx: { cost: 0.02, mor: 8, boss: 6 }, r: 'Piso nuevo y sonrisa nueva.' },
        { l: 'Que se apañe', fx: { mor: -5 }, r: 'Sigue en el hotel. Y de morros.' }
      ] },
    { id: 'estudios', cat: 'personal', tone: 'pos', who: 'p', if: { age: [19, 31] }, p: 0.012, per: 'season', cdp: 600,
      t: '{s} quiere terminar la carrera', b: '{n} se ha matriculado en la universidad a distancia. Tiene exámenes en plena temporada.',
      o: [
        { l: 'Apoyarle', lF: 'Apoyarla', fx: { mor: 8, boss: 8, fit: -3 }, r: 'Estudia de noche y entrena de día. Admirable.' },
        { l: 'Primero el fútbol', fx: { mor: -6 }, r: 'Aparca los libros. Le duele.' }
      ] },
    { id: 'restaurante', cat: 'personal', tone: 'neu', who: 'p', if: { age: [24, 38] }, p: 0.012, per: 'season', cdp: 600,
      t: '{s} abre un restaurante', b: '{n} ha abierto un restaurante en la ciudad y quiere que el equipo vaya a la inauguración.',
      o: [
        { l: 'Cena de equipo allí', fx: { team: 3, mor: 6, fans: 0.002 }, r: 'Se come de lujo. El vestuario sale más unido.' },
        { l: 'Que no le distraiga', lF: 'Que no la distraiga', odds: [{ p: 0.6, fx: { mor: -3 }, r: 'Lo entiende.' }, { p: 0.4, fx: { mor: -8, boss: -6 }, r: '«¿Ahora no puedo tener una vida, míster?».' }] }
      ] },
    { id: 'mascota', cat: 'personal', tone: 'pos', who: 'p', p: 0.01, per: 'season', cdp: 800,
      t: 'El perro de {s} se cuela en el entrenamiento', b: 'El perro de {n} se ha escapado del coche y ha marcado un gol en el rondo. El vídeo arrasa en redes.',
      o: [
        { l: 'Nombrarlo mascota oficial', fx: { fans: 0.006, team: 3, mor: 6 }, r: 'La afición se vuelve loca. Ya tiene camiseta propia.' },
        { l: 'Pedir que no vuelva a pasar', fx: { mor: -2 }, r: 'El perro, castigado sin rondos.' }
      ] },
    { id: 'cumple', cat: 'personal', tone: 'pos', who: 'p', p: 0.03, per: 'season', cdp: 300,
      t: 'Cumpleaños de {s}', b: '{n} cumple años y quiere invitar a todo el vestuario a cenar… a dos días del partido.',
      o: [
        { l: 'Cena, pero a las once en casa', fx: { team: 3, mor: 5 }, r: 'Cena tranquila y gran ambiente.' },
        { l: 'Tarta en la ciudad deportiva', fx: { team: 2, mor: 3 }, r: 'Velas, canciones y vuelta al trabajo.' },
        { l: 'Que sea libre', odds: [{ p: 0.6, fx: { team: 4, mor: 6 }, r: 'Noche memorable y todo en orden.' }, { p: 0.4, fx: { team: 2, teamFit: -6 }, r: 'Se lió. Medio equipo llega con ojeras.' }] }
      ] },
    { id: 'tatuaje', cat: 'personal', tone: 'neu', who: 'p', if: { age: [18, 32] }, p: 0.008, per: 'season', cdp: 900,
      t: '{s} se tatúa tu cara', b: '{n} aparece en el entrenamiento con tu cara tatuada en la pantorrilla. «Es un homenaje, míster».',
      o: [
        { l: 'Reírte y hacerte una foto', fx: { boss: 20, team: 3, fans: 0.003 }, r: 'La foto da la vuelta al mundo.' },
        { l: 'Pedirle que se lo tape', lF: 'Pedirle que se lo tape', fx: { mor: -6, boss: -5 }, r: 'Se lo tapa con una venda. Ofendido.', rF: 'Se lo tapa con una venda. Ofendida.' }
      ] },
    { id: 'mueble', cat: 'personal', tone: 'neg', who: 'p', p: 0.012, per: 'season', cdp: 400,
      t: '{s} se lesiona montando un mueble', b: '{n} se ha hecho daño en la mano montando una estantería. La prensa ya hace chistes.',
      now: { inj: [1, 2] },
      o: [
        { l: 'Multa por imprudencia', fx: { fine: 0.5, mor: -4 }, r: 'Paga y aprende.' },
        { l: 'Reírte con el grupo', fx: { team: 2 }, r: 'Le regalan un destornillador. Con lazo.', rF: 'Le regalan un destornillador. Con lazo.' }
      ] },
    { id: 'videojuegos', cat: 'personal', tone: 'neg', who: 'p', if: { age: [16, 25] }, p: 0.025, per: 'season', cdp: 200,
      t: '{s} juega a la consola hasta las cinco', b: 'Los compañeros de concentración de {n} se quejan: se pasa la noche jugando en línea y llega reventado.', bF: 'Las compañeras de concentración de {n} se quejan: se pasa la noche jugando en línea y llega reventada.',
      now: { fit: -6 },
      o: [
        { l: 'Cortar el wifi a medianoche', fx: { mor: -5, fit: 4 }, r: 'Protesta, pero duerme.' },
        { l: 'Torneo de equipo en la concentración', fx: { team: 3, mor: 4 }, r: 'Gana el utillero. Nadie lo esperaba.' },
        { l: 'Multa', fx: { fine: 0.3, mor: -3 }, r: 'Paga. Y se compra unos cascos más grandes.' }
      ] },
    { id: 'cancion', cat: 'personal', tone: 'neu', who: 'p', if: { age: [18, 33] }, p: 0.008, per: 'season', cdp: 900,
      t: '{s} saca una canción', b: '{n} ha publicado un tema de reguetón con un videoclip grabado en el vestuario. Ya va por un millón de reproducciones.',
      o: [
        { l: 'Ponerla en el vestuario', fx: { team: 3, mor: 8, fans: 0.004 }, r: 'Se convierte en el himno del grupo.' },
        { l: 'Que se centre en el fútbol', odds: [{ p: 0.5, fx: { mor: -4 }, r: 'Aparca la música.' }, { p: 0.5, fx: { mor: -8, boss: -8 }, r: 'Le sienta fatal. Anuncia un segundo disco.', rF: 'Le sienta fatal. Anuncia un segundo disco.' }] }
      ] },
    { id: 'calcetines', cat: 'personal', tone: 'neu', who: 'p', p: 0.012, per: 'season', cdp: 600,
      t: 'Los calcetines de la suerte de {s}', b: '{n} no juega sin sus calcetines de la suerte… y han desaparecido de la lavandería.',
      o: [
        { l: 'Que los busque todo el club', fx: { cost: 0.002, conf: [1.04, 1], mor: 4 }, r: 'Aparecen en la bolsa del utillero. Alivio total.' },
        { l: 'Quitarle la manía', lF: 'Quitarle la manía', odds: [{ p: 0.5, fx: { conf: [1.02, 1] }, r: 'Juega sin ellos y no pasa nada. Superado.' }, { p: 0.5, fx: { conf: [0.94, 2] }, r: 'Sin calcetines no es nadie. Se nota en el campo.' }] }
      ] },
    { id: 'hospital_ninos', cat: 'personal', tone: 'pos', who: 'p', p: 0.02, per: 'season', cdp: 400,
      t: '{s} visita el hospital infantil', b: '{n} ha pasado la tarde con niños ingresados sin avisar a nadie. Una enfermera lo ha contado en redes.',
      o: [
        { l: 'Acompañarle la próxima vez', lF: 'Acompañarla la próxima vez', fx: { boss: 12, fans: 0.004, mor: 6 }, r: 'Vais juntos. Los niños alucinan.' },
        { l: 'Que el club lo convierta en tradición', fx: { fans: 0.006, team: 2, cost: 0.01 }, r: 'Cada mes, una visita del equipo.' }
      ] },
    { id: 'idolo', cat: 'personal', tone: 'pos', who: 'p', if: { age: [16, 24] }, p: 0.012, per: 'season', cdp: 900,
      t: '{s} conoce a su ídolo', b: 'En un acto benéfico, {n} se ha encontrado con la leyenda que tenía en un póster en su cuarto. Le ha dado un consejo.',
      o: [
        { l: '¡A aplicarlo!', fx: { conf: [1.06, 3], mor: 8 }, r: 'Sale al campo como si tuviera alas.' },
        { l: 'Que no se le suba a la cabeza', fx: { conf: [1.03, 2], mor: 3 }, r: 'Asiente. Pero sonríe como un niño.' }
      ] },
    { id: 'carnet', cat: 'personal', tone: 'neu', who: 'p', if: { age: [18, 26] }, p: 0.008, per: 'season', cdp: 900,
      t: '{s} suspende el carné por quinta vez', b: 'El vestuario se ha enterado de que {n} ha vuelto a suspender el práctico. Las bromas no paran.',
      o: [
        { l: 'Le llevas tú a entrenar', lF: 'La llevas tú a entrenar', fx: { boss: 10, team: 2 }, r: 'Cada mañana, el míster de chófer.' },
        { l: 'Que lo pase en verano', fx: { team: 1 }, r: 'Mientras, va en bici.' }
      ] },
    { id: 'rueda_idioma', cat: 'personal', tone: 'pos', who: 'p', if: { foreign: true }, p: 0.02, per: 'season', cdp: 900,
      t: '{s} se arranca en el idioma local', b: '{n} ha dado su primera rueda de prensa sin traductor. Con errores, pero con mucho arte.',
      o: [
        { l: 'Aplaudir en público', fx: { mor: 8, fans: 0.003, boss: 6 }, r: 'La afición le adora.', rF: 'La afición la adora.' },
        { l: 'Clases extra pagadas por el club', fx: { mor: 5, cost: 0.005 }, r: 'Ya pide el café sin señalar.' }
      ] },
    { id: 'abuela', cat: 'personal', tone: 'pos', who: 'p', p: 0.01, per: 'season', cdp: 900,
      t: 'La abuela de {s} viene al estadio', b: 'La abuela de {n}, de 92 años, quiere ver a su nieto en directo por primera vez.', bF: 'La abuela de {n}, de 92 años, quiere ver a su nieta en directo por primera vez.',
      o: [
        { l: 'Palco de honor', fx: { conf: [1.06, 1], mor: 8, fans: 0.002 }, r: 'Sale a darlo todo por ella.' },
        { l: 'Que la conozca el equipo', fx: { team: 3, mor: 6 }, r: 'Les trae croquetas. Se gana al vestuario entero.' }
      ] },

    // ============================================================ VESTUARIO
    { id: 'bronca', cat: 'vestuario', tone: 'neg', who: 'pp', p: 0.012, per: 'season', cdp: 120,
      t: 'Bronca entre {s} y {o}', b: '{s} y {o} se han encarado en el entrenamiento por una entrada fea. Ha tenido que intervenir todo el grupo.',
      now: { bond: -30, mor: -4, mor2: -4 },
      o: [
        { l: 'Multa a los dos', fx: { fine: 0.5, mor: -3, mor2: -3, team: 1 }, r: 'Mano firme. El vestuario toma nota.' },
        { l: 'Mediar', odds: [{ p: 0.6, fx: { bond: 30, mor: 5, mor2: 5 }, r: 'Se dan la mano delante de todos.' }, { p: 0.4, fx: { bond: -10 }, r: 'Ni se miran. La guerra sigue.' }] },
        { l: 'Que lo arreglen solos', odds: [{ p: 0.5, fx: { bond: 15 }, r: 'Se lo solucionan con una cerveza.' }, { p: 0.5, fx: { bond: -20, team: -2 }, r: 'El vestuario se divide en dos bandos.' }] }
      ] },
    { id: 'broma', cat: 'vestuario', tone: 'neu', who: 'pp', p: 0.012, per: 'season', cdp: 200,
      t: 'Broma pesada en el vestuario', b: '{s} le ha llenado el coche de globos a {o}. Unos ríen; a {o} no le ha hecho gracia.', bF: '{s} le ha llenado el coche de globos a {o}. Unas ríen; a {o} no le ha hecho gracia.',
      o: [
        { l: 'Reírte también', fx: { team: 2, mor2: -4, bond: -6 }, r: 'Ríe todo el mundo… menos {o}.' },
        { l: 'Que pida perdón', fx: { bond: 15, mor: -3 }, r: 'Disculpas, abrazo y asunto cerrado.' },
        { l: 'Castigo: recoger los balones una semana', fx: { mor: -2, team: 1 }, r: 'Recoge balones con cara de circunstancias.' }
      ] },
    { id: 'clan', cat: 'vestuario', tone: 'neg', who: 'c', p: 0.25, per: 'season', cd: 120,
      t: 'Se forma un grupito en el vestuario', b: 'Los más veteranos comen aparte y critican tus decisiones a tus espaldas. El ambiente se enrarece.',
      now: { team: -3 },
      o: [
        { l: 'Cena de equipo obligatoria', fx: { cost: 0.03, team: 5 }, r: 'Sentados mezclados, hablan. Funciona.' },
        { l: 'Hablar con los capitanes', odds: [{ p: 0.65, fx: { team: 4 }, r: 'Los capitanes lo cortan de raíz.' }, { p: 0.35, fx: { team: -2, board: -1 }, r: 'Los capitanes son parte del grupito.' }] },
        { l: 'Ignorarlo', fx: { team: -2 }, r: 'El grupito crece.' }
      ] },
    { id: 'novatada', cat: 'vestuario', tone: 'neu', who: 'p', if: { age: [16, 20] }, p: 0.03, per: 'season', cdp: 900,
      t: 'Novatada a {s}', b: 'Toca la tradición: {n} tiene que cantar delante de todo el equipo en la cena.',
      o: [
        { l: 'Que cante', odds: [{ p: 0.7, fx: { mor: 5, team: 3 }, r: 'Canta fatal, pero con ganas. Ya es uno más.', rF: 'Canta fatal, pero con ganas. Ya es una más.' }, { p: 0.3, fx: { mor: -4, team: 2 }, r: 'Lo pasa fatal. Las risas duran semanas.' }] },
        { l: 'Prohibir novatadas', fx: { mor: 3, team: -2 }, r: 'Los veteranos refunfuñan.' }
      ] },
    { id: 'inseparables', cat: 'vestuario', tone: 'pos', who: 'pp', rel: [0, 100], p: 0.012, per: 'season', cdp: 500,
      t: '{s} y {o}, inseparables', b: '{s} y {o} entrenan juntos, comen juntos y se buscan en el campo. Se nota en el juego.',
      o: [
        { l: 'Juntarlos en el once', fx: { bond: 25, mor: 4, mor2: 4 }, r: 'Se entienden con la mirada.' },
        { l: 'Que no hagan grupito', fx: { bond: 10, team: 1 }, r: 'Ellos lo entienden.' }
      ] },
    { id: 'cocinero', cat: 'vestuario', tone: 'neg', who: 'c', p: 0.15, per: 'season', cd: 300,
      t: 'El cocinero del club se quiere ir', b: 'El cocinero, el alma de la ciudad deportiva, tiene una oferta de un restaurante. Los jugadores están preocupados.',
      o: [
        { l: 'Subirle el sueldo', fx: { cost: 0.03, team: 3 }, r: 'Se queda. Celebración con paella.' },
        { l: 'Dejarle ir', fx: { team: -3 }, r: 'La comida nueva no convence a nadie.' }
      ] },
    { id: 'musica', cat: 'vestuario', tone: 'neu', who: 'c', p: 0.2, per: 'season', cd: 200,
      t: 'Guerra por la música del vestuario', b: 'Unos quieren reguetón, otros rock y alguno flamenco. El altavoz ha acabado en la ducha.',
      o: [
        { l: 'Votación democrática', fx: { team: 2 }, r: 'Gana el reguetón por un voto.' },
        { l: 'Pones tú la música', odds: [{ p: 0.5, fx: { team: 3 }, r: 'Tus éxitos de los 90 triunfan.' }, { p: 0.5, fx: { team: -2 }, r: 'Tus éxitos de los 90 no triunfan.' }] },
        { l: 'Silencio total', fx: { team: -1, teamConf: [1.02, 1] }, r: 'Concentración monacal.' }
      ] },
    { id: 'autobus', cat: 'vestuario', tone: 'neg', who: 'p', p: 0.012, per: 'season', cdp: 300,
      t: '{s} pierde el autobús del equipo', b: '{n} se ha dormido y el autobús ha salido sin él hacia el hotel de concentración.', bF: '{n} se ha dormido y el autobús ha salido sin ella hacia el hotel de concentración.',
      o: [
        { l: 'Multa y que llegue en taxi', fx: { fine: 0.4, mor: -3 }, r: 'Llega tarde, paga y se calla.' },
        { l: 'Esperarle', lF: 'Esperarla', fx: { team: -2, mor: 3 }, r: 'Media hora de espera. Los demás no están contentos.' },
        { l: 'Dejarle en el banquillo', lF: 'Dejarla en el banquillo', fx: { mor: -8, boss: -6, team: 2 }, r: 'Mensaje claro para todos.' }
      ] },
    { id: 'critica_grupo', cat: 'vestuario', tone: 'neg', who: 'pp', p: 0.008, per: 'season', cdp: 300,
      t: '{s} señala a {o} delante de todos', b: 'Tras la derrota, {s} ha culpado a {o} en el vestuario. Silencio incómodo.',
      now: { bond: -25, mor2: -6 },
      o: [
        { l: 'Defender a {o}', fx: { mor2: 8, boss2: 10, mor: -4 }, r: 'Cierras filas. {o} te lo agradece.' },
        { l: 'Reunir a los dos', odds: [{ p: 0.55, fx: { bond: 25 }, r: 'Se lo dicen todo a la cara y salen bien.' }, { p: 0.45, fx: { bond: -10, team: -2 }, r: 'Empeora. Ya ni se pasan el balón.' }] },
        { l: 'No meterte', fx: { team: -2 }, r: 'El vestuario espera más de ti.' }
      ] },

    // ============================================================ MINUTOS Y ROL (moral baja y pocos minutos: 1 de cada 3 semanas)
    { id: 'rol', cat: 'rol', tone: 'neg', who: 'p', fixed: true, if: { mor: [0, 44], share: [0, 0.35], rank: [0, 22] }, p: 1 / 3, per: 'week', cd: 2, cdp: 7,
      var: [
        { w: 5, t: '{s} quiere saber cuál es su papel', b: '{n} llama a la puerta de tu despacho: «Míster, ¿cuento para usted? Necesito saber qué pinto aquí».',
          o: [
            { l: 'Explicarle su rol', lF: 'Explicarle su rol', d: 'Rotación, paciencia y oportunidades.', odds: [{ p: 0.6, fx: { mor: 10, boss: 8 }, r: 'Lo entiende. Sale con otra cara.' }, { p: 0.4, fx: { mor: -4, boss: -4 }, r: '«Eso me lo dijeron el año pasado». No se lo cree.' }] },
            { l: 'Prometerle minutos', lF: 'Prometerle minutos', d: 'Jugará 2 de los próximos 4 partidos. No le falles.', fx: { promise: true, mor: 12, boss: 6 }, r: 'Sale motivado. Ahora te toca cumplir.', rF: 'Sale motivada. Ahora te toca cumplir.' },
            { l: 'Abrirle la puerta a una cesión', lF: 'Abrirle la puerta a una cesión', if: { window: true }, fx: { list: true, mor: 6 }, r: 'Lo agradece: quiere jugar, sea donde sea.' },
            { l: 'Mano dura: «Gánatelo»', fx: { mor: -8, boss: -10, conf: [1.03, 2] }, r: 'Se va con la mandíbula apretada. Puede que entrene más fuerte.' }
          ] },
        { w: 2, t: '{s} llega tarde y de malas', b: '{n} aparece veinte minutos tarde al entrenamiento, sin dar explicaciones, y no saluda a nadie.',
          o: [
            { l: 'Multa', fx: { fine: 0.5, mor: -4, team: 1 }, r: 'Paga sin rechistar. Pero el problema sigue ahí.' },
            { l: 'Charla a solas', odds: [{ p: 0.55, fx: { mor: 8, boss: 6 }, r: 'Se desahoga. Necesitaba que alguien le escuchara.', rF: 'Se desahoga. Necesitaba que alguien la escuchara.' }, { p: 0.45, fx: { mor: -3 }, r: 'Monosílabos y mirada al suelo.' }] },
            { l: 'Mandarle a casa', lF: 'Mandarla a casa', fx: { mor: -10, boss: -10, team: 2, sus: 1 }, r: 'Se pierde el próximo partido. Mensaje recibido por todos.' }
          ] },
        { w: 2, t: 'Indirecta de {s} en redes', b: '{n} publica: «Hay gente que no ve lo que tiene delante». Los periodistas ya preguntan por ti.',
          news: 'polemica',
          o: [
            { l: 'Multa', fx: { fine: 0.5, mor: -5 }, r: 'Borra el mensaje. El enfado sigue.' },
            { l: 'Responder con humor en rueda de prensa', fx: { fans: 0.003, boss: -4 }, r: 'Los periodistas ríen. Quien no ríe es el jugador.', rF: 'Los periodistas ríen. Quien no ríe es la jugadora.' },
            { l: 'Hablarlo en privado', odds: [{ p: 0.6, fx: { mor: 8, boss: 5 }, r: 'Pide perdón y borra el mensaje.' }, { p: 0.4, fx: { mor: -4 }, r: 'No se arrepiente de nada.' }] }
          ] },
        { w: 1, t: '{s} se va del entrenamiento', b: 'Tras quedarse en el grupo de los suplentes en el partidillo, {n} ha tirado el peto y se ha ido a la ducha.',
          o: [
            { l: 'Sanción interna', d: 'Un partido sin convocar.', fx: { sus: 1, mor: -6, team: 2 }, r: 'Disciplina ante todo.' },
            { l: 'Dejarlo pasar', fx: { team: -3 }, r: 'El vestuario ve que aquí no pasa nada.' },
            { l: 'Pedirle que se disculpe ante el grupo', lF: 'Pedirle que se disculpe ante el grupo', odds: [{ p: 0.6, fx: { team: 3, mor: 3 }, r: 'Se disculpa. El grupo lo valora.' }, { p: 0.4, fx: { team: -2, mor: -6 }, r: 'Se niega. Tensión máxima.' }] }
          ] },
        { w: 1.5, t: '«Aquí no cuento»: {s} habla en la radio', b: '{n} concede una entrevista a una radio local: «No sé qué tengo que hacer para jugar. Me lo estoy pensando todo».',
          news: 'polemica',
          o: [
            { l: 'Ponerle en venta', lF: 'Ponerla en venta', if: { window: true }, fx: { list: true, mor: 4, board: -1 }, r: 'Si quiere irse, la puerta está abierta.' },
            { l: 'Darle una oportunidad el domingo', lF: 'Darle una oportunidad el domingo', fx: { promise: true, mor: 10 }, r: 'Tiene su oportunidad. Que la aproveche.' },
            { l: 'Multa por hablar fuera de casa', fx: { fine: 1, mor: -8, boss: -10, team: 1 }, r: 'Los trapos sucios se lavan en casa.' }
          ] }
      ] },

    // ============================================================ DOBLE FILO (perk conflictiva: 1 de cada 5 trimestres)
    { id: 'perk', cat: 'perk', tone: 'neg', who: 'p', fixed: true, if: { conflict: true }, p: 0.2, per: 'quarter', cdp: 40,
      var: [
        { tr: 'ego', t: '{s} no se la pasa a nadie', b: 'En el partidillo, {n} ha tirado desde todas partes con compañeros solos. El vestuario está que arde.',
          o: [
            { l: 'Hablarle de equipo', lF: 'Hablarle de equipo', odds: [{ p: 0.3, fx: { ego: true, boss: 6 }, r: 'Algo hace clic: empieza a buscar a los demás.' }, { p: 0.7, fx: { mor: -3 }, r: '«Si la meto, nadie se queja», responde.' }] },
            { l: 'Que lo arreglen los capitanes', fx: { team: 2, mor: -4 }, r: 'Los capitanes le dan un toque. Le escuece.', rF: 'Las capitanas le dan un toque. Le escuece.' },
            { l: 'Dejarle ser como es', lF: 'Dejarla ser como es', fx: { conf: [1.06, 2], team: -3 }, r: 'Marca en el entrenamiento… y el grupo murmura.' }
          ] },
        { tr: 'ego', t: '{s} exige tirar todas las faltas', b: '{n} se ha enfrentado al lanzador habitual: quiere todas las faltas y todos los penaltis.',
          o: [
            { l: 'Dárselas', fx: { mor: 8, team: -3, conf: [1.04, 2] }, r: 'Feliz. El antiguo lanzador, no tanto.' },
            { l: 'Mantener la jerarquía', fx: { mor: -8, boss: -6, team: 2 }, r: 'Se enfurruña, pero el grupo te respalda.' }
          ] },
        { tr: 'hothead', t: '{s} se encara con un compañero', b: 'Una entrada en el entrenamiento y {n} ha perdido los papeles. Casi llega a las manos.',
          o: [
            { l: 'Sanción interna', fx: { sus: 1, mor: -6, team: 2 }, r: 'Un partido en la grada para pensar.' },
            { l: 'Sesión con el psicólogo', fx: { cost: 0.01, mor: 3 }, odds: null, r: 'Trabaja su control. Poco a poco.' },
            { l: 'Es su carácter', fx: { team: -3, conf: [1.03, 1] }, r: 'El grupo se cansa de sus prontos.' }
          ] },
        { tr: 'hothead', t: '{s} rompe la puerta del vestuario', b: 'Tras el último partido, {n} pegó un puñetazo a la puerta. La puerta perdió. La mano, también.',
          now: { inj: 1 },
          o: [
            { l: 'Que pague la puerta', fx: { fine: 0.5, mor: -3 }, r: 'Paga la puerta. Y una nueva, por si acaso.' },
            { l: 'Hablar en privado', odds: [{ p: 0.5, fx: { mor: 6, boss: 8 }, r: 'Reconoce que se le fue. Promete calmarse.' }, { p: 0.5, fx: { boss: -6 }, r: '«Es que me hierve la sangre, míster».' }] }
          ] },
        { tr: 'party', t: '{s}, pillado de fiesta', tF: '{s}, pillada de fiesta', b: 'Un vídeo muestra a {n} bailando sobre una mesa a las cuatro de la mañana, a dos días del partido.',
          news: 'ocio', now: { fit: -8, fans: -0.002 },
          o: [
            { l: 'Multa ejemplar', fx: { fine: 1, mor: -6, board: 1 }, r: 'Paga y pide perdón en redes.' },
            { l: 'Al banquillo el domingo', fx: { mor: -8, team: 2, conf: [0.96, 1] }, r: 'Se queda sin jugar. Aprenderá.' },
            { l: 'Defenderle en público', lF: 'Defenderla en público', fx: { boss: 12, board: -2, fans: -0.002 }, r: '«Es joven y tiene derecho a vivir». La directiva no lo entiende.' }
          ] },
        { tr: 'party', t: 'Fiesta en casa de {s}', b: '{n} ha montado una fiesta con medio equipo. Los vecinos han llamado a la policía.',
          news: 'ocio', now: { teamFit: -5 },
          o: [
            { l: 'Multas a todos', fx: { team: -3, gain: 0.04, board: 1 }, r: 'Caja de multas llena, vestuario serio.' },
            { l: 'Hacer la vista gorda', fx: { team: 4, board: -2 }, r: 'Gran ambiente… y rumores en la prensa.' }
          ] },
        { tr: 'diva', t: '{s} exige ser la imagen del club', b: '{n} quiere salir en solitario en la campaña de las nuevas camisetas. Si no, no posa.',
          o: [
            { l: 'Concedérselo', fx: { mor: 10, gain: 0.05, team: -3 }, r: 'Se venden más camisetas. Los demás, celosos.' },
            { l: 'Todos o ninguno', fx: { mor: -8, boss: -8, team: 3 }, r: 'Foto de grupo. La diva, con gesto torcido.' }
          ] },
        { tr: 'diva', t: '{s} no quiere ser suplente en la tele', b: 'El próximo partido se emite en abierto. {n} te avisa: «Si salgo en el banquillo, me borro».',
          o: [
            { l: 'Titular, que brille', fx: { mor: 8, conf: [1.05, 1], team: -2 }, r: 'Sale de titular y con ganas de lucirse.' },
            { l: 'Aquí decido yo', fx: { mor: -10, boss: -10, team: 3 }, r: 'Se queda en el banquillo con cara de póker.' }
          ] },
        { tr: 'reborn', t: 'La sombra de la leyenda pesa sobre {s}', b: 'Los periódicos comparan cada partido de {n} con los de la leyenda. Cada fallo es portada.',
          now: { mor: -6 },
          o: [
            { l: 'Protegerle de la prensa', lF: 'Protegerla de la prensa', fx: { mor: 8, boss: 8, fans: -0.001 }, r: 'Sin entrevistas durante un mes. Respira.' },
            { l: 'Que lo use como motivación', odds: [{ p: 0.5, fx: { conf: [1.07, 2] }, r: '«La leyenda soy yo». Partidazo.' }, { p: 0.5, fx: { conf: [0.93, 2] }, r: 'La presión le come.' }] }
          ] },
        { tr: 'reborn', if: { fan: true }, t: '«La leyenda me habla»', b: '{n} asegura que oye la voz de la leyenda en los partidos. A veces le guía… y a veces le pide cosas raras.',
          o: [
            { l: 'Escucharla', odds: [{ p: 0.6, fx: { conf: [1.08, 2], mor: 6 }, r: 'La voz le guía hacia la portería.' }, { p: 0.4, fx: { conf: [0.92, 1], mor: -4 }, r: 'La voz le pide tirar desde el centro del campo. Lo hace.' }] },
            { l: 'Que la ignore', fx: { mor: -4 }, r: 'Silencio. Juega normal.' }
          ] }
      ] },

    // ============================================================ ESCÁNDALOS Y POLÉMICAS
    { id: 'discoteca', cat: 'escandalo', tone: 'neg', who: 'p', if: { age: [18, 32] }, p: 0.008, per: 'season', cdp: 300, news: 'ocio',
      t: 'Vídeo viral de {s} en una discoteca', b: 'Circula un vídeo de {n} cantando a gritos en un reservado de madrugada. El partido es pasado mañana.',
      now: { fit: -6 },
      o: [
        { l: 'Multa y disculpa pública', fx: { fine: 1, mor: -5, fans: 0.001 }, r: 'Pide perdón. La afición lo acepta.' },
        { l: 'Defenderle', lF: 'Defenderla', fx: { boss: 10, board: -2, fans: -0.003 }, r: '«Fue su día libre». No convence a todos.' },
        { l: 'Al banquillo', fx: { mor: -8, team: 1 }, r: 'Se queda fuera. Aviso para navegantes.' }
      ] },
    { id: 'radar', cat: 'escandalo', tone: 'neg', who: 'p', p: 0.008, per: 'season', cdp: 400, news: 'sucesos',
      t: '{s}, cazado a 190 por la autovía', tF: '{s}, cazada a 190 por la autovía', b: 'La policía ha multado a {n} por exceso de velocidad. Le quitan puntos del carné y la foto del deportivo está en todas partes.',
      now: { fans: -0.002 },
      o: [
        { l: 'Curso de conducción obligatorio', fx: { mor: -3, fans: 0.002 }, r: 'Vuelve a la autoescuela. Bien visto.' },
        { l: 'Multa del club', fx: { fine: 0.8, mor: -4 }, r: 'Doble multa. Aprenderá.' },
        { l: 'Es su vida privada', fx: { board: -1 }, r: 'La prensa critica tu silencio.' }
      ] },
    { id: 'like', cat: 'escandalo', tone: 'neg', who: 'p', p: 0.008, per: 'season', cdp: 400, news: 'redes',
      t: 'El «me gusta» de {s}', b: '{n} ha dado «me gusta» a un mensaje que se burla de la afición. Las redes arden.',
      now: { fans: -0.004, mor: -3 },
      o: [
        { l: 'Disculpa con la afición', fx: { fans: 0.004, mor: -2 }, r: 'Vídeo de perdón. Medio perdonado.' },
        { l: '«Le hackearon la cuenta»', odds: [{ p: 0.5, fx: { boss: 6 }, r: 'Cuela. Por los pelos.' }, { p: 0.5, fx: { fans: -0.004, board: -2 }, r: 'No cuela. Peor aún.' }] }
      ] },
    { id: 'critica_mister', cat: 'prensa', tone: 'neg', who: 'p', if: { boss: [-100, 10] }, p: 0.012, per: 'season', cdp: 300, news: 'polemica',
      t: '{s} te critica en una entrevista', b: '{n} en un pódcast: «El míster no sabe sacar lo mejor de nosotros». El clip corre por todas partes.',
      now: { boss: -10 },
      o: [
        { l: 'Responder en rueda de prensa', fx: { fans: 0.002, mor: -6, board: 1 }, r: '«Aquí manda el trabajo». Zasca de manual.' },
        { l: 'Reunión a puerta cerrada', odds: [{ p: 0.5, fx: { boss: 20, mor: 6 }, r: 'Se lo decís todo. Salís más fuertes.' }, { p: 0.5, fx: { boss: -10 }, r: 'Ni un paso atrás. La relación, rota.' }] },
        { l: 'Ponerle en venta', lF: 'Ponerla en venta', if: { window: true }, fx: { list: true, team: 1 }, r: 'Quien habla así, se va.' }
      ] },
    { id: 'camiseta_rival', cat: 'escandalo', tone: 'neg', who: 'p', p: 0.006, per: 'season', cdp: 600, news: 'polemica',
      t: '{s}, con la camiseta del eterno rival', b: 'Sale una foto antigua de {n} posando con la camiseta de {r}. La afición exige explicaciones.',
      now: { fans: -0.003 },
      o: [
        { l: 'Besar el escudo el domingo', fx: { fans: 0.005, conf: [1.03, 1] }, r: 'Gol y beso al escudo. Perdonado.', rF: 'Gol y beso al escudo. Perdonada.' },
        { l: 'Explicar que era de pequeño', fx: { fans: 0.001 }, r: 'Tenía diez años. Se calman.' }
      ] },
    { id: 'anuncio_rival', cat: 'escandalo', tone: 'neg', who: 'p', if: { rank: [0, 8] }, p: 0.008, per: 'season', cdp: 600,
      t: '{s} anuncia la marca de la competencia', b: '{n} protagoniza un anuncio de la marca rival de vuestro patrocinador principal. El patrocinador amenaza con penalizaciones.',
      x: [0.08, 0.2],
      o: [
        { l: 'Pagar la penalización ({x})', fx: { cost: 'x', mor: 4 }, r: 'Pagas y todos contentos. Menos tu tesorero.' },
        { l: 'Que rompa el contrato', fx: { mor: -10, boss: -8 }, r: 'Rompe el contrato. Y se lo toma muy mal.' },
        { l: 'Negociar con el patrocinador', odds: [{ p: 0.5, fx: { board: 1 }, r: 'Acuerdo amistoso. Sin coste.' }, { p: 0.5, fx: { cost: 'x', board: -2 }, r: 'No hay acuerdo: pagas la penalización.' }] }
      ] },
    { id: 'apuesta_cartas', cat: 'escandalo', tone: 'neg', who: 'pp', p: 0.006, per: 'season', cdp: 400,
      t: 'Timba en la concentración', b: '{s} le ha ganado a {o} medio sueldo jugando a las cartas en el hotel. {o} no quiere pagar.',
      now: { bond: -20 },
      o: [
        { l: 'Prohibir el dinero en las cartas', fx: { team: 1, bond: 10 }, r: 'Ahora se juegan las tareas del utillero.' },
        { l: 'Que pague: una deuda es una deuda', fx: { mor: 4, mor2: -10, bond: -10 }, r: '{o} paga. Rencor para rato.' }
      ] },
    { id: 'paparazzi', cat: 'escandalo', tone: 'neu', who: 'p', if: { rank: [0, 10] }, p: 0.012, per: 'season', cdp: 400, news: 'club',
      t: 'Los paparazzi acosan a {s}', b: 'Una revista publica fotos de la vida privada de {n}. Le persiguen hasta la puerta de casa.',
      now: { mor: -5 },
      o: [
        { l: 'El club se querella', fx: { cost: 0.03, mor: 8, boss: 10 }, r: 'El club le protege. Lo valora mucho.', rF: 'El club la protege. Lo valora mucho.' },
        { l: 'Seguridad privada', fx: { cost: 0.02, mor: 5 }, r: 'Duerme tranquilo.', rF: 'Duerme tranquila.' },
        { l: 'Ignorarlo', fx: { mor: -4 }, r: 'Las fotos siguen saliendo.' }
      ] },
    { id: 'gesto_grada', cat: 'escandalo', tone: 'neg', who: 'p', p: 0.006, per: 'season', cdp: 600, news: 'polemica',
      t: 'Gesto de {s} a la grada rival', b: 'Al acabar el último partido, {n} hizo un gesto obsceno a la afición contraria. La federación abre expediente.',
      now: { sus: 1, fans: 0.001 },
      o: [
        { l: 'Disculpa oficial', fx: { mor: -3, board: 1 }, r: 'Expediente archivado con un partido.' },
        { l: 'Recurrir la sanción', odds: [{ p: 0.4, fx: { mor: 6 }, r: 'Recurso aceptado: no hay castigo extra.' }, { p: 0.6, fx: { sus: 2, cost: 0.02 }, r: 'Recurso rechazado: un partido más.' }] }
      ] },
    { id: 'filtracion_sueldo', cat: 'prensa', tone: 'neg', who: 'p', if: { rank: [0, 6] }, p: 0.008, per: 'season', cdp: 600, news: 'polemica',
      t: 'Se filtra el sueldo de {s}', b: 'Un diario publica la nómina de {n}. Varios compañeros cobran mucho menos y se nota en el vestuario.',
      now: { team: -2 },
      o: [
        { l: 'Buscar al topo', odds: [{ p: 0.4, fx: { team: 3, board: 1 }, r: 'Era un empleado de oficinas. Despedido.' }, { p: 0.6, fx: { team: -1 }, r: 'No aparece. Desconfianza general.' }] },
        { l: 'Pedir calma al grupo', fx: { team: 2 }, r: 'Cada uno tiene su contrato. Se calman.' }
      ] },

    // ============================================================ PRENSA
    { id: 'periodista', cat: 'prensa', tone: 'neu', who: 'c', p: 0.35, per: 'season', cd: 120,
      t: 'Un periodista te provoca', b: 'En la rueda de prensa, un periodista te pregunta si te queda grande el banquillo de {c}.',
      o: [
        { l: 'Respuesta cortante', fx: { fans: 0.004, board: -1, teamConf: [1.02, 1] }, r: 'Tu respuesta es tendencia. El vestuario se ríe.' },
        { l: 'Con calma y datos', fx: { board: 1 }, r: 'Educado y firme. La directiva aplaude.' },
        { l: 'Levantarte y irte', fx: { fans: 0.002, board: -2 }, r: 'Portada mañana. Para bien y para mal.' }
      ] },
    { id: 'alineacion_filtrada', cat: 'prensa', tone: 'neg', who: 'c', p: 0.2, per: 'season', cd: 150,
      t: 'Se filtra tu alineación', b: 'Un periódico ha publicado tu once para el partido contra {r} dos días antes. Alguien habla más de la cuenta.',
      o: [
        { l: 'Cambiar el once por sorpresa', fx: { teamConf: [0.98, 1], board: 1 }, r: 'Despistas al rival… y a los tuyos.' },
        { l: 'Buscar al topo', odds: [{ p: 0.5, fx: { team: 2 }, r: 'Lo encuentras: era un utillero. Fin de la historia.' }, { p: 0.5, fx: { team: -2 }, r: 'No lo encuentras. Miradas raras en el vestuario.' }] },
        { l: 'Darle igual', fx: { teamConf: [1.02, 1] }, r: '«Que lo sepan: les vamos a ganar igual».' }
      ] },
    { id: 'documental', cat: 'prensa', tone: 'pos', who: 'c', p: 0.12, per: 'season', cd: 400,
      t: 'Una plataforma quiere grabar un documental', b: 'Una plataforma de streaming ofrece {x} por seguir al equipo con cámaras toda la temporada.',
      x: [0.4, 0.9],
      o: [
        { l: 'Aceptar', fx: { gain: 'x', fans: 0.01, teamConf: [0.98, 2] }, r: 'Dinero y fama. Las cámaras, un poco agobiantes.' },
        { l: 'Solo el vestuario no', fx: { gain: 0.15, fans: 0.004 }, r: 'Graban todo menos lo sagrado.' },
        { l: 'Rechazar', fx: { team: 2 }, r: 'El grupo agradece la intimidad.' }
      ] },
    { id: 'entrevista_buena', cat: 'prensa', tone: 'pos', who: 'p', if: { rating: [7, 10] }, p: 0.02, per: 'season', cdp: 400, news: 'club',
      t: '{s}, portada del diario deportivo', b: 'El diario deportivo dedica la portada a {n}: «El secreto mejor guardado de la liga».',
      o: [
        { l: 'Felicitarle', lF: 'Felicitarla', fx: { mor: 6, conf: [1.03, 2] }, r: 'Le brillan los ojos.' },
        { l: 'Que no se relaje', fx: { mor: 2, conf: [1.02, 2] }, r: 'Pies en el suelo. Bien.' }
      ] },

    // ============================================================ AFICIÓN
    { id: 'nino', cat: 'aficion', tone: 'pos', who: 'p', if: { rank: [0, 12] }, p: 0.02, per: 'season', cdp: 500, news: 'club',
      t: 'Un niño enfermo quiere conocer a {s}', b: 'Mateo, de 8 años, lleva meses en el hospital. Su sueño es conocer a {n}.',
      o: [
        { l: 'Que entrene con el equipo', fx: { fans: 0.008, team: 4, mor: 8 }, r: 'Mateo marca en el rondo. No hay un ojo seco.' },
        { l: 'Visita sorpresa al hospital', fx: { fans: 0.005, mor: 6, boss: 6 }, r: 'La foto del abrazo da la vuelta al país.' }
      ] },
    { id: 'pancarta', cat: 'aficion', tone: 'neg', who: 'p', if: { rating: [0, 6.3] }, p: 0.012, per: 'season', cdp: 300,
      t: 'Pancarta contra {s}', b: 'En el último partido, un grupo de aficionados desplegó una pancarta: «{s}, vete ya». Le ha dolido.',
      now: { mor: -8 },
      o: [
        { l: 'Defenderle en público', lF: 'Defenderla en público', fx: { mor: 8, boss: 10, fans: -0.002 }, r: 'Le arropas. Se siente protegido.', rF: 'La arropas. Se siente protegida.' },
        { l: 'Que conteste en el campo', odds: [{ p: 0.5, fx: { conf: [1.06, 2] }, r: 'Rabia convertida en fútbol.' }, { p: 0.5, fx: { conf: [0.94, 2] }, r: 'Le pesa demasiado.' }] }
      ] },
    { id: 'ultras', cat: 'aficion', tone: 'neg', who: 'c', p: 0.2, per: 'season', cd: 200,
      t: 'Los ultras piden una reunión', b: 'El grupo de animación quiere reunirse contigo «para hablar de la actitud del equipo». Exigen entradas más baratas.',
      o: [
        { l: 'Reunirte con ellos', odds: [{ p: 0.6, fx: { fans: 0.004, board: -1 }, r: 'Reunión tensa pero útil. La grada animará.' }, { p: 0.4, fx: { board: -3, team: -1 }, r: 'Reunión desastrosa. Amenazas incluidas.' }] },
        { l: 'Negarte', fx: { fans: -0.004, board: 1 }, r: 'Pitada en el próximo partido.' }
      ] },
    { id: 'invasion_entreno', cat: 'aficion', tone: 'neu', who: 'p', if: { rank: [0, 5] }, p: 0.012, per: 'season', cdp: 400,
      t: 'Un aficionado salta al entrenamiento', b: 'Un aficionado ha saltado la valla para pedirle una foto a {n}. Seguridad no sabe qué hacer.',
      o: [
        { l: 'Foto y autógrafo', fx: { fans: 0.003, mor: 3 }, r: 'Se va feliz. Y con la camiseta.' },
        { l: 'Entrenamientos a puerta cerrada', fx: { fans: -0.003, teamConf: [1.02, 1] }, r: 'Más concentración, menos cariño.' }
      ] },
    { id: 'canteranos', cat: 'aficion', tone: 'neu', who: 'c', if: { age: [16, 20] }, p: 0.2, per: 'season', cd: 300,
      t: 'La grada pide minutos para la cantera', b: 'Corea el estadio: «¡Queremos ver a {s}!». Los de la cantera piden paso.',
      o: [
        { l: 'Prometerle minutos', lF: 'Prometerle minutos', fx: { promise: true, mor: 10, fans: 0.004 }, r: 'La grada lo celebra.' },
        { l: 'Cuando esté preparado', fx: { fans: -0.002, mor: -2 }, r: 'Algún pitido. Tú sabrás.' }
      ] },
    { id: 'peña', cat: 'aficion', tone: 'pos', who: 'p', if: { rank: [0, 6], rating: [6.8, 10] }, p: 0.02, per: 'season', cdp: 500, news: 'club',
      t: 'Nace una peña con el nombre de {s}', b: 'Un grupo de aficionados ha fundado la peña «{s}» en un bar del barrio. Quieren que vaya a la inauguración.',
      o: [
        { l: 'Que vaya con un compañero', fx: { mor: 8, fans: 0.004, team: 2 }, r: 'Noche de bocadillos y fotos.' },
        { l: 'Que envíe un vídeo', fx: { mor: 4, fans: 0.002 }, r: 'Lo ponen en bucle toda la noche.' }
      ] },

    // ============================================================ CLUB
    { id: 'presidente_fichaje', cat: 'club', tone: 'neu', who: 'c', if: null, club: { window: true }, p: 0.25, per: 'season', cd: 200,
      t: 'El presidente quiere un fichaje mediático', b: 'El presidente te llama: quiere un nombre que venda camisetas este mercado. «Tú verás cómo lo encajas».',
      o: [
        { l: 'Comprometerte a buscarlo', fx: { board: 3 }, r: 'El presidente sonríe. Ahora hay que encontrarlo.' },
        { l: 'Defender tu proyecto', odds: [{ p: 0.6, fx: { board: 1, team: 2 }, r: 'Respeta tu criterio.' }, { p: 0.4, fx: { board: -4 }, r: 'No le gusta que le lleven la contraria.' }] }
      ] },
    { id: 'patrocinador_pelo', cat: 'club', tone: 'neu', who: 'c', p: 0.12, per: 'season', cd: 400,
      t: 'Un patrocinador quiere teñir al equipo', b: 'Una marca de tinte ofrece {x} si toda la plantilla se tiñe el pelo de rubio para el próximo partido.',
      x: [0.1, 0.3],
      o: [
        { l: 'Aceptar', odds: [{ p: 0.6, fx: { gain: 'x', team: 3, fans: 0.003 }, r: 'Rubios platino. La foto es histórica.' }, { p: 0.4, fx: { gain: 'x', team: -2 }, r: 'Cobras, pero medio vestuario se niega y hay malas caras.' }] },
        { l: 'Rechazar', fx: { board: -1 }, r: 'El director comercial llora en silencio.' }
      ] },
    { id: 'cesped', cat: 'club', tone: 'neg', who: 'c', p: 0.15, per: 'season', cd: 300,
      t: 'El césped de la ciudad deportiva, destrozado', b: 'Una plaga de hongos ha arrasado el campo de entrenamiento. O se arregla ya o tocará entrenar en el aparcamiento.',
      o: [
        { l: 'Arreglarlo ya', fx: { cost: 0.1 }, r: 'Césped nuevo en tres días.' },
        { l: 'Entrenar donde se pueda', fx: { teamFit: -4, team: -2 }, r: 'Ampollas y quejas.' }
      ] },
    { id: 'gripe', cat: 'club', tone: 'neg', who: 'c', p: 0.2, per: 'season', cd: 300,
      t: 'Brote de gripe en el vestuario', b: 'Media plantilla tiene fiebre. El médico recomienda parar dos días.',
      now: { teamFit: -8 },
      o: [
        { l: 'Dos días de descanso', fx: { teamFit: 5, teamConf: [0.98, 1] }, r: 'Se recuperan, pero sin preparar el partido.' },
        { l: 'Entrenar igual', fx: { teamFit: -4, team: -2 }, r: 'Se contagia el resto. Mal plan.' }
      ] },
    { id: 'alcalde', cat: 'club', tone: 'pos', who: 'c', p: 0.15, per: 'season', cd: 300,
      t: 'El alcalde quiere una foto con el equipo', b: 'El alcalde propone una recepción en el ayuntamiento. A cambio, ayudará con las obras del entorno del estadio.',
      o: [
        { l: 'Ir todos', fx: { board: 2, fans: 0.003, teamFit: -2 }, r: 'Fotos, discurso y canapés.' },
        { l: 'Solo el capitán y tú', fx: { board: 1 }, r: 'Visita breve y cordial.' }
      ] },
    { id: 'influencer', cat: 'club', tone: 'neu', who: 'c', p: 0.15, per: 'season', cd: 300,
      t: 'Un influencer quiere entrenar con el equipo', b: 'Un influencer con millones de seguidores quiere grabar un reto en vuestro entrenamiento.',
      o: [
        { l: 'Adelante', odds: [{ p: 0.6, fx: { fans: 0.008, gain: 0.03 }, r: 'Su vídeo es un éxito. Nuevos aficionados.' }, { p: 0.4, fx: { fans: 0.004, team: -2 }, r: 'Molesta más que ayuda. Los jugadores, hartos.' }] },
        { l: 'No, gracias', fx: { team: 1 }, r: 'Entrenamiento normal.' }
      ] },
    { id: 'intoxicacion', cat: 'club', tone: 'neg', who: 'c', p: 0.08, per: 'season', cd: 400,
      t: 'Intoxicación en el hotel', b: 'El marisco de la cena de concentración no estaba en buen estado. Varios jugadores han pasado mala noche.',
      now: { teamFit: -10 },
      o: [
        { l: 'Reclamar al hotel', fx: { gain: 0.04 }, r: 'El hotel paga. Pero el daño está hecho.' },
        { l: 'Cambiar de hotel para siempre', fx: { cost: 0.02, team: 2 }, r: 'Hotel nuevo, cocina de confianza.' }
      ] },
    { id: 'objeto_museo', cat: 'club', tone: 'pos', who: 'c', p: 0.15, per: 'season', cd: 400, give: 'item',
      t: 'Un hallazgo en el museo del club', b: 'Ordenando el almacén del museo, han aparecido {k}. Dicen que dan suerte.',
      o: [
        { l: 'Al vestuario', d: 'Se puede equipar a un jugador (Plantilla → Almas y objetos).', fx: { item: 'k' }, r: 'Ya forma parte del inventario.' },
        { l: 'Dejarlo en la vitrina', fx: { fans: 0.002 }, r: 'Los aficionados hacen cola para verlo.' }
      ] },
    { id: 'reliquias', cat: 'club', tone: 'neu', who: 'c', p: 0.15, per: 'season', cd: 300, give: 'item', x: [0.15, 0.4],
      t: 'Un coleccionista vende {k}', b: 'Un coleccionista de reliquias futbolísticas te ofrece {k} por {x}. Asegura que es auténtico.',
      o: [
        { l: 'Comprarlo ({x})', need: true, fx: { cost: 'x', item: 'k' }, r: 'Trato hecho. Al inventario.' },
        { l: 'Regatear', odds: [{ p: 0.5, fx: { cost: 0.08, item: 'k' }, r: 'Lo dejas a buen precio. Al inventario.' }, { p: 0.5, fx: {}, r: 'Se ofende y se va.' }] },
        { l: 'No interesa', fx: {}, r: 'Otra vez será.' }
      ] },

    // ============================================================ PARTIDOS ESPECIALES (desbloquean objetos)
    { id: 'pe_leyendas', cat: 'especial', tone: 'pos', who: 'c', p: 0.22, per: 'season', cd: 200, give: 'item',
      t: 'Las viejas glorias te desafían', b: 'Las leyendas retiradas de {c} os retan a un partido benéfico. Si les ganáis, os entregan {k}.',
      sm: { opp: 'Viejas glorias', rel: 0, win: 'item', fans: 0.003 },
      o: PLAY({ l: 'Rechazar la invitación', fx: { fans: -0.002 }, r: 'Las leyendas se quedan con las ganas.' }) },
    { id: 'pe_calle', cat: 'especial', tone: 'pos', who: 'c', p: 0.18, per: 'season', cd: 200, give: 'balon_calle',
      t: 'Reto callejero en la plaza', b: 'El mejor equipo de fútbol calle de la ciudad os desafía en la plaza mayor. El premio: {k}.',
      sm: { opp: 'Los reyes de la plaza', rel: -3, win: 'item', fans: 0.002 },
      o: PLAY({ l: 'No es nuestro estilo', fx: {}, r: 'Os llaman cobardes en redes.' }) },
    { id: 'pe_famosos', cat: 'especial', tone: 'pos', who: 'c', p: 0.15, per: 'season', cd: 200, give: 'item',
      t: 'Amistoso benéfico contra famosos', b: 'Actores, cantantes y algún exfutbolista os retan en un amistoso benéfico. El ganador se lleva {k}.',
      sm: { opp: 'Famosos solidarios', rel: -12, win: 'item', fans: 0.004 },
      o: PLAY({ l: 'Mandar solo una donación', fx: { cost: 0.03, fans: 0.002 }, r: 'Donación generosa. Sin partido.' }) },
    { id: 'pe_pretemporada', cat: 'especial', tone: 'pos', who: 'c', club: { wk: [0, 3] }, p: 0.6, per: 'season', once: true, give: 'trofeo_verano',
      t: 'Torneo relámpago de verano', b: 'Un club histórico os invita a su torneo de verano: un partido, a vida o muerte. El campeón se lleva {k}.',
      sm: { opp: 'Club histórico invitado', rel: 3, win: 'item', fans: 0.003 },
      o: PLAY({ l: 'Seguir con la pretemporada', fx: { teamFit: 4 }, r: 'Más rodaje en casa.' }) },
    { id: 'pe_porteros', cat: 'especial', tone: 'pos', who: 'c', p: 0.1, per: 'season', cd: 300, give: 'guantes_final',
      t: 'Desafío del portero imbatible', b: 'Un portero retirado que nunca encajó un penalti en una final os reta a una tanda. Si le marcáis, os regala {k}.',
      sm: { opp: 'El portero imbatible', rel: 2, win: 'item' },
      o: PLAY({ l: 'Declinar', fx: {}, r: 'El portero se queda invicto. Y orgulloso.' }) },
    { id: 'pe_nieve', cat: 'especial', tone: 'pos', who: 'c', p: 0.1, per: 'season', cd: 300, club: { wk: [12, 26] }, give: 'item',
      t: 'Partido en la nieve', b: 'Un pueblo de montaña os invita a jugar en su campo nevado por las fiestas. Si ganáis, os dan {k}.',
      sm: { opp: 'Selección del valle', rel: -6, win: 'item', fans: 0.002 },
      o: PLAY({ l: 'Ni loco con este frío', fx: {}, r: 'El pueblo se queda sin fiesta.' }) },
    { id: 'pe_medianoche', cat: 'especial', tone: 'pos', who: 'c', club: { fan: true }, p: 0.25, per: 'season', cd: 200, give: 'soul',
      t: 'El equipo sin nombre', b: 'A medianoche aparece una nota en tu despacho: «Campo viejo. Hoy. Si ganáis, {k} será vuestra». Nadie sabe quién la dejó.',
      sm: { opp: 'El equipo sin nombre', rel: 4, win: 'soul' },
      o: PLAY({ l: 'Romper la nota', fx: {}, r: 'Al día siguiente, la nota ha vuelto a tu mesa.' }) },
    { id: 'pe_fantasmas', cat: 'especial', tone: 'pos', who: 'c', club: { fan: true }, p: 0.2, per: 'season', cd: 200, give: 'soul',
      t: 'Los fantasmas del estadio viejo', b: 'Los guardas juran que en el estadio abandonado se oyen balonazos de noche. Os retan a jugar. El premio: {k}.',
      sm: { opp: 'Los fantasmas del estadio viejo', rel: 6, win: 'soul' },
      o: PLAY({ l: 'Ni hablar', fx: { team: -1 }, r: 'El vestuario se queda con la duda.' }) },

    { id: 'pe_evasion', cat: 'especial', tone: 'pos', who: 'c', p: 0.12, per: 'season', cd: 300, give: 'espinilleras',
      t: 'Evasión o victoria', b: 'Un rodaje de época necesita un partido de verdad: los guardias de un campo de prisioneros contra los presos. Os toca hacer de presos. El premio: {k}.',
      sm: { opp: 'Los guardias del campo', rel: 3, win: 'item', fans: 0.003 },
      o: PLAY({ l: 'Nada de rodajes', fx: {}, r: 'El director busca a otro equipo.' }) },
    { id: 'pe_shaolin', cat: 'especial', tone: 'pos', who: 'c', p: 0.12, per: 'season', cd: 300, give: 'tacos_barro',
      t: 'Los monjes de la pierna de acero', b: 'Unos monjes bajan de la montaña y os retan: juegan con patadas de kung-fu y saltos imposibles. Si ganáis, os regalan {k}.',
      sm: { opp: 'Los monjes shaolin', rel: 2, win: 'item', fans: 0.003 },
      o: PLAY({ l: 'Mejor no', fx: {}, r: 'Los monjes se marchan levitando.' }) },
    { id: 'pe_dibujos', cat: 'especial', tone: 'pos', who: 'c', p: 0.1, per: 'season', cd: 300, give: 'gorra',
      t: 'El equipo de los dibujos animados', b: 'Un equipo juvenil que corre campos de diez kilómetros, remata de chilena desde cualquier sitio y tiene un portero con gorra os desafía. El premio: {k}.',
      sm: { opp: 'Los campeones de los dibujos', rel: 5, win: 'item', fans: 0.004 },
      o: PLAY({ l: 'Eso no es real', fx: {}, r: 'Se van corriendo. Todavía no han llegado a la otra portería.' }) },

    // ============================================================ LEYENDA (raros: 1 de cada 5 temporadas)
    { id: 'programa_ego', cat: 'leyenda', tone: 'neu', who: 'c', fixed: true, if: { line: 3, age: [16, 24], no: ['ego', 'egoTeam'] }, p: 0.2, per: 'season', once: true,
      t: 'Te invitan al programa del ego', b: 'Un programa experimental encierra durante dos semanas a los mejores delanteros jóvenes para fabricar al más egoísta del mundo. Quieren a {n}.',
      bF: 'Un programa experimental encierra durante dos semanas a las mejores delanteras jóvenes para fabricar a la más egoísta del mundo. Quieren a {n}.',
      o: [
        { l: 'Mandarle dos semanas', lF: 'Mandarla dos semanas', d: 'Se pierde unos partidos. Volverá distinto… y difícil de manejar.', dF: 'Se pierde unos partidos. Volverá distinta… y difícil de manejar.', fx: { away: 14, mor: 6, next: ['programa_vuelta', 14] }, r: 'Se marcha con la mochila. Os escribirá… o no.' },
        { l: 'Rechazar', fx: { mor: -4 }, r: 'Se queda con la duda de lo que podría haber sido.' }
      ] },
    { id: 'programa_vuelta', cat: 'leyenda', tone: 'neu', who: 'p', manual: true,
      t: '{s} vuelve del programa', b: '{n} ha vuelto con otra mirada. Dice que solo existe una cosa: el gol. Y que los demás están para dársela.',
      now: { trait: 'ego', ovr: 3, pot: 4 },
      var: [
        { w: 1, if: { fan: false } },
        { w: 1, if: { fan: true }, b: '{n} ha vuelto con otra mirada… y con algo dentro. En el programa despertó un alma hambrienta de gol.', now: { trait: 'ego', ovr: 3, pot: 4, soul: 'ego_absoluto', equip: true } }
      ],
      o: [
        { l: 'Reconducir ese ego poco a poco', odds: [{ p: 0.35, fx: { ego: true, boss: 8 }, r: 'Entiende que el ego también sirve al equipo.' }, { p: 0.65, fx: { boss: 4 }, r: 'Escucha. Pero sigue tirando desde todas partes.' }] },
        { l: 'Dejar que sea egoísta', fx: { conf: [1.07, 3], team: -2 }, r: 'Los goles llegarán. Las quejas, también.' }
      ] },
    { id: 'reencarnacion', cat: 'leyenda', tone: 'pos', who: 'c', fixed: true, if: { age: [16, 24], no: ['reborn'] }, p: 0.2, per: 'season', once: true,
      var: [
        { w: 1, if: { fan: false }, t: '¿Una leyenda reencarnada?', b: 'Los veteranos del club no dan crédito: {n} juega exactamente igual que una leyenda de otra época. Los mismos gestos, las mismas manías.',
          o: [
            { l: 'Dejar que fluya', d: 'Gana el arquetipo de una leyenda… y su sombra.', fx: { trait: 'reborn', ovr: 2, pot: 5, mor: 6 }, r: 'La prensa ya le llama «el elegido».', rF: 'La prensa ya la llama «la elegida».' },
            { l: 'Protegerle de las comparaciones', lF: 'Protegerla de las comparaciones', fx: { trait: 'reborn', pot: 3, boss: 10 }, r: 'Crece sin focos. Por ahora.' }
          ] },
        { w: 1, if: { fan: true }, t: 'Un alma antigua despierta en {s}', b: 'Durante el entrenamiento, {n} se ha quedado inmóvil. Al abrir los ojos ha dicho: «He vuelto». Desde entonces juega como una leyenda.',
          o: [
            { l: 'Aceptar el alma', d: 'Recibe un alma de leyenda ya equipada… y su sombra.', fx: { trait: 'reborn', ovr: 2, pot: 5, soul: 'random', equip: true }, r: 'El alma se asienta. Juega como nunca.' },
            { l: 'Buscar ayuda', fx: { trait: 'reborn', mor: 4, boss: 6 }, r: 'El alma se calma, pero no se va.' }
          ] }
      ],
      now: {} },
    { id: 'limit_break', cat: 'limit', tone: 'pos', who: 'p', manual: true, icon: '💥',
      t: '¡{s} rompe su límite!', b: 'Nadie lo vio venir. Minutos, confianza y una racha de resultados han despertado algo en {n}: ya no tiene techo.',
      o: [
        { l: '¡Vamos!', fx: { team: 3, fans: 0.004 }, r: 'El vestuario entero lo ha sentido.' },
        { l: 'Que siga con los pies en el suelo', fx: { boss: 8, conf: [1.04, 2] }, r: 'Asiente. Pero el aura no se apaga.' }
      ] },

    // ============================================================ FANTASÍA (solo con el modo fantasía)
    { id: 'alma_errante', cat: 'fantasia', tone: 'pos', who: 'c', if: {}, club: { fan: true }, p: 0.5, per: 'season', cd: 150, give: 'soul',
      t: 'Una luz en el campo de entrenamiento', b: 'Al caer la noche, una luz flota sobre el círculo central. Cuando te acercas, susurra un nombre: {k}. Parece buscar a {s}.',
      o: [
        { l: 'Que se una a {s}', fx: { soul: 'k', equip: true }, r: 'La luz entra en el pecho de {s}. El aura le envuelve.' },
        { l: 'Guardarla', d: 'Al inventario, para equiparla a quien quieras.', fx: { soul: 'k' }, r: 'La guardas en un frasco de cristal. Late.' }
      ] },
    { id: 'anciano', cat: 'fantasia', tone: 'neu', who: 'c', club: { fan: true }, p: 0.3, per: 'season', cd: 200, give: 'soul', x: [0.3, 0.7],
      t: 'El anciano del campo de tierra', b: 'Un anciano con gorra de lana te espera junto al campo de tierra. Te ofrece {k} por {x}. «No lo encontrarás en otra parte».',
      o: [
        { l: 'Pagar ({x})', need: true, fx: { cost: 'x', soul: 'k' }, r: 'El anciano sonríe y desaparece. El alma es tuya.' },
        { l: 'Retarle a un penalti', odds: [{ p: 0.4, fx: { soul: 'k' }, r: 'Le marcas. Se ríe y te la regala.' }, { p: 0.6, fx: { team: -1 }, r: 'Te para el penalti con la gorra. Se va con el alma.' }] },
        { l: 'Irte', fx: {}, r: 'Cuando miras atrás, ya no está.' }
      ] },
    { id: 'eclipse', cat: 'fantasia', tone: 'neu', who: 'c', club: { fan: true }, p: 0.2, per: 'season', cd: 300,
      t: 'Eclipse sobre el estadio', b: 'Un eclipse coincidirá con vuestro partido contra {r}. Los más supersticiosos del vestuario no quieren jugar.',
      o: [
        { l: 'Ritual de equipo', fx: { teamConf: [1.04, 1], team: 2 }, r: 'Velas, círculo en el césped y fe ciega.' },
        { l: 'Es solo astronomía', odds: [{ p: 0.5, fx: { teamConf: [1.02, 1] }, r: 'Tu calma los tranquiliza.' }, { p: 0.5, fx: { teamConf: [0.96, 1] }, r: 'No los convences. Saltan al campo con miedo.' }] }
      ] },
    { id: 'alma_rebelde', cat: 'fantasia', tone: 'neg', who: 'p', if: { soul: true, fan: true }, p: 0.15, per: 'quarter', cdp: 60,
      t: 'El alma de {s} se rebela', b: 'El alma que lleva {n} no le deja dormir. Quiere más protagonismo… o quiere irse.',
      o: [
        { l: 'Darle lo que pide', fx: { conf: [1.06, 2], team: -2, mor: -3 }, r: 'El alma ruge en el campo. El cuerpo lo acusa.' },
        { l: 'Calmarla con un ritual', fx: { cost: 0.02, mor: 4 }, r: 'Paz. Por ahora.' },
        { l: 'Separarla', d: 'Vuelve al inventario.', fx: { unsoul: true, mor: 6 }, r: 'Se separan. Respira aliviado.', rF: 'Se separan. Respira aliviada.' }
      ] },
    { id: 'vestuario_encantado', cat: 'fantasia', tone: 'neu', who: 'c', club: { fan: true }, p: 0.15, per: 'season', cd: 300,
      t: 'Voces en el vestuario', b: 'Por la noche, el vigilante oye cánticos de celebración en el vestuario vacío. Cuentan que son los campeones de hace cien años.',
      o: [
        { l: 'Dejar una camiseta para ellos', fx: { teamConf: [1.03, 2], fans: 0.002 }, r: 'A la mañana siguiente, la camiseta está doblada. Y firmada.' },
        { l: 'Llamar a un exorcista', fx: { cost: 0.02, team: -1 }, r: 'Silencio total. Y un poco de tristeza.' }
      ] },
    { id: 'alma_despierta', cat: 'fantasia', tone: 'pos', who: 'p', if: { soul: true, fan: true, rating: [7, 10] }, p: 0.15, per: 'season', cdp: 300,
      t: 'El alma de {s} despierta del todo', b: 'Tras una racha de partidos enormes, el alma de {n} y su cuerpo ya son uno. Su aura se ve desde la grada.',
      o: [
        { l: 'Celebrarlo', fx: { ovr: 2, mor: 8, fans: 0.004 }, r: 'Media +2. El aura brilla más que nunca.' },
        { l: 'Entrenarla aún más', fx: { pot: 3, fit: -6 }, r: 'Potencial +3, pero acaba agotado.', rF: 'Potencial +3, pero acaba agotada.' }
      ] }
  ];

  // ------------------------------------------------------------ Objetos (en los dos modos): todos son guiños
  // a momentos míticos del fútbol, al anime, al cine y a los videojuegos.
  // eff: los mismos efectos que los rasgos (shot, conv, assist, fouled, save, mid, att, def, team, foul, card). gk: true solo porteros, false nunca porteros.
  const ITEMS = {
    botas_oro: { name: 'La Bota de Oro', icon: '👟', gk: false, w: 1, desc: 'La que se gana marcando más goles que nadie en Europa. Pesa, pero mete.', eff: { conv: 1.06 } },
    guantes_final: { name: 'La Mano Celestial', icon: '🧤', gk: true, w: 1, desc: 'Unos guantes con una mano dorada pintada. Dicen que paran hasta los tiros que arden.', eff: { save: 0.93 } },
    brazalete: { name: 'El brazalete del capitán de los dibujos', icon: '🎗️', w: 1, desc: 'El de aquel capitán de anime que cruzaba campos de diez kilómetros sin despeinarse. Une al equipo.', eff: { team: 1.006 } },
    espinilleras: { name: 'La camiseta de Evasión o victoria', icon: '👕', w: 1, desc: 'De aquel partido contra los guardias de un campo de prisioneros. Con ella puesta, nadie se rinde.', eff: { def: 0.3, team: 1.003 } },
    amuleto: { name: 'La Mano de Dios', icon: '✋', gk: false, w: 0.8, desc: 'Un guante viejo de México 86. Marcas goles que no deberían subir… y algún árbitro se mosquea.', eff: { conv: 1.05, card: 1.15 } },
    balon_calle: { name: 'El balón amigo', icon: '⚽', gk: false, w: 0.8, desc: '«El balón es mi amigo». Pegado al pie: más regate y más faltas recibidas.', eff: { fouled: 1.3, conv: 1.02 } },
    trofeo_verano: { name: 'La Orejona de juguete', icon: '🏆', w: 0.6, desc: 'Una réplica de la copa de las orejas grandes. Quien la custodia se cree invencible.', eff: { team: 1.004, conv: 1.02 } },
    cinta_pelo: { name: 'Las botas del Panenka', icon: '🥾', gk: false, w: 1, desc: 'Para quien se atreve a picarla en el penalti decisivo. Sangre fría de cara a puerta.', eff: { conv: 1.04, assist: 1.05 } },
    silbato: { name: 'El silbato del calvo temido', icon: '📯', w: 0.7, desc: 'De aquel árbitro calvo que te miraba con los ojos muy abiertos y te callabas. Quien lo lleva ve menos tarjetas.', eff: { card: 0.7 } },
    tacos_barro: { name: 'La pierna de acero', icon: '🦵', gk: false, w: 0.8, desc: 'La del monje que chutaba balones hasta convertirlos en cometas. Disparo brutal.', eff: { shot: 1.2, conv: 1.03 } },
    gorra: { name: 'La gorra del portero imbatible', icon: '🧢', gk: true, w: 0.7, desc: 'Un portero de dibujos jamás se la quitaba y no encajaba ni un gol desde fuera del área.', eff: { save: 0.95 } },
    reloj: { name: 'El reloj del 92:48', icon: '⏱️', gk: false, w: 0.7, desc: 'Se paró en el minuto de aquel cabezazo en una final que parecía perdida. Más disparos con fe.', eff: { shot: 1.15 } },
    cartel: { name: 'El cartel de BELIEVE', icon: '🪧', w: 0.8, desc: 'Un folio amarillo pegado con celo encima de la puerta del vestuario. Contagia fe a todos.', eff: { team: 1.004, mid: 0.2 } },
    balon_oro: { name: 'El Balón de Oro', icon: '🥇', w: 0.35, desc: 'Lo que todos sueñan y casi nadie toca. Quien lo tiene en la taquilla juega como el mejor del mundo.', eff: { conv: 1.04, assist: 1.1, team: 1.003 } },
    bufanda: { name: 'La bufanda del Maracanazo', icon: '🧣', w: 0.8, desc: 'De la tarde en que un estadio de doscientas mil personas enmudeció. Rinde cuando nadie da un duro por vosotros.', eff: { def: 0.3, conv: 1.02 } }
  };

  // ------------------------------------------------------------ Almas (solo en modo fantasía): apodos de leyendas y héroes del anime
  // line: líneas donde rinde entera (0 portero · 1 defensa · 2 medio · 3 delantero); fuera, a medias. c/c2: colores del aura.
  const SOULS = {
    emperador: { name: 'El alma del Káiser', icon: '👑', c: '#ffd23f', c2: '#ff9f1a', line: [1, 2], starter: true, desc: 'El líbero que defendía como un emperador y salía jugando con la cabeza alta.', eff: { def: 0.7, mid: 0.5, assist: 1.25 } },
    fantasma: { name: 'El alma del Fenómeno', icon: '💫', c: '#c9d6ff', c2: '#7c8cff', line: [3], starter: true, desc: 'Arranca y nadie le alcanza: bicicletas, recortes y gol. Eso sí, no baja a defender.', eff: { shot: 1.4, conv: 1.12, def: -0.3 } },
    dragon: { name: 'El alma del Tigre', icon: '🐯', c: '#ff5a3d', c2: '#ffb03b', line: [2, 3], desc: 'El delantero de los dibujos que reventaba redes con su disparo del tigre. Le hacen muchas faltas.', eff: { conv: 1.1, shot: 1.3, fouled: 1.3 } },
    muralla: { name: 'El alma de la Araña Negra', icon: '🕷️', c: '#8fe3ff', c2: '#3aa0ff', line: [0], starter: true, desc: 'Vestía de negro y parecía tener ocho brazos. El único portero con Balón de Oro.', eff: { save: 0.82 } },
    bailarin: { name: 'El alma del Pibe de Oro', icon: '🌟', c: '#ff7ad9', c2: '#b05cff', line: [2, 3], desc: 'Regate imposible y genio del barrio. Les vuelve locos… y alguna tarjeta cae.', eff: { fouled: 1.7, conv: 1.06, assist: 1.25, card: 1.1 } },
    berserker: { name: 'El alma de Ringhio', icon: '🐺', c: '#ff3b3b', c2: '#8a0000', line: [1, 2], desc: 'El perro de presa que gruñía en cada balón dividido. Arrasa en los duelos y colecciona tarjetas.', eff: { def: 0.8, att: 0.4, foul: 1.8, card: 1.6 } },
    oraculo: { name: 'El alma del Arquitecto', icon: '📐', c: '#b48cff', c2: '#5d3bff', line: [2], desc: 'Barba, calma y pases de cuarenta metros al pie. Ve la jugada antes de que pase.', eff: { assist: 1.7, mid: 0.7 } },
    ego_absoluto: { name: 'El alma del Egoísta Definitivo', icon: '🔷', c: '#4dd2ff', c2: '#0057ff', line: [3], hidden: true, desc: 'Salió de la jaula de los delanteros: solo existe el gol. Los demás, decorado.', eff: { shot: 1.9, conv: 1.12, assist: 0.35 } },
    leon: { name: 'El alma de la Saeta Rubia', icon: '🏹', c: '#ffb347', c2: '#ff6a00', line: [1, 2, 3], desc: 'Estaba en todas partes: defendía, creaba y marcaba. Contagia a todo el equipo.', eff: { team: 1.008, att: 0.3, mid: 0.3 } },
    relampago: { name: 'El alma del Flaco', icon: '🧠', c: '#f4ff5e', c2: '#ff8a00', line: [2, 3], desc: 'Fútbol total: cada pase, una lección; cada giro, un truco con su nombre.', eff: { mid: 0.6, assist: 1.3, att: 0.3 } },
    gato: { name: 'El alma del Portero Imbatible', icon: '🧢', c: '#9be15d', c2: '#00b36b', line: [0], desc: 'Juró que no le meterían un gol desde fuera del área. Y casi lo cumple.', eff: { save: 0.88, team: 1.003 } },
    general: { name: 'El alma de Tarzán', icon: '🦁', c: '#e0e0e0', c2: '#8a9bb0', line: [1], desc: 'Melena al viento y el pecho por delante en cada balón. Ordena la defensa como un ejército.', eff: { def: 1, team: 1.004 } },
    pulga: { name: 'El alma de la Pulga', icon: '🐜', c: '#7fd1ff', c2: '#ff3b6b', line: [2, 3], desc: 'Pequeño, pegado al balón e imparable en el uno contra uno. Asiste tanto como marca.', eff: { conv: 1.08, assist: 1.3, fouled: 1.4 } },
    rey: { name: 'El alma del Rey', icon: '♛', c: '#ffe066', c2: '#2fd17c', line: [3], starter: true, desc: 'Mil goles y tres Mundiales. Con él en el campo, el equipo entero se cree campeón.', eff: { conv: 1.1, shot: 1.2, team: 1.005 } },
    divino: { name: 'El alma del Divino', icon: '🎗️', c: '#a0e7ff', c2: '#3a6bff', line: [2, 3], desc: 'Coleta, zurda y elegancia. Genio puro… que a veces falla el penalti que más importa.', eff: { conv: 1.08, assist: 1.2 } },
    ibra: { name: 'El alma de Ibracadabra', icon: '🦒', c: '#ffd0a0', c2: '#ff5a00', line: [3], desc: 'Taekwondo, chilenas imposibles y un ego que no cabe en el estadio. Lo dice él: no necesita a nadie.', eff: { shot: 1.6, conv: 1.12, assist: 0.6 } }
  };

  window.TL_EVENTOS = { cats: CATS, events: EVENTS, items: ITEMS, souls: SOULS };
})();
