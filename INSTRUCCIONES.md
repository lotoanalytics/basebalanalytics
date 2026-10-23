# Baseball Analytics (antes "Tuanalytics") — instrucciones para cada chat

**Lee este documento al empezar cualquier chat de este proyecto.** Aquí se anota todo lo que el dueño decide. Cada cambio nuevo se agrega en "Registro de decisiones" con la fecha.

## Cómo trabajar con el dueño
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
- **Estilo vivo, como LotoAnalytics** (desde 22-oct): fondo azul intenso con morado, estrellitas que brillan y pelotas/burbujas de luz que flotan en los bordes (sin imagen, todo con CSS). Tarjetas con borde brillante del color del tema. Títulos y nombre con letra **Audiowide** (la de LotoAnalytics); el resto Exo 2.
- **Números como bolas brillantes** (como los números de la lotería): carreras en el marcador y en Resultados. El que gana = bola del color del tema; el que pierde = bola azul.
- Cabecera: botón ☰ (abre el menú), logo de pelota con barras + "Baseball Analytics". Lema: "Pelota invernal · LIDOM".
- Aviso amarillo: "Vista de prueba · los juegos y números son de ejemplo".
- 4 pestañas arriba (como la app Pelota Invernal que el dueño mostró de modelo):
  1. **Portada**: "Juego de hoy" EN VIVO (entrada, marcador C/H/E, quién está al bate, bases en diamante, bolas/strikes/outs, al bate, lanzador, última jugada, nota) y "Resultados anteriores" (Final o Pospuesto, marcador C/H/E, ganador, perdedor, salvamento, motivo).
  2. **Posiciones**: Equipo, G, P, DIF, PCT. DIF y PCT se calculan solos; el líder resaltado.
  3. **Calendario**: agrupado por fecha, visitante a la izquierda, casa a la derecha, hora.
  4. **Resultados**: agrupado por fecha, visitante – carreras – casa; el que gana resaltado con el color del tema; PP = pospuesto.
- Equipos LIDOM con **animales propios** dibujados por nosotros (objeto `ANIMALES`, en bola brillante con el color del equipo): Tigres = tigre rugiendo (azul), Gigantes = caballo (vino), Toros = toro con argolla (naranja), Estrellas = elefante con estrella (verde), Águilas = águila (amarillo), Leones = león rugiendo (rojo). Estilo **clásico de emblema deportivo**: cabezas de perfil mirando a la derecha, blancas, con cortes angulares y sombras en facetas (dibujo en cuadro de 64×64). El dueño rechazó el estilo caricatura/gatico: no volver a caras de frente redonditas. Son dibujos originales, **no** los logos oficiales.
- Los datos están en listas al principio del `<script>` (EQUIPOS, JUEGO_HOY, ANTERIORES, POSICIONES, CALENDARIO, RESULTADOS), listos para que un robot los llene.

## Menú ☰: torneos y colores
- El ☰ abre un menú lateral. En este orden: **Torneos** (arriba, lo principal), **Colores del diseño** y "Volver a LotoAnalytics".
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
