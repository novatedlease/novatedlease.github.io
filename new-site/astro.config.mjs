import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';
import { remarkTip } from './src/plugins/remark-tip.mjs';
import { rehypeByline } from './src/plugins/rehype-byline.mjs';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { getLastModified } from './src/plugins/git-dates.mjs';

// Sitemap <lastmod>: the same git-derived "last real content edit" date the
// article bylines show (plugins/git-dates.mjs), not the build date, which would
// tell Google every page changed on every deploy. Frontmatter dateModified is
// inert by design. Standalone pages use their .astro source; the calculator also
// counts its built bundle.
const DOCS = 'src/content/docs';
const latest = (...ds) => ds.filter(Boolean).sort().at(-1);
function articleDates(dir = DOCS, out = new Map()) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) { articleDates(f, out); continue; }
    if (!e.name.endsWith('.md')) continue;
    const slug = '/' + relative(DOCS, f).replace(/(\/index)?\.md$/, '/').replace(/^index\/$/, '');
    const date = getLastModified(resolve(f));
    if (date) out.set(slug, date);
  }
  return out;
}
const LASTMOD = articleDates();
for (const [slug, ...files] of [
  ['/', 'src/pages/index.astro'],
  ['/calculator/', 'src/pages/calculator/index.astro', '../docs/assets/calculator/main.js'],
  ['/tools/checklist/', 'src/pages/tools/checklist.astro'],
  ['/tools/byo-employer-check/', 'src/pages/tools/byo-employer-check.astro'],
  ['/about/what-readers-say/', 'src/pages/about/what-readers-say.astro'],
]) {
  const d = latest(...files.map((f) => getLastModified(resolve(f))));
  if (d) LASTMOD.set(slug, d);
}

export default defineConfig({
  site: 'https://novatedlease.guide',
  redirects: {
    '/costs-and-savings/use-nl-spreadsheet': '/calculator/',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/calculator-old/'),
      serialize(item) {
        const date = LASTMOD.get(new URL(item.url).pathname);
        if (date) item.lastmod = date;
        else delete item.lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkGfm,
      remarkDirective,
      [remarkMath, { singleDollarTextMath: false }],
      remarkAdmonitions,
      remarkTip,
    ],
    rehypePlugins: [
      rehypeRaw,
      rehypeKatex,
      rehypeByline,
    ],
    syntaxHighlight: 'prism',
  },
  build: {
    format: 'directory',
  },
});
