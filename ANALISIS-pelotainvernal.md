# Análisis de pelotainvernal.com (para el robot de Baseball Analytics)

Revisado el 23-oct-2026. **Léelo antes de programar el robot.**

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

### Qué se puede leer directo y qué no

| Página | ¿Los datos vienen en el HTML? |
|---|---|
| **Posiciones** | ✅ **Sí**: la tabla viene completa en el HTML. |
| **Calendario** | ❌ **No**: la página llega vacía ("No hay resultados") y los juegos se cargan después con JavaScript. |
| **Resultados** | ❌ **No**: igual que el Calendario. |
| **Portada: juego en vivo y resultados anteriores** | ❌ **No**: se carga con JavaScript. |

Para saber **de dónde** salen esos datos (la dirección interna que usa la página), hay que abrir el sitio en un navegador y mirar las peticiones de red. Eso **está pendiente**: no se pudo hacer porque el chat no estaba conectado a la computadora del dueño.

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

## 3. Calendario y Resultados

Esto se sabe por las capturas que mandó el dueño; el HTML llega vacío.

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
- **"H: 1 - 0"** aparece en las tarjetas y **no está confirmado** qué es. Lo más probable es que sean los **jonrones** (visitante - casa). Hay que verificarlo con un juego real antes de guardarlo.

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

## 6. Plan sugerido para el robot (pendiente de aprobar)

1. **Fuente principal:** la API de MLB para el calendario, los resultados y el juego en vivo, filtrando la liga 131. Fuente de respaldo y para comparar posiciones: pelotainvernal.com.
2. **Cada día:** traer el calendario de los próximos días y guardarlo en `juegos` con `fuente = 'mlb'` y `fuente_id = gamePk`, así no se duplica.
3. **Durante los juegos** (unos 6:00 p. m. – 1:00 a. m. hora RD): cada 30 a 60 segundos, leer el `linescore` de los juegos en vivo y actualizar `juegos` (C/H/E) y `juego_en_vivo` (entrada, conteo, bases, bateador, lanzador).
4. **Al terminar:** marcar el juego `final` y guardar ganador, perdedor y salvamento (salen del endpoint `boxscore` o `feed/live`; falta revisarlo).
5. **Avisos** (si se usan): uno por juego y tipo, usando `avisos_enviados`.
6. **La página** lee de Supabase. El juego en vivo siempre va primero a internet (ya está así en `sw.js`).

## 7. Pendientes

- [ ] Revisar el documento "revisar/analizar/conectate" del repo de LotoAnalytics. **Falta el acceso.**
- [ ] Ver en un navegador de dónde carga pelotainvernal el calendario, los resultados y el juego en vivo.
- [ ] Confirmar qué es "H: 1 - 0" en las tarjetas.
- [ ] Sacar los IDs de MLB de los 6 equipos de LIDOM.
- [ ] Revisar el `boxscore` / `feed/live` de MLB para ganador, perdedor, salvamento y la última jugada.
- [ ] El dueño decide sobre el permiso de uso de la fuente.
