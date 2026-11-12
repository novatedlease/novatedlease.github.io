import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guideSource = readFileSync(path.join(root, 'calculator2/src/guided/providerGuide.ts'), 'utf8');
const guideBlock = guideSource.slice(guideSource.indexOf('const GUIDES:'), guideSource.indexOf('export function guideFor'));
const docs = path.join(root, 'new-site/src/content/docs/start-here');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const guidePattern = /^  \{\n    id: "(\w+)",\n    seen: "(\d{4})-(\d{2})",\n    sources: \[([^\]]*)\],/gm;
const generated = /<!-- quote-review:begin -->\n[\s\S]*?<!-- quote-review:end -->\n\n?/;

let count = 0;
for (const match of guideBlock.matchAll(guidePattern)) {
  const [, id, year, month, sources] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) throw new Error(`Invalid review month for ${id}`);
  const sourceCount = (sources.match(/"[^"]+"/g) ?? []).length;
  if (!sourceCount) throw new Error(`No quote sources for ${id}`);
  const article = path.join(docs, `how-to-read-${id}-quote.md`);
  const oldText = readFileSync(article, 'utf8');
  const clean = oldText.replace(generated, '');
  const note = `<!-- quote-review:begin -->\n*Checked against ${sourceCount} ${sourceCount === 1 ? 'quote example' : 'quote examples'}; latest layout reviewed ${months[monthIndex]} ${year}.*\n<!-- quote-review:end -->\n\n`;
  const heading = /^# [^\n]+\n\n/m;
  if (!heading.test(clean)) throw new Error(`Missing article heading in ${article}`);
  const next = clean.replace(heading, (line) => line + note);
  if (next !== oldText) writeFileSync(article, next);
  count++;
}
if (count !== 27) throw new Error(`Expected 27 provider guides, found ${count}`);
console.log(`Synced quote-review notes for ${count} provider articles`);
