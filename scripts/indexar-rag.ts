/**
 * Indexa el contenido del sitio y los PDFs de /documentos/ para el chatbot.
 *
 *   node --experimental-strip-types scripts/indexar-rag.ts --seco
 *     → solo cuenta trozos (sin llamar a ninguna API)
 *
 *   DEEPINFRA_API_KEY=… CF_ACCOUNT_ID=… CF_API_TOKEN=… \
 *   node --experimental-strip-types scripts/indexar-rag.ts
 *     → embeddings en DeepInfra (bge-m3) + upsert en Cloudflare Vectorize
 *
 * Correr después de agregar documentos o páginas. Los ids son estables, así
 * que volver a correrlo sobrescribe en lugar de duplicar.
 * ponytail: los trozos de documentos BORRADOS quedan en el índice. Si se
 * eliminan documentos, borrar el índice en el dashboard y volver a correr
 * (~3 min, ~$0,03).
 *
 * Requiere `pdftotext` (poppler-utils). PDFs escaneados sin texto se saltan.
 * Check: node --experimental-strip-types scripts/probar-rag.ts
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const INDICE = 'doctorado-rag';
export const MODELO_EMBEDDINGS = 'BAAI/bge-m3'; // 1024 dimensiones
const DIMENSIONES = 1024;
// ~600 tokens por trozo. Con 1024 dim el plan gratis de Vectorize guarda
// ~4.880 vectores (5 M de dimensiones): este tamaño deja el corpus por debajo.
const MAX = 2400;
const SOLAPE = 300;

// ── Funciones puras (cubiertas por scripts/probar-rag.ts) ──────────────────

export type Trozo = { texto: string; inicio: number };

/** Parte en trozos de ≤ max caracteres por palabras completas, con solape.
 *  `inicio` es el desplazamiento en el texto ORIGINAL (para ubicar la página). */
export function trocear(texto: string, max = MAX, solape = SOLAPE): Trozo[] {
  const palabras = [...texto.matchAll(/\S+/g)].map((m) => ({
    p: m[0].slice(0, max),
    i: m.index!,
  }));
  const trozos: Trozo[] = [];
  let a = 0;
  while (a < palabras.length) {
    let b = a;
    let largo = palabras[a].p.length;
    while (b + 1 < palabras.length && largo + 1 + palabras[b + 1].p.length <= max) {
      b++;
      largo += 1 + palabras[b].p.length;
    }
    trozos.push({
      texto: palabras.slice(a, b + 1).map((w) => w.p).join(' '),
      inicio: palabras[a].i,
    });
    if (b + 1 >= palabras.length) break;
    // Retroceder desde el final hasta cubrir ~solape caracteres, sin volver a `a`
    let c = b + 1;
    let atras = 0;
    while (c - 1 > a && atras + palabras[c - 1].p.length + 1 <= solape) {
      c--;
      atras += palabras[c].p.length + 1;
    }
    a = c;
  }
  return trozos;
}

/** Página (1-based) de un desplazamiento en la salida de pdftotext (\f = salto). */
export function paginaDe(texto: string, desplazamiento: number): number {
  let n = 1;
  for (let i = 0; i < desplazamiento; i++) if (texto[i] === '\f') n++;
  return n;
}

