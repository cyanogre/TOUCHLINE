#!/usr/bin/env node
/*
 * TOUCHLINE — empaqueta los escudos (assets/escudos/*.svg) en una spritesheet SVG por género:
 *   assets/escudos/sprite-M.svg y assets/escudos/sprite-F.svg
 * Cada escudo queda como <symbol id="C0480"> y el juego lo dibuja con <use href="#C0480">.
 *
 * Para retocar un escudo: edita su SVG en assets/escudos/ (con cualquier editor) y vuelve a ejecutar
 *   node tools/build-crest-sprite.js
 * Qué escudos van en cada hoja lo dice assets/escudos/index.json (lo escribe tools/build-db.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'escudos');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));

function symbol(id) {
  const file = path.join(DIR, id + '.svg');
  if (!fs.existsSync(file)) { console.warn('Falta el escudo', id); return ''; }
  let svg = fs.readFileSync(file, 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const open = /<svg\b([^>]*)>/i.exec(svg);
  if (!open) { console.warn('SVG no válido', id); return ''; }
  const vb = /viewBox="([^"]+)"/i.exec(open[1]);
  let inner = svg.slice(open.index + open[0].length).replace(/<\/svg>\s*$/i, '');
  // Los id internos (clipPath, degradados…) se prefijan para que no choquen entre escudos
  const ids = [...inner.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  for (const k of ids) {
    const nk = id + '-' + k;
    inner = inner.split(`id="${k}"`).join(`id="${nk}"`).split(`url(#${k})`).join(`url(#${nk})`)
      .split(`href="#${k}"`).join(`href="#${nk}"`);
  }
  return `<symbol id="${id}" viewBox="${vb ? vb[1] : '0 0 100 110'}">${inner}</symbol>`;
}

for (const g of ['M', 'F']) {
  const syms = index[g].map(symbol).filter(Boolean);
  const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n${syms.join('\n')}\n</svg>\n`;
  fs.writeFileSync(path.join(DIR, `sprite-${g}.svg`), out);
  console.log(`assets/escudos/sprite-${g}.svg: ${syms.length} escudos, ${(out.length / 1024).toFixed(0)} KB`);
}
