# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every page of sysopsbits.com as a minimalist static site with a lazy-loaded 3D homepage hero, CSS tilt on cards and book covers, and a 700px reading column, without changing URLs, page heads or monetisation.

**Architecture:** Existing CSS token names keep their names and get new values, so inline references in the HTML keep working. Two Python scripts make all bulk HTML edits (one-off restyle, re-runnable article extras). Motion is split into small deferred scripts; Three.js and GSAP are committed, minified vendor bundles loaded only on the homepage.

**Tech Stack:** HTML, CSS custom properties, vanilla JS, Three.js 0.187.0, GSAP 3.15.1 + ScrollTrigger, esbuild (one-time vendor build), Python 3.13 stdlib (`unittest`), Node 22 (`node --test`), Playwright (dev-only browser tests), Lighthouse CLI.

**Spec:** `docs/superpowers/specs/2026-11-11-site-redesign-design.md` (read it first; token values, the animation inventory and page designs live there and are not repeated here).

**Execution (owner's instruction):** the main session implements each task; the `code-reviewer` subagent reviews the diff after Tasks 5, 8, 10 and 12 and the whole branch in Task 13; `explorer` and `researcher` are used for repo lookups and current documentation.

## Global Constraints

- All work on local branch `redesign`. Nothing is pushed and nothing reaches `main` until the owner signs off in Task 13.
- No build step for the deployed site. Vendor bundles are committed build outputs.
- No change to any page's URL, `<title>`, meta, canonical, Open Graph, JSON-LD, gtag or AdSense script. Exactly one AdSense script per page, as on `main`.
- Existing token names (`--bg-primary`, `--text-muted`, ...) and the class names `.post-card`, `.posts-grid`, `.post-count`, `.post`, `.post-content`, `.product-cta`, `.author-bio`, `.nav-toggle`, `.nav-menu`, `.dropdown-toggle`, `.nav-dropdown`, `.theme-toggle`, `#theme-label-dark`, `#theme-label-light` are not renamed.
- Reading-column rules are scoped to `article.post > .container > .post-content`, never bare `.post-content`.
- No new class named `.progress-bar` or `.progress-fill` (the quizzes own them).
- All content visible with JavaScript off and with reduced motion. Animations only under `html.motion-ok`. Tilt and glow only under `(hover: hover) and (pointer: fine)`.
- Three.js and GSAP are requested only by `index.html`, never for reduced-motion or `saveData` users. Both bundles together at most 200 KB gzipped.
- Hero H1 and subtitle copy unchanged. Author name "Matthew Hippensteel". No typed-in Amazon prices.
- Amber text uses `--accent-text`, never `--accent`.
- Files written by scripts use LF and are rewritten only when content changes.
- Commit messages: one plain sentence in the repo's style, ending with the `Co-Authored-By` line the session provides.

## Commands used throughout

| Name | Command (from repo root) |
|---|---|
| PY | `python -m unittest discover -s scripts/tests -v` |
| UNIT | `node --test "scripts/vendor/tests/unit/*.test.mjs"` |
| E2E | `cd scripts/vendor && npx playwright test` |
| CHECK | `python scripts/check_site.py all` |
| SERVE | `python -m http.server 8123` |

## Review Focus

1. Vendor bundle fails to load (offline, blocked, 404): the SVG fallback stays, no uncaught error, cards still reveal. Test in Task 8.
2. Theme toggled, window resized, or tab hidden and shown while the scene runs: colours update, canvas matches its box, exactly one render loop runs. Tests in Task 8.
3. Post headings that repeat, contain inline markup or entities, or number fewer than three: unique valid `id`s, plain-text TOC labels, no empty TOC. Tests in Task 9.
4. Wide tables, long code lines and long URLs at 360px: no horizontal page scroll. Test in Task 10.
5. Returning to a page from the back/forward cache: revealed content is not hidden again and the header menu is closed. Test in Task 5.

---

### Task 1: Branch, tooling and site checker

**Files:**
- Create: `scripts/check_site.py`, `scripts/tests/test_check_site.py`
- Create: `scripts/vendor/package.json`, `scripts/vendor/.gitignore`, `scripts/vendor/playwright.config.mjs`

**Interfaces:**
- Produces (Python, `scripts/check_site.py`):
  - `contrast(fg: str, bg: str) -> float` (hex colours, WCAG ratio)
  - `parse_tokens(css: str) -> dict[str, dict[str, str]]` with keys `'dark'` (from `:root`) and `'light'` (`:root` overlaid by `.light-mode`); `var(--x)` values are resolved.
  - `site_pages(root: Path) -> list[Path]` (same exclusions as `sync_partials.py`: `partials/`, `docs/`, `.omo/`, `scripts/`)
  - `STUBS = {'tools.html', 'tutorials.html', 'comparisons/cmd-vs-powershell-2026.html'}`
  - `PAIRS: list[tuple[str, str, float]]` (foreground token, background token, minimum ratio)
  - CLI: `python scripts/check_site.py {contrast|adsense|idempotent|all}`; exit 1 on failure with one line per failure.
- `adsense`: per page, the number of `adsbygoogle.js` script tags equals the number in `git show main:<path>`.
- `idempotent`: hashes all pages, runs each of `sync_partials.py`, `restyle_pages.py`, `build_article_extras.py` that exists, and fails if any hash changed.

- [ ] **Step 1: Create the branch**

Run: `git checkout -b redesign`

- [ ] **Step 2: Add dev tooling**

`scripts/vendor/package.json`: private, `"type": "module"`, devDependencies pinned exactly: `three` 0.187.0, `gsap` 3.15.1, plus current `esbuild`, `@playwright/test`, `lighthouse`. `.gitignore`: `node_modules/`, `test-results/`, `playwright-report/`. `playwright.config.mjs`: `testDir: './tests/e2e'`, `use.baseURL: 'http://localhost:8123'`, `webServer: { command: 'python -m http.server 8123 --directory ../..', url: 'http://localhost:8123/index.html', reuseExistingServer: true }`, projects `chromium`, `firefox`, `webkit`.

Run: `cd scripts/vendor && npm install && npx playwright install chromium firefox webkit`
Expected: install completes; `npx playwright --version` prints a version.

- [ ] **Step 3: Write the failing tests** (`scripts/tests/test_check_site.py`)

```python
def test_contrast_known_pairs(self):
    self.assertAlmostEqual(contrast('#e6e8eb', '#0b0d10'), 15.85, delta=0.02)
    self.assertAlmostEqual(contrast('#9a4a06', '#fafaf7'), 5.98, delta=0.02)
def test_parse_tokens_overlays_light_and_resolves_var(self):
    css = ':root{--a:#000000;--b:var(--a);--c:#111111}.light-mode{--a:#ffffff}'
    t = parse_tokens(css)
    self.assertEqual(t['dark']['--b'], '#000000')
    self.assertEqual(t['light']['--b'], '#ffffff')
    self.assertEqual(t['light']['--c'], '#111111')
def test_site_pages_skips_partials_docs_scripts(self):  # uses a tmp dir tree
```

- [ ] **Step 4: Run PY, expect import failure**

- [ ] **Step 5: Implement `scripts/check_site.py`**

`PAIRS` (min 4.5 unless noted): `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-text` each on `--bg-primary`, `--bg-card`, `--bg-secondary`; `--text-on-accent` on `--accent`; `--state-ok` and `--state-bad` on `--bg-primary` and `--bg-card`; `--border-strong` on `--bg-primary` and `--bg-card` at 3.0. Tokens with `rgba()` values are skipped by the contrast check.

- [ ] **Step 6: Run PY, expect pass; run `python scripts/check_site.py adsense`, expect exit 0**

- [ ] **Step 7: Commit** ("Add redesign tooling and site invariant checker")

---

### Task 2: Tokens, base styles, type, buttons, callouts

**Files:**
- Modify: `css/main.css` (token blocks, reset/base, typography, buttons, section header), `css/shortcodes.css` (callouts)

**Interfaces:**
- Produces: every token in the spec's colour table and aliases list, plus `--border-strong` (dark `#6b7480`, light `#8d8a80`; raise either until CHECK passes), `--state-ok`, `--state-bad`, `--text-on-accent`, `--w-read: 700px`, `--w-wide: 1200px`, `--header-h: 64px`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-out`, `--ease-in-out`.
- Produces classes: `.section-path` (mono path label), `.btn`, `.btn-primary`, `.btn-secondary` (existing names, restyled), `.category` as a status tag (mono, lowercase, `::before` dot, no background), `.callout-warning`.

- [ ] **Step 1: Run `python scripts/check_site.py contrast`, expect failures** (new tokens missing)

- [ ] **Step 2: Replace the `:root` and `.light-mode` blocks** with the spec values; add the aliases, `--radius-*` remap (4, 8, 8, 12) and the new tokens above. `--font-display` and `--font-body` both `'IBM Plex Sans', system-ui, sans-serif`.

- [ ] **Step 3: Restyle base, type and links**

Body 16px/1.7; headings weight 600, line height 1.2; scale per spec. Links in running text: `--text-primary` with `text-decoration-color: var(--accent)`; hover `--accent-text`. `html { scroll-behavior: smooth }` only inside `@media (prefers-reduced-motion: no-preference)`. `:focus-visible { outline: 2px solid var(--accent-text); outline-offset: 2px }`. `::selection` uses `--accent` with `--text-on-accent`. `.container` max-width `var(--w-wide)`.

- [ ] **Step 4: Buttons, tags, callouts**

Buttons: 1px border, radius 4px, primary filled amber with `--text-on-accent`, secondary outlined; under `.motion-ok`, `:active` translates 1px. Callouts per spec (neutral card, mono label via `::before` content `NOTE`/`TIP`/`TRAP`/`WARN`/`Q`, 2px left rule; trap and warning use `--state-bad`).

- [ ] **Step 5: Add page transitions and motion base**

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
  ::view-transition-old(root) { animation: vt-out 180ms var(--ease-in-out) both; }
  ::view-transition-new(root) { animation: vt-in 180ms var(--ease-out) both; }
}
```
`vt-in`: opacity 0 and `translateY(8px)` to rest. `vt-out`: opacity 1 to 0.

- [ ] **Step 6: Verify**

Run: `python scripts/check_site.py contrast` → exit 0.
Run: `grep -c -i -E '06b6d4|0e7490|0891b2|155e75|Outfit|Plus Jakarta' css/main.css css/shortcodes.css` → 0 for both files.

- [ ] **Step 7: Commit** ("Retheme tokens, base styles, buttons and callouts")

---

### Task 3: `motion.js` (reveal, tilt, glow)

**Files:**
- Create: `js/motion.js`, `scripts/vendor/tests/unit/motion.test.mjs`
- Modify: `css/main.css` (motion utilities)

**Interfaces:**
- Produces (classic script; also `module.exports` when `module` exists):
  - `tiltFor(rect, x, y, maxDeg = 6) -> { rx: number, ry: number, gx: number, gy: number }` where `rect` is `{left, top, width, height}`, `rx`/`ry` are degrees clamped to `±maxDeg`, `gx`/`gy` are 0..100 (percent position of the pointer).
  - `REVEAL_SELECTOR = '.home-section-head, .section-header, .posts-grid > .post-card, .guide-card, .topic-card, .feature, .log-row'`
  - `TILT_SELECTOR = '.post-card, .guide-card'`
- Behaviour: adds `motion-ok` to `<html>` when `(prefers-reduced-motion: no-preference)`; marks matching elements below the viewport with `data-reveal="pending"` and switches to `"in"` on intersection; on `pageshow` with `persisted`, sets every `data-reveal` to `"in"`. Skips reveal on `body[data-page="index"]` once `html.gsap-ready` is set (Task 8 owns homepage entrances after GSAP loads). Tilt sets `--rx`, `--ry`, `--gx`, `--gy` on the hovered element through `requestAnimationFrame` and clears them on `pointerleave`. Nothing inside `article.post .post-content` is ever selected.
- CSS: `.motion-ok [data-reveal="pending"] { opacity: 0; transform: translateY(16px) }`, transition `--dur-slow` `--ease-out`; tilt target `transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))` with `--dur-base` settle; glow as a `::after` radial gradient at `var(--gx) var(--gy)` using `--accent-glow`.

- [ ] **Step 1: Write the failing unit tests**

```js
test('centre gives no tilt', () => { assert.deepEqual(tiltFor(R, 100, 50), { rx: 0, ry: 0, gx: 50, gy: 50 }); });
test('top-left corner tilts to max', () => { const t = tiltFor(R, 0, 0); assert.equal(t.rx, 6); assert.equal(t.ry, -6); });
test('pointer outside rect is clamped', () => { const t = tiltFor(R, 999, 999); assert.equal(t.rx, -6); assert.equal(t.ry, 6); assert.equal(t.gx, 100); });
// R = { left: 0, top: 0, width: 200, height: 100 }
```

- [ ] **Step 2: Run UNIT, expect failure**
- [ ] **Step 3: Implement `js/motion.js` and the CSS utilities**
- [ ] **Step 4: Run UNIT, expect pass**
- [ ] **Step 5: Commit** ("Add motion script for reveal, tilt and cursor glow")

---

### Task 4: `restyle_pages.py` bulk edits

**Files:**
- Create: `scripts/restyle_pages.py`, `scripts/tests/test_restyle_pages.py`
- Modify: every page returned by `site_pages()` except `STUBS`
- Delete: `css/syntax.css`

**Interfaces:**
- Consumes: `site_pages`, `STUBS` from Task 1.
- Produces:
  - `FONT_HREF = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap'`
  - `swap_fonts(html) -> str`, `drop_syntax_css(html) -> str`, `strip_badge_styles(html) -> str`, `iso_dates(html) -> str`, `add_main_id(html) -> str`, `add_motion_script(html, depth: int) -> str`, `restyle(html, depth) -> str` (applies all six).
  - `head_of(html) -> str` and `heads_match(old, new) -> bool` (compares `<head>` after removing the fonts stylesheet line and the `syntax.css` line from both).
  - CLI: no args applies edits and prints a count per edit; `--check` compares each page's head with `git show main:<path>` and exits 1 listing mismatches.

