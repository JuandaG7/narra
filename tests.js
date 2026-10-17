/*
 * Pruebas de la interpretación. Se ejecutan en el navegador (tests.html)
 * o en la terminal de macOS con ./run_tests.sh (sin instalar nada).
 */
(function (root) {
  'use strict';

  var ROSTER = [
    { id: 'p1', name: 'Pipe', number: 7 },
    { id: 'p2', name: 'Mono', number: 12 },
    { id: 'p3', name: 'Juancho', number: 3 },
    { id: 'p4', name: 'Sara', number: 9 },
    { id: 'p5', name: 'Leo', number: 5 },
    { id: 'p6', name: 'Caro', number: 21, aliases: ['karo', 'carro'] }
  ];
  var N = {};
  ROSTER.forEach(function (p) { N[p.id] = p.name; });

  // Representación compacta de eventos para comparar.
  function fmt(ev) {
    var n = function (id) { return id ? N[id] : '?'; };
    switch (ev.type) {
      case 'pass': return n(ev.from) + '>' + n(ev.to);
      case 'goal': return 'GOL ' + n(ev.scorer) + (ev.assist ? ' (ast ' + n(ev.assist) + ')' : '');
      case 'drop': return 'DROP ' + n(ev.to) + (ev.from ? ' (de ' + n(ev.from) + ')' : '');
      case 'throwaway': return 'TA ' + n(ev.from);
      case 'd': return 'D ' + n(ev.player);
      case 'them': return 'ELLOS';
      case 'opp': return 'PIERDEN';
    }
    return ev.type;
  }

  var CASES = [
    ['Pipe a Mono, Mono a Juancho, gol',
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['pipa a mono, mono a juan cho gol', // nombres mal reconocidos
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['Pipe le pasa a Mono, Mono para Huancho, golazo',
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['Pipe a Mono, Mono a Juancho, drop',
      ['Pipe>Mono', 'DROP Juancho (de Mono)'], null],
    ['Pipe a Mono, la pierde',
      ['Pipe>Mono', 'TA Mono'], null],
    ['Pipe a Mono, throwaway de Pipe',
      ['Pipe>Mono', 'TA Pipe'], null],
    ['nos tiran, D de Pipe, Pipe a Mono, Mono a Sara, punto',
      ['D Pipe', 'Pipe>Mono', 'Mono>Sara', 'GOL Sara (ast Mono)'], 'us'],
    ['bloqueo de Leo, Leo a Caro, Caro a Pipe, gol',
      ['D Leo', 'Leo>Caro', 'Caro>Pipe', 'GOL Pipe (ast Caro)'], 'us'],
    ['nos tiran, Pipe bloquea, Mono a Juancho',
      ['D Pipe', 'Mono>Juancho'], null],
    ['Pipe a Mono, throwaway, nos anotan',
      ['Pipe>Mono', 'TA Mono', 'ELLOS'], 'them'],
    ['Juancho a Sara, Sara drop, punto de ellos',
      ['DROP Sara (de Juancho)', 'ELLOS'], 'them'], // el drop reemplaza al pase incompleto
    ['el 7 a el 12, el 12 a 3, gol',
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['siete a doce, gol',
      ['Pipe>Mono', 'GOL Mono (ast Pipe)'], 'us'],
    ['Pipe a Mono, Mono a Sara, borra, Mono a Juancho, gol',
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['Pipe a Mono, gol de Juancho',
      ['Pipe>Mono', 'Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['PIPE A MONO... ¡GOOOL!',
      ['Pipe>Mono', 'GOL Mono (ast Pipe)'], 'us'],
    ['Mono a Juancho, Juancho anota',
      ['Mono>Juancho', 'GOL Juancho (ast Mono)'], 'us'],
    ['Mono a Karo, carro a Pipe', // alias de la plantilla
      ['Mono>Caro', 'Caro>Pipe'], null],
    ['Pipe a Mono, la pierden ellos, Sara a Leo, gol',
      ['Pipe>Mono', 'PIERDEN', 'Sara>Leo', 'GOL Leo (ast Sara)'], 'us'],
    ['como le dije, claro, Pipe a Mono', // palabras comunes no son jugadores
      ['Pipe>Mono'], null],
    ['Pipe a Mono, gol, Sara a Leo', // tras el gol se ignora lo demás
      ['Pipe>Mono', 'GOL Mono (ast Pipe)'], 'us']
  ];

  function runParserTests(core) {
    var results = [];
    CASES.forEach(function (c) {
      var r = core.interpret(c[0], ROSTER);
      var got = r.events.map(fmt);
      var ok = JSON.stringify(got) === JSON.stringify(c[1]) && r.outcome === c[2];
      results.push({ name: c[0], ok: ok, expected: c[1].join(' | ') + ' → ' + c[2], got: got.join(' | ') + ' → ' + r.outcome });
    });

    // Palabras no reconocidas se reportan para poder asignarlas como alias.
    var u = core.interpret('Pipe a Ramiro', ROSTER);
    results.push({ name: 'reporta palabra desconocida "ramiro"', ok: u.unknown.indexOf('ramiro') >= 0, expected: 'ramiro', got: u.unknown.join(',') });

    // La coincidencia difusa marca el evento como dudoso para revisarlo.
    var f = core.interpret('pipa a mono', ROSTER);
    results.push({ name: 'marca "pipa" como dudoso', ok: !!(f.events[0] && f.events[0].uncertain), expected: 'uncertain', got: String(f.events[0] && f.events[0].uncertain) });

    // Estadísticas
    var pts = [
      { events: core.interpret('Pipe a Mono, Mono a Juancho, gol', ROSTER).events, line: ['p1', 'p2', 'p3'] },
      { events: core.interpret('Pipe a Mono, Mono a Juancho, drop, nos anotan', ROSTER).events, line: ['p1', 'p2', 'p3'] },
      { events: core.interpret('D de Sara, Sara a Pipe, Pipe a Mono, throwaway', ROSTER).events, line: ['p1', 'p2', 'p4'] }
    ];
    var s = core.computeStats(pts, ROSTER);
    function chk(name, got, exp) {
      results.push({ name: name, ok: JSON.stringify(got) === JSON.stringify(exp), expected: JSON.stringify(exp), got: JSON.stringify(got) });
    }
    chk('marcador 1-1', s.score, { us: 1, them: 1 });
    chk('Pipe: 3 pases, 2 pts... ', [s.players.p1.completions, s.players.p1.catches, s.players.p1.points], [3, 1, 3]);
    chk('Mono: ast 1, TA 1, +/- 0', [s.players.p2.assists, s.players.p2.throwaways, s.players.p2.plusMinus], [1, 1, 0]);
    chk('Juancho: gol 1, drop 1, +/- 0', [s.players.p3.goals, s.players.p3.drops, s.players.p3.plusMinus], [1, 1, 0]);
    chk('Sara: D 1, +/- 1', [s.players.p4.ds, s.players.p4.plusMinus], [1, 1]);
    chk('top conexión Pipe→Mono x3', [s.connections[0].from, s.connections[0].to, s.connections[0].count], ['p1', 'p2', 3]);

    return results;
  }

  root.runParserTests = runParserTests;
})(typeof window !== 'undefined' ? window : this);
