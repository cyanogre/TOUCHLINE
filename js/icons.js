/* TOUCHLINE — iconos propios en SVG (sustituyen a los emojis)
 *
 * PENDIENTE DE APROBACIÓN: este archivo aún NO se carga en index.html (el juego sigue con emojis).
 * Para activarlo: añadir <script src="js/icons.js"></script> antes de js/formulas.js y en el CORE de sw.js.
 *
 * Un único «sprite» con todos los iconos (24×24, trazo fino y redondeado) que se inyecta en la página.
 * - TL.ic('ball') devuelve el <svg> listo para meter en el HTML.
 * - Cualquier emoji que aparezca en la interfaz (también en textos guardados de partidas antiguas)
 *   se cambia solo por su icono: un observador revisa lo que se pinta.
 * Los iconos usan el color del texto (currentColor); solo llevan color propio cuando significa algo
 * (tarjetas, oro, lesiones, sí/no, fuego…).
 */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});

  const GOLD = '#f2c94c', RED = '#ff5a5a', GREEN = '#2fbf71', YEL = '#ffd23f', ORANGE = '#ff9a3d', PINK = '#ff7ab6';
  const STAR = 'M12 3.1l2.41 6.18 6.63.38-5.14 4.21 1.68 6.42L12 16.7l-5.58 3.59 1.68-6.42-5.14-4.21 6.63-.38z';
  const face = (c, mouth) => `<g stroke="${c}"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.1" fill="${c}" stroke="none"/><circle cx="15" cy="10" r="1.1" fill="${c}" stroke="none"/>${mouth}</g>`;

  const I = {
    // ---- Partido
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 8.2l3.6 2.6-1.4 4.2H9.8l-1.4-4.2z" fill="currentColor" stroke="none"/><path d="M12 8.2V3.2M15.6 10.8l4.7-1.6M14.2 15l2.9 4M9.8 15l-2.9 4M8.4 10.8L3.7 9.2"/>',
    glove: '<path d="M7 13.5V7.6a1.5 1.5 0 0 1 3 0v3.6M10 10.6V5.4a1.5 1.5 0 0 1 3 0v5.2M13 10.6V6.6a1.5 1.5 0 0 1 3 0v5.2M16 11.4V9.1a1.5 1.5 0 0 1 3 0v5.4a6.5 6.5 0 0 1-6.5 6.5h-1a6 6 0 0 1-4.7-2.3l-2.6-3.3a1.6 1.6 0 0 1 2.5-2.1l.3.4"/>',
    whoosh: '<path d="M3 8.5h10a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h6"/>',
    'card-y': `<rect x="6.5" y="3" width="11" height="18" rx="2" transform="rotate(8 12 12)" fill="${YEL}" stroke="none"/><path d="M9.3 5.4l5.2.7" stroke="#fff" stroke-opacity=".55" transform="rotate(8 12 12)"/>`,
    'card-r': `<rect x="6.5" y="3" width="11" height="18" rx="2" transform="rotate(8 12 12)" fill="${RED}" stroke="none"/><path d="M9.3 5.4l5.2.7" stroke="#fff" stroke-opacity=".45" transform="rotate(8 12 12)"/>`,
    med: `<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="${RED}" stroke="none"/><path d="M12 7.8v8.4M7.8 12h8.4" stroke="#fff" stroke-width="2.6"/>`,
    sub: `<path d="M7.5 20V5M4 8.5L7.5 5 11 8.5" stroke="${GREEN}" stroke-width="2.2"/><path d="M16.5 4v15M13 15.5l3.5 3.5 3.5-3.5" stroke="${RED}" stroke-width="2.2"/>`,
    play: '<path d="M7.5 4.8v14.4L19.5 12z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
    finish: '<path d="M5 21V3.5"/><rect x="5" y="4" width="13" height="9" rx=".6"/><path d="M5 4h4.3v4.5H5zM13.7 4H18v4.5h-4.3zM9.3 8.5h4.4V13H9.3z" fill="currentColor" stroke="none"/>',
    megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l7.5 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z"/><path d="M7.5 15.2l1.3 4.3h2.4l-1-3.3M18 9.3a4 4 0 0 1 0 5.4M20.3 7a7.2 7.2 0 0 1 0 10"/>',
    mic: '<rect x="9" y="2.8" width="6" height="11.2" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    warn: `<path d="M10.3 4.2L2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" fill="${YEL}" stroke="none"/><path d="M12 9v4.6" stroke="#1d1d1d" stroke-width="2.2"/><circle cx="12" cy="17" r="1.25" fill="#1d1d1d" stroke="none"/>`,
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    x: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="${RED}" stroke-width="2.6"/>`,
    check: `<path d="M4.5 12.5l4.5 4.5 10.5-10.5" stroke="${GREEN}" stroke-width="2.6"/>`,
    tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M8 21h8M12 17.5V21"/><path d="M10 8.3v5.4l4.4-2.7z" fill="currentColor" stroke="none"/>',
    ban: `<g stroke="${RED}" stroke-width="2.2"><circle cx="12" cy="12" r="8.6"/><path d="M5.9 5.9l12.2 12.2"/></g>`,
    scales: '<path d="M12 3.5V20M7.5 20.5h9M4.5 7h15M12 3.5v0"/><path d="M4.5 7L2 13a2.5 2.5 0 0 0 5 0zM19.5 7L17 13a2.5 2.5 0 0 0 5 0z"/>',
    clash: '<path d="M2.5 12h6M5.5 9l3 3-3 3M21.5 12h-6M18.5 9l-3 3 3 3"/><path d="M12 4.5v2.5M12 17v2.5M9.2 6.2l1 1.7M14.8 6.2l-1 1.7M9.2 17.8l1-1.7M14.8 17.8l-1-1.7"/>',
    speech: '<path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9.5l-5 3.8V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z"/><path d="M7 9.5h10M7 13h6"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8.3 9l2.4 2.4M10.7 9l-2.4 2.4"/><circle cx="15.5" cy="16.6" r="1.6"/><path d="M10 13.6c.2 2 1.6 3.2 3.6 3.2" stroke-dasharray="1.4 1.8"/>',
    flag: `<path d="M6 21V3.5"/><path d="M6 4h11.5l-3 3.6 3 3.6H6z" fill="${RED}" stroke="${RED}"/>`,
    fire: `<path d="M12 21.5c-4 0-7-2.8-7-6.6 0-3.4 2.3-5.4 3.8-7.6.4 1.6 1.2 2.6 2.4 3.2C11 7 12.3 4.3 14.6 2.5c.3 3 1.8 4.8 3 6.6 1 1.4 1.4 3 1.4 4.9 0 4.4-3 7.5-7 7.5z" fill="${ORANGE}" stroke="none"/><path d="M12 21.5c-1.9 0-3.3-1.4-3.3-3.3 0-2 1.6-3 2.4-4.6.8 1.4 3.9 2.6 3.9 5 0 1.7-1.2 2.9-3 2.9z" fill="${YEL}" stroke="none"/>`,
    assist: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8.6 16.8l3.4-9.6 3.4 9.6M9.8 13.4h4.4"/>',
    skip: '<path d="M4 6v12l7-6zM11 6v12l7-6z" fill="currentColor" stroke="none"/><path d="M19.8 6v12"/>',
    gear: '<path d="M18.66 9.27l2.65.38v4.7l-2.65.38 1.58 2.19-3.32 3.32-2.14-1.6-.38 2.67h-4.7l-.38-2.65-2.14 1.58-3.32-3.32 1.6-2.14-2.67-.38v-4.7l2.65-.38-1.58-2.19 3.32-3.32 2.14 1.6.38-2.67h4.7l.38 2.65 2.14-1.58 3.32 3.32-1.6 2.14z"/><circle cx="12" cy="12" r="3"/>',
    resize: '<path d="M14 20h6v-6M20 20l-6.5-6.5M10 4H4v6M4 4l6.5 6.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
    // ---- Gloria
    trophy: `<g stroke="${GOLD}"><path d="M7 3.5h10V9a5 5 0 0 1-10 0z" fill="${GOLD}"/><path d="M7 5.5H4.3V7A3.6 3.6 0 0 0 8 10.6M17 5.5h2.7V7a3.6 3.6 0 0 1-3.7 3.6M12 14v3.5"/><path d="M8.5 20.5h7l-.8-3H9.3z" fill="${GOLD}"/></g>`,
    star: `<path d="${STAR}" fill="${GOLD}" stroke="${GOLD}" stroke-width="1.2"/>`,
    starglow: `<path d="M12 6.3l1.59 4.02 4.31.26-3.33 2.75 1.07 4.19L12 15.2l-3.64 2.32 1.07-4.19-3.33-2.75 4.31-.26z" fill="${GOLD}" stroke="${GOLD}" stroke-width="1.2"/><path d="M12 1.8v2M12 20.2v2M3.2 6.9l1.7 1M19.1 16.1l1.7 1M20.8 6.9l-1.7 1M4.9 16.1l-1.7 1" stroke="${GOLD}"/>`,
    sparkle: '<path d="M11 3l1.9 5.4L18.5 10l-5.6 1.7L11 17.2l-1.9-5.5L3.5 10l5.6-1.6z" fill="#ffe27a" stroke="none"/><path d="M18.5 14.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#ffe27a" stroke="none"/>',
    diamond: `<path d="M12 3l8.3 9L12 21 3.7 12z" fill="${ORANGE}" stroke="none"/><path d="M12 3v18M3.7 12h16.6" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>`,
    crown: `<g stroke="${GOLD}"><path d="M3.5 8l4.3 3.6L12 5l4.2 6.6L20.5 8l-1.8 9.5H5.3z" fill="${GOLD}"/><path d="M5.3 20.5h13.4"/></g>`,
    medal: `<path d="M7.5 3l3 6.5M16.5 3l-3 6.5" stroke="#5db8ff" stroke-width="2.4"/><circle cx="12" cy="15" r="5.6" fill="${GOLD}" stroke="${GOLD}"/><path d="M12 12.2l.95 1.9 2.1.3-1.52 1.48.36 2.1L12 17l-1.89.98.36-2.1-1.52-1.48 2.1-.3z" fill="#8a6514" stroke="none"/>`,
    // ---- Jugadores y vestuario
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.1"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    swirl: '<path d="M11.4 12l-.2-.23-.1-.34.04-.4.21-.41.37-.36.53-.24.63-.06.68.15.66.38.56.61.37.8.13.94-.17 1-.48.96-.78.83-1.04.6-1.24.29-1.33-.08-1.31-.49-1.17-.87-.91-1.23-.54-1.49-.1-1.65.39-1.68.88-1.55 1.33-1.29 1.69-.88 1.95-.39 2.03.19 1.96.78 1.71 1.34 1.31 1.82.75 2.17.12 2.37-.57 2.37-1.24 2.16-1.85 1.78-2.33 1.21-2.64.53"/>',
    claw: `<path d="M6 4c3 4 4 9 3 16M11 3c3 4.5 4 10 3 17M16 4c3 4 4 9 3 16" stroke="${ORANGE}" stroke-width="2.2"/>`,
    grill: '<path d="M4 10h16a8 8 0 0 1-16 0z"/><path d="M8.6 17.3L7 21M15.4 17.3L17 21M12 18v3"/><path d="M8 3c-1 1.2 1 2.2 0 3.6M12 2.6c-1 1.2 1 2.2 0 3.6M16 3c-1 1.2 1 2.2 0 3.6"/>',
    bed: '<path d="M3 6v14M3 16h18v4M21 16v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="12.5" r="2"/><path d="M14.5 3.5h3.5l-3.5 3.6h3.5" stroke-width="1.5"/>',
    hotel: '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M9.5 20.5v-4h5v4M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2"/>',
    chart: `<path d="M3.5 3.5v17h17"/><path d="M7 15l4-4 3 3 5.5-6M15.5 8h4v4" stroke="${GREEN}"/>`,
    door: '<path d="M3.5 20.5h17M6 20.5V3.5h12v17"/><path d="M6 3.5l6.5 2.2v15"/><circle cx="10.8" cy="12.8" r=".95" fill="currentColor" stroke="none"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" stroke-width="2.3"/>',
    sprout: `<path d="M12 21v-9"/><path d="M12 12c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7zM12 14.2c0-3.8 2.5-6 6.5-6 0 3.8-2.5 6-6.5 6z" fill="${GREEN}" stroke="${GREEN}"/>`,
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2M3 12.5h18M10.5 12.5V14h3v-1.5"/>',
    heart: `<path d="M12 20.5s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 20 10c0 5.7-8 10.5-8 10.5z" fill="${PINK}" stroke="${PINK}"/>`,
    bolt: `<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="${YEL}" stroke="${YEL}"/>`,
    'face-5': face(GREEN, `<path d="M7.6 13.4a4.4 4.4 0 0 0 8.8 0z" fill="${GREEN}"/>`),
    'face-4': face('#9bd85a', '<path d="M8.5 14.3a4 4 0 0 0 7 0"/>'),
    'face-3': face(GOLD, '<path d="M8.5 15h7"/>'),
    'face-2': face(ORANGE, '<path d="M8.5 16.3a4 4 0 0 1 7 0"/>'),
    'face-1': face(RED, '<path d="M8.5 16.5a4 4 0 0 1 7 0M7.3 7.6l3 1.3M16.7 7.6l-3 1.3"/>'),
    // ---- Club y oficina
    puzzle: '<path d="M4 7.5h4a2.2 2.2 0 1 1 4.4 0h4v4a2.2 2.2 0 1 1 0 4.4v4H4v-4a2.2 2.2 0 1 0 0-4.4z"/>',
    coins: `<g stroke="${GOLD}"><ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7M9.5 15.3v2.2c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-6c0-1.4-2.5-2.5-5.5-2.5l-.5.01M9.5 14.3c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5"/></g>`,
    rocket: '<path d="M12 2.5c3.5 2.5 5 6.5 4.5 11.5l-2 2.5h-5l-2-2.5C7 9 8.5 5 12 2.5z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M7.6 13.8l-3.1 2.6 1 3.4 3.4-1.9M16.4 13.8l3.1 2.6-1 3.4-3.4-1.9M10.5 19.5l1.5 2.5 1.5-2.5"/>',
    bandage: '<g transform="rotate(-45 12 12)"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/><rect x="9" y="8.5" width="6" height="7"/></g><circle cx="11.2" cy="11.2" r=".7" fill="currentColor" stroke="none"/><circle cx="12.8" cy="12.8" r=".7" fill="currentColor" stroke="none"/>',
    stetho: '<path d="M5 3.5v5a4 4 0 0 0 8 0v-5M4 3.5h2M12 3.5h2M9 12.5v2a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="10.5" r="2"/>',
    stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.8 2.5h4.4M12 2.5V6M18.3 6.7l1.6-1.6"/>',
    binoculars: '<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4M3.3 13.8L5.8 5.5h3l1.2 6.5M20.7 13.8l-2.5-8.3h-3L14 12"/>',
    bank: '<path d="M3 9.5L12 4l9 5.5zM3.5 20.5h17M6 10.5v7.5M10 10.5v7.5M14 10.5v7.5M18 10.5v7.5"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.6 7.2L12 13l8.4-5.8"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14"/>',
    news: '<path d="M4 5h13v13.5a1.5 1.5 0 0 0 1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M17 9h3v9.5a1.5 1.5 0 0 1-3 0M7 8.5h7M7 12h7M7 15.5h4"/>',
    grad: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.4 3.5 2 5.5 2s4-.6 5.5-2V11M21.5 9v5"/>',
    siren: `<path d="M6 18v-5a6 6 0 0 1 12 0v5z" fill="${RED}" stroke="${RED}"/><path d="M4 18h16v3H4zM12 2.5v2M4.6 5.4L6 6.8M19.4 5.4L18 6.8M2.5 12h1.5M20 12h1.5"/>`,
    syringe: '<path d="M18 2.5l3.5 3.5M19.7 4.3L16.2 7.8M17.5 9.2L9.2 17.5l-2.7-2.7 8.3-8.3zM6.5 14.8L3 18.3M8.5 16.5L5 20M10.2 10.2l1.4 1.4M12.6 7.8l1.4 1.4"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    cocktail: '<path d="M4 4h16l-8 9zM12 13v7M8 20.5h8M15.5 4l2.3-2"/>',
    stadium: '<ellipse cx="12" cy="9" rx="9" ry="3.5"/><path d="M3 9v6.5c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V9M7.5 12.2v4.5M12 12.5V19M16.5 12.2v4.5"/>',
    swords: '<path d="M4 4l11.5 11.5M20 4L8.5 15.5M13 17.5l4.5-4.5M6.5 13l4.5 4.5M16.4 16.4l3.1 3.1M7.6 16.4l-3.1 3.1"/>',
    battery: `<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><rect x="5" y="9.5" width="9.5" height="5" rx="1" fill="${GREEN}" stroke="none"/>`,
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.3" cy="8.3" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="15.7" cy="15.7" r="1.35"/><circle cx="15.7" cy="8.3" r="1.35"/><circle cx="8.3" cy="15.7" r="1.35"/></g>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4l5.1 5.1"/>',
    save: '<path d="M5 3.5h11l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M7.5 3.5v5h8v-5M7 20.5V14h10v6.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4z" fill="currentColor"/>',
    music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>'
  };

  // Emoji → icono (sin el selector de variación U+FE0F)
  const EMOJI = {
    '⚽': 'ball', '🧤': 'glove', '💨': 'whoosh', '🟨': 'card-y', '🟥': 'card-r', '🚑': 'med', '🏥': 'med', '🔁': 'sub', '⏸': 'pause', '▶': 'play',
    '🏁': 'finish', '📣': 'megaphone', '📢': 'megaphone', '🎙': 'mic', '⚠': 'warn', '🎯': 'target', '❌': 'x', '✅': 'check', '📺': 'tv',
    '🚫': 'ban', '⚖': 'scales', '🤼': 'clash', '🗣': 'speech', '📋': 'clipboard', '🚩': 'flag', '🔥': 'fire', '🅰': 'assist', '⏭': 'skip',
    '⚙': 'gear', '⇲': 'resize', '🌍': 'globe', '🌎': 'globe', '🏆': 'trophy', '⭐': 'star', '🌟': 'starglow', '✨': 'sparkle', '🔶': 'diamond',
    '👑': 'crown', '🎖': 'medal', '👁': 'eye', '👀': 'eye', '🌀': 'swirl', '🐯': 'claw', '🍖': 'grill', '🛌': 'bed', '🏨': 'hotel',
    '📈': 'chart', '🚪': 'door', '🧠': 'bulb', '💪': 'dumbbell', '🌱': 'sprout', '💼': 'briefcase', '🤝': 'heart', '⚡': 'bolt',
    '😄': 'face-5', '🙂': 'face-4', '😐': 'face-3', '😕': 'face-2', '😠': 'face-1', '😡': 'face-1', '🧩': 'puzzle', '💰': 'coins',
    '🚀': 'rocket', '🩹': 'bandage', '🩺': 'stetho', '🏃': 'stopwatch', '🔭': 'binoculars', '🏛': 'bank', '📩': 'mail', '✉': 'mail',
    '📤': 'upload', '📥': 'download', '📰': 'news', '🎓': 'grad', '🚨': 'siren', '💉': 'syringe', '📱': 'phone', '🍸': 'cocktail',
    '🏟': 'stadium', '⚔': 'swords', '🔋': 'battery', '🎲': 'dice', '🔍': 'search', '💾': 'save', '🧭': 'compass', '🎵': 'music', '🔊': 'sound'
  };
  const keys = Object.keys(EMOJI).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const RE = new RegExp(`(?:${keys.join('|')})\\uFE0F?`, 'gu');
  const HAS = new RegExp(`(?:${keys.join('|')})`, 'u');

  const NS = 'http://www.w3.org/2000/svg';
  function sprite() {
    if (document.getElementById('tl-icons')) return;
    const defs = Object.entries(I).map(([k, v]) =>
      `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('');
    const holder = document.createElement('div');
    holder.innerHTML = `<svg id="tl-icons" xmlns="${NS}" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${defs}</svg>`;
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  /** HTML de un icono. */
  function ic(name, cls) {
    return `<svg class="ic ic-${name}${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }
  function node(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', `ic ic-${name}`);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', `#i-${name}`);
    s.appendChild(u);
    return s;
  }
  const name = m => EMOJI[m.replace(/️/g, '')];
  /** Cambia los emojis de un texto HTML por iconos. */
  const swap = html => String(html).replace(RE, m => (name(m) ? ic(name(m)) : m));

  // ---- Sustitución automática en la página
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CANVAS', 'NOSCRIPT']);
  const PLAIN = new Set(['OPTION', 'TITLE']);
  function fixText(t) {
    const s = t.data, p = t.parentNode;
    if (!p || !HAS.test(s) || SKIP.has(p.nodeName)) return;
    if (PLAIN.has(p.nodeName)) { t.data = s.replace(RE, '').replace(/^\s+/, ''); return; }
    if (p.closest && p.closest('svg, [data-noic]')) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    s.replace(RE, (m, off) => {
      const n = name(m);
      if (!n) return m;
      if (off > last) frag.appendChild(document.createTextNode(s.slice(last, off)));
      frag.appendChild(node(n));
      last = off + m.length;
      return m;
    });
    if (!last) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, t);
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.namespaceURI === NS) return;
    if (!HAS.test(root.textContent || '')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) if (HAS.test(w.currentNode.data)) list.push(w.currentNode);
    list.forEach(fixText);
  }
  function start() {
    sprite();
    scan(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') fixText(m.target);
        else m.addedNodes.forEach(scan);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);

  TL.Icons = { I, EMOJI, ic, swap, scan };
  TL.ic = ic;
})();
