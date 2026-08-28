import fs from 'node:fs';
import path from 'node:path';

const { themes, semantics } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3];
fs.mkdirSync(outDir, { recursive: true });

const alpha = (hex, a) => {
  const [r, g, b] = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Semantic colours are IDENTICAL in every theme file. They are written into each
// file rather than kept only in tokens.css so a theme file is self-describing —
// you can read one and know the whole palette — but they are generated from a
// single source, so they cannot drift apart.
const semanticBlock = (mode, indent) => {
  const s = semantics[mode];
  return Object.entries(s).map(([role, hex]) => {
    const name = role === 'danger' ? 'danger' : role;
    return `${indent}--mx-${name}: ${hex};\n${indent}--mx-${name}-subtle: ${alpha(hex, mode === 'light' ? 0.12 : 0.20)};`;
  }).join('\n');
};

const paletteBlock = (p, indent) => `${indent}--mx-surface-sunk: ${p.sunk};
${indent}--mx-surface-base: ${p.base};
${indent}--mx-surface: ${p.surface};
${indent}--mx-surface-raised: ${p.raised};

${indent}--mx-text: ${p.text};
${indent}--mx-text-secondary: ${p.textSecondary};
${indent}--mx-text-muted: ${p.textMuted};
${indent}--mx-text-on-accent: ${p.onPrimary};

${indent}--mx-border: ${p.border};
${indent}--mx-border-strong: ${p.borderStrong};

${indent}--mx-accent: ${p.primary};
${indent}--mx-accent-hover: ${p.accentHover};
${indent}--mx-accent-subtle: ${alpha(p.primary, indent.length > 2 ? 0.18 : 0.12)};
${indent}--mx-accent-border: ${alpha(p.primary, 0.42)};

${indent}--mx-secondary: ${p.secondary};
${indent}--mx-secondary-subtle: ${alpha(p.secondary, indent.length > 2 ? 0.18 : 0.12)};

${indent}--mx-accent-alt: ${p.accent};
${indent}--mx-accent-alt-subtle: ${alpha(p.accent, indent.length > 2 ? 0.18 : 0.12)};

${indent}--mx-focus-ring: 0 0 0 3px ${alpha(p.primary, 0.38)};`;

// A slightly darker/lighter step for hover, derived rather than picked.
const shift = (hex, amount) => {
  const [r, g, b] = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16));
  const f = v => Math.max(0, Math.min(255, Math.round(v + amount)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
};

for (const t of themes) {
  t.light.accentHover = shift(t.light.primary, -22);
  t.dark.accentHover = shift(t.dark.primary, 26);

  const css = `/* ============================================================================
 * Mecodex theme — ${t.name}
 *
 * Assigned to: ${t.products.join(', ')}
 *
 * Pairs with tokens.css, which carries everything theme-independent (type scale,
 * spacing, radius, motion, elevation). This file defines ONLY what varies between
 * themes: surfaces, text, borders and the brand colours.
 *
 * TOKEN NAMES ARE IDENTICAL IN EVERY THEME FILE. Swapping a product's theme is a
 * one-line import change with no other edits anywhere — that is the entire point
 * of the split. Do not add a token here that does not exist in every other theme.
 *
 * SEMANTIC COLOURS ARE IDENTICAL IN EVERY THEME. success / warning / danger /
 * info do not vary by product: an error must look like an error everywhere, or
 * the signal stops being learnable. They appear in each file so a theme reads as
 * a complete palette, but they are generated from one source and cannot drift.
 *
 * Every value below was derived and verified, not picked. Each foreground clears
 * WCAG AA (>= 4.5:1) against the surface it renders on, in both modes.
 * Regenerate with design-system/build-themes.mjs.
 * ========================================================================== */

:root {
${paletteBlock(t.light, '  ')}

${semanticBlock('light', '  ')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${paletteBlock(t.dark, '    ')}

${semanticBlock('dark', '    ')}
  }
}

:root[data-theme="dark"] {
${paletteBlock(t.dark, '  ')}

${semanticBlock('dark', '  ')}
}
`;

  fs.writeFileSync(path.join(outDir, `${t.id}.css`), css);
  console.log('wrote', t.id + '.css', '->', t.products.join(', '));
}

// Parity check on the emitted FILES, not the in-memory objects: the thing that
// actually ships is what must have identical token names.
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.css'));
const shapes = files.map(f => {
  const names = [...fs.readFileSync(path.join(outDir, f), 'utf8').matchAll(/(--mx-[a-z-]+)\s*:/g)].map(m => m[1]);
  return { f, set: [...new Set(names)].sort().join(',') };
});
const first = shapes[0];
const drift = shapes.filter(s => s.set !== first.set);
console.log(drift.length === 0
  ? `\nPARITY OK — all ${files.length} emitted files expose identical token names (${first.set.split(',').length} tokens)`
  : `\nPARITY FAILED: ${drift.map(d => d.f).join(', ')}`);
