# Evaluación como jugador de Football Manager

Revisión de la versión 1, jugada como lo haría un habitual de FM: lo que
enganchaba, lo que chirriaba y qué se ha cambiado en la versión 2.

## Lo que ya funcionaba (v1)

- **Arranque rápido:** se eligen liga y club y se juega en 30 segundos, con jugadores reales de EA FC 27.
- **Partido creíble:** el motor minuto a minuto da resultados con tablas de clasificación realistas.
- **Mercado:** con buscador, contraofertas y contratos.
- **Continuidad:** hay ascensos, descensos, cantera y evolución, así que se puede jugar varias temporadas.
- **Móvil:** la interfaz cómoda en móvil y la partida se guarda sola.

## Lo que chirriaba (v1) → solución (v2)

| Problema | Por qué molesta a un jugador de FM | Solución en v2 |
|---|---|---|
| Banderas en emoji | En Windows salen como letras ("ES", "FR") | Banderas SVG locales (flag-icons) para 164 países, incluidas Inglaterra, Escocia, Gales e Irlanda del Norte |
| Partido en directo con solo 2 velocidades | No se puede ver a cámara lenta ni avanzar rápido hasta el momento importante | Velocidades x1, x2, x4, x8 y x16, y saltos al próximo momento clave, al descanso, a los minutos 60/75/85 o al final |
| No se decide nada durante el partido | En FM lo mejor son los ajustes en los tiempos muertos | Pausas automáticas configurables (gol, roja, lesión, penalti, VAR, grada, descanso) con un panel de decisiones contextual |
| Sin charla del descanso | Es la herramienta clásica de gestión | Charla con tres tonos (tranquilidad, exigir, elogiar) cuyo efecto depende del marcador |
| Táctica fija una vez empezado el partido | No se puede reaccionar a una expulsión | Cambio de sistema en pleno partido, que recoloca a los que quedan en el campo |
| Tarjetas aleatorias sin faltas | Poco creíble | Faltas, árbitro con perfil, penaltis, faltas directas, VAR, fueras de juego, tanganas y ciclo de 5 amarillas |
| Árbitro invisible | Sin polémica no hay fútbol | Errores arbitrales (penaltis no pitados, goles mal anulados), quejas al comité y ruedas de prensa |
| Mundo sin vida | No pasa nada entre partido y partido | Sección de noticias: crónicas, goleadas, campanadas, hat-tricks, nuevo líder, fichajes, rumores, incidentes y escándalos |
| Jugadores sin personalidad | Todos están siempre contentos | Moral, que depende de los minutos, los resultados, el contrato y los escándalos, y afecta al rendimiento (±3%) |
| Ninguna progresión del mánager | Falta sensación de carrera | Experiencia, niveles y un árbol de 6 ramas × 3 habilidades (táctica, motivación, físico, cantera, negocios, disciplina) |
| Finanzas planas | Solo había salario y taquilla | TV, patrocinadores con perfiles de riesgo, merchandising, afición, precio de entradas, marketing, gira de pretemporada, préstamos, ampliación del estadio y multas |
| Mercado con estrellas imposibles por defecto | Frustrante | Filtro "Lo que puedo pagar" |
| Alineaciones con lesionados sin aviso | Sorpresa desagradable | Aviso antes del partido de quién no está disponible y quién lo sustituye |

## v3: lo que pediste tras probarlo

| Problema | Solución |
|---|---|
| No se ve a los jugadores jugando | Vista 2D en canvas: 22 jugadores con dorsal, movimiento según formación y posesión, pases, tiros, paradas, goles con celebración, tarjetas y rótulos de VAR, penalti o tangana |
| Sin tutorial | Tutorial guiado con foco sobre cada zona: inicio, plantilla, tácticas, mercado, club y noticias, y controles en el primer partido |
| Botones de inicio enormes en PC (icono de música gigante) | Portada nueva y compacta. Interruptores pequeños de música y sonido, y botones más contenidos en escritorio |
| Poco divertido visualmente | Botones con relieve, brillo, onda y chispas. Confeti y partículas en goles, victorias, fichajes, patrocinios y subidas de nivel. Animaciones de entrada, focos en la tarjeta del partido, saldo que parpadea al cambiar |
| Sin efectos de sonido | Web Audio: silbato, ambiente de estadio, rugido del gol, abucheos, tarjetas, monedas y fanfarria de nivel |
| La música no arranca sola | Arranca con fundido al empezar o continuar partida y baja durante los partidos |
| Escudos inventados | Escudos reales de ≈350 clubes vía jsDelivr, con colores de equipación sacados del escudo |

## Lo que todavía falta (hoja de ruta)

Por orden de impacto para un jugador de FM:

1. **Copas y competiciones europeas:** son lo que da sentido a la rotación.
2. **Entrenamientos y cuerpo técnico:** segundo entrenador, ojeadores y fisios.
3. **Instrucciones tácticas finas:** presión, línea defensiva, ritmo y roles por jugador.
4. **Ruedas de prensa interactivas:** antes y después del partido.
5. **Cesiones, cláusulas de rescisión y porcentajes de futura venta.**
6. **Más atributos visibles:** el CSV tiene 34 atributos detallados, pero el juego solo usa las 6 medias de carta para no cargar demasiado el móvil.
7. **Selecciones nacionales y parones internacionales.**
8. **Simulación semanal de todas las ligas,** no solo de la tuya y de las que tienen ascensos.
9. **Versión app nativa:** Capacitor o TWA a partir de la PWA ya publicada.

## Equilibrio actual (medido)

- **Partidos:** 2,7 goles, 4 amarillas, 0,19 rojas, 24 faltas y 0,3 penaltis por partido.
- **Mánager:** gana unos 4–5 puntos de habilidad la primera temporada y 2–3 en las siguientes.
- **Finanzas:** con patrocinadores normales, un club medio cuadra cuentas. Firmar los patrocinios libres y hacer marketing da margen para fichar. Pedir préstamos sin control hunde la confianza de la directiva.
- **Polémicas:** ~84% de temporadas con algún problema y ~16% con un escándalo grave. El detalle está en [POLEMICAS.md](POLEMICAS.md).
