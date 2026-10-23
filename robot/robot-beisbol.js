// =====================================================================
// ROBOT DE BÉISBOL — Baseball Analytics
// =====================================================================
// Copia adaptada del robot "todo en uno" de LotoAnalytics
// (lotoanalytics/lotoanalytics: robot/backend-todo-en-uno.js), enfocada en
// pelotainvernal.com. Las ideas que se copiaron de ese robot:
//
//  1. NO se le pide nada directo al servidor de la fuente: se abre su PÁGINA
//     en un Chrome sin pantalla y se toman los datos que la página misma
//     recibe. Luego se COMPRUEBA que coincidan con lo que se ve en pantalla.
//     (En LotoAnalytics se descubrió que Conéctate —la misma empresa que hace
//     pelotainvernal— da números falsos a quien le pide directo.)
//  2. Imágenes, letras y estilos se bloquean: no hacen falta y así carga rápido.
//  3. Límites de tiempo por página y un VIGILANTE de 3 minutos: si algo se
//     pega, la corrida se termina sola sin gastar minutos de GitHub.
//  4. Nunca se pisa un juego FINAL con una lectura peor, y nunca se toca un
//     juego puesto a mano (columna "manual").
//  5. Fechas y horas siempre en hora de República Dominicana.
//
// Qué hace en cada corrida:
//  - Para cada torneo activo (tabla "torneos", activo = true):
//      * Calendario  -> /liga/<liga>/calendario  (próximos juegos y el de hoy)
//      * Resultados  -> /liga/<liga>/resultados  (juegos terminados)
//      * Posiciones  -> /liga/<liga>/tabla-de-posiciones (la tabla oficial)
//  - Guarda en Supabase: juegos, juego_en_vivo, posiciones, corridas_robot.
//  - Los datos de apuestas que trae la fuente (moneyline, handicap,
//    over_under) y los logos oficiales NO se guardan nunca.
//
// Modo prueba: con SOLO_LEER=1 lee todo y muestra lo que guardaría, pero no
// escribe nada en la base (sirve para probar sin las claves de Supabase).
// =====================================================================

const puppeteer = require('puppeteer');

const SOLO_LEER = process.env.SOLO_LEER === '1' || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (!SOLO_LEER) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const BASE = 'https://pelotainvernal.com';
// Nuestro torneo -> la dirección de ese torneo en pelotainvernal
const LIGAS = {
  invernal: 'dominicana-lidom',
  caribe: 'serie-del-caribe',
  clasico: 'clasico-mundial-beisbol',
};
const LIMITE_PAGINA_MS = 30 * 1000;
const VIGILANTE_MS = 3 * 60 * 1000;

// Estado de la fuente -> nuestro estado.  1 = programado, 6 = final, 7 = pospuesto.
// Cualquier otro número = el juego está en curso (falta confirmar los códigos exactos).
function estadoDesdeFuente(status) {
  if (status === 1) return 'programado';
  if (status === 6) return 'final';
  if (status === 7) return 'pospuesto';
  return 'en_vivo';
}
// Orden para no "retroceder": un juego final no vuelve a en vivo ni a programado.
const ORDEN_ESTADO = { programado: 0, pospuesto: 1, en_vivo: 2, suspendido: 3, final: 4 };

const texto = (v) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const vacioANull = (v) => (texto(v) === '' ? null : texto(v));

// ---------------------------------------------------------------------
// Abrir una página y quedarse con los datos que la página misma recibe
// ---------------------------------------------------------------------
async function abrirPagina(browser, ruta, esperarDatos) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    try {
      const tipo = req.resourceType();
      if (tipo === 'image' || tipo === 'stylesheet' || tipo === 'font' || tipo === 'media') req.abort();
      else req.continue();
    } catch (e) { /* la página ya se cerró: se ignora */ }
  });
  const url = BASE + ruta;
  // La página pide sus juegos con un POST a su misma dirección (cuerpo "page=1")
  const datos = esperarDatos
    ? page.waitForResponse((r) => r.url() === url && r.request().method() === 'POST' && r.status() === 200, { timeout: LIMITE_PAGINA_MS })
        .then((r) => r.json()).catch(() => null)
    : Promise.resolve(null);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: LIMITE_PAGINA_MS });
  const json = await datos;
  await new Promise((r) => setTimeout(r, 2500)); // que la página termine de pintar
  const enPantalla = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
  return { page, json, enPantalla };
}

