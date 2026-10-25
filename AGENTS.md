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

## Header/Footer Are Inlined
- `partials/header.html` and `partials/footer.html` are the source, but every page carries an inlined copy between `<!-- partial:header:start -->` / `<!-- partial:header:end -->` markers (same for footer) so crawlers that don't run JavaScript see the navigation.
- **After editing either partial, run `python scripts/sync_partials.py`** to update all pages.
- `partials.js` skips fetching when the placeholder is already filled; a new page with an empty `<div id="header-placeholder"></div>` still works (it gets fetched).

## SEO / Monetization Conventions (keep when adding pages)
- Every page head: title, meta description, canonical, `og:*` + `twitter:*` with `og:image`, favicon links, font `<link>` (no CSS `@import`), the inline theme script, one JSON-LD `@graph` (BlogPosting + BreadcrumbList for posts), gtag, and exactly one AdSense script. Copy the head of an existing post.
- Add new posts to `sitemap.xml`, `llms.txt`, `categories.html`, and their category listing page.
- Amazon links: `target="_blank" rel="sponsored nofollow noopener"`, the standard disclosure box at the top of the article (must include "As an Amazon Associate I earn from qualifying purchases."), and **no typed-in Amazon prices or star ratings** (use price tiers: $, $$, $$$).
- Exam posts end with an `aside.product-cta` for the matching study guide (see any AZ-140 post).
- Images: include `width`/`height`; the post hero image uses `loading="eager" fetchpriority="high"`.
- Exam domain weights must match the current official outline (Microsoft Learn study guides; PMP 2026 ECO: People 33%, Process 41%, Business Environment 26%).

## Script Loading — Two Patterns
`partials.js` self-initializes via `loadPartials()` at module top level, guarded by `_partialsLoaded`.

- **Defer pages** (root-level HTML, most subdirectory pages): `<script src="...partials.js" defer>` — fires after DOM ready.
- **Sync+inline pages** (7 old files: 5 in `project-management/`, 2 in `tutorials/`): `<script src="...partials.js"></script><script>loadPartials()</script>` — inline runs first but guard prevents double-run. **Normalize to `defer` when editing these.**
- `main.js` is `defer` on all pages. Nav toggling lives only in `partials.js` (`initNavToggle()`); don't add a second click handler or the menu toggles twice and never opens. `main.js` also sends GA4 events for study-guide and Amazon clicks.
- `hero-animation.js` only on `index.html` (particle canvas).

## Layout Constraints
- `.post` cards inside `.posts-grid` have `max-width: 900px` — **never** wrap in extra `<div class="container">` or `<section class="section-header">` (double-constrains width).
- Listing pages use `posts-grid` with `article.post` cards: thumbnail (`/images/`), category badge, title, meta date, excerpt, `.read-more` link.

## Theming
- CSS custom properties: `:root` (dark defaults), `.light-mode` override block in `main.css`. The `light-mode` class is set on `<html>` by an inline head script (no flash). Use `--accent-text` (not `--accent`) for amber text so light mode keeps WCAG AA contrast.
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