- [ ] **Step 1: Write the failing tests**

```python
def test_strip_badge_styles_only_touches_category(self):
    src = '<a href="m.html" class="category" style="background:rgba(6,182,212,0.12);color:#06b6d4">Microsoft</a><p style="color:red">x</p>'
    out = strip_badge_styles(src)
    self.assertIn('<a href="m.html" class="category">Microsoft</a>', out)
    self.assertIn('<p style="color:red">x</p>', out)
def test_iso_dates(self):
    self.assertEqual(iso_dates('<time datetime="2026-10-30">Oct 30, 2026</time>'), '<time datetime="2026-10-30">2026-10-30</time>')
def test_add_main_id_keeps_existing_attrs(self):
    self.assertEqual(add_main_id('<main class="x">'), '<main id="main-content" class="x">')
def test_add_motion_script_depth(self):
    self.assertIn('<script src="../js/motion.js" defer></script>\n</body>', add_motion_script('<script src="../js/partials.js" defer></script>\n</body>', 1))
def test_restyle_is_idempotent(self):
    once = restyle(SAMPLE, 0); self.assertEqual(restyle(once, 0), once)
def test_heads_match_ignores_fonts_and_syntax_only(self):
    self.assertTrue(heads_match(OLD, restyle(OLD, 0)))
    self.assertFalse(heads_match(OLD, restyle(OLD, 0).replace('<title>', '<title>x')))
```
`SAMPLE`/`OLD` are trimmed copies of a real page head and body.