// ---------------------------------------------------------------------
// Comprobación: lo recibido tiene que coincidir con lo que se ve en pantalla
// ---------------------------------------------------------------------
// En "Resultados" la pantalla muestra filas así:  "22-10-2026  Toros  6 - 7  Gigantes"
function coincideConPantalla(juegos, enPantalla) {
  const pantalla = texto(enPantalla);
  const muestra = juegos.slice(0, 3);
  if (!muestra.length) return true; // lista vacía: no hay nada que comprobar
  return muestra.every((j) => {
    const marcador = `${j.awayTeam.runs} - ${j.homeTeam.runs}`;
    return pantalla.includes(texto(j.awayTeam.name)) && pantalla.includes(texto(j.homeTeam.name)) &&
           (estadoDesdeFuente(j.status) === 'programado' || pantalla.includes(marcador));
  });
}

// ---------------------------------------------------------------------
// Convertir un juego de la fuente a nuestra tabla "juegos"
// ---------------------------------------------------------------------
function filaJuego(torneoId, j) {
  const [fecha, horaCompleta] = String(j.date || '').split(' ');
  const estado = estadoDesdeFuente(j.status);
  const fila = {
    torneo_id: torneoId,
    fuente: 'pelotainvernal',
    fuente_id: String(j.id),
    fecha,
    hora: horaCompleta ? horaCompleta.slice(0, 5) : null,
    visitante: texto(j.awayTeam && j.awayTeam.abbreviation),
    casa: texto(j.homeTeam && j.homeTeam.abbreviation),
    estado,
    entrada_texto: estado === 'programado' ? null : vacioANull(j.roundText),
    motivo: vacioANull(j.comment),
    lanzador_visitante: vacioANull(j.awayTeam && j.awayTeam.pitcher),
    lanzador_casa: vacioANull(j.homeTeam && j.homeTeam.pitcher),
  };
  if (estado !== 'programado') {
    Object.assign(fila, {
      carreras_visitante: j.awayTeam.runs, carreras_casa: j.homeTeam.runs,
      hits_visitante: j.awayTeam.hits, hits_casa: j.homeTeam.hits,
      errores_visitante: j.awayTeam.errors, errores_casa: j.homeTeam.errors,
      carreras_mitad_visitante: j.awayTeam.runs_half, carreras_mitad_casa: j.homeTeam.runs_half,
    });
  }
  if (estado === 'final') {
    Object.assign(fila, {
      ganador: vacioANull(j.winningPitcher),
      perdedor: vacioANull(j.losingPitcher),
      salvamento: vacioANull(j.savingPitcher),
    });
  }
  return fila;
}

function filaEnVivo(j) {
  const bateaCasa = j.battingTeam === 'homeTeam';
  return {
    entrada: vacioANull(j.roundText),
    al_bate: bateaCasa ? 'casa' : 'visitante',
    bolas: Math.min(3, Number(j.balls) || 0),
    strikes: Math.min(2, Number(j.strikes) || 0),
    outs: Math.min(3, Number(j.outs) || 0),
    base_codigo: j.base == null ? null : Number(j.base),
    // primera / segunda / tercera: se llenan cuando se descifre "base"
    bateador: vacioANull(j.atBat),
    lanzador: vacioANull(bateaCasa ? j.awayTeam.pitcher : j.homeTeam.pitcher), // lanza el equipo que NO batea
    ultima_jugada: vacioANull(j.lastPlayByPlay),
    nota: vacioANull(j.gameAlert),
  };
}

