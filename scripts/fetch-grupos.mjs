#!/usr/bin/env node
/**
 * Migra las páginas de los grupos de investigación del WordPress actual.
 *
 * Por cada grupo enlazado en src/content/paginas/grupos-de-investigacion.md:
 *  - sigla (title REST), nombre completo (primer h2), logo (descargado),
 *    descripción, clasificación MinCiencias + convocatoria, enlace GrupLAC,
 *    otros botones, director (nombre/página/correo) y fecha de actualización
 *  - anota el énfasis según la sección donde aparece en la página de grupos
 *  - escribe src/content/grupos/<slug>.json y el logo en public/images/grupos/
 *
 * Idempotente. Uso: node scripts/fetch-grupos.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://doctoradoingenieria.udistrital.edu.co';
const OUT_JSON = 'src/content/grupos';
const OUT_LOGOS = 'public/images/grupos';
const CONCURRENCIA = 5;

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const soloTexto = (html) => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '));
// Rutas internas normalizadas: siempre guiones (algún slug del WP usa guion
// bajo); los archivos (con extensión) se dejan intactos
const relativizar = (url) => {
  const rel = url.replace(BASE, '') || '/';
  return /\.\w+$/.test(rel) ? rel : rel.replace(/_/g, '-');
};

async function migrar(slug, enfasis) {
  const res = await fetch(`${BASE}/wp-json/wp/v2/pages?slug=${slug}&_fields=title,content`);
  const [pagina] = await res.json();
  if (!pagina) throw new Error('sin página en el WP');
  const html = pagina.content.rendered;

  const datos = { sigla: decode(pagina.title.rendered), enfasis, enlaces: [] };

  // Nombre completo: primer h2
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (h2) datos.nombre = decode(h2[1].replace(/<[^>]+>/g, ' '));

  // Logo: primera imagen
  const img = html.match(/<img[^>]+src="([^"]+)"/)?.[1];
  if (img) {
    const ext = path.extname(new URL(img).pathname) || '.png';
    const destino = path.join(OUT_LOGOS, `${slug}${ext}`);
    if (!existsSync(destino)) {
      const r = await fetch(img);
      if (r.ok) await writeFile(destino, Buffer.from(await r.arrayBuffer()));
    }
    if (existsSync(destino)) datos.logo = `/images/grupos/${slug}${ext}`;
  }

  // Descripción: párrafos largos (el cuerpo real del grupo)
  datos.descripcion = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => soloTexto(m[1]))
    .filter((t) => t.length > 120 && !/CLASIFICACIÓN|Fecha actualización/i.test(t));

  // Clasificación MinCiencias + convocatoria
  const clas = html.match(/CLASIFICACIÓN[\s\S]{0,700}?<\/p>/i)?.[0];
  if (clas) {
    datos.clasificacion = soloTexto(clas.replace(/<a[\s\S]*?<\/a>/g, ''))
      .replace(/CLASIFICACIÓN/i, '')
      .trim() || undefined;
    const conv = clas.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (conv) datos.convocatoria = { etiqueta: soloTexto(conv[2]), url: decode(conv[1]) };
  }

  // Botones: GrupLAC + otros enlaces
  for (const m of html.matchAll(
    /<a class="wp-block-button__link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  )) {
    const url = decode(m[1]);
    const etiqueta = soloTexto(m[2]);
    if (/gruplac/i.test(url) && /gruplac/i.test(etiqueta)) datos.gruplac = url;
    else if (etiqueta) datos.enlaces.push({ etiqueta, url });
  }
  // Algunos grupos ponen el GrupLAC con otra etiqueta
  if (!datos.gruplac) {
    const g = html.match(/href="(https?:\/\/scienti[^"]*gruplac[^"]*)"/i);
    if (g) datos.gruplac = decode(g[1]);
  }

  // Director: párrafo que contiene la palabra Director. El nombre va en la
  // primera línea (nombre<br>Director<br>correo) — hay que separar por <br>
  // ANTES de aplanar espacios, o "Director" y el correo quedan pegados al nombre.
  const dirP = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => m[1])
    .find((t) => /Director/i.test(t) && !/CLASIFICACIÓN/i.test(t));
  if (dirP) {
    const a = dirP.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const correo = soloTexto(dirP).match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
    const primeraLinea = soloTexto(dirP.split(/<br\s*\/?>/i)[0]);
    datos.director = {
      nombre: a ? soloTexto(a[2]) : primeraLinea,
      ...(a ? { url: relativizar(decode(a[1])) } : {}),
      ...(correo ? { correo } : {}),
    };
  }

  // Fecha de actualización: dd/mm/aaaa
  const fecha = soloTexto(html).match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (fecha) datos.actualizado = fecha[1];

  await writeFile(path.join(OUT_JSON, `${slug}.json`), JSON.stringify(datos, null, 2));
}

// ── main ────────────────────────────────────────────────────────────────
const md = await readFile('src/content/paginas/grupos-de-investigacion.md', 'utf8');
const porEnfasis = new Map();
let enfasisActual = '';
for (const linea of md.split('\n')) {
  const h = linea.match(/^## (.+)/);
  if (h) enfasisActual = h[1].trim();
  // El enlace puede ser absoluto (aún no migrado a interno) o relativo
  const l = linea.match(/\]\((?:https?:\/\/doctoradoingenieria\.udistrital\.edu\.co)?\/([a-z0-9-]+)\/\)/);
  if (l && enfasisActual) porEnfasis.set(l[1], enfasisActual);
}
console.log(`Grupos a migrar: ${porEnfasis.size}`);

await mkdir(OUT_JSON, { recursive: true });
await mkdir(OUT_LOGOS, { recursive: true });

const entradas = [...porEnfasis.entries()];
const fallos = [];
let ok = 0;
for (let i = 0; i < entradas.length; i += CONCURRENCIA) {
  await Promise.all(
    entradas.slice(i, i + CONCURRENCIA).map(async ([slug, enfasis]) => {
      try {
        await migrar(slug, enfasis);
        ok++;
      } catch (err) {
        fallos.push(`${slug}: ${err.message}`);
      }
    })
  );
}

console.log(`Migrados: ${ok} · Fallos: ${fallos.length}`);
fallos.forEach((f) => console.log('  ✗ ' + f));
if (fallos.length) process.exitCode = 1;
