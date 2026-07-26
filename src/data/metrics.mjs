/**
 * metrics.mjs — turns a raw GitHub payload into a cricket scorecard.
 *
 * THE CONTRACT
 * ------------
 * Every field returned here is a pure function of the API response. Nothing is
 * hard-coded, sampled, randomised or rounded up for looks. Where a cricket concept has
 * no exact GitHub analogue the mapping is stated in a comment next to it, so a reader
 * can always answer "where did this number come from?".
 *
 * MAPPING TABLE
 * -------------
 *  Runs            = commit contributions
 *  Innings         = days with at least one contribution
 *  Matches         = distinct repositories contributed to
 *  Highest score   = busiest single day
 *  Average         = runs / innings
 *  Strike rate     = runs per 100 days since debut
 *  Centuries       = calendar months with 100+ contributions
 *  Fifties         = calendar months with 50-99 contributions
 *  Fours           = pull requests opened
 *  Sixes           = releases published
 *  Not out         = current daily streak
 *  Overs           = pull request reviews
 *  Wickets         = pull requests merged
 *  Runs conceded   = issues opened
 *  Catches         = issues closed
 *  Big spells      = repositories with 50+ of your own commits
 */

/** Sum a numeric field across an array. */
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const div = (a, b) => (b > 0 ? a / b : 0);
const pct = (a, b) => Math.round(div(a, b) * 1000) / 10;

/** ISO date -> YYYY-MM key. */
const monthKey = (iso) => iso.slice(0, 7);

/**
 * Flatten every yearly contribution calendar into one chronological day list.
 * Duplicates (year boundaries overlap by design in the rolling window) are collapsed
 * by date, keeping the highest count seen.
 * @param {Array} years
 * @returns {{date:string,count:number}[]}
 */
function mergeDays(years) {
  const byDate = new Map();
  for (const y of years) {
    for (const w of y.contributionCalendar?.weeks ?? []) {
      for (const d of w.contributionDays) {
        const prev = byDate.get(d.date) ?? 0;
        if (d.contributionCount > prev) byDate.set(d.date, d.contributionCount);
      }
    }
  }
  return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
}

/**
 * Current streak (counts back from today; a blank today does not break it until
 * tomorrow, matching how GitHub itself presents streaks) and the longest ever run.
 */
