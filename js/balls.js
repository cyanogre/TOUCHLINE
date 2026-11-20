/* TOUCHLINE — balones desbloqueables (assets/balones.png: 8×8 balones de 32 px).
 * Se desbloquean jugando partidos en directo (los 4 primeros, de serie; luego 2 por partido).
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
  const unlockedN = () => Math.min(64, 4 + (st().n || 0) * 2);
  const Balls = {
    img, count: 64,
    color: i => COL[i] || '#ffffff',
    fx: i => FX[i] || 'estela',
    fxName: i => NAMES[FX[i] || 'estela'],
    unlocked: i => i < unlockedN(),
    selected: () => { const s = st().sel || 0; return s < unlockedN() ? s : 0; },
    select(i) { const o = st(); if (i < unlockedN()) { o.sel = i; save(o); } },
    /** Al terminar un partido en directo: devuelve cuántos balones nuevos se han desbloqueado. */
    addMatch() { const before = unlockedN(); const o = st(); o.n = (o.n || 0) + 1; save(o); return unlockedN() - before; },
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
