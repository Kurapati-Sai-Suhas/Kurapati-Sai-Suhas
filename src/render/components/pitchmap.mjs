/**
 * pitchmap.mjs — "THE SQUARE": twelve months of contributions, laid out as the
 * centre square of a floodlit ground.
 *
 * The grid stays axis-aligned and evenly spaced (legibility beats faux perspective for
 * a 371-cell chart), but it is framed as turf: an oval outfield, crowd bands, boundary
 * rope and pylons. Busy days burn gold — the "hot zone" where runs are scored.
 */

import { C, HEAT, rng } from '../theme.mjs';
import { svg, rect, panel, crowd, floodlight, floodlightDefs, baseCss, pxText, label, fmt, n, CellBatch } from '../svg.mjs';

const P = 'pm';
const W = 880;
const H = 340;

export const file = 'pitchmap.svg';

const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function render(m) {
  const weeks = m.calendar.weeks ?? [];
  const days = weeks.flatMap((w) => w.contributionDays);
  const peak = Math.max(1, ...days.map((d) => d.contributionCount));

  let body = rect(0, 0, W, H, C.nightDeep);
  body += `<rect width="${W}" height="140" fill="url(#${P}-sky)"/>`;

  // Stands + pylons behind the ground
  body += crowd(0, 44, W, 56, 909, { density: 0.42, size: 5 });
  body += rect(0, 100, W, 4, C.navySoft);
  body += floodlight(120, 12, { h: 42, dir: -1, id: P });
  body += floodlight(W - 120, 12, { h: 42, dir: 1, id: P });

  // Outfield
  body += `<ellipse cx="${W / 2}" cy="${H - 40}" rx="${W / 2 + 40}" ry="180" fill="${C.turf}"/>`;
  body += `<ellipse cx="${W / 2}" cy="${H - 40}" rx="${W / 2 - 6}" ry="164" fill="${C.turfLight}" opacity=".4"/>`;
  body += `<ellipse cx="${W / 2}" cy="${H - 40}" rx="${W / 2 - 6}" ry="164" fill="none" stroke="${C.crease}" stroke-width="1.5" opacity=".25" stroke-dasharray="6 8"/>`;

  // Header strip sits above the turf
  body += rect(24, 12, W - 48, 24, C.panel, ` stroke="${C.line}" stroke-width="1"`);
  body += rect(24, 12, 4, 24, C.greenBright);
  body += pxText('THE SQUARE — LAST 12 MONTHS', { x: 40, y: 19, scale: 1.6, fill: C.greenBright });
  body += label(`${fmt(m.calendar.totalContributions)} CONTRIBUTIONS`, {
    x: W - 34,
    y: 29,
    size: 10,
    fill: C.gold,
    anchor: 'end',
    spacing: 1.2,
  });

  // --------------------------------------------------------------- grid -----
  const gridW = weeks.length * STEP - GAP;
  const ox = Math.round((W - gridW) / 2);
  const oy = 138;

  // Turf pad under the square
  body += rect(ox - 10, oy - 22, gridW + 20, 7 * STEP - GAP + 44, C.turfDark, ' opacity=".55"');
  body += rect(ox - 10, oy - 22, gridW + 20, 2, C.crease, ' opacity=".3"');

  // Month labels along the top of the square
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const first = w.contributionDays[0];
    if (!first) return;
    const mo = new Date(first.date).getUTCMonth();
    if (mo !== lastMonth && wi < weeks.length - 1) {
      body += label(MONTHS[mo], { x: ox + wi * STEP, y: oy - 8, size: 8, fill: C.mute, spacing: 1 });
      lastMonth = mo;
    }
  });

  // Weekday guides (Mon / Wed / Fri, as GitHub does)
  ['MON', 'WED', 'FRI'].forEach((d, i) => {
    body += label(d, { x: ox - 14, y: oy + (1 + i * 2) * STEP + 10, size: 7, fill: C.muteDim, anchor: 'end' });
  });

  // Cells.
  // Staggering is applied per WEEK COLUMN rather than per cell: it produces a nicer
  // left-to-right wipe and, more importantly, keeps 371 cells down to 53 groups of
  // colour-batched paths instead of 371 individually styled rects (~22 KB saved).
  weeks.forEach((w, wi) => {
    const batch = new CellBatch();
    let peakCells = '';
    w.contributionDays.forEach((d) => {
      const x = ox + wi * STEP;
      const y = oy + d.weekday * STEP;
      if (peak > 0 && d.contributionCount === peak) {
        // The single best day gets its own animated node.
        peakCells += rect(x, y, CELL, CELL, HEAT[4], ` class="${P}-peak"`);
      } else {
        batch.add(x, y, CELL, CELL, HEAT[heatLevel(d.contributionCount, peak)]);
      }
    });
    body += `<g class="${P}-c" style="animation-delay:${(wi * 0.012).toFixed(3)}s">${batch.toSvg()}${peakCells}</g>`;
  });

  // Boundary rope under the square
  body += rect(ox - 10, oy + 7 * STEP + 8, gridW + 20, 2, C.crease, ' opacity=".35"');

  // ------------------------------------------------------------- legend -----
  const ly = oy + 7 * STEP + 26;
  body += label('QUIET', { x: ox, y: ly + 10, size: 9, fill: C.muteDim, spacing: 1.4 });
  HEAT.forEach((c, i) => body += rect(ox + 46 + i * 16, ly, 12, 12, c));
  body += label('HOT ZONE', { x: ox + 46 + HEAT.length * 16 + 8, y: ly + 10, size: 9, fill: C.gold, spacing: 1.4 });

  // Live figures on the right of the legend row
  const figures = [
    ['BEST DAY', fmt(m.batting.highest), C.gold],
    ['STREAK', `${m.streak.current}*`, C.greenBright],
    ['LONGEST', fmt(m.streak.longest), C.sky],
    ['AT CREASE', `${m.batting.consistency}%`, C.saffron],
  ];
  figures.forEach(([k, v, col], i) => {
    const x = ox + gridW - (figures.length - i) * 120 + 100;
    body += label(k, { x, y: ly + 2, size: 8, fill: C.muteDim, anchor: 'end', spacing: 1.2 });
    body += pxText(v, { x, y: ly + 6, scale: 1.6, fill: col, anchor: 'end' });
  });

  const defs =
    `<linearGradient id="${P}-sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${C.nightDeep}"/><stop offset="1" stop-color="${C.navy}"/></linearGradient>` +
    floodlightDefs(P);

  return svg({
    w: W,
    h: H,
    title: 'Contribution square — last 12 months',
    desc:
      `${fmt(m.calendar.totalContributions)} contributions in the last 12 months. ` +
      `Best day ${m.batting.highest}. Current streak ${m.streak.current} days, longest ${m.streak.longest}. ` +
      `Active on ${m.batting.consistency}% of career days.`,
    defs,
    css:
      baseCss(P) +
      // Each week column wipes in; the single best day then keeps pulsing.
      `@keyframes ${P}-seed{0%{opacity:0;transform:scaleY(.3)}100%{opacity:1;transform:scaleY(1)}}` +
      `.${P}-c{transform-box:fill-box;transform-origin:center;animation:${P}-seed .45s ease-out both}` +
      `@keyframes ${P}-hot{0%,100%{opacity:1}50%{opacity:.5}}` +
      `.${P}-peak{animation:${P}-hot 1.8s ease-in-out infinite 1s}`,
    body,
  });
}

/**
 * Bucket a day into the five-step heat ramp. Thresholds are relative to the user's own
 * peak so the chart reads the same for a 5-a-day committer and a 50-a-day one.
 */
function heatLevel(count, peak) {
  if (count <= 0) return 0;
  const r = count / peak;
  if (r > 0.66) return 4;
  if (r > 0.4) return 3;
  if (r > 0.18) return 2;
  return 1;
}
