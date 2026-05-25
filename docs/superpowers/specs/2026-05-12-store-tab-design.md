# Store Tab Design - SysOpsBits

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Add a "Store" tab to the SysOpsBits header that links to a new store page displaying digital products (e.g-books and guides) available for purchase.

## Changes

### 1. Header - partials/header.html

Add new nav item after Contact, before Support:

```html
<li><a href="store.html" data-page="store">Store</a></li>
```

### 2. Store Page - store.html (new file)

- Create new `store.html` in sysopsbits root
- Use existing page structure (header placeholder, main content, footer placeholder)
- Title: "Store - Digital Products"
- Product grid using existing `.posts-grid` and `.post-card` CSS classes
- Initial product: az-104.jpg (Azure Administrator Exam Guide)
  - Click redirects to https://buymeacoffee.com/mattyhip/e/537655

### 3. JavaScript - js/partials.js

Ensure "store" is properly handled in `getCurrentPage()` function for active nav state. The existing logic should work since it uses `.replace(/-/g, '')`, but verify the data-page attribute works.

## Product Card Structure

```html
<article class="post-card">
    <div class="post-image">
        <a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener">
            <img src="images/az-104.jpg" alt="Azure Administrator Exam Guide" loading="lazy">
        </a>
    </div>
    <div class="post-content">
        <div class="post-meta">
            <a href="store.html" class="category">Store</a>
        </div>
        <h3><a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener">Azure Administrator Exam Guide</a></h3>
        <p>Comprehensive study guide for the AZ-104 Azure Administrator exam. Covers all objectives with practice questions and hands-on labs.</p>
        <a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener" class="read-more">Buy Now →</a>
    </div>
</article>
```

## Design Rationale

- **Follows existing patterns:** Store page mirrors tutorials.html, tools.html, comparisons.html structure
- **Visual consistency:** Uses existing post-card styling
- **Expandable:** Grid layout allows easily adding more products
- **External monetization:** Links to Buy Me a Coffee for product sales
- **Navigation placement:** Store tab placed after Contact, before Support (user preference)

## Acceptance Criteria

1. ✓ Store tab appears in header navigation
2. ✓ Store tab is positioned after Contact, before Support
3. ✓ store.html page loads with proper header/footer
4. ✓ Product image (az-104.jpg) displays correctly
5. ✓ Clicking product redirects to Buy Me a Coffee link
6. ✓ Active nav state works for Store page
7. ✓ Mobile navigation works with new Store tab