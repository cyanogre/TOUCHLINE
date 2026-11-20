/* TOUCHLINE — cerebro táctico del partido 2D.
 *
 * Cómo juega cada equipo. Ideas tomadas de cómo lo resuelven los simuladores y los analistas
 * (RoboCup agent2d/HELIOS, Google Research Football, modelos de control del campo con tracking,
 * xT de Karun Singh, manuales de juego de posición y de defensa en zona). Código propio.
 *
 *  - Fases. Con balón: salida, progresión, último tercio y contraataque. Sin balón: presión tras
 *    pérdida, presión alta, bloque (bajo, medio o alto según la mentalidad) y repliegue.
 *  - Estructura. En ataque, cinco carriles: amplitud por fuera (extremo o lateral, se reparten la
 *    banda), interiores entre líneas, punta fijando a los centrales y vigilancia detrás del balón.
 *    En defensa, tres líneas juntas (unos 10–12 m entre ellas) que basculan hacia el balón; la
 *    defensa sube cuando el balón está presionado y baja cuando la poseedora tiene tiempo y mira
 *    hacia delante.
 *  - Decisiones con balón. Cada opción (pase al pie, al espacio, cambio de juego, envío largo,
 *    conducción, regate, centro, despeje, aguantar) se valora con la probabilidad de que salga
 *    bien (quién llega antes a cortarla: reacción + arrancada + velocidad punta) por lo que vale
 *    el sitio al que va el balón, menos lo que cuesta perderlo ahí. Las buenas pasadoras eligen
 *    mejor; los equipos de toque castigan más perderla y los directos buscan antes el balón largo.
 *  - Sin balón: apoyos que buscan una línea de pase limpia, desmarques de ruptura que arrancan en
 *    línea (nunca en fuera de juego), desdoblamientos, llegadas desde segunda línea, ataque al
 *    área; presión con cobertura, marcas en el área y seguimiento de desmarques.
 *  - Las jugadas del motor (goles, faltas, penaltis, fueras de juego…) nacen del juego: antes de
 *    escenificarlas, el equipo que las protagoniza recupera, progresa y llega a la zona.
 *  - Todo lo que pasa se cuenta (pases, regates, desmarques, presión, repliegues) para la radio.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U } = TL;
  const L = 105, Wd = 68, CY = Wd / 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sig = x => 1 / (1 + Math.exp(-x));
  const hyp = Math.hypot;

  /** Lo que vale tener el balón en (profundidad d hacia la portería rival, carril l): ~0,07 cerca de la propia área, ~0,85 en el punto de penalti. */
  function threat(d, l) {
    const dd = clamp(d, 0, L) / L;
    const k = 0.25 + 0.6 * dd * dd * dd;
    const fl = 1 - Math.pow(Math.min(1, Math.abs(l - CY) / CY), 1.5) * k;
    return 0.02 + 0.98 * Math.pow(dd, 1.8) * fl;
  }
  /** Distancia de un punto al segmento a→b. */
  function segD(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, c = vx * vx + vy * vy;
    const k = c > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / c, 0, 1) : 0;
    return hyp(px - (ax + vx * k), py - (ay + vy * k));
  }
  function hash01(v) { let h = 2166136261; for (const ch of String(v)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return (h % 10007) / 10007; }

  const ROLE = { GK: 'GK', CB: 'CB', RB: 'FB', LB: 'FB', CDM: 'DM', CM: 'CM', CAM: 'AM', RM: 'WM', LM: 'WM', RW: 'W', LW: 'W', ST: 'ST' };
  const ATT_ROLES = { ST: 4, W: 3, AM: 2.5, WM: 2, WB: 1.6, CM: 1.3, FB: 0.8, DM: 0.5, CB: 0.15, GK: 0 };

  class Brain {
    constructor(P) {
      this.P = P;
      this.ti = [null, null];
      this.mem = { press: [null, null] };
      this.lineS = [null, null];
      this.lost = [-99, -99];
      this.won = [-99, -99];
      this.wonD = [50, 50];
      this.possT = [0, 0];
      this.phase = ['build', 'block'];
      this.ownTeam = null;
      this.lastTouch = 0;
      this.kickTeam = 0;
      this.lastKick = null;
      this.runs = {};
      this.runCheck = 0;
      this.sup = null;
      this.carry = null;
      this.next = 0;
      this.holdN = 0;
      this.passes = 0;
      this.ag = null;
      this.restart = null;
      this.dt = 0.016;
      this.noteT = {};
      this.width = [[0, 0], [0, 0]];
    }

    // ------------------------------------------------------------------ Utilidades
    say(k, d) { const P = this.P; if (P.instant || !P.onCall) return; try { P.onCall(Object.assign({ k }, d || {})); } catch (e) { /* la radio no puede romper el partido */ } }
    st(a) { const p = this.P.P(a.pid); return (p && p.st) || [60, 60, 60, 60, 60, 60]; }
    vmax(a) { return 6.2 * (a.pace || 1) * (0.6 + 0.4 * this.P.energy(a)); }
    /** Segundos que tarda en llegar a (x, y): reacción + arrancada (aceleración limitada) + carrera. */
    reach(a, x, y, react) {
      const d = Math.max(0, hyp(a.x - x, a.y - y) - 0.9);
      const v = this.vmax(a), acc = a.acc || 4.5;
      const ux = x - a.x, uy = y - a.y, ul = hyp(ux, uy) || 1;
      const v0 = clamp((a.vx * ux + a.vy * uy) / ul, 0, v);
      const dAcc = (v * v - v0 * v0) / (2 * acc);
      const t = d <= dAcc ? (-v0 + Math.sqrt(v0 * v0 + 2 * acc * d)) / acc : (v - v0) / acc + (d - dAcc) / v;
      return (react != null ? react : (a.react || 0.25)) + t;
    }
    pressOn(c) { let d = 99; for (const o of this.P.team(1 - c.team)) d = Math.min(d, hyp(o.x - c.x, o.y - c.y)); return d; }
    nearestOpp(c) { let best = null, bd = 1e9; for (const o of this.P.team(1 - c.team)) { const d = hyp(o.x - c.x, o.y - c.y); if (d < bd) { bd = d; best = o; } } return best; }
    attTeam() {
      const P = this.P, b = P.ball;
      if (b.owner != null && P.A[b.owner]) return P.A[b.owner].team;
      if (b.path) return this.kickTeam;
      return P.poss;
    }
    offD(i) { return this.P.depth(i, this.offX ? this.offX[i] : this.P._offsideLine(i)); }
    /** ¿Está en fuera de juego ahora mismo (si le llegara un pase)? */
    offside(i, a) { return this.P.depth(i, a.x) > this.offD(i) + 0.25 && this.P.depth(i, a.x) > L / 2; }
    gov(i) {
      // La posesión que se ve en el campo se acerca a la del motor (que es la que cuenta en las estadísticas)
      const m = this.P.m, tot = this.possT[0] + this.possT[1];
      if (!m.min || tot < 6) return 0;
      const t0 = m.stats.possSum[0] / m.min, tgt = i === 0 ? t0 : 1 - t0;
      return clamp((tgt - this.possT[i] / tot) * 2.5, -0.35, 0.35);
    }

    /** Puestos, líneas y estilo de juego de un equipo (se recalcula al cambiar el once o el sistema). */
    teamInfo(i) {
      const P = this.P, t = P.m.teams[i];
      const key = t.formation + '|' + t.onPitch.map(o => o.pid + ':' + o.slot).join(',');
      const c = this.ti[i];
      if (c && c.key === key) return c;
      const Fm = TL.Engine.FORMATIONS[t.formation] || TL.Engine.FORMATIONS['4-4-2'];
      const back3 = t.onPitch.filter(o => o.slot === 'CB').length >= 3;
      const pl = {};
      for (const o of t.onPitch) {
        const s = (o.idx != null && Fm[o.idx] && Fm[o.idx][0] === o.slot && Fm[o.idx]) || Fm.find(z => z[0] === o.slot) || [o.slot, 50, 50];
        let role = ROLE[o.slot] || 'CM';
        if (back3 && (role === 'FB' || role === 'WM')) role = 'WB';
        pl[o.pid] = { role, sx: s[1], sy: s[2], sgn: s[1] < 42 ? -1 : s[1] > 58 ? 1 : 0 };
      }
      const nST = Object.values(pl).filter(r => r.role === 'ST').length;
      // Líneas sin balón: defensas y carrileros · medios (los extremos bajan) · mediapunta · puntas
      const lines = { D: [], M: [], A: [], F: [] };
      for (const pid in pl) {
        const r = pl[pid];
        const k = r.role === 'GK' ? null : ['CB', 'FB', 'WB'].includes(r.role) ? 'D' : r.role === 'ST' ? 'F' : r.role === 'AM' ? (nST >= 2 ? 'M' : 'A') : 'M';
        if (k) lines[k].push(+pid);
      }
      for (const k in lines) lines[k].sort((a, b) => pl[a].sx - pl[b].sx);
      // Orden entre centrales, interiores y puntas (para repartirlas a lo ancho)
      const order = role => Object.keys(pl).filter(p => pl[p].role === role).sort((a, b) => pl[a].sx - pl[b].sx);
      for (const role of ['CB', 'CM', 'ST', 'DM']) order(role).forEach((p, k, arr) => { pl[p].k = k; pl[p].n = arr.length; });
      const out = t.onPitch.filter(o => o.slot !== 'GK');
      const avg = k => out.length ? U.sum(out, o => (P.P(o.pid).st || [])[k] || 55) / out.length : 55;
      const pas = avg(2), pac = avg(0), phy = avg(5);
      const club = P.S.clubs[t.club] || { name: 'x' };
      const r1 = hash01(club.name + 'a'), r2 = hash01(club.name + 'b'), r3 = hash01(club.name + 'c');
      return (this.ti[i] = {
        key, pl, lines, back3, nST,
        short: clamp((pas - 50) / 26 + (r1 - 0.5) * 0.6, 0.05, 1),   // 0 directo · 1 toque
        width: clamp(0.35 + r2 * 0.6, 0, 1),                         // gusto por abrir el campo
        fbHigh: clamp(0.25 + r3 * 0.7, 0, 1),                        // laterales que suben
        press: clamp(0.35 + (pac + phy - 120) / 90 + (r1 - 0.5) * 0.4, 0.15, 1)
      });
    }
    role(a) { const T = this.teamInfo(a.team); return T.pl[a.pid] || { role: this.P.isGK(a) ? 'GK' : 'CM', sx: 50, sgn: 0 }; }

    // ------------------------------------------------------------------ Fases
    _unbalanced(def, k) {
      const P = this.P, bd = P.depth(def, P.ball.x);
      let behind = 0;
      for (const a of P.team(def)) if (!P.isGK(a) && P.depth(def, a.x) < bd - 1) behind++;
      return behind < (k || 5);
    }
    _phases(att) {
      const P = this.P, def = 1 - att, t = P.t;
      const bd = P.depth(att, P.ball.x);
      const prev = this.phase.slice();
      let pa = bd < 35 ? 'build' : bd < 70 ? 'progress' : 'final';
      if (t - this.won[att] < 5.5 && this.wonD[att] < 64 && bd < 82 && this._unbalanced(def)) pa = 'counter';
      let pd = 'block';
      const T = this.teamInfo(def), tm = P.m.teams[def];
      const pressK = T.press + (tm.mentality - 1) * 0.25 + (tm.desperate ? 0.35 : 0);
      if (t - this.lost[def] < 4.2) pd = 'counterpress';
      else if (this._unbalanced(def, 4) && P.depth(def, P.ball.x) < 62) pd = 'recover';
      else if (bd < 30 && pressK > 0.55) pd = 'press';
      this.phase[att] = pa; this.phase[def] = pd;
      if (pd === 'block') {
        if (this.blockAt == null || this.blockTeam !== def) { this.blockAt = t; this.blockTeam = def; }
        else if (t - this.blockAt > 6 && this.lineS[def] != null) {
          const dl = this.lineS[def];
          this._note(def, dl < 21 ? 'low' : dl < 33 ? 'mid' : 'high');
        }
      } else this.blockAt = null;
      // Cambios de fase que la radio puede contar
      if (prev[att] !== pa && pa === 'counter') this._note(att, 'counter', { p: P.ball.owner });
      if (prev[def] !== pd) {
        if (pd === 'press') this._note(def, 'press');
        else if (pd === 'counterpress') this._note(def, 'counterpress');
        else if (pd === 'recover') this._note(def, 'recover');
      }
    }
    _note(team, kind, d) {
      const P = this.P, key = team + kind;
      if (this.noteT[key] && P.t - this.noteT[key] < (kind === 'counter' ? 25 : 80)) return;
      if (kind !== 'counter' && this.noteT[team] && P.t - this.noteT[team] < 25) return;
      this.noteT[key] = P.t; this.noteT[team] = P.t;
      this.say('team', Object.assign({ team, kind }, d || {}));
    }

    // ------------------------------------------------------------------ Dónde se coloca cada una
    /** Llamado cada fotograma por la vista (salvo cuando el guion lo controla todo). */
    targets(dtT) {
      const P = this.P, b = P.ball;
      const car = b.owner != null ? P.A[b.owner] : null;
      const att = this.attTeam(), def = 1 - att;
      this.offX = [P._offsideLine(0), P._offsideLine(1)];
      this._phases(att);
      const bp = car ? { x: car.x + car.vx * 0.35, y: car.y + car.vy * 0.35 } : b.path ? { x: b.path.tx, y: b.path.ty } : { x: b.x, y: b.y };
      const base = {};
      this._attShape(att, bp, base);
      this._defShape(def, bp, car, base);
      const rush = this.phase[def] === 'recover' ? 0.95 : 0.85;
      for (const id in P.A) {
        const a = P.A[id], h = base[id];
        if (!h) continue;
        // Cada una sigue a su sitio a su ritmo: unas reaccionan antes que otras (nada de bloques que se mueven a la vez)
        if (!(a.shift > 0)) a.shift = 0.75 + hash01(a.pid) * 1.7;
        if (!isFinite(a.hx) || !isFinite(a.hy) || hyp(h[0] - a.hx, h[1] - a.hy) > 30) { a.hx = h[0]; a.hy = h[1]; }
        const k = Math.min(1, dtT * a.shift);
        a.hx += (h[0] - a.hx) * k; a.hy += (h[1] - a.hy) * k;
        a.tx = a.hx; a.ty = a.hy;
        // Anda si ya está en su sitio, trota si le falta un poco y corre si le queda lejos (esprinta en el repliegue)
        const far = hyp(a.tx - a.x, a.ty - a.y);
        a.run = far < 3.5 ? 0.21 : far < 10 ? 0.21 + (far - 3.5) * 0.045 : Math.min(a.team === def ? rush : 0.8, 0.5 + (far - 10) * 0.03);
        a.role = null;
      }
      if (!car && !b.path) this._looseTargets();
      else {
        this._defRoles(def, att, bp, car);
        if (car && car.team === att) this._attRoles(att, car);
      }
      // La receptora del pase va a por él
      if (b.path && b.path.to != null && P.A[b.path.to]) { const r = P.A[b.path.to]; r.tx = b.path.tx; r.ty = b.path.ty; r.run = 0.95; r.role = 'receive'; }
      this._agendaTargets();
      // Nadie esprinta para recorrer dos metros: los ajustes cortos se hacen andando o trotando
      for (const id in P.A) {
        const a = P.A[id];
        if (a.role === 'support' || a.role === 'cover' || a.role === 'mark' || a.role === 'screen' || a.role === 'lane' || a.role === 'track') {
          a.run = Math.min(a.run, 0.24 + hyp(a.tx - a.x, a.ty - a.y) * 0.065);
        }
      }
      // Saque de puerta: las rivales fuera del área hasta que el balón está en juego
      if (this.restart && this.restart.kind === 'gk' && this.restart.until > P.t) {
        const i = this.restart.team;
        for (const a of P.team(1 - i)) { const d = P.depth(i, a.tx); if (d < 17.5 && Math.abs(a.ty - CY) < 21) a.tx = P.world(i, 18.5, 0)[0]; }
      }
    }

    /** Colocación con balón: cinco carriles, amplitud, profundidad y vigilancias. */
    _attShape(i, bp, base) {
      const P = this.P, T = this.teamInfo(i), t = P.m.teams[i];
      const ph = this.phase[i];
      const bd = P.depth(i, bp.x), bl = P.lat(i, bp.y);
      const off = this.offD(i), cap = off - 0.9;
      const ment = t.mentality + (t.desperate ? 1 : 0);
      const side = bl < CY ? -1 : 1, wideBall = Math.abs(bl - CY) > 17;
      const build = ph === 'build', fin = ph === 'final';
      const push = (ment - 1) * 4;
      // Quién da amplitud en cada banda: el extremo o el lateral (cambia de vez en cuando: rotaciones)
      const wb = this.width[i];
      const hasW = s => P.team(i).some(a => { const r = T.pl[a.pid]; return r && (r.role === 'W' || r.role === 'WM') && r.sgn === s; });
      const oppMid = this._oppMidD(i, off);
      const cross = fin && wideBall && bd > 74;
      // Ocupación del área en el centro: punta al primer palo, extremo lejano al segundo, mediapunta al punto de penalti
      const boxDone = {};
      for (const a of P.team(i)) {
        const r = T.pl[a.pid];
        if (!r) continue;
        const s = r.sgn, ballSide = s === 0 || s === side;
        let d, l;
        switch (r.role) {
          case 'GK':
            d = build ? clamp(bd * 0.3, 3, 10) : clamp(4 + bd * 0.13, 4, 18); l = CY + (bl - CY) * 0.15; break;
          case 'CB': {
            const n = r.n || 2, k = r.k || 0;
            const spread = build ? (n >= 3 ? 17 : 15) : (n >= 3 ? 13 : 10.5);
            const o = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * spread;
            d = build ? clamp(bd - 3, 5, 22) : clamp(bd - 27 + push * 0.7, 14, t.desperate ? 62 : 52);
            l = CY + o + (bl - CY) * 0.2;
            break;
          }
          case 'FB': {
            const wideByW = hasW(s) && wb[s > 0 ? 1 : 0] === 0;      // el extremo de su banda da la amplitud
            const high = T.fbHigh + (ment - 1) * 0.3;
            if (build) { d = clamp(bd + 12, 18, 42); l = s < 0 ? 4 : Wd - 4; }
            else if (!ballSide && high < 0.7) { d = clamp(bd - 17, 22, 60); l = CY + s * 17; }      // el del otro lado cierra
            else if (wideByW) { d = clamp(bd - 7 + high * 5, 26, 76); l = CY + s * 20; }           // por detrás y por dentro del extremo
            else { d = clamp(bd + 3 + high * 6, 28, Math.min(cap, 86)); l = s < 0 ? 3.5 : Wd - 3.5; } // da la amplitud él
            break;
          }
          case 'WB':
            if (build) { d = clamp(bd + 16, 24, 55); l = s < 0 ? 3.5 : Wd - 3.5; }
            else { d = ballSide ? clamp(Math.min(cap - 2, bd + 8), 34, 90) : clamp(bd - 2, 30, 80); l = s < 0 ? 3.5 : Wd - 3.5; }
            break;
          case 'DM': {
            const n = r.n || 1, o = n > 1 ? ((r.k || 0) - 0.5) * 14 : 0;
            d = build ? clamp(bd + 9, 14, 34) : clamp(bd - 11 + push * 0.5, 22, 70);
            l = CY + o + (bl - CY) * (build ? 0.25 : 0.35);
            break;
          }
          case 'CM': {
            const near = s === side || s === 0;
            if (build) { d = clamp(bd + 17, 26, 50); l = CY + (s || (r.k ? 1 : -1)) * 13; }
            else if (fin) { d = near ? clamp(bd - 7, 66, 86) : clamp(82 + push * 0.3, 66, 88); l = CY + (s || 0) * 10 + (bl - CY) * 0.15; }
            else { d = clamp(oppMid + 4 - (near ? 0 : 5), bd - 8, cap - 3); l = CY + (s || (r.k ? 1 : -1)) * 12 + (bl - CY) * 0.15; }
            break;
          }
          case 'AM':
            d = clamp(Math.min(off - 5, bd + 14), bd - 2, 92); l = CY + (bl - CY) * 0.3; break;
          case 'WM': case 'W': {
            const inside = wb[s > 0 ? 1 : 0] === 1;   // se mete por dentro y deja la banda al lateral
            const top = r.role === 'W' ? off - 1.8 : Math.min(off - 3, bd + 12);
            d = build ? clamp(bd + 24, 40, top) : clamp(top, bd - 3, 96);
            l = inside ? CY + s * 12 : s < 0 ? 3.5 : Wd - 3.5;
            if (!ballSide && !build) { d -= 4; l = lerp(l, CY, 0.15); }
            break;
          }
          case 'ST': {
            const n = r.n || 1, k = r.k || 0;
            d = clamp(off - 1 - (n > 1 && k === 1 ? 5 : 0), bd + 5, 99);
            l = CY + (bl - CY) * 0.25 + (n > 1 ? (k - 0.5) * 14 : 0);
            break;
          }
          default: d = bd; l = CY;
        }
        // Centro desde la banda: el área se llena (primer palo, segundo palo, punto de penalti, frontal)
        if (cross && r.role !== 'GK') {
          const slot = r.role === 'ST' && !boxDone.near ? 'near' : (r.role === 'W' || r.role === 'WM' || r.role === 'WB') && s === -side && !boxDone.far ? 'far'
            : (r.role === 'AM' || (r.role === 'ST' && boxDone.near)) && !boxDone.spot ? 'spot' : r.role === 'CM' && !boxDone.edge ? 'edge' : null;
          if (slot) {
            boxDone[slot] = true;
            if (slot === 'near') { d = 97; l = CY + side * 3.5; }
            else if (slot === 'far') { d = 95.5; l = CY - side * 7; }
            else if (slot === 'spot') { d = 91; l = CY - side * 1.5; }
            else { d = 83; l = CY - side * 3; }
          }
        }
        d += r.role === 'GK' || r.role === 'CB' ? 0 : push * 0.4;
        if (r.role !== 'GK') d = Math.min(d, cap);
        base[a.pid] = P.world(i, clamp(d, 1, L - 1), clamp(l, 1.5, Wd - 1.5));
      }
    }
    /** Altura de la línea de medios rival (en la profundidad de quien ataca). */
    _oppMidD(i, off) {
      const P = this.P, T = this.teamInfo(1 - i);
      const ds = T.lines.M.map(pid => P.A[pid]).filter(Boolean).map(a => P.depth(i, a.x)).sort((a, b) => a - b);
      return ds.length ? ds[ds.length >> 1] : off - 12;
    }

    /** Bloque sin balón: tres líneas juntas que basculan; la línea sube o baja según la presión sobre el balón. */
    _defShape(i, bp, car, base) {
      const P = this.P, T = this.teamInfo(i), t = P.m.teams[i];
      const ph = this.phase[i];
      const bd = P.depth(i, bp.x), bl = P.lat(i, bp.y);
      const ment = clamp(t.mentality + (t.desperate ? 1 : 0), 0, 3);
      const H = [[0.42, 4, 9, 30], [0.5, 7, 11, 40], [0.56, 10, 13, 50], [0.6, 14, 15, 56]][ment];
      let dl = clamp(bd * H[0] + H[1], H[2], H[3]);
      if (ph === 'press') dl = clamp(bd - 32, H[2], 52);
      if (car && car.team !== i) {
        const pr = this.pressOn(car);
        const fwd = P.depth(car.team, car.x + car.vx) - P.depth(car.team, car.x);
        if (pr < 2.2) dl += 2.5;                       // balón presionado: la línea sube
        else if (pr > 5 && fwd > 0.3) dl -= 3.5;       // tiene tiempo y viene de cara: la línea baja
      }
      dl = Math.min(dl, Math.max(bd - 4, H[2]));
      if (this.lineS[i] == null || Math.abs(this.lineS[i] - dl) > 40) this.lineS[i] = dl;
      this.lineS[i] += (dl - this.lineS[i]) * Math.min(1, this.dt * 1.4);
      dl = this.lineS[i];
      const g1 = [9.5, 10.5, 12, 13][ment], g2 = [9, 10, 12, 14][ment];
      const lc = clamp(lerp(CY, bl, 0.55), 19, Wd - 19);
      const squeeze = Math.abs(bl - CY) > 18 ? 0.9 : 1;
      const W = { D: [0, 10, 22, 30, 36, 40], M: [0, 12, 20, 30, 36, 40], A: [0, 10, 20, 24], F: [0, 12, 24, 28] };
      const depthOf = { D: dl, M: dl + g1, A: dl + g1 + g2 * 0.55, F: dl + g1 + g2 + (ph === 'press' ? -4 : 0) };
      if (ph === 'press') { depthOf.F = Math.max(depthOf.F, bd - 6); depthOf.A = Math.max(depthOf.A, bd - 12); depthOf.M = Math.max(depthOf.M, dl + g1 + 4); }
      for (const k of ['D', 'M', 'A', 'F']) {
        const ids = T.lines[k].filter(pid => P.A[pid]);
        const n = ids.length;
        if (!n) continue;
        const width = (W[k][Math.min(n, W[k].length - 1)] || 0) * squeeze;
        const c = k === 'F' && n === 1 ? lerp(CY, bl, 0.35) : lc;
        ids.forEach((pid, idx) => {
          const r = T.pl[pid];
          let l = n === 1 ? c : c + (idx / (n - 1) - 0.5) * width;
          let d = depthOf[k];
          if (r.role === 'DM') d -= 3;
          if (r.role === 'W' && k === 'M') d += 1.5;
          // Lado contrario: cierra por dentro y un paso por detrás (cobertura en diagonal)
          if (Math.abs(l - bl) > 26) { l = lerp(l, lc, 0.15); if (k === 'D') d -= 1.5; }
          if (r.role === 'WB' && Math.sign(l - CY) === Math.sign(bl - CY) && Math.abs(bl - CY) > 16) d += 3;
          base[pid] = P.world(i, clamp(d, 1, L - 1), clamp(l, 1.5, Wd - 1.5));
        });
      }
      const gk = P.gkOf(i);
      if (gk) {
        const d = bd < 22 ? clamp(bd * 0.12 + 1, 1.2, 5) : clamp(1.5 + dl * 0.2, 1.5, 12);
        base[gk.pid] = P.world(i, d, CY + (bl - CY) * (bd < 30 ? 0.3 : 0.12));
      }
    }

    /** Balón suelto: de cada equipo va la que antes llega; las demás, a su sitio. */
    _looseTargets() {
      const P = this.P, b = P.ball;
      for (const k of [0, 1]) {
        let best = null, bt = 1e9;
        for (const a of P.team(k)) {
          if (P.isGK(a) && P.depth(k, b.x) > 18) continue;
          const t = this.reach(a, b.x, b.y);
          if (t < bt) { bt = t; best = a; }
        }
        if (best) { best.tx = b.x; best.ty = b.y; best.run = 1; best.role = 'ball'; }
      }
    }

    /** Sin balón: presión, cobertura, marcas en el área y seguimiento de desmarques. */
    _defRoles(def, att, bp, car) {
      const P = this.P, ph = this.phase[def];
      const field = P.team(def).filter(a => !P.isGK(a));
      if (!field.length) return;
      const og = P.ownX(def);
      const bdD = P.depth(def, bp.x);
      // ¿Se sale a presionar? En bloque solo cuando el balón entra en su zona; tras pérdida o en presión alta, siempre
      const zone = (this.lineS[def] || 30) + 30;
      const engage = ph === 'press' || ph === 'counterpress' || bdD < zone;
      const byReach = field.map(a => [a, this.reach(a, bp.x, bp.y)]).sort((p, q) => p[1] - q[1]);
      let presser = byReach[0][0];
      const prev = this.mem.press[def] != null ? P.A[this.mem.press[def]] : null;
      if (prev && prev.team === def && !P.isGK(prev) && prev.beat == null && this.reach(prev, bp.x, bp.y) < byReach[0][1] + 0.6) presser = prev;
      if (presser.beat > P.t && byReach[1]) presser = byReach[1][0];
      this.mem.press[def] = presser.pid;
      const used = new Set();
      if (engage || hyp(presser.x - bp.x, presser.y - bp.y) < 7) {
        // Entra entre el balón y su portería, un poco por dentro: la echa hacia la banda
        const vx = og - bp.x, vy = CY - bp.y, vl = hyp(vx, vy) || 1;
        const close = car ? hyp(presser.x - car.x, presser.y - car.y) : 9;
        const gap = ph === 'counterpress' || ph === 'press' ? 0.9 : close < 3 ? 1.5 : 1.1;
        presser.tx = bp.x + vx / vl * gap;
        presser.ty = bp.y + vy / vl * gap + (bp.y < CY ? 0.7 : -0.7);
        presser.run = ph === 'counterpress' ? 1 : ph === 'press' ? 0.95 : close > 6 ? 0.88 : 0.62;
        presser.role = 'press';
        used.add(presser.pid);
        // Cobertura: la siguiente, por detrás y por dentro
        const cov = byReach.find(([a]) => !used.has(a.pid) && F.LINE[P.slotOf(a)] <= 2);
        if (cov && hyp(cov[0].x - bp.x, cov[0].y - bp.y) < 22) {
          const c = cov[0], k = 7 / vl;
          c.tx = bp.x + vx * k; c.ty = bp.y + vy * k * 0.8 + (CY - bp.y) * 0.1; c.run = 0.7; c.role = 'cover';
          used.add(c.pid);
        }
        // Tras pérdida: otra muerde la línea de pase más fácil
        if (ph === 'counterpress' && car) {
          const third = byReach.find(([a]) => !used.has(a.pid));
          const recv = P.team(att).filter(a => a !== car && !P.isGK(a)).sort((p, q) => hyp(p.x - car.x, p.y - car.y) - hyp(q.x - car.x, q.y - car.y))[0];
          if (third && recv && hyp(third[0].x - recv.x, third[0].y - recv.y) < 15) {
            const a = third[0];
            a.tx = lerp(car.x, recv.x, 0.6); a.ty = lerp(car.y, recv.y, 0.6); a.run = 0.95; a.role = 'lane';
            used.add(a.pid);
          }
        }
      }
      // Presión alta: cada una se pega a su par en la salida rival
      if (ph === 'press') {
        const T = this.teamInfo(def);
        for (const pid of T.lines.F.concat(T.lines.A, T.lines.M)) {
          const a = P.A[pid];
          if (!a || used.has(a.pid)) continue;
          let best = null, bd = 18;
          for (const o of P.team(att)) {
            if (o === car || P.isGK(o) || o._mk === P.t) continue;
            const d = hyp(o.x - a.hx, o.y - a.hy);
            if (d < bd) { bd = d; best = o; }
          }
          if (!best) continue;
          best._mk = P.t;
          const gx = og - best.x, gy = CY - best.y, gl = hyp(gx, gy) || 1;
          a.tx = best.x + gx / gl * 1.8; a.ty = best.y + gy / gl * 1.8; a.run = 0.85; a.role = 'mark';
          used.add(a.pid);
        }
      }
      // Desmarques a la espalda: los sigue la defensa más cercana (por el lado de dentro)
      for (const pid in this.runs) {
        const r = P.A[pid], run = this.runs[pid];
        if (!r || r.team !== att || run.k === 'overlap') continue;
        let best = null, bd = 16;
        for (const a of field) { if (used.has(a.pid)) continue; const d = hyp(a.x - r.x, a.y - r.y); if (d < bd) { bd = d; best = a; } }
        if (!best) continue;
        const gx = og - r.x, gy = CY - r.y, gl = hyp(gx, gy) || 1;
        best.tx = r.x + gx / gl * 1.4 + (run.tx - r.x) * 0.25; best.ty = r.y + gy / gl * 1.4 + (run.ty - r.y) * 0.25;
        best.run = 0.97; best.role = 'track';
        used.add(best.pid);
      }
      // Balón cerca del área: cada atacante peligrosa tiene a alguien encima (por el lado de la portería)
      if (bdD < 34) {
        const threats = P.team(att).filter(a => a !== car && !P.isGK(a) && P.depth(def, a.x) < 30 && Math.abs(a.y - CY) < 26)
          .sort((p, q) => P.depth(def, p.x) - P.depth(def, q.x));
        for (const th of threats) {
          let best = null, bd = 14;
          for (const a of field) {
            if (used.has(a.pid) || F.LINE[P.slotOf(a)] > 2) continue;
            const d = hyp(a.hx - th.x, a.hy - th.y);
            if (d < bd) { bd = d; best = a; }
          }
          if (!best) continue;
          const gx = og - th.x, gy = CY - th.y, gl = hyp(gx, gy) || 1;
          best.tx = th.x + gx / gl * 1.3; best.ty = th.y + gy / gl * 1.3; best.run = 0.8; best.role = 'mark';
          used.add(best.pid);
        }
      }
      // Sombra: la punta se pone en la línea de pase hacia el mediocentro rival cuando no presiona
      const T = this.teamInfo(def);
      if (car && car.team === att && ph === 'block') {
        const fw = T.lines.F.map(p => P.A[p]).find(a => a && !used.has(a.pid));
        const piv = P.team(att).filter(a => this.role(a).role === 'DM' || this.role(a).role === 'CM').sort((p, q) => hyp(p.x - car.x, p.y - car.y) - hyp(q.x - car.x, q.y - car.y))[0];
        if (fw && piv && P.depth(def, car.x) > 55 && hyp(piv.x - car.x, piv.y - car.y) < 26) {
          fw.tx = lerp(car.x, piv.x, 0.4); fw.ty = lerp(car.y, piv.y, 0.4); fw.run = 0.55; fw.role = 'screen';
        }
      }
    }

    /** Con balón: la conductora, los apoyos, los desmarques. */
    _attRoles(att, car) {
      const P = this.P, ph = this.phase[att];
      if (P.hold) { car.tx = car.x; car.ty = car.y; car.run = 0.2; car.role = 'hold'; }
      else if (this.carry && this.carry.pid === car.pid && this.carry.until > P.t) { car.tx = this.carry.tx; car.ty = this.carry.ty; car.run = this.carry.run; car.role = 'carry'; }
      else {
        // Controla y levanta la cabeza: se protege de la rival más cercana
        const o = this.nearestOpp(car), dir = P.dir[att];
        let tx = car.x + dir * 0.8, ty = car.y;
        if (o && hyp(o.x - car.x, o.y - car.y) < 3.5) { const dx = car.x - o.x, dy = car.y - o.y, dl = hyp(dx, dy) || 1; tx = car.x + dx / dl * 1.2; ty = car.y + dy / dl * 1.2; }
        car.tx = clamp(tx, 1, L - 1); car.ty = clamp(ty, 1, Wd - 1); car.run = 0.3; car.role = 'hold';
      }
      if (P.isGK(car) && car.held) { car.tx = car.x; car.ty = car.y; }
      // Desmarques en curso
      for (const pid in this.runs) {
        const r = P.A[pid], run = this.runs[pid];
        if (!r || r.team !== att || run.until < P.t || r === car) { delete this.runs[pid]; continue; }
        if (hyp(r.x - run.tx, r.y - run.ty) < 1.5) { delete this.runs[pid]; continue; }
        r.tx = run.tx; r.ty = run.ty; r.run = run.k === 'drop' ? 0.75 : 1; r.role = 'run';
      }
      // Apoyos: se recalculan cada poco (o si cambia la poseedora) y se mantienen entre medias
      if (!this.sup || this.sup.car !== car.pid || this.sup.until < P.t) this.sup = { car: car.pid, until: P.t + 0.6, pts: this._supportPts(att, car), ids: this.sup && this.sup.car === car.pid ? this.sup.ids : [] };
      const taken = new Set([car.pid]);
      const free = P.team(att).filter(a => a !== car && !P.isGK(a) && !a.role && !this.runs[a.pid] && (ph === 'build' || this.role(a).role !== 'CB'));
      this.sup.pts.forEach((pt, k) => {
        let m = this.sup.ids[k] != null ? free.find(a => a.pid === this.sup.ids[k] && !taken.has(a.pid)) : null;
        if (!m) {
          let best = null, bc = 1e9;
          for (const a of free) { if (taken.has(a.pid)) continue; const c = this.reach(a, pt.x, pt.y) + 0.05 * hyp(a.hx - pt.x, a.hy - pt.y); if (c < bc) { bc = c; best = a; } }
          m = best;
        }
        if (!m) return;
        taken.add(m.pid); this.sup.ids[k] = m.pid;
        m.tx = pt.x; m.ty = pt.y; m.run = 0.72; m.role = 'support';
      });
      if (!P.hold && P.t > this.runCheck) { this.runCheck = P.t + 0.4; this._maybeRun(att, car); }
    }

    /** Huecos para ofrecerse: con espacio, línea de pase limpia y, si puede ser, hacia delante. */
    _supportPts(i, car) {
      const P = this.P, opp = P.team(1 - i), dir = P.dir[i];
      const offX = this.offX[i];
      const here = threat(P.depth(i, car.x), P.lat(i, car.y));
      const cands = [];
      for (const r of [9, 13, 18, 24]) for (let k = -6; k <= 6; k++) {
        const ang = k * 0.42;
        const x = car.x + Math.cos(ang) * r * dir, y = car.y + Math.sin(ang) * r;
        if (x < 2 || x > L - 2 || y < 2 || y > Wd - 2) continue;
        if ((x - offX) * dir > -0.9) continue;
        let dmin = 99, lane = 99;
        for (const o of opp) { dmin = Math.min(dmin, hyp(o.x - x, o.y - y)); lane = Math.min(lane, segD(o.x, o.y, car.x, car.y, x, y)); }
        const sc = 0.5 * Math.min(dmin, 8) / 8 + 0.6 * clamp(lane / 3, 0, 1) + 3 * (threat(P.depth(i, x), P.lat(i, y)) - here) - (k === 0 && r === 9 ? 0.2 : 0);
        cands.push({ x, y, sc });
      }
      cands.sort((a, b) => b.sc - a.sc);
      const out = [];
      for (const c of cands) { if (out.every(o => hyp(o.x - c.x, o.y - c.y) > 9)) out.push(c); if (out.length >= (P.depth(i, car.x) > 50 ? 3 : 2)) break; }
      return out;
    }

    /** ¿Alguien arranca? Ruptura a la espalda, desdoble, llegada desde segunda línea o bajar a recibir. */
    _maybeRun(att, car) {
      const P = this.P, ph = this.phase[att], dir = P.dir[att];
      if (Object.keys(this.runs).length >= 2) return;
      const off = this.offD(att), cd = P.depth(att, car.x), cl = P.lat(att, car.y);
      const pr = this.pressOn(car);
      const mates = P.team(att).filter(a => a !== car && !P.isGK(a) && !this.runs[a.pid] && a.role !== 'receive');
      const start = (a, k, d, l, dur) => {
        const [tx, ty] = P.world(att, clamp(d, 2, L - 2), clamp(l, 2, Wd - 2));
        this.runs[a.pid] = { k, tx, ty, until: P.t + dur };
        if (!this.runSaid || P.t - this.runSaid > 4) { this.runSaid = P.t; this.say('run', { team: att, p: a.pid, kind: k }); }
      };
      // 1) Ruptura: arranca en línea (nunca adelantada) cuando la poseedora puede levantar la cabeza
      if (pr > 3.2 && off < 93 && cd < off - 5 && Math.random() < (ph === 'counter' ? 0.65 : 0.3)) {
        const cand = mates.filter(a => {
          const r = this.role(a).role, d = P.depth(att, a.x);
          return ATT_ROLES[r] >= 1.3 && d <= off + 0.1 && d > off - 7;
        }).sort((p, q) => ATT_ROLES[this.role(q).role] * (q.pace || 1) - ATT_ROLES[this.role(p).role] * (p.pace || 1));
        const a = cand[0];
        if (a) { const al = P.lat(att, a.y); start(a, 'behind', off + U.rand(8, 15), al + (CY - al) * 0.3 + U.rand(-4, 4), 2.6); return; }
      }
      // 2) Desdoble: el lateral pasa por fuera de la que lleva el balón en la banda
      const cr = this.role(car).role;
      if ((cr === 'W' || cr === 'WM') && cd > 45 && Math.random() < 0.35) {
        const s = cl < CY ? -1 : 1;
        const fb = mates.find(a => { const r = this.role(a); return (r.role === 'FB' || r.role === 'WB') && r.sgn === s && P.depth(att, a.x) < cd && hyp(a.x - car.x, a.y - car.y) < 22; });
        if (fb) { start(fb, 'overlap', Math.min(cd + 11, off - 0.5), s < 0 ? 3 : Wd - 3, 2.4); return; }
      }
      // 3) Llegada desde segunda línea al área cuando el balón está en tres cuartos
      if (cd > 66 && cd < 88 && Math.random() < 0.22) {
        const m = mates.find(a => ['CM', 'AM'].includes(this.role(a).role) && P.depth(att, a.x) < cd - 4);
        if (m) { start(m, 'late', Math.min(off - 0.5, 91), CY + U.rand(-6, 6), 2.4); return; }
      }
      // 4) La punta baja a recibir (y deja el hueco para otra)
      if (cd > 30 && cd < 62 && Math.random() < 0.14) {
        const st = mates.find(a => this.role(a).role === 'ST' && P.depth(att, a.x) > cd + 18);
        if (st) start(st, 'drop', cd + U.rand(9, 13), lerp(P.lat(att, st.y), cl, 0.4), 1.6);
      }
    }

    /** Durante una jugada preparada: quien tiene que llegar, llega. */
    _agendaTargets() {
      const ag = this.ag, P = this.P;
      if (!ag) return;
      const b = P.ball, car = b.owner != null ? P.A[b.owner] : null;
      // Quien prepara la jugada va a por el balón: la más cercana aprieta a la poseedora (y le gana el duelo)
      if (car && car.team !== ag.team && ag.forceOn != null) {
        const h = P.nearest(P.team(ag.team).filter(a => !P.isGK(a)), car);
        if (h) { h.tx = car.x; h.ty = car.y; h.run = 1; h.role = 'press'; }
      }
      // La que va a cometer la falta se va a por la poseedora
      if (ag.kind === 'foul' && car && car.team !== ag.foulTeam) {
        const f = P.A[ag.e.pid];
        if (f && f !== car) { f.tx = car.x - P.dir[car.team] * 0.6; f.ty = car.y; f.run = 1; f.role = 'press'; }
      }
      // La rematadora busca su sitio cuando el balón se acerca
      if (ag.kind === 'shot' && car && car.team === ag.team) {
        const s = P.A[ag.e.pid];
        if (s && s !== car && P.depth(ag.team, car.x) > 48 && !this.runs[s.pid]) {
          const [sx, sy] = ag.spot;
          if (P.depth(ag.team, sx) <= this.offD(ag.team) + 0.2 || P.depth(ag.team, car.x) > 70) { s.tx = sx; s.ty = sy; s.run = 0.9; s.role = 'run'; }
        }
      }
    }

    // ------------------------------------------------------------------ El balón
    /** Cada fotograma (desde la vista): duelos, balón suelto, saques y decisiones de la poseedora. */
    tick(dt) {
      const P = this.P, b = P.ball;
      // La posesión que cuenta para acercarse a la del motor es la del juego libre (ni escenas ni jugadas preparadas)
      if (!P.beat && !P.script.length) this.possT[this.attTeam()] += dt;
      if (P.hold || P.over || P.beat || P.script.length || P.fetch || P.place || b.path) return;
      if (this._outCheck()) return;
      if (b.owner == null) { this._loose(); return; }
      const c = P.A[b.owner];
      if (!c) { b.owner = null; return; }
      if (this._duel(c, dt)) return;
      if (this.ag && this.ag.forceOn === c.team) this.next = Math.min(this.next, this.ag.forceAt || P.t);
      if (P.t < this.next) return;
      this._decide(c);
    }

    /** Balón suelto: el primero que llega se lo queda. */
    _loose() {
      const P = this.P, b = P.ball;
      if (b.z > 1.4) return;
      const off = this.lastKick && P.t - this.lastKick.t < 4 && this.offAtKick ? this.offAtKick : null;
      let best = null, bd = 1.25;
      for (const id in P.A) { const a = P.A[id]; if (a.state === 'down' || a.state === 'sit' || (off && off.has(a.pid))) continue; const d = hyp(a.x - b.x, a.y - b.y); if (d < bd) { bd = d; best = a; } }
      if (best) { this._how = 'loose'; P._receive(best.pid); }
    }

    /** ¿Se ha ido fuera? Saque de banda, de puerta o córner, como manda el reglamento (lo saca el equipo que no la tocó). */
    _outCheck() {
      const P = this.P, b = P.ball;
      if (b.owner != null || b.path) return false;
      const outY = b.y < -0.2 || b.y > Wd + 0.2, outX = b.x < -0.2 || b.x > L + 0.2;
      if (!outX && !outY) return false;
      b.roll = null;
      const last = this.lastTouch;
      if (outY) { this._restart(1 - last, 'throw'); P._throwInAt(1 - last, clamp(b.x, 2, L - 2), b.y < CY); return true; }
      const defends = b.x < CY ? (P.dir[0] > 0 ? 0 : 1) : (P.dir[0] > 0 ? 1 : 0); // quién defiende esa portería
      if (last === defends) {
        // La tocó por última vez quien defiende: córner
        P.m.stats.corners[1 - defends]++;
        this._restart(1 - defends, 'corner');
        P._seq(P._cornerSetup(1 - defends, null).concat(P._cornerPlay(1 - defends)));
      } else { this._restart(defends, 'gk'); P._seq(P._goalKick(defends)); }
      return true;
    }
    _restart(team, kind) {
      const P = this.P;
      this.runs = {}; this.carry = null; this.passes = 0;
      this.restart = { team, kind, until: P.t + 8 };
      this.say('out', { team, kind });
    }

    /** Una falta del motor sin tarjeta: se hará en el próximo choque entre esos dos equipos (sin parar el reloj). */
    foulLater(e) { (this.fouls || (this.fouls = [])).push({ e, until: this.P.t + 7 }); }
    _foulNow(c) {
      const P = this.P;
      if (!this.fouls || !this.fouls.length || P.beat || P.script.length || P.queue.length) return false;
      this.fouls = this.fouls.filter(f => f.until > P.t && f.e.team !== c.team || f.e.team === c.team && f.until > P.t);
      const k = this.fouls.findIndex(f => f.e.team !== c.team);
      if (k < 0 || P.isGK(c)) return false;
      if (P.depth(c.team, c.x) > L - 17.5 && Math.abs(c.y - CY) < 21) return false;   // en el área sería penalti
      let o = null, od = 2.2;
      for (const a of P.team(1 - c.team)) { if (P.isGK(a) || a.state === 'down') continue; const d = hyp(a.x - c.x, a.y - c.y); if (d < od) { od = d; o = a; } }
      if (!o) return false;
      const f = this.fouls.splice(k, 1)[0];
      f.e.pid = o.pid; f.e.pid2 = c.pid; f.e.fromPlay = true;
      P.queue.unshift(f.e);
      return true;
    }

    /** La rival pegada intenta robar: entrada (limpia: las faltas las decide el motor) o se va de ella. */
    _duel(c, dt) {
      const P = this.P, i = c.team;
      if (this._foulNow(c)) return true;
      let o = null, od = 1.6;
      for (const a of P.team(1 - i)) {
        if (a.beat > P.t || a.state === 'down' || a.state === 'sit') continue;
        if (P.isGK(a) && P.depth(1 - i, c.x) > 17) continue;
        const d = hyp(a.x - c.x, a.y - c.y);
        if (d < od) { od = d; o = a; }
      }
      if (!o) return false;
      if (P.isGK(c) && c.held) return false;
      const T = this.teamInfo(1 - i);
      const box = P.depth(i, c.x) > 84 && Math.abs(c.y - CY) < 22 && !(this.ag && this.ag.team === i);
      const rate = (0.8 + T.press * 0.9) * (this.phase[1 - i] === 'counterpress' ? 1.5 : 1) * (box ? 1.6 : 1);
      if (Math.random() > rate * dt) return false;
      const sc = this.st(c), so = this.st(o);
      let pWin = sig((so[4] - (sc[3] * 0.7 + sc[5] * 0.3)) / 11 + 0.1 - this.gov(i) * 3 + this.gov(1 - i) * 3);
      if (box) pWin = 1 - (1 - pWin) * 0.6;
      const ag = this.ag;
      if (ag && ag.forceOn === i) pWin = 0.95;
      else if (ag && ag.team === i) pWin *= 0.15;
      const moving = hyp(c.vx, c.vy) > 2.2;
      if (Math.random() < pWin) {
        if (Math.random() < 0.3) { o.state = 'slide'; o.until = P.t + 0.5; }
        c.beat = P.t + 1.1;
        if (Math.random() < 0.65) { this._how = 'tackle'; this._howFrom = c.pid; P._receive(o.pid, true); }
        else {
          const b = P.ball; b.owner = null; this.lastTouch = 1 - i;
          b.roll = { vx: (o.x < c.x ? 1 : -1) * U.rand(1.5, 4), vy: U.rand(-3, 3) };
          this.say('tackle', { team: 1 - i, p: o.pid, o: c.pid, loose: true });
          this.carry = null;
        }
        return true;
      }
      o.beat = P.t + 1.0; o.vx *= 0.3; o.vy *= 0.3;
      this.say(moving ? 'dribble' : 'shield', { team: i, p: c.pid, o: o.pid });
      if (moving) this.next = Math.min(this.next, P.t + 0.2);
      return false;
    }

    /** Lo que llega: primer control, cambio de posesión y narración. */
    received(a, force) {
      const P = this.P, team = a.team;
      const scripted = !!(P.beat || P.script.length);
      const prev = this.ownTeam;
      const lk = this.lastKick;
      this.lastTouch = team;
      this.carry = null; this.holdN = 0;
      if (prev != null && prev !== team) {
        this.lost[prev] = P.t; this.won[team] = P.t; this.wonD[team] = P.depth(team, a.x);
        this.passes = 0; this.runs = {}; this.sup = null;
        if (!scripted && !this.restart) {
          const how = this._how || (lk && lk.team !== team && P.t - lk.t < 4 ? 'intercept' : 'loose');
          this.say('poss', { team, p: a.pid, how, o: this._howFrom != null ? this._howFrom : lk ? lk.from : null, d: P.depth(team, a.x) });
        }
      } else if (lk && lk.to === a.pid && lk.team === team && P.t - lk.t < 5) {
        this.passes++;
        if (this.passes === 8 || this.passes === 14) this.say('keep', { team, n: this.passes });
      } else if (this._how === 'loose' && !scripted && this.badBy !== a.pid) this.say('loose', { team, p: a.pid });
      this.badBy = null;
      this._how = null; this._howFrom = null;
      this.ownTeam = team;
      this.carryN = 0;
      if (this.restart && this.restart.team === team && this.restart.kind !== 'gk') this.restart = null;
      if (scripted || P.instant) { this.next = P.t + 0.5; return; }
      if (this.restart && this.restart.kind === 'gk' && this.restart.team === team && !P.isGK(a)) this.restart = null;
      // Despeje de cabeza tras un centro o un balón largo que cae en el área propia
      const pr = this.pressOn(a);
      if (!force && lk && lk.team !== team && (lk.type === 'cross' || lk.type === 'long') && P.t - lk.t < 3.5 && P.depth(team, a.x) < 30 && !P.isGK(a)) { this.mustClear = a.pid; this.mustHead = (lk.h || 0) > 1.5; this.next = P.t + 0.05; return; }
      // Primer control: con presión y si la técnica no acompaña, se escapa
      const sc = this.st(a);
      const bad = clamp(0.03 + (62 - sc[3]) / 420 + (pr < 1.8 ? 0.07 : 0) + (lk && lk.h > 1.5 ? 0.06 : 0), 0.01, 0.22);
      if (!P.isGK(a) && !force && Math.random() < bad) {
        const b = P.ball, ang = Math.random() * 6.283;
        b.owner = null; b.roll = { vx: Math.cos(ang) * U.rand(2.5, 4.5), vy: Math.sin(ang) * U.rand(2.5, 4.5) };
        this.badBy = a.pid;
        this.say('badtouch', { team, p: a.pid });
        return;
      }
      this.next = P.t + clamp(0.32 + Math.random() * 0.35 + (pr < 2 ? -0.12 : 0.1) - (sc[2] - 60) / 450, 0.18, 0.9);
    }

    // ------------------------------------------------------------------ Decidir
    _decide(c) {
      const P = this.P, i = c.team, T = this.teamInfo(i);
      const b = P.ball, opp = P.team(1 - i), mates = P.team(i).filter(a => a !== c && a.state !== 'down');
      const cd = P.depth(i, c.x), cl = P.lat(i, c.y);
      const sc = this.st(c), gk = P.isGK(c);
      const pas = sc[2], reg = gk ? 35 : sc[3];
      const pr = this.pressOn(c);
      const lossK = 0.04 + T.short * 0.08;
      const lossAt = (x, y) => lossK + 0.8 * threat(P.depth(1 - i, x), P.lat(1 - i, y));
      const here = threat(cd, cl);
      const ag = this.ag;
      const forced = ag && ag.forceOn === i;          // tiene que perderla (se prepara una jugada del rival)
      const favored = ag && ag.team === i;            // está preparando una jugada: busca la zona
      const opts = [];
      // Despeje obligado (cabezazo tras un centro)
      if (this.mustClear === c.pid) { this.mustClear = null; this._clear(c, this.mustHead !== false); this.mustHead = null; return; }
      // 1) Pases
      for (const r of mates) {
        if (this.offside(i, r) && !(this.runs[r.pid] && this.runs[r.pid].k === 'behind' && P.depth(i, r.x) <= this.offD(i) + 0.25)) continue;
        const o = this._passOpt(c, r, { pas, pr, lossAt, cd, cl, T, i, opp, gk });
        if (o) opts.push(o);
      }
      // 2) Conducir
      if (!gk || pr > 6) for (const ang of [0, 0.55, -0.55, 1.05, -1.05]) {
        const dir = P.dir[i];
        const len = gk ? 3 : 7;
        const tx = c.x + Math.cos(ang) * len * dir, ty = c.y + Math.sin(ang) * len;
        if (tx < 1 || tx > L - 1 || ty < 1.2 || ty > Wd - 1.2) continue;
        let m = 9;
        for (const o of opp) for (const s of [0.35, 0.7, 1]) m = Math.min(m, this.reach(o, lerp(c.x, tx, s), lerp(c.y, ty, s), 0.2) - len * s / 5.2);
        const pKeep = clamp(sig(m / 0.3 + 0.9) * (0.86 + reg / 700), 0.04, 0.985);
        const td = P.depth(i, tx), tl = P.lat(i, ty);
        let v = pKeep * threat(td, tl) - (1 - pKeep) * lossAt(c.x, c.y) - 0.012 - 0.024 * (this.carryN || 0) - (Math.abs(ang) > 0.8 ? 0.008 : 0);
        if (favored) v += 0.02 * Math.max(0, td - cd) / 7;
        opts.push({ k: 'carry', tx, ty, v, ang });
      }
      // 3) Regate: una rival delante, y espacio detrás de ella
      const o0 = this.nearestOpp(c);
      if (o0 && !gk && hyp(o0.x - c.x, o0.y - c.y) < 3.6 && P.depth(i, o0.x) >= cd - 0.5) {
        const so = this.st(o0), dir = P.dir[i];
        const crowd = opp.filter(o => hyp(o.x - c.x, o.y - c.y) < 5.5).length - 1;
        const pD = clamp(sig((reg - so[4]) / 10 + 0.1 - crowd * 0.55), 0.05, 0.9);
        const tx = clamp(o0.x + dir * 4, 1, L - 1), ty = clamp(c.y + (c.y - o0.y) * 0.8, 1.5, Wd - 1.5);
        let v = pD * (threat(P.depth(i, tx), P.lat(i, ty)) + 0.03) - (1 - pD) * lossAt(c.x, c.y);
        if (favored) v += 0.03;
        opts.push({ k: 'dribble', tx, ty, v, o: o0 });
      }
      // 4) Centro desde la banda en tres cuartos
      if (!gk && cd > 76 && Math.abs(cl - CY) > 16) {
        const box = mates.filter(a => P.depth(i, a.x) > 84 && Math.abs(a.y - CY) < 13).length;
        const defs = opp.filter(a => P.depth(i, a.x) > 86 && Math.abs(a.y - CY) < 14).length;
        if (box) opts.push({ k: 'cross', v: 0.06 + 0.035 * box - 0.012 * defs + (favored && ag.kind === 'shot' && ag.origin === 'cross' ? 0.4 : 0) });
      }
      // 5) Despejar (en su área y apretada) — o la portera en largo
      if ((cd < 24 && pr < 1.6 && !gk) || gk) {
        const v = gk ? 0.012 + (1 - T.short) * 0.05 + (pr < 5 ? 0.05 : 0) : 0.02 + 0.35 * lossAt(c.x, c.y) * (pr < 1.5 ? 1 : 0.4);
        opts.push({ k: 'clear', v });
      }
      // 6) Aguantar y esperar apoyos
      const pHold = pr > 4 ? 0.97 : pr > 2.2 ? 0.85 : 0.6;
      opts.push({ k: 'hold', v: pHold * here - (1 - pHold) * lossAt(c.x, c.y) - 0.01 - 0.01 * this.holdN - (favored ? 0.05 : 0) });
      // Elegir: las buenas eligen casi siempre lo mejor; las demás, a veces otra cosa
      const skill = (pas + reg) / 198;
      const tau = 0.008 + 0.02 * (1 - skill);
      let pick;
      if (forced) pick = opts.filter(o => o.k === 'pass' && o.pInt > 0.15).sort((p, q) => q.v - p.v)[0] || opts.filter(o => o.k === 'pass').sort((p, q) => q.pInt - p.pInt)[0] || opts[0];
      else {
        const mx = Math.max(...opts.map(o => o.v));
        pick = U.weighted(opts, o => Math.exp((o.v - mx) / tau));
      }
      if (!pick) { this.next = P.t + 0.4; return; }
      switch (pick.k) {
        case 'pass': this._pass(c, pick, forced); break;
        case 'carry': this._carry(c, pick); break;
        case 'dribble': this._carry(c, Object.assign({}, pick, { dribble: true })); break;
        case 'cross': this._cross(c); break;
        case 'clear': this._clear(c, false); break;
        default: this.holdN++; this.next = P.t + U.rand(0.35, 0.7);
      }
    }

    /** Valoración de un pase (al pie, al espacio o por alto): probabilidad de que llegue × lo que vale. */
    _passOpt(c, r, k) {
      const P = this.P, i = k.i, dir = P.dir[i];
      const run = this.runs[r.pid];
      let tx = r.x + r.vx * 0.45, ty = r.y + r.vy * 0.45, type = 'short';
      if (run && run.k === 'behind') {
        type = 'through';
        const rl = hyp(run.tx - r.x, run.ty - r.y) || 1, v = this.vmax(r) * 0.92;
        let T = 0.12 + hyp(run.tx - c.x, run.ty - c.y) / 17;
        for (let k = 0; k < 2; k++) {
          const go = Math.min(rl + 3, v * T + 1.5);
          tx = r.x + (run.tx - r.x) / rl * go; ty = r.y + (run.ty - r.y) / rl * go;
          T = 0.12 + hyp(tx - c.x, ty - c.y) / 17;
        }
      }
      else if (run && run.k === 'overlap') { tx = lerp(r.x, run.tx, 0.6); ty = lerp(r.y, run.ty, 0.6); }
      tx = clamp(tx, 0.8, L - 0.8); ty = clamp(ty, 0.8, Wd - 0.8);
      const dist = hyp(tx - c.x, ty - c.y);
      if (dist < 4.5 || dist > (k.gk ? 70 : 58)) return null;
      const td = P.depth(i, tx), tl = P.lat(i, ty);
      // No se le da a la portera desde lejos ni con rivales encima
      const rGK = P.isGK(r);
      if (rGK && (dist > 34 || k.pr > 4)) return null;
      // ¿Raso o por alto? Por alto si es largo o hay alguien en la línea de pase
      let lane = 99;
      for (const o of k.opp) { if (hyp(o.x - tx, o.y - ty) < 3) continue; lane = Math.min(lane, segD(o.x, o.y, c.x, c.y, tx, ty)); }
      const lofted = dist > 34 || (lane < 1.5 && dist > 15);
      const h = lofted ? clamp(dist * 0.12, 2.5, 9) : 0.05;
      const Tt = lofted ? 0.6 + dist / 26 : 0.12 + dist / 17;
      // ¿Quién puede cortarlo? (reacción según su defensa, arrancada y velocidad). Al área, sin remate del motor, cuesta más
      const intoBox = td > 86 && Math.abs(ty - CY) < 20 && !(this.ag && this.ag.team === i);
      const gb = this.gov(i) - (intoBox ? 0.14 : 0);
      let pInt = 0, cut = null, cutM = 9;
      for (const o of k.opp) {
        if (P.isGK(o) && !(P.depth(1 - i, tx) < 16.5 && Math.abs(ty - CY) < 20)) continue;
        const react = clamp(0.44 - (this.st(o)[4] - 40) / 280, 0.22, 0.44);
        let best = 9, bs = 1;
        for (let s = 0.12; s <= 1.0001; s += 0.11) {
          if (lofted && s > 0.1 && s < 0.82) continue;
          const qx = lerp(c.x, tx, s), qy = lerp(c.y, ty, s);
          const m = this.reach(o, qx, qy, react) - Tt * s;
          if (m < best) { best = m; bs = s; }
        }
        const p = sig(-(best + gb) / 0.18);
        pInt = 1 - (1 - pInt) * (1 - p);
        if (best < cutM) { cutM = best; cut = { o, s: bs }; }
      }
      // ¿Llega antes la receptora que la rival más rápida al punto?
      const tR = this.reach(r, tx, ty, 0.1);
      let tO = 9, duel = null;
      for (const o of k.opp) { const t = this.reach(o, tx, ty, 0.25); if (t < tO) { tO = t; duel = o; } }
      const pRec = sig((tO - Math.max(Tt, tR) + gb) / 0.3 + (lofted ? 0 : 0.5));
      const pAcc = clamp(0.99 - dist * 0.0028 * (1.25 - k.pas / 99) - (lofted ? 0.05 : 0) - (k.pr < 1.8 ? 0.06 : 0), 0.55, 0.995);
      let pOk = (1 - pInt) * pRec * pAcc;
      const ag = this.ag;
      if (ag && ag.team === i) pOk = 1 - (1 - pOk) * 0.15;
      const mx = (c.x + tx) / 2, my = (c.y + ty) / 2;
      const room = Math.min(8, tO - Tt > 0 ? (tO - Tt) * 5 : 0);
      let v = pOk * (threat(td, tl) + 0.012 + 0.014 * k.T.short + 0.0025 * room) - (1 - pOk) * k.lossAt(mx, my);
      // Extras: romper líneas, receptora libre, cambio de orientación, estilo, paciencia
      let broken = 0;
      for (const o of k.opp) { const od = P.depth(i, o.x); if (od > k.cd + 1 && od < td - 1 && Math.abs(o.y - ty) < 22) broken++; }
      v += 0.01 * Math.min(4, broken);
      if (tO - Tt > 1.2) v += 0.008;
      const sw = Math.abs(tl - k.cl) > 26;
      if (sw) v += 0.018 * k.T.width;
      if (dist > 30) v -= 0.03 * k.T.short;
      if (td - k.cd > 22) v += 0.03 * (1 - k.T.short);
      if (td < k.cd - 3) v -= rGK ? (k.pr < 2 ? -0.01 : 0.03) : 0.004;
      if (type === 'through') v += 0.03;
      if (ag && ag.team === i) {
        v += 0.05 * Math.max(0, td - k.cd) / 20;
        if (ag.want && ag.want.includes(r.pid)) v += 0.04;
      }
      if (lofted && type !== 'through') type = sw ? 'switch' : 'long';
      else if (type === 'short') type = td < k.cd - 3 ? 'back' : sw ? 'switch' : broken >= 2 && td - k.cd > 10 ? 'prog' : (Math.abs(tl - CY) > 24 && Math.abs(k.cl - CY) < 20) ? 'wide' : 'short';
      if (k.gk) type = lofted ? 'gklong' : 'gkshort';
      return { k: 'pass', r, tx, ty, h, Tt, lofted, pInt, pRec, pAcc, pOk, v, type, cut, duel, dist };
    }

    _pass(c, o, forced) {
      const P = this.P, i = c.team;
      let tx = o.tx, ty = o.ty, to = o.r.pid, what = 'ok', T = null;
      const roll = Math.random();
      if (this.ag && this.ag.team === i) { o = Object.assign({}, o, { pAcc: 1 - (1 - o.pAcc) * 0.3, pInt: o.pInt * 0.12, pRec: 1 - (1 - o.pRec) * 0.12 }); }
      if (forced) {
        // Se prepara una jugada del rival: este pase lo corta quien mejor colocada esté
        const ag = this.ag, cand = P.team(1 - i).filter(a => !P.isGK(a));
        let best = null, bs = 0, bm = 1e9;
        for (const a of cand) for (let s = 0.25; s <= 0.95; s += 0.1) {
          const m = this.reach(a, lerp(c.x, tx, s), lerp(c.y, ty, s), 0.2) - o.Tt * s;
          if (m < bm) { bm = m; best = a; bs = s; }
        }
        if (best) {
          // punto de la línea de pase más cercano a ella; el balón llega justo cuando ella
          const vx = tx - c.x, vy = ty - c.y, vv = vx * vx + vy * vy || 1;
          const k = clamp(((best.x - c.x) * vx + (best.y - c.y) * vy) / vv, 0.2, 0.95);
          tx = c.x + vx * k; ty = c.y + vy * k; to = best.pid; what = 'cut';
          const d = hyp(tx - c.x, ty - c.y);
          T = Math.max(0.12 + d / 17, this.reach(best, tx, ty, 0.15) + 0.05);
        }
        if (ag) ag.forceOn = null;
      } else if (roll > o.pAcc) {
        const err = U.rand(1.8, 4.5) * (o.lofted ? 1.3 : 1), ang = Math.random() * 6.283;
        tx += Math.cos(ang) * err; ty += Math.sin(ang) * err; to = null; what = 'bad';
        // Un mal pase de quien defiende no se va por su propia línea de fondo
        if (P.depth(i, tx) < 0.5) tx = P.world(i, 1.5, 0)[0];
      } else if (Math.random() < o.pInt && o.cut) {
        tx = lerp(c.x, tx, o.cut.s); ty = lerp(c.y, ty, o.cut.s); to = o.cut.o.pid; what = 'cut';
      } else if (Math.random() > o.pRec && o.duel) { to = o.duel.pid; what = 'duel'; }
      this.lastKick = { team: i, from: c.pid, to: o.r.pid, type: o.type, what, t: P.t, h: o.h };
      this.kickTeam = i; this.lastTouch = i; this.restart = null;
      if (c.held) c.held = false;
      this.offAtKick = new Set(P.team(i).filter(a => a !== c && this.offside(i, a)).map(a => a.pid));
      this.carry = null; this.next = P.t + 99;
      P._kick(tx, ty, { h: o.h, to, T: T || undefined, done: to == null ? () => this._landed() : null });
      this.say('pass', { team: i, p: c.pid, q: o.r.pid, type: o.type, d: P.depth(i, o.tx), lat: P.lat(i, o.ty) });
    }

    _carry(c, o) {
      const P = this.P, i = c.team;
      this.carryN = (this.carryN || 0) + 1;
      const dur = o.dribble ? 0.8 : U.rand(0.6, 1.1);
      this.carry = { pid: c.pid, tx: o.tx, ty: o.ty, run: o.dribble ? 0.95 : 0.78, until: P.t + dur };
      this.next = P.t + dur * 0.8;
      this.holdN = 0;
      const cd = P.depth(i, c.x), td = P.depth(i, o.tx);
      if (o.dribble) return;           // el duelo lo cuenta si sale bien o mal
      if (td - cd > 4 && (cd < L / 2 && td >= L / 2 || Math.random() < 0.3)) this.say('carry', { team: i, p: c.pid, half: cd < L / 2 && td >= L / 2, wide: Math.abs(P.lat(i, o.ty) - CY) > 22 });
    }

    _cross(c) {
      const P = this.P, i = c.team, opp = 1 - i;
      const side = P.lat(i, c.y) < CY ? -1 : 1;
      // Al primer palo, al segundo o atrás (pase de la muerte)
      const kind = U.weighted(['near', 'far', 'back'], k => ({ near: 1, far: 0.9, back: 0.5 })[k]);
      const [tx, ty] = kind === 'near' ? P.world(i, 98, CY + side * 4) : kind === 'far' ? P.world(i, 96, CY - side * 7) : P.world(i, 90, CY - side * 2);
      // ¿Quién la gana? La portera si cae en su área pequeña, si no el mejor colocado (las defensas lo tienen más fácil)
      const offNow = new Set(P.team(i).filter(a => a !== c && this.offside(i, a)).map(a => a.pid));
      const near = Object.values(P.A).filter(a => a.state !== 'down' && !offNow.has(a.pid) && hyp(a.x - tx, a.y - ty) < 7);
      let win = null;
      const gk = P.gkOf(opp);
      if (gk && kind !== 'back' && hyp(gk.x - tx, gk.y - ty) < 7.5 && Math.random() < 0.35) win = gk;
      else if (near.length) win = U.weighted(near, a => (a.team === opp ? 2.2 : 1) * (0.4 + this.st(a)[5] / 100) / (0.6 + hyp(a.x - tx, a.y - ty)));
      this.lastKick = { team: i, from: c.pid, to: win ? win.pid : null, type: 'cross', what: win && win.team === opp ? 'cut' : 'ok', t: P.t, h: 4 };
      this.offAtKick = new Set(P.team(i).filter(a => a !== c && this.offside(i, a)).map(a => a.pid));
      this.kickTeam = i; this.lastTouch = i;
      this.carry = null; this.next = P.t + 99;
      if (kind === 'back') P._kick(tx, ty, { h: 0.05, to: win ? win.pid : null, done: win ? null : () => this._landed() });
      else P._kick(tx, ty, { h: 4.2, T: 1.0, to: win ? win.pid : null, done: win ? () => { if (win.team === opp && P.isGK(win)) { this._how = 'catch'; P._receive(win.pid, true); win.held = true; } else P._receive(win.pid); } : () => this._landed() });
      this.say('pass', { team: i, p: c.pid, q: win ? win.pid : null, type: kind === 'back' ? 'cutback' : 'cross' });
    }

    _clear(c, header) {
      const P = this.P, i = c.team;
      const gk = P.isGK(c);
      // Lejos y hacia una banda (o a la punta si es la portera): que no vuelva
      const fw = P.team(i).filter(a => ['ST', 'W', 'WM', 'AM'].includes(this.role(a).role));
      const tgt = gk && fw.length ? U.pick(fw) : null;
      let d = P.depth(i, c.x) + U.rand(header ? 14 : 28, header ? 24 : 45);
      let l = tgt ? P.lat(i, tgt.y) + U.rand(-5, 5) : (P.lat(i, c.y) < CY ? U.rand(2, 22) : U.rand(46, 66));
      if (tgt) d = Math.min(Math.max(d, P.depth(i, tgt.x)), 82);
      const [tx, ty] = P.world(i, clamp(d, 10, 92), clamp(l, -1, Wd + 1));
      if (c.held) c.held = false;
      this.lastKick = { team: i, from: c.pid, to: null, type: gk ? 'gklong' : 'clear', what: 'ok', t: P.t, h: 6 };
      this.kickTeam = i; this.lastTouch = i; this.restart = null;
      this.offAtKick = new Set(P.team(i).filter(a => a !== c && this.offside(i, a)).map(a => a.pid));
      this.carry = null; this.next = P.t + 99;
      const dist = hyp(tx - c.x, ty - c.y);
      P._kick(tx, ty, { h: clamp(dist * 0.18, 4, 11), done: () => this._landed(true) });
      this.say('pass', { team: i, p: c.pid, q: null, type: gk ? 'gklong' : header ? 'head' : 'clear' });
    }

    /** El balón cae sin dueña: si cae entre varias, se lo queda quien gana la disputa (por arriba). */
    _landed(aerial) {
      const P = this.P, b = P.ball;
      b.z = 0;
      if (b.y < -0.2 || b.y > Wd + 0.2 || b.x < -0.2 || b.x > L + 0.2) return; // fuera: lo verá _outCheck
      const off = this.offAtKick || new Set();
      this.offAtKick = null;
      const near = Object.values(P.A).filter(a => a.state !== 'down' && !off.has(a.pid) && hyp(a.x - b.x, a.y - b.y) < 3.2);
      if (!near.length) return;
      const w = U.weighted(near, a => (0.5 + this.st(a)[5] / 100) / (0.5 + hyp(a.x - b.x, a.y - b.y)));
      if (aerial && near.length > 1) { w.jump = P.t; this.say('aerial', { team: w.team, p: w.pid }); }
      this._how = 'loose';
      P._receive(w.pid);
    }

    // ------------------------------------------------------------------ Jugadas del motor que nacen del juego
    _leadKind(e) {
      switch (e.type) {
        case 'goal': case 'save': case 'miss': case 'disallowed':
          if (e.kind === 'pen' || e.kind === 'fk') return null;
          return (e.origin || 'open') === 'corner' ? 'corner' : 'shot';
        case 'corner': return 'corner';
        case 'foul': case 'yellow': case 'red': return 'foul';
        case 'pen': case 'refmiss': return 'box';
        case 'fk': return 'fk';
        case 'offside': return 'off';
        default: return null;
      }
    }
    /** Mientras se prepara la jugada del motor (el reloj espera). Devuelve false cuando ya se puede escenificar. */
    leading(e) {
      const P = this.P;
      const kind = this._leadKind(e);
      if (!kind || P.instant || P.over || !P.A || !Object.keys(P.A).length) { this.ag = null; return false; }
      if (!this.ag || this.ag.e !== e) this.ag = this._agenda(e, kind);
      const ag = this.ag;
      if (!ag) return false;
      if (P.hold) return true;
      ag.T += this.dt;
      const ready = this._agReady(ag);
      if (ready || ag.T > ag.max) {
        this.ag = null;
        e.fromPlay = ready || this._agClose(ag);
        if (!e.fromPlay) e.fromPlay = this._agCut(ag);
        if (e.fromPlay && ag.kind === 'foul') this._agFoulVictim(ag);
        return false;
      }
      // Si la tiene el otro equipo, la pierde enseguida (corte o entrada)
      const b = P.ball, car = b.owner != null ? P.A[b.owner] : null;
      if (car && car.team !== ag.team && !b.path) {
        if (ag.forceOn !== car.team) { ag.forceOn = car.team; ag.forceAt = P.t + U.rand(1.8, 2.6); }
      } else ag.forceOn = null;
      return true;
    }
    _agenda(e, kind) {
      const P = this.P;
      const team = kind === 'foul' ? 1 - e.team : e.team;    // quién tiene que tener el balón
      if (team == null || team < 0) return null;
      const ag = { e, kind, team, T: 0, max: { shot: 6, corner: 5.5, foul: 4, box: 6, fk: 5, off: 4 }[kind] || 5, want: [] };
      if (kind === 'shot') {
        ag.origin = e.origin || 'open';
        ag.spot = P._shotSpot(team, e.shotType || 'placed');
        ag.want = [e.pid2, e.pid].filter(x => x != null && P.A[x]);
      }
      if (kind === 'foul') {
        ag.foulTeam = e.team;
        const f = P.A[e.pid];
        const named = e.pid2 != null && P.A[e.pid2] && e.text && e.text.indexOf(P.P(e.pid2).short) >= 0;
        if (!named && f) { const v = P.nearest(P.team(team).filter(a => !P.isGK(a)), f); if (v) e.pid2 = v.pid; }
        if (e.pid2 != null && P.A[e.pid2]) ag.want = [e.pid2];
      }
      if (kind === 'box') ag.want = [e.pid].filter(x => x != null && P.A[x]);
      if (kind === 'off') ag.want = [];
      return ag;
    }
    _agReady(ag) {
      const P = this.P, b = P.ball;
      if (b.path || P.fetch || P.place) return false;
      const car = b.owner != null ? P.A[b.owner] : null;
      if (!car || car.team !== ag.team) return false;
      const d = P.depth(ag.team, car.x), l = P.lat(ag.team, car.y);
      switch (ag.kind) {
        case 'shot': {
          const o = ag.origin;
          if (o === 'counter') return ag.T > 0.6 && d > 40;
          if (o === 'cross') return (d > 58 && Math.abs(l - CY) > 15) || d > 68;
          if (o === 'long') return d > 48;
          return d > 52;
        }
        case 'corner': return d > 62;
        case 'box': return d > 72;
        case 'fk': return d > 58;
        case 'off': return d > 35;
        case 'foul': {
          const f = P.A[ag.e.pid];
          if (!f) return false;
          const dd = hyp(f.x - car.x, f.y - car.y);
          return dd < 4 || (ag.T > 1.6 && dd < 12);
        }
      }
      return false;
    }
    /** Se acabó el tiempo de preparación: ¿está la jugada lo bastante cerca como para nacer del juego igualmente? */
    _agClose(ag) {
      const P = this.P, b = P.ball;
      if (b.path || P.fetch || P.place) return false;
      const car = b.owner != null ? P.A[b.owner] : null;
      if (!car || car.team !== ag.team) return false;
      const d = P.depth(ag.team, car.x);
      if (ag.kind === 'foul') { const f = P.A[ag.e.pid]; return !!f && hyp(f.x - car.x, f.y - car.y) < 18; }
      return d > ({ shot: 50, corner: 60, box: 62, fk: 55, off: 30 }[ag.kind] || 50);
    }
    /** No ha dado tiempo: corte de realización al momento de la jugada (destello, como en la tele). */
    _agCut(ag) {
      const P = this.P, e = ag.e, i = ag.team, side = Math.random() < 0.5 ? -1 : 1;
      const want = ag.want.map(pid => P.A[pid]).find(a => a && !P.isGK(a));
      switch (ag.kind) {
        case 'shot': {
          const o = ag.origin;
          const d = o === 'cross' ? 80 : o === 'long' ? 64 : o === 'counter' ? 56 : 70;
          const l = o === 'cross' ? CY + side * 26 : CY + side * U.rand(4, 14);
          const who = o === 'cross' ? null : want && want.pid !== e.pid ? want : null;
          return P._cutTo(i, d, l, who ? who.pid : null);
        }
        case 'box': return P._cutTo(i, 80, CY + side * U.rand(4, 12), want ? want.pid : e.pid);
        case 'fk': return P._cutTo(i, 74, CY + side * U.rand(2, 14), null);
        case 'corner': return P._cutTo(i, 82, CY + side * 24, null);
        case 'off': return P._cutTo(i, 52, CY + side * U.rand(4, 18), null);
        case 'foul': {
          const f = P.A[e.pid];
          if (!f) return false;
          return P._cutTo(i, clamp(P.depth(i, f.x) + 1.8, 3, L - 3), clamp(P.lat(i, f.y), 3, Wd - 3), want ? want.pid : null);
        }
      }
      return false;
    }
    /** La falta se la hacen a quien lleva el balón (si el motor no nombró a nadie en el texto). */
    _agFoulVictim(ag) {
      const P = this.P, e = ag.e, car = P.A[P.ball.owner];
      if (!car || car.team === e.team) return;
      const named = e.pid2 != null && e.text && e.text.indexOf(P.P(e.pid2).short) >= 0;
      if (!named) e.pid2 = car.pid;
    }
    /** Acaba una escena del guion (o un salto de tiempo): el juego sigue con quien tenga el balón. */
    afterScript(reseat) {
      const P = this.P, b = P.ball;
      const car = b.owner != null ? P.A[b.owner] : null;
      if (car) { this.ownTeam = car.team; this.lastTouch = car.team; }
      this.runs = {}; this.carry = null; this.sup = null;
      this.next = P.t + (reseat ? 0.6 : 0.35);
      if (reseat) { this.lineS = [null, null]; this.ag = null; this.restart = null; }
    }
    /** A quién saca de banda: una compañera cerca y libre, mejor hacia delante. */
    throwTarget(taker) {
      const P = this.P, i = taker.team;
      let best = null, bv = -1e9;
      for (const a of P.team(i)) {
        if (a === taker || P.isGK(a)) continue;
        const d = hyp(a.x - taker.x, a.y - taker.y);
        if (d < 5 || d > 24) continue;
        const free = this.pressOn(a);
        const v = Math.min(free, 7) * 0.5 + (P.depth(i, a.x) - P.depth(i, taker.x)) * 0.08 - d * 0.05 + Math.random();
        if (v > bv) { bv = v; best = a; }
      }
      return best;
    }
    /** Fin de la jugada (saque, falta, gol…): lo que estaba en marcha se olvida. */
    reset() { this.runs = {}; this.carry = null; this.sup = null; this.mustClear = null; this.next = this.P.t + 0.4; }
    /** Reanudación tras un saque: quien saca decide. */
    restartBy(team, kind) { this.ownTeam = team; this.lastTouch = team; this.reset(); this.restart = { team, kind, until: this.P.t + (kind === 'gk' ? 6 : 3) }; }
  }

  TL.Brain2D = Brain;
  TL.Brain2D.threat = threat;
})();
