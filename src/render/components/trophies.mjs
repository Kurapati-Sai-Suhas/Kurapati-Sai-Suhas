/**
 * trophies.mjs — "THE TROPHY CABINET".
 *
 * Two kinds of silverware sit side by side and are visually distinguished:
 *   - CERT  gold plinth: certifications and awards you declare in config.json
 *   - LIVE  blue plinth: milestones the API proves right now (stars, followers,
 *           streaks, century months, merged PRs)
 *
 * A live trophy disappears the moment the underlying number stops supporting it.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, sprite, baseCss, pxText, label, trunc, n } from '../svg.mjs';
import { TROPHY, PAL } from '../sprites.mjs';

const P = 'tr';
const W = 880;

/**
 * A shelf is a fixed 104px block — cup, plate, caption, plank — and the canvas grows to
 * fit however many shelves are needed. Dividing a fixed height by the shelf count
 * instead (the first attempt) put the plank straight through the engraved plates.
 */
const SHELF_H = 104;
const PER_SHELF = 4;
const TOP = 62; // below the header band
const BOTTOM = 28;

export const file = 'trophies.svg';

/** Canvas height for a given number of trophies. */
const heightFor = (count) => TOP + Math.max(1, Math.ceil(count / PER_SHELF)) * SHELF_H + BOTTOM;

export function render(m) {
  const items = m.trophies.slice(0, 8);
  const H = heightFor(items.length);

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.gold);
  body += pxText('TROPHY CABINET', { x: 40, y: 32, scale: 1.7, fill: C.gold });
  const certs = items.filter((t) => t.kind === 'cert').length;
  body += label(`${certs} AWARDED · ${items.length - certs} EARNED ON THE FIELD`, {
    x: W - 34,
    y: 42,
    size: 10,
    fill: C.muteDim,
    anchor: 'end',
    spacing: 1.2,
  });

  if (!items.length) {
    body += label('CABINET EMPTY - FIRST SILVERWARE PENDING.', {
      x: W / 2,
      y: H / 2,
      size: 12,
      fill: C.muteDim,
      anchor: 'middle',
      spacing: 1.5,
    });
    return wrap(body, m, H);
  }

  // Cabinet interior with a soft backlight
  body += rect(24, TOP, W - 48, H - TOP - BOTTOM, C.navy, ` stroke="${C.line}" stroke-width="1"`);
  body += `<rect x="24" y="${TOP}" width="${W - 48}" height="${H - TOP - BOTTOM - 4}" fill="url(#${P}-back)"/>`;

  const shelves = Math.ceil(items.length / PER_SHELF);
  const cellW = (W - 60) / PER_SHELF;

  for (let s = 0; s < shelves; s++) {
    const sy = TOP + s * SHELF_H;

    items.slice(s * PER_SHELF, s * PER_SHELF + PER_SHELF).forEach((t, i) => {
      const idx = s * PER_SHELF + i;
      const x = 30 + i * cellW;
      const cx = x + cellW / 2;
      const isCert = t.kind === 'cert';
      const accent = isCert ? C.gold : C.sky;

      body += `<g class="${P}-item" style="animation-delay:${(idx * 0.09).toFixed(2)}s">`;
      // Glow behind the cup
      body += `<ellipse cx="${n(cx)}" cy="${n(sy + 28)}" rx="30" ry="26" fill="url(#${P}-glow)"/>`;
      // Cup: 16 rows at 2px = 32px, occupying sy+10 .. sy+42
      body += sprite(TROPHY, isCert ? PAL : { ...PAL, t: C.sky, w: C.white }, {
        x: cx - 14,
        y: sy + 10,
        s: 2,
        extra: `class="${P}-cup" style="animation-delay:${(idx * 0.25).toFixed(2)}s"`,
      });

      // Engraved plate, entirely above the plank at sy + 92
      const plateY = sy + 48;
      body += rect(x + 8, plateY, cellW - 16, 3, accent, ' opacity=".8"');
      body += pxText(trunc(String(t.title), 18), {
        x: cx,
        y: plateY + 9,
        scale: 1.3,
        fill: C.white,
        anchor: 'middle',
      });
      const sub = [t.issuer, t.year].filter(Boolean).join(' / ');
      if (sub) body += label(trunc(sub, 24), { x: cx, y: plateY + 32, size: 9, fill: C.muteDim, anchor: 'middle' });
      body += label(isCert ? 'AWARDED' : 'LIVE', {
        x: cx,
        y: plateY + 43,
        size: 7,
        fill: accent,
        anchor: 'middle',
        spacing: 2,
      });
      body += `</g>`;
    });

    // Shelf plank + front lip, drawn last so it sits in front of the cups above it.
    const plankY = sy + SHELF_H - 8;
    body += rect(30, plankY, W - 60, 4, C.goldDeep, ' opacity=".75"');
    body += rect(30, plankY + 4, W - 60, 2, C.nightDeep, ' opacity=".6"');
  }

  return wrap(body, m, H);
}

function wrap(body, m, H) {
  const defs =
    `<linearGradient id="${P}-back" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${C.royal}" stop-opacity=".22"/>` +
    `<stop offset="1" stop-color="${C.royal}" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="${P}-glow"><stop offset="0" stop-color="${C.gold}" stop-opacity=".3"/>` +
    `<stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>`;

  return svg({
    w: W,
    h: H,
    title: 'Trophy cabinet — certifications and milestones',
    desc: m.trophies.map((t) => [t.title, t.issuer, t.year].filter(Boolean).join(' ')).join('; ') || 'Cabinet empty.',
    defs,
    css:
      baseCss(P) +
      `.${P}-item{animation:${P}-rise .55s ease-out both}` +
      `@keyframes ${P}-shine{0%,88%,100%{transform:translateY(0)}94%{transform:translateY(-3px)}}` +
      `.${P}-cup{animation:${P}-shine 5s ease-in-out infinite}`,
    body,
  });
}
