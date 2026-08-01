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

export const collections = { paginas, noticias };