- [ ] **Step 2: Run PY, expect failure**
- [ ] **Step 3: Implement the script**
- [ ] **Step 4: Run PY, expect pass**
- [ ] **Step 5: Apply and verify**

Run: `python scripts/restyle_pages.py` then `git rm css/syntax.css`.
Run: `python scripts/restyle_pages.py --check` → exit 0. Run CHECK → exit 0.
Run: `grep -rl 'style="background:rgba' --include=*.html . | wc -l` and confirm no `.category` badge still has an inline style.

- [ ] **Step 6: Commit** ("Apply bulk page edits for fonts, badges, dates and motion script")

---

### Task 5: Header, footer, navigation accessibility, `main.js` trim

**Files:**
- Modify: `partials/header.html`, `partials/footer.html`, `js/partials.js`, `js/main.js`, `css/main.css` (header, dropdown, theme toggle, nav toggle, footer, bmc button sections)
- Create: `scripts/vendor/tests/e2e/nav.spec.mjs`
- Modify: all pages via `python scripts/sync_partials.py`

**Interfaces:**
- Produces markup: `<a class="skip-link" href="#main-content">Skip to content</a>` as the first element of the header partial; brand `SysOpsBits<span class="brand-cursor" aria-hidden="true">_</span>`; tagline removed; `ul.nav-menu#nav-menu`; `.nav-toggle[aria-expanded][aria-controls="nav-menu"]`; `ul.dropdown-menu#nav-categories`; `.dropdown-toggle[aria-expanded][aria-controls="nav-categories"]`; `.theme-toggle[aria-pressed]` (true when light).
- Produces event: `document` receives `CustomEvent('themechange', { detail: { light: boolean } })` after every toggle.
- `main.js` keeps only the copy button and GA4 click tracking. The copy button is `<button class="copy-button" type="button" aria-label="Copy code">Copy</button>` with no inline styles. The anchor-click hijack, newsletter handler and lazy-load shim are removed.

