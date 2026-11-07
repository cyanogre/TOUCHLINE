# Competiciones internacionales — especificación para la IA del juego

> Documento interno. La columna "Equivalencia real" sirve solo para entender el formato: **nunca debe aparecer en el juego**.

| Nombre en el juego | Equivalencia real (solo referencia) | Formato principal |
|---|---|---|
| Campions | UEFA Champions League | 36 en fase de liga, 8 partidos |
| Euroleague | UEFA Europa League | 36 en fase de liga, 8 partidos |
| Rising League | UEFA Conference League | 36 en fase de liga, 6 partidos |
| Eurosupercopa | UEFA Super Cup | partido único |
| Liberadores | CONMEBOL Libertadores | 3 fases previas + 8 grupos de 4 |
| Latinoamericana | CONMEBOL Sudamericana | primera fase nacional + 8 grupos de 4 |
| Recopa Latina | Recopa Sudamericana | ida y vuelta |
| Asia Élite | AFC Champions League Elite | 2 regiones de 16, 8 partidos |
| Copa de Campeones del Norte | Concacaf Champions Cup | eliminatorias |
| África Masters (desactivada) | CAF Champions League | grupos de 4 |
| Intercontinental Planeta | FIFA Intercontinental Cup | partidos únicos |

## 1. Reglas generales

- **eliminatoria ida vuelta uefa**: Sin valor doble de goles fuera. Empate global -> prórroga 2x15 -> penaltis.
- **eliminatoria ida vuelta conmebol**: Sin valor doble de goles fuera. Empate global -> penaltis directamente (sin prórroga).
- **partido unico**: Empate -> prórroga 2x15 -> penaltis (salvo que se indique lo contrario).
- **desempate fase liga uefa**: puntos, diferencia de goles, goles a favor, goles a favor fuera, victorias, victorias fuera, puntos de los rivales, diferencia de goles de los rivales, goles a favor de los rivales, puntos disciplinarios (menos es mejor), coeficiente de club
- **desempate grupos conmebol**: puntos, diferencia de goles, goles a favor, goles a favor fuera, sorteo
- **sin copa nacional**: El juego no tiene copas nacionales: toda plaza de "campeón de copa" pasa al mejor clasificado de liga que aún no tenga plaza (regla real cuando el campeón de copa ya está clasificado).
- **plaza ya ocupada**: Si un club ya está clasificado para una competición superior (o como campeón vigente), su plaza pasa al siguiente clasificado de su liga no clasificado.
- **ligas parciales**: BUL, AZE y FIN solo tienen 1 club en el juego: ese club es su campeón; el resto de plazas de esas asociaciones quedan vacantes.
- **vacantes**: Las plazas de asociaciones que no existen en el juego quedan vacantes y se cubren con el algoritmo de reequilibrio.

## 2. Campions / Euroleague / Rising League (fase principal: formato exacto)

| | Campions | Euroleague | Rising League |
|---|---|---|---|
| Equipos fase de liga | 36 | 36 | 36 |
| Partidos por equipo | 8 (4 casa / 4 fuera) | 8 | 6 (3 / 3) |
| Bombos | 4 de 9; 2 rivales por bombo | 4 de 9; 2 rivales por bombo | 6 de 6; 1 rival por bombo |
| 1º-8º | Octavos | Octavos | Octavos |
| 9º-24º | Play-off eliminatorias | Play-off eliminatorias | Play-off eliminatorias |
| 25º-36º | Eliminados | Eliminados | Eliminados |

- Sorteo de fase de liga: sin rivales de la misma asociación; máximo 2 rivales de una misma asociación.
- **Play-off de eliminatorias** (ida y vuelta, vuelta en casa del mejor clasificado): 9/10 vs 23/24 · 11/12 vs 21/22 · 13/14 vs 19/20 · 15/16 vs 17/18 (rival sorteado dentro de cada pareja).
- **Octavos**: 1/2 vs ganador (15/16-17/18) · 3/4 vs ganador (13/14-19/20) · 5/6 vs ganador (11/12-21/22) · 7/8 vs ganador (9/10-23/24).
- Cuadro fijo desde octavos hasta la final: 1º y 2º en mitades opuestas (igual 3º/4º, etc.). En octavos, cuartos y semis la vuelta se juega en casa del mejor clasificado en la fase de liga.
- Final: partido único en sede neutral. Desempates de la tabla: puntos, diferencia de goles, goles a favor, goles a favor fuera, victorias, victorias fuera, puntos de los rivales, diferencia de goles de los rivales, goles a favor de los rivales, puntos disciplinarios (menos es mejor), coeficiente de club.

