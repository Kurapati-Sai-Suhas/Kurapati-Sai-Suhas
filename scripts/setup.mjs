#!/usr/bin/env node
/**
 * setup.mjs — one-time configuration.
 *
 *   npm run setup -- --user <github-username> [--name "SUHAS"] [--cap 404]
 *
 * Writes straight into config.json, preserving comments-as-keys (`_comment_*`) and
 * every other field. Kept separate from the build so `npm run build` never mutates
 * configuration behind your back.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = join(ROOT, 'config.json');

const argv = process.argv.slice(2);
const get = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};

const user = get('--user');
const name = get('--name');
const cap = get('--cap');

if (!user && !name && !cap) {
  process.stderr.write(
    'Usage: npm run setup -- --user <github-username> [--name "DISPLAY NAME"] [--cap 404]\n',
  );
  process.exit(1);
}

if (user && !/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(user)) {
  process.stderr.write(`"${user}" is not a valid GitHub username.\n`);
  process.exit(1);
}

const cfg = JSON.parse(await readFile(FILE, 'utf8'));
if (user) cfg.github.username = user;
if (name) cfg.player.displayName = name.toUpperCase();
if (cap) cfg.player.capNumber = String(cap);

await writeFile(FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');

process.stderr.write(
  `config.json updated.\n` +
    (user ? `  github.username    = ${cfg.github.username}\n` : '') +
    (name ? `  player.displayName = ${cfg.player.displayName}\n` : '') +
    (cap ? `  player.capNumber   = ${cfg.player.capNumber}\n` : '') +
    `\nNext:  GH_TOKEN=<token> npm run build\n`,
);
