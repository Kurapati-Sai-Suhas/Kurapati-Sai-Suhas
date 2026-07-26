/**
 * hero.mjs — "TOSS, LIGHTS, FIRST BALL".
 *
 * The opening scene: a floodlit night stadium, a full house, the two originals at
 * either end, and an animated first delivery on a loop. Everything is drawn from
 * primitives — no raster assets, no external requests.
 *
 * Motion budget: 6 concurrent CSS animations, all transform/opacity only (compositor
 * friendly), all suppressed under `prefers-reduced-motion`.
 */

import { C, rng } from '../theme.mjs';
import { svg, rect, sprite, crowd, floodlight, floodlightDefs, baseCss, pxText, measureScaled, label, esc, n } from '../svg.mjs';
import { BATTER, BOWLER, BAT, BALL, STUMPS, PAL } from '../sprites.mjs';

const P = 'h'; // CSS namespace for this document
const W = 880;
const H = 320;

/**
 * Vertical rhythm of the sky. The title block occupies TITLE_TOP..STAND_TOP; the
 * bunting hangs just above STAND_TOP; the crowd fills STAND_TOP..horizon. Keeping
 * these as named constants is what stops a longer display name from printing over
 * the stands.
 */
const TITLE_TOP = 36;
const STAND_TOP = 142;

export const file = 'hero.svg';

/**
 * @param {object} m metrics
 * @param {object} config
 */
