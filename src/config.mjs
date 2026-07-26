/**
 * config.mjs — load and validate config.json.
 *
 * Validation is strict and fails the build rather than substituting defaults for the
 * things that must be real (the username, above all). Cosmetic fields get sensible
 * fallbacks so a half-filled config still renders.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export class ConfigError extends Error {}

const PLACEHOLDER = '__SET_YOUR_GITHUB_USERNAME__';

/**
 * @param {string} root repository root
 * @returns {Promise<object>} normalised config
 */
export async function loadConfig(root) {
  let raw;
  try {
    raw = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
  } catch (e) {
    throw new ConfigError(`Could not read config.json: ${e.message}`);
  }

  const login = raw.github?.username?.trim();
  if (!login || login === PLACEHOLDER) {
    throw new ConfigError(
      'config.json → github.username is not set.\n' +
        'This project renders only real data, so it needs to know whose data to fetch.\n' +
        'Run:  npm run setup -- --user <your-github-username>',
    );
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(login)) {
    throw new ConfigError(`config.json → github.username "${login}" is not a valid GitHub username.`);
  }

  // Config keys are documented in docs/CONFIG.md; anything absent falls back here.
  return {
    github: {
      username: login,
      excludeRepos: arr(raw.github?.excludeRepos),
      excludeLanguages: arr(raw.github?.excludeLanguages),
      includeForks: Boolean(raw.github?.includeForks),
    },
    player: {
      displayName: str(raw.player?.displayName),
      capNumber: str(raw.player?.capNumber) || '404',
      role: str(raw.player?.role) || 'FULL-STACK ALL-ROUNDER',
      tagline: str(raw.player?.tagline),
      homeGround: str(raw.player?.homeGround),
      socials: {
        linkedin: str(raw.player?.socials?.linkedin),
        twitter: str(raw.player?.socials?.twitter),
        website: str(raw.player?.socials?.website),
        email: str(raw.player?.socials?.email),
      },
    },
    bowling: groups(raw.bowling, 'bowling', 'deliveries'),
    kit: groups(raw.kit, 'kit', 'items'),
    // Capability areas for the batting scene, matched against repository topics.
    // Shape differs from bowling/kit — a flat keyword list, not nested items — so it
    // gets its own normaliser rather than being forced through groups().
    specialism: arr(raw.specialism)
      .map((s, i) => {
        const keywords = arr(s.keywords).map(str).filter(Boolean);
        if (!str(s.area)) throw new ConfigError(`config.json → specialism[${i}] has no "area".`);
        if (!keywords.length) throw new ConfigError(`config.json → specialism[${i}] ("${s.area}") has no "keywords".`);
        return { area: str(s.area), shot: str(s.shot), keywords };
      })
      .filter(Boolean),
    fixtures: {
      mode: raw.fixtures?.mode === 'manual' ? 'manual' : 'auto',
      count: clampInt(raw.fixtures?.count, 1, 8, 4),
      pin: arr(raw.fixtures?.pin),
    },
    trophies: arr(raw.trophies).map((t) => ({
      title: str(t.title),
      issuer: str(t.issuer),
      year: str(t.year),
      url: str(t.url),
    })),
    goals: arr(raw.goals).map(str).filter(Boolean),
    render: {
      cacheBust: raw.render?.cacheBust !== false,
      theme: str(raw.render?.theme) || 'night-match',
    },
  };
}

/** Normalise the two keyword-group sections, which share a shape. */
function groups(value, key, itemsKey) {
  return arr(value).map((g, gi) => {
    const items = arr(g[itemsKey]);
    if (!items.length) throw new ConfigError(`config.json → ${key}[${gi}] has no "${itemsKey}".`);
    return {
      category: str(g.category),
      piece: str(g.piece),
      sub: str(g.sub),
      [itemsKey]: items.map((it, ii) => {
        const kws = arr(it.keywords).map(str).filter(Boolean);
        if (!str(it.name)) throw new ConfigError(`config.json → ${key}[${gi}].${itemsKey}[${ii}] is missing "name".`);
        if (!kws.length)
          throw new ConfigError(
            `config.json → ${key}[${gi}].${itemsKey}[${ii}] ("${it.name}") has no keywords. ` +
              'Keywords are what verify the entry against your real repositories.',
          );
        return { name: str(it.name), keywords: kws };
      }),
    };
  });
}

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? '' : String(v).trim());
const clampInt = (v, lo, hi, dflt) => {
  const nv = Number.parseInt(v, 10);
  return Number.isFinite(nv) ? Math.min(hi, Math.max(lo, nv)) : dflt;
};
