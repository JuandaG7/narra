/* UltiVoz — interfaz. La lógica de interpretación y estadísticas vive en core.js. */
(function () {
  'use strict';
  var Core = window.UltiCore;

  // ---------- Persistencia ----------
  var KEYS = { roster: 'ultivoz.roster', game: 'ultivoz.game', settings: 'ultivoz.settings' };
  function load(k, def) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  var roster = load(KEYS.roster, []);
  var game = load(KEYS.game, { points: [], line: [], draft: null });
  var settings = load(KEYS.settings, { lang: 'es-CO', local: false });
  function saveRoster() { save(KEYS.roster, roster); }
  function saveGame() { save(KEYS.game, game); }

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function playerName(id) {
    if (!id) return '?';
    var p = roster.find(function (x) { return x.id === id; });
    return p ? p.name : '(borrado)';
  }
  function sortedRoster() {
    return roster.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
  }

  function describe(ev) {
    var n = playerName;
    switch (ev.type) {
      case 'pass': return n(ev.from) + ' → ' + n(ev.to);
      case 'goal': return 'GOL de ' + n(ev.scorer) + (ev.assist ? ' (asist. ' + n(ev.assist) + ')' : '');
      case 'drop': return 'Drop de ' + n(ev.to) + (ev.from ? ' (pase de ' + n(ev.from) + ')' : '');
      case 'throwaway': return 'Throwaway de ' + n(ev.from);
      case 'd': return 'D de ' + n(ev.player);
      case 'them': return 'Punto de ellos';
      case 'opp': return 'Pierden ellos';
    }
    return ev.type;
  }

  // ---------- Navegación ----------
  var currentView = 'game';
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.view); });
  });
  function show(view) {
    currentView = view;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    ['game', 'roster', 'stats'].forEach(function (v) { $('view-' + v).hidden = v !== view; });
    render();
    window.scrollTo(0, 0);
  }

  // ---------- Voz ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, wantListening = false, finalsCommitted = 0, interim = '', wakeLock = null;

  function voiceProblem() {
    if (!SR) return 'Este navegador no tiene reconocimiento de voz. Usa Chrome (Android) o Safari (iPhone). Mientras tanto puedes usar los botones.';
    if (!window.isSecureContext) return 'La voz necesita HTTPS o localhost. Abre la app por HTTPS (ver README). Mientras tanto puedes usar los botones.';
    return null;
  }

  function appendText(piece) {
    var d = game.draft;
    piece = String(piece || '').trim();
    if (!d || !piece) return;
    d.transcript = d.transcript ? d.transcript + ', ' + piece : piece;
    saveGame();
  }

  function startListening() {
    if (voiceProblem()) return;
    wantListening = true;
    rec = new SR();
    rec.lang = settings.lang || 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    if (settings.local && 'processLocally' in rec) { try { rec.processLocally = true; } catch (e) { /* no soportado */ } }
    finalsCommitted = 0; interim = '';
    rec.onresult = function (e) {
      var tmp = '';
      for (var i = finalsCommitted; i < e.results.length; i++) {
        var r = e.results[i];
        if (r.isFinal && i === finalsCommitted) { appendText(r[0].transcript); finalsCommitted = i + 1; }
        else tmp += ' ' + r[0].transcript;
      }
      interim = tmp.trim();
      renderLive();
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListening = false;
        setStatus('No hay permiso de micrófono. Revisa los permisos del navegador.');
      } else if (e.error === 'network') {
        setStatus('Sin conexión para la voz. Usa los botones o activa "reconocer en el dispositivo".');
        wantListening = false;
      } else if (e.error === 'language-not-supported') {
        setStatus('Idioma no disponible para reconocimiento local. Desactiva esa opción en Plantilla.');
        wantListening = false;
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setStatus('Error de voz: ' + e.error);
      }
    };
    var self = rec;
    rec.onend = function () {
      self.ended = true;
      // Chrome corta el modo continuo tras silencios: reiniciamos mientras el punto siga abierto.
      if (interim) { appendText(interim); interim = ''; }
      if (wantListening && game.draft && game.draft.phase === 'recording') {
        setTimeout(function () { if (wantListening) startListening(); }, 250);
      } else {
        renderLive();
      }
    };
    try { rec.start(); setStatus('Escuchando… narra los pases'); } catch (e) { setStatus('No pude iniciar el micrófono: ' + e.message); }
    if (navigator.wakeLock && !wakeLock) {
      navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
    }
  }

  function stopListening(cb) {
    wantListening = false;
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    if (!rec) { if (cb) cb(); return; }
    var r = rec; rec = null;
    var done = false;
    function finish() { if (done) return; done = true; if (interim) { appendText(interim); interim = ''; } if (cb) cb(); }
    if (r.ended) { finish(); return; }
    r.addEventListener('end', finish);
    try { r.stop(); } catch (e) { finish(); }
    setTimeout(finish, 1000); // por si el navegador no avisa
  }

  function setStatus(t) { $('rec-status').textContent = t || ''; }

  // ---------- Flujo del punto ----------
  $('rec-btn').addEventListener('click', function () {
    var d = game.draft;
    if (!d || d.phase !== 'recording') {
      game.draft = { phase: 'recording', transcript: '', events: [], unknown: [], editIndex: null };
      saveGame();
      if (navigator.vibrate) navigator.vibrate(60);
      startListening();
      render();
    } else {
      if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
      $('rec-btn').disabled = true;
      setStatus('Procesando…');
      stopListening(function () {
        $('rec-btn').disabled = false;
        toReview();
      });
    }
  });

  function toReview() {
    var d = game.draft;
    var r = Core.interpret(d.transcript, roster);
    d.events = r.events; d.unknown = r.unknown; d.phase = 'review';
    saveGame();
    setStatus('');
    render();
    window.scrollTo(0, 0);
  }

  // Botones de respaldo: escriben las mismas palabras que la narración.
  document.querySelectorAll('[data-say]').forEach(function (b) {
    b.addEventListener('click', function () { appendText(b.dataset.say); renderLive(); });
  });

  $('confirm').addEventListener('click', function () {
    var d = game.draft;
    var point = { transcript: d.transcript, events: d.events, line: game.line.slice(), ts: Date.now() };
    if (d.editIndex !== null && d.editIndex !== undefined && game.points[d.editIndex]) {
      point.line = game.points[d.editIndex].line || point.line;
      game.points[d.editIndex] = point;
    } else {
      game.points.push(point);
    }
    var wasEdit = d.editIndex !== null && d.editIndex !== undefined;
    game.draft = null;
    saveGame();
    if (navigator.vibrate) navigator.vibrate(80);
    if (wasEdit) show('stats'); else render();
  });
  $('continue').addEventListener('click', function () {
    game.draft.phase = 'recording';
    saveGame();
    startListening();
    render();
  });
  $('discard').addEventListener('click', function () {
    if (!confirm('¿Descartar este punto?')) return;
    var wasEdit = game.draft.editIndex !== null && game.draft.editIndex !== undefined;
    game.draft = null; saveGame();
    if (wasEdit) show('stats'); else render();
  });
  $('reparse').addEventListener('click', function () {
    game.draft.transcript = $('transcript').value;
    toReview();
  });
  $('transcript').addEventListener('input', function () { game.draft.transcript = this.value; saveGame(); });

  var EMPTY = {
    pass: function () { return { type: 'pass', from: null, to: null }; },
    goal: function () { return { type: 'goal', scorer: null, assist: null }; },
    drop: function () { return { type: 'drop', from: null, to: null }; },
    throwaway: function () { return { type: 'throwaway', from: null }; },
    d: function () { return { type: 'd', player: null }; },
    them: function () { return { type: 'them' }; },
    opp: function () { return { type: 'opp' }; }
  };
  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      game.draft.events.push(EMPTY[b.dataset.add]());
      saveGame(); renderReview();
    });
  });

  // ---------- Render: partido ----------
  function render() {
    var stats = Core.computeStats(game.points, roster);
    $('score').textContent = stats.score.us + ' – ' + stats.score.them;
    if (currentView === 'game') renderGame();
    if (currentView === 'roster') renderRoster();
    if (currentView === 'stats') renderStats(stats);
  }

  function renderGame() {
    var d = game.draft;
    var problem = voiceProblem();
    $('voice-warning').hidden = !problem;
    $('voice-warning').textContent = problem || '';
    var reviewing = d && d.phase === 'review';
    $('rec-panel').hidden = reviewing;
    $('review-panel').hidden = !reviewing;
    var n = (d && d.editIndex !== null && d.editIndex !== undefined) ? d.editIndex + 1 : game.points.length + 1;
    if (reviewing) { $('review-title').textContent = 'Revisar punto ' + n; renderReview(); return; }

    $('point-title').textContent = 'Punto ' + n;
    var recording = d && d.phase === 'recording';
    $('rec-btn').textContent = recording ? 'Terminar punto' : 'Empezar punto';
    $('rec-btn').classList.toggle('recording', !!recording);
    $('live').hidden = !recording;
    $('pad').hidden = !recording;
    if (!roster.length && !recording) setStatus('Primero carga la plantilla en la pestaña "Plantilla".');
    else if (!recording) setStatus('');
    renderLine();
    renderPad();
    renderLive();
  }

  function renderLine() {
    var box = $('line-chips');
    box.innerHTML = '';
    sortedRoster().forEach(function (p) {
      var on = game.line.indexOf(p.id) >= 0;
      box.appendChild(el('button', {
        class: 'chip' + (on ? ' on' : ''), text: p.name, type: 'button',
        onclick: function () {
          if (on) game.line = game.line.filter(function (x) { return x !== p.id; });
          else game.line.push(p.id);
          saveGame(); renderLine(); renderPad();
        }
      }));
    });
    $('line-count').textContent = game.line.length ? '(' + game.line.length + ')' : '(opcional)';
  }
  $('line-all').addEventListener('click', function () { game.line = roster.map(function (p) { return p.id; }); saveGame(); renderLine(); renderPad(); });
  $('line-none').addEventListener('click', function () { game.line = []; saveGame(); renderLine(); renderPad(); });

  function renderPad() {
    var box = $('pad-players');
    box.innerHTML = '';
    var list = sortedRoster().filter(function (p) { return !game.line.length || game.line.indexOf(p.id) >= 0; });
    list.forEach(function (p) {
      box.appendChild(el('button', {
        class: 'btn', type: 'button', text: p.name,
        onclick: function () { appendText(p.name); renderLive(); }
      }));
    });
  }

  function renderLive() {
    var d = game.draft;
    if (!d || d.phase !== 'recording') return;
    var t = $('live-text');
    t.innerHTML = '';
    t.appendChild(document.createTextNode(d.transcript || (interim ? '' : '…')));
    if (interim) t.appendChild(el('span', { class: 'interim', text: ' ' + interim }));
    var r = Core.interpret(d.transcript + ' ' + interim, roster);
    var ol = $('live-events');
    ol.innerHTML = '';
    r.events.slice(-5).forEach(function (ev) { ol.appendChild(el('li', { text: describe(ev) })); });
    if (!r.events.length) ol.appendChild(el('li', { class: 'muted', text: 'Ej.: "Pipe a Mono, Mono a Juancho, gol"' }));
  }

  // ---------- Render: revisión ----------
  var TYPE_LABEL = { pass: 'Pase', goal: 'Gol', drop: 'Drop', throwaway: 'Throwaway', d: 'D', them: 'Punto de ellos', opp: 'Pierden ellos' };
  var FIELDS = {
    pass: [['from', ''], ['to', '→']],
    goal: [['scorer', 'de'], ['assist', 'asist.']],
    drop: [['to', 'de'], ['from', 'pase de']],
    throwaway: [['from', 'de']],
    d: [['player', 'de']],
    them: [], opp: []
  };

  function playerSelect(value, onChange) {
    var s = el('select', {}, [el('option', { value: '', text: '—' })]);
    sortedRoster().forEach(function (p) {
      var o = el('option', { value: p.id, text: p.name });
      if (p.id === value) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener('change', function () { onChange(s.value || null); });
    return s;
  }

  function renderReview() {
    var d = game.draft;
    var oc = Core.outcomeOf(d.events);
    var ob = $('outcome');
    ob.className = 'banner ' + (oc || 'none');
    ob.textContent = oc === 'us' ? '✔ Punto nuestro' : oc === 'them' ? '✖ Punto de ellos' : 'Sin resultado: agrega "Gol" o "Nos anotan"';

    var ul = $('events');
    ul.innerHTML = '';
    if (!d.events.length) ul.appendChild(el('li', { class: 'muted', text: 'No detecté eventos. Agrégalos con los botones o corrige la narración abajo.' }));
    d.events.forEach(function (ev, idx) {
      var li = el('li', { class: ev.uncertain ? 'unc' : '' });
      var typeSel = el('select', { class: 'type' });
      Object.keys(TYPE_LABEL).forEach(function (t) {
        var o = el('option', { value: t, text: TYPE_LABEL[t] });
        if (t === ev.type) o.selected = true;
        typeSel.appendChild(o);
      });
      typeSel.addEventListener('change', function () {
        var ne = EMPTY[typeSel.value]();
        // conservar jugadores cuando se cambia el tipo
        var people = [ev.from, ev.to, ev.scorer, ev.assist, ev.player].filter(Boolean);
        FIELDS[ne.type].forEach(function (f, i) { ne[f[0]] = people[i] || null; });
        d.events[idx] = ne; saveGame(); renderReview();
      });
      li.appendChild(typeSel);
      FIELDS[ev.type].forEach(function (f) {
        if (f[1]) li.appendChild(el('span', { class: 'arrow', text: f[1] }));
        li.appendChild(playerSelect(ev[f[0]], function (v) {
          ev[f[0]] = v; delete ev.uncertain; saveGame(); renderReview();
        }));
      });
      li.appendChild(el('button', {
        class: 'del', type: 'button', 'aria-label': 'Borrar', text: '×',
        onclick: function () { d.events.splice(idx, 1); saveGame(); renderReview(); }
      }));
      if (ev.uncertain) li.appendChild(el('div', { class: 'heard', text: 'Revisa: escuché «' + ev.uncertain + '»' }));
      ul.appendChild(li);
    });

    var ub = $('unknown-box');
    var uk = d.unknown || [];
    ub.hidden = !uk.length;
    var list = $('unknown-list');
    list.innerHTML = '';
    uk.forEach(function (w) {
      list.appendChild(el('div', { class: 'unknown-item' }, [
        el('b', { text: '«' + w + '»' }),
        playerSelect(null, function (id) {
          if (!id) return;
          var p = roster.find(function (x) { return x.id === id; });
          p.aliases = (p.aliases || []).concat([w]);
          saveRoster();
          toReview(); // reinterpreta con el nuevo alias
        })
      ]));
    });

    var ta = $('transcript');
    if (document.activeElement !== ta) ta.value = d.transcript;
  }

  // ---------- Render: plantilla ----------
  var editingId = null;
  function renderRoster() {
    var ul = $('roster-list');
    ul.innerHTML = '';
    if (!roster.length) ul.appendChild(el('li', { class: 'muted', text: 'Aún no hay jugadores.' }));
    roster.slice().sort(function (a, b) { return (+a.number || 999) - (+b.number || 999) || a.name.localeCompare(b.name); })
      .forEach(function (p) {
        ul.appendChild(el('li', {}, [
          el('span', { class: 'num', text: p.number !== '' && p.number != null ? '#' + p.number : '' }),
          el('span', { class: 'name' }, [p.name, (p.aliases && p.aliases.length) ? el('small', { text: 'también: ' + p.aliases.join(', ') }) : null]),
          el('button', { class: 'btn small ghost', type: 'button', text: 'Editar', onclick: function () { editPlayer(p); } }),
          el('button', { class: 'btn small ghost bad-text', type: 'button', text: '×', 'aria-label': 'Borrar ' + p.name, onclick: function () {
            if (!confirm('¿Borrar a ' + p.name + '? Sus stats ya registradas quedarán como "(borrado)".')) return;
            roster = roster.filter(function (x) { return x.id !== p.id; });
            game.line = game.line.filter(function (x) { return x !== p.id; });
            saveRoster(); saveGame(); renderRoster();
          } })
        ]));
      });
    $('s-lang').value = settings.lang;
    $('s-local').checked = !!settings.local;
  }
  function editPlayer(p) {
    editingId = p.id;
    $('f-name').value = p.name;
    $('f-number').value = p.number == null ? '' : p.number;
    $('f-aliases').value = (p.aliases || []).join(', ');
    $('form-title').textContent = 'Editar jugador';
    $('f-submit').textContent = 'Guardar';
    $('f-cancel').hidden = false;
    window.scrollTo(0, 0);
    $('f-name').focus();
  }
  function resetForm() {
    editingId = null;
    $('player-form').reset();
    $('form-title').textContent = 'Agregar jugador';
    $('f-submit').textContent = 'Agregar';
    $('f-cancel').hidden = true;
  }
  $('f-cancel').addEventListener('click', resetForm);
  $('player-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('f-name').value.trim();
    if (!name) return;
    var number = $('f-number').value.trim();
    var aliases = $('f-aliases').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var clash = roster.find(function (x) { return x.id !== editingId && Core.normalize(x.name) === Core.normalize(name); });
    if (clash) { alert('Ya hay un jugador llamado ' + clash.name + '. Usa otro apodo.'); return; }
    if (editingId) {
      var p = roster.find(function (x) { return x.id === editingId; });
      p.name = name; p.number = number; p.aliases = aliases;
    } else {
      roster.push({ id: uid(), name: name, number: number, aliases: aliases });
    }
    saveRoster(); resetForm(); renderRoster();
    $('f-name').focus();
  });
  $('sample-roster').addEventListener('click', function () {
    if (roster.length && !confirm('¿Agregar los jugadores de ejemplo a la plantilla actual?')) return;
    [['Pipe', 7], ['Mono', 12], ['Juancho', 3], ['Sara', 9], ['Leo', 5], ['Caro', 21], ['Tato', 10], ['Vale', 4]]
      .forEach(function (x) {
        if (!roster.some(function (p) { return Core.normalize(p.name) === Core.normalize(x[0]); })) {
          roster.push({ id: uid(), name: x[0], number: String(x[1]), aliases: [] });
        }
      });
    saveRoster(); renderRoster();
  });
  $('s-lang').addEventListener('change', function () { settings.lang = this.value; save(KEYS.settings, settings); });
  $('s-local').addEventListener('change', function () { settings.local = this.checked; save(KEYS.settings, settings); });

  // ---------- Render: estadísticas ----------
  var COLS = [['points', 'Pts'], ['completions', 'Pas'], ['catches', 'Rec'], ['goals', 'Gol'], ['assists', 'Ast'],
    ['ds', 'D'], ['drops', 'Drop'], ['throwaways', 'TA'], ['plusMinus', '+/-']];

  function statRows(stats) {
    var usesLine = game.points.some(function (p) { return p.line && p.line.length; });
    var cols = COLS.filter(function (c) { return usesLine || c[0] !== 'points'; });
    var rows = Object.keys(stats.players).map(function (id) { return { id: id, s: stats.players[id] }; })
      .filter(function (r) { return roster.some(function (p) { return p.id === r.id; }) || COLS.some(function (c) { return r.s[c[0]]; }); })
      .sort(function (a, b) { return b.s.plusMinus - a.s.plusMinus || b.s.goals - a.s.goals || playerName(a.id).localeCompare(playerName(b.id)); });
    return { cols: cols, rows: rows };
  }

  function renderStats(stats) {
    $('s-us').textContent = stats.score.us;
    $('s-them').textContent = stats.score.them;
    var t = statRows(stats);
    var table = $('stats-table');
    table.innerHTML = '';
    var head = el('tr', {}, [el('th', { text: 'Jugador' })].concat(t.cols.map(function (c) { return el('th', { text: c[1] }); })));
    table.appendChild(el('thead', {}, [head]));
    var body = el('tbody');
    t.rows.forEach(function (r) {
      body.appendChild(el('tr', {}, [el('td', { text: playerName(r.id) })].concat(t.cols.map(function (c) {
        var v = r.s[c[0]];
        return el('td', { class: c[0] === 'plusMinus' ? 'pm' : '', text: c[0] === 'plusMinus' && v > 0 ? '+' + v : String(v) });
      }))));
    });
    if (!t.rows.length) body.appendChild(el('tr', {}, [el('td', { class: 'muted', text: 'Sin jugadores todavía.' })]));
    table.appendChild(body);

    var cl = $('connections');
    cl.innerHTML = '';
    stats.connections.slice(0, 8).forEach(function (c) {
      cl.appendChild(el('li', { text: playerName(c.from) + ' → ' + playerName(c.to) + ': ' + c.count }));
    });
    if (!stats.connections.length) cl.appendChild(el('li', { class: 'muted', text: 'Aún no hay pases.' }));

    var pl = $('points-list');
    pl.innerHTML = '';
    var us = 0, them = 0;
    game.points.forEach(function (p, i) {
      var oc = Core.outcomeOf(p.events);
      if (oc === 'us') us++; if (oc === 'them') them++;
      var goal = p.events.filter(function (e) { return e.type === 'goal'; })[0];
      var txt = (oc === 'us' ? '✔ ' : oc === 'them' ? '✖ ' : '· ') + us + '–' + them +
        (goal ? ' · ' + playerName(goal.scorer) + (goal.assist ? ' de ' + playerName(goal.assist) : '') : oc === 'them' ? ' · de ellos' : ' · sin resultado') +
        ' · ' + p.events.length + ' eventos';
      pl.appendChild(el('li', {}, [txt, el('button', {
        class: 'btn small ghost', type: 'button', text: 'Editar', onclick: function () {
          if (game.draft && game.draft.phase === 'recording') { alert('Termina el punto en curso primero.'); return; }
          game.draft = { phase: 'review', transcript: p.transcript || '', events: JSON.parse(JSON.stringify(p.events)), unknown: [], editIndex: i };
          saveGame(); show('game');
        }
      })]));
    });
    if (!game.points.length) pl.appendChild(el('li', { class: 'muted', text: 'Aún no hay puntos confirmados.' }));
  }

  $('new-game').addEventListener('click', function () {
    if (!confirm('¿Empezar un partido nuevo? Se borran los puntos (la plantilla se conserva). Exporta el CSV antes si lo necesitas.')) return;
    game = { points: [], line: game.line, draft: null };
    saveGame(); render();
  });

  $('export').addEventListener('click', function () {
    var stats = Core.computeStats(game.points, roster);
    var t = statRows(stats);
    var lines = [['Jugador'].concat(t.cols.map(function (c) { return c[1]; })).join(',')];
    t.rows.forEach(function (r) {
      lines.push(['"' + playerName(r.id).replace(/"/g, '""') + '"'].concat(t.cols.map(function (c) { return r.s[c[0]]; })).join(','));
    });
    lines.push('', 'Lanzador,Receptor,Pases');
    stats.connections.forEach(function (c) { lines.push(playerName(c.from) + ',' + playerName(c.to) + ',' + c.count); });
    lines.push('', 'Marcador,' + stats.score.us + ',' + stats.score.them);
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'ultivoz-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---------- Inicio ----------
  // Si se recargó la página a mitad de un punto, pasamos directo a revisión para no perder lo narrado.
  if (game.draft && game.draft.phase === 'recording') { game.draft.phase = 'review'; saveGame(); toReview(); }
  show(roster.length ? 'game' : 'roster');

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
