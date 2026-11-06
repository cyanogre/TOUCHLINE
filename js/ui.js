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
  /** Escudo: el real si existe (CDN) y, si no carga, el generado con iniciales. */
  const CREST_OK = new Set();
  function crest(c, cls) {
    const known = c.logo && CREST_OK.has(c.logo);
    const img = c.logo ? `<img src="${esc(c.logo)}" alt="" ${known ? '' : 'loading="lazy"'} decoding="async" onload="TL.UI.crestOk(this)" onerror="this.remove()">` : '';
    return `<span class="crest ${cls || ''} ${known ? 'ok ready' : ''}" style="--c1:${c.c1};--c2:${c.c2}" aria-hidden="true"><b>${esc(c.code)}</b>${img}</span>`;
  }
  UI.crestOk = img => { CREST_OK.add(img.getAttribute('src')); img.parentNode && img.parentNode.classList.add('ok'); };
  function crestFor(name, cls, gender) {
    const [c1, c2] = U.clubColors(name);
    return crest({ c1, c2, code: U.clubCode(name), logo: U.crestUrl(gender || (UI.wz && UI.wz.gender) || 'M', name) }, cls);
  }
  function posB(pos) { return `<span class="pos l${F.LINE[pos]}">${F.POS_ES[pos]}</span>`; }
  function ovrCls(v) { return v >= 85 ? 't1' : v >= 75 ? 't2' : v >= 65 ? 't3' : 't4'; }
  function ovrB(v) { return `<span class="ovr ${ovrCls(v)}">${v}</span>`; }
  function fitB(f) { return `<span class="fit ${f < 60 ? 'low' : f < 80 ? 'mid' : ''}" title="Forma física ${f}%"><i style="width:${f}%"></i></span>`; }
  function flagImg(code, title) {
    return code ? `<img class="flagi" src="assets/flags/${code}.svg" alt="${esc(title || '')}" title="${esc(title || '')}" loading="lazy" width="18" height="13">` : '';
  }
  function flag(S, p) { const n = S.nations[p.nat]; return n ? flagImg(n[1], n[0]) : ''; }
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
    const LK = TL.Locker;
    if (LK && S.lk) {
      const l = LK.loanOf(S, p.id);
      if (l) t.push(`<span class="tag loan">${l.to === S.user ? 'CEDIDO' : 'CEDIDO FUERA'}</span>`);
      const g = S.lk.gems[p.id];
      if (g && p.club === S.user) t.push(`<span class="tag gem" title="Talento oculto">✨${g.stage >= 2 ? ' ADN' : ''}</span>`);
      const tr = LK.traits(S, p.id);
      if (tr.length) t.push(`<span class="trait-ic" title="${esc(tr.map(k => LK.TRAITS[k].name).join(' · '))}">${tr.map(k => LK.TRAITS[k].icon).join('')}</span>`);
    }
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
    if (bad && TL.SFX) TL.SFX.error();
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
      if (!a.paused) return;
      a.volume = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => { /* bloqueado hasta interacción */ });
      Music.fade(Music.base);
    },
    base: 0.32,
    fade(to, ms) {
      const a = Music.el(); if (!a) return;
      clearInterval(Music._f);
      const from = a.volume, steps = 20, dt = (ms || 1200) / steps;
      let k = 0;
      Music._f = setInterval(() => { k++; a.volume = Math.max(0, Math.min(1, from + (to - from) * k / steps)); if (k >= steps) clearInterval(Music._f); }, dt);
    },
    duck(on) { if (Music.on()) Music.fade(on ? 0.1 : Music.base, 800); },
    toggle() {
      const on = !Music.on();
      try { localStorage.setItem('touchline.music', on ? '1' : '0'); } catch (e) { /* nada */ }
      if (on) Music.start(); else Music.el().pause();
      document.querySelectorAll('[data-act="music"]').forEach(b => { b.innerHTML = icon(on ? 'musicOn' : 'musicOff'); });
      toast(on ? 'Música activada' : 'Música desactivada');
    }
  };
  A.music = () => Music.toggle();
  A['opt-music'] = () => { Music.toggle(); UI.refresh(); };
  A['opt-sfx'] = () => { TL.SFX.setOn(!TL.SFX.on()); TL.SFX.toggle(TL.SFX.on()); UI.refresh(); };
  A['opt-mentor'] = () => { TL.Mentor.setOn(!TL.Mentor.on()); UI.refresh(); };
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
      <div class="cash ${c.cash < 0 ? 'neg' : ''} ${UI.lastCash != null && UI.lastCash !== Math.round(c.cash) ? (c.cash > UI.lastCash ? 'up pop' : 'down pop') : ''}">${U.money(c.cash)}<small>Saldo</small></div>
      <button class="icon-btn help-btn" data-act="help" aria-label="Ayuda del Profe" title="Ayuda del Profe">?</button>
      <button class="icon-btn" data-act="music" aria-label="Música">${icon(Music.on() ? 'musicOn' : 'musicOff')}</button>`;
    UI.lastCash = Math.round(c.cash);
    TL.Commerce.refreshBudget(S);
    const unread = S.inbox.filter(m => !m.read).length;
    const offers = S.inbox.filter(m => m.kind === 'offer' && !m.done).length;
    document.getElementById('nav').innerHTML = TABS.map(([k, label]) =>
      `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-current="${UI.tab === k ? 'page' : 'false'}">
        ${icon(k)}<span>${label}</span>${k === 'home' && unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''}${k === 'market' && offers ? `<span class="badge">${offers}</span>` : ''}</button>`).join('');
  }

  const VIEWS = {};
  function render(keepScroll) {
    const S = G.S;
    if (!S) return renderTitle();
    if (S.fired) return renderFired();
    if (!document.getElementById('view')) renderShell();
    const y = window.scrollY;
    renderTop(S);
    const view = document.getElementById('view');
    view.classList.toggle('enter', !keepScroll);
    view.innerHTML = VIEWS[UI.tab](S);
    if (VIEWS[UI.tab + 'After']) VIEWS[UI.tab + 'After'](S);
    mountFaces(view);
    window.scrollTo(0, keepScroll ? y : 0);
  }
  UI.render = render;
  UI.refresh = () => render(true);
  A.tab = el => { UI.tab = el.dataset.tab; TL.SFX && TL.SFX.tab(); render(false); };

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
    const ic = { board: '🏛️', market: '💼', offer: '📩', news: '📰', med: '🏥', club: '📋', decision: '⚖️', good: '⭐' }[m.kind] || '✉️';
    let actions = '';
    if (m.kind === 'decision' && !m.done && m.data && m.data.opts) {
      actions = `<div class="btn-row">${m.data.opts.map(([k, label], i) =>
        `<button class="btn sm ${i === 0 ? 'primary' : ''}" data-act="decide" data-id="${m.id}" data-k="${k}">${esc(label)}</button>`).join('')}
        ${m.data.pid != null ? `<button class="btn sm ghost" data-act="player" data-id="${m.data.pid}">Ficha</button>` : ''}</div>`;
    }
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
        ${(() => {
          const oid = fx[0] === S.user ? fx[1] : fx[0], co = TL.Coach.of(S, oid);
          return co ? `<p class="nm-coach">Banquillo rival: <b>${esc(co.name)}</b> · fama de técnico ${TL.Coach.STYLES[co.style].name}. <span>Su once y su sistema, al empezar.</span></p>` : '';
        })()}
        <div class="nm-actions"><button class="btn primary" data-act="play-live">▶ Jugar partido</button>
        <button class="btn" data-act="play-quick">Resultado rápido</button></div></section>`;
    }

    const conf = S.board.conf;
    const played = tab.some(r => r.pj > 0);
    const board = `<section class="card"><div class="card-head"><h2>Directiva</h2><span class="muted">${played ? posOf(S.user) + 'º de ' + tab.length : 'Pretemporada'}</span></div>
      <div style="font-weight:700;font-size:16px">${esc(S.board.text)}</div>
      <div class="row between mt"><span class="muted" style="font-size:13px">Confianza</span><b class="num">${Math.round(conf)}%</b></div>
      <div class="bar ${conf < 30 ? 'bad' : conf < 50 ? 'warn' : ''}" style="margin-top:6px"><i style="width:${conf}%"></i></div>
      <button class="row between mt mgr-line" data-act="go-manager"><span>🎓 Mánager nivel <b>${S.mgr.level}</b></span>
        ${S.mgr.points ? `<span class="tag new">${S.mgr.points} punto${S.mgr.points > 1 ? 's' : ''} por gastar</span>` : '<span class="faint">Ver habilidades</span>'}</button></section>`;

    const news = `<section class="card span2"><div class="card-head"><h2>Noticias</h2><button class="link" data-act="news">Ver todas</button></div>
      ${S.news.length ? S.news.slice(0, 5).map(n => newsHtml(S, n)).join('') : '<div class="empty">Sin noticias.</div>'}</section>`;

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
      <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><div class="k">Para fichajes</div><div class="v ${TL.Commerce.transferBudget(S) < 0 ? 'neg' : ''}">${U.money(TL.Commerce.transferBudget(S))}</div></div>
      <div class="kpi"><div class="k">Salarios/sem</div><div class="v">${U.money(bill)}</div></div></div>
      <div class="row between mt"><span class="muted" style="font-size:13px">Presupuesto salarial</span><span class="num">${U.money(bill)} / ${U.money(c.wageBudget)}</span></div>
      <div class="bar ${bill > c.wageBudget ? 'bad' : bill > c.wageBudget * 0.95 ? 'warn' : ''}" style="margin-top:6px"><i style="width:${Math.min(100, bill / c.wageBudget * 100)}%"></i></div></section>`;

    const lessons = (TL.Mentor.state(S).lessons || {});
    const doneN = TL.School.LESSONS.filter(l => lessons[l.id] && lessons[l.id] !== 'read').length;
    const school = doneN < TL.School.LESSONS.length ? `<section class="card school-card"><div class="row">
        <div class="vn-portrait sm"><div class="vn-face" data-face="1"></div></div>
        <div class="grow"><h2>La escuela del Profe</h2><div class="note">Aprende a ganar partidos: puntos, formaciones, cambios y cómo progresar. ${doneN}/${TL.School.LESSONS.length} lecciones.</div></div></div>
        <button class="btn sm primary block mt" data-act="school">${doneN ? 'Seguir aprendiendo' : 'Empezar la primera lección'}</button></section>` : '';
    return `<div class="grid two three">${next}${board}${school}${inbox}${news}${results}${mini}${fin}</div>`;
  };
  VIEWS.homeAfter = S => {
    // Lo mostrado en Inicio queda como leído
    S.inbox.slice(0, 4).forEach(m => { m.read = true; });
  };

  const NEWS_IC = {
    liga: '⚽', fichajes: '🔁', polemica: '🔥', arbitraje: '⚖️', aficion: '📢', vestuario: '🚪', sucesos: '🚨',
    tribunales: '🏛️', dopaje: '💉', redes: '📱', ocio: '🍸', mercado: '💼', club: '🏟️', positivo: '⭐', rumor: '👀'
  };
  function newsHtml(S, n) {
    const club = n.club >= 0 ? S.clubs[n.club] : null;
    return `<div class="news tone-${n.tone}" ${n.pid >= 0 ? `data-act="player" data-id="${n.pid}" role="button" tabindex="0"` : ''}>
      <div class="ic">${NEWS_IC[n.cat] || '📰'}</div><div class="grow">
      <div class="nt"><span class="ncat">${esc(TL.News.CAT[n.cat] || n.cat)}</span>${club && n.club === S.user ? '<span class="tag new">Tu club</span>' : ''}</div>
      <div class="t">${esc(n.title)}</div><div class="b">${esc(n.body)}</div>
      <div class="d">${U.seasonLabel(n.s)} · Semana ${n.w}</div></div></div>`;
  }
  const NEWS_FILTERS = [['all', 'Todas'], ['mine', 'Tu club'], ['hot', 'Polémicas'], ['liga', 'Liga'], ['fichajes', 'Fichajes'], ['aficion', 'Afición'], ['arbitraje', 'Arbitraje']];
  A.news = el => {
    const S = G.S;
    const f = (el && el.dataset.f) || UI.newsFilter || 'all';
    UI.newsFilter = f;
    const hot = ['polemica', 'vestuario', 'sucesos', 'tribunales', 'dopaje', 'redes', 'ocio'];
    const list = S.news.filter(n => f === 'all' || (f === 'mine' ? n.club === S.user : f === 'hot' ? hot.includes(n.cat) : n.cat === f));
    sheet(sheetHead('Noticias') + `<div class="chips" style="margin-bottom:8px">${NEWS_FILTERS.map(([k, l]) =>
      `<button class="chip ${f === k ? 'on' : ''}" data-act="news" data-f="${k}">${l}</button>`).join('')}</div>
      ${list.length ? list.slice(0, 80).map(n => newsHtml(S, n)).join('') : '<div class="empty">No hay noticias en esta categoría.</div>'}`, { keepScroll: false });
  };
  A['go-manager'] = () => { UI.tab = 'club'; UI.clubTab = 'manager'; render(false); };
  A.decide = el => {
    const S = G.S;
    const m = S.inbox.find(x => x.id === +el.dataset.id);
    const r = TL.News.decide(S, m, el.dataset.k);
    toast(r.msg || 'Decisión tomada', !r.ok);
    G.save();
    if (document.querySelector('.sheet')) A.inbox();
    UI.refresh();
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

  // ------------------------------------------------------------ Vestuario
  const face = cls => `<div class="vn-portrait ${cls || 'sm'}"><div class="vn-face" data-face="1"></div></div>`;
  UI.face = face;
  function mountFaces(root) { if (TL.Mentor && root) root.querySelectorAll('[data-face]').forEach(el => { if (!el.firstChild) new TL.Mentor.Face(el, { head: el.dataset.face === 'head' }); }); }
  /** La cabeza del Profe (a 1:1) para usarla como icono en lugar de un emoji. */
  const profeIc = () => '<span class="vn-face head" data-face="head" aria-hidden="true"></span>';
  UI.profeIc = profeIc;
  UI.mountFaces = mountFaces;

  function lockerCard(S) {
    const LK = TL.Locker;
    if (!LK || !S.lk) return '';
    const sq = W.squad(S, S.user);
    const avgMor = sq.length ? U.sum(sq, p => (p.mor == null ? 70 : p.mor)) / sq.length : 70;
    const [ml, me] = TL.News.moraleLabel(avgMor);
    const acts = Object.entries(LK.ACT).map(([k, a]) => {
      const ready = LK.actReady(S, k), cost = LK.actCost(S, k);
      return `<button class="act-btn" data-act="lk-act" data-k="${k}" ${ready ? '' : 'disabled'} title="${esc(a.desc)}">
        <span class="ai">${a.icon}</span><span class="at">${a.name}<small>${ready ? (cost ? U.money(cost) : 'Gratis') : 'Desde J' + (S.lk.cool[k] + 1)}</small></span></button>`;
    }).join('');
    const li = (ic, html, cls) => `<li class="${cls || ''}"><span class="li-ic">${ic}</span><span>${html}</span></li>`;
    const pl = p => `<button class="link" data-act="player" data-id="${p.id}">${esc(p.short)}</button>`;
    const prs = LK.pairs(S).slice(0, 4).map(([a, b, r]) => li(r > 0 ? '🤝' : '⚡', `${pl(a)} y ${pl(b)} · <em>${LK.relLabel(r)}</em>`, r > 0 ? 'good' : 'bad')).join('');
    const men = Object.entries(S.lk.mentor).map(([k, m]) => [S.players[k], S.players[m]]).filter(([a, b]) => a && b && a.club === S.user && b.club === S.user)
      .map(([a, b]) => li('🎓', `${pl(b)} apadrina a ${pl(a)}`)).join('');
    const gems = Object.keys(S.lk.gems).map(id => S.players[id]).filter(p => p && p.club === S.user)
      .map(p => { const g = S.lk.gems[p.id]; return li(g.stage >= 2 ? '🌟' : '✨', `${pl(p)} · ${g.stage === 0 ? 'talento oculto' : g.stage === 1 ? 'ADN: ' + LK.DNA[g.dna].name : g.stage === 2 ? 'ADN desbloqueado' : 'superestrella'}`); }).join('');
    const loans = S.lk.loans.map(l => { const p = S.players[l.pid]; if (!p) return ''; return li('🔁', `${pl(p)} · ${l.from === S.user ? 'cedido al ' + esc(S.clubs[l.to].name) : 'llega cedido del ' + esc(S.clubs[l.from].name)}`); }).join('');
    const staff = S.lk.staff.map(s => li('🧑‍🏫', `<b>${esc(s.name)}</b> · ${LK.STAFF[s.role].name}`)).join('');
    const pending = S.inbox.filter(m => m.kind === 'decision' && !m.done && m.data && /^lk_/.test(m.data.ev || '')).length;
    const block = (t, body) => (body ? `<div class="lk-block"><div class="group-title">${t}</div><ul class="lk-list">${body}</ul></div>` : '');
    return `<section class="card locker" style="margin-bottom:12px">
      <div class="card-head"><h2>Vestuario</h2><span class="muted">${me} Ambiente ${ml.toLowerCase()}</span></div>
      ${pending ? `<button class="lk-office" data-act="inbox"><span>🚪</span><span><b>${pending} reunión${pending > 1 ? 'es' : ''} pendiente${pending > 1 ? 's' : ''}</b><small>Te esperan en el despacho</small></span><span class="go">›</span></button>` : ''}
      <div class="act-row">${acts}</div>
      <div class="lk-grid">${block('Relaciones', prs)}${block('Padrinos', men)}${block('Joyas de la cantera', gems)}${block('Cesiones', loans)}${block('Cuerpo técnico', staff)}</div>
      <p class="note" style="margin:8px 0 0">Toca a un jugador para hablar con él en el despacho, ponerle padrino o un plan de entrenamiento.</p></section>`;
  }

  function lockerSection(S, p) {
    const LK = TL.Locker;
    if (!LK || !S.lk) return '';
    const out = [];
    const tr = LK.traits(S, p.id);
    if (tr.length) out.push(`<div class="trait-list">${tr.map(k => `<div class="trait"><span class="ti">${LK.TRAITS[k].icon}</span><span><b>${LK.TRAITS[k].name}</b><small>${esc(LK.TRAITS[k].desc)}</small></span></div>`).join('')}</div>`);
    const g = S.lk.gems[p.id];
    if (g) {
      const d = LK.DNA[g.dna];
      const txt = g.stage === 0 ? `<b>✨ Talento oculto.</b> Los técnicos ven algo especial. Dale partidos (${g.apps}/8 en su sitio) para descubrir qué es.`
        : g.stage === 1 ? `<b>✨ ADN: ${d.name}.</b> ${d.hint} Partidos esta temporada en su sitio: ${g.apps}/15 · entrenamiento: ${S.lk.focus[p.id] === d.focus ? '✅' : '❌ ' + LK.FOCUS[d.focus].name}.`
          : g.stage === 2 ? `<b>🌟 ADN desbloqueado: ${d.name}.</b> Si llega a 80 de media antes de los 23, será una superestrella.` : `<b>🌟 Superestrella.</b> El ${d.name.toLowerCase()} de una generación.`;
      out.push(`<div class="gem-box">${txt}</div>`);
    }
    const b = LK.boss(S, p.id);
    const rels = W.squad(S, S.user).filter(q => q.id !== p.id).map(q => [q, LK.rel(S, p.id, q.id)]);
    const fr = rels.filter(r => r[1] >= 40).sort((a, c) => c[1] - a[1]).slice(0, 3);
    const en = rels.filter(r => r[1] <= -30).sort((a, c) => a[1] - c[1]).slice(0, 2);
    out.push(`<div class="info"><div><div class="k">Relación contigo</div><div class="v">${LK.bossLabel(b)}</div><div class="bar" style="margin-top:4px"><i style="width:${(b + 100) / 2}%;background:${b >= 20 ? 'var(--accent2)' : b <= -20 ? 'var(--danger)' : 'var(--warn)'}"></i></div></div>
      <div><div class="k">Se lleva bien con</div><div class="v small">${fr.length ? fr.map(r => esc(r[0].short)).join(', ') : '—'}</div></div>
      <div><div class="k">Choca con</div><div class="v small">${en.length ? en.map(r => esc(r[0].short)).join(', ') : 'Nadie'}</div></div></div>`);
    if (p.club === S.user) {
      const rows = [];
      if (p.age <= 23) {
        const cur = S.lk.focus[p.id] || '';
        rows.push(`<label class="lk-field"><span>Entrenamiento individual</span><select data-change="lk-focus" data-id="${p.id}"><option value="">Normal</option>${Object.entries(LK.FOCUS).filter(([k]) => (k === 'porteria') === (p.pos === 'GK')).map(([k, f]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${f.name}</option>`).join('')}</select></label>`);
      }
      if (LK.canBePupil(S, p)) {
        const vets = W.squad(S, S.user).filter(q => LK.canMentor(S, q)).sort((a, c) => (F.LINE[c.pos] === F.LINE[p.pos]) - (F.LINE[a.pos] === F.LINE[p.pos]) || c.ovr - a.ovr);
        const cur = S.lk.mentor[p.id];
        rows.push(`<label class="lk-field"><span>Padrino</span><select data-change="lk-mentor" data-id="${p.id}"><option value="">Sin padrino</option>${vets.map(q => `<option value="${q.id}" ${cur === q.id ? 'selected' : ''}>${esc(q.short)} (${q.age}, ${F.POS_ES[q.pos]}${LK.hasTrait(S, q.id, 'leader') ? ', líder' : ''})</option>`).join('')}</select></label>`);
      }
      const pupils = LK.pupilsOf(S, p.id).map(id => S.players[id]).filter(Boolean);
      if (pupils.length) rows.push(`<p class="note" style="margin:0">🎓 Apadrina a ${pupils.map(q => esc(q.short)).join(' y ')}.</p>`);
      if (rows.length) out.push(`<div class="lk-fields">${rows.join('')}</div>`);
      const met = S.lk.met && S.lk.met[p.id];
      const wait = met != null && S.week - met < 3 && S.week >= met;
      out.push(`<button class="btn block mt office-btn" data-act="lk-meet" data-id="${p.id}" ${wait ? 'disabled' : ''}>🚪 ${wait ? 'Ya hablasteis hace poco' : 'Reunión en el despacho'}</button>`);
    }
    return `<div class="group-title">Vestuario</div><div class="lk-section">${out.join('')}</div>`;
  }

  A['lk-act'] = el => {
    const r = TL.Locker.activity(G.S, el.dataset.k);
    toast(r.msg, !r.ok);
    if (r.ok) { TL.FX && TL.FX.sparkle(el); TL.SFX && TL.SFX.success(); G.save(); UI.refresh(); }
  };
  C['lk-focus'] = el => { const S = G.S; if (el.value) TL.Locker.state(S).focus[+el.dataset.id] = el.value; else delete S.lk.focus[+el.dataset.id]; G.save(); toast('Plan de entrenamiento actualizado'); };
  C['lk-mentor'] = el => { const r = TL.Locker.setMentor(G.S, +el.dataset.id, el.value === '' ? null : +el.value); toast(r.msg, !r.ok); G.save(); openPlayer(+el.dataset.id); };
  A['lk-meet'] = el => {
    const S = G.S, p = S.players[+el.dataset.id];
    const opts = TL.Locker.meetOptions(S, p);
    sheet(sheetHead('Despacho') + `<div class="office"><div class="office-head">${posB(p.pos)}${ovrB(p.ovr)}<p class="note" style="margin:0;color:var(--text)">${esc(p.name)} entra en tu despacho y se sienta. ¿De qué quieres hablar?</p></div>
      <div class="col mt">${opts.map(([k, l, d]) => `<button class="btn block office-opt" data-act="lk-meet-do" data-id="${p.id}" data-k="${k}"><b>${esc(l)}</b><small>${esc(d)}</small></button>`).join('')}</div></div>`);
    mountFaces(document.querySelector('.sheet'));
  };
  A['lk-meet-do'] = el => {
    const S = G.S, p = S.players[+el.dataset.id];
    const r = TL.Locker.meet(S, p, el.dataset.k);
    G.save();
    sheet(sheetHead('Despacho') + `<div class="office"><div class="office-head">${posB(p.pos)}${ovrB(p.ovr)}<p style="margin:0;line-height:1.45">${esc(r.msg)}</p></div>
      <div class="btn-row mt"><button class="btn" data-act="player" data-id="${p.id}">Volver a su ficha</button><button class="btn primary" data-act="close-sheet">Cerrar</button></div></div>`);
    mountFaces(document.querySelector('.sheet'));
    if (r.good) TL.SFX && TL.SFX.success(); else if (r.bad) TL.SFX && TL.SFX.error();
    UI.refresh();
  };
  A['loan-out'] = el => { const S = G.S, p = S.players[+el.dataset.id]; const r = TL.Locker.loanOut(S, p); toast(r.msg, !r.ok); if (r.ok) { G.save(); closeSheet(); UI.refresh(); } };
  A['loan-in'] = el => { const S = G.S, p = S.players[+el.dataset.id]; const r = TL.Locker.loanIn(S, p); toast(r.msg, !r.ok); if (r.ok) { TL.SFX && TL.SFX.coin(); G.save(); closeSheet(); UI.refresh(); } };
  A['loan-recall'] = el => { const S = G.S, p = S.players[+el.dataset.id]; const r = TL.Locker.recall(S, p); toast(r.msg, !r.ok); if (r.ok) { G.save(); openPlayer(p.id); UI.refresh(); } };

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
      const [ml, me] = TL.News.moraleLabel(p.mor);
      const yel = st && st[4] ? ` · 🟨${st[4]}` : '';
      const sub = `${flag(S, p)} ${p.age} años · ${U.money(W.value(S, p))} · <span title="Moral: ${ml}">${me}</span> ${fitB(p.fit)}${yel}`;
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
    return pageTitle('Plantilla', `${sq.length}/${M.MAX_SQUAD} jugadores`) + lockerCard(S) +
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
          ${reviewCard(S, 0)}
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

  // ------------------------------------------------------------ Repaso del Profe (siempre a posteriori)
  const REV_IC = { sys: '📋', chg: '🔁', edge: '⚔️', day: '🔋', luck: '🎲', hind: '🔍' };
  const bold = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  /** Tarjeta con el repaso de un partido ya jugado: qué hizo el rival y qué nos habría ido mejor. */
  function reviewCard(S, k) {
    const all = S.reviews || [];
    k = Math.min(k || 0, Math.max(0, all.length - 1));
    const r = all[k];
    const face = '<div class="vn-portrait sm"><div class="vn-face" data-face="1"></div></div>';
    if (!r) {
      return `<div class="card review"><div class="card-head"><h2>Repaso del Profe</h2></div>
        <div class="rv-intro">${face}<p>Antes del partido nadie sabe qué va a plantear el rival, <b>ni yo</b>. Su entrenador decide según su estilo, cómo llega su plantilla y lo que le viste hacer la última vez. Juega y aquí te cuento qué pasó.</p></div></div>`;
    }
    const opp = S.clubs[r.opp];
    const lines = TL.Coach.lines(S, r);
    const [g, a] = r.score;
    const res = g > a ? 'V' : g < a ? 'D' : 'E';
    const MENT_S = ['Def.', 'Equil.', 'Ofens.'];
    const maxP = Math.max(3, ...r.best.map(b => b[2]), r.actual);
    const bar = (v, me) => `<div class="rv-bar ${me ? 'me' : ''}"><i style="width:${Math.max(4, v / maxP * 100)}%"></i></div>`;
    const picker = all.length > 1 ? `<div class="chips rv-pick">${all.map((x, i) => `<button class="chip ${i === k ? 'on' : ''}" data-act="review-pick" data-k="${i}">J${x.w + 1} · ${esc(S.clubs[x.opp].name)}</button>`).join('')}</div>` : '';
    return `<div class="card review" data-k="${k}"><div class="card-head"><h2>Repaso del Profe</h2>
        <span class="rv-score ${res}">J${r.w + 1} · ${r.home ? 'en casa' : 'fuera'} · <b class="num">${g}-${a}</b></span></div>
      ${picker}
      <div class="rv-intro">${face}<p>${bold(lines[0].t)}</p></div>
      <div class="rv-stats">
        <div><span class="k">Goles esperados</span><b class="num">${r.xg[0].toFixed(1).replace(".", ",")} <i>·</i> ${r.xg[1].toFixed(1).replace(".", ",")}</b></div>
        <div><span class="k">Tiros</span><b class="num">${r.shots[0]} <i>·</i> ${r.shots[1]}</b></div>
        <div><span class="k">Posesión</span><b class="num">${r.poss}%</b></div>
        <div class="wide"><span class="k">Sistemas · tú y ${esc(opp.name)}</span><b class="num">${r.me.f} <i>·</i> ${r.them.f}</b></div></div>
      <ul class="rv-list">${lines.slice(1).map(l => `<li><span class="ic">${REV_IC[l.k] || '•'}</span><span>${bold(l.t)}</span></li>`).join('')}</ul>
      <div class="rv-hind"><div class="group-title">Con lo que sabemos ahora · puntos esperados</div>
        ${r.best.map(b => `<div class="rv-row"><b>${b[0]}</b><span class="note">${MENT_S[b[1]]}</span>${bar(b[2])}<span class="num">${b[2].toFixed(2).replace(".", ",")}</span></div>`).join('')}
        <div class="rv-row"><b>${r.me.f}</b><span class="note">Tu plan</span>${bar(r.actual, true)}<span class="num">${r.actual.toFixed(2).replace(".", ",")}</span></div>
        <p class="note" style="margin:6px 0 0">Calculado después del partido, sabiendo ya cómo jugó el rival. Si hubieras cambiado, su entrenador también habría cambiado.</p></div>
      <button class="btn sm block mt" data-act="review-talk" data-k="${k}">🎙️ Que me lo cuente el Profe</button></div>`;
  }
  UI.reviewCard = reviewCard;
  A['review-pick'] = el => {
    const card = el.closest('.review');
    const html = reviewCard(G.S, +el.dataset.k);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const nu = tmp.firstElementChild;
    card.replaceWith(nu);
    mountFaces(nu);
  };
  A['review-talk'] = el => {
    const S = G.S, r = (S.reviews || [])[+el.dataset.k || 0];
    if (!r || !TL.Mentor) return;
    const emo = { sys: 'thinking', chg: 'thinking', edge: 'thinking', day: 'neutral', luck: r.score[0] < r.score[1] ? 'worried' : 'neutral', hind: 'thinking' };
    TL.Mentor.say(TL.Coach.lines(S, r).map(l => ({ text: l.t, emo: emo[l.k] || 'neutral' })));
  };
  A['review-open'] = () => {
    const S = G.S;
    const sh = sheet(sheetHead('Repaso del partido') + reviewCard(S, 0) + '<button class="btn primary block mt" data-act="close-sheet">Cerrar</button>', { onClose: UI.onSheetClose });
    mountFaces(sh);
  };

  A['tac-form'] = el => {
    const S = G.S;
    const old = S.tactics.formation;
    const nf = el.dataset.f;
    if (old === nf) return;
    // Recoloca a los jugadores actuales en la nueva formación conservando sus puestos
    S.tactics.slots = E.remapLineup(W.squad(S, S.user), old, S.tactics.slots, nf);
    S.tactics.formation = nf;
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
    return pageTitle(esc(L.name), `${flagImg(L.flag, L.country)} ${esc(L.country)} · ${U.seasonLabel(S.season)}`) + seg + body;
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
  /** Historial de traspasos de la temporada (tu liga, tu club o todo el mundo). */
  function transferLog(S) {
    const f = UI.market.log || 'league';
    const L = W.userLeague(S);
    const inL = id => id >= 0 && S.clubs[id].league === L.id;
    let rows = (S.tlog || []).slice().reverse().filter(([, pid, a, b]) => S.players[pid] &&
      (f === 'all' ? true : f === 'mine' ? a === S.user || b === S.user : inL(a) || inL(b)));
    if (f === 'all') rows = rows.filter(r => r[4] > 0 || r[5] === 'loan').sort((x, y) => y[4] - x[4]);
    const tot = rows.reduce((s, r) => s + r[4], 0);
    const top = rows.filter(r => r[4] > 0).sort((x, y) => y[4] - x[4])[0];
    const club = id => (id >= 0 ? `${crest(S.clubs[id], 'xs')}<span class="tl-club">${esc(S.clubs[id].short || S.clubs[id].name)}</span>` : '<span class="tl-club muted">Libre</span>');
    const chips = [['league', esc(L.name)], ['mine', 'Tu club'], ['all', 'Mundo (los más caros)']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="tl-f" data-k="${k}">${l}</button>`).join('');
    return `<div class="chips" style="margin-bottom:10px">${chips}</div>
      ${top ? `<div class="kpis" style="margin-bottom:12px"><div class="kpi"><div class="k">Operaciones</div><div class="v">${rows.length}</div></div>
        <div class="kpi"><div class="k">Dinero movido</div><div class="v">${U.money(tot)}</div></div>
        <div class="kpi" style="grid-column:span 2"><div class="k">Fichaje más caro</div><div class="v small">${esc(S.players[top[1]].name)} · ${U.money(top[4])}</div></div></div>` : ''}
      <div class="card" style="padding:6px 10px">${rows.length ? rows.slice(0, 120).map(([w, pid, a, b, fee, kind]) => {
        const p = S.players[pid];
        return `<button class="tl-row ${a === S.user || b === S.user ? 'me' : ''}" data-act="player" data-id="${pid}">
          <span class="tl-w">J${w + 1}</span>${posB(p.pos)}<span class="tl-main"><b>${esc(p.name)}</b><span class="tl-move">${club(a)}<span class="tl-arrow">→</span>${club(b)}</span></span>
          <span class="tl-fee ${kind}">${kind === 'loan' ? 'Cesión' : fee ? U.money(fee) : 'Libre'}</span></button>`;
      }).join('') : '<div class="empty">Todavía no hay traspasos esta temporada.</div>'}</div>`;
  }
  A['tl-f'] = el => { UI.market.log = el.dataset.k; UI.refresh(); };

  VIEWS.market = S => {
    const open = M.windowOpen(S);
    const t = UI.market.tab;
    const c = S.clubs[S.user];
    const n = S.fixtures.length, mid = Math.floor(n / 2);
    const banner = `<div class="card" style="margin-bottom:12px;border-color:${open ? '#2f6b45' : 'var(--line)'}">
      <div class="row between wrap"><div><b style="color:${open ? 'var(--accent2)' : 'var(--warn)'}">${open ? '● Mercado abierto' : '● Mercado cerrado'}</b>
      <div class="note">${open ? (S.week <= 3 ? 'Cierra tras la jornada 3' : `Cierra tras la jornada ${mid + 2}`) : (S.week < mid ? `Reabre en la jornada ${mid}` : 'Reabre en verano')} · Los agentes libres se pueden fichar siempre.</div></div>
      <div class="num" style="text-align:right"><div style="font-size:20px;font-weight:700">${U.money(TL.Commerce.transferBudget(S))}</div><div class="note">para fichajes · salarios ${U.money(W.wageBill(S, S.user))} / ${U.money(c.wageBudget)}</div></div></div></div>`;
    const seg = `<div class="seg" style="margin-bottom:12px">${[['search', 'Buscar'], ['free', 'Libres'], ['mine', 'Mis ventas'], ['log', 'Historial']]
      .map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="mk-tab" data-k="${k}">${l}</button>`).join('')}</div>`;
    let body;
    if (t === 'log') body = transferLog(S);
    else if (t === 'mine') {
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
            <option value="cash" ${f.maxValue === 'cash' ? 'selected' : ''}>Lo que puedo pagar</option>
            ${[1e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8].map(v => Math.round(v * S.econ.value)).map(v => `<option value="${v}" ${+f.maxValue === v ? 'selected' : ''}>≤ ${U.money(v)}</option>`).join('')}</select>
          <select data-change="mf" data-k="league" style="flex:2 1 160px" aria-label="Liga"><option value="">Todas las ligas</option>
            ${L.map(l => `<option value="${l.id}" ${f.league !== '' && +f.league === l.id ? 'selected' : ''}>${esc(l.name)} (${esc(l.country)})</option>`).join('')}</select>` : ''}
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
      maxValue: UI.market.tab === 'search' ? (f.maxValue === 'cash' ? Math.max(1, S.clubs[S.user].cash / 1.25) : +f.maxValue || 0) : 0,
      league: UI.market.tab === 'search' ? f.league : '',
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
    const t = UI.clubTab || 'summary';
    const seg = `<div class="seg" style="margin-bottom:12px">${[['summary', 'Resumen'], ['commercial', 'Comercial'], ['manager', 'Mánager']]
      .map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="club-tab" data-k="${k}">${l}${k === 'manager' && S.mgr.points ? ' •' : ''}</button>`).join('')}</div>`;
    const body = t === 'commercial' ? clubCommercial(S) : t === 'manager' ? clubManager(S) : clubSummary(S);
    return pageTitle('Club', esc(S.manager) + ' · ' + esc(S.clubs[S.user].name)) + seg + body;
  };
  A['club-tab'] = el => { UI.clubTab = el.dataset.k; UI.refresh(); };

  function clubSummary(S) {
    const c = S.clubs[S.user];
    const bill = W.wageBill(S, S.user);
    const fin = S.fin;
    const inc = fin.tickets + fin.tv + fin.sponsors + fin.merch + fin.tour + fin.prizes + fin.sales + (fin.commercial || 0);
    const exp = fin.wages + fin.buys + fin.loans + fin.marketing + fin.fines + fin.other;
    const line = (k, v, cls) => `<tr><td class="l" style="text-align:left;width:auto">${k}</td><td class="${cls || ''}">${U.money(v)}</td></tr>`;
    const total = U.sum(W.squad(S, S.user), p => W.value(S, p));
    const debt = TL.Commerce.debt(S);
    const hist = S.history.length ? `<table class="table"><thead><tr><th class="l" style="text-align:left">Temp.</th><th class="l">Club</th><th>Pos</th><th class="hide-m l">Máx. goleador</th></tr></thead><tbody>
      ${S.history.map(h => `<tr><td class="l" style="text-align:left">${U.seasonLabel(h.season)}</td><td class="l ellipsis" style="max-width:140px">${esc(h.club)}</td>
        <td><b>${h.pos}º</b>/${h.n} ${h.moved === 'up' ? '<span class="pos-ok">↑</span>' : h.moved === 'down' ? '<span class="neg">↓</span>' : ''}</td><td class="hide-m l">${esc(h.top)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty">Tu primera temporada aún está en juego.</div>';
    const R = TL.News.risk(S);
    const pct = v => (v * 100 < 1 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%';
    const riskRows = R.rows.filter(r => r.tone === 'neg').sort((a, b) => b.p - a.p)
      .map(r => `<tr><td class="l" style="text-align:left;width:auto">${esc(TL.News.LABEL[r.id] || r.id)}</td><td>${pct(r.p)}</td></tr>`).join('');
    return `<div class="grid two">
      <section class="card span2"><div class="card-head"><h2>Finanzas</h2><span class="muted">Temporada ${U.seasonLabel(S.season)}</span></div>
        <div class="kpis"><div class="kpi"><div class="k">Saldo</div><div class="v ${c.cash < 0 ? 'neg' : ''}">${U.money(c.cash)}</div></div>
        <div class="kpi"><div class="k">Para fichajes</div><div class="v ${TL.Commerce.transferBudget(S) < 0 ? 'neg' : ''}">${U.money(TL.Commerce.transferBudget(S))}</div></div>
        <div class="kpi"><div class="k">Presup. salarial</div><div class="v">${U.money(c.wageBudget)}</div></div>
        <div class="kpi"><div class="k">Deuda</div><div class="v ${debt ? 'neg' : ''}">${U.money(debt)}</div></div></div>
        <div class="grid two mt">
          <table class="table"><thead><tr><th class="l" style="text-align:left">Ingresos</th><th></th></tr></thead><tbody>
            ${line('Taquilla', fin.tickets)}${line('Derechos de TV', fin.tv)}${line('Patrocinios', fin.sponsors)}${line('Merchandising', fin.merch)}
            ${fin.tour ? line('Gira de pretemporada', fin.tour) : ''}${line('Premios', fin.prizes)}${line('Ventas de jugadores', fin.sales)}
            <tr><td class="l" style="text-align:left"><b>Total</b></td><td><b>${U.money(inc)}</b></td></tr></tbody></table>
          <table class="table"><thead><tr><th class="l" style="text-align:left">Gastos</th><th></th></tr></thead><tbody>
            ${line('Salarios', fin.wages)}${line('Fichajes', fin.buys)}${line('Préstamos', fin.loans)}${line('Marketing', fin.marketing)}
            ${line('Multas', fin.fines)}${line('Rescisiones y obras', fin.other)}
            <tr><td class="l" style="text-align:left"><b>Balance</b></td><td class="${inc - exp < 0 ? 'neg' : 'pos-ok'}"><b>${U.money(inc - exp)}</b></td></tr></tbody></table>
        </div><p class="note mt">Valor de la plantilla: ${U.money(total)}. Gestiona patrocinios, marketing, entradas y préstamos en la pestaña Comercial.</p></section>
      ${budgetCard(S)}
      <section class="card"><div class="card-head"><h2>Estadio</h2><button class="link" data-act="rename-stadium">Renombrar</button></div>
        <div style="font-weight:700;font-size:17px">${esc(c.stadium)}</div>
        <div class="info mt"><div><div class="k">Aforo</div><div class="v">${U.num(c.capacity)}</div></div>
        <div><div class="k">Entrada media</div><div class="v">€${Math.round(c.price * S.com.ticketMult)}</div></div>
        <div><div class="k">Última asistencia</div><div class="v">${S.lastAttendance ? U.num(S.lastAttendance) : '—'}</div></div></div></section>
      <section class="card"><div class="card-head"><h2>Directiva</h2><span class="muted">${Math.round(S.board.conf)}%</span></div>
        <div style="font-weight:700;font-size:16px">${esc(S.board.text)}</div>
        <div class="bar mt ${S.board.conf < 30 ? 'bad' : S.board.conf < 50 ? 'warn' : ''}"><i style="width:${S.board.conf}%"></i></div>
        <p class="note mt">Si la confianza cae a cero, o por debajo del 15% al final de la temporada, serás destituido. Los escándalos, la deuda y las derrotas la erosionan.</p></section>
      <section class="card span2"><div class="card-head"><h2>Riesgo de polémicas esta temporada</h2><span class="muted">por club</span></div>
        <div class="kpis"><div class="kpi"><div class="k">Algún problema</div><div class="v">${pct(R.any)}</div></div>
        <div class="kpi"><div class="k">Escándalo grave</div><div class="v">${pct(R.anyGrave)}</div></div>
        <div class="kpi"><div class="k">Incidente de tu afición</div><div class="v">${pct(R.match.crowd)}</div></div>
        <div class="kpi"><div class="k">Racismo en grada</div><div class="v">${pct(R.match.racism)}</div></div></div>
        <details class="mt"><summary class="note" style="cursor:pointer">Ver todas las probabilidades (ajustadas por tus habilidades)</summary>
          <table class="table mt"><tbody>${riskRows}
          <tr><td class="l" style="text-align:left">Agresión entre jugadores en un partido</td><td>${pct(R.match.fight)}</td></tr>
          <tr><td class="l" style="text-align:left">Jugador que se encara con el árbitro</td><td>${pct(R.match.confront)}</td></tr>
          <tr><td class="l" style="text-align:left">Agresión al árbitro</td><td>${pct(R.match.refAssault)}</td></tr></tbody></table></details></section>
      <section class="card span2"><div class="card-head"><h2>Historial</h2></div>${hist}</section>
      <section class="card span2"><div class="card-head"><h2>Partida</h2></div>
        <div class="btn-grid"><button class="btn" data-act="save">💾 Guardar</button><button class="btn" data-act="export">📤 Exportar</button>
        <button class="btn" data-act="import">📥 Importar</button><button class="btn" data-act="tutorial">🧭 Ver tutorial</button>
        <button class="btn" data-act="school">🎓 Escuela del Profe</button>
        <button class="btn danger" data-act="quit">Nueva partida</button></div>
        <div class="title-toggles" style="justify-content:flex-start;margin-top:10px">
          <button data-act="opt-music">🎵 Música: <b>${Music.on() ? 'Sí' : 'No'}</b></button>
          <button data-act="opt-sfx">🔊 Sonido: <b>${TL.SFX.on() ? 'Sí' : 'No'}</b></button>
          <button data-act="opt-mentor">${profeIc()} Consejos del Profe: <b>${TL.Mentor.on() ? 'Sí' : 'No'}</b></button></div>
        <p class="note mt">La partida se guarda automáticamente en este navegador tras cada jornada. Datos de jugadores: ${esc(S.source)}.</p></section>
    </div>`;
  }

  /** Presupuestos: base de la directiva + ampliación salarial a costa de los fichajes. */
  function budgetCard(S) {
    const CM = TL.Commerce, c = S.clubs[S.user];
    const bill = W.wageBill(S, S.user);
    const base = CM.boardWageBudget(S), shift = S.wageShift || 0, total = CM.refreshBudget(S);
    const wl = CM.weeksLeft(S);
    const steps = [0.05, 0.1, 0.25].map(k => Math.round(Math.max(base, bill) * k / 1000) * 1000);
    return `<section class="card span2"><div class="card-head"><h2>Presupuestos</h2><span class="muted">${wl} semanas de temporada</span></div>
      <div class="row between"><span>Salarios actuales</span><b class="num">${U.money(bill)} / ${U.money(total)} por semana</b></div>
      <div class="bar ${bill > total ? 'bad' : bill > total * 0.95 ? 'warn' : ''}" style="margin:6px 0 10px"><i style="width:${Math.min(100, bill / Math.max(1, total) * 100)}%"></i></div>
      <div class="info">
        <div><div class="k">Base de la directiva</div><div class="v">${U.money(base)}/sem</div></div>
        <div><div class="k">Ampliación tuya</div><div class="v">${shift ? '+' + U.money(shift) + '/sem' : '—'}</div></div>
        <div><div class="k">Libre para fichajes</div><div class="v">${U.money(CM.transferBudget(S))}</div></div></div>
      <p class="note mt">La directiva calcula el presupuesto salarial con tus <b>ingresos recurrentes</b> (TV, patrocinios, merchandising y taquilla) más una parte de tus <b>ahorros</b>. Si ganas dinero, firmas patrocinios o vendes jugadores, sube. Si gastas en fichajes, baja.</p>
      <div class="group-title">Subir sueldos a costa del dinero de fichajes</div>
      <div class="btn-row">${steps.map(v => `<button class="btn sm" data-act="wage-shift" data-v="${shift + v}">+${U.money(v)}/sem</button>`).join('')}
        ${shift ? '<button class="btn sm ghost" data-act="wage-shift" data-v="0">Quitar ampliación</button>' : ''}</div>
      <p class="note">Cada ${U.money(steps[0])}/sem de ampliación reserva ${U.money(steps[0] * wl)} del dinero de fichajes hasta final de temporada.</p></section>`;
  }
  A['wage-shift'] = el => {
    const r = TL.Commerce.setWageShift(G.S, +el.dataset.v);
    toast(r.msg, !r.ok);
    if (r.ok) { TL.SFX.coin(); G.save(); }
    UI.refresh();
  };

  // ------------------------------------------------------------ Comercial
  function clubCommercial(S) {
    const CM = TL.Commerce, com = S.com, c = S.clubs[S.user];
    const est = CM.estimate(S);
    const slots = Object.entries(CM.SLOTS).map(([slot, def]) => {
      const cur = CM.sponsor(S, slot);
      if (cur) {
        return `<div class="spon"><div class="row between"><b>${esc(def.name)}</b><span class="tag ${cur.style === 'risky' ? 'exp' : 'new'}">Hasta ${cur.until}</span></div>
          <div class="row" style="margin-top:4px"><span class="grow"><b>${esc(cur.brand)}</b> <span class="note">· ${esc(CM.SECTOR_NAME[cur.sector])}</span></span>
          <span class="num">${U.money(cur.weekly)}/sem${cur.winBonus ? ` + ${U.money(cur.winBonus)}/victoria` : ''}</span></div></div>`;
      }
      const offers = com.offers[slot] || [];
      return `<div class="spon open"><div class="row between"><b>${esc(def.name)}</b><span class="tag exp">Libre</span></div>
        ${offers.map((o, i) => `<div class="offer"><div class="grow"><b>${esc(o.brand)}</b> <span class="note">· ${esc(CM.SECTOR_NAME[o.sector])}${o.style === 'risky' ? ' · ⚠️ riesgo de impago' : o.style === 'perf' ? ' · por objetivos' : ' · estable'}</span>
          <div class="note">${U.money(o.weekly)}/sem${o.winBonus ? ` + ${U.money(o.winBonus)} por victoria` : ''} · hasta ${o.until}</div></div>
          <button class="btn sm primary" data-act="sponsor" data-slot="${slot}" data-i="${i}">Firmar</button></div>`).join('')}</div>`;
    }).join('');
    const camps = CM.CAMPAIGNS.map(k => {
      const active = com.campaigns.find(x => x.id === k.id);
      const disabled = active || (k.preseason && (S.week > 0 || com.tour === S.season));
      const cost = k.preseason ? 'Ingreso' : U.money(CM.campaignCost(S, k));
      return `<div class="offer"><div class="grow"><b>${esc(k.name)}</b><div class="note">${esc(k.desc)}</div>
        ${active ? `<div class="note ok">En marcha · ${active.weeksLeft} semanas</div>` : ''}</div>
        <button class="btn sm" data-act="campaign" data-id="${k.id}" ${disabled ? 'disabled' : ''}>${k.preseason ? 'Hacer gira' : 'Lanzar · ' + cost}</button></div>`;
    }).join('');
    const tm = Math.round(com.ticketMult * 100);
    const debt = CM.debt(S), maxD = CM.maxDebt(S);
    UI.loan = UI.loan || { pct: 0.25, seasons: 2 };
    const amount = F.roundMoney(Math.max(0, maxD - debt) * UI.loan.pct);
    const q = amount > 0 ? CM.loanQuote(S, amount, UI.loan.seasons) : null;
    const loans = com.loans.map(l => `<div class="offer"><div class="grow"><b>Préstamo de ${U.money(l.principal)}</b>
      <div class="note">${(l.rate * 100).toFixed(1)}% · pendiente ${U.money(l.balance)} · ${U.money(l.weekly)}/sem · ${l.weeksLeft} semanas</div></div>
      <button class="btn sm" data-act="repay" data-id="${l.id}">Cancelar</button></div>`).join('');
    const exp = CM.expansionOptions(S);
    return `<div class="grid two">
      <section class="card span2"><div class="card-head"><h2>Afición e ingresos</h2><span class="muted">estimación semanal</span></div>
        <div class="kpis"><div class="kpi"><div class="k">Aficionados</div><div class="v">${U.num(com.fans)}</div></div>
        <div class="kpi"><div class="k">TV</div><div class="v">${U.money(est.tv)}</div></div>
        <div class="kpi"><div class="k">Patrocinios</div><div class="v">${U.money(est.spons)}</div></div>
        <div class="kpi"><div class="k">Merchandising</div><div class="v">${U.money(est.merch)}</div></div></div>
        <p class="note mt">La afición crece con las victorias, los fichajes estrella y el marketing, y cae con las derrotas, las entradas caras y los escándalos. Más afición = más taquilla y merchandising.</p></section>
      <section class="card span2"><div class="card-head"><h2>Patrocinios</h2></div>${slots}
        <p class="note mt">Las ofertas arriesgadas (criptomonedas, apuestas, moda rápida) pagan más pero pueden quebrar y molestan a parte de la afición. Las casas de apuestas no pueden patrocinar en España ni en Italia.</p></section>
      <section class="card"><div class="card-head"><h2>Precio de las entradas</h2><b class="num">${tm}%</b></div>
        <input type="range" min="50" max="200" step="5" value="${tm}" data-change="ticket" aria-label="Precio de las entradas">
        <p class="note">Entrada media: €${Math.round(c.price * com.ticketMult)} (base €${c.price}). Más caro = más ingresos por espectador pero menos asistencia${tm > 130 ? '; la afición empieza a protestar' : ''}.</p></section>
      <section class="card"><div class="card-head"><h2>Préstamos</h2><span class="muted">Deuda ${U.money(debt)} / ${U.money(maxD)}</span></div>
        ${loans || '<p class="note">Sin préstamos activos.</p>'}
        <div class="row wrap mt" style="gap:8px">
          <select data-change="loan" data-k="pct" style="flex:1 1 140px" aria-label="Importe">${[0.1, 0.25, 0.5, 1].map(v =>
            `<option value="${v}" ${UI.loan.pct === v ? 'selected' : ''}>${U.money(F.roundMoney(Math.max(0, maxD - debt) * v))}</option>`).join('')}</select>
          <select data-change="loan" data-k="seasons" style="flex:1 1 120px" aria-label="Plazo">${[1, 2, 3, 5].map(v =>
            `<option value="${v}" ${UI.loan.seasons === v ? 'selected' : ''}>${v} temporada${v > 1 ? 's' : ''}</option>`).join('')}</select></div>
        ${q ? `<p class="note">Interés ${(q.rate * 100).toFixed(1)}% anual · cuota ${U.money(q.weekly)}/sem · total a devolver ${U.money(q.total)}</p>
          <button class="btn sm primary" data-act="loan-take">Solicitar préstamo</button>` : '<p class="note bad">Has alcanzado el límite de endeudamiento.</p>'}</section>
      <section class="card span2"><div class="card-head"><h2>Marketing</h2></div>${camps}</section>
      <section class="card span2"><div class="card-head"><h2>Ampliar el estadio</h2><span class="muted">${U.num(c.capacity)} localidades</span></div>
        ${com.expansion ? `<p class="note ok">Obras en marcha: +${U.num(com.expansion.seats)} localidades, faltan ${com.expansion.weeksLeft} semanas.</p>` :
          exp.map((o, i) => `<div class="offer"><div class="grow"><b>+${U.num(o.seats)} localidades</b><div class="note">${o.weeks} semanas de obras</div></div>
          <button class="btn sm" data-act="expand" data-i="${i}">${U.money(o.cost)}</button></div>`).join('') || '<p class="note">El estadio ya está en su capacidad máxima.</p>'}</section>
    </div>`;
  }
  A.sponsor = el => {
    const r = TL.Commerce.signSponsor(G.S, el.dataset.slot, +el.dataset.i);
    toast(r.msg, !r.ok);
    if (r.ok) { TL.FX.coins(el); TL.SFX.coin(); }
    G.save(); UI.refresh();
  };
  A.campaign = el => {
    const r = TL.Commerce.launch(G.S, el.dataset.id);
    toast(r.msg, !r.ok);
    if (r.ok) { TL.FX.coins(el); TL.SFX.coin(); }
    G.save(); UI.refresh();
  };
  A.repay = el => { const r = TL.Commerce.repayLoan(G.S, +el.dataset.id); toast(r.msg, !r.ok); G.save(); UI.refresh(); };
  A.expand = el => {
    const o = TL.Commerce.expansionOptions(G.S)[+el.dataset.i];
    confirmBox('Ampliar estadio', `¿Invertir ${U.money(o.cost)} en ${U.num(o.seats)} nuevas localidades?`, 'Iniciar obras', () => {
      const r = TL.Commerce.expand(G.S, +el.dataset.i); toast(r.msg, !r.ok); G.save(); UI.refresh();
    });
  };
  A['loan-take'] = () => {
    const S = G.S, CM = TL.Commerce;
    const amount = F.roundMoney(Math.max(0, CM.maxDebt(S) - CM.debt(S)) * UI.loan.pct);
    const q = CM.loanQuote(S, amount, UI.loan.seasons);
    confirmBox('Pedir préstamo', `Recibirás ${U.money(amount)} y pagarás ${U.money(q.weekly)} cada semana durante ${q.weeks} semanas (total ${U.money(q.total)}).`, 'Firmar', () => {
      const r = CM.takeLoan(S, amount, UI.loan.seasons); toast(r.msg, !r.ok); G.save(); UI.refresh();
    });
  };
  C.loan = el => { UI.loan[el.dataset.k] = +el.value; UI.refresh(); };
  C.ticket = el => { G.S.com.ticketMult = +el.value / 100; G.save(); UI.refresh(); };

  // ------------------------------------------------------------ Mánager
  function clubManager(S) {
    const MG = TL.Manager, m = S.mgr;
    const need = MG.xpToNext(m.level);
    const tree = MG.TREE.map(br => `<section class="card branch"><div class="card-head"><h2>${br.icon} ${esc(br.name)}</h2></div>
      ${br.nodes.map((n, i) => {
        const l = MG.lvl(S, n.id), can = MG.can(S, n.id);
        const pips = Array.from({ length: n.max }, (_, k) => `<i class="${k < l ? 'on' : ''}"></i>`).join('');
        return `<div class="skill ${l ? 'has' : ''} ${!can.ok && !l && can.reason !== 'Sin puntos de habilidad' ? 'locked' : ''}">
          <div class="row between"><b>${i + 1}. ${esc(n.name)}</b><span class="pips">${pips}</span></div>
          <div class="note">${esc(n.desc)}</div>
          <div class="row between" style="margin-top:6px"><span class="faint" style="font-size:12px">${can.ok ? '' : esc(can.reason)}</span>
          <button class="btn sm ${can.ok ? 'primary' : ''}" data-act="skill" data-id="${n.id}" ${can.ok ? '' : 'disabled'}>${l ? 'Mejorar' : 'Aprender'}</button></div></div>`;
      }).join('')}</section>`).join('');
    return `<section class="card" style="margin-bottom:12px"><div class="row">
        <div class="mgr-badge num">${m.level}</div>
        <div class="grow"><div style="font-family:var(--font-c);font-weight:800;font-size:22px">${esc(S.manager)}</div>
        <div class="note">Nivel ${m.level} · ${m.xp}/${need} XP · ${m.points} punto${m.points === 1 ? '' : 's'} disponible${m.points === 1 ? '' : 's'}</div>
        <div class="bar" style="margin-top:6px"><i style="width:${m.xp / need * 100}%"></i></div></div></div>
        <p class="note mt">Ganas experiencia con cada partido (más con victorias y contra rivales mejores) y al cumplir objetivos, ganar títulos o ascender.</p></section>
      <div class="grid two three">${tree}</div>`;
  }
  A.skill = el => {
    const r = TL.Manager.buy(G.S, el.dataset.id);
    toast(r.msg || r.reason, !r.ok);
    if (r.ok) { TL.FX.sparkle(el); TL.SFX.levelUp(); }
    G.save(); UI.refresh();
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
      <div><div class="k">Forma física</div><div class="v">${p.fit}%</div></div>
      <div><div class="k">Moral</div><div class="v">${TL.News.moraleLabel(p.mor)[1]} ${TL.News.moraleLabel(p.mor)[0]}</div></div>
      <div><div class="k">Faltas temporada</div><div class="v">${st ? st[7] || 0 : 0}</div></div>
      <div><div class="k">Ciclo amarillas</div><div class="v">${st ? st[4] % 5 : 0}/5</div></div></div>`;
    const pnews = S.news.filter(n => n.pid === p.id).slice(0, 4);
    const newsBox = pnews.length ? `<div class="group-title">En la prensa</div>${pnews.map(n => newsHtml(S, { ...n, pid: -1 })).join('')}` : '';
    let actions = '';
    const loan = TL.Locker.loanOf(S, p.id);
    if (loan && loan.from === S.user) {
      actions = `<div class="nego"><p class="note">Cedido por ti al <b>${esc(S.clubs[loan.to].name)}</b> hasta final de temporada. Vuelve en verano.</p>
        ${M.windowOpen(S) ? `<button class="btn sm" data-act="loan-recall" data-id="${p.id}">Repescarle ahora</button>` : ''}</div>`;
    } else if (mine) actions = ownActions(S, p);
    else if (!retired) actions = transferPanel(S, p);
    if (mine || (loan && loan.from === S.user)) actions = lockerSection(S, p) + actions;
    const sh = sheet(head + `<div class="stats6">${stats6}</div>` + info + season + actions + newsBox, { keepScroll: UI.nego && UI.nego.pid === id });
    if (UI.nego && UI.nego.pid === id && UI.nego.focus) {
      UI.nego.focus = false;
      const box = sh.querySelector('.nego');
      if (box) { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); box.classList.add('flash-in'); }
    }
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
            `<option value="${y}" ${n.years === y ? 'selected' : ''}>Hasta ${M.renewEnd(S, y)} (+${y} temporada${y > 1 ? 's' : ''})</option>`).join('')}</select>
          <button class="btn primary" data-act="renew-ok" data-id="${p.id}">Firmar</button></div>
          ${n.msg ? `<p class="note ${n.ok ? 'ok' : 'bad'}">${esc(n.msg)}</p>` : ''}</div>`;
      }
    }
    const loan = TL.Locker.loanOf(S, p.id);
    if (loan && loan.to === S.user) return `<div class="nego mt"><p class="note">Llega cedido por el <b>${esc(S.clubs[loan.from].name)}</b> hasta final de temporada. No se puede vender ni renovar.</p></div>`;
    return `<div class="btn-grid mt">
      <button class="btn sm" data-act="renew" data-id="${p.id}">Renovar</button>
      ${open ? `<button class="btn sm" data-act="loan-out" data-id="${p.id}">Ceder</button>` : ''}
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
        ${TL.Locker.loanable(S, p).ok ? `<button class="btn block mt" data-act="loan-in" data-id="${p.id}">🔁 Pedirlo cedido · pagas su ficha (${U.money(p.wage)}/sem)</button>` : ''}
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
      TL.FX.confetti(); TL.SFX.success(); setTimeout(() => TL.SFX.coin(), 200);
    } else { n.msg = r.msg; n.ok = false; openPlayer(p.id); }
  };
  A.renew = el => {
    const p = G.S.players[+el.dataset.id];
    UI.nego = { pid: p.id, stage: 'renew', years: Math.min(3, M.maxYears(p)), focus: true };
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
  function jobsHtml(S, jobs, fired) {
    if (!jobs || !jobs.length) return fired ? '<p class="note mt">Ningún club te ha llamado todavía.</p>' : '';
    return `<div class="group-title">${fired ? 'Clubes interesados en ti' : 'Ofertas de trabajo'}</div>
      ${jobs.map(j => {
        const c = S.clubs[j.club];
        return `<div class="offer job">${crest(c)}<div class="grow"><b>${esc(c.name)}</b>
          <div class="note">${esc(j.league)} · nivel ${c.rep.toFixed(1)} ${stars(c.rep)} · ${esc(j.expect)}</div>
          <div class="note">Saldo del club ${U.money(c.cash)}</div></div>
          <button class="btn sm primary" data-act="job-accept" data-id="${c.id}">Aceptar</button></div>`;
      }).join('')}
      ${fired ? '' : '<p class="note">Si no aceptas ninguna, sigues en tu club.</p>'}`;
  }
  A['job-accept'] = el => {
    const S = G.S, c = S.clubs[+el.dataset.id];
    const run = () => {
      const r = TL.Career.accept(S, c.id);
      toast(r.msg);
      if (S.over) { UI.seasonSum = null; closeSheet(); SE.newSeason(S); }
      G.save();
      UI.tab = 'home';
      renderShell(); render();
      TL.FX.confetti(); TL.SFX.levelUp();
    };
    if (G.S.fired) run();
    else confirmBox('Cambiar de club', `¿Dejar ${esc(S.clubs[S.user].name)} y fichar por ${esc(c.name)}? Conservas tu nivel y habilidades.`, 'Fichar', run);
  };

  A['season-end'] = () => {
    const S = G.S;
    if (!S.over) return;
    if (S.endDone && !UI.seasonSum) {
      // Temporada ya cerrada (p. ej. tras recargar): pasar directamente a la siguiente
      if (!S.fired) { SE.newSeason(S); G.save(); }
      render(); return;
    }
    const fresh = !S.endDone;
    const sum = fresh ? SE.endSeason(S) : UI.seasonSum;
    UI.seasonSum = sum;
    const champ = S.clubs[sum.champion];
    const ok = sum.pos <= sum.target;
    if (fresh && (ok || sum.moved === 'up')) setTimeout(() => { TL.FX.confetti({ palette: sum.pos === 1 ? 'gold' : undefined }); TL.SFX.levelUp(); }, 300);
    if (fresh && !sum.fired) setTimeout(() => TL.Mentor.event(S, 'seasonEnd', sum), 900);
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
        <div><div class="k">Experiencia</div><div class="v">+${sum.xp || 0} XP · nivel ${S.mgr.level}</div></div>
        <div><div class="k">Pichichi</div><div class="v">${sum.topScorer ? esc(sum.topScorer[0]) + ' (' + sum.topScorer[1] + ')' : '—'}</div></div>
        <div><div class="k">Tu goleador</div><div class="v">${sum.myTop ? esc(sum.myTop[0]) + ' (' + sum.myTop[1] + ')' : '—'}</div></div>
      </div>
      ${sum.left.length ? `<p class="note mt">Se van libres (fin de contrato): ${esc(sum.left.join(', '))}.</p>` : ''}
      ${sum.retired.length ? `<p class="note mt">Se retiran: ${esc(sum.retired.join(', '))}.</p>` : ''}
      ${youth.length ? `<div class="group-title">Llegan de la cantera</div>${youth.map(p => playerRow(S, p, { act: 'noop', sub: `${p.age} años · potencial ${Math.max(p.ovr, p.pot - 3)}–${Math.min(95, p.pot + 3)}` })).join('')}` : ''}
      ${sum.lastChance ? '<p class="note bad mt">La directiva está muy descontenta, pero te da una última oportunidad. Otra temporada así y estarás fuera.</p>' : ''}
      ${sum.fired ? '<p class="note bad mt">La directiva ha decidido prescindir de ti.</p>' : ''}
      <p class="note mt">Reputación de mánager: ${S.mgr.rep} (${sum.repDelta >= 0 ? '+' : ''}${Math.round(sum.repDelta)}).</p>
      ${jobsHtml(S, sum.jobs, sum.fired)}
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
    const fk = 'fired:' + S.season + ':' + S.week;
    const ms = TL.Mentor.state(S);
    if (!ms.seen[fk]) { ms.seen[fk] = true; setTimeout(() => TL.Mentor.event(S, 'fired'), 700); }
    const pendingEnd = S.over && !S.endDone;
    app().innerHTML = `<div class="title-screen"><div class="logo"><h1>DESTI<span>TUIDO</span></h1>
      <p>${esc(S.clubs[S.user].name)} prescinde de ti</p></div>
      <div class="card" style="max-width:460px;width:100%"><p class="muted" style="margin:0">La directiva ha perdido la confianza en tu proyecto.
        ${S.history.length ? `Temporadas dirigidas: ${S.history.length}.` : ''} Reputación de mánager: ${TL.Career.rep(S)}.</p>
        ${pendingEnd ? '<p class="note mt">Cierra la temporada para ver qué clubes te llaman.</p>' : jobsHtml(S, S.jobOffers, true)}</div>
      <div class="title-actions">
        ${pendingEnd ? '<button class="btn primary" data-act="season-end">Cerrar la temporada</button>' : ''}
        <button class="btn ${pendingEnd || (S.jobOffers && S.jobOffers.length) ? 'ghost' : 'primary'}" data-act="fired-new">Empezar una partida nueva</button></div></div>`;
  }
  A['fired-new'] = () => { G.wipe(); renderTitle(); };

  // ------------------------------------------------------------ Portada
  function renderTitle() {
    const meta = G.meta();
    app().innerHTML = `<div class="title-screen">
      <div class="title-ball" aria-hidden="true">⚽</div>
      <div class="logo"><h1>TOUCH<span>LINE</span></h1><p>Football Manager</p></div>
      <div class="title-actions">
        ${meta ? `<button class="btn primary continue-card" data-act="continue"><div class="t">▶ Continuar</div>
          <div class="s">${esc(meta.club)} · ${U.seasonLabel(meta.season)} · Jornada ${meta.week + 1} · ${esc(meta.manager)}</div></button>` : ''}
        <button class="btn ${meta ? '' : 'primary'}" data-act="new-game">Nueva partida</button>
        <button class="btn ghost" data-act="import">Importar partida</button>
      </div>
      <div class="title-toggles">
        <button data-act="title-music">🎵 Música: <b>${Music.on() ? 'Sí' : 'No'}</b></button>
        <button data-act="title-sfx">🔊 Sonido: <b>${TL.SFX.on() ? 'Sí' : 'No'}</b></button>
      </div>
      <p class="credits">Datos de jugadores basados en el dataset EA SPORTS FC 27 (EA_FC_ANALYSIS). Escudos: luukhopman/football-logos (marcas de sus clubes). Música: “Strategic Swing”. · v${TL.VERSION || '3'}</p>
    </div>`;
  }
  A['title-music'] = () => { Music.toggle(); renderTitle(); };
  A['title-sfx'] = () => { TL.SFX.setOn(!TL.SFX.on()); TL.SFX.toggle(TL.SFX.on()); renderTitle(); };
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
          return `<button class="pick" data-act="wz-league" data-l="${l.i}"><span class="flag">${flagImg(l.flag, l.country) || '🌎'}</span>
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
    Music.start();
    app().innerHTML = '<div class="title-screen"><div class="spinner"></div><p class="muted">Creando el mundo…</p></div>';
    setTimeout(() => {
      G.newGame(z.data, z.club, name);
      UI.wz = null;
      UI.tab = 'home';
      renderShell(); render();
      TL.FX.confetti(); TL.SFX.success();
      setTimeout(() => TL.Tutorial.start('main'), 700);
    }, 30);
  };

  // ------------------------------------------------------------ Jugar jornada
  /** Avisa si el once tenía jugadores no disponibles (se sustituyen automáticamente). */
  function lineupWarning(S) {
    const before = (S.tactics.slots || []).slice();
    const l = E.userLineup(S);
    const out = l.changed.map(i => before[i]).filter(id => id >= 0).map(id => S.players[id].short);
    if (out.length) toast(`No disponibles: ${out.join(', ')}. Se sustituyen en el once.`, true);
  }
  UI.lineupWarning = lineupWarning;

  A['play-quick'] = () => {
    const S = G.S;
    if (S.over) return;
    lineupWarning(S);
    TL.SFX.whistle(false);
    G.completeRound(null);
    const m = S.fixtures[S.week - 1].find(m => m[0] === S.user || m[1] === S.user) || null;
    showRoundResults(S, S.week - 1, m);
  };

  /** Celebraciones pendientes (subida de nivel del mánager). */
  function celebrate(S) {
    if (S._newOffers) {
      const n = S._newOffers; S._newOffers = 0;
      setTimeout(() => { toast(`📩 ${n} oferta${n > 1 ? 's' : ''} por tus jugadores · Mercado → Mis ventas`); TL.SFX.coin(); }, 900);
    }
    if (S._levelUp) {
      S._levelUp = 0;
      setTimeout(() => { TL.FX.confetti({ palette: 'gold' }); TL.SFX.levelUp(); toast(`¡Nivel ${S.mgr.level} de mánager! Tienes puntos de habilidad.`); }, 400);
    }
    setTimeout(() => { if (TL.Mentor) TL.Mentor.check(S); }, 1400);
  }
  UI.celebrate = celebrate;

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
    const rv = my && S.reviews && S.reviews[0] && S.reviews[0].w === r && S.reviews[0].s === S.season;
    sheet(sheetHead(`Jornada ${r + 1}`) + head + `<div class="card" style="padding:6px 10px">${S.fixtures[r].map(m => fixtureHtml(S, m)).join('')}</div>
      <div class="btn-row mt">${rv ? `<button class="btn" data-act="review-open">${profeIc()} Repaso del Profe</button>` : ''}<button class="btn primary" data-act="close-sheet">Continuar</button></div>`, { onClose: () => { render(false); celebrate(S); } });
    mountFaces(document.querySelector('.sheet'));
    if (my) {
      const res = resultLetter(S, my);
      setTimeout(() => {
        if (res === 'V') { TL.FX.confetti({ palette: 'green' }); TL.SFX.goal(true); }
        else if (res === 'D') TL.SFX.groan();
        else TL.SFX.chance();
      }, 150);
    }
  }
  UI.showRoundResults = showRoundResults;

  // ------------------------------------------------------------ Eventos globales
  /** Sonido de cada botón según su tipo (los diálogos del Profe ya tienen su voz). */
  function buttonSound(el) {
    const S_ = TL.SFX, act = el.dataset.act;
    if (!S_ || /^(tab|vn-|tut-)/.test(act)) return;
    if (act === 'close-sheet' || el.classList.contains('icon-btn') && /close|back/.test(act + el.getAttribute('aria-label'))) S_.back();
    else if (el.classList.contains('primary')) { S_.press(); if (navigator.vibrate && S_.on()) try { navigator.vibrate(8); } catch (e) { /* nada */ } }
    else if (el.matches('.chip, .seg button, [role="tab"]')) S_.select();
    else S_.click();
  }
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    buttonSound(el);
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
  document.addEventListener('change', ev => {
    if (ev.target.matches('input[type="checkbox"]') && TL.SFX) TL.SFX.toggle(ev.target.checked);
    if (!ev.target.matches('input[type="search"], input[type="text"]')) onChange(ev);
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && document.querySelector('.sheet-back')) closeSheet();
  });

  Object.assign(UI, {
    icon, crest, posB, ovrB, fitB, flag, playerRow, toast, sheet, closeSheet, sheetHead, confirmBox,
    renderShell, renderTop, fixtureHtml, resultLetter, MENT, flagImg, newsHtml
  });
  TL.UI = UI;
})();
