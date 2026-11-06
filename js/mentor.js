/* TOUCHLINE — «el Profe»: mentor del mánager.
 * Diálogos estilo novela visual (retrato pixel-art 1:1, texto máquina de escribir
 * y voz por letras), ayuda contextual y su "ruta" de eventos a lo largo de la carrera.
 * Diseño del personaje, ruta y cómo añadir emociones: docs/MENTOR.md */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U;

  // ------------------------------------------------------------ Personaje
  const CHAR = {
    name: 'Tomás Arrieta', short: 'El Profe', role: 'Tu mentor',
    voice: { pitch: 760, rate: 1 } // voz aguda y rápida (estilo Animal Crossing)
  };

  // ------------------------------------------------------------ Sprites
  // Hojas de 512×128: frames de 64×64 en 8 columnas (10 frames usados).
  // Cada emoción tiene una hoja "talk" (hablando) y otra "idle" (en reposo) y un
  // mapa que dice qué frame es cada gesto. Las emociones sin arte usan la neutra.
  const SIZE = 64, COLS = 8, PAD = 1;
  const NEUTRAL_TALK = { closed: [0, 5], small: [1, 6, 9], open: [2, 7], turn: [3, 8], blink: [4] };
  const NEUTRAL_IDLE = { base: [0, 1, 5, 6, 7, 9], blink: [2], turn: [3, 8] };
  const EMOTIONS = {
    neutral: { talk: 'assets/mentor/neutral-talk.png', idle: 'assets/mentor/neutral-idle.png', talkMap: NEUTRAL_TALK, idleMap: NEUTRAL_IDLE }
    // Próximas (ver docs/MENTOR.md): happy, proud, worried, angry, sad, surprised, thinking, laugh
  };
  // Mientras no haya arte, la emoción se nota en la voz (semitonos)
  const MOOD_VOICE = { happy: 2, proud: 1, laugh: 3, surprised: 3, thinking: -0.5, worried: -1.5, angry: -2.5, sad: -3, neutral: 0 };
  function sheetFor(emo) { return EMOTIONS[emo] || EMOTIONS.neutral; }
  const preload = {};
  Object.values(EMOTIONS).forEach(e => [e.talk, e.idle].forEach(src => { const i = new Image(); i.src = src; preload[src] = i; }));

  // Escala 1:1 real: cada píxel del sprite = 1 píxel físico de la pantalla.
  // El canvas mide 64×64 píxeles y su tamaño CSS es 64 / devicePixelRatio.
  function syncDpr() {
    document.documentElement.style.setProperty('--dpr', String(window.devicePixelRatio || 1));
  }
  syncDpr();
  (function watchDpr() {
    if (!window.matchMedia) return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const h = () => { syncDpr(); watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', h, { once: true });
  })();

  /** Cara animada: parpadea y gira la cabeza en reposo; mueve la boca al hablar. */
  class Face {
    constructor(el) {
      // Lienzo de 64×64 píxeles reales dentro del contenedor, con 1 píxel transparente
      // de margen: el navegador suaviza los bordes de los elementos transformados y así
      // ese suavizado cae fuera del dibujo.
      el.innerHTML = '';
      const cv = document.createElement('canvas');
      cv.width = SIZE + 2 * PAD; cv.height = SIZE + 2 * PAD;
      cv.className = 'px1';
      el.appendChild(cv);
      this.el = cv;
      this.cx = cv.getContext('2d');
      this.cx.imageSmoothingEnabled = false;
      this.emo = 'neutral';
      this.talking = false;
      this.hold = 0;
      this.nextBlink = performance.now() + 1800;
      this.nextTurn = performance.now() + 6000 + Math.random() * 5000;
      this.until = 0;
      this.loop = this.loop.bind(this);
      this.show('idle', 0);
      this.raf = requestAnimationFrame(this.loop);
    }
    setEmotion(e) { this.emo = e || 'neutral'; this.show(this.talking ? 'talk' : 'idle', this.talking ? this.pick('talk', 'closed') : this.pick('idle', 'base')); }
    pick(kind, gesture) {
      const s = sheetFor(this.emo), map = kind === 'talk' ? s.talkMap : s.idleMap;
      const list = map[gesture] || map.closed || map.base || [0];
      return list[Math.floor(Math.random() * list.length)];
    }
    show(kind, frame) {
      const s = sheetFor(this.emo);
      const img = preload[kind === 'talk' ? s.talk : s.idle];
      if (!img) return;
      if (!img.complete || !img.naturalWidth) { img.addEventListener('load', () => this.show(kind, frame), { once: true }); return; }
      if (this.last === img.src + frame) return;
      this.last = img.src + frame;
      this.cx.clearRect(0, 0, SIZE + 2 * PAD, SIZE + 2 * PAD);
      this.cx.drawImage(img, (frame % COLS) * SIZE, Math.floor(frame / COLS) * SIZE, SIZE, SIZE, PAD, PAD, SIZE, SIZE);
    }
    /** Fotograma para la letra que se está diciendo. */
    say(ch) {
      this.talking = true;
      const l = (ch || ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      let g = /[aeiou]/.test(l) ? 'open' : /[a-z0-9ñ]/.test(l) ? 'small' : 'closed';
      if (g !== 'closed' && Math.random() < 0.015) g = 'turn';
      this.show('talk', this.pick('talk', g));
      this.until = performance.now() + (g === 'turn' ? 260 : 90);
    }
    stop() { this.talking = false; this.show('idle', this.pick('idle', 'base')); }
    /** Alinea el lienzo con la rejilla de píxeles físicos (1 píxel del sprite = 1 píxel de pantalla). */
    snap() {
      const dpr = window.devicePixelRatio || 1;
      const r = this.el.parentNode.getBoundingClientRect();
      const dx = (Math.round(r.left * dpr) - r.left * dpr) / dpr, dy = (Math.round(r.top * dpr) - r.top * dpr) / dpr;
      const key = dpr + ':' + dx.toFixed(4) + ':' + dy.toFixed(4);
      if (key === this.snapKey) return;
      this.snapKey = key;
      this.el.style.transform = `translate(${dx - PAD / dpr}px, ${dy - PAD / dpr}px) scale(${1 / dpr})`;
    }
    loop(now) {
      if (!this.el.isConnected) return;
      this.snap();
      if (this.talking) {
        if (now > this.until) this.show('talk', this.pick('talk', 'closed'));
      } else if (now > this.until) {
        if (now > this.nextBlink) {
          this.show('idle', this.pick('idle', 'blink'));
          this.until = now + 120;
          this.nextBlink = now + 2200 + Math.random() * 2600;
        } else if (now > this.nextTurn) {
          this.show('idle', this.pick('idle', 'turn'));
          this.until = now + 700;
          this.nextTurn = now + 6000 + Math.random() * 6000;
        } else this.show('idle', this.pick('idle', 'base'));
        if (now <= this.until) { /* gesto en curso */ } else this.until = now + 400;
      }
      this.raf = requestAnimationFrame(this.loop);
    }
    destroy() { cancelAnimationFrame(this.raf); }
  }

  // ------------------------------------------------------------ Texto con **negrita**
  function tokens(text) {
    const out = [];
    let bold = false;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '*' && text[i + 1] === '*') { bold = !bold; i++; continue; }
      out.push({ ch: text[i], b: bold });
    }
    return out;
  }
  function renderTokens(tk, n) {
    let html = '', open = false;
    for (let i = 0; i < n; i++) {
      const t = tk[i];
      if (t.b && !open) { html += '<b>'; open = true; }
      if (!t.b && open) { html += '</b>'; open = false; }
      html += U.esc(t.ch);
    }
    return html + (open ? '</b>' : '');
  }

  // ------------------------------------------------------------ Caja de diálogo
  let cur = null; // diálogo en curso
  const queue = [];

  function root() {
    let r = document.getElementById('vn');
    if (r) return r;
    r = document.createElement('div');
    r.id = 'vn';
    r.className = 'vn';
    r.dataset.act = 'vn-next'; // tocar en cualquier sitio avanza
    // El retrato asoma por encima de la caja, sin marco propio (siempre a 1:1)
    r.innerHTML = `<div class="vn-hole"></div>
      <div class="vn-box" data-act="vn-next" role="dialog" aria-live="polite" aria-label="${U.esc(CHAR.short)}">
        <div class="vn-stage" aria-hidden="true"><i class="vn-glow"></i><i class="vn-ledge"></i><div class="vn-face"></div></div>
        <div class="vn-tag"><b>${U.esc(CHAR.short)}</b><span>${U.esc(CHAR.role)}</span></div>
        <div class="vn-text"></div>
        <div class="vn-choices"></div>
        <div class="vn-foot"><span class="vn-dots"></span><span class="vn-next" aria-hidden="true">Toca para seguir ▼</span></div>
        <button class="vn-skip" data-act="vn-skip">Saltar ⏭</button>
      </div>`;
    document.body.appendChild(r);
    return r;
  }

  /**
   * Muestra una conversación. lines: textos o { text, emo, sel, tab, choices: [{ label, value }] }.
   * opts: { dim, skippable, onEnd }. Devuelve una promesa con las respuestas elegidas.
   */
  function say(lines, opts) {
    return new Promise(resolve => {
      const job = { lines: lines.map(l => (typeof l === 'string' ? { text: l } : l)), opts: opts || {}, resolve, answers: {} };
      if (cur) { queue.push(job); return; }
      begin(job);
    });
  }

  function begin(job) {
    const r = root();
    cur = { ...job, i: -1, face: cur && cur.face ? cur.face : new Face(r.querySelector('.vn-face')) };
    r.classList.toggle('dim', cur.opts.dim !== false);
    r.querySelector('.vn-skip').style.display = cur.opts.skippable === false ? 'none' : '';
    r.classList.add('show');
    next();
  }

  function next() {
    if (!cur) return;
    cur.i++;
    const line = cur.lines[cur.i];
    if (!line) { finish(); return; }
    const r = root();
    // Cambiar de pestaña / resaltar un elemento
    if (line.tab && TL.Game.S && TL.UI.tab !== line.tab && !document.getElementById('match')) { TL.UI.tab = line.tab; TL.UI.render(false); }
    const hole = r.querySelector('.vn-hole');
    const target = line.sel ? document.querySelector(line.sel) : null;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      const b = target.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { display: 'block', left: b.left - pad + 'px', top: b.top - pad + 'px', width: b.width + pad * 2 + 'px', height: b.height + pad * 2 + 'px' });
      r.classList.toggle('top', b.top + b.height / 2 > innerHeight * 0.55);
      r.classList.add('spot');
    } else {
      hole.style.display = 'none';
      r.classList.remove('spot', 'top');
    }
    const emo = line.emo || cur.opts.emo || 'neutral';
    cur.face.setEmotion(emo);
    cur.mood = MOOD_VOICE[emo] || 0;
    const text = typeof line.text === 'function' ? line.text(TL.Game.S) : line.text;
    cur.tk = tokens(text);
    cur.n = 0;
    cur.typing = true;
    cur.line = line;
    r.querySelector('.vn-choices').innerHTML = '';
    const n = cur.lines.length;
    r.querySelector('.vn-dots').innerHTML = n > 1 && n <= 14 ? cur.lines.map((_, k) => `<i class="${k < cur.i ? 'past' : k === cur.i ? 'on' : ''}"></i>`).join('') : n > 14 ? `${cur.i + 1}/${n}` : '';
    r.classList.remove('done');
    const box = r.querySelector('.vn-box');
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    type();
  }

  function type() {
    if (!cur || !cur.typing) return;
    const r = root();
    const t = cur.tk[cur.n];
    if (!t) { endLine(); return; }
    cur.n++;
    r.querySelector('.vn-text').innerHTML = renderTokens(cur.tk, cur.n);
    cur.face.say(t.ch);
    if (TL.SFX && TL.SFX.voice && cur.n % 1 === 0) TL.SFX.voice(t.ch, { pitch: CHAR.voice.pitch, mood: cur.mood, rate: CHAR.voice.rate });
    let ms = 28;
    if ('.!?…'.includes(t.ch)) ms = 230;
    else if (',;:'.includes(t.ch)) ms = 120;
    cur.timer = setTimeout(type, ms);
  }

  function endLine() {
    if (!cur) return;
    clearTimeout(cur.timer);
    cur.typing = false;
    const r = root();
    r.querySelector('.vn-text').innerHTML = renderTokens(cur.tk, cur.tk.length);
    cur.face.stop();
    const ch = cur.line.choices;
    if (ch && ch.length) {
      r.querySelector('.vn-choices').innerHTML = ch.map((c, k) =>
        `<button class="btn sm ${k === 0 ? 'primary' : ''}" data-act="vn-choice" data-k="${k}">${U.esc(c.label)}</button>`).join('');
    } else r.classList.add('done');
  }

  function finish(skipped) {
    if (!cur) return;
    clearTimeout(cur.timer);
    const job = cur;
    cur.face.stop();
    const r = root();
    r.classList.remove('show', 'spot', 'top', 'done');
    cur = null;
    if (job.opts.onEnd) job.opts.onEnd(!!skipped);
    job.resolve(job.answers);
    const nx = queue.shift();
    if (nx) setTimeout(() => begin(nx), 250);
  }

  const A = TL.UI.actions;
  A['vn-next'] = (el, ev) => {
    if (!cur || (ev && ev.target.closest('.vn-choices, .vn-skip'))) return;
    if (cur.typing) { endLine(); return; }
    if (cur.line.choices && cur.line.choices.length) return;
    next();
  };
  A['vn-skip'] = () => { if (cur) finish(true); };
  A['vn-choice'] = el => {
    if (!cur) return;
    const c = cur.line.choices[+el.dataset.k];
    cur.answers[cur.line.id || cur.i] = c.value;
    if (c.fx && TL.Game.S) c.fx(TL.Game.S);
    if (c.reply) cur.lines.splice(cur.i + 1, 0, ...[].concat(c.reply).map(x => (typeof x === 'string' ? { text: x, emo: c.emo } : x)));
    next();
  };
  document.addEventListener('keydown', e => {
    if (!cur) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A['vn-next'](null, null); }
    if (e.key === 'Escape') finish(true);
  });
  window.addEventListener('resize', () => { if (cur && cur.line && cur.line.sel) { cur.i--; next(); } });

  // ------------------------------------------------------------ Estado y ajustes
  function on() { try { return localStorage.getItem('touchline.mentor') !== '0'; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem('touchline.mentor', v ? '1' : '0'); } catch (e) { /* nada */ } }
  function state(S) {
    if (!S.mentor) S.mentor = { seen: {}, trust: 50, cool: {}, chapter: 1 };
    return S.mentor;
  }
  function trust(S, d) { const m = state(S); m.trust = U.clamp(m.trust + d, 0, 100); }

  // ------------------------------------------------------------ Ayuda contextual (botón «?»)
  function userResults(S) {
    const out = [];
    for (let r = 0; r < S.week && r < S.fixtures.length; r++) {
      const m = S.fixtures[r].find(x => x[0] === S.user || x[1] === S.user);
      if (m && m[2] >= 0) { const a = m[0] === S.user ? m[2] : m[3], b = m[0] === S.user ? m[3] : m[2]; out.push(a > b ? 'V' : a < b ? 'D' : 'E'); }
    }
    return out;
  }
  function streak(S, k) { const r = userResults(S); let n = 0; for (let i = r.length - 1; i >= 0 && r[i] === k; i--) n++; return n; }

  const HELP = {
    home: S => {
      const W = TL.World, sq = W.squad(S, S.user);
      const expiring = sq.filter(p => p.contract <= S.season + 1).length;
      const offers = S.inbox.filter(m => m.kind === 'offer' && !m.done).length;
      const lines = ['Esto es el **despacho**: próximo partido, directiva, buzón y prensa. Desde aquí se avanza la temporada.'];
      lines.push(`La directiva quiere: **${S.board.text.toLowerCase()}**. Su confianza está al ${Math.round(S.board.conf)}%.`);
      if (offers) lines.push({ text: `Tienes **${offers} oferta${offers > 1 ? 's' : ''}** por tus jugadores. Míralas en Mercado → Mis ventas antes de que caduquen.`, emo: 'thinking' });
      if (expiring) lines.push({ text: `Ojo: **${expiring} contrato${expiring > 1 ? 's acaban' : ' acaba'}** este verano. Renueva a los que quieras conservar desde su ficha.`, emo: 'worried' });
      if (S.mgr.points) lines.push({ text: `Y tienes **${S.mgr.points} punto${S.mgr.points > 1 ? 's' : ''} de habilidad** sin gastar. Club → Mánager.`, emo: 'happy' });
      return lines;
    },
    squad: S => ['Tu **plantilla**. La carita es la moral; la barrita, la forma física. Un jugador cansado o triste rinde menos.',
      'Toca a cualquiera para renovarle, ponerle en venta o rescindir. Las etiquetas te avisan de lesiones, sanciones y contratos que acaban.'],
    tactics: S => ['El **número de cada ficha** es lo que rinde ese jugador en ese puesto. Si sale en amarillo, está fuera de sitio.',
      'Al cambiar de sistema intento mantener a cada uno en su puesto. **Mejor once** elige el equipo más en forma.',
      { text: 'Lo que plantee el rival no lo sabrás hasta que empiece el partido: su entrenador tiene **sus propias ideas** y te estudia. Después, abajo, te dejo mi **repaso**.', emo: 'thinking' },
      { text: 'Mentalidad **ofensiva** si necesitas goles, **defensiva** para guardar un resultado. No hay más secreto… bueno, alguno hay.', emo: 'laugh' }],
    league: S => ['La **clasificación**, las jornadas y los goleadores. Las zonas verdes ascienden y las rojas bajan.',
      'Toca un equipo para ver su plantilla: conocer al rival es medio partido.'],
    market: S => {
      const open = TL.Market.windowOpen(S);
      return [open ? 'El mercado está **abierto**. Haz ofertas cerca del valor y negocia el contrato después.' : 'El mercado está **cerrado**, pero los **agentes libres** se pueden fichar siempre.',
        `Tienes **${U.money(TL.Commerce.transferBudget(S))}** para fichajes. Usa el filtro «Lo que puedo pagar» para no perder el tiempo.`,
        'Si quieres vender, pon al jugador **en venta**: las ofertas llegan mientras el mercado esté abierto.'];
    },
    club: S => ['Aquí está el **dinero**: el presupuesto salarial sale de tus ingresos y tus ahorros. Si necesitas más, puedes ampliarlo a costa de los fichajes.',
      'En **Comercial**: patrocinios, entradas, marketing, préstamos y el estadio. En **Mánager**: tus habilidades.',
      { text: 'Un consejo de viejo: los patrocinios de criptomonedas pagan mucho… hasta que dejan de pagar.', emo: 'thinking' }]
  };

  function help(tab) {
    const S = TL.Game.S;
    if (!S) return;
    const f = HELP[tab] || HELP.home;
    const lines = f(S).slice();
    lines.push({ text: '¿Quieres que te enseñe algo más a fondo?', emo: 'thinking', choices: [
      { label: 'Abrir la escuela', value: 'school', fx: () => setTimeout(() => TL.School.open(), 250) },
      { label: 'Gracias, Profe', value: 'ok', reply: { text: '¡A mandar! Aquí estaré.', emo: 'happy' } }] });
    say(lines, { dim: true });
  }
  A.help = () => help(TL.UI.tab);

  // ------------------------------------------------------------ Ruta del Profe
  // Eventos que se comprueban tras cada jornada (uno como máximo por jornada).
  const ROUTE = [
    { id: 'firstWin', once: true, when: S => userResults(S).slice(-1)[0] === 'V', trust: 3, lines: [
      { text: '¡Así se hace! **Primera victoria**. Ahora disfrútala diez minutos… y piensa ya en el siguiente.', emo: 'happy' }] },
    { id: 'firstLoss', once: true, when: S => userResults(S).slice(-1)[0] === 'D', lines: [
      { text: 'La primera derrota escuece. Mírate las notas del partido: ahí suele estar la respuesta.', emo: 'worried' },
      { text: 'Y nada de broncas en caliente. Un vestuario se gana en semanas y se pierde en una frase.', emo: 'neutral' },
      { text: '¿Te explico cómo se ganan los partidos en este juego? Son dos minutos.', emo: 'thinking', choices: [
        { label: 'Sí, explícamelo', value: 'yes', fx: () => setTimeout(() => TL.School.play('engine'), 300) },
        { label: 'Ahora no', value: 'no', reply: { text: 'Cuando quieras: está en la escuela, en el botón **?**.', emo: 'neutral' } }] }] },
    { id: 'losingStreak', cooldown: 8, when: S => streak(S, 'D') >= 3, lines: [
      { id: 'racha', text: 'Tres derrotas seguidas, míster. Esto empieza a oler mal. ¿Qué hacemos?', emo: 'worried', choices: [
        { label: 'Cambiar el sistema', value: 'tactics', fx: S => { trust(S, 2); setTimeout(() => { TL.UI.tab = 'tactics'; TL.UI.render(false); }, 300); },
          reply: { text: 'Bien. Busca un sistema que tape tus carencias, no el que más te guste.', emo: 'thinking' } },
        { label: 'Hablar con el vestuario', value: 'talk', fx: S => { trust(S, 2); for (const p of TL.World.squad(S, S.user)) p.mor = Math.min(100, (p.mor || 70) + 3); },
          reply: { text: 'Hecho. Les he visto más enchufados en el entrenamiento. (+3 de moral a la plantilla)', emo: 'happy' } },
        { label: 'Explícame qué hago mal', value: 'lesson', fx: S => { trust(S, 1); setTimeout(() => TL.School.play('losing'), 300); } },
        { label: 'Seguir igual', value: 'stay', fx: S => trust(S, -1),
          reply: { text: 'Tú mandas. Pero no te enamores de un plan que no funciona.', emo: 'neutral' } }] }] },
    { id: 'winningStreak', cooldown: 10, when: S => streak(S, 'V') >= 4, trust: 2, lines: [
      { text: '¡Cuatro seguidas! La gente ya canta tu nombre.', emo: 'proud' },
      { text: 'Ahora viene lo difícil: que los chavales no se lo crean. Rota a los cansados.', emo: 'thinking' }] },
    { id: 'firstDecision', once: true, when: S => S.inbox.some(m => m.kind === 'decision' && !m.done), lines: [
      { text: 'Te ha llegado tu primer **marrón** al buzón. Bienvenido al fútbol de verdad.', emo: 'thinking' },
      { text: 'No hay respuesta perfecta: proteger al jugador, al vestuario o a la directiva. Elige y sé coherente.', emo: 'neutral' }] },
    { id: 'firstOffer', once: true, when: S => S.inbox.some(m => m.kind === 'offer' && !m.done), lines: [
      { text: 'Hay clubes preguntando por tus jugadores. Las ofertas **caducan en una semana**, así que no las dejes enfriar.', emo: 'thinking' }] },
    { id: 'firstLevelUp', once: true, when: S => S.mgr.level >= 2 && S.mgr.points > 0, lines: [
      { text: '¡Estás aprendiendo rápido! Has ganado **puntos de habilidad**.', emo: 'happy' },
      { text: 'Gástalos en Club → Mánager. Yo empezaría por **Pizarra** o **Charla de vestuario**.', emo: 'neutral' }] },
    { id: 'windowClosing', season: true, when: S => S.week === 3, lines: [
      { text: 'Última semana de mercado de verano. Lo que no hagas ahora, tendrá que esperar al invierno.', emo: 'thinking' }] },
    { id: 'boardLow', cooldown: 10, when: S => S.board.conf < 30, lines: [
      { text: 'El presidente me ha preguntado por ti en el palco. No te voy a mentir: **la confianza está bajo mínimos**.', emo: 'worried' },
      { text: 'Necesitamos resultados ya. Juega a lo seguro unas semanas.', emo: 'neutral' }] },
    { id: 'cashNegative', cooldown: 12, when: S => S.clubs[S.user].cash < 0, lines: [
      { text: 'Estamos en **números rojos**. Vende a alguien que no juegue, firma patrocinios o pide un préstamo pequeño.', emo: 'worried' }] },
    { id: 'halfSeason', season: true, when: S => S.week === Math.floor(S.fixtures.length / 2), lines: [
      { text: S => { const tab = TL.Season.table(S); const pos = tab.findIndex(r => r.id === S.user) + 1; return pos <= S.board.target
        ? `Media temporada y vamos **${pos}º**. Vamos por buen camino para el objetivo.` : `Media temporada y vamos **${pos}º**. Hay que apretar: el objetivo es quedar entre los ${S.board.target} primeros.`; } },
      { text: 'Se abre el **mercado de invierno**. Es buen momento para tapar el hueco que más te duela.', emo: 'thinking' }] }
  ];

  function check(S) {
    if (!S || !on() || cur || S.fired || document.getElementById('match') || document.querySelector('.sheet-back')) return false;
    const m = state(S);
    for (const ev of ROUTE) {
      const key = ev.season ? ev.id + ':' + S.season : ev.id;
      if ((ev.once || ev.season) && m.seen[key]) continue;
      if (ev.cooldown && m.cool[ev.id] != null && S.season * 100 + S.week - m.cool[ev.id] < ev.cooldown) continue;
      let ok = false;
      try { ok = ev.when(S); } catch (e) { ok = false; }
      if (!ok) continue;
      m.seen[key] = true;
      if (ev.cooldown) m.cool[ev.id] = S.season * 100 + S.week;
      if (ev.trust) trust(S, ev.trust);
      say(ev.lines, { dim: true }).then(() => TL.Game.save());
      return true;
    }
    return false;
  }

  /** Momentos de carrera (fin de temporada, destitución, ofertas, títulos). */
  function event(S, kind, sum) {
    if (!S) return;
    const m = state(S);
    const first = !m.seen.graduation && kind === 'seasonEnd';
    let lines = [];
    if (kind === 'seasonEnd' && sum) {
      if (sum.pos === 1) {
        trust(S, 8);
        lines.push({ text: '¡¡CAMPEONES!! Mírame, que se me escapa una lágrima y todo.', emo: 'laugh' });
        if (m.trust >= 70 && !m.seen.story) {
          m.seen.story = true;
          lines.push({ text: 'Te voy a contar algo que no sabe nadie. Yo gané mi primera liga con un equipo de chavales… y la perdí al año siguiente por soberbia.', emo: 'sad' },
            { text: 'Por eso dejé los banquillos y me puse a enseñar. Que no te pase lo mismo, ¿eh?', emo: 'proud' });
        }
      } else if (sum.moved === 'up') { trust(S, 6); lines.push({ text: '¡**Ascenso**! Esto en mi pueblo se celebra tres días.', emo: 'happy' }); }
      else if (sum.moved === 'down') { trust(S, -5); lines.push({ text: 'Descenso. Duele, lo sé. Pero los grandes entrenadores se hacen en las caídas.', emo: 'sad' }); }
      else if (sum.pos <= sum.target) { trust(S, 5); lines.push({ text: `Objetivo cumplido: **${sum.pos}º**. La directiva está contenta, y yo también.`, emo: 'proud' }); }
      else lines.push({ text: `Acabamos **${sum.pos}º** y el objetivo era el top ${sum.target}. Hay cosas que corregir.`, emo: 'worried' });
      if (first) {
        m.seen.graduation = true;
        m.chapter = 3;
        lines.push(m.trust >= 60
          ? { text: 'Y con esto se acaba tu primer año. Ya no necesitas que te lleve de la mano… aunque seguiré por aquí. Llámame con el **?** cuando quieras.', emo: 'proud' }
          : { text: 'Primer año completado. Te queda camino, pero tienes madera. Seguiré cerca: el **?** de arriba sigue funcionando.', emo: 'neutral' });
      }
      if (sum.jobs && sum.jobs.length && !sum.fired) lines.push({ text: 'Por cierto: te llaman de **otros clubes**. Piensa en el proyecto, no solo en el escudo.', emo: 'thinking' });
    } else if (kind === 'fired') {
      lines = [{ text: 'Me he enterado. Lo siento, de verdad.', emo: 'sad' },
        { text: 'A mí me echaron tres veces. La cuarta gané la liga. Mira qué clubes te llaman y vuelve más fuerte.', emo: 'proud' }];
    }
    if (lines.length && on()) say(lines, { dim: true }).then(() => TL.Game.save());
  }

  TL.Mentor = { CHAR, EMOTIONS, Face, say, help, check, event, on, setOn, state, trust, active: () => !!cur, HELP, ROUTE };
})();
