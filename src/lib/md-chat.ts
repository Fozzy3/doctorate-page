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

const enLinea = (s: string, permitidas: Set<string>) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, texto: string, url: string) =>
      /^\/(?!\/)/.test(url) && permitidas.has(sinPagina(url)) ? `<a href="${url}">${texto}</a>` : texto
    );

export function mdChat(texto: string, urls: string[] = []): string {
  // Escapadas, porque se comparan contra el texto ya escapado
  const permitidas = new Set(urls.map((u) => esc(sinPagina(u))));
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
      html += `<li>${enLinea(item[1], permitidas)}</li>`;
    } else if (!linea.trim()) {
      cerrarParrafo();
      cerrarLista();
    } else {
      cerrarLista();
      const titulo = linea.match(/^#{1,4}\s+(.*)$/);
      parrafo.push(titulo ? `<strong>${enLinea(titulo[1], permitidas)}</strong>` : enLinea(linea, permitidas));
    }
  }
  cerrarParrafo();
  cerrarLista();
  return html;
}
