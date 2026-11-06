# El Profe — mentor del mánager

## Ficha

| | |
|---|---|
| **Nombre** | Tomás Arrieta, «el Profe» |
| **Edad** | 64 años |
| **Papel** | La directiva se lo asigna al mánager para formarle. Explica el juego, aconseja y reacciona a lo que pasa. |
| **Pasado** | Treinta años en los banquillos. Ganó una liga joven con un equipo de chavales, la perdió al año siguiente por soberbia, le echaron tres veces y acabó dedicándose a enseñar. Es su secreto: solo lo cuenta si confía en ti. |
| **Carácter** | Cercano, socarrón y de vuelta de todo. Nunca humilla: corrige con anécdotas. Le gustan los equipos ordenados y los jugadores que trabajan. Desconfía de los atajos (criptomonedas, fichajes de relumbrón). |
| **Voz** | Pitidos agudos y rápidos, uno por letra, al estilo de *Animal Crossing* (`TL.SFX.voice`). El tono depende de la letra, así que una misma palabra suena siempre igual, y sube o baja con su emoción. |
| **Aspecto** | Pelo canoso, chaqueta azul marino con cremallera. Retrato pixel-art de 64×64 px mostrado a escala 1:1. |

## Sprites

Cada emoción usa **dos hojas PNG de 512×128 px**: frames de **64×64** en 8 columnas, con 10 frames usados (8 en la primera fila y 2 en la segunda) y fondo transparente.

| Hoja | Archivo | Uso |
|---|---|---|
| Hablando | `assets/mentor/<emocion>-talk.png` | Mientras escribe el texto. La boca cambia con cada letra. |
| En reposo | `assets/mentor/<emocion>-idle.png` | Cuando termina de hablar. Parpadea y gira la cabeza de vez en cuando. |

Mapa de gestos de las hojas neutras, en `js/mentor.js`:

```js
NEUTRAL_TALK = { closed: [0, 5], small: [1, 6, 9], open: [2, 7], turn: [3, 8], blink: [4] }
NEUTRAL_IDLE = { base: [0, 1, 5, 6, 7, 9], blink: [2], turn: [3, 8] }
```

- **Vocales:** boca abierta (`open`).
- **Consonantes:** boca entreabierta (`small`).
- **Espacios y puntuación:** boca cerrada (`closed`).
- **Cabeza girada (`turn`):** de vez en cuando, al hablar.
- **Reposo:** parpadeo (`blink`) cada 2–5 s y giro de cabeza (`turn`) cada 6–12 s.

### Añadir una emoción

1. Dibuja las dos hojas con la misma rejilla, por ejemplo `assets/mentor/happy-talk.png` y `assets/mentor/happy-idle.png`.
2. Regístrala en `EMOTIONS` (`js/mentor.js`). Si los gestos caen en otros frames, pásale su propio mapa:
   ```js
   happy: { talk: 'assets/mentor/happy-talk.png', idle: 'assets/mentor/happy-idle.png', talkMap: NEUTRAL_TALK, idleMap: NEUTRAL_IDLE }
   ```
3. Añádela a la lista de precarga del service worker (`sw.js`).

Las frases ya llevan su emoción (`emo`). Mientras no exista el arte se ve la cara neutra, pero la voz ya cambia de tono.

### Emociones pendientes (por prioridad)

| Emoción | Dónde se usa ya | Voz |
|---|---|---|
| `happy` | Primera victoria, ayuda, respuestas acertadas, subir de nivel | +2 semitonos |
| `worried` | Derrotas, rachas malas, directiva descontenta, números rojos | −1,5 |
| `thinking` | Consejos de mercado, análisis, decisiones, preguntas de repaso | −0,5 |
| `proud` | Objetivo cumplido, graduación, rachas buenas | +1 |
| `sad` | Descenso, destitución, su historia | −3 |
| `laugh` | Títulos, bromas | +3 |
| `angry` | Reservada: escándalos graves, agresiones (no usada aún) | −2,5 |
| `surprised` | Reservada: campanadas, goleadas (no usada aún) | +3 |

## La ruta del Profe

Su historia avanza con tu carrera (`S.mentor.chapter`). Tiene un medidor de **confianza** (`S.mentor.trust`, de 0 a 100, empieza en 50) que sube con buenos resultados, siguiendo sus consejos y acertando las lecciones, y baja con descensos o si ignoras sus avisos.

| Capítulo | Momento | Qué pasa |
|---|---|---|
| 1. **Primer día** | Nueva partida | Se presenta y hace el tutorial guiado, resaltando cada zona de la interfaz. |
| 1. **El césped** | Primer partido en directo | Explica la vista 2D, velocidades, saltos, pausas y mentalidad. |
| 2. **Aprendiz** | Primera temporada | Reacciona a la primera victoria, la primera derrota (ofrece la lección *Cómo se gana un partido aquí*), rachas (con decisiones: cambiar sistema, hablar con el vestuario o pedir una lección), el primer «marrón» del buzón, la primera oferta, el cierre del mercado, mitad de temporada, la subida de nivel, la directiva descontenta y los números rojos. |
| 3. **Graduación** | Fin de la primera temporada | Evalúa tu año. Con confianza ≥ 60 se despide orgulloso («ya no necesitas que te lleve de la mano»); si no, con ánimo. Sigue disponible con el botón **?**. |
| 4. **El consejero** | Resto de la carrera | Aparece en momentos clave: ascensos, descensos, ofertas de otros clubes y destitución («a mí me echaron tres veces»). |
| 5. **Su historia** | Primer título con confianza ≥ 70 | Cuenta por qué dejó los banquillos. |
| Epílogo (pendiente) | Tres títulos | «El alumno supera al maestro»: despedida definitiva y un objeto conmemorativo. |

Los eventos están en `ROUTE` (por jornada) y en `event()` (fin de temporada y destitución), dentro de `js/mentor.js`:
- `once`: solo una vez en toda la partida.
- `season`: una vez por temporada.
- `cooldown`: semanas mínimas entre dos apariciones.

### La escuela del Profe

En `js/school.js` hay 9 lecciones contadas por él, cada una con una pregunta de repaso (acertarla da experiencia), más un glosario:

1. El fútbol en 2 minutos (puntos, clasificación, desempates, ascensos)
2. Las posiciones
3. Cómo se gana un partido aquí (cómo funciona el motor)
4. Formaciones: cuál usar
5. Gestionar el partido (mentalidad, charla, cambios, expulsiones)
6. Cuidar la plantilla (forma, moral, tarjetas, contratos)
7. Dinero y mercado
8. Cómo progresar
9. Si pierdes partidos (lista de comprobación)

Se abre desde el botón **?**, desde la tarjeta de Inicio y desde Club → Partida. En **Tácticas**, el *Análisis del Profe* calcula con el mismo modelo que el partido qué sistema y mentalidad dan más puntos contra el próximo rival.

### Guía de estilo para nuevas frases

- **Tú a tú:** habla de «míster» y «chavales» y usa anécdotas cortas. Nada de jerga técnica sin explicarla.
- **Cortas:** 1 o 2 frases por línea. La negrita (`**así**`) va solo para el concepto clave.
- **Con consejo:** cada aparición deja un consejo práctico, no solo un comentario.
- **Con emoción:** pon siempre la `emo` de la línea, aunque aún no exista su arte.
