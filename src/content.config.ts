import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const paginas = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/paginas' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** 'documento' = grid con subnav y riel; 'panorama' = lienzo completo para bloques */
    plantilla: z.enum(['documento', 'panorama']).default('documento'),
    section: z.enum([
      'programa',
      'admisiones',
      'posdoctorado',
      'comunidad',
      'investigacion',
      'acreditacion',
      'cecad',
    ]),
    updated: z.string().optional(),
  }),
});

const persona = z.object({ nombre: z.string(), url: z.string().optional() });

const docentes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/docentes' }),
  schema: z.object({
    nombre: z.string(),
    foto: z.string().optional(),
    correo: z.string().optional(),
    estado: z.string().optional(),
    enfasis: z.string().optional(),
    grupos: z.array(z.object({ nombre: z.string(), url: z.string().optional() })).default([]),
    redes: z.record(z.string()).default({}),
    tesis: z.string().optional(),
    director: z.string().optional(),
    estudiantes: z
      .object({
        activos: z.array(persona).default([]),
        codirigidos: z.array(persona).default([]),
        egresados: z.array(persona).default([]),
      })
      .default({ activos: [], codirigidos: [], egresados: [] }),
  }),
});

const estudiantes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/estudiantes' }),
  schema: z.object({
    nombre: z.string(),
    tipo: z.enum(['activo', 'egresado']),
    foto: z.string().optional(),
    enfasis: z.string().optional(),
    cohorte: z.string().optional(),
    redes: z.record(z.string()).default({}),
    proyecto: z.string().optional(),
    proyectoEtiqueta: z.string().optional(),
    tesis: z.string().optional(),
    grupos: z.array(z.object({ nombre: z.string(), url: z.string().optional() })).default([]),
    director: persona.optional(),
    codirector: persona.optional(),
  }),
});

const grupos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/grupos' }),
  schema: z.object({
    sigla: z.string(),
    nombre: z.string().optional(),
    enfasis: z.string().optional(),
    logo: z.string().optional(),
    descripcion: z.array(z.string()).default([]),
    clasificacion: z.string().optional(),
    convocatoria: z.object({ etiqueta: z.string(), url: z.string() }).optional(),
    gruplac: z.string().optional(),
    enlaces: z.array(z.object({ etiqueta: z.string(), url: z.string() })).default([]),
    director: z
      .object({
        nombre: z.string(),
        url: z.string().optional(),
        correo: z.string().optional(),
      })
      .optional(),
    actualizado: z.string().optional(),
  }),
});

const noticias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/noticias' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { paginas, noticias, docentes, grupos, estudiantes };