### Flujo de eliminados entre competiciones (rondas previas)

| Eliminado en | Pasa a |
|---|---|
| Campions 1ª previa (camino campeones) | Rising League 2ª previa (camino campeones) |
| Campions 2ª previa (camino campeones) | Euroleague 3ª previa (camino campeones) |
| Campions 2ª previa (camino liga) | Euroleague 3ª previa (camino principal) |
| Campions 3ª previa (camino campeones) | Euroleague Play-off |
| Campions 3ª previa (camino liga) | Euroleague Fase de liga |
| Campions Play-off (camino campeones) | Euroleague Fase de liga |
| Campions Play-off (camino liga) | Euroleague Fase de liga |
| Euroleague 1ª previa (camino principal) | Rising League 2ª previa (camino principal) |
| Euroleague 2ª previa (camino principal) | Rising League 3ª previa (camino principal) |
| Euroleague 3ª previa (camino campeones) | Rising League Play-off (camino campeones) |
| Euroleague 3ª previa (camino principal) | Rising League Play-off (camino principal) |
| Euroleague Play-off | Rising League Fase de liga |

### Acceso real (lista de acceso por defecto 2024-27; ranking de asociaciones 2026-27)

- **Campions**, fase de liga directa (29): campeón vigente de Campions, campeón vigente de Euroleague, campeones de las asociaciones 1-10, 2º de la 1-6, 3º de la 1-5, 4º de la 1-4 y 2 plazas EPS.
  - Camino de campeones: campeones 11-14 al play-off; 15-24 a la 2ª previa; 25 en adelante a la 1ª previa → 5 a la fase de liga.
  - Camino de liga: 2º de la 7-9, 3º de la 6 y 4º de la 5 a la 3ª previa; 2º de la 10-15 a la 2ª previa → 2 a la fase de liga.
- **Euroleague**: campeón vigente de Rising, plaza de copa de la 1-7 y 5º de la 1-5 directos. Plaza de copa de la 8-12 al play-off; de la 13-15 a la 3ª previa; de la 16-20, 3º de la 7-12 y 4º de la 6 a la 2ª previa; plaza de copa de la 21-33 a la 1ª previa.
- **Rising League**: 6º de la 1-5 al play-off; plaza de copa de la 34-44, 2º de la 16-33, 3º de la 13-29, 4º de la 7-15 y 5º de la 6 a la 2ª previa; resto a la 1ª previa.

## 3. Algoritmo de reequilibrio (asociaciones que no existen en el juego)

Reequilibrio de rondas previas (adaptación del reequilibrio real UEFA/AFC a las asociaciones que existen en el juego).

```
Entrada: rondas de un camino (de la primera a la última) con sus entrantes directos y su nº de eliminatorias de diseño; T = nº de clasificados que debe dar el camino.
N = total de entrantes del camino. Si N <= T: todos pasan y quedan T-N vacantes (se cubren con "mejor eliminado" de la última ronda del camino, por coeficiente).
need = T. Para cada ronda i desde la ÚLTIMA hacia la PRIMERA:
  Ni = entrantes de la ronda i + entrantes de todas las rondas anteriores aún sin ubicar.
  t = min(eliminatorias_diseño_i, Ni - need)   (en la primera ronda: t = Ni - need)
  Los (need - t) equipos MÁS FUERTES de ese conjunto quedan exentos de la ronda i y pasan directamente a la siguiente fase.
  La ronda i se juega con 2t equipos: primero los entrantes directos de la ronda i; el resto (2t - directos) vienen como ganadores/exentos de rondas anteriores.
  Si los entrantes directos de la ronda i superan 2t, los más débiles bajan a la ronda anterior.
  need = 2t - directos_ronda_i; continuar con la ronda anterior.
Fortaleza (orden): 1) ronda de entrada más tardía, 2) coeficiente de club, 3) ranking de la asociación, 4) puesto en liga.
Vacante de campeón vigente: como en la UEFA real, se cubre subiendo de ronda al equipo más fuerte del camino correspondiente (campeón vigente de Campions -> camino de campeones; de Euroleague -> camino de liga; de Rising -> play-off de Euroleague).
```

## 4. Temporada 1 — plazas UEFA por asociación (ya calculadas)

Plazas por rendimiento (EPS) en la temporada 1: ENG, ITA. Sin campeones vigentes (sus plazas se reequilibran). Rusia excluida.