export function render(m, config) {
  const player = config.player;
  const name = (player.displayName || m.profile.name || m.profile.login).toUpperCase();
  const horizon = 196; // y of the outfield edge

  // ---------------------------------------------------------------- sky ------
  let body = rect(0, 0, W, H, C.nightDeep);
  body += `<rect width="${W}" height="${horizon}" fill="url(#${P}-sky)"/>`;

  // Star field — deterministic so scheduled rebuilds don't churn the file.
  const rand = rng(1983);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * (horizon - 70));
    const s = rand() > 0.85 ? 2 : 1;
    body += rect(x, y, s, s, C.white, ` opacity="${(0.15 + rand() * 0.5).toFixed(2)}" class="${P}-star" style="animation-delay:${(rand() * 4).toFixed(2)}s"`);
  }

  // ------------------------------------------------------------ stands ------
  // 5px seats at 0.5 density: ~1.3k cells. Denser or finer than this and the crowd
  // alone doubles the file for no visible gain at README width.
  // STAND_TOP is the hard floor for the title block above it — see TITLE_TOP.
  body += crowd(0, STAND_TOP, W, horizon - STAND_TOP, 4242, { density: 0.5, size: 5 });
  body += rect(0, STAND_TOP - 4, W, 4, C.navySoft);
  body += rect(0, horizon - 8, W, 8, C.navy);

  // Tricolour bunting strung across the top tier.
  for (let x = 6; x < W; x += 22) {
    const f = [C.saffron, C.white, C.green][(x / 22) % 3 | 0];
    body += `<path d="M${x} ${STAND_TOP - 12}l7 12 7-12z" fill="${f}" opacity=".85" class="${P}-flag" style="animation-delay:${((x % 132) / 132).toFixed(2)}s"/>`;
  }

  // ------------------------------------------------------- floodlights ------
  body += floodlight(96, horizon - 150, { h: 74, dir: -1, id: P });
  body += floodlight(W - 96, horizon - 150, { h: 74, dir: 1, id: P });
  body += floodlight(300, horizon - 132, { h: 58, dir: -1, cone: false, id: P });
  body += floodlight(W - 300, horizon - 132, { h: 58, dir: 1, cone: false, id: P });

  // ----------------------------------------------------------- outfield -----
  body += `<ellipse cx="${W / 2}" cy="${horizon + 118}" rx="${W / 2 + 60}" ry="132" fill="${C.turf}"/>`;
  body += `<ellipse cx="${W / 2}" cy="${horizon + 118}" rx="${W / 2 - 40}" ry="104" fill="${C.turfLight}" opacity=".55"/>`;
  // Mower stripes: alternating bands, clipped to the outfield.
  body += `<g clip-path="url(#${P}-turfclip)" opacity=".18">`;
  for (let i = 0; i < 14; i += 2) body += rect(i * 64, horizon, 64, H - horizon, C.turfDark);
  body += `</g>`;
  body += `<ellipse cx="${W / 2}" cy="${horizon + 118}" rx="${W / 2 - 40}" ry="104" fill="none" stroke="${C.crease}" stroke-width="1.5" opacity=".28" stroke-dasharray="5 7"/>`;

  // -------------------------------------------------------------- pitch -----
  const pitchTop = horizon + 26;
  const pitchH = 92;
  body +=
    `<path d="M${W / 2 - 34} ${pitchTop} L${W / 2 + 34} ${pitchTop} L${W / 2 + 62} ${pitchTop + pitchH} L${W / 2 - 62} ${pitchTop + pitchH} Z" fill="${C.pitch}"/>` +
    `<path d="M${W / 2 - 34} ${pitchTop} L${W / 2 + 34} ${pitchTop} L${W / 2 + 62} ${pitchTop + pitchH} L${W / 2 - 62} ${pitchTop + pitchH} Z" fill="none" stroke="${C.pitchDark}" stroke-width="1"/>`;
  // Creases
  body += rect(W / 2 - 40, pitchTop + 16, 80, 2, C.crease, ' opacity=".8"');
  body += rect(W / 2 - 56, pitchTop + pitchH - 20, 112, 2, C.crease, ' opacity=".8"');

  // Stumps at both ends.
  body += sprite(STUMPS, PAL, { x: W / 2 - 19, y: pitchTop - 20, s: 3 });
  body += sprite(STUMPS, PAL, { x: W / 2 - 26, y: pitchTop + pitchH - 46, s: 4 });

  // ----------------------------------------------------------- players ------
  // THE ANCHOR at the striker's end, bat coming down through the line.
  body += `<g class="${P}-batter">`;
  // Bat sits against the trailing glove (batter x + 18*3) so the swing reads as held.
  body += sprite(BAT, PAL, { x: 236, y: 212, s: 3, extra: `class="${P}-bat"` });
  body += sprite(BATTER, PAL, { x: 168, y: 190, s: 3 });
  body += `</g>`;

  // THE SPEEDSTER at the bowler's end, mid leap.
  body += sprite(BOWLER, PAL, { x: W - 240, y: 192, s: 3, extra: `class="${P}-bowler"` });

  // The delivery: a real seam-up ball travelling down the pitch, on a loop.
  body += `<g class="${P}-ball">${sprite(BALL, PAL, { x: 0, y: 0, s: 3 })}</g>`;

  // ----------------------------------------------------------- nameplates ---
  body += nameplate(140, 300, 'THE ANCHOR', `#${esc(player.capNumber || '404')}`, C.royalBright);
  body += nameplate(W - 260, 300, 'THE SPEEDSTER', '#500', C.saffron);

  // --------------------------------------------------------------- title ----
  // Title scale backs off as the name grows so it never runs past the safe width.
  const titleScale = name.length > 16 ? 3 : name.length > 12 ? 4 : name.length > 8 ? 5 : 6;
  const titleW = measureScaled(name, titleScale);
  body += `<g class="${P}-title">`;
  // Drop shadow first, then face — two passes gives the arcade "extruded" look.
  body += pxText(name, { x: W / 2 + 4, y: TITLE_TOP + 4, scale: titleScale, fill: '#000', anchor: 'middle', opacity: 0.55 });
  body += pxText(name, { x: W / 2, y: TITLE_TOP, scale: titleScale, fill: C.gold, anchor: 'middle' });
  body += `</g>`;

  // Underline sweep in the tricolour.
  const uy = TITLE_TOP + 7 * titleScale + 10;
  body += rect(W / 2 - titleW / 2, uy, titleW / 3, 3, C.saffron, ` class="${P}-rule"`);
  body += rect(W / 2 - titleW / 6, uy, titleW / 3, 3, C.white, ` class="${P}-rule" style="animation-delay:.15s"`);
  body += rect(W / 2 + titleW / 6, uy, titleW / 3, 3, C.green, ` class="${P}-rule" style="animation-delay:.3s"`);

  body += pxText(String(player.role || 'ALL-ROUNDER'), {
    x: W / 2,
    y: uy + 12,
    scale: 2,
    fill: C.sky,
    anchor: 'middle',
    extra: `class="${P}-sub"`,
  });
  body += pxText(String(player.tagline || ''), {
    x: W / 2,
    y: uy + 30,
    scale: 1.6,
    fill: C.mute,
    anchor: 'middle',
    extra: `class="${P}-sub" style="animation-delay:.5s"`,
  });

  // ------------------------------------------------------- live match chip --
  body += liveChip(20, 18, m);

  // Season / venue chip, mirrored right.
  const season = new Date(m.fetchedAt).getUTCFullYear();
  body += `<g opacity=".9">`;
  body += rect(W - 178, 18, 158, 26, C.panel, ` stroke="${C.line}" stroke-width="1"`);
  body += pxText(`SEASON ${season}`, { x: W - 99, y: 26, scale: 1.6, fill: C.gold, anchor: 'middle' });
  body += `</g>`;
  body += label(String(player.homeGround || m.profile.location || 'NEUTRAL VENUE').toUpperCase(), {
    x: W - 99,
    y: 58,
    size: 9,
    fill: C.muteDim,
    anchor: 'middle',
    spacing: 1.5,
  });

  // ------------------------------------------------------------------ defs --
  const defs =
    `<linearGradient id="${P}-sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${C.nightDeep}"/><stop offset=".55" stop-color="${C.navy}"/>` +
    `<stop offset="1" stop-color="${C.navySoft}"/></linearGradient>` +
    floodlightDefs(P) +
    `<clipPath id="${P}-turfclip"><ellipse cx="${W / 2}" cy="${horizon + 118}" rx="${W / 2 - 40}" ry="104"/></clipPath>`;

  return svg({
    w: W,
    h: H,
    title: `${name} — floodlit stadium hero`,
    desc: `Pixel-art night cricket stadium introducing ${name}, ${player.role}. ${m.totals.contributions.toLocaleString('en-US')} career contributions.`,
    defs,
    css: css(),
    body,
  });
}

