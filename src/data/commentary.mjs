/**
 * commentary.mjs — the commentary box.
 *
 * Lines are generated FROM the metrics, not chosen from a bag of generic quotes.
 * Every sentence embeds at least one real number, so the commentary genuinely changes
 * as the account changes. Ordering rotates with the build date so a profile visited
 * twice in a week reads differently while remaining reproducible for a given day.
 */

/** Deterministic index rotation: same day -> same order, next day -> shifted. */
const dayIndex = (iso) => {
  const d = new Date(iso);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 864e5);
};

const plural = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`;

/**
 * Build the commentary feed.
 * @param {object} m metrics from buildMetrics
 * @param {object} config
 * @returns {{speaker:string,line:string,tone:'hype'|'stat'|'calm'}[]}
 */
export function buildCommentary(m, config) {
  const lines = [];
  const push = (speaker, line, tone = 'stat') => lines.push({ speaker, line, tone });

  const { batting, bowling, streak, totals, languages, fixtures } = m;
  const topLang = languages[0];

  // --- form ------------------------------------------------------------------
  if (streak.current >= 30) {
    push('STUMP MIC', `${streak.current} days unbeaten at the crease. This is an occupation, not an innings.`, 'hype');
  } else if (streak.current >= 7) {
    push('STUMP MIC', `${streak.current} not out and still watching the ball onto the bat.`, 'hype');
  } else if (streak.current >= 1) {
    push('STUMP MIC', `Off the mark today — ${plural(streak.current, 'day')} on the board and building.`, 'calm');
  } else {
    push('STUMP MIC', `Between overs. Personal best is ${streak.longest} straight days — the pads are still on.`, 'calm');
  }

  // --- batting ---------------------------------------------------------------
  push(
    'THIRD MAN',
    `${totals.contributions.toLocaleString('en-US')} contributions across ${plural(totals.years, 'season')}, ` +
      `at ${batting.average} per innings.`,
  );

  if (batting.highest > 0) {
    push('THIRD MAN', `Career-best ${batting.highest} in a single day, back on ${fmtDate(batting.highestOn)}.`, 'hype');
  }

  if (batting.centuries > 0) {
    push(
      'BOX SEAT',
      `${plural(batting.centuries, 'century month')} logged` +
        (batting.fifties ? ` and ${plural(batting.fifties, 'half-century')} alongside.` : '.'),
      'hype',
    );
  }

  push('BOX SEAT', `At the crease on ${batting.consistency}% of the days since debut on ${fmtDate(batting.debut)}.`);

  // --- bowling ---------------------------------------------------------------
  if (bowling.wickets > 0) {
    push(
      'PAVILION END',
      `${plural(bowling.wickets, 'wicket')} — pull requests merged — off ${plural(bowling.overs, 'over')} of review.`,
      'hype',
    );
  }
  if (bowling.catches > 0) {
    push('PAVILION END', `${plural(bowling.catches, 'catch', 'catches')} taken in the field: issues closed clean.`);
  }
  if (bowling.bigSpells > 0) {
    push('PAVILION END', `${plural(bowling.bigSpells, 'long spell')} of 50+ commits in a single repository.`);
  }

  // --- shot selection --------------------------------------------------------
  if (topLang) {
    push(
      'COVER POINT',
      `The signature shot is ${topLang.name} — ${topLang.share}% of the scoring, across ${plural(topLang.repos, 'match', 'matches')}.`,
      'hype',
    );
  }

  // --- crowd -----------------------------------------------------------------
  if (totals.stars > 0) {
    push('THE STANDS', `${totals.stars.toLocaleString('en-US')} stars in the ground tonight, and they are on their feet.`, 'hype');
  }
  if (m.topRepo?.stars > 0) {
    push('THE STANDS', `Loudest cheer of the night goes to ${m.topRepo.name}.`, 'hype');
  }

  // --- next fixture ----------------------------------------------------------
  const next = fixtures.find((f) => f.daysSincePush <= 30);
  if (next) {
    push('MATCH REFEREE', `Live play in ${next.name} — last ball ${ago(next.daysSincePush)}.`, 'calm');
  }

  // --- closing thought (real goals from config, not filler) ------------------
  const goals = config.goals ?? [];
  if (goals.length) {
    // Quoted verbatim rather than sentence-cased: goals are written in caps and
    // re-casing them mangles acronyms ("first PR" -> "first pr").
    const g = goals[dayIndex(m.fetchedAt) % goals.length];
    push('CAPTAIN', `Target for this session — ${String(g).trim().replace(/[.]$/, '')}.`, 'calm');
  }

  // Rotate so the same profile reads fresh day to day, keeping the opener pinned.
  const [head, ...rest] = lines;
  const shift = dayIndex(m.fetchedAt) % Math.max(1, rest.length);
  return [head, ...rest.slice(shift), ...rest.slice(0, shift)].filter(Boolean).slice(0, 7);
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'debut';

const ago = (d) => (d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`);
