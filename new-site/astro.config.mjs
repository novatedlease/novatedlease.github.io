import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';
import { rehypeByline } from './src/plugins/rehype-byline.mjs';

export default defineConfig({
  site: 'https://novatedlease.guide',
  redirects: {
    '/costs-and-savings/use-nl-spreadsheet': '/calculator/',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/calculator-old/'),
      serialize(item) {
        item.lastmod = new Date().toISOString().split('T')[0];
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
