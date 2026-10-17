/* UltiVoz — interfaz. La interpretación y las estadísticas viven en core.js. */
(function () {
  'use strict';
  var Core = window.UltiCore;

  // ---------- Utilidades ----------
  var KEYS = { roster: 'ultivoz.roster', lines: 'ultivoz.lines', game: 'ultivoz.game', settings: 'ultivoz.settings' };
  function load(k, def) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function $(id) { return document.getElementById(id); }
  function uid(p) { return (p || 'p') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* sin vibración */ } } }

  var ICONS = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5M12 16.8h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.8-5.9"/>',
    chart: '<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4M12 17.2h.01"/>',
    drop: '<path d="M12 4v13M6 11l6 6 6-6"/>',
    throw: '<path d="M4 19L19 5M12 5h7v7"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    flag: '<path d="M5 21V4h12l-2.5 4L17 12H5"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    chevron: '<path d="M7 10l5 5 5-5"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'icon') n.insertAdjacentHTML('afterbegin', svg(v)); // solo íconos propios
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  function iconText(icon, text) { var s = el('span', { class: 'row', style: 'gap:8px;display:inline-flex' }); s.innerHTML = svg(icon); s.appendChild(document.createTextNode(text)); return s; }

  // ---------- Estado ----------
  var roster = load(KEYS.roster, []);
  var lines = load(KEYS.lines, []);
  var settings = Object.assign({ lang: 'es-CO', local: false, division: 'mixto', mixedRule: 'abba' }, load(KEYS.settings, {}));
  function newGame() {
    return { started: false, rival: '', startType: 'O', firstRatio: '4H', points: [], line: [], draft: null, typeOverride: null };
  }
  var game = Object.assign(newGame(), load(KEYS.game, {}) || {});
  if (game.points.length && !game.started) game.started = true; // datos de la versión anterior
  function saveRoster() { save(KEYS.roster, roster); }
  function saveLines() { save(KEYS.lines, lines); }
  function saveGame() { save(KEYS.game, game); }
  function saveSettings() { save(KEYS.settings, settings); }

  function byId(id) { return roster.find(function (p) { return p.id === id; }); }
  function playerName(id) { if (!id) return '?'; var p = byId(id); return p ? p.name : '(borrado)'; }
  function sorted(list) { return list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); }); }
  function isMixed() { return settings.division === 'mixto'; }
  function useAbba() { return isMixed() && settings.mixedRule === 'abba'; }

  function lineIds() { return game.line.filter(function (id) { return id && byId(id); }); }
  function genderCount(ids) {
    var c = { H: 0, M: 0, X: 0 };
    ids.forEach(function (id) { var p = byId(id); c[p && (p.gender === 'H' || p.gender === 'M') ? p.gender : 'X']++; });
    return c;
  }
  function ratioOk(c, ratio) { return ratio === '4H' ? (c.H === 4 && c.M === 3) : (c.H === 3 && c.M === 4); }
  function ratioLabel(r) { return r === '4H' ? '4 H · 3 M' : '3 H · 4 M'; }

  function currentIndex() { var d = game.draft; return d && d.editIndex != null ? d.editIndex : game.points.length; }
  function pointType() {
    var d = game.draft;
    if (d && d.type) return d.type;
    return game.typeOverride || Core.nextPointType(game.points, game.startType);
  }
  function pointRatio() {
    var d = game.draft;
    if (d && d.editIndex != null) return game.points[d.editIndex].ratio || null;
    return useAbba() ? Core.ratioFor(game.points.length, game.firstRatio) : null;
  }

  function describe(ev) {
    var n = playerName;
    switch (ev.type) {
      case 'pass': return n(ev.from) + ' → ' + n(ev.to);
      case 'goal': return 'Gol de ' + n(ev.scorer) + (ev.assist ? ' · asist. ' + n(ev.assist) : '');
      case 'drop': return 'Drop de ' + n(ev.to);
      case 'throwaway': return 'Throwaway de ' + n(ev.from);
      case 'd': return 'D de ' + n(ev.player);
      case 'them': return 'Punto de ellos';
      case 'opp': return 'Pierden ellos';
    }
    return ev.type;
  }
  var EV_ICON = { pass: 'arrow', goal: 'flag', drop: 'drop', throwaway: 'throw', d: 'block', them: 'x', opp: 'swap' };
  var EV_LABEL = { pass: 'Pase', goal: 'Gol', drop: 'Drop', throwaway: 'Throwaway', d: 'D', them: 'Nos anotan', opp: 'Pierden ellos' };

  // ---------- Aviso con deshacer ----------
  var toastTimer = null;
  function hideToast() {
    var t = $('toast');
    t.classList.remove('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 260);
  }
  function toast(msg, undo) {
    var t = $('toast');
    clearTimeout(toastTimer);
    t.innerHTML = '';
    t.appendChild(el('span', { text: msg }));
    if (undo) t.appendChild(el('button', { type: 'button', text: 'Deshacer', onclick: function () { hideToast(); undo(); } }));
    t.hidden = false;
    raf2(function () { t.classList.add('show'); });
    toastTimer = setTimeout(hideToast, undo ? 5000 : 2200);
  }

  // ---------- Hoja inferior ----------
  var sheetClose = null;
  function openSheet(build, onClose) {
    if (sheetClose) sheetClose(true);
    var sh = $('sheet'), bd = $('sheet-backdrop');
    sh.innerHTML = '';
    sh.appendChild(el('div', { class: 'grab' }));
    sh.hidden = false; bd.hidden = false;
    var closed = false;
    function close(instant) {
      if (closed) return;
      closed = true; sheetClose = null;
      sh.classList.remove('open'); bd.classList.remove('open');
      if (onClose) onClose();
      setTimeout(function () { if (!sheetClose) { sh.hidden = true; bd.hidden = true; } }, instant ? 0 : 300);
    }
    sheetClose = close;
    bd.onclick = function () { close(); };
    build(sh, close);
    raf2(function () { sh.classList.add('open'); bd.classList.add('open'); });
    return close;
  }

  function playerButton(p, current, onPick) {
    return el('button', { class: 'btn' + (p.id === current ? ' current' : ''), type: 'button', onclick: function () { onPick(p.id); } }, [
      isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '·' }) : null, p.name
    ]);
  }
  function openPlayerSheet(title, current, onPick, allowNone) {
    openSheet(function (sh, close) {
      function pick(id) { close(); onPick(id); }
      sh.appendChild(el('h3', { text: title }));
      var inLine = lineIds();
      var on = sorted(roster.filter(function (p) { return inLine.indexOf(p.id) >= 0; }));
      var off = sorted(roster.filter(function (p) { return inLine.indexOf(p.id) < 0; }));
      if (on.length) {
        sh.appendChild(el('div', { class: 'sheet-grid' }, on.map(function (p) { return playerButton(p, current, pick); })));
      }
      if (off.length) {
        sh.appendChild(el('p', { class: 'label sheet-sub', text: on.length ? 'Resto de la plantilla' : 'Plantilla' }));
        sh.appendChild(el('div', { class: 'sheet-grid' }, off.map(function (p) { return playerButton(p, current, pick); })));
      }
      if (allowNone) {
        sh.appendChild(el('button', { class: 'btn block ghost', style: 'margin-top:12px', type: 'button', text: 'Nadie / no sé', onclick: function () { pick(null); } }));
      }
    });
  }

  // ---------- Navegación ----------
  var currentView = 'game';
  document.querySelectorAll('[data-icon]').forEach(function (s) { s.outerHTML = svg(s.dataset.icon); });
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.view !== currentView) show(b.dataset.view); });
  });
  function show(view) {
    currentView = view;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    ['game', 'roster', 'stats'].forEach(function (v) { $('view-' + v).hidden = v !== view; });
    lastGameState = null;
    render();
    var v = $('view-' + view);
    v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
    window.scrollTo(0, 0);
  }
  window.addEventListener('scroll', function () { $('top').classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  // ---------- Marcador ----------
  var shownScore = null;
  function renderScore() {
    var s = Core.computeStats(game.points, roster).score;
    var box = $('score');
    var txt = s.us + '–' + s.them;
    if (shownScore === txt) return;
    var prev = shownScore ? shownScore.split('–') : null;
    box.innerHTML = '';
    if (game.rival) box.appendChild(el('small', { text: 'vs ' + game.rival }));
    box.appendChild(el('span', { class: 'digit' + (prev && +prev[0] !== s.us ? ' roll' : ''), text: s.us }));
    box.appendChild(el('span', { text: '–' }));
    box.appendChild(el('span', { class: 'digit' + (prev && +prev[1] !== s.them ? ' roll' : ''), text: s.them }));
    if (prev) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
    shownScore = txt;
  }

  // ---------- Voz (punto) ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, wantListening = false, finalsCommitted = 0, interim = '', wakeLock = null;

  function voiceProblem() {
    if (!SR) return 'Este navegador no reconoce voz. Usa Chrome (Android) o Safari (iPhone). Mientras tanto, usa los botones.';
    if (!window.isSecureContext) return 'La voz necesita HTTPS. Abre la app por su enlace https (ver README). Mientras tanto, usa los botones.';
    return null;
  }
  function setStatus(t) { var s = $('rec-status'); if (s) s.textContent = t || ''; }

  function appendText(piece) {
    var d = game.draft;
    piece = String(piece || '').trim();
    if (!d || !piece) return;
    d.transcript = d.transcript ? d.transcript + ', ' + piece : piece;
    saveGame();
  }

  function recBtnClass(cls, on) { var b = $('rec-btn'); if (b) b.classList.toggle(cls, on); }
  function blip() { var b = $('rec-btn'); if (!b) return; b.classList.remove('blip'); void b.offsetWidth; b.classList.add('blip'); }

  function startListening() {
    if (voiceProblem()) return;
    wantListening = true;
    var r = new SR();
    rec = r;
    r.lang = settings.lang || 'es-CO';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    if (settings.local && 'processLocally' in r) { try { r.processLocally = true; } catch (e) { /* no soportado */ } }
    finalsCommitted = 0; interim = '';
    r.onresult = function (e) {
      var tmp = '';
      for (var i = finalsCommitted; i < e.results.length; i++) {
        var res = e.results[i];
        if (res.isFinal && i === finalsCommitted) { appendText(res[0].transcript); finalsCommitted = i + 1; }
        else tmp += ' ' + res[0].transcript;
      }
      interim = tmp.trim();
      blip();
      renderLive();
    };
    r.onspeechstart = function () { recBtnClass('hearing', true); };
    r.onspeechend = function () { recBtnClass('hearing', false); };
    r.onerror = function (e) {
      if (['not-allowed', 'service-not-allowed', 'network', 'language-not-supported'].indexOf(e.error) >= 0) recBtnClass('mute', true);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListening = false; setStatus('Sin micrófono: usa los botones.');
      } else if (e.error === 'network') {
        wantListening = false; setStatus('Sin señal para la voz: usa los botones.');
      } else if (e.error === 'language-not-supported') {
        wantListening = false; setStatus('Ese idioma no está descargado para reconocer sin internet. Desactiva la opción en Plantilla.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setStatus('Error de voz: ' + e.error);
      }
    };
    r.onend = function () {
      r.ended = true;
      recBtnClass('hearing', false);
      if (interim) { appendText(interim); interim = ''; }
      // Chrome corta el modo continuo tras silencios: reiniciamos mientras el punto siga abierto.
      if (wantListening && rec === r && game.draft && game.draft.phase === 'recording') {
        setTimeout(function () { if (wantListening && rec === r) startListening(); }, 250);
      } else renderLive();
    };
    try { r.start(); setStatus('Escuchando…'); } catch (e) { setStatus('No pude abrir el micrófono.'); }
    if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
  }

  function stopListening(cb) {
    wantListening = false;
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    var r = rec; rec = null;
    var done = false;
    function finish() { if (done) return; done = true; if (interim) { appendText(interim); interim = ''; } if (cb) cb(); }
    if (!r || r.ended) { finish(); return; }
    r.addEventListener('end', finish);
    try { r.stop(); } catch (e) { finish(); }
    setTimeout(finish, 1000);
  }

  // ---------- Flujo del punto ----------
  var lastGameState = null, reviewAnimate = false, lastLiveCount = 0, timerId = null, lastAdded = null;

  function startPoint() {
    game.draft = { phase: 'recording', transcript: '', events: [], unknown: [], editIndex: null, type: pointType(), startedAt: Date.now() };
    game.typeOverride = null;
    saveGame();
    buzz(50);
    lastLiveCount = 0;
    startListening();
    render();
  }
  function endPoint() {
    buzz([30, 40, 30]);
    var b = $('rec-btn'); if (b) b.disabled = true;
    setStatus('Procesando…');
    stopListening(toReview);
  }
  function toReview() {
    var d = game.draft;
    var r = Core.interpret(d.transcript, roster, lineIds());
    d.events = r.events; d.unknown = r.unknown; d.phase = 'review';
    reviewAnimate = true;
    saveGame();
    render();
    window.scrollTo(0, 0);
  }
  function confirmPoint() {
    var d = game.draft;
    var oc = Core.outcomeOf(d.events);
    var wasEdit = d.editIndex != null;
    var point = { type: pointType(), ratio: pointRatio(), line: lineIds(), events: d.events, transcript: d.transcript, ts: Date.now() };
    if (wasEdit) {
      var old = game.points[d.editIndex];
      point.line = old.line || []; point.ts = old.ts; point.type = d.type || old.type;
      game.points[d.editIndex] = point;
    } else game.points.push(point);
    game.draft = null;
    saveGame();
    buzz(80);
    var s = Core.computeStats(game.points, roster).score;
    toast(wasEdit ? 'Punto actualizado' : (oc === 'us' ? 'Punto nuestro · ' : oc === 'them' ? 'Punto de ellos · ' : 'Punto guardado · ') + s.us + '–' + s.them);
    if (wasEdit) show('stats'); else render();
  }
  function discardPoint() {
    var backup = clone(game.draft);
    var wasEdit = backup.editIndex != null;
    game.draft = null; saveGame();
    toast(wasEdit ? 'Cambios descartados' : 'Punto descartado', function () { game.draft = backup; saveGame(); show('game'); });
    if (wasEdit) show('stats'); else render();
  }

  // ---------- Render principal ----------
  function render() {
    renderScore();
    document.body.classList.toggle('focus', currentView === 'game' && !!(game.draft && game.draft.phase === 'recording'));
    if (currentView === 'game') renderGame();
    if (currentView === 'roster') renderRoster();
    if (currentView === 'stats') renderStats();
  }

  function renderGame() {
    var v = $('view-game');
    var d = game.draft;
    var state = !game.started ? 'setup' : !d ? 'prepare' : d.phase;
    var changed = state !== lastGameState;
    lastGameState = state;
    if (state !== 'recording' && timerId) { clearInterval(timerId); timerId = null; }
    v.innerHTML = '';
    var problem = voiceProblem();
    if (problem && (state === 'prepare' || state === 'recording')) {
      v.appendChild(el('div', { class: 'banner warn', icon: 'alert' }, [el('span', { text: problem })]));
    }
    if (state === 'setup') renderSetup(v);
    else if (state === 'prepare') renderPrepare(v);
    else if (state === 'recording') renderRecording(v);
    else renderReview(v);
    if (changed) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
  }

  function seg(options, value, onChange) {
    return el('div', { class: 'seg', role: 'radiogroup' }, options.map(function (o) {
      return el('button', { type: 'button', role: 'radio', 'aria-checked': String(o[0] === value), class: o[0] === value ? 'on' : '', text: o[1], onclick: function () { onChange(o[0]); } });
    }));
  }
  function typeBadge(type, onclick) {
    return el(onclick ? 'button' : 'span', { class: 'badge ' + type, type: onclick ? 'button' : null, icon: type === 'O' ? 'disc' : 'shield', onclick: onclick, title: onclick ? 'Cambiar ataque/defensa' : null },
      [type === 'O' ? 'Ataque' : 'Defensa']);
  }
  function ratioBadge(ratio, ids, onclick) {
    var c = genderCount(ids);
    var full = ids.length === 7;
    var bad = full && !ratioOk(c, ratio);
    return el(onclick ? 'button' : 'span', { class: 'badge ratio' + (bad ? ' bad' : ''), type: onclick ? 'button' : null, onclick: onclick, title: onclick ? 'Cambiar proporción' : null },
      [ratioLabel(ratio)]);
  }

  // --- Nuevo partido ---
  function renderSetup(v) {
    v.appendChild(el('h2', { class: 'title', text: 'Nuevo partido' }));
    if (roster.length < 7) {
      v.appendChild(el('div', { class: 'card empty-state' }, [
        el('b', { text: roster.length ? 'Faltan jugadores' : 'Primero, tu equipo' }),
        el('div', { text: roster.length ? 'Tienes ' + roster.length + ' en la plantilla; se necesitan al menos 7.' : 'Carga la plantilla para poder narrar.' }),
        el('button', { class: 'btn accent', style: 'margin-top:12px', type: 'button', text: 'Ir a Plantilla', onclick: function () { show('roster'); } })
      ]));
    }
    var c = el('div', { class: 'card' });
    var rival = el('input', { type: 'text', placeholder: 'Rival (opcional)', value: game.rival || '', autocomplete: 'off' });
    rival.addEventListener('input', function () { game.rival = rival.value.trim(); saveGame(); });
    c.appendChild(rival);
    c.appendChild(el('p', { class: 'field-label', text: '¿Quién hace el primer pull?' }));
    c.appendChild(seg([['D', 'Nosotros'], ['O', 'Ellos']], game.startType, function (val) { game.startType = val; saveGame(); render(); }));
    c.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: game.startType === 'O' ? 'Empezamos en ataque.' : 'Empezamos en defensa.' }));
    if (useAbba()) {
      c.appendChild(el('p', { class: 'field-label', text: 'Proporción del primer punto' }));
      c.appendChild(seg([['4H', '4 H · 3 M'], ['4M', '3 H · 4 M']], game.firstRatio, function (val) { game.firstRatio = val; saveGame(); render(); }));
      c.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: 'Después cambia sola cada dos puntos (ABBA).' }));
    }
    v.appendChild(c);
    v.appendChild(el('button', { class: 'btn accent big block', type: 'button', text: 'Empezar partido', onclick: function () {
      if (roster.length < 7) { show('roster'); return; }
      game.started = true; saveGame(); buzz(40); render();
    } }));
  }

  // --- Preparar punto (durante el pull) ---
  function addToLine(id) {
    if (lineIds().length >= 7) { toast('Ya hay 7. Toca a uno para sacarlo.'); buzz(20); return; }
    game.line = game.line.filter(function (x) { return !x || byId(x); });
    var idx = game.line.indexOf(null);
    if (idx >= 0) game.line[idx] = id; else game.line.push(id);
    lastAdded = id;
    saveGame(); render();
  }
  function removeFromLine(id) {
    var idx = game.line.indexOf(id);
    if (idx >= 0) game.line[idx] = null;
    while (game.line.length && !game.line[game.line.length - 1]) game.line.pop();
    saveGame(); render();
  }
  function sameSet(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; }); }

  function renderPrepare(v) {
    var type = pointType();
    var ratio = pointRatio();
    var ids = lineIds();
    var head = el('div', { class: 'point-head' }, [
      el('h2', { class: 'title', style: 'margin:0', text: 'Punto ' + (currentIndex() + 1) }),
      el('span', { class: 'spacer' }),
      typeBadge(type, function () { game.typeOverride = type === 'O' ? 'D' : 'O'; saveGame(); render(); }),
      ratio ? ratioBadge(ratio, ids, function () {
        // Corrige la proporción: ajusta el punto de partida del ABBA.
        game.firstRatio = game.firstRatio === '4H' ? '4M' : '4H'; saveGame(); render();
      }) : null
    ]);
    v.appendChild(head);

    if (lines.length) {
      v.appendChild(el('div', { class: 'presets' }, lines.map(function (l) {
        var players = l.players.filter(byId);
        var on = players.length && sameSet(players, ids);
        return el('button', { class: 'preset' + (on ? ' on' : ''), type: 'button', onclick: function () {
          game.line = players.slice(0, 7); lastAdded = null; saveGame(); buzz(15); render();
        } }, [l.type === type ? el('span', { class: 'dot', title: 'Sugerida' }) : null, l.name]);
      })));
    }

    var c = el('div', { class: 'card' });
    var gc = genderCount(ids);
    var countTxt = ids.length + '/7' + (isMixed() ? ' · ' + gc.H + ' H · ' + gc.M + ' M' : '');
    var good = ids.length === 7 && (!ratio || ratioOk(gc, ratio));
    var matchesPreset = lines.some(function (l) { return sameSet(l.players.filter(byId), ids); });
    c.appendChild(el('div', { class: 'line-head' }, [
      el('span', { class: 'label', style: 'margin:0', text: 'En cancha' }),
      el('span', { class: 'count ' + (good ? 'ok' : 'off'), text: countTxt }),
      el('span', { class: 'spacer' }),
      ids.length && !matchesPreset ? el('button', { class: 'btn link small', type: 'button', text: 'Guardar línea', onclick: function () { openLineEditor({ players: ids, type: type }); } }) : null
    ]));
    var slots = el('div', { class: 'slots' });
    for (var i = 0; i < 7; i++) {
      var id = game.line[i] && byId(game.line[i]) ? game.line[i] : null;
      if (id) {
        var p = byId(id);
        slots.appendChild(el('button', { class: 'slot filled ' + (isMixed() ? (p.gender || '') : '') + (id === lastAdded ? ' in' : ''), type: 'button', 'aria-label': 'Sacar a ' + p.name,
          onclick: (function (pid) { return function () { removeFromLine(pid); }; })(id) }, [
          el('span', { class: 'nm', text: p.name }),
          el('span', { class: 'n', text: (p.number ? '#' + p.number : '') + (isMixed() && p.gender ? ' ' + p.gender : '') })
        ]));
      } else {
        slots.appendChild(el('div', { class: 'slot empty', text: '+' }));
      }
    }
    // la octava celda muestra la acción de limpiar
    slots.appendChild(ids.length ? el('button', { class: 'slot empty', type: 'button', onclick: function () {
      var prev = game.line.slice(); game.line = []; saveGame(); render();
      toast('Línea vaciada', function () { game.line = prev; saveGame(); render(); });
    } }, [el('span', { class: 'n', text: 'Vaciar' })]) : el('div', { class: 'slot empty', style: 'visibility:hidden' }));
    c.appendChild(slots);
    lastAdded = null;

    var bench = sorted(roster.filter(function (p) { return ids.indexOf(p.id) < 0; }));
    if (bench.length) {
      c.appendChild(el('p', { class: 'label', style: 'margin:14px 0 8px', text: 'Banca · toca para entrar' }));
      c.appendChild(el('div', { class: 'bench' }, bench.map(function (p) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { addToLine(p.id); } }, [
          isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '·' }) : null, p.name
        ]);
      })));
    }
    v.appendChild(c);

    v.appendChild(el('div', { class: 'rec-wrap' }, [
      el('button', { id: 'rec-btn', class: 'rec-btn', type: 'button', icon: 'mic', onclick: startPoint }, ['Empezar punto'])
    ]));
    var miss = 7 - ids.length;
    var hint = miss > 0 ? (miss === 1 ? 'Falta 1' : 'Faltan ' + miss) + ' en la línea (puedes empezar igual).'
      : ratio && !ratioOk(gc, ratio) ? 'La línea no cumple ' + ratioLabel(ratio) + '.' : '';
    v.appendChild(el('div', { id: 'rec-status', class: 'rec-status', text: hint }));
  }

  // --- Grabando ---
  function renderRecording(v) {
    var d = game.draft;
    var ids = lineIds();
    var timer = el('span', { class: 'timer muted', id: 'timer' });
    v.appendChild(el('div', { class: 'point-head' }, [
      el('h2', { class: 'title', style: 'margin:0', text: 'Punto ' + (currentIndex() + 1) }),
      el('span', { class: 'spacer' }), timer, typeBadge(pointType())
    ]));
    function tick() {
      var s = Math.floor((Date.now() - (d.startedAt || Date.now())) / 1000);
      var t = $('timer'); if (t) t.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    tick();
    if (!timerId) timerId = setInterval(tick, 1000);

    v.appendChild(el('div', { class: 'rec-wrap' }, [
      el('button', { id: 'rec-btn', class: 'rec-btn recording', type: 'button', icon: 'stop', onclick: endPoint }, ['Terminar'])
    ]));
    v.appendChild(el('div', { id: 'rec-status', class: 'rec-status', text: rec ? 'Escuchando…' : (voiceProblem() ? 'Usa los botones de abajo' : '') }));

    var c = el('div', { class: 'card' }, [
      el('p', { class: 'label', text: 'Eventos' }),
      el('ol', { class: 'live-events', id: 'live-events' }),
      el('details', { class: 'transcript-mini' }, [el('summary', { text: 'Lo que escuché' }), el('div', { id: 'live-text' })])
    ]);
    v.appendChild(c);

    var players = sorted(roster.filter(function (p) { return !ids.length || ids.indexOf(p.id) >= 0; }));
    var pad = el('div', { class: 'card' }, [
      el('p', { class: 'label', text: 'Botones' }),
      el('div', { class: 'pad-players' }, players.map(function (p) {
        return el('button', { class: 'btn', type: 'button', text: p.name, onclick: function (e) { tapAnim(e.currentTarget); appendText(p.name); renderLive(); } });
      })),
      el('div', { class: 'pad-actions' }, [
        ['drop', 'Drop'], ['throwaway', 'Throwaway'], ['D de', 'D de…'], ['gol', 'Gol', 'accent'], ['nos anotan', 'Nos anotan', 'solid'], ['borra', 'Deshacer', 'ghost']
      ].map(function (a) {
        return el('button', { class: 'btn ' + (a[2] || ''), type: 'button', text: a[1], onclick: function (e) { tapAnim(e.currentTarget); appendText(a[0]); renderLive(); } });
      }))
    ]);
    v.appendChild(pad);
    lastLiveCount = Math.max(0, lastLiveCount);
    renderLive(true);
  }
  function tapAnim(b) { b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); buzz(10); }

  function renderLive(initial) {
    var d = game.draft;
    var ol = $('live-events');
    if (!d || d.phase !== 'recording' || !ol) return;
    var t = $('live-text');
    t.innerHTML = '';
    t.appendChild(document.createTextNode(d.transcript || (interim ? '' : '…')));
    if (interim) t.appendChild(el('span', { class: 'interim', text: ' ' + interim }));
    var r = Core.interpret(d.transcript + ' ' + interim, roster, lineIds());
    ol.innerHTML = '';
    var shown = r.events.slice(-2); // altura fija: los botones de abajo no se mueven
    var isNew = !initial && r.events.length > lastLiveCount;
    shown.forEach(function (ev, i) {
      var li = el('li', { class: (ev.uncertain ? 'unc ' : '') + (ev.type === 'goal' ? 'goal ' : '') + (isNew && i === shown.length - 1 ? 'new' : '') }, [
        el('span', { class: 'ev-ico', icon: EV_ICON[ev.type] }), describe(ev)
      ]);
      ol.appendChild(li);
    });
    if (!r.events.length) ol.appendChild(el('li', { class: 'hint', text: 'Ej.: "Pipe a Mono, gol"' }));
    lastLiveCount = r.events.length;
  }

  // --- Revisión ---
  var EMPTY = {
    pass: function () { return { type: 'pass', from: null, to: null }; },
    goal: function () { return { type: 'goal', scorer: null, assist: null }; },
    drop: function () { return { type: 'drop', from: null, to: null }; },
    throwaway: function () { return { type: 'throwaway', from: null }; },
    d: function () { return { type: 'd', player: null }; },
    them: function () { return { type: 'them' }; },
    opp: function () { return { type: 'opp' }; }
  };
  // Campos de cada tipo: [campo, texto antes, título de la hoja, permite "nadie"]
  var ROLES = { pass: ['to', 'from'], goal: ['scorer', 'assist'], drop: ['to', 'from'], throwaway: ['from'], d: ['player'], them: [], opp: [] };
  var FIELDS = {
    pass: [['from', '', '¿Quién lanzó?'], ['to', '→', '¿Quién recibió?']],
    goal: [['scorer', '', '¿Quién anotó?'], ['assist', 'asist.', '¿Quién asistió?', true]],
    drop: [['to', '', '¿A quién se le cayó?'], ['from', 'pase de', '¿Quién lanzó?', true]],
    throwaway: [['from', '', '¿Quién la perdió?']],
    d: [['player', '', '¿Quién hizo la D?']],
    them: [], opp: []
  };

  function renderReview(v) {
    var d = game.draft;
    var animate = reviewAnimate; reviewAnimate = false;
    var isEdit = d.editIndex != null;
    v.appendChild(el('div', { class: 'point-head' }, [
      el('h2', { class: 'title', style: 'margin:0', text: (isEdit ? 'Editar punto ' : 'Punto ') + (currentIndex() + 1) }),
      el('span', { class: 'spacer' }),
      typeBadge(pointType(), function () { d.type = pointType() === 'O' ? 'D' : 'O'; saveGame(); render(); })
    ]));

    var oc = Core.outcomeOf(d.events);
    v.appendChild(el('div', { class: 'banner ' + (oc || 'none') + (animate ? ' pop' : ''), icon: oc === 'us' ? 'check' : oc === 'them' ? 'x' : 'help' },
      [oc === 'us' ? 'Punto nuestro' : oc === 'them' ? 'Punto de ellos' : 'Falta el resultado: agrega Gol o Nos anotan']));

    var uk = d.unknown || [];
    if (uk.length) {
      v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', style: 'margin:0', text: 'No reconocí estas palabras' })].concat(uk.map(function (w) {
        return el('div', { class: 'unknown-item' }, [
          el('b', { text: '«' + w + '»' }), el('span', { class: 'spacer' }),
          el('button', { class: 'btn small', type: 'button', text: '¿Quién es?', onclick: function () {
            openPlayerSheet('¿Quién es «' + w + '»?', null, function (id) {
              if (!id) return;
              var p = byId(id);
              p.aliases = (p.aliases || []).concat([w]);
              saveRoster();
              toast('Listo: «' + w + '» ahora es ' + p.name);
              toReview();
            });
          } }),
          el('button', { class: 'btn small ghost', type: 'button', text: 'Ignorar', onclick: function () { d.unknown = uk.filter(function (x) { return x !== w; }); saveGame(); render(); } })
        ]);
      }))));
    }

    var ol = el('ol', { class: 'events' });
    if (!d.events.length) ol.appendChild(el('li', { class: 'card empty-state' }, [el('b', { text: 'Sin eventos' }), 'Agrégalos abajo o corrige la narración.']));
    d.events.forEach(function (ev, idx) { ol.appendChild(eventRow(ev, idx, animate)); });
    v.appendChild(ol);

    v.appendChild(el('div', { class: 'add-row' }, [['pass', 'Pase'], ['goal', 'Gol'], ['drop', 'Drop'], ['throwaway', 'Throwaway'], ['d', 'D'], ['them', 'Nos anotan'], ['opp', 'Pierden ellos']].map(function (a) {
      return el('button', { class: 'btn small', type: 'button', icon: 'plus', onclick: function () {
        var ev = EMPTY[a[0]](); d.events.push(ev); saveGame(); render();
        var f = FIELDS[ev.type][0];
        if (f) openPlayerSheet(f[2], null, function (id) { ev[f[0]] = id; saveGame(); render(); });
      } }, [' ' + a[1]]);
    })));

    var ta = el('textarea', { rows: 3 });
    ta.value = d.transcript || '';
    ta.addEventListener('input', function () { d.transcript = ta.value; saveGame(); });
    v.appendChild(el('details', { class: 'card' }, [
      el('summary', { class: 'label', style: 'margin:0;cursor:pointer', text: 'Narración' }), ta,
      el('button', { class: 'btn small', type: 'button', text: 'Volver a interpretar', onclick: function () { d.transcript = ta.value; toReview(); } })
    ]));

    v.appendChild(el('button', { class: 'btn link danger-text', type: 'button', text: isEdit ? 'Descartar cambios' : 'Descartar punto', onclick: discardPoint }));

    v.appendChild(el('div', { class: 'bottom-bar' }, [
      isEdit ? el('span') : el('button', { class: 'btn big', type: 'button', icon: 'mic', 'aria-label': 'Seguir narrando', onclick: function () {
        d.phase = 'recording'; saveGame(); lastLiveCount = d.events.length; startListening(); render();
      } }),
      el('button', { class: 'btn solid big', type: 'button', icon: 'check', onclick: confirmPoint }, [' Confirmar'])
    ]));
  }

  function eventRow(ev, idx, animate) {
    var d = game.draft;
    var li = el('li', { class: 'ev' + (ev.uncertain ? ' unc' : '') + (ev.type === 'goal' ? ' goal' : '') + (animate ? ' stagger' + (ev.uncertain ? ' flash' : '') : ''), style: '--i:' + idx });
    li.appendChild(el('button', { class: 'pick type', type: 'button', icon: EV_ICON[ev.type], 'aria-label': 'Cambiar tipo', onclick: function () { openTypeSheet(ev, idx); } },
      [FIELDS[ev.type].length ? EV_LABEL[ev.type] : EV_LABEL[ev.type]]));
    FIELDS[ev.type].forEach(function (f) {
      if (f[1]) li.appendChild(el('span', { class: 'word', text: f[1] }));
      var id = ev[f[0]];
      li.appendChild(el('button', { class: 'pick' + (id ? '' : ' empty'), type: 'button', text: id ? playerName(id) : (f[3] ? '—' : '¿quién?'), onclick: function () {
        openPlayerSheet(f[2], id, function (nid) { ev[f[0]] = nid; delete ev.uncertain; saveGame(); render(); }, f[3]);
      } }));
    });
    li.appendChild(el('button', { class: 'icon-btn del', type: 'button', icon: 'x', 'aria-label': 'Borrar evento', onclick: function () { removeEvent(li, idx); } }));
    if (ev.uncertain) li.appendChild(el('div', { class: 'heard', text: 'Revisa: escuché «' + ev.uncertain + '»' }));
    swipeToDelete(li, function () { removeEvent(li, idx); });
    return li;
  }
  function removeEvent(li, idx) {
    var d = game.draft;
    var ev = d.events[idx];
    li.classList.add('leaving');
    buzz(15);
    setTimeout(function () {
      d.events.splice(idx, 1); saveGame(); render();
      toast('Evento borrado', function () { d.events.splice(Math.min(idx, d.events.length), 0, ev); saveGame(); render(); });
    }, 220);
  }
  function swipeToDelete(li, onDelete) {
    var x0 = null, y0 = null, dx = 0, active = false;
    li.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; active = false; });
    li.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (!active && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - y0)) { active = true; li.style.transition = 'none'; }
      if (active) { li.style.transform = 'translateX(' + Math.min(0, dx) + 'px)'; li.style.opacity = String(1 + Math.min(0, dx) / 300); }
    });
    function end() {
      if (x0 === null) return;
      li.style.transition = ''; x0 = null;
      if (active && dx < -90) onDelete(); else { li.style.transform = ''; li.style.opacity = ''; }
    }
    li.addEventListener('pointerup', end);
    li.addEventListener('pointercancel', end);
  }
  function openTypeSheet(ev, idx) {
    var d = game.draft;
    openSheet(function (sh, close) {
      sh.appendChild(el('h3', { text: 'Tipo de evento' }));
      sh.appendChild(el('div', { class: 'sheet-grid two' }, Object.keys(EV_LABEL).map(function (t) {
        return el('button', { class: 'btn' + (t === ev.type ? ' current' : ''), type: 'button', icon: EV_ICON[t], onclick: function () {
          close();
          if (t === ev.type) return;
          var ne = EMPTY[t]();
          // Conserva a los jugadores: el principal (receptor, anotador…) y el secundario (lanzador, asistente).
          var from = ROLES[ev.type].map(function (k) { return ev[k]; });
          ROLES[t].forEach(function (k, i) { ne[k] = from[i] || null; });
          // Un drop guarda el pase incompleto; si en realidad lo atrapó, ese pase vuelve a contar.
          if (ev.type === 'drop' && ev.from && ev.to && t !== 'pass' && t !== 'drop') {
            d.events.splice(idx, 0, { type: 'pass', from: ev.from, to: ev.to }); idx++;
          }
          d.events[idx] = ne; saveGame(); render();
        } }, [' ' + EV_LABEL[t]]);
      })));
    });
  }

  // ---------- Plantilla ----------
  var editingId = null, formGender = 'H';
  function renderRoster() {
    var v = $('view-roster');
    v.innerHTML = '';
    v.appendChild(el('h2', { class: 'title', text: 'Plantilla' }));

    // Equipo
    var team = el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Categoría' }),
      seg([['mixto', 'Mixto'], ['open', 'Open'], ['femenino', 'Femenino']], settings.division, function (val) { settings.division = val; saveSettings(); render(); })]);
    if (isMixed()) {
      team.appendChild(el('p', { class: 'field-label', text: 'Proporción en cancha' }));
      team.appendChild(seg([['abba', 'ABBA'], ['offense', 'La ofensa decide']], settings.mixedRule, function (val) { settings.mixedRule = val; saveSettings(); render(); }));
      team.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: settings.mixedRule === 'abba'
        ? 'La app te dice si toca 4 H · 3 M o 3 H · 4 M en cada punto.' : 'La app solo cuenta cuántos H y M hay en la línea.' }));
    }
    v.appendChild(team);

    // Formulario
    var name = el('input', { type: 'text', placeholder: 'Apodo, ej. Pipe', autocomplete: 'off', 'aria-label': 'Apodo' });
    var num = el('input', { class: 'num', inputmode: 'numeric', placeholder: '#', 'aria-label': 'Número' });
    var aliases = el('input', { type: 'text', placeholder: 'Cómo lo escribe el celular (opcional)', autocomplete: 'off', 'aria-label': 'Variantes' });
    var editing = editingId ? byId(editingId) : null;
    if (editing) {
      name.value = editing.name; num.value = editing.number || ''; aliases.value = (editing.aliases || []).join(', ');
      formGender = editing.gender || formGender;
    }
    var form = el('form', { class: 'card', id: 'player-form' }, [
      el('p', { class: 'label', style: 'margin:0', text: editing ? 'Editar jugador' : 'Agregar jugador' }),
      el('div', { class: 'form-row' }, [name, num, isMixed() ? seg([['H', 'H'], ['M', 'M']], formGender, function (val) { formGender = val; form.querySelectorAll('.form-row .seg button').forEach(function (b) { b.classList.toggle('on', b.textContent === val); }); }) : null]),
      aliases,
      el('div', { class: 'row' }, [
        el('button', { class: 'btn accent', style: 'flex:1', type: 'submit', text: editing ? 'Guardar' : 'Agregar' }),
        editing ? el('button', { class: 'btn ghost', type: 'button', text: 'Cancelar', onclick: function () { editingId = null; render(); } }) : null
      ])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = name.value.trim();
      if (!n) { name.focus(); return; }
      var clash = roster.find(function (x) { return x.id !== editingId && Core.normalize(x.name) === Core.normalize(n); });
      if (clash) { toast('Ya hay un ' + clash.name + '. Usa otro apodo.'); name.focus(); return; }
      var al = aliases.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (editingId) {
        var p = byId(editingId);
        p.name = n; p.number = num.value.trim(); p.aliases = al; if (isMixed()) p.gender = formGender;
        toast(n + ' actualizado');
      } else {
        roster.push({ id: uid(), name: n, number: num.value.trim(), aliases: al, gender: isMixed() ? formGender : null });
      }
      editingId = null;
      saveRoster(); render();
      var f = $('player-form'); if (f) f.querySelector('input').focus();
    });
    v.appendChild(form);

    // Lista
    var list = el('div', { class: 'card' });
    list.appendChild(el('div', { class: 'row', style: 'margin-bottom:4px' }, [
      el('p', { class: 'label', style: 'margin:0', text: 'Jugadores · ' + roster.length + (isMixed() ? ' (' + genderCount(roster.map(function (p) { return p.id; })).H + ' H · ' + genderCount(roster.map(function (p) { return p.id; })).M + ' M)' : '') }),
      el('span', { class: 'spacer' }),
      roster.length && SR ? el('button', { class: 'btn small accent', type: 'button', icon: 'mic', onclick: function () { openVoiceTest(sorted(roster).map(function (p) { return p.id; })); } }, [' Probar voz']) : null
    ]));
    if (!roster.length) {
      list.appendChild(el('div', { class: 'empty-state' }, [el('b', { text: 'Carga a tu equipo' }), 'Apodos de una palabra que suenen distinto entre sí.',
        el('div', {}, [el('button', { class: 'btn small', style: 'margin-top:12px', type: 'button', text: 'Usar plantilla de ejemplo', onclick: loadSample })])]));
    } else {
      var ul = el('ul', { class: 'list' });
      roster.slice().sort(function (a, b) { return (+a.number || 999) - (+b.number || 999) || a.name.localeCompare(b.name); }).forEach(function (p) {
        var li = el('li', {}, [
          el('span', { class: 'jersey', text: p.number ? p.number : '·' }),
          isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '?' }) : null,
          el('span', { class: 'name' }, [p.name, p.aliases && p.aliases.length ? el('small', { text: 'también: ' + p.aliases.join(', ') }) : null]),
          SR ? el('button', { class: 'icon-btn', type: 'button', icon: 'mic', 'aria-label': 'Probar voz de ' + p.name, onclick: function () { openVoiceTest([p.id]); } }) : null,
          el('button', { class: 'icon-btn', type: 'button', icon: 'pencil', 'aria-label': 'Editar ' + p.name, onclick: function () { editingId = p.id; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }),
          el('button', { class: 'icon-btn', type: 'button', icon: 'trash', 'aria-label': 'Borrar ' + p.name, onclick: function () {
            li.classList.add('removing');
            setTimeout(function () {
              var i = roster.indexOf(p);
              roster.splice(i, 1); saveRoster(); render();
              toast(p.name + ' borrado', function () { roster.splice(i, 0, p); saveRoster(); render(); });
            }, 220);
          } })
        ]);
        ul.appendChild(li);
      });
      list.appendChild(ul);
    }
    v.appendChild(list);

    // Líneas
    var lc = el('div', { class: 'card' });
    lc.appendChild(el('div', { class: 'row', style: 'margin-bottom:4px' }, [
      el('p', { class: 'label', style: 'margin:0', text: 'Líneas guardadas' }), el('span', { class: 'spacer' }),
      roster.length ? el('button', { class: 'btn small', type: 'button', icon: 'plus', onclick: function () { openLineEditor(null); } }, [' Nueva']) : null
    ]));
    if (!lines.length) lc.appendChild(el('p', { class: 'muted small', style: 'margin:6px 0 0', text: 'Opcional. Guarda tus líneas de ataque y defensa para ponerlas con un toque durante el pull.' }));
    else {
      var lul = el('ul', { class: 'list' });
      lines.forEach(function (l, i) {
        var ps = l.players.filter(byId);
        lul.appendChild(el('li', {}, [
          el('span', { class: 'name' }, [l.name, ' ', l.type ? typeBadgeMini(l.type) : null, el('small', { text: ps.map(playerName).join(', ') })]),
          el('button', { class: 'icon-btn', type: 'button', icon: 'pencil', 'aria-label': 'Editar ' + l.name, onclick: function () { openLineEditor(l); } }),
          el('button', { class: 'icon-btn', type: 'button', icon: 'trash', 'aria-label': 'Borrar ' + l.name, onclick: function () {
            lines.splice(i, 1); saveLines(); render();
            toast('Línea borrada', function () { lines.splice(i, 0, l); saveLines(); render(); });
          } })
        ]));
      });
      lc.appendChild(lul);
    }
    v.appendChild(lc);

    // Voz
    var langSel = el('select', { 'aria-label': 'Idioma de reconocimiento' }, [['es-CO', 'Español (Colombia)'], ['es-MX', 'Español (México)'], ['es-ES', 'Español (España)'], ['es-AR', 'Español (Argentina)'], ['es-US', 'Español (EE. UU.)']].map(function (o) {
      return el('option', { value: o[0], text: o[1], selected: o[0] === settings.lang });
    }));
    langSel.addEventListener('change', function () { settings.lang = langSel.value; saveSettings(); });
    var local = el('input', { type: 'checkbox' }); local.checked = !!settings.local;
    local.addEventListener('change', function () { settings.local = local.checked; saveSettings(); });
    v.appendChild(el('div', { class: 'card stack' }, [el('p', { class: 'label', style: 'margin:0', text: 'Voz' }), langSel,
      el('label', { class: 'check' }, [local, 'Reconocer sin internet (experimental, Chrome reciente)'])]));
  }
  function typeBadgeMini(t) { return el('span', { class: 'badge mini ' + t, text: t === 'O' ? 'Ataque' : 'Defensa' }); }

  function loadSample() {
    [['Pipe', 7, 'H'], ['Mono', 12, 'H'], ['Juancho', 3, 'H'], ['Tato', 10, 'H'], ['Sara', 9, 'M'], ['Caro', 21, 'M'], ['Vale', 4, 'M'], ['Lu', 14, 'M'], ['Nico', 22, 'H'], ['Dani', 8, 'M']]
      .forEach(function (x) {
        if (!roster.some(function (p) { return Core.normalize(p.name) === Core.normalize(x[0]); })) {
          roster.push({ id: uid(), name: x[0], number: String(x[1]), aliases: [], gender: x[2] });
        }
      });
    saveRoster(); render();
  }

  function openLineEditor(line) {
    var draft = { name: line && line.name || '', players: (line ? line.players : []).filter(byId).slice(), type: line && line.type || '' };
    if (line && !line.id) draft.type = line.type || ''; // viene de "Guardar línea"
    var saved = false;
    openSheet(function (sh, close) {
      function build() {
        sh.innerHTML = '';
        sh.appendChild(el('div', { class: 'grab' }));
        sh.appendChild(el('h3', { text: line && line.id ? 'Editar línea' : 'Nueva línea' }));
        var nm = el('input', { type: 'text', placeholder: 'Nombre, ej. Ataque titular', value: draft.name, autocomplete: 'off' });
        nm.addEventListener('input', function () { draft.name = nm.value; });
        sh.appendChild(nm);
        sh.appendChild(el('p', { class: 'field-label', text: 'Para puntos de' }));
        sh.appendChild(seg([['', 'Cualquiera'], ['O', 'Ataque'], ['D', 'Defensa']], draft.type, function (val) { draft.type = val; draft.name = nm.value; build(); }));
        var gc = genderCount(draft.players);
        sh.appendChild(el('p', { class: 'field-label', text: 'Jugadores · ' + draft.players.length + '/7' + (isMixed() ? ' · ' + gc.H + ' H · ' + gc.M + ' M' : '') }));
        sh.appendChild(el('div', { class: 'bench' }, sorted(roster).map(function (p) {
          var on = draft.players.indexOf(p.id) >= 0;
          return el('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', onclick: function () {
            draft.name = nm.value;
            if (on) draft.players = draft.players.filter(function (x) { return x !== p.id; });
            else if (draft.players.length < 7) draft.players.push(p.id);
            else { toast('Máximo 7 por línea'); return; }
            build();
          } }, [isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '·' }) : null, p.name]);
        })));
        sh.appendChild(el('button', { class: 'btn accent big block', style: 'margin-top:16px', type: 'button', text: 'Guardar línea', onclick: function () {
          if (saved) return;
          draft.name = nm.value.trim() || (draft.type === 'O' ? 'Ataque' : draft.type === 'D' ? 'Defensa' : 'Línea ' + (lines.length + 1));
          if (!draft.players.length) { toast('Elige al menos un jugador'); return; }
          if (line && line.id) { line.name = draft.name; line.players = draft.players; line.type = draft.type; }
          else lines.push({ id: uid('l'), name: draft.name, players: draft.players, type: draft.type });
          saved = true;
          saveLines(); close(); toast('Línea «' + draft.name + '» guardada'); render();
        } }));
      }
      build();
    });
  }

  // ---------- Prueba de voz ----------
  function openVoiceTest(queue) {
    var idx = 0, tr = null;
    openSheet(function (sh, close) {
      function stop() { if (tr) { try { tr.abort(); } catch (e) { /* ya terminó */ } tr = null; } }
      function step() {
        stop();
        var p = byId(queue[idx]);
        sh.innerHTML = '';
        sh.appendChild(el('div', { class: 'grab' }));
        var heard = el('div', { class: 'heard muted', text: 'Escuchando…' });
        var actions = el('div', { class: 'row' });
        sh.appendChild(el('div', { class: 'voice-test' }, [
          el('p', { class: 'label', text: (queue.length > 1 ? (idx + 1) + ' de ' + queue.length + ' · ' : '') + 'Di claramente' }),
          el('div', { class: 'say', text: p.name }), heard, actions
        ]));
        function finishWith(msg, cls) {
          heard.textContent = msg; heard.className = 'heard ' + (cls || '');
          actions.innerHTML = '';
          actions.appendChild(el('button', { class: 'btn', style: 'flex:1', type: 'button', icon: 'mic', onclick: step }, [' Repetir']));
          actions.appendChild(el('button', { class: 'btn solid', style: 'flex:1', type: 'button', text: idx < queue.length - 1 ? 'Siguiente' : 'Listo', onclick: function () {
            if (idx < queue.length - 1) { idx++; step(); } else { close(); render(); }
          } }));
        }
        if (voiceProblem()) { finishWith(voiceProblem()); return; }
        tr = new SR();
        tr.lang = settings.lang || 'es-CO'; tr.continuous = false; tr.interimResults = true; tr.maxAlternatives = 3;
        var got = false;
        tr.onresult = function (e) {
          var res = e.results[e.results.length - 1];
          heard.textContent = '«' + res[0].transcript + '»';
          if (!res.isFinal) return;
          got = true;
          var alts = []; for (var i = 0; i < res.length; i++) alts.push(Core.normalize(res[i].transcript));
          var keys = [p.name].concat(p.aliases || []).map(Core.normalize);
          if (alts.some(function (a) { return keys.indexOf(a) >= 0; })) { buzz(30); finishWith('✓ Lo entiende bien', 'ok'); return; }
          var top = alts[0];
          var other = roster.find(function (x) { return x.id !== p.id && [x.name].concat(x.aliases || []).map(Core.normalize).indexOf(top) >= 0; });
          if (other) { finishWith('Ojo: «' + top + '» es como suena ' + other.name + '. Prueba un apodo más distinto.'); return; }
          if (top && top.length <= 24) {
            p.aliases = (p.aliases || []).concat([top]); saveRoster();
            finishWith('Entendió «' + top + '». Lo guardé como variante de ' + p.name + ' ✓', 'ok');
          } else finishWith('No entendí bien. Repite más cerca del celular.');
        };
        tr.onerror = function (e) { got = true; if (e.error !== 'aborted') finishWith(e.error === 'not-allowed' ? 'Sin permiso de micrófono.' : 'No escuché nada. Intenta otra vez.'); };
        tr.onend = function () { if (!got && tr) finishWith('No escuché nada. Intenta otra vez.'); tr = null; };
        try { tr.start(); } catch (e) { finishWith('No pude abrir el micrófono.'); }
      }
      step();
    }, function () { if (tr) { try { tr.abort(); } catch (e) { /* ya terminó */ } tr = null; } });
  }

  // ---------- Estadísticas ----------
  var statsFilter = '';
  // Lo más importante primero: en el celular se ve sin deslizar la tabla.
  var COLS = [['plusMinus', '+/-'], ['goals', 'Gol'], ['assists', 'Ast'], ['ds', 'D'], ['drops', 'Drop'], ['throwaways', 'TA'],
    ['completions', 'Pas'], ['catches', 'Rec'], ['points', 'Pts']];
  function statRows(stats) {
    var usesLine = game.points.some(function (p) { return p.line && p.line.length; });
    var cols = COLS.filter(function (c) { return usesLine || c[0] !== 'points'; });
    var rows = Object.keys(stats.players).map(function (id) { return { id: id, s: stats.players[id] }; })
      .filter(function (r) { return byId(r.id) || COLS.some(function (c) { return r.s[c[0]]; }); })
      .sort(function (a, b) { return b.s.plusMinus - a.s.plusMinus || b.s.goals - a.s.goals || b.s.points - a.s.points || playerName(a.id).localeCompare(playerName(b.id)); });
    return { cols: cols, rows: rows };
  }

  function renderStats() {
    var v = $('view-stats');
    v.innerHTML = '';
    var all = Core.computeStats(game.points, roster);
    var stats = statsFilter ? Core.computeStats(game.points, roster, statsFilter) : all;
    v.appendChild(el('div', { class: 'card score-card' }, [
      el('div', {}, [el('p', { class: 'label', text: 'Nosotros' }), el('div', { class: 'n', text: all.score.us })]),
      el('div', { class: 'dash', text: '–' }),
      el('div', {}, [el('p', { class: 'label', text: game.rival || 'Ellos' }), el('div', { class: 'n', text: all.score.them })])
    ]));
    function metric(cls, title, m, help) {
      var pct = m.played ? Math.round(100 * m.won / m.played) : 0;
      return el('div', { class: 'metric ' + cls }, [
        el('p', { class: 'label', text: title }),
        el('div', { class: 'v', html: null }, [String(m.won), el('small', { text: ' / ' + m.played })]),
        el('div', { class: 'bar' }, [el('i', { style: 'width:' + pct + '%' })]),
        el('p', { class: 'muted small', style: 'margin:6px 0 0', text: help })
      ]);
    }
    v.appendChild(el('div', { class: 'metrics' }, [
      metric('O', 'Holds', all.holds, 'Puntos de ataque ganados'),
      metric('D', 'Breaks', all.breaks, 'Puntos de defensa ganados')
    ]));
    v.appendChild(seg([['', 'Todo'], ['O', 'Ataque'], ['D', 'Defensa']], statsFilter, function (val) { statsFilter = val; render(); }));

    var t = statRows(stats);
    var table = el('table');
    table.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'Jugador' })].concat(t.cols.map(function (c) { return el('th', { text: c[1] }); })))]));
    var body = el('tbody');
    t.rows.forEach(function (r) {
      body.appendChild(el('tr', {}, [el('td', { text: playerName(r.id) })].concat(t.cols.map(function (c) {
        var val = r.s[c[0]];
        return el('td', { class: (c[0] === 'plusMinus' ? 'pm' : '') + (val === 0 ? ' zero' : ''), text: c[0] === 'plusMinus' && val > 0 ? '+' + val : String(val) });
      }))));
    });
    if (!t.rows.length) body.appendChild(el('tr', {}, [el('td', { class: 'muted', text: 'Sin datos todavía' })]));
    table.appendChild(body);
    v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Por jugador' }), el('div', { class: 'table-wrap' }, [table]),
      el('p', { class: 'muted small', style: 'margin:10px 0 0', text: 'Pas = pases completos · Rec = recepciones · TA = throwaways · +/- = Gol + Ast + D − Drop − TA' })]));

    var conns = stats.connections.slice(0, 6);
    var max = conns.length ? conns[0].count : 1;
    v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Conexiones' }),
      conns.length ? el('ul', { class: 'conn' }, conns.map(function (c) {
        return el('li', {}, [el('span', { text: playerName(c.from) + ' → ' + playerName(c.to) }),
          el('span', { class: 'cbar' }, [el('i', { style: 'width:' + Math.round(100 * c.count / max) + '%' })]), el('span', { class: 'cn', text: c.count })]);
      })) : el('p', { class: 'muted small', style: 'margin:0', text: 'Aparecen cuando haya pases.' })]));

    var pl = el('ul', { class: 'points' });
    var us = 0, them = 0;
    game.points.forEach(function (p, i) {
      var oc = Core.outcomeOf(p.events);
      if (oc === 'us') us++; if (oc === 'them') them++;
      var goal = p.events.filter(function (e) { return e.type === 'goal'; })[0];
      var txt = us + '–' + them + ' · ' + (goal ? playerName(goal.scorer) + (goal.assist ? ' de ' + playerName(goal.assist) : '') : oc === 'them' ? 'de ellos' : 'sin resultado');
      pl.appendChild(el('li', {}, [
        el('span', { class: 'res ' + (oc || ''), icon: oc === 'us' ? 'check' : oc === 'them' ? 'x' : 'help' }),
        p.type ? typeBadgeMini(p.type) : null,
        el('span', { class: 'txt', text: txt }),
        el('button', { class: 'icon-btn', type: 'button', icon: 'pencil', 'aria-label': 'Editar punto ' + (i + 1), onclick: function () {
          if (game.draft && game.draft.phase === 'recording') { toast('Termina el punto en curso primero'); return; }
          game.draft = { phase: 'review', transcript: p.transcript || '', events: clone(p.events), unknown: [], editIndex: i, type: p.type };
          reviewAnimate = true;
          saveGame(); show('game');
        } })
      ]));
    });
    v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Puntos' }),
      game.points.length ? pl : el('p', { class: 'muted small', style: 'margin:0', text: 'Aún no hay puntos confirmados.' })]));

    v.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'Exportar CSV', onclick: exportCsv }),
      el('button', { class: 'btn danger-text', style: 'flex:1', type: 'button', text: 'Nuevo partido', onclick: function () {
        var backup = clone(game);
        game = Object.assign(newGame(), { line: backup.line, startType: backup.startType, firstRatio: backup.firstRatio });
        saveGame(); shownScore = null; show('game');
        toast('Partido nuevo', function () { game = backup; saveGame(); shownScore = null; render(); });
      } })
    ]));
  }

  function exportCsv() {
    var stats = Core.computeStats(game.points, roster);
    var t = statRows(stats);
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var out = [['Jugador'].concat(t.cols.map(function (c) { return c[1]; })).join(',')];
    t.rows.forEach(function (r) { out.push([q(playerName(r.id))].concat(t.cols.map(function (c) { return r.s[c[0]]; })).join(',')); });
    out.push('', 'Lanzador,Receptor,Pases');
    stats.connections.forEach(function (c) { out.push(q(playerName(c.from)) + ',' + q(playerName(c.to)) + ',' + c.count); });
    out.push('', 'Marcador,' + stats.score.us + ',' + stats.score.them);
    out.push('Holds,' + stats.holds.won + ',' + stats.holds.played, 'Breaks,' + stats.breaks.won + ',' + stats.breaks.played);
    var blob = new Blob(['﻿' + out.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'ultivoz-' + (game.rival ? Core.normalize(game.rival).replace(/ /g, '-') + '-' : '') + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- Inicio ----------
  // Si se recargó a mitad de un punto, pasamos a revisión para no perder lo narrado.
  if (game.draft && game.draft.phase === 'recording') {
    var rr = Core.interpret(game.draft.transcript, roster, lineIds());
    game.draft.events = rr.events; game.draft.unknown = rr.unknown; game.draft.phase = 'review';
    saveGame(); reviewAnimate = true;
  }
  show(roster.length ? 'game' : 'roster');

  if ('serviceWorker' in navigator && window.isSecureContext && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
