# TOUCHLINE — Football Manager

Juego de gestión de fútbol para móvil (de momento en HTML responsive) con los
jugadores reales del dataset **EA SPORTS FC 27** (19.789 jugadores, 702 clubes).

## Jugar online (GitHub Pages)

La web queda en `https://cyanogre.github.io/TOUCHLINE/`. Hay dos formas de
publicarla, en **Settings → Pages → Build and deployment → Source**:

- **GitHub Actions** (recomendado): el workflow `.github/workflows/pages.yml` publica en cada push a `main` solo los archivos del juego (unos 10 MB con la música) y versiona el caché sin conexión.
- **Deploy from a branch** (`main`, carpeta `/ (root)`): GitHub publica el repositorio tal cual, incluidos los CSV y el zip. También funciona. En este modo el workflow detecta la configuración y se salta la publicación sin dar error.

Una vez publicado, se puede **instalar en el móvil** (Añadir a pantalla de
inicio) y funciona **sin conexión** gracias al service worker (`sw.js`).

## Jugar en local

Abre `index.html` en el navegador. No hace falta compilar nada. También
funciona con doble clic (`file://`), aunque se recomienda un servidor local:

```bash
python3 -m http.server 8000
```

Después entra en <http://localhost:8000>.

### Qué incluye

- **Nueva partida:** fútbol masculino (34 ligas jugables) o femenino (5 ligas), elige liga y club.
- **Partido en directo con vista 2D creíble:** cada jugador tiene un papel (bloque que sube y baja con el balón, presión, coberturas, marcajes, desmarques al espacio) y se cansa (más lento, con gotas de sudor). El balón tiene altura y sombra: pases rasos, globos, centros, cabezazos, voleas, vaselinas y disparos lejanos. En el campo están el árbitro (en diagonal), los jueces de línea con banderín, el cuarto árbitro con la tablilla, los banquillos con suplentes que calientan, las asistencias y los dos entrenadores (tú, «TÚ»). Las jugadas a balón parado se colocan como en la tele: córners con el área llena (el portero sube si vas a la desesperada), faltas con barrera a 9,15 m, penaltis con todos fuera del área, saques de banda, de puerta y de centro. Hay segadas, tarjetas mostradas por el árbitro, protestas, tanganas, VAR, fueras de juego, celebraciones en el banderín y cámara lenta con zoom en los momentos épicos. El reloj espera mientras se ve la jugada.
- **Rivales con su propio entrenador** (`js/coach.js`): estilo, sistema favorito, capacidad de adaptarse y de preparar partidos. Su plan no se conoce hasta que empieza el partido; reacciona al marcador y a las expulsiones, y puede ser destituido. Los sistemas chocan entre sí (puntas contra centrales, bandas, centro del campo).
- **Competiciones continentales** (`js/cups.js`): Copa de Campeones de Europa y Copa Continental (32 clubes), y copas de campeones de América y Asia (16). Se clasifican los mejores de cada liga; eliminatorias a ida y vuelta entre semana, final a partido único, premios, títulos e historial.
- **Vestuario** (`js/locker.js`): rasgos de jugador (con guiños al fútbol del manga), joyas de la cantera con ADN de leyenda cada 5-10 temporadas, padrinos veteranos que pasan al cuerpo técnico, reuniones de despacho, barbacoas, días libres y concentraciones, relaciones entre compañeros y con el míster, y cesiones.
- **Historial de traspasos** de la temporada (Mercado → Historial) y **campo minimizable** durante el partido para leer la narración.
- **Repaso del Profe, siempre después del partido:** qué hizo el rival, el choque de sistemas, cómo llegó cada equipo, si hubo suerte (goles esperados) y qué habría funcionado mejor sabiéndolo ya. No hay pronósticos previos.
- **Controles del partido:**
  - Velocidades **x1, x2, x4, x8 y x16**.
  - **Saltar** al próximo momento clave, al descanso, a los minutos 60/75/85 o al final.
  - **Pausas automáticas** configurables (goles, rojas, lesiones, penaltis, VAR, grada) con decisiones rápidas.
  - **Charla del descanso**, cambio de **sistema** y de mentalidad en pleno partido, y 5 cambios.
- **Reglamento y arbitraje:**
  - Faltas, amarillas (con ciclo de 5) y rojas con sanciones según la gravedad.
  - Penaltis y faltas directas.
  - Árbitros con perfil y errores, VAR y fueras de juego.
  - Tanganas, agresiones e incidentes de grada (racismo, bengalas, objetos, invasiones).
