# Baseball Analytics (antes "Tuanalytics") — instrucciones para cada chat

**Lee este documento al empezar cualquier chat de este proyecto.** Aquí se anota todo lo que el dueño decide. Cada cambio nuevo se agrega en "Registro de decisiones" con la fecha.

## ⚠️ REGLA DE REPOSITORIOS (no se cambia sin hablarlo)
- **`lotoanalytics/basebalanalytics`** → el repo de ESTE proyecto. **Es el único donde se hacen cambios** (commits, push).
- **`lotoanalytics/lotoanalytics`** → repo principal de LotoAnalytics (privado). **SOLO SE REVISA, NO SE TOCA NADA**: ni commits, ni push, ni ramas, ni issues. Se clona para leer cuando el dueño hable de él (por ejemplo, para copiar una idea) y la copia adaptada se pone en `basebalanalytics`.
- Cualquier otro repo que el dueño mencione: igual, **solo revisar**.
- La app de Claude en GitHub (cuenta `lotoanalytics`) tiene acceso solo a esos dos repos.

## Cómo trabajar con el dueño
- **CERO INGLÉS. Todo en español, siempre**: los mensajes al dueño, los avisos mientras se trabaja, los documentos, los comentarios del código, los mensajes de los commits y los nombres que se le muestran. Ni una frase en inglés.
- Hablarle en español sencillo, sin tecnicismos.
- El dueño explica qué cambiar, arreglar o estructurar, paso a paso. No adelantarse a hacer cambios que no pidió.
- Después de cada decisión, actualizar este documento y guardar la versión nueva de la página en el proyecto.

## Qué es (desde el 22-oct-2026)
Página **Baseball Analytics**: resultados de la **pelota invernal dominicana (LIDOM)**. Ya **no** es multideporte: se quitaron fútbol, baloncesto, tenis, "Otros", las pastillas G/E/P, las estadísticas destacadas y la barra de abajo.
Se llegaría desde el menú ☰ de la app LotoAnalytics. Todavía **no** está conectada a la app ni publicada.

## Archivos en este proyecto
- **`claude/baseball-analytics.html`** — la página ACTUAL. Un solo archivo HTML. Trabajar siempre sobre este.
- `claude/tuanalytics-index.html` — la versión vieja multideporte (solo de referencia).
- La imagen vieja `fondo-deportes.jpg` (bolas de varios deportes) ya **no se usa**. Está en GitHub, repo `lotoanalytics/lotoanalytics`, commit `d11aba5`, por si acaso.
- **Repositorio de GitHub: `lotoanalytics/basebalanalytics`** (rama `main`). Ahí van `index.html` (la página), `INSTRUCCIONES.md` (copia de este documento) y `README.md`. Cada cambio en la página se sube también al repo, y se mantienen iguales el repo y el proyecto.
- **Publicada en Vercel** (23-oct-2026): proyecto **`baseball-analytics`**, aparte del proyecto `lotoanalytics` (misma cuenta de Vercel, despliegue diferente). Enlace: **https://baseball-analytics-lilac.vercel.app**. Está conectado al repo: cada push a `main` se publica solo.

## Diseño actual (Baseball Analytics)
- **Fondo (desde 23-oct-2026): SOLO la imagen del estadio** que mandó el dueño (`fondo/estadio.webp` en el repo), fija y cubriendo toda la pantalla. Se recortó para **quitar las personas** de abajo. El dueño pidió que en el fondo no haya nada más: se quitaron las estrellitas, los brillos y las pelotas flotantes. Los textos que van directo sobre la imagen llevan sombra negra para que se lean.
- **El fondo no se mueve al deslizar** (23-oct): `.fondo` tiene alto fijo `100lvh` (el alto grande del teléfono, así no "brinca" cuando la barra del navegador sale o se esconde) y va en su propia capa (`translate3d`, `will-change`). Solo se mueven las tarjetas.
- **Tarjetas de cristal del color escogido** (23-oct): fondo del color del tema transparente con desenfoque (`backdrop-filter: blur(14px)`), reflejo blanco arriba y borde brillante: verde cristal, rojo cristal, etc. Textos con sombrita para que se lean.
- Resto del estilo vivo como LotoAnalytics (desde 22-oct): Tarjetas con borde brillante del color del tema. Títulos y nombre con letra **Audiowide** (la de LotoAnalytics); el resto Exo 2.
- **Números como bolas brillantes** (como los números de la lotería), en las carreras del marcador y de Resultados. Desde el 23-oct **cada bola lleva el COLOR DE SU EQUIPO**: rojo Leones, naranja Toros, amarillo Águilas, azul Tigres, verde Estrellas y vino Gigantes (función `bolaEquipo`, usa `c1`/`c2` del equipo).
  - El que gana: aro blanco y brillo. El que pierde: su mismo color, sin aro ni brillo.
  - En los equipos claros (amarillo, naranja) el número va oscuro.
  - Los países, que no tienen color propio, usan la bola del color del tema.
