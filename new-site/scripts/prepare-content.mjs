/**
 * Pre-processes MkDocs markdown files into Astro-compatible format:
 *   1. Inlines --8<-- "includes/..." snippets
 *   2. Converts !!! / ??? admonitions to :::type[title] directive syntax
 *   3. Converts :material-icon: references to Unicode equivalents
 *   4. Fixes relative image paths
 *   5. Strips MkDocs attribute list syntax on links: [text](url){: ... }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const OUT_DIR = path.resolve(__dirname, '../src/content/docs');

const ICON_MAP = {
  'material-school-outline': '🎓',
  'material-file-search-outline': '🔍',
  'material-book-open-outline': '📖',
  'material-information-outline': 'ℹ️',
  'material-check': '✓',
  'material-check-circle': '✓',
  'material-alert': '⚠️',
  'material-alert-outline': '⚠️',
  'material-close': '✗',
  'material-arrow-right': '→',
  'material-calculator': '🧮',
  'material-currency-usd': '💰',
};

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function inlineSnippets(text, docsDir) {
  return text.replace(/^--8<--\s+"([^"]+)"\s*$/gm, (match, relPath) => {
    const snippetPath = path.resolve(docsDir, relPath);
    if (!fs.existsSync(snippetPath)) {
      console.warn(`  WARNING: snippet not found: ${snippetPath}`);
      return '';
    }
    let content = fs.readFileSync(snippetPath, 'utf8');
    // Fix paths relative to the snippet file's directory to be absolute
    const snippetDir = path.posix.dirname(relPath.replace(/\\/g, '/'));
    content = resolveRelativePathsToAbsolute(content, snippetDir, docsDir);
    // Recursively inline nested snippets
    content = inlineSnippets(content, docsDir);
    return content.trimEnd();
  });
}

// Convert relative ../  paths in markdown/HTML content to absolute /paths
// based on the file's location within the docs directory
function resolveRelativePathsToAbsolute(text, fileDir, docsDir) {
  // Fix relative paths in Markdown images/links: ![alt](../path) and [text](../path)
  text = text.replace(/(!?\[(?:[^\]]*)\])\((\.\.[^)]+)\)/g, (match, label, relPath) => {
    // Only fix paths pointing to static assets/images/pdf
    if (!relPath.match(/\.(png|jpg|jpeg|gif|svg|webp|pdf|css|js)($|\?)/i) &&
        !relPath.includes('/assets/') && !relPath.includes('/images/')) {
      return match; // leave article links as-is, they'll be resolved elsewhere
    }
    const resolved = '/' + path.posix.normalize(path.posix.join(fileDir, relPath)).replace(/^\//, '');
    return `${label}(${resolved})`;
  });
  // Fix relative paths in HTML src= and href= attributes
  text = text.replace(/(src|href)="(\.\.[^"]+)"/g, (match, attr, relPath) => {
    const resolved = '/' + path.posix.normalize(path.posix.join(fileDir, relPath)).replace(/^\//, '');
    return `${attr}="${resolved}"`;
  });
  return text;
}

function convertAdmonitions(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Match !!! type "title" or ??? type "title"
    const match = line.match(/^(!{3}|\?{3})\+?\s+([\w-]+)(?:\s+"([^"]*)")?\s*$/);

    if (match) {
      const isCollapsible = match[1].startsWith('?');
      const type = match[2].toLowerCase();
      const title = match[3] !== undefined ? match[3] : capitalize(type);

      // Collect 4-space indented content lines
      const body = [];
      i++;
      let prevEmpty = false;
      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('    ')) {
          body.push(l.slice(4));
          prevEmpty = false;
          i++;
        } else if (l.trim() === '') {
          // Allow blank lines within admonition only if next non-empty is still indented
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length && lines[j].startsWith('    ')) {
            body.push('');
            i++;
            prevEmpty = true;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Remove trailing empty lines from body
      while (body.length > 0 && body[body.length - 1].trim() === '') {
        body.pop();
      }

      if (isCollapsible) {
        result.push(`:::${type}[${title}]{.collapsible}`);
      } else {
        result.push(`:::${type}[${title}]`);
      }
      result.push(...body);
      result.push(':::');
      result.push('');
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

function convertMaterialIcons(text) {
  return text.replace(/:material-([\w-]+):/g, (match, iconName) => {
    return ICON_MAP['material-' + iconName] || '';
  });
}

// Convert Python-Markdown attribute lists on images:
// ![alt](url){ style="..." } or ![alt](url){width=50%} → <img ...>
function convertAttrListImages(text) {
  return text.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g,
    (match, alt, src, attrs) => {
      const attrStr = attrs.trim();
      // {width=50%} or {width=600px} → inline style
      const widthMatch = attrStr.match(/^width=(\d+%|\d+px)$/i);
      if (widthMatch) {
        return `<img src="${src}" alt="${alt}" style="max-width: ${widthMatch[1]}; height: auto;">`;
      }
      return `<img src="${src}" alt="${alt}" ${attrStr}>`;
    }
  );
}

function stripLinkAttrLists(text) {
  // Remove MkDocs attr_list syntax appended to links: [text](url){: ... }
  return text.replace(/\)\{:[^}]*\}/g, ')');
}

function fixImagePaths(text, fileRelPath) {
  // Convert ALL remaining relative image/asset paths to absolute paths based on file location
  const fileDir = path.posix.dirname(fileRelPath.replace(/\\/g, '/'));
  return resolveRelativePathsToAbsolute(text, fileDir, '');
}

// Convert relative .md links to absolute URL paths
// e.g. in start-here/foo.md: [text](../costs-and-savings/bar.md) → [text](/costs-and-savings/bar/)
function fixMarkdownLinks(text, fileRelPath) {
  const fileDir = path.posix.dirname(fileRelPath.replace(/\\/g, '/'));

  return text.replace(/(\[(?:[^\]]*)\])\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, label, href) => {
    // Split off any hash anchor
    const hashIdx = href.indexOf('#');
    const mdPath = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const anchor = hashIdx >= 0 ? href.slice(hashIdx) : '';

    // Resolve the .md path relative to the file's docs directory
    const resolved = path.posix.normalize(path.posix.join(fileDir, mdPath));

    // Convert to URL: strip .md, handle /index -> /
    let urlPath = '/' + resolved.replace(/\.md$/, '');
    if (urlPath.endsWith('/index')) {
      urlPath = urlPath.slice(0, -6) || '/';
    }
    // Ensure trailing slash
    if (!urlPath.endsWith('/')) urlPath += '/';

    return `${label}(${urlPath}${anchor})`;
  });
}

function processFile(srcPath, docsDir, outPath, fileRelPath) {
  let text = fs.readFileSync(srcPath, 'utf8');

  // Process in order
  text = inlineSnippets(text, docsDir);
  text = convertAdmonitions(text);
  text = convertMaterialIcons(text);
  text = convertAttrListImages(text);
  text = stripLinkAttrLists(text);
  text = fixMarkdownLinks(text, fileRelPath);
  text = fixImagePaths(text, fileRelPath);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text, 'utf8');
}

function walkDocs(dir, docsDir, outBase, relBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(dir, entry.name);
    const relPath = path.join(relBase, entry.name);
    const outPath = path.join(outBase, relPath);

    if (entry.isDirectory()) {
      walkDocs(srcPath, docsDir, outBase, relPath);
    } else if (entry.name.endsWith('.md')) {
      process.stdout.write(`  processing: ${relPath}\n`);
      processFile(srcPath, docsDir, outPath, relPath);
    }
  }
}

// Directories to skip (not content)
const SKIP_DIRS = ['assets', 'images', 'overrides', 'includes'];

function walkDocsSmart(dir, docsDir, outBase, relBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const srcPath = path.join(dir, entry.name);
    const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
    const outPath = path.join(outBase, relPath);

    if (entry.isDirectory()) {
      walkDocsSmart(srcPath, docsDir, outBase, relPath);
    } else if (entry.name.endsWith('.md')) {
      process.stdout.write(`  processing: ${relPath}\n`);
      processFile(srcPath, docsDir, outPath, relPath);
    }
  }
}

console.log('Preparing content...');
// Clean output dir
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

walkDocsSmart(DOCS_DIR, DOCS_DIR, OUT_DIR, '');
console.log('Content preparation complete.');
