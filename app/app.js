/* Narra — interfaz. La interpretación y las estadísticas viven en core.js. */
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
    chevron: '<path d="M7 10l5 5 5-5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>'
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
    return { id: uid('g'), createdAt: Date.now(), started: false, rival: '', startType: 'O', firstRatio: '4M', target: 15, points: [], line: [], draft: null, typeOverride: null, halftime: null };
  }
  var game = Object.assign(newGame(), load(KEYS.game, {}) || {});
  if (game.points.length && !game.started) game.started = true; // datos de la versión anterior
  if (!game.createdAt) game.createdAt = Date.now();
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
  function ratioLabel(r) { return r === '4H' ? '4 chicos' : '4 chicas'; }

  function currentIndex() { var d = game.draft; return d && d.editIndex != null ? d.editIndex : game.points.length; }
  // Solo cuentan los puntos con resultado (un punto guardado sin resultado no mueve el marcador ni la proporción).
  function scoredBefore(i) {
    var n = 0;
    for (var k = 0; k < i && k < game.points.length; k++) if (Core.outcomeOf(game.points[k].events || [])) n++;
    return n;
  }
  function pointNumber() { return scoredBefore(currentIndex()) + 1; }
  function pointType() {
    var d = game.draft;
    if (d && d.type) return d.type;
    return game.typeOverride || Core.nextPointType(game.points, game.startType, game.halftime);
  }
  function pointRatio() {
    var d = game.draft;
    if (d && d.editIndex != null) return game.points[d.editIndex].ratio || null;
    return useAbba() ? Core.ratioFor(scoredBefore(game.points.length), game.firstRatio) : null;
  }

  function rivalName() { return game.rival || 'ellos'; }
  function rivalShort() { return game.rival && game.rival.length <= 9 ? game.rival : 'ellos'; }
  function interp(text, withStart) {
    // Siempre sabemos quién empieza con el disco: así "throwaway" en defensa se entiende como error de ellos.
    return Core.interpret(text, roster, lineIds(), { rival: game.rival, start: pointType() === 'O' ? 'us' : 'them' });
  }

  function describe(ev, nameFn) {
    var n = nameFn || playerName;
    switch (ev.type) {
      case 'pass': return n(ev.from) + ' → ' + n(ev.to);
      case 'goal': return 'Gol de ' + n(ev.scorer) + (ev.assist ? ' · asist. ' + n(ev.assist) : '');
      case 'drop': return 'Drop de ' + n(ev.to);
      case 'throwaway': return 'Throwaway de ' + n(ev.from);
      case 'd': return 'D de ' + n(ev.player);
      case 'them': return 'Punto de ellos';
      case 'opp': return (ev.kind === 'drop' ? 'Drop de ' : ev.kind === 'throwaway' ? 'Throwaway de ' : 'Error de ') + rivalName();
    }
    return ev.type;
  }
  var EV_ICON = { pass: 'arrow', goal: 'flag', drop: 'drop', throwaway: 'throw', d: 'block', them: 'x', opp: 'swap' };
  var EV_LABEL = { pass: 'Pase', goal: 'Gol', drop: 'Drop', throwaway: 'Throwaway', d: 'D', them: 'Nos anotan', opp: 'Error rival' };

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

  // En mixto, separa chicos y chicas (más fácil de encontrar cuando toca usar botones).
  function genderGroups(list) {
    if (!isMixed()) return [{ label: null, key: '', players: list }];
    var g = [{ label: 'Chicos', key: 'H', players: [] }, { label: 'Chicas', key: 'M', players: [] }, { label: 'Sin asignar', key: 'X', players: [] }];
    list.forEach(function (p) { g[p.gender === 'H' ? 0 : p.gender === 'M' ? 1 : 2].players.push(p); });
    return g.filter(function (x) { return x.players.length; });
  }
  function grouped(list, make, cls, layout) {
    var groups = genderGroups(list);
    if (!groups.length || !groups[0].label) return el('div', { class: cls }, list.map(make));
    return el('div', { class: layout === 'cols' ? 'pad-groups' : 'g-stack' }, groups.map(function (g) {
      return el('div', { class: 'g-group ' + g.key }, [
        el('p', { class: 'g-label', text: g.label + ' · ' + g.players.length }),
        el('div', { class: cls }, g.players.map(make))
      ]);
    }));
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
      var mk = function (p) { return playerButton(p, current, pick); };
      if (on.length) sh.appendChild(grouped(on, mk, 'sheet-grid'));
      if (off.length) {
        sh.appendChild(el('p', { class: 'label sheet-sub', text: on.length ? 'Resto de la plantilla' : 'Plantilla' }));
        sh.appendChild(grouped(off, mk, 'sheet-grid'));
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
  var lastFinalNorm = '', restartLog = [], voicePaused = false, voiceState = 'off';

  function voiceProblem() {
    if (!SR) return 'Este navegador no reconoce voz. Usa Chrome (Android) o Safari (iPhone). Mientras tanto, usa los botones.';
    if (!window.isSecureContext) return 'La voz necesita HTTPS. Abre la app por su enlace https (ver README). Mientras tanto, usa los botones.';
    return null;
  }
  function setStatus(t) { var s = $('rec-status'); if (s) s.textContent = t || ''; }

  // Estado visible de la voz: escuchando / reconectando / en pausa / error.
  var VOICE_TEXT = { listening: 'Escuchando', restarting: 'Conectando…', paused: 'Voz en pausa', error: 'Voz detenida', off: '' };
  function setVoiceState(st, msg) {
    voiceState = st;
    var pill = $('voice-pill');
    if (pill) {
      pill.className = 'voice-pill ' + st;
      pill.textContent = VOICE_TEXT[st] || '';
    }
    var pb = $('pause-btn');
    if (pb) {
      pb.innerHTML = '';
      pb.insertAdjacentHTML('afterbegin', svg(st === 'paused' || st === 'error' ? 'mic' : 'pause'));
      pb.appendChild(document.createTextNode(st === 'paused' || st === 'error' ? ' Reanudar voz' : ' Pausar voz'));
      pb.hidden = !!voiceProblem();
    }
    recBtnClass('mute', st !== 'listening' && st !== 'restarting');
    if (msg !== undefined) setStatus(msg);
  }

  function appendText(piece) {
    var d = game.draft;
    piece = String(piece || '').trim();
    if (!d || !piece) return;
    d.transcript = d.transcript ? d.transcript + ', ' + piece : piece;
    saveGame();
  }

  // Chrome en Android a veces repite lo ya dicho en cada resultado ("pipe a mono", "pipe a mono mono a sara"):
  // solo agregamos lo nuevo para no inventar pases.
  function commitFinal(text) {
    var n = Core.normalize(text);
    if (!n) return;
    if (n === lastFinalNorm) return;
    var add = text;
    if (lastFinalNorm && n.indexOf(lastFinalNorm + ' ') === 0) add = n.slice(lastFinalNorm.length).trim();
    lastFinalNorm = n;
    appendText(add);
    showHeard(add, true);
  }

  // De las alternativas que da el celular, usamos la que reconoce más jugadores y eventos.
  function bestAlternative(res) {
    var best = res[0] ? res[0].transcript : '';
    if (res.length < 2) return best;
    var opts = { rival: game.rival }, bestScore = Core.scoreText(best, roster, lineIds(), opts);
    for (var i = 1; i < res.length; i++) {
      var sc = Core.scoreText(res[i].transcript, roster, lineIds(), opts);
      if (sc > bestScore) { best = res[i].transcript; bestScore = sc; }
    }
    return best;
  }

  function recBtnClass(cls, on) { var b = $('rec-btn'); if (b) b.classList.toggle(cls, on); }
  function blip() { var b = $('rec-btn'); if (!b) return; b.classList.remove('blip'); void b.offsetWidth; b.classList.add('blip'); }

  function keepAwake() {
    if (!navigator.wakeLock || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (w) {
      wakeLock = w;
      w.addEventListener('release', function () { if (wakeLock === w) wakeLock = null; });
    }).catch(function () {});
  }

  function startListening() {
    if (voiceProblem()) return;
    wantListening = true; voicePaused = false;
    if (voiceState !== 'listening') voiceState = 'restarting';
    var r = new SR();
    rec = r;
    r.lang = settings.lang || 'es-CO';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 4;
    if (settings.local && 'processLocally' in r) { try { r.processLocally = true; } catch (e) { /* no soportado */ } }
    // Nota: no usamos "phrases" (pistas de nombres): en Chrome con reconocimiento en la nube
    // da "phrases-not-supported" y corta la voz una y otra vez.
    finalsCommitted = 0; interim = '';
    r.onresult = function (e) {
      try {
        var tmp = '';
        for (var i = finalsCommitted; i < e.results.length; i++) {
          var res = e.results[i];
          if (!res || !res.length) continue;
          if (res.isFinal) { commitFinal(bestAlternative(res)); finalsCommitted = i + 1; tmp = ''; }
          else tmp += ' ' + res[0].transcript;
        }
        interim = tmp.trim();
        if (interim) showHeard(interim, false);
        setVoiceState('listening');
        blip();
        renderLive();
      } catch (err) { logError('onresult: ' + err.message); }
    };
    r.onstart = function () { setVoiceState('listening', ''); };
    r.onspeechstart = function () { recBtnClass('hearing', true); };
    r.onspeechend = function () { recBtnClass('hearing', false); };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListening = false; setVoiceState('error', 'Sin permiso de micrófono: usa los botones o revisa los permisos.');
      } else if (e.error === 'network') {
        wantListening = false; setVoiceState('error', 'Sin señal para la voz: usa los botones.');
      } else if (e.error === 'language-not-supported') {
        wantListening = false; setVoiceState('error', 'Ese idioma no está descargado. Desactiva "sin internet" en Plantilla.');
      } else if (e.error === 'audio-capture') {
        setVoiceState('restarting', 'Otro programa está usando el micrófono.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        logError('voz: ' + e.error);
      }
    };
    r.onend = function () {
      r.ended = true;
      recBtnClass('hearing', false);
      if (interim) { commitFinal(interim); interim = ''; }
      // Chrome corta el modo continuo tras silencios: reiniciamos de inmediato mientras el punto siga abierto,
      // pero si se corta muchas veces seguidas paramos (evita que el celular se trabe).
      if (wantListening && rec === r && game.draft && game.draft.phase === 'recording') {
        var now = Date.now();
        restartLog = restartLog.filter(function (t) { return now - t < 15000; });
        restartLog.push(now);
        if (restartLog.length > 8) {
          wantListening = false; rec = null;
          setVoiceState('error', 'La voz se cortó varias veces. Toca "Reanudar voz" o usa los botones.');
          buzz([80, 80, 80]);
          return;
        }
        setVoiceState('restarting');
        setTimeout(function () { if (wantListening && rec === r) startListening(); }, 30);
      } else renderLive();
    };
    try { r.start(); } catch (e) { logError('start: ' + e.message); setVoiceState('error', 'No pude abrir el micrófono. Toca "Reanudar voz".'); }
    keepAwake();
  }

  function pauseListening() {
    voicePaused = true;
    stopListening(function () { setVoiceState('paused', 'Voz en pausa. Los botones siguen funcionando.'); });
  }
  function toggleVoice() {
    if (voiceState === 'paused' || voiceState === 'error') { restartLog = []; startListening(); setVoiceState('restarting', ''); }
    else pauseListening();
  }

  function stopListening(cb) {
    wantListening = false;
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    var r = rec; rec = null;
    var done = false;
    function finish() { if (done) return; done = true; if (interim) { commitFinal(interim); interim = ''; } if (cb) cb(); }
    if (!r || r.ended) { finish(); return; }
    r.addEventListener('end', finish);
    try { r.stop(); } catch (e) { finish(); }
    setTimeout(finish, 1000);
  }

  // Si el celular saca la app a segundo plano (llamada, pantalla bloqueada), al volver retomamos la voz.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (game.draft && game.draft.phase === 'recording' && !voicePaused && !rec && !voiceProblem()) {
      restartLog = []; startListening();
      toast('Volviste: la voz sigue escuchando');
    }
    if (game.draft && game.draft.phase === 'recording') keepAwake();
  });

  // Muestra en grande lo que el celular está oyendo ahora mismo.
  var heardTimer = null;
  function showHeard(text, final) {
    var h = $('heard-now');
    if (!h) return;
    h.textContent = '«' + text + '»';
    h.className = 'heard-now' + (final ? ' final' : '');
    clearTimeout(heardTimer);
    heardTimer = setTimeout(function () { var x = $('heard-now'); if (x) x.className = 'heard-now fade'; }, final ? 2500 : 4000);
  }

  // ---------- Registro de errores (para diagnosticar caídas en la cancha) ----------
  var KEY_ERRORS = 'ultivoz.errors';
  var errorToastShown = false;
  function logError(msg) {
    try {
      var list = load(KEY_ERRORS, []);
      list.push({ t: new Date().toISOString(), msg: String(msg).slice(0, 300), phase: game && game.draft ? game.draft.phase : 'none', ua: navigator.userAgent.slice(0, 120) });
      save(KEY_ERRORS, list.slice(-40));
    } catch (e) { /* sin almacenamiento */ }
  }
  window.addEventListener('error', function (e) {
    logError((e.message || 'error') + ' @' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || ''));
    if (!errorToastShown) { errorToastShown = true; try { toast('Algo falló, pero lo narrado está guardado'); } catch (x) { /* nada */ } }
  });
  window.addEventListener('unhandledrejection', function (e) { logError('promesa: ' + (e.reason && e.reason.message || e.reason)); });

  // ---------- Flujo del punto ----------
  var lastGameState = null, reviewAnimate = false, lastLiveCount = 0, timerId = null, lastAdded = null;
  var autoEnd = null, autoEndBlocked = false;
  var AUTO_END_MS = 4000;

  function startAutoEnd(r) {
    var last = r.events[r.events.length - 1];
    var bar = el('div', { class: 'autoend', role: 'alertdialog', 'aria-label': 'Cerrando el punto' }, [
      el('div', { class: 'row' }, [
        el('span', { class: 'ae-ico ' + r.outcome, icon: r.outcome === 'us' ? 'check' : 'x' }),
        el('div', { style: 'flex:1;min-width:0' }, [
          el('b', { text: last ? describe(last) : (r.outcome === 'us' ? 'Punto nuestro' : 'Punto de ellos') }),
          el('div', { class: 'small', style: 'opacity:.75', text: 'Cerrando el punto…' })
        ])
      ]),
      el('div', { class: 'row', style: 'margin-top:10px' }, [
        el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'No fue punto', onclick: function () {
          clearAutoEnd(); appendText('no fue punto'); buzz(20); renderLive();
        } }),
        el('button', { class: 'btn accent', style: 'flex:1', type: 'button', text: 'Cerrar ya', onclick: function () { clearAutoEnd(); endPoint(); } })
      ]),
      el('i', { class: 'ae-progress', style: 'animation-duration:' + AUTO_END_MS + 'ms' })
    ]);
    document.body.appendChild(bar);
    raf2(function () { bar.classList.add('show'); });
    buzz([60, 60, 60]);
    autoEnd = { el: bar, timer: setTimeout(function () { clearAutoEnd(); endPoint(); }, AUTO_END_MS) };
  }
  function clearAutoEnd() {
    if (!autoEnd) return;
    clearTimeout(autoEnd.timer);
    var b = autoEnd.el; autoEnd = null;
    b.classList.remove('show');
    setTimeout(function () { b.remove(); }, 260);
  }

  function startPoint() {
    game.draft = { phase: 'recording', transcript: '', events: [], unknown: [], editIndex: null, type: pointType(), startedAt: Date.now() };
    game.typeOverride = null;
    saveGame();
    buzz(50);
    lastLiveCount = 0;
    autoEndBlocked = false;
    lastFinalNorm = ''; restartLog = [];
    startListening();
    render();
  }
  function endPoint() {
    clearAutoEnd();
    if (!game.draft || game.draft.phase !== 'recording') return;
    buzz([30, 40, 30]);
    var b = $('rec-btn'); if (b) b.disabled = true;
    setStatus('Procesando…');
    stopListening(toReview);
  }
  function toReview() {
    var d = game.draft;
    var r = interp(d.transcript);
    d.events = r.events; d.unknown = r.unknown; d.phase = 'review';
    reviewAnimate = true;
    saveGame();
    render();
    window.scrollTo(0, 0);
  }
  function confirmPoint(force) {
    var d = game.draft;
    var oc = Core.outcomeOf(d.events);
    if (!oc && force !== true) { askOutcome(); return; }
    var wasEdit = d.editIndex != null;
    var point = { type: pointType(), ratio: pointRatio(), line: lineIds(), lineName: lineLabel(lineIds()), events: d.events, transcript: d.transcript, ts: Date.now() };
    if (wasEdit) {
      var old = game.points[d.editIndex];
      point.line = old.line || []; point.lineName = old.lineName || ''; point.ts = old.ts; point.type = d.type || old.type;
      game.points[d.editIndex] = point;
    } else game.points.push(point);
    game.draft = null;
    saveGame();
    if (game.finished) archiveCurrent();
    buzz(80);
    var s = Core.computeStats(game.points, roster).score;
    var msg = wasEdit ? 'Punto actualizado' : (oc === 'us' ? 'Punto nuestro · ' : oc === 'them' ? 'Punto de ellos · ' : 'Punto guardado · ') + s.us + '–' + s.them;
    if (wasEdit) { toast(msg); show('stats'); return; }
    gameFlowAfterPoint(s, msg);
    render();
  }

  // La app sabe cómo va el partido: medio tiempo al llegar a la mitad y pregunta al llegar al puntaje.
  function gameFlowAfterPoint(s, msg) {
    var top = Math.max(s.us, s.them), t = game.target || 0;
    var undoHalf = null;
    if (t && game.halftime == null && top >= Math.ceil(t / 2)) {
      game.halftime = game.points.length; game.typeOverride = null; saveGame();
      msg += ' · Medio tiempo: arrancan en ' + (pointType() === 'O' ? 'ataque' : 'defensa');
      undoHalf = function () { game.halftime = null; saveGame(); render(); };
      buzz([60, 60, 60]);
    }
    toast(msg, undoHalf);
    if (t && top >= t && !game.endAsked) {
      game.endAsked = true; saveGame();
      setTimeout(function () {
        openSheet(function (sh, close) {
          sh.appendChild(el('h3', { text: '¿Se acabó el partido? ' + s.us + '–' + s.them }));
          sh.appendChild(el('p', { class: 'muted small', style: 'margin:-6px 0 12px', text: (s.us > s.them ? 'Llegamos' : 'Llegaron') + ' a ' + t + '. Si hay cap o se juega por diferencia de 2, sigue jugando.' }));
          sh.appendChild(el('button', { class: 'btn accent big block', type: 'button', text: 'Terminar partido', onclick: function () { close(); finishGame(); } }));
          sh.appendChild(el('button', { class: 'btn block', style: 'margin-top:8px', type: 'button', text: 'Seguir jugando', onclick: function () { close(); } }));
        });
      }, 400);
    }
  }

  // Nombre de la línea que jugó el punto: la guardada que coincide (o casi) con los 7 en cancha.
  function lineLabel(ids) {
    if (!ids.length) return '';
    var best = null, bestN = 0;
    lines.forEach(function (l) {
      var n = l.players.filter(function (id) { return ids.indexOf(id) >= 0; }).length;
      if (n > bestN) { best = l; bestN = n; }
    });
    if (!best) return '';
    var same = bestN === ids.length && bestN === best.players.filter(byId).length;
    if (same) return best.name;
    return bestN >= Math.min(5, ids.length) ? best.name + ' (con cambios)' : '';
  }
  // Si se confirma sin resultado, preguntamos cómo terminó (si no, el marcador y la proporción se descuadran).
  function askOutcome() {
    var d = game.draft;
    openSheet(function (sh, close) {
      sh.appendChild(el('h3', { text: '¿Cómo terminó el punto?' }));
      var last = d.events[d.events.length - 1];
      var guess = last && last.type === 'pass' ? last : null;
      sh.appendChild(el('div', { class: 'sheet-grid two' }, [
        el('button', { class: 'btn accent', type: 'button', icon: 'check', onclick: function () {
          close();
          function goal(id) {
            var lp = d.events[d.events.length - 1];
            d.events.push({ type: 'goal', scorer: id, assist: lp && lp.type === 'pass' && lp.to === id ? lp.from : null });
            saveGame(); confirmPoint(true);
          }
          if (guess) goal(guess.to); else openPlayerSheet('¿Quién anotó?', null, function (id) { goal(id); }, true);
        } }, [guess ? ' Gol de ' + playerName(guess.to) : ' Gol nuestro']),
        el('button', { class: 'btn solid', type: 'button', icon: 'x', onclick: function () {
          close(); d.events.push({ type: 'them' }); saveGame(); confirmPoint(true);
        } }, [' Nos anotan'])
      ]));
      if (guess) sh.appendChild(el('button', { class: 'btn block', style: 'margin-top:8px', type: 'button', text: 'Gol de otra persona', onclick: function () {
        close();
        openPlayerSheet('¿Quién anotó?', null, function (id) {
          var lp = d.events[d.events.length - 1];
          if (id && lp && lp.type === 'pass' && lp.to !== id) d.events.push({ type: 'pass', from: lp.to, to: id });
          var lp2 = d.events[d.events.length - 1];
          d.events.push({ type: 'goal', scorer: id, assist: lp2 && lp2.type === 'pass' && lp2.to === id ? lp2.from : null });
          saveGame(); confirmPoint(true);
        }, true);
      } }));
      sh.appendChild(el('button', { class: 'btn block ghost', style: 'margin-top:8px', type: 'button', text: 'Guardar sin resultado (no cuenta)', onclick: function () { close(); confirmPoint(true); } }));
    });
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
    var state = !game.started ? 'setup' : game.finished && !d ? 'final' : !d ? 'prepare' : d.phase;
    var changed = state !== lastGameState;
    lastGameState = state;
    if (state !== 'recording' && timerId) { clearInterval(timerId); timerId = null; }
    v.innerHTML = '';
    var problem = voiceProblem();
    if (problem && (state === 'prepare' || state === 'recording')) {
      v.appendChild(el('div', { class: 'banner warn', icon: 'alert' }, [el('span', { text: problem })]));
    }
    if (state === 'setup') renderSetup(v);
    else if (state === 'final') renderFinal(v);
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
    c.appendChild(el('p', { class: 'field-label', text: 'Se juega a' }));
    c.appendChild(seg([['11', '11'], ['13', '13'], ['15', '15'], ['0', 'Sin límite']], String(game.target || 0), function (val) { game.target = +val; saveGame(); render(); }));
    c.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: game.target
      ? 'Medio tiempo automático al llegar a ' + Math.ceil(game.target / 2) + '. Al llegar a ' + game.target + ' te pregunta si se acabó (por si hay cap o diferencia de 2).'
      : 'Sin límite: marcas el medio tiempo y el final a mano.' }));
    c.appendChild(el('p', { class: 'field-label', text: 'Según el sorteo, empezamos…' }));
    c.appendChild(seg([['O', 'Atacando'], ['D', 'Defendiendo']], game.startType, function (val) { game.startType = val; saveGame(); render(); }));
    c.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: game.startType === 'O' ? 'Ellos hacen el primer pull.' : 'Nosotros hacemos el primer pull.' }));
    if (useAbba()) {
      c.appendChild(el('p', { class: 'field-label', text: 'El primer punto es de…' }));
      c.appendChild(seg([['4M', 'Chicas'], ['4H', 'Chicos']], game.firstRatio, function (val) { game.firstRatio = val; saveGame(); render(); }));
      var a = ratioLabel(game.firstRatio), b = ratioLabel(game.firstRatio === '4H' ? '4M' : '4H');
      c.appendChild(el('p', { class: 'muted small', style: 'margin:6px 2px 0', text: 'Orden: ' + a + ', luego 2 de ' + b.replace('4 ', '') + ', 2 de ' + a.replace('4 ', '') + '… El medio tiempo no lo cambia (WFDF).' }));
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
      el('h2', { class: 'title', style: 'margin:0', text: 'Punto ' + pointNumber() }),
      game.target ? el('span', { class: 'muted small', style: 'font-weight:700', text: 'a ' + game.target }) : null,
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
      c.appendChild(grouped(bench, function (p) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { addToLine(p.id); } }, [
          isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '·' }) : null, p.name
        ]);
      }, 'bench'));
    }
    v.appendChild(c);

    v.appendChild(el('div', { class: 'rec-wrap' }, [
      el('button', { id: 'rec-btn', class: 'rec-btn', type: 'button', icon: 'mic', onclick: startPoint }, ['Empezar punto'])
    ]));
    var miss = 7 - ids.length;
    var hint = miss > 0 ? (miss === 1 ? 'Falta 1' : 'Faltan ' + miss) + ' en la línea (puedes empezar igual).'
      : ratio && !ratioOk(gc, ratio) ? 'La línea no cumple: tocan ' + ratioLabel(ratio) + '.'
      : type === 'D' && ratio ? 'Pull: lo hace ' + (ratio === '4M' ? 'una chica' : 'un chico') + ' (son mayoría).' : '';
    v.appendChild(el('div', { id: 'rec-status', class: 'rec-status', text: hint }));
    var extra = el('div', { class: 'game-actions' });
    if (game.halftime == null && game.points.length) {
      extra.appendChild(el('button', { class: 'btn small', type: 'button', text: 'Medio tiempo', onclick: function () {
        game.halftime = game.points.length; game.typeOverride = null; saveGame(); render();
        toast('Medio tiempo: el segundo tiempo arranca en ' + (pointType() === 'O' ? 'ataque' : 'defensa'), function () { game.halftime = null; saveGame(); render(); });
      } }));
    }
    if (game.points.length) extra.appendChild(el('button', { class: 'btn small', type: 'button', text: 'Terminar partido', onclick: finishGame }));
    extra.appendChild(el('button', { class: 'btn small ghost', type: 'button', text: 'Reiniciar', onclick: restartGame }));
    v.appendChild(extra);
  }

  // --- Fin / reinicio del partido ---
  function finishGame() {
    game.finished = true; game.finishedAt = Date.now(); game.draft = null; saveGame(); archiveCurrent(); buzz([40, 60, 80]); render();
    toast('Partido terminado', function () { game.finished = false; saveGame(); render(); });
  }
  function restartGame() {
    var backup = clone(game);
    game = Object.assign(newGame(), { rival: backup.rival, line: backup.line, startType: backup.startType, firstRatio: backup.firstRatio, target: backup.target });
    saveGame(); shownScore = null; show('game');
    toast('Partido reiniciado', function () { game = backup; saveGame(); shownScore = null; render(); });
  }
  function newMatch() {
    archiveCurrent(); // el partido queda guardado en el historial
    var backup = clone(game);
    game = Object.assign(newGame(), { line: backup.line, startType: backup.startType, firstRatio: backup.firstRatio, target: backup.target });
    saveGame(); shownScore = null; show('game');
    toast('Partido nuevo', function () { game = backup; saveGame(); shownScore = null; render(); });
  }

  function renderFinal(v) {
    var st = Core.computeStats(game.points, roster);
    var us = st.score.us, them = st.score.them;
    v.appendChild(el('div', { class: 'card final' }, [
      el('p', { class: 'label', text: 'Final' + (game.rival ? ' vs ' + game.rival : '') }),
      el('div', { class: 'final-score num-font' }, [el('span', { text: us }), el('span', { class: 'dash', text: '–' }), el('span', { text: them })]),
      el('div', { class: 'final-result', text: us > them ? 'Ganamos' : us < them ? 'Perdimos' : 'Empate' }),
      el('p', { class: 'muted small', style: 'margin:10px 0 0', text: 'Holds ' + st.holds.won + '/' + st.holds.played + ' · Breaks ' + st.breaks.won + '/' + st.breaks.played })
    ]));
    function leader(key, title) {
      var best = Object.keys(st.players).filter(function (id) { return st.players[id][key] > 0; })
        .sort(function (a, b) { return st.players[b][key] - st.players[a][key]; });
      if (!best.length) return null;
      var top = st.players[best[0]][key];
      var names = best.filter(function (id) { return st.players[id][key] === top; }).map(playerName);
      return el('div', { class: 'metric' }, [el('p', { class: 'label', text: title }), el('div', { class: 'v' }, [String(top)]),
        el('p', { class: 'small', style: 'margin:4px 0 0;font-weight:700', text: names.join(', ') })]);
    }
    var leaders = [leader('goals', 'Más goles'), leader('assists', 'Más asistencias'), leader('ds', 'Más D'), leader('plusMinus', 'Mejor +/-')].filter(Boolean);
    if (leaders.length) v.appendChild(el('div', { class: 'metrics' }, leaders));
    if (st.connections.length) {
      var c = st.connections[0];
      v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Conexión del partido' }),
        el('div', { style: 'font-size:20px;font-weight:800', text: playerName(c.from) + ' → ' + playerName(c.to) + ' · ' + c.count })]));
    }
    v.appendChild(el('div', { class: 'stack' }, [
      el('button', { class: 'btn accent big block', type: 'button', icon: 'share', onclick: function () { shareSummary(currentStatsView()); } }, [' Compartir resultados']),
      el('button', { class: 'btn block', type: 'button', icon: 'share', onclick: function () { shareGameFile(currentStatsView()); } }, [' Enviar partido a otro celular']),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'Ver stats', onclick: function () { show('stats'); } }),
        el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'Nuevo partido', onclick: newMatch })
      ]),
      el('div', { class: 'center' }, [el('button', { class: 'btn link', type: 'button', text: 'Reabrir partido', onclick: function () { game.finished = false; saveGame(); render(); } })])
    ]));
  }

  // Comparte el CSV (WhatsApp, correo…) si el celular lo permite; si no, lo descarga.
  // --- Grabando ---
  function renderRecording(v) {
    var d = game.draft;
    var ids = lineIds();
    var timer = el('span', { class: 'timer muted', id: 'timer' });
    v.appendChild(el('div', { class: 'point-head' }, [
      el('h2', { class: 'title', style: 'margin:0', text: 'Punto ' + pointNumber() }),
      el('span', { class: 'spacer' }), timer, typeBadge(pointType())
    ]));
    v.appendChild(el('div', { class: 'voice-row' }, [
      el('span', { id: 'voice-pill', class: 'voice-pill' }),
      el('span', { id: 'poss', class: 'poss' }),
      el('button', { id: 'pause-btn', class: 'btn small ghost', type: 'button', onclick: toggleVoice })
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
    v.appendChild(el('div', { id: 'heard-now', class: 'heard-now fade', 'aria-live': 'polite',
      text: d.transcript ? '' : (voiceProblem() ? '' : 'Di nombres cortos y en orden: «Pipe, Mono, Sara, gol»') }));
    v.appendChild(el('div', { id: 'rec-status', class: 'rec-status', text: voiceProblem() ? 'Usa los botones de abajo' : '' }));

    // Sin títulos ni transcripción completa: todo tiene que caber en una pantalla.
    var c = el('div', { class: 'card live-card' }, [
      el('ol', { class: 'live-events', id: 'live-events' }),
      el('div', { id: 'live-text', hidden: true })
    ]);
    v.appendChild(c);

    var players = sorted(roster.filter(function (p) { return !ids.length || ids.indexOf(p.id) >= 0; }));
    var pad = el('div', { class: 'card' }, [
      grouped(players, function (p) {
        return el('button', { class: 'btn', type: 'button', text: p.name, onclick: function (e) { tapAnim(e.currentTarget); appendText(p.name); renderLive(); } });
      }, isMixed() ? 'pad-players two' : 'pad-players', 'cols'),
      el('div', { class: 'pad-actions' }, [
        ['drop', 'Drop', '', 'pa-1'], ['throwaway', 'Throwaway', '', 'pa-2'], ['D de', 'D de…'], ['gol', 'Gol', 'accent'], ['nos anotan', 'Nos anotan', 'solid'], ['borra', 'Deshacer', 'ghost']
      ].map(function (a) {
        var b = el('button', { class: 'btn ' + (a[2] || ''), id: a[3] || null, type: 'button', text: a[1], onclick: function (e) { tapAnim(e.currentTarget); appendText(b.dataset.say); renderLive(); } });
        b.dataset.say = a[0];
        return b;
      }))
    ]);
    v.appendChild(pad);
    lastLiveCount = Math.max(0, lastLiveCount);
    renderLive(true);
    setVoiceState(voiceState);
  }
  function tapAnim(b) { b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); buzz(10); }

  function renderLive(initial) {
    try { renderLiveInner(initial); } catch (err) { logError('renderLive: ' + err.message); }
  }
  function renderLiveInner(initial) {
    var d = game.draft;
    var ol = $('live-events');
    if (!d || d.phase !== 'recording' || !ol) return;
    var t = $('live-text');
    t.innerHTML = '';
    t.appendChild(document.createTextNode(d.transcript || (interim ? '' : '…')));
    if (interim) t.appendChild(el('span', { class: 'interim', text: ' ' + interim }));
    var r = interp(d.transcript + ' ' + interim, true);
    var pe = $('poss');
    if (pe) {
      var pk = r.possession || '';
      if (pe.dataset.k !== pk) {
        pe.dataset.k = pk;
        pe.className = 'poss ' + pk;
        pe.innerHTML = '';
        if (pk) { pe.insertAdjacentHTML('afterbegin', svg(pk === 'us' ? 'disc' : 'shield')); pe.appendChild(document.createTextNode(pk === 'us' ? 'Atacando' : 'Defendiendo')); }
      }
    }
    // Cierre automático: al detectar gol o punto de ellos (solo con texto ya confirmado).
    var settled = interim ? interp(d.transcript) : r;
    // Con el disco en manos de ellos, los primeros botones registran SUS errores (sin necesidad de una D).
    var theirs = r.possession === 'them';
    [['pa-1', theirs ? ['drop de ellos', 'Drop'] : ['drop', 'Drop']],
     ['pa-2', theirs ? ['throwaway de ellos', 'Throwaway'] : ['throwaway', 'Throwaway']]].forEach(function (x) {
      var b = $(x[0]); if (!b || b.dataset.say === x[1][0]) return;
      b.dataset.say = x[1][0]; b.textContent = x[1][1]; b.classList.toggle('opp', theirs);
      if (theirs) b.appendChild(el('small', { text: rivalShort() }));
    });
    if (!settled.outcome) autoEndBlocked = false;
    if (settled.outcome && !autoEndBlocked && !autoEnd) startAutoEnd(settled);
    else if (!settled.outcome && autoEnd) clearAutoEnd();
    ol.innerHTML = '';
    var shown = r.events.slice(-2); // altura fija: los botones de abajo no se mueven
    var isNew = !initial && r.events.length > lastLiveCount;
    if (isNew) buzz(25); // confirma cada evento sin tener que mirar la pantalla
    shown.forEach(function (ev, i) {
      var li = el('li', { class: (ev.uncertain ? 'unc ' : '') + (ev.type === 'goal' ? 'goal ' : '') + (isNew && i === shown.length - 1 ? 'new' : '') }, [
        el('span', { class: 'ev-ico', icon: EV_ICON[ev.type] }), describe(ev)
      ]);
      ol.appendChild(li);
    });
    if (!r.events.length) ol.appendChild(el('li', { class: 'hint', text: 'Aquí aparecen los pases que entienda' }));
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
      el('h2', { class: 'title', style: 'margin:0', text: (isEdit ? 'Editar punto ' : 'Punto ') + pointNumber() }),
      el('span', { class: 'spacer' }),
      typeBadge(pointType(), function () { d.type = pointType() === 'O' ? 'D' : 'O'; saveGame(); render(); })
    ]));

    if (d.interrupted) {
      v.appendChild(el('div', { class: 'banner warn', icon: 'alert' }, [el('span', { text: 'La grabación se cortó (el celular cerró o recargó la app). Lo narrado está a salvo: revisa y toca el micrófono para seguir.' })]));
    }
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

    v.appendChild(el('div', { class: 'add-row' }, [['pass', 'Pase'], ['goal', 'Gol'], ['drop', 'Drop'], ['throwaway', 'Throwaway'], ['d', 'D'], ['them', 'Nos anotan'], ['opp', 'Error de ' + rivalShort()]].map(function (a) {
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
        d.phase = 'recording'; d.interrupted = false; saveGame(); lastLiveCount = d.events.length;
        lastFinalNorm = ''; restartLog = [];
        autoEndBlocked = !!Core.outcomeOf(d.events); // si ya había resultado, no cerrar de inmediato
        startListening(); render();
      } }),
      el('button', { class: 'btn solid big', type: 'button', icon: 'check', onclick: confirmPoint }, [' Confirmar'])
    ]));
  }

  function eventRow(ev, idx, animate) {
    var d = game.draft;
    var li = el('li', { class: 'ev' + (ev.uncertain ? ' unc' : '') + (ev.type === 'goal' ? ' goal' : '') + (animate ? ' stagger' + (ev.uncertain ? ' flash' : '') : ''), style: '--i:' + idx });
    li.appendChild(el('button', { class: 'pick type', type: 'button', icon: EV_ICON[ev.type], 'aria-label': 'Cambiar tipo', onclick: function () { openTypeSheet(ev, idx); } },
      [ev.type === 'opp' ? (ev.kind === 'drop' ? 'Drop ' : ev.kind === 'throwaway' ? 'Throwaway ' : 'Error ') + rivalShort() : EV_LABEL[ev.type]]));
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
        p.name = n; p.number = num.value.trim(); p.aliases = al; if (isMixed()) { p.gender = formGender; p.genderGuessed = false; }
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
      el('p', { class: 'label', style: 'margin:0', text: 'Jugadores · ' + roster.length }),
      el('span', { class: 'spacer' }),
      roster.length && SR ? el('button', { class: 'btn small accent', type: 'button', icon: 'mic', onclick: function () { openVoiceTest(sorted(roster).map(function (p) { return p.id; })); } }, [' Probar voz']) : null
    ]));
    if (!roster.length) {
      list.appendChild(el('div', { class: 'empty-state' }, [el('b', { text: 'Carga a tu equipo' }), 'Apodos de una palabra que suenen distinto entre sí.',
        el('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, [
          el('button', { class: 'btn small accent', type: 'button', text: 'Pegar lista', onclick: openPasteSheet }),
          el('button', { class: 'btn small', type: 'button', text: 'Usar ejemplo', onclick: loadSample })
        ])]));
    } else {
      var ul = el('ul', { class: 'list' });
      var byNum = roster.slice().sort(function (a, b) { return (+a.number || 999) - (+b.number || 999) || a.name.localeCompare(b.name); });
      genderGroups(byNum).forEach(function (g) {
        if (g.label) ul.appendChild(el('li', { class: 'g-head g-group ' + g.key }, [el('p', { class: 'g-label', style: 'margin:0', text: g.label + ' · ' + g.players.length })]));
        g.players.forEach(rosterRow);
      });
      function rosterRow(p) {
        var li = el('li', {}, [
          el('span', { class: 'jersey', text: p.number ? p.number : '·' }),
          isMixed() ? el('button', { class: 'g-tag g-toggle ' + (p.gender || '') + (p.genderGuessed ? ' guessed' : ''), type: 'button',
            title: p.genderGuessed ? 'Adivinado por el nombre: toca para cambiar' : 'Toca para cambiar H/M', 'aria-label': 'Cambiar H/M de ' + p.name, text: p.gender || '?',
            onclick: function () { p.gender = p.gender === 'M' ? 'H' : 'M'; p.genderGuessed = false; saveRoster(); buzz(10); render(); } }) : null,
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
      }
      list.appendChild(ul);
    }
    v.appendChild(list);
    v.appendChild(el('div', { class: 'row' }, [
      roster.length ? el('button', { class: 'btn small', style: 'flex:1', type: 'button', text: 'Compartir lista', onclick: shareRoster }) : null,
      el('button', { class: 'btn small', style: 'flex:1', type: 'button', text: 'Pegar lista', onclick: openPasteSheet })
    ]));

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

    // Problemas registrados (para enviarlos y poder arreglarlos)
    var errs = load(KEY_ERRORS, []);
    if (errs.length) {
      v.appendChild(el('div', { class: 'card stack' }, [
        el('p', { class: 'label', style: 'margin:0', text: 'Problemas registrados · ' + errs.length }),
        el('p', { class: 'muted small', style: 'margin:0', text: 'Si la app falló en un partido, envía este reporte para revisarlo.' }),
        el('div', { class: 'row' }, [
          el('button', { class: 'btn small', style: 'flex:1', type: 'button', icon: 'share', onclick: function () {
            var text = 'Reporte Narra\n' + errs.map(function (x) { return x.t + ' [' + x.phase + '] ' + x.msg; }).join('\n') + '\n' + errs[errs.length - 1].ua;
            if (navigator.share) navigator.share({ title: 'Reporte Narra', text: text }).catch(function () {}); else showText(text);
          } }, [' Enviar reporte']),
          el('button', { class: 'btn small ghost', type: 'button', text: 'Borrar', onclick: function () { save(KEY_ERRORS, []); render(); } })
        ])
      ]));
    }
  }
  function typeBadgeMini(t) { return el('span', { class: 'badge mini ' + t, text: t === 'O' ? 'Ataque' : 'Defensa' }); }

  // ---------- Compartir / pegar plantilla (texto simple, sirve por WhatsApp) ----------
  function rosterText() {
    return ['Plantilla Narra'].concat(sorted(roster).map(function (p) {
      return [p.name, p.number || '', isMixed() && p.gender ? p.gender : ''].filter(Boolean).join(' ') +
        (p.aliases && p.aliases.length ? ' | ' + p.aliases.join(', ') : '');
    })).join('\n');
  }
  function shareRoster() {
    var text = rosterText();
    if (navigator.share) { navigator.share({ title: 'Plantilla Narra', text: text }).catch(function () {}); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Lista copiada: pégala en el otro celular'); }, function () { showText(text); });
    } else showText(text);
  }
  function showText(text) {
    openSheet(function (sh) {
      sh.appendChild(el('h3', { text: 'Copia esta lista' }));
      var ta = el('textarea', { rows: 8, readonly: true }); ta.value = text;
      sh.appendChild(ta);
      setTimeout(function () { ta.select(); }, 350);
    });
  }
  // Entiende listas escritas de muchas formas: "Pipe 7 H", "1. Sara - 9 - F", "Vale (chica)", "Mono ♂"…
  // Si no dice el género, lo adivina por el nombre (Sara, Vale, Mafe → chica) y lo marca para revisar.
  function parseRoster(text) {
    var out = [];
    var lines = String(text || '').split(/\r?\n/);
    // Si la lista usa F para chicas, entonces M significa "masculino" (y no "mujer").
    var usesF = lines.some(function (l) { return /(^|[\s(,;|-])(f|fem|femenino)([\s),;|-]|$)/i.test(l); });
    lines.forEach(function (line) {
      line = line.replace(/[♀]/g, ' chica ').replace(/[♂]/g, ' chico ').trim();
      line = line.replace(/^\s*(\d{1,3}[.)]|[-•*·])\s+/, ''); // numeración o viñetas de WhatsApp
      if (!line || /^plantilla( ultivoz| demo| narra)?$/i.test(line)) return;
      var parts = line.split('|');
      var aliases = (parts[1] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      var number = '', gender = null, name = [];
      parts[0].replace(/[,;\t()\[\]\/-]/g, ' ').split(/\s+/).filter(Boolean).forEach(function (t) {
        var n = Core.normalize(t);
        if (!n) return;
        if (!number && /^#?\d{1,3}$/.test(t)) { number = t.replace('#', ''); return; }
        if (!gender) {
          if (/^(chica|mujer|dama|fem|femenino|f)$/.test(n) || (n === 'm' && !usesF)) { gender = 'M'; return; }
          if (/^(h|chico|hombre|varon|masc|masculino)$/.test(n) || (n === 'm' && usesF)) { gender = 'H'; return; }
        }
        name.push(t);
      });
      if (!name.length) return;
      var nm = name.join(' ');
      var guessed = !gender;
      out.push({ name: nm, number: number, gender: gender || Core.guessGender(nm) || 'H', guessed: guessed, aliases: aliases });
    });
    return out;
  }
  function openPasteSheet() {
    openSheet(function (sh, close) {
      sh.appendChild(el('h3', { text: 'Pegar lista de jugadores' }));
      sh.appendChild(el('p', { class: 'muted small', style: 'margin:-6px 0 8px', text: 'Un jugador por línea: apodo, número y H o M. Ej.: "Pipe 7 H".' }));
      var ta = el('textarea', { rows: 8, placeholder: 'Pipe 7 H\nSara 9 M\nJuancho 3 H' });
      sh.appendChild(ta);
      sh.appendChild(el('button', { class: 'btn accent big block', type: 'button', text: 'Agregar jugadores', onclick: function () {
        var list = parseRoster(ta.value);
        if (!list.length) { toast('No encontré jugadores en el texto'); return; }
        var added = 0, updated = 0;
        list.forEach(function (x) {
          var ex = roster.find(function (p) { return Core.normalize(p.name) === Core.normalize(x.name); });
          if (ex) {
            if (x.number) ex.number = x.number;
            if (!x.guessed) { ex.gender = x.gender; ex.genderGuessed = false; }
            x.aliases.forEach(function (a) { if ((ex.aliases || []).indexOf(a) < 0) ex.aliases = (ex.aliases || []).concat([a]); });
            updated++;
          } else {
            roster.push({ id: uid(), name: x.name, number: x.number, aliases: x.aliases, gender: isMixed() ? x.gender : null, genderGuessed: isMixed() && x.guessed });
            added++;
          }
        });
        saveRoster(); close(); render();
        var guessed = list.filter(function (x) { return x.guessed; }).length;
        toast(added + ' agregados' + (updated ? ' · ' + updated + ' actualizados' : '') + (isMixed() && guessed ? ' · revisa H/M (toca la letra para cambiarla)' : ''));
      } }));
      setTimeout(function () { ta.focus(); }, 350);
    });
  }

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
        sh.appendChild(grouped(sorted(roster), function (p) {
          var on = draft.players.indexOf(p.id) >= 0;
          return el('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', onclick: function () {
            draft.name = nm.value;
            if (on) draft.players = draft.players.filter(function (x) { return x !== p.id; });
            else if (draft.players.length < 7) draft.players.push(p.id);
            else { toast('Máximo 7 por línea'); return; }
            build();
          } }, [isMixed() ? el('span', { class: 'g-tag ' + (p.gender || ''), text: p.gender || '·' }) : null, p.name]);
        }, 'bench'));
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

  // ---------- Historial de partidos (se guardan en el celular) ----------
  var KEY_HISTORY = 'ultivoz.history';
  var history = load(KEY_HISTORY, []);
  function saveHistory() { save(KEY_HISTORY, history); }
  function decided(points) { return (points || []).filter(function (p) { return Core.outcomeOf(p.events || []); }).length; }

  // Copia del partido actual con los nombres de los jugadores (para verlo aunque cambie la plantilla).
  function snapshotGame(g) {
    var players = {};
    (g.points || []).forEach(function (pt) {
      var ids = (pt.line || []).slice();
      (pt.events || []).forEach(function (ev) { [ev.from, ev.to, ev.scorer, ev.assist, ev.player].forEach(function (id) { if (id) ids.push(id); }); });
      ids.forEach(function (id) { var p = byId(id); if (p && !players[id]) players[id] = { name: p.name, number: p.number || '', gender: p.gender || null }; });
    });
    return { id: g.id, createdAt: g.createdAt, finishedAt: g.finished ? (g.finishedAt || Date.now()) : null, rival: g.rival || '',
      startType: g.startType, firstRatio: g.firstRatio, halftime: g.halftime, points: clone(g.points), players: players };
  }
  function archiveCurrent() {
    if (!game.id) { game.id = uid('g'); game.createdAt = game.createdAt || Date.now(); }
    if (!decided(game.points)) return;
    var snap = snapshotGame(game);
    var i = history.findIndex(function (h) { return h.id === snap.id; });
    if (i >= 0) history[i] = snap; else history.unshift(snap);
    saveHistory();
  }
  function gameDate(h) { var d = new Date(h.finishedAt || h.createdAt || Date.now()); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); }
  function gameScore(points) { var s = { us: 0, them: 0 }; (points || []).forEach(function (p) { var o = Core.outcomeOf(p.events || []); if (o) s[o]++; }); return s; }

  // Una "vista" de stats: el partido actual, uno guardado o toda la temporada.
  function currentStatsView() {
    return { kind: 'current', title: game.rival ? 'vs ' + game.rival : 'Este partido', rival: game.rival, points: game.points, roster: roster,
      name: playerName, halftime: game.halftime, editable: true };
  }
  function archivedView(h) {
    var list = Object.keys(h.players || {}).map(function (id) { return { id: id, name: h.players[id].name }; });
    return { kind: 'game', id: h.id, title: (h.rival ? 'vs ' + h.rival : 'Partido') + ' · ' + gameDate(h), rival: h.rival, points: h.points, roster: list,
      name: function (id) { return id && h.players[id] ? h.players[id].name : (byId(id) ? byId(id).name : '?'); }, halftime: h.halftime, editable: false, game: h };
  }
  // Temporada: suma todos los partidos uniendo a los jugadores por nombre (sirve entre celulares distintos).
  function seasonView() {
    var games = history.slice();
    if (decided(game.points) && !history.some(function (h) { return h.id === game.id; })) games.unshift(snapshotGame(game));
    var names = {}, points = [];
    games.forEach(function (h) {
      var nameOf = function (id) {
        if (!id) return null;
        var p = h.players && h.players[id] ? h.players[id] : byId(id);
        if (!p) return null;
        var key = 'n:' + Core.normalize(p.name);
        if (!names[key]) names[key] = p.name;
        return key;
      };
      (h.points || []).forEach(function (pt) {
        points.push({ type: pt.type, ratio: pt.ratio, lineName: pt.lineName || '', line: (pt.line || []).map(nameOf).filter(Boolean), events: (pt.events || []).map(function (ev) {
          var e = clone(ev); ['from', 'to', 'scorer', 'assist', 'player'].forEach(function (k) { if (e[k]) e[k] = nameOf(e[k]); }); return e;
        }) });
      });
    });
    var rec = { w: 0, l: 0, t: 0 };
    games.forEach(function (h) { var sc = gameScore(h.points); if (sc.us > sc.them) rec.w++; else if (sc.us < sc.them) rec.l++; else rec.t++; });
    return { kind: 'season', title: 'Temporada', points: points, games: games, record: rec,
      roster: Object.keys(names).map(function (k) { return { id: k, name: names[k] }; }),
      name: function (id) { return names[id] || '?'; }, editable: false };
  }

  // ---------- Estadísticas ----------
  var statsFilter = '', statsSource = 'current', statsSort = 'plusMinus';
  // Qué significa cada columna, en palabras simples. good = más es mejor; bad = más es peor.
  var COL_INFO = {
    plusMinus: { title: '+/- (aporte)', desc: 'Goles + asistencias + D − drops − throwaways. Resume lo que sumó y restó con sus jugadas.', good: true },
    goals: { title: 'Gol', desc: 'Atrapó el disco en la zona: anotó.', good: true },
    assists: { title: 'Ast (asistencias)', desc: 'Lanzó el pase del gol.', good: true },
    ds: { title: 'D (defensas)', desc: 'Bloqueó o interceptó un pase del rival.', good: true },
    drops: { title: 'Drop', desc: 'Se le cayó un pase que le llegó bien.', bad: true },
    throwaways: { title: 'TA (throwaways)', desc: 'Perdió el disco lanzando: pase malo, afuera o interceptado.', bad: true },
    completions: { title: 'Pas (pases)', desc: 'Pases completos que lanzó.', good: true },
    catches: { title: 'Rec (recepciones)', desc: 'Pases que atrapó.', good: true },
    points: { title: 'Pts (puntos jugados)', desc: 'En cuántos puntos estuvo en cancha.' },
    breaks: { title: 'Brk (breaks)', desc: 'En cuántos breaks estuvo en cancha: puntos de defensa que ganamos.', good: true }
  };
  // Lo más importante primero: en el celular se ve sin deslizar la tabla.
  var COLS = [['plusMinus', '+/-'], ['goals', 'Gol'], ['assists', 'Ast'], ['ds', 'D'], ['drops', 'Drop'], ['throwaways', 'TA'],
    ['completions', 'Pas'], ['catches', 'Rec'], ['points', 'Pts'], ['breaks', 'Brk']];
  function statsView() {
    if (statsSource === 'season') return seasonView();
    var h = history.find(function (x) { return x.id === statsSource; });
    if (h && h.id !== game.id) return archivedView(h);
    statsSource = 'current';
    return currentStatsView();
  }
  function statRows(stats, V) {
    var usesLine = V.points.some(function (p) { return p.line && p.line.length; });
    var cols = COLS.filter(function (c) { return usesLine || (c[0] !== 'points' && c[0] !== 'breaks'); });
    var known = {}; V.roster.forEach(function (p) { known[p.id] = true; });
    var rows = Object.keys(stats.players).map(function (id) { return { id: id, s: stats.players[id] }; })
      // Si se usaron líneas, solo aparecen los que jugaron; si no, toda la plantilla del partido actual.
      .filter(function (r) { return (V.kind === 'current' && known[r.id] && (!usesLine || r.s.points > 0)) || COLS.some(function (c) { return r.s[c[0]]; }); })
      .sort(function (a, b) { return b.s.plusMinus - a.s.plusMinus || b.s.goals - a.s.goals || b.s.points - a.s.points || V.name(a.id).localeCompare(V.name(b.id)); });
    return { cols: cols, rows: rows };
  }

  function renderStats() {
    var v = $('view-stats');
    v.innerHTML = '';
    var V = statsView();
    var rosterList = V.kind === 'current' ? roster : V.roster;

    // Selector: este partido / temporada / partidos guardados
    var chips = [['current', game.rival ? 'Actual · vs ' + game.rival : 'Partido actual']];
    if (history.length || decided(game.points)) chips.push(['season', 'Temporada']);
    history.forEach(function (h) { if (h.id !== game.id) { var sc = gameScore(h.points); chips.push([h.id, (h.rival || 'Partido') + ' ' + sc.us + '–' + sc.them + ' · ' + gameDate(h)]); } });
    if (chips.length > 1) {
      v.appendChild(el('div', { class: 'presets' }, chips.map(function (c) {
        return el('button', { class: 'preset' + (c[0] === statsSource ? ' on' : ''), type: 'button', text: c[1], onclick: function () { statsSource = c[0]; render(); } });
      })));
    }

    var all = Core.computeStats(V.points, rosterList);
    var stats = statsFilter ? Core.computeStats(V.points, rosterList, statsFilter) : all;
    if (V.kind === 'season') {
      v.appendChild(el('div', { class: 'card score-card' }, [
        el('div', {}, [el('p', { class: 'label', text: 'Ganados' }), el('div', { class: 'n', text: V.record.w })]),
        el('div', { class: 'dash', text: '–' }),
        el('div', {}, [el('p', { class: 'label', text: 'Perdidos' }), el('div', { class: 'n', text: V.record.l })])
      ]));
      v.appendChild(el('p', { class: 'muted small center', style: 'margin-top:6px', text: V.games.length + ' partidos · puntos ' + all.score.us + ' a favor, ' + all.score.them + ' en contra' + (V.record.t ? ' · ' + V.record.t + ' empates' : '') }));
    } else {
      v.appendChild(el('div', { class: 'card score-card' }, [
        el('div', {}, [el('p', { class: 'label', text: 'Nosotros' }), el('div', { class: 'n', text: all.score.us })]),
        el('div', { class: 'dash', text: '–' }),
        el('div', {}, [el('p', { class: 'label', text: V.rival || 'Ellos' }), el('div', { class: 'n', text: all.score.them })])
      ]));
    }
    function metric(cls, title, m, help) {
      var pct = m.played ? Math.round(100 * m.won / m.played) : 0;
      return el('div', { class: 'metric ' + cls }, [
        el('p', { class: 'label', text: title }),
        el('div', { class: 'v' }, [String(m.won), el('small', { text: ' / ' + m.played })]),
        el('div', { class: 'bar' }, [el('i', { style: 'width:' + pct + '%' })]),
        el('p', { class: 'muted small', style: 'margin:6px 0 0', text: help })
      ]);
    }
    v.appendChild(el('div', { class: 'metrics' }, [
      metric('O', 'Holds', all.holds, 'Puntos de ataque ganados'),
      metric('D', 'Breaks', all.breaks, 'Puntos de defensa ganados')
    ]));
    v.appendChild(seg([['', 'Todo'], ['O', 'Ataque'], ['D', 'Defensa']], statsFilter, function (val) { statsFilter = val; render(); }));

    var t = statRows(stats, V);
    // Orden elegido tocando el encabezado de la columna.
    if (statsSort !== 'plusMinus' && t.cols.some(function (c) { return c[0] === statsSort; })) {
      t.rows.sort(function (a, b) { return b.s[statsSort] - a.s[statsSort] || b.s.plusMinus - a.s.plusMinus; });
    }
    var maxOf = {};
    t.cols.forEach(function (c) { maxOf[c[0]] = Math.max.apply(null, t.rows.map(function (r) { return r.s[c[0]]; }).concat([0])); });
    var table = el('table', { class: 'stats-table' });
    table.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'Jugador' })].concat(t.cols.map(function (c) {
      var on = c[0] === statsSort;
      return el('th', { class: 'sortable' + (on ? ' sorted' : ''), role: 'button', tabindex: '0', title: 'Ordenar por ' + COL_INFO[c[0]].title,
        onclick: function () { statsSort = on ? 'plusMinus' : c[0]; render(); } }, [c[1] + (on ? ' ▾' : '')]);
    })))]));
    var body = el('tbody');
    t.rows.forEach(function (r) {
      body.appendChild(el('tr', { class: 'player-row', onclick: function () { openPlayerCard(r.id, V, stats); } }, [
        el('td', {}, [el('span', { class: 'pname', text: V.name(r.id) })])
      ].concat(t.cols.map(function (c) {
        var val = r.s[c[0]];
        var cls = (c[0] === 'plusMinus' ? 'pm' : '') + (val === 0 ? ' zero' : '') + (c[0] === statsSort ? ' sorted' : '') +
          (COL_INFO[c[0]].good && val > 0 && val === maxOf[c[0]] ? ' best' : '') + (c[0] === 'plusMinus' && val < 0 ? ' neg' : '');
        return el('td', { class: cls, text: c[0] === 'plusMinus' && val > 0 ? '+' + val : String(val) });
      }))));
    });
    if (!t.rows.length) body.appendChild(el('tr', {}, [el('td', { class: 'muted', text: 'Sin datos todavía' })]));
    table.appendChild(body);
    v.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'row', style: 'margin-bottom:6px' }, [
        el('p', { class: 'label', style: 'margin:0', text: 'Por jugador' }), el('span', { class: 'spacer' }),
        el('button', { class: 'btn link small', type: 'button', icon: 'help', onclick: function () { openGlossary(t, V) } }, [' ¿Cómo leer?'])
      ]),
      el('div', { class: 'table-wrap' }, [table]),
      el('p', { class: 'muted small', style: 'margin:10px 0 0', text: 'Toca un jugador para ver su ficha. Toca una columna para ordenar.' })]));

    // Rendimiento por línea: qué línea hace los breaks y cuál sostiene el ataque.
    var ls = lineStats(V.points);
    if (ls.length) {
      var lt = el('table', { class: 'line-table' });
      lt.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'Línea' }), el('th', { text: 'Breaks' }), el('th', { text: 'Holds' })])]));
      lt.appendChild(el('tbody', {}, ls.map(function (r) {
        return el('tr', {}, [el('td', {}, [r.name, r.changed ? el('small', { class: 'muted', style: 'display:block;font-weight:500', text: r.changed + (r.changed === 1 ? ' punto con cambios' : ' puntos con cambios') }) : null]),
          el('td', { class: r.D.won ? 'pm' : 'zero', text: r.D.played ? r.D.won + ' / ' + r.D.played : '–' }),
          el('td', { class: r.O.won ? '' : 'zero', text: r.O.played ? r.O.won + ' / ' + r.O.played : '–' })]);
      })));
      v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Por línea' }), el('div', { class: 'table-wrap' }, [lt]),
        el('p', { class: 'muted small', style: 'margin:10px 0 0', text: 'Breaks = puntos de defensa ganados / jugados. Holds = puntos de ataque ganados / jugados.' })]));
    }

    var conns = stats.connections.slice(0, 6);
    var max = conns.length ? conns[0].count : 1;
    v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Conexiones' }),
      conns.length ? el('ul', { class: 'conn' }, conns.map(function (c) {
        return el('li', {}, [el('span', { text: V.name(c.from) + ' → ' + V.name(c.to) }),
          el('span', { class: 'cbar' }, [el('i', { style: 'width:' + Math.round(100 * c.count / max) + '%' })]), el('span', { class: 'cn', text: c.count })]);
      })) : el('p', { class: 'muted small', style: 'margin:0', text: 'Aparecen cuando haya pases.' })]));

    if (V.kind !== 'season') {
      var pl = el('ul', { class: 'points' });
      var us = 0, them = 0;
      V.points.forEach(function (p, i) {
        if (V.halftime === i && i) pl.appendChild(el('li', { class: 'g-head' }, [el('p', { class: 'g-label', style: 'margin:0', text: 'Medio tiempo · ' + us + '–' + them })]));
        var oc = Core.outcomeOf(p.events);
        if (oc === 'us') us++; if (oc === 'them') them++;
        var goal = p.events.filter(function (e) { return e.type === 'goal'; })[0];
        var txt = us + '–' + them + ' · ' + (goal ? V.name(goal.scorer) + (goal.assist ? ' de ' + V.name(goal.assist) : '') : oc === 'them' ? 'de ellos' : 'sin resultado');
        pl.appendChild(el('li', {}, [
          el('span', { class: 'res ' + (oc || ''), icon: oc === 'us' ? 'check' : oc === 'them' ? 'x' : 'help' }),
          p.type ? typeBadgeMini(p.type) : null,
          p.ratio ? el('span', { class: 'g-tag ' + (p.ratio === '4M' ? 'M' : 'H'), title: ratioLabel(p.ratio), text: p.ratio === '4M' ? 'M' : 'H' }) : null,
          el('span', { class: 'txt', text: txt }),
          V.editable ? el('button', { class: 'icon-btn', type: 'button', icon: 'pencil', 'aria-label': 'Editar punto ' + (i + 1), onclick: function () {
            if (game.draft && game.draft.phase === 'recording') { toast('Termina el punto en curso primero'); return; }
            game.draft = { phase: 'review', transcript: p.transcript || '', events: clone(p.events), unknown: [], editIndex: i, type: p.type };
            reviewAnimate = true;
            saveGame(); show('game');
          } }) : null
        ]));
      });
      v.appendChild(el('div', { class: 'card' }, [el('p', { class: 'label', text: 'Puntos' }),
        V.points.length ? pl : el('p', { class: 'muted small', style: 'margin:0', text: 'Aún no hay puntos confirmados.' })]));
    }

    // Acciones según lo que se está viendo
    var actions = el('div', { class: 'stack' });
    if (V.kind !== 'season' && decided(V.points)) {
      actions.appendChild(el('button', { class: 'btn accent block', type: 'button', icon: 'share', onclick: function () { shareSummary(V); } }, [' Compartir resultados']));
    }
    actions.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn', style: 'flex:1', type: 'button', icon: 'download', onclick: function () { exportCsv(V); } }, [' Archivo para Excel']),
      V.kind === 'season' ? null : el('button', { class: 'btn', style: 'flex:1', type: 'button', icon: 'share', onclick: function () { shareGameFile(V); } }, [' Enviar partido'])
    ]));
    if (V.kind === 'current') {
      actions.appendChild(game.finished || !game.points.length
        ? el('button', { class: 'btn block danger-text', type: 'button', text: 'Nuevo partido', onclick: newMatch })
        : el('button', { class: 'btn block', type: 'button', text: 'Terminar partido', onclick: function () { show('game'); finishGame(); } }));
    }
    if (V.kind === 'game') {
      actions.appendChild(el('button', { class: 'btn block danger-text', type: 'button', text: 'Borrar este partido', onclick: function () {
        var i = history.indexOf(V.game); if (i < 0) return;
        history.splice(i, 1); saveHistory(); statsSource = 'current'; render();
        toast('Partido borrado', function () { history.splice(i, 0, V.game); saveHistory(); statsSource = V.game.id; render(); });
      } }));
    }
    v.appendChild(actions);

    // Pasar partidos entre celulares y respaldo
    var file = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    file.addEventListener('change', function () { if (file.files[0]) importFile(file.files[0]); });
    v.appendChild(el('div', { class: 'card stack' }, [
      el('p', { class: 'label', style: 'margin:0', text: 'Partidos guardados en este celular · ' + history.length }),
      el('p', { class: 'muted small', style: 'margin:0', text: '"Enviar partido" manda un archivo para juntar las stats en otro celular (por ejemplo, el del capitán), que lo carga con "Importar".' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn small', style: 'flex:1', type: 'button', icon: 'upload', onclick: function () { file.click(); } }, [' Importar']),
        el('button', { class: 'btn small', style: 'flex:1', type: 'button', icon: 'download', onclick: backupAll }, [' Respaldo completo'])
      ]),
      file
    ]));
  }

  // ---------- Compartir resultados: tarjeta-imagen + texto para WhatsApp ----------
  // Datos del partido ya calculados para la tarjeta y el texto.
  function matchData(V) {
    var rosterList = V.kind === 'current' ? roster : V.roster;
    var st = Core.computeStats(V.points, rosterList);
    var finished = V.kind !== 'current' || game.finished;
    var sc = st.score;
    function leaders(key, n) {
      var ids = Object.keys(st.players).filter(function (id) { return st.players[id][key] > 0; })
        .sort(function (a, b) { return st.players[b][key] - st.players[a][key]; });
      if (!ids.length) return null;
      var top = st.players[ids[0]][key];
      return { value: top, names: ids.filter(function (id) { return st.players[id][key] === top; }).slice(0, n || 2).map(V.name),
        list: ids.slice(0, 3).map(function (id) { return { name: V.name(id), value: st.players[id][key] }; }) };
    }
    var rows = statRows(st, V).rows.filter(function (r) { return r.s.points || r.s.goals || r.s.assists || r.s.ds || r.s.completions || r.s.catches; });
    var date = new Date(V.game ? (V.game.finishedAt || V.game.createdAt) : (game.finishedAt || game.createdAt || Date.now()));
    return {
      st: st, sc: sc, finished: finished, rival: V.rival || '',
      result: sc.us > sc.them ? 'Ganamos' : sc.us < sc.them ? 'Perdimos' : 'Empate',
      date: date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
      goals: leaders('goals'), assists: leaders('assists'), ds: leaders('ds'), pm: leaders('plusMinus'),
      lines: lineStats(V.points).filter(function (r) { return r.D.won; }),
      conn: st.connections[0] ? { from: V.name(st.connections[0].from), to: V.name(st.connections[0].to), count: st.connections[0].count } : null,
      rows: rows, name: V.name
    };
  }

  // Texto con el formato de WhatsApp (*negrita*), corto y ordenado.
  function summaryText(V) {
    var m = matchData(V);
    var join = function (l) { return l.list.map(function (x) { return x.name + ' ' + x.value; }).join(' · '); };
    var out = ['🥏 *Narra*' + (m.rival ? ' · vs ' + m.rival : ''),
      '*' + (m.finished ? m.result + ' ' : 'Vamos ') + m.sc.us + '–' + m.sc.them + '*',
      'Breaks ' + m.st.breaks.won + '/' + m.st.breaks.played + ' · Holds ' + m.st.holds.won + '/' + m.st.holds.played];
    if (m.lines.length) out.push('Breaks por línea: ' + m.lines.map(function (r) { return r.name + ' ' + r.D.won; }).join(' · '));
    out.push('');
    if (m.goals) out.push('🎯 *Goles:* ' + join(m.goals));
    if (m.assists) out.push('🤝 *Asistencias:* ' + join(m.assists));
    if (m.ds) out.push('🛡️ *Defensas:* ' + join(m.ds));
    if (m.pm) out.push('⭐ *Mejor +/-:* ' + m.pm.names.join(', ') + ' +' + m.pm.value);
    if (m.conn) out.push('🔗 *Conexión:* ' + m.conn.from + ' → ' + m.conn.to + ' (' + m.conn.count + ')');
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Dibuja la tarjeta del partido (1080 px de ancho, como foto de celular) con la paleta Óleo.
  function drawCard(V) {
    var m = matchData(V);
    var C = { bg: '#F3EBDD', card: '#FBF7F0', sunk: '#E8DFCE', ink: '#1B2547', muted: '#6A6878', line: '#DDD2BF',
      accent: '#F2541B', accentInk: '#A33A10', soft: '#FADBC9', solid: '#22305F', onSolid: '#F7F1E6', neg: '#C2361B' };
    var SANS = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
    var W = 1080, P = 64;
    var rows = m.rows.slice(0, 24); // todos los que jugaron: cada uno busca su nombre
    var leadersList = [['MÁS GOLES', m.goals], ['MÁS ASISTENCIAS', m.assists], ['MÁS DEFENSAS', m.ds], ['MEJOR +/-', m.pm]].filter(function (x) { return x[1]; });
    var yLeaders = 800, leaderH = 136;
    var yTable = yLeaders + (leadersList.length ? 56 + Math.ceil(leadersList.length / 2) * (leaderH + 20) : 0) + 10;
    var tableH = rows.length ? 96 + rows.length * 56 + 24 : 0;
    var yExtra = yTable + tableH + (rows.length ? 24 : 0);
    var extras = (m.lines.length ? 1 : 0) + (m.conn ? 1 : 0);
    var H = yExtra + extras * 52 + 110;

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    function rr(px, py, w, h, r, fill) {
      x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); x.fillStyle = fill; x.fill();
    }
    function tx(str, px, py, font, color, align, maxW) {
      x.font = font; x.fillStyle = color; x.textAlign = align || 'left'; x.textBaseline = 'alphabetic';
      str = String(str);
      if (maxW) { while (str.length > 1 && x.measureText(str).width > maxW) str = str.slice(0, -2) + '…'; }
      x.fillText(str, px, py);
      return x.measureText(str).width;
    }
    function spaced(str, px, py, size, color, align) { // etiquetas en mayúsculas con espaciado
      x.font = '800 ' + size + 'px ' + SANS;
      if ('letterSpacing' in x) x.letterSpacing = (size * 0.12) + 'px';
      tx(str, px, py, '800 ' + size + 'px ' + SANS, color, align);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    }

    // Fondo lienzo
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);

    return new Promise(function (resolve) {
      var logo = new Image();
      logo.onload = logo.onerror = function () {
        // Encabezado
        if (logo.naturalWidth) { x.save(); rr(P, 56, 92, 92, 22, '#000'); x.clip(); x.drawImage(logo, P, 56, 92, 92); x.restore(); }
        tx('Narra', P + 116, 124, 'italic 700 64px ' + SERIF, C.ink);
        tx(m.date, W - P, 116, '700 32px ' + SANS, C.muted, 'right');

        // Marcador
        rr(P, 190, W - 2 * P, 380, 36, C.card);
        spaced((m.finished ? 'FINAL' : 'VAMOS') + (m.rival ? ' · VS ' + m.rival.toUpperCase() : ''), W / 2, 262, 30, C.muted, 'center');
        tx(m.sc.us + '–' + m.sc.them, W / 2, 452, '800 190px ' + SANS, C.ink, 'center');
        if (m.finished) {
          x.font = '800 34px ' + SANS;
          var pw = x.measureText(m.result.toUpperCase()).width + 64;
          rr(W / 2 - pw / 2, 486, pw, 60, 30, m.result === 'Ganamos' ? C.accent : C.solid);
          spaced(m.result.toUpperCase(), W / 2, 528, 30, '#FFFFFF', 'center');
        }

        // Holds / Breaks
        var mw = (W - 2 * P - 24) / 2;
        [['HOLDS', m.st.holds, C.accent, 'puntos de ataque ganados'], ['BREAKS', m.st.breaks, C.solid, 'puntos de defensa ganados']].forEach(function (it, i) {
          var mx = P + i * (mw + 24), my = 600;
          rr(mx, my, mw, 170, 28, C.card);
          spaced(it[0], mx + 32, my + 52, 26, C.muted);
          var vw = tx(it[1].won, mx + 32, my + 122, '800 72px ' + SANS, C.ink);
          tx(' / ' + it[1].played, mx + 32 + vw, my + 122, '700 38px ' + SANS, C.muted);
          rr(mx + 32, my + 142, mw - 64, 10, 5, C.sunk);
          if (it[1].played && it[1].won) rr(mx + 32, my + 142, (mw - 64) * it[1].won / it[1].played, 10, 5, it[2]);
        });

        // Líderes
        if (leadersList.length) {
          spaced('LÍDERES', P + 8, yLeaders + 30, 26, C.muted);
          leadersList.forEach(function (it, i) {
            var lx = P + (i % 2) * (mw + 24), ly = yLeaders + 56 + Math.floor(i / 2) * (leaderH + 20);
            rr(lx, ly, mw, leaderH, 28, C.card);
            spaced(it[0], lx + 32, ly + 46, 22, C.muted);
            tx(it[1].names.join(', '), lx + 32, ly + 104, '800 40px ' + SANS, C.ink, 'left', mw - 170);
            tx((it[0] === 'MEJOR +/-' ? '+' : '') + it[1].value, lx + mw - 32, ly + 106, '800 66px ' + SANS, C.accentInk, 'right');
          });
        }

        // Tabla
        if (rows.length) {
          rr(P, yTable, W - 2 * P, tableH, 32, C.card);
          var cols = [['+/-', 'plusMinus', 600], ['GOL', 'goals', 700], ['AST', 'assists', 790], ['D', 'ds', 870], ['PÉRD', 'lost', W - P - 32]];
          var hy = yTable + 62;
          spaced('JUGADOR', P + 32, hy, 22, C.muted);
          cols.forEach(function (c) { spaced(c[0], c[2], hy, 22, C.muted, 'right'); });
          var maxOf = {};
          cols.forEach(function (c) { maxOf[c[1]] = Math.max.apply(null, rows.map(function (r) { return c[1] === 'lost' ? 0 : r.s[c[1]]; }).concat([0])); });
          rows.forEach(function (r, i) {
            var ry = yTable + 96 + i * 56;
            if (i % 2 === 0) { x.fillStyle = 'rgba(232,223,206,.45)'; x.fillRect(P + 16, ry, W - 2 * P - 32, 56); }
            var by = ry + 39;
            tx(m.name(r.id), P + 32, by, '700 34px ' + SANS, C.ink, 'left', 470);
            cols.forEach(function (c) {
              var v = c[1] === 'lost' ? r.s.drops + r.s.throwaways : r.s[c[1]];
              var str = c[1] === 'plusMinus' && v > 0 ? '+' + v : String(v);
              var color = v === 0 ? '#B3ADA4' : c[1] === 'plusMinus' && v < 0 ? C.neg : (c[1] !== 'lost' && v === maxOf[c[1]] ? C.accentInk : C.ink);
              tx(str, c[2], by, (c[1] === 'plusMinus' || v === maxOf[c[1]] ? '800 ' : '600 ') + '34px ' + SANS, color, 'right');
            });
          });
        }

        // Líneas y conexión
        var ey = yExtra + 30;
        if (m.lines.length) { tx('Breaks por línea: ' + m.lines.map(function (r) { return r.name + ' ' + r.D.won; }).join(' · '), P + 8, ey, '700 30px ' + SANS, C.ink, 'left', W - 2 * P); ey += 52; }
        if (m.conn) { tx('Conexión del partido: ' + m.conn.from + ' → ' + m.conn.to + ' (' + m.conn.count + ')', P + 8, ey, '700 30px ' + SANS, C.ink, 'left', W - 2 * P); ey += 52; }

        // Pie
        tx('Pérd = drops + throwaways · Hecho con Narra', W / 2, H - 48, '600 24px ' + SANS, C.muted, 'center');
        resolve(cv);
      };
      logo.src = 'narra-192.png';
    });
  }

  function cardFileName(V) { return fileSlug(V) + '.png'; }

  // Hoja para compartir: vista previa de la tarjeta + opciones.
  function shareSummary(V) {
    V = V || currentStatsView();
    var text = summaryText(V);
    openSheet(function (sh, close) {
      sh.appendChild(el('h3', { text: 'Compartir resultados' }));
      var holder = el('div', { class: 'card-preview' }, [el('div', { class: 'muted small center', style: 'padding:40px 0', text: 'Armando la tarjeta…' })]);
      sh.appendChild(holder);
      var shareBtn = el('button', { class: 'btn accent big block', type: 'button', icon: 'share', disabled: true }, [' Compartir imagen']);
      sh.appendChild(shareBtn);
      sh.appendChild(el('div', { class: 'row', style: 'margin-top:8px' }, [
        el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'Solo texto', onclick: function () {
          if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast('Texto copiado: pégalo en el grupo'); }, function () { showText(text); });
          else showText(text);
        } }),
        el('button', { class: 'btn', style: 'flex:1', type: 'button', text: 'Archivo para Excel', onclick: function () { exportCsv(V); } })
      ]));
      sh.appendChild(el('p', { class: 'muted small', style: 'margin:10px 0 0', text: 'La imagen se manda como foto con un resumen en texto. El archivo para Excel es para analizar en el computador.' }));
      drawCard(V).then(function (cv) {
        holder.innerHTML = '';
        var img = el('img', { src: cv.toDataURL('image/png'), alt: 'Tarjeta del partido' });
        holder.appendChild(img);
        shareBtn.removeAttribute('disabled');
        shareBtn.onclick = function () {
          cv.toBlob(function (blob) {
            var name = cardFileName(V);
            try {
              var f = new File([blob], name, { type: 'image/png' });
              if (navigator.canShare && navigator.canShare({ files: [f] })) {
                navigator.share({ files: [f], text: text }).catch(function () {});
                return;
              }
            } catch (e) { /* sin Web Share */ }
            download(blob, name);
            toast('Imagen guardada: mándala al grupo desde tus fotos');
          }, 'image/png');
        };
      }).catch(function (e) { logError('tarjeta: ' + e.message); holder.textContent = 'No pude armar la imagen. Usa "Solo texto".'; });
    });
  }

  function lineStats(points) {
    var map = {};
    (points || []).forEach(function (p) {
      var oc = Core.outcomeOf(p.events || []);
      if (!oc || !p.line || !p.line.length || (p.type !== 'O' && p.type !== 'D')) return;
      // "Defensa A (con cambios)" suma en la misma fila que "Defensa A".
      var changed = / \(con cambios\)$/.test(p.lineName || '');
      var name = (p.lineName || 'Otras líneas').replace(/ \(con cambios\)$/, '');
      var r = map[name] || (map[name] = { name: name, changed: 0, O: { played: 0, won: 0 }, D: { played: 0, won: 0 } });
      if (changed) r.changed++;
      r[p.type].played++;
      if (oc === 'us') r[p.type].won++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.D.won - a.D.won || b.O.won - a.O.won || (a.name === 'Otras líneas') - (b.name === 'Otras líneas'); });
  }

  // Guía de la tabla con ejemplos sacados del mismo partido.
  function openGlossary(t, V) {
    openSheet(function (sh) {
      sh.appendChild(el('h3', { text: '¿Cómo leer las stats?' }));
      var list = el('div', { class: 'glossary' });
      t.cols.forEach(function (c) {
        var info = COL_INFO[c[0]];
        var top = t.rows.slice().sort(function (a, b) { return b.s[c[0]] - a.s[c[0]]; })[0];
        var ex = top && top.s[c[0]] > 0 ? 'Ej.: ' + V.name(top.id) + ' ' + (c[0] === 'plusMinus' ? '+' : '') + top.s[c[0]] : '';
        list.appendChild(el('div', { class: 'gl-row' }, [
          el('span', { class: 'gl-key' + (info.bad ? ' bad' : ''), text: c[1] }),
          el('div', {}, [el('b', { text: info.title }), el('div', { class: 'small', text: info.desc }), ex ? el('div', { class: 'small muted', text: ex }) : null])
        ]));
      });
      sh.appendChild(list);
      sh.appendChild(el('p', { class: 'muted small', style: 'margin:12px 0 0', text: 'Ojo: el +/- solo cuenta jugadas con disco. Marcar bien o abrir espacios no aparece; para eso mira Pts y Brk.' }));
    });
  }

  // Ficha del jugador, escrita en frases para que cualquiera la entienda.
  function openPlayerCard(id, V, stats) {
    var s = stats.players[id];
    if (!s) return;
    var name = V.name(id);
    var total = V.points.filter(function (p) { return Core.outcomeOf(p.events || []) && (!statsFilter || p.type === statsFilter); }).length;
    var usesLine = V.points.some(function (p) { return p.line && p.line.length; });
    openSheet(function (sh) {
      var p = byId(id);
      sh.appendChild(el('div', { class: 'pc-head' }, [
        el('h3', { style: 'margin:0', text: name }),
        p && p.number ? el('span', { class: 'muted', text: '#' + p.number }) : null,
        statsFilter ? el('span', { class: 'badge mini ' + statsFilter, text: statsFilter === 'O' ? 'Solo ataque' : 'Solo defensa' }) : null
      ]));
      if (usesLine) sh.appendChild(el('p', { class: 'muted', style: 'margin:4px 0 12px', text: 'Jugó ' + s.points + ' de ' + total + ' puntos' + (s.breaks ? ' · estuvo en ' + s.breaks + (s.breaks === 1 ? ' break' : ' breaks') : '') }));

      // +/- desglosado
      var parts = [['+', s.goals, s.goals === 1 ? 'gol' : 'goles'], ['+', s.assists, s.assists === 1 ? 'asistencia' : 'asistencias'], ['+', s.ds, 'D'],
        ['−', s.drops, s.drops === 1 ? 'drop' : 'drops'], ['−', s.throwaways, s.throwaways === 1 ? 'throwaway' : 'throwaways']];
      sh.appendChild(el('div', { class: 'pc-pm' }, [
        el('div', { class: 'pc-pm-n' + (s.plusMinus < 0 ? ' neg' : ''), text: (s.plusMinus > 0 ? '+' : '') + s.plusMinus }),
        el('div', {}, [el('b', { text: 'Aporte (+/-)' }), el('div', { class: 'pc-chips' }, parts.map(function (x) {
          return el('span', { class: 'pc-chip ' + (x[0] === '+' ? 'plus' : 'minus') + (x[1] ? '' : ' zero'), text: x[0] + x[1] + ' ' + x[2] });
        }))])
      ]));

      // En frases
      var lines = [];
      if (s.completions || s.catches) lines.push('Lanzó ' + s.completions + ' pases completos y atrapó ' + s.catches + '.');
      if (s.goals || s.assists) lines.push((s.goals ? 'Anotó ' + s.goals + (s.goals === 1 ? ' gol' : ' goles') : 'No anotó') + (s.assists ? ' y dio ' + s.assists + (s.assists === 1 ? ' asistencia.' : ' asistencias.') : '.'));
      if (s.ds) lines.push('Hizo ' + s.ds + (s.ds === 1 ? ' defensa (D).' : ' defensas (D).'));
      if (s.drops || s.throwaways) lines.push('Perdió el disco ' + (s.drops + s.throwaways) + (s.drops + s.throwaways === 1 ? ' vez' : ' veces') + ' (' + [s.drops ? s.drops + ' drop' + (s.drops > 1 ? 's' : '') : '', s.throwaways ? s.throwaways + ' throwaway' + (s.throwaways > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + ').');
      if (!lines.length) lines.push('No tocó el disco en las jugadas narradas.');
      sh.appendChild(el('ul', { class: 'pc-lines' }, lines.map(function (t) { return el('li', { text: t }); })));

      // Con quién se conectó
      var to = stats.connections.filter(function (c) { return c.from === id; }).slice(0, 3);
      var from = stats.connections.filter(function (c) { return c.to === id; }).slice(0, 3);
      if (to.length || from.length) {
        sh.appendChild(el('p', { class: 'label', style: 'margin:14px 0 6px', text: 'Conexiones' }));
        if (to.length) sh.appendChild(el('p', { class: 'small', style: 'margin:0 0 4px', text: 'Le pasó más a: ' + to.map(function (c) { return V.name(c.to) + ' (' + c.count + ')'; }).join(', ') }));
        if (from.length) sh.appendChild(el('p', { class: 'small', style: 'margin:0', text: 'Recibió más de: ' + from.map(function (c) { return V.name(c.from) + ' (' + c.count + ')'; }).join(', ') }));
      }
    });
  }

  function fileSlug(V) {
    var base = V.kind === 'season' ? 'temporada' : (V.rival ? Core.normalize(V.rival).replace(/ /g, '-') : 'partido');
    return 'narra-' + base + '-' + new Date().toISOString().slice(0, 10);
  }
  function download(blob, name) {
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  // En el celular abre el menú de compartir (WhatsApp, correo…); si no se puede, descarga el archivo.
  function shareOrDownload(blob, name, type, title) {
    try {
      var f = new File([blob], name, { type: type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], title: title }).catch(function () {});
        return;
      }
    } catch (e) { /* sin Web Share */ }
    download(blob, name);
  }
  function exportCsv(V) {
    var file = buildCsv(V || currentStatsView());
    shareOrDownload(file.blob, file.name, 'text/csv', 'Stats Narra');
  }
  function buildCsv(V) {
    var rosterList = V.kind === 'current' ? roster : V.roster;
    var stats = Core.computeStats(V.points, rosterList);
    var t = statRows(stats, V);
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var out = [q(V.title)];
    out.push(['Jugador'].concat(t.cols.map(function (c) { return c[1]; })).join(','));
    t.rows.forEach(function (r) { out.push([q(V.name(r.id))].concat(t.cols.map(function (c) { return r.s[c[0]]; })).join(',')); });
    out.push('', 'Lanzador,Receptor,Pases');
    stats.connections.forEach(function (c) { out.push(q(V.name(c.from)) + ',' + q(V.name(c.to)) + ',' + c.count); });
    out.push('', 'Marcador,' + stats.score.us + ',' + stats.score.them);
    out.push('Holds,' + stats.holds.won + ',' + stats.holds.played, 'Breaks,' + stats.breaks.won + ',' + stats.breaks.played);
    if (V.kind !== 'season') {
      // Detalle punto por punto (para analizar después en Excel o Google Sheets)
      out.push('', 'Punto,Tipo,Proporcion,Resultado,Eventos');
      var us = 0, them = 0;
      V.points.forEach(function (p, i) {
        var oc = Core.outcomeOf(p.events || []); if (oc === 'us') us++; if (oc === 'them') them++;
        var evs = (p.events || []).map(function (ev) { return describe(ev, V.name); }).join(' | ');
        out.push([i + 1, p.type === 'O' ? 'Ataque' : p.type === 'D' ? 'Defensa' : '', p.ratio ? ratioLabel(p.ratio) : '',
          oc ? us + '-' + them : 'sin resultado', q(evs)].join(','));
      });
    }
    return { blob: new Blob(['﻿' + out.join('\n')], { type: 'text/csv;charset=utf-8' }), name: fileSlug(V) + '.csv' };
  }
  function shareGameFile(V) {
    var snap = V.kind === 'current' ? snapshotGame(game) : V.game;
    if (V.kind === 'current' && !snap.id) { archiveCurrent(); snap = snapshotGame(game); }
    var blob = new Blob([JSON.stringify({ app: 'narra', version: 1, game: snap })], { type: 'application/json' });
    shareOrDownload(blob, fileSlug(V) + '.json', 'application/json', 'Partido Narra');
  }
  function backupAll() {
    archiveCurrent();
    var blob = new Blob([JSON.stringify({ app: 'narra', version: 1, roster: roster, lines: lines, settings: settings, history: history })], { type: 'application/json' });
    shareOrDownload(blob, 'narra-respaldo-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', 'Respaldo Narra');
  }
  function importFile(f) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var games = data.game ? [data.game] : (data.history || []);
        var added = 0;
        games.forEach(function (g) {
          if (!g || !g.points) return;
          var i = history.findIndex(function (h) { return h.id === g.id; });
          if (i >= 0) history[i] = g; else { history.push(g); added++; }
        });
        history.sort(function (a, b) { return (b.finishedAt || b.createdAt || 0) - (a.finishedAt || a.createdAt || 0); });
        saveHistory();
        // Del respaldo completo, agregamos jugadores y líneas que falten (por nombre).
        var newPlayers = 0;
        (data.roster || []).forEach(function (p) {
          if (!roster.some(function (x) { return Core.normalize(x.name) === Core.normalize(p.name); })) { roster.push(p); newPlayers++; }
        });
        (data.lines || []).forEach(function (l) { if (!lines.some(function (x) { return x.id === l.id; })) lines.push(l); });
        if (newPlayers) saveRoster();
        if (data.lines) saveLines();
        if (games.length === 1 && games[0].id) statsSource = games[0].id;
        render();
        toast(games.length ? (added ? added + ' partido(s) importado(s)' : 'Partido actualizado') + (newPlayers ? ' · ' + newPlayers + ' jugadores' : '') : 'El archivo no tiene partidos');
      } catch (e) { logError('importar: ' + e.message); toast('No pude leer ese archivo'); }
    };
    reader.readAsText(f);
  }

  // ---------- Inicio ----------
  // Si se recargó a mitad de un punto, pasamos a revisión para no perder lo narrado.
  if (game.draft && game.draft.phase === 'recording') {
    var rr = interp(game.draft.transcript);
    game.draft.events = rr.events; game.draft.unknown = rr.unknown; game.draft.phase = 'review';
    game.draft.interrupted = true; // la app se cerró o recargó a mitad del punto
    logError('punto interrumpido (la app se cerró o recargó grabando)');
    saveGame(); reviewAnimate = true;
  }
  show(roster.length ? 'game' : 'roster');

  if ('serviceWorker' in navigator && window.isSecureContext) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      // En el computador no usamos modo sin conexión: así siempre se ve la última versión.
      navigator.serviceWorker.getRegistrations().then(function (regs) { regs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
    } else {
      navigator.serviceWorker.register('sw.js').then(function (reg) { reg.update(); }).catch(function () {});
    }
  }
})();
