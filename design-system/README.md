# Mecodex Design System

The shared visual layer for every Mecodex product. This directory is the **source of truth**; each product vendors a copy (see [Consuming it](#consuming-it)).

It was extracted from the marketing site's existing system in `website/css/style.css`, then generalised into five per-product themes.

---

## What's here

| File | Purpose |
| --- | --- |
| `tokens.css` | Theme-**independent** layer: type scale, spacing, radius, elevation, motion, baseline. No colour. |
| `themes/*.css` | One file per colour identity. Only surfaces, text, borders and brand colours. |
| `tailwind-preset.js` | React adapter. Maps tokens to Tailwind keys **and** to the names shadcn/ui generates against. |
| `angular-material-theme.scss` | Angular adapter. Drives Material's appearance from the tokens, not Material defaults. |
| `build-themes.mjs` | Derives every palette and verifies contrast. The source of truth for values. |
| `emit-theme-files.mjs` | Writes `themes/*.css` and asserts token-name parity across them. |

## Per-product themes

Products share one architecture and one set of token **names**; only the values differ.

| Theme | Products |
| --- | --- |
| `navy-corporate` | RealEstateCRM |
| `enterprise-blue` | PosFlow |
| `amber-commerce` | POS, E-Commerce |
| `slate-pro` | Gym Manager |
| `modern-teal` | Subscription Tracker, MeCodex |

Always import both, in this order:

```css
@import "design-system/tokens.css";
@import "design-system/themes/navy-corporate.css";
```

Switching a product's identity is a one-line change, because **all five theme files expose an identical set of 27 token names**. That parity is asserted by `emit-theme-files.mjs` against the emitted files — not assumed — so a theme that gained or lost a token fails the build rather than shipping a half-styled app.

### Two invariants

**Token names are identical in every theme.** Never add a token to one theme file without adding it to all of them. The generator enforces this.

**Semantic colours are identical in every theme.** `success`, `warning`, `danger` and `info` do not vary by product — an error must look like an error everywhere, or the signal stops being learnable. They are solved once against *every* theme's surface (the lightest dark surface is the binding constraint) and written into each file so a theme reads as a complete palette while being impossible to drift.

### Regenerating

```bash
node design-system/build-themes.mjs final-themes.json
node design-system/emit-theme-files.mjs final-themes.json design-system/themes
```

The first derives and verifies; the second writes the CSS and checks parity. Both fail loudly rather than emitting something unverified.

### Why CSS custom properties as the interchange format

The products span Angular, React, Razor and plain ES modules. No component framework covers all four — but custom properties work identically in every one, including *inside* Tailwind's config and Angular Material's theming API. So the tokens are the contract, and each stack adapts them rather than re-deciding the palette.

---

## The theming contract

Three states, not two:

| Viewer setting | Root element | Resolved by |
| --- | --- | --- |
| Explicit light | `data-theme="light"` | `:root` block |
| Explicit dark | `data-theme="dark"` | `:root[data-theme="dark"]` |
| System (default) | *nothing stamped* | `prefers-color-scheme` media query |

Every colour is defined three times accordingly. **Never declare a colour only inside a media block** — it will not apply in the un-stamped state, which is what most viewers are in, and the page renders one theme's text on the other theme's ground.

Type, spacing, radius and motion are theme-independent and defined once. Duplicating them into the dark block is how two themes silently drift apart.

---

## Accessibility: measured, not assumed

Every foreground role was measured against its own surface.

Values are not picked and then checked — they are **solved**. `build-themes.mjs` walks lightness for each role until the measured ratio against its own surface clears the floor, so "AA compliant" is a computed property of the generator rather than a claim about a spreadsheet.

Semantic colours (identical everywhere):

| Role | Light | Dark |
| --- | --- | --- |
| success | `#19864c` | `#259e5d` |
| warning | `#a06807` | `#be7f13` |
| danger | `#dc3327` | `#e46258` |
| info | `#2372d9` | `#4c8de2` |

Each clears 4.5:1 against **every** theme's surface, not just one.

Two findings worth keeping:

**A bright brand colour may be unusable for light-mode text.** The original Mecodex teal `#33E0C7` scores 11.5:1 on dark ink but **1.66:1 on white**. That is why the accent's *role* stays constant while its *value* changes per mode — `modern-teal` uses a hue-preserving `#17826d` in light.

**Dark surfaces must be normalised by luminance, not HSL lightness.** A warm hue at the same nominal lightness reads visibly lighter than a cool one; `amber-commerce` originally produced a mid-brown "dark mode" that looked washed out beside the others and left semantics at 4.51:1. Surfaces are now matched on measured luminance so all five feel equally dark.

**Semantic status is separate from the accent on purpose.** "This is interactive" and "this is dangerous" must never be the same signal.

---

## Consuming it

These are separate repositories with no shared registry, and `Mecodex-Brand-Assets` is already vendored into six of them. This follows that established pattern: **copy `design-system/` into the product**, alongside the brand assets, and re-copy when it changes here.

### React — Tailwind + shadcn/ui

```js
// tailwind.config.js
import mecodex from './design-system/tailwind-preset.js';

export default {
  presets: [mecodex],
  content: ['./src/**/*.{ts,tsx}'],
};
```

```ts
// main.tsx — before Tailwind's layers
import './design-system/tokens.css';
```

The preset maps both Mecodex role names (`bg-surface`, `text-ink-muted`, `text-accent`) **and** the semantic names shadcn generates against (`background`, `foreground`, `primary`, `border`, `ring`, `destructive`). A generated `<Button>` or `<Card>` is therefore on-brand with no per-component editing — which is what makes shadcn viable here instead of a second design language living alongside this one.

### Angular — Material/CDK + tokens

```scss
// styles.scss
@use './design-system/angular-material-theme' as mecodex;
@import './design-system/tokens.css';
```

Material is used **for behaviour**: CDK overlay positioning, focus trapping, live announcers and keyboard interaction are hard to write correctly by hand and were flagged as missing in the accessibility audit.

Its *appearance* is driven from the tokens. That happens in two places, and both matter:

1. The palettes and typography config — covers what Material themes through its palette API.
2. The `--mdc-*` / `--mat-*` overrides at the bottom of the file — covers Material's own runtime tokens for surfaces, outlines and corner radii.

Without the second part, components Material doesn't theme through the palette silently revert to Material defaults and sit slightly "off" against everything else, in a way that is hard to attribute.

Material also defaults to fully-rounded pill buttons. The Mecodex system has an explicit **anti-"rounded-everything"** position, so corners are pulled back to the shared radius scale.

### Razor / vanilla — tokens only

```html
<link rel="stylesheet" href="/design-system/tokens.css">
```

No framework layer. Style components with the variables directly.

---

## Rules that carry over from the marketing site

These are decisions, not preferences — they're what makes the products look deliberate rather than assembled:

- **Nothing carries a resting shadow.** Elevation communicates interaction, not decoration.
- **Not everything is rounded.** Rows, dividers and panels stay square; radius is reserved.
- **The accent is used sparingly** — never as a full-section fill.
- **Headings are IBM Plex Mono, body is Inter.** The mono display face is the identity; losing it loses the brand.
- **Running text caps at ~65 characters.** Longer measures are measurably harder to read.

---

## Changing a token

Edit here first, then re-copy to the products. Two checks before committing:

1. **Contrast** — any new or changed colour role must clear 4.5:1 against the surface it sits on, in *both* themes.
2. **Theme parity** — every colour token defined in light must also exist in the dark override, or the themes drift.

Both were run against this file when it was written; re-run them when you change it.