- Cabecera: botón ☰ (abre el menú), el **logo de la app** (`iconos/icono.svg`) y "Baseball Analytics". Lema: "Pelota invernal · LIDOM".
- **Datos REALES desde el 23-oct-2026**: la página lee la base de Supabase con la clave PÚBLICA (`sb_publishable_JyMV71aNo6krcED46eVIjQ_NWXx1vX_`, solo deja leer) por `fetch` a `/rest/v1/`: torneos, equipos, juegos, juego_en_vivo y posiciones (función `cargarDatos` → `armarTorneos`).
  - **Se vuelve a leer sola:** cada 30 s si hay juego en vivo, cada 1 min si hay un juego en su horario, y si no, cada 5 min. También al volver a la pestaña.
  - Lo último que llegó se guarda en el teléfono (`localStorage`, clave `ba-datos`) para abrir al instante. Debajo del lema dice "Actualizado a las …".
  - Si no hay juego en vivo, la portada muestra los **juegos de hoy** que todavía no empiezan.
  - Las horas antes de las 10 a. m. salen como "Por confirmar".
  - En las tarjetas de resultados sale "En 5 entradas: x - y".
  - Ya **no hay datos de ejemplo**: el aviso amarillo de "vista de prueba" se quitó.
- 4 pestañas arriba (como la app Pelota Invernal que el dueño mostró de modelo):
  1. **Portada**: "Juego de hoy" EN VIVO (entrada, marcador C/H/E, quién está al bate, bases en diamante, bolas/strikes/outs, al bate, lanzador, última jugada, nota) y "Resultados anteriores" (Final o Pospuesto, marcador C/H/E, ganador, perdedor, salvamento, motivo).
     - **Diamante de bases en 3D acostado** (23-oct, función `diamante3D`): terreno en perspectiva con las 4 almohadillas con grosor. En cada base ocupada hay un **peloterito** (función `peloterito`) con gorra y camiseta del **color del equipo que está al bate** (`color1`/`color2` del equipo) y la almohadilla se pinta de ese color. En home siempre está el bateador con su bate. Datos: `bases:[primera, segunda, tercera]` y `alBate`.
     - **Mini estadio** (23-oct-2026): al tocar la tarjeta del juego en vivo se abre en pantalla completa un estadio que solo se mira, no se juega. Lo que muestra:
       - Arriba, un **tablero** tipo estadio con números de luz: C/H/E de cada equipo, un punto amarillo en el que batea, y las luces B/S/O.
       - Un **campo dibujado** con las gradas y el público, las torres de luces, la pared con el letrero "BASEBALL ANALYTICS", la grama en franjas, la tierra, las bases y el montículo.
       - La **defensa**: los 9 jugadores en sus posiciones, con el color del equipo que defiende.
       - Los **corredores** en las bases ocupadas y el **bateador** en home con su bate, en el color del equipo que batea. El bateador y el lanzador llevan **su nombre en una etiqueta encima de la cabeza**.
       - Abajo, el al bate, el lanzador, la última jugada y el aviso.
       - Se cierra con la X, con el botón "atrás" del teléfono o con Escape.
       - Funciones: `abrirEstadio`, `pintarEstadio`, `campoEstadio`, `tablero`. Se vuelve a dibujar cada vez que se pinta la portada, así que **se actualiza solo cuando llegan datos nuevos del robot**. Los jugadores "respiran" un poquito; esa animación se apaga si el teléfono pide menos movimiento.
  2. **Posiciones**: Equipo, G, P, DIF, PCT. DIF y PCT se calculan solos; el líder resaltado.
  3. **Calendario**: agrupado por fecha, visitante a la izquierda, casa a la derecha, hora.
  4. **Resultados**: agrupado por fecha, visitante – carreras – casa; el que gana resaltado con el color del tema; PP = pospuesto.
