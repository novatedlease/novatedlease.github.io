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
  sgfleet: { '1': 'baseValue', '2': 'driveaway', '7a': 'payment' },
  maxxia: { '5': 'docFee', '9': 'insurance' },
  oly: { '5': 'docFee' },
  millarx: { '7a': 'payment' },
  easi: { '2': 'driveaway', '7b': 'payment' },
  remunerator: { '2': 'driveaway', '4': 'defer', '7': 'payment' },
  driva: { '2': 'driveaway', '6': 'residual', '7': 'payment' },
  fingo: { '2': 'driveaway', '4': 'defer', '7': 'payment' },
  lendly: { '2': 'driveaway' },
  spa: { '1': 'baseValue', '2': 'driveaway', '4': 'defer' },
  paywise: { '7': 'payment', '10': 'fees' },
  remserv: { '6': 'residual', '7': 'payment' },
  simplygreen: { '2': 'driveaway', '4': 'defer', '7': 'payment' },
  leaselab: { '6': 'residual', '7': 'payment' },
  leaseexpress: { '1': 'baseValue', '6': 'residual', '7': 'payment' },
  orix: { '6': 'residual' },
  nla: { '1': 'baseValue', '2': 'driveaway', '6': 'residual', '7': 'payment' },
  toyotafleet: { '2': 'driveaway', '6': 'residual', '7': 'payment' },
  customfleet: { '2': 'driveaway', '8': 'luxAdj', '10': 'fees' },
  vehiclesolutions: { '2': 'driveaway', '4': 'defer', '6': 'residual', '7a': 'payment' },
  fleetpartners: { '2': 'driveaway', '4': 'defer' },
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
      const number = /^\|\s*(\d+[a-z]?)(?:\s|\|)/.exec(line)?.[1];
      if (!number || !rows[number]) return line;
      const pointer = pointers.get(rows[number]);
      if (!pointer) throw new Error(`Pointer missing for ${id}/${rows[number]}`);
      const cells = line.split('|');
      if (cells.length !== 5 && cells.length !== 6) throw new Error(`Expected a three- or four-column table in ${id}`);
      cells[cells.length - 2] = ` ${pointer.replaceAll('|', '\\|')} `;
      seen.add(number);
      return cells.join('|');
    });
    for (const number of Object.keys(rows)) if (!seen.has(number)) throw new Error(`Row ${number} missing in ${id}`);
    return `<!-- provider-table:begin -->\n${lines.join('\n')}\n<!-- provider-table:end -->`;
  });
  if (next !== oldText) writeFileSync(article, next);
}
console.log(`Synced pointer text in ${Object.keys(migrated).length} provider article table`);
