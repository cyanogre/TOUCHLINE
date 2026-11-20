# El partido 2D: cómo piensa cada equipo y cómo se narra

El motor (`js/engine.js`) decide lo que cuenta en el acta minuto a minuto: goles, tiros, faltas, tarjetas, córners, fueras de juego y posesión.
El campo 2D (`js/pitch.js`) lo enseña. Entre medias, el **cerebro táctico** (`js/brain2d.js`) hace que los 22 jueguen al fútbol.
La **radio** (`js/radio.js`) cuenta cada acción como un narrador.

## Fases de juego

Cada equipo está siempre en una fase, y la fase cambia cómo se coloca y qué decide.

| Con balón | Sin balón |
| --- | --- |
| **Salida** (tercio propio): centrales abiertos al borde del área, pivote que se ofrece, laterales en banda | **Presión tras pérdida** (unos 4 s): la más cercana muerde, otra tapa el pase fácil |
| **Progresión** (tercio medio): interiores entre líneas, extremo o lateral dando amplitud | **Presión alta**: cada una se pega a su par en la salida rival |
| **Último tercio**: punta al primer palo, extremo lejano al segundo, mediapunta al punto de penalti, interior en la frontal | **Bloque** bajo, medio o alto según la mentalidad: tres líneas a unos 10–12 m que basculan hacia el balón |
| **Contraataque**: tras robar con el rival descolocado, desmarques a la espalda y balón al espacio | **Repliegue**: si quedan pocas por detrás del balón, todas corren hacia su portería |

## Estructura

- **Cinco carriles verticales.** En cada banda la amplitud la da el extremo o el lateral (se alternan: rotaciones). Los interiores se colocan en los pasillos interiores y la punta fija a los centrales en la línea del fuera de juego. Detrás del balón siempre queda una vigilancia (centrales y pivote).
- **Línea defensiva viva.** Sube cuando el balón está presionado y baja cuando la poseedora tiene tiempo y viene de cara. Nunca queda por delante del balón.
- **Cada una a su ritmo.** Cada jugadora sigue su sitio con su propio retraso: el bloque no se mueve a la vez como una ficha.

## Decisiones con balón

Cada opción se valora así: *probabilidad de que salga bien × lo que vale el sitio al que va el balón − lo que cuesta perderlo ahí*. Las opciones son:

- pase al pie o al espacio;
- cambio de orientación;
- envío largo;
- conducción;
- regate;
- centro;
- despeje;
- aguantar.

Los factores que entran en juego:

- **Si llega el pase.** Para cada rival se calcula si alcanza la línea de pase antes que el balón: reacción (mejor cuanto más defiende), arrancada con aceleración limitada y velocidad punta (como los modelos de *pitch control* con datos de tracking). Los pases por alto solo se pueden cortar al salir y al caer.
- **Lo que vale cada sitio.** Una aproximación propia del *expected threat* (xT): sube de forma continua hacia la portería rival y se concentra en el centro.
- **Estilo.**
  - Los equipos de toque castigan más perderla.
  - Los directos buscan antes el balón largo.
  - Las buenas pasadoras eligen casi siempre la mejor opción; las demás, a veces otra.
- **Duelos.** Las entradas en juego abierto son limpias. Las faltas las decide el motor y se cometen en el siguiente choque real entre esos equipos.

## Sin balón

- **Apoyos.** Se buscan huecos con espacio y con la línea de pase limpia, y las compañeras más cercanas los ocupan.
- **Desmarques.**
  - De ruptura: arrancan en línea, nunca en fuera de juego.
  - Desdoblamientos del lateral.
  - Llegadas desde segunda línea.
  - La punta que baja a recibir.
- **Presión.** Presión con cobertura; marcas por el lado de la portería cuando el balón se acerca al área; seguimiento de desmarques; la punta tapa el pase al mediocentro rival (sombra).

## Reglamento (IFAB)

