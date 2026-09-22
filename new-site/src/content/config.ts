import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    hide: z.array(z.string()).optional(),
    // dateModified is intentionally not part of the schema — it's computed
    // from git history at build time (see plugins/git-dates.mjs) so it can
    // never go stale. Any dateModified left in a file's frontmatter is inert.
    datePublished: z.string().optional(),
    // Optional guest contributor, shown in the byline alongside changyang1230
    // and added to the schema.org Article author list.
    coAuthor: z
      .object({
        name: z.string(),
        url: z.string().optional(),
        jobTitle: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { docs };
