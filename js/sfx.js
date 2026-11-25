/* TOUCHLINE — efectos de sonido sintetizados con Web Audio (sin archivos) */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  let ctx = null, master = null, crowd = null;

  function on() { try { return localStorage.getItem('touchline.sfx') !== '0'; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem('touchline.sfx', v ? '1' : '0'); } catch (e) { /* nada */ } if (!v) stopCrowd(); else preloadSamples(); }

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.55;
      // Limitador suave: aunque coincidan gol, ovación y cántico, nunca satura
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
      master.connect(lim); lim.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    return s;
  }

  function env(g, t, a, peak, d, end) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end || 0.0001, t + a + d);
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    const c = ac(); if (!c || !on()) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, 0.008, vol || 0.2, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function burst(dur, filterType, freq, vol, q, delay, attack) {
    const c = ac(); if (!c || !on()) return null;
    const t = c.currentTime + (delay || 0);
    const n = noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, attack || 0.005, vol, dur);
    n.connect(f).connect(g).connect(master);
    n.start(t); n.stop(t + dur + (attack || 0) + 0.1);
    return { f, g, t };
  }

  /** Desbloqueo del audio: en móvil solo vale un gesto "de verdad" (touchend/click). */
  let unlocked = false;
  function unlock() {
    const c = ac();
    if (!c) return;
    decodeAll();   // lo que ya se descargó, listo para sonar
    if (!unlocked) {
      // iOS: un búfer en silencio dentro del gesto deja el audio abierto
      try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* nada */ }
    }
    if (c.state === 'running') unlocked = true;
  }
  ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'].forEach(ev =>
    document.addEventListener(ev, () => { if (!unlocked) unlock(); }, { capture: true, passive: true }));

  /** Chasquido corto (el "clic" físico del botón). */
  function tick(vol, delay) { burst(0.014, 'highpass', 3800, vol || 0.16, 0.7, delay); }


  // ------------------------------------------------------------ Público: aplausos, silbidos, ovaciones y cánticos
  // Todo sintetizado (sin archivos): cientos de palmadas, silbidos de dedos y un coro de grada con reverberación.
  let clapBuf = null, revBuf = null, chantNow = null;
  const live = new Set(); // nodos del público que hay que poder parar al salir del partido
  function track(n, until) { live.add(n); setTimeout(() => live.delete(n), Math.max(0, (until - ctx.currentTime) * 1000) + 300); }
  function panner(v) { if (!ctx.createStereoPanner) return null; const p = ctx.createStereoPanner(); p.pan.value = v; return p; }

  /** Tres segundos de aplauso: cada palmada con su propio timbre (unas manos suenan graves, otras secas). */
  function clapBuffer() {
    if (clapBuf) return clapBuf;
    const sr = ctx.sampleRate, len = sr * 3, b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let k = 0; k < 300; k++) {
        const at = Math.floor(Math.random() * (len - 1200)), L = 260 + Math.floor(Math.random() * 520);
        const amp = 0.25 + Math.random() * 0.75, tone = 0.25 + Math.random() * 0.55;
        let lp = 0;
        for (let i = 0; i < L; i++) {
          const w = Math.random() * 2 - 1;
          lp += (w - lp) * tone;
          d[at + i] += (w - lp * 0.55) * amp * Math.exp(-i / (L * 0.2));
        }
      }
      let mx = 0;
      for (let i = 0; i < len; i++) mx = Math.max(mx, Math.abs(d[i]));
      for (let i = 0; i < len; i++) d[i] /= mx || 1;
    }
    return (clapBuf = b);
  }
  /** Reverberación de estadio (ruido que se apaga en ~2,4 s). */
  function reverb() {
    if (revBuf) return revBuf;
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.4), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * 0.6; }
    return (revBuf = b);
  }

  // Vocales del coro (formantes F1, F2)
  const VOWEL = { o: [470, 860], e: [560, 1750], a: [760, 1220], u: [340, 800] };
  // Cánticos propios y sencillos, de los de grada: [semitonos sobre la tónica, duración en pulsos]
  const CHANTS = {
    lolo: { vowel: 'o', bpm: 136, reps: 2, notes: [[0, .5], [0, .5], [4, .5], [2, .5], [0, 1], [-3, .5], [-1, .5], [0, 2]] },
    ohe: { vowel: 'o', bpm: 116, reps: 2, notes: [[7, 1], [5, .5], [4, .5], [2, 1], [4, 1], [0, 2]] },
    ale: { vowel: 'e', bpm: 144, reps: 2, notes: [[0, .5], [2, .5], [4, 1], [4, .5], [5, .5], [4, 1], [2, .5], [0, 1.5]] },
    uoh: { vowel: 'o', bpm: 100, reps: 1, notes: [[0, 1.5], [3, 1.5], [7, 3]] },
    clap: { claps: true, bpm: 128 }
  };

  function crowdClaps(t0, beat) {
    // «clap clap · clap clap clap» tres veces y un «¡eh!»
    const at = [0, 0.5, 1.5, 1.75, 2.0];
    let n = 0;
    for (let r = 0; r < 3; r++) for (const x of at) {
      const t = t0 + (r * 3 + x) * beat;
      for (let k = 0; k < 7; k++) { // muchas manos a la vez, nunca exactamente juntas
        const src = ctx.createBufferSource(); src.buffer = clapBuffer();
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 500 + Math.random() * 700;
        const g = ctx.createGain(), tt = t + Math.random() * 0.035;
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(1.6, tt + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.11);
        src.connect(f).connect(g).connect(master);
        src.start(tt, Math.random() * 2.8, 0.12); n++;
      }
    }
    return 9 * beat;
  }

  /** Un cántico de la grada. o: { away: afición visitante (más baja y a un lado), vol }. Devuelve los segundos que dura. */
  function chant(name, o) {
    const c = ac(); if (!c || !on()) return 0;
    o = o || {};
    if (!o.force && chantNow && chantNow > c.currentTime) return 0; // uno cada vez
    const C = CHANTS[name] || CHANTS.lolo, beat = 60 / C.bpm, t0 = c.currentTime + 0.05;
    if (C.claps) { const d = crowdClaps(t0, beat); chantNow = t0 + d; S.crowdSwell(0.6); setTimeout(() => chant('uoh', { vol: (o.vol || 0.5) * 0.8, force: true }), d * 1000 - 300); return d; }
    const root = (o.away ? 207 : 196) * Math.pow(2, (Math.random() - 0.5) * 2 / 12);
    const seq = [];
    let tt = 0;
    for (let r = 0; r < C.reps; r++) for (const [s2, d] of C.notes) { seq.push([tt, d * beat, s2]); tt += d * beat; }
    const total = tt, vol = (o.vol || 0.5) * (o.away ? 0.5 : 1);
    // voces → formantes de la vocal → (seco + reverberación) → panorama → volumen
    const [F1, F2] = VOWEL[C.vowel];
    const sum = c.createGain();
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = F1; f1.Q.value = 4.5;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = F2; f2.Q.value = 6;
    const g2 = c.createGain(); g2.gain.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(vol, t0 + 0.35);
    out.gain.setValueAtTime(vol, t0 + total - 0.25); out.gain.exponentialRampToValueAtTime(0.0001, t0 + total + 0.9);
    const rv = c.createConvolver(); rv.buffer = reverb();
    const wet = c.createGain(); wet.gain.value = 0.6;
    sum.connect(f1); sum.connect(f2); f2.connect(g2); f1.connect(lp); g2.connect(lp);
    lp.connect(out); lp.connect(rv); rv.connect(wet); wet.connect(out);
    const p = panner(o.away ? -0.7 : (Math.random() - 0.5) * 0.3);
    if (p) { out.connect(p); p.connect(master); } else out.connect(master);
    // la «l» de cada «lo»: el primer formante cae un instante al empezar la sílaba
    for (const [st] of seq) { f1.frequency.setValueAtTime(F1 * 0.55, t0 + st); f1.frequency.linearRampToValueAtTime(F1, t0 + st + 0.07); }
    const N = 14;
    for (let v = 0; v < N; v++) {
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      const oct = Math.random() < 0.18 ? 2 : 1, det = 1 + (Math.random() - 0.5) * 0.035, lag = Math.random() * 0.07;
      const vg = c.createGain(); vg.gain.value = 0;
      const vib = c.createOscillator(), vd = c.createGain();
      vib.frequency.value = 4.2 + Math.random() * 2.4; vd.gain.value = 2 + Math.random() * 5;
      vib.connect(vd).connect(osc.frequency);
      osc.frequency.setValueAtTime(root * oct * Math.pow(2, seq[0][2] / 12) * det, t0);
      const peak = (0.55 + Math.random() * 0.45) / N * 3.6;
      for (const [st, du, s2] of seq) {
        const a = t0 + st + lag;
        osc.frequency.setTargetAtTime(root * oct * Math.pow(2, s2 / 12) * det, a, 0.018);
        vg.gain.setTargetAtTime(0.0001, a - 0.01, 0.008);
        vg.gain.setTargetAtTime(peak, a + 0.03, 0.03);
        vg.gain.setTargetAtTime(peak * 0.7, a + du * 0.65, 0.08);
      }
      vg.gain.setTargetAtTime(0, t0 + total + lag, 0.2);
      osc.connect(vg).connect(sum);
      const end = t0 + total + 1.4;
      osc.start(t0); vib.start(t0); osc.stop(end); vib.stop(end);
      track(osc, end); track(vib, end);
    }
    chantNow = t0 + total + 0.6;
    return total;
  }

  /** Aplauso de `dur` segundos. */
  function applause(dur, vol, pan) {
    const c = ac(); if (!c || !on()) return;
    dur = dur || 2.5; vol = vol == null ? 0.5 : vol;
    const src = c.createBufferSource(); src.buffer = clapBuffer(); src.loop = true;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
    const g = c.createGain(), t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.22);
    g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = panner(pan || 0);
    src.connect(hp).connect(g);
    if (p) g.connect(p).connect(master); else g.connect(master);
    src.start(t, Math.random() * 2.5); src.stop(t + dur + 0.1);
    track(src, t + dur + 0.1);
  }
  /** Silbidos de dedos repartidos por la grada (fiuuu, fiu-fiuuu…). */
  function whistles(n, vol) {
    const c = ac(); if (!c || !on()) return;
    for (let k = 0; k < n; k++) {
      const t = c.currentTime + Math.random() * 1.6, dur = 0.35 + Math.random() * 0.65;
      const f = 2200 + Math.random() * 1300, kind = Math.random();
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = 'sine';
      if (kind < 0.4) { o.frequency.setValueAtTime(f * 0.8, t); o.frequency.exponentialRampToValueAtTime(f * 1.12, t + dur); }
      else if (kind < 0.75) { o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.16, t + dur * 0.3); o.frequency.exponentialRampToValueAtTime(f * 0.76, t + dur); }
      else { o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.92, t + dur); }
      lfo.frequency.value = 5 + Math.random() * 5; lg.gain.value = 20 + Math.random() * 45;
      lfo.connect(lg).connect(o.frequency);
      env(g, t, 0.03, (vol || 0.05) * (0.6 + Math.random() * 0.7), dur);
      const p = panner(Math.random() * 1.6 - 0.8);
      o.connect(g);
      if (p) g.connect(p).connect(master); else g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
      track(o, t + dur + 0.05);
    }
  }
  /** Ovación: rugido, aplauso largo y silbidos. k: intensidad (0,5 – 1,5). */
  function ovation(k) {
    const c = ac(); if (!c || !on()) return;
    k = k || 1;
    const r = burst(2.8 + k, 'bandpass', 760, 0.28 * k, 0.6, 0, 0.25);
    if (r) { r.f.frequency.setValueAtTime(520, r.t); r.f.frequency.linearRampToValueAtTime(1050, r.t + 0.9); }
    applause(3.2 + k * 1.8, Math.min(0.85, 0.5 * k));
    whistles(Math.round(5 + 5 * k), 0.06 * Math.min(1.3, k));
    S.crowdSwell(1);
  }
  function stopFans() {
    for (const n of live) { try { n.stop(); } catch (e) { /* ya parado */ } }
    live.clear(); chantNow = null;
  }


  // ------------------------------------------------------------ Efectos grabados (ElevenLabs u otros)
  // assets/sfx/<carpeta>/1.mp3, 2.mp3… (numerados seguidos, hasta 8). Si una carpeta tiene archivos, se usan
  // (al azar y sin repetir el último); si está vacía, suena el efecto sintetizado de siempre.
  // Se descargan al abrir la página (primero lo que suena en los menús). Si una carpeta tiene grabaciones que
  // aún no han llegado, el sonido las espera (hasta WAIT_MAX) en vez de tocar el sintetizado.
  // El volumen se nivela solo y cada carpeta tiene su peso en la mezcla (VOL).
  const SFX_DIR = 'assets/sfx/', MAXV = 8, WAIT_MAX = 3000;
  const VOL = {
    gol: 1, 'gol-rival': 0.7, ocasion: 0.75, palo: 0.8, parada: 0.75, chut: 0.55, red: 0.6, pitido: 0.55, 'pitido-final': 0.6,
    tarjeta: 0.6, abucheo: 0.7, lamento: 0.7, aplausos: 0.75, silbidos: 0.6, ovacion: 0.95, canticos: 0.7, ambiente: 0.35,
    boton: 0.35, atras: 0.35, seleccion: 0.3, exito: 0.55, error: 0.45, dinero: 0.55, nivel: 0.6, fichaje: 0.65, titulo: 1,
    'limit-break': 1, evento: 0.75, alma: 0.8, cortinilla: 0.6, 'cortinilla-voz': 0.8
  };
  // Lo que puede sonar en la portada y los menús va primero
  // Carpetas con archivos reservados: la cortinilla del partido usa solo la voz 1 y 2; la 3 y la 4 son para anuncios
  // (se piden con { only: [3, 4] })
  const ONLY = { 'cortinilla-voz': [1, 2] };
  const FIRST = ['aplausos', 'boton', 'seleccion', 'atras', 'exito', 'error', 'dinero', 'fichaje', 'nivel', 'evento', 'alma'];
  const banks = {};
  let samplesStarted = false;
  function rms(b) {
    const d = b.getChannelData(0), F = 1024;
    let sum = 0, n = 0;
    for (let i = 0; i + F <= d.length; i += F) { let e = 0; for (let k = i; k < i + F; k++) e += d[k] * d[k]; e /= F; if (e > 1e-4) { sum += e; n++; } }
    return n ? Math.sqrt(sum / n) : 0;
  }
  // st: 'new' (sin mirar) → 'probe' (pidiendo 1.mp3) → 'files' (hay grabaciones) o 'empty' (no hay: sintetizado)
  function bank(cat) { return banks[cat] || (banks[cat] = { cat, list: [], raw: [], last: -1, st: 'new', busy: 0, wait: [], probing: null, more: false }); }
  async function getFile(cat, k) {
    try { const r = await fetch(`${SFX_DIR}${cat}/${k}.mp3`); return r.ok ? await r.arrayBuffer() : null; } catch (e) { return null; }
  }
  /** El primer archivo de la carpeta: dice si hay grabaciones y ya deja una lista para sonar. */
  function probe(B) {
    if (B.st !== 'new') return B.probing || Promise.resolve();
    if (!window.fetch) { B.st = 'empty'; settle(B); return Promise.resolve(); }
    B.st = 'probe';
    return (B.probing = getFile(B.cat, 1).then(ab => {
      if (!ab) { B.st = 'empty'; settle(B); return; }
      B.st = 'files'; B.raw.push({ ab, n: 1 }); decode(B);
    }));
  }
  /** Las demás variantes (2.mp3, 3.mp3…), con calma. */
  async function more(B) {
    if (B.st !== 'files' || B.more) return;
    B.more = true;
    for (let k = 2; k <= MAXV; k++) { const ab = await getFile(B.cat, k); if (!ab) break; B.raw.push({ ab, n: k }); decode(B); }
  }
  /** Decodifica lo descargado (hace falta el contexto de audio, que se crea con el primer toque). */
  function decode(B) {
    if (!ctx) return;
    while (B.raw.length) {
      const { ab, n } = B.raw.shift();
      B.busy++;
      const done = b => {
        B.busy--;
        if (b) { const v = rms(b); B.list.push({ b, n, gain: v ? Math.max(0.3, Math.min(5, 0.16 / v)) : 1 }); }
        else if (!B.list.length && !B.raw.length && !B.busy) B.st = 'empty';   // ninguno se pudo leer
        settle(B);
      };
      try { const pr = ctx.decodeAudioData(ab, done, () => done(null)); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { done(null); }
    }
  }
  function decodeAll() { for (const k in banks) decode(banks[k]); }
  /** Los sonidos que esperaban a esta carpeta: suenan ahora (o el sintetizado, si al final no había archivos). */
  function settle(B) {
    if (!B.wait.length) return;
    if (!B.list.length && B.st !== 'empty') return;
    const now = Date.now(), w = B.wait.splice(0);
    for (const x of w) {
      if (now - x.t > x.max || !on()) continue;      // ha llegado tarde: mejor no sonar que sonar a destiempo
      if (pool(B, x.o).length) playNow(B, x.o); else if (x.synth) x.synth();
    }
  }
  /** Descarga todas las carpetas: primero mira cuáles tienen archivos (de 6 en 6) y luego las variantes. */
  function preloadSamples() {
    if (samplesStarted || !on()) return;
    samplesStarted = true;
    const cats = FIRST.concat(Object.keys(VOL).filter(k => !FIRST.includes(k)));
    let i = 0;
    const worker = async () => { while (i < cats.length) await probe(bank(cats[i++])); };
    Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(async () => { for (const k of cats) await more(bank(k)); });
  }
  /** Las grabaciones que valen para esta llamada (todas, o solo los números de `o.only` / los de ONLY). */
  function pool(B, o) {
    const only = o.only || ONLY[B.cat];
    return only ? B.list.filter(x => only.includes(x.n)) : B.list;
  }
  function playNow(B, o) {
    const c = ctx, L = pool(B, o);
    if (!L.length) return 0;
    let k = Math.floor(Math.random() * L.length);
    if (L.length > 1 && L[k] === B.last) k = (k + 1) % L.length;
    B.last = L[k];
    const it = L[k], src = c.createBufferSource(), g = c.createGain(), t = c.currentTime + (o.delay || 0);
    src.buffer = it.b;
    src.playbackRate.value = o.rate || (0.97 + Math.random() * 0.06);   // que ni el mismo archivo suene idéntico
    g.gain.value = it.gain * (VOL[B.cat] || 0.6) * (o.vol == null ? 1 : o.vol);
    const p = o.pan ? panner(o.pan) : null;
    src.connect(g);
    if (p) g.connect(p).connect(master); else g.connect(master);
    if (o.loop) src.loop = true;
    src.start(t);
    track(src, o.loop ? t + 3600 : t + it.b.duration + 0.2);
    if (o.onStart) o.onStart(src, it.b.duration);
    return o.loop ? src : it.b.duration;
  }
  /**
   * Suena un efecto grabado de la carpeta `cat`. Devuelve los segundos que dura (o la fuente, en bucle);
   * 0 si la carpeta está vacía (toca tú el sintetizado); -1 si hay grabaciones que aún no han llegado:
   * sonarán en cuanto lleguen, y si al final no había ninguna, suena `synth`.
   * o: { vol, pan, rate, delay, loop, onStart(src, segundos), maxWait (ms) }
   */
  function sample(cat, o, synth) {
    const c = ac(); if (!c || !on()) return 0;
    o = o || {};
    const B = bank(cat);
    decode(B);
    if (pool(B, o).length) return playNow(B, o);
    if (B.st === 'empty') return 0;
    preloadSamples();
    probe(B);
    if (B.wait.length < 3) B.wait.push({ o, synth, t: Date.now(), max: o.maxWait || WAIT_MAX });
    return -1;
  }
  /** Grabación si la hay; si no, el sintetizado (`synth`), también cuando la carpeta resulta estar vacía. */
  function rec(cat, synth, o) { return sample(cat, o, synth) || (synth ? (synth(), 0) : 0); }

  const S = {
    on, setOn, unlock, ac, applause, whistles, ovation, chant, CHANTS, sample, rec, preloadSamples, VOL,
    // Botones: cada tipo suena distinto, agudos y cortos para que se oigan en el altavoz del móvil
    click() { tone(1180, 0.05, 'triangle', 0.2, 640); tick(0.14); },
    press() { tone(560, 0.09, 'sine', 0.3, 280); tone(1480, 0.07, 'triangle', 0.09, 1960, 0.03); tick(0.18); },
    select() { tone(1560, 0.035, 'square', 0.06, 1320); tick(0.1); },
    back() { tone(820, 0.07, 'triangle', 0.17, 420); },
    toggle(onState) { tone(onState ? 900 : 640, 0.04, 'square', 0.06, onState ? 1300 : 420); tick(0.12); },
    tab() { tone(640, 0.07, 'sine', 0.16, 1180); tick(0.08); },
    error() { tone(150, 0.16, 'square', 0.06); tone(120, 0.18, 'square', 0.05, null, 0.09); },
    success() { tone(660, 0.1, 'triangle', 0.12); tone(990, 0.16, 'triangle', 0.12, null, 0.09); },
    coin() { tone(988, 0.08, 'square', 0.07); tone(1319, 0.22, 'square', 0.07, null, 0.07); },
    levelUp() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, null, i * 0.09)); tone(1047, 0.5, 'triangle', 0.1, null, 0.36); },
    // Eventos del día a día: golpe seco con un silbido que sube (el «¡bum!»)
    boom() { tone(120, 0.32, 'sine', 0.42, 42); burst(0.25, 'lowpass', 900, 0.22, 0.8); tone(420, 0.18, 'triangle', 0.06, 1260, 0.05); },
    // Limit break (si no hay assets/sfx/limit-break): subida de energía, estallido y brillo
    limitBreak() {
      const c = ac(); if (!c || !on()) return;
      const r = burst(1.5, 'bandpass', 300, 0.22, 6, 0, 1.3);
      if (r) r.f.frequency.exponentialRampToValueAtTime(5200, r.t + 1.5);
      tone(110, 1.5, 'sawtooth', 0.05, 880);
      tone(55, 1.2, 'sine', 0.3, 30, 1.6);
      burst(0.9, 'lowpass', 1400, 0.5, 0.7, 1.6);
      tone(1760, 0.08, 'square', 0.05, null, 1.62);
      [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.5, 'triangle', 0.07, null, 1.75 + i * 0.08));
      tone(2349, 1.4, 'sine', 0.05, 2400, 2.2);
    },
    // Equipar un alma: un acorde que flota
    soul() { [392, 494, 587, 740].forEach((f, i) => tone(f, 0.9, 'sine', 0.06, f * 1.01, i * 0.07)); burst(0.8, 'highpass', 5000, 0.04, 0.5, 0.05, 0.3); },
    whistle(long) {
      const c = ac(); if (!c || !on()) return;
      const reps = long ? 3 : 1;
      for (let k = 0; k < reps; k++) {
        const t = c.currentTime + k * 0.32;
        const dur = long && k === reps - 1 ? 0.7 : 0.22;
        const o = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = 2900; o2.type = 'sine'; o2.frequency.value = 3350;
        lfo.frequency.value = 38; lg.gain.value = 180;
        lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
        env(g, t, 0.01, 0.07, dur);
        o.connect(g); o2.connect(g); g.connect(master);
        [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
      }
    },
    /**
     * Voz tipo "Animal Crossing": un pitido muy corto por letra. El tono depende
     * de la letra (la misma palabra suena siempre igual) y del ánimo del personaje.
     * o: { pitch: Hz base, mood: semitonos extra, rate: duración relativa }
     */
    voice(ch, o) {
      const c = ac(); if (!c || !on() || !ch || !/[\p{L}\d]/u.test(ch)) return;
      o = o || {};
      const t = c.currentTime;
      const l = ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const vowel = 'aeiou'.includes(l);
      const k = (l.charCodeAt(0) * 37) % 11;                 // 0..10 según la letra
      const semis = (vowel ? 3 : 0) + (k - 5) * 0.8 + (o.mood || 0) + (Math.random() - 0.5) * 0.6;
      const f = (o.pitch || 760) * Math.pow(2, semis / 12);
      const dur = (vowel ? 0.055 : 0.032) * (o.rate || 1);
      const osc = c.createOscillator(), osc2 = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (vowel ? 0.9 : 1.12), t + dur);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(f * 2.01, t);
      bp.type = 'bandpass';
      bp.frequency.value = vowel ? 1250 + k * 60 : 2300 + k * 90; // "formante" distinto para vocales/consonantes
      bp.Q.value = 1.4;
      env(g, t, 0.003, vowel ? 0.09 : 0.06, dur);
      osc.connect(bp); osc2.connect(bp); bp.connect(g); g.connect(master);
      osc.start(t); osc2.start(t); osc.stop(t + dur + 0.03); osc2.stop(t + dur + 0.03);
    },
    swoosh() { const r = burst(0.45, 'bandpass', 900, 0.14, 0.45); if (r) r.f.frequency.linearRampToValueAtTime(4200, r.t + 0.35); tone(320, 0.12, 'triangle', 0.05, 880, 0.18); },
    kick() { burst(0.07, 'lowpass', 260, 0.35, 0.7); tone(110, 0.08, 'sine', 0.2, 60); },
    net() { burst(0.25, 'bandpass', 1800, 0.12, 0.6); },
    post() { tone(1850, 0.35, 'triangle', 0.16, 1700); tone(2770, 0.25, 'sine', 0.08); burst(0.03, 'highpass', 5000, 0.2); },
    card() { burst(0.05, 'highpass', 3000, 0.2); S.whistle(false); },
    goal(mine) {
      const c = ac(); if (!c || !on()) return;
      const r = burst(2.6, 'bandpass', 700, mine ? 0.55 : 0.3, 0.6, 0, 0.35);
      if (r) { r.f.frequency.setValueAtTime(500, r.t); r.f.frequency.linearRampToValueAtTime(1100, r.t + 0.8); }
      if (mine) [262, 330, 392].forEach((f, i) => tone(f, 1.1, 'sawtooth', 0.04, null, 0.05 + i * 0.01));
      S.crowdSwell(1);
      if (mine) { applause(4.5, 0.7); whistles(10, 0.075); }
      else applause(2.2, 0.22, -0.6);
    },
    groan() {
      const r = burst(1.0, 'bandpass', 420, 0.22, 0.8, 0, 0.12);
      if (r) r.f.frequency.linearRampToValueAtTime(260, r.t + 0.9);
    },
    chance() { const r = burst(0.7, 'bandpass', 600, 0.16, 0.7, 0, 0.15); if (r) r.f.frequency.linearRampToValueAtTime(900, r.t + 0.5); },
    boo() { const r = burst(1.2, 'lowpass', 380, 0.22, 1.2, 0, 0.2); if (r) r.f.frequency.linearRampToValueAtTime(220, r.t + 1); },

    startCrowd() {
      const c = ac(); if (!c || !on() || crowd) return;
      const n = noise(); n.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 1.5);
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.13; lg.gain.value = 0.015; lfo.connect(lg).connect(g.gain);
      n.connect(f).connect(g).connect(master);
      n.start(); lfo.start();
      crowd = { n, g, lfo };
    },
    crowdSwell(k) {
      if (!crowd || !ctx) return;
      const t = ctx.currentTime;
      crowd.g.gain.cancelScheduledValues(t);
      crowd.g.gain.setValueAtTime(Math.max(0.02, crowd.g.gain.value), t);
      crowd.g.gain.linearRampToValueAtTime(0.06 + 0.12 * (k || 0.5), t + 0.3);
      crowd.g.gain.linearRampToValueAtTime(0.06, t + 2.5);
    }
  };
  function stopCrowd() {
    stopFans();
    if (!crowd || !ctx) return;
    const c = crowd; crowd = null;
    const t = ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(Math.max(0.0001, c.g.gain.value), t);
    c.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => { try { c.n.stop(); c.lfo.stop(); } catch (e) { /* nada */ } }, 900);
  }
  S.stopCrowd = stopCrowd;

  // Qué carpeta usa cada efecto (si devuelve null, siempre sintetizado)
  const USE = {
    goal: mine => (mine ? 'gol' : 'gol-rival'), chance: () => 'ocasion', post: () => 'palo', kick: () => 'chut', net: () => 'red',
    whistle: long => (long ? 'pitido-final' : 'pitido'), card: () => 'tarjeta', boo: () => 'abucheo', groan: () => 'lamento',
    ovation: () => 'ovacion', success: () => 'exito', error: () => 'error', coin: () => 'dinero', levelUp: () => 'nivel',
    click: () => 'boton', press: () => 'boton', back: () => 'atras', select: () => 'seleccion', save: () => 'parada', signing: () => 'fichaje', title: () => 'titulo'
  };
  // Efectos nuevos que antes no tenían sonido propio (sintetizado de reserva)
  S.save = () => applause(1.6, 0.3);
  S.signing = () => { S.success(); setTimeout(() => S.coin(), 200); };
  S.title = () => ovation(1.5);
  for (const name in USE) {
    const synth = S[name];
    S[name] = function (...args) {
      if (!on()) return;
      const fb = () => synth.apply(S, args);
      // El gol propio grabado va con ovación de fondo (aplausos y silbidos sintetizados encima)
      const o = name === 'goal' && args[0] ? { onStart: (src, d) => { applause(Math.min(5, d + 1), 0.4); whistles(6, 0.05); S.crowdSwell(1); } } : null;
      if (!sample(USE[name](...args), o, fb)) return fb();
    };
  }
  // Aplausos, silbidos y cánticos: también pueden ser grabaciones
  const synthApplause = S.applause, synthWhistles = S.whistles, synthChant = S.chant;
  S.applause = (dur, vol, pan) => rec('aplausos', () => synthApplause(dur, vol, pan), { vol: vol == null ? 1 : Math.min(1.2, vol * 1.6), pan });
  S.whistles = (n, vol) => rec('silbidos', () => synthWhistles(n, vol), { vol: Math.min(1.2, (n || 4) / 6) });
  S.chant = (name, o) => {
    o = o || {};
    const c = ac();
    if (!o.force && chantNow && c && chantNow > c.currentTime) return 0;
    const d = sample('canticos', { vol: o.away ? 0.5 : 1, pan: o.away ? -0.7 : 0, onStart: (src, dur) => { chantNow = ctx.currentTime + dur; } }, () => synthChant(name, o));
    if (d === -1) { chantNow = c.currentTime + 4; return 4; }   // la grabación está llegando
    if (d) return d;
    return synthChant(name, o);
  };
  // Ambiente de grada grabado (en bucle) en lugar del ruido, si existe
  const synthStart = S.startCrowd;
  let bedLoop = null, bedTok = 0;
  S.startCrowd = () => {
    preloadSamples();
    synthStart();
    const tok = ++bedTok;
    sample('ambiente', { loop: true, onStart: src => {
      if (tok !== bedTok || !crowd) { try { src.stop(); } catch (e) { /* nada */ } return; }   // ya se paró la grada
      bedLoop = src; crowd.g.gain.cancelScheduledValues(ctx.currentTime); crowd.g.gain.setValueAtTime(0.02, ctx.currentTime);
    } });
  };
  const synthStop = S.stopCrowd;
  S.stopCrowd = () => { bedTok++; if (bedLoop) { try { bedLoop.stop(); } catch (e) { /* nada */ } bedLoop = null; } synthStop(); };

  // ------------------------------------------------------------ Habla por sílabas (estilo «animalés»)
  // assets/mentor/voz-silabas.mp3: todas las sílabas del español grabadas por la voz del Profe, una tras otra;
  // voz-silabas.json: dónde empieza y cuánto dura cada una. El texto se pasa a sílabas «fonéticas» y cada sílaba
  // suena muy corta y un poco más aguda mientras se escribe.
  const BAB = { st: 'new', buf: null, idx: null, max: 5, src: null };
  function babLoad() {
    if (BAB.st !== 'new' || !window.fetch) return;
    BAB.st = 'loading';
    Promise.all([fetch('assets/mentor/voz-silabas.json').then(r => r.ok ? r.json() : null), fetch('assets/mentor/voz-silabas.mp3').then(r => r.ok ? r.arrayBuffer() : null)])
      .then(([idx, ab]) => {
        if (!idx || !ab) { BAB.st = 'none'; return; }
        BAB.idx = idx;
        const c = ac(); if (!c) { BAB.st = 'new'; return; }   // sin audio todavía: se reintenta la próxima vez
        c.decodeAudioData(ab, b => { BAB.buf = b; BAB.st = 'ready'; }, () => { BAB.st = 'none'; });
      }).catch(() => { BAB.st = 'none'; });
  }
  /** Texto (lista de caracteres) → sílabas [{ at: índice del carácter donde empieza, k: clave }] */
  function babPlan(chars) {
    if (!BAB.idx) return [];
    const out = [], src = [], ph = [];
    const low = chars.map(c => (c || '').toLowerCase());
    // Fonética sencilla del español: c/qu → k, v → b, h muda, g+e/i → j, gu+e/i → g, z+e/i → c, x → ks, y final → i, w → u
    for (let i = 0; i < low.length; i++) {
      let c = low[i].normalize('NFD').replace(/[̀-̇̉-ͯ]/g, '').normalize('NFC');
      const n = (low[i + 1] || '').normalize('NFD').replace(/[̀-ͯ]/g, ''), n2 = (low[i + 2] || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!/[a-zñü]/.test(c)) { ph.push(' '); src.push(i); continue; }
      if (c === 'h' && low[i - 1] !== 'c') continue;
      if (c === 'c' && n === 'h') { ph.push('c', 'h'); src.push(i, i); i++; continue; }
      if (c === 'q' && n === 'u') { ph.push('k'); src.push(i); i++; continue; }
      if (c === 'c') { ph.push('ei'.includes(n) ? 'c' : 'k'); src.push(i); continue; }
      if (c === 'z') { ph.push('ei'.includes(n) ? 'c' : 'z'); src.push(i); continue; }
      if (c === 'g' && 'ei'.includes(n)) { ph.push('j'); src.push(i); continue; }
      if (c === 'g' && n === 'u' && 'ei'.includes(n2)) { ph.push('g', 'u'); src.push(i, i); i++; continue; }
      if (c === 'v') c = 'b'; else if (c === 'w') c = 'u'; else if (c === 'k') c = 'k';
      if (c === 'x') { ph.push('k', 's'); src.push(i, i); continue; }
      if (c === 'y' && !/[a-zñ]/.test(n)) c = 'i';
      ph.push(c); src.push(i);
    }
    const s = ph.join('');
    for (let p = 0; p < s.length;) {
      if (s[p] === ' ') { p++; continue; }
      let hit = null;
      for (let L = Math.min(BAB.max, s.length - p); L > 0 && !hit; L--) { const k = s.substr(p, L); if (BAB.idx[k]) hit = k; }
      if (hit) { out.push({ at: src[p], k: hit }); p += hit.length; } else p++;   // consonante suelta: se la come
    }
    return out;
  }
  function babPlay(k, o) {
    const c = ac(); if (!c || !on() || BAB.st !== 'ready' || !BAB.idx[k]) return false;
    o = o || {};
    const [t0, d] = BAB.idx[k], t = c.currentTime;
    const rate = (o.rate || 1.32) * Math.pow(2, ((o.mood || 0) + (Math.random() - 0.5) * 1.2) / 12);
    const len = Math.min(d, 0.2) / rate * 1.05;
    if (BAB.src) { try { BAB.src.g.gain.setTargetAtTime(0, t, 0.012); BAB.src.s.stop(t + 0.05); } catch (e) { /* ya paró */ } }
    const sn = c.createBufferSource(), g = c.createGain();
    sn.buffer = BAB.buf; sn.playbackRate.value = rate;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || 0.55, t + 0.008); g.gain.setTargetAtTime(0, t + len * 0.75, 0.02);
    sn.connect(g); g.connect(master);
    sn.start(t, t0 + 0.01, len + 0.06);
    BAB.src = { s: sn, g };
    return true;
  }
  /**
   * Modo «natural»: la frase entera programada de una vez, sílabas a su duración real, encadenadas con un fundido
   * corto, pausas entre palabras y en la puntuación, acento en la penúltima sílaba de cada palabra y entonación
   * (la frase baja hacia el final; las preguntas suben). Devuelve cuánto dura.
   */
  const NAT = { srcs: [] };
  function babStop() { const c = ac(); if (!c) return; const t = c.currentTime; NAT.srcs.forEach(x => { try { x.g.gain.cancelScheduledValues(t); x.g.gain.setTargetAtTime(0, t, 0.02); x.s.stop(t + 0.1); } catch (e) { /* nada */ } }); NAT.srcs = []; }
  function babSpeak(chars, o) {
    const c = ac(); if (!c || !on() || BAB.st !== 'ready') return 0;
    o = o || {};
    babStop();
    const plan = babPlan(chars), txt = chars.join('');
    if (!plan.length) return 0;
    // Palabras: grupos de sílabas separados por espacios o puntuación (para el acento y las pausas)
    const gapAfter = i => { const a = plan[i].at, b = i + 1 < plan.length ? plan[i + 1].at : txt.length; const mid = txt.slice(a + plan[i].k.length - 1, b); return /[.!?…]/.test(mid) ? 0.32 : /[,;:]/.test(mid) ? 0.18 : /\s/.test(mid) ? 0.035 : 0; };
    const word = []; let w = 0; plan.forEach((p, i) => { word.push(w); if (gapAfter(i) > 0) w++; });
    const question = /\?\s*$/.test(txt.trim()) || /^\s*¿/.test(txt);
    let t = c.currentTime + 0.03; const N = plan.length, base = (o.rate || 1) * Math.pow(2, (o.mood || 0) / 24);
    for (let i = 0; i < N; i++) {
      const p = plan[i], [t0, d] = BAB.idx[p.k];
      const sameW = plan.map((_, j) => j).filter(j => word[j] === word[i]), pos = sameW.indexOf(i), stress = sameW.length > 1 ? pos === sameW.length - 2 : true;
      const prog = i / Math.max(1, N - 1);
      let pitch = base * (1.04 - prog * 0.08) * (stress ? 1.03 : 0.99) * (1 + (Math.random() - 0.5) * 0.03);
      if (question && prog > 0.75) pitch *= 1 + (prog - 0.75) * 0.5;
      const len = Math.max(0.07, (d - 0.05) * (stress ? 0.92 : 0.72)) / pitch;   // sílabas átonas más cortas, como al hablar deprisa
      const sn = c.createBufferSource(), g = c.createGain(), vol = (o.vol || 0.6) * (stress ? 1 : 0.78);
      sn.buffer = BAB.buf; sn.playbackRate.value = pitch;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + len - 0.03); g.gain.linearRampToValueAtTime(0, t + len + 0.015);
      sn.connect(g); g.connect(master);
      sn.start(t, t0 + 0.012, len + 0.03); sn.stop(t + len + 0.05);
      NAT.srcs.push({ s: sn, g });
      t += len - 0.025 + gapAfter(i);   // se solapan un poco (como el habla encadenada) y paran en la puntuación
    }
    return t - c.currentTime;
  }
  /**
   * Voces de personaje (animalés): cada persona tiene su tono fijo según quién es.
   * who: 'me' (tú: grave), { pid, fem } (jugador o jugadora), { seed, fem } (fisio, periodista…)
   */
  function voiceOf(who) {
    if (who === 'me') return { rate: 1.02, vol: 0.5 };
    const seed = (((who && (who.pid != null ? who.pid : who.seed)) || 7) * 0.6180339) % 1;
    return who && who.fem ? { rate: 1.62 + seed * 0.2, vol: 0.5 } : { rate: 1.2 + seed * 0.16, vol: 0.52 };
  }
  /** Para hablar a la vez que se escribe: devuelve una función que se llama con cada carácter nuevo (índice). */
  function babTyper(text, who) {
    babLoad();
    const v = voiceOf(who); let plan = null, k = 0;
    return i => {
      if (BAB.st !== 'ready') return;
      if (!plan) plan = babPlan([...text]);
      while (k < plan.length && plan[k].at < i) k++;
      if (plan[k] && plan[k].at === i) { babPlay(plan[k].k, v); k++; }
    };
  }
  /** Dice una frase entera (sin texto que se escriba): sílaba a sílaba a ritmo de animalés. */
  function babTalk(text, who, delay) {
    babLoad();
    let tries = 0;
    const go = () => {
      // La primera vez la voz aún se está descargando: se espera (hasta ~6 s) en vez de quedarse mudo
      if (BAB.st !== 'ready') { if ((BAB.st === 'loading' || BAB.st === 'new') && tries++ < 30) setTimeout(go, 200); return; }
      const v = voiceOf(who), plan = babPlan([...text]);
      plan.slice(0, 40).forEach((p, j) => setTimeout(() => babPlay(p.k, v), j * 95 + (/[.,!?]/.test(text[p.at - 1] || '') ? 120 : 0)));
    };
    setTimeout(go, delay || 0);
  }
  S.babble = { load: babLoad, ready: () => BAB.st === 'ready', plan: babPlan, play: babPlay, speak: babSpeak, stop: babStop, voiceOf, typer: babTyper, talk: babTalk };

  // Cuando suena la grada (aplausos, pitos, ovación, cánticos, abucheos, lamentos), el campo lo sabe para que
  // los puntitos del público se muevan a la vez: TL.SFX.crowd = { kind, at }
  ['applause', 'whistles', 'ovation', 'chant', 'boo', 'groan', 'goal', 'chance', 'crowdSwell'].forEach(k => {
    const f = S[k]; if (typeof f !== 'function') return;
    S[k] = function () { S.crowd = { kind: k, at: performance.now() }; return f.apply(this, arguments); };
  });
  const rec0 = S.rec;
  const CROWD = { aplausos: 'applause', silbidos: 'whistles', ovacion: 'ovation', canticos: 'chant', abucheo: 'boo', lamento: 'groan', gol: 'goal', 'gol-rival': 'goal', ocasion: 'chance', parada: 'applause' };
  S.rec = function (cat) { if (CROWD[cat]) S.crowd = { kind: CROWD[cat], at: performance.now() }; return rec0.apply(this, arguments); };
  TL.SFX = S;
  // Los efectos grabados se empiezan a descargar al abrir la página, no al primer sonido
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preloadSamples, { once: true });
  else preloadSamples();
})();
