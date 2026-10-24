// =====================================================================
// ROBOT DE BÉISBOL — Baseball Analytics
// =====================================================================
// Copia adaptada del robot "todo en uno" de LotoAnalytics
// (lotoanalytics/lotoanalytics: robot/backend-todo-en-uno.js), enfocada en
// la fuente PN (pelotainvernal.com). Ver ANALISIS-PN.md.
//
// SE ACTIVA SIEMPRE A MANO (desde el cron del dueño en cron-job.org, que
// llama a GitHub). No tiene horario propio en GitHub: es el robot el que
// decide, en cada corrida, QUÉ buscar según los HORARIOS que tiene guardados.
//
// CÓMO DECIDE QUÉ BUSCAR (el "plan" de cada corrida):
//  1. Primero mira la base (rápido y gratis, sin abrir el navegador).
//  2. Si un torneo NO tiene horarios guardados, o su calendario se revisó
//     hace más de 12 horas -> busca el CALENDARIO (y las posiciones).
//  3. Si hay un juego que según su horario ya empezó o está por empezar
//     (desde 15 min antes hasta 6 horas después) y no ha terminado
//     -> busca CALENDARIO + RESULTADOS de ese torneo (ahí viene el en vivo
//     y el final).
//  4. Si un juego ya pasó su horario y todavía no aparece como final
//     -> busca RESULTADOS.
//  5. Si un juego se volvió FINAL en esta corrida -> busca POSICIONES.
//  6. Si no le toca nada -> termina en segundos SIN abrir el navegador
//     ("corrida casi gratis", igual que el robot de LotoAnalytics).
//  Si la hora de un juego no es creíble (antes de las 10:00 a. m.; la fuente
//  pone 5:00 a. m. cuando todavía no hay hora), se vigila de 12:00 p. m. a
//  medianoche de ese día.
//
// PROTECCIONES (las mismas ideas del robot de LotoAnalytics):
//  - Se lee desde la PÁGINA de la fuente, no directo de su servidor, y se
//    COMPRUEBA que lo recibido sea igual a lo que se ve en pantalla.
//  - puppeteer-extra + stealth si está instalado; si no carga, se sigue con
//    Puppeteer normal (una mejora nunca puede tumbar lo que ya funciona).
//  - Imágenes, letras, estilos y videos bloqueados (carga más rápido), y
//    cada solicitud de red protegida con try/catch.
//  - Límite por página (30 s), un reintento por página, límite de toda la
//    corrida (2 min 30 s) y VIGILANTE de 3 min que termina la corrida sola.
//  - El navegador se cierra sin esperar: si no cierra en 5 s, se mata.
//  - Un juego FINAL nunca se pisa con una lectura peor; un juego puesto a
//    mano (columna manual = true) nunca se toca.
//  - Cada página se guarda por separado: si una falla, las demás siguen.
//  - Fechas y horas siempre en hora de República Dominicana (UTC-4).
//  - Nunca se guardan los datos de apuestas ni los logos oficiales.
//
// Variables (las pone el workflow):
//  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY -> claves (secretos de GitHub)
//  SOLO_LEER=1 -> modo prueba: lee y muestra, no guarda nada
//  FORZAR=1    -> busca todo sin mirar los horarios (para probar)
// =====================================================================

try { require('dotenv').config({ quiet: true }); } catch (e) { /* dotenv es opcional */ }

let puppeteer = require('puppeteer');
try {
  const puppeteerExtra = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteerExtra.use(StealthPlugin());
  puppeteer = puppeteerExtra;
  console.log('[robot] puppeteer-extra + stealth cargado.');
} catch (err) {
  console.warn('[robot] No se pudo cargar puppeteer-extra/stealth (' + err.message + '): se sigue con Puppeteer normal.');
}

