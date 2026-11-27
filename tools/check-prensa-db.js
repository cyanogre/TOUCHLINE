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
// ---- Preguntas del partido y de la previa (las claves de `cuando` salen del propio código: FLAGS y flags de preContext)
const root = path.join(__dirname, '..');
const prensaJs = fs.readFileSync(path.join(root, 'js', 'prensa.js'), 'utf8');
const block = (src, from, to) => { const i = src.indexOf(from); return i < 0 ? '' : src.slice(i, src.indexOf(to, i)); };
const FLAGS = new Set([...block(prensaJs, 'const FLAGS = {', '\n  };').matchAll(/(\w+): c =>/g)].map(m => m[1]));
const PFLAGS = new Set([...block(prensaJs, 'flags: { cupKO', '} };').matchAll(/(\w+):/g)].map(m => m[1]));
const SKILLS = new Set([...fs.readFileSync(path.join(root, 'js', 'manager.js'), 'utf8').matchAll(/id: '(\w+)', name:/g)].map(m => m[1]));
const REFS = ['penMiss', 'og', 'red', 'subGoal', 'hat', 'star', 'kid', 'inj', 'bolt', 'signing', 'sale', 'lateWin', 'guest'];
const HOLES = { partido: ['rival', 'gf', 'ga', 'jug', 'next', 'staff', 'brand', 'camp', 'hatTipo', 'objetivo', 'tarjeta', 'yo', 'club'],
  previa: ['rival', 'next', 'yo', 'club', 'pos', 'posr', 'figura', 'mi', 'ronda', 'quedan'] };
function checkQs(kind, list, flags) {
  const seen = new Set();
  const cond = (w, c) => [].concat(c || []).forEach(k => { const key = String(k).replace(/^!/, ''); if (!flags.has(key)) err(`${w}: la situación «${key}» no existe`); });
  const holes = (w, t) => { for (const m of String(t).matchAll(/\{(\w+)\}/g)) if (!HOLES[kind].includes(m[1])) err(`${w}: hueco {${m[1]}} desconocido`); };
  (list || []).forEach(q => {
    const w = `${kind} ${q.id}`;
    if (seen.has(q.id)) err(`${w}: id repetido`); seen.add(q.id);
    cond(w, q.cuando); if (q.peso && q.peso.si) cond(w, q.peso.si);
    str(q.q); holes(w, q.q);
    if (!q.o || q.o.length < 3) err(`${w}: al menos 3 respuestas`);
    if (!(q.o || []).some(o => !o.need)) err(`${w}: hace falta alguna respuesta sin habilidad`);
    (q.o || []).forEach((o, k) => {
      answers++; str(o.t); holes(w, o.t); if (o.tno) { str(o.tno); holes(w, o.tno); cond(w, o.tsi); }
      if (o.cat && !STYLES.includes(o.cat)) err(`${w} #${k}: estilo «${o.cat}»`);
      if (kind === 'previa' && !o.cat) err(`${w} #${k}: en la previa cada respuesta lleva su estilo`);
      if (o.g == null && !o.gsi) err(`${w} #${k}: falta g`);
      if (o.gsi) cond(w, o.gsi[0]); if (o.fxsi) cond(w, o.fxsi[0]);
      if (o.need && !SKILLS.has(o.need[0])) err(`${w} #${k}: la habilidad «${o.need[0]}» no existe`);
      for (const fx of [o.fx, o.fxsi && o.fxsi[1], o.fxsi && o.fxsi[2]]) if (fx && fx.pl && !REFS.includes(String(fx.pl[0]).replace(/^@/, ''))) err(`${w} #${k}: jugador «${fx.pl[0]}» desconocido`);
      if (o.pre) for (const kk in o.pre) if (!['own', 'rival'].includes(kk)) err(`${w} #${k}: pre.${kk} no existe`);
    });
  });
}
checkQs('partido', DB.partido, FLAGS);
checkQs('previa', DB.previa, PFLAGS);
if (!(DB.partido || []).length) err('falta partido.js');
if (!(DB.previa || []).length) err('falta previa.js');

