/**
 * commentary.mjs — the commentary box.
 *
 * Lines arrive from data/commentary.mjs, each one carrying a real figure. They fade in
 * on a stagger so the panel reads like a live feed rather than a static blockquote.
 * An on-air lamp and a level meter (driven by the current streak) complete the booth.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, baseCss, pxText, label, trunc, clamp, n } from '../svg.mjs';

const P = 'cm';
const W = 880;
const H = 300;

export const file = 'commentary.svg';

const TONE = { hype: C.gold, stat: C.sky, calm: C.mute };

/**
 * @param {object} m metrics
 * @param {{speaker:string,line:string,tone:string}[]} lines
 */
export function render(m, lines) {
  let body = rect(0, 0, W, H, C.nightDeep);
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  // ------------------------------------------------------------- header -----
  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.royalBright);
  body += pxText('COMMENTARY BOX', { x: 40, y: 32, scale: 1.7, fill: C.sky });

  // ON AIR lamp
  body += rect(W - 118, 26, 88, 22, C.nightDeep, ` stroke="${C.red}" stroke-width="1"`);
  body += `<circle cx="${W - 106}" cy="37" r="3.5" fill="${C.red}" class="${P}-air"/>`;
  body += pxText('ON AIR', { x: W - 96, y: 32, scale: 1.3, fill: C.red });

  // ------------------------------------------------------- level meter ------
  // Bars are a readout of current form, not decoration: they track the live streak.
  const level = clamp(m.streak.current / Math.max(1, m.streak.longest), 0.12, 1);
  const bars = 26;
  for (let i = 0; i < bars; i++) {
    const on = i / bars < level;
    const h = 6 + ((i * 7) % 14);
    body += rect(
      34 + i * 9,
      H - 40 - h,
      6,
      h,
      on ? (i / bars > 0.8 ? C.saffron : C.greenBright) : C.lineSoft,
      on ? ` class="${P}-bar" style="animation-delay:${(i * 0.06).toFixed(2)}s"` : '',
    );
  }
  body += label(`FORM LEVEL — ${m.streak.current}/${m.streak.longest} DAYS`, {
    x: 34,
    y: H - 22,
    size: 9,
    fill: C.muteDim,
    spacing: 1.4,
  });

  // ---------------------------------------------------------- the feed ------
  const top = 66;
  const rowH = 28;
  const maxRows = Math.floor((H - top - 90) / rowH);

  lines.slice(0, maxRows).forEach((l, i) => {
    const y = top + i * rowH;
    const col = TONE[l.tone] ?? C.mute;
    body += `<g class="${P}-line" style="animation-delay:${(i * 0.22).toFixed(2)}s">`;
    body += rect(34, y + 4, 3, 16, col);
    body += pxText(trunc(l.speaker, 14), { x: 46, y: y + 6, scale: 1.2, fill: col });
    body += label(trunc(l.line, 96), { x: 172, y: y + 18, size: 12, fill: C.white });
    body += `</g>`;
  });

  return svg({
    w: W,
    h: H,
    title: 'Match commentary',
    desc: lines.map((l) => `${l.speaker}: ${l.line}`).join(' '),
    css:
      baseCss(P) +
      `.${P}-air{animation:${P}-blink 1.2s steps(1) infinite}` +
      `@keyframes ${P}-slide{0%{opacity:0;transform:translateX(-10px)}100%{opacity:1;transform:translateX(0)}}` +
      `.${P}-line{animation:${P}-slide .55s ease-out both}` +
      `@keyframes ${P}-vu{0%,100%{transform:scaleY(.55)}50%{transform:scaleY(1)}}` +
      `.${P}-bar{transform-box:fill-box;transform-origin:bottom;animation:${P}-vu 1.1s ease-in-out infinite}`,
    body,
  });
}
