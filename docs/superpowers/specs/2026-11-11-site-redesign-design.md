# Site Redesign Design - SysOpsBits

**Date:** 2026-11-11
**Status:** Approved (2026-11-11)

## Overview

Restyle every page of sysopsbits.com as a minimalist, fast site with restrained 3D
motion: a WebGL hero on the homepage, CSS 3D tilt on cards and book covers, and a
distraction-free 700px reading column for articles. The site stays a static,
no-build HTML site on GitHub Pages. URLs, page `<head>` metadata, JSON-LD, gtag and
the single AdSense script do not change.

### Intent (approved 2026-11-11)

- Audience: IT admins and engineers who skim, value speed and distrust flashy sites.
- Revenue: the six study guides sold through Buy Me a Coffee, plus the coffee link.
- Success: Lighthouse mobile 90+ on the homepage and an article page, LCP under 2.5s,
  no layout shift from the canvas, WCAG AA contrast in both themes, everything usable
  with reduced motion, keyboard only, and JavaScript off.

### Decisions already approved

- Deploy target is GitHub Pages (the brief's Bluehost/WordPress items are dropped).
- One accent colour: amber. The cyan secondary is retired.
- Two typefaces: IBM Plex Sans (UI, body, headings) and JetBrains Mono (code, labels).
- Hero object: wireframe node graph (icosphere with nodes at the vertices).
- Three.js and GSAP + ScrollTrigger load on the homepage only, lazily. All other
  pages use CSS and small vanilla scripts.
- No newsletter interaction (the site has no working newsletter). No new ad slots.
- Hero H1 and subtitle copy stay word for word. Practice tests stay on the homepage.

### Decision still open (see "Vendor libraries")

Three.js r187 ships unminified only, so it needs a one-time minify step. The spec
keeps Three.js with a committed, minified vendor bundle and names a fallback.

## Constraints from the current codebase

Found by reading the repo on 2026-11-11:

- 73 HTML pages. 53 standard posts use
  `main > article.post > .container > header.post-header / .post-content / footer.post-footer`.
- All listing pages, the homepage and the store use `article.post-card` inside
  `.posts-grid`. Listing pages have an inline script that counts
  `.posts-grid .post-card` into `.post-count`, so those class names stay.
- `.post-content` is used both for the article body and inside cards. Reading-column
  rules must be scoped to `article.post > .container > .post-content`.
- Existing custom properties are referenced inline in HTML several hundred times
  (`--text-muted` 96, `--border-color` 87, `--text-primary` 76, `--accent` 48, ...).
  Token names therefore stay; only their values change.
- HTML already uses three undefined tokens: `--accent-color` (20 uses), `--text` (13),
  `--text-on-accent` (1). The redesign defines them.
- 72 category badges carry inline colours (62 cyan, 10 amber).
- The four practice tests and `pmp-formulas-earned-value-management.html` carry their
  own inline `<style>` and `<script>`, redefine `.btn`, `.section-header`,
  `.progress-bar` and `.progress-fill`, and rely on a fixed set of IDs.
- `about.html` has an inline style block with hard-coded light colours that ignores
  dark mode.
- `css/syntax.css` styles `.highlight`, which no page uses. Code blocks are plain
  `<pre><code>` styled in `main.css`.
- `.callout-warning` is used in 11 posts but has no CSS rule.
- `main.js` and `hero-animation.js` both hijack every `a[href^="#"]` click with
  `preventDefault`, which would break table-of-contents links and URL hashes.
- Three meta-refresh stubs (`tools.html`, `tutorials.html`,
  `comparisons/cmd-vs-powershell-2026.html`) and `404.html` are special cases.

## Design system

### Colour tokens

Existing token names are kept. New names are added only where nothing existed.

| Token | Dark (default) | Light |
|---|---|---|
| `--bg-primary` | `#0b0d10` | `#fafaf7` |
| `--bg-secondary` | `#101317` | `#f1f1ec` |
| `--bg-card` | `#14171c` | `#ffffff` |
| `--bg-card-hover` | `#1a1e24` | `#f6f6f2` |
| `--bg-elevated` | `#1a1e24` | `#ffffff` |
| `--bg-nav` | `rgba(11,13,16,0.85)` | `rgba(250,250,247,0.9)` |
| `--border-color` | `#262b33` | `#dedcd4` |
| `--border-hover` (decorative) | `#3a414b` | `#8d8a80` |
| `--border-strong` (inputs, state) | `#6b7480` | `#8d8a80` |
| `--text-primary` | `#e6e8eb` | `#16181c` |
| `--text-secondary` | `#a7afb9` | `#4a4f57` |
| `--text-muted` | `#8a929c` | `#636973` |
| `--accent` (fills, borders) | `#f5a524` | `#f5a524` |
| `--accent-text` (amber text) | `#f5a524` | `#9a4a06` |
| `--accent-hover` | `#d98a0b` | `#d98a0b` |
| `--accent-glow` | `rgba(245,165,36,0.22)` | `rgba(245,165,36,0.16)` |
| `--text-on-accent` | `#14110a` | `#14110a` |
| `--state-ok` | `#3fb950` | `#1a7f37` |
| `--state-bad` | `#f85149` | `#b42318` |

Aliases, so old references keep working with one accent:

- `--accent-secondary` and `--accent-secondary-hover` resolve to `--accent-text` and
  `--accent-hover`.
- `--accent-color` resolves to `--accent`; `--text` resolves to `--text-primary`.

Measured contrast (WCAG formula, computed 2026-11-11): text 15.9 dark / 17.0 light;
secondary 8.8 / 7.9; muted 6.2 / 5.3 on the page background and 5.7 / 4.9 on card
surfaces; amber text 9.5 / 6.0; dark text on amber fill 9.2. The state colours and
`--border-strong` must be measured during implementation and adjusted until text is
at least 4.5:1 and input borders at least 3:1.

Colour rules:

- Links in running text: `--text-primary` with an amber underline; amber on hover.
- Red and green appear only for state (quiz right/wrong, "exam trap" callouts).
- Callouts become neutral cards with a mono label (`NOTE`, `TIP`, `TRAP`, `WARN`,
  `Q`) and a 2px left rule: amber for tip/info/question, `--state-bad` for trap and
  warning. `.callout-warning` gets its missing rule.
- The quiz domain badge colours inside the practice tests are left as they are.

### Type

- `--font-body` and `--font-display`: `'IBM Plex Sans', system-ui, sans-serif`
  (weights 400, 500, 600).
- `--font-mono`: `'JetBrains Mono', ui-monospace, monospace` (400, 500).
- One Google Fonts request:
  `family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`.
- Scale in px: 13, 14, 16, 18, 22, 28, 36, 48. Article body 17px at 1.7 line height;
  headings 1.2. H1 `clamp(2rem, 4vw, 3rem)`.
- Mono is used for: code, section labels, tags, dates, the brand cursor, table of
  contents numbering.

### Space, shape, layout

- Spacing steps in px: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 4px tags and inputs, 8px cards and images. Existing `--radius-*` tokens are
  remapped (`sm` 4, `md` 8, `lg` 8, `xl` 12).
- Cards use a 1px border, no drop shadow at rest.
- Widths: `--w-read: 700px` (article column), `--w-wide: 1200px` (grids, header,
  footer). Breakpoints stay at 1024, 768 and 480px.

### Motion tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 120ms | hover colour, button press |
| `--dur-base` | 240ms | tilt settle, menus, page fade |
| `--dur-slow` | 600ms | section and card reveal |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrances, tilt settle |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | scroll-linked moves |

Limits: tilt at most 6 degrees; reveals rise 16px; hero rotation one turn per 90s.

### Terminal personality (four touches only)

1. Mono section labels written as paths: `~/practice-tests`, `~/featured`.
2. Status-style tags: `.category` renders as a mono label with a small dot,
   for example `● microsoft`.
3. One blinking cursor, after the hero eyebrow (`$ sysopsbits ▍`). The header brand
   has a static underscore.
4. Dates shown in ISO form (`2026-10-30`) in mono.

## Architecture

### Files

```
css/
  main.css          rewritten: tokens, base, header, footer, cards, article, listing,
                    store, about, motion utilities, view transitions
  shortcodes.css    re-themed: callouts, product CTA, home sections, charts, store
  syntax.css        deleted (unused); its <link> is removed from every page
js/
  partials.js       kept: nav, theme toggle, active link, AdSense guard
                    + aria-expanded on toggles, + dispatches a `themechange` event
  main.js           trimmed: code copy button, GA4 click tracking
  motion.js         new, all pages: reveal on enter, card tilt, cursor glow
  article.js        new, post pages: table-of-contents scroll-spy, progress fallback
  home.js           new, homepage: decides whether and when to load the scene
  home-scene.js     new, ES module: Three.js scene + GSAP scroll choreography
  hero-animation.js deleted
  vendor/
    three.scene.min.js   committed build output
    gsap.scroll.min.js   committed build output
scripts/
  sync_partials.py       kept
  restyle_pages.py       new, one-off and idempotent bulk HTML edits
  build_article_extras.py new, re-runnable: TOC, related posts, end-of-article block
  vendor/                package.json, build.mjs (esbuild), .gitignore for node_modules
docs/
  design-system.md       new: tokens, animation list, deploy steps, perf checklist
AGENTS.md                updated to match the new structure and conventions
```

Each script has one job and no dependency on another script except `home-scene.js`
on the vendor bundles. `motion.js`, `article.js` and `home.js` are classic deferred
scripts of a few kilobytes each.

### Motion gating (applies to every script and stylesheet)

- All content is visible by default in the HTML and CSS. Nothing is hidden waiting
  for JavaScript.
- `motion.js` adds `motion-ok` to `<html>` only when
  `(prefers-reduced-motion: no-preference)` matches. Every animation and transition
  that moves or fades content is written under `.motion-ok`.
- Reveal: when `motion.js` starts, elements marked `[data-reveal]` that are below
  the current viewport get the hidden state; an IntersectionObserver removes it as
  they enter. Elements already on screen are never hidden.
- Tilt and cursor glow are enabled only for `(hover: hover) and (pointer: fine)`.

### Vendor libraries

Verified 2026-11-11: Three.js r187 (npm 0.187.0) ships `three.module.js` (659 KB)
and `three.core.js` (1,475 KB) unminified and no minified files. GSAP 3.15.1 ships
`gsap.min.js` (73 KB) and `ScrollTrigger.min.js` (45 KB) and is free for commercial
use under the GSAP standard licence.

- `scripts/vendor/build.mjs` uses esbuild to produce two minified ES modules:
  - `three.scene.min.js` exporting only `WebGLRenderer`, `Scene`,
    `PerspectiveCamera`, `BufferGeometry`, `BufferAttribute`, `IcosahedronGeometry`,
    `EdgesGeometry`, `LineSegments`, `LineBasicMaterial`, `Points`, `PointsMaterial`,
    `Group`, `Color`, `Vector2`.
  - `gsap.scroll.min.js` exporting `gsap` and `ScrollTrigger`.
- Versions are pinned in `scripts/vendor/package.json`. The outputs are committed, so
  the site still deploys with no build. The build is re-run only to upgrade.
- Budget: the two bundles together must be at most 200 KB gzipped. The actual sizes
  are recorded in `docs/design-system.md`.
- Fallback if the budget or the Lighthouse target is missed: replace
  `three.scene.min.js` with a hand-written WebGL line-and-point renderer in
  `home-scene.js` (same visuals, a few kilobytes). The rest of the design is
  unaffected. This switch needs the owner's approval when the numbers are known.

### Bulk page edits (`scripts/restyle_pages.py`)

Runs over the same file set as `sync_partials.py`, skips the three refresh stubs,
writes LF, and changes a file only when its content changes. Running it twice is a
no-op. It makes exactly these edits:

1. Replace the Google Fonts `<link>` with the new two-family URL.
2. Remove the `css/syntax.css` `<link>`.
3. Strip the inline `style` attribute from `.category` badges.
4. Rewrite the text of `<time datetime="YYYY-MM-DD">...</time>` to the ISO date.
5. Add `id="main-content"` to `<main>`.
6. Add `<script src=".../js/motion.js" defer>` to every page. (`article.js` is added
   to standard posts by `build_article_extras.py`.)
Nothing else in `<head>` is touched (page transitions are opted into from CSS and
need no markup).

The script prints a per-edit count, and a check mode (`--check`) that fails if any
page's `<head>` differs from before in anything other than edits 1 and 2.

## Page designs

### Header and footer (partials, then `sync_partials.py`)

- Header: brand `SysOpsBits_` (tagline removed), nav links, `Study Guides` as an
  outlined button, coffee link, theme toggle. Same class names and IDs as today so
  `partials.js` keeps working. Height fixed at 64px; `main` gets a matching top
  offset and headings get `scroll-margin-top`.
- A "Skip to content" link is the first focusable element and targets
  `#main-content`.
- `.nav-toggle` and `.dropdown-toggle` get `aria-expanded` and `aria-controls`,
  updated in `initNavToggle()`. Escape closes the menu and dropdown.
- Footer: same four link groups and legal text, restyled; mono group labels; the
  coffee button keeps its place.
- Visible focus ring everywhere: 2px outline in `--accent-text` with 2px offset
  (the darker amber in light mode, so the ring stays above 3:1 on light surfaces).

### Homepage

Section order:

1. **Hero.** Left: eyebrow with cursor, existing H1 and subtitle, the two existing
   buttons, the certification chips. Right (behind the text below 768px): the node
   graph. A faint dot grid fills the hero background.
2. **`~/practice-tests`.** The four existing cards, `id="practice-tests"` kept.
3. **`~/featured`.** Three image cards, hand-picked cornerstone guides:
   AZ-140 host pool lab, Azure NSG best practices, PMP formulas (EVM). All three are
   indexed posts.
4. **`~/study-guides`.** The six existing guide cards as tilting covers, same links,
   `data-product` values, names, details and prices, plus the store link.
5. **`~/latest`.** The six newest indexed posts as a text log: ISO date, tag, title,
   arrow. No images.
6. **`~/topics`.** The four existing topic links in one row.
7. **Why SysOpsBits.** The three existing statements as plain text columns.

Hero scene:

- A static inline SVG of the wireframe sits in a box with reserved dimensions
  (`aspect-ratio`), so the layout never shifts. It is the permanent fallback.
- When the scene is ready, the canvas fades in over the SVG in the same box.
- Scene content: icosphere edges as line segments, vertices as points, an occasional
  pulse travelling along one edge, and a sparse point grid behind it. Colours are
  read from the CSS tokens and re-read on the `themechange` event.
- Idle: one rotation per 90s. Cursor: the group tilts up to 6 degrees toward the
  pointer and grid points within 120px drift a few pixels toward it.
- Scroll (GSAP ScrollTrigger, scrubbed over the hero's height): the object rotates a
  further half turn, scales to 0.6, drifts up, and its edges fade to zero so the
  nodes merge into the grid.
- Rendering stops when the hero leaves the viewport (IntersectionObserver) or the
  tab is hidden (`visibilitychange`). Device pixel ratio is capped at 2.

Loading rule in `home.js`:

| Condition | Behaviour |
|---|---|
| Reduced motion, or `saveData` on, or no WebGL | Static SVG; no libraries downloaded |
| Desktop (width at least 768px, fine pointer) | Load on `requestIdleCallback` after `load` |
| Mobile or coarse pointer | Load on first `pointerdown`, `scroll` or `keydown`; simplified scene |
| `hardwareConcurrency` at most 4 or `deviceMemory` at most 4 | Simplified scene |

Simplified scene: icosphere detail 1 instead of 2, no pulses, grid points reduced to
a quarter, pixel ratio capped at 1.5, no cursor tracking.

Homepage entrances: once GSAP is loaded, `ScrollTrigger.batch` staggers cards that
are still below the viewport (rise 16px, 4 degree tilt on the X axis settling to
flat). Until then, and when GSAP never loads, `motion.js` reveal handles them.

### Article page

- Reading column `--w-read` for header, hero image and body. Left-aligned header
  (currently centred). Hero image keeps `loading="eager" fetchpriority="high"`.
- Tables and code blocks may extend to 820px on wide screens and scroll horizontally
  on narrow ones.
- Code blocks: mono 14px, 1px border, copy button styled by a CSS class (the inline
  styles in `main.js` are removed), visible on hover and on keyboard focus.
- **Reading progress:** a 2px amber bar fixed under the header, class
  `.read-progress` (not `.progress-bar`, which the quizzes use). Driven by CSS
  `animation-timeline: scroll(root)` inside
  `@supports (animation-timeline: scroll())`; `article.js` sets a `--read` custom
  property on scroll for browsers without support. It stays on under reduced motion
  because it only mirrors scroll position.
- **Table of contents:** built from the post's `h2` elements when there are at least
  three. Below 1200px it is a collapsed `<details>` under the header; at 1200px and
  wider it is a sticky list in the right margin. `article.js` highlights the current
  section.
- **End of article**, in this order: the study-guide CTA, tags and author bio where
  they already exist, a small coffee button, then three related posts.
- No 3D and no reveal animation inside `.post-content`.

Generated blocks (`scripts/build_article_extras.py`): the table of contents, heading
`id`s, the CTA where missing, the coffee button and related posts are written into
the HTML between `<!-- auto:NAME:start -->` and `<!-- auto:NAME:end -->` markers, so
they are crawlable and work without JavaScript. The script only processes standard
posts in `/tutorials`, `/project-management`, `/comparisons` and `/tools`; it skips
the practice tests, the refresh stub and root pages such as `contact.html`. It is
re-run when a post is added; AGENTS.md gains that step.

- Related posts: three posts from the same listing category, ranked by shared
  `.post-tags` then by date, excluding the post itself and every page with a
  `noindex` robots tag. Rendered as title-only links with a tag and date.
- CTA where a post has none: PMP and PMBOK posts get PMP Exam Cracker; chart posts
  get PMP Charts & Visuals; PSM posts get PSM I Exam Cracker; AZ-900 and AZ-104
  posts get their guide; every other post gets a one-line link to `store.html`.
  Product names, details, prices and purchase URLs are copied from the homepage
  guide cards. Posts that already have `aside.product-cta` are left alone.
- Pages with a `noindex` robots tag get the progress bar and table of contents but
  no CTA insertion.

### Practice tests and quiz pages

Not redesigned. They inherit the new tokens through the kept token names. Checks
required: the progress fill gradient reads correctly with the aliased
`--accent-secondary`, all five pages work in both themes, and no new global rule
collides with their inline `.btn`, `.section-header`, `.progress-bar` rules.

### Category and listing pages

- `header.section-header`: mono path label (`~/microsoft`), H1, one-line
  description, post count. Left-aligned.
- `.posts-grid` of `.post-card`: image, tag, ISO date, title, excerpt, arrow link.
  Hover: tilt up to 6 degrees toward the cursor with a soft amber glow following it,
  border changes to `--border-hover`. Keyboard focus shows the border and focus ring
  without tilt.
- The inline promo box on `microsoft.html` moves to a `.promo-box` class.
- `categories.html`: its inline style block is replaced by token-based rules in
  `main.css`; layout unchanged.

### Store

- Product cards become book covers: a fixed 3:4 cover area with the image contained,
  a spine edge drawn with a pseudo-element, and a tilt of up to 6 degrees with a
  moving highlight on hover.
- Purchase links, prices and copy are unchanged. `data-product` attributes are added
  to the purchase links to match the homepage, and `main.js` placement detection
  gains a `store` value.

### About and contact

- `about.html`: the inline light-only style block is removed and replaced by
  token-based `.about-*` rules in `main.css`, single column at `--w-read`, same
  content and same certification list.
- `contact.html`: inherits the article column; no other change.

### Page transitions

CSS only: `@view-transition { navigation: auto; }` with a 180ms fade and 8px rise on
the root, wrapped in `(prefers-reduced-motion: no-preference)`. Supported in Chrome,
Edge and Safari; Firefox navigates normally.

## Animation inventory

| # | Animation | Where | Trigger | Reduced-motion fallback |
|---|---|---|---|---|
| 1 | Node graph idle rotation | Home hero | Scene loaded | Static SVG, no libraries |
| 2 | Node graph cursor tilt | Home hero | Pointer move (fine pointer) | Static SVG |
| 3 | Grid points drift to cursor | Home hero | Pointer move (fine pointer) | Static CSS dot grid |
| 4 | Node graph scroll dissolve | Home hero | Scroll through hero | Static SVG stays in place |
| 5 | Edge pulse | Home hero | Timer, full scene only | None shown |
| 6 | Blinking cursor | Home hero eyebrow | Always | Solid cursor, no blink |
| 7 | Section and card reveal | Home, listings, store | Enters viewport | Content shown, no movement |
| 8 | Staggered tilt-in | Home cards | Enters viewport, GSAP loaded | Content shown, no movement |
| 9 | Card tilt and glow | All `.post-card`, guide cards | Hover (fine pointer) | Border colour change only |
| 10 | Book cover tilt | Store, home guides | Hover (fine pointer) | Border colour change only |
| 11 | Button press | Buttons, coffee button, CTA | Hover, active, focus | Colour change only |
| 12 | Coffee cup lift | Coffee button icon | Hover, focus | None |
| 13 | CTA cover tilt | Article `.product-cta` image | Hover on the CTA | None |
| 14 | Reading progress | Article | Scroll | Kept (mirrors scroll position) |
| 15 | TOC current-section mark | Article | Scroll | Kept, no transition |
| 16 | Page fade and rise | All navigations | Link click (supporting browsers) | Instant navigation |
| 17 | Menu and dropdown open | Header | Click, Enter, Space | Instant open |
| 18 | Theme toggle thumb | Header | Click | Instant switch |

## Accessibility

- Semantic landmarks unchanged; one H1 per page; skip link added.
- The hero canvas and fallback SVG are decorative: `aria-hidden="true"`, no focus.
- Everything reachable and operable by keyboard; tilt effects are never the only
  hover feedback.
- Contrast: every text pair at least 4.5:1 and UI borders that convey state at least
  3:1, checked by a script over the token table in both themes.
- Motion: all movement gated on `prefers-reduced-motion` as described above.

## SEO and monetisation safeguards

- No URL, title, meta, canonical, Open Graph, JSON-LD, gtag or AdSense change.
  `restyle_pages.py --check` enforces this.
- Exactly one AdSense script per page before and after (grep check).
- Body text, headings, links, images and alt text are unchanged apart from the
  additions listed under "Article page" and the homepage section regrouping.
- Related posts and table-of-contents links are real links in the HTML.
- No popups, no autoplay media, no new ad placements.
- The site is in AdSense review. All work happens on a local `redesign` branch and
  reaches `main` in one push after the owner's sign-off, so reviewers never see a
  half-restyled site.

## Performance checklist

- Hero text is the LCP element; it is never animated from opacity 0.
- Canvas box has reserved dimensions; SVG fallback occupies it first.
- Three.js and GSAP are never requested on any page except the homepage, and not at
  all for reduced-motion or data-saver users.
- Scene loads on idle (desktop) or first interaction (mobile).
- Render loop pauses off-screen and when the tab is hidden; pixel ratio capped.
- Fonts: two families, five weights, one request, `display=swap`, preconnect kept.
- One fewer stylesheet per page (`syntax.css` removed).
- All scripts deferred; no synchronous script added.
- Images keep `width`/`height`; below-the-fold images keep `loading="lazy"`.
- Tilt and glow use `transform` and `opacity` only and update through
  `requestAnimationFrame`.

## Verification

There is no test framework; verification is by script and by browser.

1. `python scripts/restyle_pages.py --check` passes (heads unchanged).
2. `python scripts/sync_partials.py` and `build_article_extras.py` are no-ops on a
   second run.
3. Contrast script passes for every token pair in both themes.
4. Lighthouse mobile, run against a local static server, on `index.html`, one
   standard post, `microsoft.html` and `store.html`: performance 90+, LCP under
   2.5s, CLS under 0.1, accessibility 95+. Results recorded in
   `docs/design-system.md`.
5. Browser checks in Chrome, Firefox and Safari or WebKit: both themes; reduced
   motion on; JavaScript disabled; keyboard-only pass through header, a card grid,
   an article with table of contents, and the store; 360px, 768px and 1280px widths.
6. All four practice tests and the EVM quiz completed once in each theme.
7. GA4 click tracking still fires for study-guide links (network panel).
8. The `code-reviewer` subagent reviews the diff at the end of each phase.

## Phases

Each phase is one or more commits on the `redesign` branch and leaves the site
working.

1. **Foundation.** Tokens, type, base styles, header and footer partials, skip link,
   `restyle_pages.py`, `motion.js`, page transitions, focus styles.
2. **Homepage.** New section markup, vendor build, `home.js`, `home-scene.js`, SVG
   fallback, GSAP choreography.
3. **Articles.** Reading column, code blocks, callouts, progress bar,
   `build_article_extras.py`, `article.js`.
4. **Listings, store, about, contact, categories.** Card grid, book covers, about
   rewrite, promo box, quiz page checks.
5. **Verification and docs.** The verification list above, `docs/design-system.md`
   (tokens, animation list, GitHub Pages deploy steps, performance checklist),
   AGENTS.md update.

## Out of scope

- Rewriting post content, adding author bios to the 18 posts that lack one, or
  re-listing unlisted posts.
- Restyling the internals of the practice tests and quizzes.
- A newsletter, comments, search, or any new ad placement.
- Self-hosting fonts.
- WordPress or Bluehost packaging.
