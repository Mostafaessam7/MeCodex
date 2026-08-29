# MeCodex

This repo holds two separate things:

1. **`website/`** — the static marketing site for MeCodex, a software development studio. Plain HTML/CSS/JS: no build step, no framework, no server required.
2. **`design-system/`** — the **workspace-shared** design system. Every other product in `D:\Projects` consumes its tokens and one of its five themes, so changes here reach beyond this repo.

**Start at [PROJECT-STATUS.md](PROJECT-STATUS.md)** for the current state of both: what is closed, decisions adopted, what is still open, known debt, and what was deferred on purpose.

## Structure

```
website/            ← the live site (this is what you deploy)
  index.html        Home
  about.html        About
  services.html     Services
  portfolio.html    Work (illustrative examples — see docs/TASKS.md)
  careers.html       Careers
  insights.html      Insights / blog
  faq.html            FAQ
  contact.html         Contact (form is front-end only — see below)
  404.html              Not-found page
  robots.txt / sitemap.xml
  css/style.css        Single shared stylesheet
  js/main.js            Single shared script (nav, motion, particle bg, accordion, forms)
  assets/img/            Logo, favicons, OG image

design-system/      ← shared across every product in the workspace, not just this site
  tokens.css          Theme-independent layer: type, spacing, radius, elevation, motion. No colour.
  themes/*.css        Five per-product themes. All expose an identical set of 27 token names.
  build-themes.mjs    Derives every palette and verifies contrast. Source of truth for values.
  emit-theme-files.mjs  Writes themes/*.css and asserts token-name parity across them.
  tailwind-preset.js  React/shadcn adapter.
  angular-material-theme.scss  ⚠️ NOT IN USE — unverified draft. See design-system/README.md.

docs/                Project memory — read AI_INSTRUCTIONS.md first in any new session
```

> The website itself does **not** consume the theme files — it keeps its own hand-authored palette.
> That is a recorded decision, not an oversight; see [PROJECT-STATUS.md](PROJECT-STATUS.md).

## Running locally

No build step. Either open `website/index.html` directly in a browser, or serve the folder with any static server, e.g.:

```bash
npx serve website
```

## Deploying

Live on GitHub Pages, auto-deployed from `website/` on every push to `main` via `.github/workflows/deploy.yml`.

Before going fully live:
1. Confirm the real domain and update every `og:url` meta tag (currently placeholder `https://mecodex.com/...`) plus `robots.txt`/`sitemap.xml`.
2. Wire `contact.html`'s form (and `insights.html`'s notify form) to a real backend — see `docs/TASKS.md`.
3. Replace the `#` social links in the footer with real profile URLs.
4. Confirm `hello@mecodex.com` is a real, monitored inbox.

## Project memory

This project uses a documentation-as-memory system for AI-assisted sessions:
- `AI_INSTRUCTIONS.md` — read this first, every session.
- `docs/PROJECT_CONTEXT.md` — what this is, paths, brand, current status.
- `docs/DESIGN_SYSTEM.md` — the single source of truth for colors, type, spacing, components, motion.
- `docs/TASKS.md` — current/next/completed/issues.
- `docs/WORK_LOG.md` — short changelog per pass.
