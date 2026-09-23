#!/usr/bin/env node
/**
 * Prueba la página de certificados en un navegador real y guarda capturas.
 *
 * Requiere la API de certificados corriendo (datos de prueba ficticios) y el sitio servido
 * (astro dev o astro preview).
 *
 * Uso:
 *   node scripts/probar-certificados.mjs [escenario] [url] [carpeta-capturas]
 *
 * Escenarios:
 *   completo    (por defecto) estados vacío, error y PDF en escritorio y móvil,
 *               validación, teclado e invalidación del PDF al editar
 *   sin-api     build de producción sin PUBLIC_CERT_API_URL (servido con astro preview):
 *               aviso de respaldo y formulario deshabilitado
 *   ocupado     503 SERVICIO_OCUPADO (retener antes el candado del consecutivo en la base):
 *               aviso de reintento y mensaje final
 *
 * Navegador: NAVEGADOR=/ruta/al/binario (por defecto Chrome, como los demás scripts);
 * si la ruta contiene "firefox", se usa el modo Firefox de puppeteer.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const [escenario = 'completo', url = 'http://localhost:4321/certificados/', salida = 'capturas-certificados'] =
  process.argv.slice(2);
const navegador = process.env.NAVEGADOR ?? '/usr/bin/google-chrome-stable';
const esFirefox = navegador.includes('firefox');
mkdirSync(salida, { recursive: true });

const ESCRITORIO = { width: 1400, height: 1000, deviceScaleFactor: 1 };
const MOVIL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push({ nombre, ok });
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: navegador,
  browser: esFirefox ? 'firefox' : 'chrome',
  headless: true,
  args: esFirefox ? [] : ['--no-sandbox'],
});

async function abrir(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

const esperarCatalogos = (page) =>
  page.waitForFunction(
    () => {
      const sel = document.querySelector('#certificado');
      return sel && !sel.disabled && sel.options.length > 1;
    },
    { timeout: 15000 }
  );

const esperarEstado = (page, clase) =>
  page.waitForFunction(
    (c) => {
      const e = document.querySelector('.form-estado');
      return e && !e.hidden && e.classList.contains(c);
    },
    { timeout: 60000 },
    clase
  );

async function llenar(page, tipo, numero, certificado) {
  await page.select('#tipo-documento', tipo);
  // Vaciar y escribir como un usuario (type dispara los eventos input)
  await page.$eval('#numero-documento', (el) => (el.value = ''));
  await page.type('#numero-documento', numero);
  await page.select('#certificado', certificado);
}

const captura = async (page, nombre) => {
  const ruta = join(salida, `${nombre}.png`);
  // Captura de página completa: volver arriba (el header es sticky) y cargar las
  // imágenes diferidas (loading="lazy") para que salgan en la captura.
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    const imgs = [...document.images];
    imgs.forEach((img) => (img.loading = 'eager'));
    await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => null))));
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: ruta, fullPage: true });
  console.log(`  captura: ${ruta}`);
};

const texto = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim());

async function completo() {
  for (const [nombreVp, vp] of [['escritorio', ESCRITORIO], ['movil', MOVIL]]) {
    const page = await abrir(vp);
    await esperarCatalogos(page);
    comprobar(`[${nombreVp}] catálogos cargados`, true);
    await captura(page, `${nombreVp}-1-vacio`);

    // Error de validación propio (cédula con letras)
    await llenar(page, 'CC', '09000A0001', 'JORNADA_DIRECTOR');
    await page.click('button[type="submit"]');
    const errCampo = await texto(page, '#numero-error');
    comprobar(`[${nombreVp}] validación en español`, errCampo.includes('La cédula debe tener entre 6 y 10 dígitos'), errCampo);

    // Error de la API (documento sin registros): mensaje genérico en español
    await llenar(page, 'CC', '0999999999', 'JORNADA_DIRECTOR');
    await page.click('button[type="submit"]');
    await esperarEstado(page, 'error');
    const msgError = await texto(page, '.form-estado');
    comprobar(`[${nombreVp}] error de la API`, msgError.includes('No encontramos certificados de ese tipo'), msgError);
    await captura(page, `${nombreVp}-2-error`);

    // PDF generado
    await llenar(page, 'CC', '0.900.000.002', 'JORNADA_DIRECTOR');
    await page.click('button[type="submit"]');
    await esperarEstado(page, 'ok');
    const cons = await texto(page, '#resultado-consecutivo');
    const cod = await texto(page, '#resultado-codigo');
    const descarga = await page.$eval('#resultado-descargar', (a) => [a.download, a.href.startsWith('blob:')]);
    const foco = await page.evaluate(() => document.activeElement?.id);
    const iframeVisible = await page.$eval('#resultado-visor', (f) => getComputedStyle(f).display !== 'none');
    comprobar(`[${nombreVp}] PDF generado`, /^DOC-FI-CERT-\d{7,}$/.test(cons) && /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(cod), `${cons} · ${cod}`);
    comprobar(`[${nombreVp}] descarga con nombre del consecutivo`, descarga[0] === `${cons}.pdf` && descarga[1], descarga[0]);
    comprobar(`[${nombreVp}] foco en el título del panel`, foco === 'resultado-titulo', foco);
    comprobar(`[${nombreVp}] iframe ${nombreVp === 'movil' ? 'oculto' : 'visible'}`, iframeVisible === (nombreVp === 'escritorio'));
    await captura(page, `${nombreVp}-3-pdf`);

    // Teclado: desde el título del panel, Tab lleva a Descargar y luego a Abrir
    await page.keyboard.press('Tab');
    const f1 = await page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press('Tab');
    const f2 = await page.evaluate(() => document.activeElement?.id);
    comprobar(`[${nombreVp}] teclado en el panel`, f1 === 'resultado-descargar' && f2 === 'resultado-abrir', `${f1} → ${f2}`);

    // Editar el formulario oculta el PDF y revoca la URL blob
    const blob = await page.$eval('#resultado-descargar', (a) => a.href);
    await page.select('#certificado', 'JORNADA_CODIRECTOR');
    const oculto = await page.$eval('#resultado', (p) => p.hidden);
    const revocada = await page.evaluate(async (u) => {
      try {
        await fetch(u);
        return false;
      } catch {
        return true;
      }
    }, blob);
    comprobar(`[${nombreVp}] editar oculta el PDF y revoca la URL`, oculto && revocada);

    if (nombreVp === 'escritorio') {
      // Orden de tabulación del formulario
      await page.reload({ waitUntil: 'load' });
      await esperarCatalogos(page);
      await page.focus('#tipo-documento');
      const orden = ['tipo-documento'];
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        orden.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
      }
      comprobar('[escritorio] orden de tabulación', orden.join('>') === 'tipo-documento>numero-documento>certificado>BUTTON', orden.join(' > '));
    }
    await page.close();
  }
}

async function sinApi() {
  for (const [nombreVp, vp] of [['escritorio', ESCRITORIO], ['movil', MOVIL]]) {
    const page = await abrir(vp);
    await esperarEstado(page, 'error');
    const msg = await texto(page, '.form-estado');
    const deshabilitado = await page.$$eval('#tipo-documento, #numero-documento, #certificado, button[type="submit"]', (els) => els.every((e) => e.disabled));
    comprobar(`[${nombreVp}] sin API: aviso de respaldo`, msg.includes('doctoradoing@udistrital.edu.co') && msg.includes('1419'), msg);
    comprobar(`[${nombreVp}] sin API: formulario deshabilitado`, deshabilitado);
    const opciones = await page.$$eval('#tipo-documento option, #certificado option', (os) => os.map((o) => o.textContent));
    comprobar(`[${nombreVp}] sin API: selects dicen "No disponible"`, opciones.every((t) => t === 'No disponible'), opciones.join(', '));
    await captura(page, `${nombreVp}-sin-api`);
    await page.close();
  }
}

async function ocupado() {
  const page = await abrir(ESCRITORIO);
  await esperarCatalogos(page);
  await llenar(page, 'CC', '0900000001', 'JORNADA_DIRECTOR');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('.form-estado')?.textContent.includes('Reintentaremos'), { timeout: 30000 });
  const aviso = await texto(page, '.form-estado');
  comprobar('503: aviso de reintento', /Reintentaremos en \d+ segundos/.test(aviso), aviso);
  await captura(page, 'escritorio-ocupado-reintento');
  await esperarEstado(page, 'error');
  const final = await texto(page, '.form-estado');
  comprobar('503: mensaje final tras el reintento', final.includes('Intente de nuevo en unos segundos'), final);
  await captura(page, 'escritorio-ocupado-final');
  await page.close();
}

try {
  if (escenario === 'sin-api') await sinApi();
  else if (escenario === 'ocupado') await ocupado();
  else await completo();
} finally {
  await browser.close();
}
const fallas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} comprobaciones correctas`);
process.exit(fallas ? 1 : 0);
