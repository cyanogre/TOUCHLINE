/* TOUCHLINE · laboratorio 3D — MatchData: lo que el juego cuenta del partido, fotograma a fotograma.
 *
 * El partido lo simula el motor del juego (TL.Engine) y lo escenifica el campo 2D (TL.Pitch), igual que
 * en el juego. Aquí solo se GRABA lo que pasa en ese campo:
 *  - frames: { t, pl: { pid: [x, z, team, gk] }, ref: [x, z], ball: [x, y, z] }   (metros, origen en el centro)
 *  - events: { t, type: 'pass'|'long'|'shot'|'header'|'dive'|'slide'|'fall'|'celebrate', pid, dir? }
 * El render 3D lee esta grabación con unos segundos de retraso: así puede empezar cada acción antes de
 * su contacto con el balón y repetir cualquier jugada.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const L = 105, W = 68, KEEP = 90; // segundos de partido que se guardan para las repeticiones

  const Lab = {
    frames: [], events: [], log: [], goals: [],
    m: null, pitch: null, me: 0, paused: false, ready: false,
    /** Tiempo del campo 2D (avanza con la velocidad y la cámara lenta del propio juego). */
    t() { return this.pitch ? this.pitch.t : 0; }
  };

  const to3 = (x, y) => [x - L / 2, y - W / 2];

  /** Crea una partida, el partido de la jornada y el campo 2D que lo escenifica. */
  Lab.start = async function (gender, canvas) {
    const G = TL.Game;
    const data = await G.careerData(gender, 0);
    // El club con más nivel: partido con buenos jugadores
    const reps = G.preview(data).reps;
    const club = +Object.keys(reps).sort((a, b) => reps[b] - reps[a])[0];
    G.newGame(data, club, 'Laboratorio', { g: gender, fan: false });
    const S = G.S;
    S.settings.speed = 1;
    const m = G.startMatch();
    m.detail = true;
    this.m = m;
    this.me = m.teams[0].isUser ? 0 : 1;
    this.names = m.teams.map(t => S.clubs[t.club]);
    const pitch = new TL.Pitch(canvas, m, this.me);
    this.pitch = pitch;
    hookKicks(pitch);
    this.ready = true;
    requestAnimationFrame(sample);
    setInterval(drive, 60);
    return this;
  };

  // ------------------------------------------------------------ Eventos: quién golpea el balón y cómo
  function hookKicks(pitch) {
    const orig = pitch._kick.bind(pitch);
    pitch._kick = function (tx, ty, o) {
      o = o || {};
      const b = pitch.ball;
      // Si nadie está en el balón, el campo manda a alguien a buscarlo y vuelve a llamar aquí
      const fetching = !o.free && !b.path && !pitch._atBall();
      if (!fetching) {
        const k = pitch.nearest(Object.values(pitch.A), b);
        if (k && Math.hypot(k.x - b.x, k.y - b.y) < 3) {
          const toGoal = (tx < 1.5 || tx > L - 1.5) && Math.abs(ty - W / 2) < 7;
          const dist = Math.hypot(tx - b.x, ty - b.y);
          const type = b.z > 1.3 ? 'header' : toGoal ? 'shot' : (o.h || 0) > 3 || dist > 32 ? 'long' : 'pass';
          Lab.events.push({ t: pitch.t, type, pid: k.pid });
        }
      }
      return orig(tx, ty, o);
    };
  }

  // ------------------------------------------------------------ Grabación
  const lastState = {};
  function sample() {
    const p = Lab.pitch;
    if (p) {
      const pl = {};
      for (const a of Object.values(p.A)) {
        const [x, z] = to3(a.x, a.y);
        pl[a.pid] = [x, z, a.team, p.isGK(a) ? 1 : 0];
        // Cambios de estado del 2D que en 3D son una acción (estirada, segada, caída, celebración)
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
      // Se olvida lo muy antiguo
      while (Lab.frames.length && Lab.frames[0].t < p.t - KEEP) Lab.frames.shift();
      while (Lab.events.length && Lab.events[0].t < p.t - KEEP) Lab.events.shift();
    }
    requestAnimationFrame(sample);
  }

  // ------------------------------------------------------------ El reloj del partido (como en el juego)
  function drive() {
    const m = Lab.m, p = Lab.pitch;
    if (!m || m.done || Lab.paused || p.busy()) return;
    const evs = m.step();
    p.push(evs, false);
    for (const e of evs) {
      if (e.text) Lab.log.push({ min: e.min, text: e.text.replace(/<[^>]+>/g, ''), type: e.type, team: e.team });
      if (e.type === 'goal') Lab.goals.push({ t: p.t, team: e.team });
    }
  }

  /** Pausa el partido (el campo 2D también se congela). */
  Lab.setPaused = function (v) { this.paused = v; if (this.pitch) this.pitch.hold = v; };
  Lab.setSpeed = function (v) { if (this.pitch) this.pitch.speed = v; };

  TL.Lab = Lab;
})();
