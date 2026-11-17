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
  luxAdj: 'Luxury vehicle adjustment', running: 'Running costs', insurance: 'Insurance',
  fees: 'Management fees',
  financedInsurance: 'First-year insurance',
};

// Acronyms are read letter by letter ("an SG Fleet"); words by their first sound ("an Oly").
const anOrA = (word) => (/^[A-Z]{2}/.test(word) ? (/^[AEFHILMNORSX]/.test(word) ? 'an' : 'a') : /^[AEIOU]/i.test(word) ? 'an' : 'a');
const block = /<!-- provider-traps:begin -->\n[\s\S]*?<!-- provider-traps:end -->\n\n?/;
const review = /<!-- quote-review:end -->\n\n/;

// Review round 2, R15: past twelve months with no newer quote, Guided shows the traps as plain lines; the article says so.
const now = new Date();
const oldNote = (seen, label) => {
  const [y, m] = seen.split('-').map(Number);
  if (now.getFullYear() * 12 + now.getMonth() + 1 - (y * 12 + m) <= 12) return '';
  // The date is already in the quote-review line above, so the note doesn't repeat it (owner, 2026-11-14).
  return '*From an older quote. Yours may look different.*\n\n';
};

let count = 0;
for (const { id, label, seen, written, pointers: pointerList, traps: fields } of guides.providers) {
  const pointers = new Map(Object.entries(written));
  const lines = fields.map((field) => {
    const text = pointers.get(field);
    if (!text) throw new Error(`Trap pointer missing for ${id}/${field}`);
    const alternate = pointerList.filter((p) => p.field === field && p.text && p.text !== text).map((p) => p.text);
    return `- **${FIELD_NAMES[field] ?? field}:** ${[text, ...alternate].join(' ')}`;
  });
  const list = lines.length
    ? lines.join('\n')
    : `Nothing on the ${label} quotes we checked looked easy to misread. The table below shows where each figure is.`;
  const section = `<!-- provider-traps:begin -->\n## What catches people out on ${anOrA(label)} ${label} quote\n\n${oldNote(seen, label)}${list}\n<!-- provider-traps:end -->\n\n`;

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
if (count !== 30) throw new Error(`Expected 30 provider guides, found ${count}`);
console.log(`Synced trap introductions for ${count} provider articles`);
