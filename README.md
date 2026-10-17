# Demo (nombre provisional)

Prototipo para registrar estadísticas de ultimate **narrando el partido por voz** desde el celular.
Todo funciona en el teléfono: plantilla, interpretación y estadísticas se guardan en el navegador
(`localStorage`). No hay servidor ni API externa.

## Cómo se usa

1. **Plantilla** (una sola vez)
   - Categoría del equipo: **Mixto**, Open o Femenino. En mixto, cada jugador lleva H o M y eliges la regla
     de proporción: **ABBA** (la app dice si toca 4 H · 3 M o 3 H · 4 M) o "la ofensa decide".
   - Carga a todos con apodo corto (una palabra, que suenen distinto) y número.
   - **Probar voz**: dices cada nombre una vez; lo que entienda el celular queda guardado como variante.
     Si dos apodos suenan igual, la app avisa.
   - **Líneas guardadas** (opcional): grupos de 7, marcados para ataque o defensa.
2. **Nuevo partido**: rival, si según el sorteo empezamos **atacando o defendiendo** y (en mixto) si el
   primer punto es **de chicas o de chicos**. Después la proporción sigue sola de dos en dos (regla A de WFDF);
   el medio tiempo no la cambia. En los puntos de defensa la app recuerda quién hace el pull (la mayoría).
   Al llegar al medio tiempo, toca **Marcar medio tiempo**: el segundo tiempo arranca al revés del primero
   (si empezamos defendiendo, arrancamos atacando).
3. **Durante el pull**: la app ya sabe si el punto es de **ataque** o **defensa** (quien anota hace el pull
   del siguiente; tocando la etiqueta se corrige). Pon una línea guardada con un toque o deja la del punto
   anterior; para un cambio, toca al que sale y luego al que entra en la banca. El contador muestra 7/7 y la
   proporción H/M.
4. **Empezar punto** y narra desde la banca:
   - `Pipe a Mono, Mono a Juancho, gol` → 2 pases, gol de Juancho, asistencia de Mono
   - `drop` / `se le cae` → drop del último receptor
   - `throwaway` / `la pierde` / `turn` → throwaway del que tiene el disco (`throwaway de Pipe` para decir quién)
   - `D de Sara` / `bloqueo de Sara` / `Sara bloquea` → D
   - `gol` / `punto` / `Juancho anota` / `gol de Juancho` → gol nuestro
   - `nos anotan` / `punto de ellos` → punto del rival
   - `la pierden ellos` → recuperamos sin D
   - `borra` / `me equivoqué` → deshace el último evento
   - Números también sirven: `el 7 a el 12`
   Los nombres se buscan primero entre los 7 en cancha, así que hay muchas menos confusiones. Si se escucha
   a alguien de la banca, queda marcado para revisar.
   Arriba se ve en vivo si estamos **atacando** o **defendiendo** (en un punto de defensa, tras una D atacamos;
   el punto sigue contando como de defensa). Al detectar **gol** o **nos anotan**, el punto se cierra solo en
   4 segundos; si fue un llamado, toca **No fue punto** (o di "no fue gol") y sigue.
5. **Revisión** (en el mismo pull): cada evento es una frase; toca un nombre para cambiarlo, toca el tipo
   para cambiarlo, desliza a la izquierda o toca × para borrar (con "Deshacer"). Lo amarillo es dudoso.
   Las palabras no reconocidas se asignan a un jugador y quedan aprendidas. **Confirmar** y a la siguiente línea.
6. Si la voz falla, durante el punto hay **botones** con los 7 de la línea, separados en chicos y chicas, y las acciones.
7. **Terminar partido** (o Reiniciar) desde la pantalla entre puntos: muestra el resumen final (marcador,
   líderes, conexión del partido) y **Compartir resultados** manda el CSV por WhatsApp o correo.
   Si confirmas un punto sin resultado, la app pregunta cómo terminó (para no descuadrar el marcador).
