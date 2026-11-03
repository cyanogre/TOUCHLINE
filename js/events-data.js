/*
 * TOUCHLINE — probabilidades de incidentes y polémicas.
 *
 * Calibradas para que las frecuencias por temporada se parezcan a las del
 * fútbol profesional real (ver docs/POLEMICAS.md para las fuentes y el
 * razonamiento). Todas las cifras son estimaciones de diseño, no datos oficiales.
 *
 *  MATCH:  probabilidad por PARTIDO (se reparte entre las dos aficiones/equipos).
 *  SEASON: probabilidad por CLUB y TEMPORADA de que ocurra al menos una vez.
 *          El juego la convierte a probabilidad semanal: 1 - (1 - p)^(1 / jornadas).
 */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});

  // ------------------------------------------------------------ Partido
  const MATCH = {
    // Ritmo de juego (por equipo y partido)
    foulsPerTeam: 11.8,         // ~24 faltas por partido (LaLiga ≈ 24–26, Premier ≈ 21)
    yellowPerFoul: 0.16,        // ≈ 4 amarillas por partido con árbitro medio (LaLiga ≈ 4,5–5)
    redPerFoul: 0.0035,         // + dobles amarillas ≈ 0,15–0,25 rojas por partido
    penaltyPerFoul: 0.011,      // ≈ 0,3 penaltis por partido (incluye VAR)
    dangerousFkPerFoul: 0.13,   // faltas en zona de tiro
    fkGoal: 0.016,              // gol directo de falta (≈ 15–20 por temporada y liga)
    penaltyConv: 0.77,          // conversión media de penaltis (≈ 75–80 %)
    offsidePerTeam: 2.1,
    varOffsideGoal: 0.05,       // goles anulados por fuera de juego (con VAR)
    phantomPenalty: 0.03,       // penalti inexistente pitado (por partido)
    heatedPerFoul: 0.0025,      // tangana tras una entrada dura

    // Incidentes (probabilidad por partido)
    crowd: {
      insults: 0.10,      // insultos/cánticos violentos denunciados (LaLiga: 50–99 denuncias/temporada)
      racism: 0.015,      // insultos racistas con protocolo (≈ 6 por temporada y liga)
      objects: 0.04,      // lanzamiento de objetos
      pyro: 0.05,         // bengalas / pirotecnia
      invader: 0.03,      // invasión de campo
      ultrasFight: 0.008  // pelea de ultras en los alrededores
    },
    player: {
      fight: 0.005,       // agresión entre jugadores → roja directa (3 partidos)
      confront: 0.004,    // encararse/insultar al árbitro → roja (4 partidos)
      refAssault: 0.00015 // agresión al árbitro → 12 partidos (rarísimo en élite)
    }
  };

  // ------------------------------------------------------------ Temporada (por club)
  // tone: neg/pos/neu · target: player | club | fans · weight: a quién afecta más
  const SEASON = [
    // Vestuario y deportivo
    { id: 'transferRequest', p: 0.18, tone: 'neg', cat: 'vestuario' },
    { id: 'trainingFight', p: 0.10, tone: 'neg', cat: 'vestuario' },
    { id: 'coachClash', p: 0.15, tone: 'neg', cat: 'vestuario' },
    { id: 'indiscipline', p: 0.35, tone: 'neg', cat: 'vestuario' },
    { id: 'socialMedia', p: 0.30, tone: 'neg', cat: 'redes' },
    { id: 'nightlife', p: 0.20, tone: 'neg', cat: 'ocio' },
    { id: 'agentDrama', p: 0.08, tone: 'neg', cat: 'mercado' },
    // Legal / extradeportivo
    { id: 'drivingOffence', p: 0.06, tone: 'neg', cat: 'sucesos' },
    { id: 'carAccident', p: 0.015, tone: 'neg', cat: 'sucesos' },
    { id: 'burglary', p: 0.04, tone: 'neu', cat: 'sucesos' },
    { id: 'taxFraud', p: 0.03, tone: 'neg', cat: 'tribunales' },          // ×2 en España
    { id: 'betting', p: 0.02, tone: 'neg', cat: 'tribunales' },
    { id: 'doping', p: 0.008, tone: 'neg', cat: 'dopaje' },
    { id: 'recreationalDrugs', p: 0.008, tone: 'neg', cat: 'dopaje' },
    { id: 'domesticViolence', p: 0.02, tone: 'neg', cat: 'tribunales' },
    { id: 'sexualMisconduct', p: 0.015, tone: 'neg', cat: 'tribunales' },
    { id: 'streetFight', p: 0.025, tone: 'neg', cat: 'sucesos' },
    // Club / directiva
    { id: 'clubFineStadium', p: 0.03, tone: 'neg', cat: 'club' },          // cierre parcial del estadio
    { id: 'refereeComplaint', p: 0.25, tone: 'neu', cat: 'arbitraje' },
    // Positivas
    { id: 'charity', p: 0.30, tone: 'pos', cat: 'positivo' },
    { id: 'newParent', p: 0.25, tone: 'pos', cat: 'positivo' },
    { id: 'milestone', p: 0.35, tone: 'pos', cat: 'positivo' },
    { id: 'fanFavourite', p: 0.20, tone: 'pos', cat: 'positivo' }
  ];

  TL.EventsData = { MATCH, SEASON };
})();
