// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

/**
 * Marca en build las <ul> del Markdown compuestas solo por enlaces
 * (formatos, grupos, solicitudes…) con la clase `link-list`, que global.css
 * presenta como filas con flecha diagonal en vez de viñetas.
 */
function rehypeLinkLists() {
  const significant = (c) => !(c.type === 'text' && !c.value.trim());
  const isLinkItem = (li) => {
    let kids = (li.children ?? []).filter(significant);
    // Listas "sueltas" de Markdown: el enlace queda envuelto en un <p>
    if (kids.length === 1 && kids[0].tagName === 'p') kids = kids[0].children.filter(significant);
    return kids.length === 1 && kids[0].tagName === 'a';
  };
  const hasAnchor = (n) => n.tagName === 'a' || (n.children ?? []).some(hasAnchor);
  // Ítem de texto plano (p. ej. la nota de un enlace roto): se admite como
  // fila-nota siempre que no contenga enlaces ni sublistas
  const isNoteItem = (li) =>
    !hasAnchor(li) && !(li.children ?? []).some((c) => c.tagName === 'ul' || c.tagName === 'ol');
  const addClass = (node, cls) => {
    node.properties ??= {};
    node.properties.className = [...(node.properties.className ?? []), cls];
  };
  const walk = (node) => {
    const items = (node.children ?? []).filter((c) => c.tagName === 'li');
    if (
      node.tagName === 'ul' &&
      items.length > 0 &&
      items.every((li) => isLinkItem(li) || isNoteItem(li)) &&
      items.filter(isLinkItem).length >= items.length / 2
    ) {
      addClass(node, 'link-list');
      items.filter(isNoteItem).forEach((li) => addClass(li, 'link-list-note'));
    }
    (node.children ?? []).forEach(walk);
  };
  return (tree) => walk(tree);
}

/**
 * Tablas de definición: tablas de exactamente 2 columnas con etiquetas cortas
 * en la primera celda (fichas del programa migradas de WP). Se marcan con
 * `def-table` y el CSS las presenta como filas etiqueta/valor sin rejilla.
 */
function rehypeDefTables() {
  const text = (n) =>
    n.type === 'text' ? n.value : (n.children ?? []).map(text).join('');
  const walk = (node) => {
    if (node.tagName === 'table') {
      const rows = [];
      const collect = (n) => {
        if (n.tagName === 'tr') rows.push(n);
        else (n.children ?? []).forEach(collect);
      };
      collect(node);
      const body = rows.filter((r) => (r.children ?? []).some((c) => c.tagName === 'td'));
      const twoCol = (r) =>
        (r.children ?? []).filter((c) => c.tagName === 'td' || c.tagName === 'th').length === 2;
      const shortLabel = (r) => {
        const first = (r.children ?? []).find((c) => c.tagName === 'td' || c.tagName === 'th');
        return first && text(first).trim().length <= 60;
      };
      const cols = (r) =>
        (r.children ?? []).filter((c) => c.tagName === 'td' || c.tagName === 'th').length;
      if (body.length >= 3 && rows.every(twoCol) && body.every(shortLabel)) {
        node.properties ??= {};
        node.properties.className = [...(node.properties.className ?? []), 'def-table'];
      } else if (rows.length > 0 && Math.max(...rows.map(cols)) >= 3) {
        // Tabla ancha: el layout de la página le cede el riel derecho
        node.properties ??= {};
        node.properties.className = [...(node.properties.className ?? []), 'table-wide'];
      }
    }
    (node.children ?? []).forEach(walk);
  };
  return (tree) => walk(tree);
}

/**
 * Páginas de preguntas frecuentes: cuando un documento tiene 3 o más H2 que
 * empiezan con "¿", cada pregunta y su contenido se convierten en un
 * <details class="faq"> — acordeón nativo, sin JS.
 */
function rehypeFaqAccordions() {
  const text = (n) =>
    n.type === 'text' ? n.value : (n.children ?? []).map(text).join('');
  const isQuestion = (n) => n.tagName === 'h2' && text(n).trim().startsWith('¿');
  return (tree) => {
    const kids = tree.children ?? [];
    if (kids.filter(isQuestion).length < 3) return;
    const out = [];
    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (!isQuestion(node)) {
        out.push(node);
        continue;
      }
      const body = [];
      while (i + 1 < kids.length && kids[i + 1].tagName !== 'h2') {
        body.push(kids[++i]);
      }
      out.push({
        type: 'element',
        tagName: 'details',
        properties: { className: ['faq'] },
        children: [
          {
            type: 'element',
            tagName: 'summary',
            properties: {},
            children: node.children,
          },
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['faq-body'] },
            children: body,
          },
        ],
      });
    }
    tree.children = out;
  };
}

/**
 * Los enlaces a documentos (PDF, Office, ZIP o cualquier ruta /documentos/)
 * abren en pestaña nueva: el lector no pierde la página donde estaba.
 */
function rehypeDocLinksNewTab() {
  const esDocumento = (href) =>
    typeof href === 'string' &&
    (href.startsWith('/documentos/') || /\.(pdf|docx?|xlsx?|pptx?|zip|rar)([?#]|$)/i.test(href));
  const walk = (node) => {
    if (node.tagName === 'a' && esDocumento(node.properties?.href)) {
      node.properties.target = '_blank';
      node.properties.rel = 'noopener';
    }
    (node.children ?? []).forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: 'https://doctoradoingenieria.udistrital.edu.co',
  // Paridad exacta de URLs con el sitio WordPress actual
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    rehypePlugins: [rehypeLinkLists, rehypeDefTables, rehypeFaqAccordions, rehypeDocLinksNewTab],
  },
});
