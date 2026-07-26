/**
 * kit.mjs — "THE KIT BAG": the stack, laid out as equipment.
 *
 * Four compartments (bat / pads / gloves / helmet) map to language, framework, data and
 * platform tiers. Each item shows how many of your repositories it is actually packed in,
 * so the bag reflects what you carry to matches rather than what you own.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, baseCss, pxText, label, trunc, compact, n } from '../svg.mjs';

const P = 'kt';
const W = 880;
const H = 300;

export const file = 'kit.svg';

const ACCENT = [C.gold, C.sky, C.saffron, C.greenBright];

export function render(m) {
  const pieces = m.kit;

  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.green);
  body += pxText('THE KIT BAG', { x: 40, y: 32, scale: 1.7, fill: C.greenBright });
  const packed = pieces.flatMap((p) => p.items).filter((i) => i.usedIn > 0).length;
  const total = pieces.flatMap((p) => p.items).length;
  body += label(`${packed}/${total} ITEMS PACKED AND MATCH-READY`, {
    x: W - 34,
    y: 42,
    size: 10,
    fill: C.muteDim,
    anchor: 'end',
    spacing: 1.2,
  });

  // Bag strap running behind the compartments — pure decoration, snapped to the grid.
  body += rect(24, 70, W - 48, 4, C.navySoft);
  body += rect(24, H - 44, W - 48, 4, C.navySoft);

  const cols = Math.max(1, pieces.length);
  const cw = (W - 48 - (cols - 1) * 12) / cols;

  pieces.forEach((piece, i) => {
    const x = 24 + i * (cw + 12);
    body += compartment(x, 82, cw, H - 82 - 50, piece, ACCENT[i % ACCENT.length], i);
  });

  return svg({
    w: W,
    h: H,
    title: 'Kit bag — technology stack',
    desc: pieces
      .map((p) => `${p.piece} (${p.sub}): ` + p.items.map((it) => `${it.name} in ${it.usedIn} repos`).join(', '))
      .join('. '),
    css:
      baseCss(P) +
      `.${P}-item{animation:${P}-rise .5s ease-out both}` +
      `@keyframes ${P}-sheen{0%,100%{opacity:.25}50%{opacity:.6}}` +
      `.${P}-sheen{animation:${P}-sheen 4s ease-in-out infinite}`,
    body,
  });
}

/** One compartment of the bag. */
function compartment(x, y, w, h, piece, accent, ci) {
  let out = rect(x, y, w, h, C.navy, ` stroke="${C.lineSoft}" stroke-width="1"`);
  out += rect(x, y, w, 3, accent, ` class="${P}-sheen" style="animation-delay:${(ci * 0.4).toFixed(1)}s"`);

  out += pxText(piece.piece, { x: x + 10, y: y + 14, scale: 1.5, fill: accent });
  out += label(piece.sub, { x: x + 10, y: y + 36, size: 9, fill: C.muteDim, spacing: 1.6 });

  const rowH = 26;
  piece.items.slice(0, 5).forEach((it, i) => {
    const ry = y + 48 + i * rowH;
    const used = it.usedIn > 0;
    out += `<g class="${P}-item" style="animation-delay:${(ci * 0.06 + i * 0.05).toFixed(2)}s"${used ? '' : ' opacity=".4"'}>`;
    out += rect(x + 8, ry, w - 16, 20, used ? C.navySoft : 'transparent', used ? '' : ` stroke="${C.lineSoft}" stroke-width="1" stroke-dasharray="2 3"`);
    out += rect(x + 8, ry, 2, 20, used ? accent : C.muteDim);
    out += pxText(trunc(it.name, 11), { x: x + 16, y: ry + 6, scale: 1.4, fill: used ? C.white : C.muteDim });
    out += label(used ? `x${it.usedIn}` : '—', {
      x: x + w - 16,
      y: ry + 14,
      size: 10,
      fill: used ? accent : C.muteDim,
      anchor: 'end',
    });
    out += `</g>`;
  });
  return out;
}
