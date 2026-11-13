import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Item 16: each provider article opens with "What catches people out on a {Provider} quote",
// built from the same trap pointers Guided shows in amber (TRAP_FIELDS in providerGuide.ts, via src/data/provider-guides.json).
// Idempotent: rewrites only the block between the provider-traps markers.

const root = fileURLToPath(new URL('../../', import.meta.url));
const guides = JSON.parse(readFileSync(path.join(root, 'new-site/src/data/provider-guides.json'), 'utf8'));
const docs = path.join(root, 'new-site/src/content/docs/start-here');

const FIELD_NAMES = {
  baseValue: 'FBT base value', driveaway: 'Drive-away price', defer: 'Deferred payments',
  docFee: 'Documentation fee', residual: 'Residual', payment: 'Finance payment',
  luxAdj: 'Luxury vehicle adjustment', running: 'Running costs', insurance: 'First-year insurance',
  fees: 'Management fees',
};

// Acronyms are read letter by letter ("an SG Fleet"); words by their first sound ("an Oly").
const anOrA = (word) => (/^[A-Z]{2}/.test(word) ? (/^[AEFHILMNORSX]/.test(word) ? 'an' : 'a') : /^[AEIOU]/i.test(word) ? 'an' : 'a');
const block = /<!-- provider-traps:begin -->\n[\s\S]*?<!-- provider-traps:end -->\n\n?/;
const review = /<!-- quote-review:end -->\n\n/;

let count = 0;
for (const { id, label, written, traps: fields } of guides.providers) {
  const pointers = new Map(Object.entries(written));
  const lines = fields.map((field) => {
    const text = pointers.get(field);
    if (!text) throw new Error(`Trap pointer missing for ${id}/${field}`);
    return `- **${FIELD_NAMES[field] ?? field}:** ${text}`;
  });
  const list = lines.length
    ? lines.join('\n')
    : `Nothing on the ${label} quotes we checked looked easy to misread. The table below shows where each figure is.`;
  const section = `<!-- provider-traps:begin -->\n## What catches people out on ${anOrA(label)} ${label} quote\n\n${list}\n<!-- provider-traps:end -->\n\n`;

  const article = path.join(docs, `how-to-read-${id}-quote.md`);
  const oldText = readFileSync(article, 'utf8');
  const clean = oldText.replace(block, '');
  if (!review.test(clean)) throw new Error(`Quote-review note missing in ${article}`);
  // Directly after the article's intro paragraph(s), before the first image or table.
  const at = clean.search(/^(!\[|<!-- provider-table:begin -->)/m);
  if (at < 0) throw new Error(`No image or table to place the trap list before in ${article}`);
  const next = clean.slice(0, at) + section + clean.slice(at);
  if (next !== oldText) writeFileSync(article, next);
  count++;
}
if (count !== 28) throw new Error(`Expected 28 provider guides, found ${count}`);
console.log(`Synced trap introductions for ${count} provider articles`);
