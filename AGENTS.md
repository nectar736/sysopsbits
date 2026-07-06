# AGENTS.md — sysopsbits

## Project Type
**Static HTML site** (no build step). **Not Hugo** despite README.md claims. Edit HTML/CSS/JS directly, commit, push to deploy.

## Git / Deploy
- Push directly to `main` — no PR workflow
- Remote has PAT embedded in URL; user `sysopsbits@gmail.com` / `Matthew`
- No build, lint, test, or CI — static HTML only

```bash
git add -A && git commit -m "msg" && git push
```

## Structure
```
/project-management/     # PM blog posts (8 files)
/tutorials/              # Azure/SC-900/Linux tutorials (14 files)
/comparisons/            # Hosting/tool comparisons (12 files)
/tools/                  # Sysadmin tool recommendations (5 files)
/images/                 # 30 .jpg/.png/.webp images
/css/
  main.css               # Full theming via CSS custom properties
  shortcodes.css         # Callout, CTA, diagram, quiz styles
  syntax.css             # Code block syntax highlighting
/js/
  partials.js            # Header/footer loader, theme toggle, nav. Self-initializes.
  main.js                # Smooth scroll, newsletter form, copy-button. Defer on all pages.
  hero-animation.js      # Particle canvas animation. index.html only.
/partials/
  header.html            # Theme toggle pill switch inside `.theme-toggle` button
  head.html / footer.html / category-nav.html / newsletter.html
index.html               # Homepage (hero animation)
*.html                   # Listing pages: project-management.html, tutorials.html, etc.
docs/superpowers/        # Design specs (specs/) and implementation plans (plans/)
```

## Script Loading — Two Patterns
`partials.js` self-initializes via `loadPartials()` at module top level, guarded by `_partialsLoaded`.

- **Defer pages** (root-level HTML, most subdirectory pages): `<script src="...partials.js" defer>` — fires after DOM ready.
- **Sync+inline pages** (7 old files: 5 in `project-management/`, 2 in `tutorials/`): `<script src="...partials.js"></script><script>loadPartials()</script>` — inline runs first but guard prevents double-run. **Normalize to `defer` when editing these.**
- `main.js` is `defer` on all 14 pages. Its `DOMContentLoaded` nav toggle duplicates `initNavToggle()` in `partials.js` — harmless (class toggle is idempotent).
- `hero-animation.js` only on `index.html` (particle canvas).

## Layout Constraints
- `.post` cards inside `.posts-grid` have `max-width: 900px` — **never** wrap in extra `<div class="container">` or `<section class="section-header">` (double-constrains width).
- Listing pages use `posts-grid` with `article.post` cards: thumbnail (`/images/`), category badge, title, meta date, excerpt, `.read-more` link.

## Theming
- CSS custom properties: `:root` (dark defaults), `.light-mode` override block at `main.css:33`.
- Theme toggle in `header.html` → `initThemeToggle()` in `partials.js`. Pill switch with `.theme-toggle-track` / `.theme-toggle-thumb` / `.theme-toggle-label[data-active]`.
- Respects `prefers-color-scheme`, persists to `localStorage`.

## Dropdown Nav
- `.dropdown-menu::before` pseudo-element bridges 8px gap to `.nav-dropdown` toggle.
- Touch: click toggles `.active` class on menu (`partials.js:initNavToggle()`).
- Mobile: `position: static`, centered text, card background.

## Design Specs
- Visual/UX changes that cross a page-section threshold get a spec in `docs/superpowers/specs/` before implementation.
- Implementation plans go in `docs/superpowers/plans/`.

## PMBOK 8 Reference
- `/home/matthew/.agents/skills/project-management/knowledge/PMBOK8.txt` — full 8th edition text for PMP content accuracy checks.
