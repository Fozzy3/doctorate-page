#!/usr/bin/env node
/**
 * Igual que shot.mjs pero con scroll previo y una interacción opcional:
 * permite capturar estados que solo existen tras desplazarse o abrir un menú.
 *
 * Uso: node scripts/shot-scroll.mjs <url> <ancho> <alto> <scrollY> <salida.png> [selectorClick]
 */
import puppeteer from 'puppeteer-core';

const [url, w, h, scrollY, out, click] = process.argv.slice(2);
if (!out) {
  console.error('Uso: node scripts/shot-scroll.mjs <url> <ancho> <alto> <scrollY> <salida.png> [selectorClick]');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });
if (click) await page.click(click);
await page.evaluate((y) => window.scrollTo(0, Number(y)), scrollY);
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: out });
await browser.close();
console.log(out);
