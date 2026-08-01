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

export const collections = { paginas, noticias, docentes };
