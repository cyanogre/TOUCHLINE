/* TOUCHLINE — noticias, polémicas, moral y decisiones del mánager */
(function () {
  'use strict';
  const TL = window.TL;
  const F = TL.F, U = TL.U, W = TL.World;

  const MAX_NEWS = 220;

  function add(S, cat, title, body, club, pid, tone) {
    S.news = S.news || [];
    S.newsId = S.newsId || 1;
    S.news.unshift({ id: S.newsId++, s: S.season, w: S.week, cat, title, body, club: club == null ? -1 : club, pid: pid == null ? -1 : pid, tone: tone || 'neu' });
    if (S.news.length > MAX_NEWS) S.news.length = MAX_NEWS;
  }

  const CAT = {
    liga: 'Liga', fichajes: 'Fichajes', polemica: 'Polémica', arbitraje: 'Arbitraje', aficion: 'Afición',
    vestuario: 'Vestuario', sucesos: 'Sucesos', tribunales: 'Tribunales', dopaje: 'Dopaje', redes: 'Redes',
    ocio: 'Vida nocturna', mercado: 'Mercado', club: 'Club', positivo: 'Buenas noticias', rumor: 'Rumores'
  };

  const g = (S, m, f) => (S.gender === 'F' ? f : m);
  const clampMor = p => { p.mor = U.clamp(Math.round(p.mor == null ? 70 : p.mor), 5, 100); };
  function mor(p, d) { p.mor = (p.mor == null ? 70 : p.mor) + d; clampMor(p); }
  // Club protagonista del evento en curso: los efectos sobre afición y directiva
  // solo se aplican si es el club del usuario.
  let CTX = null;
  function fans(S, pct) { if (CTX != null && CTX !== S.user) return; if (S.com) S.com.fans = Math.round(S.com.fans * (1 + pct)); }
  function board(S, d) { if (CTX != null && CTX !== S.user) return; S.board.conf = U.clamp(Math.round((S.board.conf + d) * 10) / 10, 0, 100); }
  function teamMor(S, d) { for (const p of W.squad(S, S.user)) mor(p, d); }
  function fineClub(S, clubId, amount) {
    const c = S.clubs[clubId];
    amount = F.roundMoney(amount * (S.gender === 'F' ? 0.2 : 1) * (clubId === S.user ? TL.Manager.B(S).crisis : 1));
    c.cash -= amount;
    if (clubId === S.user) S.fin.fines = (S.fin.fines || 0) + amount;
    return amount;
  }
  function ban(p, n) { p.sus = Math.max(p.sus, n); }

  /** Riesgo de que un patrocinador de imagen revise el contrato tras un escándalo grave. */
  function sponsorReaction(S, severity) {
    if (!S.com || !S.com.sponsors.length) return '';
    const shield = TL.Commerce.fx(S, 'shield');
    if (Math.random() > severity * (1 - shield) * TL.Manager.B(S).crisis) return '';
    const s = U.pick(S.com.sponsors.filter(x => x.style !== 'risky').concat(S.com.sponsors).slice(0, 4));
    if (!s) return '';
    if (Math.random() < 0.4) {
      TL.Commerce.endSponsor(S, s, `${s.brand} rescinde el contrato por daño a su imagen.`);
      add(S, 'club', `${s.brand} rompe con ${S.clubs[S.user].name}`, 'El patrocinador alega daño reputacional tras la polémica.', S.user, null, 'neg');
      return ` ${s.brand} ha roto el contrato de patrocinio.`;
    }
    s.weekly = F.roundMoney(s.weekly * 0.8);
    return ` ${s.brand} recorta un 20% el patrocinio.`;
  }

  // ------------------------------------------------------------ Eventos extradeportivos
  // pick: peso para elegir protagonista · now: efecto inmediato · opts: decisiones del mánager
  const EV = {
    transferRequest: {
      pick: (S, p, c) => (p.mor < 50 ? 4 : 1) * (p.ovr >= c.rep ? 2 : 0.6),
      title: (S, p) => `${p.short} pide salir del club`,
      body: (S, p, c) => `El entorno de ${p.name} comunica a ${c.name} que quiere cambiar de aires este mercado.`,
      now: (S, p) => mor(p, -8),
      opts: [
        ['list', 'Ponerle en venta', (S, p) => { p.listed = true; mor(p, 15); return 'Le pones en la lista de transferibles. Lo agradece.'; }],
        ['refuse', 'Negarse', (S, p) => { mor(p, -15 * TL.Manager.B(S).moraleDrop); return 'Te niegas en redondo. Su moral se hunde.'; }],
        ['promise', 'Prometerle protagonismo', (S, p) => { mor(p, 8); return 'Le prometes minutos. De momento se calma.'; }]
      ]
    },
    trainingFight: {
      pick: (S, p) => 1 + (p.mor < 45 ? 2 : 0) + p.st[5] / 60,
      two: true,
      title: (S, p, c) => `Pelea en el entrenamiento del ${c.name}`,
      body: (S, p, c, q) => `${p.name} y ${q.name} llegan a las manos en la sesión de hoy. Los compañeros tuvieron que separarlos.`,
      now: (S, p, q) => { mor(p, -8); mor(q, -8); if (TL.Locker && q && q.id != null) TL.Locker.bond(S, p.id, q.id, -40); },
      opts: [
        ['fine', 'Multar a ambos', (S, p, q) => { mor(p, -4); mor(q, -4); teamMor(S, 1); return 'Multa ejemplar. El vestuario toma nota.'; }],
        ['talk', 'Mediar entre ellos', (S, p, q) => {
          if (Math.random() < 0.6) { mor(p, 8); mor(q, 8); return 'Hacen las paces delante del grupo.'; }
          mor(p, -5); mor(q, -5); return 'La reunión no sirve: siguen sin hablarse.';
        }],
        ['ignore', 'Restarle importancia', (S) => { teamMor(S, -2); return 'Lo dejas pasar, pero el ambiente se enrarece.'; }]
      ]
    },
    coachClash: {
      pick: (S, p, c) => (p.mor < 50 ? 4 : 0.5) * (p.ovr >= c.rep - 2 ? 1.5 : 1),
      title: (S, p) => `${p.short} critica al entrenador en público`,
      body: (S, p) => `En zona mixta, ${p.name} carga contra las decisiones técnicas: "No entiendo lo que se está haciendo".`,
      now: (S, p) => mor(p, -5),
      opts: [
        ['drop', 'Apartarle 2 partidos', (S, p) => { ban(p, 2); mor(p, -15); teamMor(S, 1); return 'Le apartas del equipo. Refuerzas tu autoridad.'; }],
        ['fine', 'Multarle', (S, p) => { mor(p, -8); return 'Multa interna. El jugador acata a regañadientes.'; }],
        ['peace', 'Hablar en privado', (S, p) => { mor(p, 6); board(S, -2); return 'Limáis asperezas, aunque la directiva te ve blando.'; }]
      ]
    },
    indiscipline: {
      pick: (S, p) => (p.age <= 24 ? 2 : 1) * (p.mor < 50 ? 2 : 1),
      title: (S, p) => `${p.short}, multado por llegar tarde`,
      body: (S, p) => `${p.name} se presenta con retraso a la concentración por segunda vez este mes.`,
      now: () => {},
      opts: [
        ['fine', 'Multa', (S, p) => { mor(p, -4); return 'Multa aplicada según el régimen interno.'; }],
        ['bench', 'Al banquillo', (S, p) => { ban(p, 1); mor(p, -6); return 'Se pierde el próximo partido por decisión técnica.'; }],
        ['forgive', 'Perdonarle', (S) => { teamMor(S, -1); return 'Le perdonas. Algún compañero lo comenta por lo bajo.'; }]
      ]
    },
    socialMedia: {
      pick: (S, p) => (p.age <= 25 ? 2.5 : 1),
      title: (S, p) => `Polémica por un mensaje de ${p.short} en redes`,
      body: (S, p) => U.pick([
        `${p.name} publica una crítica al arbitraje que puede costarle una sanción.`,
        `Un "me gusta" de ${p.name} a una publicación de un rival enfada a la afición.`,
        `${p.name} responde a un aficionado con insultos y borra el mensaje minutos después.`
      ]),
      now: (S) => fans(S, -0.002),
      opts: [
        ['fine', 'Multarle', (S, p) => { mor(p, -5); return 'Multa por incumplir el código de redes del club.'; }],
        ['defend', 'Defenderle', (S, p) => { mor(p, 5); fans(S, -0.004); return 'Le defiendes públicamente. Parte de la grada no lo entiende.'; }],
        ['apologise', 'Pedir disculpas', (S, p) => { mor(p, -3); fans(S, 0.002); return 'El club emite un comunicado de disculpa.'; }]
      ]
    },
    nightlife: {
      pick: (S, p) => (p.age <= 26 ? 2.5 : 0.8) * (p.inj > 0 ? 3 : 1),
      title: (S, p) => `${p.short}, de fiesta hasta la madrugada`,
      body: (S, p) => `Fotografías de ${p.name} en una discoteca a las 5 de la mañana${p.inj > 0 ? ' mientras está lesionado' : ' tras la última derrota'}.`,
      now: (S) => fans(S, -0.003),
      opts: [
        ['fine', 'Multarle', (S, p) => { mor(p, -5); return 'Multa y advertencia.'; }],
        ['drop', 'Apartarle un partido', (S, p) => { ban(p, 1); mor(p, -10); return 'Se queda fuera de la convocatoria.'; }],
        ['ignore', 'Es su vida privada', (S) => { teamMor(S, -1); board(S, -1); return 'Decides no intervenir.'; }]
      ]
    },
    agentDrama: {
      pick: (S, p, c) => (p.ovr >= c.rep ? 3 : 0.5),
      title: (S, p) => `El agente de ${p.short} exige una mejora`,
      body: (S, p) => `El representante de ${p.name} amenaza con forzar su salida si no se le sube el sueldo.`,
      now: (S, p) => mor(p, -5),
      opts: [
        ['raise', 'Subirle un 20%', (S, p) => { p.wage = F.roundMoney(p.wage * 1.2); mor(p, 12); return `Nuevo salario: ${U.money(p.wage)}/sem.`; }],
        ['list', 'Ponerle en venta', (S, p) => { p.listed = true; mor(p, 5); return 'Le pones en el mercado.'; }],
        ['ignore', 'No negociar', (S, p) => { mor(p, -15 * TL.Manager.B(S).moraleDrop); return 'Cierras la puerta. El jugador está muy molesto.'; }]
      ]
    },
    drivingOffence: {
      pick: (S, p) => (p.age <= 28 ? 2 : 1),
      title: (S, p) => U.pick([`${p.short}, cazado a 210 km/h`, `${p.short} da positivo en un control de alcoholemia`]),
      body: (S, p) => `La policía de tráfico denuncia a ${p.name}. Se enfrenta a una multa y a la retirada del carné.`,
      now: (S) => fans(S, -0.002),
      opts: [
        ['fine', 'Multa interna', (S, p) => { mor(p, -4); return 'El club le sanciona económicamente.'; }],
        ['support', 'Apoyo en privado', (S, p) => { mor(p, 3); board(S, -1); return 'Le acompañas en el proceso.'; }]
      ]
    },
    carAccident: {
      pick: () => 1,
      title: (S, p) => `${p.short} sufre un accidente de tráfico`,
      body: (S, p) => `${p.name} resulta herido en un accidente en la autovía. Estará varias semanas de baja.`,
      now: (S, p) => { p.inj = Math.max(p.inj, Math.round(U.int(2, 10) * (p.club === S.user ? TL.Manager.B(S).injDur : 1))); mor(p, -10); },
      opts: [['ok', 'Desearle una pronta recuperación', (S, p) => { mor(p, 4); return 'Todo el club se vuelca con él.'; }]]
    },
    burglary: {
      pick: (S, p) => p.wage,
      title: (S, p) => `Roban en casa de ${p.short} durante el partido`,
      body: (S, p) => `Los ladrones aprovecharon que ${p.name} estaba jugando para entrar en su domicilio.`,
      now: (S, p) => mor(p, -10),
      opts: [['rest', 'Darle dos días libres', (S, p) => { mor(p, 6); return 'Agradece el gesto.'; }], ['ok', 'Seguir con normalidad', () => 'Sin cambios.']]
    },
    taxFraud: {
      pick: (S, p) => p.wage * (p.age >= 25 ? 1.5 : 0.5),
      title: (S, p) => `Hacienda investiga a ${p.short} por sus derechos de imagen`,
      body: (S, p) => `La Agencia Tributaria sospecha que ${p.name} ocultó ingresos a través de sociedades en el extranjero.`,
      now: (S, p) => { mor(p, -8); fans(S, -0.003); },
      opts: [
        ['support', 'Apoyo público', (S, p) => { mor(p, 5); board(S, -2); return 'El club confía en su inocencia.'; }],
        ['neutral', 'Sin comentarios', () => 'El club respeta el proceso judicial.']
      ]
    },
    betting: {
      pick: (S, p) => (p.age <= 27 ? 2 : 1),
      title: (S, p) => `${p.short}, investigado por apuestas deportivas`,
      body: (S, p) => `La federación abre expediente a ${p.name} por presuntas apuestas en partidos de fútbol.`,
      now: (S, p) => {
        mor(p, -10);
        if (Math.random() < 0.45) { const n = U.int(8, 24); ban(p, n); return `Sanción cautelar de ${n} partidos.`; }
        return 'De momento puede seguir jugando.';
      },
      severity: 0.15,
      opts: [
        ['drop', 'Apartarle mientras dure', (S, p) => { ban(p, 4); board(S, 1); return 'Queda apartado cautelarmente.'; }],
        ['support', 'Respaldarle', (S, p) => { mor(p, 5); board(S, -2); return 'El club le respalda públicamente.'; }]
      ]
    },
    doping: {
      pick: () => 1,
      title: (S, p) => `${p.short} da positivo en un control antidopaje`,
      body: (S, p) => `El análisis de la muestra A de ${p.name} detecta una sustancia prohibida. Queda suspendido provisionalmente.`,
      now: (S, p) => { const n = U.int(10, 38); ban(p, n); mor(p, -25); fans(S, -0.008); return `Suspensión provisional de ${n} partidos.`; },
      severity: 0.35,
      opts: [
        ['terminate', 'Rescindir su contrato', (S, p) => { p.club = -1; p.contract = 0; p.listed = false; W.dirty(S); board(S, 2); return 'Despido procedente. El jugador queda libre.'; }],
        ['appeal', 'Recurrir la sanción', (S, p) => {
          const cost = F.roundMoney(TL.Commerce.base(S) * 0.2);
          S.clubs[S.user].cash -= cost; S.fin.other = (S.fin.other || 0) + cost;
          if (Math.random() < 0.4) { p.sus = Math.ceil(p.sus / 2); return `El TAS reduce la sanción a la mitad (costes legales ${U.money(cost)}).`; }
          return `El recurso no prospera (costes legales ${U.money(cost)}).`;
        }],
        ['support', 'Respaldarle', (S, p) => { mor(p, 8); fans(S, -0.006); board(S, -3); return 'El club confía en una contaminación accidental.'; }]
      ]
    },
    recreationalDrugs: {
      pick: (S, p) => (p.age <= 27 ? 2 : 1),
      title: (S, p) => `${p.short}, positivo por consumo de drogas recreativas`,
      body: (S, p) => `Un control fuera de competición detecta cocaína en la muestra de ${p.name}.`,
      now: (S, p) => { const n = U.int(4, 12); ban(p, n); mor(p, -20); fans(S, -0.005); return `Suspensión de ${n} partidos.`; },
      severity: 0.3,
      opts: [
        ['terminate', 'Rescindir su contrato', (S, p) => { p.club = -1; p.contract = 0; W.dirty(S); board(S, 1); return 'El club rescinde su contrato.'; }],
        ['rehab', 'Programa de ayuda', (S, p) => { mor(p, 10); fans(S, 0.002); return 'El club le ofrece apoyo psicológico y un programa de desintoxicación.'; }]
      ]
    },
    domesticViolence: {
      pick: () => 1,
      title: (S, p) => `${p.short}, denunciado por violencia de género`,
      body: (S, p) => `${p.name} es detenido tras una denuncia de su pareja. El juzgado dicta una orden de alejamiento.`,
      now: (S, p) => { mor(p, -15); fans(S, -0.01); },
      severity: 0.45,
      opts: [
        ['drop', 'Apartarle cautelarmente', (S, p) => { ban(p, 6); board(S, 2); fans(S, 0.003); return 'El club le aparta del equipo hasta que se aclare la situación.'; }],
        ['wait', 'Esperar a la justicia', (S) => { board(S, -4); fans(S, -0.012); return 'La decisión indigna a buena parte de la afición.' + sponsorReaction(S, 0.4); }],
        ['terminate', 'Rescindir su contrato', (S, p) => { p.club = -1; p.contract = 0; W.dirty(S); board(S, 2); return 'El club rompe su relación con el jugador.'; }]
      ]
    },
    sexualMisconduct: {
      pick: () => 1,
      title: (S, p) => `${p.short}, investigado por una presunta agresión sexual`,
      body: (S, p) => `Una mujer denuncia a ${p.name} tras una noche en una discoteca. La investigación judicial sigue abierta y rige la presunción de inocencia.`,
      now: (S, p) => { mor(p, -20); fans(S, -0.012); },
      severity: 0.5,
      opts: [
        ['drop', 'Apartarle cautelarmente', (S, p) => { ban(p, 8); board(S, 2); return 'Queda apartado hasta que avance la investigación.'; }],
        ['wait', 'Respetar la presunción de inocencia', (S) => { board(S, -5); fans(S, -0.015); return 'Fuertes críticas en redes y medios.' + sponsorReaction(S, 0.5); }],
        ['terminate', 'Rescindir su contrato', (S, p) => { p.club = -1; p.contract = 0; W.dirty(S); board(S, 2); return 'El club rescinde su contrato.'; }]
      ]
    },
    streetFight: {
      pick: (S, p) => (p.age <= 27 ? 2 : 1) * (p.mor < 45 ? 2 : 1),
      title: (S, p) => `${p.short}, detenido tras una pelea a la salida de un local`,
      body: (S, p) => `${p.name} pasa la noche en comisaría después de un altercado con otros clientes.`,
      now: (S, p) => { mor(p, -10); fans(S, -0.004); },
      severity: 0.15,
      opts: [
        ['fine', 'Multarle', (S, p) => { mor(p, -5); return 'Sanción económica máxima del régimen interno.'; }],
        ['drop', 'Apartarle 2 partidos', (S, p) => { ban(p, 2); mor(p, -10); board(S, 1); return 'Fuera de las dos próximas convocatorias.'; }],
        ['support', 'Escuchar su versión', (S, p) => { mor(p, 4); board(S, -1); return 'Asegura que actuó en defensa propia.'; }]
      ]
    },
    clubFineStadium: {
      club: true,
      cond: (S, cid) => (S.log && S.log.crowd[cid] || 0) >= 2,
      title: (S, p, c) => `Cierre parcial del estadio del ${c.name}`,
      body: (S, p, c) => `Competición sanciona a ${c.name} por la reincidencia de incidentes en sus gradas: multa y cierre de una grada en el próximo partido en casa.`,
      now: (S, p, c) => { const f = fineClub(S, c.id, 45000); if (c.id === S.user && S.com) S.com.closure = 1; return `Multa de ${U.money(f)}.`; },
      opts: [['ok', 'Acatar la sanción', () => 'El club acata la resolución.'], ['appeal', 'Recurrir', (S) => (Math.random() < 0.3 ? (S.com.closure = 0, 'Apelación estima el recurso: no habrá cierre.') : 'Recurso desestimado.')]]
    },
    charity: {
      pick: () => 1,
      title: (S, p) => `${p.short} visita a niños hospitalizados`,
      body: (S, p) => `${p.name} pasa la tarde en la planta de pediatría y dona material del club.`,
      now: (S, p) => { mor(p, 5); fans(S, 0.004); },
      opts: null
    },
    newParent: {
      pick: (S, p) => (p.age >= 24 ? 2 : 0.3),
      title: (S, p) => `${p.short} ${g(S, 'se convierte en padre', 'se convierte en madre')}`,
      body: (S, p) => `${g(S, 'El jugador', 'La jugadora')} anuncia en redes el nacimiento de su primer hijo.`,
      now: (S, p) => mor(p, 10),
      opts: null
    },
    milestone: {
      pick: (S, p) => (p.age >= 27 ? 2 : 0.5),
      title: (S, p) => `${p.short} alcanza los ${U.pick([100, 200, 250, 300])} partidos como profesional`,
      body: (S, p, c) => `${c.name} homenajea a ${p.name} antes del entrenamiento.`,
      now: (S, p) => mor(p, 4),
      opts: null
    },
    fanFavourite: {
      pick: (S, p) => (S.stats[p.id] ? S.stats[p.id][3] / Math.max(1, S.stats[p.id][0]) : 6) - 5.5,
      title: (S, p) => `La afición elige a ${p.short} ${g(S, 'jugador', 'jugadora')} del mes`,
      body: (S, p) => `Las votaciones en la app oficial del club premian el gran momento de ${p.name}.`,
      now: (S, p) => { mor(p, 6); fans(S, 0.002); },
      opts: null
    }
  };

  // ------------------------------------------------------------ Probabilidades
  function seasonProb(S, ev, clubId) {
    let p = ev.p;
    const c = S.clubs[clubId];
    const country = S.leagues[c.league].country;
    if (ev.id === 'taxFraud' && country === 'España') p *= 2;
    if (S.gender === 'F' && ['domesticViolence', 'sexualMisconduct', 'streetFight', 'drivingOffence'].includes(ev.id)) p *= 0.2;
    if (clubId === S.user && ev.tone === 'neg') {
      const b = TL.Manager.B(S);
      p *= ['transferRequest', 'trainingFight', 'coachClash', 'indiscipline'].includes(ev.id) ? b.conflict : b.scandal;
      p *= 1 - TL.Commerce.fx(S, 'shield') * 0.3;
    }
    return p;
  }

  /** Resumen de riesgos de la temporada (para la UI y la documentación). */
  function risk(S) {
    const rows = TL.EventsData.SEASON.map(ev => ({ id: ev.id, tone: ev.tone, cat: ev.cat, base: ev.p, p: seasonProb(S, ev, S.user) }));
    const neg = rows.filter(r => r.tone === 'neg');
    const any = 1 - neg.reduce((a, r) => a * (1 - r.p), 1);
    const grave = ['taxFraud', 'betting', 'doping', 'recreationalDrugs', 'domesticViolence', 'sexualMisconduct', 'streetFight', 'carAccident'];
    const anyGrave = 1 - rows.filter(r => grave.includes(r.id)).reduce((a, r) => a * (1 - r.p), 1);
    const M = TL.EventsData.MATCH, n = S.fixtures ? S.fixtures.length : 38;
    const perMatch = q => 1 - Math.pow(1 - q, n);
    const crowdAny = U.sum(Object.values(M.crowd)) * 0.5;
    return {
      rows, any, anyGrave, expected: U.sum(neg, r => r.p),
      match: {
        crowd: perMatch(crowdAny), racism: perMatch(M.crowd.racism * 0.5), fight: perMatch(M.player.fight * 0.5),
        confront: perMatch(M.player.confront * 0.5), refAssault: perMatch(M.player.refAssault * 0.5)
      }
    };
  }

  const LABEL = {
    transferRequest: 'Petición de salida', trainingFight: 'Pelea en el entrenamiento', coachClash: 'Choque con el entrenador',
    indiscipline: 'Indisciplina', socialMedia: 'Polémica en redes', nightlife: 'Fiesta en mal momento', agentDrama: 'Pulso del representante',
    drivingOffence: 'Infracción de tráfico grave', carAccident: 'Accidente de tráfico', burglary: 'Robo en su casa',
    taxFraud: 'Investigación fiscal', betting: 'Apuestas deportivas', doping: 'Positivo por dopaje', recreationalDrugs: 'Drogas recreativas',
    domesticViolence: 'Violencia de género', sexualMisconduct: 'Acusación de agresión sexual', streetFight: 'Detención por pelea',
    clubFineStadium: 'Cierre parcial del estadio', refereeComplaint: 'Queja formal por el arbitraje',
    charity: 'Acción solidaria', newParent: 'Paternidad/maternidad', milestone: 'Hito personal', fanFavourite: 'Favorito de la afición'
  };

  // ------------------------------------------------------------ Semana
  function weekly(S) {
    const L = W.userLeague(S);
    const n = S.fixtures.length;
    let aiNews = 0;
    for (const cid of L.clubs) {
      const c = S.clubs[cid];
      const sq = W.squad(S, cid);
      if (sq.length < 5) continue;
      for (const def of TL.EventsData.SEASON) {
        const ev = EV[def.id];
        if (!ev) continue;
        const p = seasonProb(S, def, cid);
        const pw = 1 - Math.pow(1 - p, 1 / n);
        if (Math.random() >= pw) continue;
        if (ev.cond && !ev.cond(S, cid)) continue;
        if (cid !== S.user && def.tone === 'pos' && Math.random() < 0.7) continue; // menos ruido
        if (cid !== S.user && ++aiNews > 4) continue;
        fire(S, def, ev, c, sq);
      }
    }
    // Rumores de mercado
    if (Math.random() < 0.35) rumor(S);
  }

  function fire(S, def, ev, c, sq) {
    let p = null, q = null;
    if (!ev.club) {
      const cands = sq.filter(x => x.club === c.id);
      p = U.weighted(cands, x => Math.max(0.01, ev.pick(S, x, c)));
      if (ev.two) q = U.pick(cands.filter(x => x !== p)) || null;
      if (!p || (ev.two && !q)) return;
    }
    CTX = c.id;
    let nowTxt = '';
    try { nowTxt = ev.now ? ev.now(S, p, ev.two ? q : c) : ''; } finally { CTX = null; }
    const fixedNow = typeof nowTxt === 'string' ? nowTxt : '';
    const title = ev.title(S, p, c);
    const body = ev.body(S, p, c, q) + (fixedNow ? ' ' + fixedNow : '');
    add(S, def.cat, title, body, c.id, p ? p.id : null, def.tone);
    if (c.id === S.user) {
      let extra = '';
      if (ev.severity) extra = sponsorReaction(S, ev.severity * 0.5);
      if (ev.opts) {
        TL.Game.mail(S, title, body + extra, 'decision', { ev: def.id, pid: p ? p.id : null, qid: q ? q.id : null, opts: ev.opts.map(o => [o[0], o[1]]) });
      } else {
        TL.Game.mail(S, title, body + extra, def.tone === 'pos' ? 'good' : 'news');
      }
      if (def.tone === 'neg') board(S, -0.5 * TL.Manager.B(S).crisis);
    }
  }

  function decide(S, msg, key) {
    if (!msg || msg.done || !msg.data) return { ok: false, msg: 'Decisión no disponible' };
    const ev = EV[msg.data.ev] || MATCH_DECISIONS[msg.data.ev];
    const opt = ev && (ev.opts || []).find(o => o[0] === key);
    if (!opt) return { ok: false, msg: 'Opción no válida' };
    const p = msg.data.pid != null ? S.players[msg.data.pid] : null;
    const q = msg.data.qid != null ? S.players[msg.data.qid] : null;
    CTX = S.user;
    let res = '';
    try { res = opt[2](S, p, q, msg.data) || ''; } finally { CTX = null; }
    msg.done = true; msg.res = `${opt[1]} · ${res}`;
    W.dirty(S);
    return { ok: true, msg: res };
  }

  function rumor(S) {
    const L = W.userLeague(S);
    const big = S.clubs.filter(c => S.leagues[c.league].playable && c.rep >= 78);
    const target = U.pick(L.clubs.map(id => W.squad(S, id).sort((a, b) => b.ovr - a.ovr)[0]).filter(Boolean));
    const club = U.pick(big.filter(c => target && c.id !== target.club));
    if (!target || !club) return;
    const amount = W.value(S, target) * U.rand(1, 1.6);
    add(S, 'rumor', `${club.name} sigue de cerca a ${target.short}`,
      U.pick([`Según la prensa, ${club.name} estaría dispuesto a pagar ${U.money(amount)} por ${target.name}.`,
        `Ojeadores de ${club.name} vieron en directo a ${target.name} el último fin de semana.`,
        `El entorno de ${target.name} no descarta escuchar ofertas de ${club.name}.`]), target.club, target.id, 'neu');
  }

  // ------------------------------------------------------------ Jornada
  const MATCH_DECISIONS = {
    refControversy: {
      opts: [
        ['complain', 'Quejarse en rueda de prensa', (S) => {
          fans(S, 0.003);
          if (Math.random() < 0.3) { const f = fineClub(S, S.user, 6000); board(S, -1); return `La afición lo aplaude, pero Competición te multa con ${U.money(f)}.`; }
          return 'La afición aplaude tus palabras.';
        }],
        ['formal', 'Queja formal al Comité de Árbitros', (S) => { board(S, 0.5); return 'El club remite un informe con los vídeos de las jugadas.'; }],
        ['silent', 'No hablar del árbitro', () => 'Prefieres centrarte en lo deportivo.']
      ]
    },
    redCard: {
      opts: [
        ['appeal', 'Recurrir la tarjeta', (S, p) => { if (p && Math.random() < 0.3) { p.sus = Math.max(0, p.sus - 1); return 'Competición reduce la sanción en un partido.'; } return 'Recurso desestimado.'; }],
        ['fine', 'Multa interna', (S, p) => { if (p) mor(p, -6); return 'Le sancionas por dejar al equipo con diez.'; }],
        ['support', 'Respaldarle', (S, p) => { if (p) mor(p, 4); return 'Le defiendes ante los medios.'; }]
      ]
    }
  };

  const CROWD_FINE = { crowd_insults: 6000, crowd_racism: 45000, crowd_objects: 12000, crowd_pyro: 8000, crowd_invader: 4000, crowd_ultrasFight: 30000 };
  const CROWD_TXT = {
    crowd_insults: (c, r) => [`Insultos desde la grada en el ${c.name}–${r.name}`, `El acta arbitral recoge cánticos e insultos de la afición de ${c.name}. LaLiga lo denunciará ante Competición.`],
    crowd_racism: (c, r) => [`Insultos racistas en el estadio de ${c.name}`, `El árbitro activó el protocolo antirracismo. El club identifica a los autores y se enfrenta a una fuerte sanción.`],
    crowd_objects: (c) => [`Lanzamiento de objetos desde la grada de ${c.name}`, 'Un mechero impacta cerca de un asistente. Competición abre expediente.'],
    crowd_pyro: (c) => [`Bengalas en la grada de la afición de ${c.name}`, 'El partido se detuvo unos minutos por el humo.'],
    crowd_invader: (c) => [`Un aficionado de ${c.name} invade el césped`, 'El espontáneo fue detenido por la seguridad privada.'],
    crowd_ultrasFight: (c, r) => [`Pelea entre ultras antes del ${c.name}–${r.name}`, 'La Policía detiene a varios radicales tras los enfrentamientos en los alrededores del estadio.']
  };

  function afterRound(S, results) {
    const L = W.userLeague(S);
    S.log = S.log || { crowd: {} };
    const tab = TL.Season.table(S);
    // Titulares deportivos
    for (const r of results) {
      const h = S.clubs[r.h], a = S.clubs[r.a];
      const diff = r.hg - r.ag;
      const winner = diff > 0 ? h : diff < 0 ? a : null, loser = diff > 0 ? a : diff < 0 ? h : null;
      const score = `${r.hg}-${r.ag}`;
      const mine = r.h === S.user || r.a === S.user;
      if (Math.abs(diff) >= 4) add(S, 'liga', `Goleada de ${winner.name} (${score})`, `${winner.name} pasa por encima de ${loser.name}.`, winner.id, null, 'neu');
      else if (winner && loser.rep - winner.rep >= 6) add(S, 'liga', `¡Campanada! ${winner.name} tumba a ${loser.name}`, `Nadie esperaba el ${score} ante uno de los gallitos de la liga.`, winner.id, null, 'neu');
      else if (mine) {
        const me = S.clubs[S.user], opp = r.h === S.user ? a : h;
        const res = winner === me ? 'gana a' : winner ? 'cae ante' : 'empata con';
        add(S, 'liga', `${me.name} ${res} ${opp.name} (${score})`, `Crónica de la jornada ${S.week} de ${L.name}.`, S.user, r.mom, 'neu');
      }
      const count = {};
      for (const pid of r.scorers || []) count[pid] = (count[pid] || 0) + 1;
      for (const pid in count) {
        if (count[pid] >= 3) {
          const p = S.players[pid];
          add(S, 'liga', `Hat-trick de ${p.short}`, `${p.name} firma ${count[pid]} goles en el ${h.name} ${score} ${a.name}.`, p.club, p.id, 'pos');
          if (p.club === S.user) mor(p, 8);
        }
      }
      // Incidentes
      for (const inc of r.incidents || []) incident(S, r, inc);
    }
    // Nuevo líder
    const leader = tab[0] && tab[0].pj ? tab[0].id : null;
    if (leader != null && S.leader != null && leader !== S.leader) {
      add(S, 'liga', `${S.clubs[leader].name}, nuevo líder de ${L.name}`, `Tras la jornada ${S.week}, ${S.clubs[leader].name} se coloca en lo más alto con ${tab[0].pts} puntos.`, leader, null, 'neu');
    }
    S.leader = leader;
    // Tarjetas del usuario por conducta violenta y ciclos de amarillas
    for (const r of results) {
      for (const pid of r.yellowBans || []) {
        const p = S.players[pid];
        if (p.club === S.user) TL.Game.mail(S, 'Ciclo de amarillas', `${p.name} ve su quinta amarilla y cumplirá un partido de sanción.`, 'med');
      }
    }
  }

  function incident(S, r, inc) {
    const teamClub = inc.team === 0 ? r.h : inc.team === 1 ? r.a : -1;
    const c = teamClub >= 0 ? S.clubs[teamClub] : null;
    const other = inc.team === 0 ? S.clubs[r.a] : S.clubs[r.h];
    const mine = r.h === S.user || r.a === S.user;
    if (inc.type.startsWith('crowd_')) {
      S.log.crowd[c.id] = (S.log.crowd[c.id] || 0) + 1;
      const [t, b] = CROWD_TXT[inc.type](c, other);
      const fine = fineClub(S, c.id, CROWD_FINE[inc.type] * U.rand(0.7, 1.3));
      // En prensa solo trascienden los graves o los que afectan a tu club
      const serious = ['crowd_racism', 'crowd_ultrasFight', 'crowd_invader'].includes(inc.type);
      if (mine || serious || Math.random() < 0.2) add(S, 'aficion', t, `${b} Multa: ${U.money(fine)}.`, c.id, null, 'neg');
      if (c.id === S.user) {
        if (inc.type === 'crowd_racism') { board(S, -3); fans(S, -0.004); if (Math.random() < 0.35 && S.com) S.com.closure = 1; }
        TL.Game.mail(S, t, `${b} El club deberá pagar ${U.money(fine)}.`, 'news');
      }
      return;
    }
    if (['fight', 'confront', 'refAssault'].includes(inc.type)) {
      const p = S.players[inc.pid];
      const txt = {
        fight: [`${p.short} pierde los nervios y agrede a un rival`, `${p.name} fue expulsado por un puñetazo en el ${S.clubs[r.h].name}–${S.clubs[r.a].name}. Le esperan 3 partidos de sanción.`],
        confront: [`${p.short} se encara con el árbitro`, `El acta recoge insultos de ${p.name} al colegiado. Competición le castiga con 4 partidos.`],
        refAssault: [`ESCÁNDALO: ${p.short} agrede al árbitro`, `${p.name} empujó y golpeó al colegiado tras una decisión polémica. La federación le suspende 12 partidos y estudia medidas mayores. El fútbol entero condena la agresión.`]
      }[inc.type];
      add(S, inc.type === 'refAssault' ? 'polemica' : 'arbitraje', txt[0], txt[1], p.club, p.id, 'neg');
      if (p.club === S.user) {
        if (inc.type === 'refAssault') { board(S, -8 * TL.Manager.B(S).crisis); fans(S, -0.02); fineClub(S, S.user, 60000); sponsorReaction(S, 0.5); }
        TL.Game.mail(S, txt[0], txt[1], 'decision', { ev: 'redCard', pid: p.id, opts: MATCH_DECISIONS.redCard.opts.map(o => [o[0], o[1]]) });
      }
      return;
    }
    if (['penaltyDenied', 'wrongDisallowed', 'phantomPenalty', 'illegalGoal'].includes(inc.type)) {
      // inc.team = equipo perjudicado
      const hurt = inc.team === 0 ? S.clubs[r.h] : S.clubs[r.a];
      const what = {
        penaltyDenied: 'un penalti clamoroso no señalado',
        wrongDisallowed: 'un gol anulado por un fuera de juego dudoso',
        phantomPenalty: 'un penalti inexistente en contra',
        illegalGoal: 'un gol en fuera de juego que subió al marcador'
      }[inc.type];
      add(S, 'arbitraje', `Polémica arbitral en el ${S.clubs[r.h].name}–${S.clubs[r.a].name}`,
        `${hurt.name} denuncia ${what} (min. ${inc.min}). Árbitro: ${r.ref ? r.ref.name : '—'}.`, hurt.id, null, 'neg');
      if (hurt.id === S.user && mine) {
        teamMor(S, -1);
        TL.Game.mail(S, 'Polémica arbitral', `Tu equipo ha sido perjudicado por ${what}. ¿Cómo reaccionas?`, 'decision',
          { ev: 'refControversy', opts: MATCH_DECISIONS.refControversy.opts.map(o => [o[0], o[1]]) });
      }
    }
  }

  // ------------------------------------------------------------ Moral
  function morale(S, results) {
    const b = TL.Manager.B(S);
    const sq = W.squad(S, S.user);
    const um = results.find(r => r.h === S.user || r.a === S.user);
    const res = um ? ((um.h === S.user ? um.hg - um.ag : um.ag - um.hg)) : null;
    const median = sq.map(p => p.ovr).sort((a, x) => a - x)[Math.floor(sq.length / 2)] || 60;
    const target = 68 + b.moraleBase;
    for (const p of sq) {
      if (p.mor == null) p.mor = 70;
      let d = (target - p.mor) * 0.08;
      if (um) {
        const played = um.ratings && um.ratings[p.id] != null;
        if (played) {
          d += 1;
          if (um.ratings[p.id] >= 7.5) d += 2;
          else if (um.ratings[p.id] <= 5.5) d -= 2 * b.moraleDrop;
        } else if (TL.Engine.available(p) && p.ovr >= median) d -= 2 * b.moraleDrop;
        d += res > 0 ? 2 : res < 0 ? -2 * b.moraleDrop : 0;
      }
      if (p.contract <= S.season + 1 && p.age < 30 && p.ovr >= S.clubs[S.user].rep - 3) d -= 0.5;
      mor(p, d);
    }
    // Clubes IA: la moral tiende a 70
    const L = W.userLeague(S);
    for (const cid of L.clubs) {
      if (cid === S.user) continue;
      for (const p of W.squad(S, cid)) if (p.mor != null && p.mor !== 70) p.mor += (70 - p.mor) * 0.1;
    }
  }

  function moraleLabel(m) {
    if (m == null) m = 70;
    return m >= 85 ? ['Eufórico', '😄'] : m >= 70 ? ['Contento', '🙂'] : m >= 50 ? ['Normal', '😐'] : m >= 30 ? ['Descontento', '😕'] : ['Muy molesto', '😠'];
  }

  TL.News = { add, CAT, LABEL, EV, risk, weekly, decide, afterRound, morale, moraleLabel, seasonProb };
})();
