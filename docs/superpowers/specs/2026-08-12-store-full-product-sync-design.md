# Store Full Product Sync Design - SysOpsBits

**Date:** 2026-08-12
**Status:** Approved

## Overview

Sync `store.html` with all 5 products currently live on the Buy Me a Coffee shop
(`https://buymeacoffee.com/mattyhip/extras`). The store currently lists 3 cards with
older titles and prices; BMC now has 5 products. All 5 cards will be refreshed to
match current BMC data (titles, prices, descriptions) using the existing card layout.

## Source Data

Pulled from the BMC API (`api/v1/rewards/list/mattyhip`), captured 2026-08-12.
Product order on BMC (by API order / display order):

| # | Product | BMC Price | Buy URL |
|---|---------|-----------|---------|
| 1 | PSM I Exam Cracker: 14-Page Study Guide, 80-Question Practice Exam & Annotated Answer Key | $8.99 | https://buymeacoffee.com/mattyhip/e/564665 |
| 2 | PMP Charts & Data Visualizations Study Guide + Practice Test 2026 | $6.99 | https://buymeacoffee.com/mattyhip/e/552628 |
| 3 | AZ-900 Azure Fundamentals Exam Cracker | $8.99 | https://buymeacoffee.com/mattyhip/e/538078 |
| 4 | PMP Exam Cracker - 65-Page Condensed Study Guide and Practice Exam | $8.99 | https://buymeacoffee.com/mattyhip/e/537680 |
| 5 | Microsoft AZ-104 Exam Cram: High-Impact Notes, Labs & Practice Questions | $8.99 | https://buymeacoffee.com/mattyhip/e/537655 |

## Changes

### 1. store.html - Refresh all 5 product cards

- Rebuild the `.posts-grid` block with 5 `article.post-card` entries, in the BMC
  display order above.
- Each card keeps the exact existing structure:
  - `.post-image` with `<a>` to the BMC `/e/` URL and `<img>` with `loading="lazy"`
  - `.post-content` with `.post-meta` (category badge "Store"), `<h3>` title link,
    description `<p>`, `.product-price`, and `.read-more` "Buy Now →" button
- Titles use the current BMC `reward_title` (shortened where it is unreasonably long
  while keeping the product name recognizable).
- Descriptions are condensed plain-text excerpts of the BMC `reward_description`,
  stripped of emoji/HTML, written to fit the existing 3-line clamp.
- Price display: single current BMC price in `.sale-price` style (e.g. `$8.99`).
  The `.original-price` strikethrough element is dropped because BMC no longer shows
  an original price. (User approved 2026-08-12.)

### 2. images/ - Add product image for PMP Charts card

- Download the BMC product image for the PMP Charts & Data Visualizations product to
  `images/pmp-charts-study-guide.jpg`.
  - BMC source: `https://cdn.buymeacoffee.com/uploads/rewards/2026-06-30/1/010446_grokimage4b4b5188f6b440c39697a5ac63028a1e.jpg` (289,830 bytes)
- Other 4 products reuse existing local images:
  - PSM I Exam Cracker → `images/psm1-exam-cracker.jpg` (already present, byte-identical to BMC)
  - AZ-900 → `images/az-900.png` (existing)
  - PMP Exam Cracker → `images/pmp-exam.png` (existing)
  - AZ-104 → `images/az-104.jpg` (existing)

## Design Rationale

- **Follows existing patterns:** identical card structure to the current store page
  and the store-tab design spec (2026-05-12).
- **No new CSS/JS:** `.post-card`, `.product-price`, `.sale-price`, `.read-more`
  already exist. Only `.original-price` becomes unused in store.html.
- **Static HTML:** no build step, consistent with the repo's deploy model.
- **Accurate data:** titles, prices, and descriptions reflect the live BMC shop.

## Non-Goals

- No runtime fetching from the BMC API (requires auth; cards stay static).
- No changes to listing pages or blog posts that link to BMC products.
- No CSS changes (the `.original-price` rule stays in main.css for any other use).

## Acceptance Criteria

1. store.html contains exactly 5 product cards, in BMC display order.
2. Each card links to the correct BMC `/e/` URL and displays the current BMC price.
3. All 5 product images load (4 existing + 1 new `pmp-charts-study-guide.jpg`).
4. Card layout matches the existing store card layout (no layout regressions).
5. No console errors on store.html.
