# Design

Lenguaje visual tipo "gran universidad norteamericana" (referencia: cmu.edu) con identidad propia del Doctorado en Ingeniería UD.

## Color

Estrategia **committed**: el carmesí carga la identidad en bandas estructurales (topbar, footer, CTA, subrayados); el cuerpo de página es blanco con tinta gris-azulada. OKLCH en todos los tokens.

| Token | Valor | Uso |
|---|---|---|
| `--c-crimson` | `oklch(0.44 0.16 18)` | Identidad: enlaces, énfasis, bandas |
| `--c-crimson-dark` | `oklch(0.34 0.13 18)` | Hover, footer, topbar |
| `--c-crimson-soft` | `oklch(0.96 0.02 18)` | Fondos tenues de resalte |
| `--c-ink` | `oklch(0.22 0.015 260)` | Texto principal, headings |
| `--c-ink-soft` | `oklch(0.42 0.015 260)` | Texto secundario (≥4.5:1 sobre blanco) |
| `--c-bg` | `oklch(0.995 0 0)` | Fondo del documento |
| `--c-surface` | `oklch(0.965 0.003 260)` | Secciones alternas, sidebar |
| `--c-line` | `oklch(0.88 0.005 260)` | Bordes y reglas |

Nunca: gradientes decorativos, glassmorphism, side-stripes de color.

## Typography

Par en eje de contraste sans/serif, ambos self-hosted vía @fontsource:

- **Libre Franklin** (variable): headings de artículo, nav, labels, cifras. Franklin Gothic = gravitas institucional americana. Headings en 700–800, tracking -0.01em a -0.02em.
- **Source Serif 4** (variable): cuerpo de prosa en páginas de contenido (400/600) **y display serif** vía la utilidad `.display` (600): titulares de secciones mayores de la portada, título del mega-menú y cabeceras editoriales. Las fechas de noticias van en serif itálica.
- UI corta (botones, breadcrumbs, metadata): Libre Franklin 500/600.

Escala modular ~1.25, fluida con clamp(). H1 de página: clamp(2rem, 4vw, 3rem). Hero display: clamp(2.5rem, 6vw, 4.5rem). Prosa a 70ch máx, `text-wrap: balance` en headings, `pretty` en prosa.

## Layout

- Contenedor: 1320px máx, gutter clamp(1rem, 4vw, 2.5rem).
- La medida de lectura (70ch) se aplica por bloque (`.prose :is(p, ol, ul, blockquote)`), no al contenedor: listas de enlaces y reglas de headings usan todo el ancho de la columna.
- Páginas de contenido: banda de cabecera surface de lado a lado (breadcrumbs + H1 display serif + actualizado en serif itálica), luego grid de 2 columnas: columna lateral única de 290px (menú de sección + contacto del programa + trámites frecuentes, sticky) y el contenido extendido en el resto. Bajo 860px el subnav colapsa a `<details>` y contacto/trámites se ocultan (los cubren el footer y la banda CTA).
- Detalle de noticia: artículo (máx 820px) + riel "Más noticias" 300px sticky; bajo 1100px el riel pasa debajo del artículo.
- Home: hero full-bleed con imagen real y overlay de tinta (no gradiente de marca), secciones de ancho completo alternando bg/surface, ritmo de espaciado variable (clamp(4rem, 8vw, 7rem) entre secciones mayores).
- Páginas de contenido: grid sidebar (260px subnav "En esta sección") + prosa. Breadcrumbs arriba. En móvil el subnav colapsa a `<details>`.
- Z-scale semántica: `--z-dropdown: 10; --z-sticky: 20; --z-drawer: 30; --z-modal: 40`.

## Components

