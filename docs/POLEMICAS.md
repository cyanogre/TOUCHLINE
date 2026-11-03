# Polémicas, incidentes y disciplina: probabilidades del juego

Touchline simula lo que pasa alrededor del fútbol: tarjetas, errores arbitrales,
incidentes en la grada y escándalos fuera del campo. Las cifras están en
`js/events-data.js` y son **estimaciones de diseño** calibradas con datos
públicos. No son estadísticas oficiales: sirven para que la frecuencia "se
sienta" real.

## 1. En el campo (por partido)

Valores medidos simulando temporadas completas de LALIGA EA SPORTS con el motor
del juego, comparados con referencias reales aproximadas.

| Métrica | Touchline | Referencia real (élite europea) |
|---|---|---|
| Goles | 2,6–2,7 | 2,5–2,9 |
| Faltas | ~24 | LaLiga 24–26 · Premier ~21 |
| Amarillas | ~4,0 | LaLiga 4,5–5 · Premier 3,5–4,2 |
| Rojas (directas + doble amarilla) | ~0,19 | 0,1–0,25 |
| Penaltis señalados | ~0,3 | 0,25–0,35 |
| Goles de falta directa | ~0,06 | 0,04–0,07 |
| Goles anulados (fuera de juego/VAR) | ~0,14 | 0,1–0,15 |
| Fueras de juego | ~4 | 3,5–4,5 |

Mecánicas:
- **Faltas:** las comete sobre todo el equipo sin balón, y más con mentalidad defensiva y en los últimos 15 minutos.
- **Amarillas:** dependen del árbitro, de los que hay tres perfiles (permisivo, normal o estricto). Un jugador amonestado se contiene y comete menos faltas.
- **Ciclo de amarillas:** cada 5 amarillas, 1 partido de sanción.
- **Rojas y sanciones:** doble amarilla o roja directa, 1–2 partidos. Agresión a un rival, 3. Encararse o insultar al árbitro, 4. Agredir al árbitro, 12.
- **Árbitro:** cada uno tiene una tasa de error. Puede no pitar un penalti claro, anular un gol legal, dar por bueno un gol en fuera de juego o pitar un penalti inexistente.
- **VAR:** existe en ligas con recursos y corrige la mayoría de errores, aunque no todos.
- **Tanganas:** tras una entrada dura puede haber empujones entre ambos equipos, con amarillas para los dos.

## 2. En la grada (por partido)

| Incidente | Prob. por partido | Por club y temporada* | Consecuencia |
|---|---|---|---|
| Insultos o cánticos violentos denunciados | 10% | ~85% | Multa |
| Insultos racistas (protocolo activado) | 1,5% | ~25% | Multa fuerte, posible cierre de grada, −confianza |
| Bengalas / pirotecnia | 5% | ~60% | Multa |
| Lanzamiento de objetos | 4% | ~53% | Multa |
| Invasión de campo | 3% | ~43% | Multa |
| Pelea de ultras en los alrededores | 0,8% | ~14% | Multa |
| Al menos un incidente de tu afición | — | **~99%** | — |

\* Por club y temporada, contando que el incidente lo provoca la afición de ese
club (≈80% local), en 38 jornadas.

En el fútbol femenino, estos incidentes se multiplican por 0,3.

Referencia: LaLiga publica cada temporada entre 50 y 99 denuncias por cánticos
que incitan a la violencia o la intolerancia, y alrededor de una decena de casos
de insultos racistas. Con 380 partidos por temporada, eso da del 13% al 26% de
partidos con cánticos denunciados y en torno al 2,5% con racismo.

Si un club acumula 2 o más incidentes en una temporada, puede sufrir un **cierre
parcial del estadio**: la asistencia baja a la mitad en el siguiente partido en
casa.

## 3. Conducta de los jugadores en el campo

| Incidente | Prob. por partido | Por club y temporada |
|---|---|---|
| Agresión a un rival (puñetazo) | 0,5% | ~9% |
| Encararse o insultar al árbitro | 0,4% | ~7% |
| Agresión al árbitro | 0,015% | **~0,3%** |

La agresión a un árbitro es rarísima en la élite (en Turquía, 2023, fue un
presidente quien agredió a un colegiado), pero existe. Si la sufre tu club,
genera multa, caída de afición, pérdida de confianza y posible retirada de
patrocinadores.

## 4. Fuera del campo (por club y temporada)

Probabilidad de que ocurra **al menos una vez** a algún jugador de una plantilla
de unos 25. El juego la reparte por semanas: `1 − (1 − p)^(1/jornadas)`.

