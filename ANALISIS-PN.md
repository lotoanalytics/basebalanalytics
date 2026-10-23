# Análisis PN: la fuente pelotainvernal.com (para el robot de Baseball Analytics)

Revisado el 23-oct-2026 (con el robot explorador `robot/explorar-pelotainvernal.js`). **Léelo antes de programar el robot.**

## 1. Cómo está armado el sitio

Hay tres torneos y cada uno tiene la misma estructura:

| Torneo | Página principal | Posiciones | Calendario | Resultados |
|---|---|---|---|---|
| Pelota Invernal (LIDOM) | `/liga/dominicana-lidom` | `/liga/dominicana-lidom/tabla-de-posiciones` | `/liga/dominicana-lidom/calendario` | `/liga/dominicana-lidom/resultados` |
| Serie del Caribe | `/liga/serie-del-caribe` | `.../tabla-de-posiciones` | `.../calendario` | `.../resultados` |
| Clásico Mundial | `/liga/clasico-mundial-beisbol` | `.../tabla-de-posiciones` | `.../calendario` | `.../resultados` |

- **Equipos:** `/equipo/<slug>`, por ejemplo `tigres-del-licey`, `aguilas-cibaenas`, `estrellas-orientales`, `toros-del-este`, `leones-del-escogido`, `gigantes-del-cibao`, `republica-dominicana`, `puerto-rico`. Muestran la historia, el estadio y el roster (`#`, `Nombre`, `Posición`). No muestran estadísticas.
- **Logos:** vienen de `s3.amazonaws.com/cdn.baseball-new.com/...`. Son los logos oficiales de los equipos: **no los copiamos**, porque son marcas registradas. Usamos nuestras imágenes y banderas.
- El sitio dice que es **independiente** y que no es oficial de LIDOM ni de la Serie del Caribe. El pie de página dice "© Todos los derechos reservados" y que apoyan la DMCA.
- Otras partes: un chat, la app (Android `com.pelota`, iPhone `id723302709`) y enlaces a emisoras.

### De dónde salen los datos (descubierto el 23-oct-2026 con el robot explorador)

El sitio funciona sobre la plataforma **Kiskoo / Conéctate**. Es la misma empresa de conectate.com.do, que ya usa el robot de LotoAnalytics. Sus programas vienen de `cdn-conectate.kiskoo.com`.

| Qué | Cómo lo pide la página |
|---|---|
| **Posiciones** | Vienen ya escritas en el HTML de `/liga/<liga>/tabla-de-posiciones`. |
| **Calendario** | `POST https://pelotainvernal.com/liga/<liga>/calendario` con el cuerpo `page=1` → devuelve **JSON** con una lista de juegos. |
| **Resultados** | `POST https://pelotainvernal.com/liga/<liga>/resultados` con el cuerpo `page=1` → devuelve **JSON**. `page=2`, `page=3`… traen los juegos más viejos. |
| **Juego en vivo** | Un **canal en vivo (WebSocket)** en `wss://s.pelotainvernal.com/`. El programa `game-socket.js` solo se conecta, manda un "sigo aquí" cada 10 segundos con la hora, y se reconecta solo si se cae. No pide un juego específico: el servidor empuja los cambios. **Falta ver qué mensajes manda durante un juego** (a las 3:00 p. m. no había juego). |
| **Detalle de un juego** | `https://pelotainvernal.com/<id del juego>`, por ejemplo `/2198`. Trae los dos lineups, el cara a cara de la temporada (G P C H E) y las estadísticas generales de cada equipo: **CA** = carreras anotadas por juego, **CP** = carreras permitidas por juego, **H** = hits por juego, **E** = errores por juego. |
| Otro | `idle-reload.js`: si la pestaña estuvo escondida más de 1 minuto, la página se recarga sola al volver. |

### Cómo viene cada juego (el JSON)

