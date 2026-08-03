#!/usr/bin/env node
/**
 * Prueba el formulario de contacto en un navegador real:
 *  1. valida que los avisos salgan en español (no los nativos en inglés)
 *  2. envía el formulario y comprueba el mensaje de resultado
 *
 * Uso: node scripts/probar-form.mjs [url]
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
await page.click('#form-contacto button[type="submit"]');
// El fallo de red tarda unos segundos en resolverse; margen amplio a propósito
await new Promise((r) => setTimeout(r, 12000));

const resultado = await page.evaluate(() => {
  const el = document.querySelector('.form-estado');
  return { visible: !el.hidden, clase: el.className, texto: el.textContent.trim() };
});
console.log('Resultado del envío:', JSON.stringify(resultado, null, 1));

await browser.close();
