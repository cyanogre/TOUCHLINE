/* TOUCHLINE — Panel de control del mánager («TOUCHLINE//OS»).
 *
 * Una pestaña aparte con todo lo que importa para no perder el puesto: directiva, afición, vestuario, prensa,
 * resultados, tu muletilla y tu carrera. Va vestida de centro de mando ridículamente avanzado (núcleo cuántico,
 * satélites, IAs que consultan el tarot) para que destaque, en broma, sobre el resto de menús. */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, World: W, UI } = TL;
  const esc = U.esc;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const tr = x => (TL.t ? TL.t(x) : x);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TICK = [
    'Analizando 4.000 millones de memes por segundo…', 'Triangulando el humor del presidente vía satélite…',
    'Detectado: el rival suda frío. Fuente: un sensor en su botellín.', 'Recalibrando el aura del vestuario…',
    'Escaneando grupos de WhatsApp de la peña… 37 audios pendientes.', 'Huella de carbono del autobús compensada con 3 abrazos.',
    'La IA ha visto 9.000 partidos. Sigue sin entender el fuera de juego.', 'Consultando a 3 IAs y una vidente de Albacete…',
    'Optimizando la ruta del utillero con algoritmos cuánticos.', 'Probabilidad de lluvia en la rueda de prensa: alta. Llevar paraguas.',
    'Minando confianza de la directiva… bloque 4.812 validado.', 'Sincronizando con 14 satélites y un dron de la Feria.',
    'El modelo predice que alguien del vestuario está viendo Netflix ahora mismo.', 'Calculando el ratio de bocadillos por punto…'
  ];

  // ------------------------------------------------------------ Métricas
  function form(S) {
    const h = (S.hud || []).filter(x => x.s === S.season).slice(-5);
    return h.reduce((t, x) => t + (x.gf > x.ga ? 2 : x.gf < x.ga ? -2 : 0), 0);
  }
  function fansOpinion(S) {
    if (!S.com) return 50;
    const g = S.com.fans / (S.com.fans0 || S.com.fans) - 1;
    return Math.round(clamp(52 + g * 300 + form(S) * 3, 0, 100));
  }
  function squadMood(S) {
    const sq = W.squad(S, S.user);
    if (!sq.length) return 50;
    return Math.round(clamp(sq.reduce((t, p) => t + (p.mor == null ? 70 : p.mor), 0) / sq.length, 0, 100));
  }
  const press = S => S.prensaStats || { n: 0, wins: 0, bestStreak: 0, twists: 0, twistOk: 0, rep: 50, skipped: 0 };

  const word = v => tr(word0(v));
  const word0 = v => v >= 85 ? 'Nivel dios' : v >= 70 ? 'On fire' : v >= 55 ? 'Bien' : v >= 40 ? 'Regulinchi' : v >= 25 ? 'Tenso' : 'Alarma roja';
  const chair = c => c >= 75 ? ['Congelada', 'Ni con un soplete te mueven.'] : c >= 55 ? ['Templada', 'Puedes ir al cine tranquilo.']
    : c >= 35 ? ['Calentita', 'El presidente ya ha guardado el número de otro.'] : c >= 18 ? ['Ardiendo', 'Hay un mánager en paro mirando vuelos.'] : ['Fundida', 'Ve dejando el despacho recogido.'];

  // ------------------------------------------------------------ Piezas
  function ring(v, label, sub, hue) {
    const r = 34, C = 2 * Math.PI * r, off = C * (1 - v / 100);
    return `<div class="hud-gauge" style="--h:${hue}">
      <svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" style="stroke-dasharray:${C.toFixed(1)};--off:${off.toFixed(1)}"/>
      <circle cx="42" cy="42" r="${r - 8}" class="in"/></svg>
      <div class="hud-g-v"><b data-count="${v}">0</b><small>%</small></div>
      <div class="hud-g-l">${esc(label)}</div><div class="hud-g-s">${esc(sub)}</div></div>`;
  }
  function spark(vals, hue, label) {
    if (vals.length < 2) return `<div class="hud-spark empty"><span>${esc(label)}</span><i>Sin datos suficientes. La IA está aburrida.</i></div>`;
    const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
    const pts = vals.map((v, k) => `${(k / (vals.length - 1) * 100).toFixed(1)},${(28 - (v - lo) / span * 24).toFixed(1)}`).join(' ');
    const d = vals[vals.length - 1] - vals[0];
    return `<div class="hud-spark" style="--h:${hue}"><span>${esc(label)}</span><em class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'}</em>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}"/></svg></div>`;
  }
  const bar = (v, hue) => `<div class="hud-bar" style="--h:${hue}"><i style="--w:${clamp(v, 0, 100)}%"></i></div>`;
  const panel = (title, code, body, cls) => `<section class="hud-card ${cls || ''}"><header><span>${esc(title)}</span><code>${esc(code)}</code></header>${body}</section>`;

  // ------------------------------------------------------------ Historial de entrenador
  const ENDW = { fired: ['Destituido', 'bad'], left: ['Se marchó', 'mid'] };
  function story(S) {
    const l = TL.Career ? TL.Career.cv(S) : [];
    const bits = [];
    l.forEach((x, k) => {
      const pj = x.g + x.e + x.p;
      if (k === 0) bits.push(tr(`Empezó en ${x.name}`));
      else bits.push(tr(x.firedBefore ? `volvió a ${x.name}, el club que le echó` : `fichó por ${x.name}`));
      if (x.titles) bits.push(tr(x.titles === 1 ? 'ganó una liga' : `ganó ${x.titles} ligas`));
      if (x.revenge.length) bits.push(tr('se vengó de su antiguo club'));
      if (x.redeemed) bits.push(tr('y se redimió'));
      if (x.end === 'fired') bits.push(tr(pj === 1 ? 'le echaron tras 1 partido' : `le echaron tras ${pj} partidos`));
    });
    const t = bits.join(', ');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) + '.' : '';
  }
  function cvHtml(S) {
    const l = TL.Career ? TL.Career.cv(S) : [];
    const rows = l.slice().reverse().map(x => {
      const [ew, ec] = x.end ? ENDW[x.end] : ['Actual', 'now'];
      const tag = x.redeemed ? '<em class="cv-tag red">Redención</em>' : x.firedBefore ? '<em class="cv-tag ret">Vuelta</em>' : '';
      const best = x.seasons.length ? Math.min(...x.seasons.map(z => z.pos)) : null;
      return `<div class="cv-row"><div class="cv-h"><b>${esc(x.name)}</b>${tag}<span class="cv-end ${ec}">${ew}</span></div>
        <div class="cv-d">${x.from[0]}/${String(x.from[0] + 1).slice(2)} J${x.from[1]} → ${x.to ? `${x.to[0]}/${String(x.to[0] + 1).slice(2)} J${x.to[1]}` : tr('hoy')} · ${x.g}G ${x.e}E ${x.p}P${best ? ` · mejor puesto ${best}º` : ''}${x.titles ? ` · 🏆×${x.titles}` : ''}${x.revenge.length ? ` · venganzas ${x.revenge.length}` : ''}</div></div>`;
    }).join('');
    const bio = TL.Persona ? TL.Persona.bioList(S) : [];
    const bioH = bio.length ? `<div class="bio"><div class="group-title">Biografía no autorizada <small>por Aurelio Garrido</small></div><ol>${bio.map(b => (b.cap ? `<li class="cap"><span>Temporada ${b.s}/${String(b.s + 1).slice(2)} · capítulo</span>«${esc(b.t)}»</li>` : `<li><span>${b.s}/${String(b.s + 1).slice(2)} · J${b.w}</span>${esc(b.t)}</li>`)).join('')}</ol></div>` : '';
    return `<div class="cv"><div class="group-title">Historial de entrenador</div>${rows}<p class="cv-story">${esc(story(S))}</p>${bioH}</div>`;
  }

  // ------------------------------------------------------------ IA copiloto: lo útil, dicho con guasa
  function copilot(S) {
    const sq = W.squad(S, S.user), out = [];
    const sad = sq.filter(p => (p.mor == null ? 70 : p.mor) < 40);
    const inj = sq.filter(p => p.inj > 0);
    const tired = sq.filter(p => p.fit < 70 && !(p.inj > 0));
    const conf = S.board.conf, cash = S.clubs[S.user].cash;
    if (conf < 35) out.push(['🔥', `La directiva está más mosca que un portero en una tanda. Gana el próximo o ve actualizando el LinkedIn.`, 'league', 'Ver liga']);
    if (sad.length) out.push(['😤', `${sad.length > 1 ? `${sad.length} jugadores están` : '1 jugador está'} de morros (${sad.slice(0, 3).map(p => p.short).join(', ')}). Recomendación de la IA: charla, minutos o barbacoa. La IA prefiere barbacoa.`, 'squad', 'Vestuario']);
    if (inj.length) out.push(['🩹', `${inj.length} en la enfermería. La IA ha calculado que con un fisio mejor volverían antes. La IA también cobra comisión.`, 'club', 'Personal']);
    if (tired.length >= 3) out.push(['🥵', `${tired.length} jugadores con las piernas de gelatina. Rota antes de que se rompan.`, 'tactics', 'Tácticas']);
    if (cash < 0) out.push(['💸', 'Números rojos. La IA sugiere vender a alguien o empezar un OnlyFans del club. Lo primero es más legal.', 'market', 'Mercado']);
    const nx = TL.Intel ? TL.Intel.next(S) : null;
    if (nx) { const o = S.clubs[nx.opp]; out.push(['🎯', `Próximo rival: ${o.name}. Mira su informe aquí abajo: la IA ya ha escaneado a sus once.`, 'tactics', 'Preparar']); }
    if (S.prensaStats && S.prensaStats.rep < 40) out.push(['🎙️', 'Tu imagen en prensa está regular. Practica frases con gancho, o no digas nada (también funciona).', null, null]);
    if (!out.length) out.push(['😎', 'Todo en orden. La IA se va a tomar un café. Vuelve en 5 minutos.', null, null]);
    return out.slice(0, 5).map(([ic, t, tab, lb]) => `<div class="hud-cop"><span>${ic}</span><p>${esc(t)}</p>${tab ? `<button class="hud-go" data-act="tab" data-tab="${tab}">${esc(lb)} ›</button>` : ''}</div>`).join('');
  }

  // ------------------------------------------------------------ Presentación (y de dónde sale todo esto)
  const LORE = [
    '¿Que de dónde ha salido este centro de mando? Buena pregunta.',
    'Lo montó el cuñado del presidente, que «sabe de ordenadores», en el antiguo cuarto de la lavadora del estadio.',
    'Lo pagaron con el presupuesto de las equipaciones de 2019. Por eso aquel año jugasteis con camisetas de mercadillo.',
    'Funciona con un router de 2009, la nevera del utillero (refrigeración líquida, dice él) y tres IAs con la prueba gratuita caducada.',
    'Nadie sabe apagarlo. Una vez lo intentaron y se fue la luz en medio barrio.',
    'Desde hoy, es tuyo. Trátalo bien: es lo único del club que no pide renovar.'
  ];
  function intro(first) {
    const el = document.createElement('div');
    el.className = 'hud-intro';
    const boot = ['Inicializando TOUCHLINE//OS…', 'Despertando a las 3 IAs (una protesta)…', 'Calibrando el tarot con datos de la liga…', 'Descongelando la nevera del utillero…', 'Comprobando que nadie ha desenchufado el router…'];
    el.innerHTML = `<div class="hud-intro-in">${first ? `<div class="hud-lore">${LORE.map((l, k) => `<p style="--d:${k * 1.1}s">${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="hud-bootlog" style="--d0:${first ? LORE.length * 1.1 : 0}s">${boot.map((l, k) => `<p style="--d:${k * 0.28}s">&gt; ${esc(l)} <b>OK</b></p>`).join('')}</div>
      <div class="hud-grant" style="--d0:${(first ? LORE.length * 1.1 : 0) + boot.length * 0.28 + 0.2}s">ACCESO CONCEDIDO</div>
      <button class="hud-skip">${first ? 'Saltar historia' : 'Saltar'}</button></div>`;
    document.body.appendChild(el);
    const done = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.querySelector('.hud-skip').onclick = done;
    setTimeout(done, ((first ? LORE.length * 1.1 : 0) + boot.length * 0.28 + 1.4) * 1000);
  }
  let introShown = false;

  // ------------------------------------------------------------ Datos para el radar
  function finance(S) {
    const h = ((S.hist && S.hist.cash) || []).slice(-9), cash = S.clubs[S.user].cash;
    const d = h.slice(1).map((x, i) => x[2] - h[i][2]);
    const avg = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
    const weeks = avg < 0 ? Math.max(0, Math.floor(cash / -avg)) : Infinity;
    const v = cash < 0 ? 5 : weeks === Infinity ? 92 : clamp(Math.round(weeks * 2.5), 5, 90);
    return { v, weeks, avg, cash, word: cash < 0 ? 'En números rojos' : weeks === Infinity ? 'Ganando dinero' : weeks > 30 ? 'Holgada' : weeks > 12 ? `${weeks} semanas` : `¡Solo ${weeks} semanas!` };
  }
  function axes(S) {
    const conf = Math.round(S.board.conf), fan = fansOpinion(S), mood = squadMood(S), rep = Math.round(press(S).rep);
    const fo = clamp(50 + form(S) * 5, 0, 100), fi = finance(S).v;
    const h = S.hud || [], pv = h.length >= 2 ? h[h.length - 2] : null;
    const fan0 = pv && S.com ? clamp(Math.round(52 + ((pv.fans / (S.com.fans0 || pv.fans)) - 1) * 300 + form(S) * 3), 0, 100) : fan;
    const sad = W.squad(S, S.user).filter(p => (p.mor == null ? 70 : p.mor) < 40).length;
    return [
      { k: 'Directiva', v: conf, p: pv ? Math.round(pv.conf) : conf, tab: 'league', alert: conf < 35 },
      { k: 'Afición', v: fan, p: fan0, tab: 'club', alert: fan < 35 },
      { k: 'Vestuario', v: mood, p: pv ? pv.mor : mood, tab: 'squad', alert: mood < 45 || sad >= 3 },
      { k: 'Prensa', v: rep, p: rep, tab: 'stats', alert: rep < 40 },
      { k: 'Forma', v: fo, p: fo, tab: 'league', alert: fo < 35 },
      { k: 'Finanzas', v: fi, p: fi, tab: 'club', alert: fi < 25 }
    ];
  }

  // ------------------------------------------------------------ Inteligencia del rival (js/intel.js)
  const IN = () => TL.Intel;
  const fitHue = f => (f >= 88 ? 140 : f >= 78 ? 75 : f >= 70 ? 38 : 0);
  function intelCard(S) {
    const r = IN() && IN().report(S);
    if (!r) return panel('Informe del rival', 'SCAN.EXE', '<p class="hud-note">No hay partido a la vista. Los satélites descansan.</p>', 'span2');
    const lines = r.lines.slice(1).map(L => `<div class="hud-line"><span>${esc(L.name)}</span>${bar(L.fit, fitHue(L.fit))}<b class="w${L.fit < 76 ? ' bad' : L.fit < 84 ? ' mid' : ''}">${esc(L.word)}</b></div>`).join('');
    const out = r.out.length ? `<div class="hud-out">${r.out.slice(0, 5).map(o => `<span>${o.why === 'lesionado' ? '🩹' : '🟥'} ${esc(o.short)}</span>`).join('')}</div>` : '';
    return panel(`Informe · ${r.club.short || r.club.name}`, r.exact ? 'SCAN.EXE · DRON' : 'SCAN.EXE', `
      <div class="hud-scan"><canvas class="hud-pitch"></canvas></div>
      <div class="hud-scan-tag">${[r.home ? 'En casa' : 'Fuera', esc(r.label), r.pos ? r.pos + 'º en liga' : ''].filter(Boolean).join(' · ')} · ${esc(r.formation)}${r.exact ? ' <b>EXACTO</b>' : ' <i>probable</i>'}</div>
      ${lines}${out}
      <ul class="hud-say">${r.say.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${r.form.length ? `<div class="hud-form">${r.form.map(f => `<i class="${f}">${f}</i>`).join('')}<small>su forma</small></div>` : ''}`, 'span2 intel');
  }
  function planCard(S) {
    const ps = IN() && IN().planState(S);
    if (!ps) return '';
    const MENT = IN().MENT;
    const rows = ps.recs.map(rc => {
      const c = rc.chk || {};
      const fix = rc.ok ? '' : c.ment ? `<button class="hud-go" data-act="hud-ment" data-m="${c.ment[c.ment.length - 1]}">Aplicar</button>`
        : c.form ? `<button class="hud-go" data-act="hud-form" data-f="${esc(c.form[0])}">Usar ${esc(c.form[0])}</button>` : `<button class="hud-go" data-act="tab" data-tab="tactics">Tácticas ›</button>`;
      return `<div class="hud-rec ${rc.ok ? 'ok' : ''}"><i>${rc.ok ? '✔' : '◌'}</i><div><b>${esc(rc.t)}</b><small>${esc(rc.why)}</small></div>${fix}</div>`;
    }).join('');
    return panel('Plan de partido', 'TACTIC.AI', `${rows}
      <div class="hud-adv a${ps.all ? 3 : ps.n >= 2 ? 2 : ps.n}"><span>Si sales así:</span><b>${esc(ps.word)}</b></div>
      <p class="hud-note">Tu mentalidad ahora: ${esc(MENT[S.tactics.mentality])} · dibujo ${esc(S.tactics.formation)}. Lo que cumplas al empezar el partido da un empujón al equipo.</p>`, 'span2 plan');
  }
  function opsCard(S) {
    if (!IN() || !IN().fantasy(S)) return '';
    const done = IN().doneOp(S), offs = IN().offers(S);
    if (!offs.length) return '';
    const res = S.intel && S.intel.opMsg && done ? `<p class="hud-opres ${done.caught ? 'bad' : ''}">${esc(S.intel.opMsg)}</p>` : '';
    return panel('Operaciones especiales', 'BLACK.OPS', `<p class="hud-note warn">Clasificado. Una por partido. Si te pillan, lo pagas caro.</p>
      <div class="hud-ops">${offs.map(o => { const used = done && done.id === o.id, cost = IN().costOf(S, o);
        return `<div class="hud-op ${used ? 'used' : ''} ${done && !used ? 'off' : ''}"><div class="hud-op-ic">${o.ic}</div><div class="grow"><b>${esc(o.n)}</b><small>${esc(o.d.replace('{rival}', (IN().report(S) || { club: { name: 'el rival' } }).club.name))}</small>
          <div class="hud-op-m"><span>Coste: ${cost ? U.money(cost) : o.board ? 'confianza' : 'gratis'}</span><span class="r r${Math.min(4, Math.floor((o.risk || 0) / 0.1))}">Riesgo: ${esc(IN().riskWord(o.risk || 0))}</span></div></div>
          ${done ? (used ? '<em>HECHO</em>' : '') : `<button class="hud-go red" data-act="hud-op" data-id="${o.id}">Ejecutar</button>`}</div>`; }).join('')}</div>${res}`, 'span2 ops');
  }
  // ------------------------------------------------------------ Radar de rumores
  const RCAT = { fichajes: ['💸', 'Fichajes'], mercado: ['💸', 'Mercado'], rumor: ['👂', 'Rumor'], polemica: ['🔥', 'Polémica'], sucesos: ['🚨', 'Sucesos'], ocio: ['🍸', 'Noche'],
    aficion: ['📣', 'Afición'], redes: ['📱', 'Redes'], vestuario: ['🚪', 'Vestuario'], tribunales: ['⚖️', 'Tribunales'], dopaje: ['💉', 'Dopaje'], arbitraje: ['🟨', 'Árbitros'], club: ['🏛️', 'Club'], positivo: ['✨', 'Buenas'] };
  const SCANDAL = ['polemica', 'sucesos', 'ocio', 'redes', 'vestuario', 'tribunales', 'dopaje'];
  function rumors(S, f) {
    const nm = IN() && IN().next(S), T = TL.Season.table(S), pos = {};
    T.forEach((r, i) => { pos[r.id] = i; });
    const me = pos[S.user];
    return (S.news || []).filter(n => n.club >= 0 && n.club !== S.user && RCAT[n.cat] && S.season - n.s <= 1).filter(n => {
      if (f === 'rival') return nm && n.club === nm.opp;
      if (f === 'directos') return pos[n.club] != null && Math.abs(pos[n.club] - me) <= 3;
      if (f === 'fichajes') return ['fichajes', 'mercado', 'rumor'].includes(n.cat);
      if (f === 'escandalos') return SCANDAL.includes(n.cat);
      return true;
    }).slice(0, 8);
  }
  const trust = n => { const h = (n.id * 2654435761) % 100; return n.cat === 'fichajes' || n.cat === 'club' ? ['Confirmado', 'ok'] : h < 35 ? ['Fiable', 'ok'] : h < 75 ? ['Dudoso', 'mid'] : ['Huele a bulo', 'bad']; };
  function rumorCard(S) {
    const f = UI.hudRf || 'todo', list = rumors(S, f);
    const chips = [['todo', 'Todo'], ['rival', 'Próximo rival'], ['directos', 'Rivales directos'], ['fichajes', 'Fichajes'], ['escandalos', 'Escándalos']]
      .map(([k, l]) => `<button class="hud-chip ${f === k ? 'on' : ''}" data-act="hud-rf" data-f="${k}">${l}</button>`).join('');
    const rows = list.map((n, i) => { const [ic, cl] = RCAT[n.cat], [tw, tc] = trust(n), c = S.clubs[n.club];
      return `<div class="hud-rum" style="--d:${i * 0.12}s"><span class="ic">${ic}</span><div class="grow"><small>${esc(c ? c.short || c.name : '')} · ${esc(cl)} · J${n.w}</small><b>${esc(n.title)}</b></div><em class="${tc}">${esc(tw)}</em></div>`; }).join('');
    return panel('Radar de rumores', 'SIGINT.LIVE', `<div class="hud-rumradar"><canvas class="hud-rr" data-h="120"></canvas></div><div class="hud-chips">${chips}</div>
      ${rows || '<p class="hud-note">Silencio en las ondas. O los rivales son muy discretos, o la antena está floja.</p>'}`, 'span2 rum');
  }
  function financeCard(S) {
    const F = finance(S), h = ((S.hist && S.hist.cash) || []).map(x => x[2]);
    return panel('Finanzas', 'TREASURY.SYS', `${spark(h.slice(-20), 160, 'Saldo')}
      <div class="hud-row"><span>Saldo</span><b>${U.money(F.cash)}</b></div>
      <div class="hud-row"><span>Autonomía<small>al ritmo de las últimas jornadas</small></span><b class="${F.v < 25 ? 'neg' : ''}">${esc(F.word)}</b></div>`);
  }

  // ------------------------------------------------------------ Vista
  function view(S) {
    const conf = Math.round(S.board.conf), fan = fansOpinion(S), mood = squadMood(S), ps = press(S);
    const aura = Math.round((conf + fan + mood + ps.rep) / 4 + Math.min(10, (S.mule && S.mule.fame) || 0));
    const [ch, chTxt] = chair(conf);
    const fire = clamp(Math.round(100 - conf * 1.15), 1, 99);
    const L = TL.Season && TL.Season.table ? TL.Season.table(S) : [];
    const pos = L.findIndex(r => r.id === S.user), me = L[pos];
    const h = S.hud || [];
    const m = S.mgr || { level: 1, xp: 0 }, need = TL.Manager ? TL.Manager.xpToNext(m.level) : 100;
    const mu = S.mule && TL.Prensa && TL.Prensa.MULES.find(x => x.id === S.mule.id);
    const steps = TL.Prensa ? TL.Prensa.STEPS : [];
    const nextStep = mu ? steps.find(st => !(S.mule.got || []).includes(st.id)) : null;
    const AX = axes(S);
    const nick = TL.Persona && TL.Persona.nickname ? TL.Persona.nickname(S) : null;

    const head = `<button class="hud-back" data-act="tab" data-tab="home">‹ Inicio</button><div class="hud-top">
      <div class="hud-logo" data-g="TOUCHLINE//OS">TOUCHLINE<span>//OS</span></div>
      <div class="hud-sys"><span class="dot"></span>NÚCLEO CUÁNTICO 9.3 · 14 SAT · PING 0,0003 ms</div>
      <div class="hud-boot"><p>&gt; Usuario: <b>${esc(S.manager)}</b>${nick ? ` «${esc(nick)}»` : ''} · ${esc(S.clubs[S.user].name)} · T${S.season} J${S.week}</p><p class="hud-tick">&gt; ${esc(tr(pick(TICK)))}</p></div>
    </div>`;

    const holo = `<section class="hud-holo"><canvas class="hud-radar"></canvas>
      <div class="hud-holo-c"><b data-count="${aura}">0</b><small>AURA</small></div>
      <div class="hud-axes">${AX.map((a, i) => `<button class="hud-ax ${a.alert ? 'alert' : ''}" data-act="tab" data-tab="${a.tab}" style="--i:${i}"><span>${esc(a.k)}</span><b>${esc(word(a.v))}</b><em class="${a.v > a.p ? 'up' : a.v < a.p ? 'dn' : ''}">${a.v > a.p ? '▲' : a.v < a.p ? '▼' : '•'}</em></button>`).join('')}</div></section>`;

    const gauges = `<div class="hud-gauges">
      ${ring(conf, 'Directiva', word(conf), 190)}${ring(fan, 'Afición', word(fan), 140)}
      ${ring(mood, 'Vestuario', word(mood), 45)}${ring(ps.rep, 'Prensa', word(ps.rep), 300)}</div>`;

    const silla = panel('Temperatura de la silla', 'SILLA.TEMP', `<div class="hud-chair c${conf >= 55 ? 0 : conf >= 35 ? 1 : 2}"><b>${esc(ch)}</b><span>${esc(chTxt)}</span></div>
      <div class="hud-row"><span>Riesgo de despido<small>calculado por 3 IAs y un tarot</small></span><b>${esc(fire >= 70 ? 'Altísimo' : fire >= 45 ? 'Alto' : fire >= 25 ? 'Moderado' : 'Bajo')}</b></div>${bar(fire, 0)}
      <div class="hud-row"><span>Objetivo</span><b>${esc((S.board && S.board.text) || '—')}</b></div>`);

    const liga = panel('Competición', 'LIGA.LIVE', me ? `<div class="hud-big"><b>${pos + 1}º</b><span>/ ${L.length}</span></div>
      <div class="hud-grid4"><div><b>${me.g}</b><small>Victorias</small></div><div><b>${me.e}</b><small>Empates</small></div><div><b>${me.p}</b><small>Derrotas</small></div><div><b>${me.pts}</b><small>Puntos</small></div></div>
      <div class="hud-row"><span>Goles</span><b>${me.gf} · ${me.gc}</b></div>
      <div class="hud-form">${me.form.slice(-8).map(f => `<i class="${f}">${f}</i>`).join('') || '<i>—</i>'}</div>` : '<p class="hud-note">Torneo en curso. La IA está mirando el cuadro.</p>');

    const trend = panel('Tendencias', 'TREND.AI', `${spark(h.map(x => x.conf), 190, 'Directiva')}${spark(h.map(x => x.fans), 140, 'Socios')}${spark(h.map(x => x.mor), 45, 'Vestuario')}
      <div class="hud-row"><span>Socios ahora</span><b>${S.com ? S.com.fans.toLocaleString('es-ES') : '—'}</b></div>`, 'span2');

    const prensa = panel('Sala de prensa', 'PRESS.LOG', `<div class="hud-grid4"><div><b>${ps.n}</b><small>Ruedas</small></div><div><b>${ps.wins}</b><small>Redondas</small></div><div><b>${ps.bestStreak}</b><small>Mejor racha</small></div><div><b>${ps.skipped}</b><small>Plantadas</small></div></div>
      <div class="hud-row"><span>Titulares retorcidos</span><b>${ps.twists}</b></div>
      <div class="hud-row"><span>…que no colaron</span><b>${ps.twistOk}</b></div>
      <p class="hud-note">${ps.twists - ps.twistOk > 0 ? (ps.twists - ps.twistOk > 1 ? `Hay ${ps.twists - ps.twistOk} titulares tuyos circulando por ahí. La IA recomienda no leer los comentarios.` : 'Hay 1 titular tuyo circulando por ahí. La IA recomienda no leer los comentarios.') : 'Tu reputación digital está limpia. De momento.'}</p>`);

    const mule = panel('Muletilla', 'CATCHPHRASE.SYS', mu ? `<p class="hud-mule">«${esc(mu.t)}»</p>
      <div class="hud-row"><span>Fama</span><b>${esc(word(Math.min(100, (S.mule.fame || 0) / 15 * 100)))}</b></div>${bar(nextStep ? (S.mule.fame / nextStep.at) * 100 : 100, 50)}
      <ul class="hud-unl">${steps.map(st => `<li class="${(S.mule.got || []).includes(st.id) ? 'on' : ''}">${(S.mule.got || []).includes(st.id) ? '✓' : '🔒'} ${esc({ viral: 'Viral', shirts: 'Camisetas', ad: 'Anuncio de TV', chant: 'Cántico de la grada' }[st.id])}</li>`).join('')}</ul>
      ${S.mule.memed ? '<p class="hud-note warn">Estado: meme nacional. Se pasará. O no.</p>' : ''}`
      : '<p class="hud-note">Aún no tienes frase propia. Suéltala en una rueda de prensa y la IA se encargará de hacerla viral (o no).</p>');

    const car = panel('Tu carrera', 'COACH.CORE', `<div class="hud-big"><b>${tr(`Nv ${m.level}`)}</b><span>${esc(S.manager)}</span></div>
      <div class="hud-row"><span>Experiencia</span><b>${Math.round(m.xp)} / ${need}</b></div>${bar(m.xp / need * 100, 260)}
      <div class="hud-row"><span>Habilidades aprendidas</span><b>${Object.values(m.skills || {}).reduce((a, b) => a + b, 0)}</b></div>
      <div class="hud-row"><span>Temporadas</span><b>${(S.history || []).length + 1}</b></div>`);

    const cop = panel('IA copiloto', 'COPILOT.AI', copilot(S), 'span2');
    const cvp = panel('Expediente', 'CV.BLOCKCHAIN', cvHtml(S) + '<p class="hud-note">Registrado en 7 blockchains distintas. Nadie podrá borrarte la vergüenza ni la gloria.</p>', 'span2');
    return `<div class="hud"><canvas class="hud-bg"></canvas>${head}${holo}${gauges}<div class="hud-cards">${intelCard(S)}${planCard(S)}${opsCard(S)}${rumorCard(S)}${cop}${silla}${liga}${financeCard(S)}${trend}${prensa}${mule}${car}${cvp}</div>
      <p class="hud-foot">TOUCHLINE//OS no se hace responsable de despidos, memes ni bocadillos. Datos actualizados hace 0,0001 s.</p></div>`;
  }

  // ------------------------------------------------------------ Animación (un solo bucle; se para al salir del panel)
  const reduced = () => UI.reduced || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function fitCanvas(cv, hgt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || cv.parentNode.clientWidth || 300, h = hgt || cv.clientHeight || w;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h };
  }
  function animate(S, root) {
    const radar = root.querySelector('.hud-radar'), bg = root.querySelector('.hud-bg'), pitch = root.querySelector('.hud-pitch'), rr = root.querySelector('.hud-rr');
    const AX = axes(S), rep = IN() ? IN().report(S) : null;
    const R = radar ? fitCanvas(radar, Math.min(300, radar.clientWidth || 300)) : null;
    const hc = root.querySelector('.hud-holo-c');
    if (hc && R) { hc.style.height = R.h + 'px'; hc.style.top = radar.offsetTop + 'px'; }
    // El fondo, a resolución baja (se estira con CSS): es solo ambiente
    const B = bg ? (() => { const w = root.clientWidth, h = Math.min(2600, root.scrollHeight); bg.width = w; bg.height = h; const c = bg.getContext('2d'); return { c, w, h }; })() : null;
    const PT = pitch ? fitCanvas(pitch, 170) : null;
    const RR = rr ? fitCanvas(rr, 120) : null;
    // Partículas de datos que caen
    const parts = B ? Array.from({ length: 46 }, () => ({ x: Math.random() * B.w, y: Math.random() * B.h, v: 12 + Math.random() * 40, s: Math.random() < 0.2 ? 2 : 1, ch: Math.random() < 0.5 ? '1' : '0' })) : [];
    // Rumores: un punto por club de la liga; parpadean los que tienen señales recientes
    const T = TL.Season.table(S), hot = new Set((S.news || []).filter(n => n.club >= 0 && n.club !== S.user && S.season === n.s && S.week - n.w <= 2).map(n => n.club));
    const dots = T.map((r, i) => ({ id: r.id, a: i / T.length * 6.283 + 0.4, d: 0.25 + 0.7 * (i / Math.max(1, T.length - 1)), hot: hot.has(r.id), opp: rep && rep.opp === r.id, me: r.id === S.user }));
    const t0 = performance.now();
    const ease = k => 1 - Math.pow(1 - Math.min(1, k), 3);
    function frame(now) {
      if (!document.body.contains(root)) return;
      const t = (now - t0) / 1000, grow = ease(t / 1.1);
      if (B) {
        const c = B.c; c.clearRect(0, 0, B.w, B.h); c.font = '10px ui-monospace, monospace';
        for (const p of parts) { p.y += p.v / 60; if (p.y > B.h) { p.y = -10; p.x = Math.random() * B.w; } c.fillStyle = `rgba(62,240,255,${0.07 + p.s * 0.05})`; c.fillText(p.ch, p.x, p.y); }
      }
      if (R) {
        const c = R.c, w = R.w, h = R.h, cx = w / 2, cy = h / 2, rad = Math.min(w, h) * 0.38, n = AX.length;
        c.clearRect(0, 0, w, h);
        const pt = (i, v) => { const a = -Math.PI / 2 + i / n * 6.283; return [cx + Math.cos(a) * rad * v, cy + Math.sin(a) * rad * v]; };
        // Anillos y ejes
        for (let k = 1; k <= 4; k++) { c.strokeStyle = `rgba(62,240,255,${0.08 + k * 0.03})`; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i % n, k / 4); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
        c.save(); c.translate(cx, cy); c.rotate(t * 0.25); c.setLineDash([2, 6]); c.strokeStyle = 'rgba(62,240,255,.35)'; c.beginPath(); c.arc(0, 0, rad * 1.12, 0, 6.283); c.stroke(); c.rotate(-t * 0.6); c.setLineDash([12, 10]); c.beginPath(); c.arc(0, 0, rad * 1.2, 0, 6.283); c.stroke(); c.restore();
        for (let i = 0; i < n; i++) { const [x, y] = pt(i, 1.02); c.strokeStyle = 'rgba(62,240,255,.18)'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); }
        // Barrido con estela
        const sa = t * 1.6 % 6.283 - Math.PI / 2;
        for (let k = 0; k < 18; k++) { c.fillStyle = `rgba(62,240,255,${0.10 * (1 - k / 18)})`; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, rad * 1.05, sa - (k + 1) * 0.035, sa - k * 0.035); c.closePath(); c.fill(); }
        // Polígono fantasma (jornada anterior) y el actual
        const poly = (vals, fill, stroke, lw) => { c.beginPath(); vals.forEach((v, i) => { const [x, y] = pt(i, v); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); };
        poly(AX.map(a => a.p / 100 * grow), null, 'rgba(255,255,255,.25)', 1);
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(184,245,61,.10)'); g.addColorStop(1, 'rgba(62,240,255,.32)');
        c.shadowColor = '#3ef0ff'; c.shadowBlur = 12; poly(AX.map(a => Math.max(0.04, a.v / 100) * grow), g, '#3ef0ff', 2); c.shadowBlur = 0;
        // Vértices y alertas
        AX.forEach((a, i) => {
          const [x, y] = pt(i, Math.max(0.04, a.v / 100) * grow);
          const hit = Math.abs(((sa + Math.PI / 2 - i / n * 6.283) % 6.283 + 6.283) % 6.283) < 0.25;
          c.fillStyle = a.alert ? '#ff4d6d' : '#b8f53d'; c.beginPath(); c.arc(x, y, a.alert ? 4 + Math.sin(t * 8) * 1.5 : hit ? 4.5 : 3, 0, 6.283); c.fill();
          if (a.alert) { c.strokeStyle = `rgba(255,77,109,${0.6 - (t * 1.5 % 1) * 0.6})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6 + (t * 1.5 % 1) * 16, 0, 6.283); c.stroke(); }
          const [lx, ly] = pt(i, 1.22); c.fillStyle = a.alert ? '#ff8fa3' : 'rgba(215,249,255,.85)'; c.font = '700 10px Barlow Condensed, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(a.k.toUpperCase(), lx, ly);
        });
      }
      if (PT && rep) {
        // Mini campo del rival: sus jugadores por líneas, de color según el cansancio, con un barrido láser
        const c = PT.c, w = PT.w, h = PT.h; c.clearRect(0, 0, w, h);
        c.strokeStyle = 'rgba(62,240,255,.35)'; c.lineWidth = 1; c.strokeRect(6, 6, w - 12, h - 12); c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w / 2, h - 6); c.stroke();
        c.beginPath(); c.arc(w / 2, h / 2, h * 0.16, 0, 6.283); c.stroke(); c.strokeRect(6, h * 0.3, w * 0.1, h * 0.4); c.strokeRect(w - 6 - w * 0.1, h * 0.3, w * 0.1, h * 0.4);
        const xs = [0.08, 0.27, 0.5, 0.74];
        rep.lines.forEach(L => L.ps.forEach((p, k) => {
          const x = 6 + (w - 12) * xs[L.l] + (L.l === 3 ? 0 : 0), y = 6 + (h - 12) * ((k + 1) / (L.ps.length + 1));
          const col = `hsl(${fitHue(p.fit)} 90% 55%)`;
          c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, 5, 0, 6.283); c.fill(); c.shadowBlur = 0;
          if (grow > 0.9) { c.fillStyle = 'rgba(215,249,255,.75)'; c.font = '9px ui-monospace, monospace'; c.textAlign = 'center'; c.fillText(p.short.slice(0, 9), x, y - 9); }
        }));
        const sx = 6 + ((t * 0.45) % 1) * (w - 12);
        const lg = c.createLinearGradient(sx - 30, 0, sx, 0); lg.addColorStop(0, 'rgba(62,240,255,0)'); lg.addColorStop(1, 'rgba(62,240,255,.35)'); c.fillStyle = lg; c.fillRect(sx - 30, 6, 30, h - 12);
        c.fillStyle = '#3ef0ff'; c.fillRect(sx, 6, 1.5, h - 12);
      }
      if (RR) {
        const c = RR.c, w = RR.w, h = RR.h, cx = w / 2, cy = h / 2, rad = h * 0.45; c.clearRect(0, 0, w, h);
        for (let k = 1; k <= 3; k++) { c.strokeStyle = 'rgba(62,240,255,.18)'; c.beginPath(); c.arc(cx, cy, rad * k / 3, 0, 6.283); c.stroke(); }
        const sa = t * 2 % 6.283; c.strokeStyle = 'rgba(62,240,255,.7)'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); c.stroke();
        for (const d of dots) {
          const x = cx + Math.cos(d.a) * rad * d.d, y = cy + Math.sin(d.a) * rad * d.d;
          const since = ((sa - d.a) % 6.283 + 6.283) % 6.283, flash = Math.max(0, 1 - since / 1.2);
          c.fillStyle = d.me ? '#b8f53d' : d.opp ? '#ffd23f' : d.hot ? `rgba(255,77,109,${0.35 + flash * 0.65})` : `rgba(62,240,255,${0.25 + flash * 0.5})`;
          c.beginPath(); c.arc(x, y, d.me || d.opp ? 4 : d.hot ? 3.2 : 2.2, 0, 6.283); c.fill();
          if (d.opp) { c.strokeStyle = 'rgba(255,210,63,.8)'; c.beginPath(); c.arc(x, y, 7 + Math.sin(t * 4) * 1.5, 0, 6.283); c.stroke(); }
        }
      }
      if (!reduced()) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ La cortinilla del radar (como la de los partidos)
  let wipeSty = null;
  function stinger(S, done) {
    const STY = ['diag', 'iris', 'pixels', 'chevron'];
    let st = STY[Math.floor(Math.random() * STY.length)]; if (st === wipeSty) st = STY[(STY.indexOf(st) + 1) % STY.length]; wipeSty = st;
    const cv = document.createElement('canvas'); cv.className = 'hud-wipe'; document.body.appendChild(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W0 = window.innerWidth, H0 = window.innerHeight;
    cv.width = W0 * dpr; cv.height = H0 * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [c1, c2] = U.clubColors(S.clubs[S.user].name), cols = [c1, '#050c14', c2, '#3ef0ff'];
    if (TL.SFX) { try { if (TL.SFX.rec) TL.SFX.rec('cortinilla', TL.SFX.swoosh); if (TL.SFX.sample) setTimeout(() => TL.SFX.sample('cortinilla-voz', { maxWait: 400 }), 180); } catch (e) { /* sin sonido */ } }
    const t0 = performance.now(), DUR = 1.45, seed = Math.random();
    let over = false;
    const end = () => { if (over) return; over = true; cv.remove(); if (done) done(); };
    cv.addEventListener('pointerdown', end);
    const ease = k => k * k * (3 - 2 * k);
    function frame(now) {
      if (over) return;
      const age = (now - t0) / 1000;
      if (age > DUR) return end();
      const W = W0, H = H0;
      c.clearRect(0, 0, W, H);
      const inK = Math.min(1, age / 0.16), outK = age < 0.85 ? 0 : Math.min(1, (age - 0.85) / 0.55), cover = ease(inK) * (1 - ease(outK));
      if (st === 'diag') {
        const n = 7, bw = (W + H) / n, slant = H * 0.6;
        for (let k = 0; k < n + 2; k++) { const o = ease(Math.max(0, Math.min(1, outK * 1.4 - k * 0.04))); const x0 = -slant + k * bw - (1 - ease(inK)) * (W + slant) + o * (W + slant + bw);
          c.fillStyle = cols[k % 4]; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + bw + 1, 0); c.lineTo(x0 + bw + 1 - slant, H); c.lineTo(x0 - slant, H); c.closePath(); c.fill(); }
      } else if (st === 'iris') {
        const R0 = Math.hypot(W, H) / 2, r = R0 * (1 - cover);
        c.fillStyle = cols[1]; c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2, Math.max(0, r), 0, 6.283, true); c.fill();
        c.strokeStyle = cols[0]; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r) + 4, 0, 6.283); c.stroke();
        c.strokeStyle = cols[3]; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r) + 11, 0, 6.283); c.stroke();
      } else if (st === 'pixels') {
        const Bk = Math.max(12, Math.round(Math.min(W, H) / 14));
        for (let y = 0; y < H; y += Bk) for (let x = 0; x < W; x += Bk) { const hh = Math.sin((x / Bk) * 12.9898 + (y / Bk) * 78.233 + seed * 43) * 43758.5453; const r = hh - Math.floor(hh);
          if (r < cover) { c.fillStyle = cols[((x / Bk) + (y / Bk)) % 4 | 0]; c.fillRect(x, y, Bk + 1, Bk + 1); } }
      } else {
        const n = 6, bw = W / 3;
        c.fillStyle = `rgba(5,12,20,${Math.min(1, cover * 1.15).toFixed(3)})`; c.fillRect(0, 0, W, H);
        for (let k = 0; k < n; k++) { const x0 = -bw * 1.5 + (W + bw * 3) * cover - k * bw * 0.55 + (outK > 0 ? outK * W * 1.6 : 0);
          c.fillStyle = cols[k % 4]; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + bw * 0.55, H / 2); c.lineTo(x0, H); c.lineTo(x0 - bw * 0.6, H); c.lineTo(x0 - bw * 0.05, H / 2); c.lineTo(x0 - bw * 0.6, 0); c.closePath(); c.fill(); }
      }
      // Logo del radar mientras está tapado: anillos, barrido, el balón de píxeles y TOUCHLINE//OS
      const la = Math.max(0, Math.min(1, (cover - 0.7) / 0.3));
      if (la > 0) {
        c.save(); c.globalAlpha = la;
        const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.16;
        c.fillStyle = 'rgba(5,12,20,.88)'; c.beginPath(); c.arc(cx, cy - r * 0.35, r * 1.25, 0, 6.283); c.fill();
        for (let k = 1; k <= 3; k++) { c.strokeStyle = `rgba(62,240,255,${0.25 + k * 0.15})`; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy - r * 0.35, r * k / 3 * 1.15, 0, 6.283); c.stroke(); }
        const sa = age * 7; c.fillStyle = 'rgba(62,240,255,.35)'; c.beginPath(); c.moveTo(cx, cy - r * 0.35); c.arc(cx, cy - r * 0.35, r * 1.15, sa - 0.6, sa); c.closePath(); c.fill();
        if (TL.Balls) { try { TL.Balls.draw(c, TL.Balls.selected(), cx, cy - r * 0.35, r * 0.42, age * 9); } catch (e) { /* sin balón */ } }
        const fs = Math.round(r * 0.55); c.font = `900 ${fs}px Barlow Condensed, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
        const w1 = c.measureText('TOUCHLINE').width, w2 = c.measureText('//OS').width, x0 = cx - (w1 + w2) / 2, ty = cy + r * 1.25;
        c.fillStyle = '#000'; c.fillText('TOUCHLINE', x0 + 2, ty + 2); c.fillText('//OS', x0 + w1 + 2, ty + 2);
        c.fillStyle = '#ffffff'; c.fillText('TOUCHLINE', x0, ty); c.fillStyle = '#3ef0ff'; c.fillText('//OS', x0 + w1, ty);
        c.textAlign = 'center';
        c.font = `700 ${Math.round(fs * 0.38)}px ui-monospace, monospace`; c.fillStyle = '#b8f53d'; c.fillText(age < 0.55 ? 'ESCANEANDO…' : 'ACCESO CONCEDIDO', cx, cy + r * 1.85);
        c.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function after(S) {
    const root = document.querySelector('.hud');
    if (!root) return;
    const fresh = !!(document.getElementById('view') && document.getElementById('view').classList.contains('enter'));
    // La historia del centro de mando sale una sola vez (y nunca más, ni la secuencia de arranque)
    let seen = !!S.hudLore;
    try { seen = seen || localStorage.getItem('touchline.hudLore') === '1'; } catch (e) { /* sin almacenamiento */ }
    const lore = () => {
      if (!introShown && !seen) {
        introShown = true; S.hudLore = true;
        try { localStorage.setItem('touchline.hudLore', '1'); } catch (e) { /* nada */ }
        if (TL.Game && TL.Game.save) TL.Game.save();
        intro(true);
      }
    };
    // Cada vez que entras: la cortinilla del radar (como la de los partidos); luego, la historia la primera vez
    if (fresh && !reduced()) stinger(S, lore); else lore();
    // Contadores que suben y anillos que se llenan
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && document.body.contains(el)) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    requestAnimationFrame(() => { root.classList.add('on'); animate(S, root); });
    // La consola va soltando tonterías
    const tick = root.querySelector('.hud-tick');
    const loop = () => { if (!document.body.contains(tick)) return; tick.textContent = '> ' + tr(pick(TICK)); tick.classList.remove('ty'); void tick.offsetWidth; tick.classList.add('ty'); setTimeout(loop, 3600); };
    setTimeout(loop, 3600);
  }

  // ------------------------------------------------------------ Acciones
  const A = UI.actions;
  const beep = k => { if (TL.SFX && TL.SFX[k]) { try { TL.SFX[k](); } catch (e) { /* nada */ } } };
  A['hud-ment'] = el => { const S = TL.Game.S; IN().setMent(S, +el.dataset.m); beep('success'); TL.Game.save(); UI.refresh(); };
  A['hud-form'] = el => {
    const S = TL.Game.S, nf = el.dataset.f, old = S.tactics.formation, E = TL.Engine;
    if (nf && nf !== old && E.FORMATIONS[nf]) { S.tactics.slots = E.remapLineup(W.squad(S, S.user), old, S.tactics.slots, nf); S.tactics.formation = nf; }
    beep('success'); TL.Game.save(); UI.refresh();
  };
  A['hud-rf'] = el => { UI.hudRf = el.dataset.f; beep('select'); UI.refresh(); };
  A['hud-op'] = el => {
    const S = TL.Game.S, r = IN().runOp(S, el.dataset.id);
    if (r.ok) { S.intel.opMsg = r.msg; beep(r.caught ? 'error' : 'coin'); } else beep('error');
    UI.toast(r.msg, !r.ok || r.caught);
    TL.Game.save(); UI.refresh();
  };

  UI.VIEWS.stats = view;
  UI.VIEWS.statsAfter = after;
  TL.Hud = { fansOpinion, squadMood, cvHtml, story, axes, finance };
})();
