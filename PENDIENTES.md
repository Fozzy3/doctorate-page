# Pendientes

Lo que falta para que el sitio reemplace por completo al WordPress actual.
Ordenado por lo que bloquea la publicación.

## 1. Bloqueantes para publicar

- [ ] **Habilitar GitHub Pages** — Settings → Pages → Source: **GitHub Actions**.
      Sin esto el despliegue automático falla (`Resource not accessible by integration`).
      Solo lo puede hacer un administrador del repo; el workflow ya está listo.
- [ ] **Definir el dominio final.** Hoy el sitio se sirve bajo un subdirectorio
      (`fozzy3.github.io/doctorate-page/`), que es solo para pruebas. Con dominio
      propio en la raíz, todas las URLs funcionan sin tocar código.
- [ ] **Redirección de documentos antiguos** — `/wp-content/uploads/…` → `/documentos/…`,
      para que los enlaces de correos y buscadores no se rompan. Una línea en nginx
      o un archivo `_redirects` según dónde se despliegue. Ver `DESIGN.md` → Documentos.

## 2. Formulario de contacto (hoy no envía nada)

- [ ] **Clave de Web3Forms** → `ACCESS_KEY` en `src/pages/contactenos.astro`.
      Gratis; registrarse con `doctoradoing@udistrital.edu.co` y los mensajes
      llegan a ese correo. Mientras tanto el formulario muestra un aviso con el
      correo y el teléfono, así que nadie se queda sin contactar.
- [ ] **Clave de Cloudflare Turnstile** → `TURNSTILE_KEY` en el mismo archivo.
      Es la única defensa real contra bots de IA; ya está cableado.
- [ ] **Restringir el dominio** en el panel de Web3Forms (evita que usen la clave
      desde otro sitio).

Verificar después con `node scripts/probar-form.mjs` — debe decir *"Mensaje enviado"*.

## 3. Contenido e imágenes

- [ ] **Foto del hero en alta resolución.** La actual (`public/images/hero-facultad.jpg`)
      es de 768 px de ancho y se estira en monitores grandes.
- [ ] **Reemplazar las fotos de banco** por fotografía real del programa
      (`public/images/stock/`, 8 archivos). Conservando los nombres, el sitio se
      actualiza solo.
- [ ] **Dos páginas vacías**, igual que en el sitio original — llenar cuando haya
      contenido: `docentes-invitados`, `estudiantes-pasantes`.

## 4. Seguridad y operación

- [ ] **Cabeceras de seguridad** en el servidor (HSTS, X-Content-Type-Options,
      Referrer-Policy, CSP).
- [ ] **Respaldo de `public/documentos/`** antes de apagar el WordPress: hoy es la
      única copia de los 462 documentos institucionales fuera del WP.

## 5. Deuda técnica (no urgente)

- [ ] `src/pages/[...slug].astro` va en ~920 líneas y sirve cuatro colecciones; los
      tres perfiles (docente, grupo, estudiante) repiten la misma retícula.
      Extraerla a un componente **antes** de agregar un cuarto tipo de perfil.

---

### Idea a futuro: chatbot y respuesta automática de correo

Está conversado, no empezado. La base ya existe: el repositorio es la fuente de
verdad y cada `push` puede disparar la reindexación. Faltaría el índice, un
servicio de consulta y el conector de Outlook (este último necesita permiso del
área de TI de la Universidad, que conviene tramitar con tiempo).
