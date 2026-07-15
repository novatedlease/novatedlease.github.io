// Inserts a "By changyang1230 · Updated <date>" byline directly after the first
// h1 in each article. datePublished comes from frontmatter (a fixed historical
// fact); dateModified is computed from git history at build time so it never
// goes stale as articles are edited.
import { getLastModified } from './git-dates.mjs';

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function rehypeByline() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter;
    if (!frontmatter) return;

    const { datePublished } = frontmatter;
    const dateModified = file.path ? getLastModified(file.path) : undefined;
    if (!datePublished && !dateModified) return;

    const h1Index = tree.children.findIndex(
      (node) => node.type === 'element' && node.tagName === 'h1'
    );
    if (h1Index === -1) return;

    const children = [
      { type: 'text', value: 'By ' },
      {
        type: 'element',
        tagName: 'a',
        properties: { href: '/about/about-me/' },
        children: [{ type: 'text', value: 'changyang1230' }],
      },
    ];

    if (dateModified && dateModified !== datePublished) {
      children.push({ type: 'text', value: ` · Updated ${formatDate(dateModified)}` });
    } else if (datePublished) {
      children.push({ type: 'text', value: ` · Published ${formatDate(datePublished)}` });
    }

    const bylineNode = {
      type: 'element',
      tagName: 'p',
      properties: { className: ['article-byline'] },
      children,
    };

    tree.children.splice(h1Index + 1, 0, bylineNode);
  };
}
