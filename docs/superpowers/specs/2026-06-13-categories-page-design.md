# Categories Page Redesign

## Objective
Fix and beautify `categories.html` to display all 3 site categories with live article counts and correct recent posts.

## Current Issues
1. Only 1 category card (Tutorials) exists — Comparisons and Tools are missing
2. Tutorials card shows wrong recent posts (Tools articles)
3. `category-meta` post-count spans show `-- articles` (never populated)
4. Hero stat-numbers show `--` instead of actual counts
5. Stray `}` causes JS syntax error (already fixed)
6. HTML structure has orphaned/unclosed divs

## Data Model

| Category | File | Articles | Description |
|---|---|---|---|
| Tutorials | tutorials.html | 14 | Step-by-step guides for DevOps and sysadmin |
| Comparisons | comparisons.html | 12 | Side-by-side tool and service comparisons |
| Tools | tools.html | 5 | Reviews and recommendations |

## Architecture
Static HTML with JS-driven stat counters (Approach A — hardcoded recent posts, dynamic counts).

### Hero Section
- Existing gradient hero background reused
- `stat-number[data-count="categories"]` → populated by JS counting `.category-card[data-count]` elements
- `stat-number[data-count="pages"]` → populated by JS summing `data-count` values

### Category Cards (3)
Each is a `.category-card` with:
- **Header**: category icon, name, `.post-count` span fed from `data-count` attribute
- **Preview**: `.category-description` paragraph
- **Recent Posts**: 4 most recent article links with dates (static HTML)
- **Footer**: "Browse All [Category] →" link

### Recent Posts per Card
**Tutorials**: SC-900 Exam Overview (May 24), Entra External ID (May 7), Conditional Access (May 6), Azure Private Access (May 2)

**Comparisons**: CMD vs PowerShell (Apr 12), Event Viewer (Mar 22), Desk Setup (Mar 19), Budget Keyboard (Mar 19)

**Tools**: AVD Components (Apr 1), Network Tools (Feb 28), Virtualization Tools (Feb 21), Performance Monitoring (Feb 21)

### JS Behavior
Runs on `DOMContentLoaded`:
1. Query all `.category-card[data-count]`
2. Set hero categories count = cards.length
3. Loop cards: sum `data-count` for total articles
4. Loop cards: update `.post-count[data-category="X"]` with count text
5. Set hero pages stat = total articles

### CSS
No new CSS needed — all styles exist in `main.css` for `.hero-stats`, `.terms-grid`, `.category-card`, `.category-preview`, `.recent-posts`, etc.

## Files Changed
- `categories.html` — full rewrite of the terms-grid section and inline script

## Verification
- Open `categories.html` in browser — no console errors
- All 3 category cards render correctly
- Hero shows: Categories 3, Total Articles 31
- Each card shows correct article count
- Recent post links are correct and point to existing files
