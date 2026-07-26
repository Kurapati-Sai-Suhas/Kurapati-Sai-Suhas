/**
 * readme.mjs — assembles README.md.
 *
 * Two classes of live content sit side by side:
 *
 *  1. LOCALLY RENDERED SVGs (assets/generated/*.svg) — built from the GitHub GraphQL
 *     API by this repo's own Action. Refreshed on the workflow schedule.
 *  2. THIRD-PARTY LIVE WIDGETS — rendered on request by public services, so they are
 *     current every time someone loads the page, even between our scheduled builds.
 *
 * Both are real data. Neither is a placeholder.
 *
 * CACHE BUSTING
 * -------------
 * GitHub proxies README images through Camo, which caches aggressively. Appending a
 * build stamp to our own asset URLs forces a fresh fetch after every rebuild; without
 * it a scheduled run would update the file and visitors would still see last week's
 * scoreboard.
 *
 * NOTE ON HTML
 * ------------
 * GitHub's markdown sanitiser strips <style> and <script>. Every visual effect
 * therefore lives inside the SVGs, not in this document.
 */

/** Palette echoed into third-party widget query strings so they match the scenes. */
const T = {
  bg: '0D1E45',
  title: 'FFC93C',
  text: 'F4F7FF',
  icon: '5AC8FA',
  border: '1E3A78',
  ring: 'FF9933',
  fire: 'FF4D4D',
  side: '5AC8FA',
};

/**
 * @param {object} m metrics
 * @param {object} config
 * @param {object} ctx
 * @param {{file:string,url:string,name:string,alt:string}[]} ctx.fixtures
 * @param {string} ctx.stamp cache-busting token
 * @returns {string} markdown
 */
