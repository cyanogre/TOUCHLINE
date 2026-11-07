# Escudos

Cada club tiene su escudo en un SVG suelto en esta carpeta: retócalo con cualquier editor (Inkscape, Figma, Illustrator o un editor de texto).

- **`C0001.svg` … `C1039.svg`**: escudos de los clubes de la base de datos (`data/db/clubs.json`, campo `crest`).
- **`PM001.svg`…, `PF001.svg`…**: escudos de los clubes inventados de las divisiones inferiores (masculinas y femeninas).
- **`sprite-M.svg` y `sprite-F.svg`**: las spritesheets que carga el juego, con todos los escudos de cada género. **No las edites a mano**: se generan.
- **`index.json`**: qué escudos van en cada spritesheet.

## Después de retocar un escudo

```
node tools/build-crest-sprite.js
```

Así se rehacen las spritesheets con los cambios.

## Formato

- Lienzo de 100×110 (`viewBox="0 0 100 110"`).
- Los `id` internos (por ejemplo, el `clipPath`) pueden repetirse entre archivos: el script los renombra al empaquetarlos.