const SOLO_LEER = process.env.SOLO_LEER === '1' || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORZAR = process.env.FORZAR === '1';
let supabase = null;
if (!SOLO_LEER) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const BASE = 'https://pelotainvernal.com';
// Nuestro torneo -> su dirección en la fuente
const LIGAS = { invernal: 'dominicana-lidom', caribe: 'serie-del-caribe', clasico: 'clasico-mundial-beisbol' };

const LIMITE_PAGINA_MS = 30 * 1000;
const LIMITE_CORRIDA_MS = 150 * 1000;
const VIGILANTE_MS = 3 * 60 * 1000;
const REFRESCAR_CALENDARIO_MS = 12 * 60 * 60 * 1000;   // calendario: cada 12 horas como mínimo
const ANTES_DEL_JUEGO_MIN = 15;                        // se empieza a vigilar 15 min antes
const DURACION_JUEGO_MIN = 6 * 60;                     // y hasta 6 horas después de la hora del juego
const HORA_MINIMA_CREIBLE = 10;                        // antes de las 10:00 a. m. = hora por confirmar
let INICIO_CORRIDA = Date.now();   // en el modo en vivo se reinicia en cada vuelta
// MODO EN VIVO (lo usa el robot vigilante): el Chrome se queda abierto y el juego en vivo
// se revisa cada CADA_SEGUNDOS (por defecto 30) hasta VIGILAR_HASTA (hora RD).
const MODO_VIVO = process.env.MODO_VIVO === '1';
const CADA_SEGUNDOS = Math.max(15, Number(process.env.CADA_SEGUNDOS || 30));
const VUELTAS_COMPLETAS = Math.max(1, Math.round(120 / CADA_SEGUNDOS)); // resultados cada ~2 min
const VIGILANTE_VUELTA_MS = 150 * 1000;                                 // una vuelta nunca puede pasar de 2½ min

// ---------------------------------------------------------------------
// Horas de República Dominicana (UTC-4 todo el año, sin horario de verano)
// ---------------------------------------------------------------------
const MS_RD = 4 * 60 * 60 * 1000;
// "2026-10-23" + "19:15" (hora RD) -> momento exacto (milisegundos)
function momentoRD(fecha, hora) {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) + MS_RD;
}
function fechaRD(ms) { return new Date(ms - MS_RD).toISOString().slice(0, 10); }
function horaRDtexto(ms) { return new Date(ms - MS_RD).toISOString().slice(11, 16); }

// Ventana en la que hay que vigilar un juego, según su horario guardado
function ventanaDelJuego(j) {
  const h = parseInt(String(j.hora || '').slice(0, 2), 10);
  if (!j.hora || isNaN(h) || h < HORA_MINIMA_CREIBLE) {
    // Hora por confirmar: se vigila de 12:00 p. m. a medianoche de ese día
    return { desde: momentoRD(j.fecha, '12:00'), hasta: momentoRD(j.fecha, '23:59') };
  }
  const inicio = momentoRD(j.fecha, String(j.hora).slice(0, 5));
  return { desde: inicio - ANTES_DEL_JUEGO_MIN * 60000, hasta: inicio + DURACION_JUEGO_MIN * 60000 };
}

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
function estadoDesdeFuente(status) {
  if (status === 1) return 'programado';
  if (status === 6) return 'final';
  if (status === 7) return 'pospuesto';
  return 'en_vivo'; // cualquier otro código = juego en curso
}
const ORDEN_ESTADO = { programado: 0, pospuesto: 1, en_vivo: 2, suspendido: 3, final: 4 };
const texto = (v) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const vacioANull = (v) => (texto(v) === '' ? null : texto(v));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const quedaTiempo = () => Date.now() - INICIO_CORRIDA < LIMITE_CORRIDA_MS;

