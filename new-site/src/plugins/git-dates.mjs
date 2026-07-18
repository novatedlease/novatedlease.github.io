import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Commits that touched articles for purely mechanical/administrative reasons
// (frontmatter regeneration, componentisation refactors, boilerplate support-box
// wording, sitewide terminology/link swaps, migration syntax conversion, pure
// typo/grammar-only fixes) rather than a genuine content edit. Excluded so
// "last modified" reflects genuine article changes. Audited against full git
// history (including the pre-Astro MkDocs site, reached via --follow below).
const NON_CONTENT_COMMITS = new Set([
  '33f869c4d6ae6fd1bab33c85400a49a4f59dccf8', // build: regenerate new-site content with per-page descriptions
  '2804a399fe84b9cf480f27d53443cb14de54f19a', // content: article trust signals, site cleanup, nav overflow fix
  'b629f0eaaf92cda87350ff2783446d64620d4a3a', // feat: launch new Astro site with redesigned UI (mechanical MkDocs->Astro port)
  'd86de8bb23b4a281d82e9ab6427a646757369607', // MK support box
  'f49650fff89c00697b152445f3f92ccae8c6ee9d', // support box modified
  '5033180430b5260de79fd7c09cca8e12dd9d0c55', // calculator page brush up (support-box reword)
  '048a4ed6b323865e5eace0deb50c3629e62bf4a6', // article polishing (support-box/icon tweaks)
  'bc4bdda51dc4af5f9438c443668d21532213472f', // beter typo
  'c8a31740d28d04a3c47a722f017dfde03d3f3c43', // icons
  'af858fd8c7aeb5cd95a32000049750e929b69e9e', // updated BMAC link
  '25d3262bdad1679d4074cb6687a75af97b5f4f29', // grammar and removing one link (support-box wording)
  '929abce6c17d08415e91c36d8b3a23fb1b3cf94f', // Publish updated site content and calculator assets (support-box reword)
  'a1ec7975af3d67d81c85dd24cb82756d985a87b7', // title sentence case
  '72e018994060a985f6ecdc22d29ede0dcbed8c12', // wind-back terminology: replace 'phase-out' with 'wind-back' across site
  'c92e0e6a80e712263f333bf76e1b9518c7d24d6b', // feat: rename ATO charging shortcut URL and fix editorial items (link renames)
  'aa3d7fbd9d78eac35e9edec6e980f4919d89c5c5', // fix: editorial corrections across six files (grammar only)
  'a6770df7ea41a9e88c2348a86eda408afd4163dd', // small edit (legislation URL fix)
  '461ccb99e79905bcccd370bae4c8e8f952372aa2', // quotation mark unhappy by FB
  'e6cf644ef7d2764ad3a77690684ebcea6372724a', // removed warning as too messy (support-box add)
  '4a911f97ee16cde0162f9824eb49a65c4263fb37', // Test (trivial grammar)
]);

const cache = new Map();

// absolutePath: absolute filesystem path to the source .md file.
export function getLastModified(absolutePath) {
  if (cache.has(absolutePath)) return cache.get(absolutePath);

  const log = execSync(`git log --follow --format=%H_%ad --date=short -- "${absolutePath}"`, { cwd: REPO_ROOT })
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