- Equipos LIDOM con **animales propios** dibujados por nosotros (objeto `ANIMALES`, en bola brillante con el color del equipo): Tigres = tigre rugiendo (azul), Gigantes = caballo (vino), Toros = toro con argolla (naranja), Estrellas = elefante con estrella (verde), Águilas = águila (amarillo), Leones = león rugiendo (rojo). Estilo **clásico de emblema deportivo**: cabezas de perfil mirando a la derecha, blancas, con cortes angulares y sombras en facetas (dibujo en cuadro de 64×64). El dueño rechazó el estilo caricatura/gatico: no volver a caras de frente redonditas. Son dibujos originales, **no** los logos oficiales.
- Los datos están en listas al principio del `<script>` (EQUIPOS, JUEGO_HOY, ANTERIORES, POSICIONES, CALENDARIO, RESULTADOS), listos para que un robot los llene.

## Escudos con imagen (del dueño)
- Desde el 23-oct-2026 **los 6 equipos de LIDOM** usan imágenes hechas por el dueño con IA, en estilo neón: el animal o símbolo con dos bates cruzados y fondo de estadio.
  - `escudos/tigres.webp`: tigre azul.
  - `escudos/leones.webp`: león rojo.
  - `escudos/aguilas.webp`: águila amarilla.
  - `escudos/gigantes.webp`: caballo rojo.
  - `escudos/toros.webp`: toro naranja con argolla.
  - `escudos/estrellas.webp`: estrella verde de cristal.
- Las imágenes miden 256 px y están recortadas un 10 % por cada lado.
- En el código, si un equipo tiene `img`, se muestra la imagen (fondo oscuro, `object-fit: cover`). Los animales dibujados (`ANIMALES`) quedan solo de reserva.
- Cada imagen nueva hay que ponerla en la lista `BASE` de `sw.js` y subir `VERSION`.
- El proyecto de Claude solo guarda texto: las imágenes viven en el repo de GitHub.

## Caché (desde 23-oct-2026) — para que abra rápido
- El dueño pidió: **toda la página se guarda en caché** y abre al instante; **lo único que siempre se busca primero en internet es el en vivo / juegos de hoy**.
- Archivo **`sw.js`** (service worker): 
  - Todo (página, fondo, escudos, letras) → sale de la caché al instante y se actualiza por detrás. Los cambios nuevos se ven la siguiente vez que se abre.
  - En vivo / juegos de hoy → **internet primero** (espera máx. 5 s) y si no hay, lo último guardado. Se reconoce por ir a `*.supabase.co` o a `/api/`. Cuando se conecte la base, los datos del en vivo deben pedirse a Supabase para que sigan esta regla.
  - Si se cambia una imagen **sin cambiarle el nombre**, hay que subir `VERSION` en `sw.js` (ahora `ba-v7`). Si se agrega una imagen nueva, ponerla en la lista `BASE`.
- **`vercel.json`**: `sw.js` sin caché; imágenes de `fondo/` y `escudos/` con caché de 30 días.
- Probado: después de la primera visita, la página abre completa **sin internet**.
- Nota: el error `ERR_CONNECTION_TIMED_OUT` del 23-oct es de conexión al servidor `*.vercel.app` (antes de bajar nada). La caché lo resuelve desde la 2.ª visita; si la primera visita sigue fallando con frecuencia, considerar un dominio propio.

## App descargable (PWA), desde el 23-oct-2026
- **Logo propio** (`iconos/`), hecho por Claude: una pelota de béisbol blanca con costuras rojas, tres barras verdes neón que suben, una flecha dorada que sale por arriba y un aro de luz celeste, todo sobre un fondo azul.
  - `icono.svg`: el original.
  - `icono-192.png` y `icono-512.png`.
  - `icono-mascara-512.png`: para Android, con el dibujo al 80 %.
  - `apple-touch-icon.png` (iPhone) y `favicon-32.png`.
  - `logo-completo.png`: el ícono con las letras "BASEBALL ANALYTICS · PELOTA · DATOS · EN VIVO".
