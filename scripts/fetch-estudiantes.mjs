#!/usr/bin/env node
/**
 * Migra los perfiles de estudiantes (activos y egresados) del WordPress.
 *
 * Fuentes de slugs: estudiantes.md y egresados-2.md. Los slugs que ya son
 * docentes se omiten (misma URL, el perfil de docente manda).
 *
 * Por cada estudiante: nombre y foto (REST) + pestañas del HTML publicado:
 * énfasis, cohorte, redes académicas, proyecto/tesis doctoral, grupo y
 * director. Escribe src/content/estudiantes/<slug>.json y la foto en
 * public/images/estudiantes/.
 *
 * Idempotente. Uso: node scripts/fetch-estudiantes.mjs
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://doctoradoingenieria.udistrital.edu.co';
const OUT_JSON = 'src/content/estudiantes';
const OUT_FOTOS = 'public/images/estudiantes';
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

// Rutas internas normalizadas: siempre guiones (el WP tiene algún slug con
// guion bajo); los archivos (con extensión) se dejan intactos
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

async function migrar(slug, tipo) {
  // El WP se consulta con su slug original; localmente todo va normalizado
  const slugLocal = slug.replace(/_/g, '-');
  const res = await fetch(`${BASE}/wp-json/wp/v2/pages?slug=${slug}&_fields=title,content`);
  const [pagina] = await res.json();
  if (!pagina) throw new Error('sin página en el WP');
  const nombre = decode(pagina.title.rendered);
  const fotoUrl = pagina.content.rendered.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;

  const html = await (await fetch(`${BASE}/${slug}/`)).text();
  const inicio = html.indexOf('tab-body-item');
  if (inicio === -1) throw new Error('sin pestañas de perfil');
  let fin = html.indexOf('NIT. 899', inicio);
  if (fin === -1) fin = html.indexOf('wp-block-social-links', inicio);
  const zona = html.slice(inicio, fin === -1 ? undefined : fin);

  const datos = { nombre, tipo, grupos: [], redes: {} };
  const tipoAuto = tipo === 'auto';

  const trozos = zona.split(/<h[23][^>]*>/).slice(1);
  for (const trozo of trozos) {
    const cierre = trozo.indexOf('</h');
    const titulo = soloTexto(trozo.slice(0, cierre)).toUpperCase();
    const cuerpo = trozo.slice(cierre);
    if (titulo.startsWith('ÉNFASIS') || titulo.startsWith('ENFASIS')) {
      datos.enfasis = soloTexto(cuerpo) || undefined;
    } else if (titulo.startsWith('COHORTE')) {
      datos.cohorte = soloTexto(cuerpo) || undefined;
    } else if (titulo.startsWith('REDES')) {
      for (const m of cuerpo.matchAll(/href="([^"]+)"/g)) {
        const red = clasificarRed(m[1]);
        if (red && !datos.redes[red]) datos.redes[red] = decode(m[1]);
      }
    } else if (titulo.startsWith('PROYECTO') || titulo.startsWith('PROPUESTA')) {
      datos.proyecto = soloTexto(cuerpo) || undefined;
      if (datos.proyecto) {
        datos.proyectoEtiqueta = titulo.startsWith('PROPUESTA')
          ? 'Propuesta de investigación doctoral'
          : 'Proyecto de investigación doctoral';
      }
    } else if (titulo.startsWith('TESIS')) {
      datos.tesis = soloTexto(cuerpo) || undefined;
    } else if (titulo.startsWith('GRUPO')) {
      for (const m of cuerpo.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        datos.grupos.push({ nombre: soloTexto(m[2]), url: relativizar(decode(m[1])) });
      }
      if (!datos.grupos.length) {
        const txt = soloTexto(cuerpo);
        if (txt) datos.grupos.push({ nombre: txt });
      }
    } else if (
      titulo === 'DIRECTOR' ||
      titulo === 'DIRECTORA' ||
      titulo === 'CODIRECTOR' ||
      titulo === 'CODIRECTORA'
    ) {
      const campo = titulo.startsWith('CO') ? 'codirector' : 'director';
      const a = cuerpo.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const texto = soloTexto(cuerpo);
      if (a) datos[campo] = { nombre: soloTexto(a[2]), url: relativizar(decode(a[1])) };
      else if (texto) datos[campo] = { nombre: texto };
    }
  }

  if (tipoAuto) datos.tipo = datos.tesis ? 'egresado' : 'activo';

  if (fotoUrl) {
    const ext = path.extname(new URL(fotoUrl).pathname) || '.jpg';
    const destino = path.join(OUT_FOTOS, `${slugLocal}${ext}`);
    if (!existsSync(destino)) {
      const img = await fetch(fotoUrl);
      if (img.ok) await writeFile(destino, Buffer.from(await img.arrayBuffer()));
    }
    if (existsSync(destino)) datos.foto = `/images/estudiantes/${slugLocal}${ext}`;
  }

  await writeFile(path.join(OUT_JSON, `${slugLocal}.json`), JSON.stringify(datos, null, 2));
}

// ── main ────────────────────────────────────────────────────────────────
const slugsDe = async (archivo) => {
  const md = await readFile(archivo, 'utf8');
  // El enlace puede ser absoluto (aún no migrado a interno) o relativo
  return [
    ...md.matchAll(/\]\((?:https?:\/\/doctoradoingenieria\.udistrital\.edu\.co)?\/([a-z0-9-]+)\/\)/g),
  ].map((m) => m[1]);
};

const activos = await slugsDe('src/content/paginas/estudiantes.md');
const egresados = await slugsDe('src/content/paginas/egresados-2.md');
const docentes = new Set(
  (await readdir('src/content/docentes')).map((f) => f.replace(/\.json$/, ''))
);

// Perfiles con página en el WP pero ausentes de los directorios
// (giraldo usa guiones bajos en el slug y por eso no lo captura el patrón)
const EXTRAS = [
  'giraldo_ramos_frank_nixon',
  'munoz-barragan-jorge-enrique-2',
  'pena-suesca-rafael-antonio',
  'villarreal-lopez-luis',
];

// tipo: egresado gana si aparece en ambas listas; docentes se omiten
const plan = new Map();
for (const s of activos) plan.set(s, 'activo');
for (const s of egresados) plan.set(s, 'egresado');
for (const s of EXTRAS) if (!plan.has(s)) plan.set(s, 'auto');
const omitidos = [...plan.keys()].filter((s) => docentes.has(s));
omitidos.forEach((s) => plan.delete(s));

console.log(`Estudiantes a migrar: ${plan.size} (omitidos por ser docentes: ${omitidos.length})`);

await mkdir(OUT_JSON, { recursive: true });
await mkdir(OUT_FOTOS, { recursive: true });

const entradas = [...plan.entries()];
const fallos = [];
let ok = 0;
for (let i = 0; i < entradas.length; i += CONCURRENCIA) {
  await Promise.all(
    entradas.slice(i, i + CONCURRENCIA).map(async ([slug, tipo]) => {
      try {
        await migrar(slug, tipo);
        ok++;
        if (ok % 30 === 0) console.log(`  ${ok} migrados…`);
      } catch (err) {
        fallos.push(`${slug}: ${err.message}`);
      }
    })
  );
}

console.log(`\nMigrados: ${ok} · Fallos: ${fallos.length}`);
fallos.forEach((f) => console.log('  ✗ ' + f));
if (fallos.length) process.exitCode = 1;
