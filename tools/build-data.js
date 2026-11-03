#!/usr/bin/env node
/*
 * TOUCHLINE — genera los datos del juego a partir de data/players.csv
 * (dataset EA SPORTS FC 27 extraído de EA_FC_ANALYSIS-main.zip).
 *
 * Correcciones que aplica:
 *  - Nombre visible: common_name si existe; si no, first_name + last_name.
 *  - Porteros: las columnas pace..physicality contienen DIV/HAN/KIC/REF/SPD/POS.
 *  - height_cm / weight_kg vienen vacíos en todas las filas: se descartan.
 *  - Edad calculada al 1-jul-2026 desde birthdate (DD-MM-YYYY).
 *  - Añade potencial, valor de mercado, salario semanal y fin de contrato
 *    (deterministas, mismas fórmulas que el juego: js/formulas.js).
 *  - Marca qué ligas son jugables (≥10 clubes y no son copas CONMEBOL) y
 *    deduce el país de cada liga.
 *  - Traduce nacionalidades al español y añade su bandera (SVG local,
 *    copiadas de flag-icons a assets/flags/ — los emojis de bandera no se
 *    ven en Windows).
 *
 * Salidas:
 *  - data/players_clean.csv   dataset limpio y enriquecido
 *  - data/game/men.js         datos compactos del juego (fútbol masculino)
 *  - data/game/women.js       datos compactos del juego (fútbol femenino)
 *
 * Uso: node tools/build-data.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('../js/formulas.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'players.csv');
const OUT_DIR = path.join(ROOT, 'data', 'game');
const SEASON = F.SEASON_START;

// ---------------------------------------------------------------- CSV
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function csvCell(v) {
  v = v == null ? '' : String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

// ---------------------------------------------------------------- Naciones
const NATION_OVERRIDES = {
  England: ['Inglaterra', 'GB-ENG'], Scotland: ['Escocia', 'GB-SCT'], Wales: ['Gales', 'GB-WLS'],
  'Northern Ireland': ['Irlanda del Norte', 'GB-NIR'], 'Republic of Ireland': ['Irlanda', 'IE'],
  'Korea Republic': ['Corea del Sur', 'KR'], 'Korea DPR': ['Corea del Norte', 'KP'],
  'China PR': ['China', 'CN'], "Côte d'Ivoire": ['Costa de Marfil', 'CI'],
  'Congo DR': ['RD del Congo', 'CD'], Congo: ['Congo', 'CG'], 'Türkiye': ['Turquía', 'TR'],
  'Cape Verde Islands': ['Cabo Verde', 'CV'], 'Bosnia and Herzegovina': ['Bosnia y Herzegovina', 'BA'],
  'United States': ['Estados Unidos', 'US'], 'Czech Republic': ['Chequia', 'CZ'], Czechia: ['Chequia', 'CZ'],
  Kosovo: ['Kosovo', 'XK'], 'North Macedonia': ['Macedonia del Norte', 'MK'], 'FYR Macedonia': ['Macedonia del Norte', 'MK'],
  'Guinea Bissau': ['Guinea-Bisáu', 'GW'], 'Guinea-Bissau': ['Guinea-Bisáu', 'GW'], 'Holland': ['Países Bajos', 'NL'],
  'Curacao': ['Curazao', 'CW'], 'Curaçao': ['Curazao', 'CW'], 'Chinese Taipei': ['Taiwán', 'TW'],
  'Hong Kong': ['Hong Kong', 'HK'], 'Trinidad & Tobago': ['Trinidad y Tobago', 'TT'],
  'Antigua & Barbuda': ['Antigua y Barbuda', 'AG'], 'São Tomé e Príncipe': ['Santo Tomé y Príncipe', 'ST'],
  'St. Kitts and Nevis': ['San Cristóbal y Nieves', 'KN'], 'St. Lucia': ['Santa Lucía', 'LC'],
  'Central African Republic': ['República Centroafricana', 'CF'], 'Equatorial Guinea': ['Guinea Ecuatorial', 'GQ'],
  'Gambia': ['Gambia', 'GM'], 'Palestine': ['Palestina', 'PS'], 'Iran': ['Irán', 'IR'], 'Syria': ['Siria', 'SY'],
  'Russia': ['Rusia', 'RU'], Turkey: ['Turquía', 'TR'], 'Trinidad and Tobago': ['Trinidad y Tobago', 'TT'],
  'Antigua and Barbuda': ['Antigua y Barbuda', 'AG'], 'Moldova': ['Moldavia', 'MD'], 'Vietnam': ['Vietnam', 'VN'], 'Laos': ['Laos', 'LA']
};

function buildNationTable(names) {
  const en = new Intl.DisplayNames(['en'], { type: 'region' });
  const es = new Intl.DisplayNames(['es'], { type: 'region' });
  const byName = {};
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      let n;
      try { n = en.of(code); } catch (e) { continue; }
      // Ignora códigos obsoletos (p. ej. DD = RDA) que comparten nombre con el actual
      const canon = Intl.getCanonicalLocales('und-' + code)[0].split('-')[1];
      if (n && n !== code && canon === code && !byName[n]) byName[n] = code;
    }
  }
  const out = {}, missing = [];
  for (const name of names) {
    let es_name, code;
    if (NATION_OVERRIDES[name]) [es_name, code] = NATION_OVERRIDES[name];
    else if (byName[name]) { code = byName[name]; es_name = es.of(code); }
    else { es_name = name; code = ''; missing.push(name); }
    out[name] = { es: es_name, flag: flagCode(code) };
  }
  if (missing.length) console.warn('Naciones sin traducción:', missing.join(', '));
  return out;
}

/** Código de bandera (archivo assets/flags/<code>.svg, de flag-icons). */
function flagCode(code) {
  return code ? code.toLowerCase() : '';
}