- [ ] **Step 1: Write the failing e2e tests** (`nav.spec.mjs`, run at 360px and 1280px widths)

```js
test('skip link is first focusable and targets main', ...)      // Tab once → focused element has href '#main-content'
test('menu toggle sets aria-expanded and Escape closes', ...)   // 360px: click → 'true'; Escape → 'false', focus on toggle
test('dropdown opens with Enter and closes with Escape', ...)   // 1280px
test('theme toggle fires themechange and sets aria-pressed', ...)
test('in-page anchor updates the URL hash', ...)                // index.html → click a[href="#practice-tests"] → location.hash
test('back/forward cache return shows content and a closed menu', ...) // open menu, go to about.html, goBack → aria-expanded 'false', no [data-reveal="pending"] in viewport
test('header does not cover the top of main', ...)              // main.getBoundingClientRect().top >= header bottom at scrollY 0
```

- [ ] **Step 2: Run E2E `nav.spec.mjs`, expect failures**
- [ ] **Step 3: Edit the partials and `partials.js`**

`initNavToggle()` maintains `aria-expanded`, closes on Escape and returns focus to the toggle, and closes the menu on `pageshow` when `persisted`. `initThemeToggle()` sets `aria-pressed` and dispatches `themechange`.

- [ ] **Step 4: Restyle header and footer**

Header height `var(--header-h)`, 1px bottom border, no blur shadow. First measure how content is currently offset below the fixed header (computed styles of `.hero`, `.post`, `.section-header`), then set `main { padding-top: var(--header-h) }`, remove the per-section compensation, and add `[id] { scroll-margin-top: calc(var(--header-h) + 16px) }`. Study Guides link is an outlined button. Footer: mono group labels, same links. Coffee icon lifts 2px on hover/focus under `.motion-ok`.

- [ ] **Step 5: Trim `main.js`; style `.copy-button` in CSS** (visible on `pre:hover` and `:focus-visible`)
- [ ] **Step 6: Run `python scripts/sync_partials.py`, E2E `nav.spec.mjs` (pass), CHECK (exit 0)**
- [ ] **Step 7: Commit** ("Restyle header and footer and make navigation keyboard accessible")
- [ ] **Step 8: Phase 1 review** — dispatch `code-reviewer` on `git diff main...redesign`; fix findings; commit.

---

### Task 6: Vendor bundles

**Files:**
- Create: `scripts/vendor/build.mjs`, `scripts/vendor/entries/three.scene.js`, `scripts/vendor/entries/gsap.scroll.js`
- Create (build output, committed): `js/vendor/three.scene.min.js`, `js/vendor/gsap.scroll.min.js`

**Interfaces:**
- Produces ES module `js/vendor/three.scene.min.js` exporting exactly: `WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, IcosahedronGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, Points, PointsMaterial, Group, Color, Vector2`.
- Produces ES module `js/vendor/gsap.scroll.min.js` exporting `gsap`, `ScrollTrigger` (already registered with `gsap.registerPlugin`).
- `node scripts/vendor/build.mjs` builds both (esbuild `bundle`, `minify`, `format: 'esm'`, `target: 'es2020'`), prints raw and gzipped bytes for each, and exits 1 if the gzipped total exceeds 204800.

- [ ] **Step 1: Write the entry files and `build.mjs`**
- [ ] **Step 2: Run `node scripts/vendor/build.mjs`**

Expected: two files written, sizes printed, exit 0. If it exits 1, stop and report the sizes to the owner (spec fallback decision); do not continue to Task 8.

- [ ] **Step 3: Smoke-check the exports**

Run: `node -e "import('./js/vendor/gsap.scroll.min.js').then(m=>console.log(typeof m.gsap.to, typeof m.ScrollTrigger.create))"` → `function function`.

- [ ] **Step 4: Commit** ("Add minified Three.js and GSAP vendor bundles")

---

### Task 7: Homepage markup and styles

**Files:**
- Modify: `index.html` (body between the header and footer placeholders only), `css/main.css` (hero section), `css/shortcodes.css` (home sections, guide cards)
- Create: `scripts/vendor/make_hero_svg.mjs`, `scripts/vendor/tests/e2e/home.spec.mjs`
- Delete: `js/hero-animation.js` and its `<script>` tag

