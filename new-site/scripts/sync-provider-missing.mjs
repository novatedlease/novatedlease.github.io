import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Review round 2, R11: the "Can't find it on your {Provider} quote?" lines Guided shows for
// figures the reviewed quotes don't print, with their picture when there is one (the GST credit
// x 11 tip). Read from src/data/provider-guides.json. Idempotent: rewrites only the marked block,
// placed just before the article's closing "Open Guided mode" links.

const root = fileURLToPath(new URL('../../', import.meta.url));
const guides = JSON.parse(readFileSync(path.join(root, 'new-site/src/data/provider-guides.json'), 'utf8'));
const docs = path.join(root, 'new-site/src/content/docs/start-here');

const FIELD_NAMES = {
  baseValue: 'FBT base value', driveaway: 'Drive-away price', defer: 'Months deferred',
  docFee: 'Documentation fee', residual: 'Residual', payment: 'Finance payment',
  luxAdj: 'Luxury vehicle adjustment', running: 'Running costs', insurance: 'Insurance',
  fees: 'Management fees',
};
const block = /<!-- provider-missing:begin -->\n[\s\S]*?<!-- provider-missing:end -->\n\n?/;

let count = 0;
for (const { id, label, pointers } of guides.providers) {
  const missing = pointers.filter((p) => p.kind === 'missing');
  const article = path.join(docs, `how-to-read-${id}-quote.md`);
  const oldText = readFileSync(article, 'utf8');
  const clean = oldText.replace(block, '');
  let next = clean;
  if (missing.length) {
    const items = missing.map((p) => {
      const line = `- **${FIELD_NAMES[p.field] ?? p.field}:** ${p.text}${p.more ? ` ${p.more}` : ''}`;
      return p.image
        ? `${line}\n\n  ![Part of a redacted ${label} quote with the line to use outlined](${p.image})`
        : line;
    });
    const section = `<!-- provider-missing:begin -->\n## If a figure isn't on your quote\n\n${items.join('\n')}\n<!-- provider-missing:end -->\n\n`;
    const at = clean.search(/^\[Open Guided mode/m);
    if (at < 0) throw new Error(`No closing links line in ${article}`);
    next = clean.slice(0, at) + section + clean.slice(at);
  }
  if (next !== oldText) writeFileSync(article, next);
  if (missing.length) count++;
}
console.log(`Synced "not on your quote" lines for ${count} provider articles`);
