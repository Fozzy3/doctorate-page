# Doctorado en Ingeniería — Sitio institucional

Reconstrucción del sitio [doctoradoingenieria.udistrital.edu.co](https://doctoradoingenieria.udistrital.edu.co/)
como sitio estático con [Astro](https://astro.build). Reemplaza el WordPress actual manteniendo
**exactamente las mismas URLs** para que el cambio no rompa ningún enlace.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo en localhost:4321
npm run build      # build de producción en dist/ + índice de búsqueda (Pagefind)
npm run preview    # servir dist/ localmente
```

## Estructura

```
src/
  content/
    paginas/       # ~49 páginas de contenido en Markdown (una por URL del sitio actual)
    noticias/      # noticias y convocatorias (una por archivo)
  data/nav.ts      # única fuente de la navegación (secciones y enlaces)
  layouts/         # Base.astro (head, header, footer)
  components/      # Header, Footer, Hero, NewsCard
  pages/
    index.astro    # home
    [...slug].astro       # renderiza cada página de content/paginas/
    noticias/             # listado + detalle de noticias
    contactenos.astro     # formulario (Web3Forms) + datos de contacto
    buscar.astro          # búsqueda con Pagefind
scripts/
  wp-fetch.mjs     # extrae contenido del WordPress actual (migración)
```

## Cómo editar contenido

- **Editar una página**: modifica su `.md` en `src/content/paginas/`. El frontmatter necesita
  `title`, `description` y `section` (programa | admisiones | posdoctorado | comunidad |
  investigacion | acreditacion | cecad).
- **Publicar una noticia**: crea un `.md` en `src/content/noticias/` con `title`, `description`,
  `date` y opcionalmente `image`/`imageAlt`. La home y el listado se actualizan solos.
- **Cambiar el menú**: edita `src/data/nav.ts`.

## Diseño

Ver `PRODUCT.md` (estrategia) y `DESIGN.md` (sistema visual). Paleta carmesí académico,
tipografía Libre Franklin + Source Serif 4 (self-hosted), referencia de lenguaje visual: cmu.edu.

## Pendientes antes de publicar

- [ ] Reemplazar `PENDIENTE_ACCESS_KEY` en `src/pages/contactenos.astro` con una access key
      real de [Web3Forms](https://web3forms.com) (gratuito) o el servicio de formularios elegido.
- [ ] Foto de hero en mayor resolución (la actual es 600×400, tomada del sitio de la UD).
- [ ] Migrar los archivos PDF de `/wp-content/uploads/` (hoy se enlazan al servidor actual).
- [ ] Configurar despliegue (GitHub Actions → nginx institucional, o Cloudflare Pages para demo).
- [ ] Headers de seguridad y caché en el nginx que sirva `dist/`.
