/* TOUCHLINE — partido en directo: velocidades x1–x16, saltos, pausas automáticas
 * en momentos clave, decisiones, charla del descanso, cambios y táctica. */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U, World: W, Game: G, UI, Engine: E } = TL;
  const esc = U.esc;
  const A = UI.actions;

  const SPEEDS = [1, 2, 4, 8, 16];
  const BASE_MS = 600; // x1 ≈ 54 s por partido
  const MV = { m: null, timer: null, paused: false, tab: 'feed', me: 0, htDone: false, finished: false, subOut: null, skip: null, prompt: null };

  const EV_ICON = {
    goal: '⚽', save: '🧤', miss: '💨', yellow: '🟨', red: '🟥', inj: '🚑', sub: '🔁', ht: '⏸️', ft: '🏁', ko: '📣',
    foul: '⚠️', pen: '🎯', penmiss: '❌', fk: '🎯', var: '📺', disallowed: '🚫', refmiss: '😡', controversy: '⚖️',
    heated: '🤼', crowd: '📢', talk: '🗣️', tactic: '📋', corner: '🚩', offside: '🚩', late: '🔥'
  };
  const PAUSE_LABEL = { goal: 'Goles', red: 'Expulsiones', inj: 'Lesiones (tuyas)', pen: 'Penaltis', var: 'VAR y polémicas', crowd: 'Incidentes en la grada', ht: 'Descanso (charla)' };

  function el(id) { return document.getElementById(id); }
  function settings() { return G.S.settings; }

  function open() {
    const S = G.S;
    UI.lineupWarning(S);
    const m = G.startMatch();
    if (!m) { A['play-quick'](); return; }
    Object.assign(MV, { m, paused: false, tab: 'feed', htDone: false, finished: false, summary: false, subOut: null, skip: null, prompt: null });
    MV.me = m.teams[0].isUser ? 0 : 1;
    const [h, a] = m.teams.map(t => S.clubs[t.club]);
    const L = W.userLeague(S);
    const root = document.createElement('div');
    root.className = 'match';
    root.id = 'match';
    root.innerHTML = `
      <div class="mh">
        <div class="comp">${esc(L.name)} · J${S.week + 1} · Árbitro: ${esc(m.ref.name)} (${m.ref.label})</div>
        <div class="score">
          <div class="t">${UI.crest(h)}<b>${esc(h.name)}</b></div>
          <div><div class="res num" id="mv-score">0-0</div><div class="min" id="mv-min">0'</div></div>
          <div class="t">${UI.crest(a)}<b>${esc(a.name)}</b></div>
        </div>
        <div class="mprog"><i id="mv-prog" style="width:0%"></i></div>
      </div>
      <div class="pitch-box"><canvas id="pitch" aria-label="Vista del partido"></canvas></div>
      <div class="mtabs"><div class="seg" id="mv-tabs">
          <button class="on" data-act="mv-tab" data-k="feed">Narración</button>
          <button data-act="mv-tab" data-k="stats">Estadísticas</button>
          <button data-act="mv-tab" data-k="lineups">Alineaciones</button>
      </div></div>
      <div class="mbody" id="mv-body"><div id="mv-feed"></div></div>
      <div class="mfoot"><div class="inner"><div id="mv-prompt"></div><div id="mv-foot"></div></div></div>`;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    for (const e of m.events) addEvent(e);
    MV.pitch = new TL.Pitch(el('pitch'), m, MV.me);
    MV.pitch.speed = settings().speed || 1;
    renderFoot();
    TL.SFX.startCrowd();
    TL.SFX.whistle(false);
    UI.Music.duck(true);
    // Primer partido: tutorial de controles (en pausa mientras se explica)
    if (!TL.Tutorial.done('match')) {
      pause('manual', null);
      setTimeout(() => { TL.Tutorial.start('match'); TL.Tutorial.onEnd(() => resume()); }, 400);
    } else schedule();
  }

  function addEvent(e) {
    const feed = el('mv-feed');
    if (!feed || !e.text) return;
    const d = document.createElement('div');
    const big = e.type === 'ht' || e.type === 'ft' || e.type === 'ko';
    const hot = e.controversy || ['red', 'refmiss', 'heated', 'crowd', 'disallowed'].includes(e.type);
    d.className = `ev ${e.type === 'goal' ? 'goal' : ''} ${hot ? 'hot' : ''} ${big ? 'big' : ''} side-${e.team === MV.me ? 0 : 1}`;
    const club = e.team >= 0 ? G.S.clubs[MV.m.teams[e.team].club] : null;
    d.innerHTML = `<span class="m">${e.min ? e.min + "'" : ''}</span><span class="i">${EV_ICON[e.type] || '•'}</span>
      <span class="x grow">${club ? `<b>${esc(club.code)}</b> · ` : ''}${e.text}</span>`;
    feed.prepend(d);
  }

  function updateHead() {
    const m = MV.m;
    el('mv-score').textContent = `${m.score[0]}-${m.score[1]}`;
    el('mv-min').textContent = m.done ? 'Final' : (m.min ? m.min + "'" : "0'");
    el('mv-prog').style.width = Math.min(100, m.min / 90 * 100) + '%';
  }

  /** ¿Este evento merece detener el partido para que decidas? */
  function pauseReason(e) {
    const P = settings().pause;
    const mine = e.team === MV.me;
    if (e.type === 'goal' && P.goal) return mine ? 'goalFor' : 'goalAgainst';
    if (e.type === 'red' && P.red) return mine ? 'redMine' : 'redOpp';
    if (e.type === 'inj' && P.inj && mine) return 'injMine';
    if (e.type === 'pen' && P.pen) return 'pen';
    if ((e.type === 'refmiss' || e.type === 'disallowed' || e.controversy) && P.var) return 'var';
    if ((e.type === 'crowd' || e.type === 'heated') && P.crowd) return 'crowd';
    return null;
  }

  function tick() {
    const m = MV.m;
    if (!m || MV.paused || m.done) return;
    // El reloj espera a que el campo termine de escenificar la jugada en curso
    if (MV.pitch && !MV.skip && MV.pitch.busy()) { schedule(70); return; }
    const evs = m.step();
    evs.forEach(addEvent);
    if (MV.pitch) MV.pitch.push(evs, !!MV.skip);
    if (evs.some(e => e.type === 'goal')) { const sc = el('mv-score'); TL.FX.pop(sc); }
    updateHead();
    if (MV.tab !== 'feed') renderTab();
    if (m.min === 45 && !MV.htDone) {
      MV.htDone = true;
      MV.skip = null;
      if (settings().pause.ht) { pause('ht', null); return; }
      m.teamTalk(MV.me, 'calm');
    }
    if (m.done) { onFinal(); return; }
    // Saltos: hasta el siguiente evento, el descanso, un minuto o el final
    if (MV.skip) {
      const hit = evs.map(e => [e, pauseReason(e)]).find(([, r]) => r);
      if (MV.skip.type === 'event' && hit) { MV.skip = null; pause(hit[1], hit[0]); return; }
      if (MV.skip.type === 'min' && m.min >= MV.skip.min) { MV.skip = null; pause('skip', null); return; }
      schedule(0);
      return;
    }
    const hit = evs.map(e => [e, pauseReason(e)]).find(([, r]) => r);
    if (hit) { pause(hit[1], hit[0]); return; }
    schedule();
  }

  function schedule(ms) {
    clearTimeout(MV.timer);
    if (MV.paused || !MV.m || MV.m.done) return;
    const speed = settings().speed || 1;
    MV.timer = setTimeout(tick, ms != null ? ms : BASE_MS / speed);
  }

  function pause(reason, ev) {
    MV.paused = true;
    if (MV.pitch) MV.pitch.hold = true;
    clearTimeout(MV.timer);
    MV.prompt = reason ? { reason, ev } : null;
    renderFoot();
  }

  function resume() {
    MV.paused = false;
    if (MV.pitch) MV.pitch.hold = false;
    MV.prompt = null;
    renderFoot();
    schedule();
  }

  function onFinal() {
    clearTimeout(MV.timer);
    MV.finished = true;
    if (MV.pitch) setTimeout(() => MV.pitch && MV.pitch.end(), 1200);
    MV.prompt = null;
    updateHead();
    renderFoot();
  }

  // ------------------------------------------------------------ Decisiones en pausa
  function promptHtml() {
    const p = MV.prompt;
    if (!p) return '';
    const S = G.S, m = MV.m, t = m.teams[MV.me];
    const who = p.ev && p.ev.pid != null ? esc(S.players[p.ev.pid].short) : '';
    const diff = m.score[MV.me] - m.score[1 - MV.me];
    const btn = (act, label, extra, primary) => `<button class="btn sm ${primary ? 'primary' : ''}" data-act="${act}" ${extra || ''}>${label}</button>`;
    const cont = btn('mv-resume', '▶ Seguir', '', true);
    let title = '', body = '', acts = '';
    switch (p.reason) {
      case 'ht': {
        title = `Descanso · ${m.score[0]}-${m.score[1]}`;
        if (t.talk) {
          body = `Charla: ${E.TALKS[t.talk.kind].name} (${t.talk.pct >= 0 ? '+' : ''}${t.talk.pct.toFixed(1)}% de rendimiento).`;
          acts = btn('mv-resume', '▶ 2ª parte', '', true) + btn('mv-subs', 'Cambios') + btn('mv-tactic', 'Táctica');
        } else {
          body = diff > 0 ? 'Vas ganando. ¿Qué les dices en el vestuario?' : diff < 0 ? 'Vas perdiendo. Es momento de reaccionar.' : 'Empate al descanso. ¿Cómo motivas al equipo?';
          acts = Object.entries(E.TALKS).map(([k, v]) => btn('mv-talk', v.name, `data-k="${k}"`)).join('');
        }
        break;
      }
      case 'goalFor': title = `¡Gol de ${who}!`; body = diff > 0 ? '¿Proteges la ventaja?' : 'El equipo está vivo.'; acts = (diff > 0 ? btn('mv-ment', 'Defensiva', 'data-m="0"') : '') + btn('mv-subs', 'Cambios') + cont; break;
      case 'goalAgainst': title = `Gol del rival (${who})`; body = diff < 0 ? 'Toca arriesgar.' : 'Reorganiza al equipo.'; acts = btn('mv-ment', 'Ofensiva', 'data-m="2"') + btn('mv-tactic', 'Táctica') + btn('mv-subs', 'Cambios') + cont; break;
      case 'redMine': title = `Roja a ${who}`; body = 'Te quedas con uno menos. Reajusta el sistema.'; acts = btn('mv-tactic', 'Táctica') + btn('mv-subs', 'Cambios') + btn('mv-ment', 'Defensiva', 'data-m="0"') + cont; break;
      case 'redOpp': title = `Roja al rival (${who})`; body = 'Juegas con superioridad numérica.'; acts = btn('mv-ment', 'Ofensiva', 'data-m="2"') + cont; break;
      case 'injMine': title = `Lesión: ${who}`; body = t.onPitch.some(o => o.hurt) ? 'Sigue en el campo mermado. Haz el cambio.' : 'Las asistencias le atienden.'; acts = btn('mv-subs', 'Hacer cambio', '', true) + btn('mv-resume', 'Seguir'); break;
      case 'pen': title = 'Penalti'; body = p.ev && p.ev.text ? p.ev.text : ''; acts = cont; break;
      case 'var': title = 'Polémica arbitral'; body = p.ev && p.ev.text ? p.ev.text : ''; acts = cont; break;
      case 'crowd': title = 'Partido detenido'; body = p.ev && p.ev.text ? p.ev.text : ''; acts = cont; break;
      default: title = 'Partido en pausa'; body = `Minuto ${m.min}.`; acts = btn('mv-subs', 'Cambios') + btn('mv-tactic', 'Táctica') + cont;
    }
    return `<div class="decision"><div class="dt">${title}</div>${body ? `<div class="db">${body}</div>` : ''}<div class="btn-row">${acts}</div></div>`;
  }

  function renderFoot() {
    const m = MV.m, t = m.teams[MV.me];
    const foot = el('mv-foot'), pr = el('mv-prompt');
    if (!foot) return;
    if (MV.finished) {
      pr.innerHTML = '';
      // Una vez visto el resumen, solo queda salir (la jornada ya se ha jugado)
      foot.innerHTML = MV.summary ? `<button class="btn primary block" data-act="mv-close">Continuar</button>`
        : `<button class="btn primary block" data-act="mv-done">Ver resumen</button>`;
      return;
    }
    pr.innerHTML = promptHtml();
    const sp = settings().speed || 1;
    foot.innerHTML = `
      <div class="row" style="gap:6px">
        <div class="seg grow" role="group" aria-label="Mentalidad">${UI.MENT.map((x, i) =>
          `<button class="${t.mentality === i ? 'on' : ''}" data-act="mv-ment" data-m="${i}">${x}</button>`).join('')}</div>
      </div>
      <div class="row" style="gap:6px">
        <div class="seg grow speeds" role="group" aria-label="Velocidad">${SPEEDS.map(v =>
          `<button class="${sp === v ? 'on' : ''}" data-act="mv-speed" data-v="${v}">x${v}</button>`).join('')}</div>
        <button class="icon-btn" data-act="mv-settings" aria-label="Pausas automáticas" title="Pausas automáticas">⚙</button>
      </div>
      <div class="btn-row ctl">
        <button class="btn sm ${MV.paused ? 'primary' : ''}" data-act="${MV.paused ? 'mv-resume' : 'mv-pause'}">${MV.paused ? '▶ Seguir' : '⏸ Pausa'}</button>
        <button class="btn sm" data-act="mv-subs">Cambios ${t.subs}/${t.maxSubs}</button>
        <button class="btn sm" data-act="mv-tactic">Táctica</button>
        <button class="btn sm" data-act="mv-skipmenu">⏭ Saltar</button>
      </div>`;
  }

  // ------------------------------------------------------------ Pestañas
  function renderTab() {
    const body = el('mv-body');
    const m = MV.m, S = G.S;
    if (MV.tab === 'feed') return;
    if (MV.tab === 'stats') {
      const n = Math.max(1, m.min);
      const poss = [Math.round(m.stats.possSum[0] / n * 100)];
      poss.push(100 - poss[0]);
      const st = m.stats;
      const rows = [['Posesión', poss[0] + '%', poss[1] + '%', poss[0], poss[1]],
        ['Tiros', st.shots[0], st.shots[1]], ['A puerta', st.onT[0], st.onT[1]], ['Córners', st.corners[0], st.corners[1]],
        ['Faltas', st.fouls[0], st.fouls[1]], ['Fueras de juego', st.offsides[0], st.offsides[1]], ['Penaltis', st.pens[0], st.pens[1]],
        ['Amarillas', st.yel[0], st.yel[1]], ['Rojas', st.red[0], st.red[1]]];
      body.innerHTML = rows.map(([k, a, b, x, y]) => {
        const va = x != null ? x : +a, vb = y != null ? y : +b;
        const tot = va + vb || 1;
        return `<div class="mstat"><span>${a}</span><div><div class="lbl">${k}</div><div class="vs"><i style="width:${va / tot * 100}%"></i><i style="width:${vb / tot * 100}%"></i></div></div><span style="text-align:right">${b}</span></div>`;
      }).join('') + scorersHtml() + `<p class="note mt center">Árbitro: ${esc(m.ref.name)} · ${m.ref.label}${m.ref.var ? ' · con VAR' : ' · sin VAR'}</p>`;
    } else {
      body.innerHTML = `<div class="grid two">${m.teams.map(t => {
        const c = S.clubs[t.club];
        const on = t.onPitch.map(o => {
          const p = S.players[o.pid], r = m.pl[o.pid];
          return `<div class="row" style="padding:5px 0;font-size:14px">${UI.posB(o.slot)}<span class="grow ellipsis">${esc(p.short)}</span>
            ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '<span class="faint">A</span>' : ''}${r.y ? '🟨' : ''}${o.hurt ? '🚑' : ''}<b class="num">${p.ovr}</b></div>`;
        }).join('');
        const bench = t.bench.map(id => `<span class="faint">${esc(S.players[id].short)}</span>`).join(', ');
        return `<div class="card"><div class="row" style="margin-bottom:6px">${UI.crest(c, 'sm')}<b class="grow ellipsis">${esc(c.name)}</b><span class="note">${t.formation} · ${UI.MENT[t.mentality]}</span></div>
          ${on}<p class="note mt">Banquillo: ${bench || '—'}</p></div>`;
      }).join('')}</div>`;
    }
  }

  function scorersHtml() {
    const m = MV.m, S = G.S;
    const goals = m.events.filter(e => e.type === 'goal');
    if (!goals.length) return '';
    return `<div class="card mt">${goals.map(e =>
      `<div class="row" style="padding:4px 0"><span class="num faint" style="width:32px">${e.min}'</span><span>${e.kind === 'pen' ? '🎯' : '⚽'}</span>
       <b>${esc(S.players[e.pid].short)}</b><span class="note">${esc(S.clubs[m.teams[e.team].club].code)}${e.kind === 'pen' ? ' · penalti' : e.kind === 'fk' ? ' · falta directa' : ''}${e.pid2 != null ? ' · asist. ' + esc(S.players[e.pid2].short) : ''}</span></div>`).join('')}</div>`;
  }

  A['mv-tab'] = b => {
    MV.tab = b.dataset.k;
    document.querySelectorAll('#mv-tabs button').forEach(x => x.classList.toggle('on', x === b));
    if (MV.tab === 'feed') {
      el('mv-body').innerHTML = '<div id="mv-feed"></div>';
      for (const e of MV.m.events) addEvent(e);
    } else renderTab();
  };

  // ------------------------------------------------------------ Controles
  A['mv-ment'] = b => {
    MV.m.setMentality(MV.me, +b.dataset.m);
    UI.toast(`Mentalidad: ${UI.MENT[+b.dataset.m]}`);
    if (MV.prompt && MV.prompt.reason !== 'ht') { resume(); return; }
    renderFoot();
  };
  A['mv-pause'] = () => pause('manual', null);
  A['mv-resume'] = () => {
    const m = MV.m;
    if (m.min === 45 && !m.teams[MV.me].talk) m.teamTalk(MV.me, 'calm');
    resume();
  };
  A['mv-speed'] = b => { settings().speed = +b.dataset.v; if (MV.pitch) MV.pitch.speed = +b.dataset.v; renderFoot(); schedule(); };
  A['mv-talk'] = b => {
    const r = MV.m.teamTalk(MV.me, b.dataset.k);
    const last = MV.m.events[MV.m.events.length - 1];
    if (last && last.type === 'talk') addEvent(last);
    if (r) UI.toast(r.mood.charAt(0).toUpperCase() + r.mood.slice(1));
    renderFoot();
  };

  A['mv-skipmenu'] = () => {
    const m = MV.m;
    pause(null, null);
    const opts = [['event', 'Hasta el próximo momento clave']];
    if (m.min < 45) opts.push(['ht', 'Hasta el descanso']);
    if (m.min < 60) opts.push(['60', 'Hasta el minuto 60']);
    if (m.min < 75) opts.push(['75', 'Hasta el minuto 75']);
    if (m.min < 85) opts.push(['85', 'Hasta el minuto 85']);
    opts.push(['end', 'Hasta el final (sin pausas)']);
    UI.sheet(UI.sheetHead('Saltar') + `<div class="col">${opts.map(([k, l]) =>
      `<button class="btn block" data-act="mv-skip" data-k="${k}">${l}</button>`).join('')}</div>
      <p class="note mt">El partido se simula al instante y se detiene en el punto elegido o en el primer momento clave (goles, rojas, lesiones, penaltis, VAR…) según tus pausas automáticas.</p>`,
    { onClose: () => { if (!MV.skip && !MV.finished) renderFoot(); } });
  };
  A['mv-skip'] = b => {
    const k = b.dataset.k, m = MV.m;
    UI.closeSheet();
    if (k === 'end') {
      clearTimeout(MV.timer);
      while (!m.done) {
        const evs = m.step();
        evs.forEach(addEvent);
        if (MV.pitch) MV.pitch.push(evs, true);
        if (m.min === 45 && !MV.htDone) { MV.htDone = true; m.teamTalk(MV.me, 'calm'); }
      }
      MV.htDone = true;
      onFinal();
      if (MV.tab !== 'feed') renderTab();
      return;
    }
    MV.skip = k === 'event' ? { type: 'event' } : { type: 'min', min: k === 'ht' ? 45 : +k };
    if (k === 'ht') MV.skip = { type: 'min', min: 45 };
    MV.paused = false; MV.prompt = null;
    if (MV.pitch) MV.pitch.hold = false;
    renderFoot();
    schedule(0);
  };

  A['mv-settings'] = () => {
    const wasPaused = MV.paused;
    pause(MV.prompt ? MV.prompt.reason : null, MV.prompt ? MV.prompt.ev : null);
    const P = settings().pause;
    UI.sheet(UI.sheetHead('Pausas automáticas') + `<p class="note">El partido se detiene en estos momentos para que puedas decidir.</p>
      ${Object.entries(PAUSE_LABEL).map(([k, l]) => `<label class="row between toggle"><span>${l}</span>
        <input type="checkbox" data-change="mv-pausecfg" data-k="${k}" ${P[k] ? 'checked' : ''}></label>`).join('')}`,
    { onClose: () => { if (!wasPaused) resume(); else renderFoot(); } });
  };
  UI.changes['mv-pausecfg'] = c => { settings().pause[c.dataset.k] = c.checked; G.save(); };

  // Táctica en pleno partido
  A['mv-tactic'] = () => {
    const wasPaused = MV.paused;
    if (!MV.paused) pause('manual', null);
    tacticSheet(wasPaused);
  };
  function tacticSheet(wasPaused) {
    const t = MV.m.teams[MV.me];
    UI.sheet(UI.sheetHead('Táctica') + `<div class="group-title">Sistema (${t.onPitch.length} en el campo)</div>
      <div class="chips wrap" style="flex-wrap:wrap">${Object.keys(E.FORMATIONS).map(f =>
        `<button class="chip ${t.formation === f ? 'on' : ''}" data-act="mv-form" data-f="${f}">${f}</button>`).join('')}</div>
      <div class="group-title">Mentalidad</div>
      <div class="seg">${UI.MENT.map((x, i) => `<button class="${t.mentality === i ? 'on' : ''}" data-act="mv-ment2" data-m="${i}">${x}</button>`).join('')}</div>
      <div class="group-title">En el campo</div>
      ${t.onPitch.map(o => { const p = G.S.players[o.pid]; return `<div class="row" style="padding:5px 0">${UI.posB(o.slot)}<span class="grow">${esc(p.name)}</span><span class="note">${Math.round(E.fit(p, o.slot) * 100)}%</span></div>`; }).join('')}
      <button class="btn primary block mt" data-act="close-sheet">Listo</button>`,
    { onClose: () => { if (!wasPaused) resume(); else renderFoot(); } });
    MV.tacticWasPaused = wasPaused;
  }
  A['mv-form'] = b => {
    if (MV.m.changeFormation(MV.me, b.dataset.f)) {
      const last = MV.m.events[MV.m.events.length - 1];
      if (last && last.type === 'tactic') addEvent(last);
    }
    tacticSheet(MV.tacticWasPaused);
    if (MV.tab !== 'feed') renderTab();
  };
  A['mv-ment2'] = b => { MV.m.setMentality(MV.me, +b.dataset.m); tacticSheet(MV.tacticWasPaused); };

  // Cambios
  A['mv-subs'] = () => {
    const wasPaused = MV.paused;
    if (!MV.paused) pause('manual', null);
    MV.subOut = null;
    MV.subWasPaused = wasPaused;
    subSheet();
  };
  function subSheet() {
    const m = MV.m, S = G.S, t = m.teams[MV.me];
    const done = () => { if (!MV.subWasPaused) resume(); else renderFoot(); };
    const left = t.maxSubs - t.subs;
    let html = UI.sheetHead(`Cambios (${left} restantes)`);
    if (!left) html += '<div class="empty">Ya has hecho todos los cambios.</div>';
    else if (MV.subOut == null) {
      html += '<p class="note">¿Quién sale?</p>' + t.onPitch.map(o => {
        const p = S.players[o.pid], r = m.pl[o.pid];
        return UI.playerRow(S, p, { act: 'mv-sub-out', sub: `${F.POS_ES[o.slot]} · forma ${p.fit}%${o.hurt ? ' · 🚑 lesionado' : ''}${r && r.y ? ' · 🟨 amonestado' : ''}` });
      }).join('');
    } else {
      const o = t.onPitch.find(x => x.pid === MV.subOut);
      html += `<p class="note">Sale ${esc(S.players[MV.subOut].short)} (${F.POS_ES[o.slot]}). ¿Quién entra?</p>` +
        (t.bench.length ? t.bench.map(id => S.players[id]).sort((a, b) => E.eff(b, o.slot) - E.eff(a, o.slot)).map(p =>
          UI.playerRow(S, p, { act: 'mv-sub-in', sub: `${Math.round(E.fit(p, o.slot) * 100)}% en ${F.POS_ES[o.slot]} · forma ${p.fit}%` })).join('')
          : '<div class="empty">No quedan suplentes.</div>');
    }
    UI.sheet(html, { onClose: done });
  }
  A['mv-sub-out'] = b => { MV.subOut = +b.dataset.id; subSheet(); };
  A['mv-sub-in'] = b => {
    const m = MV.m;
    const ok = m.substitute(MV.me, MV.subOut, +b.dataset.id);
    const last = m.events[m.events.length - 1];
    if (ok && last && last.type === 'sub') addEvent(last);
    MV.subOut = null;
    if (MV.prompt && MV.prompt.reason === 'injMine') MV.prompt = { reason: 'manual' };
    UI.closeSheet();
    if (MV.tab !== 'feed') renderTab();
  };

  // ------------------------------------------------------------ Final
  A['mv-done'] = () => {
    const m = MV.m, S = G.S;
    if (!m || MV.summary) return;
    MV.summary = true;
    G.completeRound(m);
    const res = S.fixtures[S.week - 1].find(x => x[0] === S.user || x[1] === S.user);
    const t = m.teams[MV.me];
    const rated = Object.keys(m.pl).map(Number).filter(id => m.pl[id].team === MV.me);
    const notes = m.lastRatings || {};
    const rows = rated.map(id => [id, notes[id]]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const mom = m.mom;
    const L = W.userLeague(S);
    const body = el('mv-body');
    const letter = UI.resultLetter(S, res);
    const inc = (m.incidents || []).length;
    if (letter === 'V') { TL.FX.confetti(); TL.SFX.goal(true); }
    else if (letter === 'D') TL.SFX.groan();
    body.innerHTML = `<div class="card center" style="margin-bottom:12px"><div style="font-family:var(--font-c);font-weight:800;font-size:28px;color:${letter === 'V' ? 'var(--accent2)' : letter === 'D' ? 'var(--danger)' : 'var(--muted)'}">
        ${letter === 'V' ? 'Victoria' : letter === 'D' ? 'Derrota' : 'Empate'}</div>
        ${mom != null ? `<p class="note" style="margin:6px 0 0">MVP: <b>${esc(S.players[mom].name)}</b> (${esc(S.clubs[m.teams[m.pl[mom].team].club].name)})</p>` : ''}
        ${inc ? `<p class="note bad" style="margin:6px 0 0">El partido deja ${inc} incidente${inc > 1 ? 's' : ''}: revisa las noticias y el buzón.</p>` : ''}</div>
      ${scorersHtml()}
      <div class="mt">${UI.reviewCard(S, 0)}</div>
      <div class="card mt" style="padding:8px 10px"><div class="group-title">Notas · ${esc(S.clubs[t.club].name)}</div>
        ${rows.map(([id, r]) => {
          const p = S.players[id], rec = m.pl[id];
          return `<div class="row" style="padding:6px 0;border-bottom:1px solid rgb(255 255 255 / .04)">${UI.posB(rec.slot)}<span class="grow ellipsis">${esc(p.name)}</span>
            ${rec.g ? '⚽'.repeat(rec.g) : ''}${rec.a ? '🅰️' : ''}${rec.y ? '🟨' : ''}${rec.r ? '🟥' : ''}${p.inj > 0 ? '🚑' : ''}
            <span class="rating ${r >= 7.5 ? 'hi' : r < 6 ? 'lo' : ''}">${r != null ? r.toFixed(1) : '—'}</span></div>`;
        }).join('')}</div>
      <div class="card mt" style="padding:6px 10px"><div class="group-title">${esc(L.name)} · Jornada ${S.week}</div>
        ${S.fixtures[S.week - 1].map(x => UI.fixtureHtml(S, x)).join('')}</div>`;
    if (TL.Mentor) body.querySelectorAll('[data-face]').forEach(f => new TL.Mentor.Face(f));
    el('mv-prompt').innerHTML = '';
    el('mv-foot').innerHTML = `<button class="btn primary block" data-act="mv-close">Continuar</button>`;
    document.querySelectorAll('#mv-tabs button').forEach(x => { x.disabled = true; x.classList.remove('on'); });
  };
  A['mv-close'] = () => {
    clearTimeout(MV.timer);
    if (MV.pitch) { MV.pitch.destroy(); MV.pitch = null; }
    TL.SFX.stopCrowd();
    UI.Music.duck(false);
    const r = el('match');
    if (r) r.remove();
    document.body.style.overflow = '';
    MV.m = null;
    UI.tab = 'home';
    UI.render(false);
    UI.celebrate(G.S);
  };

  A['play-live'] = () => open();
  TL.MatchView = { open, MV };
})();