// ---------------------------------------------------------------------
// 1) EL PLAN: qué buscar en esta corrida, según los horarios guardados
// ---------------------------------------------------------------------
async function armarPlan() {
  const plan = new Map(); // torneo -> { secciones: Set, motivos: [] }
  const anotar = (t, seccion, motivo) => {
    if (!plan.has(t)) plan.set(t, { secciones: new Set(), motivos: [] });
    plan.get(t).secciones.add(seccion);
    plan.get(t).motivos.push(motivo);
  };

  if (SOLO_LEER) { // sin base: se busca todo de Pelota Invernal
    ['calendario', 'resultados', 'posiciones'].forEach((s) => anotar('invernal', s, 'modo prueba'));
    return plan;
  }

  const { data: torneos, error } = await supabase.from('torneos').select('id').eq('activo', true).order('orden');
  if (error) throw error;
  const ids = (torneos || []).map((t) => t.id).filter((id) => LIGAS[id]);
  if (FORZAR) {
    ids.forEach((t) => ['calendario', 'resultados', 'posiciones'].forEach((s) => anotar(t, s, 'forzado a mano')));
    return plan;
  }

  const ahora = Date.now();
  const { data: revisiones } = await supabase.from('revisiones_robot').select('torneo_id, seccion, ultima');
  const ultima = (t, s) => {
    const r = (revisiones || []).find((x) => x.torneo_id === t && x.seccion === s);
    return r ? new Date(r.ultima).getTime() : 0;
  };
  // Juegos que no han terminado, de ayer a mañana (en hora RD)
  const ayer = fechaRD(ahora - 24 * 3600 * 1000), manana = fechaRD(ahora + 24 * 3600 * 1000);
  const { data: pendientes, error: e2 } = await supabase.from('juegos')
    .select('torneo_id, fecha, hora, visitante, casa, estado')
    .in('estado', ['programado', 'en_vivo'])
    .gte('fecha', ayer).lte('fecha', manana);
  if (e2) throw e2;

  for (const t of ids) {
    // ¿Tiene horarios guardados? ¿Hace cuánto se revisó el calendario?
    const { count } = await supabase.from('juegos').select('id', { count: 'exact', head: true }).eq('torneo_id', t);
    if (!count) {
      anotar(t, 'calendario', 'no tiene horarios guardados');
      anotar(t, 'resultados', 'no tiene horarios guardados');
      anotar(t, 'posiciones', 'no tiene horarios guardados');
    } else if (ahora - ultima(t, 'calendario') > REFRESCAR_CALENDARIO_MS) {
      anotar(t, 'calendario', 'el calendario se revisó hace más de 12 horas');
      anotar(t, 'posiciones', 'revisión diaria');
    }
    for (const j of (pendientes || []).filter((x) => x.torneo_id === t)) {
      const v = ventanaDelJuego(j);
      const nombre = `${j.visitante}-${j.casa} ${j.fecha} ${String(j.hora || '').slice(0, 5)}`;
      if (j.estado === 'en_vivo' || (ahora >= v.desde && ahora <= v.hasta)) {
        anotar(t, 'calendario', `juego en su horario: ${nombre}`);
        anotar(t, 'resultados', `juego en su horario: ${nombre}`);
      } else if (ahora > v.hasta) {
        anotar(t, 'resultados', `ya pasó su horario y no aparece final: ${nombre}`);
      }
    }
  }
  return plan;
}

// ---------------------------------------------------------------------
// 2) LEER UNA PÁGINA (y quedarse con los datos que la página misma recibe)
// ---------------------------------------------------------------------
async function abrirPagina(browser, ruta, esperarDatos) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36');
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try {
        const tipo = req.resourceType();
        if (tipo === 'image' || tipo === 'stylesheet' || tipo === 'font' || tipo === 'media') req.abort();
        else req.continue();
      } catch (e) { /* la página ya se cerró o navegó: se ignora esa solicitud */ }
    });
    const url = BASE + ruta;
    // La página pide su lista de juegos con un POST a su misma dirección (cuerpo "page=1")
    const datos = esperarDatos
      ? page.waitForResponse((r) => r.url() === url && r.request().method() === 'POST' && r.status() === 200, { timeout: LIMITE_PAGINA_MS })
          .then((r) => r.json()).catch(() => null)
      : Promise.resolve(null);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: LIMITE_PAGINA_MS });
    const json = await datos;
    await esperar(2500); // que la página termine de pintar
    const enPantalla = await page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    return { page, json, enPantalla };
  } catch (e) {
    await page.close().catch(() => {});
    throw e;
  }
}

