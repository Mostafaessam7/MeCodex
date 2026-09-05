// Builds the final per-product theme files.
//
// Two properties this must guarantee, because the whole architecture depends on
// them:
//
//  1. IDENTICAL TOKEN NAMES across every theme. A product swaps one file and
//     nothing else changes. Enforced by generating all files from one shape and
//     asserting the key sets match.
//
//  2. IDENTICAL SEMANTIC COLOURS across every theme. Error must look like error
//     in every product. This is harder than it sounds in dark mode: each theme's
//     surface carries a different hue tint, so a semantic solved per-theme drifts.
//     Instead one universal set is solved against the LIGHTEST dark surface (the
//     binding constraint) and verified against all of them.
//
// Dark surfaces are also normalised by measured luminance rather than nominal
// HSL lightness. A warm hue at L=14 reads visibly lighter than a cool one, which
// made the amber theme's "dark mode" look washed out next to the others and left
// the semantics with almost no contrast headroom.

import fs from 'node:fs';
import path from 'node:path';

const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const t = v => Math.round(255 * v).toString(16).padStart(2, '0');
  return '#' + t(f(0)) + t(f(8)) + t(f(4));
};
const lum = hex => {
  const c = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); };

/** Pick the hue/sat shade whose measured luminance is closest to `target`. */
const atLuminance = (h, s, target) => {
  let best = null, bestErr = Infinity;
  for (let l = 2; l <= 98; l += 0.5) {
    const hex = hsl(h, s, l);
    const err = Math.abs(lum(hex) - target);
    if (err < bestErr) { bestErr = err; best = hex; }
  }
  return best;
};

/** Walk lightness until the colour clears `target` against every listed bg. */
const solveAgainstAll = (h, s, bgs, target, ascending) => {
  const range = ascending ? [...Array(110).keys()].map(i => 20 + i * 0.7) : [...Array(80).keys()].map(i => 62 - i * 0.7);
  for (const l of range) {
    const hex = hsl(h, s, l);
    if (bgs.every(bg => ratio(hex, bg) >= target)) return hex;
  }
  throw new Error(`no value clears ${target}:1 for hue ${h} against ${bgs.join(",")}`);
};

// ---- Theme definitions (only those in use) --------------------------------
const THEMES = [
  { id: 'navy-corporate',  name: 'Navy Corporate',     primary: 224, secondary: 205, accent: 186, neutral: 225, sat: 55, products: ['RealEstateCRM'] },
  { id: 'enterprise-blue', name: 'Enterprise Blue',    primary: 218, secondary: 200, accent: 190, neutral: 220, sat: 72, products: ['PosFlow'] },
  { id: 'amber-commerce',  name: 'Amber Commerce',     primary: 28,  secondary: 200, accent: 14,  neutral: 30,  sat: 78, products: ['POS'] },
  // Black-and-red storefront identity, requested for E-Commerce over the amber it used to share
  // with POS. Split into its own theme rather than re-hued in place because amber-commerce is
  // still POS's, and because these files are generated and diffed in CI -- editing one by hand
  // fails the drift check for a good reason.
  //
  // neutral 8 keeps the surfaces essentially black with a faint warm cast rather than a flat grey,
  // so the red reads as part of the palette instead of sitting on top of it. secondary stays cool
  // at 210 deliberately: with primary and accent both in the red family, informational chrome
  // needs somewhere to go that is not more red.
  { id: 'crimson-noir',    name: 'Crimson Noir',       primary: 358, secondary: 210, accent: 18,  neutral: 8, sat: 74, neutralSat: 0.22, products: ['E-Commerce'] },
  { id: 'slate-pro',       name: 'Slate Professional', primary: 212, secondary: 190, accent: 168, neutral: 215, sat: 26, products: ['Gym Manager'] },
  { id: 'modern-teal',     name: 'Modern Teal',        primary: 168, secondary: 200, accent: 225, neutral: 200, sat: 70, products: ['Subscription Tracker', 'MeCodex'] },
];

// Target luminances, chosen once and applied to every theme so they all feel
// equally light/dark regardless of hue temperature.
const L_TARGET = { sunk: 0.905, base: 0.945, surface: 1.0, raised: 1.0, border: 0.72, borderStrong: 0.52 };
const D_TARGET = { sunk: 0.006, base: 0.010, surface: 0.016, raised: 0.028, border: 0.055, borderStrong: 0.115 };