Cada juego trae estos datos:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Número del juego (sirve para no duplicar y para el enlace `/id`) | `2198` |
| `season_id` | Temporada | `23` = LIDOM 2026-27 |
| `date` | Fecha y hora **de República Dominicana** | `2026-10-22 19:00:00` |
| `status` | Estado del juego | **1 = programado · 6 = final · 7 = pospuesto**. Los de "en vivo" faltan por ver. |
| `comment` | Nota | `Por lluvias` (cuando se pospone) |
| `roundText` | Entrada en texto | `Alta 1ra`, `Baja 10ma` |
| `currentInningNum` | Número de la entrada | `10` |
| `part` | Mitad de la entrada | **1 = Alta** (batea el visitante) · **2 = Baja** (batea el de casa) |
| `battingTeam` | Quién batea | `awayTeam` (visitante) / `homeTeam` (casa) |
| `balls` · `strikes` · `outs` | Conteo | `3`, `1`, `0` |
| `base` | Bases ocupadas (en código) | Casi siempre `1`; una vez `3`. **Falta descifrar** cómo se lee con un juego en vivo. |
| `lastPlayByPlay` | Última jugada | `Kelvin Gutierrez se embasa por Error del Campo Corto` |
| `atBat` | Bateador | (vacío cuando el juego no está en vivo) |
| `winningPitcher` · `losingPitcher` · `savingPitcher` | Ganador, perdedor y salvamento | `Yerry Rodriguez` |
| `gameAlert` | Aviso | (ej. "Cambio de lanzador") |
| `awayTeam` / `homeTeam` | Visitante / casa | Ver abajo |
| `moneyline_*`, `handicap_*`, `over_under` | **Datos de apuestas**: vienen vacíos y **NO se usan** (regla de Google Play / AdSense) | `null` |
| `adImage`, `adLink`, `banner` | Publicidad de ellos | — no se usa |

Cada equipo (`awayTeam` / `homeTeam`) trae:
- `id` del equipo: Tigres = 1, Aguilas = 3, Leones = 4, Gigantes = 5, Toros = 6, Estrellas = 7.
- `name` y `abbreviation` (TL, AC, LE, GC, TE, EO).
- `color`: el color del equipo en código, sin el `#`. Por ejemplo `233b77` Tigres, `fdc915` Águilas, `db2319` Leones, `831d35` Gigantes, `ef7722` Toros, `159e46` Estrellas.
- `logo`: el logo oficial. **No se usa**: es marca registrada.
- `runs`, `hits` y `errors`: C, H y E.
- **`runs_half`**: las carreras en las primeras 5 entradas (la mitad del juego).
  - Es el **"H: 1 - 0"** que sale en las tarjetas de la portada. ✔ Confirmado: Tigres–Toros 1-0; Gigantes–Leones 5-8; Toros–Gigantes 2-0, y en este último coincide con las entradas que trae MLB.
- `pitcher` (lanzador abridor o actual), `era`, `debut` y `record` (récord del lanzador, ej. `0-0`).

## 2. Tabla de posiciones: qué significa cada columna

La tabla real de LIDOM del 23-oct-2026:

| Equipo | | G | P | DIF | TL | GC | EO | TE | AC | LE | PCT | CASA | RUTA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Tigres | TL | 4 | 1 | - | - | 1 | 0 | 1 | 0 | 2 | .800 | 1 - 1 | 3 - 0 |
| Gigantes | GC | 4 | 2 | 0.5 | 1 | - | 0 | 1 | 1 | 1 | .667 | 2 - 1 | 2 - 1 |
| Estrellas | EO | 2 | 2 | 1.5 | 0 | 0 | - | 1 | 0 | 1 | .500 | 1 - 1 | 1 - 1 |
| Toros | TE | 3 | 3 | 1.5 | 0 | 0 | 1 | - | 2 | 0 | .500 | 1 - 2 | 2 - 1 |
| Aguilas | AC | 1 | 3 | 2.5 | 0 | 1 | 0 | 0 | - | 0 | .250 | 1 - 1 | 0 - 2 |
| Leones | LE | 1 | 4 | 3 | 0 | 0 | 1 | 0 | 0 | - | .200 | 1 - 2 | 0 - 2 |

