/* TOUCHLINE — partido en directo: narración, estadísticas, cambios y mentalidad */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U, World: W, Game: G, UI } = TL;
  const esc = U.esc;
  const A = UI.actions;

  const SPEEDS = { 1: 420, 3: 110 };
  const MV = { m: null, timer: null, speed: 1, paused: false, tab: 'feed', me: 0, htDone: false, finished: false, subOut: null };

  const EV_ICON = { goal: '⚽', save: '🧤', miss: '💨', yellow: '🟨', red: '🟥', inj: '🚑', sub: '🔁', ht: '⏸️', ft: '🏁', ko: '📣' };

  function el(id) { return document.getElementById(id); }

  function open() {
    const m = G.startMatch();
    if (!m) { A['play-quick'](); return; }
    Object.assign(MV, { m, speed: 1, paused: false, tab: 'feed', htDone: false, finished: false, subOut: null });
    MV.me = m.teams[0].isUser ? 0 : 1;
    const S = G.S;
    const [h, a] = m.teams.map(t => S.clubs[t.club]);
    const L = W.userLeague(S);
    const root = document.createElement('div');
    root.className = 'match';
    root.id = 'match';
    root.innerHTML = `
      <div class="mh">
        <div class="comp">${esc(L.name)} · Jornada ${S.week + 1}</div>
        <div class="score">
          <div class="t">${UI.crest(h, 'lg')}<b>${esc(h.name)}</b></div>
          <div><div class="res num" id="mv-score">0-0</div><div class="min" id="mv-min">0'</div></div>
          <div class="t">${UI.crest(a, 'lg')}<b>${esc(a.name)}</b></div>
        </div>
        <div class="mprog"><i id="mv-prog" style="width:0%"></i></div>
        <div class="seg" style="margin-top:10px" id="mv-tabs">
          <button class="on" data-act="mv-tab" data-k="feed">Narración</button>
          <button data-act="mv-tab" data-k="stats">Estadísticas</button>
          <button data-act="mv-tab" data-k="lineups">Alineaciones</button>
        </div>
      </div>
      <div class="mbody" id="mv-body"><div id="mv-feed"></div></div>
      <div class="mfoot"><div class="inner" id="mv-foot"></div></div>`;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    for (const e of m.events) addEvent(e);
    renderFoot();
    schedule();
  }

  function addEvent(e) {
    const feed = el('mv-feed');
    if (!feed) return;
    const d = document.createElement('div');
    const big = e.type === 'ht' || e.type === 'ft' || e.type === 'ko';
    d.className = `ev ${e.type === 'goal' ? 'goal' : ''} ${big ? 'big' : ''} side-${e.team === MV.me ? 0 : 1}`;
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

  function tick() {
    const m = MV.m;
    if (!m || MV.paused || m.done) return;
    const evs = m.step();
    evs.forEach(addEvent);
    updateHead();
    if (MV.tab !== 'feed') renderTab();
    if (m.min === 45 && !MV.htDone) {
      MV.htDone = true;
      MV.paused = true;
      renderFoot();
      return;
    }
    if (m.done) { onFinal(); return; }
    schedule();
  }

  function schedule() {
    clearTimeout(MV.timer);
    if (!MV.paused && MV.m && !MV.m.done) MV.timer = setTimeout(tick, SPEEDS[MV.speed]);
  }

  function onFinal() {
    clearTimeout(MV.timer);
    MV.finished = true;
    updateHead();
    renderFoot();
  }

  function renderFoot() {
    const m = MV.m, t = m.teams[MV.me];
    const foot = el('mv-foot');
    if (!foot) return;
    if (MV.finished) {
      foot.innerHTML = `<button class="btn primary block" data-act="mv-done">Ver resumen</button>`;
      return;
    }
    const ht = MV.paused && m.min === 45;
    foot.innerHTML = `
      <div class="seg" role="group" aria-label="Mentalidad">${UI.MENT.map((x, i) =>
        `<button class="${t.mentality === i ? 'on' : ''}" data-act="mv-ment" data-m="${i}">${x}</button>`).join('')}</div>
      <div class="btn-row">
        <button class="btn sm ${MV.paused ? 'primary' : ''}" data-act="mv-pause">${ht ? '▶ 2ª parte' : MV.paused ? '▶ Seguir' : '⏸ Pausa'}</button>
        <button class="btn sm" data-act="mv-speed">${MV.speed === 1 ? '▶▶ Rápido' : '▶ Normal'}</button>
        <button class="btn sm" data-act="mv-subs">Cambios ${t.subs}/${t.maxSubs}</button>
        <button class="btn sm" data-act="mv-skip">⏭ Final</button>
      </div>`;
  }

  function renderTab() {
    const body = el('mv-body');
    const m = MV.m, S = G.S;
    if (MV.tab === 'feed') return;
    if (MV.tab === 'stats') {
      const n = Math.max(1, m.min);
      const poss = [Math.round(m.stats.possSum[0] / n * 100)];
      poss.push(100 - poss[0]);
      const rows = [['Posesión', poss[0] + '%', poss[1] + '%', poss[0], poss[1]],
        ['Tiros', m.stats.shots[0], m.stats.shots[1]], ['A puerta', m.stats.onT[0], m.stats.onT[1]],
        ['Amarillas', m.stats.yel[0], m.stats.yel[1]], ['Rojas', m.stats.red[0], m.stats.red[1]]];
      body.innerHTML = rows.map(([k, a, b, x, y]) => {
        const va = x != null ? x : +a, vb = y != null ? y : +b;
        const tot = va + vb || 1;
        return `<div class="mstat"><span>${a}</span><div><div class="lbl">${k}</div><div class="vs"><i style="width:${va / tot * 100}%"></i><i style="width:${vb / tot * 100}%"></i></div></div><span style="text-align:right">${b}</span></div>`;
      }).join('') + scorersHtml();
    } else {
      body.innerHTML = `<div class="grid two">${m.teams.map(t => {
        const c = S.clubs[t.club];
        const on = t.onPitch.map(o => {
          const p = S.players[o.pid], r = m.pl[o.pid];
          return `<div class="row" style="padding:5px 0;font-size:14px">${UI.posB(o.slot)}<span class="grow ellipsis">${esc(p.short)}</span>
            ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '<span class="faint">A</span>' : ''}${r.y ? '🟨' : ''}${o.hurt ? '🚑' : ''}<b class="num">${p.ovr}</b></div>`;
        }).join('');
        const bench = t.bench.map(id => `<span class="faint">${esc(S.players[id].short)}</span>`).join(', ');
        return `<div class="card"><div class="row" style="margin-bottom:6px">${UI.crest(c, 'sm')}<b class="grow ellipsis">${esc(c.name)}</b><span class="note">${t.formation}</span></div>
          ${on}<p class="note mt">Banquillo: ${bench || '—'}</p></div>`;
      }).join('')}</div>`;
    }
  }

  function scorersHtml() {
    const m = MV.m, S = G.S;
    const goals = m.events.filter(e => e.type === 'goal');
    if (!goals.length) return '';
    return `<div class="card mt">${goals.map(e =>
      `<div class="row" style="padding:4px 0"><span class="num faint" style="width:32px">${e.min}'</span><span>⚽</span>
       <b>${esc(S.players[e.pid].short)}</b><span class="note">${esc(S.clubs[m.teams[e.team].club].code)}${e.pid2 != null ? ' · asist. ' + esc(S.players[e.pid2].short) : ''}</span></div>`).join('')}</div>`;
  }

  A['mv-tab'] = b => {
    MV.tab = b.dataset.k;
    document.querySelectorAll('#mv-tabs button').forEach(x => x.classList.toggle('on', x === b));
    if (MV.tab === 'feed') {
      el('mv-body').innerHTML = '<div id="mv-feed"></div>';
      for (const e of MV.m.events) addEvent(e);
    } else renderTab();
  };
  A['mv-ment'] = b => {
    MV.m.setMentality(MV.me, +b.dataset.m);
    renderFoot();
  };
  A['mv-pause'] = () => { MV.paused = !MV.paused; renderFoot(); schedule(); };
  A['mv-speed'] = () => { MV.speed = MV.speed === 1 ? 3 : 1; renderFoot(); schedule(); };
  A['mv-skip'] = () => {
    clearTimeout(MV.timer);
    const m = MV.m;
    while (!m.done) m.step().forEach(addEvent);
    MV.htDone = true;
    onFinal();
    if (MV.tab !== 'feed') renderTab();
  };

  // Cambios
  A['mv-subs'] = () => {
    const wasPaused = MV.paused;
    MV.paused = true; clearTimeout(MV.timer);
    MV.subOut = null;
    subSheet(wasPaused);
  };
  function subSheet(wasPaused) {
    const m = MV.m, S = G.S, t = m.teams[MV.me];
    const done = () => { MV.paused = wasPaused; renderFoot(); schedule(); };
    const left = t.maxSubs - t.subs;
    let html = UI.sheetHead(`Cambios (${left} restantes)`);
    if (!left) html += '<div class="empty">Ya has hecho todos los cambios.</div>';
    else if (MV.subOut == null) {
      html += '<p class="note">¿Quién sale?</p>' + t.onPitch.map(o => {
        const p = S.players[o.pid];
        return UI.playerRow(S, p, { act: 'mv-sub-out', sub: `${F.POS_ES[o.slot]} · forma ${p.fit}%${o.hurt ? ' · lesionado' : ''}` });
      }).join('');
    } else {
      const o = t.onPitch.find(x => x.pid === MV.subOut);
      html += `<p class="note">Sale ${esc(S.players[MV.subOut].short)} (${F.POS_ES[o.slot]}). ¿Quién entra?</p>` +
        (t.bench.length ? t.bench.map(id => S.players[id]).sort((a, b) => TL.Engine.eff(b, o.slot) - TL.Engine.eff(a, o.slot)).map(p =>
          UI.playerRow(S, p, { act: 'mv-sub-in', sub: `${Math.round(TL.Engine.fit(p, o.slot) * 100)}% en ${F.POS_ES[o.slot]} · forma ${p.fit}%` })).join('')
          : '<div class="empty">No quedan suplentes.</div>');
    }
    UI.sheet(html, { onClose: done });
  }
  A['mv-sub-out'] = b => { MV.subOut = +b.dataset.id; subSheet(MV.paused); };
  A['mv-sub-in'] = b => {
    const m = MV.m;
    const ok = m.substitute(MV.me, MV.subOut, +b.dataset.id);
    const last = m.events[m.events.length - 1];
    if (ok && last && last.type === 'sub') addEvent(last);
    MV.subOut = null;
    UI.closeSheet();
    if (MV.tab !== 'feed') renderTab();
  };

  // Final: aplica la jornada y muestra el resumen
  A['mv-done'] = () => {
    const m = MV.m, S = G.S;
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
    body.innerHTML = `<div class="card center" style="margin-bottom:12px"><div style="font-family:var(--font-c);font-weight:800;font-size:28px;color:${letter === 'V' ? 'var(--accent2)' : letter === 'D' ? 'var(--danger)' : 'var(--muted)'}">
        ${letter === 'V' ? 'Victoria' : letter === 'D' ? 'Derrota' : 'Empate'}</div>
        ${mom != null ? `<p class="note" style="margin:6px 0 0">MVP: <b>${esc(S.players[mom].name)}</b> (${esc(S.clubs[m.teams[m.pl[mom].team].club].name)})</p>` : ''}</div>
      ${scorersHtml()}
      <div class="card mt" style="padding:8px 10px"><div class="group-title">Notas · ${esc(S.clubs[t.club].name)}</div>
        ${rows.map(([id, r]) => {
          const p = S.players[id], rec = m.pl[id];
          return `<div class="row" style="padding:6px 0;border-bottom:1px solid rgb(255 255 255 / .04)">${UI.posB(rec.slot)}<span class="grow ellipsis">${esc(p.name)}</span>
            ${rec.g ? '⚽'.repeat(rec.g) : ''}${rec.a ? '🅰️' : ''}${rec.y ? '🟨' : ''}${rec.r ? '🟥' : ''}${p.inj > 0 ? '🚑' : ''}
            <span class="rating ${r >= 7.5 ? 'hi' : r < 6 ? 'lo' : ''}">${r != null ? r.toFixed(1) : '—'}</span></div>`;
        }).join('')}</div>
      <div class="card mt" style="padding:6px 10px"><div class="group-title">${esc(L.name)} · Jornada ${S.week}</div>
        ${S.fixtures[S.week - 1].map(x => UI.fixtureHtml(S, x)).join('')}</div>`;
    el('mv-foot').innerHTML = `<button class="btn primary block" data-act="mv-close">Continuar</button>`;
    document.querySelectorAll('#mv-tabs button').forEach(x => { x.disabled = true; x.classList.remove('on'); });
  };
  A['mv-close'] = () => {
    clearTimeout(MV.timer);
    const r = el('match');
    if (r) r.remove();
    document.body.style.overflow = '';
    MV.m = null;
    UI.tab = 'home';
    UI.render(false);
  };

  A['play-live'] = () => open();
  TL.MatchView = { open };
})();