const build = t => {
  // How saturated the neutral ramp is, as a multiplier on the per-role values below. Default 1
  // reproduces every existing theme byte for byte -- CI diffs the committed files against this
  // output, so anything else here would be a silent redesign of all of them.
  //
  // It exists because 'black' is not reachable otherwise: at these saturations a warm neutral hue
  // lands on brown, which is exactly the complaint that produced crimson-noir. Turning it down
  // lets a theme keep a hue's warmth as a cast on something genuinely near-black.
  const nS = t.neutralSat ?? 1;

  const light = {
    sunk: atLuminance(t.neutral, 24 * nS, L_TARGET.sunk),
    base: atLuminance(t.neutral, 30 * nS, L_TARGET.base),
    surface: '#ffffff',
    raised: '#ffffff',
    border: atLuminance(t.neutral, 20 * nS, L_TARGET.border),
    borderStrong: atLuminance(t.neutral, 18 * nS, L_TARGET.borderStrong),
  };
  const dark = {
    sunk: atLuminance(t.neutral, 32 * nS, D_TARGET.sunk),
    base: atLuminance(t.neutral, 30 * nS, D_TARGET.base),
    surface: atLuminance(t.neutral, 28 * nS, D_TARGET.surface),
    raised: atLuminance(t.neutral, 26 * nS, D_TARGET.raised),
    border: atLuminance(t.neutral, 20 * nS, D_TARGET.border),
    borderStrong: atLuminance(t.neutral, 18 * nS, D_TARGET.borderStrong),
  };

  const solveOn = (bg, h, s, target, ascending) => solveAgainstAll(h, s, [bg], target, ascending);

  light.text = solveOn(light.surface, t.neutral, 30 * nS, 12, false);
  light.textSecondary = solveOn(light.surface, t.neutral, 18 * nS, 7, false);
  light.textMuted = solveOn(light.surface, t.neutral, 14 * nS, 4.6, false);
  light.primary = solveOn(light.surface, t.primary, t.sat, 4.6, false);
  light.secondary = solveOn(light.surface, t.secondary, Math.max(t.sat - 10, 20), 4.6, false);
  light.accent = solveOn(light.surface, t.accent, t.sat, 4.6, false);

  dark.text = solveOn(dark.surface, t.neutral, 26 * nS, 12, true);
  dark.textSecondary = solveOn(dark.surface, t.neutral, 18 * nS, 7, true);
  dark.textMuted = solveOn(dark.surface, t.neutral, 14 * nS, 4.6, true);
  dark.primary = solveOn(dark.surface, t.primary, Math.min(t.sat + 8, 90), 4.6, true);
  dark.secondary = solveOn(dark.surface, t.secondary, t.sat, 4.6, true);
  dark.accent = solveOn(dark.surface, t.accent, t.sat, 4.6, true);

  const onFill = fill => (ratio('#ffffff', fill) >= ratio('#0b0f16', fill) ? '#ffffff' : '#0b0f16');
  light.onPrimary = onFill(light.primary);
  dark.onPrimary = onFill(dark.primary);

  return { ...t, light, dark };
};

const themes = THEMES.map(build);

// ---- One universal semantic set, solved against every surface -------------
const SEM = { success: [148, 68, 62], warning: [38, 92, 82], danger: [4, 72, 72], info: [214, 72, 72] };
const lightSurfaces = themes.map(t => t.light.surface);
const darkSurfaces = themes.map(t => t.dark.surface);

const semantics = { light: {}, dark: {} };
for (const [role, [h, sL, sD]] of Object.entries(SEM)) {
  semantics.light[role] = solveAgainstAll(h, sL, lightSurfaces, 4.6, false);
  semantics.dark[role] = solveAgainstAll(h, sD, darkSurfaces, 4.6, true);
}

// ---- Verify ---------------------------------------------------------------
let fail = 0;
const ROLES = ['text', 'textSecondary', 'textMuted', 'primary', 'secondary', 'accent'];
for (const t of themes) {
  for (const mode of ['light', 'dark']) {
    for (const r of ROLES) {
      const v = ratio(t[mode][r], t[mode].surface);
      if (v < 4.5) { fail++; console.log(`FAIL ${t.id} ${mode} ${r} ${v.toFixed(2)}`); }
    }
    const b = ratio(t[mode].onPrimary, t[mode].primary);
    if (b < 4.5) { fail++; console.log(`FAIL ${t.id} ${mode} button ${b.toFixed(2)}`); }
    for (const [role, hex] of Object.entries(semantics[mode])) {
      const v = ratio(hex, t[mode].surface);
      if (v < 4.5) { fail++; console.log(`FAIL ${t.id} ${mode} ${role} ${v.toFixed(2)}`); }
    }
  }
}

// Token-name parity: every theme must expose exactly the same keys.
const keysOf = t => [...Object.keys(t.light), ...Object.keys(t.dark)].sort().join(',');
const shape = keysOf(themes[0]);
for (const t of themes.slice(1)) {
  if (keysOf(t) !== shape) { fail++; console.log(`FAIL ${t.id} token-name shape differs`); }
}

console.log(fail === 0
  ? `PASS — ${themes.length} themes, identical token names, semantics constant, all pairs >= 4.5:1`
  : `${fail} failures`);

// Worst-case semantic margins, so the thin ones are visible.
for (const mode of ['light', 'dark']) {
  const surfaces = mode === 'light' ? lightSurfaces : darkSurfaces;
  const line = Object.entries(semantics[mode]).map(([r, hex]) =>
    `${r} ${hex} ${Math.min(...surfaces.map(s => ratio(hex, s))).toFixed(2)}`).join(' | ');
  console.log(mode + ': ' + line);
}

// Checked here rather than at the top on purpose: the contrast verification above is the
// valuable part and runs either way, so `node build-themes.mjs` with no argument still tells
// you whether the palettes pass before it complains about where to write them.
if (!process.argv[2]) {
  console.error('\nusage: node build-themes.mjs <out.json>');
  console.error('  e.g. node design-system/build-themes.mjs final-themes.json');
  console.error('  Feed that file to emit-theme-files.mjs to write themes/*.css.');
  process.exit(1);
}

fs.writeFileSync(process.argv[2], JSON.stringify({ themes, semantics }, null, 1));
console.log('written', process.argv[2]);