- **G** son los juegos ganados y **P** los perdidos.
- **PCT** es el promedio de victorias, **G ÷ (G + P)**. Se muestra con 3 decimales y sin el 0 de delante (`.800`). Si el equipo no ha ganado, a veces sale `0` en vez de `.000`.
- **DIF** son los juegos de diferencia con el primero: **((G del líder − G) + (P − P del líder)) ÷ 2**. El líder muestra `-`.
  - Comprobado con Gigantes: ((4−4) + (2−1)) ÷ 2 = **0.5** ✔
- **TL, GC, EO, TE, AC, LE**: cuántas veces le ha **ganado** ese equipo a cada rival. En la casilla de sí mismo sale `-`.
  - Ejemplo: Tigres le ha ganado 2 veces a Leones.
  - En la Serie del Caribe y el Clásico, las columnas son los países (MEX, DOM, MXV, PUR, PAN…).
- **CASA** es el récord jugando en su estadio y **RUTA** el récord jugando fuera, los dos como "ganados - perdidos".
- **El orden** es de mayor a menor PCT. No hay columna de posición: el lugar sale del orden de las filas.

**Datos de la temporada 2026-27:**
- La serie regular va del 16-oct al 23-dic-2026 y tiene 150 juegos en total (6 equipos × 50 juegos ÷ 2).
- Los 4 primeros pasan al Round Robin, y los 2 primeros del Round Robin juegan la Serie Final.
- Campeón 2025-26: Leones, que le ganaron 4-1 a los Toros.

**Ojo:**
- El nombre del sitio es "Aguilas", sin tilde.
- MXV es el segundo equipo de México ("México Verde").

## 3. Calendario y Resultados (cómo se ven)

La página pinta en pantalla el JSON de arriba:

- **Calendario:** columnas Fecha · Visitante · Casa · Hora, en hora de República Dominicana, con el formato `7:00 p. m.`
- **Resultados:** columnas Fecha · Visitante · Resultado · Casa.
  - El resultado se escribe `visitante : casa`, por ejemplo `14 : 9`.
  - Si el juego se pospuso, sale **`PP`**.
- Las dos agrupan por fecha y muestran los equipos con su abreviatura (TL, GC…).

## 4. Portada: juego en vivo y resultados anteriores

Esto también sale de las capturas del dueño.

**Juego en vivo:**
- **Entrada:** "Alta 7ma" o "Baja 7ma". Alta = batea el visitante; Baja = batea el de casa.
- **Marcador C · H · E:** **C**arreras, **H**its y **E**rrores de cada equipo.
- **El icono de bate** junto al nombre marca el equipo que está bateando.
- **Bases:** el diamante; una base pintada quiere decir que está ocupada.
- **Conteo:**
  - **B** = bolas, de 0 a 3 (4 círculos).
  - **S** = strikes, de 0 a 2 (3 círculos).
  - **O** = outs, de 0 a 2 (3 círculos).
- **Al Bate, Lanzador y Últ. Jugada**, por ejemplo "Noelvi Marte · Out: elevado al jardinero derecho".
- **Avisos** como "Cambio de Lanzador".

**Resultados anteriores:**
- Cada tarjeta trae el estado (**Final** o **Pospuesto**), la fecha y hora, y el marcador C/H/E.
- Si terminó, trae **Ganador** (lanzador que gana), **Perdedor** (lanzador que pierde) y **Salvamento** (cerrador, cuando lo hay).
- Si se pospuso, trae el motivo, por ejemplo "Por lluvias".
- **"H: 1 - 0"** = carreras de cada equipo en las primeras 5 entradas (campo `runs_half`). ✔ Confirmado.

## 5. Fuente encontrada: la API pública de estadísticas de MLB

MLB publica en JSON los datos de las ligas invernales, **LIDOM incluida**. Lo comprobé el 23-oct-2026:

