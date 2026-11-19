/**
 * Markdown mínimo para las respuestas del chatbot: párrafos, listas, negrita,
 * títulos (como negrita) y enlaces. Todo se escapa ANTES de dar formato, así
 * que el texto del modelo nunca inyecta HTML. Enlaces: solo rutas del sitio o
 * https. Check: scripts/probar-rag.ts
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const enLinea = (s: string) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (todo, texto: string, url: string) => {
      if (/^\/(?!\/)/.test(url)) return `<a href="${url}">${texto}</a>`;
      if (url.startsWith('https://')) return `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;
      return todo;
    });

export function mdChat(texto: string): string {
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
      html += `<li>${enLinea(item[1])}</li>`;
    } else if (!linea.trim()) {
      cerrarParrafo();
      cerrarLista();
    } else {
      cerrarLista();
      const titulo = linea.match(/^#{1,4}\s+(.*)$/);
      parrafo.push(titulo ? `<strong>${enLinea(titulo[1])}</strong>` : enLinea(linea));
    }
  }
  cerrarParrafo();
  cerrarLista();
  return html;
}