| Evento | Prob. temporada | Aprox. por jugador | Ajustes |
|---|---|---|---|
| Indisciplina (llegar tarde, saltarse normas) | 35% | 1,7% | |
| Polémica en redes sociales | 30% | 1,4% | más en jóvenes |
| Fiesta en mal momento (tras derrota o lesionado) | 20% | 0,9% | |
| Petición de salida / rebeldía | 18% | 0,8% | más con moral baja |
| Choque público con el entrenador | 15% | 0,7% | más con moral baja |
| Pelea en el entrenamiento | 10% | 0,4% | |
| Pulso del representante por el sueldo | 8% | 0,3% | |
| Infracción de tráfico grave / alcoholemia | 6% | 0,25% | ×0,2 en femenino |
| Robo en casa del jugador | 4% | 0,16% | |
| Investigación fiscal | 3% | 0,12% | **×2 en España** |
| Detención por pelea fuera del campo | 2,5% | 0,1% | ×0,2 en femenino |
| Apuestas deportivas (expediente) | 2% | 0,08% | 45% acaba en sanción de 8–24 partidos |
| Violencia de género (denuncia) | 2% | 0,08% | ×0,2 en femenino |
| Accidente de tráfico con lesión | 1,5% | 0,06% | |
| Acusación de agresión sexual | 1,5% | 0,06% | ×0,2 en femenino |
| Positivo por dopaje | 0,8% | 0,03% | suspensión de 10–38 partidos |
| Positivo por drogas recreativas | 0,8% | 0,03% | suspensión de 4–12 partidos |

Eventos positivos, que también dan realismo:

| Evento | Prob. temporada |
|---|---|
| Hito personal (100/200/300 partidos) | 35% |
| Acción solidaria | 30% |
| Paternidad o maternidad | 25% |
| Elegido favorito de la afición | 20% |

### Resumen por temporada (club medio de LaLiga, sin habilidades)

- **Algún problema extradeportivo:** ~84%. En la vida real casi todos los clubes tienen alguno cada año.
- **Escándalo grave** (tribunales, dopaje, drogas, violencia, detención, accidente): ~16%, es decir, uno cada 6 temporadas aproximadamente.
- **Problemas negativos esperados:** ~1,6 por temporada.

### Referencias usadas

- **Dopaje:** según los informes de la AMA (WADA), entre el 0,3% y el 0,5% de las muestras de fútbol dan un resultado analítico adverso. Muchos de esos casos tienen exención terapéutica, así que las sanciones reales son menos. La estimación por jugador y temporada queda en torno al 0,03–0,05%.
- **Racismo y violencia en estadios:** comunicados de LaLiga sobre denuncias por temporada. Fueron unas 50 de media por cánticos violentos o intolerantes, y 99 en la temporada más reciente que cita. A eso se suma una decena de casos de racismo al año.
- **Tarjetas:** ESPN publica las estadísticas de tarjetas de LaLiga 2025/26. Hay equipos entre 1,5 y 2,9 amarillas por partido, es decir, entre 3 y 5,8 por encuentro.
- **Escándalos judiciales, apuestas y fiscales:** frecuencia estimada a partir de los casos mediáticos de las grandes ligas de los últimos años: investigaciones fiscales en España, expedientes por apuestas en Inglaterra e Italia, y causas por violencia de género y agresión sexual. La cifra resultante es de 2 a 5 casos graves al año entre unos 2.500 jugadores de élite.

## 5. Decisiones y cómo reducir el riesgo

Cada polémica de tu club llega al buzón con opciones: multar, apartar del
equipo, apoyar, rescindir, recurrir, quejarse del árbitro, etc. Cada opción
afecta de forma distinta a la moral, la afición, la directiva y los
patrocinadores.

Formas de reducir el riesgo:
- **Habilidades del mánager:**
  - Código de conducta: −15% de escándalos por nivel.
  - Gestión de egos: −15% de conflictos de vestuario por nivel.
  - Gabinete de crisis: −20% de impacto por nivel.
  - Juego limpio: −8% de tarjetas por nivel.
- **Programa social de la fundación (marketing):** amortigua el daño de los escándalos y reduce un poco su probabilidad.
- **Moral alta:** los jugadores contentos protagonizan menos peticiones de salida, choques con el entrenador e indisciplinas.

En el juego, **Club → Resumen → Riesgo de polémicas** muestra las
probabilidades de la temporada actual ya ajustadas por tus habilidades.
