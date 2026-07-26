#!/usr/bin/env node
/**
 * preview.mjs — build a single self-contained page showing every rendered scene.
 *
 * Why not just open the SVGs: animations restart per file, sizes are hard to compare,
 * and you cannot see the running order. This inlines all of them in README order so you
 * can judge the whole innings at once, at the width GitHub actually renders.
 *
 *   node scripts/preview.mjs            -> preview.html
 *   node scripts/preview.mjs --open     -> and open it in the default browser
 *
 * The output is gitignored. It is a local review tool, not a deliverable.
 *
 * NOTE ON IDS: each scene defines its own glyph atlas (`#g65`, `#g66`, ...). Inlined
 * into one HTML document those ids collide, and every `<use>` resolves to the first
 * match. That is harmless — a given glyph has identical geometry in every scene — but it
 * is why this page is a preview and not a shipping artefact. On GitHub each SVG is its
 * own document and no collision is possible.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'assets', 'generated');
const OUT = join(ROOT, 'preview.html');

/** README running order; anything unlisted is appended alphabetically. */
const ORDER = [
  'hero.svg',
  'scoreboard.svg',
  'player-card.svg',
  'batting.svg',
  'bowling.svg',
  'kit.svg',
  'fixture-1.svg',
  'fixture-2.svg',
  'fixture-3.svg',
  'fixture-4.svg',
  'trophies.svg',
  'pitchmap.svg',
  'commentary.svg',
  'footer.svg',
];

let files;
try {
  files = (await readdir(DIR)).filter((f) => f.endsWith('.svg'));
} catch {
  process.stderr.write(`Nothing to preview — ${DIR} does not exist. Run \`npm run build\` first.\n`);
  process.exit(1);
}

const ordered = [...ORDER.filter((f) => files.includes(f)), ...files.filter((f) => !ORDER.includes(f)).sort()];

let metrics = null;
try {
  metrics = JSON.parse(await readFile(join(DIR, 'metrics.json'), 'utf8'));
} catch {
  /* optional */
}

const parts = [];
for (const f of ordered) {
  const svg = await readFile(join(DIR, f), 'utf8');
  const kb = (Buffer.byteLength(svg) / 1024).toFixed(1);
  parts.push(`<h3>${f} <span>${kb} KB</span></h3>${svg}`);
}

const banner = metrics
  ? `<p class="meta">@${metrics.profile.login} &middot; transport <b>${metrics.transport}</b> &middot; ` +
    `${metrics.totals.contributions.toLocaleString('en-US')} contributions &middot; ` +
    `${metrics.totals.repos} repos &middot; ${metrics.totals.stars} stars &middot; ` +
    `${metrics.streak.current}-day streak &middot; built ${metrics.fetchedAt}</p>`
  : '';

const html =
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>Cricket profile README — scene preview</title><style>` +
  `:root{color-scheme:dark}` +
  `body{background:#0d1117;color:#c9d1d9;margin:0;padding:24px 16px;` +
  `font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}` +
  `.w{max-width:920px;margin:0 auto}` +
  `h1{font-size:18px;margin:0 0 4px}` +
  `.meta{color:#8b949e;font-size:12px;margin:0 0 24px;font-family:ui-monospace,monospace}` +
  `h3{color:#8b949e;font-size:11px;font-family:ui-monospace,monospace;` +
  `margin:22px 0 6px;display:flex;justify-content:space-between;align-items:baseline}` +
  `h3 span{color:#484f58}` +
  `svg{display:block;width:100%;height:auto;border:1px solid #30363d;border-radius:6px}` +
  `</style></head><body><div class="w">` +
  `<h1>Scene preview</h1>${banner}${parts.join('')}` +
  `</div></body></html>`;

await writeFile(OUT, html, 'utf8');
process.stderr.write(`preview written: ${OUT} (${ordered.length} scenes)\n`);

if (process.argv.includes('--open')) {
  const { spawn } = await import('node:child_process');
  const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [OUT], { detached: true, stdio: 'ignore' }).unref();
}