// Un reintento si la primera vez falla (página lenta, red, etc.)
async function abrirConReintento(browser, ruta, esperarDatos) {
  try {
    const r = await abrirPagina(browser, ruta, esperarDatos);
    if (!esperarDatos || Array.isArray(r.json)) return r;
    await r.page.close().catch(() => {});
    throw new Error('la página no recibió la lista de juegos');
  } catch (e) {
    if (!quedaTiempo()) throw e;
    console.warn(`[robot] ${ruta}: ${e.message}. Se intenta otra vez en 3 s...`);
    await esperar(3000);
    return abrirPagina(browser, ruta, esperarDatos);
  }
}

// Comprobación: lo recibido tiene que coincidir con lo que se ve en pantalla
// Los nombres siempre tienen que estar en pantalla. El marcador solo se compara en los juegos
// FINALES: durante un juego en vivo la página lo muestra de otra forma y cambia a cada rato.
function coincideConPantalla(juegos, enPantalla) {
  const pantalla = texto(enPantalla);
  const muestra = juegos.slice(0, 3);
  if (!muestra.length) return true;
  const fallos = muestra.filter((j) => {
    const nombres = pantalla.includes(texto(j.awayTeam.name)) && pantalla.includes(texto(j.homeTeam.name));
    const marcador = estadoDesdeFuente(j.status) !== 'final' || pantalla.includes(`${j.awayTeam.runs} - ${j.homeTeam.runs}`);
    return !(nombres && marcador);
  });
  if (fallos.length) {
    console.warn('[robot] No coincide con la pantalla: ' + fallos.map((j) => `${j.awayTeam.name} ${j.awayTeam.runs}-${j.homeTeam.runs} ${j.homeTeam.name} (status ${j.status})`).join(' | '));
    console.warn('[robot] Lo que se ve: ' + pantalla.slice(0, 500));
  }
  return fallos.length === 0;
}

// ---------------------------------------------------------------------
// 3) CONVERTIR a nuestras tablas
// ---------------------------------------------------------------------
function filaJuego(torneoId, j) {
  const [fecha, horaCompleta] = String(j.date || '').split(' ');
  const estado = estadoDesdeFuente(j.status);
  const fila = {
    torneo_id: torneoId, fuente: 'pelotainvernal', fuente_id: String(j.id),
    fecha, hora: horaCompleta ? horaCompleta.slice(0, 5) : null,
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
    Object.assign(fila, { ganador: vacioANull(j.winningPitcher), perdedor: vacioANull(j.losingPitcher), salvamento: vacioANull(j.savingPitcher) });
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
    // Bases ocupadas según el código (descifrado 23-oct: 1 vacías, 2 1ra, 3 2da, 4 3ra, 5 1ra-2da, 6 1ra-3ra, 7 2da-3ra, 8 llenas)
    ...(() => { const m = { 1: [0,0,0], 2: [1,0,0], 3: [0,1,0], 4: [0,0,1], 5: [1,1,0], 6: [1,0,1], 7: [0,1,1], 8: [1,1,1] }[Number(j.base)] || [0,0,0];
      return { primera: !!m[0], segunda: !!m[1], tercera: !!m[2] }; })(),
    bateador: vacioANull(j.atBat),
    lanzador: vacioANull(bateaCasa ? j.awayTeam.pitcher : j.homeTeam.pitcher), // lanza el que NO batea
    ultima_jugada: vacioANull(j.lastPlayByPlay),
    nota: vacioANull(j.gameAlert),
  };
}

