import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Commits that touched articles for purely mechanical/administrative reasons
// (frontmatter regeneration, componentisation refactors) rather than a real
// content edit. Excluded so "last modified" reflects genuine article changes.
const NON_CONTENT_COMMITS = new Set([
  '33f869c4d6ae6fd1bab33c85400a49a4f59dccf8', // build: regenerate new-site content with per-page descriptions
  '2804a399fe84b9cf480f27d53443cb14de54f19a', // content: article trust signals, site cleanup, nav overflow fix
]);

const cache = new Map();

// absolutePath: absolute filesystem path to the source .md file.
export function getLastModified(absolutePath) {
  if (cache.has(absolutePath)) return cache.get(absolutePath);

  const log = execSync(`git log --format=%H_%ad --date=short -- "${absolutePath}"`, { cwd: REPO_ROOT })
    .toString()
    .trim();

  let result;
  if (!log) {
    result = undefined;
  } else {
    const lines = log.split('\n');
    const match = lines.find((line) => {
      const [hash] = line.split('_');
      return !NON_CONTENT_COMMITS.has(hash);
    });
    result = (match || lines[0]).split('_')[1];
  }

  cache.set(absolutePath, result);
  return result;
}
