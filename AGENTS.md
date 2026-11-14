# AGENTS.md — sysopsbits

## Project Type
**Static HTML site** (no build step). **Not Hugo** despite README.md claims. Edit HTML/CSS/JS directly, commit, push to deploy.

## Git / Deploy
- Push directly to `main` — no PR workflow
- Remote has PAT embedded in URL; user `sysopsbits@gmail.com` / `Matthew`
- No build step and no CI. The site is static HTML; dev-only tests and tools live in `scripts/` (see "Tests and scripts").

```bash
git add -A && git commit -m "msg" && git push
```

## Structure
```
/project-management/     # PM blog posts
/tutorials/              # Azure/SC-900/Linux tutorials and the AZ practice tests
/comparisons/            # Hosting/tool comparisons
/tools/                  # Sysadmin tool recommendations
/images/                 # .jpg/.png/.webp images
/css/
  main.css               # Tokens, base, header/footer, cards, article, listing, store, about, motion
  shortcodes.css         # Callouts, product CTA, homepage sections, charts, store info
/js/
  partials.js            # Header/footer loader, nav (ARIA, Escape), theme toggle (fires `themechange`). Self-initializes.
  main.js                # Code copy button, GA4 click tracking. Defer on all pages.
  motion.js              # Reveal on enter, card tilt and glow. Defer on all pages.
  article.js             # Reading progress bar, TOC state. Standard posts only (added by build_article_extras.py).
  home.js                # index.html only: decides whether/when to load the 3D scene
  home-scene.js          # ES module: Three.js hero scene + GSAP scroll choreography
  vendor/                # Committed, minified Three.js subset and GSAP+ScrollTrigger (build output, do not hand-edit)
  sim/                   # Help Desk Simulator (simulation.html only): engine.js (network model), commands.js (Command Prompt),
                         #   labs.js (the six tickets, as data), apps.js (apps + dialogs), desktop.js (shell, entry module)
/partials/               # header.html, footer.html (inlined into pages), head/category-nav/newsletter (unused)
/scripts/
  sync_partials.py       # Inline partials into every page
  build_article_extras.py# TOC, study-guide CTA, coffee link and related posts in every standard post
  restyle_pages.py       # One-off redesign edits; `--check` proves page heads did not change
  check_site.py          # contrast | adsense | idempotent | all
  vendor/                # Dev-only Node tooling: build.mjs, serve.mjs, Playwright tests (node_modules is git-ignored)
index.html               # Homepage (3D hero with static SVG fallback)
simulation.html          # Help Desk Simulator page (retro "BitsOS 98" PC, css/sim.css + js/sim/)
*.html                   # Listing pages: microsoft.html, project-management.html, etc.
docs/design-system.md    # Tokens, type, motion, animation list, deploy, performance
docs/superpowers/        # Design specs (specs/) and implementation plans (plans/)
```

## Header/Footer Are Inlined
- `partials/header.html` and `partials/footer.html` are the source, but every page carries an inlined copy between `<!-- partial:header:start -->` / `<!-- partial:header:end -->` markers (same for footer) so crawlers that don't run JavaScript see the navigation.
- **After editing either partial, run `python scripts/sync_partials.py`** to update all pages.
- `partials.js` skips fetching when the placeholder is already filled; a new page with an empty `<div id="header-placeholder"></div>` still works (it gets fetched).

