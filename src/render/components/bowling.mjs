/**
 * bowling.mjs — "THE ARSENAL": backend, DevOps, AI and cloud as delivery types.
 *
 * You declare which technologies belong in your arsenal (config.bowling); the figures
 * beside each one are measured, not claimed:
 *   WKT   repositories where the technology actually appears
 *   OVR   your own commits inside those repositories
 *   kph   a presentation of OVR relative to your busiest delivery (see metrics.mjs)
 *
 * A delivery you have declared but never bowled renders dimmed with a dash. That is
 * deliberate — an honest arsenal beats a full one.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, meter, baseCss, pxText, label, sprite, fmt, compact, trunc, n } from '../svg.mjs';
import { BOWLER, PAL } from '../sprites.mjs';

const P = 'bw';
const W = 880;
const H = 430;

export const file = 'bowling.svg';

/** Accent per category, cycling the jersey palette. */
const ACCENT = [C.saffron, C.sky, C.greenBright, C.gold];

export function render(m) {
  const groups = m.arsenal;

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  // ------------------------------------------------------------- header -----
  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.saffron);
  body += pxText('BOWLING ARSENAL', { x: 40, y: 32, scale: 1.7, fill: C.saffron });
  body += label('MEASURED FROM REPOSITORY LANGUAGES, TOPICS & COMMITS', {
    x: W - 34,
    y: 42,
    size: 10,
    fill: C.muteDim,
    anchor: 'end',
    spacing: 1.2,
  });

  // Speed gun: the fastest delivery across every category, live.
  const fastest = groups.flatMap((g) => g.deliveries).sort((a, b) => b.pace - a.pace)[0];
  if (fastest) body += speedGun(W - 250, 60, fastest);

  // Run-up figure tucked behind the gun.
  body += sprite(BOWLER, PAL, { x: 34, y: 58, s: 2, extra: `class="${P}-runup" opacity=".9"` });
  body += label('THE SPEEDSTER · #500', { x: 34, y: 122, size: 9, fill: C.muteDim, spacing: 1.2 });

  // ------------------------------------------------------------- grid -------
  const gx = 24;
  const gy = 140;
  const gw = (W - 48 - 16) / 2;
  const gh = 132;

  groups.slice(0, 4).forEach((g, i) => {
    const x = gx + (i % 2) * (gw + 16);
    const y = gy + Math.floor(i / 2) * (gh + 16);
    body += categoryCard(x, y, gw, gh, g, ACCENT[i % ACCENT.length], i);
  });

  const flat = groups.flatMap((g) => g.deliveries);
  const live = flat.filter((d) => d.wickets > 0);

  return svg({
    w: W,
    h: H,
    title: 'Bowling arsenal — backend, DevOps, AI and cloud',
    desc:
      `${live.length} of ${flat.length} declared technologies verified in public repositories. ` +
      live
        .slice(0, 12)
        .map((d) => `${d.name}: ${d.wickets} repos, ${d.overs} commits`)
        .join('; ') +
      '.',
    css:
      baseCss(P) +
      `@keyframes ${P}-run{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}` +
      `.${P}-runup{animation:${P}-run 2.6s ease-in-out infinite}` +
      `.${P}-row{animation:${P}-rise .45s ease-out both}` +
      `.${P}-cell{transform-box:fill-box;transform-origin:left center;animation:${P}-pop .35s ease-out both}` +
      `@keyframes ${P}-tick{0%,100%{opacity:.6}50%{opacity:1}}` +
      `.${P}-gun{animation:${P}-tick 2s ease-in-out infinite}`,
    body,
  });
}

/** One category panel with up to five delivery rows. */
function categoryCard(x, y, w, h, group, accent, gi) {
  let out = rect(x, y, w, h, C.navy, ` stroke="${C.lineSoft}" stroke-width="1"`);
  out += rect(x, y, w, 20, C.navySoft);
  out += rect(x, y, 3, 20, accent);
  out += pxText(group.category, { x: x + 10, y: y + 7, scale: 1.4, fill: accent });

  // Column captions, right-aligned to match the figures beneath them.
  out += label('OVR', { x: x + w - 74, y: y + 15, size: 8, fill: C.muteDim, anchor: 'end', spacing: 1 });
  out += label('WKT', { x: x + w - 34, y: y + 15, size: 8, fill: C.muteDim, anchor: 'end', spacing: 1 });

  const rows = group.deliveries.slice(0, 5);
  const peak = Math.max(1, ...rows.map((d) => d.overs));
  const rowH = 21;

  rows.forEach((d, i) => {
    const ry = y + 26 + i * rowH;
    const used = d.wickets > 0;
    const col = used ? accent : C.muteDim;
    out += `<g class="${P}-row" style="animation-delay:${(gi * 0.08 + i * 0.05).toFixed(2)}s"${used ? '' : ' opacity=".45"'}>`;
    out += pxText(trunc(d.name, 12), { x: x + 10, y: ry, scale: 1.5, fill: used ? C.white : C.muteDim });

    // Pace pip doubles as the workload meter. Widths are chosen so the meter, the
    // speed readout and the two figure columns never touch at the narrowest card.
    out += meter({
      x: x + 124,
      y: ry + 1,
      w: 80,
      h: 7,
      pct: used ? (d.overs / peak) * 100 : 0,
      cells: 8,
      on: col,
      off: C.lineSoft,
      gap: 2,
      anim: `${P}-cell`,
    });
    out += label(used ? `${d.pace}` : '-', { x: x + 232, y: ry + 9, size: 9, fill: col, anchor: 'end' });
    out += label('kph', { x: x + 236, y: ry + 9, size: 7, fill: C.muteDim });

    out += pxText(used ? compact(d.overs) : '—', { x: x + w - 74, y: ry, scale: 1.4, fill: used ? C.white : C.muteDim, anchor: 'end' });
    out += pxText(used ? String(d.wickets) : '—', { x: x + w - 34, y: ry, scale: 1.4, fill: col, anchor: 'end' });
    out += `</g>`;
  });

  return out;
}

/** Broadcast speed-gun readout for the single fastest delivery. */
function speedGun(x, y, d) {
  let out = rect(x, y, 216, 66, C.nightDeep, ` stroke="${C.saffron}" stroke-width="1"`);
  out += label('FASTEST DELIVERY', { x: x + 12, y: y + 16, size: 9, fill: C.muteDim, spacing: 1.8 });
  out += pxText(String(d.pace), { x: x + 12, y: y + 24, scale: 3.6, fill: C.saffron, extra: `class="${P}-gun"` });
  out += label('kph', { x: x + 12 + String(d.pace).length * 6 * 3.6 + 6, y: y + 49, size: 11, fill: C.saffron });
  out += pxText(trunc(d.name, 12), { x: x + 204, y: y + 42, scale: 1.5, fill: C.white, anchor: 'end' });
  return out;
}
