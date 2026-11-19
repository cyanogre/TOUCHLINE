# Laboratorio 3D (prueba, fuera del juego)

Abre `lab/3d/` (en GitHub Pages: `https://cyanogre.github.io/TOUCHLINE/lab/3d/`). Si el navegador no tiene WebGPU, añade `?gl=1`.

- **El partido es el del juego**: lo simula `TL.Engine` y lo escenifica el campo 2D (`TL.Pitch`), el mismo que en el juego; se ve abajo a la derecha.
- **`data.js` (MatchData)** graba lo que pasa en ese campo, fotograma a fotograma: posiciones de jugadores, árbitro y balón (en metros, con el origen en el centro) y eventos (pase, pase largo, tiro, cabezazo, estirada, segada, caída, celebración).
- **`index.html` (Renderer3D)** dibuja esa grabación **con 1 s de retraso**. Así cada acción empieza antes de su contacto con el balón (`c` de cada acción en `rig.js`) y cualquier jugada se puede **repetir** (botón, o solo tras cada gol).
- **`rig.js`**: jugadoras procedurales con esqueleto, material por zonas, locomoción y acciones del prototipo original, sin su simulación.

Pendiente para una versión buena: animaciones de mocap (CMU, Quaternius, Mixamo) en lugar de las curvas a mano, y las equipaciones reales de cada club.
