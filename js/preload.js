/* TOUCHLINE — la primera vez que alguien juega: pantalla de carga que descarga y prepara todo lo pesado
 * (estadio, balones, voces, efectos de sonido y música) con su barra de progreso. Las siguientes veces no sale:
 * cada cosa se carga sola cuando hace falta, como siempre.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const KEY = 'touchline.preload';
  const VER = '1';

  function done() { try { return localStorage.getItem(KEY) === VER; } catch (e) { return true; } }
  function mark() { try { localStorage.setItem(KEY, VER); } catch (e) { /* nada */ } }

  /** Pide un archivo para que quede en caché. Devuelve los bytes descargados (0 si no existe). */
  async function get(url) {
    try { const r = await fetch(url); if (!r.ok) return 0; const b = await r.arrayBuffer(); return b.byteLength; } catch (e) { return 0; }
  }
  /** Carpeta con archivos numerados (1.mp3, 2.mp3…): se piden hasta que falta uno. */
  async function folder(dir, max, onBytes) {
    for (let k = 1; k <= (max || 8); k++) { const n = await get(`${dir}/${k}.mp3`); if (!n) break; onBytes(n); }
  }

  function overlay() {
    const el = document.createElement('div');
    el.id = 'preload';
    el.innerHTML = `<div class="pl-box">
      <div class="pl-logo">TOUCHLINE</div>
      <p class="pl-step" id="pl-step">Preparando el estadio…</p>
      <div class="pl-bar"><i id="pl-fill"></i></div>
      <p class="pl-num"><span id="pl-pct">0%</span> · <span id="pl-mb">0 MB</span></p>
      <p class="pl-note">Solo la primera vez: así luego todo va fluido.</p>
      <button class="btn sm pl-skip" type="button">Saltar</button></div>`;
    document.body.appendChild(el);
    return el;
  }

  /** Lanza la carga si es la primera vez. Llama a cb al terminar (o al saltarla). */
  function run(cb) {
    if (done() || !window.fetch) { cb(); return; }
    const el = overlay(), $ = id => el.querySelector('#' + id);
    let finished = false, bytes = 0;
    const finish = () => { if (finished) return; finished = true; mark(); el.classList.add('out'); setTimeout(() => el.remove(), 500); cb(); };
    el.querySelector('.pl-skip').addEventListener('click', finish);

    // Lista de tareas (cada una con su peso aproximado para que la barra avance de forma realista)
    const ES = ['color', 'normal', 'mascara', 'altura', 'porterias', 'nieve', 'luz-noche'].map(k => `assets/estadio/${k}-top.webp`);
    const voice = TL.Mentor && TL.Mentor.VOICE ? Object.keys(TL.Mentor.VOICE).map(k => `assets/mentor/voice/${k}.mp3`) : [];
    const sfx = TL.SFX && TL.SFX.VOL ? Object.keys(TL.SFX.VOL) : [];
    const music = ['temporada', 'pretemporada', 'racha', 'peligro', 'recta-final', 'fin-de-temporada'];
    const tasks = [
      ...ES.map(u => ({ step: 'Preparando el estadio…', w: u.includes('color') ? 8 : 1, run: () => get(u) })),
      { step: 'Inflando los balones…', w: 1, run: () => get('assets/balones.png') },
      ...voice.map(u => ({ step: 'Despertando al Profe…', w: 0.3, run: () => get(u) })),
      { step: 'Afinando las voces…', w: 10, run: async () => (await get('assets/mentor/voz-silabas.json')) + (await get('assets/mentor/voz-silabas.mp3')) },
      ...sfx.map(c => ({ step: 'Calentando a la grada…', w: 1.2, run: async () => { let n = 0; await folder(`assets/sfx/${c}`, 8, b => { n += b; }); return n; } })),
      { step: 'Poniendo la música…', w: 8, run: () => get('assets/music/tema-del-juego.mp3') },
      ...music.map(m => ({ step: 'Poniendo la música…', w: 2, run: async () => { let n = 0; await folder(`assets/music/${m}`, 6, b => { n += b; }); return n; } }))
    ];
    const total = tasks.reduce((a, t) => a + t.w, 0);
    let doneW = 0, i = 0;
    const show = step => {
      const k = Math.min(1, doneW / total);
      $('pl-fill').style.width = (k * 100).toFixed(1) + '%';
      $('pl-pct').textContent = Math.round(k * 100) + '%';
      $('pl-mb').textContent = (bytes / 1048576).toFixed(1) + ' MB';
      if (step) $('pl-step').textContent = TL.t ? TL.t(step) : step;
    };
    // Tres descargas a la vez
    const worker = async () => {
      while (i < tasks.length && !finished) {
        const t = tasks[i++];
        show(t.step);
        bytes += (await t.run()) || 0;
        doneW += t.w; show();
      }
    };
    Promise.all([worker(), worker(), worker()]).then(() => {
      // Y lo que se puede dejar ya preparado en memoria
      try { if (TL.StadiumGL) TL.StadiumGL.load(); } catch (e) { /* nada */ }
      show('¡Todo listo!');
      setTimeout(finish, 450);
    });
  }

  TL.Preload = { run, done };
})();
