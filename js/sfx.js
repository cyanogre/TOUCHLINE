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
      master.connect(ctx.destination);
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

  const S = {
    on, setOn, unlock, ac,
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
    if (!crowd || !ctx) return;
    const c = crowd; crowd = null;
    const t = ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(Math.max(0.0001, c.g.gain.value), t);
    c.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => { try { c.n.stop(); c.lfo.stop(); } catch (e) { /* nada */ } }, 900);
  }
  S.stopCrowd = stopCrowd;

  TL.SFX = S;
})();
