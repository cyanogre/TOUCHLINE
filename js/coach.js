/* TOUCHLINE — entrenadores de la IA y repaso del partido
 *
 * Cada club rival tiene su entrenador, con estilo, sistema favorito, capacidad de
 * adaptarse y de preparar los partidos. Antes del partido no sabes qué va a hacer:
 * decide según su estilo, el estado de su plantilla, lo que tú jugaste la última
 * vez y un punto de azar. Durante el partido reacciona al marcador y a las
 * expulsiones. Si va mal, la directiva lo destituye y llega otro con otras ideas.
 * Al terminar, el Profe hace el repaso con lo que ya se sabe.
 */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U, F = TL.F;
  const E = () => TL.Engine;

  const STYLES = [
    { id: 'ofensivo', name: 'ofensivo', forms: ['4-3-3', '4-2-3-1', '3-4-3', '4-1-2-1-2'], ment: 0.7, react: 0.8, sit: 0.2 },
    { id: 'equilibrado', name: 'equilibrado', forms: ['4-2-3-1', '4-4-2', '4-3-3'], ment: 0, react: 0.6, sit: 0.45 },
    { id: 'defensivo', name: 'defensivo', forms: ['4-5-1', '5-3-2', '4-4-2'], ment: -0.7, react: 0.35, sit: 0.85 },
    { id: 'contra', name: 'de contragolpe', forms: ['4-4-2', '5-3-2', '4-5-1'], ment: -0.35, react: 0.55, sit: 0.65 },
    { id: 'posesion', name: 'de posesión', forms: ['4-3-3', '4-1-2-1-2', '3-5-2', '4-2-3-1'], ment: 0.3, react: 0.5, sit: 0.35 }
  ];
  const ATTACKING = ['4-3-3', '3-4-3', '4-2-3-1', '4-1-2-1-2', '4-4-2'];
  const DEFENSIVE = ['5-3-2', '4-5-1', '4-4-2'];

  // ------------------------------------------------------------ Entrenadores
  function make(S, clubId, avoidStyle) {
    const c = S.clubs[clubId], L = S.leagues[c.league];
    const big = U.clamp((c.rep - 60) / 25, 0, 1); // los grandes suelen ser más ofensivos
    const w = [0.6 + big, 1, 1.1 - big * 0.8, 0.8 - big * 0.4, 0.4 + big * 0.8];
    let style = U.weighted([0, 1, 2, 3, 4], k => (k === avoidStyle ? w[k] * 0.25 : w[k]));
    const st = STYLES[style];
    const pref = U.weighted(st.forms, f => (f === st.forms[0] ? 3 : 1.5));
    const alts = Object.keys(E().FORMATIONS).filter(f => f !== pref);
    const alt = Math.random() < 0.7 ? U.pick(st.forms.filter(f => f !== pref)) || U.pick(alts) : U.pick(alts);
    const gender = S.gender === 'F' && Math.random() < 0.45 ? 'F' : 'M';
    const [name] = TL.World.genName(L.country, gender);
    return {
      name, style, pref, alt,
      flex: Math.round(U.rand(0.2, 0.95) * 100) / 100, // cuánto adapta su plan al rival
      prep: Math.round(U.clamp(U.rand(0.25, 0.85) + big * 0.15, 0, 1) * 100) / 100, // calidad de la preparación
      since: S.season
    };
  }

  function init(S) {
    S.coaches = S.coaches || [];
    for (const c of S.clubs) if (c.id !== S.user && !S.coaches[c.id]) S.coaches[c.id] = make(S, c.id);
    S.lastForm = S.lastForm || {};
    S.reviews = S.reviews || [];
  }
  function of(S, clubId) {
    if (clubId === S.user) return null;
    if (!S.coaches) init(S);
    return S.coaches[clubId] || (S.coaches[clubId] = make(S, clubId));
  }
  function styleOf(co) { return STYLES[co ? co.style : 1]; }

  function serialize(S) {
    return (S.coaches || []).map(c => (c ? [c.name, c.style, c.pref, c.alt, c.flex, c.prep, c.since] : 0));
  }
  function restore(S, rows) {
    S.coaches = (rows || []).map(r => (r ? { name: r[0], style: r[1], pref: r[2], alt: r[3], flex: r[4], prep: r[5], since: r[6] } : null));
  }

  // ------------------------------------------------------------ Choque de sistemas
  const SHAPES = {};
  function shape(f) {
    if (SHAPES[f]) return SHAPES[f];
    const s = (E().FORMATIONS[f] || E().FORMATIONS['4-4-2']).map(x => x[0]);
    const n = k => s.filter(p => p === k).length;
    const cb = n('CB'), fb = n('RB') + n('LB'), wm = n('RM') + n('LM'), wa = n('RW') + n('LW');
    const o = {
      cb, fb, wm, wa, st: n('ST'), cdm: n('CDM'), cam: n('CAM'), cen: n('CM') + n('CDM') + n('CAM'),
      width: wa + wm * (cb >= 3 ? 0.7 : 0.6), // amplitud en ataque
      wideDef: fb + wm * (cb >= 3 ? 0.8 : 0.5) // quién cubre las bandas atrás
    };
    return (SHAPES[f] = o);
  }

  /**
   * Ventaja del sistema fa (atacando) contra fb (defendiendo).
   * Puntas contra centrales, amplitud contra laterales, mediapunta entre líneas
   * y superioridad en el centro. Devuelve bonificaciones de ataque y de medio.
   */
  function clash(fa, fb) {
    const a = shape(fa), b = shape(fb);
    const fwd = U.clamp(a.st - b.cb + 1, -1, 1);
    const width = U.clamp(a.width - b.wideDef, -1.5, 1.5);
    const between = U.clamp(a.cam - b.cdm, -1, 1) * 0.5;
    const centre = U.clamp(a.cen - b.cen, -2, 2);
    const K = 1.4;
    return {
      fwd, width, between, centre,
      attack: K * (0.9 * fwd + 0.9 * width + 0.8 * between + 0.25 * centre),
      mid: K * 0.9 * centre
    };
  }

  // ------------------------------------------------------------ Plan de partido
  /** Once y sistema que elige el entrenador de la IA para este partido. */
  function lineup(S, clubId, oppId) {
    const En = E();
    const co = of(S, clubId), st = styleOf(co);
    const players = TL.World.squad(S, clubId);
    const best = En.bestFormation(players);
    const cands = new Set([co.pref, co.alt, ...st.forms, best.formation]);
    // Ha visto tu último partido (o el del rival): lo que jugó la última vez
    const scout = S.lastForm && S.lastForm[oppId];
    let pick = null;
    for (const f of cands) {
      const ids = En.autoLineup(players, f, true);
      const q = En.lineupScore(players, f, ids) / 11;
      let v = q + (f === co.pref ? 1.6 : f === co.alt ? 0.8 : st.forms.includes(f) ? 0.4 : 0);
      if (scout) {
        const mine = clash(f, scout), theirs = clash(scout, f);
        v += co.flex * (mine.attack - theirs.attack + (mine.mid - theirs.mid) * 0.4) * 0.6;
      }
      v += U.rand(-1, 1) * (1.25 - co.prep); // los menos preparados improvisan más
      if (!pick || v > pick.v) pick = { v, formation: f, ids };
    }
    return { formation: pick.formation, ids: pick.ids, scouted: scout || null };
  }

  /** Mentalidad inicial: estilo + diferencia de nivel + campo + azar. */
  function mentality(S, clubId, d, home) {
    const st = styleOf(of(S, clubId));
    const v = d / 7 + st.ment + (home ? 0.35 : -0.15) + U.rand(-0.45, 0.45);
    return v < -0.75 ? 0 : v > 0.85 ? 2 : 1;
  }

  /** Cómo llega el equipo: preparación del entrenador y el punto de azar del día. */
  function dayFactor(S, clubId) {
    const co = of(S, clubId);
    if (!co) return Math.round((1 + U.rand(-0.02, 0.02)) * 1000) / 1000;
    return Math.round((1 + U.rand(-0.03, 0.03) + (co.prep - 0.55) * 0.03) * 1000) / 1000;
  }

  // ------------------------------------------------------------ En directo
  function countAttack(f) { const s = shape(f); return s.st + s.wa + s.cam * 0.5; }

  /** El entrenador de la IA mira el partido cada pocos minutos y decide. */
  function react(M, i) {
    const t = M.teams[i];
    const co = t.coach;
    if (!co || !t.onPitch.length) return;
    const st = styleOf(co), m = M.min;
    const diff = M.score[i] - M.score[1 - i];
    let ment = t.mentality;
    if (m >= 60) {
      if (diff < 0) ment = 2;
      else if (diff > 0 && m >= 82 - st.sit * 14) ment = 0;
      else ment = t.baseMent;
    }
    if (ment !== t.mentality) M.setMentality(i, ment, true);
    // A la desesperada: a por todas en los últimos minutos
    t.desperate = diff < 0 && diff >= -2 && m >= 84;
    if (t.tchanges >= 2 || m < 55) return;
    if (t.nextLook && m < t.nextLook) return;
    t.nextLook = m + U.int(4, 9);
    if (diff < 0 && m >= 58 && Math.random() < 0.2 + 0.35 * st.react) {
      const cur = countAttack(t.formation);
      const opts = ATTACKING.filter(f => f !== t.formation && countAttack(f) > cur);
      if (opts.length) {
        const f = st.forms.find(x => opts.includes(x)) || U.pick(opts);
        if (M.changeFormation(i, f, diff === -1 ? 'buscando el empate' : 'a por la remontada')) { t.tchanges++; attackingSub(M, i); }
      }
    } else if (diff > 0 && m >= 70 && Math.random() < 0.1 + 0.35 * st.sit) {
      const opts = DEFENSIVE.filter(f => f !== t.formation && countAttack(f) < countAttack(t.formation));
      if (opts.length) {
        const f = opts.includes('5-3-2') && st.sit > 0.5 ? '5-3-2' : opts[0];
        if (M.changeFormation(i, f, 'para cerrar el partido')) t.tchanges++;
      }
    }
  }

  /** Cambio ofensivo: entra un delantero del banquillo por el defensa o medio más defensivo. */
  function attackingSub(M, i) {
    const t = M.teams[i];
    if (t.subs >= t.maxSubs || !t.bench.length) return;
    const fwd = t.bench.map(pid => M.P(pid)).filter(p => F.LINE[p.pos] === 3).sort((a, b) => b.ovr - a.ovr)[0];
    if (!fwd) return;
    const slotAtt = t.onPitch.filter(o => F.LINE[o.slot] === 3).sort((a, b) => M.P(a.pid).ovr - M.P(b.pid).ovr)[0];
    if (slotAtt && M.P(fwd.id).ovr > M.P(slotAtt.pid).ovr - 3) M.substitute(i, slotAtt.pid, fwd.id);
  }

  // ------------------------------------------------------------ Destituciones
  function lastPoints(S, clubId, n) {
    const out = [];
    for (let w = Math.min(S.week, S.fixtures.length) - 1; w >= 0 && out.length < n; w--) {
      const m = S.fixtures[w].find(x => x[0] === clubId || x[1] === clubId);
      if (!m || m[2] == null) continue;
      const [g, a] = m[0] === clubId ? [m[2], m[3]] : [m[3], m[2]];
      out.push(g > a ? 3 : g === a ? 1 : 0);
    }
    return out;
  }

  /** Tras cada jornada: las directivas de la IA pueden destituir a su entrenador. */
  function weekly(S) {
    init(S);
    const L = TL.World.userLeague(S);
    const tab = TL.Season.table(S);
    const n = tab.length;
    for (const id of L.clubs) {
      if (id === S.user) continue;
      const co = of(S, id);
      const pts = lastPoints(S, id, 6);
      if (pts.length < 6 || S.week < 8) continue;
      if (co.since === S.season && co.week != null) continue; // como mucho un relevo por temporada
      if (co.since === S.season && S.week < 10) continue;
      const pos = tab.findIndex(r => r.id === id) + 1;
      const exp = L.clubs.slice().sort((a, b) => S.clubs[b].rep - S.clubs[a].rep).indexOf(id) + 1;
      const sum = U.sum(pts);
      const pressure = (sum <= 2 ? 0.16 : sum <= 4 ? 0.05 : 0) * (pos > exp + 3 ? 1.5 : pos > n * 0.6 ? 1 : 0.25);
      if (!pressure || Math.random() > pressure) continue;
      const old = co;
      const nu = make(S, id, old.style);
      nu.week = S.week;
      S.coaches[id] = nu;
      const club = S.clubs[id];
      TL.News.add(S, 'club', `${club.name} destituye a ${old.name}`,
        `Tras ${pts.filter(x => x === 0).length} derrotas en las últimas 6 jornadas, la directiva cesa a ${old.name}. ` +
        `Llega ${nu.name}, un técnico ${STYLES[nu.style].name} que suele jugar con ${nu.pref}.`, id, null, 'neg');
    }
  }

  // ------------------------------------------------------------ Repaso (a posteriori)
  const MENT = ['defensiva', 'equilibrada', 'ofensiva'];

  /**
   * Repaso del Profe: se calcula al acabar el partido, con lo que ya se sabe
   * (sistema real del rival, sus cambios, cómo llegó). Nunca antes.
   */
  function review(M) {
    const En = E(), S = M.S;
    const ui = M.teams.findIndex(t => t.isUser);
    if (ui < 0) return null;
    const me = M.teams[ui], th = M.teams[1 - ui];
    const co = of(S, th.club);
    const home = ui === 0;
    // Fuerza del rival tal y como salió (once inicial, su sistema y cómo llegó)
    const oppXI = th.start.ids.map((id, k) => ({ p: S.players[id], slot: En.FORMATIONS[th.start.formation][k][0] })).filter(o => o.p);
    const oMult = M.bonus[1 - ui].teamBoost * th.day;
    const oppStr = En.teamStrength(oppXI, oMult);
    const bo = M.bonus[ui];
    const mine = TL.World.squad(S, S.user);
    const ex = (st, f, m) => {
      const c1 = clash(f, th.start.formation), c2 = clash(th.start.formation, f);
      const own = En.MENT_OWN[m];
      const xf = U.clamp(1.1 * Math.exp(0.042 * (st.attack + c1.attack - oppStr.defense + (home ? 3.5 : 0))) * (own > 1 ? own + bo.mentBonus : own < 1 ? own - bo.mentBonus * 0.3 : 1) * En.MENT_OPP[th.start.mentality], 0.08, 5);
      const xa = U.clamp(1.1 * Math.exp(0.042 * (oppStr.attack + c2.attack - st.defense + (home ? 0 : 3.5))) * En.MENT_OPP[m] * En.MENT_OWN[th.start.mentality], 0.08, 5);
      const o = En.outcome(xf, xa);
      return 3 * o.w + o.d;
    };
    const rows = [];
    for (const f of Object.keys(En.FORMATIONS)) {
      const ids = En.autoLineup(mine, f, true), slots = En.FORMATIONS[f];
      const xi = ids.map((id, k) => ({ p: S.players[id], slot: slots[k][0] })).filter(o => o.p);
      const st = En.teamStrength(xi, bo.teamBoost * me.day);
      for (const m of [0, 1, 2]) rows.push([f, m, Math.round(ex(st, f, m) * 100) / 100]);
    }
    rows.sort((a, b) => b[2] - a[2]);
    const myXI = me.start.ids.map((id, k) => ({ p: S.players[id], slot: En.FORMATIONS[me.start.formation][k][0] })).filter(o => o.p);
    const actual = Math.round(ex(En.teamStrength(myXI, bo.teamBoost * me.day), me.start.formation, me.start.mentality) * 100) / 100;
    const us = clash(me.start.formation, th.start.formation), them = clash(th.start.formation, me.start.formation);
    return {
      s: S.season, w: S.week, opp: th.club, home,
      score: [M.score[ui], M.score[1 - ui]],
      xg: [Math.round(M.stats.xg[ui] * 10) / 10, Math.round(M.stats.xg[1 - ui] * 10) / 10],
      shots: [M.stats.shots[ui], M.stats.shots[1 - ui]],
      poss: Math.round(M.stats.possSum[ui] / Math.max(1, M.min) * 100),
      me: { f: me.start.formation, m: me.start.mentality, day: me.day, log: me.log },
      them: { f: th.start.formation, m: th.start.mentality, day: th.day, log: th.log, coach: co ? co.name : '', style: co ? co.style : 1, scouted: !!th.scouted },
      edge: { fwd: [us.fwd, them.fwd], width: [Math.round(us.width * 10) / 10, Math.round(them.width * 10) / 10], centre: us.centre, between: [us.between, them.between] },
      best: rows.slice(0, 3), actual,
      reds: [M.stats.red[ui], M.stats.red[1 - ui]]
    };
  }

  function store(S, r) {
    if (!r) return;
    S.reviews = S.reviews || [];
    S.reviews.unshift(r);
    if (S.reviews.length > 5) S.reviews.length = 5;
  }

  /** Frases del Profe para el repaso, en lenguaje llano. */
  function lines(S, r) {
    const opp = S.clubs[r.opp];
    const out = [];
    const [g, a] = r.score;
    const [xg, xa] = r.xg.map(v => v.toFixed(1).replace('.', ','));
    const [xgN, xaN] = r.xg;
    const res = g > a ? 'V' : g < a ? 'D' : 'E';
    const st = STYLES[r.them.style] || STYLES[1];
    out.push({ k: 'sys', t: `${opp.name} salió con **${r.them.f}** y mentalidad **${MENT[r.them.m]}**. Su entrenador, ${r.them.coach}, tiene fama de técnico **${st.name}**.` +
      (r.them.scouted ? ' Había estudiado tu último partido.' : '') });
    for (const [min, f, m, why] of r.them.log || []) {
      out.push({ k: 'chg', t: f ? `Al ${min}' cambió a **${f}**${why ? ' ' + why : ''}.` : `Al ${min}' pasó a mentalidad **${MENT[m]}**.` });
    }
    // Choque de sistemas
    const e = r.edge;
    if (e.fwd[0] > 0) out.push({ k: 'edge', t: `Tus dos puntas iban **uno contra uno** con sus centrales: ahí tenías ventaja.` });
    else if (e.fwd[0] < 0) out.push({ k: 'edge', t: `Tu delantero estaba **solo contra tres centrales**: muy difícil recibir.` });
    if (e.fwd[1] > 0) out.push({ k: 'edge', t: `Sus dos delanteros emparejaban con tus dos centrales: sufrías **atrás**.` });
    if (e.width[0] >= 0.8) out.push({ k: 'edge', t: `Les hacías daño por **las bandas**: tenías más gente abierta que ellos para defenderla.` });
    else if (e.width[1] >= 0.8) out.push({ k: 'edge', t: `Te atacaban por **las bandas**: tenías pocos jugadores para cerrarlas.` });
    if (e.centre >= 1) out.push({ k: 'edge', t: r.poss >= 52 ? `Ganabas el **centro del campo** en número: por eso tuviste el balón (${r.poss}%).` : `Tenías más gente en el **centro del campo**, pero no supiste aprovecharlo: solo un ${r.poss}% de posesión.` });
    else if (e.centre <= -1) out.push({ k: 'edge', t: r.poss <= 48 ? `Te ganaban el **centro del campo** en número: por eso tuviste poco el balón (${r.poss}%).` : `Ellos tenían más gente en el **centro del campo**, pero aguantaste bien: ${r.poss}% de posesión.` });
    // Cómo llegaron
    if (r.them.day >= 1.02) out.push({ k: 'day', t: `Vinieron **muy bien preparados**: se notaba el trabajo de la semana.` });
    else if (r.them.day <= 0.985) out.push({ k: 'day', t: `Los vi **flojos**, como si no hubieran preparado bien el partido.` });
    if (r.me.day >= 1.015) out.push({ k: 'day', t: `Los chavales tuvieron **un día inspirado**.` });
    else if (r.me.day <= 0.985) out.push({ k: 'day', t: `A los nuestros se les vio **grises**; hay días así.` });
    // Suerte: goles contra ocasiones
    if (res !== 'V' && xgN > xaN + 0.6) out.push({ k: 'luck', t: `Generamos más (**${xg} goles esperados** contra ${xa}). Hoy la suerte no estuvo de nuestro lado: el fútbol es así.` });
    else if (res === 'V' && xaN > xgN + 0.6) out.push({ k: 'luck', t: `Ganamos, pero ellos generaron más (${xa} contra ${xg} goles esperados). **Hubo suerte**: no te confíes.` });
    else out.push({ k: 'luck', t: `Goles esperados: **${xg}** para nosotros y **${xa}** para ellos. El resultado fue ${Math.abs((g - a) - (xgN - xaN)) < 1 ? 'justo' : 'algo engañoso'}.` });
    // Con lo que sabemos ahora
    const top = r.best[0];
    if (top && top[2] > r.actual + 0.12) {
      out.push({ k: 'hind', t: top[0] === r.me.f
        ? `Ahora que sabemos que jugaron con ${r.them.f}, tu **${top[0]}** estaba bien, pero con mentalidad **${MENT[top[1]]}** nos habría ido mejor. Ojo: su entrenador también habría reaccionado.`
        : `Ahora que sabemos que jugaron con ${r.them.f}, lo que mejor nos habría ido es **${top[0]}** con mentalidad **${MENT[top[1]]}**. Ojo: su entrenador también habría reaccionado.` });
    } else {
      out.push({ k: 'hind', t: res === 'D'
        ? `Tu planteamiento (**${r.me.f}**, ${MENT[r.me.m]}) era de los mejores contra lo que hicieron. La derrota vino por otras cosas: no cambies por cambiar.`
        : `Tu planteamiento (**${r.me.f}**, ${MENT[r.me.m]}) era de los mejores contra lo que hicieron. Bien leído.` });
    }
    return out;
  }

  TL.Coach = { STYLES, init, of, styleOf, make, serialize, restore, clash, shape, lineup, mentality, dayFactor, react, weekly, review, store, lines, MENT };
})();
