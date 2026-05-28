import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';

export default defineConfig({
  site: 'https://novatedlease.guide',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [
      remarkGfm,
      remarkDirective,
      remarkAdmonitions,
    ],
    rehypePlugins: [
      rehypeRaw,
    ],
    syntaxHighlight: 'prism',
  },
  build: {
    format: 'directory',
  },
});
