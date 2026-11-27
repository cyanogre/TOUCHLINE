# Banda sonora

- **`tema/`:** los temas principales (`tema/1.mp3` es «Strategic Swing»). Suenan en los menús y siempre que el momento de la carrera no tenga música propia. Mete más como `tema/2.mp3`, `tema/3.mp3`…: cada vez que se abre el juego suena uno distinto del de la última vez.
- **Carpetas:** cada una es un momento de la carrera. Mete dentro los MP3 numerados seguidos: `1.mp3`, `2.mp3`, `3.mp3`… (hasta 12). Por ejemplo, `racha/1.mp3`.

| Carpeta | Cuándo suena | Idea para la pista |
|---|---|---|
| `pretemporada` | Primeras jornadas, con el mercado de verano abierto | Optimista, de arranque, ilusión por lo que viene |
| `temporada` | El grueso de la liga, cuando no pasa nada especial | Tranquila y con ritmo, que no canse al repetirse |
| `recta-final` | Las últimas 8 jornadas | Tensión creciente, todo se decide |
| `racha` | Tres victorias seguidas o más | Épica, subidón, la grada cantando |
| `peligro` | Estás a punto de palmarla: la directiva casi sin confianza o en zona de descenso | Oscura, nerviosa, cuenta atrás |
| `fin-de-temporada` | Resumen de la temporada | Cierre emotivo, de balance |

## La sala de prensa

Estas carpetas no son momentos de la carrera, sino escenas: mientras estás en la sala de prensa, mandan sobre todo lo demás. Al salir, vuelve la música que tocaba.

| Carpeta | Cuándo suena | Qué hay ahora |
|---|---|---|
| `prensa` | La rueda de prensa después del partido | `1.mp3`: «Matchday Melody» |
| `prensa-tensa` | Cuando la sala se calienta (y hasta que se enfría) | `1.mp3`: «Pressroom Tension» |
| `prensa-previa` | La rueda de prensa previa a un partido grande (copa, top contra top, duelo directo, recta final) | `1.mp3`: «Pre-Match Jazz» |

Para meter más, súbelas con el siguiente número: `prensa/2.mp3`, `prensa-tensa/2.mp3`, `prensa-previa/2.mp3`… (hasta 12 por carpeta). Si `prensa-previa` o `prensa-tensa` están vacías, suena la de `prensa`.

## Cómo se comporta

- **Prioridad:** si estás en peligro, manda el peligro. Si no, la racha. Si no, el momento de la temporada.
- **Al cambiar de momento:** si la carpeta tiene pistas, cambia con un fundido suave.
- **Carpeta vacía:** sigue sonando lo que esté sonando, sin cortes ni reinicios.
- **Varias pistas:** cuando acaba una, suena otra de la misma carpeta, sin repetir la anterior. Con una sola pista, se repite en bucle.
- **Al acabar una pista de un momento ya pasado:** vuelve el tema del juego.
- **Archivos nuevos:** el juego mira las carpetas una vez por sesión, así que se oyen la siguiente vez que abras el juego.
