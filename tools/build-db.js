#!/usr/bin/env node
/*
 * TOUCHLINE — genera los datos del juego a partir de la base de datos sin licencias (data/db/).
 *
 * Entradas (data/db/): players_clean.csv, clubs.json, leagues.json
 * Salidas:
 *  - data/game/men.js, data/game/women.js   datos compactos del juego
 *  - data/game/pyramid.js                    divisiones inferiores (versión 2, clubes inventados)
 *  - data/db/escudos/P*.svg                   escudos de los clubes de esas divisiones
 *  - data/db/escudos/index.json               qué escudos van en cada spritesheet (M / F)
 * Después: node tools/build-crest-atlas.js   (pinta los escudos en la cuadrícula assets/escudos/escudos-*.png)
 *
 * La base de datos antigua (dataset con nombres reales) queda en data/legacy/ con su script en tools/legacy/.
 * Uso: node tools/build-db.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('../js/formulas.js');

const ROOT = path.join(__dirname, '..');
const DB = path.join(ROOT, 'data', 'db');
const OUT_DIR = path.join(ROOT, 'data', 'game');
const CREST_DIR = path.join(ROOT, 'data', 'db', 'escudos');
const SEASON = F.SEASON_START;

// ---------------------------------------------------------------- CSV
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c;
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

// ---------------------------------------------------------------- Naciones (bandera = código ISO de flag-icons)
const NATION_OVERRIDES = {
  England: 'gb-eng', Scotland: 'gb-sct', Wales: 'gb-wls', 'Northern Ireland': 'gb-nir', 'Republic of Ireland': 'ie',
  'Korea Republic': 'kr', 'Korea DPR': 'kp', 'China PR': 'cn', "Côte d'Ivoire": 'ci', 'Congo DR': 'cd', Congo: 'cg',
  'Türkiye': 'tr', Turkey: 'tr', 'Cape Verde Islands': 'cv', 'Bosnia and Herzegovina': 'ba', 'United States': 'us',
  'Czech Republic': 'cz', Czechia: 'cz', Kosovo: 'xk', 'North Macedonia': 'mk', 'FYR Macedonia': 'mk',
  'Guinea Bissau': 'gw', 'Guinea-Bissau': 'gw', Holland: 'nl', Curacao: 'cw', 'Curaçao': 'cw', 'Chinese Taipei': 'tw',
  'Hong Kong': 'hk', 'Trinidad & Tobago': 'tt', 'Trinidad and Tobago': 'tt', 'Antigua & Barbuda': 'ag', 'Antigua and Barbuda': 'ag',
  'São Tomé e Príncipe': 'st', 'St. Kitts and Nevis': 'kn', 'St. Lucia': 'lc', 'Central African Republic': 'cf',
  'Equatorial Guinea': 'gq', Gambia: 'gm', Palestine: 'ps', Iran: 'ir', Syria: 'sy', Russia: 'ru', Moldova: 'md', Vietnam: 'vn', Laos: 'la'
};
function flagOf(name) {
  if (NATION_OVERRIDES[name]) return NATION_OVERRIDES[name];
  const en = new Intl.DisplayNames(['en'], { type: 'region' });
  for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    let n; try { n = en.of(code); } catch (e) { continue; }
    const canon = Intl.getCanonicalLocales('und-' + code)[0].split('-')[1];
    if (n === name && canon === code) return code.toLowerCase();
  }
  return '';
}
// País de una liga (en castellano) → bandera
const COUNTRY_FLAG = {
  Inglaterra: 'gb-eng', Escocia: 'gb-sct', Gales: 'gb-wls', 'Estados Unidos': 'us', 'Emiratos Árabes Unidos': 'ae', Catar: 'qa',
  'Corea del Sur': 'kr', 'Arabia Saudí': 'sa', 'Países Bajos': 'nl', Chequia: 'cz', Rusia: 'ru', Azerbaiyán: 'az', Alemania: 'de',
  Argentina: 'ar', Australia: 'au', Austria: 'at', Bélgica: 'be', Bolivia: 'bo', Brasil: 'br', Bulgaria: 'bg', Chile: 'cl', China: 'cn',
  Chipre: 'cy', Colombia: 'co', Croacia: 'hr', Dinamarca: 'dk', Ecuador: 'ec', Egipto: 'eg', España: 'es', Finlandia: 'fi', Francia: 'fr',
  Grecia: 'gr', Hungría: 'hu', India: 'in', Irlanda: 'ie', Islandia: 'is', Italia: 'it', Japón: 'jp', Marruecos: 'ma', México: 'mx',
  Noruega: 'no', Paraguay: 'py', Perú: 'pe', Polonia: 'pl', Portugal: 'pt', Rumanía: 'ro', Serbia: 'rs', Suecia: 'se', Suiza: 'ch',
  Tailandia: 'th', Turquía: 'tr', Ucrania: 'ua', Uruguay: 'uy', Venezuela: 've'
};

// ---------------------------------------------------------------- Ligas
// Riqueza relativa (escala salarios, presupuestos e ingresos): asociación + división (F = femenina)
const WEALTH = {
  'ENG-1': 1.5, 'ESP-1': 1.15, 'GER-1': 1.15, 'ITA-1': 1.1, 'FRA-1': 1.0, 'KSA-1': 1.3, 'USA-1': 0.95, 'ENG-2': 0.8, 'POR-1': 0.75,
  'NED-1': 0.8, 'TUR-1': 0.8, 'BEL-1': 0.7, 'MEX-1': 0.75, 'BRA-1': 0.7, 'ESP-2': 0.55, 'ITA-2': 0.55, 'GER-2': 0.6, 'FRA-2': 0.5,
  'ARG-1': 0.5, 'ENG-3': 0.45, 'ENG-4': 0.35, 'GER-3': 0.4, 'SCO-1': 0.55, 'CHN-1': 0.6, 'KOR-1': 0.5, 'JPN-1': 0.6, 'POL-1': 0.45,
  'AUT-1': 0.5, 'SUI-1': 0.55, 'DEN-1': 0.5, 'NOR-1': 0.5, 'SWE-1': 0.45, 'AUS-1': 0.45, 'IND-1': 0.35, 'IRL-1': 0.3, 'QAT-1': 0.7,
  'UAE-1': 0.7, 'GRE-1': 0.5, 'CZE-1': 0.45, 'RUS-1': 0.55, 'UKR-1': 0.4, 'CRO-1': 0.4, 'SRB-1': 0.38, 'ROU-1': 0.35, 'HUN-1': 0.35,
  'CYP-1': 0.35, 'COL-1': 0.38, 'CHI-1': 0.35, 'URU-1': 0.32, 'ECU-1': 0.32, 'PAR-1': 0.3, 'PER-1': 0.3, 'BOL-1': 0.25, 'VEN-1': 0.25,
  'EGY-1': 0.35, 'MAR-1': 0.35,
  'ENG-F': 1.2, 'USA-F': 1.2, 'ESP-F': 0.9, 'GER-F': 0.95, 'FRA-F': 0.85
};
// Ascensos entre divisiones de la misma asociación: equipos que cambian (por defecto 3)
const PROMO_K = { GER: 2, FRA: 2 };
const ECON = { M: { value: 1, wage: 1 }, F: { value: 0.015, wage: 0.04 } };
// Dibujo de la camiseta según el del escudo
const KIT_P = { rayas: 's', diagonal: 'x', banda: 'h', mitades: 'v', cuarteles: 'k', chevron: '', liso: '' };

// ---------------------------------------------------------------- Divisiones inferiores inventadas (pirámide v2)
const PYRAMID = {
  M: [
    ['Liga Española 3', 'Liga Española 2', 'es', 4, 0.32, 64.5, 20], ['Liga Española 4', 'Liga Española 3', 'es', 4, 0.2, 60, 20],
    ['Liga Inglesa 5', 'Liga Inglesa 4', 'en', 2, 0.24, 58.5, 24],
    ['Liga Italiana 3', 'Liga Italiana 2', 'it', 4, 0.32, 64, 20], ['Liga Italiana 4', 'Liga Italiana 3', 'it', 4, 0.2, 59.5, 20],
    ['Liga Alemana 4', 'Liga Alemana 3', 'de', 4, 0.24, 60, 18],
    ['Liga Francesa 3', 'Liga Francesa 2', 'fr', 3, 0.3, 62.5, 18], ['Liga Francesa 4', 'Liga Francesa 3', 'fr', 3, 0.2, 58.5, 18],
    ['Liga Portuguesa 2', 'Liga Portuguesa', 'pt', 2, 0.4, 65, 18], ['Liga Neerlandesa 2', 'Liga Neerlandesa', 'nl', 2, 0.42, 64.5, 18],
    ['Liga Turca 2', 'Liga Turca', 'tr', 3, 0.42, 65.5, 18], ['Liga Escocesa 2', 'Liga Escocesa', 'sco', 1, 0.3, 61.5, 10],
    ['Liga Belga 2', 'Liga Belga', 'be', 2, 0.38, 64, 16]
  ],
  F: [
    ['Liga Inglesa Femenina 2', 'Liga Inglesa Femenina', 'en', 1, 0.6, 69, 12], ['Liga Alemana Femenina 2', 'Liga Alemana Femenina', 'de', 2, 0.5, 67, 14],
    ['Liga Española Femenina 2', 'Liga Española Femenina', 'es', 2, 0.45, 66, 16], ['Liga Francesa Femenina 2', 'Liga Francesa Femenina', 'fr', 2, 0.42, 65, 12]
  ]
};
// Nombres de pueblo por estilo: [inicios, finales, prefijos de club, sufijos de club]
const STYLE = {
  es: [['Val', 'Torre', 'Villa', 'Casa', 'Puerto', 'Monte', 'Alca', 'Bena', 'Sanlu', 'Mora', 'Cuen', 'Ari', 'Bur', 'Pal', 'Sego', 'Alme', 'Cala', 'Fuen', 'Riba', 'Olme'],
    ['dera', 'mora', 'lejo', 'nueva', 'rrubia', 'calde', 'guera', 'tillo', 'lanca', 'reda', 'cena', 'gorda', 'mares', 'llana', 'rosa', 'dosa'],
    ['CD', 'UD', 'CF', 'SD', 'Real', 'Atlético', 'Racing', 'Deportivo', 'Gimnástica', 'Unión'], []],
  en: [['Ash', 'Brad', 'Card', 'Hart', 'Kings', 'Mill', 'North', 'Stan', 'Wey', 'Black', 'Thorn', 'Wel', 'Cran', 'Hol', 'Bram', 'Fen'],
    ['ford', 'ley', 'ton', 'borough', 'field', 'wick', 'mouth', 'ham', 'by', 'port', 'stead', 'bridge'],
    [], ['Town', 'United', 'City', 'Rovers', 'Athletic', 'Albion', 'Wanderers', 'FC', 'Borough']],
  sco: [['Kil', 'Dun', 'Inver', 'Glen', 'Strath', 'Bal', 'Aber', 'Kirk', 'Loch', 'Craig'],
    ['more', 'keld', 'ness', 'ross', 'brae', 'lin', 'dee', 'haven', 'ford', 'muir'],
    [], ['FC', 'Athletic', 'Rovers', 'United', 'Thistle', 'Star']],
  it: [['Castel', 'Monte', 'Ponte', 'Borgo', 'Villa', 'San', 'Porto', 'Santa', 'Val', 'Sasso', 'Rocca', 'Lago'],
    ['franco', 'rosso', 'lungo', 'verde', 'nuova', 'bello', 'fiore', 'sereno', 'alto', 'marino', 'chiaro', 'dorato'],
    ['AC', 'US', 'SS', 'FC', 'Calcio', 'ASD', 'Virtus', 'Polisportiva'], []],
  de: [['Wald', 'Berg', 'Neu', 'Ober', 'Unter', 'Linden', 'Eichen', 'Hohen', 'Rosen', 'Stein', 'Kirch', 'Mühl'],
    ['dorf', 'burg', 'hausen', 'feld', 'heim', 'bach', 'stadt', 'au', 'tal', 'berg', 'hagen', 'brück'],
    ['FC', 'SV', 'VfB', 'TSV', 'SC', 'VfL', 'SpVgg', 'FSV', 'Eintracht', 'Union'], []],
  fr: [['Saint-', 'Mont', 'Ville', 'Beau', 'Fontaine', 'Bourg', 'Château', 'Pont', 'Roche', 'Val', 'Mar', 'Lan'],
    ['mont', 'ville', 'fort', 'court', 'lieu', 'bourg', 'vert', 'lac', 'pierre', 'champ', 'noble', 'rive'],
    ['AS', 'FC', 'US', 'SC', 'Stade', 'Olympique', 'RC', 'AC', 'ES'], []],
  pt: [['Vila', 'Porto', 'Santa', 'Ponte', 'Monte', 'Rio', 'Torre', 'Alto', 'Vale', 'Serra'],
    ['nova', 'alegre', 'verde', 'branca', 'formosa', 'velha', 'grande', 'real', 'mar', 'clara'],
    ['SC', 'CD', 'FC', 'GD', 'União', 'Académico', 'Atlético', 'CF'], []],
  nl: [['Wester', 'Ooster', 'Noord', 'Zuid', 'Hoog', 'Berg', 'Rijn', 'Maas', 'Veen', 'Kerk', 'Dijk', 'Zand'],
    ['dam', 'wijk', 'hoven', 'veld', 'burg', 'berg', 'dijk', 'meer', 'horst', 'loo', 'brug', 'stad'],
    ['FC', 'SC', 'VV', 'SV', 'BV'], []],
  tr: [['Kara', 'Ak', 'Yeni', 'Eski', 'Büyük', 'Kızıl', 'Deniz', 'Dağ', 'Gök', 'Ulu'],
    ['pınar', 'köy', 'şehir', 'dere', 'tepe', 'kale', 'ova', 'yurt', 'su', 'bahçe'],
    [], ['spor', ' SK', ' Belediyespor', ' FK', ' Gençlik']],
  be: [['Ooster', 'Sint-', 'Mol', 'Lo', 'Her', 'Ber', 'Wa', 'Ha', 'Tur', 'Zele'],
    ['kerke', 'gem', 'beek', 'laar', 'hout', 'velde', 'ville', 'mont', 'rode', 'dal'],
    ['KV', 'KSV', 'RFC', 'Sporting', 'FC', 'RE', 'KFC'], []]
};
const PALETTE = ['#C8102E', '#1D428A', '#00843D', '#FFD100', '#111111', '#FFFFFF', '#6CACE4', '#5B2C83', '#E35205', '#7A263A', '#00A3E0',
  '#B9975B', '#0B3D91', '#007A33', '#FF6F00', '#9E1B32', '#003087', '#2E8B57', '#F2C230', '#8B0000'];
const SHAPES = {
  escudo: 'M50 4 L92 14 L92 52 C92 80 70 96 50 104 C30 96 8 80 8 52 L8 14 Z',
  pico: 'M10 6 L90 6 L90 60 L50 104 L10 60 Z',
  redondo: 'M50 6 A46 46 0 1 1 49.9 6 Z',
  ovalo: 'M50 4 C78 4 92 30 92 55 C92 82 74 104 50 104 C26 104 8 82 8 55 C8 30 22 4 50 4 Z',
  clasico: 'M8 8 L92 8 L92 46 C92 76 74 96 50 104 C26 96 8 76 8 46 Z'
};

/** Azar con semilla: los clubes inventados salen siempre iguales. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const initialsOf = name => {
  const ws = name.replace(/[^\p{L} ]/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !/^(FC|CD|UD|CF|SD|AC|US|SS|SC|SV|VV|BV|KV|RE|AS|RC|ES|GD|FK|SK|ASD|TSV|VfB|VfL|FSV|KSV|RFC|KFC)$/.test(w));
  const w = ws[0] || name;
  return (ws.length > 1 ? w.slice(0, 2) + ws[1][0] : w.slice(0, 3)).toUpperCase();
};

function crestSVG(id, shape, pattern, c1, c2, ini) {
  const d = SHAPES[shape], k = id + '-k';
  const pat = {
    liso: '',
    rayas: [0, 1, 2, 3, 4].map(i => (i % 2 ? `<rect x="${i * 20}" y="0" width="20" height="110" fill="${c2}"/>` : '')).join(''),
    diagonal: `<path d="M-10 95 L95 -10 L115 10 L10 115 Z" fill="${c2}"/>`,
    banda: `<rect x="0" y="40" width="100" height="26" fill="${c2}"/>`,
    mitades: `<rect x="50" y="0" width="50" height="110" fill="${c2}"/>`,
    cuarteles: `<rect x="50" y="0" width="50" height="55" fill="${c2}"/><rect x="0" y="55" width="50" height="55" fill="${c2}"/>`,
    chevron: `<path d="M0 30 L50 62 L100 30 L100 52 L50 84 L0 52 Z" fill="${c2}"/>`
  }[pattern] || '';
  const ink = /^#(F|E|D)/i.test(c1) && /^#(F|E|D)/i.test(c2) ? '#111111' : '#111111';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="100" height="110"><defs><clipPath id="k"><path d="${d}"/></clipPath></defs>` +
    `<g clip-path="url(#k)"><rect width="100" height="110" fill="${c1}"/>${pat}</g><path d="${d}" fill="none" stroke="${ink}" stroke-width="4"/>` +
    `<circle cx="50" cy="56" r="22" fill="${c1}" stroke="${ink}" stroke-width="2.5"/><text x="50" y="64.6" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${ini.length > 3 ? 19 : 24}" text-anchor="middle" fill="${c1 === '#111111' ? '#FFFFFF' : ink}">${ini}</text></svg>`.replace(/url\(#k\)/g, `url(#k)`);
}

function makePyramid(g, takenNames) {
  const out = [];
  let n = 0;
  const r = rng(g === 'M' ? 20260 : 20261);
  for (const [name, under, style, k, wealth, rep, size] of PYRAMID[g]) {
    const S = STYLE[style];
    const clubs = [];
    let guard = 0;
    while (clubs.length < size && guard++ < 5000) {
      const town = pick(r, S[0]) + pick(r, S[1]);
      let club;
      if (S[2].length && (!S[3].length || r() < 0.6)) club = pick(r, S[2]) + ' ' + town;
      else if (S[3].length) { const suf = pick(r, S[3]); club = suf.startsWith(' ') || /^[a-zçğışöü]/.test(suf) ? town + suf : town + ' ' + suf; }
      else club = town;
      club = club.replace(/- /g, '-').replace(/\s+/g, ' ').trim();
      const key = club.toLowerCase();
      if (takenNames.has(key)) continue;
      takenNames.add(key);
      let c1 = pick(r, PALETTE), c2 = pick(r, PALETTE);
      while (c2 === c1) c2 = pick(r, PALETTE);
      const id = 'P' + g + String(++n).padStart(3, '0');
      const shape = pick(r, Object.keys(SHAPES)), pattern = pick(r, Object.keys(KIT_P));
      const ini = initialsOf(club);
      fs.writeFileSync(path.join(CREST_DIR, id + '.svg'), crestSVG(id, shape, pattern, c1, c2, ini));
      clubs.push([club, c1, c2, id, ini, KIT_P[pattern]]);
    }
    out.push({ name, under, country: null, flag: null, k, wealth, rep, clubs });
  }
  return out;
}

// ---------------------------------------------------------------- Main
function main() {
  const rows = parseCSV(fs.readFileSync(path.join(DB, 'players_clean.csv'), 'utf8'));
  const clubsDB = JSON.parse(fs.readFileSync(path.join(DB, 'clubs.json'), 'utf8'));
  const leaguesDB = JSON.parse(fs.readFileSync(path.join(DB, 'leagues.json'), 'utf8'));
  console.log('Jugadores:', rows.length, '· clubes:', clubsDB.length, '· ligas:', leaguesDB.length);
  const clubById = new Map(clubsDB.map(c => [c.id, c]));
  const nationFlag = {};
  for (const r of rows) if (!(r.nationality in nationFlag)) nationFlag[r.nationality] = flagOf(r.nationality);
  const missing = Object.keys(nationFlag).filter(k => !nationFlag[k]);
  if (missing.length) console.warn('Naciones sin bandera:', missing.join(', '));

  const sprite = { M: [], F: [] };
  const pyr = {};
  for (const g of ['M', 'F']) {
    const R = rows.filter(r => r.gender === g);
    // Ligas con jugadores de este género
    const byClub = new Map();
    for (const r of R) (byClub.get(r.club_id) || byClub.set(r.club_id, []).get(r.club_id)).push(r);
    const Ls = leaguesDB.filter(l => l.gender === g).map(l => {
      const ids = l.club_ids.filter(id => byClub.has(id));
      const reps = ids.map(id => { const top = byClub.get(id).map(p => +p.overall_rating).sort((a, b) => b - a).slice(0, 16); return top.reduce((a, b) => a + b, 0) / top.length; });
      const avgRep = reps.length ? reps.reduce((a, b) => a + b, 0) / reps.length : 50;
      const key = l.asociacion + '-' + (g === 'F' ? 'F' : l.division || 1);
      const wealth = WEALTH[key] ?? Math.max(0.25, Math.min(0.9, 0.3 + (avgRep - 60) * 0.04));
      return Object.assign({}, l, { ids, avgRep, wealth, playable: l.playable && ids.length >= 10 });
    }).filter(l => l.ids.length);
    Ls.sort((a, b) => (b.playable - a.playable) || (b.avgRep - a.avgRep));
    const leagueIdx = new Map(Ls.map((L, i) => [L.name, i]));
    const clubs = [], clubIdx = new Map();
    Ls.forEach((L, li) => {
      for (const id of L.ids.slice().sort((a, b) => clubById.get(a).name.localeCompare(clubById.get(b).name))) {
        const c = clubById.get(id);
        clubIdx.set(id, clubs.length);
        clubs.push([c.name, li, c.color1, c.color2, c.id, c.initials, c.coef_inicial || 0, KIT_P[c.crest_pattern] || '']);
        sprite[g].push(c.id);
      }
    });
    const natNames = [...new Set(R.map(r => r.nationality))].sort();
    const natIdx = new Map(natNames.map((n, i) => [n, i]));
    const natEs = {};
    for (const r of R) natEs[r.nationality] = r.nationality_es || r.nationality;
    const econ = ECON[g];
    const players = R.filter(r => clubIdx.has(r.club_id)).sort((a, b) => b.overall_rating - a.overall_rating).map(r => {
      const L = Ls[clubs[clubIdx.get(r.club_id)][1]];
      const ovr = +r.overall_rating, age = +r.age;
      const name = (r.display_name || r.common_name || `${r.first_name} ${r.last_name}`).trim();
      let short = (r.short_name || r.common_name || r.last_name || r.first_name).trim();
      if (short.length > 14 && short.includes(' ')) short = short.split(' ')[0];
      return [name, short, clubIdx.get(r.club_id), natIdx.get(r.nationality), r.position, r.alternate_positions,
        age, ovr, +r.potential || ovr, r.preferred_foot === 'Left' ? 0 : 1, +r.skill_moves || 2, +r.weak_foot || 2,
        +r.pace, +r.shooting, +r.passing, +r.dribbling, +r.defending, +r.physicality,
        +r.contract_until || F.contractFor(age, F.seeded('ctr' + r.player_id), SEASON), F.wageFor(ovr, age, L.wealth, econ.wage), +r.player_id];
    });
    // Ascensos: divisiones seguidas de la misma asociación
    const promotion = [];
    for (const L of Ls) {
      if (g !== 'M' || !L.division) continue;
      const down = Ls.find(x => x.asociacion === L.asociacion && x.division === L.division + 1);
      if (down) promotion.push([leagueIdx.get(L.name), leagueIdx.get(down.name), PROMO_K[L.asociacion] || 3]);
    }
    const data = {
      gender: g, season: SEASON, econ, db: 'v3',
      source: 'Base de datos sin licencias v3',
      cols: ['name', 'short', 'club', 'nat', 'pos', 'alt', 'age', 'ovr', 'pot', 'foot', 'sm', 'wf', 's1', 's2', 's3', 's4', 's5', 's6', 'contract', 'wage', 'srcId'],
      // [nombre, país, bandera, jugable, riqueza, división, asociación, confederación, ranking UEFA, región AFC]
      leagues: Ls.map(L => [L.name, L.country, COUNTRY_FLAG[L.country] || '', L.playable ? 1 : 0, +L.wealth.toFixed(2),
        L.division || 0, L.asociacion || '', L.confederacion || '', L.ranking_uefa || 0, L.region_afc || '']),
      promotion,
      // [nombre, liga, color 1, color 2, escudo, iniciales, coeficiente, dibujo de la camiseta]
      clubs,
      nations: natNames.map(n => [natEs[n], nationFlag[n]]),
      players
    };
    const file = path.join(OUT_DIR, g === 'M' ? 'men.js' : 'women.js');
    const js = '/* Generado por tools/build-db.js a partir de data/db/ — no editar a mano */\n' +
      'window.TL_DATA = window.TL_DATA || {};\nwindow.TL_DATA.' + g + ' = ' + JSON.stringify(data) + ';\n';
    fs.writeFileSync(file, js);
    console.log(`${path.relative(ROOT, file)}: ${players.length} jugadores, ${clubs.length} clubes, ${Ls.length} ligas (${Ls.filter(l => l.playable).length} jugables), ${(js.length / 1048576).toFixed(2)} MB`);
    // Pirámide inventada debajo de las divisiones de la base de datos
    const taken = new Set(clubsDB.map(c => c.name.toLowerCase()));
    const P = makePyramid(g, taken);
    for (const L of P) {
      const parent = Ls.find(x => x.name === L.under) || (P.find(x => x.name === L.under) && { country: null });
      const top = Ls.find(x => x.name === L.under) || Ls.find(x => x.name === P.find(y => y.name === L.under).under);
      L.country = top ? top.country : '';
      L.flag = COUNTRY_FLAG[L.country] || '';
      void parent;
      for (const c of L.clubs) sprite[g].push(c[3]);
    }
    pyr[g] = P;
  }
  const pjs = '/* Generado por tools/build-db.js — divisiones inferiores inventadas (pirámide v2) para subir desde abajo.\n' +
    '   Las partidas guardadas con la versión 2 dependen de que esta lista no cambie: para cambiarla, crea la versión 3. */\n' +
    'window.TL_PYRAMID_V = 2;\nwindow.TL_PYRAMID = Object.assign(window.TL_PYRAMID || {}, { 2: ' + JSON.stringify(pyr) + ' });\n';
  fs.writeFileSync(path.join(OUT_DIR, 'pyramid.js'), pjs);
  fs.writeFileSync(path.join(CREST_DIR, 'index.json'), JSON.stringify(sprite));
  console.log('data/game/pyramid.js:', Object.entries(pyr).map(([g, P]) => `${g} ${P.length} ligas, ${P.reduce((s, L) => s + L.clubs.length, 0)} clubes`).join(' · '));
  console.log('data/db/escudos/index.json:', sprite.M.length, 'M ·', sprite.F.length, 'F');
}

main();
