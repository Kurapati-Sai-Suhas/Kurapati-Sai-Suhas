/**
 * fixtures.mjs — "TOURNAMENT FIXTURES": featured repositories as match cards.
 *
 * Emits ONE SVG PER CARD rather than a single sheet. That is a deliberate trade: the
 * README can then wrap each card in a markdown link, so a card is genuinely clickable
 * through to the repository. (Anchors inside an SVG are inert once GitHub serves it
 * through Camo as an <img>, so in-SVG <a> would have been decorative only.)
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, baseCss, pxText, label, compact, trunc, esc, n, measureScaled } from '../svg.mjs';

const P = 'fx';
const W = 430;
const H = 190;

const ACCENT = [C.gold, C.sky, C.saffron, C.greenBright, C.royalBright, C.white];

/**
 * @param {object} m metrics
 * @returns {{file:string,markup:string,url:string,name:string,alt:string}[]}
 */
export function renderAll(m) {
  return m.fixtures.map((f, i) => ({
    file: `fixture-${i + 1}.svg`,
    url: f.url,
    name: f.name,
    alt: `${f.name} — ${f.stars} stars, ${f.forks} forks, ${f.commits} commits`,
    markup: card(f, i, m.fixtures.length),
  }));
}

/** Status derived from real push recency. */
function status(days) {
  if (days <= 7) return { text: 'LIVE NOW', col: C.greenBright };
  if (days <= 45) return { text: 'IN PLAY', col: C.gold };
  if (days <= 240) return { text: 'TEA BREAK', col: C.sky };
  return { text: 'STUMPS', col: C.muteDim };
}

function card(f, i, total) {
  const accent = f.languageColor || ACCENT[i % ACCENT.length];
  const st = f.archived ? { text: 'RETIRED', col: C.muteDim } : status(f.daysSincePush);

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(6, 6, W - 12, H - 12, { fill: C.panel, notch: 5 });

  // Header: match number + status light
  body += rect(18, 18, W - 36, 20, C.navySoft);
  body += rect(18, 18, 3, 20, accent);
  body += pxText(`MATCH ${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: 28,
    y: 24,
    scale: 1.3,
    fill: C.mute,
  });
  // Dot sits a fixed gap left of the status text, measured rather than guessed —
  // "LIVE NOW" and "TEA BREAK" are different widths.
  const stW = measureScaled(st.text, 1.3);
  body += `<circle cx="${n(W - 28 - stW - 10)}" cy="28" r="3.5" fill="${st.col}" class="${P}-live"/>`;
  body += pxText(st.text, { x: W - 28, y: 24, scale: 1.3, fill: st.col, anchor: 'end' });

  // Repo name — the fixture title
  const nameStr = trunc(f.name, 22).toUpperCase();
  body += pxText(nameStr, { x: 18, y: 50, scale: nameStr.length > 16 ? 1.9 : 2.4, fill: C.white, extra: `class="${P}-title"` });

  // Description across two wrapped lines
  wrapText(f.description || 'No description on the team sheet.', 52).slice(0, 2).forEach((line, li) => {
    body += label(line, { x: 18, y: 76 + li * 13, size: 10, fill: C.mute });
  });

  // Topic chips
  let cx = 18;
  (f.topics ?? []).forEach((t) => {
    const tw = t.length * 5.2 + 12;
    if (cx + tw > W - 18) return;
    body += rect(cx, 104, tw, 14, C.navySoft, ` stroke="${C.lineSoft}" stroke-width="1"`);
    body += label(t, { x: cx + 6, y: 114, size: 8, fill: C.sky });
    cx += tw + 5;
  });

  // Mini pitch strip separating meta from figures
  body += rect(18, 124, W - 36, 2, C.line);

  // Live figures. The value glyphs are 1.8 * 7 = 12.6 tall, so the baseline row below
  // has to start at 158+ or the descenders sit on top of the language chip.
  const stats = [
    ['RUNS', compact(f.commits), C.white],
    ['STARS', compact(f.stars), C.gold],
    ['FORKS', compact(f.forks), C.sky],
    ['REL', compact(f.releases), C.saffron],
  ];
  const cw = (W - 36) / stats.length;
  stats.forEach(([k, v, col], si) => {
    const x = 18 + si * cw;
    body += label(k, { x, y: 140, size: 8, fill: C.muteDim, spacing: 1.4 });
    body += pxText(v, { x, y: 145, scale: 1.8, fill: col });
  });

  // Footer: language + last activity
  if (f.language) {
    body += `<circle cx="22" cy="${H - 14}" r="4" fill="${accent}"/>`;
    body += label(trunc(f.language, 18), { x: 32, y: H - 10, size: 9, fill: C.mute });
  }
  body += label(lastBall(f.daysSincePush), { x: W - 18, y: H - 10, size: 9, fill: C.muteDim, anchor: 'end' });

  return svg({
    w: W,
    h: H,
    title: `${f.name} — fixture card`,
    desc: `${f.name}: ${f.description || 'no description'}. ${f.stars} stars, ${f.forks} forks, ${f.commits} of your commits, last pushed ${f.daysSincePush} days ago.`,
    css:
      baseCss(P) +
      `.${P}-live{animation:${P}-blink 2s steps(1) infinite}` +
      `.${P}-title{animation:${P}-rise .5s ease-out both}`,
    body,
  });
}

const lastBall = (d) => (d <= 0 ? 'LAST BALL TODAY' : d === 1 ? 'LAST BALL YESTERDAY' : `LAST BALL ${d}D AGO`);

/** Greedy word wrap to a character budget. */
function wrapText(str, max) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur += ' ' + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > 2) lines[1] = trunc(lines[1] + ' ' + (lines[2] ?? ''), max);
  return lines;
}