// ---- Entrevista de fin de temporada
const T = DB.temporada, OUT = ['great', 'good', 'bad', 'up', 'down', 'fired'];
const sigOk = (w, sig) => { for (const k in sig || {}) if (!P[k] && !EMITTED.has(k)) err(`${w}: señal «${k}» no existe`); };
const tq = (w, q) => { if (!q) return err(`${w}: falta`); str(q.q); (q.o || []).forEach((o, k) => { answers++; str(o.t); str(o.r); if (!STYLES.includes(o.cat)) err(`${w} #${k}: estilo «${o.cat}»`); if (!o.r) err(`${w} #${k}: falta la apostilla de Garrido (r)`); sigOk(w, o.sig); }); if ((q.o || []).length < 3) err(`${w}: al menos 3 respuestas`); };
if (!T) err('falta temporada.js'); else {
  for (const r of OUT) { if (!(T.intro[r] || []).length) err(`temporada: falta intro.${r}`); tq(`temporada balance.${r}`, T.balance[r]); if (!(T.titulos[r] || []).length) err(`temporada: faltan títulos de ${r}`); if (!(T.cierre[r] || []).length) err(`temporada: falta cierre.${r}`);
    [].concat(T.intro[r] || [], T.titulos[r] || [], T.cierre[r] || []).forEach(str); }
  (T.momento || []).forEach((q, k) => tq(`temporada momento ${k}`, q));
  tq('temporada tu.known', T.tu && T.tu.known); tq('temporada tu.unknown', T.tu && T.tu.unknown);
  tq('temporada futuro.stay', T.futuro && T.futuro.stay); tq('temporada futuro.fired', T.futuro && T.futuro.fired);
  for (const id of ids) if (!T.persona[id] || !(T.persona[id].pos || []).length || !(T.persona[id].neg || []).length) err(`temporada: faltan los títulos propios de ${id}`);
  for (const id in T.persona) { if (!P[id]) err(`temporada: personalidad «${id}» no existe`); [].concat(T.persona[id].pos || [], T.persona[id].neg || []).forEach(str); }
}

// ---- Eventos de personalidad (formato de data/game/eventos.js)
const ectx = { window: {} }; vm.createContext(ectx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'game', 'eventos.js'), 'utf8'), ectx);
vm.runInContext(fs.readFileSync(path.join(dir, 'eventos-personalidad.js'), 'utf8'), ectx);
const allEv = ectx.window.TL_EVENTOS.events, mineEv = allEv.filter(e => e.cat === 'imagen');
const evIds = {}; allEv.forEach(e => { evIds[e.id] = (evIds[e.id] || 0) + 1; });
const evPer = {};
mineEv.forEach(e => {
  const w = `evento ${e.id}`;
  if (evIds[e.id] > 1) err(`${w}: id repetido`);
  const per = [].concat((e.club || {}).persona || []);
  if (!per.length) err(`${w}: falta club.persona`);
  per.forEach(id => { if (!P[id]) err(`${w}: personalidad «${id}» no existe`); evPer[id] = (evPer[id] || 0) + 1; });
  str(e.t); str(e.b);
  if ((e.o || []).length < 2) err(`${w}: al menos 2 opciones`);
  (e.o || []).forEach((o, k) => { answers++; str(o.l); str(o.d); str(o.r); if (!o.fx || !o.fx.sig) err(`${w} #${k}: la opción no mueve tu personalidad (fx.sig)`); sigOk(w, o.fx && o.fx.sig);
    if (((o.fx || {}).mor || (o.fx || {}).boss || (o.fx || {}).list) && !e.if) err(`${w} #${k}: efecto sobre un jugador sin elegir jugador (if)`); });
  if (/\{[so]n?\}/.test(e.t + e.b + JSON.stringify(e.o)) && !e.if && e.who !== 'p') err(`${w}: usa {s}/{n} sin jugador`);
});
for (const id of ids) if (!evPer[id]) err(`eventos: «${id}» no tiene ningún evento propio`);