export function renderReadme(m, config, { fixtures, stamp }) {
  const u = encodeURIComponent(m.profile.login);
  const p = config.player;
  const name = p.displayName || m.profile.name || m.profile.login;
  const v = config.render?.cacheBust === false ? '' : `?v=${stamp}`;
  const A = (f) => `assets/generated/${f}${v}`;

  const out = [];
  const w = (s) => out.push(s);

  // ───────────────────────────────────────────────────────── 1. HERO ─────────
  w(`<!--
  ============================================================================
   THIS FILE IS GENERATED — do not edit by hand; the next build overwrites it.

   Source of truth : config.json + the live GitHub API
   Rebuild locally : npm run build
   Rebuild in CI   : .github/workflows/update-readme.yml
   Last build      : ${m.fetchedAt}
   Rendered for    : @${m.profile.login}
  ============================================================================
-->`);
  w('');
  w('<div align="center">');
  w('');
  w(`  <img src="${A('hero.svg')}" alt="${esc(name)} — floodlit pixel-art cricket stadium hero" width="100%" />`);
  w('');
  w('  ' + badgeRow(m, config));
  w('');
  w('</div>');
  w('');

  // ─────────────────────────────────────────────── 2. LIVE SCOREBOARD ────────
  w(section('01', 'LIVE SCOREBOARD', 'The board never lies. Every figure below is pulled from the GitHub API.'));
  w(`<div align="center">`);
  w(`  <img src="${A('scoreboard.svg')}" alt="Live scoreboard: ${m.totals.contributions} contributions for ${m.bowling.wickets} merged pull requests" width="100%" />`);
  w(`</div>`);
  w('');
  // Third-party widgets refresh on every page view, filling the gap between builds.
  w(`<div align="center">`);
  w(
    `  <img height="165" src="https://github-readme-stats.vercel.app/api?username=${u}&show_icons=true&include_all_commits=true&count_private=true&hide_border=true&title_color=${T.title}&text_color=${T.text}&icon_color=${T.icon}&bg_color=${T.bg}&custom_title=INNINGS%20SUMMARY" alt="GitHub statistics for ${u}" />`,
  );
  w(
    `  <img height="165" src="https://streak-stats.demolab.com?user=${u}&hide_border=true&background=${T.bg}&stroke=${T.border}&ring=${T.ring}&fire=${T.fire}&currStreakLabel=${T.title}&sideLabels=${T.side}&currStreakNum=${T.text}&sideNums=${T.text}&dates=8FA6D8" alt="Contribution streak for ${u}" />`,
  );
  w(`</div>`);
  w('');

  // ────────────────────────────────────────────── 3. PLAYER STATISTICS ───────
  w(section('02', 'PLAYER STATISTICS', 'Developer metrics, read as a career record.'));
  w(`<div align="center">`);
  w(`  <img src="${A('player-card.svg')}" alt="Career record for ${esc(name)}" width="100%" />`);
  w(`</div>`);
  w('');
  w(mappingTable());
  w('');

  // ───────────────────────────────────────────────── 4. BATTING SKILLS ───────
  w(section('03', 'BATTING — SHOT SELECTION', 'Languages, weighted by the source bytes actually in your repositories.'));
  w(`<div align="center">`);
  w(`  <img src="${A('batting.svg')}" alt="Language breakdown as a cricket wagon wheel" width="100%" />`);
  w('');
  w(
    `  <img height="165" src="https://github-readme-stats.vercel.app/api/top-langs/?username=${u}&layout=compact&langs_count=8&hide_border=true&title_color=${T.title}&text_color=${T.text}&bg_color=${T.bg}&custom_title=SCORING%20ZONES" alt="Most used languages for ${u}" />`,
  );
  w(`</div>`);
  w('');

  // ──────────────────────────────────────────────── 5. BOWLING ARSENAL ───────
  w(
    section(
      '04',
      'BOWLING ARSENAL',
      'Backend, DevOps, AI and cloud. Wickets and overs are counted from real repositories — a declared technology with no matches stays dimmed.',
    ),
  );
  w(`<div align="center">`);
  w(`  <img src="${A('bowling.svg')}" alt="Bowling arsenal: backend, DevOps, AI and cloud technologies with measured usage" width="100%" />`);
  w(`</div>`);
  w('');

  // ─────────────────────────────────────────────────────── 6. KIT BAG ────────
  w(section('05', 'THE KIT BAG', 'The stack that travels to every match.'));
  w(`<div align="center">`);
  w(`  <img src="${A('kit.svg')}" alt="Technology stack laid out as cricket kit" width="100%" />`);
  w(`</div>`);
  w('');

  // ────────────────────────────────────────────────────── 7. FIXTURES ────────
  w(section('06', 'TOURNAMENT FIXTURES', 'Featured projects. Click any card to walk out to the middle.'));
  w(fixtureGrid(fixtures, v));
  w('');

  // ─────────────────────────────────────────────── 8. TROPHY CABINET ─────────
  w(section('07', 'TROPHY CABINET', 'Gold plinths are awarded credentials. Blue plinths are milestones the API is proving right now.'));
  w(`<div align="center">`);
  w(`  <img src="${A('trophies.svg')}" alt="Trophy cabinet of certifications and live GitHub milestones" width="100%" />`);
  w(`</div>`);
  w('');

  // ───────────────────────────────────────────────────── 9. THE SQUARE ───────
  w(section('08', 'THE SQUARE', 'Twelve months of contributions, played out on the turf.'));
  w(`<div align="center">`);
  w(`  <img src="${A('pitchmap.svg')}" alt="Contribution calendar rendered as a floodlit cricket square" width="100%" />`);
  w('');
  w(
    `  <img src="https://github-readme-activity-graph.vercel.app/graph?username=${u}&bg_color=${T.bg}&color=${T.text}&line=${T.title}&point=${T.ring}&area=true&hide_border=true&custom_title=RUN%20RATE%20OVER%20TIME" alt="Contribution activity graph for ${u}" width="100%" />`,
  );
  w(`</div>`);
  w('');

  // ─────────────────────────────────────────────────── 10. COMMENTARY ────────
  w(section('09', 'COMMENTARY BOX', 'Generated from your numbers, so it changes as they do.'));
  w(`<div align="center">`);
  w(`  <img src="${A('commentary.svg')}" alt="Match commentary generated from live GitHub statistics" width="100%" />`);
  w(`</div>`);
  w('');

  // ────────────────────────────────────────────────────── 11. STUMPS ─────────
  w(section('10', 'STUMPS', 'Close of play.'));
  w(`<div align="center">`);
  w(`  <img src="${A('footer.svg')}" alt="Closing scorecard and goals for the next season" width="100%" />`);
  w('');
  w('  ' + socialRow(config, m));
  w('');
  w(
    `  <img src="https://komarev.com/ghpvc/?username=${u}&label=SPECTATORS%20IN%20THE%20GROUND&color=1B4FD8&style=for-the-badge" alt="Profile view counter" />`,
  );
  w('');
  w(`  <sub>Built from live GitHub data · rebuilt automatically · <a href="https://github.com/${u}/${u}">source</a></sub>`);
  w('');
  w('</div>');
  w('');

  return out.join('\n');
}

