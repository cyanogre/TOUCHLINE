# Escudos

El juego dibuja los escudos desde dos imágenes en cuadrícula (spritesheets), una por género:

- **`escudos-M.png`**: fútbol masculino, 37 × 33 casillas.
- **`escudos-F.png`**: fútbol femenino, 13 × 11 casillas.

Cada casilla es un club; en la imagen que genera el juego, cada casilla mide 64 × 70 píxeles.

## Retocar o redibujar escudos

1. Abre la imagen con tu editor y dibuja encima de las casillas que quieras.
2. Guárdala con el mismo nombre y en la misma carpeta, en PNG con fondo transparente.

**Puedes guardarla más grande**, por ejemplo al doble (128 × 140 por casilla), siempre que mantengas el número de filas y columnas: el juego coloca cada casilla en proporción, no en píxeles.

**Qué club va en cada casilla:** lo dice `data/game/escudos.js`. Las casillas van fila a fila, de izquierda a derecha.

## Volver a generarlas

Los escudos originales de la base de datos están en `data/db/escudos/*.svg`. Para rehacer las imágenes desde ellos:

```
node tools/build-crest-atlas.js
```

**Ojo:** ese comando sobrescribe los PNG y se pierden los retoques hechos a mano.