- **`manifest.webmanifest`:** nombre "Baseball Analytics", nombre corto "Baseball A.", pantalla completa (standalone), en vertical, colores `#0a1650` / `#0b1f8a`, y abre en `/?app=1`.
- **Botón "Descargar la app"** en el menú:
  - En Android / Chrome sale la ventanita para instalar (`beforeinstallprompt`).
  - Si no sale, o en iPhone, muestra los pasos: Compartir → "Agregar a inicio", o ⋮ → "Instalar app".
  - Si ya está instalada, lo dice.
- `sw.js` guarda el manifiesto y los íconos. `vercel.json` les da su tipo y su caché.

## Menú ☰: torneos y colores
- El ☰ abre un menú lateral. En este orden: **Torneos** (arriba, lo principal), **Colores del diseño** y **App → "Descargar la app"**. "Volver a LotoAnalytics" se quitó por pedido del dueño (23-oct).
- **Torneos** (como en la app Pelota Invernal): **Pelota Invernal** (LIDOM), **Serie del Caribe** y **Clásico Mundial**. Al escoger uno cambian el lema y las 4 pestañas. Se recuerda en el teléfono (`localStorage`, clave `ba-torneo`).
  - Los datos están en el objeto `TORNEOS` del script. Cada torneo tiene: equipos, juegoHoy, anteriores, posiciones, calendario, resultados.
  - Si `posiciones` es null, la tabla se calcula sola con los resultados. Si `juegoHoy` es null, sale "No hay juego en vivo". Si `anteriores` es null, la Portada muestra los 3 últimos resultados. Calendario vacío = "No hay juegos programados".
  - Serie del Caribe y Clásico usan **banderas de los países** dibujadas con colores (objeto `BANDERAS`) y el código del país (MEX, DOM, PUR, VEN, EEUU…), como en el modelo. MXV = segundo equipo de México (en el modelo se llama así).
  - Datos de ejemplo copiados de las capturas del dueño (Serie del Caribe feb-2026, Clásico mar-2026 + 28 sept CA–ISR).
- **Colores**: **Tigres** (azul), **Gigantes** (vino), **Toros** (naranja), **Estrellas** (verde, el que sale por defecto), **Águilas** (amarillo), **Leones** (rojo). El tema "Original" se **quitó** por pedido del dueño. Siempre con el mismo estilo futurista y fondo oscuro; solo cambia el color de acento.
- Técnica: los colores están en variables CSS (`--ac`, `--ac2`, `--verde2`, `--claro`, `--sobre`) y la lista `TEMAS` en el script. El tema escogido se recuerda en el teléfono (`localStorage`, clave `ba-tema`).
- El rojo de EN VIVO/outs y el amarillo de PP/strikes/aviso no cambian con el tema.

## Reglas que no se cambian sin hablarlo
- **Escudos:** solo nuestros propios dibujos de animales (o banderas para países), nunca copiar los logos oficiales de los equipos (son marcas registradas).
- **Google Play y AdSense:** solo información y estadística. Nada de enlaces a bancas ni casas de apuestas.
- Si se hace un robot para traer los datos: que use **su propia tabla** y no mande avisos duplicados. GitHub permite una sola cuenta gratis por persona.

## Pendiente
- Todo son datos de ejemplo (copiados de las capturas del 22-oct). Falta escoger una fuente real de datos de LIDOM y el robot que los traiga; comparar opciones con precios antes de decidir.
- Falta (si el dueño quiere) poner un enlace desde el menú ☰ de LotoAnalytics a la página publicada.

## Base de datos (Supabase) — creada 23-oct-2026
- Proyecto Supabase **`baseball-analytics`**, ref **`fehvnwwzdygjsxsjzxlu`**, región us-east-1, misma cuenta/organización que LotoAnalytics pero base aparte.
- Tablas: `torneos` (3 cargados), `equipos` (24 cargados: 6 LIDOM con su animal y colores + países con bandera), `juegos` (calendario + resultados, vacía), `juego_en_vivo` (vacía), `posiciones` (vacía), vista `posiciones_calculadas`, `avisos_enviados` (privada, solo para el robot).
- Seguridad: lectura pública (clave `anon`), escritura solo con `service_role` (el robot). Probado: desde afuera no se puede escribir.
- El robot evita juegos duplicados con `fuente_id` (único por torneo) y avisos repetidos con `avisos_enviados` (único por juego y tipo).
- El SQL está en el repo, carpeta `supabase/migrations/`.
- La página **todavía no lee** de la base: sigue con datos de ejemplo dentro del HTML. Falta conectarla y hacer el robot.

