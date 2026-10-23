# Base de datos (Supabase)

Proyecto Supabase: **baseball-analytics** (ref `fehvnwwzdygjsxsjzxlu`, región us-east-1),
aparte del proyecto de LotoAnalytics, en la misma cuenta.

| Tabla | Para qué |
|---|---|
| `torneos` | Pelota Invernal, Serie del Caribe, Clásico Mundial |
| `equipos` | Equipos de cada torneo (animal o bandera y colores) |
| `juegos` | Calendario y resultados (estado: programado, en_vivo, final, pospuesto, suspendido) |
| `juego_en_vivo` | Bases, conteo, bateador, lanzador, última jugada del juego en vivo |
| `posiciones` | Tabla de posiciones oficial |
| `posiciones_calculadas` (vista) | G y P calculados solos con los juegos finales |
| `avisos_enviados` | Uso interno del robot para no mandar avisos repetidos (privada) |

Seguridad: cualquiera puede **leer** (clave pública `anon`); solo el robot con la clave `service_role` puede **escribir**.
`avisos_enviados` no se puede leer desde afuera.
Para no duplicar juegos, el robot usa `fuente_id` (único por torneo).
