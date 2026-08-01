#!/usr/bin/env node
/**
 * Screenshot con viewport CSS exacto (el CLI --screenshot de Chrome hereda
 * el factor de escala del sistema y miente sobre el ancho real).
 *
 * Uso: node scripts/shot.mjs <url> <ancho> <alto> <salida.png>
 */
import puppeteer from 'puppeteer-core';

const [url, w, h, out] = process.argv.slice(2);
if (!out) {
  console.error('Uso: node scripts/shot.mjs <url> <ancho> <alto> <salida.png>');
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
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: out });
await browser.close();
console.log(out);
