/*
 * UltiVoz — núcleo sin interfaz: interpretación de la narración y cálculo de estadísticas.
 * Todo es determinístico y local (sin red). Se usa desde el navegador y desde las pruebas.
 */
(function (root) {
  'use strict';

  // ---------- Normalización de texto ----------

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes (ñ -> n)
      .replace(/[^a-z0-9#\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Clave "fonética" aproximada para español: lo que suena igual queda igual.
  function phonetic(w) {
    return w
      .replace(/ch/g, '#')
      .replace(/qu/g, 'k')
      .replace(/gu([ei])/g, 'g$1')
      .replace(/g([ei])/g, 'j$1')
      .replace(/c([ei])/g, 's$1')
      .replace(/c/g, 'k')
      .replace(/z/g, 's')
      .replace(/v/g, 'b')
      .replace(/ll/g, 'y')
      .replace(/x/g, 'ks')
      .replace(/h/g, '')
      .replace(/y$/, 'i')
      .replace(/(.)\1+/g, '$1');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }

  // Palabras comunes que nunca deben confundirse con un nombre (salvo coincidencia exacta con un alias).
  var STOPWORDS = {};
  ('a al el la le lo los las les de del y e o u con para pa pasa pase pasan pasando que se su sus ' +
   'ahi alla aqui aca muy bien otra otro vez ahora va van ve es en un una uno por pero mas no si ' +
   'me mi tu te ya esta este eso esa esto hay ok okay dale buena bueno bien mal como cuando donde ' +
   'claro listo vamos venga oye mira hombre parce mano man tiene tira tiro lanza lanzo recibe recibio ' +
   'agarra atrapa coge cogio larga largo corta corto hacia hasta luego entonces otra vez nada todo ' +
   'ellos ellas nosotros nos les salen sale entra pull lado medio rapido manda mando abre abierto ' +
   'numero hace hizo')
    .split(' ').forEach(function (w) { if (w) STOPWORDS[w] = true; });

  var NUMBER_WORDS = {
    cero: 0, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
    dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
    veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
    veintinueve: 29, treinta: 30
  };

  // ---------- Palabras clave (frases → marcadores) ----------
  // El orden importa: las frases más específicas van primero.
  var MARKERS = [
    ['xundox', /\b(borra|borrar|borralo|borrala|cancela|cancelar|corrijo|corrige|me equivoque|error mio|deshacer|deshaz|no fue (gol|punto)|anulado|anulalo|no vale)\b/g],
    ['xthemx', /\b(nos (anotan|anotaron|anota|anoto|meten|metieron|hacen|hicieron|marcan|marcaron)( el)?( punto| gol)?|(punto|gol|anotan|anotaron|marcan) (de|para) (ellos|el rival|los otros)|(anotan|anotaron) ellos|ellos (anotan|anotaron|marcan)|punto rival|gol rival)\b/g],
    ['xoppx', /\b(la pierden|pierden ellos|ellos (la )?pierden|error de ellos|(turn|turnover|drop|throwaway) de ellos|se les cae|la dejan caer|la botan|la tiran afuera|recuperamos)\b/g],
    ['xdropx', /\b(se le (cae|cayo)|la (deja|dejo) caer|se la come|dropea|dropeo|dropear|dropeada|drop|drope|drops|trop|drob)\b/g],
    ['xdx de', /\b((de|d|dee) de)\b/g],
    ['xdx', /\b(bloqueo|bloquea|bloqueada|bloqueado|block|bloc|blok|bloque|defensa|la tumba|tumba|la baja|dee|d)\b/g],
    ['xtax', /\b(throwaway|throw away|trowaway|trow away|trogue|tro guey|la pierde|la perdio|pierde|perdio|perdida|turnover|turn over|turn|la bota|la boto|bota|boto|afuera|fuera|stall|estol)\b/g],
    ['xgolx', /\b(go+l|golazo|punto|anota|anoto|score|marca|marco|adentro)\b/g]
  ];
  var MARKER_TYPE = { xundox: 'undo', xthemx: 'them', xoppx: 'opp', xdropx: 'drop', xdx: 'd', xtax: 'ta', xgolx: 'goal' };

  function applyMarkers(norm) {
    var s = ' ' + norm + ' ';
    MARKERS.forEach(function (m) { s = s.replace(m[1], ' ' + m[0] + ' '); });
    return s.replace(/\s+/g, ' ').trim();
  }

  // ---------- Coincidencia de nombres ----------

  function buildMatcher(roster) {
    var keys = [];
    var byNumber = {};
    (roster || []).forEach(function (p) {
      var names = [p.name].concat(p.aliases || []);
      names.forEach(function (n) {
        var norm = normalize(n);
        if (!norm) return;
        var compact = norm.replace(/ /g, '');
        keys.push({ compact: compact, phon: phonetic(compact), id: p.id });
      });
      if (p.number !== undefined && p.number !== null && p.number !== '') {
        byNumber[String(parseInt(p.number, 10))] = p.id;
      }
    });
    return { keys: keys, byNumber: byNumber };
  }

  function maxDistFor(len) {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    return 2;
  }

  // Devuelve {id, dist} o null. dist 0 = coincidencia exacta (o fonéticamente idéntica).
  function matchName(compact, matcher, allowStop) {
    if (!compact) return null;
    var exact = null, i, k;
    for (i = 0; i < matcher.keys.length; i++) {
      if (matcher.keys[i].compact === compact) { exact = matcher.keys[i].id; break; }
    }
    if (exact) return { id: exact, dist: 0 };
    if (!allowStop && STOPWORDS[compact]) return null;
    if (compact.length < 3) return null;
    var ph = phonetic(compact);
    var best = null, bestDist = Infinity;
    for (i = 0; i < matcher.keys.length; i++) {
      k = matcher.keys[i];
      var d = levenshtein(ph, k.phon);
      var limit = maxDistFor(Math.max(k.phon.length, ph.length));
      if (d > limit) continue;
      // Para nombres cortos exigimos que empiece con el mismo sonido (evita "como" → "Mono").
      if (d > 0 && k.phon.length < 6 && ph[0] !== k.phon[0]) continue;
      if (d < bestDist) { best = k.id; bestDist = d; }
    }
    return best ? { id: best, dist: bestDist } : null;
  }

  // ---------- Tokenización a elementos ----------

  // Busca primero entre los de la línea (aunque sea por parecido: lo normal es que el celular
  // escuche mal a alguien que está jugando). Si no aparece, en toda la plantilla, marcado "fuera de línea".
  function lookupName(compact, mLine, mAll, line, allowStop) {
    var a = mLine ? matchName(compact, mLine, allowStop) : null;
    if (a) return a;
    var b = matchName(compact, mAll, allowStop);
    if (b && mLine && line.indexOf(b.id) < 0) b.offLine = true;
    return b;
  }

  function tokenize(text, roster, line) {
    line = (line || []).filter(function (id) { return (roster || []).some(function (p) { return p.id === id; }); });
    var mAll = buildMatcher(roster);
    var mLine = line.length ? buildMatcher(roster.filter(function (p) { return line.indexOf(p.id) >= 0; })) : null;
    var norm = normalize(text);
    var tokens = applyMarkers(norm).split(' ').filter(Boolean);
    var items = [];
    var unknown = [];
    var i = 0;
    function player(m, heard, afterDe) {
      var it = { kind: 'player', id: m.id, dist: m.dist, heard: heard, afterDe: afterDe };
      if (m.offLine) it.offLine = true;
      items.push(it);
    }
    while (i < tokens.length) {
      var t = tokens[i];
      var prev = tokens[i - 1];
      var afterDe = prev === 'de' || prev === 'del';
      if (MARKER_TYPE[t]) {
        items.push({ kind: MARKER_TYPE[t] });
        i++; continue;
      }
      // Número de camiseta
      var num = null;
      if (/^\d{1,3}$/.test(t)) num = String(parseInt(t, 10));
      else if (NUMBER_WORDS.hasOwnProperty(t)) num = String(NUMBER_WORDS[t]);
      else if ((t === 'uno' || t === 'una') && (prev === 'el' || prev === 'numero')) num = '1';
      if (num !== null && (mLine && mLine.byNumber[num] || mAll.byNumber[num])) {
        var byLine = mLine && mLine.byNumber[num];
        player({ id: byLine || mAll.byNumber[num], dist: 0, offLine: !!mLine && !byLine }, t, afterDe);
        i++; continue;
      }
      // Bigrama (p. ej. "juan cho" → Juancho) si mejora la coincidencia de una sola palabra.
      var next = tokens[i + 1];
      var uni = lookupName(t, mLine, mAll, line, false);
      if (next && !STOPWORDS[t] && !MARKER_TYPE[next] && !STOPWORDS[next]) {
        var bi = lookupName(t + next, mLine, mAll, line, true);
        if (bi && (!uni || bi.dist < uni.dist)) {
          player(bi, t + ' ' + next, afterDe);
          i += 2; continue;
        }
      }
      if (uni) {
        player(uni, t, afterDe);
      } else if (!STOPWORDS[t] && t.length >= 3 && !/^\d+$/.test(t) && unknown.indexOf(t) < 0) {
        unknown.push(t);
      }
      i++;
    }
    return { items: items, unknown: unknown };
  }

  // ---------- Interpretación (máquina de estados) ----------

  // opts.start: quién tiene el disco al empezar ('us' en ataque, 'them' en defensa).
  function interpret(text, roster, line, opts) {
    var tk = tokenize(text, roster, line);
    var items = tk.items;
    var state = { events: [], holder: null, holderUnc: null, outcome: null };
    var history = [];

    function snapshot() {
      history.push({ events: state.events.slice(), holder: state.holder, holderUnc: state.holderUnc, outcome: state.outcome });
    }
    function unc(it) {
      if (!it) return null;
      if (it.offLine) return it.heard + ' (no está en la línea)';
      return it.dist > 0 ? it.heard : null;
    }
    function push(ev) {
      var heard = [].slice.call(arguments, 1).filter(Boolean);
      if (heard.length) ev.uncertain = heard.join(', ');
      state.events.push(ev);
    }
    function last() { return state.events[state.events.length - 1]; }

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var nx = items[i + 1];
      var nextPlayer = nx && nx.kind === 'player' ? nx : null;

      if (it.kind === 'undo') {
        if (history.length) {
          var h = history.pop();
          state.events = h.events; state.holder = h.holder; state.holderUnc = h.holderUnc; state.outcome = h.outcome;
        }
        continue;
      }
      // Después de un gol/punto en contra solo aceptamos correcciones.
      if (state.outcome) continue;

      if (it.kind === 'player') {
        if (state.holder && state.holder !== it.id) {
          snapshot();
          push({ type: 'pass', from: state.holder, to: it.id }, state.holderUnc, unc(it));
        }
        if (state.holder !== it.id) state.holderUnc = unc(it);
        state.holder = it.id;
        continue;
      }

      snapshot();
      var lp, explicit;
      switch (it.kind) {
        case 'drop':
          explicit = nextPlayer && nextPlayer.afterDe ? nextPlayer : null;
          lp = last();
          if (lp && lp.type === 'pass' && lp.to === state.holder && (!explicit || explicit.id === lp.to)) {
            state.events.pop();
            push({ type: 'drop', from: lp.from, to: lp.to }, lp.uncertain);
          } else if (explicit) {
            push({ type: 'drop', from: state.holder !== explicit.id ? state.holder : null, to: explicit.id }, unc(explicit));
          } else {
            push({ type: 'drop', from: null, to: state.holder }, state.holder ? null : 'sin receptor');
          }
          if (explicit) i++;
          state.holder = null;
          break;

        case 'ta':
          explicit = nextPlayer && nextPlayer.afterDe ? nextPlayer : null;
          if (explicit) {
            push({ type: 'throwaway', from: explicit.id }, unc(explicit));
            i++;
          } else {
            push({ type: 'throwaway', from: state.holder }, state.holder ? null : 'sin lanzador');
          }
          state.holder = null;
          break;

        case 'd':
          var prevIt = items[i - 1];
          if (nextPlayer && (nextPlayer.afterDe || !(prevIt && prevIt.kind === 'player'))) {
            push({ type: 'd', player: nextPlayer.id }, unc(nextPlayer));
            i++;
          } else if (prevIt && prevIt.kind === 'player') {
            // "Pipe bloquea": el nombre vino antes. Si eso generó un pase falso, lo quitamos.
            lp = last();
            if (lp && lp.type === 'pass' && lp.to === prevIt.id) state.events.pop();
            push({ type: 'd', player: prevIt.id }, unc(prevIt));
          } else {
            push({ type: 'd', player: null }, 'sin jugador');
          }
          state.holder = null;
          break;

        case 'goal':
          var scorer = state.holder;
          var scorerIt = null;
          if (nextPlayer && nextPlayer.afterDe) {
            scorerIt = nextPlayer; i++;
            if (state.holder && state.holder !== nextPlayer.id) {
              push({ type: 'pass', from: state.holder, to: nextPlayer.id }, state.holderUnc, unc(nextPlayer));
            }
            scorer = nextPlayer.id;
          }
          lp = last();
          var assist = lp && lp.type === 'pass' && lp.to === scorer ? lp.from : null;
          push({ type: 'goal', scorer: scorer, assist: assist }, unc(scorerIt), scorer ? null : 'sin anotador');
          state.outcome = 'us';
          state.holder = null;
          break;

        case 'them':
          push({ type: 'them' });
          state.outcome = 'them';
          state.holder = null;
          break;

        case 'opp':
          push({ type: 'opp' });
          state.holder = null;
          break;
      }
    }

    // Posesión actual: en un punto de defensa, si recuperamos el disco, atacamos (el punto sigue siendo de defensa).
    var poss = (opts && opts.start) || null;
    state.events.forEach(function (ev) {
      if (ev.type === 'pass' || ev.type === 'd' || ev.type === 'opp') poss = 'us';
      if (ev.type === 'drop' || ev.type === 'throwaway') poss = 'them';
    });
    if (state.holder) poss = 'us';
    if (state.outcome) poss = null;

    return { events: state.events, outcome: state.outcome, unknown: tk.unknown, possession: poss };
  }

  function outcomeOf(events) {
    for (var i = events.length - 1; i >= 0; i--) {
      if (events[i].type === 'goal') return 'us';
      if (events[i].type === 'them') return 'them';
    }
    return null;
  }

  // ---------- Estadísticas ----------

  function emptyLine() {
    return { points: 0, completions: 0, catches: 0, goals: 0, assists: 0, drops: 0, throwaways: 0, ds: 0, plusMinus: 0 };
  }

  // Tipo del siguiente punto: quien anota hace el pull del siguiente.
  // startType: 'O' si en el primer punto recibimos el pull, 'D' si lo hacemos nosotros.
  // halftimeAt: cantidad de puntos jugados al llegar al medio tiempo; el primer punto del
  // segundo tiempo es al revés del primero del partido.
  function nextPointType(points, startType, halftimeAt) {
    startType = startType || 'O';
    points = points || [];
    if (halftimeAt != null && points.length === halftimeAt) return startType === 'O' ? 'D' : 'O';
    if (!points.length) return startType;
    var last = points[points.length - 1];
    var oc = outcomeOf(last.events || []);
    if (oc === 'us') return 'D';
    if (oc === 'them') return 'O';
    return last.type || startType;
  }

  // Regla ABBA (WFDF): la proporción cambia cada dos puntos. firstRatio: '4H' o '4M'.
  function ratioFor(index, firstRatio) {
    var other = firstRatio === '4H' ? '4M' : '4H';
    return ((index + 1) >> 1) % 2 === 0 ? firstRatio : other;
  }

  function computeStats(points, roster, typeFilter) {
    var players = {};
    (roster || []).forEach(function (p) { players[p.id] = emptyLine(); });
    function P(id) { if (!id) return null; if (!players[id]) players[id] = emptyLine(); return players[id]; }
    var score = { us: 0, them: 0 };
    var od = { O: { played: 0, won: 0 }, D: { played: 0, won: 0 } };
    var conn = {};

    (points || []).forEach(function (pt) {
      var oc = outcomeOf(pt.events || []);
      if (oc === 'us') score.us++;
      if (oc === 'them') score.them++;
      if (od[pt.type] && oc) { od[pt.type].played++; if (oc === 'us') od[pt.type].won++; }
      if (typeFilter && pt.type !== typeFilter) return;
      (pt.line || []).forEach(function (id) { var s = P(id); if (s) s.points++; });
      (pt.events || []).forEach(function (ev) {
        var a, b;
        switch (ev.type) {
          case 'pass':
            a = P(ev.from); b = P(ev.to);
            if (a) a.completions++;
            if (b) b.catches++;
            if (ev.from && ev.to) {
              var key = ev.from + '>' + ev.to;
              conn[key] = (conn[key] || 0) + 1;
            }
            break;
          case 'goal':
            a = P(ev.scorer); b = P(ev.assist);
            if (a) a.goals++;
            if (b) b.assists++;
            break;
          case 'drop':
            a = P(ev.to); if (a) a.drops++;
            break;
          case 'throwaway':
            a = P(ev.from); if (a) a.throwaways++;
            break;
          case 'd':
            a = P(ev.player); if (a) a.ds++;
            break;
        }
      });
    });

    Object.keys(players).forEach(function (id) {
      var s = players[id];
      s.plusMinus = s.goals + s.assists + s.ds - s.drops - s.throwaways;
    });

    var connections = Object.keys(conn).map(function (k) {
      var parts = k.split('>');
      return { from: parts[0], to: parts[1], count: conn[k] };
    }).sort(function (x, y) { return y.count - x.count; });

    // holds = puntos de ataque ganados; breaks = puntos de defensa ganados
    return { players: players, score: score, connections: connections, holds: od.O, breaks: od.D };
  }

  var api = {
    normalize: normalize,
    phonetic: phonetic,
    levenshtein: levenshtein,
    tokenize: tokenize,
    interpret: interpret,
    outcomeOf: outcomeOf,
    nextPointType: nextPointType,
    ratioFor: ratioFor,
    computeStats: computeStats
  };
  root.UltiCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