/** Ruta de documento → texto del enlace que la nombra en el contenido. */
export function titulosDeDocumentos(markdown: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const [, texto, ruta] of markdown.matchAll(/\[([^\]]+)\]\((\/documentos\/[^)\s]+)\)/g)) {
    let limpia = ruta;
    try {
      limpia = decodeURIComponent(ruta);
    } catch {}
    mapa.set(limpia, texto.replace(/[*_`]/g, '').trim());
  }
  return mapa;
}

/** Perfil JSON → líneas "clave: valor", sin URLs, rutas ni claves vacías. */
export function aplanar(obj: Record<string, unknown>): string {
  const lineas: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (v.trim() && !/^(https?:|\/)/.test(v)) lineas.push(`${k}: ${v}`);
    } else if (Array.isArray(v)) {
      const nombres = v
        .map((e) => (typeof e === 'string' ? e : (e as { nombre?: string })?.nombre))
        .filter(Boolean);
      if (nombres.length) lineas.push(`${k}: ${nombres.join(', ')}`);
    } else if (v && typeof v === 'object') {
      const sub = aplanar(v as Record<string, unknown>);
      if (sub) lineas.push(sub);
    } else if (v != null) {
      lineas.push(`${k}: ${v}`);
    }
  }
  return lineas.join('\n');
}

/** Id estable por (url, n.º de trozo); sha1 hex = 40 bytes < 64 de Vectorize. */
export function idDe(url: string, n: number): string {
  return createHash('sha1').update(`${url}#${n}`).digest('hex');
}

// ── Recolección ─────────────────────────────────────────────────────────────

type Fuente = { url: string; titulo: string; texto: string; pdf?: boolean };

const CONTENIDO = 'src/content';
const DOCUMENTOS = 'public/documentos';

const archivos = (dir: string, re: RegExp): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && re.test(e.name))
    .map((e) => path.join(e.parentPath, e.name));

/** Markdown/MDX → texto: sin frontmatter, imports, etiquetas ni URLs de enlaces. */
function textoDeMarkdown(crudo: string): { titulo: string; cuerpo: string } {
  const fm = crudo.match(/^---\n([\s\S]*?)\n---\n?/);
  const titulo = fm?.[1].match(/^title:\s*['"]?(.*?)['"]?\s*$/m)?.[1] ?? '';
  const cuerpo = crudo
    .slice(fm?.[0].length ?? 0)
    .replace(/^import .*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  return { titulo, cuerpo };
}

function recolectar(): { fuentes: Fuente[]; escaneados: string[] } {
  const fuentes: Fuente[] = [];
  const titulos = new Map<string, string>();

  for (const f of archivos(`${CONTENIDO}/paginas`, /\.mdx?$/)) {
    const crudo = readFileSync(f, 'utf8');
    for (const [r, t] of titulosDeDocumentos(crudo)) titulos.set(r, t);
    const { titulo, cuerpo } = textoDeMarkdown(crudo);
    fuentes.push({ url: `/${path.parse(f).name}/`, titulo, texto: `${titulo}\n${cuerpo}` });
  }

  for (const f of archivos(`${CONTENIDO}/noticias`, /\.md$/)) {
    const crudo = readFileSync(f, 'utf8');
    for (const [r, t] of titulosDeDocumentos(crudo)) titulos.set(r, t);
    const { titulo, cuerpo } = textoDeMarkdown(crudo);
    fuentes.push({ url: `/noticias/${path.parse(f).name}/`, titulo, texto: `${titulo}\n${cuerpo}` });
  }

  const perfiles = { docentes: 'Docente', grupos: 'Grupo de investigación', estudiantes: 'Estudiante' };
  for (const [col, etiqueta] of Object.entries(perfiles)) {
    for (const f of archivos(`${CONTENIDO}/${col}`, /\.json$/)) {
      const json = JSON.parse(readFileSync(f, 'utf8'));
      const titulo = `${etiqueta}: ${json.nombre}`;
      fuentes.push({ url: `/${path.parse(f).name}/`, titulo, texto: `${titulo}\n${aplanar(json)}` });
    }
  }

  // ponytail: solo PDF; .docx/.xlsx (formatos para llenar) no se indexan
  const escaneados: string[] = [];
  const vistos = new Set<string>();
  for (const f of archivos(DOCUMENTOS, /\.pdf$/i).sort()) {
    const ruta = '/' + path.relative('public', f).split(path.sep).join('/');
    let texto = '';
    try {
      texto = execFileSync('pdftotext', ['-q', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
    } catch {}
    if (texto.replace(/\s/g, '').length < 200) {
      escaneados.push(ruta);
      continue;
    }
    // El WP tiene el mismo PDF subido varias veces (sufijos -1, -2…)
    const huella = createHash('sha1').update(texto).digest('hex');
    if (vistos.has(huella)) continue;
    vistos.add(huella);
    const titulo = titulos.get(ruta) ?? path.parse(f).name.replace(/[-_]+/g, ' ');
    fuentes.push({ url: encodeURI(ruta), titulo, texto, pdf: true });
  }
  return { fuentes, escaneados };
}

// ── APIs ────────────────────────────────────────────────────────────────────

type Vector = { id: string; values: number[]; metadata: Record<string, string> };

// Reintenta 429, 5xx y cortes de red (ECONNRESET), que también llegan a mitad
// de la respuesta: por eso el cuerpo se lee dentro del reintento.
export async function pedir(url: string, init: RequestInit): Promise<any> {
  for (let intento = 1; ; intento++) {
    const r = await fetch(url, init)
      .then(async (res) => ({ status: res.status, texto: await res.text() }))
      .catch((e: Error) => ({ status: 0, texto: String(e.cause ?? e) }));
    if (r.status >= 200 && r.status < 300) return JSON.parse(r.texto);
    const pasajero = r.status === 0 || r.status === 429 || r.status >= 500;
    if (!pasajero || intento === 5) throw new Error(`${url} → ${r.status || 'red'}: ${r.texto}`);
    await new Promise((listo) => setTimeout(listo, 2000 * intento));
  }
}

async function embeddings(textos: string[], clave: string): Promise<number[][]> {
  const json: { data: { embedding: number[] }[] } = await pedir('https://api.deepinfra.com/v1/openai/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: textos, encoding_format: 'float' }),
  });
  return json.data.map((d) => d.embedding);
}

async function main() {
  const seco = process.argv.includes('--seco');
  const { DEEPINFRA_API_KEY: di, CF_ACCOUNT_ID: cuenta, CF_API_TOKEN: token } = process.env;
  // Antes de leer los PDFs (~40 s): sin claves no tiene sentido esperar
  if (!seco && (!di || !cuenta || !token)) throw new Error('Faltan DEEPINFRA_API_KEY, CF_ACCOUNT_ID o CF_API_TOKEN');
  const { fuentes, escaneados } = recolectar();

  const trozos = fuentes.flatMap((f) =>
    trocear(f.texto).map((t, n) => ({
      id: idDe(f.url, n),
      url: f.pdf ? `${f.url}#page=${paginaDe(f.texto, t.inicio)}` : f.url,
      titulo: f.titulo,
      texto: t.texto,
    }))
  );

  const pdfs = fuentes.filter((f) => f.pdf).length;
  console.log(
    `Fuentes: ${fuentes.length} (${pdfs} PDFs, ${escaneados.length} escaneados sin texto saltados)\n` +
      `Trozos: ${trozos.length} → ${(trozos.length * DIMENSIONES / 1e6).toFixed(2)} M dimensiones ` +
      `(gratis hasta 5 M)`
  );
  if (seco) return;

  const cf = `https://api.cloudflare.com/client/v4/accounts/${cuenta}/vectorize/v2/indexes`;
  const auth = { Authorization: `Bearer ${token}` };

  // Crear el índice la primera vez
  if ((await fetch(`${cf}/${INDICE}`, { headers: auth })).status === 404) {
    const res = await fetch(cf, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: INDICE, config: { dimensions: DIMENSIONES, metric: 'cosine' } }),
    });
    if (!res.ok) throw new Error(`Crear índice ${res.status}: ${await res.text()}`);
    console.log(`Índice ${INDICE} creado`);
  }

  // Embeddings en lotes de 64, upsert en lotes de 1000 (tope HTTP: 5000)
  let pendientes: Vector[] = [];
  const subir = async () => {
    const ndjson = pendientes.map((v) => JSON.stringify(v)).join('\n');
    await pedir(`${cf}/${INDICE}/upsert`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/x-ndjson' },
      body: ndjson,
    });
    pendientes = [];
  };

  for (let i = 0; i < trozos.length; i += 64) {
    const lote = trozos.slice(i, i + 64);
    // El título va dentro del texto embebido: da contexto a trozos sueltos
    const vectores = await embeddings(lote.map((t) => `${t.titulo}\n${t.texto}`), di);
    lote.forEach((t, j) =>
      pendientes.push({ id: t.id, values: vectores[j], metadata: { url: t.url, titulo: t.titulo, texto: t.texto } })
    );
    if (pendientes.length >= 1000) await subir();
    process.stdout.write(`\r${Math.min(i + 64, trozos.length)}/${trozos.length}`);
  }
  if (pendientes.length) await subir();
  console.log('\nListo.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