// ---------------------------------------------------------------- Ligas
// Riqueza relativa de cada liga: escala salarios, presupuestos e ingresos.
const WEALTH = {
  'Premier League': 1.5, 'LALIGA EA SPORTS': 1.15, Bundesliga: 1.15, 'Serie A Enilive': 1.1,
  "Ligue 1 McDonald's": 1.0, 'ROSHN Saudi League': 1.3, MLS: 0.95, 'EFL Championship': 0.8,
  'Liga Portugal': 0.75, Eredivisie: 0.8, 'Trendyol Süper Lig': 0.8, '1A Pro League': 0.7,
  'Liga BBVA MX': 0.75, 'LALIGA HYPERMOTION': 0.55, 'Serie BKT': 0.55, 'Bundesliga 2': 0.6,
  'Ligue 2 BKT': 0.5, LPF: 0.5, 'EFL League One': 0.45, 'EFL League Two': 0.35, '3. Liga': 0.4,
  'Scottish Premiership': 0.55, CSL: 0.6, 'K League 1': 0.5, Ekstraklasa: 0.45,
  'Ö. Bundesliga': 0.5, 'Brack Super League': 0.55, SUPERLIGA: 0.5, Eliteserien: 0.5,
  Allsvenskan: 0.45, 'Isuzu UTE A League': 0.45, ISL: 0.35, "SSE Airtricity Men's Premier Division": 0.3,
  // Femenino (la escala absoluta la pone ECON más abajo)
  NWSL: 1.2, 'Barclays WSL': 1.2, 'Liga F Moeve': 0.9, GPFBL: 0.95, 'Arkema PL': 0.85
};

// Ascensos y descensos entre ligas (superior, inferior, nº de equipos que cambian)
const PROMOTION = [
  ['Premier League', 'EFL Championship', 3],
  ['EFL Championship', 'EFL League One', 3],
  ['EFL League One', 'EFL League Two', 3],
  ['LALIGA EA SPORTS', 'LALIGA HYPERMOTION', 3],
  ['Serie A Enilive', 'Serie BKT', 3],
  ['Bundesliga', 'Bundesliga 2', 2],
  ['Bundesliga 2', '3. Liga', 2],
  ["Ligue 1 McDonald's", 'Ligue 2 BKT', 2]
];

