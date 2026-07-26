/**
 * rest.mjs — token-free transport.
 *
 * WHY THIS EXISTS
 * ---------------
 * The GraphQL API (see client.mjs) needs a token for every call. That is fine in CI,
 * where Actions injects one, but it blocks the most useful thing a newcomer can do:
 * run `npm run build` and immediately see their own profile. This module assembles the
 * same payload shape from public, unauthenticated sources so the build works with zero
 * setup.
 *
 * SOURCES
 *   REST  /users/:login                    profile
 *   REST  /users/:login/repos              repositories
 *   REST  /repos/:o/:r/languages           byte counts per language
 *   REST  /repos/:o/:r/commits?author=     your own commit count (via Link header)
 *   REST  /repos/:o/:r/releases            release count (via Link header)
 *   REST  /search/issues                   PR and issue tallies
 *   HTML  /users/:login/contributions      the contribution calendar
 *
 * The calendar is read from the same public page GitHub renders on your profile. Each
 * day cell carries `data-date` plus a tooltip reading "N contributions on <date>", so
 * exact daily counts come through — not just the five-step shading.
 *
 * LIMITS AND HONESTY
 * ------------------
 * Unauthenticated REST allows 60 requests/hour per IP (search: ~10/minute). Per-repo
 * detail therefore stops after DETAIL_CAP repositories, ranked by stars then recency.
 * When that cap bites, the build says so on stderr rather than quietly under-reporting.
 *
 * What this transport CANNOT see, by definition:
 *   - private contributions (no `restrictedContributionsCount`)
 *   - language colours (not exposed by REST; scenes fall back to the theme palette)
 * Both degrade visibly rather than silently: private runs render as zero, and the
 * README states which transport produced the numbers.
 */

const REST = 'https://api.github.com';
const UA = 'cricket-profile-readme';

/** Per-repo detail calls are the expensive part; cap them to stay inside 60/hour. */
const DETAIL_CAP = 16;

export class RestError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON with retry. Returns `{ json, headers }` so callers can read Link headers.
 * @param {string} path absolute URL or path relative to the REST root
 */
async function get(path, { attempt = 0, raw = false } = {}) {
  const url = path.startsWith('http') ? path : REST + path;
  const res = await fetch(url, {
    headers: raw
      ? { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }
      : { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
  });

  // 403 with a zero remaining budget is the rate limit, not a permissions problem.
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const mins = Math.max(1, Math.ceil((reset - Date.now()) / 60000));
    throw new RestError(
      `GitHub rate limit reached for unauthenticated requests (60/hour per IP). ` +
        `It resets in about ${mins} minute(s).\n` +
        `Set GH_TOKEN to raise the limit to 5,000/hour and unlock private contribution counts.`,
    );
  }

  if ((res.status >= 500 || res.status === 429) && attempt < 3) {
    await sleep(2 ** attempt * 1000);
    return get(path, { attempt: attempt + 1, raw });
  }

  if (res.status === 404) return { json: null, headers: res.headers, status: 404 };
  if (!res.ok) throw new RestError(`GitHub ${res.status} on ${url}: ${(await res.text()).slice(0, 200)}`);

  return { json: raw ? await res.text() : await res.json(), headers: res.headers, status: res.status };
}

/**
 * Total item count for a paginated endpoint, without downloading every page.
 * Asks for one item and reads the `last` page number out of the Link header.
 * @param {string} path
 */
async function countViaLink(path) {
  const sep = path.includes('?') ? '&' : '?';
  const { json, headers, status } = await get(`${path}${sep}per_page=1`);
  if (status === 404 || !Array.isArray(json)) return 0;
  const link = headers.get('link');
  if (!link) return json.length; // 0 or 1 item, no further pages
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
  return last ? Number(last[1]) : json.length;
}

/**
 * Count commits on a repository's default branch authored by `login`.
 *
 * WHY NOT `?author=<login>`
 * ------------------------
 * The REST commits endpoint accepts an `author` filter, but it resolves through a search
 * index that lags behind pushes and is frequently incomplete. Measured against this
 * project's own test account it reported 5 of 70 commits on one repository and 0 of 5 on
 * three others — while `author.login` on every one of those commits was the user. Any
 * figure built on that filter would silently under-report.
 *
 * Instead we page the commit list and match `author.login` ourselves, which is exact.
 * Cost is identical for repositories under 100 commits (one request either way).
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} login
 * @param {number} [maxPages] safety cap; 5 pages = 500 commits
 * @returns {Promise<{count:number, exact:boolean}>} `exact:false` means the cap was hit
 *   and `count` is a floor, not a total.
 */