- **Fuera de juego.** Penúltima rival o balón, nunca en campo propio. Se juzga al golpear: no se le pasa a quien está adelantada, ni en centros ni en despejes.
- **Saques.**
  - De banda: lo saca quien no la tocó, donde salió.
  - De puerta: las rivales fuera del área hasta que el balón está en juego.
  - Córner: si la última en tocarla fue una defensa.
- **Faltas.** Una falta que el motor no ha pitado como penalti nunca se señala dentro del área.
- **Árbitros.**
  - El árbitro sigue la diagonal.
  - Los jueces de línea van a la altura de la penúltima defensa.

## Las jugadas del motor nacen del juego

Cuando el motor dice que hay una ocasión, una falta, un córner o un fuera de juego, antes de escenificarlo **el equipo protagonista lo busca jugando**:

- recupera el balón;
- progresa hasta la zona;
- la que va a cometer la falta llega a su par.

La escena arranca desde ahí: el pase final a la rematadora, el centro desde la banda, el rechace de la portera…

Si en unos segundos no se llega, hay un **corte de realización** (con destello, como en la tele) al momento de la jugada.

La posesión que se ve tiende a la del motor: un pequeño «gobernador» hace que cueste un poco más mantener el balón al equipo que lo tiene más de lo que dicen las estadísticas.

## Narración

- **Directo.** Bajo el campo, cada acción contada como en la radio: «¡Cambio de orientación de Bernardo! Aparece Doku en la otra banda».
- **Crónica por jugada.** En la narración, una entrada por posesión que crece mientras dura: «Recupera Rodri. Rodri, Bernardo, Foden… ¡Pase al hueco de Foden para Haaland!».
- **Apuntes tácticos.** Por ejemplo: «Alsimal se repliega en bloque bajo», «Presión tras pérdida del City».
- **Eventos del motor.** Se cuentan **cuando se ven**: el gol, cuando entra; la tarjeta, cuando la enseña el árbitro. Las pausas automáticas saltan en ese momento.
- **Idiomas.** Todas las frases están traducidas al inglés, francés, alemán e italiano (`data/i18n/radio.js`).

## Ritmo

Cada minuto del reloj deja ver un rato de juego antes de avanzar. Las jugadas del motor alargan su minuto.

| Velocidad | Duración aproximada del partido |
| --- | --- |
| x1 | ~8–9 min |
| x2 | ~5 min |
| x4 | ~3,5 min |
| x8 | ~1,7 min |
| x16 | ~1 min |

## Fuentes

- IFAB, *Laws of the Game* y guía de colocación de los árbitros: https://theifab.com/laws/latest/guidelines/positioning-movement-and-teamwork
- FIFA Training Centre, bloque medio y compactación (Mundial 2022): https://www.fifatrainingcentre.com/en/fwc2022/technical-and-tactical-analysis/controlling-the-game-without-the-ball--the-mid-block-and-compactness.php
- FIFA Training Centre, ocupación de los cinco carriles: https://www.fifatrainingcentre.com/en/game/tournaments/olympic-football-tournament/moft/occupying-the-five-channels-in-the-opponents-half.php
- Disparadores de presión: https://breakingthelines.com/@btl/pressing-triggers-in-elite-football-and-how-they-shape-defensive-strategy
- Karun Singh, *Introducing Expected Threat (xT)*: https://karun.in/blog/expected-threat.html
- W. Spearman (2018), *Beyond Expected Goals* (modelo de control del campo), y los tutoriales *Friends of Tracking* de Laurie Shaw.
- CIES Football Observatory, longitud media de pase por equipo: https://football-observatory.com/IMG/sites/b5wp/2021/wp358/en/
- RoboCup 2D (agent2d/HELIOS, Pyrus2D), Google Research Football y los datos de muestra de Metrica Sports (velocidades y aceleraciones reales).

Todo el código es propio. No se ha copiado código de esos proyectos, solo ideas y parámetros públicos.