const ECON = {
  M: { value: 1, wage: 1 },
  F: { value: 0.015, wage: 0.04 }
};

// ---------------------------------------------------------------- Main
function main() {
  const rows = parseCSV(fs.readFileSync(SRC, 'utf8'));
  console.log('Jugadores leídos:', rows.length);

  const nations = buildNationTable([...new Set(rows.map(r => r.nationality))].sort());

  // Enriquecer filas
  for (const r of rows) {
    r._g = r.gender.startsWith('Women') ? 'F' : 'M';
    r._name = (r.common_name || `${r.first_name} ${r.last_name}`).trim();
    let short = (r.common_name || r.last_name || r.first_name).trim();
    if (short.length > 14 && short.includes(' ')) short = short.split(' ')[0];
    r._short = short;
    r._age = F.ageAt(r.birthdate, SEASON);
    r._ovr = +r.overall_rating;
    r._pot = F.potentialFor(r._ovr, r._age, F.seeded('pot' + r.player_id));
    r._contract = F.contractFor(r._age, F.seeded('ctr' + r.player_id), SEASON);
    r._isGK = r.position === 'GK';
  }

  // Ligas por género
  const leagues = {};
  for (const r of rows) {
    const key = r._g + '|' + r.league;
    const L = leagues[key] || (leagues[key] = { name: r.league, g: r._g, clubs: new Map(), nats: {} });
    if (!L.clubs.has(r.club)) L.clubs.set(r.club, []);
    L.clubs.get(r.club).push(r);
    L.nats[r.nationality] = (L.nats[r.nationality] || 0) + 1;
  }
  for (const L of Object.values(leagues)) {
    const isCup = /CONMEBOL/.test(L.name);
    L.country = isCup ? 'Sudamérica' : nations[Object.entries(L.nats).sort((a, b) => b[1] - a[1])[0][0]].es;
    L.flag = isCup ? '' : nations[Object.entries(L.nats).sort((a, b) => b[1] - a[1])[0][0]].flag;
    L.playable = !isCup && L.clubs.size >= 10;
    let reps = [];
    for (const players of L.clubs.values()) {
      const top = players.map(p => p._ovr).sort((a, b) => b - a).slice(0, 16);
      reps.push(top.reduce((a, b) => a + b, 0) / top.length);
    }
    L.avgRep = reps.reduce((a, b) => a + b, 0) / reps.length;
    L.wealth = WEALTH[L.name] ?? Math.max(0.25, Math.min(0.9, 0.3 + (L.avgRep - 60) * 0.04));
  }
  for (const r of rows) {
    const L = leagues[r._g + '|' + r.league];
    const econ = ECON[r._g];
    r._value = F.marketValue(r._ovr, r._age, r._pot, r.position, econ.value);
    r._wage = F.wageFor(r._ovr, r._age, L.wealth, econ.wage);
    r._leagueCountry = L.country;
    r._playable = L.playable;
  }

  writeCleanCSV(rows, nations);
  copyFlags(Object.values(nations).map(n => n.flag).filter(Boolean));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const g of ['M', 'F']) writeGameFile(g, rows.filter(r => r._g === g), leagues, nations);
}

/** Copia las banderas usadas desde flag-icons (npm pack flag-icons) si está disponible. */
function copyFlags(codes) {
  const src = process.env.FLAG_ICONS_DIR;
  const dst = path.join(ROOT, 'assets', 'flags');
  if (!src) { console.log('FLAG_ICONS_DIR no definido: se mantienen las banderas de assets/flags'); return; }
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const c of new Set(codes)) {
    const f = path.join(src, c + '.svg');
    if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(dst, c + '.svg')); n++; }
    else console.warn('Sin bandera para', c);
  }
  console.log(`${n} banderas copiadas a assets/flags`);
}

