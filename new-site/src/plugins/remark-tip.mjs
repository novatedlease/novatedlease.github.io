import { visit } from 'unist-util-visit';
import { tips } from '../data/tips.mjs';

// :tip[visible text]{id=taxSaved} becomes a dotted-underline trigger for the shared popup.
export function remarkTip() {
  return (tree, file) => {
    visit(tree, 'textDirective', (node) => {
      if (node.name !== 'tip') return;
      const html = tips[node.attributes?.id];
      if (!html) throw new Error(`Unknown :tip id "${node.attributes?.id}" in ${file.path}`);
      node.data = {
        hName: 'span',
        hProperties: { class: 'nl-term', role: 'button', tabindex: 0, 'aria-expanded': 'false', 'data-tip-html': html, 'data-tip-wide': '1' },
      };
    });
  };
}
