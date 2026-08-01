#!/usr/bin/env node
/**
 * Extrae el contenido de una página del WordPress actual para migrarla a Markdown.
 *
 * Uso:
 *   node scripts/wp-fetch.mjs <slug>          → TITLE/LINK/MODIFIED + texto plano
 *   node scripts/wp-fetch.mjs <slug> --html   → HTML crudo del contenido (tablas, estructura)
 *   node scripts/wp-fetch.mjs <slug> --raw    → content.rendered completo SIN quitar <script>
 *                                               (varias páginas guardan el contenido de sus
 *                                               pestañas dentro de JS tipo cambiarContenido)
 */

const slug = process.argv[2];
const wantHtml = process.argv.includes('--html');
const wantRaw = process.argv.includes('--raw');

if (!slug) {
  console.error('Uso: node scripts/wp-fetch.mjs <slug> [--html]');
  process.exit(1);
}

const API = 'https://doctoradoingenieria.udistrital.edu.co/wp-json/wp/v2';
const FIELDS = '_fields=title,content,link,modified';

async function fetchFrom(type) {
  const res = await fetch(`${API}/${type}?slug=${encodeURIComponent(slug)}&${FIELDS}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

// La mayoría son páginas; algunas convocatorias pueden ser posts
const page = (await fetchFrom('pages')) ?? (await fetchFrom('posts'));

if (!page) {
  console.error(`No existe página ni post con slug "${slug}"`);
  process.exit(2);
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

if (wantRaw) {
  console.log(page.content.rendered);
  process.exit(0);
}

const html = page.content.rendered
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

if (wantHtml) {
  console.log(html);
  process.exit(0);
}

const text = decode(
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>/gi, ' [LINK:$1] ')
    .replace(/<[^>]+>/g, ' ')
)
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

console.log(`TITLE: ${decode(page.title.rendered)}`);
console.log(`LINK: ${page.link}`);
console.log(`MODIFIED: ${page.modified.slice(0, 10)}`);
console.log('');
console.log(text);
