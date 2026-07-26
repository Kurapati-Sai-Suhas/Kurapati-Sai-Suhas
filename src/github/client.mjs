/**
 * client.mjs — the only module that touches the network.
 *
 * Guarantees:
 *   - Every figure rendered downstream traces back to a real API response. There is no
 *     fallback-to-fake path: if the fetch fails the build fails, loudly.
 *   - Responses are cached to `.cache/github.json` so `--offline` can re-render the
 *     scenes from the last real payload while iterating on design.
 *   - Retries with exponential backoff on 5xx / secondary-rate-limit / network blips.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Q_PROFILE, Q_YEAR, Q_REPOS } from './queries.mjs';
import { fetchAllPublic, RestError } from './rest.mjs';

const API = 'https://api.github.com/graphql';
const REST = 'https://api.github.com';

export class GitHubError extends Error {}
export { RestError };

/** The token, or null when running unauthenticated. */
function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.PROFILE_TOKEN || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST a GraphQL document with bounded retries.
 * @param {string} query
 * @param {object} variables
 * @param {number} [attempt]
 */
async function gql(query, variables, attempt = 0) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'cricket-profile-readme',
    },
    body: JSON.stringify({ query, variables }),
  });

  // Retryable: server errors and abuse/secondary limits.
  if ((res.status >= 500 || res.status === 403 || res.status === 429) && attempt < 4) {
    const retryAfter = Number(res.headers.get('retry-after')) || 0;
    const wait = retryAfter * 1000 || 2 ** attempt * 1200;
    process.stderr.write(`  retry: ${res.status} from GitHub, waiting ${wait}ms\n`);
    await sleep(wait);
    return gql(query, variables, attempt + 1);
  }

  if (!res.ok) {
    throw new GitHubError(`GitHub API ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 400)}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new GitHubError(`GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data?.user) {
    throw new GitHubError(`No such GitHub user: "${variables.login}". Check github.username in config.json.`);
  }
  return json.data;
}

/** Public REST call for data not exposed by GraphQL (e.g. per-user event feed). */
async function rest(path) {
  const res = await fetch(REST + path, {
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cricket-profile-readme',
    },
  });
  if (!res.ok) return null; // non-fatal: these enrich, they don't define
  return res.json();
}

/**
 * Fetch everything the README needs, in the minimum number of round trips.
 * @param {string} login
 * @returns {Promise<object>} raw payload (cached verbatim)
 */
export async function fetchAll(login) {
  // No token: fall back to the public transport rather than failing. Still real data —
  // just the subset GitHub exposes anonymously. See rest.mjs for what that costs.
  if (!token()) return fetchAllPublic(login);

  process.stderr.write(`> fetching live GitHub data for @${login} (authenticated)\n`);

  const { user, rateLimit } = await gql(Q_PROFILE, { login });
  const years = [...user.contributionsCollection.contributionYears].sort((a, b) => a - b);
  process.stderr.write(`  profile ok - ${years.length} contributing year(s), rate limit ${rateLimit.remaining}\n`);

  // --- contributions, year by year (GitHub windows are capped at 12 months) ----
  const nowIso = new Date().toISOString();
  const yearData = [];
  for (const y of years) {
    const from = `${y}-01-01T00:00:00Z`;
    const to = y === years[years.length - 1] ? nowIso : `${y}-12-31T23:59:59Z`;
    const d = await gql(Q_YEAR, { login, from, to });
    yearData.push({ year: y, ...d.user.contributionsCollection });
  }

  // Rolling 12 months powers the "current innings" pitch map.
  const to = new Date();
  const from = new Date(to.getTime() - 364 * 864e5);
  const rolling = (await gql(Q_YEAR, { login, from: from.toISOString(), to: to.toISOString() })).user
    .contributionsCollection;

  // --- repositories (paged) ---------------------------------------------------
  const repos = [];
  let cursor = null;
  do {
    const d = await gql(Q_REPOS, { login, cursor, authorId: user.id });
    const page = d.user.repositories;
    repos.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor && repos.length < 200);
  process.stderr.write(`  repos ok - ${repos.length} public repositories\n`);

  const events = (await rest(`/users/${encodeURIComponent(login)}/events/public?per_page=100`)) || [];

  return {
    fetchedAt: new Date().toISOString(),
    login,
    transport: 'graphql',
    user,
    years: yearData,
    rolling,
    repos,
    events,
  };
}

const cachePath = (root) => join(root, '.cache', 'github.json');

/** Persist the raw payload so `--offline` can re-render without the network. */
export async function saveCache(root, payload) {
  const p = cachePath(root);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(payload, null, 1), 'utf8');
}

/** Load the last real payload. Throws if absent — never silently invents data. */
export async function loadCache(root) {
  try {
    return JSON.parse(await readFile(cachePath(root), 'utf8'));
  } catch {
    throw new GitHubError(
      'No cached payload at .cache/github.json. Run a normal `npm run build` once (with a token) before using --offline.',
    );
  }
}
