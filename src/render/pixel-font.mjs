/**
 * pixel-font.mjs — a self-contained 5x7 bitmap font.
 *
 * WHY THIS EXISTS
 * ---------------
 * GitHub renders README SVGs inside an <img> tag behind its Camo proxy. That means:
 *   - no external font files (@font-face to a CDN is blocked),
 *   - no <script>,
 *   - web-safe font stacks only.
 * A "retro pixel" look therefore cannot rely on a webfont like Press Start 2P. Instead we
 * ship the glyphs ourselves and emit them as vector rectangles, which gives genuinely
 * pixel-perfect text at any integer scale on every renderer.
 *
 * ENCODING
 * --------
 * Each glyph is 5 columns x 7 rows, stored column-major as 5 bytes. Within a byte,
 * bit 0 is the TOP row and bit 6 is the bottom row. This is the classic GLCD 5x7
 * layout, so the tables are easy to verify against any reference.
 *
 * Only uppercase is defined; `text()` upper-cases input. That is deliberate — mixed case
 * at 5x7 is illegible, and all-caps reads as a scoreboard.
 */

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** Blank columns inserted between glyphs, in font pixels. */
export const TRACKING = 1;

/** @type {Record<string, number[]>} */
const FONT = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  $: [0x24, 0x2a, 0x7f, 0x2a, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1c, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1c, 0x00],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  0: [0x3e, 0x51, 0x49, 0x45, 0x3e],
  1: [0x00, 0x42, 0x7f, 0x40, 0x00],
  2: [0x42, 0x61, 0x51, 0x49, 0x46],
  3: [0x21, 0x41, 0x45, 0x4b, 0x31],
  4: [0x18, 0x14, 0x12, 0x7f, 0x10],
  5: [0x27, 0x45, 0x45, 0x45, 0x39],
  6: [0x3c, 0x4a, 0x49, 0x49, 0x30],
  7: [0x01, 0x71, 0x09, 0x05, 0x03],
  8: [0x36, 0x49, 0x49, 0x49, 0x36],
  9: [0x06, 0x49, 0x49, 0x29, 0x1e],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3e],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x01, 0x01],
  G: [0x3e, 0x41, 0x41, 0x51, 0x32],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x04, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x7f, 0x20, 0x18, 0x20, 0x7f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x03, 0x04, 0x78, 0x04, 0x03],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x00, 0x7f, 0x41, 0x41],
  ']': [0x41, 0x41, 0x7f, 0x00, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  _: [0x40, 0x40, 0x40, 0x40, 0x40],
};

const FALLBACK = '?';

/**
 * Glyphs referenced since the last flush.
 *
 * Text is emitted as <use href="#..."> against a per-document glyph atlas rather than
 * as inline path data. A 12-character run drops from ~2.4 KB to ~350 bytes, which is
 * the difference between a 97 KB hero and a 30 KB one.
 *
 * The collector is module-level because `text()` is called from deep inside scene code
 * that has no document context to thread through. This is safe because `svg()` — the
 * single place a document is finalised — flushes it, and scenes are rendered one at a
 * time. `flushAtlas()` is therefore always paired with exactly one document.
 */
const used = new Set();

/** Stable, valid XML id for a glyph. */
const gid = (ch) => `g${ch.charCodeAt(0)}`;

/**
 * Emit <defs> content for every glyph used since the last call, then reset.
 * Called by `svg()`; scenes never need to touch it.
 * @returns {string}
 */
export function flushAtlas() {
  if (!used.size) return '';
  let out = '';
  for (const ch of used) {
    out += `<path id="${gid(ch)}" d="${unitPath(FONT[ch])}"/>`;
  }
  used.clear();
  return out;
}

/** One glyph at unit scale (5x7), vertical runs merged. */
function unitPath(cols) {
  let d = '';
  for (let c = 0; c < GLYPH_W; c++) {
    const bits = cols[c];
    let row = 0;
    while (row < GLYPH_H) {
      if (bits & (1 << row)) {
        let run = 1;
        while (row + run < GLYPH_H && bits & (1 << (row + run))) run++;
        d += `M${c} ${row}h1v${run}h-1z`;
        row += run;
      } else {
        row++;
      }
    }
  }
  return d;
}

