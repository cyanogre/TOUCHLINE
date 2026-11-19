# Laboratorio 3D (prueba, fuera del juego)

Abre `https://cyanogre.github.io/TOUCHLINE/lab/3d/` y elige partido femenino o masculino.

- **El partido es el del juego**: lo simula `TL.Engine` y lo escenifica el campo 2D (`TL.Pitch`), igual que en el juego. Va narrado (la radio) y, cuando llega una **jugada clave** (gol, penalti, roja, gol anulado, paradón, alguna ocasión), el partido se para y la jugada se ve en 3D. Después sigue. «Repetir la última» la vuelve a poner.
- **`data.js` (MatchData)** graba lo que pasa en el 2D: posiciones de jugadoras, árbitra y balón, y los golpeos y gestos (pase, pase largo, globo, vaselina, tiro, cabezazo, saque de banda, entrada, segada, blocaje, estirada, caída, celebración).
- **`index.html` (render)**: cuerpos de **Xbot** (el maniquí genérico de Mixamo) con sus animaciones de captura de movimiento (reposo, paso, carrera) y el baile de celebración de Michelle. Cada jugadora es distinta (altura, complexión, piel, pelo, botas) y lleva la equipación de su club, pintada por zonas del cuerpo. Las acciones se añaden como gestos encima del mocap, empezando antes para que el golpeo coincida con la salida del balón. Velocidad máxima de carrera (sin teletransportes), separación entre cuerpos (sin solapes) y apoyo en el césped.
- `models/`: Xbot.glb y Michelle.glb, de los ejemplos de three.js (personajes y animaciones de Mixamo).

Para que las acciones (pases, tiros, cabezazos, estiradas, segadas, saques…) tengan la calidad de un FIFA o un PES hacen falta sus animaciones de mocap: se descargan gratis de Mixamo (con cuenta de Adobe), en FBX o GLB, y se cargan igual que las de carrera.