/** Section heading. Kept as markdown (not baked into SVG) so it stays linkable and searchable. */
function section(num, title, sub) {
  return [
    '---',
    '',
    `### \`${num}\` · ${title}`,
    '',
    `> ${sub}`,
    '',
  ].join('\n');
}

/** Live shields.io badges — these re-render on every page view. */
function badgeRow(m, config) {
  const u = encodeURIComponent(m.profile.login);
  const b = (label, query, color, logo) =>
    `<img src="https://img.shields.io/${query}?style=for-the-badge&label=${encodeURIComponent(label)}&color=${color}&labelColor=0A1A3C${logo ? `&logo=${logo}&logoColor=white` : ''}" alt="${label}" />`;
  return [
    b('FOLLOWERS', `github/followers/${u}`, '1B4FD8', 'github'),
    b('STARS', `github/stars/${u}`, 'FFC93C', 'apachespark'),
    b('CAP', `badge/CAP-%23${encodeURIComponent(config.player.capNumber || '404')}-FF9933`, 'FF9933'),
  ].join('\n  ');
}

/** Social links, rendered only for values actually filled in. */
function socialRow(config, m) {
  const s = config.player.socials ?? {};
  const links = [];
  const chip = (label, url, color, logo) =>
    `<a href="${url}"><img src="https://img.shields.io/badge/${encodeURIComponent(label)}-${color}?style=for-the-badge&logo=${logo}&logoColor=white" alt="${label}" /></a>`;

  if (s.linkedin) links.push(chip('LINKEDIN', s.linkedin, '0A66C2', 'linkedin'));
  if (s.twitter) links.push(chip('X', s.twitter, '000000', 'x'));
  if (s.website) links.push(chip('WEBSITE', s.website, '1B4FD8', 'googlechrome'));
  if (s.email) links.push(chip('EMAIL', `mailto:${s.email}`, 'FF9933', 'gmail'));
  links.push(chip('GITHUB', `https://github.com/${m.profile.login}`, '138808', 'github'));
  return links.join('\n  ');
}

/** Featured repos as a clickable 2-up grid. */
function fixtureGrid(fixtures, v) {
  if (!fixtures.length) return '_No public fixtures scheduled yet._';
  const rows = [];
  rows.push('<table><tr>');
  fixtures.forEach((f, i) => {
    if (i > 0 && i % 2 === 0) rows.push('</tr><tr>');
    rows.push(
      `<td width="50%" align="center">` +
        `<a href="${f.url}"><img src="assets/generated/${f.file}${v}" alt="${esc(f.alt)}" width="100%" /></a>` +
        `</td>`,
    );
  });
  if (fixtures.length % 2 === 1) rows.push('<td width="50%"></td>');
  rows.push('</tr></table>');
  return rows.join('\n');
}

/** The mapping table. Documenting it is what keeps the metaphor honest. */
function mappingTable() {
  return [
    '<details>',
    '<summary><b>How to read the scorecard</b> — every cricket term, and the GitHub field behind it</summary>',
    '',
    '| Cricket | Developer metric | Source |',
    '| :-- | :-- | :-- |',
    '| Runs | Commit contributions | `contributionsCollection.totalCommitContributions` |',
    '| Innings | Days with at least one contribution | contribution calendar |',
    '| Matches | Repositories contributed to | `totalRepositoryContributions` |',
    '| Highest score | Busiest single day | contribution calendar |',
    '| Average | Runs ÷ innings | derived |',
    '| Strike rate | Runs per 100 days since debut | derived |',
    '| Centuries | Calendar months over 100 contributions | derived |',
    '| Fifties | Calendar months at 50–99 contributions | derived |',
    '| Fours | Pull requests opened | `pullRequests.totalCount` |',
    '| Sixes | Releases published | `releases.totalCount` |',
    '| Not out | Current daily streak | contribution calendar |',
    '| Overs | Pull requests reviewed | `totalPullRequestReviewContributions` |',
    '| Wickets | Pull requests merged | `pullRequests(states: MERGED)` |',
    '| Runs conceded | Issues opened | `issues.totalCount` |',
    '| Catches | Issues closed | `issues(states: CLOSED)` |',
    '| Five-fors | Repositories with 50+ of your commits | `history(author:)` |',
    '| Pace (kph) | Commit workload for that technology, relative to your busiest | derived |',
    '',
    '</details>',
  ].join('\n');
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
