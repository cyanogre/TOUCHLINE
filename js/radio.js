/* TOUCHLINE — la radio: narración jugada a jugada de lo que pasa en el campo 2D.
 *
 * El campo cuenta cada acción (pase, conducción, regate, robo, desmarque, presión, repliegue…) y
 * aquí se convierte en lo que diría un narrador de radio: una frase corta para el directo y, en la
 * narración, una crónica por jugada que crece mientras el equipo tiene el balón («Recupera Rodri.
 * Rodri, Bernardo, Foden… ¡Cambio de orientación de Foden! Aparece Doku en la otra banda…»).
 * Las frases se traducen con el diccionario (data/i18n/radio.js).
 */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U;

  const LINES = {
    pass: ['{p} toca para {q}.', '{p} con {q}.', '{p} la mueve hacia {q}.', 'Pase corto de {p} a {q}.', '{p} encuentra a {q}.', '{p} se apoya en {q}.'],
    back: ['{p} juega atrás con {q}.', '{p} no ve salida y vuelve a {q}.', '{p} la devuelve a {q}.', 'Atrás, para {q}.', '{p} da oxígeno: atrás con {q}.'],
    prog: ['¡{p} rompe líneas! La recibe {q} a la espalda de los medios.', '{p} filtra un pase vertical para {q}.', 'Pase entre líneas de {p} a {q}.', '¡Qué pase de {p}! Encuentra a {q} entre líneas.'],
    through: ['¡Pase al hueco de {p} para {q}!', '¡{p} la mete a la espalda de la defensa! Va {q}…', '¡Balón en profundidad de {p} buscando a {q}!', '¡{p} filtra para la carrera de {q}!'],
    long: ['Balón largo de {p} buscando a {q}.', '{p} la manda en largo hacia {q}.', 'Pelotazo de {p} en busca de {q}.', '{p} busca a {q} con un envío largo.'],
    switch: ['¡Cambio de orientación de {p}! Aparece {q} en la otra banda.', '{p} abre el campo con un cambio de juego hacia {q}.', 'Gran cambio de juego de {p} para {q}.'],
    wide: ['{p} abre a la banda para {q}.', '{p} busca a {q} en la banda.', '{p} la abre a la banda: para {q}.'],
    gkshort: ['{p} sale jugando en corto con {q}.', 'Saque en corto de {p} para {q}.', '{p} inicia desde atrás: para {q}.'],
    gklong: ['{p} saca en largo.', '{p} despeja en largo hacia campo rival.', '{p} se quita de encima la presión con un balón largo.'],
    cross: ['Centro de {p} al área…', '{p} la pone al área…', '{p} centra desde la banda…', 'Centro buscando una cabeza en el área…'],
    cutback: ['{p} la pone atrás, al punto de penalti…', 'Pase de la muerte de {p}…'],
    clear: ['Despeja {p}.', '{p} la saca de su área.', '{p} revienta el balón hacia arriba.', 'Sin complicaciones: {p} la manda lejos.'],
    head: ['Despeja de cabeza {p}.', '{p} se impone por arriba y la aleja.', '{p} la saca de cabeza.'],
    carry: ['{p} conduce y gana metros.', '{p} avanza con el balón.', '{p} arranca en conducción.', '{p} lleva el balón cosido al pie.'],
    carryHalf: ['{p} cruza el centro del campo conduciendo.', '{p} arranca y se planta en campo rival.'],
    carryWide: ['{p} se lanza por la banda.', '{p} encara por la banda.', '{p} corre por la cal.'],
    dribble: ['¡{p} se va de {o}!', '¡Qué regate de {p}! Deja atrás a {o}.', '{p} se zafa de {o}.', '¡{p} supera a {o} con un recorte!'],
    shield: ['{p} aguanta de espaldas ante {o}.', '{p} protege el balón ante {o}.', '{p} no se deja robar: aguanta la carga de {o}.'],
    tackle: ['¡Gran entrada de {p}! Le roba la cartera a {o}.', '{p} le quita el balón a {o}.', 'Recupera {p}, que gana el duelo a {o}.', '¡Robo de {p}!'],
    tackleLoose: ['¡Entrada de {p} sobre {o}! Balón suelto.', '{p} mete el pie ante {o}. Balón dividido.'],
    intercept: ['Intercepta {p}.', '{p} lee el pase y corta.', '¡Corta {p}!', 'Pase interceptado por {p}.'],
    interceptHigh: ['¡Recuperación arriba de {p}!', '¡{p} roba en campo rival!', '¡Presión que funciona: recupera {p} arriba!'],
    loose: ['Balón dividido… se lo queda {p}.', 'La segunda jugada es para {p}.', '{p} recoge el rechace.'],
    catch: ['Atrapa {p}.', '{p}, blocaje seguro.', '{p} se hace con el balón.'],
    aerial: ['Gana el balón por arriba {p}.', '{p} se impone en el juego aéreo.', '{p} gana el salto.'],
    badtouch: ['Se le va el control a {p}.', 'Mal control de {p}.', 'A {p} se le escapa el balón.'],
    run_behind: ['{p} tira el desmarque a la espalda de la defensa.', '{p} pica al espacio.', 'Desmarque de ruptura de {p}.', '{p} pide el balón al hueco.'],
    run_overlap: ['{p} dobla por fuera.', 'Sube {p} por la banda para doblar.', '{p} se incorpora por fuera.'],
    run_late: ['Llega {p} desde segunda línea.', '{p} pisa el área desde atrás.', '{p} se suma al ataque.'],
    run_drop: ['{p} baja a recibir.', '{p} se ofrece entre líneas.', '{p} sale de la zona de centrales para pedirla.'],
    press: ['{t} presiona arriba.', 'Presión alta de {t}.', '{t} aprieta la salida de balón rival.', '{t} va a buscarlos a su campo.'],
    counterpress: ['Presión tras pérdida de {t}.', '{t} muerde nada más perderla.', '{t} quiere recuperarla enseguida.'],
    recover: ['{t} corre hacia atrás para recuperar la posición.', 'Repliegue a toda velocidad de {t}.', '{t}, desordenado, vuelve hacia su portería.'],
    counter: ['¡Contragolpe de {t}!', '¡Sale a la contra {t}!', '¡Transición rapidísima de {t}!'],
    low: ['{t} se repliega en bloque bajo.', '{t} se encierra atrás con las líneas muy juntas.', '{t} defiende en su área, muy junto.'],
    mid: ['{t} espera en bloque medio.', '{t} defiende junto, en campo propio.', '{t} cierra los pasillos interiores y espera.'],
    high: ['{t} adelanta la línea defensiva.', '{t} defiende muy arriba.', '{t} juega con la defensa en el centro del campo.'],
    keep: ['{t} toca y toca: ya son {n} pases seguidos.', '{t} mueve el balón con paciencia: {n} pases.', '{t} tiene el balón: {n} pases sin que el rival la huela.'],
    out_throw: ['Saque de banda para {t}.', 'El balón sale por la banda: saca {t}.', 'Se va por la banda: saque para {t}.'],
    out_gk: ['Saque de puerta para {t}.', 'Se marcha por la línea de fondo: saque de puerta.'],
    out_corner: ['Córner para {t}.', 'La toca un defensa y se va a córner: saque de esquina para {t}.'],
    throw: ['{p} pone el balón en juego para {q}.', 'Saque rápido de {p} hacia {q}.']
  };
  const PRIO = { pass: 0, back: 0, carry: 0, carryHalf: 1, carryWide: 1, wide: 1, gkshort: 1, gklong: 1, long: 1, prog: 2, through: 2, switch: 2, cross: 2, cutback: 2, clear: 1, head: 1, dribble: 2, shield: 1, tackle: 2, tackleLoose: 2, intercept: 2, interceptHigh: 2, loose: 1, catch: 1, aerial: 1, badtouch: 1, keep: 1, throw: 0 };

  class Radio {
    constructor(m, S) { this.m = m; this.S = S; this.last = {}; this.seq = null; this.id = 0; }
    name(pid) { const p = pid != null && this.S.players[pid]; return p ? p.short : ''; }
    club(i) { const c = this.S.clubs[this.m.teams[i].club]; return c || { name: '', code: '' }; }
    pick(key) {
      const arr = LINES[key] || [];
      if (!arr.length) return '';
      let k = Math.floor(Math.random() * arr.length);
      if (arr.length > 1 && k === this.last[key]) k = (k + 1) % arr.length;
      this.last[key] = k;
      return arr[k];
    }
    fill(key, d) {
      const tpl = this.pick(key);
      if (!tpl) return '';
      const s = tpl.replace(/\{(\w)\}/g, (_, k) => k === 't' ? this.club(d.team).name : k === 'n' ? String(d.n) : this.name(d[k]));
      return TL.t ? TL.t(s) : s;
    }
    /** Una acción del campo → { call: frase para el directo, prio, team, seq: crónica de la jugada (o null), note: apunte táctico } */
    feed(c) {
      let key = null, d = c, note = null, newSeq = false;
      switch (c.k) {
        case 'pass': {
          key = c.type === 'short' ? 'pass' : c.type;
          if (!LINES[key]) key = 'pass';
          if ((key === 'cross' || key === 'clear' || key === 'head' || key === 'gklong' || key === 'cutback') && c.q == null) d = { p: c.p, team: c.team };
          break;
        }
        case 'carry': key = c.half ? 'carryHalf' : c.wide ? 'carryWide' : 'carry'; break;
        case 'dribble': key = 'dribble'; break;
        case 'shield': key = 'shield'; break;
        case 'tackle': key = c.loose ? 'tackleLoose' : 'tackle'; break;
        case 'poss':
          newSeq = true;
          key = c.how === 'tackle' ? 'tackle' : c.how === 'catch' ? 'catch' : c.how === 'intercept' ? (c.d > 62 ? 'interceptHigh' : 'intercept') : 'loose';
          break;
        case 'loose': key = 'loose'; break;
        case 'aerial': key = 'aerial'; break;
        case 'badtouch': key = 'badtouch'; break;
        case 'keep': key = 'keep'; break;
        case 'run': key = 'run_' + c.kind; break;
        case 'out': newSeq = true; key = 'out_' + c.kind; break;
        case 'team': note = this.fill(c.kind, c); break;
        default:
      }
      if (note) return { call: note, prio: 1, team: c.team, note };
      if (!key || !LINES[key]) return null;
      const text = this.fill(key, d);
      if (!text) return null;
      // Crónica de la jugada: una por posesión, que crece con cada acción
      if (newSeq || !this.seq || this.seq.team !== c.team) this.seq = { id: ++this.id, team: c.team, min: this.m.min, parts: [], chain: [] };
      const S = this.seq;
      const quiet = key === 'pass' || key === 'back';
      if (quiet && c.k === 'pass') {
        // Toques seguidos: «Rodri, Bernardo, Foden…»
        if (!S.chain.length) S.chain.push(this.name(c.p));
        S.chain.push(this.name(c.q));
      } else {
        if (S.chain.length) { S.parts.push(S.chain.join(', ') + '…'); S.chain = []; }
        S.parts.push(text);
      }
      S.n = (S.n || 0) + 1;
      const all = S.parts.concat(S.chain.length ? [S.chain.join(', ') + '…'] : []);
      const shown = all.length > 7 ? ['…'].concat(all.slice(-7)) : all;
      return { call: text, prio: PRIO[key] != null ? PRIO[key] : 1, team: c.team, seq: { id: S.id, team: S.team, min: S.min, text: shown.join(' '), n: S.n } };
    }
  }

  TL.Radio = Radio;
  TL.Radio.LINES = LINES;
})();
