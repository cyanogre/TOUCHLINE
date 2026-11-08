/* TOUCHLINE — efectos de sonido sintetizados con Web Audio (sin archivos) */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  let ctx = null, master = null, crowd = null;

  function on() { try { return localStorage.getItem('touchline.sfx') !== '0'; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem('touchline.sfx', v ? '1' : '0'); } catch (e) { /* nada */ } if (!v) stopCrowd(); }

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
  // El volumen se nivela solo y cada carpeta tiene su peso en la mezcla (VOL).
  const SFX_DIR = 'assets/sfx/', MAXV = 8;
  const VOL = {
    gol: 1, 'gol-rival': 0.7, ocasion: 0.75, palo: 0.8, parada: 0.75, chut: 0.55, red: 0.6, pitido: 0.55, 'pitido-final': 0.6,
    tarjeta: 0.6, abucheo: 0.7, lamento: 0.7, aplausos: 0.75, silbidos: 0.6, ovacion: 0.95, canticos: 0.7, ambiente: 0.35,
    boton: 0.35, atras: 0.35, seleccion: 0.3, exito: 0.55, error: 0.45, dinero: 0.55, nivel: 0.6, fichaje: 0.65, titulo: 1,
    'limit-break': 1, evento: 0.75, alma: 0.8
  };
  const banks = {};
  let samplesStarted = false;
  function rms(b) {
    const d = b.getChannelData(0), F = 1024;
    let sum = 0, n = 0;
    for (let i = 0; i + F <= d.length; i += F) { let e = 0; for (let k = i; k < i + F; k++) e += d[k] * d[k]; e /= F; if (e > 1e-4) { sum += e; n++; } }
    return n ? Math.sqrt(sum / n) : 0;
  }
  function loadBank(cat) {
    if (banks[cat]) return banks[cat].ready;
    const B = banks[cat] = { list: [], last: -1, ready: null };
    const c = ac();
    if (!c || !window.fetch) { B.ready = Promise.resolve(B); return B.ready; }
    B.ready = (async () => {
      for (let k = 1; k <= MAXV; k++) {
        try {
          const r = await fetch(`${SFX_DIR}${cat}/${k}.mp3`);
          if (!r.ok) break;                      // numerados seguidos: el primero que falta cierra la carpeta
          const ab = await r.arrayBuffer();
          const b = await new Promise((res, rej) => c.decodeAudioData(ab, res, rej));
          const v = rms(b);
          B.list.push({ b, gain: v ? Math.max(0.3, Math.min(5, 0.16 / v)) : 1 });
        } catch (e) { break; }
      }
      return B;
    })();
    return B.ready;
  }
  /** Carga en segundo plano todas las carpetas (una petición por carpeta vacía). */
  function preloadSamples() {
    if (samplesStarted) return;
    samplesStarted = true;
    const cats = Object.keys(VOL);
    const next = () => { const k = cats.shift(); if (k) loadBank(k).then(() => setTimeout(next, 60)); };
    setTimeout(next, 800);
  }
  /** Suena un efecto grabado de la carpeta `cat`. Devuelve los segundos que dura, o 0 si no hay. */
  function sample(cat, o) {
    const c = ac(); if (!c || !on()) return 0;
    o = o || {};
    const B = banks[cat];
    if (!B) { loadBank(cat); return 0; }
    if (!B.list.length) return 0;
    let k = Math.floor(Math.random() * B.list.length);
    if (B.list.length > 1 && k === B.last) k = (k + 1) % B.list.length;
    B.last = k;
    const it = B.list[k], src = c.createBufferSource(), g = c.createGain(), t = c.currentTime + (o.delay || 0);
    src.buffer = it.b;
    src.playbackRate.value = o.rate || (0.97 + Math.random() * 0.06);   // que ni el mismo archivo suene idéntico
    g.gain.value = it.gain * (VOL[cat] || 0.6) * (o.vol == null ? 1 : o.vol);
    const p = o.pan ? panner(o.pan) : null;
    src.connect(g);
    if (p) g.connect(p).connect(master); else g.connect(master);
    if (o.loop) src.loop = true;
    src.start(t);
    track(src, o.loop ? t + 3600 : t + it.b.duration + 0.2);
    return o.loop ? src : it.b.duration;
  }

  const S = {
    on, setOn, unlock, ac, applause, whistles, ovation, chant, CHANTS, sample, preloadSamples, VOL,
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
      preloadSamples();
      const d = sample(USE[name](...args));
      // El gol propio grabado va con ovación de fondo (aplausos y silbidos sintetizados encima)
      if (d && name === 'goal' && args[0]) { applause(Math.min(5, d + 1), 0.4); whistles(6, 0.05); S.crowdSwell(1); }
      if (!d) return synth.apply(S, args);
    };
  }
  // Aplausos, silbidos y cánticos: también pueden ser grabaciones
  const synthApplause = S.applause, synthWhistles = S.whistles, synthChant = S.chant;
  S.applause = (dur, vol, pan) => (sample('aplausos', { vol: vol == null ? 1 : Math.min(1.2, vol * 1.6), pan }) || synthApplause(dur, vol, pan));
  S.whistles = (n, vol) => (sample('silbidos', { vol: Math.min(1.2, (n || 4) / 6) }) || synthWhistles(n, vol));
  S.chant = (name, o) => {
    o = o || {};
    const c = ac();
    if (!o.force && chantNow && c && chantNow > c.currentTime) return 0;
    const d = sample('canticos', { vol: o.away ? 0.5 : 1, pan: o.away ? -0.7 : 0 });
    if (d) { chantNow = c.currentTime + d; return d; }
    return synthChant(name, o);
  };
  // Ambiente de grada grabado (en bucle) en lugar del ruido, si existe
  const synthStart = S.startCrowd;
  let bedLoop = null;
  S.startCrowd = () => {
    preloadSamples();
    synthStart();
    const src = sample('ambiente', { loop: true });
    if (src && crowd) { bedLoop = src; crowd.g.gain.cancelScheduledValues(ctx.currentTime); crowd.g.gain.setValueAtTime(0.02, ctx.currentTime); }
  };
  const synthStop = S.stopCrowd;
  S.stopCrowd = () => { if (bedLoop) { try { bedLoop.stop(); } catch (e) { /* nada */ } bedLoop = null; } synthStop(); };

  TL.SFX = S;
})();