- **LIDOM** es `leagueId = 131` ("Liga de Beisbol Dominicano"), dentro de `sportId = 17` (ligas invernales).
- **Juegos del día:** `https://statsapi.mlb.com/api/v1/schedule?sportId=17&date=MM/DD/AAAA`.
  - Ejemplo del 22-oct: el juego `gamePk 851515` fue Toros del Este (668) en Gigantes del Cibao (670), en el Estadio Julián Javier, a las 23:00 UTC (7:00 p. m. en RD). Es el mismo juego del calendario de pelotainvernal.
  - Ese día también trae juegos de Venezuela, México y Arizona: hay que **filtrar por la liga 131**.
- **Juego en vivo:** `https://statsapi.mlb.com/api/v1/game/<gamePk>/linescore`
  - `currentInning`, `inningState` (Top/Middle/Bottom/End) e `isTopInning` → con esto se arma "Alta 10ma" / "Baja 10ma".
  - `balls`, `strikes` y `outs` → el conteo.
  - `teams.home/away.runs/hits/errors` → C, H y E.
  - `innings[]` → las carreras de cada entrada.
  - `offense.batter`, `offense.first/second/third` → el bateador y los corredores en cada base. Esto da el **diamante con los peloteritos**.
  - `defense.pitcher` → el lanzador.
- **Posiciones:** `https://statsapi.mlb.com/api/v1/standings?leagueId=131&season=2026`.
  - Trae `wins`, `losses`, `gamesBack` y `winningPercentage`.
  - **Ojo: estaba atrasada.** Su última actualización era del 19-oct, cuando pelotainvernal ya iba más adelante. Es mejor **calcular las posiciones con los juegos terminados** (la vista `posiciones_calculadas` de nuestra base ya lo hace) o tomarlas de pelotainvernal.
- **IDs de equipos LIDOM vistos hasta ahora:** Toros del Este = 668 y Gigantes del Cibao = 670. Faltan los demás; salen de la misma consulta.

⚠️ **Sobre el permiso de uso:** tanto la API de MLB como pelotainvernal.com tienen derechos reservados. La API de MLB permite uso personal y no comercial; usarla en una app con anuncios (AdSense) puede ir contra sus términos. Los marcadores en sí son hechos, pero la forma de obtenerlos importa. **Decisión del dueño antes de publicar con anuncios.** (Claude no es abogado.)

## 6. El robot (hecho el 23-oct-2026)

- **Archivos:** `robot/robot-beisbol.js` y `.github/workflows/robot-beisbol.yml` ("Robot de béisbol").
- **De dónde sale:** es una copia adaptada del robot "todo en uno" de LotoAnalytics (`robot/backend-todo-en-uno (1).js`, que solo se leyó). Se copiaron estas ideas:
  1. **Leer desde la página, no directo del servidor.** Se abre la página en un Chrome sin pantalla, se toma la lista de juegos que la página misma recibe (el POST con `page=1`) y se **comprueba** con lo que se ve en pantalla (nombres y marcador). Si no coincide, no se usa. Así se hace porque Conéctate, la misma empresa, dio números falsos a quien le pedía directo.
  2. Se bloquean imágenes, letras y estilos para que cargue rápido. Cada página tiene un límite de 30 s y el vigilante corta la corrida a los 3 minutos.
  3. Un juego `final` nunca se pisa con una lectura "peor", y un juego con `manual = true` nunca se toca.
  4. Las horas van en hora de RD tal como las da la fuente.
- **Qué lee en cada corrida, por cada torneo con `activo = true` en la tabla `torneos`:** el calendario, los resultados y las posiciones.
- **Qué guarda:**
  - `juegos`: por `fuente_id`, así no se duplica.
  - `juego_en_vivo`: entrada, al bate, conteo, bateador, lanzador, última jugada, aviso y `base_codigo`.
  - `posiciones`.
  - `corridas_robot`: un registro de cada corrida.
  - Los equipos nuevos que aparezcan se agregan solos.
