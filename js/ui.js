/* TOUCHLINE — interfaz: shell, vistas, fichas y asistente de nueva partida */
(function () {
  'use strict';
  const TL = window.TL;
  const { F, U, World: W, Engine: E, Season: SE, Market: M, Game: G } = TL;
  const esc = U.esc;

  // ------------------------------------------------------------ Iconos
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    squad: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tactics: '<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/><path d="M8 2v4h8V2M8 22v-4h8v4"/>',
    league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    market: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    club: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-5h6v5"/>',
    musicOn: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    musicOff: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M2 2l20 20"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 18l6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'
  };
  function icon(n) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  }

  const TABS = [
    ['home', 'Inicio'], ['squad', 'Plantilla'], ['tactics', 'Tácticas'],
    ['league', 'Liga'], ['market', 'Mercado'], ['club', 'Club']
  ];

  // ------------------------------------------------------------ Estado de la UI
  const UI = {
    tab: 'home',
    squadSort: 'pos',
    league: { tab: 'table', round: null },
    market: { tab: 'search', f: { q: '', pos: '', minOvr: '', maxAge: '', maxValue: '', league: '', sort: 'ovr' }, limit: 40 },
    nego: null,
    wz: null,
    actions: {},
    changes: {}
  };
  const A = UI.actions, C = UI.changes;
  const app = () => document.getElementById('app');

  // ------------------------------------------------------------ Componentes
  function crest(c, cls) {
    return `<span class="crest ${cls || ''}" style="--c1:${c.c1};--c2:${c.c2}" aria-hidden="true">${esc(c.code)}</span>`;
  }
  function crestFor(name, cls) {
    const [c1, c2] = U.clubColors(name);
    return crest({ c1, c2, code: U.clubCode(name) }, cls);
  }
  function posB(pos) { return `<span class="pos l${F.LINE[pos]}">${F.POS_ES[pos]}</span>`; }
  function ovrCls(v) { return v >= 85 ? 't1' : v >= 75 ? 't2' : v >= 65 ? 't3' : 't4'; }
  function ovrB(v) { return `<span class="ovr ${ovrCls(v)}">${v}</span>`; }
  function fitB(f) { return `<span class="fit ${f < 60 ? 'low' : f < 80 ? 'mid' : ''}" title="Forma física ${f}%"><i style="width:${f}%"></i></span>`; }
  function flag(S, p) { return S.nations[p.nat] ? S.nations[p.nat][1] : ''; }
  function stars(rep, max) {
    const n = U.clamp(Math.round((rep - 57) / 5), 1, max || 5);
    return `<span class="stars" aria-label="${n} estrellas">${'★'.repeat(n)}<span class="faint">${'★'.repeat((max || 5) - n)}</span></span>`;
  }
  function starsN(n) { return `<span class="stars">${'★'.repeat(n)}<span class="faint">${'★'.repeat(5 - n)}</span></span>`; }
  function formHtml(arr) { return `<span class="form">${arr.slice(-5).map(r => `<i class="${r}">${r}</i>`).join('')}</span>`; }
  function clubName(S, id) { return id === -1 ? 'Agente libre' : id === -2 ? 'Retirado' : S.clubs[id].name; }

  function playerTags(S, p) {
    const t = [];
    if (p.inj > 0) t.push(`<span class="tag inj">LES ${p.inj}s</span>`);
    if (p.sus > 0) t.push('<span class="tag sus">SANC</span>');
    if (p.listed) t.push('<span class="tag list">EN VENTA</span>');
    if (p.club === S.user && p.contract <= S.season + 1) t.push(`<span class="tag exp">FIN ${p.contract}</span>`);
    return t.join('');
  }

  function playerRow(S, p, o) {
    o = o || {};
    const sub = o.sub != null ? o.sub : `${flag(S, p)} ${p.age} años · ${U.money(W.value(S, p))}`;
    return `<button class="prow ${o.cls || ''}" data-act="${o.act || 'player'}" data-id="${p.id}"${o.attrs || ''}>
      ${posB(p.pos)}
      <span class="pmain"><span class="pname">${esc(p.name)}${playerTags(S, p)}</span><span class="psub">${sub}</span></span>
      ${o.cols ? `<span class="pcols">${o.cols}</span>` : ''}
      ${o.right || ''}
      ${ovrB(p.ovr)}
    </button>`;
  }

  function toast(msg, bad) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = ''; }, 2600);
  }

  // ------------------------------------------------------------ Hojas modales
  function sheet(html, opts) {
    opts = opts || {};
    const root = document.getElementById('sheet-root');
    let back = root.querySelector('.sheet-back');
    const keep = back && opts.keepScroll ? back.querySelector('.sheet').scrollTop : 0;
    if (!back) {
      back = document.createElement('div');
      back.className = 'sheet-back';
      back.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"></div>';
      back.addEventListener('click', e => { if (e.target === back) closeSheet(); });
      root.appendChild(back);
    }
    const sh = back.querySelector('.sheet');
    sh.innerHTML = `<div class="grab"></div>${html}`;
    sh.scrollTop = keep;
    UI.onSheetClose = opts.onClose || null;
    return sh;
  }
  function closeSheet() {
    const root = document.getElementById('sheet-root');
    root.innerHTML = '';
    UI.nego = null;
    const cb = UI.onSheetClose;
    UI.onSheetClose = null;
    if (cb) cb();
  }
  function sheetHead(title, extra) {
    return `<div class="sheet-head"><h2>${title}</h2>${extra || ''}<button class="icon-btn" data-act="close-sheet" aria-label="Cerrar">${icon('close')}</button></div>`;
  }
  function confirmBox(title, text, okLabel, onOk, danger) {
    sheet(`${sheetHead(esc(title))}<p class="muted">${text}</p>
      <div class="btn-row mt"><button class="btn" data-act="close-sheet">Cancelar</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm-ok">${esc(okLabel)}</button></div>`);
    UI.confirmOk = onOk;
  }
  A['confirm-ok'] = () => { const f = UI.confirmOk; UI.confirmOk = null; closeSheet(); if (f) f(); };
  A['close-sheet'] = () => closeSheet();

  // ------------------------------------------------------------ Música
  const Music = {
    on() { try { return localStorage.getItem('touchline.music') !== '0'; } catch (e) { return true; } },
    el() { return document.getElementById('bgm'); },
    start() {
      const a = Music.el();
      if (!a || !Music.on()) return;
      a.volume = 0.35;
      const p = a.play();
      if (p && p.catch) p.catch(() => { /* bloqueado hasta interacción */ });
    },
    toggle() {
      const on = !Music.on();
      try { localStorage.setItem('touchline.music', on ? '1' : '0'); } catch (e) { /* nada */ }
      if (on) Music.start(); else Music.el().pause();
      document.querySelectorAll('[data-act="music"]').forEach(b => { b.innerHTML = icon(on ? 'musicOn' : 'musicOff'); });
      toast(on ? 'Música activada' : 'Música desactivada');
    }
  };
  A.music = () => Music.toggle();
  UI.Music = Music;

  // ------------------------------------------------------------ Shell
  function renderShell() {
    app().innerHTML = `<div class="shell">
      <header class="topbar" id="topbar"></header>
      <main class="content" id="view"></main>
      <nav class="nav" id="nav" aria-label="Secciones"></nav>
    </div>`;
  }

  function renderTop(S) {
    const c = S.clubs[S.user];
    const L = W.userLeague(S);
    const d = U.dateOf(S.season, S.week).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const wk = S.over ? 'Fin de temporada' : `J${Math.min(S.week + 1, S.fixtures.length)} · ${d}`;
    document.getElementById('topbar').innerHTML = `
      ${crest(c)}
      <div class="grow"><div class="club-name ellipsis">${esc(c.name)}</div><div class="club-sub ellipsis">${U.seasonLabel(S.season)} · ${wk} · ${esc(L.name)}</div></div>
      <div class="cash ${c.cash < 0 ? 'neg' : ''}">${U.money(c.cash)}<small>Saldo</small></div>
      <button class="icon-btn" data-act="music" aria-label="Música">${icon(Music.on() ? 'musicOn' : 'musicOff')}</button>`;
    const unread = S.inbox.filter(m => !m.read).length;
    document.getElementById('nav').innerHTML = TABS.map(([k, label]) =>
      `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-current="${UI.tab === k ? 'page' : 'false'}">
        ${icon(k)}<span>${label}</span>${k === 'home' && unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''}</button>`).join('');
  }

  const VIEWS = {};
  function render(keepScroll) {
    const S = G.S;
    if (!S) return renderTitle();
    if (S.fired) return renderFired();
    if (!document.getElementById('view')) renderShell();
    const y = window.scrollY;
    renderTop(S);
    document.getElementById('view').innerHTML = VIEWS[UI.tab](S);
    if (VIEWS[UI.tab + 'After']) VIEWS[UI.tab + 'After'](S);
    window.scrollTo(0, keepScroll ? y : 0);
  }
  UI.render = render;
  UI.refresh = () => render(true);
  A.tab = el => { UI.tab = el.dataset.tab; render(false); };

  function pageTitle(t, sub, right) {
    return `<div class="page-title"><div><h1>${t}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${right || ''}</div>`;
  }

  // ------------------------------------------------------------ Inicio
  function userMatches(S) {
    const out = [];
    for (let r = 0; r < S.week && r < S.fixtures.length; r++) {
      const m = S.fixtures[r].find(m => m[0] === S.user || m[1] === S.user);
      if (m && m[2] >= 0) out.push(m);
    }
    return out;
  }
  function resultLetter(S, m) {
    const mine = m[0] === S.user ? m[2] : m[3], opp = m[0] === S.user ? m[3] : m[2];
    return mine > opp ? 'V' : mine < opp ? 'D' : 'E';
  }

  function msgHtml(S, m) {
    const ic = { board: '🏛️', market: '💼', offer: '📩', news: '📰', med: '🏥', club: '📋' }[m.kind] || '✉️';
    let actions = '';
    if (m.kind === 'offer' && !m.done) {
      actions = `<div class="btn-row"><button class="btn sm primary" data-act="offer-accept" data-id="${m.id}">Aceptar</button>
        <button class="btn sm" data-act="offer-reject" data-id="${m.id}">Rechazar</button>
        <button class="btn sm ghost" data-act="player" data-id="${m.data.pid}">Ver ficha</button></div>`;
    }
    return `<div class="msg ${m.read ? '' : 'unread'}"><div class="ic">${ic}</div><div class="grow">
      <div class="t">${esc(m.title)}</div><div class="b">${esc(m.body)}</div>
      <div class="d">${U.seasonLabel(m.s)} · Semana ${m.w}${m.res ? ' · ' + esc(m.res) : ''}</div>${actions}</div></div>`;
  }

  VIEWS.home = S => {
    const c = S.clubs[S.user];
    const L = W.userLeague(S);
    const tab = SE.table(S);
    const posOf = id => tab.findIndex(r => r.id === id) + 1;
    const rowOf = id => tab.find(r => r.id === id);
    const fx = SE.nextFixture(S);
    let next;
    if (S.over) {
      next = `<section class="card next-match span2"><div class="nm-meta"><span>${esc(L.name)}</span><span>${U.seasonLabel(S.season)}</span></div>
        <div class="center" style="margin:22px 0 18px"><h2 style="font-size:28px">Temporada terminada</h2>
        <p class="muted">Has acabado ${posOf(S.user)}º de ${tab.length}.</p></div>
        <div class="nm-actions" style="grid-template-columns:1fr"><button class="btn primary" data-act="season-end">Ver resumen de temporada</button></div></section>`;
    } else if (!fx) {
      next = `<section class="card next-match span2"><div class="nm-meta"><span>${esc(L.name)} · Jornada ${S.week + 1}</span><span>${U.fmtDate(U.dateOf(S.season, S.week))}</span></div>
        <div class="center" style="margin:22px 0 18px"><h2 style="font-size:26px">Jornada de descanso</h2><p class="muted">Tu equipo no juega esta semana.</p></div>
        <div class="nm-actions" style="grid-template-columns:1fr"><button class="btn primary" data-act="play-quick">Avanzar jornada</button></div></section>`;
    } else {
      const h = S.clubs[fx[0]], a = S.clubs[fx[1]];
      const team = (cl) => {
        const r = rowOf(cl.id);
        return `<div class="nm-team">${crest(cl, 'lg')}<span class="nm-name">${esc(cl.name)}</span>
          <span class="nm-info">${r && r.pj ? posOf(cl.id) + 'º · ' + r.pts + ' pts' : stars(cl.rep)}</span>
          ${r && r.form.length ? formHtml(r.form) : ''}</div>`;
      };
      next = `<section class="card next-match span2">
        <div class="nm-meta"><span>${esc(L.name)} · J${S.week + 1}/${S.fixtures.length}</span><span>${U.fmtDate(U.dateOf(S.season, S.week))}</span></div>
        <div class="nm-teams">${team(h)}<div class="nm-vs">VS</div>${team(a)}</div>
        <div class="nm-actions"><button class="btn primary" data-act="play-live">▶ Jugar partido</button>
        <button class="btn" data-act="play-quick">Resultado rápido</button></div></section>`;
    }

    const conf = S.board.conf;
    const played = tab.some(r => r.pj > 0);
    const board = `<section class="card"><div class="card-head"><h2>Directiva</h2><span class="muted">${played ? posOf(S.user) + 'º de ' + tab.length : 'Pretemporada'}</span></div>
      <div style="font-weight:700;font-size:16px">${esc(S.board.text)}</div>
      <div class="row between mt"><span class="muted" style="font-size:13px">Confianza</span><b class="num">${Math.round(conf)}%</b></div>
      <div class="bar ${conf < 30 ? 'bad' : conf < 50 ? 'warn' : ''}" style="margin-top:6px"><i style="width:${conf}%"></i></div></section>`;

    const ms = userMatches(S).slice(-5).reverse();
    const results = `<section class="card"><div class="card-head"><h2>Últimos resultados</h2>${ms.length ? formHtml(ms.slice().reverse().map(m => resultLetter(S, m))) : ''}</div>
      ${ms.length ? ms.map(m => fixtureHtml(S, m)).join('') : '<div class="empty">Aún no has jugado ningún partido.</div>'}</section>`;

    const msgs = S.inbox.slice(0, 4);
    const inbox = `<section class="card"><div class="card-head"><h2>Buzón</h2><button class="link" data-act="inbox">Ver todo</button></div>
      ${msgs.length ? msgs.map(m => msgHtml(S, m)).join('') : '<div class="empty">Sin mensajes.</div>'}</section>`;

    const i = tab.findIndex(r => r.id === S.user);
    const from = U.clamp(i - 2, 0, Math.max(0, tab.length - 5));
    const mini = `<section class="card"><div class="card-head"><h2>Clasificación</h2><button class="link" data-act="tab" data-tab="league">Completa</button></div>
      ${tableHtml(S, tab.slice(from, from + 5), from, true)}</section>`;

    const bill = W.wageBill(S, S.user);
    const fin = `<section class="card"><div class="card-head"><h2>Finanzas</h2><button class="link" data-act="tab" data-tab="club">Detalle</button></div>
      <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><div class="k">Saldo</div><div class="v ${c.cash < 0 ? 'neg' : ''}">${U.money(c.cash)}</div></div>
      <div class="kpi"><div class="k">Salarios/sem</div><div class="v">${U.money(bill)}</div></div></div>
      <div class="row between mt"><span class="muted" style="font-size:13px">Presupuesto salarial</span><span class="num">${U.money(bill)} / ${U.money(c.wageBudget)}</span></div>
      <div class="bar ${bill > c.wageBudget ? 'bad' : bill > c.wageBudget * 0.95 ? 'warn' : ''}" style="margin-top:6px"><i style="width:${Math.min(100, bill / c.wageBudget * 100)}%"></i></div></section>`;

    return `<div class="grid two three">${next}${board}${inbox}${results}${mini}${fin}</div>`;
  };
  VIEWS.homeAfter = S => {
    // Lo mostrado en Inicio queda como leído
    S.inbox.slice(0, 4).forEach(m => { m.read = true; });
  };

  function fixtureHtml(S, m) {
    const h = S.clubs[m[0]], a = S.clubs[m[1]];
    const me = m[0] === S.user || m[1] === S.user;
    return `<div class="fixture ${me ? 'me' : ''}">
      <div class="h"><span class="nm">${esc(h.name)}</span>${crest(h, 'sm')}</div>
      <div class="sc num">${m[2] >= 0 ? m[2] + ' - ' + m[3] : '–'}</div>
      <div class="a">${crest(a, 'sm')}<span class="nm">${esc(a.name)}</span></div></div>`;
  }

  A.inbox = () => {
    const S = G.S;
    sheet(sheetHead('Buzón') + (S.inbox.length ? S.inbox.map(m => msgHtml(S, m)).join('') : '<div class="empty">Sin mensajes.</div>'));
    S.inbox.forEach(m => { m.read = true; });
    renderTop(S);
  };

  A['offer-accept'] = el => {
    const S = G.S;
    const m = S.inbox.find(x => x.id === +el.dataset.id);
    if (!m) return;
    const r = M.acceptOffer(S, m);
    toast(r.msg, !r.ok);
    if (!r.ok) { m.done = true; m.res = 'No disponible'; }
    G.save();
    if (document.querySelector('.sheet')) A.inbox();
    UI.refresh();
  };
  A['offer-reject'] = el => {
    const S = G.S;
    const m = S.inbox.find(x => x.id === +el.dataset.id);
    if (!m) return;
    m.done = true; m.res = 'Rechazada';
    G.save();
    toast('Oferta rechazada');
    if (document.querySelector('.sheet')) A.inbox();
    UI.refresh();
  };

  // ------------------------------------------------------------ Plantilla
  const SQ_SORTS = [['pos', 'Posición'], ['ovr', 'Media'], ['age', 'Edad'], ['value', 'Valor'], ['fit', 'Forma'], ['contract', 'Contrato']];

  VIEWS.squad = S => {
    const sq = W.squad(S, S.user);
    const bill = W.wageBill(S, S.user);
    const total = U.sum(sq, p => W.value(S, p));
    const avg = sq.length ? U.sum(sq, p => p.ovr) / sq.length : 0;
    const key = UI.squadSort;
    const order = F.POSITIONS;
    const sorted = sq.slice().sort((a, b) => {
      switch (key) {
        case 'ovr': return b.ovr - a.ovr;
        case 'age': return a.age - b.age;
        case 'value': return W.value(S, b) - W.value(S, a);
        case 'fit': return a.fit - b.fit;
        case 'contract': return a.contract - b.contract || b.ovr - a.ovr;
        default: return order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr;
      }
    });
    const row = p => {
      const st = S.stats[p.id];
      const cols = `<span class="w-s">${p.age}</span><span class="w-s">${fitB(p.fit)}</span><span>${U.money(W.value(S, p))}</span>
        <span>${U.money(p.wage)}</span><span class="w-s">${p.contract}</span><span class="w-s">${st ? st[0] + 'pj ' + st[1] + 'g' : '—'}</span>`;
      const sub = `${flag(S, p)} ${p.age} años · ${U.money(W.value(S, p))} · ${fitB(p.fit)}`;
      return playerRow(S, p, { cols, sub });
    };
    let list = '';
    if (key === 'pos') {
      const names = ['Porteros', 'Defensas', 'Centrocampistas', 'Delanteros'];
      for (let l = 0; l < 4; l++) {
        const g = sorted.filter(p => F.LINE[p.pos] === l);
        if (g.length) list += `<div class="group-title">${names[l]} · ${g.length}</div>` + g.map(row).join('');
      }
    } else list = sorted.map(row).join('');
    return pageTitle('Plantilla', `${sq.length}/${M.MAX_SQUAD} jugadores`) +
      `<div class="kpis" style="margin-bottom:12px">
        <div class="kpi"><div class="k">Media</div><div class="v">${avg.toFixed(1)}</div></div>
        <div class="kpi"><div class="k">Nivel club</div><div class="v">${S.clubs[S.user].rep.toFixed(1)}</div></div>
        <div class="kpi"><div class="k">Valor plantilla</div><div class="v">${U.money(total)}</div></div>
        <div class="kpi"><div class="k">Salarios/sem</div><div class="v ${bill > S.clubs[S.user].wageBudget ? 'neg' : ''}">${U.money(bill)}</div></div></div>
      <div class="chips" role="tablist">${SQ_SORTS.map(([k, l]) => `<button class="chip ${key === k ? 'on' : ''}" data-act="sq-sort" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="card" style="margin-top:12px;padding:6px 8px">
        <div class="pcols" style="justify-content:flex-end;padding:6px 60px 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:.05em">
          <span class="w-s">Edad</span><span class="w-s">Forma</span><span>Valor</span><span>Salario</span><span class="w-s">Fin</span><span class="w-s">Temp.</span></div>
        <div class="plist">${list}</div></div>`;
  };
  A['sq-sort'] = el => { UI.squadSort = el.dataset.k; UI.refresh(); };

  // ------------------------------------------------------------ Tácticas
  const MENT = ['Defensiva', 'Equilibrada', 'Ofensiva'];

  VIEWS.tactics = S => {
    const T = S.tactics;
    const lu = E.userLineup(S);
    const slots = E.FORMATIONS[T.formation];
    const sq = W.squad(S, S.user);
    const inXI = new Set(lu.ids);
    const toks = slots.map(([pos, x, y], i) => {
      const id = lu.ids[i];
      if (id < 0) {
        return `<button class="tok empty" style="left:${x}%;bottom:${y}%" data-act="tac-slot" data-i="${i}"><span class="dot">+</span><span class="nm">${F.POS_ES[pos]}</span></button>`;
      }
      const p = S.players[id];
      const f = E.fit(p, pos);
      const col = F.LINE[pos] === 0 ? '#b07a1e' : F.LINE[pos] === 1 ? '#2665a8' : F.LINE[pos] === 2 ? '#1f8a52' : '#b23a3a';
      return `<button class="tok ${f < 0.9 ? 'bad' : ''}" style="left:${x}%;bottom:${y}%;--tc:${col}" data-act="tac-slot" data-i="${i}" aria-label="${F.POS_ES[pos]}: ${esc(p.name)}">
        <span class="dot">${Math.round(E.eff(p, pos))}<small>${F.POS_ES[pos]}</small></span><span class="nm">${esc(p.short)}</span></button>`;
    }).join('');
    const xiScore = U.sum(lu.ids.filter(id => id >= 0), id => E.eff(S.players[id], slots[lu.ids.indexOf(id)][0])) / 11;
    const rest = sq.filter(p => !inXI.has(p.id)).sort((a, b) => (E.available(b) - E.available(a)) || b.ovr - a.ovr);
    const restRows = rest.map(p => playerRow(S, p, {
      cls: E.available(p) ? '' : 'off',
      sub: `${flag(S, p)} ${p.age} años · ${fitB(p.fit)} ${p.fit}%`
    })).join('');
    return pageTitle('Tácticas', `Once titular · fuerza ${xiScore.toFixed(1)}`,
      `<button class="btn sm" data-act="tac-best">Mejor once</button>`) +
      `<div class="chips" style="margin-bottom:12px">${Object.keys(E.FORMATIONS).map(f =>
        `<button class="chip ${T.formation === f ? 'on' : ''}" data-act="tac-form" data-f="${f}">${f}</button>`).join('')}</div>
      <div class="pitch-wrap">
        <div><div class="pitch">
          <i class="mk half"></i><i class="mk circle"></i><i class="mk box-b"></i><i class="mk box-t"></i><i class="mk six-b"></i><i class="mk six-t"></i>
          ${toks}</div>
          <p class="note center" style="margin-top:8px">Toca una posición para cambiar el jugador. El número es su rendimiento en ese puesto.</p>
        </div>
        <div class="col">
          <div class="card"><h2 style="margin-bottom:10px">Mentalidad</h2>
            <div class="seg">${MENT.map((m, i) => `<button class="${T.mentality === i ? 'on' : ''}" data-act="tac-ment" data-m="${i}">${m}</button>`).join('')}</div>
            <label class="row between mt" style="font-size:14px"><span>Cambios automáticos (cansancio y lesiones)</span>
              <input type="checkbox" style="width:22px;min-height:22px" data-change="tac-auto" ${T.autoSubs ? 'checked' : ''}></label>
          </div>
          <div class="card" style="padding:6px 8px"><div class="group-title">Suplentes y reservas · ${rest.length}</div>
            <div class="plist">${restRows || '<div class="empty">No hay más jugadores.</div>'}</div></div>
        </div>
      </div>`;
  };

  A['tac-form'] = el => {
    const S = G.S;
    const old = S.tactics.formation;
    const nf = el.dataset.f;
    if (old === nf) return;
    // Recoloca a los jugadores actuales en la nueva formación
    const current = S.tactics.slots.filter(id => id >= 0).map(id => S.players[id]);
    S.tactics.formation = nf;
    const ids = E.autoLineup(current.length >= 11 ? current : W.squad(S, S.user), nf, false);
    S.tactics.slots = ids;
    G.save();
    UI.refresh();
  };
  A['tac-best'] = () => {
    const S = G.S;
    S.tactics.slots = E.autoLineup(W.squad(S, S.user), S.tactics.formation, true);
    G.save();
    toast('Once ideal seleccionado');
    UI.refresh();
  };
  A['tac-ment'] = el => { G.S.tactics.mentality = +el.dataset.m; G.save(); UI.refresh(); };
  C['tac-auto'] = el => { G.S.tactics.autoSubs = el.checked; G.save(); };
  A['tac-slot'] = el => {
    const S = G.S;
    const i = +el.dataset.i;
    const [pos] = E.FORMATIONS[S.tactics.formation][i];
    const sq = W.squad(S, S.user).slice().sort((a, b) => (E.available(b) - E.available(a)) || E.eff(b, pos) - E.eff(a, pos));
    const cur = S.tactics.slots[i];
    const rows = sq.map(p => {
      const f = Math.round(E.fit(p, pos) * 100);
      const where = S.tactics.slots.indexOf(p.id);
      const sub = (where >= 0 ? `En el once (${F.POS_ES[E.FORMATIONS[S.tactics.formation][where][0]]}) · ` : '') +
        `${fitB(p.fit)} ${p.fit}% · <span class="fitpct" style="color:${f >= 95 ? 'var(--accent2)' : f >= 85 ? 'var(--warn)' : 'var(--danger)'}">${f}% en ${F.POS_ES[pos]}</span>`;
      return playerRow(S, p, {
        act: 'tac-assign', attrs: ` data-i="${i}"`, sub, cls: (p.id === cur ? 'sel ' : '') + (E.available(p) ? '' : 'off'),
        right: `<span class="num" style="font-size:18px;font-weight:700;width:30px;text-align:right">${Math.round(E.eff(p, pos))}</span>`
      });
    }).join('');
    sheet(sheetHead(`Elegir ${F.POS_ES[pos]}`) + `<div class="plist">${rows}</div>`);
  };
  A['tac-assign'] = el => {
    const S = G.S;
    const i = +el.dataset.i, id = +el.dataset.id;
    const p = S.players[id];
    if (!E.available(p)) { toast(`${p.short} no está disponible`, true); return; }
    const slots = S.tactics.slots;
    const j = slots.indexOf(id);
    if (j >= 0) slots[j] = slots[i];
    slots[i] = id;
    closeSheet();
    G.save();
    UI.refresh();
  };

  // ------------------------------------------------------------ Liga
  function tableHtml(S, rows, offset, compact) {
    const { promote, relegate } = SE.promoInfo(S);
    const n = SE.table(S).length;
    return `<table class="table"><thead><tr><th>#</th><th class="l">Equipo</th><th>PJ</th>
      ${compact ? '' : '<th class="hide-m">G</th><th class="hide-m">E</th><th class="hide-m">P</th><th class="hide-m">GF</th><th class="hide-m">GC</th>'}
      <th>DG</th><th>Pts</th>${compact ? '' : '<th class="hide-m">Forma</th>'}</tr></thead><tbody>
      ${rows.map((r, k) => {
        const pos = offset + k + 1;
        const zone = pos <= promote ? 'up' : pos > n - relegate ? 'down' : '';
        const c = S.clubs[r.id];
        return `<tr class="${r.id === S.user ? 'me' : ''}" data-act="club" data-id="${r.id}" style="cursor:pointer">
          <td><span class="zone ${zone}">${pos}</span></td>
          <td class="team l"><div class="row">${crest(c, 'sm')}<span class="ellipsis">${esc(c.name)}</span></div></td>
          <td>${r.pj}</td>
          ${compact ? '' : `<td class="hide-m">${r.g}</td><td class="hide-m">${r.e}</td><td class="hide-m">${r.p}</td><td class="hide-m">${r.gf}</td><td class="hide-m">${r.gc}</td>`}
          <td>${r.gf - r.gc > 0 ? '+' : ''}${r.gf - r.gc}</td><td class="pts">${r.pts}</td>
          ${compact ? '' : `<td class="hide-m">${formHtml(r.form)}</td>`}</tr>`;
      }).join('')}</tbody></table>`;
  }

  VIEWS.league = S => {
    const L = W.userLeague(S);
    const t = UI.league.tab;
    const seg = `<div class="seg" style="margin-bottom:12px">${[['table', 'Clasificación'], ['rounds', 'Jornadas'], ['scorers', 'Goleadores']]
      .map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="lg-tab" data-k="${k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (t === 'table') {
      const { promote, relegate } = SE.promoInfo(S);
      const legend = [promote ? `<span><span class="zone up">↑</span> Ascenso</span>` : '', relegate ? `<span><span class="zone down">↓</span> Descenso</span>` : '']
        .filter(Boolean).join(' &nbsp; ');
      body = `<div class="card" style="padding:8px">${tableHtml(S, SE.table(S), 0, false)}</div>${legend ? `<p class="note mt">${legend}</p>` : ''}`;
    } else if (t === 'rounds') {
      const n = S.fixtures.length;
      if (UI.league.round == null) UI.league.round = Math.min(S.week, n - 1);
      const r = U.clamp(UI.league.round, 0, n - 1);
      body = `<div class="card"><div class="row between" style="margin-bottom:8px">
        <button class="icon-btn" data-act="lg-round" data-d="-1" ${r === 0 ? 'disabled' : ''} aria-label="Anterior">${icon('back')}</button>
        <div class="center"><b>Jornada ${r + 1}</b><div class="note">${U.fmtDate(U.dateOf(S.season, r))}</div></div>
        <button class="icon-btn" data-act="lg-round" data-d="1" ${r === n - 1 ? 'disabled' : ''} aria-label="Siguiente">${icon('next')}</button></div>
        ${S.fixtures[r].map(m => fixtureHtml(S, m)).join('')}</div>`;
    } else {
      const rows = Object.entries(S.stats)
        .filter(([, s]) => s[1] > 0 || s[2] > 0)
        .sort((a, b) => b[1][1] - a[1][1] || b[1][2] - a[1][2]).slice(0, 30);
      body = `<div class="card" style="padding:8px"><table class="table"><thead><tr><th>#</th><th class="l">Jugador</th><th>PJ</th><th>G</th><th>A</th><th class="hide-m">Media</th></tr></thead><tbody>
        ${rows.map(([id, s], i) => {
          const p = S.players[id];
          const c = p.club >= 0 ? S.clubs[p.club] : null;
          return `<tr class="${p.club === S.user ? 'me' : ''}" data-act="player" data-id="${id}" style="cursor:pointer"><td>${i + 1}</td>
            <td class="team l"><div class="row">${c ? crest(c, 'sm') : ''}<span class="ellipsis">${esc(p.name)}</span></div></td>
            <td>${s[0]}</td><td class="pts">${s[1]}</td><td>${s[2]}</td><td class="hide-m">${(s[3] / s[0]).toFixed(2)}</td></tr>`;
        }).join('') || '<tr><td colspan="6" class="empty">Todavía no hay goles.</td></tr>'}</tbody></table></div>`;
    }
    return pageTitle(esc(L.name), `${L.flag} ${esc(L.country)} · ${U.seasonLabel(S.season)}`) + seg + body;
  };
  A['lg-tab'] = el => { UI.league.tab = el.dataset.k; UI.league.round = null; UI.refresh(); };
  A['lg-round'] = el => { UI.league.round = (UI.league.round || 0) + +el.dataset.d; UI.refresh(); };

  A.club = el => {
    const S = G.S;
    const c = S.clubs[+el.dataset.id];
    const sq = W.squad(S, c.id).sort((a, b) => F.POSITIONS.indexOf(a.pos) - F.POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
    const L = S.leagues[c.league];
    sheet(sheetHead(esc(c.name), crest(c)) +
      `<div class="info" style="margin-bottom:12px">
        <div><div class="k">Liga</div><div class="v">${esc(L.name)}</div></div>
        <div><div class="k">Nivel</div><div class="v">${c.rep.toFixed(1)} ${stars(c.rep)}</div></div>
        <div><div class="k">Estadio</div><div class="v">${U.num(c.capacity)} esp.</div></div></div>
      <div class="plist">${sq.map(p => playerRow(S, p)).join('')}</div>`);
  };

  // ------------------------------------------------------------ Mercado
  VIEWS.market = S => {
    const open = M.windowOpen(S);
    const t = UI.market.tab;
    const c = S.clubs[S.user];
    const n = S.fixtures.length, mid = Math.floor(n / 2);
    const banner = `<div class="card" style="margin-bottom:12px;border-color:${open ? '#2f6b45' : 'var(--line)'}">
      <div class="row between wrap"><div><b style="color:${open ? 'var(--accent2)' : 'var(--warn)'}">${open ? '● Mercado abierto' : '● Mercado cerrado'}</b>
      <div class="note">${open ? (S.week <= 3 ? 'Cierra tras la jornada 3' : `Cierra tras la jornada ${mid + 2}`) : (S.week < mid ? `Reabre en la jornada ${mid}` : 'Reabre en verano')} · Los agentes libres se pueden fichar siempre.</div></div>
      <div class="num" style="text-align:right"><div style="font-size:20px;font-weight:700">${U.money(c.cash)}</div><div class="note">Salarios ${U.money(W.wageBill(S, S.user))} / ${U.money(c.wageBudget)}</div></div></div></div>`;
    const seg = `<div class="seg" style="margin-bottom:12px">${[['search', 'Buscar'], ['free', 'Libres'], ['mine', 'Mis ventas']]
      .map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="mk-tab" data-k="${k}">${l}</button>`).join('')}</div>`;
    let body;
    if (t === 'mine') {
      const listed = W.squad(S, S.user).filter(p => p.listed);
      const offers = S.inbox.filter(m => m.kind === 'offer' && !m.done);
      body = `<div class="card"><div class="card-head"><h2>Ofertas recibidas</h2></div>${offers.length ? offers.map(m => msgHtml(S, m)).join('') : '<div class="empty">No tienes ofertas pendientes.</div>'}</div>
        <div class="card mt" style="padding:6px 8px"><div class="group-title">Jugadores en venta · ${listed.length}</div>
        ${listed.length ? listed.map(p => playerRow(S, p)).join('') : '<div class="empty">Pon jugadores en venta desde su ficha para recibir ofertas.</div>'}</div>`;
    } else {
      const f = UI.market.f;
      const L = S.leagues.filter(l => l.clubs.length);
      body = `<div class="card" style="margin-bottom:12px"><div class="col">
        <input type="search" placeholder="Buscar jugador por nombre…" value="${esc(f.q)}" data-change="mf" data-k="q" aria-label="Nombre">
        <div class="row wrap" style="gap:8px">
          <select data-change="mf" data-k="pos" style="flex:1 1 120px" aria-label="Posición"><option value="">Todas las posiciones</option>
            ${F.POSITIONS.map(p => `<option value="${p}" ${f.pos === p ? 'selected' : ''}>${F.POS_ES[p]}</option>`).join('')}</select>
          <select data-change="mf" data-k="minOvr" style="flex:1 1 110px" aria-label="Media mínima"><option value="">Media mín.</option>
            ${[55, 60, 65, 70, 75, 80, 85].map(v => `<option value="${v}" ${+f.minOvr === v ? 'selected' : ''}>≥ ${v}</option>`).join('')}</select>
          <select data-change="mf" data-k="maxAge" style="flex:1 1 110px" aria-label="Edad máxima"><option value="">Edad máx.</option>
            ${[19, 21, 23, 25, 28, 30, 33].map(v => `<option value="${v}" ${+f.maxAge === v ? 'selected' : ''}>≤ ${v} años</option>`).join('')}</select>
          ${t === 'search' ? `<select data-change="mf" data-k="maxValue" style="flex:1 1 120px" aria-label="Valor máximo"><option value="">Valor máx.</option>
            ${[1e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8].map(v => Math.round(v * S.econ.value)).map(v => `<option value="${v}" ${+f.maxValue === v ? 'selected' : ''}>≤ ${U.money(v)}</option>`).join('')}</select>
          <select data-change="mf" data-k="league" style="flex:2 1 160px" aria-label="Liga"><option value="">Todas las ligas</option>
            ${L.map(l => `<option value="${l.id}" ${f.league !== '' && +f.league === l.id ? 'selected' : ''}>${l.flag} ${esc(l.name)}</option>`).join('')}</select>` : ''}
          <select data-change="mf" data-k="sort" style="flex:1 1 120px" aria-label="Ordenar"><option value="ovr" ${f.sort === 'ovr' ? 'selected' : ''}>Por media</option>
            <option value="pot" ${f.sort === 'pot' ? 'selected' : ''}>Por potencial</option><option value="value" ${f.sort === 'value' ? 'selected' : ''}>Por valor</option>
            <option value="age" ${f.sort === 'age' ? 'selected' : ''}>Más jóvenes</option></select>
        </div></div></div>
        <div id="m-results"></div>`;
    }
    return pageTitle('Mercado', '') + banner + seg + body;
  };
  VIEWS.marketAfter = S => { if (UI.market.tab !== 'mine') renderMarketResults(S); };

  function renderMarketResults(S) {
    const box = document.getElementById('m-results');
    if (!box) return;
    const f = UI.market.f;
    const res = M.search(S, {
      q: f.q, pos: f.pos, alt: false, minOvr: +f.minOvr || 0, maxAge: +f.maxAge || 0,
      maxValue: UI.market.tab === 'search' ? +f.maxValue || 0 : 0, league: UI.market.tab === 'search' ? f.league : '',
      sort: f.sort, free: UI.market.tab === 'free'
    });
    const shown = res.slice(0, UI.market.limit);
    const rows = shown.map(p => {
      const club = p.club >= 0 ? S.clubs[p.club] : null;
      const sub = `${club ? crest(club, 'sm') + ' ' + esc(club.name) : 'Libre'} · ${p.age} años · ${U.money(W.value(S, p))}`;
      const cols = `<span class="w-s">${p.age}</span><span class="w-s">${p.pot > p.ovr ? '↑' : ''}</span><span>${U.money(W.value(S, p))}</span>`;
      return playerRow(S, p, { sub, cols });
    }).join('');
    box.innerHTML = `<div class="card" style="padding:6px 8px"><div class="group-title">${U.num(res.length)} jugadores</div>
      <div class="plist">${rows || '<div class="empty">Ningún jugador coincide con los filtros.</div>'}</div>
      ${res.length > shown.length ? `<button class="btn block mt" data-act="mk-more">Mostrar más</button>` : ''}</div>`;
  }
  A['mk-tab'] = el => { UI.market.tab = el.dataset.k; UI.market.limit = 40; UI.refresh(); };
  A['mk-more'] = () => { UI.market.limit += 40; renderMarketResults(G.S); };
  C.mf = el => {
    UI.market.f[el.dataset.k] = el.value;
    UI.market.limit = 40;
    clearTimeout(C.mf._t);
    C.mf._t = setTimeout(() => renderMarketResults(G.S), el.tagName === 'INPUT' ? 220 : 0);
  };

  // ------------------------------------------------------------ Club
  VIEWS.club = S => {
    const c = S.clubs[S.user];
    const bill = W.wageBill(S, S.user);
    const fin = S.fin;
    const inc = fin.tickets + fin.commercial + fin.prizes + fin.sales;
    const exp = fin.wages + fin.buys + fin.other;
    const line = (k, v, cls) => `<tr><td class="l" style="text-align:left;width:auto">${k}</td><td class="${cls || ''}">${U.money(v)}</td></tr>`;
    const total = U.sum(W.squad(S, S.user), p => W.value(S, p));
    const hist = S.history.length ? `<table class="table"><thead><tr><th class="l" style="text-align:left">Temp.</th><th class="l">Club</th><th>Pos</th><th class="hide-m l">Máx. goleador</th></tr></thead><tbody>
      ${S.history.map(h => `<tr><td class="l" style="text-align:left">${U.seasonLabel(h.season)}</td><td class="l ellipsis" style="max-width:140px">${esc(h.club)}</td>
        <td><b>${h.pos}º</b>/${h.n} ${h.moved === 'up' ? '<span class="pos-ok">↑</span>' : h.moved === 'down' ? '<span class="neg">↓</span>' : ''}</td><td class="hide-m l">${esc(h.top)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty">Tu primera temporada aún está en juego.</div>';
    return pageTitle('Club', esc(S.manager) + ' · ' + esc(c.name)) + `<div class="grid two">
      <section class="card span2"><div class="card-head"><h2>Finanzas</h2><span class="muted">Temporada ${U.seasonLabel(S.season)}</span></div>
        <div class="kpis"><div class="kpi"><div class="k">Saldo</div><div class="v ${c.cash < 0 ? 'neg' : ''}">${U.money(c.cash)}</div></div>
        <div class="kpi"><div class="k">Presup. salarial</div><div class="v">${U.money(c.wageBudget)}</div></div>
        <div class="kpi"><div class="k">Salarios/sem</div><div class="v ${bill > c.wageBudget ? 'neg' : ''}">${U.money(bill)}</div></div>
        <div class="kpi"><div class="k">Valor plantilla</div><div class="v">${U.money(total)}</div></div></div>
        <div class="grid two mt">
          <table class="table"><thead><tr><th class="l" style="text-align:left">Ingresos</th><th></th></tr></thead><tbody>
            ${line('Taquilla', fin.tickets)}${line('Comercial y TV', fin.commercial)}${line('Premios', fin.prizes)}${line('Ventas', fin.sales)}
            <tr><td class="l" style="text-align:left"><b>Total</b></td><td><b>${U.money(inc)}</b></td></tr></tbody></table>
          <table class="table"><thead><tr><th class="l" style="text-align:left">Gastos</th><th></th></tr></thead><tbody>
            ${line('Salarios', fin.wages)}${line('Fichajes', fin.buys)}${line('Rescisiones', fin.other)}
            <tr><td class="l" style="text-align:left"><b>Balance</b></td><td class="${inc - exp < 0 ? 'neg' : 'pos-ok'}"><b>${U.money(inc - exp)}</b></td></tr></tbody></table>
        </div></section>
      <section class="card"><div class="card-head"><h2>Estadio</h2><button class="link" data-act="rename-stadium">Renombrar</button></div>
        <div style="font-weight:700;font-size:17px">${esc(c.stadium)}</div>
        <div class="info mt"><div><div class="k">Aforo</div><div class="v">${U.num(c.capacity)}</div></div>
        <div><div class="k">Entrada media</div><div class="v">€${c.price}</div></div>
        <div><div class="k">Última asistencia</div><div class="v">${S.lastAttendance ? U.num(S.lastAttendance) : '—'}</div></div></div></section>
      <section class="card"><div class="card-head"><h2>Directiva</h2><span class="muted">${Math.round(S.board.conf)}%</span></div>
        <div style="font-weight:700;font-size:16px">${esc(S.board.text)}</div>
        <div class="bar mt ${S.board.conf < 30 ? 'bad' : S.board.conf < 50 ? 'warn' : ''}"><i style="width:${S.board.conf}%"></i></div>
        <p class="note mt">Si la confianza cae a cero, o por debajo del 15% al final de la temporada, serás destituido.</p></section>
      <section class="card span2"><div class="card-head"><h2>Historial</h2></div>${hist}</section>
      <section class="card span2"><div class="card-head"><h2>Partida</h2></div>
        <div class="btn-row"><button class="btn" data-act="save">Guardar</button><button class="btn" data-act="export">Exportar</button>
        <button class="btn" data-act="import">Importar</button><button class="btn danger" data-act="quit">Nueva partida</button></div>
        <p class="note mt">La partida se guarda automáticamente en este navegador tras cada jornada. Datos de jugadores: ${esc(S.source)}.</p></section>
    </div>`;
  };
  A.save = () => { const ok = G.save(); toast(ok ? 'Partida guardada' : 'No se pudo guardar (almacenamiento lleno)', !ok); };
  A.export = () => {
    const blob = new Blob([G.exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    const S = G.S;
    a.href = URL.createObjectURL(blob);
    a.download = `touchline-${U.clubCode(S.clubs[S.user].name)}-${S.season}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  A.import = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        await G.importSave(await f.text());
        UI.tab = 'home';
        renderShell(); render();
        toast('Partida importada');
      } catch (e) { toast(e.message || 'Archivo no válido', true); }
    };
    inp.click();
  };
  A.quit = () => confirmBox('Nueva partida', 'Se borrará la partida guardada en este navegador. ¿Seguro?', 'Borrar y empezar', () => {
    G.wipe(); UI.tab = 'home'; renderTitle();
  }, true);
  A['rename-stadium'] = () => {
    const c = G.S.clubs[G.S.user];
    sheet(sheetHead('Renombrar estadio') + `<input id="stadium-name" maxlength="40" value="${esc(c.stadium)}" aria-label="Nombre del estadio">
      <div class="btn-row mt"><button class="btn" data-act="close-sheet">Cancelar</button><button class="btn primary" data-act="rename-ok">Guardar</button></div>`);
  };
  A['rename-ok'] = () => {
    const v = document.getElementById('stadium-name').value.trim();
    if (v) { G.S.clubs[G.S.user].stadium = v; G.save(); }
    closeSheet(); UI.refresh();
  };

  // ------------------------------------------------------------ Ficha de jugador
  function openPlayer(id) {
    const S = G.S;
    const p = S.players[id];
    if (!p) return;
    const mine = p.club === S.user, free = p.club === -1, retired = p.club === -2;
    const club = p.club >= 0 ? S.clubs[p.club] : null;
    const labels = p.pos === 'GK' ? F.CARD_LABELS_GK : F.CARD_LABELS;
    const stats6 = p.st.map((v, i) => `<div class="stat"><div class="k">${labels[i]} <b>${v}</b></div>
      <div class="bar"><i style="width:${v}%;background:${v >= 80 ? 'var(--accent2)' : v >= 65 ? 'var(--warn)' : 'var(--danger)'}"></i></div></div>`).join('');
    const potTxt = mine ? `${p.pot}` : p.pot <= p.ovr ? `${p.ovr}` : `${Math.max(p.ovr, p.pot - 3)}–${Math.min(95, p.pot + 3)}`;
    const status = p.inj > 0 ? `Lesionado (${p.inj} sem)` : p.sus > 0 ? `Sancionado (${p.sus})` : 'Disponible';
    const st = S.stats[id];
    const season = st ? `<div class="info mt"><div><div class="k">Partidos</div><div class="v">${st[0]}</div></div>
      <div><div class="k">Goles</div><div class="v">${st[1]}</div></div><div><div class="k">Asistencias</div><div class="v">${st[2]}</div></div>
      <div><div class="k">Nota media</div><div class="v">${(st[3] / st[0]).toFixed(2)}</div></div><div><div class="k">MVP</div><div class="v">${st[6]}</div></div>
      <div><div class="k">Tarjetas</div><div class="v">🟨 ${st[4]} · 🟥 ${st[5]}</div></div></div>` : '';
    const head = `<div class="sheet-head" style="margin-bottom:6px"><div class="grow"></div><button class="icon-btn" data-act="close-sheet" aria-label="Cerrar">${icon('close')}</button></div>
      <div class="phead"><div class="big-ovr ovr ${ovrCls(p.ovr)}">${p.ovr}<small>${F.POS_ES[p.pos]}</small></div>
      <div class="grow"><h2>${esc(p.name)}</h2>
        <div class="note" style="margin-top:4px">${flag(S, p)} ${esc(S.nations[p.nat][0])} · ${p.age} años · ${p.alt.length ? 'También ' + p.alt.map(a => F.POS_ES[a]).join(', ') : 'Sin posición secundaria'}</div>
        <div class="row" style="margin-top:6px;gap:6px">${club ? crest(club, 'sm') + `<span style="font-weight:600">${esc(club.name)}</span>` : `<span style="font-weight:600">${clubName(S, p.club)}</span>`}${playerTags(S, p)}</div>
      </div></div>`;
    const info = `<div class="info">
      <div><div class="k">Valor</div><div class="v">${U.money(W.value(S, p))}</div></div>
      <div><div class="k">Salario</div><div class="v">${free || retired ? '—' : U.money(p.wage) + '/sem'}</div></div>
      <div><div class="k">Contrato</div><div class="v">${free || retired ? '—' : 'Hasta ' + p.contract}</div></div>
      <div><div class="k">Potencial</div><div class="v">${potTxt}</div></div>
      <div><div class="k">Pie</div><div class="v">${p.foot ? 'Diestro' : 'Zurdo'}</div></div>
      <div><div class="k">Estado</div><div class="v">${status}</div></div>
      <div><div class="k">Filigranas</div><div class="v">${starsN(p.sm)}</div></div>
      <div><div class="k">Pierna mala</div><div class="v">${starsN(p.wf)}</div></div>
      <div><div class="k">Forma física</div><div class="v">${p.fit}%</div></div></div>`;
    let actions = '';
    if (mine) actions = ownActions(S, p);
    else if (!retired) actions = transferPanel(S, p);
    sheet(head + `<div class="stats6">${stats6}</div>` + info + season + actions, { keepScroll: UI.nego && UI.nego.pid === id });
  }
  UI.openPlayer = openPlayer;
  A.player = el => { UI.nego = null; openPlayer(+el.dataset.id); };

  function ownActions(S, p) {
    const open = M.windowOpen(S);
    const n = UI.nego && UI.nego.pid === p.id ? UI.nego : null;
    let renew = '';
    if (n && n.stage === 'renew') {
      const demand = M.renewDemand(S, p);
      const years = M.renewOptions(S, p);
      if (!years.length) {
        renew = `<div class="nego"><p class="note">${esc(p.short)} ya tiene contrato hasta ${p.contract}; no hace falta renovar.</p></div>`;
      } else {
        if (!years.includes(n.years)) n.years = years[Math.min(years.length - 1, 1)];
        renew = `<div class="nego"><b>Renovación</b><p class="note">${esc(p.short)} pide ${U.money(demand)}/sem (ahora ${U.money(p.wage)}).</p>
          <div class="row"><select data-change="nego-years" aria-label="Duración">${years.map(y =>
            `<option value="${y}" ${n.years === y ? 'selected' : ''}>Hasta ${S.season + y} (${y} temporada${y > 1 ? 's' : ''})</option>`).join('')}</select>
          <button class="btn primary" data-act="renew-ok" data-id="${p.id}">Firmar</button></div>
          ${n.msg ? `<p class="note ${n.ok ? 'ok' : 'bad'}">${esc(n.msg)}</p>` : ''}</div>`;
      }
    }
    return `<div class="btn-row mt">
      <button class="btn sm" data-act="renew" data-id="${p.id}">Renovar</button>
      <button class="btn sm" data-act="list" data-id="${p.id}">${p.listed ? 'Quitar de venta' : 'Poner en venta'}</button>
      ${open ? `<button class="btn sm" data-act="quick-sell" data-id="${p.id}">Venta rápida · ${U.money(F.roundMoney(W.value(S, p) * 0.7))}</button>` : ''}
      <button class="btn sm danger" data-act="release" data-id="${p.id}">Rescindir</button></div>${renew}`;
  }

  function transferPanel(S, p) {
    const free = p.club === -1;
    const open = M.windowOpen(S);
    const w = M.willing(S, p, S.user);
    if (!w.ok) return `<div class="nego"><p class="note bad">${esc(w.reason)}</p></div>`;
    if (!free && !open) return `<div class="nego"><p class="note">El mercado está cerrado. Podrás negociar en la próxima ventana de fichajes.</p></div>`;
    if (!free && W.squad(S, p.club).length <= 18) return `<div class="nego"><p class="note">${esc(S.clubs[p.club].name)} no vende: tiene la plantilla corta.</p></div>`;
    let n = UI.nego && UI.nego.pid === p.id ? UI.nego : null;
    if (!n) {
      n = UI.nego = { pid: p.id, stage: free ? 'contract' : 'offer', fee: free ? 0 : F.roundMoney(W.value(S, p)), years: Math.min(3, M.maxYears(p)) };
    }
    if (n.stage === 'offer') {
      const step = F.roundMoney(Math.max(W.value(S, p) * 0.05, 10000 * S.econ.value));
      return `<div class="nego"><div class="row between"><b>Hacer oferta</b><span class="note">Valor ${U.money(W.value(S, p))}</span></div>
        <div class="stepper mt"><button class="btn" data-act="fee" data-d="${-step}" aria-label="Bajar">−</button>
        <input class="num" value="${U.money(n.fee)}" readonly aria-label="Oferta"><button class="btn" data-act="fee" data-d="${step}" aria-label="Subir">+</button></div>
        <button class="btn primary block mt" data-act="bid" data-id="${p.id}">Ofertar ${U.money(n.fee)}</button>
        ${n.msg ? `<p class="note ${n.ok ? 'ok' : 'bad'}">${esc(n.msg)}</p>` : ''}</div>`;
    }
    const wage = M.wageDemand(S, p, S.user);
    const err = M.canAfford(S, n.fee, wage);
    return `<div class="nego"><b>${free ? 'Fichar agente libre' : 'Contrato'}</b>
      <p class="note">${n.fee ? `Traspaso acordado: ${U.money(n.fee)}. ` : ''}${esc(p.short)} pide ${U.money(wage)}/sem.</p>
      <div class="row"><select data-change="nego-years" aria-label="Años">${Array.from({ length: M.maxYears(p) }, (_, i) => i + 1).map(y =>
        `<option value="${y}" ${n.years === y ? 'selected' : ''}>${y} año${y > 1 ? 's' : ''} (hasta ${S.season + y})</option>`).join('')}</select>
      <button class="btn primary" data-act="sign" data-id="${p.id}" ${err ? 'disabled' : ''}>Firmar</button></div>
      ${err ? `<p class="note bad">${esc(err)}</p>` : ''}${n.msg ? `<p class="note ${n.ok ? 'ok' : 'bad'}">${esc(n.msg)}</p>` : ''}</div>`;
  }

  A.fee = el => {
    const n = UI.nego;
    if (!n) return;
    n.fee = Math.max(0, F.roundMoney(n.fee + +el.dataset.d));
    n.msg = null;
    openPlayer(n.pid);
  };
  A.bid = el => {
    const S = G.S, p = S.players[+el.dataset.id], n = UI.nego;
    const r = M.offer(S, p, n.fee);
    if (r.result === 'accept') { n.stage = 'contract'; n.msg = `${S.clubs[p.club].name} acepta la oferta. Negocia el contrato.`; n.ok = true; }
    else if (r.result === 'counter') { n.fee = r.price; n.msg = r.msg + ' Ajusta tu oferta.'; n.ok = false; }
    else if (r.result === 'closed') { n.msg = 'El mercado está cerrado.'; n.ok = false; }
    else { n.msg = r.msg; n.ok = false; }
    openPlayer(p.id);
  };
  C['nego-years'] = el => { if (UI.nego) UI.nego.years = +el.value; };
  A.sign = el => {
    const S = G.S, p = S.players[+el.dataset.id], n = UI.nego;
    const r = M.sign(S, p, n.fee, M.wageDemand(S, p, S.user), n.years);
    if (r.ok) {
      G.save(); closeSheet(); toast(`¡${p.short} es nuevo jugador del club!`); UI.refresh();
    } else { n.msg = r.msg; n.ok = false; openPlayer(p.id); }
  };
  A.renew = el => {
    const p = G.S.players[+el.dataset.id];
    UI.nego = { pid: p.id, stage: 'renew', years: Math.min(3, M.maxYears(p)) };
    openPlayer(p.id);
  };
  A['renew-ok'] = el => {
    const S = G.S, p = S.players[+el.dataset.id], n = UI.nego;
    const r = M.renew(S, p, n.years);
    n.msg = r.msg; n.ok = r.ok;
    if (r.ok) { G.save(); UI.nego = null; toast(r.msg); UI.refresh(); }
    openPlayer(p.id);
  };
  A.list = el => {
    const p = G.S.players[+el.dataset.id];
    p.listed = !p.listed;
    G.save();
    toast(p.listed ? `${p.short} está en la lista de transferibles` : `${p.short} ya no está en venta`);
    openPlayer(p.id); UI.refresh();
  };
  A['quick-sell'] = el => {
    const S = G.S, p = S.players[+el.dataset.id];
    const fee = F.roundMoney(W.value(S, p) * 0.7);
    confirmBox('Venta rápida', `¿Vender a ${esc(p.name)} por ${U.money(fee)} al primer club interesado?`, 'Vender', () => {
      const r = M.quickSell(S, p);
      toast(r.msg, !r.ok);
      if (r.ok) G.save();
      UI.refresh();
    });
  };
  A.release = el => {
    const S = G.S, p = S.players[+el.dataset.id];
    const cost = M.releaseCost(S, p);
    confirmBox('Rescindir contrato', `Rescindir a ${esc(p.name)} cuesta ${U.money(cost)} (50% del salario pendiente). Quedará como agente libre.`, 'Rescindir', () => {
      const r = M.release(S, p);
      toast(r.msg, !r.ok);
      if (r.ok) G.save();
      UI.refresh();
    }, true);
  };

  // ------------------------------------------------------------ Fin de temporada / destitución
  A['season-end'] = () => {
    const S = G.S;
    if (!S.over) return;
    const sum = SE.endSeason(S);
    UI.seasonSum = sum;
    const champ = S.clubs[sum.champion];
    const ok = sum.pos <= sum.target;
    const moved = sum.moved === 'up' ? '<p class="pos-ok" style="font-weight:700">¡Ascenso conseguido!</p>' :
      sum.moved === 'down' ? '<p class="neg" style="font-weight:700">Descenso de categoría.</p>' : '';
    const youth = sum.youth.map(id => S.players[id]);
    sheet(sheetHead(`Temporada ${U.seasonLabel(sum.season)}`) + `
      <div class="center" style="margin:6px 0 14px"><div class="num" style="font-size:56px;font-weight:800;line-height:1">${sum.pos}º</div>
      <div class="muted">de ${sum.n} en ${esc(sum.league)}</div>${moved}</div>
      <div class="info">
        <div><div class="k">Campeón</div><div class="v">${esc(champ.name)}</div></div>
        <div><div class="k">Objetivo</div><div class="v ${ok ? 'pos-ok' : 'neg'}">${ok ? 'Cumplido' : 'No cumplido'}</div></div>
        <div><div class="k">Confianza</div><div class="v">${sum.conf}% (${sum.confDelta >= 0 ? '+' : ''}${sum.confDelta})</div></div>
        <div><div class="k">Premio liga</div><div class="v">${U.money(sum.prize || 0)}</div></div>
        <div><div class="k">Pichichi</div><div class="v">${sum.topScorer ? esc(sum.topScorer[0]) + ' (' + sum.topScorer[1] + ')' : '—'}</div></div>
        <div><div class="k">Tu goleador</div><div class="v">${sum.myTop ? esc(sum.myTop[0]) + ' (' + sum.myTop[1] + ')' : '—'}</div></div>
      </div>
      ${sum.left.length ? `<p class="note mt">Se van libres (fin de contrato): ${esc(sum.left.join(', '))}.</p>` : ''}
      ${sum.retired.length ? `<p class="note mt">Se retiran: ${esc(sum.retired.join(', '))}.</p>` : ''}
      ${youth.length ? `<div class="group-title">Llegan de la cantera</div>${youth.map(p => playerRow(S, p, { act: 'noop', sub: `${p.age} años · potencial ${Math.max(p.ovr, p.pot - 3)}–${Math.min(95, p.pot + 3)}` })).join('')}` : ''}
      ${sum.lastChance ? '<p class="note bad mt">La directiva está muy descontenta, pero te da una última oportunidad. Otra temporada así y estarás fuera.</p>' : ''}
      ${sum.fired ? '<p class="note bad mt">La directiva ha decidido prescindir de ti.</p>' : ''}
      <p class="note mt">Presupuesto salarial para la próxima temporada: ${U.money(sum.wageBudget)}/sem.</p>
      <button class="btn primary block mt" data-act="season-next">${sum.fired ? 'Continuar' : `Empezar temporada ${U.seasonLabel(sum.season + 1)}`}</button>`,
    { onClose: () => { if (UI.seasonSum) A['season-next'](); } });
  };
  A['season-next'] = () => {
    const S = G.S;
    if (!UI.seasonSum) return;
    UI.seasonSum = null;
    closeSheet();
    if (!S.fired) SE.newSeason(S);
    G.save();
    UI.tab = 'home';
    render();
  };
  A.noop = () => {};

  function renderFired() {
    const S = G.S;
    app().innerHTML = `<div class="title-screen"><div class="logo"><h1>DESTI<span>TUIDO</span></h1>
      <p>${esc(S.clubs[S.user].name)} prescinde de ti</p></div>
      <div class="card" style="max-width:420px;width:100%"><p class="muted" style="margin:0">La directiva ha perdido la confianza en tu proyecto. ${S.history.length ? `Temporadas dirigidas: ${S.history.length}.` : ''}</p></div>
      <div class="title-actions"><button class="btn primary" data-act="fired-new">Empezar de nuevo</button></div></div>`;
  }
  A['fired-new'] = () => { G.wipe(); renderTitle(); };

  // ------------------------------------------------------------ Portada
  function renderTitle() {
    const meta = G.meta();
    app().innerHTML = `<div class="title-screen">
      <div class="logo"><h1>TOUCH<span>LINE</span></h1><p>Football Manager</p></div>
      <div class="title-actions">
        ${meta ? `<button class="btn primary continue-card" data-act="continue"><div class="t">Continuar</div>
          <div class="s">${esc(meta.club)} · ${U.seasonLabel(meta.season)} · Jornada ${meta.week + 1} · ${esc(meta.manager)}</div></button>` : ''}
        <button class="btn ${meta ? '' : 'primary'}" data-act="new-game">Nueva partida</button>
        <button class="btn ghost" data-act="import">Importar partida</button>
        <button class="btn ghost" data-act="music">${icon(Music.on() ? 'musicOn' : 'musicOff')}</button>
      </div>
      <p class="credits">Datos de jugadores basados en el dataset EA SPORTS FC 27 (EA_FC_ANALYSIS). Valores de mercado, salarios, contratos y potencial estimados por el juego. Música: “Strategic Swing”.</p>
    </div>`;
  }
  UI.renderTitle = renderTitle;

  A.continue = async () => {
    Music.start();
    app().innerHTML = '<div class="title-screen"><div class="spinner"></div></div>';
    try {
      await G.load();
      UI.tab = 'home';
      renderShell(); render();
    } catch (e) {
      console.error(e);
      toast('No se pudo cargar la partida', true);
      renderTitle();
    }
  };

  // ------------------------------------------------------------ Asistente nueva partida
  A['new-game'] = () => {
    Music.start();
    UI.wz = { step: 0 };
    renderWizard();
  };

  function wizHead(title, step) {
    return `<div class="wizard-head"><button class="icon-btn" data-act="wz-back" aria-label="Atrás">${icon('back')}</button><h1>${title}</h1></div>
      <div class="steps">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  function renderWizard() {
    const z = UI.wz;
    let html = '';
    if (z.step === 0) {
      html = wizHead('Competición', 0) + `<div class="pick-list">
        <button class="pick big-pick" data-act="wz-gender" data-g="M"><span class="flag">⚽</span><span class="grow"><div class="t">Fútbol masculino</div><div class="s">17.849 jugadores · 34 ligas jugables</div></span>${icon('next')}</button>
        <button class="pick big-pick" data-act="wz-gender" data-g="F"><span class="flag">⚽</span><span class="grow"><div class="t">Fútbol femenino</div><div class="s">1.940 jugadoras · 5 ligas jugables</div></span>${icon('next')}</button>
      </div>`;
    } else if (z.step === 1) {
      if (!z.data) html = wizHead('Elige liga', 1) + '<div class="spinner"></div>';
      else {
        const leagues = z.data.leagues.map((l, i) => ({ i, name: l[0], country: l[1], flag: l[2], playable: l[3] })).filter(l => l.playable);
        const byLeague = {};
        z.data.clubs.forEach((c, ci) => { (byLeague[c[1]] || (byLeague[c[1]] = [])).push(ci); });
        html = wizHead('Elige liga', 1) + `<div class="pick-list two">${leagues.map(l => {
          const clubs = byLeague[l.i] || [];
          const avg = U.sum(clubs, ci => z.prev.reps[ci]) / clubs.length;
          return `<button class="pick" data-act="wz-league" data-l="${l.i}"><span class="flag">${l.flag}</span>
            <span class="grow"><div class="t ellipsis">${esc(l.name)}</div><div class="s">${esc(l.country)} · ${clubs.length} clubes · ${stars(avg)}</div></span></button>`;
        }).join('')}</div>`;
      }
    } else if (z.step === 2) {
      const clubs = z.data.clubs.map((c, i) => ({ i, name: c[0], league: c[1] })).filter(c => c.league === z.league)
        .sort((a, b) => z.prev.reps[b.i] - z.prev.reps[a.i]);
      const n = clubs.length;
      html = wizHead('Elige club', 2) + `<p class="note" style="margin:-6px 0 12px">${esc(z.data.leagues[z.league][0])} · ordenados por nivel</p><div class="pick-list two">${clubs.map((c, k) => {
        const exp = k < 2 ? 'Favorito al título' : k < Math.ceil(n / 3) ? 'Aspirante' : k < Math.ceil(n * 0.66) ? 'Media tabla' : 'Lucha por la permanencia';
        return `<button class="pick" data-act="wz-club" data-c="${c.i}">${crestFor(c.name)}
          <span class="grow"><div class="t ellipsis">${esc(c.name)}</div><div class="s">${stars(z.prev.reps[c.i])} · ${exp}</div></span>
          <span class="num" style="font-size:20px;font-weight:700">${z.prev.reps[c.i].toFixed(0)}</span></button>`;
      }).join('')}</div>`;
    } else {
      const name = z.data.clubs[z.club][0];
      html = wizHead('Tu entrenador', 3) + `<div class="card"><div class="row" style="margin-bottom:14px">${crestFor(name, 'lg')}
        <div><div style="font-family:var(--font-c);font-size:24px;font-weight:800">${esc(name)}</div>
        <div class="note">${esc(z.data.leagues[z.league][0])} · Temporada ${U.seasonLabel(z.data.season)}</div></div></div>
        <label class="note" for="mgr">Nombre del entrenador</label>
        <input id="mgr" maxlength="28" value="${esc(z.name || '')}" placeholder="Míster" style="margin-top:6px">
        <button class="btn primary block mt" data-act="wz-start">Empezar carrera</button></div>`;
    }
    app().innerHTML = `<div class="wizard">${html}</div>`;
    window.scrollTo(0, 0);
  }

  A['wz-back'] = () => {
    const z = UI.wz;
    if (z.step === 0) { UI.wz = null; renderTitle(); return; }
    z.step--;
    renderWizard();
  };
  A['wz-gender'] = async el => {
    const z = UI.wz;
    z.gender = el.dataset.g; z.step = 1; z.data = null;
    renderWizard();
    try {
      z.data = await G.loadData(z.gender);
      z.prev = G.preview(z.data);
      if (UI.wz === z && z.step === 1) renderWizard();
    } catch (e) {
      toast('No se pudieron cargar los datos', true);
      z.step = 0; renderWizard();
    }
  };
  A['wz-league'] = el => { UI.wz.league = +el.dataset.l; UI.wz.step = 2; renderWizard(); };
  A['wz-club'] = el => { UI.wz.club = +el.dataset.c; UI.wz.step = 3; renderWizard(); };
  A['wz-start'] = () => {
    const z = UI.wz;
    const name = (document.getElementById('mgr').value || '').trim() || 'Míster';
    app().innerHTML = '<div class="title-screen"><div class="spinner"></div><p class="muted">Creando el mundo…</p></div>';
    setTimeout(() => {
      G.newGame(z.data, z.club, name);
      UI.wz = null;
      UI.tab = 'home';
      renderShell(); render();
    }, 30);
  };

  // ------------------------------------------------------------ Jugar jornada
  A['play-quick'] = () => {
    const S = G.S;
    if (S.over) return;
    G.completeRound(null);
    const m = S.fixtures[S.week - 1].find(m => m[0] === S.user || m[1] === S.user) || null;
    showRoundResults(S, S.week - 1, m);
  };

  function showRoundResults(S, r, my) {
    const L = W.userLeague(S);
    let head = '';
    if (my) {
      const h = S.clubs[my[0]], a = S.clubs[my[1]];
      const res = resultLetter(S, my);
      head = `<div class="card next-match" style="margin-bottom:12px"><div class="nm-teams" style="margin:6px 0">
        <div class="nm-team">${crest(h, 'lg')}<span class="nm-name">${esc(h.name)}</span></div>
        <div class="num" style="font-size:40px;font-weight:800">${my[2]} - ${my[3]}</div>
        <div class="nm-team">${crest(a, 'lg')}<span class="nm-name">${esc(a.name)}</span></div></div>
        <p class="center" style="margin:0;font-weight:700;color:${res === 'V' ? 'var(--accent2)' : res === 'D' ? 'var(--danger)' : 'var(--muted)'}">${res === 'V' ? 'Victoria' : res === 'D' ? 'Derrota' : 'Empate'}</p></div>`;
    }
    sheet(sheetHead(`Jornada ${r + 1}`) + head + `<div class="card" style="padding:6px 10px">${S.fixtures[r].map(m => fixtureHtml(S, m)).join('')}</div>
      <button class="btn primary block mt" data-act="close-sheet">Continuar</button>`, { onClose: () => render(false) });
  }
  UI.showRoundResults = showRoundResults;

  // ------------------------------------------------------------ Eventos globales
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = A[el.dataset.act];
    if (f) { ev.preventDefault(); f(el, ev); }
  });
  const onChange = ev => {
    const el = ev.target.closest('[data-change]');
    if (!el) return;
    const f = C[el.dataset.change];
    if (f) f(el, ev);
  };
  document.addEventListener('input', ev => { if (ev.target.matches('input[type="search"], input[type="text"]')) onChange(ev); });
  document.addEventListener('change', ev => { if (!ev.target.matches('input[type="search"], input[type="text"]')) onChange(ev); });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && document.querySelector('.sheet-back')) closeSheet();
  });

  Object.assign(UI, {
    icon, crest, posB, ovrB, fitB, flag, playerRow, toast, sheet, closeSheet, sheetHead, confirmBox,
    renderShell, renderTop, fixtureHtml, resultLetter, MENT
  });
  TL.UI = UI;
})();
