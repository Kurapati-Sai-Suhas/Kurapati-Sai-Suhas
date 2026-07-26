/**
 * footer.mjs — "STUMPS": the closing scorecard.
 *
 * Left: the match situation, stated from live figures.
 * Right: the chase — goals declared in config, framed as the target for next session.
 * Bottom: sign-off band with the pavilion lights going down.
 */

import { C } from '../theme.mjs';
import { svg, rect, panel, baseCss, pxText, label, fmt, trunc, n } from '../svg.mjs';

const P = 'ft';
const W = 880;
const H = 268;

export const file = 'footer.svg';

export function render(m, config) {
  const goals = (config.goals ?? []).slice(0, 4);
  const name = (config.player.displayName || m.profile.name || m.profile.login).toUpperCase();

  let body = rect(0, 0, W, H, C.nightDeep);
  body += `<rect width="${W}" height="${H}" fill="url(#${P}-bg)"/>`;
  body += panel(10, 10, W - 20, H - 20, { fill: C.panel });

  body += rect(24, 24, W - 48, 26, C.navySoft);
  body += rect(24, 24, 4, 26, C.gold);
  body += pxText('STUMPS — CLOSE OF PLAY', { x: 40, y: 32, scale: 1.7, fill: C.gold });
  body += label(`SEASON ${new Date(m.fetchedAt).getUTCFullYear()}`, {
    x: W - 34,
    y: 42,
    size: 10,
    fill: C.muteDim,
    anchor: 'end',
    spacing: 1.6,
  });

  // ------------------------------------------------------ match situation ---
  const lx = 34;
  body += rect(lx, 66, 400, 118, C.navy, ` stroke="${C.lineSoft}" stroke-width="1"`);
  body += pxText('MATCH SITUATION', { x: lx + 14, y: 80, scale: 1.4, fill: C.sky });

  const situation = [
    ['ON', `${fmt(m.totals.contributions)} FOR ${fmt(m.bowling.wickets)}`],
    ['OFF', `${fmt(m.batting.innings)} OVERS`],
    ['BATTING', `${name} ${m.streak.current}*`],
    ['REQUIRED', `${goals.length} TARGET${goals.length === 1 ? '' : 'S'}`],
  ];
  situation.forEach(([k, v], i) => {
    const y = 104 + i * 20;
    body += label(k, { x: lx + 14, y, size: 10, fill: C.muteDim, spacing: 1.4 });
    body += pxText(trunc(v, 26), { x: lx + 386, y: y - 8, scale: 1.4, fill: C.white, anchor: 'end' });
  });

  // ------------------------------------------------------------- the chase --
  const rx = 454;
  body += rect(rx, 66, W - rx - 34, 118, C.navy, ` stroke="${C.lineSoft}" stroke-width="1"`);
  body += pxText('NEXT INNINGS — THE CHASE', { x: rx + 14, y: 80, scale: 1.4, fill: C.greenBright });

  if (!goals.length) {
    body += label('NO TARGET SET.', { x: rx + 14, y: 118, size: 11, fill: C.muteDim });
  } else {
    goals.forEach((g, i) => {
      const y = 102 + i * 20;
      body += `<g class="${P}-goal" style="animation-delay:${(i * 0.12).toFixed(2)}s">`;
      body += rect(rx + 14, y - 8, 8, 8, C.gold);
      body += label(trunc(String(g), 46), { x: rx + 30, y, size: 11, fill: C.white });
      body += `</g>`;
    });
  }

  // ---------------------------------------------------------- sign-off ------
  const by = H - 62;
  body += rect(34, by, W - 68, 1, C.line);
  body += pxText('THANKS FOR WATCHING', { x: 34, y: by + 14, scale: 1.8, fill: C.gold });
  body += label('THE FLOODLIGHTS STAY ON — PULL REQUESTS ALWAYS WELCOME.', {
    x: 34,
    y: by + 42,
    size: 10,
    fill: C.mute,
    spacing: 1,
  });

  // Pavilion lights dimming, one at a time.
  for (let i = 0; i < 12; i++) {
    body += rect(W - 34 - i * 14, by + 8, 8, 8, C.gold, ` class="${P}-light" style="animation-delay:${(i * 0.18).toFixed(2)}s"`);
  }

  const defs =
    `<linearGradient id="${P}-bg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.nightDeep}"/></linearGradient>`;

  return svg({
    w: W,
    h: H,
    title: 'Stumps — close of play',
    desc:
      `${fmt(m.totals.contributions)} for ${fmt(m.bowling.wickets)} off ${fmt(m.batting.innings)} overs. ` +
      (goals.length ? `Targets: ${goals.join('; ')}.` : 'No targets set.'),
    defs,
    css:
      baseCss(P) +
      `.${P}-goal{animation:${P}-rise .5s ease-out both}` +
      `@keyframes ${P}-dim{0%,100%{opacity:1}50%{opacity:.18}}` +
      `.${P}-light{animation:${P}-dim 3s ease-in-out infinite}`,
    body,
  });
}
