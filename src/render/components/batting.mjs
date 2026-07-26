/**
 * batting.mjs — "SHOT SELECTION": programming languages as strokes.
 *
 * Two views of the same live data:
 *   - a wagon wheel, the classic broadcast graphic;
 *   - a ranked list with segmented power meters and byte-accurate figures.
 *
 * WAGON WHEEL ENCODING
 * --------------------
 * The first version drew ONE spoke per language, length proportional to share. That
 * failed on real data: with three languages at 35/33/32 percent it produced three
 * near-identical spokes — an asterisk, not a wagon wheel. Length is a poor channel when
 * the values are close, and a real wagon wheel's character comes from having many
 * strokes.
 *
 * So share is now carried by TWO reinforcing channels, and length carries nothing:
 *   - sector arc      each language owns a wedge whose angle is its share of the total
 *   - stroke count    strokes are dealt out in proportion to share (STROKES total)
 *
 * Stroke lengths vary within a band purely so the fan looks like scoring shots rather
 * than a protractor. That variation is decorative and deterministic — seeded from the
 * language name, so it never churns between builds — and it is stated here so nobody
 * later reads meaning into a long stroke. Strokes that reach the rope are drawn as
 * boundaries with a landing dot; the boundary COUNT per sector is real, being a fixed
 * fraction of that language's stroke count.
 */

import { C, rng } from '../theme.mjs';
import { svg, rect, panel, meter, baseCss, pxText, label, fmt, trunc, n } from '../svg.mjs';

const P = 'bt';
const W = 880;

/** Total strokes dealt across every language. Enough to read as a fan, few enough to stay crisp. */
const STROKES = 30;

/** Row geometry for the ranked list, also used to size the canvas. */
const ROW_H = 40;
const LIST_TOP = 74;

export const file = 'batting.svg';

/** Canvas grows with the language count so a focused profile has no dead space. */
const heightFor = (count) => Math.max(300, LIST_TOP + Math.max(count, 3) * ROW_H + 44);

/** Stroke names in descending prominence — rank 1 gets the signature shot. */
const SHOTS = ['COVER DRIVE', 'STRAIGHT DRIVE', 'PULL SHOT', 'SQUARE CUT', 'LEG GLANCE', 'LOFTED SIX'];

/** Fallback palette when GitHub reports no colour for a language. */
const FALLBACK = [C.gold, C.sky, C.saffron, C.greenBright, C.royalBright, C.white];

export function render(m) {
  const langs = m.languages;
  const H = heightFor(langs.length);

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
  const cy = LIST_TOP + Math.max(langs.length, 3) * ROW_H * 0.5 + 24;
  const R = 104;

  // Ground: outfield, boundary rope, 30-yard circle.
  body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.turf}"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.crease}" stroke-width="1.5" opacity=".35"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${R * 0.58}" fill="none" stroke="${C.crease}" stroke-width="1" opacity=".16" stroke-dasharray="4 6"/>`;

  const total = langs.reduce((a, l) => a + l.share, 0) || 1;

  // Sector wedges, drawn under the strokes: the arc IS the share, readable at a glance
  // even before a single stroke is followed.
  const SPAN = 310; // degrees of playable field; the gap sits behind the keeper
  const START = -245;
  let cursor = START;
  const sectors = langs.map((l, i) => {
    const deg = (SPAN * l.share) / total;
    const s = { l, i, from: cursor, to: cursor + deg, col: l.color || FALLBACK[i % FALLBACK.length] };
    cursor += deg;
    return s;
  });

  for (const s of sectors) {
    body += `<path d="${wedge(cx, cy, R, s.from, s.to)}" fill="${s.col}" opacity=".07"/>`;
  }

  // Strokes, dealt in proportion to share.
  for (const s of sectors) {
    const count = Math.max(1, Math.round((s.l.share / total) * STROKES));
    // Seeded from the language name: same language, same fan, every build.
    const rand = rng(seedOf(s.l.name));
    const arc = s.to - s.from;

    for (let k = 0; k < count; k++) {
      // Even fan across the wedge, nudged so it reads as hand-played rather than swept.
      const frac = (k + 0.5) / count;
      const jitter = (rand() - 0.5) * (arc / count) * 0.55;
      const a = ((s.from + arc * frac + jitter) * Math.PI) / 180;

      // Decorative length band. Every fourth stroke is a boundary and reaches the rope.
      const isBoundary = k % 4 === 3;
      const len = isBoundary ? R * 0.99 : R * (0.5 + rand() * 0.38);
      const x2 = cx + Math.cos(a) * len;
      const y2 = cy + Math.sin(a) * len;
      const dash = Math.round(len);
      const delay = (s.i * 0.12 + k * 0.035).toFixed(2);

      body +=
        `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${s.col}" ` +
        `stroke-width="${isBoundary ? 2.2 : 1.5}" stroke-linecap="round" opacity="${isBoundary ? '.95' : '.6'}" ` +
        `class="${P}-shot" style="stroke-dasharray:${dash};stroke-dashoffset:${dash};animation-delay:${delay}s"/>`;

      if (isBoundary) {
        body += `<circle cx="${n(x2)}" cy="${n(y2)}" r="2.8" fill="${s.col}" class="${P}-dot" style="animation-delay:${(Number(delay) + 0.8).toFixed(2)}s"/>`;
      }
    }
  }

  // Batting crease at the centre, drawn last so strokes emanate from behind it.
  body += rect(cx - 5, cy - 22, 10, 44, C.pitch);
  body += rect(cx - 11, cy - 22, 22, 2, C.crease, ' opacity=".7"');
  body += `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.white}"/>`;

  body += label('WAGON WHEEL', { x: cx, y: cy + R + 22, size: 10, fill: C.muteDim, anchor: 'middle', spacing: 2 });
  body += label('SECTOR = SHARE · STROKES = SHARE', {
    x: cx,
    y: cy + R + 34,
    size: 8,
    fill: C.muteDim,
    anchor: 'middle',
    spacing: 0.8,
  });

  // -------------------------------------------------------------- list ------
  const lx = 300;
  const lw = W - lx - 34;
  const rowH = ROW_H;
  const top = LIST_TOP;

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

/** SVG arc path for one sector wedge, centre -> arc -> centre. */
function wedge(cx, cy, r, fromDeg, toDeg) {
  const a0 = (fromDeg * Math.PI) / 180;
  const a1 = (toDeg * Math.PI) / 180;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${n(cx)} ${n(cy)}L${n(x0)} ${n(y0)}A${r} ${r} 0 ${large} 1 ${n(x1)} ${n(y1)}Z`;
}

/** Stable integer seed from a language name, so a given language always fans identically. */
function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wrap(body, m, defs) {
  const top = m.languages[0];
  const H = heightFor(m.languages.length);
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
