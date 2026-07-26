/**
 * svg.mjs — low-level SVG primitives shared by every scene.
 *
 * Design rules enforced here:
 *   1. Everything snaps to an integer grid (`shape-rendering="crispEdges"`) so
 *      pixel art never lands on a half-pixel and blurs.
 *   2. No <script>, no external refs, no webfonts — GitHub's Camo proxy strips them.
 *   3. Animation is CSS keyframes inside the document; those DO run inside <img>.
 *   4. `prefers-reduced-motion` is honoured in every emitted stylesheet.
 */

import { C, rng } from './theme.mjs';
import { text as pxText, measureScaled, lineHeight, flushAtlas } from './pixel-font.mjs';

export { pxText, measureScaled, lineHeight };

/** XML-escape a value destined for text content or an attribute. */
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Round to 2dp and drop trailing zeros — meaningful size win across ~30 files. */
export const n = (v) => {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
};

/**
 * Wrap scene content in a root <svg>.
 * @param {object} o
 * @param {number} o.w
 * @param {number} o.h
 * @param {string} o.title      accessible name (screen readers + GitHub alt fallback)
 * @param {string} [o.desc]
 * @param {string} [o.css]      scene stylesheet (already namespaced by the caller)
 * @param {string} [o.defs]
 * @param {string} o.body
 */
export function svg({ w, h, title, desc = '', css = '', defs = '', body }) {
  const style = css
    ? `<style>${css}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>`
    : '';
  // MUST come after `body` has been built: the atlas only knows which glyphs a scene
  // used once every pxText() call in that scene has run.
  const glyphs = flushAtlas();
  const allDefs = glyphs + defs;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-labelledby="t d" font-family="'DejaVu Sans Mono','Liberation Mono','Courier New',monospace">` +
    `<title id="t">${esc(title)}</title><desc id="d">${esc(desc || title)}</desc>` +
    `${style}${allDefs ? `<defs>${allDefs}</defs>` : ''}${body}</svg>`
  );
}

/** Axis-aligned rectangle on the pixel grid. */
export function rect(x, y, w, h, fill, extra = '') {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" shape-rendering="crispEdges"${extra ? ' ' + extra : ''}/>`;
}

/**
 * A chunky retro panel: 2px outer stroke, inset highlight, dark fill.
 * Corners are notched (not rounded) to stay in the pixel idiom.
 */
export function panel(x, y, w, h, { fill = C.panel, stroke = C.line, glow = C.royal, notch = 6 } = {}) {
  const pts = [
    [x + notch, y],
    [x + w - notch, y],
    [x + w, y + notch],
    [x + w, y + h - notch],
    [x + w - notch, y + h],
    [x + notch, y + h],
    [x, y + h - notch],
    [x, y + notch],
  ]
    .map((p) => `${n(p[0])},${n(p[1])}`)
    .join(' ');
  return (
    `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
    `<polygon points="${pts}" fill="none" stroke="${glow}" stroke-width="1" opacity=".35" transform="translate(0,1)"/>`
  );
}

/** Monospace body text. Used where 5x7 pixel glyphs would be unreadable (< 9px). */
export function label(str, { x, y, size = 11, fill = C.mute, anchor = 'start', weight = 400, spacing = 0, extra = '', children = '' } = {}) {
  return (
    `<text x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ` +
    `font-weight="${weight}"${spacing ? ` letter-spacing="${spacing}"` : ''}${extra ? ' ' + extra : ''}>${esc(str)}${children}</text>`
  );
}

/**
 * Segmented progress bar — the retro "power meter" used for batting/bowling stats.
 * Renders as discrete cells rather than a smooth rect, and fills left-to-right.
 *
 * @param {object} o
 * @param {number} o.pct  0..100
 * @param {number} [o.cells] number of segments
 * @param {string} [o.anim] name of a CSS class that animates the fill mask
 */
export function meter({ x, y, w, h, pct, cells = 20, on = C.gold, off = C.lineSoft, gap = 2, anim = '' }) {
  const cw = (w - gap * (cells - 1)) / cells;
  const lit = Math.round((clamp(pct, 0, 100) / 100) * cells);
  let out = '';
  for (let i = 0; i < cells; i++) {
    const cx = x + i * (cw + gap);
    const isOn = i < lit;
    const delay = (i * 0.05).toFixed(2);
    out += rect(
      cx,
      y,
      cw,
      h,
      isOn ? on : off,
      isOn && anim ? `class="${anim}" style="animation-delay:${delay}s"` : '',
    );
  }
  return out;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Accumulates axis-aligned cells and emits ONE <path> per colour.
 *
 * WHY: a naive `<rect .../>` costs ~95 bytes with its attributes; the same cell as a
 * path subpath costs ~18. Scenes with thousands of cells (crowds, sprites) are the
 * whole size budget, and the first build of the hero blew a 220 KB per-file limit at
 * 325 KB. Batching by colour brings it under 40 KB with pixel-identical output.
 */
export class CellBatch {
  constructor() {
    /** @type {Map<string,string[]>} colour -> path fragments */
    this.byColour = new Map();
  }

  /** Add a filled cell. */
  add(x, y, w, h, fill) {
    let d = this.byColour.get(fill);
    if (!d) this.byColour.set(fill, (d = []));
    d.push(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`);
  }

  /**
   * @param {string} [extra] attributes appended to every emitted <path>
   * @returns {string}
   */
  toSvg(extra = '') {
    let out = '';
    for (const [fill, parts] of this.byColour) {
      out += `<path d="${parts.join('')}" fill="${fill}" shape-rendering="crispEdges"${extra ? ' ' + extra : ''}/>`;
    }
    return out;
  }
}