- **Topbar**: banda crimson-dark delgada; enlaces a udistrital.edu.co, Noticias, Contacto, correo institucional.
- **Header**: blanco, sticky; wordmark dos líneas (programa fuerte / universidad pequeña). Al extremo derecho, bloque carmesí de Buscar (icono + texto; solo-icono bajo 1320px) — sin botón de Admisiones (ese destino vive en el nav, el hero y las bandas CTA). Móvil: drawer. La versión "amplia" del header entra desde 1700px (entre 1440 y 1700 no cabe).
- **Mega-menú**: panel de tinta (`--c-ink`) de ancho completo bajo el header; grid 230px + enlaces en 2 columnas con reglas inferiores + tarjeta destacada blanca (imagen 16:9 de la sección y primer destino con flecha ↗). Título de sección en display serif blanco. Abre por hover o `aria-expanded`; Escape cierra.
- **Banda de énfasis**: composición asimétrica — banda de tinta retranqueada verticalmente (`inset clamp(3rem,7vw,5.5rem) 0`), paneles blancos y fotos 16:9 superpuestos en un grid de 12 columnas, filas alternadas. En móvil la foto va primero y el panel monta sobre ella (-2.5rem).
- **NewsSpotlight**: historia principal grande (imagen 16:9, titular subrayado por defecto con línea gris que pasa a crimson al hover, dek serif) + riel lateral de titulares con miniaturas 3:2 y reglas. Portada y /noticias/.
- **Flechas diagonales ↗**: enlaces de acción tipo lista (trámites, tarjetas destacadas) llevan flecha ↗ crimson que se traslada 2-3px en diagonal al hover.
- **Hero**: imagen/video full-bleed, headline display blanco sobre overlay ink 55–70%, hasta 2 CTAs (primario crimson sólido, secundario outline blanco).
- **Banda de cifras**: números Libre Franklin 800 en crimson sobre surface, separados por reglas verticales — sin cards, sin iconos.
- **NewsCard**: imagen 16:9, fecha como metadata, título que subraya en hover. Grid auto-fit minmax(280px,1fr). Solo para el archivo de noticias más allá de las 3 destacadas.
- **Perfil de docente** (colección `docentes`, JSON generado por `scripts/fetch-docentes.mjs` desde el WP): hero con nombre display serif y énfasis en itálica; grid 320px + contenido — foto con ficha (estado/correo/grupo) sticky a la izquierda; redes académicas como botones outline (CvLAC, Google Scholar, ORCID, Scopus, ResearchGate); tesis doctoral citada en serif con director; estudiantes dirigidos en columnas (Activos/Codirigidos/Egresados) con reglas finas. Nombres de estudiantes solo se enlazan si su ruta existe en el sitio; los grupos enlazan al WP mientras no estén migrados.
- **Página de grupo de investigación** (colección `grupos`, JSON generado por `scripts/fetch-grupos.mjs`): hero con sigla display serif y nombre completo en itálica; misma retícula del perfil de docente — logo + ficha (clasificación MinCiencias, director con enlace a su perfil, correo, actualizado) y descripción serif con botones (GrupLAC primario, convocatoria y otros enlaces outline). Los perfiles de docentes enlazan a estas páginas automáticamente.
- **Formulario de contacto**: banda page-hero con dek serif; campos con borde fino, placeholder, hover que oscurece y foco con borde carmesí + anillo `--c-crimson-soft`; fila doble nombre/correo; tarjeta de datos sticky con filas de regla fina; botón primario con flecha ↗.
- **Noticia (detalle)**: fecha serif itálica, H1 clamp(2rem,4.5vw,3.1rem), dek gris grande desde `description`, fila de compartir (Facebook/X/LinkedIn/correo/imprimir, cuadrados 2.5rem surface→crimson) y enlace "Contacto del programa". `@media print` oculta compartir y migas.
- **CTA band**: crimson sólido, headline blanco, un botón.
- **Footer**: ink casi negro; 4 columnas de enlaces + columna institucional (escudo, dirección, SNIES), línea legal.
- **Prose**: estilos tipográficos para Markdown (tablas con bordes finos, blockquote con regla, enlaces crimson subrayados).
- **link-list**: las `<ul>` del Markdown compuestas solo por enlaces se marcan en build (plugin `rehypeLinkLists` en astro.config.mjs) y se presentan como filas sans con flecha ↗ y reglas, en columnas auto-fill 300px. Ítems de texto sin enlace dentro de esas listas quedan como fila-nota gris (`link-list-note`). Ojo: el content layer cachea el render; tras cambiar el plugin, `astro dev --force`.
- **def-table**: tablas de 2 columnas con etiquetas cortas (fichas migradas de WP) se marcan en build (`rehypeDefTables`) y se presentan como filas etiqueta/valor — etiqueta sans gris 220px, valor serif, regla superior crimson, sin rejilla, cabecera oculta. En móvil apilan.
- **faq**: páginas con ≥3 H2 que empiezan con "¿" (`rehypeFaqAccordions`) convierten cada pregunta en `<details class="faq">` — acordeón nativo sin JS, summary sans 700 con "+" crimson que rota 45° al abrir.
- **Tablas normales**: sin rejilla vertical; reglas horizontales finas, cabecera con regla fuerte de tinta.
- **table-wide** (≥3 columnas, marcada en build por `rehypeDefTables`): zebra sutil con surface, primera columna en negrita, anchos mínimos por celda (nunca quiebre vertical, scroll interno en móvil). En plantilla documento, `.page-grid:has(table.table-wide)` oculta el riel derecho y el artículo toma su espacio — la regla vive en global.css porque Astro no compila `:global()` dentro de `:has()`.
- **Párrafo de entrada**: si la página abre con `<p>`, se renderiza como dek (1.1875rem).
- **Banda de cierre**: toda página de contenido termina con banda crimson full-bleed (titular display serif blanco + botón outline "Proceso de admisión" + enlace "Contáctenos ↗").
- **Lightbox de imágenes de contenido** (Base.astro): las imágenes dentro de `.prose` y la imagen principal de noticia se amplían en un `<dialog>` nativo (cursor zoom-in, Esc/clic/botón para cerrar, accesible por teclado). Excluidas: imágenes de diseño (dentro de bloques `.full`, cards, hero) e imágenes que ya son enlace. El `<img>` sin src del dialog es intencional — lo llena el script al abrir.

## Bloques (páginas panorama)

Sistema replicable para componer páginas de contenido con diseño de sección. Una página
se convierte en "escaparate" con dos pasos: frontmatter `plantilla: 'panorama'` y archivo
`.mdx` que importa bloques de `src/components/blocks/`:

