# Mecodex Design System

The shared visual layer for every Mecodex product. This directory is the **source of truth**; each product vendors a copy (see [Consuming it](#consuming-it)).

It was extracted from the marketing site's existing system in `website/css/style.css`, not invented — so the products and the public site share one identity rather than two that drift.

---

## What's here

| File | Purpose |
| --- | --- |
| `tokens.css` | The portable token layer. Colour, type, spacing, radius, elevation, motion. Works in any stack. |
| `tailwind-preset.js` | React adapter. Maps tokens to Tailwind theme keys **and** to the semantic names shadcn/ui generates against. |
| `angular-material-theme.scss` | Angular adapter. Drives Angular Material's appearance from the tokens instead of Material Design defaults. |

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

**The brand teal cannot be used for text in light mode.** `#33E0C7` scores **11.50:1** on the dark ink but **1.66:1** on white — nowhere near the 4.5:1 floor. So the accent's *role* is constant while its *value* is theme-dependent: light mode uses a hue-preserving darkened teal, `#17826d` (4.72:1, same hue 168).

| Role | Light (on white) | Dark (on `#0E1424`) |
| --- | --- | --- |
| accent | `#17826d` · 4.72:1 | `#33e0c7` · 11.04:1 |
| text | `#101828` · 17.75:1 | `#eaf6ff` · 16.71:1 |
| muted | `#5a6472` · 6.00:1 | `#9aa8bc` · 7.60:1 |
| success | `#186a3f` · 6.62:1 | `#4ade80` · 10.53:1 |
| warning | `#8a5a00` · 5.93:1 | `#fbbf24` · 10.99:1 |
| danger | `#b3261e` · 6.54:1 | `#ff8a7a` · 8.01:1 |
| info | `#2f5bd6` · 5.85:1 | `#7ba2ff` · 7.39:1 |

All 30 shade/contrast pairs in the Angular Material palettes were verified the same way.

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
