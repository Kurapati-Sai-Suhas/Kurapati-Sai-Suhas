/**
 * scoreboard.mjs — the big LED board at the top of the ground.
 *
 * Reads as a real cricket scoreboard: TOTAL / WICKETS in the dominant slot, overs and
 * run rate beside it, then a strip of secondary figures. Every value is live.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, baseCss, pxText, label, fmt, compact, n } from '../svg.mjs';

const P = 'sb';
const W = 880;
const H = 250;

export const file = 'scoreboard.svg';

export function render(m) {
  const runs = m.totals.contributions;
  const wkts = m.bowling.wickets;
  const overs = m.batting.innings; // days at the crease
  const runRate = m.batting.average;

  let body = rect(0, 0, W, H, C.nightDeep);
  body += rect(0, 0, W, H, `url(#${P}-bg)`);

  // Board housing
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel, stroke: C.line, glow: C.royalBright });
  // Scanline overlay sells the CRT board without costing a filter.
  body += `<g opacity=".07">`;
  for (let y = 14; y < H - 14; y += 4) body += rect(14, y, W - 28, 1, C.white);
  body += `</g>`;

  // ------------------------------------------------------------- header -----
  body += rect(24, 24, W - 48, 24, C.navySoft);
  body += rect(24, 24, 4, 24, C.saffron);
  body += rect(28, 24, 4, 24, C.white);
  body += rect(32, 24, 4, 24, C.green);
  body += pxText('LIVE SCOREBOARD', { x: 46, y: 31, scale: 1.7, fill: C.gold });
  body += label(`UPDATED ${stamp(m.fetchedAt)} UTC`, { x: W - 34, y: 41, size: 10, fill: C.muteDim, anchor: 'end', spacing: 1 });

  // --------------------------------------------------------- primary score --
  const scoreY = 74;
  body += label('TOTAL', { x: 34, y: scoreY, size: 10, fill: C.muteDim, spacing: 2.5 });

  const scoreStr = `${fmt(runs)}/${fmt(wkts)}`;
  const scale = scoreStr.length > 10 ? 4 : 5;
  body += pxText(scoreStr, { x: 34, y: scoreY + 10, scale, fill: C.white, extra: `class="${P}-score"` });

  body += label(`(${fmt(overs)} OVERS)`, { x: 34, y: scoreY + 10 + 7 * scale + 18, size: 12, fill: C.sky, spacing: 1.5 });

  // Run-rate dial on the right of the primary block
  body += runRateBlock(430, scoreY, runRate, m.batting.strikeRate);

  // --------------------------------------------------------- stat strip -----
  const cells = [
    ['MATCHES', fmt(m.totals.repos), C.sky],
    ['STARS', compact(m.totals.stars), C.gold],
    ['FOLLOWERS', compact(m.profile.followers), C.saffron],
    ['NOT OUT', `${m.streak.current}*`, C.greenBright],
    ['BEST', fmt(m.batting.highest), C.white],
    ['THIS YR', compact(m.totals.thisYear), C.royalBright],
  ];
  const stripY = H - 82;
  const cw = (W - 68) / cells.length;
  cells.forEach(([k, v, col], i) => {
    const x = 34 + i * cw;
    body += rect(x, stripY, cw - 10, 56, C.navySoft, ` stroke="${C.lineSoft}" stroke-width="1"`);
    body += rect(x, stripY, 3, 56, col);
    body += label(k, { x: x + 12, y: stripY + 18, size: 9, fill: C.muteDim, spacing: 1.6 });
    body += pxText(v, { x: x + 12, y: stripY + 26, scale: 2.2, fill: col, extra: `class="${P}-cell" style="animation-delay:${(i * 0.08).toFixed(2)}s"` });
  });

  const defs =
    `<linearGradient id="${P}-bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.nightDeep}"/></linearGradient>`;

  return svg({
    w: W,
    h: H,
    title: 'Live scoreboard',
    desc: `${fmt(runs)} contributions for ${fmt(wkts)} merged pull requests across ${fmt(overs)} active days. ${fmt(m.totals.stars)} stars, ${fmt(m.profile.followers)} followers, ${m.streak.current}-day streak.`,
    defs,
    css:
      baseCss(P) +
      `@keyframes ${P}-glow{0%,100%{opacity:1}50%{opacity:.82}}` +
      `.${P}-score{animation:${P}-glow 3.4s ease-in-out infinite}` +
      `.${P}-cell{animation:${P}-rise .6s ease-out both}`,
    body,
  });
}

/** Run rate + strike rate, presented as the broadcast graphic they'd sit in. */
function runRateBlock(x, y, rr, sr) {
  let out = rect(x, y - 4, 2, 92, C.line);
  out += label('RUN RATE', { x: x + 24, y: y, size: 10, fill: C.muteDim, spacing: 2.5 });
  out += pxText(rr.toFixed(2), { x: x + 24, y: y + 10, scale: 3.4, fill: C.gold });
  out += label('COMMITS PER ACTIVE DAY', { x: x + 24, y: y + 48, size: 9, fill: C.muteDim });

  out += label('STRIKE RATE', { x: x + 250, y: y, size: 10, fill: C.muteDim, spacing: 2.5 });
  out += pxText(sr.toFixed(1), { x: x + 250, y: y + 10, scale: 3.4, fill: C.greenBright });
  out += label('RUNS PER 100 CAREER DAYS', { x: x + 250, y: y + 48, size: 9, fill: C.muteDim });
  return out;
}

const stamp = (iso) => {
  const d = new Date(iso);
  const p = (v) => String(v).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};