/**
 * Advance width of a string in font pixels (before scaling).
 * @param {string} str
 * @returns {number}
 */
export function measure(str) {
  // Normalised so callers laying out around text (anchors, adjacent chips) measure the
  // same string that will actually be drawn.
  const n = normalize(str).length;
  return n === 0 ? 0 : n * (GLYPH_W + TRACKING) - TRACKING;
}

/**
 * Width of a string in user units once scaled.
 * @param {string} str
 * @param {number} scale pixels per font pixel
 */
export function measureScaled(str, scale) {
  return measure(str) * scale;
}

const round = (v) => {
  const r = Math.round(v * 100) / 100;
  return String(r);
};

/**
 * Fold typographic characters onto glyphs the 5x7 set actually has.
 *
 * Without this, an em dash or ellipsis silently renders as "?" — which is exactly what
 * happened to every "THE SQUARE — LAST 12 MONTHS" heading and every truncated repo
 * name on the first pass. Accented characters are stripped to their base letter so a
 * repository or display name with diacritics still reads.
 */
function normalize(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining marks
    .replace(/[—–−]/g, '-') // em/en dash, minus
    .replace(/…/g, '...')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, '.')
    .replace(/ /g, ' ');
}

/**
 * Render pixel text as one <g> of <use> references into the document glyph atlas.
 * The group carries the colour and the translate/scale, so a caller can animate or
 * recolour a whole string as a single unit.
 *
 * @param {string} str
 * @param {object} opts
 * @param {number} opts.x        left edge (or anchor point, see `anchor`)
 * @param {number} opts.y        top edge of the cap height
 * @param {number} [opts.scale]  user units per font pixel (integer = crispest)
 * @param {string} [opts.fill]
 * @param {'start'|'middle'|'end'} [opts.anchor]
 * @param {number} [opts.opacity]
 * @param {string} [opts.extra]  raw attributes appended to the <g>
 * @param {string} [opts.children] raw markup nested inside the <g> (e.g. <animate>)
 * @returns {string} SVG markup
 */
export function text(str, { x = 0, y = 0, scale = 2, fill = '#fff', anchor = 'start', opacity, extra = '', children = '' } = {}) {
  const s = normalize(str).toUpperCase();
  if (!s) return '';

  const w = measureScaled(s, scale);
  let ox = x;
  if (anchor === 'middle') ox = x - w / 2;
  else if (anchor === 'end') ox = x - w;

  let uses = '';
  for (let i = 0; i < s.length; i++) {
    const ch = FONT[s[i]] ? s[i] : FALLBACK;
    if (ch === ' ') continue; // no ink, no node
    used.add(ch);
    uses += `<use href="#${gid(ch)}" x="${i * (GLYPH_W + TRACKING)}"/>`;
  }
  if (!uses) return '';

  const op = opacity === undefined ? '' : ` opacity="${opacity}"`;
  const inner =
    `<g transform="translate(${round(ox)} ${round(y)}) scale(${round(scale)})" fill="${fill}"` +
    ` shape-rendering="crispEdges">${uses}${children}</g>`;

  // IMPORTANT: when the caller attaches an animated class, the class goes on an OUTER
  // wrapper, never on the element carrying the transform attribute.
  //
  // A CSS `transform` in a keyframe replaces the `transform` PRESENTATION ATTRIBUTE
  // outright — it does not compose with it. Putting an animation like
  // `translateY(6px) -> translateY(0)` on this element would therefore throw away the
  // translate/scale that positions the text, and every animated label would pile up at
  // the top-left corner at 1x scale. Splitting the two responsibilities makes any
  // caller-supplied animation compose correctly.
  return extra || op ? `<g${op}${extra ? ' ' + extra : ''}>${inner}</g>` : inner;
}

/** Height of a line of text at `scale`, in user units. */
export const lineHeight = (scale) => GLYPH_H * scale;
