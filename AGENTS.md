# AGENTS.md — sysopsbits

## Project Type
Static HTML site (no build step). **Not Hugo** despite README.md claims. Edit HTML/CSS/JS directly and push to deploy.

## Structure
```
/project-management/     # PM blog posts (7 files)
/tutorials/              # Azure/SC-900/Linux tutorials (13 files)
/comparisons/            # Hosting/tool comparisons (12 files)
/tools/                  # Sysadmin tool recommendations (5 files)
/images/                 # .jpg and .png images
/css/main.css            # Full theming via CSS custom properties
/css/shortcodes.css      # Callout, CTA, diagram styles
/css/syntax.css          # Code block syntax highlighting
/js/partials.js          # Loads header/footer, theme toggle, nav. Self-initializes.
/js/main.js              # Smooth scroll, newsletter form, copy-button. Defer on all pages.
/js/hero-animation.js    # Particle canvas animation. index.html only.
/partials/header.html    # Theme toggle pill switch inside `.theme-toggle` button
/partials/footer.html
/partials/head.html
/partials/category-nav.html
/partials/newsletter.html
index.html               # Homepage (hero animation)
project-management.html  # PM post listing page
tutorials.html           # Tutorials listing page
comparisons.html         # Comparisons listing page
tools.html               # Tools listing page
```

## Script Loading — Two Patterns
`partials.js` self-initializes with `loadPartials()` at module top level + `_partialsLoaded` guard.
- **Defer pages** (root-level HTML, most subdirectory pages, 30+ files): `<script src="...partials.js" defer>` — top-level call fires after DOM ready.
- **Sync+inline pages** (6 old files in `project-management/` and `tutorials/`): `<script src="...partials.js"></script><script>loadPartials()</script>` — the inline call normally runs first; guard prevents double-run. Normalize to `defer` when editing these.
- `main.js` is `defer` on all pages. Its `DOMContentLoaded` nav toggle handler duplicates `initNavToggle()` in `partials.js` — harmless (class toggle is idempotent).

## Critical Conventions

### Layout Constraint
- `posts-grid > article.post` has `max-width: 900px` — **never** wrap in extra `<div class="container">` or `<section class="section-header">` (double-constrains width)

### Listing Pages (project-management.html, tutorials.html, etc.)
- Use `posts-grid` with `article.post` cards. Each has a thumbnail (`<img>` from `/images/`), category badge, title, meta date, excerpt, and `.read-more` link.

### Theming
- CSS custom properties in `:root` (dark) and `.light-mode` override block (`main.css:33`)
- Toggle in `header.html` → `initThemeToggle()` in `partials.js`
- Respects `prefers-color-scheme`, persists to `localStorage`

### Dropdown (Nav)
- `::before` pseudo-element on `.dropdown-menu` bridges 8px gap to `.nav-dropdown` toggle
- Touch devices: click toggles `.active` class on menu (JS in `partials.js`)
- Mobile: `position: static`, centered text, card background

## Git / Deploy
- Remote has PAT embedded in URL
- Push directly to `main` — no PR workflow
- User: `matthew@sysopsbits.com` / `Matthew`

## PMBOK 8 Accuracy Source
- `/home/matthew/.agents/skills/project-management/knowledge/PMBOK8.txt` — full 8th edition text

## Commands
```bash
# No build/lint/test — static files only
git add -A && git commit -m "msg" && git push
```

## Skills Available
- `project-management-authority` — PM content decisions
- `frontend-design` — SVG diagrams, CSS theming
- `stop-slop` — prose cleanup
- `verification-before-completion` — verify before claiming done
