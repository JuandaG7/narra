# UltiVoz

Prototipo para registrar estadísticas de ultimate **narrando el partido por voz** desde el celular.
Todo funciona en el teléfono: plantilla, interpretación y estadísticas se guardan en el navegador
(`localStorage`). No hay servidor ni API externa.

## Cómo se usa

1. **Plantilla**: carga a los jugadores con un apodo corto (una palabra, que suenen distinto) y su número.
   Si el celular entiende mal un nombre, escribe en "cómo lo escribe el celular" la palabra que sale (p. ej. Pipe → `pipa`).
2. **Partido → Empezar punto** y narra desde la banca:
   - `Pipe a Mono, Mono a Juancho, gol` → 2 pases, gol de Juancho, asistencia de Mono
   - `drop` / `se le cae` → drop del último receptor
   - `throwaway` / `la pierde` / `turn` → throwaway del que tiene el disco (`throwaway de Pipe` para decir quién)
   - `D de Sara` / `bloqueo de Sara` / `Sara bloquea` → D
   - `gol` / `punto` / `Juancho anota` / `gol de Juancho` → gol nuestro
   - `nos anotan` / `punto de ellos` → punto del rival
   - `la pierden ellos` → recuperamos sin D
   - `borra` / `me equivoqué` → deshace el último evento
   - Números también sirven: `el 7 a el 12`
3. **Terminar punto** → pantalla de revisión (para el pull): cambia jugadores, borra o agrega eventos.
   Las filas amarillas son nombres que se reconocieron "por parecido": revísalas. Las palabras que no
   se reconocieron aparecen arriba; asígnalas a un jugador y quedan guardadas como alias.
4. Si la voz falla, durante el punto hay **botones** con los jugadores y las acciones (escriben las mismas palabras).
5. **Stats**: marcador, tabla por jugador (pases, recepciones, goles, asistencias, D, drops, throwaways, +/-),
   top de conexiones y lista de puntos (se pueden editar). Exportable a CSV.

## Correr en el computador

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Abre http://localhost:8000. (En Claude Code ya está en `.claude/launch.json` como `ultivoz`.)

Pruebas del intérprete: abre http://localhost:8000/tests.html o, en la terminal de macOS:

```bash
./run_tests.sh
```

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

- `core.js` — intérprete de la narración (normalización, coincidencia difusa de nombres, máquina de estados) y cálculo de estadísticas.
- `app.js`, `index.html`, `styles.css` — interfaz.
- `tests.js`, `tests.html`, `run_tests.sh` — pruebas del intérprete.
- `sw.js`, `manifest.webmanifest` — funcionamiento sin conexión e instalación en pantalla de inicio.
