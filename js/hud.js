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
    const fx = TL.Season.nextFixture && TL.Season.nextFixture(S);
    if (fx) { const o = S.clubs[fx[0] === S.user ? fx[1] : fx[0]]; out.push(['🎯', `Próximo rival: ${o.name}. La IA lo ha estudiado durante 0,4 segundos y dice que se puede.`, 'tactics', 'Preparar']); }
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

    const head = `<button class="hud-back" data-act="tab" data-tab="home">‹ Inicio</button><div class="hud-top">
      <div class="hud-logo">TOUCHLINE<span>//OS</span></div>
      <div class="hud-sys"><span class="dot"></span>NÚCLEO CUÁNTICO 9.3 · 14 SAT · PING 0,0003 ms</div>
      <div class="hud-boot"><p>&gt; Arrancando módulos de vigilancia…</p><p>&gt; Usuario: <b>${esc(S.manager)}</b> · ${esc(S.clubs[S.user].name)} · T${S.season} J${S.week}</p><p class="hud-tick">&gt; ${esc(tr(pick(TICK)))}</p></div>
    </div>`;

    const gauges = `<div class="hud-gauges">
      ${ring(conf, 'Directiva', word(conf), 190)}${ring(fan, 'Afición', word(fan), 140)}
      ${ring(mood, 'Vestuario', word(mood), 45)}${ring(ps.rep, 'Prensa', word(ps.rep), 300)}</div>`;

    const aurab = panel('Índice de aura', 'AURA.EXE', `<div class="hud-aura"><b data-count="${aura}">0</b><span>${aura >= 70 ? 'Main character energy' : aura >= 50 ? 'Aura estable' : aura >= 35 ? 'Aura en mínimos' : '−1000 de aura'}</span></div>
      <p class="hud-note">Compuesto de directiva, afición, vestuario, prensa y la fama de tu muletilla. Patentado. No preguntes.</p>`, 'span2');

    const silla = panel('Temperatura de la silla', 'SILLA.TEMP', `<div class="hud-chair c${conf >= 55 ? 0 : conf >= 35 ? 1 : 2}"><b>${esc(ch)}</b><span>${esc(chTxt)}</span></div>
      <div class="hud-row"><span>Probabilidad de despido<small>calculada por 3 IAs y un tarot</small></span><b>${fire}%</b></div>${bar(fire, 0)}
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
      <div class="hud-row"><span>Fama</span><b>${(S.mule.fame || 0).toFixed(1)}${nextStep ? ` / ${nextStep.at}` : ''}</b></div>${bar(nextStep ? (S.mule.fame / nextStep.at) * 100 : 100, 50)}
      <ul class="hud-unl">${steps.map(st => `<li class="${(S.mule.got || []).includes(st.id) ? 'on' : ''}">${(S.mule.got || []).includes(st.id) ? '✓' : '🔒'} ${esc({ viral: 'Viral', shirts: 'Camisetas', ad: 'Anuncio de TV', chant: 'Cántico de la grada' }[st.id])}</li>`).join('')}</ul>
      ${S.mule.memed ? '<p class="hud-note warn">Estado: meme nacional. Se pasará. O no.</p>' : ''}`
      : '<p class="hud-note">Aún no tienes frase propia. Suéltala en una rueda de prensa y la IA se encargará de hacerla viral (o no).</p>');

    const car = panel('Tu carrera', 'COACH.CORE', `<div class="hud-big"><b>${tr(`Nv ${m.level}`)}</b><span>${esc(S.manager)}</span></div>
      <div class="hud-row"><span>Experiencia</span><b>${Math.round(m.xp)} / ${need}</b></div>${bar(m.xp / need * 100, 260)}
      <div class="hud-row"><span>Habilidades aprendidas</span><b>${Object.values(m.skills || {}).reduce((a, b) => a + b, 0)}</b></div>
      <div class="hud-row"><span>Temporadas</span><b>${(S.history || []).length + 1}</b></div>`);

    const cop = panel('IA copiloto', 'COPILOT.AI', copilot(S), 'span2');
    const cvp = panel('Expediente', 'CV.BLOCKCHAIN', cvHtml(S) + '<p class="hud-note">Registrado en 7 blockchains distintas. Nadie podrá borrarte la vergüenza ni la gloria.</p>', 'span2');
    return `<div class="hud">${head}${gauges}<div class="hud-cards">${cop}${aurab}${silla}${liga}${trend}${prensa}${mule}${car}${cvp}</div>
      <p class="hud-foot">TOUCHLINE//OS no se hace responsable de despidos, memes ni bocadillos. Datos actualizados hace 0,0001 s.</p></div>`;
  }

  function after(S) {
    const root = document.querySelector('.hud');
    if (!root) return;
    // La historia del centro de mando sale una sola vez (y nunca más, ni la secuencia de arranque)
    let seen = !!S.hudLore;
    try { seen = seen || localStorage.getItem('touchline.hudLore') === '1'; } catch (e) { /* sin almacenamiento */ }
    if (!introShown && !seen) {
      introShown = true; S.hudLore = true;
      try { localStorage.setItem('touchline.hudLore', '1'); } catch (e) { /* nada */ }
      if (TL.Game && TL.Game.save) TL.Game.save();
      intro(true);
    }
    // Contadores que suben y anillos que se llenan
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && document.body.contains(el)) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    requestAnimationFrame(() => root.classList.add('on'));
    // La consola va soltando tonterías
    const tick = root.querySelector('.hud-tick');
    const loop = () => { if (!document.body.contains(tick)) return; tick.textContent = '> ' + tr(pick(TICK)); tick.classList.remove('ty'); void tick.offsetWidth; tick.classList.add('ty'); setTimeout(loop, 3600); };
    setTimeout(loop, 3600);
  }

  UI.VIEWS.stats = view;
  UI.VIEWS.statsAfter = after;
  TL.Hud = { fansOpinion, squadMood, cvHtml, story };
})();
