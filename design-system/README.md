# Mecodex Design System

The shared visual layer for every Mecodex product. This directory is the **source of truth**; each product vendors a copy (see [Consuming it](#consuming-it)).

It was extracted from the marketing site's existing system in `website/css/style.css`, then generalised into five per-product themes.

---

## What's here

| File | Purpose |
| --- | --- |
| `tokens.css` | Theme-**independent** layer: type scale, spacing, radius, elevation, motion, baseline. No colour. |
| `themes/*.css` | One file per colour identity. Only surfaces, text, borders and brand colours. |
| `tailwind-preset.js` | React adapter for Tailwind + shadcn/ui. **Not in use** — no product has Tailwind; never built or verified. See [Consuming it](#consuming-it). |
| `angular-material-theme.scss` | Angular adapter for Material. **Not in use** — no product has `@angular/material`; never built or verified. See [Consuming it](#consuming-it). |
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
| `modern-teal` | Subscription Tracker |

### The marketing site is the source, not a consumer

`website/` deliberately does **not** import these files, even though `modern-teal` is nominally its theme. The relationship runs the other way: `modern-teal` was derived *from* the marketing site's palette, so applying the derived approximation back onto the original would be circular.

It would also break things. Two concrete reasons, both measured rather than assumed:

- The site hardcodes the brand teal **63 times** in SVG `stroke` attributes in the markup. Token aliasing cannot reach a presentation attribute, so the CSS accent would move to `#14a387` while 63 icon strokes stayed `#33E0C7` — a visible desync across every page of a live public site.
- The site's ground is `#0A0F1C` (blue-ink); the generated theme's is `#111b1f` (teal-ink). Close, but not the same, and the site is dark-only with no light mode to fall back on.

If the site should genuinely consume the system later, the work is: convert those 63 strokes to `currentColor` driven by CSS, add an explicit `data-theme="dark"` stamp (the shared tokens default to light, so without it the site flips), then alias. That is a deliberate piece of work on a live site, not a side effect of a token migration.

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

These are separate repositories with no shared registry, and `Mecodex-Brand-Assets` is already vendored into six of them. This follows that established pattern: **copy the parts you need into the product**, alongside the brand assets, and re-copy when they change here.

In practice all six products vendor the same two things and nothing else — `tokens.css` and the one `themes/*.css` for their identity. The adapters and the generator scripts stay here; a product has no reason to carry a generator it never runs. RealEstateCRM's CI diffs its vendored copies against this directory on every run, so drift there fails the build.

### React — tokens only

Both React products (POS BackOffice, RealEstateCRM) load the theme CSS directly and style
themselves with hand-written CSS against the custom properties:

```ts
// main.tsx
import './design-system/tokens.css';
import './design-system/themes/<product-theme>.css';
```

There is no CSS framework in any product in this workspace.

#### `tailwind-preset.js` is **not in use**

The file is here, and it is written, but nothing consumes it:

- neither React app has `tailwindcss` installed;
- RealEstateCRM did carry it for a while and it **never once worked** — see below.

It exists because the workspace decision originally read "React → Tailwind + shadcn/ui". That half
of the decision was never implemented anywhere, and the one attempt failed silently for weeks.

**The failure is worth recording, because a `tailwind.config.js` on its own looks like a working
setup.** RealEstateCRM had this preset vendored, a config referencing it, and
`@tailwind base/components/utilities` in `index.css`. What it did not have was a
`postcss.config.*` or the Tailwind Vite plugin — and without one of those, **Vite never runs
Tailwind at all**. It does not warn. The three directives were copied verbatim into the shipped
stylesheet as invalid at-rules and no utility class was ever generated, while the project's own
documentation recorded Tailwind as adopted and "live alongside" the hand-written CSS.

It was removed on 2026-09-04. The built CSS shrank by exactly 56 bytes — precisely the length of
`@tailwind base;@tailwind components;@tailwind utilities;` — and was otherwise byte-identical,
which is the proof it had never contributed anything.

If Tailwind is ever adopted, **wire the build first and verify a utility actually renders before
writing any component against it**, then verify this preset: it maps both Mecodex role names
(`bg-surface`, `text-ink-muted`, `text-accent`) and the semantic names shadcn/ui generates against
(`background`, `foreground`, `primary`, `border`, `ring`, `destructive`), but like the Angular
Material adapter below it has never been built or verified anywhere. Treat it as a draft.
### Angular — CDK + tokens

Both Angular products (Subscription Tracker, PosFlow) load the theme CSS directly and use
**`@angular/cdk` only**:

```css
/* styles.css */
@import './design-system/tokens.css';
@import './design-system/themes/<product-theme>.css';
```

The CDK is used **for behaviour**, not appearance: focus trapping, overlay positioning, live
announcers, keyboard interaction. Those are hard to write correctly by hand, and the accessibility
work proved it — the dialogs in both products carried the right-looking markup while focus escaped
to the page behind them and Escape did nothing. The CDK primitives fixed that with **no visual
change at all**, which is exactly why they were worth adding.

#### `angular-material-theme.scss` is **not in use**

The file is here, and it is written, but nothing consumes it:

- neither app has `@angular/material` **or** `sass` installed, so it cannot compile today;
- it has therefore **never been built or verified** anywhere — treat it as a draft, not a
  working adapter.

It exists because the workspace decision named "Angular Material/CDK". The CDK half was adopted;
the component library was not. Replacing hand-written components that already work, are already
bound to these tokens, and are already covered by tests is a large change to working UI whose only
clear benefit — the accessibility primitives — was obtainable from the CDK alone.

If Material is ever adopted, **verify this file before trusting it**: it needs `sass` and
`@angular/material`, and its two halves both matter. The palettes and typography config cover what
Material themes through its palette API; the `--mdc-*` / `--mat-*` overrides at the bottom cover
Material's own runtime tokens for surfaces, outlines and corner radii. Without the second half,
components Material does not theme through the palette silently revert to Material defaults and sit
slightly "off" in a way that is hard to attribute. It also pulls corners back from Material's
fully-rounded pill default to the shared radius scale, per this system's explicit
anti-"rounded-everything" position.

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
