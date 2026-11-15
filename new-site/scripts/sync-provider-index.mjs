import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guides = JSON.parse(readFileSync(path.join(root, 'new-site/src/data/provider-guides.json'), 'utf8'));
const providers = guides.providers.map(({ id, label }) => ({ id, label }));
const popular = guides.popular;
if (providers.length !== 29 || popular.length !== 3) throw new Error('Provider index source changed; review the generator');
const byId = new Map(providers.map((p) => [p.id, p]));
for (const id of popular) if (!byId.has(id)) throw new Error(`Unknown popular provider: ${id}`);
const link = ({ id, label }) => `- [${label} quote guide](/start-here/how-to-read-${id}-quote/)`;
const list = [
  '<!-- provider-index:begin -->',
  '## Most common',
  '',
  ...popular.map((id) => link(byId.get(id))),
  '',
  '## All providers',
  '',
  ...providers.sort((a, b) => a.label.localeCompare(b.label, 'en-AU')).map(link),
  '<!-- provider-index:end -->',
].join('\n');
const article = path.join(root, 'new-site/src/content/docs/start-here/provider-quote-guides.md');
const previous = readFileSync(article, 'utf8');
const section = /<!-- provider-index:begin -->[\s\S]*?<!-- provider-index:end -->/;
if (!section.test(previous)) throw new Error('Provider index markers are missing');
const next = previous.replace(section, list);
if (next !== previous) writeFileSync(article, next);
console.log(`Synced ${popular.length} common and ${providers.length} alphabetical provider links`);
