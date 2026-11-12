import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(path.join(root, 'calculator2/src/guided/providerGuide.ts'), 'utf8');
const providerBlock = source.slice(source.indexOf('export const PROVIDERS = ['), source.indexOf('] as const;'));
const providers = [...providerBlock.matchAll(/\{ id: "(\w+)", label: "([^"]+)" \}/g)]
  .map(([, id, label]) => ({ id, label }))
  .filter(({ id }) => id !== 'other');
const popularBlock = source.match(/export const POPULAR: ProviderId\[\] = \[([^\]]+)\]/)?.[1];
const popular = [...(popularBlock ?? '').matchAll(/"(\w+)"/g)].map(([, id]) => id);
if (providers.length !== 27 || popular.length !== 5) throw new Error('Provider index source changed; review the generator');
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
