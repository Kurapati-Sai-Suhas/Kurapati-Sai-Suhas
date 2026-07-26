/**
 * theme.mjs — the single source of truth for colour, spacing and motion.
 *
 * Palette is drawn from a Team-India night-match: navy sky, royal blue jersey,
 * gold trim, saffron/green flag accents, floodlit white. Every component imports
 * from here so a re-skin is a one-file change.
 *
 * All SVGs render on a dark stadium background, which reads correctly in both
 * GitHub light and dark themes — no duplicate light-mode assets to maintain.
 */

export const C = {
  // --- sky / structure -----------------------------------------------------
  night: '#050B1C',
  nightDeep: '#02060F',
  navy: '#0A1A3C',
  navySoft: '#12244F',
  panel: '#0D1E45',
  panelAlt: '#132A5C',
  line: '#1E3A78',
  lineSoft: '#162E5F',

  // --- jersey --------------------------------------------------------------
  royal: '#1B4FD8',
  royalBright: '#2F74FF',
  sky: '#5AC8FA',

  // --- trim / highlights ---------------------------------------------------
  gold: '#FFC93C',
  goldDeep: '#D99A16',
  saffron: '#FF9933',
  green: '#138808',
  greenBright: '#2ECC71',
  white: '#F4F7FF',
  mute: '#8FA6D8',
  muteDim: '#5C74A8',
  red: '#FF4D4D',

  // --- turf ----------------------------------------------------------------
  turf: '#0F4D2A',
  turfLight: '#17683A',
  turfDark: '#093418',
  pitch: '#C9A56B',
  pitchDark: '#A8814A',
  crease: '#EAF2FF',

  // --- crowd ---------------------------------------------------------------
  crowd: ['#1B2E5E', '#24407A', '#2F5399', '#FF9933', '#F4F7FF', '#138808'],
};

/** Heat ramp for the contribution pitch map: bare turf -> gold "hot zone". */
export const HEAT = ['#0B2F1B', '#125C31', '#1C8F44', '#5BD16A', '#FFC93C'];

/** Canvas widths. 880 matches GitHub's rendered README column at 100% zoom. */
export const W = {
  full: 880,
  half: 430,
};

/** Shared filter/gradient ids so components never collide in the same document. */
export const ID = (component, name) => `${component}-${name}`;

/**
 * Deterministic PRNG. Crowd placement, star fields and grass tufts must look
 * organic but stay byte-identical between builds — otherwise every scheduled
 * run produces a diff and pollutes commit history.
 * @param {number} seed
 */
export function rng(seed) {
  let t = seed >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
