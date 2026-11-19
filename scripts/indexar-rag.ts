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
 * Incremental: cada id es la huella de su trozo, así que solo embebe lo nuevo
 * o cambiado y borra lo que ya no existe (documentos borrados o editados).
 * Lo corre el pipeline en cada push a main que toque contenido o documentos
 * (.github/workflows/indexar-rag.yml); a mano solo hace falta para probar.
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

/** Markdown → grupos de secciones (## …) enteras de hasta `max` caracteres. Así
 *  una lista no queda partida entre dos trozos. Agrupar las chicas mantiene el
 *  número de trozos (y el tope gratis de Vectorize) igual que antes. */
export function porSecciones(texto: string, max = MAX): string[] {
  const grupos: string[] = [];
  let actual = '';
  for (const seccion of texto.split(/\n(?=#{1,4} )/)) {
    if (actual && actual.length + 1 + seccion.length > max) {
      grupos.push(actual);
      actual = seccion;
    } else actual = actual ? `${actual}\n${seccion}` : seccion;
  }
  if (actual.trim()) grupos.push(actual);
  return grupos;
}

/** Id = huella del contenido: si el trozo cambia, cambia el id. Así el índice
 *  mismo dice qué falta, sin archivo de estado. sha1 hex = 40 bytes < 64. */
export function idDe(t: { url: string; titulo: string; texto: string }): string {
  return createHash('sha1').update(`${t.url}\n${t.titulo}\n${t.texto}`).digest('hex');
}

/** Qué embeber (lo que el índice no tiene) y qué borrar (lo que ya no existe). */
export function diferencia<T extends { id: string }>(actuales: T[], enIndice: string[]) {
  const ya = new Set(enIndice);
  const vigentes = new Set(actuales.map((t) => t.id));
  return { subir: actuales.filter((t) => !ya.has(t.id)), borrar: enIndice.filter((id) => !vigentes.has(id)) };
}

// ── Recolección ─────────────────────────────────────────────────────────────

type Fuente = { url: string; titulo: string; texto: string; pdf?: boolean };

const CONTENIDO = 'src/content';
const DOCUMENTOS = 'public/documentos';

// Ordenados: readdirSync no garantiza orden y de él dependen los títulos y qué
// copia de un PDF repetido se queda. Sin orden, cada máquina daría otros ids.
const archivos = (dir: string, re: RegExp): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && re.test(e.name))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();

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
    for (const s of porSecciones(cuerpo.trim())) fuentes.push({ url: `/${path.parse(f).name}/`, titulo, texto: `${titulo}\n${s}` });
  }

  for (const f of archivos(`${CONTENIDO}/noticias`, /\.md$/)) {
    const crudo = readFileSync(f, 'utf8');
    for (const [r, t] of titulosDeDocumentos(crudo)) titulos.set(r, t);
    const { titulo, cuerpo } = textoDeMarkdown(crudo);
    for (const s of porSecciones(cuerpo.trim())) fuentes.push({ url: `/noticias/${path.parse(f).name}/`, titulo, texto: `${titulo}\n${s}` });
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
  for (const f of archivos(DOCUMENTOS, /\.pdf$/i)) {
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
    trocear(f.texto).map((t) => {
      const trozo = { url: f.pdf ? `${f.url}#page=${paginaDe(f.texto, t.inicio)}` : f.url, titulo: f.titulo, texto: t.texto };
      return { id: idDe(trozo), ...trozo };
    })
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

  // Ids que ya tiene el índice (páginas de hasta 1000)
  const enIndice: string[] = [];
  for (let cursor = ''; ; ) {
    const { result } = await pedir(`${cf}/${INDICE}/list?count=1000${cursor && `&cursor=${encodeURIComponent(cursor)}`}`, { headers: auth });
    enIndice.push(...result.vectors.map((v: { id: string }) => v.id));
    if (!result.isTruncated) break;
    cursor = result.nextCursor;
  }
  const { subir: nuevos, borrar } = diferencia(trozos, enIndice);
  console.log(`En el índice: ${enIndice.length} · nuevos o cambiados: ${nuevos.length} · a borrar: ${borrar.length}`);

  // Borrar primero: viejos + nuevos juntos pueden pasar el tope gratis de 5 M
  // Tope de la API: 100 ids por petición (error 40007 con más)
  for (let i = 0; i < borrar.length; i += 100) {
    await pedir(`${cf}/${INDICE}/delete_by_ids`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: borrar.slice(i, i + 100) }),
    });
  }
  if (borrar.length) console.log(`Borrados ${borrar.length}; esperando a que Vectorize los aplique…`);
  // Vectorize aplica los borrados en segundo plano: esperar a que cuenten
  const meta = enIndice.length - borrar.length;
  for (let s = 0; borrar.length && s < 300; s += 5) {
    const { result } = await pedir(`${cf}/${INDICE}/info`, { headers: auth });
    if (result.vectorCount <= meta) break;
    await new Promise((listo) => setTimeout(listo, 5000));
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

  for (let i = 0; i < nuevos.length; i += 64) {
    const lote = nuevos.slice(i, i + 64);
    // El título va dentro del texto embebido: da contexto a trozos sueltos
    const vectores = await embeddings(lote.map((t) => `${t.titulo}\n${t.texto}`), di!);
    lote.forEach((t, j) =>
      pendientes.push({ id: t.id, values: vectores[j], metadata: { url: t.url, titulo: t.titulo, texto: t.texto } })
    );
    if (pendientes.length >= 1000) await subir();
    // Sin \r: en el log del pipeline cada avance queda en su línea
    if (pendientes.length === 0 || i + 64 >= nuevos.length) console.log(`${Math.min(i + 64, nuevos.length)}/${nuevos.length}`);
  }
  if (pendientes.length) await subir();
  console.log('Listo.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
