#!/usr/bin/env node
/**
 * Mide el ancho renderizado de elementos clave para verificar que la prosa
 * llene la columna igual que las reglas de los títulos y las tablas.
 *
 * Uso: node scripts/medir.mjs <url> [ancho]
 */
import puppeteer from 'puppeteer-core';

const url = process.argv[2];
const ancho = Number(process.argv[3] ?? 1745);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: ancho, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });

const medidas = await page.evaluate(() => {
  const w = (sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  };
  return {
    columna: w('.page-grid > article'),
    prosa: w('.prose'),
    parrafo: w('.prose p'),
    lista: w('.prose ul'),
    h2: w('.prose h2'),
    tabla: w('.prose table'),
    linkList: w('.prose ul.link-list'),
  };
});

console.log(JSON.stringify(medidas, null, 1));
await browser.close();
