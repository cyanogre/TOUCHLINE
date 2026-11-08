/* TOUCHLINE — tu cara de mánager.
 *
 * Dos fotos (boca cerrada y boca abierta), con la cámara en directo y una silueta encima o subidas
 * desde la galería, se encajan en una silueta editable por puntos (como un trazado vectorial), se
 * borra el fondo y se pixelan a 64×64 con una paleta corta común. Después se pueden retocar a mano,
 * píxel a píxel, con los colores de la paleta y los que añadas. La cara se usa en las charlas con
 * los jugadores: la boca se mueve mientras sale el texto.
 * Las fotos no salen del dispositivo: solo se guardan los dos sprites de 64×64.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const tr = s => (TL.t ? TL.t(s) : s);
  const KEY = 'touchline.face';
  const N = 64, S = 640;
  const EYE = 0.38, MOUTH = 0.56;

  // ------------------------------------------------------------ Guardado (la última cara creada sirve para la próxima carrera)
  function stored() { try { const f = JSON.parse(localStorage.getItem(KEY) || 'null'); return f && f.f && f.f.length === 2 ? f : null; } catch (e) { return null; } }
  function store(face) { try { if (face) localStorage.setItem(KEY, JSON.stringify(face)); else localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ } }
  /** La cara del mánager de la partida en curso (o la última creada). */
  function current() { const S0 = TL.Game && TL.Game.S; return (S0 && S0.face) || null; }

  // ------------------------------------------------------------ Dibujo de la cara en las charlas
  const imgCache = {};
  function imgOf(url) {
    if (!imgCache[url]) { const im = new Image(); im.src = url; imgCache[url] = im; }
    return imgCache[url];
  }
  function draw(canvas, face, open) {
    const x = canvas.getContext('2d');
    x.imageSmoothingEnabled = false;
    const im = imgOf(face.f[open ? 1 : 0]);
    const go = () => { x.clearRect(0, 0, canvas.width, canvas.height); x.drawImage(im, 0, 0, canvas.width, canvas.height); };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });
  }
  /** Marcado de la cara (o '' si no hay). */
  function html(face, cls) {
    return face ? `<canvas class="mgr-face ${cls || ''}" width="64" height="64" data-mgr-face aria-hidden="true"></canvas>` : '';
  }
  /** Pinta las caras de un trozo de página y, si hay una frase con data-say, la «dice» moviendo la boca. */
  function mount(root, face) {
    face = face || current();
    if (!root || !face) return;
    root.querySelectorAll('canvas[data-mgr-face]').forEach(c => draw(c, face, false));
    const line = root.querySelector('[data-say]');
    const canvas = root.querySelector('canvas[data-mgr-face].talking') || root.querySelector('canvas[data-mgr-face]');
    if (line && canvas) say(canvas, line, face);
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function say(canvas, el, face, done) {
    const text = el.textContent;
    if (reduced()) { draw(canvas, face, false); if (done) done(); return; }
    el.textContent = '';
    el.classList.add('saying');
    let i = 0, open = false;
    const tick = () => {
      if (!el.isConnected) return;
      i++;
      el.textContent = text.slice(0, i);
      const ch = text[i - 1] || '';
      open = /[aeiouáéíóúAEIOUÁÉÍÓÚ]/.test(ch) ? true : /[\s.,:;!?¡¿]/.test(ch) ? false : open;
      draw(canvas, face, open);
      if (i < text.length) setTimeout(tick, /[.,:;!?]/.test(ch) ? 170 : 38);
      else { draw(canvas, face, false); el.classList.remove('saying'); if (done) done(); }
    };
    tick();
  }

  // ------------------------------------------------------------ Silueta por puntos
  const P = (x, y, c) => ({ x, y, c: !!c });
  const PRESETS = {
    corto: [P(.02, 1, 1), P(.10, .86), P(.37, .775), P(.40, .68), P(.32, .60), P(.27, .47), P(.27, .32), P(.33, .16), P(.5, .10),
      P(.67, .16), P(.73, .32), P(.73, .47), P(.68, .60), P(.60, .68), P(.63, .775), P(.90, .86), P(.98, 1, 1)],
    melena: [P(.02, 1, 1), P(.08, .88), P(.22, .80), P(.21, .62), P(.22, .44), P(.25, .28), P(.33, .14), P(.5, .08),
      P(.67, .14), P(.75, .28), P(.78, .44), P(.79, .62), P(.78, .80), P(.92, .88), P(.98, 1, 1)],
    recogido: [P(.02, 1, 1), P(.10, .86), P(.37, .775), P(.40, .68), P(.31, .60), P(.26, .46), P(.26, .30), P(.32, .17), P(.40, .12), P(.41, .05), P(.5, .015),
      P(.59, .05), P(.60, .12), P(.68, .17), P(.74, .30), P(.74, .46), P(.69, .60), P(.60, .68), P(.63, .775), P(.90, .86), P(.98, 1, 1)],
    voluminoso: [P(.02, 1, 1), P(.10, .86), P(.36, .78), P(.38, .70), P(.24, .60), P(.17, .44), P(.18, .26), P(.28, .12), P(.5, .05),
      P(.72, .12), P(.82, .26), P(.83, .44), P(.76, .60), P(.62, .70), P(.64, .78), P(.90, .86), P(.98, 1, 1)]
  };
  const PRESET_NAMES = { corto: 'Pelo corto', melena: 'Melena', recogido: 'Recogido', voluminoso: 'Voluminoso' };

  // ------------------------------------------------------------ Editor
  let ed = null; // instancia abierta

  function open(opts) {
    if (ed) ed.close();
    ed = new Editor(opts || {});
  }

  class Editor {
    constructor(o) {
      this.o = o;
      this.g = o.g || 'M';
      this.preset = this.g === 'F' ? 'melena' : 'corto';
      this.pts = PRESETS[this.preset].map(p => ({ ...p }));
      this.paired = true;
      this.frames = [0, 1].map(() => ({ img: null, x: S / 2, y: S / 2, scale: 1, rot: 0, flip: false }));
      this.cur = 0;
      this.mode = 'move';
      this.sel = -1; this.dragPt = -1; this.lastTap = { i: -1, t: 0 };
      this.touches = new Map(); this.lastPinch = null;
      this.base = [null, null]; // píxeles de la cara guardada (si no hay foto nueva)
      this.edits = [new Map(), new Map()]; // retoques a mano: índice → [r, g, b, a]
      this.undo = [];
      this.extra = [];
      this.pal = [];
      this.tool = 'pen'; this.color = [17, 17, 17, 255]; this.both = true; this.pxFrame = 0; this.zoom = 0;
      this.step = 0;
      this.stream = null; this.video = null; this.live = false;
      this.build();
      if (o.face) this.loadBase(o.face);
      this.process(); this.renderStage();
    }

    // -------------------------------------------------------- Interfaz
    build() {
      const root = this.root = document.createElement('div');
      root.className = 'face-ed';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Tu cara de mánager');
      const chips = Object.entries(PRESET_NAMES).map(([k, l]) => `<button class="chip ${k === this.preset ? 'on' : ''}" type="button" data-fe-preset="${k}">${l}</button>`).join('');
      const shot = i => `<div class="fe-shot ${i === 0 ? 'on' : ''}" data-fe-shot="${i}" role="button" tabindex="0">
          <canvas width="64" height="64" id="fe-thumb${i}"></canvas><div class="grow"><b>${i ? 'Boca abierta' : 'Boca cerrada'}</b><small id="fe-st${i}">Sin foto</small></div></div>`;
      root.innerHTML = `
        <div class="fe-head">
          <button class="icon-btn" type="button" data-fe="close" aria-label="Cerrar">✕</button>
          <h2>Tu cara de mánager</h2>
        </div>
        <div class="fe-steps seg" role="tablist">
          <button type="button" class="on" data-fe-step="0" role="tab">1 · Fotos y silueta</button>
          <button type="button" data-fe-step="1" role="tab">2 · Píxeles</button>
        </div>
        <div class="fe-body">
          <section class="fe-sec" data-step="0">
            <div class="fe-shots">${shot(0)}${shot(1)}</div>
            <div class="fe-stage-box" id="fe-box">
              <canvas id="fe-stage" width="${S}" height="${S}"></canvas>
              <div class="fe-empty" id="fe-empty"><p>Abre la cámara o sube una foto.<br>Pon la cara dentro de la silueta: ojos y boca sobre sus líneas.</p></div>
              <button class="fe-snap" type="button" data-fe="snap" id="fe-snap" hidden aria-label="Hacer foto"><i></i></button>
              <div class="fe-hint" id="fe-hint"></div>
            </div>
            <div class="fe-row">
              <button class="btn" type="button" data-fe="cam" id="fe-cam">📷 Cámara</button>
              <label class="btn" for="fe-file">🖼️ Subir foto</label><input class="vh" type="file" id="fe-file" accept="image/*">
              <label class="btn" for="fe-shoot" id="fe-shoot-l" hidden>📷 Hacer foto</label><input class="vh" type="file" id="fe-shoot" accept="image/*" capture="user">
            </div>
            <div class="fe-label">Silueta</div>
            <div class="chips">${chips}</div>
            <div class="seg">
              <button type="button" class="on" data-fe-mode="move">Mover foto</button>
              <button type="button" data-fe-mode="edit">Editar silueta</button>
            </div>
            <div class="fe-tools" id="fe-pts" hidden>
              <label><input type="checkbox" id="fe-sym" checked> Simetría</label>
              <button class="btn sm" type="button" data-fe="corner" id="fe-corner" disabled>Curva / esquina</button>
              <button class="btn sm" type="button" data-fe="delpt" id="fe-delpt" disabled>Borrar punto</button>
              <button class="btn sm" type="button" data-fe="resetsil">Restablecer silueta</button>
              <p class="note" id="fe-symnote">Arrastra los puntos para ajustar mandíbula, cara y pelo · toca la línea para añadir un punto · doble toque sobre un punto para borrarlo.</p>
            </div>
            <div class="fe-ctrls">
              <label class="fe-ctrl"><span>Zoom <output id="fe-zoomv">100%</output></span><input type="range" id="fe-zoom" min="20" max="400" value="100"></label>
              <label class="fe-ctrl"><span>Girar <output id="fe-rotv">0°</output></span><input type="range" id="fe-rot" min="-25" max="25" step="0.5" value="0"></label>
            </div>
            <div class="fe-tools">
              <label><input type="checkbox" id="fe-onion" checked> Calco de la otra foto</label>
              <button class="btn sm" type="button" data-fe="match">Igualar encuadre con la otra</button>
              <button class="btn sm" type="button" data-fe="flip">Voltear</button>
            </div>
          </section>

          <section class="fe-sec" data-step="1" hidden>
            <div class="fe-talk">
              <canvas class="mgr-face" id="fe-talkface" width="64" height="64"></canvas>
              <div class="grow"><span class="fe-who">Míster</span><p id="fe-talktext">Siéntate. Vamos a hablar de tus minutos.</p></div>
            </div>
            <div class="fe-frames">
              <button type="button" class="fe-frame on" data-fe-px="0"><canvas id="fe-out0" width="64" height="64"></canvas><span>Boca cerrada</span></button>
              <button type="button" class="fe-frame" data-fe-px="1"><canvas id="fe-out1" width="64" height="64"></canvas><span>Boca abierta</span></button>
            </div>
            <div class="fe-label">Retocar a mano</div>
            <div class="fe-pxtools" role="toolbar" aria-label="Herramientas de dibujo">
              <button type="button" class="on" data-fe-tool="pen" title="Lápiz">✏️<span>Lápiz</span></button>
              <button type="button" data-fe-tool="erase" title="Goma">🧽<span>Goma</span></button>
              <button type="button" data-fe-tool="pick" title="Cuentagotas">💧<span>Color</span></button>
              <button type="button" data-fe-tool="fill" title="Rellenar">🪣<span>Rellenar</span></button>
              <button type="button" data-fe-tool="hand" title="Desplazar">✋<span>Mover</span></button>
              <button type="button" data-fe="undo" id="fe-undo" disabled title="Deshacer">↩️<span>Deshacer</span></button>
            </div>
            <div class="fe-pxwrap" id="fe-pxwrap"><canvas id="fe-px"></canvas></div>
            <div class="fe-row fe-pxbar">
              <button class="btn sm" type="button" data-fe="zout" aria-label="Alejar">−</button>
              <button class="btn sm" type="button" data-fe="zin" aria-label="Acercar">+</button>
              <label class="fe-both"><input type="checkbox" id="fe-both" checked> Retocar las dos caras a la vez</label>
            </div>
            <div class="fe-palette" id="fe-pal"></div>
            <div class="fe-row">
              <label class="btn sm" for="fe-addcolor">＋ Añadir color</label><input class="vh" type="color" id="fe-addcolor" value="#d0505a">
              <button class="btn sm" type="button" data-fe="clearedits">Quitar los retoques</button>
            </div>
            <div class="fe-label">Estilo del píxel</div>
            <div class="fe-ctrls">
              <label class="fe-ctrl"><span>Colores <output id="fe-colorsv">4</output></span><input type="range" id="fe-colors" min="2" max="32" value="4"></label>
              <label class="fe-ctrl"><span>Contraste <output id="fe-contrastv">109%</output></span><input type="range" id="fe-contrast" min="70" max="160" value="109"></label>
              <label class="fe-ctrl"><span>Saturación <output id="fe-satv">115%</output></span><input type="range" id="fe-sat" min="40" max="180" value="115"></label>
              <label class="fe-ctrl"><span>Brillo <output id="fe-briv">86%</output></span><input type="range" id="fe-bri" min="70" max="140" value="86"></label>
            </div>
            <div class="fe-tools">
              <label><input type="checkbox" id="fe-outline" checked> Contorno</label>
              <label><input type="checkbox" id="fe-clean" checked> Quitar píxeles sueltos</label>
            </div>
            <p class="note">Por defecto, 4 colores: un retrato de tonos cálidos. Sube los colores si quieres más detalle. Tus retoques se mantienen aunque cambies el estilo.</p>
          </section>
        </div>
        <div class="fe-foot">
          <button class="btn" type="button" data-fe="close">Cancelar</button>
          <button class="btn primary" type="button" data-fe="save" id="fe-save">Guardar mi cara</button>
        </div>`;
      document.body.appendChild(root);
      document.documentElement.classList.add('fe-open');
      this.$ = id => root.querySelector('#' + id);
      this.stage = this.$('fe-stage'); this.sx = this.stage.getContext('2d');
      this.px = this.$('fe-px');
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { this.$('fe-cam').hidden = true; this.$('fe-shoot-l').hidden = false; }
      this.bind();
      this.setHint();
    }

    bind() {
      const r = this.root;
      r.addEventListener('click', e => {
        const b = e.target.closest('[data-fe],[data-fe-step],[data-fe-shot],[data-fe-preset],[data-fe-mode],[data-fe-tool],[data-fe-px],[data-fe-sw]');
        if (!b || b.disabled) return;
        if (b.dataset.feStep != null) return this.setStep(+b.dataset.feStep);
        if (b.dataset.feShot != null) return this.select(+b.dataset.feShot);
        if (b.dataset.fePreset) return this.usePreset(b.dataset.fePreset);
        if (b.dataset.feMode) return this.setMode(b.dataset.feMode);
        if (b.dataset.feTool) return this.setTool(b.dataset.feTool);
        if (b.dataset.fePx != null) return this.setPxFrame(+b.dataset.fePx);
        if (b.dataset.feSw != null) { this.color = this.swatches()[+b.dataset.feSw]; if (this.tool === 'erase' || this.tool === 'hand' || this.tool === 'pick') this.setTool('pen'); return this.renderPalette(); }
        const a = b.dataset.fe;
        if (a === 'close') this.close();
        else if (a === 'save') this.save();
        else if (a === 'cam') this.camToggle();
        else if (a === 'snap') this.snap();
        else if (a === 'corner') { if (this.sel >= 0) { const v = !this.pts[this.sel].c; this.pts[this.sel].c = v; if (this.symOn()) this.pts[this.mirror(this.sel)].c = v; this.update(true); } }
        else if (a === 'delpt') { if (this.sel >= 0) { this.deletePoint(this.sel); this.refreshTools(); this.update(true); } }
        else if (a === 'resetsil') this.usePreset(this.preset);
        else if (a === 'match') { const f = this.frames[this.cur], o = this.frames[1 - this.cur]; if (!o.img || !f.img) return; f.x = o.x; f.y = o.y; f.rot = o.rot; f.flip = o.flip; f.scale = o.scale * (o.img.height / f.img.height); this.syncSliders(); this.update(true); }
        else if (a === 'flip') { this.frames[this.cur].flip = !this.frames[this.cur].flip; this.update(true); }
        else if (a === 'undo') this.doUndo();
        else if (a === 'zin' || a === 'zout') { this.zoom = Math.max(this.fitZoom(), Math.min(16, (this.zoom || this.fitZoom()) + (a === 'zin' ? 2 : -2))); this.renderPx(); }
        else if (a === 'clearedits') { this.pushUndo(); this.edits = [new Map(), new Map()]; this.compose(); }
      });
      r.addEventListener('keydown', e => {
        const s = e.target.closest('[data-fe-shot]');
        if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select(+s.dataset.feShot); }
        if (e.key === 'Escape') this.close();
      });
      const file = id => this.$(id).addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) this.loadFile(f, this.cur); e.target.value = ''; });
      file('fe-file'); file('fe-shoot');
      this.$('fe-zoom').addEventListener('input', e => { const f = this.frames[this.cur]; if (!f.img) return; f.scale = this.baseScale(f) * e.target.value / 100; this.$('fe-zoomv').textContent = e.target.value + '%'; this.update(true); });
      this.$('fe-rot').addEventListener('input', e => { this.frames[this.cur].rot = +e.target.value; this.$('fe-rotv').textContent = e.target.value + '°'; this.update(true); });
      this.$('fe-onion').addEventListener('change', () => this.update(false));
      this.$('fe-sym').addEventListener('change', () => this.update(false));
      for (const id of ['colors', 'contrast', 'sat', 'bri']) this.$('fe-' + id).addEventListener('input', e => { this.$('fe-' + id + 'v').textContent = id === 'colors' ? e.target.value : e.target.value + '%'; this.update(true); });
      for (const id of ['outline', 'clean']) this.$('fe-' + id).addEventListener('change', () => this.update(true));
      this.$('fe-both').addEventListener('change', e => { this.both = e.target.checked; });
      this.$('fe-addcolor').addEventListener('change', e => {
        const h = e.target.value, c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
        if (!this.extra.some(x => x.join() === c.join())) this.extra.push(c);
        this.color = c; if (this.tool !== 'fill') this.setTool('pen'); this.renderPalette();
      });
      this.bindStage(); this.bindPx();
      // Arrastrar o pegar una foto
      const box = this.$('fe-box');
      ['dragenter', 'dragover'].forEach(t => box.addEventListener(t, e => { e.preventDefault(); box.classList.add('drop'); }));
      ['dragleave', 'drop'].forEach(t => box.addEventListener(t, e => { e.preventDefault(); box.classList.remove('drop'); }));
      box.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) this.loadFile(f, this.cur); });
      this.onPaste = e => { const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(x => x.type.startsWith('image/')); if (it) this.loadFile(it.getAsFile(), this.cur); };
      window.addEventListener('paste', this.onPaste);
    }

    setStep(i) {
      this.step = i;
      this.root.querySelectorAll('[data-fe-step]').forEach(b => b.classList.toggle('on', +b.dataset.feStep === i));
      this.root.querySelectorAll('.fe-sec').forEach(s => { s.hidden = +s.dataset.step !== i; });
      if (i === 1) { this.camOff(); this.process(); this.zoom = 0; this.renderPx(); this.renderPalette(); this.talkLoop(); }
      this.root.querySelector('.fe-body').scrollTop = 0;
    }
    setHint() {
      const h = this.$('fe-hint');
      h.textContent = this.live ? tr('Pon la cara en la silueta y pulsa el botón') : this.mode === 'edit'
        ? tr('Arrastra los puntos · toca la línea para añadir uno · doble toque para borrarlo · fuera de la línea mueves la foto')
        : this.frames[this.cur].img ? tr('Arrastra para mover · pellizca o usa la rueda para acercar') : '';
      this.$('fe-empty').hidden = !!(this.frames[this.cur].img || this.live);
    }
    select(i) {
      this.cur = i;
      this.root.querySelectorAll('[data-fe-shot]').forEach(b => b.classList.toggle('on', +b.dataset.feShot === i));
      this.syncSliders(); this.setHint(); this.update(false);
    }

    // -------------------------------------------------------- Fotos: archivo y cámara en directo
    loadFile(file, i) {
      if (file.type && !/^image\//.test(file.type)) { this.msg(tr('Ese archivo no es una imagen. Prueba con una foto JPG o PNG.')); return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => this.setPhoto(i, img, null);
      img.onerror = () => { URL.revokeObjectURL(url); this.msg(tr('No se pudo abrir esa foto. Prueba con otra (JPG o PNG).')); };
      img.src = url;
    }
    setPhoto(i, img, tf) {
      const f = this.frames[i];
      f.img = img; f.rot = 0; f.flip = false;
      if (tf) Object.assign(f, tf);
      else {
        f.scale = this.baseScale(f); f.x = S / 2; f.y = S / 2;
        const o = this.frames[1 - i];
        if (o.img) { f.x = o.x; f.y = o.y; f.rot = o.rot; f.scale = o.scale * (o.img.height / img.height); }
      }
      this.base[i] = null;
      this.$('fe-st' + i).textContent = tr('Tu foto');
      this.select(i); this.update(true);
    }
    baseScale(f) { return f.img ? (S * 1.3) / Math.max(f.img.height, f.img.width * 0.8) : 1; }
    async camToggle() { if (this.live) this.camOff(); else await this.camOn(); }
    async camOn() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      } catch (e) {
        this.msg(tr('No se pudo abrir la cámara. Revisa los permisos del navegador o sube una foto.'));
        this.$('fe-shoot-l').hidden = false;
        return;
      }
      const v = this.video = document.createElement('video');
      v.playsInline = true; v.muted = true; v.setAttribute('playsinline', ''); v.srcObject = this.stream;
      try { await v.play(); } catch (e) { /* algunos móviles tardan */ }
      this.live = true;
      this.$('fe-cam').textContent = tr('✕ Cerrar cámara');
      this.$('fe-snap').hidden = false;
      this.setHint();
      const loop = () => { if (!this.live) return; this.renderStage(); this.raf = requestAnimationFrame(loop); };
      loop();
    }
    camOff() {
      if (!this.live && !this.stream) return;
      this.live = false;
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = null; this.video = null;
      cancelAnimationFrame(this.raf);
      this.$('fe-cam').textContent = tr('📷 Cámara');
      this.$('fe-snap').hidden = true;
      this.setHint(); this.renderStage();
    }
    liveTf() {
      const v = this.video, vw = v.videoWidth || 640, vh = v.videoHeight || 480;
      return { x: S / 2, y: S / 2, scale: S / Math.min(vw, vh), rot: 0, flip: true, img: v };
    }
    snap() {
      if (!this.live || !this.video || !this.video.videoWidth) return;
      const v = this.video, c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const x = c.getContext('2d');
      x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(v, 0, 0); // como en el espejo de la pantalla
      const tf = this.liveTf();
      TL.SFX && TL.SFX.click && TL.SFX.click();
      this.root.querySelector('.fe-stage-box').classList.add('flash');
      setTimeout(() => this.root.querySelector('.fe-stage-box').classList.remove('flash'), 200);
      const i = this.cur;
      this.setPhoto(i, c, { x: tf.x, y: tf.y, scale: tf.scale, rot: 0, flip: false });
      const other = 1 - i;
      if (!this.frames[other].img) { this.select(other); this.msg(tr('¡Hecha! Ahora la otra, con la boca abierta.')); }
      else this.camOff();
    }
    msg(t) { const h = this.$('fe-hint'); h.textContent = t; h.classList.add('warn'); clearTimeout(this.msgT); this.msgT = setTimeout(() => { h.classList.remove('warn'); this.setHint(); }, 3500); }

    // -------------------------------------------------------- Silueta
    symOn() { return this.$('fe-sym').checked && this.paired; }
    mirror(i) { return i < 0 ? -1 : this.pts.length - 1 - i; }
    seg(i) {
      const pts = this.pts, n = pts.length, a = pts[i], b = pts[i + 1];
      const pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(n - 1, i + 2)];
      const c1 = a.c ? a : { x: a.x + (b.x - pa.x) / 6, y: a.y + (b.y - pa.y) / 6 };
      const c2 = b.c ? b : { x: b.x - (pb.x - a.x) / 6, y: b.y - (pb.y - a.y) / 6 };
      return [a, c1, c2, b];
    }
    path(ctx, k, keep) {
      if (!keep) ctx.beginPath();
      ctx.moveTo(this.pts[0].x * k, this.pts[0].y * k);
      for (let i = 0; i < this.pts.length - 1; i++) { const [, c1, c2, b] = this.seg(i); ctx.bezierCurveTo(c1.x * k, c1.y * k, c2.x * k, c2.y * k, b.x * k, b.y * k); }
      ctx.closePath();
    }
    usePreset(name) {
      this.preset = name; this.pts = PRESETS[name].map(p => ({ ...p })); this.paired = true; this.sel = -1;
      this.root.querySelectorAll('[data-fe-preset]').forEach(b => b.classList.toggle('on', b.dataset.fePreset === name));
      this.$('fe-sym').checked = true;
      this.refreshTools(); this.update(true);
    }
    setMode(m) {
      this.mode = m; this.sel = -1;
      this.root.querySelectorAll('[data-fe-mode]').forEach(b => b.classList.toggle('on', b.dataset.feMode === m));
      this.$('fe-pts').hidden = m !== 'edit';
      this.refreshTools(); this.setHint(); this.update(false);
    }
    refreshTools() {
      const n = this.pts.length;
      this.$('fe-corner').disabled = this.sel <= 0 || this.sel >= n - 1;
      this.$('fe-delpt').disabled = this.sel <= 0 || this.sel >= n - 1 || n <= 7;
      this.$('fe-sym').disabled = !this.paired;
      this.$('fe-symnote').textContent = tr(this.paired ? 'Arrastra los puntos para ajustar mandíbula, cara y pelo · toca la línea para añadir un punto · doble toque sobre un punto para borrarlo.'
        : 'Has añadido o borrado puntos sin simetría: los dos lados ya no van a la par. Pulsa «Restablecer silueta» para recuperar la simetría.');
    }
    tol() { return 26 * S / this.stage.getBoundingClientRect().width; }
    hitPoint(x, y) { let best = -1, bd = this.tol(); this.pts.forEach((p, i) => { const d = Math.hypot(p.x * S - x, p.y * S - y); if (d < bd) { bd = d; best = i; } }); return best; }
    hitSegment(x, y) {
      let best = null, bd = this.tol();
      const bez = (s, t) => { const u = 1 - t; return { x: u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x, y: u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y }; };
      for (let i = 0; i < this.pts.length - 1; i++) { const sg = this.seg(i); for (let k = 1; k < 24; k++) { const q = bez(sg, k / 24), d = Math.hypot(q.x * S - x, q.y * S - y); if (d < bd) { bd = d; best = { i, x: q.x, y: q.y }; } } }
      return best;
    }
    movePoint(i, x, y) {
      const c = v => Math.max(0, Math.min(1, v)), p = this.pts[i];
      p.x = c(x / S); p.y = c(y / S);
      if (this.symOn()) { const m = this.mirror(i); if (m === i) p.x = 0.5; else { this.pts[m].x = 1 - p.x; this.pts[m].y = p.y; } }
    }
    addPoint(h) {
      const pts = this.pts, n = pts.length, i = h.i, m = n - 2 - i, out = [], pnew = P(h.x, h.y), sym = this.symOn();
      for (let k = 0; k < n; k++) {
        out.push(pts[k]);
        if (k === i) out.push(sym && m === i ? P(0.5, h.y) : pnew);
        else if (sym && k === m) out.push(P(1 - h.x, h.y));
      }
      if (!sym) this.paired = false;
      this.pts = out; this.sel = out.indexOf(pnew);
    }
    deletePoint(i) {
      const n = this.pts.length;
      if (i <= 0 || i >= n - 1 || n <= 7) return;
      if (this.symOn() && this.mirror(i) !== i) { const m = this.mirror(i); this.pts = this.pts.filter((_, k) => k !== i && k !== m); }
      else { if (!this.symOn() && this.mirror(i) !== i) this.paired = false; this.pts = this.pts.filter((_, k) => k !== i); }
      this.sel = -1;
    }
    bindStage() {
      const st = this.stage;
      const toS = e => { const r = st.getBoundingClientRect(); return [(e.clientX - r.left) * S / r.width, (e.clientY - r.top) * S / r.height]; };
      st.addEventListener('pointerdown', e => {
        st.setPointerCapture(e.pointerId);
        const now = toS(e);
        if (this.mode === 'edit') {
          if (this.dragPt >= 0) return;
          const i = this.hitPoint(now[0], now[1]);
          if (i >= 0) {
            const t = performance.now();
            if (this.lastTap.i === i && t - this.lastTap.t < 350) { this.deletePoint(i); this.lastTap = { i: -1, t: 0 }; this.refreshTools(); this.update(true); return; }
            this.lastTap = { i, t }; this.sel = i; this.dragPt = i; this.refreshTools(); this.update(false); return;
          }
          const h = this.hitSegment(now[0], now[1]);
          if (h) { this.addPoint(h); this.dragPt = this.sel; this.refreshTools(); this.update(true); return; }
          if (this.sel >= 0) { this.sel = -1; this.refreshTools(); this.update(false); }
        }
        this.touches.set(e.pointerId, now); this.lastPinch = null;
      });
      st.addEventListener('pointermove', e => {
        if (this.mode === 'edit' && this.dragPt >= 0) { const now = toS(e); this.movePoint(this.dragPt, now[0], now[1]); this.update(true); return; }
        if (!this.touches.has(e.pointerId)) return;
        const f = this.frames[this.cur], prev = this.touches.get(e.pointerId), now = toS(e);
        this.touches.set(e.pointerId, now);
        if (!f.img || this.live) return;
        if (this.touches.size === 1) { f.x += now[0] - prev[0]; f.y += now[1] - prev[1]; }
        else if (this.touches.size === 2) {
          const [a, b] = [...this.touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (this.lastPinch) f.scale = Math.max(0.05, Math.min(30, f.scale * d / this.lastPinch));
          this.lastPinch = d; this.syncSliders();
        }
        this.update(true);
      });
      const end = e => { if (this.dragPt >= 0) this.update(true); this.dragPt = -1; this.touches.delete(e.pointerId); this.lastPinch = null; };
      st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
      st.addEventListener('wheel', e => { const f = this.frames[this.cur]; if (!f.img || this.live) return; e.preventDefault(); f.scale = Math.max(0.05, Math.min(30, f.scale * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); this.syncSliders(); this.update(true); }, { passive: false });
    }
    syncSliders() {
      const f = this.frames[this.cur];
      const z = f.img ? Math.round(f.scale / this.baseScale(f) * 100) : 100;
      this.$('fe-zoom').value = Math.max(20, Math.min(400, z)); this.$('fe-zoomv').textContent = z + '%';
      this.$('fe-rot').value = f.rot; this.$('fe-rotv').textContent = f.rot + '°';
    }

    drawPhoto(ctx, f, k, alpha) {
      if (!f.img) return;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.translate(f.x * k, f.y * k); ctx.rotate(f.rot * Math.PI / 180);
      ctx.scale(f.scale * k * (f.flip ? -1 : 1), f.scale * k);
      const w = f.img.videoWidth || f.img.width, h = f.img.videoHeight || f.img.height;
      ctx.drawImage(f.img, -w / 2, -h / 2);
      ctx.restore();
    }
    renderStage() {
      const x = this.sx;
      x.clearRect(0, 0, S, S);
      x.fillStyle = '#0d1a14'; x.fillRect(0, 0, S, S);
      if (this.live && this.video) this.drawPhoto(x, this.liveTf(), 1);
      else {
        this.drawPhoto(x, this.frames[this.cur], 1);
        if (this.$('fe-onion').checked) this.drawPhoto(x, this.frames[1 - this.cur], 1, 0.35);
      }
      x.save(); x.beginPath(); x.rect(0, 0, S, S); this.path(x, S, true); x.fillStyle = 'rgb(8 17 13 / 0.72)'; x.fill('evenodd'); x.restore();
      x.save();
      this.path(x, S); x.setLineDash([10, 8]); x.lineWidth = 3; x.strokeStyle = '#b8f53d'; x.stroke();
      x.setLineDash([6, 8]); x.lineWidth = 1.5; x.strokeStyle = 'rgb(184 245 61 / 0.7)';
      for (const [y, t] of [[EYE, tr('ojos')], [MOUTH, tr('boca')]]) {
        x.beginPath(); x.moveTo(0.30 * S, y * S); x.lineTo(0.70 * S, y * S); x.stroke();
        x.fillStyle = 'rgb(184 245 61 / 0.85)'; x.font = '600 22px Barlow, sans-serif'; x.fillText(t, 0.72 * S, y * S + 6);
      }
      x.restore();
      if (this.mode !== 'edit' || this.live) return;
      x.save();
      this.pts.forEach((p, i) => {
        const on = i === this.sel || (this.symOn() && this.sel >= 0 && i === this.mirror(this.sel));
        x.lineWidth = 3; x.strokeStyle = '#0b1606'; x.fillStyle = on ? '#b8f53d' : '#e8f1ec';
        x.beginPath();
        if (p.c) x.rect(p.x * S - 9, p.y * S - 9, 18, 18); else x.arc(p.x * S, p.y * S, on ? 12 : 10, 0, Math.PI * 2);
        x.fill(); x.stroke();
      });
      x.restore();
    }

    // -------------------------------------------------------- Pixelado (estilo «pixel snapper»)
    masked(f) {
      let c = document.createElement('canvas'); c.width = c.height = 256;
      let x = c.getContext('2d');
      x.save(); this.path(x, 256); x.clip(); this.drawPhoto(x, f, 256 / S); x.restore();
      for (const size of [128, 64]) {
        const d = document.createElement('canvas'); d.width = d.height = size;
        const dx = d.getContext('2d'); dx.imageSmoothingEnabled = true; dx.imageSmoothingQuality = 'high';
        dx.drawImage(c, 0, 0, size, size); c = d;
      }
      return c.getContext('2d').getImageData(0, 0, N, N);
    }
    adjust(img) {
      const con = this.$('fe-contrast').value / 100, sat = this.$('fe-sat').value / 100, bri = this.$('fe-bri').value / 100, d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i] * bri, g = d[i + 1] * bri, b = d[i + 2] * bri;
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
        d[i] = (r - 128) * con + 128; d[i + 1] = (g - 128) * con + 128; d[i + 2] = (b - 128) * con + 128;
        d[i + 3] = d[i + 3] >= 128 ? 255 : 0;
      }
      return img;
    }
    palette(imgs, k) {
      const px = [];
      for (const im of imgs) for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) px.push([im.data[i], im.data[i + 1], im.data[i + 2]]);
      if (!px.length) return [];
      let seed = 1234567;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const dist = (a, b) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;
      const cents = [px[Math.floor(rnd() * px.length)].slice()], near = new Float64Array(px.length).fill(Infinity);
      while (cents.length < Math.min(k, px.length)) {
        let sum = 0; const last = cents[cents.length - 1];
        for (let i = 0; i < px.length; i++) { near[i] = Math.min(near[i], dist(px[i], last)); sum += near[i]; }
        let t = rnd() * sum, j = 0;
        for (; j < px.length - 1 && t > near[j]; j++) t -= near[j];
        cents.push(px[j].slice());
      }
      for (let it = 0; it < 10; it++) {
        const acc = cents.map(() => [0, 0, 0, 0]);
        for (const p of px) {
          let bi = 0, bd = Infinity;
          for (let c = 0; c < cents.length; c++) { const d = dist(p, cents[c]); if (d < bd) { bd = d; bi = c; } }
          const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++;
        }
        acc.forEach((a, c) => { if (a[3]) cents[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
      }
      return cents.map(c => c.map(Math.round));
    }
    toPixels(img, pal) {
      const d = img.data, idx = new Int16Array(N * N).fill(-1);
      const dist = (r, g, b, c) => 2 * (r - c[0]) ** 2 + 4 * (g - c[1]) ** 2 + 3 * (b - c[2]) ** 2;
      for (let p = 0; p < N * N; p++) {
        const i = p * 4;
        if (!d[i + 3]) continue;
        let bi = 0, bd = Infinity;
        for (let c = 0; c < pal.length; c++) { const v = dist(d[i], d[i + 1], d[i + 2], pal[c]); if (v < bd) { bd = v; bi = c; } }
        idx[p] = bi;
      }
      let out = idx;
      if (this.$('fe-clean').checked) {
        out = idx.slice();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const p = y * N + x, v = idx[p];
          if (v < 0) continue;
          const cnt = {}; let same = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            const w = idx[ny * N + nx];
            if (w < 0) continue;
            if (w === v) same++; else cnt[w] = (cnt[w] || 0) + 1;
          }
          if (!same) { let best = -1, bc = 0; for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; best = +k; } if (bc >= 4) out[p] = best; }
        }
      }
      const res = new ImageData(N, N), r = res.data;
      const dark = pal.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))[0] || [0, 0, 0];
      const ink = dark.map(v => Math.round(v * 0.45));
      const outline = this.$('fe-outline').checked;
      for (let p = 0; p < N * N; p++) {
        const i = p * 4, v = out[p];
        if (v >= 0) { const c = pal[v]; r[i] = c[0]; r[i + 1] = c[1]; r[i + 2] = c[2]; r[i + 3] = 255; continue; }
        if (!outline) continue;
        const y = Math.floor(p / N), x = p % N;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < N && ny < N && out[ny * N + nx] >= 0; })) { r[i] = ink[0]; r[i + 1] = ink[1]; r[i + 2] = ink[2]; r[i + 3] = 255; }
      }
      return res;
    }
    loadBase(face) {
      face.f.forEach((url, i) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = c.height = N;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0, N, N);
          this.base[i] = x.getImageData(0, 0, N, N);
          this.$('fe-st' + i).textContent = tr('Tu cara guardada');
          this.process();
        };
        im.src = url;
      });
    }
    process() {
      const photos = this.frames.map(f => (f.img ? this.adjust(this.masked(f)) : null));
      const withPhoto = photos.filter(Boolean);
      this.pal = withPhoto.length ? this.palette(withPhoto, +this.$('fe-colors').value) : [];
      this.gen = photos.map((im, i) => (im ? this.toPixels(im, this.pal) : this.base[i] ? new ImageData(new Uint8ClampedArray(this.base[i].data), N, N) : new ImageData(N, N)));
      this.compose();
    }
    /** Cara final = la generada + los retoques a mano. */
    compose() {
      this.final = this.gen.map((g, i) => {
        const im = new ImageData(new Uint8ClampedArray(g.data), N, N);
        for (const [p, c] of this.edits[i]) { const k = p * 4; im.data[k] = c[0]; im.data[k + 1] = c[1]; im.data[k + 2] = c[2]; im.data[k + 3] = c[3]; }
        return im;
      });
      this.final.forEach((im, i) => {
        const out = this.$('fe-out' + i); out.getContext('2d').putImageData(im, 0, 0);
        const th = this.$('fe-thumb' + i).getContext('2d'); th.clearRect(0, 0, 64, 64); th.drawImage(out, 0, 0);
      });
      this.$('fe-undo').disabled = !this.undo.length;
      if (this.step === 1) { this.renderPx(); this.renderPalette(); }
      this.drawTalk(false);
    }
    update(full) {
      this.dirty = this.dirty || full;
      if (this.raf2) return;
      this.raf2 = requestAnimationFrame(() => { this.raf2 = 0; if (!this.live) this.renderStage(); if (this.dirty) { this.dirty = false; this.process(); } });
    }

    // -------------------------------------------------------- Editor de píxeles
    fitZoom() { return Math.max(4, Math.floor((this.$('fe-pxwrap').clientWidth || 320) / N)); }
    setPxFrame(i) { this.pxFrame = i; this.root.querySelectorAll('[data-fe-px]').forEach(b => b.classList.toggle('on', +b.dataset.fePx === i)); this.renderPx(); }
    setTool(t) {
      this.tool = t;
      this.root.querySelectorAll('[data-fe-tool]').forEach(b => b.classList.toggle('on', b.dataset.feTool === t));
      this.$('fe-pxwrap').classList.toggle('hand', t === 'hand');
    }
    swatches() {
      const seen = new Set(), out = [];
      const add = c => { const k = c.slice(0, 3).join(); if (!seen.has(k)) { seen.add(k); out.push([c[0], c[1], c[2], 255]); } };
      this.pal.forEach(add);
      // Colores de la cara (si no hay foto nueva, salen de la cara guardada)
      if (!this.pal.length) for (const im of this.final || []) for (let i = 0; i < im.data.length && out.length < 32; i += 4) if (im.data[i + 3]) add([im.data[i], im.data[i + 1], im.data[i + 2]]);
      this.extra.forEach(add);
      return out;
    }
    renderPalette() {
      const sw = this.swatches(), cur = this.color.slice(0, 3).join();
      this.$('fe-pal').innerHTML = sw.map((c, i) => `<button type="button" class="fe-sw ${c.slice(0, 3).join() === cur && this.tool !== 'erase' ? 'on' : ''}" data-fe-sw="${i}" style="background:rgb(${c[0]} ${c[1]} ${c[2]})" aria-label="Color ${i + 1}"></button>`).join('');
    }
    renderPx() {
      if (!this.final) return;
      const z = this.zoom || this.fitZoom(), c = this.px;
      if (c.width !== N * z) { c.width = c.height = N * z; c.style.width = c.style.height = N * z + 'px'; }
      const x = c.getContext('2d'), d = this.final[this.pxFrame].data;
      x.clearRect(0, 0, c.width, c.height);
      for (let p = 0; p < N * N; p++) {
        const i = p * 4;
        if (!d[i + 3]) continue;
        x.fillStyle = `rgb(${d[i]} ${d[i + 1]} ${d[i + 2]})`;
        x.fillRect((p % N) * z, Math.floor(p / N) * z, z, z);
      }
      if (z >= 6) {
        x.strokeStyle = 'rgb(255 255 255 / 0.07)'; x.lineWidth = 1;
        x.beginPath();
        for (let k = 1; k < N; k++) { x.moveTo(k * z + 0.5, 0); x.lineTo(k * z + 0.5, N * z); x.moveTo(0, k * z + 0.5); x.lineTo(N * z, k * z + 0.5); }
        x.stroke();
      }
    }
    pushUndo() { this.undo.push(this.edits.map(m => new Map(m))); if (this.undo.length > 40) this.undo.shift(); this.$('fe-undo').disabled = false; }
    doUndo() { const e = this.undo.pop(); if (e) { this.edits = e; this.compose(); } }
    setPx(p, c) { const fr = this.both ? [0, 1] : [this.pxFrame]; for (const i of fr) this.edits[i].set(p, c); }
    paintAt(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
      const p = cy * N + cx;
      if (this.tool === 'pen') this.setPx(p, this.color.slice());
      else if (this.tool === 'erase') this.setPx(p, [0, 0, 0, 0]);
    }
    line(x0, y0, x1, y1) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.paintAt(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    fill(cx, cy) {
      const d = this.final[this.pxFrame].data, at = p => d.slice(p * 4, p * 4 + 4).join();
      const start = cy * N + cx, target = at(start);
      const seen = new Uint8Array(N * N), stack = [start];
      while (stack.length) {
        const p = stack.pop();
        if (seen[p] || at(p) !== target) continue;
        seen[p] = 1; this.setPx(p, this.color.slice());
        const x = p % N, y = Math.floor(p / N);
        if (x > 0) stack.push(p - 1); if (x < N - 1) stack.push(p + 1); if (y > 0) stack.push(p - N); if (y < N - 1) stack.push(p + N);
      }
    }
    bindPx() {
      const c = this.px;
      const cell = e => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * N), Math.floor((e.clientY - r.top) / r.height * N)]; };
      let last = null;
      c.addEventListener('pointerdown', e => {
        if (this.tool === 'hand') return;
        e.preventDefault();
        c.setPointerCapture(e.pointerId);
        const [x, y] = cell(e);
        if (this.tool === 'pick') {
          const d = this.final[this.pxFrame].data, i = (y * N + x) * 4;
          if (d[i + 3]) { this.color = [d[i], d[i + 1], d[i + 2], 255]; if (!this.swatches().some(s => s.slice(0, 3).join() === this.color.slice(0, 3).join())) this.extra.push(this.color.slice()); this.setTool('pen'); this.renderPalette(); }
          return;
        }
        this.pushUndo();
        if (this.tool === 'fill') { this.fill(x, y); this.compose(); return; }
        last = [x, y]; this.paintAt(x, y); this.compose();
      });
      c.addEventListener('pointermove', e => {
        if (!last) return;
        const [x, y] = cell(e);
        if (x === last[0] && y === last[1]) return;
        this.line(last[0], last[1], x, y); last = [x, y]; this.compose();
      });
      const end = () => { last = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    }

    // -------------------------------------------------------- Vista previa hablando
    drawTalk(open) {
      const c = this.$('fe-talkface');
      if (!c || !this.final) return;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
      x.putImageData(this.final[open ? 1 : 0], 0, 0);
    }
    talkLoop() {
      if (this.talking) return;
      this.talking = true;
      const lines = ['Siéntate. Vamos a hablar de tus minutos.', 'Confío en ti: el domingo sales de titular.', 'Si sigues así, el brazalete será tuyo.'].map(tr);
      let li = 0;
      const next = () => {
        if (!this.root.isConnected || this.step !== 1) { this.talking = false; return; }
        const el = this.$('fe-talktext');
        el.textContent = lines[li % lines.length]; li++;
        const fake = { f: null };
        void fake;
        if (reduced()) { setTimeout(next, 3500); return; }
        const text = el.textContent; let i = 0, open = false;
        const tick = () => {
          if (!this.root.isConnected || this.step !== 1) { this.talking = false; return; }
          i++; el.textContent = text.slice(0, i);
          const ch = text[i - 1] || '';
          open = /[aeiouáéíóú]/i.test(ch) ? true : /[\s.,:]/.test(ch) ? false : open;
          this.drawTalk(open);
          if (i < text.length) setTimeout(tick, /[.,:]/.test(ch) ? 170 : 40); else { this.drawTalk(false); setTimeout(next, 1600); }
        };
        tick();
      };
      next();
    }

    // -------------------------------------------------------- Guardar y cerrar
    hasFace() { return this.final && this.final.some(im => { for (let i = 3; i < im.data.length; i += 4) if (im.data[i]) return true; return false; }); }
    save() {
      if (!this.hasFace()) { this.msg(tr('Primero haz o sube al menos una foto.')); this.setStep(0); return; }
      const urls = this.final.map((im, i) => {
        // Si solo hay una cara, la otra es la misma (sin boca abierta)
        const src = im.data.some((v, k) => k % 4 === 3 && v) ? im : this.final[1 - i];
        const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(src, 0, 0);
        return c.toDataURL('image/png');
      });
      const face = { v: 1, g: this.g, f: urls };
      store(face);
      const cb = this.o.onSave;
      this.close();
      if (cb) cb(face);
    }
    close() {
      this.camOff();
      window.removeEventListener('paste', this.onPaste);
      this.root.remove();
      document.documentElement.classList.remove('fe-open');
      if (ed === this) ed = null;
      if (this.o.onClose) this.o.onClose();
    }
  }

  TL.Face = { open, stored, store, current, html, mount, say, draw, PRESETS };
})();
