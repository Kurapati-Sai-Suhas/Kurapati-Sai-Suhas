/**
 * batting.mjs — "SHOT SELECTION": programming languages as strokes.
 *
 * Two views of the same live data:
 *   - a wagon wheel, the classic broadcast graphic, where each language is a scoring
 *     stroke whose direction is fixed by rank and whose length/weight is its real share;
 *   - a ranked list with segmented power meters and byte-accurate figures.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, meter, baseCss, pxText, label, fmt, trunc, n } from '../svg.mjs';

const P = 'bt';
const W = 880;
const H = 330;

export const file = 'batting.svg';

/** Stroke names in descending prominence — rank 1 gets the signature shot. */
const SHOTS = ['COVER DRIVE', 'STRAIGHT DRIVE', 'PULL SHOT', 'SQUARE CUT', 'LEG GLANCE', 'LOFTED SIX'];

/** Fallback palette when GitHub reports no colour for a language. */
const FALLBACK = [C.gold, C.sky, C.saffron, C.greenBright, C.royalBright, C.white];

export function render(m) {
  const langs = m.languages;

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.gold);
  body += pxText('BATTING — SHOT SELECTION', { x: 40, y: 32, scale: 1.7, fill: C.gold });
  body += label('LANGUAGE SHARE BY SOURCE BYTES', { x: W - 34, y: 42, size: 10, fill: C.muteDim, anchor: 'end', spacing: 1.4 });

  if (!langs.length) {
    body += label('NO PUBLIC SOURCE INDEXED YET — THE OPENERS ARE STILL PADDING UP.', {
      x: W / 2,
      y: H / 2,
      size: 12,
      fill: C.muteDim,
      anchor: 'middle',
    });
    return wrap(body, m, '');
  }

  // ------------------------------------------------------- wagon wheel ------
  const cx = 152;
  const cy = 182;
  const R = 100;

  body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.turf}"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.crease}" stroke-width="1" opacity=".3"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${R * 0.58}" fill="none" stroke="${C.crease}" stroke-width="1" opacity=".18" stroke-dasharray="4 6"/>`;
  // Pitch in the middle of the wheel
  body += rect(cx - 5, cy - 24, 10, 48, C.pitch);

  // Strokes fan out over 300 degrees, leaving a gap behind the keeper.
  const span = 300;
  const start = -240;
  langs.forEach((l, i) => {
    const a = ((start + (span * (i + 0.5)) / langs.length) * Math.PI) / 180;
    const len = R * (0.42 + 0.58 * Math.min(1, l.share / Math.max(...langs.map((x) => x.share))));
    const x2 = cx + Math.cos(a) * len;
    const y2 = cy + Math.sin(a) * len;
    const col = l.color || FALLBACK[i % FALLBACK.length];
    const dash = Math.round(len);
    body +=
      `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${col}" stroke-width="${i === 0 ? 3.5 : 2.5}" ` +
      `stroke-linecap="round" opacity=".95" class="${P}-shot" ` +
      `style="stroke-dasharray:${dash};stroke-dashoffset:${dash};animation-delay:${(i * 0.18).toFixed(2)}s"/>`;
    body += `<circle cx="${n(x2)}" cy="${n(y2)}" r="3.5" fill="${col}" class="${P}-dot" style="animation-delay:${(i * 0.18 + 0.9).toFixed(2)}s"/>`;
  });

  body += label('WAGON WHEEL', { x: cx, y: cy + R + 22, size: 10, fill: C.muteDim, anchor: 'middle', spacing: 2 });

  // -------------------------------------------------------------- list ------
  const lx = 300;
  const lw = W - lx - 34;
  const rowH = 40;
  const top = 74;

  langs.forEach((l, i) => {
    const y = top + i * rowH;
    const col = l.color || FALLBACK[i % FALLBACK.length];
    body += `<g class="${P}-row" style="animation-delay:${(i * 0.07).toFixed(2)}s">`;
    if (i % 2 === 0) body += rect(lx - 8, y - 6, lw + 16, rowH - 6, C.navy, ' opacity=".5"');

    body += rect(lx, y + 2, 8, 8, col);
    body += pxText(trunc(l.name, 12), { x: lx + 18, y: y + 1, scale: 1.9, fill: C.white });
    body += label(SHOTS[i] ?? 'IMPROVISED', { x: lx + 18, y: y + 26, size: 9, fill: C.muteDim, spacing: 1.4 });

    // Meter
    // Meter stops short of the percentage column on the right edge.
    const mx = lx + 190;
    const mw = 276;
    body += meter({
      x: mx,
      y: y + 2,
      w: mw,
      h: 10,
      pct: l.share,
      cells: 24,
      on: col,
      off: C.lineSoft,
      anim: `${P}-cell`,
    });
    body += label(`${fmt(l.runs)} KB · ${l.repos} MATCH${l.repos === 1 ? '' : 'ES'}`, {
      x: mx,
      y: y + 26,
      size: 9,
      fill: C.muteDim,
    });

    body += pxText(`${l.share}%`, { x: W - 34, y: y, scale: 2.1, fill: col, anchor: 'end' });
    body += `</g>`;
  });

  return wrap(body, m, '');
}

function wrap(body, m, defs) {
  const top = m.languages[0];
  return svg({
    w: W,
    h: H,
    title: 'Batting — language shot selection',
    desc: top
      ? `Top language ${top.name} at ${top.share}% of source bytes across ${top.repos} repositories. ` +
        m.languages.map((l) => `${l.name} ${l.share}%`).join(', ') + '.'
      : 'No indexed languages yet.',
    defs,
    css:
      baseCss(P) +
      `@keyframes ${P}-draw{to{stroke-dashoffset:0}}` +
      `.${P}-shot{animation:${P}-draw 1s ease-out both}` +
      `@keyframes ${P}-land{0%{opacity:0;r:0}100%{opacity:1}}` +
      `.${P}-dot{animation:${P}-land .35s ease-out both}` +
      `.${P}-row{animation:${P}-rise .5s ease-out both}` +
      `.${P}-cell{transform-box:fill-box;transform-origin:left center;animation:${P}-pop .4s ease-out both}`,
    body,
  });
}
