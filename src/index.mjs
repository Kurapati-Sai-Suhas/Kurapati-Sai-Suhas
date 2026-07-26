#!/usr/bin/env node
/**
 * index.mjs — build orchestrator.
 *
 *   config.json ──┐
 *                 ├─> fetch (GitHub GraphQL) ─> metrics ─> scenes ─> assets/generated/*.svg
 *   GITHUB_TOKEN ─┘                              │                └─> README.md
 *                                                └─> commentary
 *
 * Flags:
 *   --offline      re-render from .cache/github.json instead of hitting the network
 *   --dry          render and report, write nothing
 *   --user <name>  override config.json → github.username for this run
 *
 * Exit codes: 0 success, 1 configuration/API failure.
 */

import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig, ConfigError } from './config.mjs';
import { fetchAll, loadCache, saveCache, GitHubError, RestError } from './github/client.mjs';
import { buildMetrics } from './data/metrics.mjs';
import { buildCommentary } from './data/commentary.mjs';
import { renderReadme } from './render/readme.mjs';

import * as hero from './render/components/hero.mjs';
import * as scoreboard from './render/components/scoreboard.mjs';
import * as playerCard from './render/components/player-card.mjs';
import * as batting from './render/components/batting.mjs';
import * as bowling from './render/components/bowling.mjs';
import * as kit from './render/components/kit.mjs';
import * as trophies from './render/components/trophies.mjs';
import * as pitchmap from './render/components/pitchmap.mjs';
import * as commentaryScene from './render/components/commentary.mjs';
import * as footer from './render/components/footer.mjs';
import { renderAll as renderFixtures } from './render/components/fixtures.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'assets', 'generated');

/** Minimal flag parser — no dependency needed for four options. */
function args(argv) {
  const f = { offline: false, dry: false, user: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--offline') f.offline = true;
    else if (argv[i] === '--dry') f.dry = true;
    else if (argv[i] === '--user') f.user = argv[++i];
  }
  return f;
}

async function main() {
  const flags = args(process.argv.slice(2));
  const t0 = Date.now();

  const config = await loadConfig(ROOT);
  if (flags.user) config.github.username = flags.user;

  // ---------------------------------------------------------------- data ----
  const raw = flags.offline ? await loadCache(ROOT) : await fetchAll(config.github.username);
  if (!flags.offline && !flags.dry) await saveCache(ROOT, raw);

  const m = buildMetrics(raw, config);
  const lines = buildCommentary(m, config);

  log(
    `  metrics: ${m.totals.contributions.toLocaleString('en-US')} contributions · ` +
      `${m.totals.repos} repos · ${m.totals.stars} stars · ${m.streak.current}d streak`,
  );

  // -------------------------------------------------------------- render ----
  /** @type {{file:string,markup:string}[]} */
  const scenes = [
    { file: hero.file, markup: hero.render(m, config) },
    { file: scoreboard.file, markup: scoreboard.render(m, config) },
    { file: playerCard.file, markup: playerCard.render(m, config) },
    { file: batting.file, markup: batting.render(m, config) },
    { file: bowling.file, markup: bowling.render(m, config) },
    { file: kit.file, markup: kit.render(m, config) },
    { file: trophies.file, markup: trophies.render(m, config) },
    { file: pitchmap.file, markup: pitchmap.render(m, config) },
    { file: commentaryScene.file, markup: commentaryScene.render(m, lines) },
    { file: footer.file, markup: footer.render(m, config) },
  ];

  const fixtures = renderFixtures(m);
  scenes.push(...fixtures.map((f) => ({ file: f.file, markup: f.markup })));

  const stamp = Math.floor(new Date(m.fetchedAt).getTime() / 1000);
  const readme = renderReadme(m, config, { fixtures, stamp });

  // --------------------------------------------------------------- write ----
  if (flags.dry) {
    report(scenes, readme, t0, true);
    return;
  }

  await mkdir(OUT, { recursive: true });
  // Drop fixture SVGs from previous runs so a shrinking fixture list doesn't leave orphans.
  for (const f of await readdir(OUT).catch(() => [])) {
    if (/^fixture-\d+\.svg$/.test(f) && !fixtures.some((x) => x.file === f)) await rm(join(OUT, f));
  }

  await Promise.all(scenes.map((s) => writeFile(join(OUT, s.file), s.markup, 'utf8')));
  await writeFile(join(ROOT, 'README.md'), readme, 'utf8');

  // A machine-readable snapshot of exactly what was rendered. Makes the "no dummy
  // data" claim checkable by anyone reading the repo.
  await writeFile(join(OUT, 'metrics.json'), JSON.stringify(m, null, 2), 'utf8');

  report(scenes, readme, t0, false);
}

function report(scenes, readme, t0, dry) {
  const total = scenes.reduce((a, s) => a + Buffer.byteLength(s.markup), 0);
  const biggest = [...scenes].sort((a, b) => Buffer.byteLength(b.markup) - Buffer.byteLength(a.markup))[0];
  log(`  ${dry ? 'would write' : 'wrote'} ${scenes.length} SVG scenes + README.md`);
  log(`  payload: ${kb(total)} total, largest ${biggest.file} at ${kb(Buffer.byteLength(biggest.markup))}`);
  log(`  README:  ${kb(Buffer.byteLength(readme))}`);
  log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (total > 900_000) log('  ! payload over 900 KB — consider trimming scene count or crowd density');
}

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const log = (s) => process.stderr.write(s + '\n');

main().catch((err) => {
  const known = err instanceof ConfigError || err instanceof GitHubError || err instanceof RestError;
  process.stderr.write(`\n${known ? 'BUILD STOPPED' : 'UNEXPECTED ERROR'}\n${err.message}\n`);
  if (!known) process.stderr.write(String(err.stack) + '\n');
  process.exit(1);
});