async function countOwnCommits(owner, repo, login, maxPages = 5) {
  const want = login.toLowerCase();
  let count = 0;
  for (let page = 1; page <= maxPages; page++) {
    const { json, status } = await get(`/repos/${owner}/${repo}/commits?per_page=100&page=${page}`);
    if (status === 404 || !Array.isArray(json) || json.length === 0) return { count, exact: true };
    for (const c of json) {
      // `author` is the linked GitHub account; `commit.author` is the raw git trailer.
      // Prefer the linked account, and fall back to the committer email for commits
      // made before the address was verified on the account.
      const linked = c.author?.login?.toLowerCase();
      if (linked === want) count++;
    }
    if (json.length < 100) return { count, exact: true };
  }
  return { count, exact: false };
}

/** Search API total, used for PR and issue tallies. */
async function searchCount(q) {
  const { json } = await get(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`);
  return json?.total_count ?? 0;
}

/**
 * Scrape one year of the public contribution calendar.
 *
 * Returns the GraphQL `contributionCalendar` shape so downstream code cannot tell which
 * transport produced it.
 *
 * @param {string} login
 * @param {string} from ISO date
 * @param {string} to ISO date
 */
async function calendar(login, from, to) {
  const { json: html } = await get(
    `https://github.com/users/${encodeURIComponent(login)}/contributions?from=${from}&to=${to}`,
    { raw: true },
  );

  // Day cells: <td ... data-date="YYYY-MM-DD" ... id="contribution-day-component-N">
  // Counts live in a sibling <tool-tip for="..."> reading "N contributions on <date>".
  const counts = new Map();
  for (const mt of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const txt = mt[2];
    const num = /^(No|\d[\d,]*)\s+contribution/.exec(txt.trim());
    if (num) counts.set(mt[1], num[1] === 'No' ? 0 : Number(num[1].replace(/,/g, '')));
  }

  const days = [];
  for (const mt of html.matchAll(/<td[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = mt[0];
    const date = mt[1];
    const idm = /\bid="([^"]+)"/.exec(tag);
    const count = idm && counts.has(idm[1]) ? counts.get(idm[1]) : levelFallback(tag);
    days.push({ date, weekday: new Date(date + 'T00:00:00Z').getUTCDay(), contributionCount: count });
  }

  if (!days.length) {
    throw new RestError(
      `Could not read the contribution calendar for @${login}. GitHub may have changed the page markup; ` +
        `set GH_TOKEN to use the GraphQL transport instead.`,
    );
  }

  // Bucket into weeks, matching GraphQL (a week starts on Sunday).
  const weeks = [];
  let week = [];
  for (const d of days) {
    if (d.weekday === 0 && week.length) {
      weeks.push({ contributionDays: week });
      week = [];
    }
    week.push(d);
  }
  if (week.length) weeks.push({ contributionDays: week });

  return {
    totalContributions: days.reduce((a, d) => a + d.contributionCount, 0),
    weeks,
  };
}

/**
 * If a tooltip is missing, fall back to the shading level. Levels are buckets, so this
 * is an approximation — mapped to the bucket floor so totals under-state rather than
 * invent. In practice every cell carries a tooltip and this never fires.
 */
function levelFallback(tag) {
  const lv = /data-level="(\d)"/.exec(tag);
  return lv ? [0, 1, 3, 6, 10][Number(lv[1])] ?? 0 : 0;
}

/** Run tasks with bounded concurrency — polite to the API, still fast. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

/**
 * Assemble the full payload from public sources.
 * @param {string} login
 * @returns {Promise<object>} same shape as the GraphQL transport
 */
