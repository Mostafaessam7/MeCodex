# AI Instructions — MeCodex Website

Read in this order, every session, before touching code:
1. `docs/PROJECT_CONTEXT.md`
2. `docs/TASKS.md`
3. `docs/DESIGN_SYSTEM.md` — only when the task touches visual/CSS decisions

Then search for the specific component/section involved. Do not scan the whole repo.

## Ground rules
- This is a **static corporate/services site for MeCodex**, NOT an ecommerce store. There is no cart, checkout, product catalog, or PDP — do not build one unless the user explicitly reverses this decision again in writing.
- `ecomus-package/` (Ecomus HTML template) is a **read-only design/technical reference only** — for layout rhythm, interaction patterns, spacing scale, animation feel. Never wire up its ecommerce logic (cart.js, product logic, checkout) into the live site. Copying an isolated vendor asset (a font, an icon, a specific animation snippet) is fine if credited in WORK_LOG.md.
- `Mecodex-Brand-Assets/` is read-only source-of-truth for logo/color/favicon files.
- The live site lives entirely in `website/`. Do not create a second site folder.
- Reuse before rebuilding. Preserve → Modify → Improve, not Delete → Rebuild.
- Don't create new CSS/JS files if `website/css/style.css` / `website/js/main.js` can hold it — split only if a file genuinely grows unwieldy, and record the split in PROJECT_CONTEXT.md.
- Keep responses concise: what changed + files touched. No tutorials, no re-explaining the brief.
- Update `docs/PROJECT_CONTEXT.md` and `docs/DESIGN_SYSTEM.md` only when an approved decision actually changes. Log routine work in `docs/WORK_LOG.md` (short bullets) and `docs/TASKS.md` (short status).
