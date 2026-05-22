import { visit } from 'unist-util-visit';

const TYPE_LABELS = {
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Danger',
  success: 'Success',
  question: 'Question',
  abstract: 'Summary',
  example: 'Example',
  quote: 'Quote',
  bug: 'Bug',
  failure: 'Failure',
  caution: 'Caution',
};

export function remarkAdmonitions() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;

      const name = node.name;
      const isCollapsible = node.attributes?.class?.includes('collapsible');

      // Extract title from directiveLabel (first child if it's a label)
      let title = null;
      const labelNode = node.children.find(
        (child) => child.data?.directiveLabel === true
      );
      if (labelNode) {
        title = labelNode.children.map((c) => c.value || '').join('');
      }
      if (!title) {
        title = TYPE_LABELS[name] || (name.charAt(0).toUpperCase() + name.slice(1));
      }

      // Remove the label node from children (it becomes the title)
      if (labelNode) {
        node.children = node.children.filter((c) => c !== labelNode);
      }

      node.data = node.data || {};

      if (isCollapsible) {
        node.data.hName = 'details';
        node.data.hProperties = {
          class: `admonition admonition--${name} admonition--collapsible`,
        };
        node.children.unshift({
          type: 'html',
          value: `<summary class="admonition__title">${escapeHtml(title)}</summary>`,
        });
      } else {
        node.data.hName = 'div';
        node.data.hProperties = {
          class: `admonition admonition--${name}`,
        };
        node.children.unshift({
          type: 'html',
          value: `<div class="admonition__title">${escapeHtml(title)}</div>`,
        });
      }
    });
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