// ---------------------------------------------------------------------
// Guardar en Supabase (con las protecciones)
// ---------------------------------------------------------------------
async function asegurarEquipos(torneoId, juegos) {
  const vistos = new Map();
  for (const j of juegos) for (const e of [j.awayTeam, j.homeTeam]) {
    if (e && e.abbreviation) vistos.set(texto(e.abbreviation), texto(e.name));
  }
  if (SOLO_LEER || !vistos.size) return;
  const { data } = await supabase.from('equipos').select('codigo').eq('torneo_id', torneoId);
  const yaEstan = new Set((data || []).map((e) => e.codigo));
  const nuevos = [...vistos].filter(([codigo]) => !yaEstan.has(codigo))
    .map(([codigo, nombre]) => ({ torneo_id: torneoId, codigo, nombre, bandera: torneoId === 'invernal' ? null : codigo }));
  if (nuevos.length) {
    const { error } = await supabase.from('equipos').insert(nuevos);
    if (error) throw error;
    console.log(`[robot] Equipos nuevos en ${torneoId}: ${nuevos.map((e) => e.codigo).join(', ')}`);
  }
}

async function guardarJuego(torneoId, j, cuenta) {
  const fila = filaJuego(torneoId, j);
  if (!fila.fecha || !fila.visitante || !fila.casa) return;
  if (SOLO_LEER) {
    console.log(`  (prueba) ${fila.fecha} ${fila.hora || ''} ${fila.visitante} ${fila.carreras_visitante ?? ''} - ${fila.carreras_casa ?? ''} ${fila.casa} · ${fila.estado}${fila.entrada_texto ? ' · ' + fila.entrada_texto : ''}`);
    cuenta.guardados++;
    return;
  }
  const { data: anterior } = await supabase.from('juegos').select('id, estado, manual')
    .eq('torneo_id', torneoId).eq('fuente_id', fila.fuente_id).maybeSingle();
  if (anterior && anterior.manual) return; // puesto a mano: no se toca
  if (anterior && ORDEN_ESTADO[anterior.estado] > ORDEN_ESTADO[fila.estado] && fila.estado !== 'pospuesto') {
    console.warn(`[robot] Se descarta ${fila.visitante}-${fila.casa} ${fila.fecha}: ya estaba "${anterior.estado}" y ahora dice "${fila.estado}".`);
    return;
  }
  const { data: guardado, error } = await supabase.from('juegos')
    .upsert(fila, { onConflict: 'torneo_id,fuente_id' }).select('id').single();
  if (error) throw error;
  cuenta.guardados++;
  if (fila.estado === 'en_vivo') {
    const { error: e2 } = await supabase.from('juego_en_vivo').upsert({ juego_id: guardado.id, ...filaEnVivo(j) }, { onConflict: 'juego_id' });
    if (e2) throw e2;
  } else if (anterior && anterior.estado === 'en_vivo') {
    await supabase.from('juego_en_vivo').delete().eq('juego_id', guardado.id); // ya no está en vivo
  }
}

