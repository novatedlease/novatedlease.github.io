import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Item 16: each provider article opens with "What catches people out on a {Provider} quote",
// built from the same trap pointers Guided shows in amber (TRAP_FIELDS in providerGuide.ts).
// Idempotent: rewrites only the block between the provider-traps markers.

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(path.join(root, 'calculator2/src/guided/providerGuide.ts'), 'utf8');
const docs = path.join(root, 'new-site/src/content/docs/start-here');

const labels = new Map([...source.matchAll(/\{ id: "(\w+)", label: "([^"]+)" \}/g)].map(([, id, label]) => [id, label]));

const trapBlock = source.slice(source.indexOf('const TRAP_FIELDS'), source.indexOf('function withKind'));
const traps = new Map();
for (const [, id, fields] of trapBlock.matchAll(/(\w+): \[([^\]]*)\]/g)) {
  traps.set(id, [...fields.matchAll(/"(\w+)"/g)].map(([, f]) => f));
}

const guides = source.slice(source.indexOf('const GUIDES:'), source.indexOf('export function guideFor'));
const blocks = new Map([...guides.matchAll(/^  \{\n    id: "(\w+)",([\s\S]*?)(?=^  \{\n    id: |^\];)/gm)]
  .map(([, id, body]) => [id, body]));

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
for (const [id, body] of blocks) {
  const label = labels.get(id);
  if (!label) throw new Error(`Provider label missing for ${id}`);
  const pointers = new Map([...body.matchAll(/field: "(\w+)",\s*text: ("(?:\\.|[^"\\])*")/g)]
    .map(([, field, value]) => [field, JSON.parse(value)]));
  const fields = traps.get(id) ?? [];
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
if (count !== 27) throw new Error(`Expected 27 provider guides, found ${count}`);
console.log(`Synced trap introductions for ${count} provider articles`);
