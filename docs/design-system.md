# SysOpsBits design system

Reference for the November 2026 redesign. Spec: `docs/superpowers/specs/2026-11-11-site-redesign-design.md`.

## Colour tokens

Defined in `css/main.css` (`:root` is dark, `.light-mode` overrides). Pages reference several token names inline, so change values, never names.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg-primary` | `#0b0d10` | `#fafaf7` | Page background |
| `--bg-secondary` | `#101317` | `#f1f1ec` | Footer, inline code, cover wells |
| `--bg-card` | `#14171c` | `#ffffff` | Cards, callouts |
| `--bg-card-hover` / `--bg-elevated` | `#1a1e24` | `#f6f6f2` / `#ffffff` | Hover, dropdowns |
| `--border-color` | `#262b33` | `#dedcd4` | Decorative lines |
| `--border-hover` | `#3a414b` | `#8d8a80` | Hover lines |
| `--border-strong` | `#6b7480` | `#8d8a80` | Inputs, outlined buttons (3:1) |
| `--text-primary` | `#e6e8eb` | `#16181c` | Body text |
| `--text-secondary` | `#a7afb9` | `#4a4f57` | Supporting text |
| `--text-muted` | `#8a929c` | `#636973` | Dates, labels |
| `--accent` | `#f5a524` | `#f5a524` | Fills, rules, dots |
| `--accent-text` | `#f5a524` | `#9a4a06` | Amber text, focus ring |
| `--text-on-accent` | `#14110a` | `#14110a` | Text on amber buttons |
| `--state-ok` / `--state-bad` | `#3fb950` / `#f85149` | `#1a7f37` / `#b42318` | Quiz results, trap/warning callouts |

Aliases kept for old inline styles: `--accent-secondary` → `--accent-text`, `--accent-color` → `--accent`, `--text` → `--text-primary`.

`python scripts/check_site.py contrast` checks every text token against every surface in both themes (4.5:1, and 3:1 for `--border-strong`). Lowest measured text pair: `--text-muted` on a light card, 4.9:1.

## Type

- IBM Plex Sans 400/500/600 for UI, body and headings; JetBrains Mono 400/500 for code, labels, tags, dates.
- One request: `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`
- Scale (px): 13, 14, 16, 18, 22, 28, 36, 48. Article body 17px / 1.75. Headings line height 1.2.

## Space, shape, layout

- Spacing steps (px): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 4px tags and buttons, 8px cards and images.
- Widths: `--w-read: 700px` (articles, about), `--w-wide: 1200px` (grids). Header height `--header-h: 64px`.
- Breakpoints: 1200 (TOC moves to the margin), 940 (mobile menu), 860 (hero stacks), 768, 480.

## Motion tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 120ms | Hover colour, button press |
| `--dur-base` | 240ms | Tilt settle, menus |
| `--dur-slow` | 600ms | Reveal |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, settle |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Page fade |

Limits: tilt 6 degrees, reveal rise 16px, hero turn once per 90 seconds.

## Animation inventory

| # | Animation | Where | Trigger | Reduced-motion / no-JS fallback |
|---|---|---|---|---|
| 1 | Node graph idle rotation | Home hero (`home-scene.js`) | Scene loaded | Static SVG, libraries never downloaded |
| 2 | Node graph cursor tilt | Home hero | Pointer move, fine pointer, full scene | Static SVG |
| 3 | Grid points drift to cursor | Home hero | Pointer move, full scene | Static CSS dot grid |
| 4 | Scroll dissolve (turn, shrink, lift, edges fade) | Home hero | Scroll through hero (ScrollTrigger) | Static SVG stays |
| 5 | Edge pulse | Home hero | Timer, full scene only | None |
| 6 | Blinking cursor | `.hero-eyebrow .cursor` | Always | Solid cursor |
| 7 | Reveal on enter | Listing cards, sections (`motion.js`) | Enters viewport, or scrolled past | Content shown, no movement |
| 8 | Staggered tilt-in | Homepage cards | Enters viewport once GSAP is loaded | Content shown |
| 9 | Card tilt and glow | `.post-card`, `.guide-card` | Hover, fine pointer | Border colour change |
| 10 | Book cover tilt | Store covers | Hover, fine pointer | Border colour change |
| 11 | Button press | `.btn` | Active | Colour change |
| 12 | Coffee icon lift | `.bmc-btn` | Hover, focus | None |
| 13 | Reading progress | `.read-progress` on posts | Scroll (CSS scroll timeline, JS fallback) | Kept: mirrors scroll position |
| 14 | TOC current section | `.post-toc a[aria-current]` | Scroll | Kept, no transition |
| 15 | Page fade and rise | All navigations | Link click (Chrome, Edge, Safari) | Instant navigation |
| 16 | Menu, dropdown, theme thumb | Header | Click, keys | Instant |

