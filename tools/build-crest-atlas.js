#!/usr/bin/env node
/*
 * TOUCHLINE — spritesheet de escudos: una imagen PNG en cuadrícula con todos los escudos de cada género.
 *   assets/escudos/escudos-M.png, assets/escudos/escudos-F.png   (las imágenes que usa el juego)
 *   data/game/escudos.js                                          (qué club va en cada casilla)
 *
 * Origen: los escudos de la base de datos (data/db/escudos/*.svg; lista por género en index.json).
 * Para retocar un escudo basta con editar su casilla en el PNG. Ojo: volver a ejecutar este script
 * rehace los PNG desde los SVG y borra los retoques hechos a mano en la imagen.
 *
 * Uso: node tools/build-crest-atlas.js   (necesita Playwright con Chromium)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'db', 'escudos');
const OUT = path.join(ROOT, 'assets', 'escudos');
const CELL_W = 64, CELL_H = 70, PAD = 2; // casilla y margen (para que al escalar no se cuele el vecino)

(async () => {
  const index = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const atlas = {};
  for (const g of ['M', 'F']) {
    const ids = index[g].filter(id => fs.existsSync(path.join(SRC, id + '.svg')));
    const cols = Math.ceil(Math.sqrt(ids.length * CELL_H / CELL_W));
    const rows = Math.ceil(ids.length / cols);
    const svgs = ids.map(id => fs.readFileSync(path.join(SRC, id + '.svg'), 'utf8'));
    const b64 = await page.evaluate(async ({ svgs, cols, rows, W, H, P }) => {
      const c = document.createElement('canvas');
      c.width = cols * W; c.height = rows * H;
      const x = c.getContext('2d');
      const load = s => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
      for (let i = 0; i < svgs.length; i++) {
        const im = await load(svgs[i]);
        const col = i % cols, row = Math.floor(i / cols);
        x.drawImage(im, col * W + P, row * H + P, W - 2 * P, H - 2 * P);
      }
      return c.toDataURL('image/png').split(',')[1];
    }, { svgs, cols, rows, W: CELL_W, H: CELL_H, P: PAD });
    const file = path.join(OUT, `escudos-${g}.png`);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    atlas[g] = { cols, rows, w: CELL_W, h: CELL_H, ids };
    console.log(`${path.relative(ROOT, file)}: ${ids.length} escudos en ${cols}×${rows} casillas de ${CELL_W}×${CELL_H} px, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  await browser.close();
  const js = '/* Generado por tools/build-crest-atlas.js: casilla de cada escudo en assets/escudos/escudos-M.png y -F.png\n' +
    '   (en orden: fila a fila, de izquierda a derecha; la casilla n está en la columna n % cols y la fila n / cols). */\n' +
    'window.TL_CREST_ATLAS = ' + JSON.stringify(atlas) + ';\n';
  fs.writeFileSync(path.join(ROOT, 'data', 'game', 'escudos.js'), js);
  console.log('data/game/escudos.js escrito');
})();