**Interfaces:**
- Produces markup:
  - Hero: `.hero > .hero-content` (eyebrow `<p class="hero-eyebrow">$ sysopsbits<span class="cursor" aria-hidden="true">▍</span></p>`, existing H1, subtitle, buttons, chips) and `.hero-scene[aria-hidden="true"] > svg.hero-fallback + canvas#hero-canvas`.
  - Section heads: `.home-section-head > p.section-path + h2 (+ p)`.
  - Latest log: `ol.post-log > li.log-row > time[datetime] + a.category + a.log-title`.
  - Guides: existing `a.guide-card` elements unchanged in href, `data-product`, name, detail and price.
- `make_hero_svg.mjs` prints an `<svg viewBox="0 0 400 400">` of `EdgesGeometry(IcosahedronGeometry(1, 1))` projected with a fixed rotation: one `<path>` for edges (stroke `currentColor`, width 1) and circles for vertices.
- `.hero-scene { aspect-ratio: 1 / 1; width: min(42vw, 480px) }`; below 768px it is absolutely positioned behind the text at 0.25 opacity. `canvas` is absolutely positioned inside it, `opacity: 0` until `.hero-scene.scene-ready`.
- Hero background dot grid: CSS `radial-gradient` on `.hero`, 24px pitch, using `--border-color`.

- [ ] **Step 1: Write the failing e2e tests** (`home.spec.mjs`)

```js
test('hero H1 and subtitle copy unchanged', ...)                 // exact strings from main
test('sections appear in spec order', ...)                       // .section-path texts: ~/practice-tests, ~/featured, ~/study-guides, ~/latest, ~/topics
test('#practice-tests has four cards; featured has three; log has six rows', ...)
test('six guide cards keep href and data-product', ...)          // compare with the list on main
test('latest log rows are sorted newest first and none link to a noindex page', ...)
test('hero-scene box has non-zero size and holds the fallback svg', ...)
test('with JavaScript disabled every section is visible', ...)   // browser context javaScriptEnabled: false
```

- [ ] **Step 2: Run E2E `home.spec.mjs`, expect failures**
- [ ] **Step 3: Generate the SVG and rewrite the homepage body**

