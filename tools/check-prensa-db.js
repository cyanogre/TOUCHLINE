#!/usr/bin/env node
/* Valida la base de datos de prensa (data/game/prensa/*.js): esquema, referencias y recuentos.
 * Uso: node tools/check-prensa-db.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'data', 'game', 'prensa');
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const DB = ctx.window.TL_PRENSA_DB || {};
const STYLES = ['hum', 'pro', 'dur', 'pol', 'eva', 'tec', 'amb', 'hu'];
const errs = [], P = DB.personas || {}, ids = Object.keys(P);
const err = m => errs.push(m);
const sigKeys = new Set();
const checkSig = (where, sig) => { for (const k in sig || {}) { if (!P[k] && !k.includes(':') && !/^[a-z_]+$/.test(k)) err(`${where}: señal rara «${k}»`); if (P[k] == null) sigKeys.add(k); } };
let answers = 0, strings = 0;
const str = t => { if (typeof t === 'string') strings++; return t; };
for (const id of ids) {
  const p = P[id], w = `persona ${id}`;
  ['n', 'motes', 'sig', 'eff', 'pista', 'mote', 'noticia', 'profe', 'caps'].forEach(k => { if (!p[k]) err(`${w}: falta ${k}`); });
  if (!Array.isArray(p.motes) || p.motes.length < 2) err(`${w}: pocos motes`);
  (p.motes || []).forEach(str); (p.pista || []).forEach(str); (p.profe || []).forEach(str); (p.noticia || []).forEach(str);
  for (const s of [].concat(p.nat || [], p.anti || [])) if (!STYLES.includes(s)) err(`${w}: estilo «${s}» no existe`);
  checkSig(w, p.sig);
  if (p.mote) { str(p.mote.q); (p.mote.a || []).forEach(a => { answers++; str(a.t); if (!STYLES.includes(a.cat)) err(`${w} mote: estilo «${a.cat}»`); }); if (!(p.mote.a || []).some(a => a.abraza) || !(p.mote.a || []).some(a => !a.abraza)) err(`${w}: el mote necesita respuestas para abrazarlo y para rechazarlo`); }
  if ((p.caps || []).length !== 3) err(`${w}: deben ser 3 capítulos`);
  (p.caps || []).forEach((c, k) => {
    str(c.tit); str(c.q); (c.n || []).forEach(str);
    if (!c.n || c.n.length !== 2) err(`${w} cap ${k + 1}: noticia [título, cuerpo]`);
    (c.o || []).forEach(a => { answers++; str(a.t); if (!STYLES.includes(a.cat)) err(`${w} cap ${k + 1}: estilo «${a.cat}»`); for (const s in a.sig || {}) if (!P[s]) err(`${w} cap ${k + 1}: personalidad «${s}» no existe`); });
    if ((c.o || []).length < 3) err(`${w} cap ${k + 1}: al menos 3 respuestas`);
  });
}
// Señales: cada clave de señal debe alimentar a alguien
// Señales que el juego emite de verdad (js/persona.js y sus enganches); cualquier otra es una errata
const EMITTED = new Set(['estilo:hum', 'estilo:pro', 'estilo:dur', 'estilo:pol', 'estilo:eva', 'estilo:tec', 'estilo:amb', 'estilo:hu',
  'silencio', 'muletilla', 'nuke:pres', 'nuke:walk', 'nuke:ref', 'plantar', 'solo', 'comodin', 'comodin_lider', 'comodin_profesional',
  'comodin_bromista', 'comodin_bocazas', 'protesta', 'protesta_mal', 'roja_tecnico', 'flechazo', 'lio', 'act:bbq', 'act:dayoff',
  'act:retreat', 'sponsor_riesgo', 'campana', 'titulo', 'ascenso', 'gran_victoria', 'redencion', 'venganza', 'twist_echa', 'twist_desmonta',
  'soc:progre', 'soc:facha', 'soc:machista', 'soc:comunista', 'soc:conspi', 'soc:tibio']);
for (const id of ids) for (const k in P[id].sig || {}) if (!EMITTED.has(k)) err(`persona ${id}: la señal «${k}» no la emite el juego`);
const feeders = {}; for (const id of ids) for (const k in P[id].sig || {}) (feeders[k] = feeders[k] || []).push(id);
const soc = DB.sociedad || [];
const seen = new Set();
soc.forEach(q => {
  if (seen.has(q.id)) err(`sociedad: id repetido ${q.id}`); seen.add(q.id); str(q.q);
  (q.o || []).forEach(a => { answers++; str(a.t); if (!STYLES.includes(a.cat)) err(`sociedad ${q.id}: estilo «${a.cat}»`); for (const k in a.sig || {}) if (!feeders[k]) err(`sociedad ${q.id}: la señal «${k}» no alimenta a nadie`); });
});
const G = DB.garrido;
if (!G) err('falta garrido'); else { for (const k in G.columnas) G.columnas[k].forEach(str); for (const k in G.biografia) G.biografia[k].forEach(str); }
console.log(`Personalidades: ${ids.length} · preguntas de sociedad: ${soc.length} · respuestas: ${answers} · textos: ${strings}`);
console.log('Señales y a quién alimentan:');
Object.keys(feeders).sort().forEach(k => console.log(`  ${k.padEnd(18)} → ${feeders[k].join(', ')}`));
if (errs.length) { console.log(`\n${errs.length} errores:`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nOK: la base de datos es coherente.');
