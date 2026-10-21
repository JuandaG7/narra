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
    { id: 'p6', name: 'Caro', number: 21, aliases: ['karo', 'carro'] },
    { id: 'p7', name: 'Mona', number: 8 },
    { id: 'p8', name: 'Tato', number: 10 }
  ];
  var LINE = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8']; // Mona en la banca
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

    // Con línea de 7: un nombre mal escuchado se resuelve hacia quien está jugando.
    function lineCase(name, text, exp, checkUnc) {
      var r = core.interpret(text, ROSTER, LINE);
      var got = r.events.map(fmt);
      var ok = JSON.stringify(got) === JSON.stringify(exp) && (!checkUnc || checkUnc(r.events));
      results.push({ name: name, ok: ok, expected: exp.join(' | '), got: got.join(' | ') + ' ' + JSON.stringify(r.events.map(function (e) { return e.uncertain || ''; })) });
    }
    lineCase('línea: "mona" (en la banca) se lee como Mono', 'Pipe a mona, gol', ['Pipe>Mono', 'GOL Mono (ast Pipe)']);
    lineCase('línea: el 8 está en la banca → se marca', 'Pipe a el 8', ['Pipe>Mona'],
      function (evs) { return /no está en la línea/.test(evs[0].uncertain || ''); });
    var noLine = core.interpret('Pipe a mona', ROSTER);
    results.push({ name: 'sin línea: "mona" es Mona', ok: noLine.events.map(fmt)[0] === 'Pipe>Mona', expected: 'Pipe>Mona', got: noLine.events.map(fmt).join(' | ') });

    // Ataque / defensa y mixto
    var mk = function (txt) { return { events: core.interpret(txt, ROSTER).events }; };
    chk('primer punto recibiendo = ataque', core.nextPointType([], 'O'), 'O');
    chk('si anotamos, el siguiente es defensa', core.nextPointType([mk('Pipe a Mono, gol')], 'O'), 'D');
    chk('si anotan ellos, el siguiente es ataque', core.nextPointType([mk('nos anotan')], 'D'), 'O');
    chk('medio tiempo: empezamos en defensa → segundo tiempo en ataque', core.nextPointType([mk('Pipe a Mono, gol')], 'D', 1), 'O');
    chk('medio tiempo: empezamos en ataque → segundo tiempo en defensa', core.nextPointType([mk('nos anotan')], 'O', 1), 'D');
    chk('después del primer punto del 2.º tiempo vuelve la regla normal', core.nextPointType([mk('nos anotan'), mk('nos anotan')], 'O', 1), 'O');
    chk('ABBA desde 4H', [0, 1, 2, 3, 4, 5, 6].map(function (i) { return core.ratioFor(i, '4H'); }),
      ['4H', '4M', '4M', '4H', '4H', '4M', '4M']);
    var odPts = [
      { type: 'O', events: core.interpret('Pipe a Mono, gol', ROSTER).events },
      { type: 'D', events: core.interpret('nos anotan', ROSTER).events },
      { type: 'O', events: core.interpret('D de Sara, Sara a Leo, gol', ROSTER).events },
      { type: 'D', events: core.interpret('D de Tato, Tato a Caro, gol', ROSTER).events }
    ];
    var ods = core.computeStats(odPts, ROSTER);
    chk('holds 2/2 y breaks 1/2', [ods.holds, ods.breaks], [{ played: 2, won: 2 }, { played: 2, won: 1 }]);
    var onlyD = core.computeStats(odPts, ROSTER, 'D');
    chk('filtro defensa: solo cuenta la D de Tato', [onlyD.players.p8.ds, onlyD.players.p4.ds], [1, 0]);

    // Posesión en vivo y anulación de un gol (llamado)
    chk('defensa: arranca defendiendo', core.interpret('', ROSTER, null, { start: 'them' }).possession, 'them');
    chk('defensa: tras la D atacamos', core.interpret('D de Sara', ROSTER, null, { start: 'them' }).possession, 'us');
    chk('ataque: tras el throwaway defendemos', core.interpret('Pipe a Mono, throwaway', ROSTER, null, { start: 'us' }).possession, 'them');
    var anul = core.interpret('Pipe a Mono, gol, no fue gol, Mono a Sara', ROSTER);
    chk('"no fue gol" anula y el punto sigue', [anul.events.map(fmt).join(' | '), anul.outcome], ['Pipe>Mono | Mono>Sara', null]);

    // Errores del rival sin D, también con su nombre
    var opp1 = core.interpret('nos tiran, drop de ellos, Sara a Leo', ROSTER, null, { start: 'them' });
    chk('drop de ellos → recuperamos y atacamos', [opp1.events.map(fmt).join(' | '), opp1.events[0].kind, opp1.possession], ['PIERDEN | Sara>Leo', 'drop', 'us']);
    var opp2 = core.interpret('throwaway de Tigres, Pipe a Mono, punto de Tigres', ROSTER, null, { rival: 'Tigres' });
    chk('nombre del rival = ellos', [opp2.events.map(fmt).join(' | '), opp2.outcome], ['PIERDEN | Pipe>Mono | ELLOS', 'them']);

    // Más tolerancia con los 7 en cancha
    lineCase('línea: "pipo" y "juan" se leen como Pipe y Juancho', 'pipo, mono, juan', ['Pipe>Mono', 'Mono>Juancho']);
    lineCase('charla de banca no crea pases', 'corre Pipe, mira, toma, Mono', ['Pipe>Mono']);
    chk('"marca" no es gol', core.interpret('Pipe a Mono, marca', ROSTER).outcome, null);

    // Género por nombre al pegar listas
    chk('género por nombre', ['Sara', 'Vale', 'Mafe', 'Laura', 'Pipe', 'Juancho', 'Luca'].map(core.guessGender), ['M', 'M', 'M', 'M', null, null, 'H']);

    // Elegir la mejor alternativa del reconocimiento
    chk('la alternativa con nombres gana', core.scoreText('pipe a mono', ROSTER) > core.scoreText('pide a modo', ROSTER), true);

    // En defensa, "throwaway" o "drop" a secas es error del rival
    var dfn = core.interpret('throwaway, Sara a Leo, Leo a Pipe, drop, defensa de Mono, Mono a Juancho, gol', ROSTER, null, { start: 'them' });
    chk('en defensa: throwaway = error de ellos; después drop = nuestro; defensa = D',
      [dfn.events.map(fmt).join(' | '), dfn.events[0].kind], ['PIERDEN | Sara>Leo | DROP Pipe (de Leo) | D Mono | Mono>Juancho | GOL Juancho (ast Mono)', 'throwaway']);
    var atk = core.interpret('Pipe a Mono, throwaway, drop', ROSTER, null, { start: 'us' });
    chk('en ataque: throwaway nuestro, y luego el drop es de ellos', atk.events.map(fmt).join(' | '), 'Pipe>Mono | TA Mono | PIERDEN');
    chk('en defensa con nombre explícito sigue siendo nuestro', core.interpret('throwaway de Pipe', ROSTER, null, { start: 'them' }).events.map(fmt).join(' | '), 'TA Pipe');

    // Correcciones por voz
    chk('"no, a Sara" corrige el receptor', core.interpret('Pipe a Mono, no, a Sara, Sara a Leo', ROSTER).events.map(fmt).join(' | '), 'Pipe>Sara | Sara>Leo');
    chk('"corrijo Juancho" corrige al anotador', core.interpret('Pipe a Mono, gol, corrijo Juancho', ROSTER).events.map(fmt).join(' | '), 'Pipe>Juancho | GOL Mono (ast Pipe)'.replace('GOL Mono (ast Pipe)', 'GOL Juancho (ast Pipe)'));
    chk('"corrijo" sin nombre deshace', core.interpret('Pipe a Mono, Mono a Sara, corrijo', ROSTER).events.map(fmt).join(' | '), 'Pipe>Mono');

    // Breaks por jugador (estar en cancha cuando ganamos un punto de defensa)
    var brk = core.computeStats([
      { type: 'D', line: ['p1', 'p2'], events: core.interpret('D de Pipe, Pipe a Mono, gol', ROSTER).events },
      { type: 'D', line: ['p1', 'p3'], events: core.interpret('nos anotan', ROSTER).events },
      { type: 'O', line: ['p1'], events: core.interpret('Pipe a Mono, gol', ROSTER).events }
    ], ROSTER);
    chk('breaks jugados: Pipe 1, Mono 1, Juancho 0', [brk.players.p1.breaks, brk.players.p2.breaks, brk.players.p3.breaks], [1, 1, 0]);

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
    chk('Pipe: 3 pases, 1 rec, 3 pts', [s.players.p1.completions, s.players.p1.catches, s.players.p1.points], [3, 1, 3]);
    chk('Mono: ast 1, TA 1, +/- 0', [s.players.p2.assists, s.players.p2.throwaways, s.players.p2.plusMinus], [1, 1, 0]);
    chk('Juancho: gol 1, drop 1, +/- 0', [s.players.p3.goals, s.players.p3.drops, s.players.p3.plusMinus], [1, 1, 0]);
    chk('Sara: D 1, +/- 1', [s.players.p4.ds, s.players.p4.plusMinus], [1, 1]);
    chk('top conexión Pipe→Mono x3', [s.connections[0].from, s.connections[0].to, s.connections[0].count], ['p1', 'p2', 3]);

    return results;
  }

  root.runParserTests = runParserTests;
})(typeof window !== 'undefined' ? window : this);