## Help Desk Simulator (simulation.html)

The page chrome and monitor bezel use the site tokens. Inside the screen everything uses a fixed retro palette, declared on `.sim-screen` in `css/sim.css` and checked by `python scripts/check_site.py contrast`:

| Token | Value | Use |
|---|---|---|
| `--os-face` / `--os-text` | `#c0c0c0` / `#000000` | Window faces, buttons, body text (11.5:1) |
| `--os-desktop` / `--os-desktop-text` | `#007070` / `#ffffff` | Desktop and icon labels (5.9:1) |
| `--os-title` / `--os-title-text` | `#000080` / `#ffffff` | Active title bars (16.0:1) |
| `--os-highlight` / `--os-highlight-text` | `#000080` / `#ffffff` | Selection |
| `--os-term-bg` / `--os-term-text` | `#000000` / `#c0c0c0` | Command Prompt (11.5:1) |
| `--os-shadow`, `--os-light`, `--os-soft`, `--os-dark` | greys | Bevels (box-shadow insets) |

- Fonts: Tahoma/Verdana stack at 13px inside the screen (no new web font), `--font-mono` in the terminal.
- Motion: the power-on squash and the glowing power prompt run only under `html.motion-ok` and `prefers-reduced-motion: no-preference`. With reduced motion, Power goes straight to the desktop and ping/tracert print instantly; otherwise they print a line every 150ms. Scanlines are static.
- Layout: 4:3 screen (3:4 at 700px and below, where windows open maximized and the ticket queue becomes a drawer). Windows are clamped inside the screen on open, drag, resize and full screen.
- Size: CSS + JS 31.8 KB gzipped (budget 60 KB, target 45 KB).
- No JavaScript: an inline SVG picture of the desktop plus all lab text below it.

## Vendor bundles

Built by `scripts/vendor/build.mjs` (esbuild) from pinned `three@0.187.0` and `gsap@3.15.1`, committed to `js/vendor/`.

| File | Minified | Gzipped |
|---|---|---|
| `three.scene.min.js` | 542 KB | 136 KB |
| `gsap.scroll.min.js` | 116 KB | 46 KB |
| Total | | 182 KB (budget 200 KB) |

## Lighthouse (mobile, local server, 2026-11-12)

| Page | Performance | Accessibility | LCP | CLS | TBT |
|---|---|---|---|---|---|
| Homepage, before redesign | 74 | n/a | 6.1 s | 0 | 10 ms |
| Homepage | 81 | 100 | 4.3 s | 0 | 10 ms |
| FSLogix article | 82 | 100 | 4.3 s | 0 | 10 ms |

The spec target (90+, LCP under 2.5 s) is not met yet. LCP is 85–90% render delay behind three render-blocking stylesheets, the largest being the Google Fonts CSS; the 3D scene adds no blocking time. Next step: self-host the two fonts (or preload them) and inline critical CSS.

## Deploy (GitHub Pages)

1. Commit on `main` and `git push`. Pages rebuilds in a minute or two; there is no build step.
2. After editing `partials/header.html` or `partials/footer.html`: `python scripts/sync_partials.py`.
3. After adding or retitling a post: `python scripts/build_article_extras.py`.
4. Before pushing: `python scripts/check_site.py all`.
5. To upgrade Three.js or GSAP: edit versions in `scripts/vendor/package.json`, then `cd scripts/vendor && npm install && node build.mjs`, and commit `js/vendor/`.

## Performance checklist

- Hero text is the LCP element on the homepage and is never faded in.
- The hero scene box has a fixed aspect ratio; the SVG fills it before the canvas.
- Three.js and GSAP load only on the homepage, on idle (desktop) or first interaction (touch), never for reduced motion or data saver.
- Render loop pauses off screen and in hidden tabs; pixel ratio capped at 2 (1.5 on the lite scene).
- All scripts are `defer`; tilt and glow update through `requestAnimationFrame` and touch only `transform`/`opacity`.
- Images keep `width`/`height`; below-the-fold images are `loading="lazy"`.
- Open item: render-blocking font CSS (see Lighthouse above).