```mdx
---
title: '...'
plantilla: 'panorama'
---
import BandaMedia from '../../components/blocks/BandaMedia.astro';
import Cifras from '../../components/blocks/Cifras.astro';

Texto normal en Markdown (columna centrada de 820px, headings centrados).

<Cifras items={[{ valor: '34', etiqueta: 'Grupos adscritos' }]} />
```

Catálogo:

- **`<Franja tono="surface|ink|crimson">`** — banda de lado a lado que envuelve Markdown; columna interior de 880px.
- **`<BandaMedia titulo imagen texto href cta invertir>`** — doble fondo: banda de tinta retranqueada + panel blanco (titular serif) + foto que la desborda. En móvil la foto va primero y el panel monta sobre ella.
- **`<Cifras items tono>`** — banda de cifras con conteo animado al entrar en pantalla (IntersectionObserver, respeta reduced-motion). Sin cards ni iconos.
- **`<CardGrid items>`** — tarjetas con foto 16:9, título con ↗, texto corto; auto-fit 280px. Con o sin `href`/`imagen`.
- **`<Destacado titulo texto href cta tono>`** — declaración centrada de gran formato con botón.

Reglas del lienzo panorama: hijos directos en columna centrada (820px), `h2/h3` centrados
con `text-wrap: balance`, tablas y link-lists a 880px, bloques `.full` de lado a lado con
`margin-block` clamp(2.75rem,6vw,4.5rem). Cabecera de página centrada (`hero-centrado`).
Páginas `documento` (grid subnav + riel) siguen siendo el default para trámites.

## Documentos

Los 427 archivos institucionales (PDF/DOCX/XLSX, ~476 MB) que vivían en
`/wp-content/uploads/` del WordPress ahora se sirven desde `/documentos/AAAA/MM/archivo`
(misma nomenclatura año/mes, sin el prefijo). Todos los enlaces del contenido ya apuntan
a la ruta nueva.

- Modelo de despliegue: CI/CD sin acceso directo al servidor → `public/documentos/` SÍ
  se versiona en git (el repo es la única fuente de verdad; ~500 MB, ningún archivo
  supera los 100 MB). El historial de git funciona además como historial documental.
- Flujo para agregar un documento: copiar a `public/documentos/AAAA/MM/`, enlazarlo en
  el Markdown como `/documentos/AAAA/MM/archivo.pdf`, commit y push — el CI publica todo.
- Nueva versión de un formato vivo: sobrescribir el mismo archivo (los enlaces no
  cambian). Documentos normativos (actas, resoluciones): nunca sobrescribir — archivo
  nuevo con nombre nuevo y actualizar el enlace.
- `scripts/fetch-uploads.mjs` fue el mecanismo de migración inicial desde el WP; ya no
  hace falta re-ejecutarlo salvo para auditar.
- Todo enlace a documento (ruta `/documentos/` o extensión PDF/Office/ZIP) abre en
  pestaña nueva con `rel="noopener"` — lo aplica en build `rehypeDocLinksNewTab`.
- En nginx, un redirect preserva los enlaces externos antiguos:
  `location ^~ /wp-content/uploads/ { rewrite ^/wp-content/uploads/(.*)$ /documentos/$1 permanent; }`
- Dos anexos de procesos-de-acreditacion están rotos también en el WP original y quedaron
  como texto con nota; el Anexo 17 tenía un typo `.pdff` que se corrigió.

## Imágenes

Banco temporal en `public/images/stock/` (Unsplash, 1600px): servidores, laboratorio,
electronica, estudiantes, campus, biblioteca, reunion, codigo. Reemplazar progresivamente
por fotografía real del programa; mantener los mismos nombres para no tocar contenido.

## Motion

Sobrio e intencional, con `prefers-reduced-motion` respetado en todo (el script de reveal ni
se activa; los hovers de escala/elevación se anulan):

- Hero de home: coreografía de entrada (headline + CTAs, 550ms ease-out-quint escalonado).
- Header: sombra al despegarse del tope (clase `despegado`); nav con subrayado carmesí que
  crece al hover/abrir; campo de búsqueda subrayado que se expande al enfocar y envía a
  `/buscar/?q=…` (la página dispara PagefindUI con el término).
- Mega-menú: fade + translate 180ms.
- Tarjetas (CardGrid, NewsCard, NewsSpotlight): elevación -4px + sombra + zoom 1.04 de la
  imagen (450ms). Botones: elevación -2px.
- Reveal al entrar en pantalla: bloques y tarjetas (`.reveal`/`.reveal-in` en global.css,
  motor en Base.astro con IntersectionObserver) suben 18px con fade 650ms, escalonado 80ms
  entre hermanos (tope 5). La clase la añade solo el script: sin JS todo es visible.
- Cifras: conteo ascendente (bloque Cifras).

## Assets

- Escudo UD y fotografías reales del programa en `public/images/` (origen: sitio actual y udistrital.edu.co).
- Documentos históricos permanecen en el WordPress actual (URLs absolutas) hasta la migración de archivos.