function writeCleanCSV(rows, nations) {
  const drop = new Set(['height_cm', 'weight_kg']);
  const orig = Object.keys(rows[0]).filter(k => !k.startsWith('_') && !drop.has(k));
  const extra = ['display_name', 'short_name', 'age', 'potential', 'market_value_eur', 'wage_eur_week',
    'contract_until', 'card_stat_labels', 'nationality_es', 'league_country', 'playable_league'];
  const lines = [orig.concat(extra).join(',')];
  for (const r of rows) {
    const vals = orig.map(k => r[k]).concat([
      r._name, r._short, r._age, r._pot, r._value, r._wage, r._contract,
      r._isGK ? 'DIV|HAN|KIC|REF|SPD|POS' : 'PAC|SHO|PAS|DRI|DEF|PHY',
      nations[r.nationality].es, r._leagueCountry, r._playable ? 1 : 0
    ]);
    lines.push(vals.map(csvCell).join(','));
  }
  fs.writeFileSync(path.join(ROOT, 'data', 'players_clean.csv'), lines.join('\n') + '\n');
  console.log('data/players_clean.csv escrito');
}

function writeGameFile(g, rows, leagues, nations) {
  const Ls = Object.values(leagues).filter(L => L.g === g)
    .sort((a, b) => (b.playable - a.playable) || (b.avgRep - a.avgRep));
  const leagueIdx = new Map(Ls.map((L, i) => [L.name, i]));
  const clubs = [], clubIdx = new Map();
  Ls.forEach((L, li) => {
    for (const name of [...L.clubs.keys()].sort()) {
      clubIdx.set(name + '|' + li, clubs.length);
      clubs.push([name, li]);
    }
  });
  const natNames = [...new Set(rows.map(r => r.nationality))].sort();
  const natIdx = new Map(natNames.map((n, i) => [n, i]));

  const players = rows
    .sort((a, b) => b._ovr - a._ovr)
    .map(r => [
      r._name, r._short,
      clubIdx.get(r.club + '|' + leagueIdx.get(r.league)),
      natIdx.get(r.nationality), r.position, r.alternate_positions,
      r._age, r._ovr, r._pot, r.preferred_foot === 'Left' ? 0 : 1, +r.skill_moves, +r.weak_foot,
      +r.pace, +r.shooting, +r.passing, +r.dribbling, +r.defending, +r.physicality,
      r._contract, r._wage, +r.player_id
    ]);

  const promotion = PROMOTION
    .filter(([up, down]) => leagueIdx.has(up) && leagueIdx.has(down))
    .map(([up, down, n]) => [leagueIdx.get(up), leagueIdx.get(down), n]);

  const data = {
    gender: g,
    season: SEASON,
    econ: ECON[g],
    source: 'EA SPORTS FC 27 · snapshot ' + rows[0].snapshot_date,
    cols: ['name', 'short', 'club', 'nat', 'pos', 'alt', 'age', 'ovr', 'pot', 'foot', 'sm', 'wf',
      's1', 's2', 's3', 's4', 's5', 's6', 'contract', 'wage', 'srcId'],
    leagues: Ls.map(L => [L.name, L.country, L.flag, L.playable ? 1 : 0, +L.wealth.toFixed(2)]),
    promotion,
    clubs,
    nations: natNames.map(n => [nations[n].es, nations[n].flag]),
    players
  };
  const file = path.join(OUT_DIR, g === 'M' ? 'men.js' : 'women.js');
  const js = '/* Generado por tools/build-data.js — no editar a mano */\n' +
    'window.TL_DATA = window.TL_DATA || {};\nwindow.TL_DATA.' + g + ' = ' + JSON.stringify(data) + ';\n';
  fs.writeFileSync(file, js);
  const playable = Ls.filter(L => L.playable).length;
  console.log(`${path.relative(ROOT, file)}: ${players.length} jugadores, ${clubs.length} clubes, ` +
    `${Ls.length} ligas (${playable} jugables), ${(js.length / 1024 / 1024).toFixed(2)} MB`);
}

main();
