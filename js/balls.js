/* TOUCHLINE — balones desbloqueables (assets/balones.png: 8×8 balones de 32 px).
 * Los 4 primeros son de serie; cada uno de los otros 60 es el premio de un logro del juego.
 * Cada balón deja una estela de su color; algunos tienen efecto propio (fuego, hielo, rayo…).
 */
(function () {
  'use strict';
  const TL = window.TL;
  const COL = ['#b1b2b3', '#e1b5b8', '#b6c1da', '#b4d4bc', '#b35b1d', '#b2b04a', '#a46385', '#b45592', '#dbb03f', '#9ea8b1', '#b5704d', '#35892d', '#167470', '#de7a24', '#84d4ee', '#1e0c32', '#69613b', '#96af5d', '#2c305e', '#80808b', '#e8b4b9', '#6c747c', '#a4541e', '#808080', '#856a4e', '#539175', '#5d2e22', '#58a0d8', '#397838', '#81938b', '#48257c', '#66894f', '#797784', '#965db3', '#9e8e82', '#a5864f', '#916b76', '#63515d', '#433849', '#8e7f78', '#bbe7cc', '#e59295', '#c05d15', '#895336', '#64c529', '#bd7954', '#172429', '#b5b0ac', '#83573e', '#894c2f', '#797a7b', '#dcbe76', '#cca1d9', '#afc3ca', '#f27e3e', '#8f5231', '#be6666', '#5a4294', '#8a5269', '#94891e', '#9a9364', '#c1c6cb', '#3f2825', '#766d6c'];
  // Efectos especiales (el resto: estela de su color)
  const FX = { 13: 'fuego', 14: 'hielo', 15: 'vacio', 18: 'galaxia', 19: 'arcoiris', 28: 'rayo', 30: 'galaxia', 40: 'fantasma', 42: 'fuego', 44: 'toxico', 54: 'fuego', 57: 'galaxia', 58: 'rayo' };
  const NAMES = { fuego: 'Fuego', hielo: 'Hielo', vacio: 'Vacío', galaxia: 'Galaxia', arcoiris: 'Arcoíris', rayo: 'Rayo', fantasma: 'Fantasma', toxico: 'Tóxico', estela: 'Estela' };
  const img = new Image(); img.src = 'assets/balones.png';
  const st = () => { try { return JSON.parse(localStorage.getItem('touchline.balls') || '{}'); } catch (e) { return {}; } };
  const save = o => { try { localStorage.setItem('touchline.balls', JSON.stringify(o)); } catch (e) { /* nada */ } };
  // Logros: [id, nombre, cómo se consigue, balón, condición(c = acumulados, x = este partido)]
  // Los balones con efecto especial van a los logros más difíciles.
  const ACH = [
    ['debut', 'Debut', 'Juega tu primer partido en directo', 4, c => c.pj >= 1],
    ['gol1', 'Primer gol', 'Marca un gol en directo', 5, c => c.gf >= 1],
    ['win1', 'Primera victoria', 'Gana un partido en directo', 6, c => c.w >= 1],
    ['cero1', 'Portería a cero', 'Termina un partido sin encajar', 7, (c, x) => x.ga === 0],
    ['empate', 'Reparto de puntos', 'Empata un partido', 8, (c, x) => x.gf === x.ga],
    ['pj3', 'Rodaje', 'Juega 3 partidos en directo', 9, c => c.pj >= 3],
    ['fuera', 'Asalto a domicilio', 'Gana fuera de casa', 10, (c, x) => x.win && x.away],
    ['minima', 'Victoria mínima', 'Gana por 1-0', 11, (c, x) => x.win && x.gf === 1 && x.ga === 0],
    ['pen', 'Desde los once metros', 'Marca un penalti', 12, (c, x) => x.pen > 0],
    ['goleada', 'Goleada', 'Gana por 3 goles o más', 13, (c, x) => x.gf - x.ga >= 3],
    ['falta', 'A balón parado', 'Marca de falta directa', 14, (c, x) => x.fk > 0],
    ['tardio', 'In extremis', 'Marca el gol de la victoria del 85 en adelante', 15, (c, x) => x.late],
    ['gol5', 'Cinco dianas', 'Suma 5 goles en directo', 16, c => c.gf >= 5],
    ['pj5', 'Habitual', 'Juega 5 partidos en directo', 17, c => c.pj >= 5],
    ['remontada', 'Remontada', 'Gana un partido que ibas perdiendo', 18, (c, x) => x.win && x.behind],
    ['hattrick', 'Hat-trick', 'Que un jugador tuyo marque 3 goles', 19, (c, x) => x.hat],
    ['win3', 'Racha', 'Gana 3 partidos seguidos', 20, c => c.racha >= 3],
    ['cero3', 'Muro', 'Suma 3 porterías a cero', 21, c => c.cs >= 3],
    ['reparto', 'Gol coral', 'Marcan 3 jugadores distintos', 22, (c, x) => x.scorers >= 3],
    ['tempra', 'Madrugador', 'Marca en los primeros 5 minutos', 23, (c, x) => x.early],
    ['win5', 'Cinco triunfos', 'Gana 5 partidos en directo', 24, c => c.w >= 5],
    ['pj10', 'Veterano', 'Juega 10 partidos en directo', 25, c => c.pj >= 10],
    ['gol10', 'Diez goles', 'Suma 10 goles en directo', 26, c => c.gf >= 10],
    ['invicto5', 'Invicto', 'Encadena 5 partidos sin perder', 27, c => c.inv >= 5],
    ['diez', 'Con diez', 'Gana con una expulsión en tu equipo', 28, (c, x) => x.win && x.red],
    ['cuatro', 'Festival', 'Marca 4 goles en un partido', 29, (c, x) => x.gf >= 4],
    ['remont2', 'Épica', 'Gana tras ir perdiendo por 2', 30, (c, x) => x.win && x.behind2],
    ['cero5', 'Candado', 'Suma 5 porterías a cero', 31, c => c.cs >= 5],
    ['win10', 'Diez triunfos', 'Gana 10 partidos en directo', 32, c => c.w >= 10],
    ['gol25', 'Cañonero', 'Suma 25 goles en directo', 33, c => c.gf >= 25],
    ['pj20', 'Fijo', 'Juega 20 partidos en directo', 34, c => c.pj >= 20],
    ['win5r', 'Imparable', 'Gana 5 partidos seguidos', 35, c => c.racha >= 5],
    ['invicto10', 'Diez sin perder', 'Encadena 10 partidos sin perder', 36, c => c.inv >= 10],
    ['cero10', 'Búnker', 'Suma 10 porterías a cero', 37, c => c.cs >= 10],
    ['pj30', 'Treinta', 'Juega 30 partidos en directo', 38, c => c.pj >= 30],
    ['fantasma', 'Sin dejar rastro', 'Gana fuera por 3-0 o más', 40, (c, x) => x.away && x.gf >= 3 && x.ga === 0],
    ['win20', 'Veinte triunfos', 'Gana 20 partidos en directo', 39, c => c.w >= 20],
    ['cinco', 'Manita', 'Marca 5 goles en un partido', 42, (c, x) => x.gf >= 5],
    ['gol50', 'Cincuenta', 'Suma 50 goles en directo', 41, c => c.gf >= 50],
    ['toxico', 'Veneno', 'Gana con dos penaltis a favor', 44, (c, x) => x.win && x.pen >= 2],
    ['pj50', 'Medio centenar', 'Juega 50 partidos en directo', 43, c => c.pj >= 50],
    ['cero20', 'Cerrojo', 'Suma 20 porterías a cero', 45, c => c.cs >= 20],
    ['win30', 'Treinta triunfos', 'Gana 30 partidos en directo', 46, c => c.w >= 30],
    ['gol100', 'Centenario', 'Suma 100 goles en directo', 47, c => c.gf >= 100],
    ['pj75', 'Leyenda del banquillo', 'Juega 75 partidos en directo', 48, c => c.pj >= 75],
    ['win50', 'Cincuenta triunfos', 'Gana 50 partidos en directo', 49, c => c.w >= 50],
    ['invicto20', 'Inexpugnable', 'Encadena 20 partidos sin perder', 50, c => c.inv >= 20],
    ['pj100', 'Cien partidos', 'Juega 100 partidos en directo', 51, c => c.pj >= 100],
    ['gol150', 'Máquina de goles', 'Suma 150 goles en directo', 52, c => c.gf >= 150],
    ['cero30', 'Telón de acero', 'Suma 30 porterías a cero', 53, c => c.cs >= 30],
    ['seis', 'Set', 'Marca 6 goles en un partido', 54, (c, x) => x.gf >= 6],
    ['win75', 'Dinastía', 'Gana 75 partidos en directo', 55, c => c.w >= 75],
    ['gol200', 'Doscientos', 'Suma 200 goles en directo', 56, c => c.gf >= 200],
    ['win10r', 'Diez seguidas', 'Gana 10 partidos seguidos', 57, c => c.racha >= 10],
    ['rayo', 'Relámpago', 'Marca en el primer minuto', 58, (c, x) => x.min1],
    ['pj150', 'Ciento cincuenta', 'Juega 150 partidos en directo', 59, c => c.pj >= 150],
    ['win100', 'Cien triunfos', 'Gana 100 partidos en directo', 60, c => c.w >= 100],
    ['gol300', 'Trescientos', 'Suma 300 goles en directo', 61, c => c.gf >= 300],
    ['cero50', 'Imbatible', 'Suma 50 porterías a cero', 62, c => c.cs >= 50],
    ['pj200', 'Doscientos partidos', 'Juega 200 partidos en directo', 63, c => c.pj >= 200]
  ];
  const BY_BALL = {}; ACH.forEach(a => { BY_BALL[a[3]] = a; });
  const got = () => st().got || {};
  const unlocked = i => i < 4 || !!got()[BY_BALL[i] ? BY_BALL[i][0] : ''];
  const Balls = {
    img, count: 64,
    color: i => COL[i] || '#ffffff',
    fx: i => FX[i] || 'estela',
    fxName: i => NAMES[FX[i] || 'estela'],
    unlocked,
    /** Logro que desbloquea el balón i (o null si es de serie). */
    ach: i => { const a = BY_BALL[i]; return a ? { id: a[0], name: a[1], how: a[2] } : null; },
    total: () => 4 + Object.keys(got()).length,
    selected: () => { const s = st().sel || 0; return unlocked(s) ? s : 0; },
    select(i) { const o = st(); if (unlocked(i)) { o.sel = i; save(o); } },
    /** Al terminar un partido en directo: apunta el resultado y devuelve los balones nuevos [{ i, name, how, fx }]. */
    addMatch(m, me) {
      const o = st(); const c = o.c || (o.c = { pj: 0, w: 0, gf: 0, ga: 0, cs: 0, racha: 0, inv: 0 });
      const gf = m.score[me], ga = m.score[1 - me], win = gf > ga;
      const goals = (m.events || []).filter(e => e.type === 'goal');
      const mine = goals.filter(e => e.team === me);
      const per = {}; mine.forEach(e => { per[e.pid] = (per[e.pid] || 0) + 1; });
      // Marcador a lo largo del partido: ¿ibas perdiendo?, ¿gol de la victoria tardío?
      let a = 0, b = 0, behind = false, behind2 = false, late = false;
      goals.forEach(e => { if (e.team === me) { a++; if (win && a === ga + 1 && e.min >= 85) late = true; } else b++; if (b > a) behind = true; if (b - a >= 2) behind2 = true; });
      const x = { gf, ga, win, away: me === 1, behind, behind2, late,
        pen: mine.filter(e => e.kind === 'pen').length, fk: mine.filter(e => e.kind === 'fk').length,
        hat: Object.values(per).some(n => n >= 3), scorers: Object.keys(per).length,
        early: mine.some(e => e.min <= 5), min1: mine.some(e => e.min <= 1),
        red: (m.events || []).some(e => e.type === 'red' && e.team === me) };
      c.pj++; c.gf += gf; c.ga += ga; if (win) c.w++; if (!ga) c.cs++;
      c.racha = win ? c.racha + 1 : 0; c.inv = gf >= ga ? c.inv + 1 : 0;
      const g = o.got || (o.got = {}), out = [];
      ACH.forEach(([id, name, how, i, f]) => { if (!g[id] && f(c, x)) { g[id] = 1; out.push({ i, name, how, fx: NAMES[FX[i] || 'estela'] }); } });
      if (out.length) o.pend = (o.pend || []).concat(out);
      save(o);
      return out;
    },
    /** Tras volver del partido: el Profe cuenta los balones nuevos y enseña dónde se eligen. */
    explain() {
      const o = st(); const pend = o.pend || [];
      if (!pend.length) return;
      if (TL.Mentor && TL.Mentor.active()) { setTimeout(() => Balls.explain(), 1500); return; }
      delete o.pend; save(o);
      const many = pend.length > 1;
      const list = pend.slice(0, 4).map(p => `**${p.name}** (${p.how.charAt(0).toLowerCase() + p.how.slice(1)}): balón con efecto **${p.fx}**`);
      if (!TL.Mentor || !TL.Mentor.on()) { TL.UI.toast(`⚽ ¡${pend.length} ${many ? 'balones nuevos' : 'balón nuevo'}! Elígelo en Club → Partida → Balón del partido`); return; }
      const lines = [
        { text: many ? `¡Eh, mira! Hoy has desbloqueado **${pend.length} logros**, y cada logro trae un **balón nuevo**.` : '¡Eh, mira! Hoy has desbloqueado un **logro**, y cada logro trae un **balón nuevo**.', emo: 'happy' }
      ].concat(list.map(t => ({ text: t, emo: 'laugh' })));
      if (pend.length > 4) lines.push({ text: `…y ${pend.length - 4} más. No está nada mal.`, emo: 'happy' });
      lines.push({ text: 'Los balones se eligen aquí: **Club → Partida → ⚽ Balón del partido**. Los bloqueados te dicen qué logro hace falta.', sel: '[data-act="opt-balls"]', tab: 'club', emo: 'thinking' });
      if (TL.UI) TL.UI.clubTab = 'summary';
      TL.Mentor.say(lines, { dim: true });
    },
    /** Dibuja el balón i en (x, y) con radio r y giro a. */
    draw(c, i, x, y, r, a) {
      if (!img.complete || !img.naturalWidth) return false;
      c.save(); c.translate(x, y); c.rotate(a || 0); c.imageSmoothingEnabled = false;
      c.drawImage(img, (i % 8) * 32, Math.floor(i / 8) * 32, 32, 32, -r * 1.15, -r * 1.15, r * 2.3, r * 2.3);
      c.restore();
      return true;
    }
  };
  TL.Balls = Balls;
})();
