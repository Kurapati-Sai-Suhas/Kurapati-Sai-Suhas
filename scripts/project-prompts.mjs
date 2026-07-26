#!/usr/bin/env node
/**
 * project-prompts.mjs — generate a starter Claude prompt for each of your repositories.
 *
 *   node scripts/project-prompts.mjs           # writes docs/PROJECT-PROMPTS.md
 *   node scripts/project-prompts.mjs --stdout  # print instead
 *
 * Reads `.cache/github.json`, the raw payload from the last real build, so every prompt
 * is seeded with true facts about the repository — language mix, your commit count,
 * stars, topics, last activity. Run `npm run build` first if the cache is missing.
 *
 * WHY GENERATE THESE
 * ------------------
 * A cold Claude chat knows nothing about your repository, so the first few turns get
 * spent re-establishing context you already have. These prompts front-load the facts and
 * state what "done" looks like, which is the part people usually leave out.
 *
 * Each prompt deliberately ends with an instruction to ASK before assuming. The facts
 * here come from the GitHub API; the intent behind the project only you know, and a
 * prompt that pretends otherwise produces confident, wrong work.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'docs', 'PROJECT-PROMPTS.md');

let raw;
try {
  raw = JSON.parse(await readFile(join(ROOT, '.cache', 'github.json'), 'utf8'));
} catch {
  process.stderr.write('No .cache/github.json — run `npm run build` once first.\n');
  process.exitCode = 1;
}

if (raw) {
  const repos = raw.repos
    .filter((r) => !r.isFork)
    .sort((a, b) => b.stargazerCount - a.stargazerCount || new Date(b.pushedAt) - new Date(a.pushedAt));

  const out = [];
  const w = (s = '') => out.push(s);

  w('# Per-project Claude prompts');
  w();
  w(`Generated from the last real API payload (${raw.fetchedAt}) for [@${raw.login}](https://github.com/${raw.login}).`);
  w('Regenerate with `node scripts/project-prompts.mjs` after your repositories change.');
  w();
  w('**How to use:** open a new Claude chat per repository, paste the block, then add your');
  w('actual goal for the session on the last line. One chat per project keeps context tight —');
  w('a single chat spanning five repositories spends most of its budget re-reading the wrong one.');
  w();
  w('---');
  w();
  w('## The reusable template');
  w();
  w('Use this for any repository, including ones created after this file was generated.');
  w();
  w('```text');
  w('You are helping me on ONE repository: <owner>/<name>.');
  w();
  w('Context');
  w('- Stack: <languages / frameworks>');
  w('- What it does: <one sentence, in your words>');
  w('- Current state: <working / half-built / prototype>, <N> commits by me');
  w('- Who uses it: <just me / demo for recruiters / real users>');
  w();
  w('Ground rules');
  w('- Read the code before proposing changes. Do not guess at file contents.');
  w('- Match the existing style. No new dependencies without telling me why.');
  w('- If something is ambiguous, ask me instead of assuming.');
  w('- Show me the diff and what you verified. Say plainly if you could not test it.');
  w();
  w("Today's task");
  w('<the one thing you want done>');
  w('```');
  w();
  w('---');
  w();

  for (const r of repos) {
    const langs = (r.languages?.edges ?? []).map((e) => e.node.name);
    const commits = r.defaultBranchRef?.target?.history?.totalCount ?? 0;
    const topics = (r.repositoryTopics?.nodes ?? []).map((t) => t.topic.name);
    const days = Math.round((Date.now() - new Date(r.pushedAt).getTime()) / 864e5);

    w(`## ${r.name}`);
    w();
    w(`<${r.url}>`);
    w();
    w(
      `| language | commits by you | stars | topics | last push |\n| :-- | --: | --: | :-- | --: |\n` +
        `| ${r.primaryLanguage?.name ?? '—'} | ${commits} | ${r.stargazerCount} | ` +
        `${topics.length ? topics.join(', ') : '**none — add some**'} | ${days}d ago |`,
    );
    w();
    w('```text');
    w(`You are helping me on ONE repository: ${raw.login}/${r.name}.`);
    w();
    w('Verified facts (from the GitHub API, do not re-derive these):');
    w(`- Primary language: ${r.primaryLanguage?.name ?? 'not detected'}`);
    if (langs.length > 1) w(`- Language mix: ${langs.join(', ')}`);
    w(`- My own commits on the default branch: ${commits}`);
    w(`- Stars: ${r.stargazerCount} | Forks: ${r.forkCount} | Last push: ${days} days ago`);
    if (topics.length) w(`- Topics: ${topics.join(', ')}`);
    else w('- Topics: NONE SET (this repo is invisible to GitHub search)');
    if (r.description) w(`- Description: ${r.description}`);
    else w('- Description: NOT SET');
    w();
    w('What I need from you first:');
    w('1. Read the repository and tell me back, in five lines, what it actually does');
    w('   and how it is structured. If that disagrees with what I say below, say so.');
    if (!r.description || !topics.length) {
      w(`2. Propose a one-line description${!topics.length ? ' and 5-8 GitHub topics' : ''}`);
      w('   based on what is really in the code, not on the repo name.');
      w('3. Then wait for my task.');
    } else {
      w('2. Then wait for my task.');
    }
    w();
    w('Ground rules:');
    w('- Read before proposing. Never guess at file contents.');
    w('- Match the existing style. Justify any new dependency.');
    w('- Ask when ambiguous rather than assuming.');
    w('- Report what you verified, and say plainly what you could not test.');
    w();
    w('My goal this session: <FILL THIS IN>');
    w('```');
    w();
  }

  const body = out.join('\n');
  if (process.argv.includes('--stdout')) {
    process.stdout.write(body);
  } else {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, body, 'utf8');
    process.stderr.write(`wrote ${OUT} (${repos.length} repositories)\n`);
  }
}
