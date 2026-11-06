/* TOUCHLINE — orquestación: carga de datos, partida, guardado y buzón */
(function () {
  'use strict';
  const TL = window.TL;
  const U = TL.U, W = TL.World, E = TL.Engine;

  const SAVE_KEY = 'touchline.save.v1';
  const META_KEY = 'touchline.meta.v1';
  const DATA_FILES = { M: 'data/game/men.js', F: 'data/game/women.js' };

  const loading = {};
  function loadData(gender) {
    window.TL_DATA = window.TL_DATA || {};
    if (window.TL_DATA[gender]) return Promise.resolve(window.TL_DATA[gender]);
    if (loading[gender]) return loading[gender];
    loading[gender] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = DATA_FILES[gender];
      s.onload = () => (window.TL_DATA[gender] ? resolve(window.TL_DATA[gender]) : reject(new Error('Datos vacíos')));
      s.onerror = () => { loading[gender] = null; reject(new Error('No se pudo cargar ' + DATA_FILES[gender])); };
      document.head.appendChild(s);
    });
    return loading[gender];
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
    loadData,
    preview,

    newGame(data, clubId, manager) {
      const S = W.create(data, clubId, manager);
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
      const data = await loadData(save.gender);
      Game.S = W.restore(data, save);
      return Game.S;
    },

    save() {
      const S = Game.S;
      if (!S) return true;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(W.serialize(S)));
        localStorage.setItem(META_KEY, JSON.stringify({
          club: S.clubs[S.user].name, season: S.season, week: S.week, gender: S.gender,
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
      const data = await loadData(save.gender);
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
      Game.save();
      return Object.assign(out, { m, p: cp });
    },

    /** Completa la jornada. match: Match del usuario terminado, o null para simularlo. */
    completeRound(match) {
      const S = Game.S;
      if (S.over || !S.fixtures[S.week]) return [];
      if (match && match._applied) return []; // un partido solo cuenta una vez
      if (match) match._applied = true;
      if (match && match.cup) { const out = TL.Cups.completeUser(S, match.finish(), match.cup); Game.save(); return out; }
      const res = match ? match.finish() : null;
      const results = TL.Season.playRound(S, res);
      Game.save();
      return results;
    }
  };

  TL.Game = Game;
})();