// ---------------------------------------------------------------------
// 4) GUARDAR (con las protecciones)
// ---------------------------------------------------------------------
async function asegurarEquipos(torneoId, juegos) {
  const vistos = new Map();
  for (const j of juegos) for (const e of [j.awayTeam, j.homeTeam]) if (e && e.abbreviation) vistos.set(texto(e.abbreviation), texto(e.name));
  if (SOLO_LEER || !vistos.size) return;
  const { data } = await supabase.from('equipos').select('codigo').eq('torneo_id', torneoId);
  const yaEstan = new Set((data || []).map((e) => e.codigo));
  const nuevos = [...vistos].filter(([c]) => !yaEstan.has(c))
    .map(([codigo, nombre]) => ({ torneo_id: torneoId, codigo, nombre, bandera: torneoId === 'invernal' ? null : codigo }));
  if (nuevos.length) {
    const { error } = await supabase.from('equipos').insert(nuevos);
    if (error) throw error;
    console.log(`[robot] Equipos nuevos en ${torneoId}: ${nuevos.map((e) => e.codigo).join(', ')}`);
  }
}

// Devuelve true si el juego pasó a FINAL en esta corrida
async function guardarJuego(torneoId, j, cuenta) {
  const fila = filaJuego(torneoId, j);
  if (!fila.fecha || !fila.visitante || !fila.casa) return false;
  if (SOLO_LEER) {
    console.log(`  (prueba) ${fila.fecha} ${fila.hora || ''} ${fila.visitante} ${fila.carreras_visitante ?? ''} - ${fila.carreras_casa ?? ''} ${fila.casa} · ${fila.estado}${fila.entrada_texto ? ' · ' + fila.entrada_texto : ''}`);
    cuenta.guardados++;
    return false;
  }
  const { data: anterior } = await supabase.from('juegos').select('id, estado, manual')
    .eq('torneo_id', torneoId).eq('fuente_id', fila.fuente_id).maybeSingle();
  if (anterior && anterior.manual) return false; // puesto a mano: no se toca
  if (anterior && ORDEN_ESTADO[anterior.estado] > ORDEN_ESTADO[fila.estado] && fila.estado !== 'pospuesto') {
    console.warn(`[robot] Se descarta ${fila.visitante}-${fila.casa} ${fila.fecha}: ya estaba "${anterior.estado}" y ahora dice "${fila.estado}".`);
    return false;
  }
  const { data: guardado, error } = await supabase.from('juegos').upsert(fila, { onConflict: 'torneo_id,fuente_id' }).select('id').single();
  if (error) throw error;
  cuenta.guardados++;
  if (fila.estado === 'en_vivo') {
    console.log(`[robot] EN VIVO: ${fila.visitante} ${fila.carreras_visitante}-${fila.carreras_casa} ${fila.casa} · ${j.roundText} · status ${j.status} · part ${j.part} · base ${j.base} · B${j.balls} S${j.strikes} O${j.outs} · al bate: ${j.atBat || '—'}`);
    const { error: e2 } = await supabase.from('juego_en_vivo').upsert({ juego_id: guardado.id, ...filaEnVivo(j) }, { onConflict: 'juego_id' });
    if (e2) throw e2;
  } else if (anterior && anterior.estado === 'en_vivo') {
    await supabase.from('juego_en_vivo').delete().eq('juego_id', guardado.id); // ya no está en vivo
  }
  const pasoAFinal = fila.estado === 'final' && (!anterior || anterior.estado !== 'final');
  if (pasoAFinal) console.log(`[robot] FINAL: ${fila.visitante} ${fila.carreras_visitante} - ${fila.carreras_casa} ${fila.casa} (${fila.fecha})`);
  return pasoAFinal;
}

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
  if (SOLO_LEER) { console.log('  (prueba) posiciones: ' + filas.map((f) => `${f.codigo} ${f.ganados}-${f.perdidos}`).join(' · ')); return; }
  const { data } = await supabase.from('equipos').select('codigo').eq('torneo_id', torneoId);
  const conocidos = new Set((data || []).map((e) => e.codigo));
  const validas = filas.filter((f) => conocidos.has(f.codigo)).map((f) => ({ torneo_id: torneoId, equipo: f.codigo, ganados: f.ganados, perdidos: f.perdidos }));
  if (validas.length) {
    const { error } = await supabase.from('posiciones').upsert(validas, { onConflict: 'torneo_id,equipo' });
    if (error) throw error;
  }
}

