// EXPLORAR pelotainvernal.com — SOLO LEE. No escribe nada en Supabase.
// Copia adaptada de robot/probar-conectate.js (repo lotoanalytics).
// Abre cada página en un Chrome sin pantalla y anota TODOS los datos ocultos
// que la página pide por internet (JSON, XHR/fetch y WebSocket), para saber
// de dónde salen el calendario, los resultados y el juego en vivo.
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE = 'https://pelotainvernal.com';
const PAGINAS = [
  ['lidom-portada',     '/liga/dominicana-lidom'],
  ['lidom-calendario',  '/liga/dominicana-lidom/calendario'],
  ['lidom-resultados',  '/liga/dominicana-lidom/resultados'],
  ['lidom-posiciones',  '/liga/dominicana-lidom/tabla-de-posiciones'],
  ['caribe-resultados', '/liga/serie-del-caribe/resultados'],
  ['inicio',            '/'],
];
const SALIDA = 'prueba-pelotainvernal';
fs.mkdirSync(SALIDA, { recursive: true });
const resumen = [];

async function explorar(browser, nombre, ruta) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36');
  const datos = [];
  page.on('response', async (r) => {
    const tipo = r.request().resourceType();
    const ct = r.headers()['content-type'] || '';
    if (!['xhr', 'fetch'].includes(tipo) && !/json/.test(ct)) return;
    let texto = '';
    try { texto = await r.text(); } catch (e) {}
    // De pelotainvernal se guarda la respuesta COMPLETA; de lo demás (anuncios) solo un pedacito
    const propio = /pelotainvernal\.com|kiskoo\.com/.test(r.url());
    datos.push({ metodo: r.request().method(), url: r.url(), estado: r.status(), tipo, contentType: ct,
                 cuerpoPedido: r.request().postData() || null, largo: texto.length, muestra: texto.slice(0, propio ? 400000 : 300) });
  });
  // WebSockets (marcadores en vivo suelen llegar así)
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  const sockets = [];
  cdp.on('Network.webSocketCreated', (e) => sockets.push({ url: e.url, mensajes: [] }));
  cdp.on('Network.webSocketFrameReceived', (e) => {
    const s = sockets[sockets.length - 1];
    if (s && s.mensajes.length < 80) s.mensajes.push(String(e.response.payloadData).slice(0, 20000));
  });

  console.log('\n================ ' + nombre + '  ' + BASE + ruta);
  try { await page.goto(BASE + ruta, { waitUntil: 'networkidle2', timeout: 45000 }); } catch (e) { console.log('(tardó: ' + e.message + ')'); }
  // En la portada se escucha el canal en vivo más tiempo (ESCUCHAR_SEGUNDOS, por defecto 120)
  const espera = nombre === 'lidom-portada' ? Number(process.env.ESCUCHAR_SEGUNDOS || 120) * 1000 : 8000;
  await new Promise((r) => setTimeout(r, espera));
  const texto = await page.evaluate(() => document.body.innerText).catch(() => '');
  const scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean)).catch(() => []);
  // Enlaces a juegos y el HTML de la página (para ver cómo pinta el juego en vivo)
  const enlaces = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href))]).catch(() => []);
  fs.writeFileSync(`${SALIDA}/${nombre}.html`, await page.content().catch(() => ''));
  // Código de los programas propios del sitio (el del canal en vivo sobre todo)
  for (const src of scripts.filter((u) => /kiskoo\.com|pelotainvernal\.com/.test(u))) {
    const codigo = await page.evaluate((u) => fetch(u).then((r) => r.text()).catch((e) => 'ERROR ' + e), src).catch(() => '');
    fs.writeFileSync(`${SALIDA}/codigo-${src.split('/').pop().split('?')[0]}`, codigo);
  }

  fs.writeFileSync(`${SALIDA}/${nombre}.json`, JSON.stringify({ url: BASE + ruta, scripts, enlaces, datos, sockets, textoVisible: texto.slice(0, 6000) }, null, 2));
  console.log('Scripts: ' + scripts.length + ' · Datos ocultos: ' + datos.length + ' · WebSockets: ' + sockets.length);
  datos.forEach((d) => console.log('  ' + d.metodo + ' ' + d.estado + ' ' + d.url + ' (' + d.largo + ' letras)'));
  sockets.forEach((s) => console.log('  WS ' + s.url + ' (' + s.mensajes.length + ' mensajes)'));
  console.log('--- Texto visible (inicio): ' + texto.replace(/\s+/g, ' ').slice(0, 700));
  resumen.push({ nombre, url: BASE + ruta, datos: datos.map((d) => d.metodo + ' ' + d.url), sockets: sockets.map((s) => s.url) });
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const [nombre, ruta] of PAGINAS) await explorar(browser, nombre, ruta);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(`${SALIDA}/RESUMEN.json`, JSON.stringify(resumen, null, 2));
  console.log('\nListo. No se guardó nada en la base de datos. Resultados en la carpeta ' + SALIDA + '/');
})().catch((e) => { console.log('Error en la prueba (no afecta nada):', e.message); process.exit(0); });
