# TOUCHLINE — Football Manager

Juego de gestión de fútbol para móvil (de momento en HTML responsive) con los
jugadores reales del dataset **EA SPORTS FC 27** (19.789 jugadores, 702 clubes).

## Cómo jugar

Abre `index.html` en el navegador. No hace falta compilar nada. También
funciona con doble clic (`file://`), aunque se recomienda un servidor local:

```bash
python3 -m http.server 8000
```

Después entra en <http://localhost:8000>. Desde el móvil, en la misma red, usa la
IP del ordenador. Se puede "añadir a pantalla de inicio" (manifest PWA incluido).

### Qué incluye

- **Nueva partida**: fútbol masculino (34 ligas jugables) o femenino (5 ligas), elige liga y club.
- **Partidos en directo** con narración, estadísticas, alineaciones, cambios
  manuales (5) y mentalidad en tiempo real. También hay **resultado rápido**.
- **Tácticas**: 8 formaciones, once ideal automático, elección de jugador por
  puesto con su % de adaptación, mentalidad y cambios automáticos.
- **Plantilla**: forma física, lesiones, sanciones, contratos y estadísticas de temporada.
- **Mercado**: buscador con filtros (posición, media, edad, valor, liga) y
  negociación (oferta, contraoferta y contrato). Incluye agentes libres, lista
  de transferibles, ofertas de la IA, venta rápida y rescisión. Hay ventanas de
  fichajes en verano e invierno.
- **Temporadas**: calendario a doble vuelta (una sola vuelta en ligas de más de 24
  equipos), clasificación, goleadores y ascensos y descensos entre divisiones
  (Inglaterra, España, Italia, Alemania y Francia). Al final de cada temporada
  hay evolución de jugadores, retiradas, cantera y renovaciones.
- **Club**: finanzas (taquilla, comercial y TV, premios, salarios, traspasos),
  estadio renombrable, directiva con objetivo y confianza (te pueden destituir)
  e historial.
- **Guardado automático** en el navegador, con exportación e importación a archivo `.json`.
- **Música** de fondo (`Strategic Swing.mp3`), que se activa y desactiva desde la barra superior.

## Estructura

```
index.html              Entrada del juego
css/styles.css          Estilos mobile-first (barra inferior en móvil, lateral en escritorio)
js/formulas.js          Fórmulas compartidas juego/Node: valor, salario, potencial, contrato
js/util.js              Azar, formato de dinero/fechas, escudos y colores de club
js/world.js             Construcción del mundo, plantillas mínimas, economía, guardar/cargar
js/engine.js            Formaciones, alineaciones y motor de partido minuto a minuto
js/season.js            Calendario, clasificación, jornada, fin de temporada, evolución
js/market.js            Fichajes, ventas, contratos e IA de mercado
js/game.js              Orquestación: carga de datos, partida, buzón, guardado
js/ui.js                Interfaz (vistas, fichas, asistente de nueva partida)
js/matchview.js         Partido en directo
tools/build-data.js     Genera los datos del juego desde data/players.csv
data/players.csv        Dataset original (extraído de EA_FC_ANALYSIS-main.zip)
data/players_clean.csv  Dataset limpio y enriquecido
data/game/men.js        Datos compactos del juego (masculino)
data/game/women.js      Datos compactos del juego (femenino)
```

Para regenerar los datos tras cambiar el CSV o las fórmulas:

```bash
node tools/build-data.js
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
| Nacionalidades en inglés | Traducidas al español con bandera |

Los clubes y traspasos son los del snapshot de EA del 12-09-2026; no se han
cotejado con fuentes externas.
