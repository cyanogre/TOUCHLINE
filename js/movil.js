/* TOUCHLINE — el móvil del entrenador (modo fantasía).
 *
 * Tu vida fuera del banquillo: tu sueldo y tu cuenta, tus cinco atributos (carisma, táctica, físico, labia y estilo)
 * que subes haciendo UNA cosa al día, los chats con la gente del club, con tu pareja… y, si te lías, con tu amante.
 * Quedar con alguien o hacer algo gasta un día del calendario (con su animación del puntito del entrenador), igual
 * que las barbacoas y las demás actividades de equipo. Lo de la amante se puede destapar o no: depende de lo discreto
 * que seas, de cuánto quedes y de cómo cuides a tu pareja. */
(function () {
  'use strict';
  const TL = window.TL;
  const { U, World: W, UI, Game: G } = TL;
  const esc = U.esc;
  const A = UI.actions;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fan = S => !!(TL.Events && TL.Events.fantasy && TL.Events.fantasy(S));
  const N = () => TL.News && TL.News.fx;

  const STATS = [
    ['car', 'Carisma', '✨', 'El vestuario te sigue un poco más cada semana.'],
    ['tac', 'Táctica', '🧠', 'La directiva confía más en tu proyecto.'],
    ['fis', 'Físico', '💪', 'Das ejemplo: la plantilla se cansa menos.'],
    ['lab', 'Labia', '🎙️', 'En la prensa se te perdona una respuesta más.'],
    ['est', 'Estilo', '🕶️', 'La afición te adora (y no solo la afición).']
  ];
  const NAMES = ['Lucía', 'Marta', 'Irene', 'Paula', 'Carla', 'Nerea', 'Alba', 'Sara', 'Hugo', 'Álex', 'Dani', 'Leo', 'Marcos', 'Iker', 'Bruno', 'Nico'];

  function me(S) {
    if (!S.me) {
      const c = S.clubs[S.user];
      S.me = { cash: 20000, st: { car: 40, tac: 45, fis: 35, lab: 38, est: 30 }, partner: { name: pick(NAMES), love: 62 }, lover: null, chats: {}, said: {}, salaryW: 0, unknown: null, act: 0 };
      S.me.salaryW = salary(S, c);
    }
    return S.me;
  }
  function salary(S, c) { return Math.round(Math.max(1500, (c.wageBudget || 200000) * 0.035) / 100) * 100; }
  const day = S => (TL.Events ? TL.Events.st(S).d : S.week * 7);

  // ------------------------------------------------------------ Lo que haces en un día
  const DAYS = [
    { id: 'gym', name: 'Gimnasio', icon: '🏋️', st: { fis: 3 }, cost: 0, txt: ['Has levantado más que tu central titular.', 'Agujetas hasta en las pestañas.', 'El monitor te ha llamado «máquina». No sabes si era ironía.'] },
    { id: 'video', name: 'Maratón de vídeos tácticos', icon: '📺', st: { tac: 3 }, cost: 0, txt: ['Has visto 14 partidos a 1,5x. Ves flechas al cerrar los ojos.', 'Has descubierto un patrón en la salida del rival. O era un píxel muerto.', 'Has pausado tanto que el mando ha pedido la baja.'] },
    { id: 'speech', name: 'Clase de oratoria', icon: '🎤', st: { lab: 3 }, cost: 600, txt: ['La profesora dice que ya no dices «o sea» cada tres palabras. O sea, mejoras.', 'Has hecho un discurso al espejo. El espejo ha llorado.', 'Has aprendido a decir «no entro a valorar» con 7 entonaciones.'] },
    { id: 'shop', name: 'Ir de compras', icon: '🛍️', st: { est: 3 }, cost: 1500, txt: ['Te has comprado unas gafas de sol para las ruedas de prensa nocturnas.', 'El dependiente te ha dicho que tienes «percha de entrenador europeo».', 'Abrigo largo. Ya eres oficialmente un entrenador.'] },
    { id: 'zen', name: 'Retiro de meditación', icon: '🧘', st: { car: 3 }, cost: 300, txt: ['Has encontrado la paz interior. Te ha durado hasta ver la clasificación.', 'Ommm… sigues pensando en el lateral izquierdo.', 'El gurú te ha dicho que tu aura es naranja. Y fosforito.'] },
    { id: 'gala', name: 'Gala benéfica', icon: '🥂', st: { est: 2, car: 1 }, cost: 800, txt: ['Has posado en el photocall con una sonrisa de anuncio de dentífrico.', 'Has bailado. Ya hay vídeo. Ya es viral.', 'Has hablado con tres directivos y un influencer de croquetas.'], gala: true }
  ];

  /** Animación del puntito del entrenador haciendo lo que sea durante el día. */
  function dayAnim(S, anim) {
    const [icon, label] = anim || ['📅', 'Un día más'];
    const c = S.clubs[S.user], [c1] = U.clubColors(c.name);
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'mv-day';
      const d = TL.Events ? TL.Events.dateOf(S, day(S) + 1) : null;
      el.innerHTML = `<div class="mv-day-in"><div class="mv-day-date">${d ? d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</div>
        <div class="mv-day-scene"><i class="mv-dot" style="--c:${c1}"></i><span class="mv-prop">${icon}</span></div>
        <div class="mv-day-l">${esc(label)}</div><div class="mv-day-bar"><i></i></div></div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.remove(); res(); }, 260); }, 1500);
    });
  }

  function doDay(S, id) {
    const m = me(S), a = DAYS.find(x => x.id === id);
    if (!a) return;
    if (!UI.canSpendDay(S)) { UI.toast('Hoy hay partido. Mañana más.', true); return; }
    if (a.cost && m.cash < a.cost) { UI.toast('No te llega. Tu cuenta tiene más telarañas que la vitrina.', true); return; }
    m.cash -= a.cost;
    let out = pick(a.txt);
    for (const k in a.st) m.st[k] = clamp(m.st[k] + a.st[k] + (Math.random() < 0.25 ? 1 : 0), 0, 99);
    if (a.gala && N()) N().fans(S, 0.002);
    if (a.gala && !m.lover && !m.unknown && Math.random() < 0.22 + (m.st.est - 30) / 300) {
      m.unknown = { name: pick(NAMES), d: day(S) };
      out += ' Alguien te ha pedido el número con una sonrisa sospechosa…';
    }
    close();
    UI.spendDay(S, [a.icon, a.name], () => UI.toast(out));
  }

  // ------------------------------------------------------------ Contactos y chats
  function contacts(S) {
    const m = me(S), sq = W.squad(S, S.user);
    const cap = sq.slice().sort((a, b) => (b.age - a.age) || (b.ovr - a.ovr))[0];
    const star = sq.slice().sort((a, b) => b.ovr - a.ovr)[0];
    const out = [
      { id: 'pres', name: 'Presidente', icon: '🎩', sub: 'Confianza: ' + (S.board.conf >= 60 ? 'alta' : S.board.conf >= 35 ? 'regular' : 'por los suelos') },
      cap && { id: 'cap', name: cap.short + ' (capitán)', icon: '©️', pid: cap.id, sub: 'El que manda en el vestuario' },
      star && star !== cap && { id: 'star', name: star.short, icon: '⭐', pid: star.id, sub: 'Tu estrella' },
      { id: 'profe', name: 'El Profe', icon: '🧓', sub: 'Siempre tiene un consejo' }
    ];
    if (TL.Staff) TL.Staff.state(S).forEach((st, k) => { const R = TL.Staff.ROLES[st.role]; if (R) out.push({ id: 'st' + k, name: st.name, icon: R.icon, sub: R.name, staff: st }); });
    if (m.partner) out.push({ id: 'partner', name: m.partner.name + ' ❤️', icon: '💑', sub: m.partner.love >= 70 ? 'Todo va genial' : m.partner.love >= 40 ? 'Bien… creo' : 'Te habla con monosílabos' });
    if (m.lover) out.push({ id: 'lover', name: m.lover.name + ' 🔥', icon: '🤫', sub: 'Chat archivado (por si acaso)' });
    if (m.unknown) out.push({ id: 'unknown', name: 'Número desconocido', icon: '❓', sub: 'Nos vimos en la gala 😏' });
    return out.filter(Boolean);
  }
  const MSG = {
    pres: [['¿Cómo ve el proyecto, presi?', ['Mientras ganes, de maravilla.', 'Bien, bien… ¿has visto la clasificación?', 'Te veo con ganas. Me gusta.'], { board: 0.6 }],
      ['Necesitaría un fichaje…', ['Ya veremos. Ahora mismo, imposible.', 'Mándame nombres. Pero baratos.', '¿Otra vez? 😅'], { board: -0.3 }],
      ['Le invito a un café la semana que viene', ['Me apunto. Pagas tú.', 'Ok, pero sin hablar de fichajes.', 'Hecho.'], { board: 0.4 }]],
    cap: [['¿Cómo está el vestuario?', ['Unidos, míster. Vamos a muerte.', 'Hay alguno mosqueado, pero bien.', 'Mejor que nunca 💪'], { team: 0.4 }],
      ['Necesito que tires del grupo', ['Cuenta con ello.', 'Hecho, míster.', 'Siempre 🫡'], { team: 0.6 }],
      ['El sábado te quiero de líder', ['Dalo por hecho.', 'Voy a dejarme la piel.', 'Me pongo el brazalete ya.'], { team: 0.5 }]],
    star: [['Eres clave para mí', ['Gracias, míster. Lo voy a demostrar.', '🙏🙏', 'Lo sé 😎'], { pl: 4 }],
      ['Te veo un poco apagado', ['Es verdad. Necesito minutos.', 'Estoy bien, míster.', '¿Tanto se nota? 😬'], { pl: 2 }],
      ['A ver si el domingo marcas', ['Hecho. Y se lo dedico.', 'Si me la ponen, adentro.', '🎯'], { pl: 1 }]],
    profe: [['Profe, ¿algún consejo?', ['Escucha más de lo que hablas, chaval.', 'El vestuario se gana en el día a día, no en las ruedas de prensa.', 'Duerme. Un entrenador cansado elige mal.'], {}],
      ['Estoy agobiado', ['Normal. Respira. Esto es una maratón.', 'Si no te agobiaras, no te importaría. Y te importa.', 'Sal a caminar. Las mejores alineaciones salen andando.'], { team: 0.2 }]],
    partner: [['Te echo de menos ❤️', ['Y yo a ti. ¿Cenamos?', 'Pues ven a casa antes 😘', '¿Seguro? Que el móvil lo llevas pegado a la pizarra…'], { love: 6 }],
      ['Hoy llego tarde, perdona', ['Otra vez…', 'Vale. Te guardo cena.', 'Como siempre 🙄'], { love: -3 }],
      ['¿Peli este finde?', ['¡Sí! Pero nada de fútbol.', 'Si no hay partido…', 'Eligo yo 😏'], { love: 4 }]],
    lover: [['¿Nos vemos? 🔥', ['Dime dónde y cuándo.', 'Ten cuidado… que te conoce todo el mundo.', '😏'], { heat: 8, risk: 0.02 }],
      ['Esto se tiene que acabar', ['¿En serio? 💔', 'Vale. Como quieras.', 'Ya lo veremos…'], { end: true }]],
    staff: [['¿Cómo va todo por tu área?', ['Todo controlado, míster.', 'Bien, aunque me vendría bien más presupuesto 😅', 'Trabajando a tope. Ya lo notarás.'], { team: 0.3 }],
      ['Gran trabajo esta semana', ['¡Gracias! Se agradece oírlo.', 'Eso me da vida 🙌', 'A seguir así.'], { team: 0.4 }],
      ['Necesito que aprietes más', ['Entendido. Me pongo las pilas.', 'Vale… aunque ya voy a tope.', 'Dalo por hecho.'], { team: -0.1 }]],
    unknown: [['Hola 😊 Sí, me acuerdo', ['Me alegro 😏 ¿Un café un día?', 'Sabía que escribirías.', 'Eres más majo que en la tele.'], { flirt: true }],
      ['Perdona, tengo pareja', ['Ups. Perdón 🙈', 'Vale, vale. Suerte el domingo.', 'Lo intenté 😅'], { ignore: true }]]
  };
  function sendMsg(S, cid, k) {
    const m = me(S), pool = MSG[cid.startsWith('st') ? 'staff' : cid];
    if (!pool || !pool[k]) return;
    const d = day(S);
    if (m.said[cid] === d) { UI.toast('Ya le has escrito hoy. No seas pesado.', true); return; }
    m.said[cid] = d;
    const [txt, replies, fx] = pool[k];
    const th = m.chats[cid] || (m.chats[cid] = []);
    th.push({ me: 1, t: txt });
    const n = N(), c = contacts(S).find(x => x.id === cid);
    if (fx.board && n) n.board(S, fx.board);
    if (fx.team && n) n.teamMor(S, fx.team);
    if (fx.pl && c && c.pid != null && n) n.mor(S.players[c.pid], fx.pl);
    if (fx.love && m.partner) m.partner.love = clamp(m.partner.love + fx.love, 0, 100);
    if (fx.heat && m.lover) { m.lover.heat = clamp(m.lover.heat + fx.heat, 0, 100); m.lover.risk += fx.risk; }
    if (fx.end && m.lover) { m.lover = null; delete m.chats.lover; UI.toast('Lo has dejado. Borras el chat y respiras.'); render(S, 'home'); return; }
    if (fx.flirt) { m.lover = { name: m.unknown.name, heat: 30, risk: 0.02, met: 0 }; m.chats.lover = m.chats.unknown; delete m.chats.unknown; m.unknown = null; }
    if (fx.ignore) { m.unknown = null; delete m.chats.unknown; UI.toast('Bloqueado. Tu pareja estaría orgullosa (si lo supiera).'); render(S, 'home'); return; }
    render(S, 'chat', fx.flirt ? 'lover' : cid, true);
    setTimeout(() => {
      th.push({ me: 0, t: pick(replies) });
      if (cur.screen === 'chat') render(S, 'chat', fx.flirt ? 'lover' : cid);
      G.save();
    }, 1100);
  }

  // ------------------------------------------------------------ Quedar (gasta un día)
  const MEET = {
    pres: ['🍽️', 'Comida con el presidente', S => { N().board(S, 2.5); return 'Ha pagado él. Eso, en este club, es un abrazo.'; }],
    cap: ['🍻', 'Cañas con el capitán', S => { N().teamMor(S, 1.5); return 'El vestuario se entera de que eres de los suyos.'; }],
    star: ['🎮', 'Partida a la Play con tu estrella', (S, c) => { N().mor(S.players[c.pid], 6); return 'Te ha ganado 5-0 y te ha dicho «gg, míster». Está feliz.'; }],
    profe: ['♟️', 'Ajedrez con el Profe', S => { me(S).st.tac = clamp(me(S).st.tac + 2, 0, 99); return 'Te ha ganado en 11 movimientos. Has aprendido algo de presión alta.'; }],
    partner: ['🌅', 'Día con tu pareja', S => { const m = me(S); m.partner.love = clamp(m.partner.love + 14, 0, 100); return 'Sin móvil, sin fútbol. Bueno, casi sin fútbol.'; }],
    loverQ: ['🕯️', 'Cita discreta (en las afueras)', S => { const l = me(S).lover; l.heat = clamp(l.heat + 12, 0, 100); l.risk += 0.04; l.met++; return 'Gorra, gafas y una tasca donde nadie ve fútbol. De momento, nadie sabe nada.'; }],
    loverC: ['🍸', 'Cena con tu amante en el centro', S => { const l = me(S).lover; l.heat = clamp(l.heat + 22, 0, 100); l.risk += 0.13; l.met++; return 'Una noche de película… en un restaurante con 40 móviles mirando.'; }]
  };
  const STAFF_MEET = {
    physio: S => { W.squad(S, S.user).forEach(p => { if (p.inj > 1 && Math.random() < 0.4) p.inj--; }); return 'Repasáis las lesiones uno a uno. Alguno volverá antes de lo previsto.'; },
    fitness: S => { W.squad(S, S.user).forEach(p => { p.fit = Math.min(100, p.fit + 3); }); return 'Diseñáis un plan de descanso. Las piernas lo agradecerán.'; },
    coach: S => { N().teamMor(S, 0.8); return 'Salís con tres ejercicios nuevos y una pizarra llena.'; },
    assistant: S => { N().teamMor(S, 1.2); return 'Tu segundo te cuenta lo que en el vestuario no te dicen a ti.'; },
    gk: S => { W.squad(S, S.user).filter(p => p.pos === 'GK').forEach(p => N().mor(p, 4)); return 'Los porteros se sienten escuchados por fin.'; },
    youth: S => { me(S).st.car = clamp(me(S).st.car + 1, 0, 99); return 'Te habla de dos chavales de la cantera que «van a petarlo».'; },
    scout: S => { me(S).st.tac = clamp(me(S).st.tac + 1, 0, 99); return 'Te enseña vídeos de un lateral de una liga que no sabías que existía.'; }
  };
  function meet(S, k) {
    if (k.startsWith('st')) {
      const c = contacts(S).find(x => x.id === k);
      if (!c) return;
      if (!UI.canSpendDay(S)) { UI.toast('Hoy hay partido. Las quedadas, para otro día.', true); return; }
      const txt = (STAFF_MEET[c.staff.role] || (() => 'Buena charla.'))(S);
      close();
      UI.spendDay(S, ['☕', 'Café con ' + c.name], () => UI.toast(txt));
      return;
    }
    const mt = MEET[k], m = me(S);
    if (!mt) return;
    if (!UI.canSpendDay(S)) { UI.toast('Hoy hay partido. Las quedadas, para otro día.', true); return; }
    if ((k === 'loverQ' || k === 'loverC') && !m.lover) return;
    if (k === 'partner' && !m.partner) return;
    const c = contacts(S).find(x => x.id === k);
    if ((k === 'cap' || k === 'star') && !c) return;
    const txt = mt[2](S, c);
    close();
    UI.spendDay(S, [mt[0], mt[1]], () => UI.toast(txt));
  }

  // ------------------------------------------------------------ Cada semana
  /** Sueldo, efectos de tus atributos, tu pareja… y la posibilidad de que se destape lo de la amante. */
  function weekly(S) {
    if (!fan(S)) return;
    const m = me(S), n = N();
    m.salaryW = salary(S, S.clubs[S.user]);
    m.cash += m.salaryW;
    if (!n) return;
    if (m.st.car >= 55) n.teamMor(S, (m.st.car - 50) / 60);
    if (m.st.tac >= 55) n.board(S, (m.st.tac - 50) / 80);
    if (m.st.fis >= 60) W.squad(S, S.user).forEach(p => { p.fit = Math.min(100, p.fit + 1); });
    if (m.st.est >= 60) n.fans(S, 0.001);
    if (m.partner) { m.partner.love = clamp(m.partner.love - 2, 0, 100); if (m.lover) m.partner.love = clamp(m.partner.love - 1, 0, 100); }
    if (m.partner && m.partner.love <= 8) {
      TL.News.add(S, 'redes', `${S.manager} y ${m.partner.name}, ruptura`, 'La pareja del técnico se cansa de compartirle con una pizarra.', S.user, null, 'neg');
      m.partner = null;
    }
    if (m.lover) {
      const L = m.lover;
      const disc = (m.st.lab + m.st.car) / 600;
      const risk = clamp(L.risk - disc, 0.005, 0.6);
      L.risk = Math.max(0.02, L.risk * 0.85);
      if (Math.random() < risk) expose(S);
    }
  }
  function expose(S) {
    const m = me(S), L = m.lover, n = N(), club = S.clubs[S.user];
    n.board(S, -3); n.fans(S, -0.006);
    const forgive = m.partner && m.partner.love >= 75 && Math.random() < 0.5;
    let tail;
    if (!m.partner) tail = 'Como no tenías pareja, la polémica dura dos días. Las redes, decepcionadas.';
    else if (forgive) { m.partner.love = 35; tail = `${m.partner.name} te perdona… con condiciones. Muchas condiciones.`; m.lover = null; delete m.chats.lover; }
    else if (L.heat >= 60) { tail = `${m.partner.name} te deja. ${L.name} lo hace oficial en Instagram con un corazón.`; m.partner = { name: L.name, love: 70 }; m.lover = null; m.chats.partner = m.chats.lover || []; delete m.chats.lover; }
    else { tail = `${m.partner.name} te deja y ${L.name} desaparece. Te quedas con el perro y la pizarra.`; m.partner = null; m.lover = null; delete m.chats.lover; }
    TL.News.add(S, 'polemica', `¡Pillado! ${S.manager}, cazado con ${L.name}`, `Un paparazzi saca a la luz la relación secreta del técnico de ${club.name}. ${tail}`, S.user, null, 'neg');
  }

  // ------------------------------------------------------------ Pantallas del móvil
  const cur = { screen: 'home', cid: null };
  function close() { const el = document.getElementById('movil'); if (el) el.remove(); }
  function render(S, screen, cid, typing) {
    cur.screen = screen || 'home'; cur.cid = cid || null;
    let el = document.getElementById('movil');
    if (!el) {
      el = document.createElement('div'); el.id = 'movil'; el.className = 'movil';
      el.addEventListener('click', e => { if (e.target === el) close(); });
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
    }
    const m = me(S), dl = TL.Events ? TL.Events.daysLeft(S) : 0;
    const clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    let body = '';
    const back = '<button class="mv-back" data-act="movil-go" data-s="home">‹</button>';
    if (cur.screen === 'home') {
      body = `<div class="mv-wall"><div class="mv-clock">${clock}</div><div class="mv-sub">${dl > 0 ? `${dl} día${dl > 1 ? 's' : ''} hasta el partido` : 'Hoy hay partido'}</div></div>
        <div class="mv-apps">
          <button data-act="movil-go" data-s="me"><i>🧍</i>Yo</button>
          <button data-act="movil-go" data-s="day"><i>📅</i>Mi día</button>
          <button data-act="movil-go" data-s="chats"><i>💬</i>Chats${m.unknown ? '<b class="mv-badge">1</b>' : ''}</button>
          <button data-act="movil-go" data-s="meet"><i>📍</i>Quedar</button>
          <button data-act="movil-go" data-s="bank"><i>🏦</i>Banco</button>
          <button data-act="tab" data-tab="stats" onclick="document.getElementById('movil').remove()"><i>📊</i>Panel</button>
        </div>`;
    } else if (cur.screen === 'me') {
      body = `<header>${back}<b>Tus atributos</b></header><div class="mv-list">${STATS.map(([k, n, ic, d]) => `<div class="mv-stat"><span>${ic} ${n}</span><b>${m.st[k]}</b><div class="mv-bar"><i style="width:${m.st[k]}%"></i></div><small>${d}</small></div>`).join('')}
        <p class="mv-note">Se suben haciendo cosas en «Mi día». Una al día: el día no da para más.</p></div>`;
    } else if (cur.screen === 'day') {
      body = `<header>${back}<b>¿Qué haces hoy?</b></header><div class="mv-list">${DAYS.map(a => `<button class="mv-row" data-act="movil-day" data-id="${a.id}"><i>${a.icon}</i><span><b>${a.name}</b><small>${Object.keys(a.st).map(k => STATS.find(s => s[0] === k)[1] + ' +' + a.st[k]).join(' · ')}${a.cost ? ' · ' + U.money(a.cost) : ''}</small></span></button>`).join('')}
        <p class="mv-note">${dl > 0 ? 'Cada cosa gasta un día del calendario.' : 'Hoy hay partido: no queda día libre.'}</p></div>`;
    } else if (cur.screen === 'chats') {
      body = `<header>${back}<b>Chats</b></header><div class="mv-list">${contacts(S).map(c => `<button class="mv-row" data-act="movil-go" data-s="chat" data-c="${c.id}"><i>${c.icon}</i><span><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></span></button>`).join('')}</div>`;
    } else if (cur.screen === 'chat') {
      const c = contacts(S).find(x => x.id === cur.cid);
      const th = (m.chats[cur.cid] || []).slice(-10);
      body = `<header><button class="mv-back" data-act="movil-go" data-s="chats">‹</button><b>${c ? esc(c.name) : ''}</b></header>
        <div class="mv-thread">${th.map(x => `<p class="${x.me ? 'me' : 'th'}">${esc(x.t)}</p>`).join('')}${typing ? '<p class="th typing"><i></i><i></i><i></i></p>' : ''}${!th.length ? '<p class="mv-note">Aún no habéis hablado.</p>' : ''}</div>
        <div class="mv-replies">${(MSG[cur.cid && cur.cid.startsWith('st') ? 'staff' : cur.cid] || []).map((x, k) => `<button data-act="movil-send" data-c="${cur.cid}" data-k="${k}">${esc(x[0])}</button>`).join('')}</div>`;
    } else if (cur.screen === 'meet') {
      const cs = contacts(S);
      const rows = cs.filter(c => MEET[c.id]).map(c => [c.id, MEET[c.id]]);
      cs.filter(c => c.staff).forEach(c => rows.push([c.id, ['☕', 'Café con ' + c.name + ' (' + TL.Staff.ROLES[c.staff.role].name.toLowerCase() + ')']]));
      if (m.lover) rows.push(['loverQ', MEET.loverQ], ['loverC', MEET.loverC]);
      body = `<header>${back}<b>Quedar</b></header><div class="mv-list">${rows.map(([k, mt]) => `<button class="mv-row${k.startsWith('lover') ? ' hot' : ''}" data-act="movil-meet" data-k="${k}"><i>${mt[0]}</i><span><b>${esc(mt[1])}</b><small>${k === 'loverC' ? 'Más intenso… y más fácil que te pillen' : k === 'loverQ' ? 'Discreto. Pero nada es secreto para siempre' : 'Gasta un día'}</small></span></button>`).join('')}</div>`;
    } else if (cur.screen === 'bank') {
      body = `<header>${back}<b>Banco</b></header><div class="mv-bank"><small>Tu cuenta</small><b>${U.money(m.cash)}</b><div class="mv-row2"><span>Sueldo semanal</span><b>${U.money(m.salaryW)}</b></div>
        <p class="mv-note">Te lo paga ${esc(S.clubs[S.user].name)} cada semana. Las compras, clases y galas salen de aquí, no del club.</p></div>`;
    }
    el.innerHTML = `<div class="mv-phone"><div class="mv-notch"></div><div class="mv-scr">${body}</div><div class="mv-home" data-act="movil-go" data-s="home"></div></div>`;
    const t = el.querySelector('.mv-thread'); if (t) t.scrollTop = t.scrollHeight;
  }

  A['movil-open'] = () => render(G.S, 'home');
  A['movil-go'] = b => render(G.S, b.dataset.s, b.dataset.c);
  A['movil-day'] = b => doDay(G.S, b.dataset.id);
  A['movil-send'] = b => sendMsg(G.S, b.dataset.c, +b.dataset.k);
  A['movil-meet'] = b => meet(G.S, b.dataset.k);

  // El móvil vive en la pantalla de inicio (modo fantasía)
  const home0 = UI.VIEWS.home;
  UI.VIEWS.home = S => home0(S) + (fan(S) && S.mode !== 'tour' ? `<button class="mv-fab" data-act="movil-open" aria-label="Tu móvil">📱${me(S).unknown ? '<b class="mv-badge">1</b>' : ''}</button>` : '');

  TL.Movil = { me, weekly, dayAnim, expose, render, STATS };
})();
