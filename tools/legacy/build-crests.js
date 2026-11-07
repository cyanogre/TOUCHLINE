#!/usr/bin/env node
/*
 * TOUCHLINE — asocia los clubes del juego con escudos reales del repositorio
 * público https://github.com/luukhopman/football-logos (primeras divisiones
 * europeas, temporadas 2021/22 – 2026/27).
 *
 * Los escudos NO se copian a este repositorio: el juego los carga desde el CDN
 * de jsDelivr y, si no hay conexión o el club no está, usa el escudo generado.
 * Los escudos son marcas registradas de sus clubes.
 *
 * Uso:
 *   git clone --depth 1 --filter=blob:none --no-checkout https://github.com/luukhopman/football-logos fl
 *   (cd fl && git -c core.quotepath=off ls-tree -r --name-only HEAD | grep '\.png$') > tree.txt
 *   node tools/build-crests.js tree.txt <commit>
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const [treeFile, commit] = process.argv.slice(2);
if (!treeFile || !commit) { console.error('Uso: node tools/build-crests.js tree.txt <commit>'); process.exit(1); }

global.window = {};
require(path.join(ROOT, 'data/legacy/men.js'));
require(path.join(ROOT, 'data/legacy/women.js'));
const DATA = window.TL_DATA;

const COUNTRY = {
  Inglaterra: 'England', España: 'Spain', Italia: 'Italy', Alemania: 'Germany', Francia: 'France',
  'Países Bajos': 'Netherlands', Portugal: 'Portugal', Bélgica: 'Belgium', Escocia: 'Scotland', Austria: 'Austria',
  Suiza: 'Switzerland', Dinamarca: 'Denmark', Noruega: 'Norway', Suecia: 'Sweden', Polonia: 'Poland',
  Rumanía: 'Romania', Grecia: 'Greece', Chequia: 'Czech Republic', Croacia: 'Croatia', Ucrania: 'Ukraine',
  Bulgaria: 'Bulgaria', Hungría: 'Hungary', Serbia: 'Serbia'
};

// Nombres de EA FC (algunos sin licencia) → nombre del repositorio
const ALIAS = {
  'Man Utd': 'Manchester United', 'Man City': 'Manchester City', Spurs: 'Tottenham Hotspur',
  "Nott'm Forest": 'Nottingham Forest', Wolves: 'Wolverhampton Wanderers', 'Milano FC': 'AC Milan',
  'Lombardia FC': 'Inter', 'Bergamo Calcio': 'Atalanta', Latium: 'Lazio', 'Paris SG': 'Paris Saint-Germain',
  'R. Racing Club': 'Racing Santander', 'D. Alavés': 'Deportivo Alavés', 'R. Oviedo': 'Real Oviedo',
  'R. Valladolid CF': 'Real Valladolid', 'RC Deportivo': 'Deportivo La Coruña', 'Atlético de Madrid': 'Atlético de Madrid',
  'Athletic Club': 'Athletic Bilbao', 'Celta': 'Celta de Vigo', 'OM': 'Olympique Marseille', 'OL': 'Olympique Lyon',
  'Bayern München': 'Bayern Munich', 'FC Bayern München': 'Bayern Munich', 'Leverkusen': 'Bayer 04 Leverkusen',
  'Borussia Dortmund': 'Borussia Dortmund', 'M\'gladbach': 'Borussia Mönchengladbach', 'Köln': '1.FC Köln',
  'Sporting CP': 'Sporting CP', 'SL Benfica': 'SL Benfica', 'FC Porto': 'FC Porto',
  'Sheffield Wed': 'Sheffield Wednesday', 'GC Zürich': 'Grasshopper Club Zürich', 'FK Austria Wien': 'Austria Vienna',
  'SC Austria': 'Austria Lustenau', Hearts: 'Heart of Midlothian', 'West Brom': 'West Bromwich Albion',
  'Newcastle Utd': 'Newcastle United', 'Sheffield Utd': 'Sheffield United', 'Leeds United': 'Leeds United',
  'Brighton': 'Brighton & Hove Albion', 'West Ham': 'West Ham United', 'Napoli': 'SSC Napoli', 'Roma': 'AS Roma',
  'Juventus': 'Juventus', 'Hellas Verona': 'Hellas Verona', 'Sp. Charleroi': 'Charleroi', 'Union SG': 'Union Saint-Gilloise',
  'Club Brugge': 'Club Brugge KV', 'RSC Anderlecht': 'Anderlecht', 'Vitória SC': 'Vitória Guimarães',
  'R. Union St.-G.': 'Union Saint-Gilloise', STVV: 'Sint-Truidense', 'N.E.C. Nijmegen': 'NEC Nijmegen',
  'Marítimo da Madeira': 'Marítimo', 'Madrid CFF': null
};

const STOP = new Set(['fc', 'cf', 'ac', 'afc', 'sc', 'cd', 'ud', 'sd', 'rc', 'rcd', 'ca', 'club', 'de', 'del', 'la', 'le',
  'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'bsc', 'ss', 'us', 'as', 'ssc', 'calcio', 'fk', 'sk', 'nk', 'if', 'bk', 'ik', 'ks',
  'kv', 'krc', 'rsc', 'sporting', 'clube', 'futebol', 'and', 'the', 'of', 'cp', 'sad', 'aj', 'ogc', 'losc', 'stade', 'rb']);
function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t) && !/^\d+$/.test(t));
}
// Palabras demasiado comunes para identificar a un club por sí solas
const GENERIC = new Set(['city', 'town', 'united', 'utd', 'athletic', 'rovers', 'county', 'albion', 'wanderers', 'borough',
  'foot', 'fotball', 'football', 'olympique', 'ii', 'b', 'sport', 'sportclub', 'fortuna', 'dynamo', 'royal', 'union']);
function same(t, u) { return t === u || (t.length >= 5 && u.length >= 5 && (u.startsWith(t) || t.startsWith(u))); }
function score(a, b) {
  const A = norm(a).filter(t => !GENERIC.has(t)), B = norm(b).filter(t => !GENERIC.has(t));
  if (!A.length || !B.length) return 0;
  const sa = new Set(A), sb = new Set(B);
  let inter = 0;
  for (const t of sa) {
    if ([...sb].some(u => same(t, u))) inter++;
    else if (t.length >= 4) return 0; // la consulta tiene una palabra distintiva que el candidato no tiene
  }
  const j = inter / Math.max(sa.size, sb.size);
  return j + (A.join(' ') === B.join(' ') ? 0.5 : 0);
}

// Índice: país → equipo → ruta más reciente
const files = fs.readFileSync(treeFile, 'utf8').split('\n').filter(Boolean);
const byCountry = {};
for (const f of files) {
  const parts = f.split('/');
  const league = parts.length === 3 ? parts[1] : parts[2];
  const season = parts.length === 3 ? '9999' : parts[1];
  const country = league.split(' - ')[0];
  const team = parts[parts.length - 1].replace(/\.png$/, '');
  const C = byCountry[country] || (byCountry[country] = {});
  if (!C[team] || C[team].season < season) C[team] = { path: f, season };
}

const out = { base: `https://cdn.jsdelivr.net/gh/luukhopman/football-logos@${commit.slice(0, 12)}/`, M: {}, F: {} };
const report = [];
for (const g of ['M', 'F']) {
  const d = DATA[g];
  for (const [name, li] of d.clubs) {
    const country = COUNTRY[d.leagues[li][1]];
    if (!country || !byCountry[country]) continue;
    if (ALIAS[name] === null) { report.push(`${g} ---- ${name} (sin escudo)`); continue; }
    const query = ALIAS[name] || name;
    let best = null, bs = 0;
    for (const [team, info] of Object.entries(byCountry[country])) {
      const sc = team.toLowerCase() === query.toLowerCase() ? 2 : score(query, team);
      if (sc > bs) { bs = sc; best = { team, ...info }; }
    }
    if (best && bs >= 0.5) {
      out[g][name] = encodeURI(best.path);
      report.push(`${g} ${bs.toFixed(2)} ${name} → ${best.team}`);
    } else report.push(`${g} ---- ${name} (sin escudo)`);
  }
}
const js = '/* Generado por tools/build-crests.js — escudos reales (marcas de sus clubes), cargados desde jsDelivr */\n' +
  'window.TL_CRESTS = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'data/legacy/crests.js'), js);
fs.writeFileSync(path.join(path.dirname(treeFile), 'crest_report.txt'), report.join('\n'));
console.log(`Escudos: ${Object.keys(out.M).length} masculinos, ${Object.keys(out.F).length} femeninos → data/legacy/crests.js`);
