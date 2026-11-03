/*
 * TOUCHLINE — fórmulas compartidas entre el juego (navegador) y el script
 * de datos (Node: tools/build-data.js). Una sola fuente de verdad para
 * valor de mercado, salarios, potencial y contratos.
 */
(function (root) {
  'use strict';

  const SEASON_START = 2026; // temporada 2026/27 (EA SPORTS FC 27)

  const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];

  const POS_ES = {
    GK: 'POR', RB: 'LD', CB: 'DFC', LB: 'LI', CDM: 'MCD', CM: 'MC',
    CAM: 'MCO', RM: 'MD', LM: 'MI', RW: 'ED', LW: 'EI', ST: 'DC'
  };

  // 0 portero, 1 defensa, 2 medio, 3 ataque
  const LINE = { GK: 0, RB: 1, CB: 1, LB: 1, CDM: 2, CM: 2, CAM: 2, RM: 2, LM: 2, RW: 3, LW: 3, ST: 3 };

  const POS_VALUE = {
    GK: 0.65, RB: 0.85, CB: 0.85, LB: 0.85, CDM: 0.9, CM: 1, CAM: 1.05,
    RM: 0.95, LM: 0.95, RW: 1.05, LW: 1.05, ST: 1.15
  };

  // Etiquetas de las 6 medias de carta. Para porteros el CSV de origen guarda
  // DIV/HAN/KIC/REF/SPD/POS en las columnas pace..physicality.
  const CARD_LABELS = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS'];
  const CARD_LABELS_GK = ['EST', 'PAR', 'SAQ', 'REF', 'VEL', 'COL'];

  function hash(str) {
    let h = 2166136261 >>> 0;
    str = String(str);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Número determinista en [0,1) a partir de una semilla de texto. */
  function seeded(seed) {
    return hash(seed) / 4294967296;
  }

  function roundMoney(v) {
    if (v >= 1e7) return Math.round(v / 5e5) * 5e5;
    if (v >= 1e6) return Math.round(v / 5e4) * 5e4;
    if (v >= 1e5) return Math.round(v / 5e3) * 5e3;
    if (v >= 1e4) return Math.round(v / 1e3) * 1e3;
    return Math.max(100, Math.round(v / 100) * 100);
  }

  function ageValueFactor(age) {
    if (age <= 20) return 1.15;
    if (age <= 23) return 1.1;
    if (age <= 27) return 1;
    const t = { 28: 0.9, 29: 0.8, 30: 0.7, 31: 0.58, 32: 0.46, 33: 0.36, 34: 0.26 };
    return t[age] || 0.18;
  }

  /** Valor de mercado en euros. econ escala la economía (fútbol femenino). */
  function marketValue(ovr, age, pot, pos, econ) {
    econ = econ == null ? 1 : econ;
    let v = 400000 * Math.pow(1.21, ovr - 60);
    if (pot > ovr) v *= 1 + (pot - ovr) * 0.06 * (age <= 23 ? 1 : 0.4);
    v *= ageValueFactor(age) * (POS_VALUE[pos] || 1) * econ;
    return roundMoney(Math.max(v, 10000 * econ));
  }

  /** Salario semanal en euros que pide un jugador. */
  function wageFor(ovr, age, wealth, econ) {
    wealth = wealth == null ? 1 : wealth;
    econ = econ == null ? 1 : econ;
    let w = 380 * Math.pow(1.17, ovr - 50) * wealth * econ;
    if (age <= 20) w *= 0.6;
    else if (age <= 22) w *= 0.8;
    else if (age >= 31) w *= 0.9;
    return roundMoney(Math.max(w, 250 * econ));
  }

  /** Potencial estimado a partir de media, edad y un aleatorio r en [0,1). */
  function potentialFor(ovr, age, r) {
    let gap;
    if (age <= 18) gap = 8 + r * 16;
    else if (age <= 20) gap = 6 + r * 14;
    else if (age === 21) gap = 4 + r * 12;
    else if (age === 22) gap = 3 + r * 9;
    else if (age === 23) gap = 2 + r * 7;
    else if (age === 24) gap = 1 + r * 5;
    else if (age === 25) gap = r * 4;
    else if (age === 26) gap = r * 2;
    else gap = 0;
    return Math.max(ovr, Math.min(95, ovr + Math.round(gap)));
  }

  /** Año en que termina el contrato (final de la temporada que acaba ese año). */
  function contractFor(age, r, season) {
    const first = season + 1;
    if (age <= 23) return first + Math.floor(r * 5);
    if (age <= 29) return first + Math.floor(r * 4);
    if (age <= 32) return first + Math.floor(r * 2);
    return first;
  }

  /** Edad al 1 de julio de la temporada a partir de 'DD-MM-YYYY'. */
  function ageAt(birthdate, season) {
    const [d, m, y] = birthdate.split('-').map(Number);
    let age = season - y;
    if (m > 7 || (m === 7 && d > 1)) age -= 1;
    return age;
  }

  const F = {
    SEASON_START, POSITIONS, POS_ES, LINE, POS_VALUE, CARD_LABELS, CARD_LABELS_GK,
    hash, seeded, roundMoney, marketValue, wageFor, potentialFor, contractFor, ageAt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  else {
    root.TL = root.TL || {};
    root.TL.F = F;
  }
})(typeof window !== 'undefined' ? window : globalThis);
