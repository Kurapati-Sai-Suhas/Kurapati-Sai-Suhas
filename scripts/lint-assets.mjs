#!/usr/bin/env node
/**
 * lint-assets.mjs — guardrails for the generated SVGs.
 *
 * GitHub serves README images through the Camo proxy, which silently drops anything it
 * does not like. These checks catch the failure modes that would otherwise ship as a
 * broken image and only be noticed by a visitor:
 *
 *   1. no <script> and no event handlers (stripped, and a security smell)
 *   2. no external references (http/https/data URLs to other hosts) — they never load
 *   3. no <foreignObject> — not rendered inside <img>
 *   4. well-formed XML (parsed via a strict tag-balance check)
 *   5. size budget per file and in total, so the README stays fast
 *   6. an accessible <title> on every scene
 *   7. a prefers-reduced-motion block wherever animation is used
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// `--dir <path>` lets the render smoke test lint into a scratch directory without
// touching the committed assets.
const dirFlag = process.argv.indexOf('--dir');
const DIR = dirFlag >= 0 ? process.argv[dirFlag + 1] : join(ROOT, 'assets', 'generated');

const MAX_FILE = 220 * 1024;
const MAX_TOTAL = 900 * 1024;

const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

let files;
try {
  files = (await readdir(DIR)).filter((f) => f.endsWith('.svg'));
} catch {
  process.stderr.write(`No generated assets at ${DIR}. Run \`npm run build\` first.\n`);
  process.exit(1);
}

if (!files.length) {
  process.stderr.write('No SVGs found to lint.\n');
  process.exit(1);
}

let total = 0;

for (const f of files) {
  const p = join(DIR, f);
  const src = await readFile(p, 'utf8');
  const size = (await stat(p)).size;
  total += size;

  if (/<script[\s>]/i.test(src)) note(f, 'contains <script> (Camo strips it)');
  if (/\son[a-z]+\s*=/i.test(src)) note(f, 'contains an inline event handler');
  if (/<foreignObject/i.test(src)) note(f, 'contains <foreignObject> (not rendered inside <img>)');
  if (/(?:href|xlink:href|src)\s*=\s*"(?:https?:)?\/\//i.test(src)) note(f, 'references an external URL');
  if (/url\(\s*['"]?https?:/i.test(src)) note(f, 'CSS references an external URL');
  if (/@font-face/i.test(src)) note(f, 'declares @font-face (webfonts do not load in Camo)');
  if (!/<title[ >]/i.test(src)) note(f, 'has no <title> (inaccessible)');
  if (/@keyframes/.test(src) && !/prefers-reduced-motion/.test(src))
    note(f, 'animates without a prefers-reduced-motion escape hatch');
  if (size > MAX_FILE) note(f, `is ${kb(size)}, over the ${kb(MAX_FILE)} per-file budget`);

  const balance = checkTags(src);
  if (balance) note(f, `malformed XML — ${balance}`);
}

if (total > MAX_TOTAL) problems.push(`total payload ${kb(total)} exceeds the ${kb(MAX_TOTAL)} budget`);

process.stderr.write(`linted ${files.length} SVGs, ${kb(total)} total\n`);

if (problems.length) {
  process.stderr.write('\nFAILED:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
  process.exit(1);
}
process.stderr.write('all checks passed\n');

/**
 * Lightweight tag-balance check. Not a full parser — it exists to catch the one bug
 * a string-concatenation renderer actually produces: an unclosed group.
 * @returns {string|null} description of the first imbalance, or null
 */
function checkTags(src) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let mt;
  while ((mt = re.exec(src))) {
    const [, closing, name, attrs, selfClose] = mt;
    if (selfClose === '/') continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) return `</${name}> closes <${open ?? 'nothing'}>`;
    } else if (!/^(?:br|img|use)$/i.test(name)) {
      stack.push(name);
    }
    void attrs;
  }
  return stack.length ? `unclosed <${stack[stack.length - 1]}>` : null;
}

function kb(b) {
  return `${(b / 1024).toFixed(1)} KB`;
}
