/* TOUCHLINE — «La escuela del Profe»: lecciones para aprender a jugar (y a ganar)
 * aunque no sepas nada de fútbol. Cada lección la cuenta el Profe y acaba con una
 * pregunta de repaso. Los datos de tácticas salen del propio motor del juego. */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U;

  const LESSONS = [
    {
      id: 'basics', icon: '⚽', title: 'El fútbol en 2 minutos', sum: 'Cómo se gana un partido y cómo se gana una liga: puntos y clasificación.',
      lines: [
        'Empecemos por el principio. Juegan **dos equipos de 11**: un portero y diez jugadores de campo. Gana quien marque **más goles en 90 minutos**.',
        'En la liga cada partido da **puntos**: **3 por ganar, 1 por empatar y 0 por perder**. Todos juegan contra todos, una vez en casa y otra fuera.',
        'La **clasificación** ordena por puntos. Si dos equipos empatan, va delante el de mejor **diferencia de goles** (marcados menos recibidos) y luego el que más goles ha marcado.',
        'Al acabar la temporada, el primero es **campeón**. En muchas ligas los últimos **descienden** (zona roja) y los primeros de la categoría inferior **ascienden** (zona verde).',
        { text: 'Tu trabajo no es ganar siempre: es cumplir el **objetivo de la directiva**. Si piden mitad de tabla, un 9º puesto es un éxito.', emo: 'proud' }
      ],
      quiz: { q: 'Pregunta de repaso: ¿cuántos puntos da un **empate**?', options: ['1 punto', '3 puntos', 'Ninguno'], ok: 0,
        yes: '¡Exacto! Y no lo desprecies: diez empates son diez puntos.', no: 'Casi. Un empate da **1 punto**; la victoria, 3; la derrota, 0.' }
    },
    {
      id: 'positions', icon: '🧩', title: 'Las posiciones', sum: 'Qué hace cada jugador: POR, DFC, LD, MCD, MC, MCO, ED, DC…',
      lines: [
        '**POR** es el portero. Detrás de él solo está la portería, así que más vale que sea bueno.',
        'Los defensas: **DFC** son los centrales y **LD/LI** los laterales (derecho e izquierdo), que defienden la banda y suben a centrar.',
        'El centro del campo: **MCD** es el escudo delante de la defensa, **MC** reparte juego y **MCO** es el creativo que da los últimos pases. **MD/MI** juegan pegados a la banda.',
        'Arriba: **ED/EI** son los extremos, rápidos y regateadores, y **DC** el delantero centro, el que tiene que meterla.',
        { text: 'La **media** de un jugador va de 0 a 99. Pero ojo: fuera de su puesto rinde menos. En Tácticas, un número en **amarillo** significa «este no es su sitio».', emo: 'thinking' }
      ],
      quiz: { q: '¿Quién protege a la defensa desde el centro del campo?', options: ['El MCD', 'El DC', 'El ED'], ok: 0,
        yes: 'Eso es. Un buen MCD vale su peso en oro.', no: 'Ese es el **MCD**, el mediocentro defensivo.' }
    },
    {
      id: 'engine', icon: '📈', title: 'Cómo se gana un partido aquí', sum: 'Ataque contra defensa, forma física, moral, campo y azar.',
      lines: [
        'Te voy a contar el secreto del juego. En cada minuto se compara tu **ataque** con la **defensa** del rival, y al revés. Cuanto mayor es la diferencia, más ocasiones.',
        'El **ataque** sale sobre todo de delanteros y medios. La **defensa**, de defensas, medios y portero. Los **medios** cuentan para las dos cosas y además dan **posesión**.',
        'Cada jugador rinde según su **media**, si juega **en su puesto**, su **forma física** y su **moral**. Uno reventado de cansancio puede rendir un 10% menos.',
        'Jugar **en casa** da ventaja. Y luego está el **azar**: un equipo peor puede ganarte un día. Por eso cuenta la temporada entera, no un partido.',
        { text: 'Y enfrente hay **otro entrenador**. Elige su sistema según su estilo, cómo llega su plantilla y lo que te vio hacer la última vez. **No sabrás qué plantea hasta que empiece el partido**: ni tú ni yo.', emo: 'thinking' },
        { text: 'Resumen: pon a tus mejores jugadores **en su puesto**, **descansados** y **contentos**. Lo demás es afinar.', emo: 'proud' }
      ],
      quiz: { q: '¿Qué línea cuenta a la vez para atacar y para defender?', options: ['Los medios', 'Los delanteros', 'El portero'], ok: 0,
        yes: 'Así es. Quien manda en el centro del campo, manda en el partido.', no: 'Son los **medios**: suman en ataque, en defensa y en posesión.' }
    },
    {
      id: 'formations', icon: '📋', title: 'Formaciones: cuál usar', sum: 'Qué aporta cada sistema y cuándo te conviene.',
      lines: [
        'Regla del motor: cada **defensa por encima de 4** suma defensa, cada **delantero por encima de 2** suma ataque y cada **medio por encima de 4** suma posesión.',
        'Además los sistemas **chocan**: dos puntas contra dos centrales te dan ventaja (contra tres, no); los extremos castigan a quien tiene pocos laterales; y quien mete más gente en el centro, **tiene el balón**.',
        '**4-2-3-1**: la más equilibrada, con dos pivotes que protegen y un mediapunta. Si no sabes qué poner, pon esta.',
        '**4-3-3**: ofensiva y con amplitud. Necesita **extremos buenos** (ED/EI). **4-4-2**: sencilla y sólida, con dos puntas y dos interiores en banda.',
        '**4-5-1**: muchos medios, mucha posesión, poco gol. Ideal contra rivales **mejores** que tú. **4-1-2-1-2** (rombo): todo por el centro, para equipos con muchos MC y MCO.',
        '**3-5-2** domina el medio, pero necesita tres centrales buenos. **3-4-3** es ataque total, para **remontar**. **5-3-2** es el «autobús»: para **guardar una ventaja** o sobrevivir ante un gigante.',
        { text: 'La mejor formación es la que pone a **tus mejores jugadores en su puesto**. Y después de cada partido, en Tácticas, te dejo mi **repaso**: qué hizo el rival y qué nos habría ido mejor.', emo: 'thinking' }
      ],
      quiz: { q: 'Ganas 1-0 en el minuto 80 contra un rival mejor. ¿Qué haces?', options: ['Paso a 5-3-2 y mentalidad defensiva', 'Paso a 3-4-3 ofensivo', 'No toco nada nunca'], ok: 0,
        yes: '¡Muy bien! A veces ganar es saber sufrir.', no: 'Yo cerraría: **5-3-2 y mentalidad defensiva** para proteger el resultado.' }
    },
    {
      id: 'ingame', icon: '🎙️', title: 'Gestionar el partido', sum: 'Mentalidad, charla del descanso, cambios y expulsiones.',
      lines: [
        '**Mentalidad ofensiva**: generas un 15% más de peligro, pero te llegan un 12% más. **Defensiva**: marcas menos, pero encajas un 20% menos. Equilibrada: ni una cosa ni otra.',
        'Truco de veterano: si **pierdes**, ofensiva desde el minuto 60. Si **ganas**, defensiva a partir del 75.',
        'En el **descanso**, la charla: ganando, **elogia**; empatando o perdiendo por uno, **exige más**; perdiendo por dos o más, **tranquilidad** (si les aprietas se bloquean).',
        'Tienes **5 cambios**. Entre el 60 y el 75 saca a los **cansados**, a los **amonestados** (una segunda amarilla te deja con diez) y a los **lesionados** cuanto antes.',
        { text: 'Si te expulsan a uno, **reorganiza**: quita un delantero y pasa a 4-5-1 o 5-3-2. Con diez no se puede ir a por todas… salvo que no haya otra.', emo: 'worried' }
      ],
      quiz: { q: 'Pierdes 2-0 al descanso. ¿Qué charla das?', options: ['Tranquilidad', 'Exigir más', 'Elogiar'], ok: 0,
        yes: 'Eso es. Un vestuario nervioso no remonta nada.', no: 'Con 2-0 en contra, mejor **tranquilidad**: si les aprietas, se bloquean.' }
    },
    {
      id: 'squad', icon: '💪', title: 'Cuidar la plantilla', sum: 'Forma física, rotaciones, moral, tarjetas y contratos.',
      lines: [
        'Cada partido gasta entre 10 y 16 puntos de **forma física**, y en una semana se recupera más o menos lo mismo. Si un jugador baja del **75%**, dale descanso.',
        'La **moral** sube con victorias y minutos, y baja si un buen jugador se queda sin jugar o si hay líos. Jugadores contentos rinden más y dan menos problemas.',
        'Tarjetas: **5 amarillas** acumuladas son 1 partido de sanción. Una roja, de 1 a 12 partidos según lo que haya hecho.',
        { text: 'Y los **contratos**: si acaban este verano y no renuevas, el jugador se va **gratis**. Renueva pronto a los buenos.', emo: 'worried' }
      ],
      quiz: { q: '¿Cuándo conviene dar descanso a un jugador?', options: ['Cuando baja del 75% de forma', 'Nunca, los buenos juegan siempre', 'Solo si está lesionado'], ok: 0,
        yes: 'Correcto. Rotar a tiempo evita lesiones y bajones.', no: 'Mejor rotar cuando baja del **75% de forma**: rinde menos y se lesiona más.' }
    },
    {
      id: 'money', icon: '💰', title: 'Dinero y mercado', sum: 'Presupuestos, valor de los jugadores y cómo fichar con cabeza.',
      lines: [
        'Tienes dos presupuestos: el de **fichajes** (para traspasos) y el **salarial** (lo que puedes pagar cada semana). Ninguno se puede superar.',
        'El **valor** de un jugador depende de su media, su **edad** y su **potencial (POT)**. Un chaval de 19 con mucho potencial vale mucho; uno de 33, cada vez menos.',
        'Jugada maestra: **compra jóvenes** con potencial y **vende veteranos** antes de que bajen. Los **agentes libres** no cuestan traspaso, solo sueldo.',
        { text: 'Para ganar dinero sin jugar: **patrocinios**, **marketing** y la **gira de pretemporada**. Los préstamos, solo si es imprescindible.', emo: 'thinking' }
      ],
      quiz: { q: '¿Qué jugador suele ser mejor inversión?', options: ['Joven con potencial alto', 'Veterano de 33 años', 'El más caro del mercado'], ok: 0,
        yes: 'Así se construyen los equipos grandes.', no: 'Mejor el **joven con potencial**: mejora cada año y su valor sube.' }
    },
    {
      id: 'progress', icon: '🚀', title: 'Cómo progresar', sum: 'Objetivos, experiencia, habilidades, reputación y un plan a tres años.',
      lines: [
        'La **directiva** te juzga por su objetivo. Cúmplelo y su confianza sube; fállalo y baja. A cero, te despiden.',
        'Cada partido te da **experiencia**. Al subir de nivel ganas **puntos de habilidad** (Club → Mánager). Para empezar: **Pizarra** (rendimiento), **Charla de vestuario** y **Prevención** (menos lesiones).',
        'Tu **reputación** sube con buenas temporadas, y con ella llegan **ofertas de clubes mejores** al final de cada año.',
        { text: 'Plan a tres años: el **primero**, cumplir y aprender; el **segundo**, vender bien y fichar con cabeza; el **tercero**, pelear arriba. Y mima la **cantera**: los chavales crecen si juegan.', emo: 'proud' }
      ],
      quiz: { q: '¿Qué pasa si la confianza de la directiva llega a cero?', options: ['Te destituyen', 'Nada', 'Te dan más dinero'], ok: 0,
        yes: 'Exacto. Pero tranquilo: siempre habrá algún club que te llame.', no: 'Te **destituyen**. Ojo con eso.' }
    },
    {
      id: 'losing', icon: '🩹', title: 'Si pierdes partidos', sum: 'Lista de comprobación para salir de una mala racha sin agobiarte.',
      lines: [
        { text: 'Lo primero: **tranquilo**. Hasta los mejores equipos pierden uno de cada cuatro o cinco partidos. Una racha mala no es el fin del mundo.', emo: 'worried' },
        'Repasa esto en orden: 1) ¿Algún número en **amarillo** en Tácticas? Ese jugador está fuera de su puesto. 2) ¿Hay jugadores con poca **forma física**? Rota.',
        '3) ¿La **moral** está baja? Gana un partido fácil, habla con el vestuario o dales minutos a los descontentos. 4) ¿El rival es mucho mejor? **Mentalidad defensiva** y a la contra.',
        '5) Lee mi **repaso** del último partido en Tácticas: si fue mala suerte, un mal planteamiento o que el rival vino mejor preparado. 6) En el próximo mercado, refuerza la **línea más floja**.',
        { text: 'Y gasta tus **puntos de habilidad**. Un mánager que aprende es un mánager que gana. Ánimo, míster.', emo: 'happy' }
      ],
      quiz: { q: 'Vas en mala racha. ¿Qué miras primero?', options: ['Jugadores fuera de su puesto o cansados', 'Cambiar de club', 'Vender a todos'], ok: 0,
        yes: 'Bien. Los detalles ganan partidos.', no: 'Empieza por lo básico: **jugadores fuera de su puesto o cansados**.' }
    }
  ];

  const GLOSSARY = [
    ['MED (media)', 'Nivel general del jugador, de 0 a 99.'],
    ['POT (potencial)', 'Hasta dónde puede llegar. En jugadores de otros clubes ves un rango aproximado.'],
    ['RIT · TIR · PAS · REG · DEF · FÍS', 'Ritmo, tiro, pase, regate, defensa y físico: las seis medias de la carta.'],
    ['EST · PAR · SAQ · REF · VEL · COL', 'Las del portero: estirada, paradas, saque, reflejos, velocidad y colocación.'],
    ['Nota', 'Puntuación de un jugador en un partido, de 0 a 10. 7 es buen partido; 8 o más, partidazo.'],
    ['MVP', 'El mejor jugador del partido.'],
    ['Diferencia de goles (DG)', 'Goles marcados menos goles recibidos. Desempata la clasificación.'],
    ['Fuera de juego', 'Un atacante no puede recibir el balón por detrás de la defensa rival en el momento del pase. El gol se anula.'],
    ['Penalti', 'Falta dentro del área: tiro desde 11 metros solo contra el portero. Se marcan unos 3 de cada 4.'],
    ['Falta directa', 'Falta cerca del área que se puede tirar a puerta.'],
    ['VAR', 'Árbitros de vídeo que revisan goles, penaltis y rojas. Corrigen casi todo… casi.'],
    ['Ciclo de amarillas', 'Cada 5 amarillas acumuladas, 1 partido de sanción.'],
    ['Mercado / ventana', 'Periodos en los que se pueden hacer traspasos: verano (hasta la jornada 3) e invierno (a mitad de liga).'],
    ['Agente libre', 'Jugador sin club: se ficha sin pagar traspaso, en cualquier momento.'],
    ['Presupuesto salarial', 'Lo máximo que puedes pagar en sueldos cada semana.'],
    ['Confianza', 'Lo contenta que está la directiva contigo. A cero, despido.']
  ];

  function st(S) { return TL.Mentor.state(S); }

  function play(id) {
    const L = LESSONS.find(x => x.id === id);
    const S = TL.Game.S;
    if (!L) return;
    const q = L.quiz;
    const lines = L.lines.slice();
    lines.push({ text: q.q, emo: 'thinking', choices: q.options.map((label, k) => ({
      label, value: k,
      fx: s => {
        if (!s) return;
        const m = st(s);
        m.lessons = m.lessons || {};
        const prev = m.lessons[id];
        m.lessons[id] = k === q.ok ? 'perfect' : (prev === 'perfect' ? 'perfect' : 'done');
        if (!prev) { TL.Manager.addXp(s, k === q.ok ? 20 : 10); TL.Mentor.trust(s, 1); }
        if (k === q.ok) { TL.SFX.success(); TL.FX.confetti({ palette: 'green' }); }
        TL.Game.save();
      },
      reply: { text: k === q.ok ? q.yes : q.no, emo: k === q.ok ? 'happy' : 'neutral' }
    })) });
    TL.UI.closeSheet();
    TL.Mentor.say(lines, { dim: true, voice: 'secreto' }).then(() => { if (S) { TL.UI.refresh(); TL.UI.celebrate && TL.UI.celebrate(S); } });
  }

  function plain(t) { return U.esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  function read(id) {
    const L = LESSONS.find(x => x.id === id);
    const S = TL.Game.S;
    if (!L) return;
    TL.UI.sheet(TL.UI.sheetHead(`${L.icon} ${U.esc(L.title)}`) +
      L.lines.map(l => `<p class="lesson-p">${plain(typeof l === 'string' ? l : l.text)}</p>`).join('') +
      `<div class="btn-row mt"><button class="btn primary" data-act="lesson-play" data-id="${id}">Que me lo cuente el Profe</button>
        <button class="btn" data-act="school">Volver</button></div>`);
    if (S) { const m = st(S); m.lessons = m.lessons || {}; if (!m.lessons[id]) m.lessons[id] = 'read'; }
  }

  function open() {
    const S = TL.Game.S;
    const done = S ? (st(S).lessons || {}) : {};
    const n = LESSONS.filter(l => done[l.id] && done[l.id] !== 'read').length;
    TL.UI.sheet(TL.UI.sheetHead('La escuela del Profe') +
      `<div class="school-head"><div class="vn-portrait sm"><div class="vn-face" id="school-face"></div></div>
        <p class="note" style="margin:0">Lecciones cortas para aprender a jugar y a ganar, aunque no sepas nada de fútbol. Cada una acaba con una pregunta: aciértala y ganas experiencia. <b>${n}/${LESSONS.length}</b> completadas.</p></div>
      ${LESSONS.map((l, k) => {
        const s = done[l.id];
        const badge = s === 'perfect' ? '<span class="tag new">✓ Perfecta</span>' : s === 'done' ? '<span class="tag list">✓ Hecha</span>' : s === 'read' ? '<span class="tag exp">Leída</span>' : '';
        return `<div class="lesson"><div class="lesson-ic">${l.icon}</div><div class="grow"><b>${k + 1}. ${U.esc(l.title)}</b> ${badge}<div class="note">${U.esc(l.sum)}</div>
          <div class="btn-row" style="margin-top:6px"><button class="btn sm primary" data-act="lesson-play" data-id="${l.id}">Escuchar</button>
          <button class="btn sm ghost" data-act="lesson-read" data-id="${l.id}">Leer</button></div></div></div>`;
      }).join('')}
      <div class="group-title">Glosario</div>
      <div class="glossary">${GLOSSARY.map(([k, v]) => `<div><b>${U.esc(k)}</b><span>${U.esc(v)}</span></div>`).join('')}</div>`);
    const face = document.getElementById('school-face');
    if (face) { if (open._face) open._face.destroy(); open._face = new TL.Mentor.Face(face); }
  }

  const A = TL.UI.actions;
  A.school = () => open();
  A['lesson-play'] = el => play(el.dataset.id);
  A['lesson-read'] = el => read(el.dataset.id);

  TL.School = { LESSONS, GLOSSARY, open, play, read };
})();
