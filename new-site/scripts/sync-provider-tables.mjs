import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(path.join(root, 'calculator2/src/guided/providerGuide.ts'), 'utf8');
const guides = source.slice(source.indexOf('const GUIDES:'), source.indexOf('export function guideFor'));

// Migrate one article at a time. Each entry maps the quote's numbered row to
// its Guided field. Quote labels and explanatory prose remain in the article.
const migrated = {
  flare: { '2': 'driveaway', '7': 'payment' },
};

for (const [id, rows] of Object.entries(migrated)) {
  const providerBlock = [...guides.matchAll(/^  \{\n    id: "(\w+)",([\s\S]*?)(?=^  \{\n    id: |^\];)/gm)]
    .find((match) => match[1] === id)?.[2];
  if (!providerBlock) throw new Error(`Guide missing for ${id}`);
  const pointers = new Map([...providerBlock.matchAll(/field: "(\w+)",\s*text: ("(?:\\.|[^"\\])*")/g)]
    .map(([, field, value]) => [field, JSON.parse(value)]));
  const article = path.join(root, `new-site/src/content/docs/start-here/how-to-read-${id}-quote.md`);
  const oldText = readFileSync(article, 'utf8');
  const table = /<!-- provider-table:begin -->\n([\s\S]*?)\n<!-- provider-table:end -->/;
  if (!table.test(oldText)) throw new Error(`Table markers missing for ${id}`);
  const next = oldText.replace(table, (_whole, body) => {
    const seen = new Set();
    const lines = body.split('\n').map((line) => {
      const number = /^\|\s*(\d+[a-z]?)\s*\|/.exec(line)?.[1];
      if (!number || !rows[number]) return line;
      const pointer = pointers.get(rows[number]);
      if (!pointer) throw new Error(`Pointer missing for ${id}/${rows[number]}`);
      const cells = line.split('|');
      if (cells.length !== 5) throw new Error(`Expected a three-column table in ${id}`);
      cells[3] = ` ${pointer.replaceAll('|', '\\|')} `;
      seen.add(number);
      return cells.join('|');
    });
    for (const number of Object.keys(rows)) if (!seen.has(number)) throw new Error(`Row ${number} missing in ${id}`);
    return `<!-- provider-table:begin -->\n${lines.join('\n')}\n<!-- provider-table:end -->`;
  });
  if (next !== oldText) writeFileSync(article, next);
}
console.log(`Synced pointer text in ${Object.keys(migrated).length} provider article table`);