## Robot de datos — análisis (23-oct-2026)
- El documento del análisis se llama **`ANALISIS-PN.md`** (PN = pelotainvernal.com). Antes se llamaba ANALISIS-pelotainvernal.md; el dueño pidió cambiarle el nombre.
- Ver **`ANALISIS-PN.md`** (en el repo y en el proyecto): cómo está hecho pelotainvernal.com, qué significa cada columna (G, P, DIF, PCT, casa/ruta, cara a cara, C/H/E, B/S/O…), fórmulas, y la fuente encontrada: **API de estadísticas de MLB** (LIDOM = `leagueId 131`, `sportId 17`) con juego en vivo (entrada, conteo, bases, bateador, lanzador).
- Documento de referencia: **`robot/probar-conectate.js`** + `.github/workflows/probar-conectate.yml` del repo `lotoanalytics/lotoanalytics` (solo lectura). Es una prueba que abre una página en Chrome sin pantalla (Puppeteer) desde GitHub Actions y anota los datos ocultos (JSON) que la página pide. No escribe en la base.
- Copia adaptada en este repo: **`robot/explorar-pelotainvernal.js`** + **`.github/workflows/explorar-pelotainvernal.yml`** ("Explorar pelotainvernal (solo lectura)"). Abre portada, calendario, resultados y posiciones de pelotainvernal.com y anota todo lo que pide por internet (JSON, XHR/fetch y WebSocket). Se corre a mano desde Actions; el resultado queda como archivo descargable `prueba-pelotainvernal`. No usa el plugin "stealth" (no hace falta para explorar).
- **Robot de béisbol** (23-oct-2026): `robot/robot-beisbol.js` + `.github/workflows/robot-beisbol.yml`. Es la copia del robot "todo en uno" de LotoAnalytics (`robot/backend-todo-en-uno (1).js`, solo leído) enfocada en pelotainvernal.com. Detalles en `ANALISIS-PN.md`, sección 6. Los secretos `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están en el repo, puestos el 23-oct, y la primera corrida real guardó 75 juegos con 0 errores. **Se activa SIEMPRE a mano** (cron-job.org → workflow_dispatch; sin `schedule`). **Se guía por los horarios guardados** en la base para decidir qué buscar (ver `ANALISIS-PN.md`, sección 6b). Falta programar el cron.
- El dueño decidió (23-oct-2026) usar pelotainvernal.com como fuente: considera que los resultados son datos públicos. No volver a discutirlo.
- Los robots de LotoAnalytics se disparan con `workflow_dispatch` desde cron-job.org (no con `schedule`, porque GitHub atrasa los cron). Seguir la misma idea para el robot de béisbol.

## Cuentas y límites gratis (revisado 23-oct-2026)
- **Supabase (plan gratis):** máximo **2 proyectos activos** por persona. Hoy hay 1 (`lotoanalytics's Project`, ref `vrqzpuikwsopjpehusgp`). Desde el 23-oct ya hay 2: el de LotoAnalytics y **`baseball-analytics`** → se usaron los 2 proyectos gratis. Cada proyecto tiene sus **500 MB** de base de datos, pero el tráfico de salida (5 GB/mes), usuarios y almacenamiento se **comparten** entre los dos. Los proyectos gratis se pausan si pasan una semana sin uso.
- **Vercel (Hobby):** proyectos `lotoanalytics` y `baseball-analytics` en la misma cuenta. Los límites del mes (100 GB de transferencia, 1 millón de peticiones y de funciones) son de la cuenta, no de cada proyecto. Hobby es solo para uso personal **no comercial**: si se pone publicidad (AdSense) se debería pasar a Pro.
- **GitHub (gratis):** repositorios públicos y privados **ilimitados**.

