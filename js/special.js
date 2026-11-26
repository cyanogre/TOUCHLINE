/* TOUCHLINE — supertiros del modo fantasía.
 *
 * Guiños a los tiros míticos de las series de anime de fútbol, con nombres propios (homenaje, no copia).
 * Solo existen en el modo fantasía. Cada rematador bueno tiene el suyo (siempre el mismo); en el partido,
 * cuando dispara, a veces lo saca: el motor le da algo más de acierto y el campo lo enseña a lo grande
 * (nombre en pantalla, cámara lenta, el balón con su efecto y sus colores).
 */
(function () {
  'use strict';
  const TL = window.TL;

  // fx: efecto del balón durante el tiro (los mismos que los balones especiales). duo: lo hacen dos a la vez.
  // jump: remate saltando. curve: comba. line: líneas que pueden tenerlo (3 delanteros, 2 medios, 1 defensas).
  const SHOTS = [
    { id: 'catapulta', name: 'Catapulta del Averno', c: '#ff5a1a', c2: '#ffd23f', fx: 'fuego', duo: true, jump: true, line: [3], desc: 'Dos delanteros saltan a la vez: uno hace de trampolín y el otro remata desde el cielo.' },
    { id: 'tigre', name: 'Zarpazo del Tigre', c: '#ffb020', c2: '#3a2a10', fx: 'fuego', line: [3, 2], desc: 'Un cañonazo a quemarropa que rompe la red (y las manos del portero).' },
    { id: 'hoja', name: 'Hoja Seca Fantasma', c: '#b8f53d', c2: '#ffffff', fx: 'fantasma', curve: 3.2, line: [2, 3], desc: 'Sube recto y cae de golpe, como una hoja que se descuelga del árbol.' },
    { id: 'espiral', name: 'Espiral Volcánica', c: '#ff3b1a', c2: '#ffcf4a', fx: 'fuego', jump: true, line: [3], desc: 'Gira sobre sí mismo envuelto en llamas y remata desde el centro del remolino.' },
    { id: 'dragon', name: 'Dragón de Tormenta', c: '#4fb4ff', c2: '#e8f6ff', fx: 'rayo', line: [3, 2], desc: 'El balón sale rugiendo entre relámpagos con forma de dragón.' },
    { id: 'saeta', name: 'Saeta Relámpago', c: '#fff36a', c2: '#7fc8ff', fx: 'rayo', line: [3, 2, 1], desc: 'Un disparo tan rápido que el portero lo ve cuando ya ha entrado.' },
    { id: 'fenix', name: 'Chilena del Fénix', c: '#ff7b1c', c2: '#ffe08a', fx: 'fuego', jump: true, line: [3], desc: 'Una chilena imposible: el delantero arde y renace en el aire.' },
    { id: 'ego', name: 'Volea del Ego', c: '#2a54ff', c2: '#c9d6ff', fx: 'vacio', line: [3], desc: 'Lee el campo como nadie y la clava donde solo él veía hueco. Egoísmo puro.' },
    { id: 'monstruo', name: 'Gambeta del Monstruo', c: '#ffcc33', c2: '#1a1a1a', fx: 'toxico', curve: -2, line: [3, 2], desc: 'Regatea a todos guiado por el monstruo que lleva dentro y define de rosca.' },
    { id: 'halcon', name: 'Picado del Halcón', c: '#d9e6ff', c2: '#7f8ca8', fx: 'hielo', jump: true, line: [3, 2], desc: 'Se eleva más que nadie y se lanza en picado sobre el balón.' },
    { id: 'galaxia', name: 'Disparo Galáctico', c: '#8a5cff', c2: '#ffd6ff', fx: 'galaxia', curve: 2, line: [2, 3], desc: 'Un tiro de otro planeta que deja un rastro de estrellas.' },
    { id: 'arcoiris', name: 'Arcoíris Imposible', c: '#ff4fa3', c2: '#4fffb0', fx: 'arcoiris', curve: -3, line: [2, 3, 1], desc: 'Una comba que dibuja todos los colores antes de besar la escuadra.' },
    { id: 'flechazo', name: 'Disparo del Flechazo', c: '#ff4f8b', c2: '#ffd1e1', fx: 'arcoiris', curve: 2.4, line: [], desc: 'Un tiro con forma de corazón que el portero no se atreve a parar. Nació de una rueda de prensa.' }
  ];
  const BY = {}; SHOTS.forEach(s => { BY[s.id] = s; });

  const fan = S => !!(TL.Events && TL.Events.fantasy && TL.Events.fantasy(S));
  const lineOf = p => (TL.Formulas && TL.Formulas.LINE ? TL.Formulas.LINE[p.pos] : p.pos === 'ST' ? 3 : 2);

  /** Supertiro de un jugador (o null): rematadores buenos, y quien lleve un alma de ataque. Siempre el mismo. */
  function of(S, p) {
    if (!p || !fan(S) || p.pos === 'GK') return null;
    if (S.romance && S.romance.done && S.romance.win && S.romance.pid === p.id) return BY.flechazo;
    const sho = (p.st && p.st[1]) || 0, line = lineOf(p);
    const soul = TL.Events.soulOf && TL.Events.soulOf(S, p.id);
    const good = sho >= 78 || (line === 3 && sho >= 72) || (soul && soul.def && (soul.def.line || []).includes(3));
    if (!good) return null;
    const opts = SHOTS.filter(s => s.line.includes(line));
    if (!opts.length) return null;
    return opts[(p.id * 2654435761 >>> 0) % opts.length];
  }

  TL.Special = { SHOTS, get: id => BY[id] || null, of };
})();