async function marcarRevision(torneoId, seccion) {
  if (SOLO_LEER) return;
  await supabase.from('revisiones_robot').upsert({ torneo_id: torneoId, seccion, ultima: new Date().toISOString() }, { onConflict: 'torneo_id,seccion' });
}

// ---------------------------------------------------------------------
// 5) LA CORRIDA
// ---------------------------------------------------------------------
async function correr(opciones = {}) {
  const { browserCompartido = null, rapida = false } = opciones;
  INICIO_CORRIDA = Date.now();
  const cuenta = { guardados: 0, errores: 0, notas: [] };
  const vistosHoy = new Set();   // juegos de hoy que vinieron en esta vuelta
  console.log(`[robot] Hora RD: ${fechaRD(Date.now())} ${horaRDtexto(Date.now())}${SOLO_LEER ? ' · MODO PRUEBA (no se guarda nada)' : ''}${FORZAR ? ' · FORZADO' : ''}${rapida ? ' · vuelta rápida (solo el en vivo)' : ''}`);

  const plan = await armarPlan();
  // Vuelta rápida del modo en vivo: solo el calendario (ahí viene el juego en vivo).
  // Resultados y posiciones se buscan en las vueltas completas (cada ~2 min) o si algo terminó.
  if (rapida) for (const [t, p] of [...plan]) {
    ['resultados', 'posiciones'].forEach((x) => p.secciones.delete(x));
    if (!p.secciones.size) plan.delete(t);
  }
  const textoPlan = [...plan].map(([t, p]) => `${t}: ${[...p.secciones].join(', ')} (${[...new Set(p.motivos)].join('; ')})`).join(' | ');
  let idCorrida = null;
  if (!SOLO_LEER && !rapida) {   // las vueltas rápidas no se anotan una por una (serían cientos)
    const { data } = await supabase.from('corridas_robot').insert({ plan: textoPlan || 'nada que buscar' }).select('id').single();
    idCorrida = data && data.id;
  }

  if (!plan.size) {
    console.log('[robot] Nada que buscar ahora según los horarios: no se abre el navegador. Corrida casi gratis.');
    if (idCorrida) await supabase.from('corridas_robot').update({ fin: new Date().toISOString() }).eq('id', idCorrida);
    return { nada: true };
  }
  console.log('[robot] Plan: ' + textoPlan);

  const browser = browserCompartido || await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let huboFinalEnAlguno = false;
  try {
    for (const [torneoId, { secciones }] of plan) {
      const liga = LIGAS[torneoId];
      let huboFinal = false;
      for (const seccion of ['calendario', 'resultados']) {
        if (!secciones.has(seccion)) continue;
        if (!quedaTiempo()) { cuenta.notas.push(`${torneoId} ${seccion}: sin tiempo, queda para la próxima corrida`); continue; }
        let page = null;
        try {
          const r = await abrirConReintento(browser, `/liga/${liga}/${seccion}`, true);
          page = r.page;
          if (!coincideConPantalla(r.json, r.enPantalla)) throw new Error('lo recibido NO coincide con lo que muestra la página; no se usa');
          console.log(`[robot] ${torneoId} · ${seccion}: ${r.json.length} juego(s) leídos y comprobados.`);
          await asegurarEquipos(torneoId, r.json);
          // En la vuelta rápida solo se guardan los juegos de hoy (no hace falta repasar todo el calendario)
          const hoy = fechaRD(Date.now());
          const lista = rapida ? r.json.filter((j) => String(j.date || '').slice(0, 10) === hoy) : r.json;
          for (const j of lista) {
            if (String(j.date || '').slice(0, 10) === hoy) vistosHoy.add(String(j.id));
            try { if (await guardarJuego(torneoId, j, cuenta)) { huboFinal = true; huboFinalEnAlguno = true; } }
            catch (e) { cuenta.errores++; cuenta.notas.push(`${torneoId} juego ${j.id}: ${e.message}`); console.error(`[robot] Error guardando juego ${j.id}: ${e.message}`); }
          }
          await marcarRevision(torneoId, seccion);
        } catch (e) {
          cuenta.errores++; cuenta.notas.push(`${torneoId} ${seccion}: ${e.message}`);
          console.error(`[robot] ${torneoId} · ${seccion}: ${e.message}`);
        } finally {
          if (page) await page.close().catch(() => {});
        }
      }
      // Posiciones: si tocaba, o si algún juego terminó en esta corrida
      if ((secciones.has('posiciones') || huboFinal) && quedaTiempo()) {
        let page = null;
        try {
          const r = await abrirConReintento(browser, `/liga/${liga}/tabla-de-posiciones`, false);
          page = r.page;
          const filas = await leerPosiciones(page);
          console.log(`[robot] ${torneoId} · posiciones: ${filas.length} equipo(s)${huboFinal ? ' (porque terminó un juego)' : ''}.`);
          await guardarPosiciones(torneoId, filas);
          await marcarRevision(torneoId, 'posiciones');
        } catch (e) {
          cuenta.errores++; cuenta.notas.push(`${torneoId} posiciones: ${e.message}`);
          console.error(`[robot] ${torneoId} · posiciones: ${e.message}`);
        } finally {
          if (page) await page.close().catch(() => {});
        }
      }
    }
  } finally {
    // Cerrar sin quedarse esperando: si no cierra en 5 s, se mata el proceso
    // (en el modo en vivo el Chrome se queda abierto para la próxima vuelta)
    if (!browserCompartido) {
      await Promise.race([browser.close().catch(() => {}), esperar(5000)]);
      try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {}
    }
  }

  if (idCorrida) {
    await supabase.from('corridas_robot').update({
      fin: new Date().toISOString(), guardados: cuenta.guardados, errores: cuenta.errores,
      detalle: cuenta.notas.join('\n').slice(0, 4000) || null,
    }).eq('id', idCorrida);
  }
  console.log(`[robot] Terminado. Juegos guardados: ${cuenta.guardados} · Errores: ${cuenta.errores}`);
  // Un juego que estaba EN VIVO y ya no sale en el calendario terminó, pero puede
  // tardar en salir en resultados: hay que seguir buscándolo en resultados.
  let faltan = 0;
  if (!SOLO_LEER) {
    const { data: vivos } = await supabase.from('juegos').select('fuente_id, visitante, casa')
      .eq('estado', 'en_vivo').eq('fecha', fechaRD(Date.now()));
    const perdidos = (vivos || []).filter((g) => !vistosHoy.has(String(g.fuente_id)));
    faltan = perdidos.length;
    if (faltan) console.log(`[robot] Ya no sale en el calendario (terminó y se espera su final en resultados): ${perdidos.map((g) => g.visitante + '-' + g.casa).join(', ')}`);
  }
  return { huboFinal: huboFinalEnAlguno, errores: cuenta.errores, faltan };
}