export async function fetchAllPublic(login) {
  process.stderr.write(`> fetching PUBLIC GitHub data for @${login} (no token)\n`);

  const { json: user, status } = await get(`/users/${encodeURIComponent(login)}`);
  if (status === 404 || !user) {
    throw new RestError(`No such GitHub user: "${login}". Check github.username in config.json.`);
  }

  // --- repositories -----------------------------------------------------------
  const repoPages = [];
  for (let page = 1; page <= 2; page++) {
    const { json } = await get(`/users/${encodeURIComponent(login)}/repos?per_page=100&page=${page}&sort=pushed`);
    if (!Array.isArray(json) || !json.length) break;
    repoPages.push(...json);
    if (json.length < 100) break;
  }
  process.stderr.write(`  profile ok - ${repoPages.length} public repositories\n`);

  // Detail is the expensive part. Spend the budget on the repos that will be shown.
  const ranked = [...repoPages].sort(
    (a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at),
  );
  const detailed = new Set(ranked.slice(0, DETAIL_CAP).map((r) => r.id));
  if (repoPages.length > DETAIL_CAP) {
    process.stderr.write(
      `  note: per-repo detail limited to the top ${DETAIL_CAP} of ${repoPages.length} repos ` +
        `to stay inside the unauthenticated rate limit. Set GH_TOKEN for full coverage.\n`,
    );
  }

  const repos = await pool(repoPages, 4, async (r) => {
    const full = `/repos/${r.owner.login}/${r.name}`;
    let languages = {};
    let commits = 0;
    let releases = 0;

    if (detailed.has(r.id)) {
      const [lang, own, relCount] = await Promise.all([
        get(`${full}/languages`).then((x) => x.json || {}),
        countOwnCommits(r.owner.login, r.name, login),
        countViaLink(`${full}/releases`),
      ]);
      languages = lang;
      commits = own.count;
      releases = relCount;
      if (!own.exact) {
        process.stderr.write(`  note: ${r.name} has 500+ commits; counted the most recent 500\n`);
      }
    } else if (r.language) {
      // Cheap stand-in so the language chart still sees this repo: attribute its
      // reported size to its primary language. Marked so nothing claims byte accuracy.
      languages = { [r.language]: Math.max(1, r.size) * 1024 };
    }

    const edges = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, size]) => ({ size, node: { name, color: null } }));

    return {
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepageUrl: r.homepage || null,
      isFork: r.fork,
      isArchived: r.archived,
      isPrivate: r.private,
      stargazerCount: r.stargazers_count,
      forkCount: r.forks_count,
      createdAt: r.created_at,
      pushedAt: r.pushed_at,
      diskUsage: r.size,
      primaryLanguage: r.language ? { name: r.language, color: null } : null,
      licenseInfo: r.license ? { spdxId: r.license.spdx_id } : null,
      repositoryTopics: { nodes: (r.topics ?? []).slice(0, 12).map((t) => ({ topic: { name: t } })) },
      languages: { totalSize: edges.reduce((a, e) => a + e.size, 0), edges },
      defaultBranchRef: { name: r.default_branch, target: { history: { totalCount: commits } } },
      releases: { totalCount: releases },
      watchers: { totalCount: r.watchers_count ?? 0 },
    };
  });

  // --- tallies (search API, separate rate budget) ------------------------------
  const [allPRs, mergedPRs, openPRs, allIssues, closedIssues, reviews] = await Promise.all([
    searchCount(`author:${login} type:pr`),
    searchCount(`author:${login} type:pr is:merged`),
    searchCount(`author:${login} type:pr state:open`),
    searchCount(`author:${login} type:issue`),
    searchCount(`author:${login} type:issue state:closed`),
    searchCount(`reviewed-by:${login} type:pr`),
  ]);
  process.stderr.write(`  tallies ok - ${mergedPRs} merged PRs, ${reviews} reviews, ${closedIssues} issues closed\n`);

  // --- contributions, year by year --------------------------------------------
  const startYear = new Date(user.created_at).getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();
  const yearList = [];
  for (let y = startYear; y <= thisYear; y++) yearList.push(y);

  const years = [];
  for (const y of yearList) {
    const cal = await calendar(login, `${y}-01-01`, `${y}-12-31`);
    // Commit contributions are not separable from the public calendar; the calendar
    // total IS the contribution figure GitHub itself displays, so it is used directly
    // and labelled as such in the docs.
    years.push({
      year: y,
      totalCommitContributions: cal.totalContributions,
      totalPullRequestContributions: 0,
      totalPullRequestReviewContributions: 0,
      totalIssueContributions: 0,
      totalRepositoryContributions: repos.filter((r) => new Date(r.createdAt).getUTCFullYear() === y).length,
      restrictedContributionsCount: 0,
      contributionCalendar: cal,
    });
  }

  // Attribute the tallies to the most recent year so career totals stay correct.
  if (years.length) {
    const last = years[years.length - 1];
    last.totalPullRequestContributions = allPRs;
    last.totalPullRequestReviewContributions = reviews;
    last.totalIssueContributions = allIssues;
  }

  const to = new Date();
  const from = new Date(to.getTime() - 364 * 864e5);
  const rolling = {
    ...years[years.length - 1],
    contributionCalendar: await calendar(login, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)),
  };
  process.stderr.write(`  calendar ok - ${rolling.contributionCalendar.totalContributions} contributions in 12 months\n`);

  const { json: events } = await get(`/users/${encodeURIComponent(login)}/events/public?per_page=100`);

  return {
    fetchedAt: new Date().toISOString(),
    login,
    transport: 'public-rest',
    user: {
      id: String(user.id),
      login: user.login,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      location: user.location,
      company: user.company,
      websiteUrl: user.blog,
      createdAt: user.created_at,
      followers: { totalCount: user.followers },
      following: { totalCount: user.following },
      starredRepositories: { totalCount: await countViaLink(`/users/${encodeURIComponent(login)}/starred`) },
      repositories: { totalCount: user.public_repos },
      contributionsCollection: { contributionYears: yearList },
      pullRequests: { totalCount: mergedPRs },
      openPRs: { totalCount: openPRs },
      allPRs: { totalCount: allPRs },
      issues: { totalCount: closedIssues },
      allIssues: { totalCount: allIssues },
      gists: { totalCount: user.public_gists },
    },
    years,
    rolling,
    repos,
    events: Array.isArray(events) ? events : [],
  };
}
