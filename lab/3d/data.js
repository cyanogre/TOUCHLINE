/* TOUCHLINE · laboratorio 3D — MatchData: lo que el juego cuenta del partido, fotograma a fotograma.
 *
 * El partido lo simula el motor del juego (TL.Engine) y lo escenifica el campo 2D (TL.Pitch), igual que
 * en el juego. Aquí solo se GRABA lo que pasa en ese campo:
 *  - frames: { t, pl: { pid: [x, z, team, gk] }, ref: [x, z], ball: [x, y, z] }   (metros, origen en el centro)
 *  - events: { t, type: 'pass'|'long'|'shot'|'header'|'dive'|'slide'|'fall'|'celebrate', pid, dir? }
 *  - clips:  { from, to, type, text }  las jugadas clave (gol, penalti, roja, paradón…), como en el juego
 * El partido corre narrado; cuando llega una jugada clave, se espera a que el 2D la termine, se pausa
 * y el 3D la enseña. Después sigue.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const L = 105, W = 68, KEEP = 120;
  // Qué se enseña en 3D (y con qué probabilidad, para no ver cada tiro fuera)
  const KEY = { goal: 1, pen: 1, penmiss: 1, red: 1, disallowed: 1, save: 0.6, miss: 0.3 };

  const Lab = {
    frames: [], events: [], log: [], clips: [], pending: null,
    m: null, pitch: null, me: 0, paused: false, ready: false,
    t() { return this.pitch ? this.pitch.t : 0; }
  };
  const to3 = (x, y) => [x - L / 2, y - W / 2];

  Lab.start = async function (gender, canvas) {
    const G = TL.Game;
    const data = await G.careerData(gender, 0);
    const reps = G.preview(data).reps;
    const club = +Object.keys(reps).sort((a, b) => reps[b] - reps[a])[0];
    G.newGame(data, club, 'Laboratorio', { g: gender, fan: false });
    const S = G.S;
    const m = G.startMatch();
    m.detail = true;
    this.m = m;
    this.me = m.teams[0].isUser ? 0 : 1;
    this.clubs = m.teams.map(t => S.clubs[t.club]);
    const pitch = new TL.Pitch(canvas, m, this.me);
    this.pitch = pitch;
    pitch.speed = 4;               // entre jugadas clave, el partido va deprisa
    hookKicks(pitch);
    this.ready = true;
    requestAnimationFrame(sample);
    setInterval(drive, 40);
    return this;
  };

  function hookKicks(pitch) {
    const orig = pitch._kick.bind(pitch);
    pitch._kick = function (tx, ty, o) {
      o = o || {};
      const b = pitch.ball;
      const fetching = !o.free && !b.path && !pitch._atBall();
      if (!fetching) {
        const k = pitch.nearest(Object.values(pitch.A), b);
        if (k && Math.hypot(k.x - b.x, k.y - b.y) < 3) {
          const toGoal = (tx < 1.5 || tx > L - 1.5) && Math.abs(ty - W / 2) < 7;
          const dist = Math.hypot(tx - b.x, ty - b.y);
          // Qué golpeo es: cabezazo, saque de banda (lo tenía en las manos), tiro, globo, pase largo o pase
          const type = k.held || k.pid === Lab._held ? 'throw' : b.z > 1.3 ? 'header' : toGoal ? ((o.h || 0) > 2.5 ? 'chip' : 'shot') : (o.h || 0) > 3 ? 'lob' : dist > 32 ? 'long' : 'pass';
          Lab.events.push({ t: pitch.t, type, pid: k.pid });
        }
      }
      return orig(tx, ty, o);
    };
  }

  const lastState = {}, lastHeld = {};
  let lastOwner = null;
  function sample() {
    const p = Lab.pitch;
    if (p) {
      // Quién tiene el balón: recuperaciones (entrada) y blocajes de la portera
      const own = p.ball.owner;
      if (own != null && own !== lastOwner && p.A[own]) {
        const a = p.A[own], prev = lastOwner != null ? p.A[lastOwner] : null;
        if (p.isGK(a) && Math.hypot(p.ball.x - a.x, p.ball.y - a.y) < 2.5) Lab.events.push({ t: p.t, type: 'catch', pid: own });
        else if (prev && prev.team !== a.team && Math.hypot(prev.x - a.x, prev.y - a.y) < 2.5) Lab.events.push({ t: p.t, type: 'tackle', pid: own });
      }
      lastOwner = own;
      const pl = {};
      for (const a of Object.values(p.A)) {
        const [x, z] = to3(a.x, a.y);
        pl[a.pid] = [x, z, a.team, p.isGK(a) ? 1 : 0];
        if (a.held) Lab._held = a.pid; else if (lastHeld[a.pid]) setTimeout(() => { if (Lab._held === a.pid) Lab._held = null; }, 200);
        lastHeld[a.pid] = !!a.held;
        if (a.state !== lastState[a.pid]) {
          const map = { dive: 'dive', slide: 'slide', down: 'fall', celebrate: 'celebrate', jump: 'celebrate' };
          if (map[a.state]) Lab.events.push({ t: p.t, type: map[a.state], pid: a.pid, dir: a.dive || 1 });
          lastState[a.pid] = a.state;
        }
      }
      const b = p.ball, [bx, bz] = to3(b.x, b.y), [rx, rz] = to3(p.ref.x, p.ref.y);
      const f = { t: p.t, pl, ref: [rx, rz], ball: [bx, 0.11 + Math.max(0, b.z || 0), bz] };
      const last = Lab.frames[Lab.frames.length - 1];
      if (!last || f.t > last.t + 1e-4) Lab.frames.push(f);
      while (Lab.frames.length && Lab.frames[0].t < p.t - KEEP) Lab.frames.shift();
      while (Lab.events.length && Lab.events[0].t < p.t - KEEP) Lab.events.shift();
    }
    requestAnimationFrame(sample);
  }

  function drive() {
    const m = Lab.m, p = Lab.pitch;
    if (!m || Lab.paused) return;
    // La jugada clave ya se ha escenificado en el 2D: se corta y se pasa al 3D
    if (Lab.pending && !p.busy()) {
      const c = Lab.pending; Lab.pending = null;
      c.to = Math.min(p.t + 0.3, c.from + 14);
      Lab.clips.push(c);
      Lab.setPaused(true);
      return;
    }
    if (m.done || p.busy()) return;
    const evs = m.step();
    p.push(evs, false);
    for (const e of evs) {
      if (e.text) Lab.log.push({ min: e.min, text: e.text.replace(/<[^>]+>/g, ''), type: e.type, team: e.team });
      if (!Lab.pending && KEY[e.type] && Math.random() < KEY[e.type]) Lab.pending = { from: p.t - 0.6, type: e.type, text: (e.text || '').replace(/<[^>]+>/g, ''), min: e.min };
    }
  }

  Lab.setPaused = function (v) { this.paused = v; if (this.pitch) this.pitch.hold = v; };
  Lab.setSpeed = function (v) { if (this.pitch) this.pitch.speed = v; };

  TL.Lab = Lab;
})();
