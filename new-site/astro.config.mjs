import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';

export default defineConfig({
  site: 'https://novatedlease.guide',
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