| Asoc. | Rk | Liga | Puestos de liga → competición (ronda de entrada) |
|---|---|---|---|
| ENG | 1 | Liga Inglesa | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (Fase de liga); 4º Campions (Fase de liga); 5º Campions (Fase de liga); 6º Euroleague (Fase de liga); 7º Euroleague (Fase de liga); 8º Rising League (Play-off (camino principal)) |
| ITA | 2 | Liga Italiana | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (Fase de liga); 4º Campions (Fase de liga); 5º Campions (Fase de liga); 6º Euroleague (Fase de liga); 7º Euroleague (Fase de liga); 8º Rising League (Play-off (camino principal)) |
| ESP | 3 | Liga Española | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (Fase de liga); 4º Campions (Fase de liga); 5º Euroleague (Fase de liga); 6º Euroleague (Fase de liga); 7º Rising League (Play-off (camino principal)) |
| GER | 4 | Liga Alemana | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (Fase de liga); 4º Campions (Fase de liga); 5º Euroleague (Fase de liga); 6º Euroleague (Fase de liga); 7º Rising League (Play-off (camino principal)) |
| FRA | 5 | Liga Francesa | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (Fase de liga); 4º Campions (3ª previa (camino liga)); 5º Euroleague (Fase de liga); 6º Euroleague (Fase de liga); 7º Rising League (Play-off (camino principal)) |
| NED | 6 | Liga Neerlandesa | 1º Campions (Fase de liga); 2º Campions (Fase de liga); 3º Campions (3ª previa (camino liga)); 4º Euroleague (Fase de liga); 5º Euroleague (2ª previa (camino principal)); 6º Rising League (2ª previa (camino principal)) |
| POR | 7 | Liga Portuguesa | 1º Campions (Fase de liga); 2º Campions (3ª previa (camino liga)); 3º Euroleague (Fase de liga); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| BEL | 8 | Liga Belga | 1º Campions (Fase de liga); 2º Campions (3ª previa (camino liga)); 3º Euroleague (Play-off); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| CZE | 9 | Liga Checa | 1º Campions (Fase de liga); 2º Campions (3ª previa (camino liga)); 3º Euroleague (Play-off); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| TUR | 10 | Liga Turca | 1º Campions (Fase de liga); 2º Campions (2ª previa (camino liga)); 3º Euroleague (Play-off); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| NOR | 11 | Liga Noruega | 1º Campions (Play-off (camino campeones)); 2º Campions (2ª previa (camino liga)); 3º Euroleague (Play-off); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| GRE | 12 | Liga Griega | 1º Campions (Play-off (camino campeones)); 2º Campions (2ª previa (camino liga)); 3º Euroleague (Play-off); 4º Euroleague (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| AUT | 13 | Liga Austriaca | 1º Campions (Play-off (camino campeones)); 2º Campions (2ª previa (camino liga)); 3º Euroleague (3ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| SCO | 14 | Liga Escocesa | 1º Campions (Play-off (camino campeones)); 2º Campions (2ª previa (camino liga)); 3º Euroleague (3ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| POL | 15 | Liga Polaca | 1º Campions (2ª previa (camino campeones)); 2º Campions (2ª previa (camino liga)); 3º Euroleague (3ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)); 5º Rising League (2ª previa (camino principal)) |
| DEN | 16 | Liga Danesa | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (2ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| SUI | 17 | Liga Suiza | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (2ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| CYP | 19 | Liga Chipriota | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (2ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| SWE | 20 | Liga Sueca | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (2ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| CRO | 21 | Liga Croata | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| SRB | 22 | Liga Serbia | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| UKR | 23 | Liga Ucraniana | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| HUN | 24 | Liga Húngara | 1º Campions (2ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| ROU | 25 | Liga Rumana | 1º Campions (1ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (2ª previa (camino principal)) |
| BUL | 29 | Liga Búlgara | 1º Campions (1ª previa (camino campeones)) |
| AZE | 30 | Liga Azerí | 1º Campions (1ª previa (camino campeones)) |
| IRL | 31 | Liga Irlandesa | 1º Campions (1ª previa (camino campeones)); 2º Euroleague (1ª previa (camino principal)); 3º Rising League (2ª previa (camino principal)); 4º Rising League (1ª previa (camino principal)) |
| FIN | 38 | Liga Finlandesa | 1º Campions (1ª previa (camino campeones)) |

### Tamaño de las rondas previas en la temporada 1 (tras el reequilibrio)

"Exentos que suben" = equipos que se saltan esa ronda y entran en la siguiente (o en la fase de liga si es la última ronda del camino). Se eligen por orden de fortaleza.

| Competición | Camino | Ronda | Eliminatorias | Exentos que suben |
|---|---|---|---|---|
| Campions | campeones | 1ª previa | 0 | 2 |
| Campions | campeones | 2ª previa | 1 | 11 |
| Campions | campeones | 3ª previa | 6 | 1 |
| Campions | campeones | Play-off | 5 | 1 |
| Campions | liga | 2ª previa | 2 | 2 |
| Campions | liga | 3ª previa | 4 | 0 |
| Campions | liga | Play-off | 2 | 1 |
| Euroleague | campeones | 3ª previa | 0 | 1 |
| Euroleague | principal | 1ª previa | 0 | 2 |
| Euroleague | principal | 2ª previa | 1 | 13 |
| Euroleague | principal | 3ª previa | 7 | 7 |
| Rising League | principal | 1ª previa | 0 | 0 |
| Rising League | principal | 2ª previa | 0 | 8 |
| Rising League | principal | 3ª previa | 4 | 26 |
| Rising League | principal | Play-off | 19 | 4 |
| Euroleague | (fusión) | Play-off | 13 | — |

## 5. Liberadores y Latinoamericana (formato exacto)

**Liberadores** (47 clubes):

1. Fase 1: 6 clubes (BOL, ECU, PAR, PER, URU y VEN), 3 eliminatorias de ida y vuelta → 3 a la Fase 2.
2. Fase 2: 16 clubes (13 directos + 3), 8 eliminatorias → 8 a la Fase 3.
3. Fase 3: 8 clubes, 4 eliminatorias → 4 a la fase de grupos; los 4 eliminados van a la fase de grupos de Latinoamericana.
4. Fase de grupos: 32 clubes, 8 grupos de 4 a doble vuelta. Bombos de 8 por ranking (bombo 1: campeón vigente + 7 mejores). No coinciden dos clubes del mismo país en un grupo, salvo los que llegan de la Fase 3. 1º y 2º → octavos; 3º → play-off de Latinoamericana.
5. Octavos: primeros de grupo vs segundos (el primero juega la vuelta en casa); no se cruzan equipos del mismo grupo. El sorteo fija el cuadro hasta la final. Cuartos y semis: vuelta en casa del de mejor campaña.
6. Final a partido único en sede neutral. En eliminatorias de ida y vuelta: sin valor doble de goles fuera; si hay empate global, penaltis directamente.

**Latinoamericana** (56 clubes):

1. Primera fase: 32 clubes de BOL, CHI, COL, ECU, PAR, PER, URU y VEN (4 por país), ida y vuelta entre clubes del MISMO país → 16.
2. Fase de grupos: 32 clubes (16 + 6 BRA + 6 ARG + 4 eliminados de la Fase 3 de Liberadores), 8 grupos de 4. 1º → octavos; 2º → play-off.
3. Play-off: 2º de grupo vs 3º de grupo de Liberadores (el de Liberadores juega la vuelta en casa).
4. Octavos: 1º de grupo vs ganador del play-off (el 1º juega la vuelta en casa). Después cuartos y semis de ida y vuelta, y final a partido único en sede neutral.

### Plazas por puesto de liga (tabla anual)

| Asoc. | Liga | Liberadores grupos | Lib. Fase 2 | Lib. Fase 1 | Latinoamericana |
|---|---|---|---|---|---|
| BRA | Liga Brasileña | 1-5 | 6-7 | - | 8-13 (Fase de grupos) |
| ARG | Liga Argentina | 1-5 | 6 | - | 7-12 (Fase de grupos) |
| CHI | Liga Chilena | 1-2 | 3-4 | - | 5-8 (Primera fase (cruce nacional)) |
| COL | Liga Colombiana | 1-2 | 3-4 | - | 5-8 (Primera fase (cruce nacional)) |
| BOL | Liga Boliviana | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |
| ECU | Liga Ecuatoriana | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |
| PAR | Liga Paraguaya | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |
| PER | Liga Peruana | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |
| URU | Liga Uruguaya | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |
| VEN | Liga Venezolana | 1-2 | 3 | 4 | 5-8 (Primera fase (cruce nacional)) |

Campeón vigente de Liberadores y de Latinoamericana: plaza directa en la fase de grupos de Liberadores. Si ya están clasificados (o en la temporada 1, en la que no hay), la plaza pasa al siguiente clasificado no clasificado de su asociación. En la temporada 1: el 6º de la Liga Brasileña y el 6º de la Liga Argentina suben a la fase de grupos, y todas las plazas inferiores de esas dos ligas bajan un puesto (BRA: Fase 2 = 7º-8º, Latinoamericana = 9º-14º; ARG: Fase 2 = 7º, Latinoamericana = 8º-13º).

## 6. Asia Élite (formato exacto 2026-27)

- Play-off previo: 4 partidos únicos (2 por región) en casa del mejor clasificado → 2 por región a la fase de liga.
- Fase de liga: 32 clubes, 16 en la región Oeste y 16 en la Este, con una tabla por región. 4 bombos de 4 por región; cada club juega 8 partidos (2 rivales por bombo, 1 en casa y 1 fuera) y nunca contra un club de su asociación.
- Temporada 1: los 8 primeros de cada región van a octavos. Desde la temporada 2: 1º-6º a octavos; 7º-10º juegan un play-off a partido único (7 vs 10, 8 vs 9) en casa del 7º y del 8º.
- Octavos dentro de cada región, a ida y vuelta: 1-8, 2-7, 3-6 y 4-5.
- Fase final centralizada en una sede: cuartos (sorteo Oeste vs Este), semis y final a partido único.

### Plazas en la temporada 1 (reparto real 2026-27 reequilibrado: IRN, UZB, IRQ, JOR, MAS y VIE no existen; THA solo tiene 1 club)

| Región | Asoc. | Liga | Directos fase liga (puestos) | Play-off (puestos) |
|---|---|---|---|---|
| Oeste | KSA | Liga Saudí | 6 (1-6) | 1 (7) |
| Oeste | UAE | Liga Emiratí | 4 (1-4) | 2 (5-6) |
| Oeste | QAT | Liga Catarí | 4 (1-4) | 1 (5) |
| Este | JPN | Liga Japonesa | 5 (1-5) | 1 (6) |
| Este | KOR | Liga Coreana | 4 (1-4) | 1 (5) |
| Este | THA | Liga Tailandesa | 1 (1) | 0 (-) |
| Este | CHN | Liga China | 3 (1-3) | 0 (-) |
| Este | AUS | Liga Australiana | 1 (1) | 2 (2-3) |

La Liga India no tiene plaza en Asia Élite (en la realidad juega la competición de segundo nivel).

## 7. Otras competiciones

### Eurosupercopa

- **confederacion**: UEFA
- **formato**: partido único en sede neutral (agosto): campeón de Campions vs campeón de Euroleague. Empate -> penaltis directamente (sin prórroga).

### Recopa Latina

- **confederacion**: CONMEBOL
- **formato**: campeón de Liberadores vs campeón de Latinoamericana, ida y vuelta (febrero); empate global -> penaltis

### Copa de Campeones del Norte

- **confederacion**: CONCACAF
- **temporada**: febrero-mayo
- **formato real**: 27 clubes; ronda 1 (22 clubes, ida y vuelta) + 5 exentos -> octavos, cuartos, semis ida y vuelta; final a partido único
- **en el juego**: Solo existen la Liga Norteamericana y la Liga Mexicana: 8 + 8 = 16 clubes -> por reequilibrio todos entran en octavos (la ronda 1 queda vacía).
- **plazas**: Liga Norteamericana: puestos 1-8 de la clasificación general (si no hay ningún club canadiense, el mejor canadiense sustituye al 8º); Liga Mexicana: puestos 1-8 de la tabla anual
- **cruces**: octavos 1-16, 2-15... por ranking de clubes; vuelta en casa del mejor; cuadro fijo
- **final**: partido único en el estadio del finalista con mejor rendimiento en el torneo
- **clasifica a**: Intercontinental Planeta (Derbi de las Américas)

### África Masters

- **confederacion**: CAF
- **activa**: False
- **motivo**: En el juego solo hay 2 ligas africanas (Egipcia y Marroquí). Activar cuando haya al menos 8 asociaciones africanas.
- **formato real**: 2 rondas previas ida y vuelta -> fase de grupos 16 (4 de 4, doble vuelta) -> cuartos, semis y final a ida y vuelta. 12 mejores asociaciones: 2 clubes; resto: 1.

### Intercontinental Planeta

- **confederacion**: FIFA
- **temporada**: anual (diciembre)
- **formato**: Derbi de las Américas: campeón Copa de Campeones del Norte vs campeón Liberadores → Copa Desafío: ganador del Derbi vs campeón Asia Élite (y de África Masters si se activa, en una ronda previa) → Final: ganador Copa Desafío vs campeón de Campions
- **reglas**: partidos únicos en sede neutral; empate -> prórroga -> penaltis

## 8. Datos que el juego debe guardar

- Coeficiente de club (5 temporadas) y de asociación (5 temporadas). Valores iniciales en `clubs.json` (`coef_inicial`) y en `competiciones.json` (`asociaciones[].puntos_iniciales`).
- Campeones vigentes de cada competición.
- Tabla anual de cada liga, que es la que reparte las plazas.
- Parámetro `excluir_rusia` (true por defecto).
