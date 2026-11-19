#!/usr/bin/env node
/**
 * Prueba un formulario Web3Forms (contacto o PQRS) en un navegador real:
 *  1. valida que los avisos salgan en español (no los nativos en inglés)
 *  2. envía el formulario y comprueba el mensaje de resultado
 *
 * Uso: node scripts/probar-form.mjs [url]
 *   node scripts/probar-form.mjs http://localhost:4361/pqrs/
 */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:4361/contactenos/';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--lang=en-US'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });

// Campos propios del PQRS (tipo y autorización de datos); en contacto no existen
const extras = (p) =>
  p.evaluate(() => {
    const tipo = document.querySelector('#tipo');
    if (tipo) tipo.value = 'Petición';
    const ok = document.querySelector('#autorizo');
    if (ok && !ok.checked) ok.click();
  });

// 0. Casilla de autorización sin marcar (solo PQRS): aviso en español
const avisoCasilla = await page.evaluate(() => {
  const c = document.querySelector('#autorizo');
  if (!c) return null;
  c.checkValidity();
  return c.validationMessage;
});
if (avisoCasilla !== null) console.log('Aviso de autorización:', JSON.stringify(avisoCasilla));

// 1. Mensaje de validación con el campo vacío
const validacion = await page.evaluate(() => {
  const campo = document.querySelector('#nombre');
  campo.checkValidity();
  return campo.validationMessage;
});
console.log('Aviso de campo vacío:', JSON.stringify(validacion));

// 2. Mensaje de correo inválido
const validacionCorreo = await page.evaluate(() => {
  const campo = document.querySelector('#correo');
  campo.value = 'esto-no-es-correo';
  campo.checkValidity();
  return campo.validationMessage;
});
console.log('Aviso de correo inválido:', JSON.stringify(validacionCorreo));

// 3. Envío completo (con la clave pendiente debe mostrar el aviso de respaldo).
//    Se escribe como un usuario real: fijar .value por JS no dispara `input`
//    y el mensaje de validación quedaría pegado bloqueando el envío.
await page.evaluate(() => {
  document.querySelectorAll('input, textarea').forEach((c) => (c.value = ''));
});
await page.type('#nombre', 'Prueba Automatizada');
await page.type('#correo', 'prueba@ejemplo.com');
await page.type('#asunto', 'Prueba');
await page.type('#mensaje', 'Mensaje de prueba.');
// Una persona tarda más que esto en llenar el formulario; sin la pausa se
// dispara la trampa de tiempo y no se probaría el envío real.
await new Promise((r) => setTimeout(r, 3500));
await extras(page);
await page.click('form[data-web3] button[type="submit"]');
// El fallo de red tarda unos segundos en resolverse; margen amplio a propósito
await new Promise((r) => setTimeout(r, 12000));

const resultado = await page.evaluate(() => {
  const el = document.querySelector('.form-estado');
  return { visible: !el.hidden, clase: el.className, texto: el.textContent.trim() };
});
console.log('Resultado del envío:', JSON.stringify(resultado, null, 1));

// 4. Trampa de tiempo: un envío instantáneo debe rechazarse
const pagina2 = await browser.newPage();
await pagina2.goto(url, { waitUntil: 'networkidle0' });
await pagina2.type('#nombre', 'Bot Veloz');
await pagina2.type('#correo', 'bot@ejemplo.com');
await pagina2.type('#asunto', 'Spam');
await pagina2.type('#mensaje', 'Contenido automatizado.');
await extras(pagina2);
await pagina2.click('form[data-web3] button[type="submit"]');
await new Promise((r) => setTimeout(r, 800));
console.log(
  'Trampa de tiempo:',
  await pagina2.evaluate(() => document.querySelector('.form-estado').textContent.trim())
);

// 5. Honeypot: si el campo oculto viene lleno, no debe enviarse nada
const pagina3 = await browser.newPage();
await pagina3.goto(url, { waitUntil: 'networkidle0' });
let huboPeticion = false;
pagina3.on('request', (r) => {
  if (r.url().includes('web3forms')) huboPeticion = true;
});
await pagina3.evaluate(() => {
  document.querySelector('#sitio-web').value = 'https://spam.example';
});
await pagina3.type('#nombre', 'Bot Trampa');
await pagina3.type('#correo', 'bot2@ejemplo.com');
await pagina3.type('#asunto', 'Spam');
await pagina3.type('#mensaje', 'Contenido automatizado.');
await new Promise((r) => setTimeout(r, 3500)); // supera la trampa de tiempo
await extras(pagina3);
await pagina3.click('form[data-web3] button[type="submit"]');
await new Promise((r) => setTimeout(r, 1500));
console.log('Honeypot → ¿se envió algo al proveedor?:', huboPeticion ? 'SÍ (falla)' : 'no (correcto)');

await browser.close();
