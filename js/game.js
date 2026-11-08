/* TOUCHLINE — orquestación: carga de datos, partida, guardado y buzón */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U, W = TL.World, E = TL.Engine;

  const SAVE_KEY = 'touchline.save.v1';
  const META_KEY = 'touchline.meta.v1';
  /*
   * Base de datos: la nueva (sin licencias, data/game/) o la antigua (data/legacy/), que se conserva
   * para abrir las partidas guardadas con ella. Se elige al cargar la página: abrir una partida de la
   * otra base recarga la página con la base que toca.
   */
  const DB_KEY = 'touchline.db';
  const DB = (() => { try { return localStorage.getItem(DB_KEY) === 'legacy' ? 'legacy' : 'v3'; } catch (e) { return 'v3'; } })();
  const DATA_FILES = DB === 'legacy'
    ? { M: 'data/legacy/men.js', F: 'data/legacy/women.js', extra: ['data/legacy/crests.js', 'data/legacy/kits.js', 'data/legacy/pyramid.js'] }
    : { M: 'data/game/men.js', F: 'data/game/women.js', extra: [] };

  function script(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }
  let extras = null;
  const loading = {};
  function loadData(gender) {
    window.TL_DATA = window.TL_DATA || {};
    if (window.TL_DATA[gender]) return Promise.resolve(window.TL_DATA[gender]);
    if (loading[gender]) return loading[gender];
    if (!extras) extras = Promise.all(DATA_FILES.extra.map(script));
    loading[gender] = extras.then(() => script(DATA_FILES[gender])).then(() => {
      if (!window.TL_DATA[gender]) throw new Error('Datos vacíos');
      return window.TL_DATA[gender];
    }).catch(e => { loading[gender] = null; throw e; });
    return loading[gender];
  }
  /** Cambia de base de datos y recarga; al volver, sigue con lo que se iba a hacer (cargar o empezar). */
  function switchDB(db, then) {
    try {
      if (db === 'legacy') localStorage.setItem(DB_KEY, 'legacy'); else localStorage.removeItem(DB_KEY);
      if (then) sessionStorage.setItem('touchline.then', then);
    } catch (e) { /* nada */ }
    location.reload();
    return new Promise(() => {});
  }

  /** Datos de una carrera: los del juego más las divisiones inferiores de esa versión (0 = sin ellas,
      para las partidas guardadas antes de que existieran). */
  async function careerData(gender, pyr) {
    const data = await loadData(gender);
    return pyr ? W.pyramid(data, pyr) : data;
  }

  /** Vista previa de clubes para elegir equipo (sin crear la partida aún). */
  function preview(data) {
    const S = { players: [], clubs: [], leagues: [] };
    const reps = {};
    const byClub = {};
    for (const r of data.players) (byClub[r[2]] || (byClub[r[2]] = [])).push(r[7]);
    data.clubs.forEach((c, i) => {
      const top = (byClub[i] || []).sort((a, b) => b - a).slice(0, 16);
      reps[i] = top.length ? U.sum(top) / top.length : 50;
    });
    return { reps, counts: Object.fromEntries(Object.entries(byClub).map(([k, v]) => [k, v.length])) };
  }

  const Game = {
    S: null,
    DB, switchDB,
    loadData,
    careerData,
    preview,

    newGame(data, clubId, manager, extra) {
      const S = W.create(data, clubId, manager);
      S.mgrG = (extra && extra.g) || 'M';
      S.face = (extra && extra.face) || null;
      W.dirty(S);
      TL.Season.makeFixtures(S);
      TL.Season.setObjective(S);
      S.tactics.formation = E.bestFormation(W.squad(S, S.user)).formation;
      S.tactics.slots = E.autoLineup(W.squad(S, S.user), S.tactics.formation, false);
      const c = S.clubs[S.user];
      Game.mail(S, `Bienvenido a ${c.name}`,
        `La directiva te da la bienvenida, ${S.manager}. Objetivo para la temporada: ${S.board.text}. ` +
        `Saldo disponible: ${U.money(c.cash)}. Presupuesto salarial: ${U.money(c.wageBudget)}/sem ` +
        `(gasto actual ${U.money(W.wageBill(S, S.user))}/sem). El mercado de verano está abierto hasta la jornada 3.`, 'board');
      TL.News.add(S, 'club', `${S.manager}, nuevo entrenador de ${c.name}`,
        `El club presenta a su nuevo técnico con un objetivo claro: ${S.board.text.toLowerCase()}.`, S.user, null, 'pos');
      Game.S = S;
      TL.Cups.newSeason(S);
      TL.Market.aiListings(S);
      Game.save();
      return S;
    },

    meta() {
      try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { return null; }
    },

    async load() {
      let save;
      try { save = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { save = null; }
      if (!save) throw new Error('No hay partida guardada');
      // Partida de la otra base de datos (las anteriores a la nueva no llevan marca: son de la antigua)
      if ((save.db || 'legacy') !== DB) return switchDB(save.db || 'legacy', 'load');
      const data = await careerData(save.gender, save.pyr || 0);
      Game.S = W.restore(data, save);
      return Game.S;
    },

    save() {
      if (Game.S && Game.S.mode === 'tour') return; // el torneo no pisa la partida de carrera
      const S = Game.S;
      if (!S) return true;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(W.serialize(S)));
        localStorage.setItem(META_KEY, JSON.stringify({
          club: S.clubs[S.user].name, season: S.season, week: S.week, gender: S.gender, db: S.db || 'legacy',
          manager: S.manager, savedAt: Date.now(), fired: !!S.fired
        }));
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    },

    wipe() {
      try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(META_KEY); } catch (e) { /* nada */ }
      Game.S = null;
    },

    exportSave() {
      return JSON.stringify(W.serialize(Game.S));
    },

    async importSave(text) {
      const save = JSON.parse(text);
      if (!save || !save.pb || !save.gender) throw new Error('Archivo de partida no válido');
      if ((save.db || 'legacy') !== DB) {
        // Se guarda tal cual y se abre con su base de datos tras recargar
        localStorage.setItem(SAVE_KEY, text);
        return switchDB(save.db || 'legacy', 'load');
      }
      const data = await careerData(save.gender, save.pyr || 0);
      Game.S = W.restore(data, save);
      Game.save();
      return Game.S;
    },

    mail(S, title, body, kind, data) {
      S.inbox.unshift({ id: S.msgId++, s: S.season, w: S.week, title, body, kind: kind || 'news', data: data || null, read: false, done: false });
      if (S.inbox.length > 80) S.inbox.length = 80;
    },

    /** Partido del usuario de la jornada actual (con narración). */
    startMatch() {
      const S = Game.S;
      // Primero, el partido de copa de esta semana (si lo hay)
      const cp = TL.Cups.pendingUser(S);
      if (cp) { const m = new E.Match(S, cp.home, cp.away, { detail: true }); m.cup = cp; return m; }
      const fx = TL.Season.nextFixture(S);
      if (!fx) return null;
      return new E.Match(S, fx[0], fx[1], { detail: true });
    },

    /** Partido de copa en resultado rápido. */
    quickCup() {
      const S = Game.S;
      const cp = TL.Cups.pendingUser(S);
      if (!cp) return null;
      const m = new E.Match(S, cp.home, cp.away);
      m.cup = cp; m._applied = true;
      const out = TL.Cups.completeUser(S, m.simulate().finish(), cp);
      if (S.mode === 'tour') TL.Tour.round(S);
      Game.save();
      return Object.assign(out, { m, p: cp });
    },

    /** Completa la jornada. match: Match del usuario terminado, o null para simularlo. */
    completeRound(match) {
      const S = Game.S;
      if (S.mode === 'tour') { TL.Tour.round(S); return []; }
      if (S.over || !S.fixtures[S.week]) return [];
      if (match && match._applied) return []; // un partido solo cuenta una vez
      if (match) match._applied = true;
      if (match && match.cup) {
        const out = TL.Cups.completeUser(S, match.finish(), match.cup);
        if (S.mode === 'tour') TL.Tour.round(S);
        Game.save();
        return out;
      }
      const res = match ? match.finish() : null;
      const results = TL.Season.playRound(S, res);
      Game.save();
      return results;
    }
  };

  TL.Game = Game;
})();