## Registro de decisiones
- 11-oct-2026: nace la idea "Tuanalytics" multideporte con datos de ejemplo; se retira del repo hasta nuevo aviso.
- 22-oct-2026: se empieza a trabajar en este proyecto.
- 22-oct-2026: el dueño decide: nombre **Baseball Analytics**, solo **béisbol dominicano (LIDOM)**, quitar todo lo de otros deportes, y usar los paneles de la app Pelota Invernal (Portada, Posiciones, Calendario, Resultados) con nuestro diseño. Hecho en `claude/baseball-analytics.html`.
- 22-oct-2026: el ☰ ahora abre un menú para escoger los colores del diseño según el equipo (Águilas amarillo, Tigres azul, etc.), manteniendo el estilo futurista. "Volver a LotoAnalytics" pasó a estar dentro del menú.
- 22-oct-2026: se agregan los **torneos** al menú (Pelota Invernal, Serie del Caribe, Clásico Mundial), arriba como parte principal. Se quita el color "Original"; por defecto sale Estrellas (verde).
- 22-oct-2026: el dueño pide que se vea "más viva" como LotoAnalytics: fondo azul/morado con brillos y pelotas flotando, tarjetas con borde brillante, números en bolas brillantes y animales propios para cada equipo LIDOM.
- 22-oct-2026: los animales se rehacen en estilo clásico/profesional de emblema (de perfil, angulares) porque los primeros parecían caricatura.
- 22-oct-2026: se sube el proyecto al repo de GitHub `lotoanalytics/basebalanalytics` (primer commit `1cf7639`).
- 23-oct-2026: publicada en Vercel como proyecto aparte `baseball-analytics` → https://baseball-analytics-lilac.vercel.app (se publica sola con cada push a `main`).
- 23-oct-2026: creada la base aparte en Supabase (`baseball-analytics`, ref `fehvnwwzdygjsxsjzxlu`) con sus tablas, torneos y equipos.
- 23-oct-2026: prueba con la imagen propia del dueño como escudo de Águilas (`escudos/aguilas.webp`).
- 23-oct-2026: Tigres, Leones y Águilas con las imágenes neón del dueño; se borró la prueba anterior de Águilas.
- 23-oct-2026: el fondo pasa a ser solo la imagen del estadio (sin personas, sin pelotas ni estrellas).
- 23-oct-2026: caché con service worker (`sw.js`): todo desde caché, el en vivo siempre de internet primero.
- 23-oct-2026: fondo quieto y desplazamiento fluido (sin brincos, sin desenfoques).
- 23-oct-2026: tarjetas de cristal del color del tema y diamante 3D con peloteritos del color del equipo al bate.
- 23-oct-2026: análisis de pelotainvernal.com y de la API de MLB para el robot (`ANALISIS-PN.md`).
- 23-oct-2026: se revisó `probar-conectate.js` del repo de LotoAnalytics (solo lectura) y se hizo la copia `robot/explorar-pelotainvernal.js` en este repo. Regla: en otros repos solo se revisa; solo se cambia `basebalanalytics`.
- 23-oct-2026: el dueño pide **cero inglés**: todo en español siempre, también los mensajes mientras se trabaja.
- 23-oct-2026: hecho el robot de béisbol (copia del todo en uno de LotoAnalytics), probado en modo prueba sin errores. Columnas nuevas en Supabase: `juegos` (entrada_texto, carreras_mitad_*, lanzador_*, manual), `juego_en_vivo.base_codigo` y la tabla `corridas_robot`.
- 23-oct-2026: el robot se guía por los horarios guardados (tablas nuevas `revisiones_robot` y `corridas_robot.plan`), tiene todas las protecciones del robot de LotoAnalytics y se activa siempre a mano. El análisis pasa a llamarse `ANALISIS-PN.md`.
- 23-oct-2026: puestas las imágenes de Gigantes, Toros y Estrellas: ya los 6 equipos tienen su imagen neón.
- 23-oct-2026: las bolas del marcador van con el color de cada equipo; el que gana lleva aro blanco y brillo.
- 23-oct-2026: mini estadio al tocar el juego en vivo (tablero, campo, defensa, corredores, bateador y lanzador con su nombre).
- 23-oct-2026: la página lee los datos REALES de la base (sin datos de ejemplo), se vuelve una app descargable con logo propio, y el menú tiene "Descargar la app" en vez de "Volver a LotoAnalytics".