8. **Compartir la plantilla**: en Plantilla, "Compartir lista" la manda como texto; en el otro celular,
   "Pegar lista" la carga (formato: `Pipe 7 H | pipa`).
9. **Stats**: marcador, **holds** (puntos de ataque ganados) y **breaks** (de defensa), tabla por jugador
   filtrable por ataque/defensa (+/-, goles, asistencias, D, drops, throwaways, pases, recepciones, puntos
   jugados), conexiones y lista de puntos editables. Exportable a CSV.

## Correr en el computador

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Abre http://localhost:8000 (redirige a `app/`). En Claude Code ya está en `.claude/launch.json` como `ultivoz`.

Pruebas del intérprete: abre http://localhost:8000/pruebas/tests.html o, en la terminal de macOS:

```bash
pruebas/correr_pruebas.sh
```

## Publicarla para usarla en la cancha

La carpeta **`app/`** es la app completa. Arrástrala a https://app.netlify.com/drop (con una cuenta gratis,
el enlace queda fijo) y comparte el enlace https. Para actualizarla: en el sitio, **Deploys** → arrastra otra
vez la carpeta `app/`.

## Abrirla desde el celular (importante)

El reconocimiento de voz del navegador (Web Speech API) y el micrófono **solo funcionan en HTTPS o en
`localhost`**. Si abres `http://192.168.x.x:8000` desde el celular, la app carga pero la voz queda
desactivada (solo botones). Opciones prácticas:

- **Para el entreno (recomendado): publicarla en HTTPS gratis.** Sube la carpeta a GitHub Pages o arrástrala a
  Netlify Drop (app.netlify.com/drop). Ábrela una vez con señal; el *service worker* la guarda y después abre
  aunque no haya internet. Agrégala a la pantalla de inicio ("Agregar a pantalla de inicio").
- **Para probar en casa con Android (misma wifi):** en el celular, Chrome → `chrome://flags/#unsafely-treat-insecure-origin-as-secure`,
  agrega `http://IP-DEL-COMPU:8000`, activa y reinicia Chrome. La IP del Mac sale con `ipconfig getifaddr en0`.
- **Túnel HTTPS temporal:** `cloudflared tunnel --url http://localhost:8000` (o ngrok) da una URL https para
  abrir en cualquier celular. Necesita internet en ambos lados.

### Limitación: voz sin internet

La interpretación del texto es 100 % local, pero **el reconocimiento de voz en sí lo hace el navegador**:
- **Chrome en Android** normalmente envía el audio a los servidores de Google → necesita datos/señal.
  Chrome reciente puede reconocer en el dispositivo: activa "Reconocer en el dispositivo" en Plantilla
  (si el idioma no está descargado, la app avisa y puedes seguir con botones).
- **Safari en iPhone** usa el dictado de Siri, que en iPhones recientes puede funcionar sin conexión
  si el dictado en español está descargado (Ajustes → General → Teclado → Dictado).

Para el primer entreno: lleva datos móviles y prueba ambos modos.

## Consejos para la cancha

- Narra frases cortas y con pausa: "Pipe… a Mono… Mono a Juancho… gol".
- La pantalla se mantiene encendida mientras graba (si el navegador lo permite). Si se apaga, se corta la voz.
- Si recargas la página a mitad de un punto, lo narrado no se pierde: pasa a revisión.

## Archivos

- `app/` — la app (esto es lo que se publica):
  - `core.js` — intérprete de la narración (normalización, coincidencia difusa de nombres con prioridad a la línea, máquina de estados), ataque/defensa, ABBA y estadísticas.
  - `app.js`, `index.html`, `styles.css` — interfaz.
  - `sw.js`, `manifest.webmanifest`, `icon*.svg/png` — funcionamiento sin conexión e instalación en pantalla de inicio.
- `pruebas/` — pruebas del intérprete (`tests.js`, `tests.html`, `correr_pruebas.sh`).
