#!/bin/sh
# Ejecuta las pruebas del intérprete con el motor JavaScript de macOS (sin Node).
cd "$(dirname "$0")"
{ cat core.js tests.js; cat <<'JS'
var r = runParserTests(UltiCore), fails = 0, out = [];
r.forEach(function (t) {
  if (!t.ok) fails++;
  out.push((t.ok ? 'OK   ' : 'FALLA') + '  ' + t.name + (t.ok ? '' : '\n        esperado: ' + t.expected + '\n        obtenido: ' + t.got));
});
out.push('\n' + (r.length - fails) + '/' + r.length + ' pruebas OK');
if (fails) throw new Error(out.join('\n'));
out.join('\n');
JS
} | osascript -l JavaScript -
