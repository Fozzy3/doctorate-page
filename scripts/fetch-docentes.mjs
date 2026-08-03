#!/usr/bin/env node
/**
 * Migra los perfiles de docentes del WordPress actual.
 *
 * Por cada slug enlazado en src/content/paginas/docentes.md:
 *  - nombre y foto desde el REST (title + primer <img> del contenido)
 *  - pestañas del perfil desde el HTML publicado (el page builder no las
 *    expone por REST): correo, estado, énfasis, grupo, redes académicas,
 *    tesis/director (egresados del programa) y estudiantes dirigidos
 *  - descarga la foto a public/images/docentes/<slug>.<ext>
 *  - escribe src/content/docentes/<slug>.json
 *
 * Idempotente. Uso: node scripts/fetch-docentes.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://doctoradoingenieria.udistrital.edu.co';
const OUT_JSON = 'src/content/docentes';
const OUT_FOTOS = 'public/images/docentes';
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

const soloTexto = (html) => decode(html.replace(/<[^>]+>/g, ' '));

// Enlaces internos del WP → relativos (mantenemos paridad de URLs)
// Rutas internas normalizadas: siempre guiones (algún slug del WP usa guion
// bajo); los archivos (con extensión) se dejan intactos
const relativizar = (url) => {
  const rel = url.replace(BASE, '') || '/';
  return /\.\w+$/.test(rel) ? rel : rel.replace(/_/g, '-');
};

function clasificarRed(href) {
  if (/scienti|cvlac/i.test(href)) return 'cvlac';
  if (/scholar\.google/i.test(href)) return 'scholar';
  if (/orcid\.org/i.test(href)) return 'orcid';
  if (/scopus\.com/i.test(href)) return 'scopus';
  if (/researchgate/i.test(href)) return 'researchgate';
  return null;
}

function personasDe(chunk) {
  const personas = [];
  // Con enlace propio
  for (const m of chunk.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const nombre = soloTexto(m[2]);
    if (nombre) personas.push({ nombre, url: relativizar(decode(m[1])) });
  }
  // Párrafos de solo texto (nombres sin página propia)
  for (const m of chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    if (/<a /.test(m[1])) continue;
    const nombre = soloTexto(m[1]);
    if (nombre && nombre.length > 3) personas.push({ nombre });
  }
  return personas;
}

async function migrar(slug) {
  // 1. REST: nombre + foto
  const res = await fetch(
    `${BASE}/wp-json/wp/v2/pages?slug=${slug}&_fields=title,content`
  );
  const [pagina] = await res.json();
  if (!pagina) throw new Error('sin página en el WP');
  const nombre = decode(pagina.title.rendered);
  const fotoUrl = pagina.content.rendered.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;

  // 2. HTML publicado: pestañas
  const html = await (await fetch(`${BASE}/${slug}/`)).text();
  const inicio = html.indexOf('tab-body-item');
  if (inicio === -1) throw new Error('sin pestañas de perfil');
  // El footer del tema empieza con el NIT institucional (respaldo: iconos sociales)
  let fin = html.indexOf('NIT. 899', inicio);
  if (fin === -1) fin = html.indexOf('wp-block-social-links', inicio);
  const zona = html.slice(inicio, fin === -1 ? undefined : fin);

  const datos = {
    nombre,
    grupos: [],
    redes: {},
    estudiantes: { activos: [], codirigidos: [], egresados: [] },
  };

  const trozos = zona.split(/<h[23][^>]*>/).slice(1);
  for (const trozo of trozos) {
    const cierre = trozo.indexOf('</h');
    const titulo = soloTexto(trozo.slice(0, cierre)).toUpperCase();
    const cuerpo = trozo.slice(cierre);
    if (titulo.startsWith('CORREO')) {
      datos.correo = soloTexto(cuerpo).split(' ')[0] || undefined;
    } else if (titulo === 'ESTADO') {
      datos.estado = soloTexto(cuerpo).split(' ')[0] || undefined;
    } else if (titulo.startsWith('ÉNFASIS') || titulo.startsWith('ENFASIS')) {
      datos.enfasis = soloTexto(cuerpo) || undefined;
    } else if (titulo.startsWith('GRUPO')) {
      for (const m of cuerpo.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        datos.grupos.push({ nombre: soloTexto(m[2]), url: relativizar(decode(m[1])) });
      }
      if (!datos.grupos.length) {
        const txt = soloTexto(cuerpo);
        if (txt) datos.grupos.push({ nombre: txt });
      }
    } else if (titulo.startsWith('REDES')) {
      for (const m of cuerpo.matchAll(/href="([^"]+)"/g)) {
        const red = clasificarRed(m[1]);
        if (red && !datos.redes[red]) datos.redes[red] = decode(m[1]);
      }
    } else if (titulo.startsWith('TESIS')) {
      datos.tesis = soloTexto(cuerpo) || undefined;
    } else if (titulo === 'DIRECTOR' || titulo === 'DIRECTORA') {
      datos.director = soloTexto(cuerpo) || undefined;
    } else if (titulo === 'ACTIVOS') {
      datos.estudiantes.activos = personasDe(cuerpo);
    } else if (titulo === 'CODIRIGIDOS') {
      datos.estudiantes.codirigidos = personasDe(cuerpo);
    } else if (titulo === 'EGRESADOS') {
      datos.estudiantes.egresados = personasDe(cuerpo);
    }
  }

  // 3. Foto
  if (fotoUrl) {
    const ext = path.extname(new URL(fotoUrl).pathname) || '.jpg';
    const destino = path.join(OUT_FOTOS, `${slug}${ext}`);
    if (!existsSync(destino)) {
      const img = await fetch(fotoUrl);
      if (img.ok) await writeFile(destino, Buffer.from(await img.arrayBuffer()));
    }
    if (existsSync(destino)) datos.foto = `/images/docentes/${slug}${ext}`;
  }

  await writeFile(path.join(OUT_JSON, `${slug}.json`), JSON.stringify(datos, null, 2));
  return datos;
}

// ── main ────────────────────────────────────────────────────────────────
const md = await readFile('src/content/paginas/docentes.md', 'utf8');
// El enlace puede ser absoluto (aún no migrado a interno) o relativo
const slugs = [
  ...new Set(
    [...md.matchAll(/\]\((?:https?:\/\/doctoradoingenieria\.udistrital\.edu\.co)?\/([a-z0-9-]+)\/\)/g)].map(
      (m) => m[1]
    )
  ),
];
console.log(`Docentes a migrar: ${slugs.length}`);

await mkdir(OUT_JSON, { recursive: true });
await mkdir(OUT_FOTOS, { recursive: true });

const fallos = [];
let ok = 0;
for (let i = 0; i < slugs.length; i += CONCURRENCIA) {
  await Promise.all(
    slugs.slice(i, i + CONCURRENCIA).map(async (slug) => {
      try {
        await migrar(slug);
        ok++;
        if (ok % 20 === 0) console.log(`  ${ok} migrados…`);
      } catch (err) {
        fallos.push(`${slug}: ${err.message}`);
      }
    })
  );
}

console.log(`\nMigrados: ${ok} · Fallos: ${fallos.length}`);
fallos.forEach((f) => console.log('  ✗ ' + f));
if (fallos.length) process.exitCode = 1;