- **Noticias y polémicas:**
  - Crónicas, goleadas, campanadas, hat-tricks, fichajes y rumores.
  - Escándalos de vestuario y extradeportivos (indisciplina, redes, fiesta, tráfico, Hacienda, apuestas, dopaje, drogas, violencia, agresión sexual…) con probabilidades realistas por temporada. Ver [docs/POLEMICAS.md](docs/POLEMICAS.md).
  - Las polémicas de tu club llegan como **decisiones** con consecuencias.
- **Moral** de los jugadores (minutos, resultados, contrato, escándalos), que afecta al rendimiento.
- **Mánager:** experiencia, niveles y **árbol de habilidades** con 6 ramas (táctica, motivación, preparación física, cantera, negocios, disciplina).
- **Comercial:**
  - Afición y TV.
  - **Patrocinios** (camiseta, proveedor técnico, naming del estadio, secundarios). Pueden ser estables, por objetivos o arriesgados; los de criptomonedas y apuestas pueden quebrar, y las apuestas están prohibidas en España e Italia.
  - Merchandising, **precio de entradas**, **campañas de marketing** y **gira de pretemporada**.
  - **Préstamos** con interés según tu deuda y **ampliación del estadio**.
- **Carrera de mánager:**
  - Tienes una reputación que sube y baja con tus resultados.
  - Al acabar cada temporada pueden llegarte **ofertas de otros clubes**: aceptas y cambias de club conservando tu nivel y tus habilidades.
  - Si te destituyen, la partida no termina: te llaman clubes más modestos. Si es a mitad de temporada, equipos de tu liga que van mal.
- **Presupuestos con lógica:**
  - El presupuesto salarial lo fija la directiva con tus **ingresos recurrentes** (TV, patrocinios, merchandising, taquilla) y una parte de tus **ahorros**. Sube si ganas dinero, firmas patrocinios o vendes jugadores, y baja si gastas en fichajes.
  - Puedes **subir sueldos a costa del dinero de fichajes**: la ampliación salarial reserva ese dinero hasta final de temporada.
  - Los ingresos dependen de la **talla del club**, que cambia despacio, y no de la media del momento.
- **Tácticas:** 8 formaciones, once ideal, adaptación por puesto, mentalidad y cambios automáticos.
- **Mercado:**
  - Buscador con filtros, incluido "lo que puedo pagar".
  - Negociación, agentes libres, transferibles, ofertas de la IA, venta rápida y rescisión.
  - Ventanas de fichajes en verano e invierno.
- **Temporadas:**
  - Clasificación, goleadores, ascensos y descensos.
  - Evolución de los jugadores, retiradas, cantera y renovaciones.
  - Objetivos de la directiva: te pueden destituir.
- **Tutorial guiado** la primera vez (inicio y primer partido). Se puede repetir desde Club → Partida.
- **Sonido:**
  - Efectos sintetizados con Web Audio, sin archivos: silbato, gol con rugido de la grada, abucheos, tarjetas, monedas y subida de nivel.
  - Ambiente de estadio durante el partido.
  - La música arranca sola al empezar o continuar partida y baja de volumen durante los partidos.
