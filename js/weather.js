/* TOUCHLINE — el tiempo de cada partido.
 *
 * Depende de dónde se juega (zona climática del país del estadio local) y de cuándo (mes de la temporada,
 * de agosto a mayo). Los climas adversos son poco probables, como en la realidad.
 * El botón para alternarlos a mano solo aparece en modo prueba (?test).
 */
(function () {
  'use strict';
  const TL = window.TL;

  const TYPES = ['despejado', 'nublado', 'lluvia', 'temporal', 'nieve', 'calor', 'niebla', 'viento'];
  const NAMES = { despejado: 'Despejado', nublado: 'Nublado', lluvia: 'Lluvia', temporal: 'Temporal', nieve: 'Nieve', calor: 'Calor', niebla: 'Niebla', viento: 'Viento' };
  const ICON = { despejado: '☀️', nublado: '☁️', lluvia: '🌧️', temporal: '⛈️', nieve: '🌨️', calor: '🥵', niebla: '🌫️', viento: '🍃' };
  // Todos aprobados: salen en las partidas según la zona y el mes (lo adverso, poco)
  const APPROVED = TYPES.slice();

  const ZONE = {
    'Inglaterra': 'atlantica', 'Escocia': 'atlantica', 'Gales': 'atlantica', 'Irlanda': 'atlantica', 'Irlanda del Norte': 'atlantica', 'Países Bajos': 'atlantica', 'Bélgica': 'atlantica', 'Francia': 'atlantica', 'Dinamarca': 'atlantica',
    'España': 'mediterranea', 'Italia': 'mediterranea', 'Portugal': 'mediterranea', 'Grecia': 'mediterranea', 'Turquía': 'mediterranea', 'Croacia': 'mediterranea', 'Chipre': 'mediterranea', 'Israel': 'mediterranea', 'Marruecos': 'mediterranea',
    'Alemania': 'continental', 'Austria': 'continental', 'Suiza': 'continental', 'Polonia': 'continental', 'Chequia': 'continental', 'República Checa': 'continental', 'Hungría': 'continental', 'Serbia': 'continental', 'Rumanía': 'continental', 'Eslovaquia': 'continental', 'Eslovenia': 'continental', 'Bulgaria': 'continental',
    'Suecia': 'nordica', 'Noruega': 'nordica', 'Finlandia': 'nordica', 'Islandia': 'nordica', 'Rusia': 'nordica', 'Ucrania': 'nordica',
    'Brasil': 'tropical', 'Colombia': 'tropical', 'México': 'tropical', 'Ecuador': 'tropical', 'Venezuela': 'tropical', 'Perú': 'tropical', 'Arabia Saudí': 'tropical', 'Qatar': 'tropical', 'Emiratos Árabes Unidos': 'tropical', 'Nigeria': 'tropical',
    'Argentina': 'sur', 'Chile': 'sur', 'Uruguay': 'sur', 'Paraguay': 'sur', 'Australia': 'sur', 'Sudáfrica': 'sur',
    'Estados Unidos': 'continental', 'Canadá': 'nordica', 'Japón': 'continental', 'Corea del Sur': 'continental', 'China': 'continental'
  };
  const ZONE_NAME = { atlantica: 'atlántico', mediterranea: 'mediterráneo', continental: 'continental', nordica: 'nórdico', tropical: 'tropical', sur: 'del hemisferio sur' };

  // Pesos por estación (inv, pri, ver, oto) para [despejado, nublado, lluvia, temporal, nieve, calor, niebla, viento].
  // Lo adverso (temporal, nieve, calor, niebla, viento) es siempre minoritario.
  const W = {
    atlantica: {
      inv: [18, 40, 30, 3, 2, 0, 4, 3], pri: [32, 38, 24, 1, 0, 0, 2, 3], ver: [48, 32, 16, 1, 0, 1, 0, 2], oto: [24, 38, 28, 3, 0, 0, 4, 3]
    },
    mediterranea: {
      inv: [42, 34, 18, 2, 0.5, 0, 2, 1.5], pri: [56, 26, 14, 1.5, 0, 1, 0.5, 1], ver: [76, 12, 2, 1, 0, 8, 0, 1], oto: [50, 26, 18, 3, 0, 1, 1, 1]
    },
    continental: {
      inv: [22, 42, 16, 1, 12, 0, 5, 2], pri: [38, 36, 20, 2, 1, 0, 1, 2], ver: [52, 26, 14, 4, 0, 3, 0, 1], oto: [30, 38, 22, 2, 1, 0, 5, 2]
    },
    nordica: {
      inv: [20, 40, 10, 1, 22, 0, 5, 2], pri: [34, 38, 20, 1, 4, 0, 1, 2], ver: [52, 30, 15, 2, 0, 0, 0, 1], oto: [24, 40, 26, 2, 3, 0, 3, 2]
    },
    tropical: {
      inv: [48, 26, 18, 4, 0, 3, 0, 1], pri: [44, 26, 22, 5, 0, 2, 0, 1], ver: [40, 24, 24, 6, 0, 5, 0, 1], oto: [44, 26, 22, 5, 0, 2, 0, 1]
    },
    sur: { // estaciones al revés: su invierno es junio-agosto
      inv: [52, 28, 14, 2, 0, 3, 0, 1], pri: [42, 32, 20, 2, 0, 1, 1, 2], ver: [34, 36, 20, 2, 2, 0, 4, 2], oto: [40, 32, 22, 2, 0, 0, 2, 2]
    }
  };

  /** Mes del partido (1-12) según la jornada: la temporada va de agosto a mayo. */
  function month(S) {
    const n = (S.fixtures && S.fixtures.length) || 38, f = Math.min(0.999, Math.max(0, (S.week || 0) / n));
    return [8, 9, 10, 11, 12, 1, 2, 3, 4, 5][Math.floor(f * 10)];
  }
  function season(m) { return m === 12 || m <= 2 ? 'inv' : m <= 5 ? 'pri' : m <= 8 ? 'ver' : 'oto'; }
  function zoneOf(S, club) {
    const L = club && S.leagues && S.leagues[club.league];
    return ZONE[(L && L.country) || club && club.country] || 'atlantica';
  }

  /** Tiempo de un partido (siempre el mismo para ese partido). raw: sin filtrar por aprobados. */
  function forMatch(S, club, h, raw) {
    try { const q = new URLSearchParams(location.search).get('tiempo'); if (q && TYPES.includes(q)) return q; } catch (e) { /* nada */ }
    const z = zoneOf(S, club), w = W[z][season(month(S))];
    const r = (((h >>> 0) * 2654435761 + (S.week || 0) * 97 + (S.season || 0) * 31) >>> 0) % 10000 / 10000;
    const tot = w.reduce((a, b) => a + b, 0);
    let acc = 0, out = 'despejado';
    for (let i = 0; i < w.length; i++) { acc += w[i] / tot; if (r < acc) { out = TYPES[i]; break; } }
    if (raw || APPROVED.includes(out)) return out;
    return out === 'temporal' ? 'lluvia' : out === 'calor' ? 'despejado' : 'nublado';
  }

  /** Efectos (suaves) sobre el motor. equal < 1 acerca a los equipos (el mal tiempo iguala). */
  const FX = {
    despejado: {}, nublado: {},
    lluvia: { equal: 0.93, xg: 1.03, injury: 1.08 },
    temporal: { equal: 0.85, xg: 0.95, injury: 1.15, fatigue: 1.05 },
    nieve: { equal: 0.82, xg: 0.9, injury: 1.25, fatigue: 1.1 },
    calor: { fatigue: 1.25, xg: 0.97 },
    niebla: { equal: 0.92, xg: 0.92 },
    viento: { equal: 0.9, xg: 0.97 }
  };
  const fx = w => Object.assign({ equal: 1, xg: 1, injury: 1, fatigue: 1 }, FX[w] || {});

  TL.Weather = { TYPES, NAMES, ICON, APPROVED, month, season, zoneOf, zoneName: z => ZONE_NAME[z] || z, forMatch, fx };
})();