Featured cards: `tutorials/az-140-deploy-host-pool-step-by-step.html`, `tutorials/azure-nsg-best-practices.html`, `project-management/pmp-formulas-earned-value-management.html` (titles, images and excerpts taken from each post's own head and hero). Latest: the six indexed posts with the newest `datePublished`, found with a one-off scan. Topics and "Why" keep their existing copy.

- [ ] **Step 4: Style the hero and sections** (blinking cursor: 1s steps animation under `.motion-ok`, solid otherwise; guide cards as covers with a 3:4 `object-fit: contain` area and a spine pseudo-element)
- [ ] **Step 5: Run E2E `home.spec.mjs` (pass), `python scripts/restyle_pages.py --check`, CHECK**
- [ ] **Step 6: Commit** ("Rebuild homepage layout with static hero fallback and log-style latest list")

---

### Task 8: Hero scene and scroll choreography

**Files:**
- Create: `js/home.js`, `js/home-scene.js`, `scripts/vendor/tests/unit/home.test.mjs`, `scripts/vendor/tests/e2e/scene.spec.mjs`
- Modify: `index.html` (add `<script src="js/home.js" defer></script>`)

**Interfaces:**
- Consumes: vendor bundles (Task 6), hero markup (Task 7), `themechange` event (Task 5), `html.gsap-ready` convention (Task 3).
- Produces (`js/home.js`, classic script with `module.exports` for tests):
  - `chooseSceneMode(env) -> 'none' | 'full' | 'lite'`, `env = { reducedMotion, saveData, webgl, width, finePointer, cores, memory }`
    - `'none'` if `reducedMotion || saveData || !webgl`
    - `'lite'` if `width < 768 || !finePointer || cores <= 4 || memory <= 4` (undefined `cores`/`memory` do not trigger)
    - else `'full'`
  - `loadTrigger(env) -> 'idle' | 'interaction'` (`'idle'` only when `width >= 768 && finePointer`)
  - On trigger: `import('./home-scene.js').then(m => m.start({ canvas, mode }))`; any rejection is caught and ignored (fallback stays).
- Produces (`js/home-scene.js`, ES module): `export async function start({ canvas, mode }) -> { stop(): void }`.
  - Sets `.hero-scene.scene-ready` after the first frame, `html.gsap-ready` once ScrollTrigger is set up.
  - Sets `canvas.dataset.running` to `'1'` or `'0'` and `canvas.dataset.theme` to `'dark'` or `'light'` whenever they change.
  - Scene and scroll values exactly as in the spec ("Hero scene", "Simplified scene", "Homepage entrances").
  - Pauses on hero leaving the viewport and on `document.hidden`; resumes on return; handles `resize` by matching the canvas to `.hero-scene` with pixel ratio capped at 2 (1.5 in `lite`).

- [ ] **Step 1: Write the failing unit tests**

```js
const base = { reducedMotion: false, saveData: false, webgl: true, width: 1280, finePointer: true, cores: 8, memory: 8 };
test('full on capable desktop', () => assert.equal(chooseSceneMode(base), 'full'));
test('none for reduced motion, saveData, no webgl', () => { for (const k of ['reducedMotion','saveData']) assert.equal(chooseSceneMode({ ...base, [k]: true }), 'none'); assert.equal(chooseSceneMode({ ...base, webgl: false }), 'none'); });
test('lite for narrow, coarse, few cores, low memory', () => { assert.equal(chooseSceneMode({ ...base, width: 400 }), 'lite'); assert.equal(chooseSceneMode({ ...base, finePointer: false }), 'lite'); assert.equal(chooseSceneMode({ ...base, cores: 4 }), 'lite'); assert.equal(chooseSceneMode({ ...base, memory: 4 }), 'lite'); });
test('missing cores and memory do not downgrade', () => assert.equal(chooseSceneMode({ ...base, cores: undefined, memory: undefined }), 'full'));
test('trigger', () => { assert.equal(loadTrigger(base), 'idle'); assert.equal(loadTrigger({ ...base, width: 400 }), 'interaction'); });
```

- [ ] **Step 2: Write the failing e2e tests** (`scene.spec.mjs`, chromium)

```js
test('desktop: scene becomes ready and hero box does not move', ...)   // record .hero-scene rect, wait for .scene-ready, rect equal
test('reduced motion: no vendor request, fallback visible', ...)       // emulateMedia reducedMotion; assert no request to /js/vendor/
test('mobile: no vendor request until first interaction', ...)         // 390px touch context; none after load; some after a tap
test('vendor request blocked: fallback stays, no page error', ...)     // route.abort('**/js/vendor/*')
test('theme toggle recolours the scene', ...)                          // canvas.dataset.theme flips
test('resize keeps canvas matched to its box', ...)
test('hidden tab pauses, visible resumes, one loop', ...)              // dataset.running '0' then '1'
test('scrolling past the hero pauses rendering', ...)
test('non-home pages never request /js/vendor/', ...)                  // about.html, a post, microsoft.html
```

- [ ] **Step 3: Run UNIT and E2E `scene.spec.mjs`, expect failures**
- [ ] **Step 4: Implement `js/home.js`**
- [ ] **Step 5: Implement `js/home-scene.js`**
- [ ] **Step 6: Run UNIT, E2E `scene.spec.mjs` and `home.spec.mjs`, expect pass**
- [ ] **Step 7: Commit** ("Add lazy-loaded 3D hero scene with scroll choreography")
- [ ] **Step 8: Phase 2 review** — dispatch `code-reviewer` on the Task 6-8 diff; fix findings; commit.

---

### Task 9: `build_article_extras.py`

**Files:**
- Create: `scripts/build_article_extras.py`, `scripts/tests/test_build_article_extras.py`
- Modify: standard posts in `tutorials/`, `project-management/`, `comparisons/`, `tools/`

**Interfaces:**
- Produces:
  - `@dataclass Post: path, title, date (ISO str), category (str), category_href, tags (list[str]), noindex (bool), has_cta (bool), is_standard (bool)`
  - `collect_posts(root: Path) -> list[Post]`; `is_standard` is true when the file has `<article class="post"` and is not a practice test or stub.
  - `slugify(text: str) -> str`; `heading_ids(html) -> tuple[str, list[tuple[id, text]]]` (adds `id` to `h2` elements inside the article body that lack one, de-duplicating with `-2`, `-3`; labels are tag-stripped, entity-decoded plain text)
  - `toc_html(items) -> str` (empty string when fewer than 3 items)
  - `related_for(post, posts, n=3) -> list[Post]` (same `category`, not noindex, not itself; sorted by shared-tag count desc, then date desc, then path)
  - `PRODUCTS: dict[str, dict]` keyed `pmp`, `pmp-charts`, `psm1`, `az-900`, `az-104`, `az-140` with `name`, `detail`, `price`, `href`, `image`, `width`, `height` copied from the homepage guide cards
  - `cta_key(post) -> str | None`: filename contains `psm1` → `psm1`; `burnup`, `charts`, `visual-tools` → `pmp-charts`; `pmp` or `pmbok` or under `project-management/` → `pmp`; `az-900` → `az-900`; `az-104` → `az-104`; `az-140` → `az-140`; otherwise `None` (generic store link)
  - `apply(html, post, posts) -> str`; CLI with no args processes all standard posts and prints counts.
- Generated markup (each wrapped in `<!-- auto:NAME:start -->` / `<!-- auto:NAME:end -->`):
  - `auto:toc`, inserted directly after `</header>` of `header.post-header`: `<nav class="post-toc" aria-label="Table of contents"><details><summary>On this page</summary><ol><li><a href="#id">Label</a></li>…</ol></details></nav>`
  - `auto:cta`, inserted as the last child of the article's `.post-content` only when `not post.has_cta and not post.noindex`: the existing `aside.product-cta` structure for a product key, or `<p class="store-line">Studying for a certification? <a href="../store.html">Browse the study guides</a>.</p>` for `None`
  - `auto:post-end`, inserted after `footer.post-footer` when present, otherwise as the last child of `article.post > .container`: `<div class="post-end"><a class="bmc-btn bmc-btn-inline" href="https://buymeacoffee.com/mattyhip" target="_blank" rel="noopener">…Buy me a coffee</a><section class="related-posts" aria-labelledby="related-h"><h2 id="related-h">Related</h2><ul><li><a href>Title</a> <span class="category">cat</span> <time datetime>ISO</time></li>…</ul></section></div>`
  - `<script src="../js/article.js" defer></script>` before `</body>` (once).
- Existing marker blocks are replaced in place, so re-running is a no-op.

- [ ] **Step 1: Write the failing tests**

```python
def test_slugify(self): self.assertEqual(slugify('ODFC: when to split Office data out'), 'odfc-when-to-split-office-data-out')
def test_heading_ids_dedupe_and_plain_labels(self):
    html = '<div class="post-content"><h2>Setup</h2><h2>Setup</h2><h2>Use <code>az login</code> &amp; go</h2></div>'
    out, items = heading_ids(html)
    self.assertEqual([i for i, _ in items], ['setup', 'setup-2', 'use-az-login-go'])
    self.assertEqual(items[2][1], 'Use az login & go')
    self.assertIn('<h2 id="setup-2">', out)
def test_heading_ids_keeps_existing_id(self): ...
def test_toc_empty_below_three(self): self.assertEqual(toc_html([('a', 'A'), ('b', 'B')]), '')
def test_related_excludes_self_noindex_other_category(self): ...
def test_related_ranks_shared_tags_then_date(self): ...
def test_cta_key_mapping(self): ...        # one filename per rule, plus a comparisons post → None
def test_apply_skips_cta_when_present_or_noindex(self): ...
def test_apply_without_post_footer_appends_inside_container(self): ...
def test_apply_is_idempotent(self): once = apply(S, p, posts); self.assertEqual(apply(once, p, posts), once)
def test_apply_leaves_head_untouched(self): ...
```

- [ ] **Step 2: Run PY, expect failure**
- [ ] **Step 3: Implement the script** (stdlib only: `re`, `html`, `html.parser`, `dataclasses`, `pathlib`)
- [ ] **Step 4: Run PY, expect pass**
- [ ] **Step 5: Apply and verify**

Run: `python scripts/build_article_extras.py`, then `python scripts/restyle_pages.py --check` and CHECK → both exit 0. Spot-read three outputs: a post with an existing CTA, `comparisons/best-cheap-vps-hosting-2026.html` (no post-footer), and one noindex post.

- [ ] **Step 6: Commit** ("Generate table of contents, related posts and end-of-article blocks")

---

### Task 10: Article styles and `article.js`

**Files:**
- Modify: `css/main.css` (post single page, tables, FAQ, post navigation, affiliate disclosure), `css/shortcodes.css` (`.product-cta`, charts)
- Create: `js/article.js`, `scripts/vendor/tests/e2e/article.spec.mjs`

**Interfaces:**
- Consumes: markup from Task 9.
- Produces: `.read-progress` (a `div[aria-hidden="true"]` inserted by `article.js` as the first child of `body`, fixed under the header, 2px, `transform: scaleX(var(--read, 0))`, origin left). In `@supports (animation-timeline: scroll())` it animates `scaleX(0)` to `scaleX(1)` on `scroll(root)`; otherwise `article.js` sets `--read` (0..1) on scroll through `requestAnimationFrame`.
- `article.js` also: opens the TOC `<details>` at `(min-width: 1200px)` and marks the current section's link with `aria-current="true"` using an IntersectionObserver on the `h2[id]` elements.
- Layout: `article.post` max-width `var(--w-read)`; header left-aligned; at 1200px and wider `.post-toc` is `position: sticky; top: calc(var(--header-h) + 24px)` in the right margin outside the column; `pre` and `.table-wrapper` may reach 820px wide and scroll horizontally inside themselves.

- [ ] **Step 1: Write the failing e2e tests** (three posts: the FSLogix guide, a table-heavy post, `best-cheap-vps-hosting-2026.html`)

```js
test('reading column is 700px wide at 1280px', ...)
test('no horizontal page scroll at 360px', ...)                 // documentElement.scrollWidth <= innerWidth on all three
test('progress goes from 0 to 1 over the page', ...)            // scaleX of .read-progress at top ≈ 0, at bottom ≈ 1
test('TOC links scroll to headings clear of the header', ...)   // heading top >= header height after click
test('TOC is collapsed at 768px and open and sticky at 1280px', ...)
test('copy button copies the code block text', ...)
test('no element inside .post-content has data-reveal', ...)
test('related block has three links; none point to noindex pages', ...)
test('with JavaScript disabled TOC links and related links work', ...)
test('contact.html has no read-progress and no post-toc', ...)
```

- [ ] **Step 2: Run E2E `article.spec.mjs`, expect failures**
- [ ] **Step 3: Write the article CSS** (scoped to `article.post > .container > …`; inline code uses `--accent-text` on `--bg-secondary`; code blocks mono 14px with 1px border; `.product-cta` as a bordered card whose cover tilts 4 degrees on CTA hover under `.motion-ok`; `.related-posts` as a plain list; `.bmc-btn-inline` small outlined)
- [ ] **Step 4: Implement `js/article.js`**
- [ ] **Step 5: Run E2E `article.spec.mjs` (pass) and CHECK**
- [ ] **Step 6: Commit** ("Add reading column, progress bar and table of contents to articles")
- [ ] **Step 7: Phase 3 review** — dispatch `code-reviewer` on the Task 9-10 diff; fix findings; commit.

---

### Task 11: Listing pages, categories, store

**Files:**
- Modify: `css/main.css` (posts grid, category hero, categories page, store), `css/shortcodes.css` (store), `microsoft.html` (promo box), `categories.html` (remove inline style block), `store.html` (`book-grid` class, `data-product`), `js/main.js` (placement)
- Create: `scripts/vendor/tests/e2e/listing.spec.mjs`

**Interfaces:**
- Produces: `.promo-box` (replaces the inline-styled box in `microsoft.html`, same content); `.posts-grid.book-grid` on the store grid with `.post-image { aspect-ratio: 3 / 4 }` and `img { object-fit: contain }`; store purchase links carry `data-product` values matching the homepage (`az-140`, `az-104`, `az-900`, `pmp`, `pmp-charts`, `psm1`); `main.js` placement returns `'store'` when the link is inside `.book-grid`.
- `header.section-header` on listing pages gains `<p class="section-path">~/<page></p>` before the H1 (HTML edit on the listing pages only; quiz pages are not touched).

- [ ] **Step 1: Write the failing e2e tests**

```js
test('post count script still reports the number of cards', ...)       // microsoft.html .post-count text matches card count
test('cards tilt on hover with a fine pointer and settle on leave', ...) // --rx set, then cleared
test('keyboard focus on a card link shows a focus ring and no tilt', ...)
test('store: six covers, same purchase hrefs as main, data-product present', ...)
test('store click sends placement "store"', ...)                        // stub window.gtag, click, inspect args
test('categories.html and microsoft.html have no inline <style> or inline-styled promo box', ...)
test('no horizontal page scroll at 360px on each listing page', ...)
```

- [ ] **Step 2: Run E2E `listing.spec.mjs`, expect failures**
- [ ] **Step 3: Restyle the grid and cards; move the categories and promo styles into CSS; edit `store.html`**
- [ ] **Step 4: Run E2E `listing.spec.mjs` (pass), `python scripts/restyle_pages.py --check`, CHECK**
- [ ] **Step 5: Commit** ("Restyle listing pages and turn store cards into tilting book covers")

---

### Task 12: About, contact, 404 and quiz pages

**Files:**
- Modify: `about.html` (remove inline `<style>`), `css/main.css` (`.about-*` rules), quiz pages only if a check below fails
- Create: `scripts/vendor/tests/e2e/pages.spec.mjs`

**Interfaces:**
- Consumes: tokens (Task 2). The about page keeps its existing class names (`.about-page`, `.about-card`, `.hero-card`, `.expertise-grid`, …) and content.

- [ ] **Step 1: Write the failing e2e tests**

```js
test('about.html has no inline <style> and no hard-coded light colours in dark mode', ...) // body and .about-card computed backgrounds equal the dark tokens
test('about.html text content is unchanged from main', ...)          // main.innerText equality against a snapshot taken from main
test('each practice test can be completed in dark and light themes', ...) // answer all, open results, no page errors
test('quiz progress fill is visible against its track in both themes', ...)
test('EVM quiz page works in both themes', ...)
test('404.html renders with header and footer and requests no AdSense script', ...)
test('contact.html uses the reading column', ...)
```

- [ ] **Step 2: Run E2E `pages.spec.mjs`, expect failures**
- [ ] **Step 3: Rewrite the about styles with tokens in `main.css`; delete the inline block**
- [ ] **Step 4: Fix any quiz-page collision found by the tests** by scoping the new global rule, not by editing quiz internals
- [ ] **Step 5: Run E2E `pages.spec.mjs` (pass) and CHECK**
- [ ] **Step 6: Commit** ("Rewrite about page styles with theme tokens and verify quiz pages")
- [ ] **Step 7: Phase 4 review** — dispatch `code-reviewer` on the Task 11-12 diff; fix findings; commit.

---

### Task 13: Verification, documentation, sign-off

**Files:**
- Create: `docs/design-system.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Full automated pass**

Run PY, UNIT, E2E (all three browsers), CHECK, `python scripts/restyle_pages.py --check`. All exit 0. Firefox may skip the view-transition assertion only.

- [ ] **Step 2: Lighthouse mobile**

With SERVE running: `cd scripts/vendor && npx lighthouse http://localhost:8123/<page> --form-factor=mobile --only-categories=performance,accessibility --output=json --output-path=<scratch>/<name>.json --chrome-flags="--headless"` for `index.html`, `tutorials/az-140-fslogix-profile-containers-guide.html`, `microsoft.html`, `store.html`.
Expected: performance at least 90, LCP under 2.5s, CLS under 0.1, accessibility at least 95 on each. If the homepage misses on performance because of the scene, report the numbers to the owner with the spec's fallback option; do not switch on your own.

- [ ] **Step 3: Screenshots for the owner**

Capture `index.html`, a post, `microsoft.html`, `store.html`, `about.html` at 360px and 1280px in dark and light (Playwright), and view them to confirm nothing is visibly broken.

- [ ] **Step 4: Write `docs/design-system.md`**

Sections: colour tokens (both themes, measured ratios), type scale, spacing and radius, motion tokens, the animation inventory table from the spec with final selectors, vendor bundle sizes, Lighthouse results from Step 2, GitHub Pages deploy steps (commit, push `main`, Pages rebuild, how to re-run the three scripts and the vendor build), and the performance checklist.

- [ ] **Step 5: Update `AGENTS.md`**

Structure block (new JS files, `js/vendor/`, new scripts, no `syntax.css`, no `hero-animation.js`); cards are `article.post-card`; remove the stale "two script-loading patterns" section; fonts are IBM Plex Sans and JetBrains Mono; new-post checklist gains "run `python scripts/build_article_extras.py`"; theming notes (`--accent-text`, `--border-strong`, `.motion-ok` gating, `.read-progress`).

- [ ] **Step 6: Commit** ("Document the design system and update agent notes")

- [ ] **Step 7: Whole-branch review** — dispatch `code-reviewer` on `git diff main...redesign`; fix findings; re-run Step 1; commit.

- [ ] **Step 8: Owner sign-off**

Report results, screenshots and any open issues. Merge and push only after the owner says so:
`git checkout main && git merge --ff-only redesign && git push`
