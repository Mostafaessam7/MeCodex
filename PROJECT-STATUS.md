# Project Status — MeCodex

> Last updated: 2026-08-29. This file describes **this repo only**. Every project in the workspace
> has its own status file; nothing here carries over to another.

This repo holds two separate things that happen to share a home:

1. **`website/`** — the MeCodex marketing site (static HTML/CSS/JS, English only, 8 pages).
2. **`design-system/`** — the **workspace-shared** design system that every other product consumes.

They have different audiences and different risk profiles, so they are tracked separately below.

Project memory lives in `docs/` (`PROJECT_CONTEXT.md`, `DESIGN_SYSTEM.md`, `TASKS.md`,
`WORK_LOG.md`) and is still the detailed record.

---

## 1. Done and closed

### Design system (the part other products depend on)
- **Five per-product themes** — `navy-corporate`, `enterprise-blue`, `amber-commerce`, `slate-pro`,
  `modern-teal` — over one shared token architecture.
- **All five expose an identical set of 27 token names.** That parity is *asserted by re-parsing
  the emitted files*, not assumed, so a theme that gains or loses a token fails the build instead
  of shipping a half-styled app.
- **Semantic colours are constant across all five** (success / warning / danger / info), so "red
  means error" does not drift between products.
- **Contrast is solved, not checked.** `build-themes.mjs` walks lightness for each role until the
  measured ratio against its own surface clears the floor. Current run: every pair ≥ 4.5:1.
- **`tokens.css` holds no colour at all.** Colour lives only in the theme files. A palette in both
  places guarantees drift, so the split is deliberate.
- **The committed `themes/*.css` are reproducible** — regenerating them produces byte-identical
  files. Verified this pass.
- Adapters: `tailwind-preset.js` (React/shadcn).

### Website
- 8 pages sharing one header/nav/footer, `css/style.css`, `js/main.js`.
- Contact and notify forms actually deliver.
- Motion system with a full `prefers-reduced-motion` audit.
- Portfolio/careers/insights content is **honestly framed** — work samples are labelled
  illustrative, with no invented client names, logos, testimonials, salaries or headcount.

### Cleanup 2026-08-29
- **Removed `ecomus-package/` (169 MB, 2205 files).** It was gitignored here, referenced by nothing
  in `website/`, and byte-for-byte identical to the tracked copy in the E-Commerce repo. Verified
  identical before deleting, and `docs/PROJECT_CONTEXT.md` now points at where it actually lives.
- **Marked `angular-material-theme.scss` as an unverified draft**, in the file itself and in
  `design-system/README.md`. See "Known issues" below — the README had been describing an
  integration that does not exist.
- **Added usage guards to both generator scripts.** Running them without arguments used to fail
  with `ERR_INVALID_ARG_TYPE` from inside `node:fs`, which reads like the script is broken rather
  than mis-invoked. `build-themes.mjs` checks *after* the contrast verification on purpose, so a
  bare run still reports whether the palettes pass.

---

## 2. Decisions adopted

| Decision | Detail |
|---|---|
| **Per-product themes, one architecture** | Each product gets its own identity; token *names* stay identical so components are portable |
| **Semantic colours constant** | success/warning/error/info do not vary by product |
| **`tokens.css` is colour-free** | Theme files own colour exclusively |
| **React → Tailwind + shadcn/ui** | Covered by `tailwind-preset.js` |
| **Angular → CDK + token CSS** | The CDK was adopted for behaviour. **Angular Material's component library was not** — see deferred |
| **Marketing site is not an ecommerce store** | Decided twice. Ecomus shop functionality is out of scope |
| **No fabricated credibility** | No invented clients, logos, testimonials, salaries or headcount anywhere on the site |

---

## 3. Still open

- **The marketing site does not consume the theme files.** It keeps its own hand-authored palette.
  Reasons are recorded in the repo: 63 hardcoded SVG stroke colours plus a circular derivation in
  its own token layer. Migrating it is real work, not a find-and-replace.
- **No automated check that products stay on the shared tokens.** Nothing stops a product
  hardcoding a hex next to a themed component; that has already happened once per product and was
  caught by hand.
- **No visual regression testing** on either the site or the themes.

---

## 4. Known issues / technical debt

- **`angular-material-theme.scss` is unused and unverified.** Nothing consumes it. Neither Angular
  product has `@angular/material` **or** `sass` installed, so it cannot compile today and has never
  been built anywhere. The README previously described it as the live Angular integration and
  conflated it with `@angular/cdk`, which *is* used — directly, not through this file. Both the
  file and the README now say so plainly.
- **The generator is not wired into CI.** Contrast and token parity are verified only when someone
  runs the scripts by hand. The guarantees are strong; the enforcement is manual.
- **`Mecodex-Brand-Assets/` is duplicated** in this repo and in E-Commerce (20 tracked files each).
  Left alone: both are tracked, and separate repos cannot share files without new infrastructure.

---

## 5. Deliberately deferred

| Item | Why |
|---|---|
| **Migrating the marketing site onto the shared themes** | 63 hardcoded SVG strokes and a circular derivation in its own token layer. It is a real migration with visual risk, and the site is not the reason the design system exists |
| **Deleting `angular-material-theme.scss`** | The workspace decision named "Angular Material/CDK". The CDK half was adopted; the component library is deferred, not cancelled. The file is kept and clearly labelled rather than removed |
| **Adopting Angular Material's components** | Would replace hand-written components that work, are bound to these tokens, and are covered by tests. The clear benefit — accessibility primitives — came from the CDK alone, with no visual change |

---

## Update 2026-08-30 — CI gate and branch protection

**The design system is now verified in CI** (`.github/workflows/design-system.yml`), not just when
someone remembers to run the generator. It checks all three properties the architecture depends on:
contrast against each theme's own surfaces, identical token names across all five themes, and that
the committed `themes/*.css` are byte-identical to freshly generated output.

That last check is the one that cannot be caught in review. A hand-edit to a theme file looks
entirely reasonable in a diff and silently drops that theme out of the contrast guarantees, because
the generator *solves* for those values rather than checking them afterwards. Verified both ways:
the job passes on the current tree, and hand-editing an accent colour to `#ff0000` makes it fail.

**Branch protection is on** (`enforce_admins: true`, force-pushes and deletions blocked, the design
system check required). Verified by attempting a direct push, which is now rejected. This closes
the gap listed above as "no automated check that products stay on the shared tokens" for the
*generator side* — it still does not check that consuming products have not hardcoded a hex next to
a themed component.

Deliberately **not** wired to `deploy.yml`: that job runs on push to `main` to publish Pages, so
requiring it as a status check would deadlock — nothing could merge until a deploy that only runs
after merge had passed.

> Worth noting for context: this is one of only two repos in the workspace where protection is
> possible. The other six are private, and GitHub requires Pro for branch protection on private
> repositories.
