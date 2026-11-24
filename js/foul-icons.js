/* TOUCHLINE — iconos de las jugadas del reglamento.
 * Pensados para leerse pequeños (16–20 px): pocas líneas, trazo grueso, cabezas rellenas.
 * El balón es siempre blanco con contorno y pentágono oscuros, así nunca se confunde con el muñeco (que va
 * en el color del texto). El rojo marca la infracción; amarillo/rojo, las tarjetas.
 */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const RED = '#ff4d4d', YEL = '#ffd23f', GREEN = '#2fbf71', BLUE = '#5db8ff', INK = '#13201a';
  // Muñeco: cabeza rellena
  const H = (x, y) => `<circle cx="${x}" cy="${y}" r="2.3" fill="currentColor" stroke="none"/>`;
  // Balón: blanco, contorno oscuro y pentágono central (se distingue de la cabeza aunque sea pequeño)
  const B = (x, y, r = 3) => `<g stroke="none"><circle cx="${x}" cy="${y}" r="${r + 0.9}" fill="${INK}"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><path d="M${x} ${y - r * 0.5}l${r * 0.48} ${r * 0.35}-${r * 0.18} ${r * 0.56}h-${r * 0.6}l-${r * 0.18}-${r * 0.56}z" fill="${INK}"/></g>`;
  const card = (c, x = 15, y = 2, w = 6, h = 8.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="${c}" stroke="none" transform="rotate(10 ${x + w / 2} ${y + h / 2})"/>`;
  const F = {
    // Zancadilla: corre, una pierna rival le cruza los pies (en rojo) y tropieza
    trip: `${H(8, 4.5)}<path d="M8 7.5l1.5 5.5M9.5 13l3 4M9.5 13l-4 3.5M8.5 9.5l4-1.5"/><path d="M14 20.5l5-4.5" stroke="${RED}" stroke-width="2.6"/>${B(18.5, 9.5, 2.4)}`,
    // Agarrón: mano roja tirando de la camiseta del de delante
    hold: `${H(16, 4.5)}<path d="M16 7.5v6.5M16 14l2 6M16 14l-2.5 6"/>${H(6, 6)}<path d="M6 9v6M6 15l-1.5 5.5M6 15l2 5.5"/><path d="M7 10.5h7.5" stroke="${RED}" stroke-width="2.6"/>`,
    // Empujón: dos manos rojas en la espalda; el otro sale despedido
    push: `${H(16.5, 5)}<path d="M15.5 8l2 6.5M17.5 14.5l3 5.5M17.5 14.5l-3 5"/>${H(5.5, 6.5)}<path d="M5.5 9.5v6M5.5 15.5l-1.5 5M5.5 15.5l2 5"/><path d="M7 10.5l6.5-1M7 13l6.5-1" stroke="${RED}" stroke-width="2.4"/>`,
    // Entrada a destiempo: se lanza al suelo y el balón ya se ha ido
    late: `${H(4.5, 13)}<path d="M6.5 14.5l7 3.5h6"/><path d="M3 21h18" opacity=".4"/><path d="M13 13.5l-2.5-3" stroke="${RED}" stroke-width="2.4"/>${B(18.5, 6, 2.8)}`,
    // Plancha: pierna recta con la suela por delante (roja) a la altura del otro
    high: `${H(5, 5)}<path d="M5 8v6M5 14l-1 6.5M5 11l8.5-2"/><path d="M13.5 7v4" stroke="${RED}" stroke-width="2.8"/>${H(18.5, 5)}<path d="M18.5 8v6M18.5 14l-1.5 6.5M18.5 14l1.5 6.5"/>`,
    // Codazo: brazo en punta (rojo) contra la cabeza del rival
    elbow: `${H(6.5, 6)}<path d="M6.5 9v6M6.5 15l-1.5 6M6.5 15l2 6"/><path d="M6.5 10.5l4.5 1.5 1.5-5" stroke="${RED}" stroke-width="2.6"/>${H(17, 5.5)}<path d="M17 8.5v6.5M17 15l-1.5 6M17 15l1.5 6"/>`,
    // Mano: palma (en el color del texto) y el balón tocándola
    hand: `<path d="M7.5 21v-7.5M7.5 13.5V8.2a1.4 1.4 0 0 1 2.8 0V12M10.3 12V6.8a1.4 1.4 0 0 1 2.8 0V12M13.1 12V7.8a1.4 1.4 0 0 1 2.8 0V14c0 3.8-2.2 7-6 7H7.5M7.5 14.5l-2-2.5a1.3 1.3 0 0 0-2 1.6l2.5 4"/>${B(18.5, 5.5, 3)}<path d="M15.5 9.5l-1 1" stroke="${RED}" stroke-width="2.4"/>`,
    // Ocasión manifiesta: derribado camino de la portería; roja
    dogso: `<path d="M3 3.5h10v4.5"/><path d="M3 3.5v4.5" />${H(8, 12)}<path d="M9.5 14l5 3 5-1M14.5 17l-2 3.5"/><path d="M4 20.5h16" opacity=".4"/>${card(RED, 16, 2.5, 5.5, 8)}`,
    // Piscinazo: se tira en plancha; agua azul debajo
    dive: `${H(5.5, 8.5)}<path d="M7.5 10l6 2.5 6-1.5M13.5 12.5l-2.5 3"/><path d="M2.5 19c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" stroke="${BLUE}" stroke-width="2.2"/>`,
    // Protestar: muñeco con los brazos arriba y bocadillo con «!»
    dissent: `${H(7, 8.5)}<path d="M7 11.5v5.5M7 17l-1.5 4.5M7 17l2 4.5M7 13l-3.5-3M7 13l3.5-3"/><path d="M13 3h7.5a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H17l-2.5 2.5V10.5H13a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M16.8 5v2.6M16.8 9.4v.1" stroke="${YEL}" stroke-width="2.2"/>`,
    // Perder tiempo: reloj de arena y el balón parado
    waste: `<path d="M5 3h14M5 21h14" stroke-width="2.4"/><path d="M7 3v2.5L12 12l-5 6.5V21M17 3v2.5L12 12l5 6.5V21"/><path d="M9.3 7.5h5.4L12 11z" fill="${YEL}" stroke="none"/><path d="M8.6 20.2h6.8L12 15.8z" fill="${YEL}" stroke="none"/><path d="M12 12v3.5" stroke="${YEL}" stroke-width="1.2"/>`,
    // Quitarse la camiseta: camiseta en alto, girando
    shirt: `<path d="M8.5 5l2.5-1.5h2L15.5 5l3.5 2.5-2 3-2-1.2V16h-6V9.3l-2 1.2-2-3z"/><path d="M4 19.5c3 2 13 2 16 0" stroke="${YEL}" stroke-width="2"/>`,
    // No respetar la distancia: barrera pasada de la línea roja; el balón al otro lado
    distance: `${H(4.5, 5)}${H(10, 5)}<path d="M4.5 8v12M10 8v12"/><path d="M14.5 3v18" stroke="${RED}" stroke-width="2" stroke-dasharray="2.5 2"/>${B(19.5, 16.5, 2.6)}`,
    // Cesión cogida con la mano: flecha hacia atrás y guantes sujetando el balón
    backpass: `<path d="M21 5H11M14 2l-3 3 3 3"/>${B(9, 15, 3.4)}<path d="M3.5 21v-4.5a2 2 0 0 1 2-2M14.5 21v-4.5a2 2 0 0 0-2-2" stroke-width="2.4"/>`,
    // Portero que retiene: balón en las manos y cronómetro
    hold6: `${B(7.5, 10, 3.4)}<path d="M2.5 19v-4a2 2 0 0 1 2-2M12.5 19v-4a2 2 0 0 0-2-2" stroke-width="2.4"/><circle cx="18" cy="14.5" r="4"/><path d="M18 14.5V12M18 14.5l1.8 1.2M16.8 8.8h2.4"/>`,
    // Penalti repetido: el balón en el punto y flecha que vuelve
    retake: `<path d="M4 3h16v6"/><path d="M4 3v6"/>${B(12, 17, 2.8)}<path d="M19.5 16a7.5 7.5 0 1 1-2.6-5.7"/><path d="M17.5 7.5l-.6 3 3 .5"/>`,
    // Ley de la ventaja: brazos del árbitro hacia delante, flechas verdes
    adv: `${H(6, 5)}<path d="M6 8v7M6 15l-1.5 6M6 15l1.5 6M6 9.5l8-2M6 12l8 1"/><path d="M16 4.5l4 2.5-3 3M16 10.5l4 2-3 3" stroke="${GREEN}" stroke-width="2.2"/>`,
    // Gol en propia puerta: portería, balón dentro y flecha que vuelve hacia ella
    og: `<path d="M3 4h18v9H3z"/><path d="M3 8.5h18M9 4v9M15 4v9" opacity=".3"/>${B(12, 9, 2.6)}<path d="M12 21.5v-5M9 18.5l3-3 3 3" stroke="${RED}" stroke-width="2.4"/>`,
    // Descuento: cartel del cuarto árbitro con +
    added: `<rect x="3" y="4" width="18" height="11.5" rx="1.6"/><path d="M8 9.8h5M10.5 7.3v5M15.5 7.3v5" stroke="${GREEN}" stroke-width="2.4"/><path d="M12 15.5v5M9 21h6"/>`,
    // Balón a tierra: mano que suelta el balón y línea del suelo
    drop: `<path d="M8 3h8M10 3v4M14 3v4"/>${B(12, 13, 3.2)}<path d="M4 21h16" opacity=".5"/><path d="M12 17.5v1.5" opacity=".6"/>`,
    // Deportividad: dos manos que se dan
    fair: `<path d="M2.5 12.5L6 9l3.5 1.5 2.5-2h3l3 3 3.5-1.5"/><path d="M6 9l4.5 5a1.6 1.6 0 0 0 2.3 0l3.5-3.5"/><path d="M9.5 15.5l2 2M12.5 15l2 2" />`,
    // Dedicatorias
    cradle: `${H(12, 4.5)}<path d="M12 7.5v6M12 13.5l-2 7M12 13.5l2 7"/><path d="M5 10c2 3.5 12 3.5 14 0" stroke="${YEL}" stroke-width="2.2"/>`,
    sky: `${H(12, 9)}<path d="M12 12v5M12 17l-2 4.5M12 17l2 4.5M12 13l-4 2M12 12.5l3-8"/><path d="M17 3l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z" fill="${YEL}" stroke="none"/>`,
    yellow: card(YEL, 7, 3, 10, 15),
    red: card(RED, 7, 3, 10, 15)
  };
  F.ill = F.shirt;
  const NAMES = {
    trip: 'Zancadilla', hold: 'Agarrón', push: 'Empujón', late: 'Entrada a destiempo', high: 'Plancha / pie alto', elbow: 'Codazo',
    hand: 'Mano', dogso: 'Ocasión manifiesta (roja)', dive: 'Piscinazo', dissent: 'Protestar', waste: 'Perder tiempo', shirt: 'Quitarse la camiseta',
    distance: 'No respetar la distancia', backpass: 'Cesión cogida con la mano', hold6: 'Portero que retiene', retake: 'Penalti repetido',
    adv: 'Ley de la ventaja', og: 'Gol en propia puerta', added: 'Descuento', drop: 'Balón a tierra', fair: 'Deportividad',
    cradle: 'Dedicatoria: la cuna', sky: 'Dedicatoria: al cielo', ill: 'Dedicatoria: camiseta con mensaje', yellow: 'Amarilla', red: 'Roja'
  };
  const svg = (k, size) => `<svg viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${F[k] || ''}</svg>`;
  TL.FoulIcons = { F, NAMES, svg };
})();