## SEO / Monetization Conventions (keep when adding pages)
- Every page head: title, meta description, canonical, `og:*` + `twitter:*` with `og:image`, favicon links, font `<link>` (no CSS `@import`), the inline theme script, one JSON-LD `@graph` (BlogPosting + BreadcrumbList for posts), gtag, and exactly one AdSense script. Copy the head of an existing post.
- Add new posts to `sitemap.xml`, `llms.txt`, `categories.html`, and their category listing page, then **run `python scripts/build_article_extras.py`** (regenerates the TOC, CTA and related posts in every post).
- Amazon links: `target="_blank" rel="sponsored nofollow noopener"`, the standard disclosure box at the top of the article (must include "As an Amazon Associate I earn from qualifying purchases."), and **no typed-in Amazon prices or star ratings** (use price tiers: $, $$, $$$).
- Author name is **Matthew Hippensteel** everywhere: `<meta name="author">`, the JSON-LD Person `name`, and the `.author-bio` link text (copy the bio from an existing post).
- Unlisted posts (Nov 2026, for AdSense review): 8 weak posts and 3 Amazon gear guides carry `<meta name="robots" content="noindex, follow">` and are removed from the sitemap, llms.txt, listings, and categories.html. They stay online. Re-list one only after rewriting it with first-hand detail: restore the robots tag, then add it back to those indexes. The list lives in the commit that unlisted them.
- Every post needs its own hero image (no reuse across posts, no store product covers as heroes).
- Exam posts end with an `aside.product-cta` for the matching study guide (see any AZ-140 post). Posts without one get a generated CTA between `<!-- auto:cta:start/end -->` markers; never hand-edit inside `auto:` markers.
- Images: include `width`/`height`; the post hero image uses `loading="eager" fetchpriority="high"`.
- Exam domain weights must match the current official outline (Microsoft Learn study guides; PMP 2026 ECO: People 33%, Process 41%, Business Environment 26%).

## Script Loading
`partials.js` self-initializes via `loadPartials()` at module top level, guarded by `_partialsLoaded`. Every page loads `main.js`, `partials.js` and `motion.js` with `defer`; standard posts also load `article.js`.

- Nav toggling lives only in `partials.js` (`initNavToggle()`); don't add a second click handler or the menu toggles twice and never opens.
- `main.js` sends GA4 events for study-guide and Amazon clicks (placements: article_cta, store, home_guides, card, nav, inline).
- The simulator (`js/sim/desktop.js`, a module) and `css/sim.css` load only on `simulation.html`. Budget: 60 KB gzipped together (pinned by `sim-budget.test.mjs`).
- Simulator labs are data in `js/sim/labs.js`. Every lab needs a starts-broken / fix-closes-it / wrong-fix-stays-open unit test and a matching `<h3 id="lab-<id>">` in `simulation.html`. Command output formats come from real Windows captures in `scripts/vendor/tests/unit/fixtures/win-output.md`; keep lab facts to what Microsoft documents. Inside the screen, use only the `--os-*` tokens; no Microsoft names or logos.
- Three.js and GSAP are requested only by `index.html` (via `home.js`), never for reduced-motion or data-saver visitors. Rebuild them with `cd scripts/vendor && npm install && node build.mjs` (budget: 200 KB gzipped together).

## Layout Constraints
- Cards are `article.post-card` inside `.posts-grid`. The listing pages' inline script counts `.posts-grid .post-card` into `.post-count`: don't rename those classes.
- Articles: `main > article.post > .container > header.post-header / .post-content / footer.post-footer`, one 700px column. Scope article rules to `article.post`, because `.post-content` is also the body of every card.
- Don't add a class named `.progress-bar` or `.progress-fill`: the quiz pages define their own.

## Theming
- CSS custom properties: `:root` (dark defaults), `.light-mode` override block in `main.css`. The `light-mode` class is set on `<html>` by an inline head script (no flash). Use `--accent-text` (not `--accent`) for amber text so light mode keeps WCAG AA contrast; `--border-strong` for borders that carry state. Pages reference token names inline: change values, never names.
- Fonts: IBM Plex Sans (`--font-body`/`--font-display`) and JetBrains Mono (`--font-mono`), one Google Fonts link.
- Motion: anything that moves lives under `html.motion-ok` (set by `motion.js` only without reduced motion). Content must stay visible with JavaScript off. Nothing animates inside `article.post`.
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

## Tests and scripts
- `python -m unittest discover -s scripts/tests` and `node --test "scripts/vendor/tests/unit/*.test.mjs"`
- Browser tests: `cd scripts/vendor && npm install && npx playwright install && npx playwright test` (starts `serve.mjs` on port 8123)
- `python scripts/check_site.py all` (contrast, one AdSense script per page vs `main`, scripts are no-ops on re-run)