// Tabla de posiciones: se lee de la tabla que la página trae escrita
async function leerPosiciones(page) {
  return page.evaluate(() => {
    const tabla = [...document.querySelectorAll('table')].find((t) => /PCT/.test(t.innerText));
    if (!tabla) return [];
    return [...tabla.querySelectorAll('tbody tr')].map((tr) => {
      const c = [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
      return { codigo: c[1], ganados: parseInt(c[2], 10), perdidos: parseInt(c[3], 10) };
    }).filter((f) => f.codigo && !isNaN(f.ganados) && !isNaN(f.perdidos));
  }).catch(() => []);
}

async function guardarPosiciones(torneoId, filas) {
  if (!filas.length) return;
  if (SOLO_LEER) {
    console.log('  (prueba) posiciones: ' + filas.map((f) => `${f.codigo} ${f.ganados}-${f.perdidos}`).join(' · '));
    return;
  }
  const { data } = await supabase.from('equipos').select('codigo').eq('torneo_id', torneoId);
  const conocidos = new Set((data || []).map((e) => e.codigo));
  const validas = filas.filter((f) => conocidos.has(f.codigo))
    .map((f) => ({ torneo_id: torneoId, equipo: f.codigo, ganados: f.ganados, perdidos: f.perdidos }));
  if (validas.length) {
    const { error } = await supabase.from('posiciones').upsert(validas, { onConflict: 'torneo_id,equipo' });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------
// Corrida completa
// ---------------------------------------------------------------------
async function torneosActivos() {
  if (SOLO_LEER) return ['invernal'];
  const { data, error } = await supabase.from('torneos').select('id').eq('activo', true).order('orden');
  if (error) throw error;
  return (data || []).map((t) => t.id).filter((id) => LIGAS[id]);
}

async function correr() {
  const cuenta = { guardados: 0, errores: 0, notas: [] };
  let idCorrida = null;
  if (!SOLO_LEER) {
    const { data } = await supabase.from('corridas_robot').insert({}).select('id').single();
    idCorrida = data && data.id;
  } else {
    console.log('[robot] MODO PRUEBA: solo se lee, no se guarda nada en la base.');
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const torneoId of await torneosActivos()) {
      const liga = LIGAS[torneoId];
      for (const seccion of ['calendario', 'resultados']) {
        let page = null;
        try {
          const r = await abrirPagina(browser, `/liga/${liga}/${seccion}`, true);
          page = r.page;
          if (!Array.isArray(r.json)) throw new Error('la página no recibió la lista de juegos');
          if (!coincideConPantalla(r.json, r.enPantalla)) throw new Error('lo recibido NO coincide con lo que muestra la página; no se usa');
          console.log(`[robot] ${torneoId} · ${seccion}: ${r.json.length} juego(s) leídos y comprobados.`);
          await asegurarEquipos(torneoId, r.json);
          for (const j of r.json) {
            try { await guardarJuego(torneoId, j, cuenta); }
            catch (e) { cuenta.errores++; cuenta.notas.push(`${torneoId} juego ${j.id}: ${e.message}`); console.error('[robot] Error guardando juego ' + j.id + ': ' + e.message); }
          }
        } catch (e) {
          cuenta.errores++; cuenta.notas.push(`${torneoId} ${seccion}: ${e.message}`);
          console.error(`[robot] ${torneoId} · ${seccion}: ${e.message}`);
        } finally {
          if (page) await page.close().catch(() => {});
        }
      }
      // Posiciones
      let page = null;
      try {
        const r = await abrirPagina(browser, `/liga/${liga}/tabla-de-posiciones`, false);
        page = r.page;
        const filas = await leerPosiciones(page);
        console.log(`[robot] ${torneoId} · posiciones: ${filas.length} equipo(s).`);
        await guardarPosiciones(torneoId, filas);
      } catch (e) {
        cuenta.errores++; cuenta.notas.push(`${torneoId} posiciones: ${e.message}`);
        console.error(`[robot] ${torneoId} · posiciones: ${e.message}`);
      } finally {
        if (page) await page.close().catch(() => {});
      }
    }
  } finally {
    // Cerrar sin quedarse esperando: si no cierra en 5 s, se mata el proceso
    await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
    try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {}
  }

  if (idCorrida) {
    await supabase.from('corridas_robot').update({
      fin: new Date().toISOString(), guardados: cuenta.guardados, errores: cuenta.errores,
      detalle: cuenta.notas.join('\n').slice(0, 4000) || null,
    }).eq('id', idCorrida);
  }
  console.log(`[robot] Terminado. Juegos guardados: ${cuenta.guardados} · Errores: ${cuenta.errores}`);
}

// VIGILANTE: si la corrida se pega más de 3 minutos, se termina sola.
setTimeout(() => {
  console.error('[robot] La corrida pasó de 3 minutos: se termina. Lo ya guardado queda guardado.');
  process.exit(0);
}, VIGILANTE_MS).unref();

correr().then(() => process.exit(0)).catch((e) => {
  console.error('[robot] Error grave:', e.message);
  process.exit(1);
});