- **Interfaz con efectos:** botones con relieve, brillo y onda al pulsar, partículas y confeti en goles, fichajes, patrocinios, victorias y subidas de nivel, y animaciones de entrada.
- **Escudos reales** de primeras divisiones europeas (≈300 clubes masculinos y 50 femeninos), cargados desde el repositorio público [luukhopman/football-logos](https://github.com/luukhopman/football-logos) vía jsDelivr. Si un club no está o no hay conexión, se usa el escudo generado. Los escudos son marcas registradas de sus clubes: no se copian en este repositorio, solo se enlazan.
- **Guardado automático**, exportar e importar partida, y banda sonora por momentos de la temporada (`assets/music/`: el tema del juego y una carpeta por momento).

La evaluación del juego desde el punto de vista de un jugador de Football
Manager y la hoja de ruta están en [docs/EVALUACION.md](docs/EVALUACION.md).

## Estructura

```
index.html               Entrada del juego
sw.js                    Service worker (offline / app instalable)
manifest.webmanifest     Manifest PWA
.github/workflows/       Publicación automática en GitHub Pages
css/styles.css           Estilos mobile-first (barra inferior en móvil, lateral en escritorio)
js/formulas.js           Fórmulas compartidas juego/Node: valor, salario, potencial, contrato
js/util.js               Azar, formato de dinero/fechas, escudos y colores de club
js/events-data.js        Probabilidades de incidentes y polémicas (calibradas)
js/manager.js            Experiencia, niveles y árbol de habilidades del mánager
js/world.js              Mundo, plantillas mínimas, economía base, guardar/cargar
js/engine.js             Motor de partido: faltas, tarjetas, árbitro, VAR, penaltis, charla, táctica
js/season.js             Calendario, clasificación, jornada, fin de temporada, evolución
js/market.js             Fichajes, ventas, contratos e IA de mercado (fichan según su línea más floja)
js/coach.js              Entrenadores de la IA, choque de sistemas y repaso del partido
js/locker.js             Vestuario: rasgos, joyas, padrinos, despacho, actividades, relaciones, cesiones
js/cups.js               Copas continentales
js/commerce.js           Afición, patrocinios, marketing, entradas, préstamos, estadio
js/news.js               Noticias, polémicas, moral y decisiones
js/game.js               Orquestación: carga de datos, partida, buzón, guardado
js/ui.js                 Interfaz (vistas, fichas, club, mánager, asistente)
js/matchview.js          Partido en directo (controles, pausas, decisiones)
js/pitch.js              Vista 2D del partido (canvas)
js/sfx.js                Efectos de sonido sintetizados (Web Audio)
js/fx.js                 Partículas, confeti, ondas y sacudidas
js/tutorial.js           Tutorial guiado
tools/build-crests.js    Asocia clubes con escudos reales
data/game/crests.js      Tabla club → escudo (URL en jsDelivr)
assets/flags/            Banderas SVG (flag-icons, licencia MIT)
tools/build-data.js      Genera los datos del juego desde data/players.csv
data/players.csv         Dataset original (extraído de EA_FC_ANALYSIS-main.zip)
data/players_clean.csv   Dataset limpio y enriquecido
data/game/men.js         Datos compactos del juego (masculino)
data/game/women.js       Datos compactos del juego (femenino)
docs/                    Evaluación y tabla de polémicas
```

Para regenerar los datos tras cambiar el CSV o las fórmulas:

```bash
node tools/build-data.js
```

Para regenerar la tabla de escudos (`data/game/crests.js`):

```bash
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/luukhopman/football-logos fl
```

```bash
(cd fl && git -c core.quotepath=off ls-tree -r --name-only HEAD | grep '\.png$') > tree.txt
```

```bash
node tools/build-crests.js tree.txt "$(git -C fl rev-parse HEAD)"
```

Para volver a copiar las banderas (opcional), descarga `flag-icons` y pasa su carpeta:

```bash
npm pack flag-icons && tar xzf flag-icons-*.tgz
```

```bash
FLAG_ICONS_DIR=package/flags/4x3 node tools/build-data.js
```

## Correcciones aplicadas al dataset

| Problema en el original | Solución |
|---|---|
| `common_name` vacío en el 85% de jugadores | Nombre visible = `common_name` o `first_name + last_name`; nombre corto para el campo |
| Porteros: `pace…physicality` contienen en realidad DIV/HAN/KIC/REF/SPD/POS | Se etiquetan como estadísticas de portero (`card_stat_labels` en el CSV limpio) |
| `height_cm` y `weight_kg` vacíos en todas las filas | Se eliminan (no se inventan) |
| Sin edad | Calculada al 1-jul-2026 desde `birthdate` |
| Sin valor de mercado, salario, contrato ni potencial | Estimados con fórmulas deterministas (`js/formulas.js`) según media, edad, posición y riqueza de la liga |
| Economía femenina en la misma escala que la masculina | Escala propia (valores ×0,015, salarios ×0,04) |
| "Ligas" que son copas (CONMEBOL) o con 1–4 clubes | Marcadas como no jugables; sus jugadores siguen disponibles en el mercado |
| Plantillas incompletas (p. ej. Sabadell con 11 jugadores) | El juego completa hasta 22 jugadores y mínimos por línea con jugadores ficticios de la cantera |
| Sin estadios | Aforo y precio de entrada generados según el nivel del club y la liga |
| Nacionalidades en inglés y banderas emoji (no se ven en Windows) | Traducidas al español con bandera SVG local |

Los clubes y traspasos son los del snapshot de EA del 12-09-2026; no se han
cotejado con fuentes externas.
