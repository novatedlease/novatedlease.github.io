// Watches docs/ and re-runs prepare-content.mjs on changes.
// Pairs with `astro dev` for true hot reload from the docs/ source of truth.
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(__dirname, '../../docs');
const prepareScript = resolve(__dirname, 'prepare-content.mjs');

let pending = false;
let running = false;

function runPrepare() {
  if (running) { pending = true; return; }
  running = true;
  const start = Date.now();
  const child = spawn('node', [prepareScript], { stdio: 'inherit' });
  child.on('exit', () => {
    running = false;
    console.log(`[watch-content] prepare-content done in ${Date.now() - start}ms`);
    if (pending) { pending = false; runPrepare(); }
  });
}

console.log(`[watch-content] watching ${docsDir}`);
watch(docsDir, { recursive: true }, (eventType, filename) => {
  if (!filename || !filename.endsWith('.md')) return;
  console.log(`[watch-content] ${eventType}: ${filename}`);
  runPrepare();
});