// ---- Formas de preguntar (formas-*.js + el banco antiguo): claves que existan, huecos válidos y sin duplicados
const bctx = { window: {} }; vm.createContext(bctx);
const gdir = path.join(root, 'data', 'game');
for (const f of fs.readdirSync(gdir).filter(f => /^prensa-frases-\d+\.js$/.test(f)).sort()) vm.runInContext(fs.readFileSync(path.join(gdir, f), 'utf8'), bctx);
const BANKQ = bctx.window.TL_PRENSA || {};
const FO = DB.formas || {};
const JUG = new Set(['penMiss', 'og', 'red', 'subGoal', 'hat', 'star', 'kid', 'inj', 'bolt', 'signing', 'sale', 'lateWin']);
const PHOLES = ['mote', 'club', 'yo', 'rival', 'pres'];
let formas = 0, phr = 0;
const pidOk = new Set((DB.partido || []).map(q => q.id)), vidOk = new Set((DB.previa || []).map(q => q.id)), sidOk = new Set(soc.map(q => q.id));
for (const key in FO) {
  const w = `formas ${key}`, list = FO[key] || [];
  let holesOk;
  if (pidOk.has(key)) holesOk = HOLES.partido; else if (vidOk.has(key)) holesOk = HOLES.previa;
  else if (/^soc:/.test(key) && sidOk.has(key.slice(4))) holesOk = PHOLES;
  else if (/^mote:/.test(key) && P[key.slice(5)]) holesOk = PHOLES;
  else if (/^cap:(\w+):([012])$/.test(key) && P[key.split(':')[1]]) holesOk = PHOLES;
  else { err(`${w}: no corresponde a ninguna pregunta`); continue; }
  const baseQ = (pidOk.has(key) ? DB.partido.find(q => q.id === key) : vidOk.has(key) ? DB.previa.find(q => q.id === key) : null);
  const seenT = new Set([].concat((BANKQ[key] && BANKQ[key].q) || [], baseQ ? [baseQ.q] : []));
  list.forEach(t => {
    formas++; str(t);
    if (seenT.has(t)) err(`${w}: repetida «${t.slice(0, 50)}»`); seenT.add(t);
    for (const m of String(t).matchAll(/\{(\w+)\}/g)) {
      if (!holesOk.includes(m[1])) err(`${w}: hueco {${m[1]}} no vale aquí`);
      if (m[1] === 'jug' && !JUG.has(key)) err(`${w}: {jug} en una pregunta sin jugador`);
    }
  });
}
// Total de formas distintas de hacer una pregunta (base + banco + formas)
const nForms = k => 1 + (((BANKQ[k] || {}).q) || []).length + (FO[k] || []).length;
(DB.partido || []).forEach(q => { phr += nForms(q.id); });
(DB.previa || []).forEach(q => { phr += nForms(q.id); });
soc.forEach(q => { phr += nForms('soc:' + q.id); });
ids.forEach(id => { phr += nForms('mote:' + id); [0, 1, 2].forEach(k => { phr += nForms(`cap:${id}:${k}`); }); });

console.log(`Personalidades: ${ids.length} · preguntas de sociedad: ${soc.length} · respuestas: ${answers} · textos: ${strings}`);
console.log(`Formas de hacer las preguntas: ${phr} (nuevas en formas-*.js: ${formas})`);
console.log(`Partido: ${(DB.partido || []).length} preguntas · previa: ${(DB.previa || []).length} · eventos de personalidad: ${mineEv.length} · situaciones: ${FLAGS.size} (partido), ${PFLAGS.size} (previa)`);
console.log('Señales y a quién alimentan:');
Object.keys(feeders).sort().forEach(k => console.log(`  ${k.padEnd(18)} → ${feeders[k].join(', ')}`));
if (errs.length) { console.log(`\n${errs.length} errores:`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nOK: la base de datos es coherente.');
