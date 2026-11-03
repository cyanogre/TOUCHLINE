/* TOUCHLINE — formaciones, alineaciones y motor de partidos */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U;

  // [posición, x (0 izq – 100 der), y (0 portería propia – 100 rival)]
  const BACK4 = [['RB', 85, 27], ['CB', 62, 20], ['CB', 38, 20], ['LB', 15, 27]];
  const FORMATIONS = {
    '4-3-3': [['GK', 50, 6], ...BACK4, ['CM', 70, 50], ['CDM', 50, 41], ['CM', 30, 50], ['RW', 82, 75], ['ST', 50, 84], ['LW', 18, 75]],
    '4-4-2': [['GK', 50, 6], ...BACK4, ['RM', 85, 54], ['CM', 62, 48], ['CM', 38, 48], ['LM', 15, 54], ['ST', 62, 81], ['ST', 38, 81]],
    '4-2-3-1': [['GK', 50, 6], ...BACK4, ['CDM', 62, 41], ['CDM', 38, 41], ['RW', 82, 66], ['CAM', 50, 63], ['LW', 18, 66], ['ST', 50, 85]],
    '4-1-2-1-2': [['GK', 50, 6], ...BACK4, ['CDM', 50, 39], ['CM', 72, 52], ['CM', 28, 52], ['CAM', 50, 64], ['ST', 62, 84], ['ST', 38, 84]],
    '4-5-1': [['GK', 50, 6], ...BACK4, ['RM', 85, 57], ['CM', 66, 50], ['CDM', 50, 41], ['CM', 34, 50], ['LM', 15, 57], ['ST', 50, 84]],
    '3-5-2': [['GK', 50, 6], ['CB', 72, 21], ['CB', 50, 18], ['CB', 28, 21], ['RM', 88, 54], ['CM', 66, 50], ['CDM', 50, 40], ['CM', 34, 50], ['LM', 12, 54], ['ST', 62, 82], ['ST', 38, 82]],
    '3-4-3': [['GK', 50, 6], ['CB', 72, 21], ['CB', 50, 18], ['CB', 28, 21], ['RM', 87, 52], ['CM', 62, 47], ['CM', 38, 47], ['LM', 13, 52], ['RW', 80, 77], ['ST', 50, 85], ['LW', 20, 77]],
    '5-3-2': [['GK', 50, 6], ['RB', 88, 32], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20], ['LB', 12, 32], ['CM', 70, 52], ['CM', 50, 46], ['CM', 30, 52], ['ST', 62, 80], ['ST', 38, 80]]
  };

  const COMPAT = {
    GK: { GK: 1 },
    CB: { CB: 1, CDM: 0.88, RB: 0.85, LB: 0.85 },
    RB: { RB: 1, LB: 0.88, RM: 0.86, CB: 0.85, RW: 0.78 },
    LB: { LB: 1, RB: 0.88, LM: 0.86, CB: 0.85, LW: 0.78 },
    CDM: { CDM: 1, CM: 0.94, CB: 0.87, CAM: 0.82 },
    CM: { CM: 1, CDM: 0.94, CAM: 0.94, RM: 0.85, LM: 0.85 },
    CAM: { CAM: 1, CM: 0.93, ST: 0.87, RW: 0.87, LW: 0.87 },
    RM: { RM: 1, RW: 0.94, LM: 0.88, CM: 0.86, RB: 0.84, CAM: 0.84 },
    LM: { LM: 1, LW: 0.94, RM: 0.88, CM: 0.86, LB: 0.84, CAM: 0.84 },
    RW: { RW: 1, RM: 0.94, LW: 0.9, ST: 0.87, CAM: 0.87 },
    LW: { LW: 1, LM: 0.94, RW: 0.9, ST: 0.87, CAM: 0.87 },
    ST: { ST: 1, CAM: 0.87, RW: 0.86, LW: 0.86 }
  };

  function fit(p, slot) {
    if (p.pos === slot) return 1;
    if (slot === 'GK' || p.pos === 'GK') return 0.25;
    let f = COMPAT[slot][p.pos] || (F.LINE[p.pos] === F.LINE[slot] ? 0.8 : 0.6);
    if (p.alt.includes(slot)) f = Math.max(f, 0.96);
    return f;
  }

  function eff(p, slot) {
    return p.ovr * fit(p, slot) * (0.75 + 0.25 * p.fit / 100);
  }

  function available(p) { return p.inj <= 0 && p.sus <= 0; }

  /** Mejor once posible para una formación (asignación voraz global). */
  function autoLineup(players, formation, rotate) {
    const slots = FORMATIONS[formation];
    const avail = players.filter(available);
    const pairs = [];
    slots.forEach((s, si) => {
      for (const p of avail) {
        let e = eff(p, s[0]);
        if (rotate && p.fit < 70) e *= 0.85;
        pairs.push([e, si, p.id]);
      }
    });
    pairs.sort((a, b) => b[0] - a[0]);
    const res = new Array(slots.length).fill(-1), used = new Set();
    let left = slots.length;
    for (const [, si, pid] of pairs) {
      if (res[si] !== -1 || used.has(pid)) continue;
      res[si] = pid; used.add(pid);
      if (--left === 0) break;
    }
    return res;
  }

  function lineupScore(players, formation, ids) {
    const slots = FORMATIONS[formation];
    const byId = new Map(players.map(p => [p.id, p]));
    let s = 0;
    ids.forEach((id, i) => { if (id >= 0) s += eff(byId.get(id), slots[i][0]); });
    return s;
  }

  function bestFormation(players) {
    let best = null;
    for (const f of Object.keys(FORMATIONS)) {
      const ids = autoLineup(players, f, true);
      const sc = lineupScore(players, f, ids);
      if (!best || sc > best.score) best = { formation: f, ids, score: sc };
    }
    return best;
  }

  function pickBench(players, startIds, n) {
    const used = new Set(startIds);
    const rest = players.filter(p => available(p) && !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
    const bench = [];
    const gk = rest.find(p => p.pos === 'GK');
    if (gk) bench.push(gk.id);
    for (const p of rest) {
      if (bench.length >= n) break;
      if (!bench.includes(p.id)) bench.push(p.id);
    }
    return bench;
  }

  /** Valida el once del usuario: rellena huecos/indisponibles con el mejor disponible. */
  function userLineup(S) {
    const T = S.tactics;
    const players = TL.World.squad(S, S.user);
    const slots = FORMATIONS[T.formation];
    const mine = new Set(players.map(p => p.id));
    let ids = (T.slots || []).slice(0, slots.length);
    while (ids.length < slots.length) ids.push(-1);
    const changed = [];
    const seen = new Set();
    ids = ids.map((id, i) => {
      if (id >= 0 && mine.has(id) && available(S.players[id]) && !seen.has(id)) { seen.add(id); return id; }
      if (id >= 0) changed.push(i);
      return -1;
    });
    if (ids.includes(-1)) {
      const pool = players.filter(p => available(p) && !seen.has(p.id));
      ids.forEach((id, i) => {
        if (id !== -1) return;
        let best = null, be = -1;
        for (const p of pool) {
          if (seen.has(p.id)) continue;
          const e = eff(p, slots[i][0]);
          if (e > be) { be = e; best = p; }
        }
        if (best) { ids[i] = best.id; seen.add(best.id); }
      });
    }
    T.slots = ids;
    return { formation: T.formation, ids, changed };
  }

  // ------------------------------------------------------------ Narración
  const TXT = {
    goal: [
      '¡GOOOL de {p}! Definición impecable.', '¡Gol! {p} la manda al fondo de la red.',
      '¡{p} no perdona! Gol.', '¡Golazo de {p}! Imparable para el portero.',
      '¡Gol de {p}! Remate cruzado que entra junto al palo.', '¡{p} marca! El estadio estalla.'
    ],
    assist: ['Gran pase de {a}.', 'Asistencia de {a}.', 'Centro medido de {a}.', '{a} la puso en bandeja.'],
    save: ['¡Paradón de {k}! Desvía el disparo de {p}.', '{p} prueba suerte, pero {k} atrapa el balón.',
      '{k} saca una mano salvadora ante {p}.'],
    miss: ['{p} dispara... ¡fuera por poco!', 'Ocasión clarísima para {p}, que la manda arriba.',
      '¡Al palo! {p} estuvo a centímetros.', '{p} remata de cabeza, desviado.'],
    yellow: ['Tarjeta amarilla para {p}.', '{p} ve la amarilla por una entrada tardía.'],
    red: ['¡Roja directa para {p}! Su equipo se queda con diez.', '¡Expulsado {p}!'],
    red2: ['¡Segunda amarilla para {p}! A la calle.'],
    inj: ['{p} se duele y pide el cambio.', '{p} cae lesionado.'],
    sub: ['Cambio: entra {p}, sale {a}.']
  };
  function say(kind, vars) {
    let t = U.pick(TXT[kind]);
    for (const k in vars) t = t.replace('{' + k + '}', U.esc(vars[k]));
    return t;
  }

  const SHOOT_W = { ST: 6, RW: 3.5, LW: 3.5, CAM: 3, RM: 2, LM: 2, CM: 1.4, CDM: 0.7, CB: 0.5, RB: 0.6, LB: 0.6, GK: 0 };
  const ASSIST_W = { CAM: 4, CM: 3, RW: 3, LW: 3, RM: 3, LM: 3, ST: 2, RB: 1.5, LB: 1.5, CDM: 1.5, CB: 0.4, GK: 0.05 };
  const FOUL_W = { CB: 3, CDM: 3, RB: 2, LB: 2, CM: 2, LM: 1.2, RM: 1.2, CAM: 1, ST: 1, RW: 0.8, LW: 0.8, GK: 0.2 };
  const BASE_XG = 1.2, XG_K = 0.042, HOME_ADV = 3.5;
  const MENT_OWN = [0.82, 1, 1.15];
  const MENT_OPP = [0.8, 1, 1.12];

  // ------------------------------------------------------------ Partido
  class Match {
    constructor(S, homeId, awayId, opts) {
      opts = opts || {};
      this.S = S;
      this.min = 0;
      this.done = false;
      this.detail = !!opts.detail;
      this.events = [];
      this.score = [0, 0];
      this.stats = { shots: [0, 0], onT: [0, 0], yel: [0, 0], red: [0, 0], possSum: [0, 0] };
      this.pl = {}; // pid -> {on, off, g, a, y, r, saves, team, slot}
      this.teams = [this._team(homeId, 0), this._team(awayId, 1)];
      this._str = null;
      const s0 = this._strength(0), s1 = this._strength(1);
      for (const i of [0, 1]) {
        const t = this.teams[i];
        if (!t.isUser) {
          const mine = i === 0 ? s0 : s1, opp = i === 0 ? s1 : s0;
          const d = (mine.attack + mine.defense) - (opp.attack + opp.defense);
          t.mentality = d < -9 ? 0 : d > 9 ? 2 : 1;
          t.baseMent = t.mentality;
        }
      }
      if (this.detail) this._ev('ko', -1, null, null, 'Arranca el partido en el ' + U.esc(S.clubs[homeId].stadium) + '.');
    }

    _team(clubId, idx) {
      const S = this.S;
      const isUser = clubId === S.user;
      const players = TL.World.squad(S, clubId);
      let formation, ids, mentality = 1;
      if (isUser) {
        const l = userLineup(S);
        formation = l.formation; ids = l.ids; mentality = S.tactics.mentality;
      } else {
        const b = bestFormation(players);
        formation = b.formation; ids = b.ids;
      }
      const slots = FORMATIONS[formation];
      const onPitch = [];
      ids.forEach((pid, i) => {
        if (pid < 0) return;
        onPitch.push({ pid, slot: slots[i][0], x: slots[i][1] });
        this.pl[pid] = { on: 0, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0, team: idx, slot: slots[i][0] };
      });
      const bench = pickBench(players, ids, 9);
      return {
        club: clubId, idx, isUser, formation, onPitch, bench, mentality, baseMent: mentality,
        subs: 0, maxSubs: 5, autoSubs: isUser ? S.tactics.autoSubs : true
      };
    }

    P(id) { return this.S.players[id]; }

    _strength(i) {
      const t = this.teams[i];
      const lines = [[], [], [], []];
      for (const o of t.onPitch) {
        const p = this.P(o.pid);
        lines[F.LINE[o.slot]].push(eff(p, o.slot) * (o.hurt ? 0.6 : 1));
      }
      const avg = a => (a.length ? U.sum(a) / a.length : null);
      let gk = avg(lines[0]), def = avg(lines[1]), mid = avg(lines[2]), att = avg(lines[3]);
      const any = avg(lines.flat()) || 40;
      if (gk == null) gk = 25;
      if (def == null) def = any * 0.85;
      if (mid == null) mid = any * 0.85;
      if (att == null) att = mid * 0.85;
      const nD = lines[1].length, nM = lines[2].length, nA = lines[3].length;
      const miss = 11 - t.onPitch.length;
      return {
        attack: 0.55 * att + 0.45 * mid + (nA - 2) * 1.0 + (nM - 4) * 0.3 - miss * 3,
        defense: 0.5 * def + 0.3 * mid + 0.2 * gk + (nD - 4) * 1.2 + (nM - 4) * 0.3 - miss * 3,
        mid: mid + (nM - 4) * 1.5 - miss * 2,
        gk
      };
    }

    strengths() {
      if (!this._str) this._str = [this._strength(0), this._strength(1)];
      return this._str;
    }

    xg(i) {
      const [a, b] = [this.strengths()[i], this.strengths()[1 - i]];
      const diff = a.attack - b.defense + (i === 0 ? HOME_ADV : 0);
      let x = BASE_XG * Math.exp(XG_K * diff);
      x *= MENT_OWN[this.teams[i].mentality] * MENT_OPP[this.teams[1 - i].mentality];
      return U.clamp(x, 0.1, 5);
    }

    possession() {
      const [a, b] = this.strengths();
      const ma = Math.pow(Math.max(20, a.mid), 3) * [0.9, 1, 1.06][this.teams[0].mentality];
      const mb = Math.pow(Math.max(20, b.mid), 3) * [0.9, 1, 1.06][this.teams[1].mentality];
      return ma / (ma + mb);
    }

    setMentality(i, m) { this.teams[i].mentality = m; this.teams[i].baseMent = m; }

    _ev(type, team, pid, pid2, text) {
      const e = { min: this.min, type, team, pid, pid2, text };
      this.events.push(e);
      return e;
    }

    _gk(i) {
      const o = this.teams[i].onPitch.find(o => o.slot === 'GK');
      return o ? this.P(o.pid) : null;
    }

    /** Avanza un minuto. Devuelve los eventos nuevos. */
    step() {
      if (this.done) return [];
      const start = this.events.length;
      this.min++;
      const m = this.min;
      const poss = this.possession();
      this.stats.possSum[0] += poss; this.stats.possSum[1] += 1 - poss;

      for (const i of [0, 1]) {
        const t = this.teams[i];
        // Mentalidad dinámica según marcador: la IA siempre; el usuario solo en
        // "resultado rápido" (su segundo entrenador), en directo decide él.
        if ((!t.isUser || !this.detail) && m >= 65) {
          const diff = this.score[i] - this.score[1 - i];
          t.mentality = diff < 0 ? 2 : diff > 0 && m >= 75 ? 0 : t.baseMent;
        }
        const xg = this.xg(i);
        const pShot = Math.min(0.6, xg / 90 / 0.105);
        if (Math.random() < pShot) this._shot(i);
        if (Math.random() < 1.7 / 90) this._card(1 - i, false);
        if (Math.random() < 0.06 / 90) this._card(1 - i, true);
        if (Math.random() < 0.22 / 90) this._injury(i);
        if (t.autoSubs && m >= 58 && m <= 85 && t.subs < 3 && Math.random() < 0.09) this._fatigueSub(i);
      }
      if (m === 45 && this.detail) this._ev('ht', -1, null, null, `Descanso. ${this.score[0]}-${this.score[1]}.`);
      if (m >= 90) this._end();
      return this.events.slice(start);
    }

    _shot(i) {
      const t = this.teams[i];
      const outfield = t.onPitch.filter(o => o.slot !== 'GK');
      if (!outfield.length) return;
      const o = U.weighted(outfield, o => SHOOT_W[o.slot] * Math.pow(Math.max(30, this.P(o.pid).st[1]) / 70, 2));
      const shooter = this.P(o.pid);
      const gk = this._gk(1 - i);
      const gkv = gk ? eff(gk, 'GK') : 30;
      const sho = this.P(o.pid).pos === 'GK' ? 30 : shooter.st[1];
      const pGoal = U.clamp(0.105 * Math.pow(sho / 70, 0.9) * Math.pow(72 / Math.max(30, gkv), 0.8), 0.03, 0.4);
      this.stats.shots[i]++;
      if (Math.random() < pGoal) {
        this.stats.onT[i]++;
        this.score[i]++;
        this.pl[shooter.id].g++;
        let assister = null;
        if (Math.random() < 0.75) {
          const mates = t.onPitch.filter(x => x.pid !== shooter.id);
          if (mates.length) {
            const a = U.weighted(mates, x => ASSIST_W[x.slot] * Math.pow(Math.max(30, this.P(x.pid).st[2]) / 70, 2));
            assister = this.P(a.pid);
            this.pl[assister.id].a++;
          }
        }
        if (this.detail) {
          let txt = say('goal', { p: shooter.short });
          if (assister) txt += ' ' + say('assist', { a: assister.short });
          this._ev('goal', i, shooter.id, assister && assister.id, txt);
        } else this._ev('goal', i, shooter.id, assister && assister.id, '');
      } else {
        const onTarget = Math.random() < 0.42;
        if (onTarget) {
          this.stats.onT[i]++;
          if (gk) this.pl[gk.id].sv++;
        }
        if (this.detail && Math.random() < 0.45) {
          if (onTarget && gk) this._ev('save', i, shooter.id, gk.id, say('save', { p: shooter.short, k: gk.short }));
          else this._ev('miss', i, shooter.id, null, say('miss', { p: shooter.short }));
        }
      }
    }

    _card(i, straight) {
      const t = this.teams[i];
      if (!t.onPitch.length) return;
      const o = U.weighted(t.onPitch, o => FOUL_W[o.slot]);
      const p = this.P(o.pid), rec = this.pl[p.id];
      if (straight || rec.y >= 1) {
        rec.r = straight ? 2 : 1;
        if (!straight) rec.y++;
        this.stats.red[i]++;
        this._ev('red', i, p.id, null, say(straight ? 'red' : 'red2', { p: p.short }));
        this._remove(i, p.id);
      } else {
        rec.y++;
        this.stats.yel[i]++;
        this._ev('yellow', i, p.id, null, say('yellow', { p: p.short }));
      }
    }

    _injury(i) {
      const t = this.teams[i];
      if (!t.onPitch.length) return;
      const o = U.weighted(t.onPitch, o => 115 - this.P(o.pid).fit);
      const p = this.P(o.pid);
      if (this.pl[p.id].inj) return;
      this.pl[p.id].inj = U.weighted([1, 2, 3, 4, 6, 8, 12], w => [30, 25, 15, 12, 9, 6, 3][[1, 2, 3, 4, 6, 8, 12].indexOf(w)]);
      this._ev('inj', i, p.id, null, say('inj', { p: p.short }));
      if (t.subs < t.maxSubs && (t.autoSubs || !t.isUser)) this._bestSub(i, o);
      else o.hurt = true;
      this._str = null;
    }

    _remove(i, pid) {
      const t = this.teams[i];
      const k = t.onPitch.findIndex(o => o.pid === pid);
      if (k >= 0) { t.onPitch.splice(k, 1); this.pl[pid].off = this.min; }
      this._str = null;
    }

    _bestSub(i, out) {
      const t = this.teams[i];
      let best = null, be = -1;
      for (const pid of t.bench) {
        const e = eff(this.P(pid), out.slot);
        if (e > be) { be = e; best = pid; }
      }
      if (best == null) return false;
      this.substitute(i, out.pid, best);
      return true;
    }

    _fatigueSub(i) {
      const t = this.teams[i];
      const cands = t.onPitch.filter(o => o.slot !== 'GK');
      if (!cands.length || !t.bench.length) return;
      const out = cands.reduce((a, b) => (this.P(a.pid).fit - this.min * 0.1 * (1 - this.P(a.pid).st[5] / 200) <
        this.P(b.pid).fit - this.min * 0.1 * (1 - this.P(b.pid).st[5] / 200) ? a : b));
      const cur = eff(this.P(out.pid), out.slot) * (1 - this.min / 600);
      const best = t.bench.map(pid => this.P(pid)).filter(p => p.pos !== 'GK')
        .sort((a, b) => eff(b, out.slot) - eff(a, out.slot))[0];
      if (best && eff(best, out.slot) >= cur * 0.88) this.substitute(i, out.pid, best.id);
    }

    /** Cambio: sale outPid, entra inPid (del banquillo). */
    substitute(i, outPid, inPid) {
      const t = this.teams[i];
      if (t.subs >= t.maxSubs) return false;
      const o = t.onPitch.find(o => o.pid === outPid);
      const bi = t.bench.indexOf(inPid);
      if (!o || bi < 0) return false;
      t.bench.splice(bi, 1);
      this.pl[outPid].off = this.min;
      this.pl[inPid] = { on: this.min, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0, team: i, slot: o.slot };
      o.pid = inPid; o.hurt = false;
      t.subs++;
      this._str = null;
      if (this.detail) this._ev('sub', i, inPid, outPid, say('sub', { p: this.P(inPid).short, a: this.P(outPid).short }));
      return true;
    }

    _end() {
      this.done = true;
      for (const id in this.pl) if (this.pl[id].off == null) this.pl[id].off = 90;
      if (this.detail) this._ev('ft', -1, null, null, `¡Final del partido! ${this.score[0]}-${this.score[1]}.`);
    }

    simulate() { while (!this.done) this.step(); return this; }

    /** Valoración (rating) de cada jugador que participó. */
    ratings() {
      const out = {};
      const [g0, g1] = this.score;
      for (const id in this.pl) {
        const r = this.pl[id], p = this.P(+id);
        const mine = r.team === 0 ? g0 : g1, opp = r.team === 0 ? g1 : g0;
        const mins = Math.max(1, r.off - r.on);
        const share = Math.min(1, mins / 90);
        const line = F.LINE[r.slot];
        let v = 6.2 + (p.ovr - 72) / 30;
        v += r.g * 1.0 + r.a * 0.6 + r.sv * 0.15 - r.y * 0.3 - (r.r ? 1.6 : 0);
        v += share * ((mine > opp ? 0.4 : mine < opp ? -0.3 : 0) + mine * 0.08 - opp * (line <= 1 ? 0.18 : 0.06));
        if (opp === 0 && line <= 1 && mins >= 60) v += line === 0 ? 0.7 : 0.4;
        v += (Math.random() - 0.5) * 0.9;
        out[id] = Math.round(U.clamp(v, 3.5, 10) * 10) / 10;
      }
      return out;
    }

    /** Aplica el resultado al estado del juego (estadísticas, forma física, sanciones). */
    finish() {
      if (!this.done) this.simulate();
      const S = this.S;
      const ratings = this.ratings();
      let mom = null;
      for (const id in ratings) if (mom == null || ratings[id] > ratings[mom]) mom = id;
      // Sanciones cumplidas
      for (const t of this.teams) {
        for (const p of TL.World.squad(S, t.club)) if (p.sus > 0 && !this.pl[p.id]) p.sus--;
      }
      for (const id in this.pl) {
        const r = this.pl[id], p = S.players[id];
        const st = S.stats[id] || (S.stats[id] = [0, 0, 0, 0, 0, 0, 0]);
        st[0]++; st[1] += r.g; st[2] += r.a; st[3] += ratings[id]; st[4] += r.y; st[5] += r.r ? 1 : 0;
        if (String(mom) === id) st[6]++;
        const mins = Math.max(0, r.off - r.on);
        const drop = (p.pos === 'GK' ? 4 : 10 + Math.random() * 6) * (mins / 90) * (1.15 - p.st[5] / 250);
        p.fit = U.clamp(Math.round(p.fit - drop), 30, 100);
        if (r.inj) p.inj = Math.max(p.inj, r.inj);
        if (r.r) p.sus = r.r;
      }
      this.lastRatings = ratings;
      this.mom = mom != null ? +mom : null;
      const injuries = [], reds = [];
      for (const id in this.pl) {
        if (this.pl[id].inj) injuries.push([+id, this.pl[id].inj]);
        if (this.pl[id].r) reds.push([+id, this.pl[id].r]);
      }
      return {
        h: this.teams[0].club, a: this.teams[1].club, hg: this.score[0], ag: this.score[1],
        mom: mom != null ? +mom : null, ratings, injuries, reds
      };
    }
  }

  /** Simulación rápida (solo marcador) para ligas no controladas. */
  function quickScore(sh, sa) {
    const xh = BASE_XG * Math.exp(XG_K * (sh - sa + HOME_ADV));
    const xa = BASE_XG * Math.exp(XG_K * (sa - sh));
    return [U.poisson(U.clamp(xh, 0.1, 5)), U.poisson(U.clamp(xa, 0.1, 5))];
  }

  TL.Engine = {
    FORMATIONS, fit, eff, available, autoLineup, bestFormation, pickBench, userLineup, Match, quickScore
  };
})();