function streaks(days) {
  let longest = 0;
  let run = 0;
  let longestEnd = null;
  for (const d of days) {
    if (d.count > 0) {
      run++;
      if (run > longest) {
        longest = run;
        longestEnd = d.date;
      }
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue; // today not logged yet — grace period
    else break;
  }
  return { current, longest, longestEnd };
}

/** Aggregate contributions per calendar month for century / fifty counting. */
function months(days) {
  const m = new Map();
  for (const d of days) m.set(monthKey(d.date), (m.get(monthKey(d.date)) ?? 0) + d.count);
  return m;
}

/**
 * Case-insensitive matcher used by the bowling arsenal and kit bag.
 * A repo "uses" a technology when any keyword appears in its language list, topics,
 * name or description — the same signals a human would scan for.
 * @param {object} repo
 * @param {string[]} keywords
 */
export function repoMatches(repo, keywords) {
  const hay = [
    repo.name,
    repo.description ?? '',
    repo.primaryLanguage?.name ?? '',
    ...(repo.languages?.edges ?? []).map((e) => e.node.name),
    ...(repo.repositoryTopics?.nodes ?? []).map((t) => t.topic.name),
  ]
    .join(' ')
    .toLowerCase();

  return keywords.some((k) => {
    const kw = k.toLowerCase();
    // Word-ish boundary so "go" doesn't match "google" and "c" doesn't match everything.
    return new RegExp(`(^|[^a-z0-9+#])${escapeRe(kw)}([^a-z0-9+#]|$)`).test(hay);
  });
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Own-commit count on a repo's default branch (0 when the branch is empty). */
const ownCommits = (r) => r.defaultBranchRef?.target?.history?.totalCount ?? 0;

/**
 * Build the full derived model.
 * @param {object} raw payload from client.fetchAll
 * @param {object} config
 */
export function buildMetrics(raw, config) {
  const { user, years, rolling, repos: allRepos, events } = raw;

  const ex = new Set((config.github.excludeRepos ?? []).map((s) => s.toLowerCase()));
  const repos = allRepos.filter(
    (r) => !ex.has(r.name.toLowerCase()) && (config.github.includeForks ? true : !r.isFork),
  );

  // GitHub pads the current week out to Saturday, so the tail can contain dates that
  // have not happened yet. Trim them or the streak walks off the end of the calendar.
  const today = new Date().toISOString().slice(0, 10);
  const days = mergeDays([...years, rolling]).filter((d) => d.date <= today);
  const activeDays = days.filter((d) => d.count > 0);
  const { current: currentStreak, longest: longestStreak } = streaks(days);
  const monthTotals = months(days);

  // --- batting ---------------------------------------------------------------
  const runs = sum(years, (y) => y.totalCommitContributions);
  const privateRuns = sum(years, (y) => y.restrictedContributionsCount);
  const innings = activeDays.length;
  const debut = days.find((d) => d.count > 0)?.date ?? user.createdAt.slice(0, 10);
  const daysSinceDebut = Math.max(1, Math.round((Date.now() - new Date(debut).getTime()) / 864e5));
  const highest = activeDays.reduce((m, d) => Math.max(m, d.count), 0);
  const highestOn = activeDays.find((d) => d.count === highest)?.date ?? null;
  const centuries = [...monthTotals.values()].filter((v) => v >= 100).length;
  const fifties = [...monthTotals.values()].filter((v) => v >= 50 && v < 100).length;
  const releases = sum(repos, (r) => r.releases?.totalCount);

  const batting = {
    matches: sum(years, (y) => y.totalRepositoryContributions) || repos.length,
    innings,
    runs,
    privateRuns,
    notOut: currentStreak,
    highest,
    highestOn,
    average: Math.round(div(runs, innings) * 100) / 100,
    strikeRate: Math.round(div(runs, daysSinceDebut) * 100 * 10) / 10,
    centuries,
    fifties,
    fours: user.allPRs.totalCount, // every PR opened is a boundary found
    sixes: releases, // a shipped release clears the rope
    debut,
    daysSinceDebut,
    consistency: pct(innings, daysSinceDebut), // % of career days at the crease
  };

  // --- bowling ---------------------------------------------------------------
  const overs = sum(years, (y) => y.totalPullRequestReviewContributions);
  const wickets = user.pullRequests.totalCount;
  const conceded = user.allIssues.totalCount;
  const bigSpells = repos.filter((r) => ownCommits(r) >= 50).length;

  const bowling = {
    overs,
    wickets,
    conceded,
    economy: Math.round(div(conceded, overs) * 100) / 100,
    average: Math.round(div(conceded, wickets) * 100) / 100,
    strikeRate: Math.round(div(overs * 6, wickets) * 10) / 10, // balls per wicket
    catches: user.issues.totalCount,
    bigSpells,
    maidens: repos.filter((r) => r.isArchived).length, // spells bowled out and closed off
  };

  // --- languages = batting shots --------------------------------------------
  const exLang = new Set((config.github.excludeLanguages ?? []).map((s) => s.toLowerCase()));
  const langBytes = new Map();
  const langRepos = new Map();
  for (const r of repos) {
    for (const e of r.languages?.edges ?? []) {
      const name = e.node.name;
      if (exLang.has(name.toLowerCase())) continue;
      langBytes.set(name, (langBytes.get(name) ?? 0) + e.size);
      if (!langRepos.has(name)) langRepos.set(name, new Set());
      langRepos.get(name).add(r.name);
      if (!LANG_COLOR.has(name)) LANG_COLOR.set(name, e.node.color || null);
    }
  }
  const totalBytes = [...langBytes.values()].reduce((a, b) => a + b, 0);
  const langRanked = [...langBytes.entries()].sort((a, b) => b[1] - a[1]);
  // Drop the long tail. A language holding under 0.5% of your bytes renders as "0%",
  // which reads as a bug rather than a fact — but never cut below three strokes, or a
  // focused profile ends up with an empty wagon wheel.
  const significant = langRanked.filter(([, bytes]) => pct(bytes, totalBytes) >= 0.5);
  const languages = (significant.length >= 3 ? significant : langRanked.slice(0, 3))
    .slice(0, 6)
    .map(([name, bytes]) => ({
      name,
      bytes,
      share: pct(bytes, totalBytes),
      repos: langRepos.get(name).size,
      color: LANG_COLOR.get(name) || null,
      // "Runs" scored with this shot: KiB of source written.
      runs: Math.round(bytes / 1024),
    }));

  // --- bowling arsenal (config-declared tech, live-verified usage) -----------
  const arsenal = (config.bowling ?? []).map((group) => {
    const deliveries = group.deliveries
      .map((d) => {
        const hits = repos.filter((r) => repoMatches(r, d.keywords));
        const oversBowled = sum(hits, ownCommits);
        return {
          name: d.name,
          wickets: hits.length, // repositories where it shows up
          overs: oversBowled, // your commits inside them
          stars: sum(hits, (r) => r.stargazerCount),
          lastUsed: hits.map((r) => r.pushedAt).sort().pop() ?? null,
        };
      })
      .sort((a, b) => b.overs - a.overs || b.wickets - a.wickets);

    const peak = Math.max(1, ...deliveries.map((d) => d.overs));
    // Pace is a presentation of real workload, not an invented number:
    // 118 kph floor + up to 42 kph scaled by this delivery's share of your busiest one.
    for (const d of deliveries) d.pace = Math.round(118 + 42 * Math.sqrt(div(d.overs, peak)));
    return { category: group.category, deliveries };
  });

  // --- kit bag ---------------------------------------------------------------
  const kit = (config.kit ?? []).map((piece) => ({
    piece: piece.piece,
    sub: piece.sub,
    items: piece.items
      .map((it) => {
        const hits = repos.filter((r) => repoMatches(r, it.keywords));
        return { name: it.name, usedIn: hits.length, commits: sum(hits, ownCommits) };
      })
      .sort((a, b) => b.usedIn - a.usedIn || b.commits - a.commits),
  }));

  // --- fixtures = featured repositories --------------------------------------
  const pin = (config.fixtures?.pin ?? []).map((s) => s.toLowerCase());
  const ranked =
    config.fixtures?.mode === 'manual' && pin.length
      ? pin.map((p) => repos.find((r) => r.name.toLowerCase() === p)).filter(Boolean)
      : [...repos].sort((a, b) => fixtureScore(b) - fixtureScore(a));

  const fixtures = ranked.slice(0, config.fixtures?.count ?? 4).map((r) => ({
    name: r.name,
    description: r.description ?? '',
    url: r.url,
    homepage: r.homepageUrl || null,
    stars: r.stargazerCount,
    forks: r.forkCount,
    watchers: r.watchers?.totalCount ?? 0,
    commits: ownCommits(r),
    language: r.primaryLanguage?.name ?? null,
    languageColor: r.primaryLanguage?.color ?? null,
    topics: (r.repositoryTopics?.nodes ?? []).map((t) => t.topic.name).slice(0, 4),
    pushedAt: r.pushedAt,
    daysSincePush: Math.round((Date.now() - new Date(r.pushedAt).getTime()) / 864e5),
    releases: r.releases?.totalCount ?? 0,
    archived: r.isArchived,
  }));

  // --- trophies: declared certifications + milestones proven by the API ------
  const totalStars = sum(repos, (r) => r.stargazerCount);
  const totalForks = sum(repos, (r) => r.forkCount);
  const topRepo = [...repos].sort((a, b) => b.stargazerCount - a.stargazerCount)[0] ?? null;

  const earned = [];
  const milestone = (v, steps) => steps.filter((s) => v >= s).pop() ?? null;
  const starTier = milestone(totalStars, [1, 10, 50, 100, 500, 1000]);
  if (starTier) earned.push({ title: `${starTier}+ STARS`, issuer: 'COMMUNITY', year: '', kind: 'live' });
  const followTier = milestone(user.followers.totalCount, [1, 10, 50, 100, 500, 1000]);
  if (followTier) earned.push({ title: `${followTier}+ FOLLOWERS`, issuer: 'THE STANDS', year: '', kind: 'live' });
  if (longestStreak >= 7)
    earned.push({ title: `${longestStreak}-DAY STREAK`, issuer: 'ENDURANCE', year: '', kind: 'live' });
  if (centuries > 0) earned.push({ title: `${centuries}x CENTURY MONTH`, issuer: 'FORM', year: '', kind: 'live' });
  if (bowling.wickets >= 10)
    earned.push({ title: `${bowling.wickets} MERGES`, issuer: 'DELIVERY', year: '', kind: 'live' });
  if (topRepo && topRepo.stargazerCount > 0)
    earned.push({ title: `TOP KNOCK: ${topRepo.name}`, issuer: `${topRepo.stargazerCount} STARS`, year: '', kind: 'live' });

  const trophies = [...(config.trophies ?? []).map((t) => ({ ...t, kind: 'cert' })), ...earned];

  // --- last ball bowled (most recent public activity) ------------------------
  const lastEvent = Array.isArray(events) && events.length ? events[0] : null;
  const lastPush = repos.map((r) => r.pushedAt).sort().pop() ?? null;

  return {
    fetchedAt: raw.fetchedAt,
    // Which transport produced these numbers. Surfaced in the README so a reader can
    // tell whether private contributions are included.
    transport: raw.transport ?? 'graphql',
    profile: {
      login: user.login,
      name: user.name || user.login,
      bio: user.bio || '',
      avatar: user.avatarUrl,
      location: user.location || '',
      company: user.company || '',
      website: user.websiteUrl || '',
      createdAt: user.createdAt,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      starsGiven: user.starredRepositories.totalCount,
      publicRepos: user.repositories.totalCount,
      gists: user.gists.totalCount,
    },
    totals: {
      contributions: sum(years, (y) => y.contributionCalendar.totalContributions),
      thisYear: rolling.contributionCalendar.totalContributions,
      stars: totalStars,
      forks: totalForks,
      repos: repos.length,
      activeDays: innings,
      years: years.length,
    },
    batting,
    bowling,
    fielding: { catches: bowling.catches, runOuts: bowling.maidens },
    streak: { current: currentStreak, longest: longestStreak },
    languages,
    arsenal,
    kit,
    fixtures,
    trophies,
    calendar: rolling.contributionCalendar,
    activity: {
      lastPush,
      lastEventType: lastEvent?.type ?? null,
      lastEventRepo: lastEvent?.repo?.name ?? null,
      lastEventAt: lastEvent?.created_at ?? null,
    },
    topRepo: topRepo ? { name: topRepo.name, stars: topRepo.stargazerCount, url: topRepo.url } : null,
  };
}

/** Cache of GitHub's own language colours, harvested from the API response. */
const LANG_COLOR = new Map();

/**
 * Featured-repo ranking: stars dominate, forks help, and a recency term keeps a
 * neglected old hit from permanently blocking active work.
 */
function fixtureScore(r) {
  const ageDays = Math.max(1, (Date.now() - new Date(r.pushedAt).getTime()) / 864e5);
  const recency = 1 + 2 / Math.log2(ageDays + 2);
  return (r.stargazerCount * 3 + r.forkCount * 2 + (r.releases?.totalCount ?? 0) * 4 + 1) * recency;
}
