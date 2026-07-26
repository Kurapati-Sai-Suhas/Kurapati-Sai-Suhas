/**
 * sprites.mjs — original pixel characters and props.
 *
 * CHARACTER NOTE
 * --------------
 * The two figures are original generic archetypes: THE ANCHOR (a composed top-order
 * batter) and THE SPEEDSTER (an express seamer). They are built from primitive shapes
 * — helmet, jersey block, pads, headband — and are deliberately not modelled on, named
 * after, or numbered after any real cricketer. They carry HTTP status codes as cap
 * numbers (404 / 500) to keep the reference squarely in developer-land.
 *
 * FORMAT
 * ------
 * Each sprite is an array of strings plus a palette. See `sprite()` in svg.mjs.
 * Rows do not need to be equal length; trailing transparency can simply be omitted.
 */

import { C } from './theme.mjs';

/** Shared colour keys. Kept identical across sprites so palettes stay swappable. */
export const PAL = {
  k: '#050B1C', // outline
  M: C.royalBright, // helmet shell / cap
  h: '#1A1208', // hair
  s: '#C68642', // skin
  e: '#0B1020', // eye
  G: '#9FB4E8', // helmet grille
  w: C.white,
  j: C.royal, // jersey
  J: '#0E2E8C', // jersey shadow
  t: C.gold, // jersey trim
  N: C.gold, // cap number patch
  g: C.gold, // gloves
  p: '#E8EEFF', // pads
  b: C.pitch, // willow
  B: C.pitchDark,
  r: C.red, // ball / grip
  o: '#C0392B',
  f: C.saffron,
  v: C.green,
};

/**
 * THE ANCHOR — #404. Helmeted, front-on, weight balanced. Head still, eyes level.
 * 24 x 28 pixels.
 */
export const BATTER = [
  '........kkkkkkkk........',
  '.......kMMMMMMMMk.......',
  '......kMMMMMMMMMMk......',
  '......kMwwwwwwwwMk......',
  '......kMssssssssMk......',
  '......kMseessssGGk......',
  '.......ksssssssGk.......',
  '........ksssssk.........',
  '.........kjjjk..........',
  '......ttjjjjjjjtt.......',
  '.....jjjjjjjjjjjjj......',
  '....gjjjjjNNjjjjjjg.....',
  '....gjjjjjNNjjjjjjg.....',
  '....gjjjjjjjjjjjjjg.....',
  '.....jjjjjjjjjjjj.......',
  '.....tjjjjjjjjjjt.......',
  '......pppppppppp........',
  '......pppppppppp........',
  '......pwwwwwwwwp........',
  '......pppppppppp........',
  '......ppp..ppppp........',
  '......ppp..pppp.........',
  '......ppp..ppp..........',
  '......pww..pww..........',
  '......ppp..ppp..........',
  '......ppp..ppp..........',
  '.....kkkkk.kkkkk........',
  '....kkkkkk.kkkkkk.......',
];

/**
 * THE SPEEDSTER — #500. Mid-delivery leap: front arm high, back leg driving through,
 * tricolour headband streaming. 24 x 26 pixels.
 */
export const BOWLER = [
  '..............r.........',
  '.............rrr........',
  '..............r.........',
  '.........kkkkkk.........',
  '........khhhhhhk........',
  '........kfvfvfvk........',
  '........ksssssk.........',
  '........kseesk..........',
  '.........ksssk..........',
  '.........jjjj...........',
  '.....ttjjjjjjjtt........',
  '....jjjjjjjjjjjjj.......',
  '...gjjjjjNNjjjjjjg......',
  '....jjjjjjjjjjjj........',
  '....tjjjjjjjjjjt........',
  '.....wwwwwwww...........',
  '.....wwwwwwww...........',
  '.....www..www...........',
  '.....www...www..........',
  '....www.....www.........',
  '....ww.......www........',
  '...www........www.......',
  '...ww..........www......',
  '..kkk...........kkk.....',
  '.kkkk............kkkk...',
];

/** Willow bat. Drawn separately so it can be rotated/animated independently. */
export const BAT = [
  '..rrrr..',
  '..rrrr..',
  '..rrrr..',
  '..rrrr..',
  '..rrrr..',
  '..rrrr..',
  '.bbbbbb.',
  'bbbbbbbb',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  'bbbbbbbB',
  '.bbbbbB.',
];

/** Seam-up cricket ball. */
export const BALL = [
  '.rrrr.',
  'rrwwrr',
  'rwrrwr',
  'rwrrwr',
  'rrwwrr',
  '.rrrr.',
];

/** Trophy for the cabinet. 14 x 16. */
export const TROPHY = [
  '..tttttttttt..',
  '..twwwwwwwwt..',
  '.tttttttttttt.',
  'tt.tttttttt.tt',
  't...tttttt...t',
  'tt.tttttttt.tt',
  '.tttttttttttt.',
  '..tttttttttt..',
  '...tttttttt...',
  '....tttttt....',
  '.....tttt.....',
  '.....tttt.....',
  '...tttttttt...',
  '..tttttttttt..',
  '.tttttttttttt.',
  '.kkkkkkkkkkkk.',
];

/** Three stumps with bails. 13 x 16. */
export const STUMPS = [
  'w..ww..ww..w.',
  'ww.www.www.w.',
  'ww..w..w..ww.',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.w..w..w..w..',
  '.k..k..k..k..',
];

/** Baggy cap — used as the "man of the match" marker. 14 x 8. */
export const CAP = [
  '...MMMMMM...',
  '..MMMMMMMM..',
  '.MMttttttMM.',
  'MMMMMMMMMMMM',
  'MMMMMMMMMMMM',
  '.kkkkkkkkkk.',
];

/** Sprite metadata: intrinsic pixel dimensions, for layout maths. */
export const dims = (rows) => ({
  w: Math.max(...rows.map((r) => r.length)),
  h: rows.length,
});