- **No guarda nunca** los datos de apuestas ni los logos oficiales.
- **Modo prueba:** si se corre con `solo_leer = 1`, o si faltan las claves, solo lee y muestra. Lo que dijo queda en la rama `exploracion`, archivo `registro/ultima-corrida.txt`.
- **Primera prueba, 23-oct-2026:** 0 errores. Leyó 30 juegos del calendario, 16 resultados y la tabla de los 6 equipos; todo coincidió con la pantalla.
- Algunos juegos del calendario salen a las **5:00 a. m.** (por ejemplo el 1-nov). Parece que la fuente usa esa hora cuando todavía no se sabe la hora real; hay que revisarlo.
- **Para que guarde de verdad faltan dos cosas:**
  1. Poner en el repo los secretos `SUPABASE_URL` (`https://fehvnwwzdygjsxsjzxlu.supabase.co`) y `SUPABASE_SERVICE_ROLE_KEY` (la clave secreta del proyecto `baseball-analytics` en Supabase).
  2. Programar en cron-job.org las llamadas a `workflow_dispatch`: una vez al día en la mañana, y cada 5 minutos de 4:00 p. m. a 1:00 a. m. hora RD.

## 6b. Cómo decide el robot qué buscar (por los horarios), desde el 23-oct-2026

**El robot se activa siempre a mano.** Lo llama el cron del dueño en cron-job.org, o se corre con el botón de Actions; GitHub no tiene horario propio para él. En cada corrida, **primero mira los horarios guardados en la base** y arma su "plan":

| Situación | Qué busca |
|---|---|
| El torneo no tiene horarios guardados | Calendario + resultados + posiciones |
| El calendario se revisó hace más de 12 horas | Calendario + posiciones |
| Un juego está en su horario: desde 15 min antes hasta 6 horas después, o ya está en vivo | Calendario + resultados (ahí vienen el en vivo y el final) |
| Un juego ya pasó su horario y no aparece final | Resultados |
| Un juego terminó en esta corrida | Posiciones |
| No le toca nada | **No abre el navegador** y termina en segundos |

- **Hora no creíble:** si la hora de un juego es antes de las 10:00 a. m. (la fuente pone 5:00 a. m. cuando aún no hay hora), se vigila de 12:00 p. m. a medianoche de ese día.
- **Dónde se anota:**
  - La última revisión de cada página va en la tabla `revisiones_robot`.
  - Lo que decidió y por qué va en `corridas_robot.plan`.
- **Para probar:** `forzar = 1` busca todo sin mirar los horarios, y `solo_leer = 1` no guarda nada.
- **Lo que dijo el robot** en la última corrida queda siempre en la rama `exploracion`, archivo `registro/ultima-corrida.txt`.
- **Protecciones, copiadas del robot de LotoAnalytics:**
  - puppeteer-extra + stealth, y si no cargan, Puppeteer normal.
  - Imágenes, letras y estilos bloqueados.
  - 30 s por página y un reintento.
  - Límite de 2 min 30 s para toda la corrida y vigilante de 3 min.
  - Si el navegador no cierra en 5 s, se mata.
  - Nunca se pisa un juego final ni uno puesto a mano.
  - Si una página falla, las demás siguen.
  - Nunca dos corridas a la vez (`concurrency`).
  - Caché de las librerías y de Chrome.

## 7. Pendientes

- [x] Revisar el documento de LotoAnalytics: `robot/probar-conectate.js` (solo lectura). La copia es `robot/explorar-pelotainvernal.js`.
- [x] Ver de dónde carga pelotainvernal el calendario y los resultados (JSON por POST).
- [x] Confirmar qué es "H: 1 - 0": las carreras en las primeras 5 entradas (`runs_half`).
- [ ] **Escuchar el canal en vivo durante un juego**, para ver los estados en vivo y cómo viene `base`. Hay que correr el explorador mientras hay juego, por ejemplo a las 8:00 p. m.
- [ ] Ver qué trae `page=2` en resultados (los juegos viejos).
- [ ] Sacar los IDs de MLB de los 6 equipos de LIDOM.
- [ ] Revisar el `boxscore` / `feed/live` de MLB para ganador, perdedor, salvamento y la última jugada.
- [ ] El dueño decide sobre el permiso de uso de la fuente.