/**
 * Render a pixel sprite from a string-art grid.
 *
 * Each character maps to a colour via `palette`; '.' (or any char missing from the
 * palette) is transparent. Horizontal runs collapse first, then everything is batched
 * into one path per colour — a 24x28 sprite lands at ~6 nodes instead of 672.
 *
 * @param {string[]} rows
 * @param {Record<string,string>} palette
 * @param {object} o
 * @param {number} o.x
 * @param {number} o.y
 * @param {number} [o.s] pixel size
 * @param {string} [o.extra] attributes for the wrapping <g>
 */
export function sprite(rows, palette, { x = 0, y = 0, s = 3, extra = '' } = {}) {
  const batch = new CellBatch();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      const fill = palette[ch];
      if (!fill) {
        c++;
        continue;
      }
      let run = 1;
      while (c + run < row.length && row[c + run] === ch) run++;
      batch.add(x + c * s, y + r * s, run * s, s, fill);
      c += run;
    }
  }
  return `<g${extra ? ' ' + extra : ''}>${batch.toSvg()}</g>`;
}

/**
 * Stadium crowd band — thousands of tiny seats, deterministically placed.
 * Tri-colour pockets read as flags in the stands without drawing a flag.
 *
 * Opacity is baked into pre-dimmed hex values rather than an `opacity` attribute, so
 * every seat of a given shade batches into the same path.
 */
export function crowd(x, y, w, h, seed = 7, { density = 0.55, size = 4 } = {}) {
  const rand = rng(seed);
  const cols = Math.floor(w / size);
  const rows = Math.floor(h / size);
  const batch = new CellBatch();
  let out = rect(x, y, w, h, C.nightDeep);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() > density) continue;
      const roll = rand();
      // ~14% flag-coloured pockets: saffron / white / green, at full brightness.
      const fill =
        roll > 0.94
          ? C.saffron
          : roll > 0.9
            ? C.white
            : roll > 0.86
              ? C.green
              : roll > 0.55
                ? CROWD_DIM[1]
                : CROWD_DIM[0];
      batch.add(x + c * size, y + r * size, size - 1, size - 1, fill);
    }
  }
  return out + batch.toSvg();
}

/** Crowd base tones pre-blended toward the night sky (was a 0.65 opacity attribute). */
const CROWD_DIM = ['#131F3E', '#1A2C52'];

/** Floodlight pylon with a lamp array and a soft light cone. */
export function floodlight(x, y, { h = 70, dir = 1, cone = true, id = 'fl' } = {}) {
  const headW = 34;
  let out = '';
  // Lattice mast. C.line rather than C.navySoft: against the night sky the softer tone
  // vanished and the lamp array read as a panel floating in mid-air.
  out += rect(x - 2, y, 4, h, C.line);
  out += rect(x - 6, y + h * 0.35, 12, 2, C.line);
  out += rect(x - 8, y + h * 0.7, 16, 2, C.line);
  // Lamp head
  out += rect(x - headW / 2, y - 16, headW, 16, C.navySoft);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      out += rect(x - headW / 2 + 3 + c * 6, y - 14 + r * 5, 4, 3, C.gold, ` class="${id}-lamp" style="animation-delay:${((r + c) * 0.12).toFixed(2)}s"`);
    }
  }
  if (cone) {
    out +=
      `<path d="M${n(x - headW / 2)} ${n(y)} L${n(x - headW / 2 - 90 * dir)} ${n(y + h + 120)} L${n(x + headW / 2 + 60 * dir)} ${n(y + h + 120)} L${n(x + headW / 2)} ${n(y)} Z" ` +
      `fill="url(#${id}-cone)" class="${id}-beam"/>`;
  }
  return out;
}

/** Gradient definition for `floodlight`'s cone. */
export const floodlightDefs = (id = 'fl') =>
  `<linearGradient id="${id}-cone" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="${C.gold}" stop-opacity=".22"/>` +
  `<stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></linearGradient>`;

/** Shared keyframes every scene may opt into. Namespaced by `p` to avoid collisions. */
export function baseCss(p) {
  return (
    `@keyframes ${p}-flicker{0%,96%,100%{opacity:1}97%{opacity:.55}98%{opacity:.9}}` +
    `@keyframes ${p}-pulse{0%,100%{opacity:.85}50%{opacity:1}}` +
    `@keyframes ${p}-pop{0%{opacity:0;transform:scaleX(0)}100%{opacity:1;transform:scaleX(1)}}` +
    `@keyframes ${p}-blink{0%,49%{opacity:1}50%,100%{opacity:.15}}` +
    `@keyframes ${p}-rise{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}` +
    `.${p}-lamp{animation:${p}-flicker 4s infinite}` +
    `.${p}-beam{animation:${p}-pulse 6s ease-in-out infinite}`
  );
}

/** Number formatting used across scoreboards: 1234 -> "1,234". */
export const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : String(v ?? '—'));

/** Compact form for tight cells: 12400 -> "12.4K". */
export function compact(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(v) >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return v.toLocaleString('en-US');
}

/** Truncate to `max` chars with a trailing ellipsis character. */
export const trunc = (s, max) => {
  const t = String(s ?? '');
  return t.length <= max ? t : t.slice(0, Math.max(0, max - 1)) + '…';
};
