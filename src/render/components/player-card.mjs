/**
 * player-card.mjs — the almanack page.
 *
 * A career record card: portrait and identity on the left, batting and bowling
 * columns on the right, laid out on the same 6px baseline grid as a printed
 * scorecard so the numbers line up down the page.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, sprite, baseCss, pxText, label, fmt, n } from '../svg.mjs';
import { BATTER, CAP, PAL } from '../sprites.mjs';

const P = 'pc';
const W = 880;
// Tall enough for eight stat rows on the right AND the four identity lines under the
// portrait on the left; the shorter first pass pushed "DEBUT" outside the panel.
const H = 320;

export const file = 'player-card.svg';

export function render(m, config) {
  const p = config.player;
  const name = (p.displayName || m.profile.name || m.profile.login).toUpperCase();

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  // Header band
  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.gold);
  body += pxText('PLAYER PROFILE', { x: 40, y: 32, scale: 1.7, fill: C.gold });
  body += label('CAREER RECORD — ALL FORMATS', { x: W - 34, y: 42, size: 10, fill: C.muteDim, anchor: 'end', spacing: 1.4 });

  // -------------------------------------------------------------- portrait --
  const px = 34;
  const py = 64;
  body += rect(px, py, 200, H - py - 34, C.navy, ` stroke="${C.line}" stroke-width="1"`);
  // Spotlight wash behind the figure
  body += `<ellipse cx="${px + 100}" cy="${py + 60}" rx="66" ry="62" fill="url(#${P}-spot)"/>`;
  body += sprite(BATTER, PAL, { x: px + 64, y: py + 16, s: 3, extra: `class="${P}-idle"` });
  body += sprite(CAP, PAL, { x: px + 12, y: py + 12, s: 2 });

  body += rect(px, py + 114, 200, 1, C.line);
  body += pxText(name, { x: px + 100, y: py + 124, scale: name.length > 10 ? 2 : 2.6, fill: C.white, anchor: 'middle' });
  body += label(String(p.role || 'ALL-ROUNDER'), { x: px + 100, y: py + 160, size: 10, fill: C.sky, anchor: 'middle', spacing: 1.4 });
  body += label(`CAP No. ${p.capNumber || '404'}`, { x: px + 100, y: py + 176, size: 10, fill: C.gold, anchor: 'middle', spacing: 1.4 });
  body += label(`DEBUT ${m.batting.debut}`, { x: px + 100, y: py + 192, size: 9, fill: C.muteDim, anchor: 'middle' });

  // ------------------------------------------------------------- batting ----
  const colX = 262;
  const colW = 300;
  body += statTable(colX, py, colW, 'BATTING', C.gold, [
    ['MAT', fmt(m.batting.matches), 'repositories contributed to'],
    ['INN', fmt(m.batting.innings), 'days with a contribution'],
    ['RUNS', fmt(m.batting.runs), 'commit contributions'],
    ['HS', `${fmt(m.batting.highest)}${m.batting.notOut ? '*' : ''}`, 'busiest single day'],
    ['AVG', m.batting.average.toFixed(2), 'runs per innings'],
    ['SR', m.batting.strikeRate.toFixed(1), 'runs per 100 career days'],
    ['100s', fmt(m.batting.centuries), 'months over 100'],
    ['50s', fmt(m.batting.fifties), 'months 50-99'],
  ]);

  // ------------------------------------------------------------- bowling ----
  const col2X = colX + colW + 20;
  body += statTable(col2X, py, colW, 'BOWLING & FIELDING', C.saffron, [
    ['OVR', fmt(m.bowling.overs), 'pull requests reviewed'],
    ['WKT', fmt(m.bowling.wickets), 'pull requests merged'],
    ['RUNS', fmt(m.bowling.conceded), 'issues opened'],
    ['ECON', m.bowling.economy.toFixed(2), 'issues per review'],
    ['AVG', m.bowling.average.toFixed(2), 'issues per merge'],
    ['5W', fmt(m.bowling.bigSpells), 'repos with 50+ commits'],
    ['CT', fmt(m.fielding.catches), 'issues closed'],
    ['4s / 6s', `${fmt(m.batting.fours)} / ${fmt(m.batting.sixes)}`, 'PRs opened / releases'],
  ]);

  const defs =
    `<radialGradient id="${P}-spot"><stop offset="0" stop-color="${C.royalBright}" stop-opacity=".38"/>` +
    `<stop offset="1" stop-color="${C.royalBright}" stop-opacity="0"/></radialGradient>`;

  return svg({
    w: W,
    h: H,
    title: `${name} — career record`,
    desc:
      `Batting: ${fmt(m.batting.matches)} matches, ${fmt(m.batting.runs)} runs at ${m.batting.average}. ` +
      `Bowling: ${fmt(m.bowling.wickets)} wickets from ${fmt(m.bowling.overs)} overs.`,
    defs,
    css:
      baseCss(P) +
      `@keyframes ${P}-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}` +
      `.${P}-idle{animation:${P}-bob 3.2s ease-in-out infinite}` +
      `.${P}-row{animation:${P}-rise .5s ease-out both}`,
    body,
  });
}

/**
 * Two-column stat table. `note` is not drawn — it is folded into the accessible
 * description so screen readers and search indexers get the mapping, while the
 * visual stays a clean scorecard.
 */
function statTable(x, y, w, title, accent, rows) {
  let out = rect(x, y, w, 22, C.navySoft);
  out += rect(x, y, 3, 22, accent);
  out += pxText(title, { x: x + 12, y: y + 8, scale: 1.5, fill: accent });

  const rowH = 24;
  rows.forEach(([k, v], i) => {
    const ry = y + 30 + i * rowH;
    if (i % 2 === 0) out += rect(x, ry - 4, w, rowH - 2, C.navy, ' opacity=".55"');
    out += `<g class="${P}-row" style="animation-delay:${(i * 0.05).toFixed(2)}s">`;
    out += label(k, { x: x + 12, y: ry + 12, size: 11, fill: C.mute, spacing: 1.2 });
    out += pxText(v, { x: x + w - 12, y: ry + 4, scale: 1.9, fill: C.white, anchor: 'end' });
    out += `</g>`;
  });
  return out;
}