// ---------------------------------------------------------------------
// 6) MODO EN VIVO: el Chrome abierto y una vuelta cada CADA_SEGUNDOS
// ---------------------------------------------------------------------
function finDelVigilante() {
  const [hh, mm] = String(process.env.VIGILAR_HASTA || '00:00').split(':').map(Number);
  const hoy = fechaRD(Date.now());
  let fin = momentoRD(hoy, `${String(hh).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}`);
  if (fin <= Date.now()) fin += 24 * 3600 * 1000;           // 00:00 = la medianoche que viene
  return Math.min(fin, Date.now() + 340 * 60 * 1000);        // tope de seguridad: 5 h 40 min
}

// true si hoy hubo juegos y ninguno queda programado ni en vivo
async function todoTerminadoHoy() {
  const { data, error } = await supabase.from('juegos').select('estado').eq('fecha', fechaRD(Date.now()));
  if (error || !data || !data.length) return false;
  return data.every((g) => !['programado', 'en_vivo'].includes(g.estado));
}

async function modoEnVivo() {
  const fin = finDelVigilante();
  console.log(`[en vivo] Encendido: revisa cada ${CADA_SEGUNDOS} s hasta las ${horaRDtexto(fin)} hora RD. El Chrome se queda abierto.`);
  let browser = null, abiertoDesde = 0, vuelta = 0, pendienteCompleta = true;
  const abrirChrome = async () => {
    if (browser) { await Promise.race([browser.close().catch(() => {}), esperar(5000)]); try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {} }
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    abiertoDesde = Date.now();
  };
  while (Date.now() < fin) {
    vuelta++;
    const inicio = Date.now();
    // Vigilante de cada vuelta: si una vuelta se pega, el proceso se cierra y vigilar.sh lo vuelve a encender
    const perro = setTimeout(() => { console.error('[en vivo] Una vuelta pasó de 2½ min: se reinicia el robot.'); process.exit(3); }, VIGILANTE_VUELTA_MS);
    try {
      // Chrome nuevo cada 30 min para que no se ponga pesado
      if (!browser || Date.now() - abiertoDesde > 30 * 60 * 1000) await abrirChrome();
      const completa = pendienteCompleta || vuelta % VUELTAS_COMPLETAS === 1;
      const r = await correr({ browserCompartido: browser, rapida: !completa });
      // si terminó un juego (o desapareció del calendario), la próxima vuelta trae resultados y posiciones
      pendienteCompleta = !!(r && (r.huboFinal || r.faltan));
      if (r && r.nada) console.log('[en vivo] Ningún juego en su horario ahora mismo.');
      // ¿Ya terminaron todos los juegos de hoy? Entonces se apaga solo.
      if (!SOLO_LEER && await todoTerminadoHoy()) {
        console.log('[en vivo] Todos los juegos de hoy están en FINAL (o pospuestos): resultados y posiciones guardados. El vigilante se apaga solo.');
        clearTimeout(perro);
        if (browser) { await Promise.race([browser.close().catch(() => {}), esperar(5000)]); try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {} }
        return 'terminado';
      }
    } catch (e) {
      console.error('[en vivo] Error en la vuelta ' + vuelta + ': ' + e.message + ' (se sigue con la próxima)');
      try { await abrirChrome(); } catch (e2) {}
    } finally {
      clearTimeout(perro);
    }
    const espera = Math.max(1000, CADA_SEGUNDOS * 1000 - (Date.now() - inicio));
    if (Date.now() + espera >= fin) break;
    await esperar(espera);
  }
  if (browser) { await Promise.race([browser.close().catch(() => {}), esperar(5000)]); try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {} }
  console.log(`[en vivo] Llegó la hora de apagarse. ${vuelta} vuelta(s).`);
}

if (MODO_VIVO) {
  // Código 10 = todos los juegos de hoy terminaron: vigilar.sh no lo vuelve a encender
  modoEnVivo().then((r) => process.exit(r === 'terminado' ? 10 : 0)).catch((e) => { console.error('[en vivo] Error grave:', e.message); process.exit(1); });
} else {
// VIGILANTE: si la corrida pasa de 3 minutos, se termina sola (lo guardado queda guardado).
setTimeout(() => {
  console.error('[robot] La corrida pasó de 3 minutos: se termina para no gastar minutos. Lo ya guardado queda guardado.');
  process.exit(0);
}, VIGILANTE_MS).unref();

correr().then(() => process.exit(0)).catch((e) => {
  console.error('[robot] Error grave:', e.message);
  process.exit(1);
});
}