/** Small caption block under each character. */
function nameplate(x, y, title, num, accent) {
  let out = rect(x, y, 120, 3, accent, ' opacity=".8"');
  out += pxText(title, { x: x + 60, y: y + 8, scale: 1.6, fill: C.white, anchor: 'middle' });
  out += pxText(num, { x: x + 60, y: y + 20, scale: 1.4, fill: accent, anchor: 'middle' });
  return out;
}

/** Blinking LIVE indicator carrying the true last-activity timestamp. */
function liveChip(x, y, m) {
  const stale = m.activity.lastPush ? (Date.now() - new Date(m.activity.lastPush).getTime()) / 864e5 : 999;
  const live = stale <= 7;
  const c = live ? C.greenBright : C.gold;
  let out = rect(x, y, 158, 26, C.panel, ` stroke="${C.line}" stroke-width="1"`);
  out += `<circle cx="${x + 14}" cy="${y + 13}" r="4" fill="${c}" class="${P}-dot"/>`;
  out += pxText(live ? 'MATCH LIVE' : 'INNINGS BREAK', { x: x + 26, y: y + 9, scale: 1.6, fill: c });
  return out;
}

function css() {
  return (
    baseCss(P) +
    // Star twinkle
    `@keyframes ${P}-tw{0%,100%{opacity:.15}50%{opacity:.9}}` +
    `.${P}-star{animation:${P}-tw 5s ease-in-out infinite}` +
    // Bunting sway
    `@keyframes ${P}-sway{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}` +
    `.${P}-flag{animation:${P}-sway 2.4s ease-in-out infinite}` +
    // LIVE dot
    `.${P}-dot{animation:${P}-blink 1.6s steps(1) infinite}` +
    // Title entrance + slow gold shimmer
    `@keyframes ${P}-in{0%{opacity:0;transform:translateY(-14px)}60%{opacity:1;transform:translateY(2px)}100%{opacity:1;transform:translateY(0)}}` +
    `.${P}-title{animation:${P}-in 1s cubic-bezier(.2,.9,.3,1) both}` +
    `.${P}-sub{animation:${P}-rise 1s ease-out .3s both}` +
    `@keyframes ${P}-wipe{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}` +
    `.${P}-rule{transform-box:fill-box;transform-origin:left center;animation:${P}-wipe .7s ease-out .6s both}` +
    // The delivery: ball runs down the pitch, bat swings to meet it, both reset together.
    `@keyframes ${P}-deliver{` +
    `0%{transform:translate(632px,238px) scale(.7);opacity:0}` +
    `8%{opacity:1}` +
    `48%{transform:translate(300px,262px) scale(1);opacity:1}` +
    `56%{transform:translate(250px,258px) scale(1);opacity:1}` +
    `78%{transform:translate(700px,120px) scale(1.1);opacity:1}` +
    `92%,100%{transform:translate(860px,60px) scale(1.2);opacity:0}}` +
    `.${P}-ball{animation:${P}-deliver 4.2s cubic-bezier(.35,.1,.6,1) infinite}` +
    `@keyframes ${P}-swing{0%,44%{transform:rotate(-8deg)}56%{transform:rotate(48deg)}70%{transform:rotate(62deg)}100%{transform:rotate(-8deg)}}` +
    `.${P}-bat{transform-box:fill-box;transform-origin:50% 12%;animation:${P}-swing 4.2s ease-in-out infinite}` +
    `@keyframes ${P}-leap{0%,100%{transform:translate(0,0)}40%{transform:translate(-10px,-6px)}55%{transform:translate(-4px,0)}}` +
    `.${P}-bowler{animation:${P}-leap 4.2s ease-in-out infinite}` +
    `@keyframes ${P}-brace{0%,44%{transform:translateX(0)}58%{transform:translateX(-3px)}100%{transform:translateX(0)}}` +
    `.${P}-batter{animation:${P}-brace 4.2s ease-in-out infinite}`
  );
}
