#!/usr/bin/env node
/**
 * Descarga los archivos de /wp-content/uploads/ referenciados en src/content
 * y los guarda en public/documentos/AAAA/MM/archivo (misma nomenclatura de
 * año/mes de WordPress, sin el prefijo wp-content/uploads).
 *
 * Idempotente: los archivos ya descargados se saltan.
 *
 * Uso: node scripts/fetch-uploads.mjs
 */
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'src/content';
const OUT_DIR = 'public/documentos';
const PREFIX = /https?:\/\/doctoradoingenieria\.udistrital\.edu\.co\/wp-content\/uploads\//;
const URL_RE = /https?:\/\/doctoradoingenieria\.udistrital\.edu\.co\/wp-content\/uploads\/[^)\s"'<>]+/g;
const CONCURRENCY = 6;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// 1. Recolectar URLs únicas
const urls = new Set();
for await (const file of walk(CONTENT_DIR)) {
  const text = await readFile(file, 'utf8');
  for (const m of text.match(URL_RE) ?? []) urls.add(m);
}
console.log(`URLs únicas encontradas: ${urls.size}`);

// 2. Descargar con concurrencia limitada
const lista = [...urls];
const fallos = [];
let descargados = 0;
let saltados = 0;
let bytes = 0;

async function bajar(url) {
  // Ruta relativa AAAA/MM/archivo, decodificada para el disco
  const rel = decodeURIComponent(url.replace(PREFIX, ''));
  const destino = path.join(OUT_DIR, rel);
  if (existsSync(destino)) {
    saltados++;
    bytes += (await stat(destino)).size;
    return;
  }
  try {
    let res = await fetch(url, { redirect: 'follow' });
    // Algunos archivos se subieron desde macOS y quedaron guardados con los
    // acentos en forma Unicode descompuesta (NFD), mientras el enlace los trae
    // compuestos (NFC): mismo nombre a la vista, distinto byte a byte.
    if (!res.ok && url.normalize('NFD') !== url) {
      res = await fetch(url.normalize('NFD'), { redirect: 'follow' });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, buf);
    bytes += buf.length;
    descargados++;
    if (descargados % 25 === 0) console.log(`  ${descargados} descargados…`);
  } catch (err) {
    fallos.push(`${url} → ${err.message}`);
  }
}

for (let i = 0; i < lista.length; i += CONCURRENCY) {
  await Promise.all(lista.slice(i, i + CONCURRENCY).map(bajar));
}

console.log(`\nDescargados: ${descargados} · Ya existían: ${saltados} · Fallos: ${fallos.length}`);
console.log(`Peso total: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
if (fallos.length) {
  console.log('\nFallos:');
  fallos.forEach((f) => console.log('  ' + f));
  process.exitCode = 1;
}
