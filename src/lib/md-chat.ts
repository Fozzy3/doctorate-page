/**
 * Markdown mínimo para las respuestas del chatbot: párrafos, listas, negrita,
 * títulos (como negrita) y enlaces. Todo se escapa ANTES de dar formato, así
 * que el texto del modelo nunca inyecta HTML. Enlaces: solo rutas del sitio que
 * vinieron en los fragmentos (`urls`); el modelo inventa URLs aunque se le
 * prohíba, así que lo demás queda como texto. Check: scripts/probar-rag.ts
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sinPagina = (url: string) => url.split('#')[0];
// Último tramo de la ruta: "equipo-de-trabajo", "Acta.pdf"
const tramo = (url: string) => sinPagina(url).replace(/^[a-z]+:\/\//i, '').split('/').filter(Boolean).pop() ?? '';
const delSitio = (url: string) => /^\/(?!\/)/.test(url);

const enLinea = (s: string, permitidas: Set<string>, porTramo: Map<string, string>) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, etiqueta: string, url: string) => {
      // El modelo a veces copia el encabezado del fragmento: "Título — /ruta/"
      const texto = etiqueta.replace(/\s+—\s+\/\S*$/, '');
      if (delSitio(url) && permitidas.has(sinPagina(url))) return `<a href="${url}">${texto}</a>`;
      // El modelo acierta el nombre y estropea la dirección: se enlaza la fuente real
      const real = porTramo.get(tramo(url));
      return real ? `<a href="${real}">${texto}</a>` : texto;
    });

export function mdChat(texto: string, urls: string[] = []): string {
  // Escapadas, porque se comparan contra el texto ya escapado. Solo rutas del
  // sitio: el href reparado sale de aquí, nunca del texto del modelo
  const propias = urls.map(esc).filter(delSitio);
  const permitidas = new Set(propias.map(sinPagina));
  const porTramo = new Map(propias.map((u) => [tramo(u), u]));
  let html = '';
  let lista: 'ul' | 'ol' | null = null;
  let parrafo: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length) html += `<p>${parrafo.join('<br>')}</p>`;
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista) html += `</${lista}>`;
    lista = null;
  };

  for (const linea of texto.split('\n')) {
    const vineta = linea.match(/^\s*[-*•]\s+(.*)$/);
    const numero = linea.match(/^\s*\d+[.)]\s+(.*)$/);
    const item = vineta ?? numero;
    if (item) {
      const tipo = vineta ? 'ul' : 'ol';
      cerrarParrafo();
      if (lista !== tipo) {
        cerrarLista();
        html += `<${tipo}>`;
        lista = tipo;
      }
      html += `<li>${enLinea(item[1], permitidas, porTramo)}</li>`;
    } else if (!linea.trim()) {
      cerrarParrafo();
      cerrarLista();
    } else {
      cerrarLista();
      const titulo = linea.match(/^#{1,4}\s+(.*)$/);
      parrafo.push(titulo ? `<strong>${enLinea(titulo[1], permitidas, porTramo)}</strong>` : enLinea(linea, permitidas, porTramo));
    }
  }
  cerrarParrafo();
  cerrarLista();
  return html;
}
