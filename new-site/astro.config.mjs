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
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// Sitemap <lastmod> per article: its frontmatter dateModified (or datePublished).
// Pages without a date (home, calculator, tools) get no lastmod rather than the
// build date, which would tell Google every page changed on every deploy.
const DOCS = 'src/content/docs';
function articleDates(dir = DOCS, out = new Map()) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) { articleDates(f, out); continue; }
    if (!e.name.endsWith('.md')) continue;
    const fm = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const date = (fm.match(/^dateModified:\s*"?(\d{4}-\d{2}-\d{2})/m) ?? fm.match(/^datePublished:\s*"?(\d{4}-\d{2}-\d{2})/m))?.[1];
    const slug = '/' + relative(DOCS, f).replace(/(\/index)?\.md$/, '/').replace(/^index\/$/, '');
    if (date) out.set(slug, date);
  }
  return out;
}
const LASTMOD = articleDates();

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
